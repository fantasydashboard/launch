import fs from 'node:fs'
import path from 'node:path'

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

      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next()

        const url = new URL(req.url, 'http://localhost')
        const segments = url.pathname.replace(/^\/api\//, '').replace(/\/+$/, '').split('/')
        const hit = resolveHandler(apiDir, segments)
        if (!hit) return next()

        /* Vercel merges the query string and the route's own params into one object. */
        req.query = { ...Object.fromEntries(url.searchParams), ...hit.params }

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
