import fs from 'node:fs'
import path from 'node:path'
import { createDevApiCache } from './dev-api-cache.mjs'

/**
 * Run the `api/*` serverless handlers inside the Vite dev server.
 *
 * WHY THIS EXISTS. `npm run dev` was plain `vite`, which knows nothing about `api/`. A request
 * for /api/hockey-projections did not 404 — Vite served the handler's own SOURCE as a module,
 * 200 with `content-type: text/javascript`. Every caller checks `res.ok`, so the guard passed
 * and `res.json()` then threw on the leading comment. Callers that treat a parse failure as
 * "upstream had nothing" turned that into an empty list, and the hockey board reported "could
 * not load projections" while the projections endpoint was perfectly healthy in production.
 *
 * A 404 would have been survivable. Serving JavaScript with a 200 is what made it a mystery,
 * and it meant no API-backed page could be checked in a browser at all — every verification
 * had to go through vite-node instead.
 *
 * IT ALSO HONOURS `Cache-Control`, because not doing so was misleading in the same way. The
 * handlers set `s-maxage` and production's CDN obeys it — one fetch of the NHL slate serves
 * every user for ten minutes. `s-maxage` addresses a shared cache; a dev server is not one, so
 * it ignored the header and every league opened locally went straight to the upstream. Four
 * leagues meant eight requests at an endpoint that rate-limits, and the throttled answer
 * rendered as "no game" beside every player — indistinguishable from a product bug production
 * does not have. See ./dev-api-cache.mjs.
 *
 * WHAT IT DOES NOT DO. It is not a Vercel emulator: no edge runtime, no regions, no streaming,
 * no `vercel.json` rewrites. It maps a path to a file, shims the four response methods the
 * handlers actually call, and gets out of the way. Production still runs the real thing.
 */

const EXTS = ['.js', '.ts', '.mjs']

/** Vercel's filesystem routing, in the two shapes this repo uses: exact file and `[...path]`. */
function resolveHandler(apiDir, segments) {
  const joined = path.join(apiDir, ...segments)

  for (const ext of EXTS) {
    if (fs.existsSync(joined + ext)) return { file: joined + ext, params: {} }
  }
  for (const ext of EXTS) {
    const idx = path.join(joined, 'index' + ext)
    if (fs.existsSync(idx)) return { file: idx, params: {} }
  }

  /* Catch-alls, deepest first: /api/supabase/a/b is served by api/supabase/[...path].js with
     query.path = ['a','b'], which is what the handler reads. */
  for (let i = segments.length - 1; i >= 0; i--) {
    const dir = path.join(apiDir, ...segments.slice(0, i))
    if (!fs.existsSync(dir)) continue
    const entry = fs.readdirSync(dir)
      .find((f) => /^\[\.\.\..+\]\.(js|ts|mjs)$/.test(f))
    if (!entry) continue
    const name = entry.replace(/^\[\.\.\.|\]\.(js|ts|mjs)$/g, '')
    return { file: path.join(dir, entry), params: { [name]: segments.slice(i) } }
  }
  return null
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', () => resolve(Buffer.alloc(0)))
  })
}

