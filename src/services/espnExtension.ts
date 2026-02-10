/**
 * ESPN Chrome Extension Communication Service
 * 
 * Communicates with the "ESPN Fantasy Cookie Sync" Chrome extension
 * to automatically retrieve ESPN credentials (espn_s2 and SWID cookies).
 * 
 * Extension ID: dbjbbkdjodblojmhljgdbdlliogkhbjc
 * Install: https://chromewebstore.google.com/detail/dbjbbkdjodblojmhljgdbdlliogkhbjc
 */

const EXTENSION_ID = 'dbjbbkdjodblojmhljgdbdlliogkhbjc'
const CHROME_STORE_URL = `https://chromewebstore.google.com/detail/espn-fantasy-cookie-sync/${EXTENSION_ID}`

export interface EspnCookieResult {
  espn_s2: string | null
  swid: string | null
  error?: string
}

/**
 * Check if the Chrome extension is installed and responsive
 */
export async function isExtensionInstalled(): Promise<boolean> {
  // Must be in a Chrome-based browser with extension messaging support
  if (!window.chrome?.runtime?.sendMessage) {
    return false
  }

  try {
    const response = await sendExtensionMessage({ action: 'ping' })
    return response?.status === 'ok'
  } catch {
    return false
  }
}

/**
 * Request ESPN cookies from the Chrome extension
 */
export async function getEspnCookiesFromExtension(): Promise<EspnCookieResult> {
  // Must be in a Chrome-based browser with extension messaging support
  if (!window.chrome?.runtime?.sendMessage) {
    return {
      espn_s2: null,
      swid: null,
      error: 'extension_not_installed'
    }
  }

  try {
    const response = await sendExtensionMessage({ action: 'getEspnCookies' })

    // If response is undefined/null, extension is not installed
    // (Chrome silently fails when extension ID doesn't exist)
    if (!response) {
      console.log('[ESPN Extension] No response received - extension not installed')
      return {
        espn_s2: null,
        swid: null,
        error: 'extension_not_installed'
      }
    }

    if (response.error) {
      // Extension responded but reported an error (e.g. "no cookies found")
      // This means extension IS installed, just no ESPN login
      return {
        espn_s2: null,
        swid: null,
        error: response.error
      }
    }

    return {
      espn_s2: response.espn_s2 || null,
      swid: response.swid || null
    }
  } catch (err: any) {
    // ANY failure to communicate = extension not installed
    console.log('[ESPN Extension] Communication failed:', err.message)
    return {
      espn_s2: null,
      swid: null,
      error: 'extension_not_installed'
    }
  }
}

/**
 * Check if running in a Chromium-based browser that supports extensions
 */
export function isChromiumBrowser(): boolean {
  const ua = navigator.userAgent
  return !!(ua.includes('Chrome') || ua.includes('Chromium') || ua.includes('Edg') || ua.includes('Brave'))
}

/**
 * Get Chrome Web Store install URL
 */
export function getExtensionStoreUrl(): string {
  return CHROME_STORE_URL
}

/**
 * Get the extension ID
 */
export function getExtensionId(): string {
  return EXTENSION_ID
}

// Internal helper to send a message to the extension with timeout
function sendExtensionMessage(message: any, timeoutMs = 3000): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Extension response timed out'))
    }, timeoutMs)

    try {
      chrome.runtime.sendMessage(EXTENSION_ID, message, (response: any) => {
        clearTimeout(timer)
        const lastError = chrome.runtime.lastError
        if (lastError) {
          reject(new Error(lastError.message || 'Extension communication error'))
        } else if (response === undefined) {
          // Chrome may return undefined without setting lastError when extension doesn't exist
          reject(new Error('No response from extension'))
        } else {
          resolve(response)
        }
      })
    } catch (err) {
      clearTimeout(timer)
      reject(err)
    }
  })
}
