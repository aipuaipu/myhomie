/**
 * WebDAV utility for configuration sync.
 * Uses native fetch API — no external dependencies needed.
 * 
 * Compatible with: Nextcloud, 坚果云 (Jianguoyun), Synology, etc.
 * Note: Server must allow CORS from the dashboard's origin.
 */

export interface WebdavConfig {
  url: string       // WebDAV server URL, e.g. https://dav.jianguoyun.com/dav/
  username: string  // Account username or app-specific username
  password: string  // Account password or app-specific password
  filepath: string  // Remote file path, e.g. /howdz-dashboard.json
}

const STORAGE_KEY = 'howdz_webdav_config'

export function getSavedWebdavConfig(): WebdavConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { url: '', username: '', password: '', filepath: '/howdz-dashboard.json' }
}

export function saveWebdavConfig(config: WebdavConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

function authHeader(username: string, password: string): string {
  return 'Basic ' + btoa(`${username}:${password}`)
}

/**
 * Test WebDAV connection by sending a HEAD request.
 */
export async function testConnection(config: WebdavConfig): Promise<{ success: boolean; message: string }> {
  try {
    const url = normalizeUrl(config.url) + stripSlash(config.filepath)
    const res = await fetch(url, {
      method: 'HEAD',
      headers: {
        'Authorization': authHeader(config.username, config.password)
      }
    })
    if (res.ok) {
      return { success: true, message: 'Connection successful' }
    } else if (res.status === 404) {
      return { success: true, message: 'Connection successful (file not yet created)' }
    } else {
      return { success: false, message: `Server responded with status ${res.status}` }
    }
  } catch (e: any) {
    return { success: false, message: e.message || 'Connection failed' }
  }
}

/**
 * Upload configuration data to WebDAV server.
 */
export async function uploadConfig(config: WebdavConfig, data: string): Promise<{ success: boolean; message: string }> {
  try {
    const url = normalizeUrl(config.url) + stripSlash(config.filepath)
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': authHeader(config.username, config.password),
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: data
    })
    if (res.ok || res.status === 201 || res.status === 204) {
      return { success: true, message: 'Upload successful' }
    } else {
      return { success: false, message: `Upload failed: status ${res.status}` }
    }
  } catch (e: any) {
    return { success: false, message: e.message || 'Upload failed' }
  }
}

/**
 * Download configuration data from WebDAV server.
 */
export async function downloadConfig(config: WebdavConfig): Promise<{ success: boolean; data?: string; message: string }> {
  try {
    const url = normalizeUrl(config.url) + stripSlash(config.filepath)
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': authHeader(config.username, config.password)
      }
    })
    if (res.ok) {
      const text = await res.text()
      return { success: true, data: text, message: 'Download successful' }
    } else if (res.status === 404) {
      return { success: false, message: 'Remote configuration file not found' }
    } else {
      return { success: false, message: `Download failed: status ${res.status}` }
    }
  } catch (e: any) {
    return { success: false, message: e.message || 'Download failed' }
  }
}

function normalizeUrl(url: string): string {
  return url.endsWith('/') ? url : url + '/'
}

function stripSlash(path: string): string {
  return path.startsWith('/') ? path.slice(1) : path
}