export default function devApi({ dir = 'api' } = {}) {
  return {
    name: 'ufd-dev-api',
    apply: 'serve',
    configureServer(server) {
      const apiDir = path.resolve(server.config.root, dir)
      const cache = createDevApiCache()

      /*
       * EDITING A HANDLER MUST INVALIDATE ITS ANSWERS. A ten-minute s-maxage is right for the
       * upstream and completely wrong for a file the developer is changing — saving
       * api/nhl-stats.js and watching the old response come back for the next ten minutes is
       * precisely the sort of thing this plugin exists to stop the dev server doing. Vite
       * already watches the tree; clearing on any change under api/ is coarse and correct.
       */
      const invalidate = (file) => {
        if (String(file).startsWith(apiDir) && cache.size) {
          cache.clear()
          server.config.logger.info('[dev-api] handler changed — cache cleared')
        }
      }
      server.watcher.on('change', invalidate)
      server.watcher.on('add', invalidate)
      server.watcher.on('unlink', invalidate)

      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next()

        const url = new URL(req.url, 'http://localhost')
        const segments = url.pathname.replace(/^\/api\//, '').replace(/\/+$/, '').split('/')
        const hit = resolveHandler(apiDir, segments)
        if (!hit) return next()

        /* Vercel merges the query string and the route's own params into one object. */
        req.query = { ...Object.fromEntries(url.searchParams), ...hit.params }

        /* Only reads are cacheable, and only reads are safe to replay. */
        const cacheable = ['GET', 'HEAD'].includes(req.method ?? 'GET')
        const cacheKey = `${req.method} ${req.url}`

        /*
         * `end` is passed in rather than read off `res`, because the stale path replays from
         * INSIDE the wrapped res.end below — calling res.end there would re-enter the wrapper
         * and recurse until the stack gave out.
         */
        const replay = (entry, state, end) => {
          if (!res.headersSent) {
            for (const [k, v] of Object.entries(entry.headers ?? {})) res.setHeader(k, v)
            res.setHeader('x-dev-api-cache', state)
            res.statusCode = entry.status
          }
          end(entry.body)
        }

        if (cacheable) {
          const hitCache = cache.lookup(cacheKey)
          if (hitCache?.fresh) return replay(hitCache, 'HIT', res.end.bind(res))
        }

        /*
         * The body, captured on its way out, so a successful answer can be stored.
         *
         * The handlers reply through res.json, res.send and res.end in roughly equal measure,
         * and all three bottom out in end/write — so those two are where the copy is taken
         * rather than shimming each caller separately.
         */
        const chunks = []
        const realWrite = res.write.bind(res)
        const realEnd = res.end.bind(res)
        const collect = (chunk) => {
          if (chunk == null) return
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)))
        }
        res.write = (chunk, ...rest) => { collect(chunk); return realWrite(chunk, ...rest) }
        res.end = (chunk, ...rest) => {
          if (typeof chunk !== 'function') collect(chunk)
          if (cacheable) {
            const headers = Object.fromEntries(
              Object.entries(res.getHeaders?.() ?? {}).map(([k, v]) => [k, v]),
            )
            const body = Buffer.concat(chunks)
            const stored = cache.store(cacheKey, { status: res.statusCode, headers, body })
            if (stored && !res.headersSent) res.setHeader('x-dev-api-cache', 'MISS')
            else if (!(res.statusCode >= 200 && res.statusCode < 300)) {
              /*
               * THE UPSTREAM JUST FAILED AND WE HAVE A SLIGHTLY OLD ANSWER. Serving it is what
               * stale-while-revalidate means at the edge, and here it is the difference
               * between a throttled NHL and a board reading "no game" beside every player. A
               * ten-minute-old slate is not wrong; it is yesterday's news about tonight.
               */
              const stale = cache.lookup(cacheKey)
              if (stale) {
                server.config.logger.info(`[dev-api] ${req.url} ${res.statusCode} — serving stale`)
                return replay(stale, 'STALE', realEnd)
              }
            }
          }
          return realEnd(chunk, ...rest)
        }

        if (req.method && !['GET', 'HEAD'].includes(req.method)) {
          const raw = await readBody(req)
          const type = String(req.headers['content-type'] || '')
          req.body = /json/i.test(type) && raw.length
            ? (() => { try { return JSON.parse(raw.toString()) } catch { return raw.toString() } })()
            : raw.toString()
        }

        /* The handlers use Express-shaped replies; ServerResponse has none of these. */
        res.status = (code) => { res.statusCode = code; return res }
        res.json = (body) => {
          if (!res.headersSent) res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(body))
          return res
        }
        res.send = (body) => {
          if (body == null) return res.end()
          if (Buffer.isBuffer(body) || typeof body === 'string') res.end(body)
          else res.json(body)
          return res
        }
        res.redirect = (location, code = 302) => {
          res.statusCode = code
          res.setHeader('Location', location)
          res.end()
          return res
        }

        try {
          const mod = await server.ssrLoadModule(hit.file)
          const handler = mod.default
          if (typeof handler !== 'function') {
            res.statusCode = 500
            return res.json({ error: `${path.relative(server.config.root, hit.file)} has no default export` })
          }
          await handler(req, res)
          /* A handler that returns without replying would hang the request forever. */
          if (!res.writableEnded) {
            res.statusCode = 500
            res.json({ error: 'handler returned without sending a response' })
          }
        } catch (e) {
          /* Loudly, and as JSON: a dev-server stack trace delivered as HTML is how this class
             of failure disguised itself as an upstream outage in the first place. */
          server.config.logger.error(`[dev-api] ${req.url}\n${e?.stack ?? e}`)
          if (!res.writableEnded) {
            res.statusCode = 500
            res.json({ error: String(e?.message ?? e), handler: path.relative(server.config.root, hit.file) })
          }
        }
      })
    },
  }
}
