export const LOGO_MAX_BYTES = 150 * 1024
export const LOGO_DATA_URI_MAX_LENGTH = 210_000
export const LOGO_URL_MAX_LENGTH = 500
export const LOGO_ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']

const dataUriPattern = /^data:image\/(png|jpeg|webp|svg\+xml);base64,(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})$/

export function logoFileError(file) {
  if (!LOGO_ACCEPTED_TYPES.includes(file.type)) return 'Use a PNG, JPG, WebP or SVG image.'
  if (file.size > LOGO_MAX_BYTES) return `Keep the image under ${LOGO_MAX_BYTES / 1024} KB.`
}

export function logoSourceError(source) {
  if (source.startsWith('data:')) {
    if (source.length <= LOGO_DATA_URI_MAX_LENGTH && dataUriPattern.test(source)) return
  } else {
    try {
      const url = new URL(source)
      if (source.length <= LOGO_URL_MAX_LENGTH && (url.protocol === 'http:' || url.protocol === 'https:')) return
    } catch {
      // The shared error below covers malformed URLs.
    }
  }

  return 'Enter an image URL (http/https) or upload a PNG, JPG, WebP or SVG image under 150 KB.'
}
