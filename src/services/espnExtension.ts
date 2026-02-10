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
  if (!window.chrome?.runtime?.sendMessage) {
    return {
      espn_s2: null,
      swid: null,
      error: 'Chrome extension messaging not available. Please use a Chromium-based browser (Chrome, Edge, Brave, etc.).'
    }
  }

  try {
    const response = await sendExtensionMessage({ action: 'getEspnCookies' })

    if (response?.error) {
      return {
        espn_s2: null,
        swid: null,
        error: response.error
      }
    }

    return {
      espn_s2: response?.espn_s2 || null,
      swid: response?.swid || null
    }
  } catch (err: any) {
    // Extension not installed or not responding
    if (err.message?.includes('Could not establish connection') ||
        err.message?.includes('Receiving end does not exist')) {
      return {
        espn_s2: null,
        swid: null,
        error: 'extension_not_installed'
      }
    }
    return {
      espn_s2: null,
      swid: null,
      error: err.message || 'Failed to communicate with extension'
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
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
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
