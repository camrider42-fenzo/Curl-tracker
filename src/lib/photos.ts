/**
 * Curl Tracker — photo preparation.
 *
 * Logs store JPEG blobs, not the camera original. The longest side is capped
 * at 1600px and the pixels are re-encoded so a PNG, WebP, or a sideways
 * phone photo (EXIF orientation) becomes one predictable JPEG.
 */
export const MIN_PHOTOS = 1
export const MAX_PHOTOS = 3
export const MAX_PHOTO_EDGE = 1600
export const JPEG_QUALITY = 0.82

export interface FittedSize {
  width: number
  height: number
}

/** Scale so the longest side is at most `maxEdge`. Never upscales. */
export function fittedSize(width: number, height: number, maxEdge = MAX_PHOTO_EDGE): FittedSize {
  if (!(width > 0) || !(height > 0)) throw new Error('That photo has no size.')
  const edge = Math.max(width, height)
  if (edge <= maxEdge) return { width: Math.round(width), height: Math.round(height) }
  const scale = maxEdge / edge
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const kilobytes = bytes / 1024
  if (kilobytes < 1024) return `${Math.max(1, Math.round(kilobytes))} KB`
  return `${(kilobytes / 1024).toFixed(1)} MB`
}

interface Drawable {
  width: number
  height: number
  source: CanvasImageSource
  close: () => void
}

async function loadDrawable(file: Blob): Promise<Drawable> {
  if (typeof createImageBitmap === 'function') {
    try {
      // `from-image` bakes EXIF rotation into the bitmap so a Fold or Pixel
      // photo is not stored on its side.
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
      return {
        width: bitmap.width,
        height: bitmap.height,
        source: bitmap,
        close: () => bitmap.close(),
      }
    } catch {
      // The format or the orientation option was rejected; try an <img>.
    }
  }
  const url = URL.createObjectURL(file)
  const image = new Image()
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('That file could not be read as a photo.'))
      image.src = url
    })
  } catch (error) {
    URL.revokeObjectURL(url)
    throw error
  }
  return {
    width: image.naturalWidth,
    height: image.naturalHeight,
    source: image,
    close: () => URL.revokeObjectURL(url),
  }
}

export async function compressImage(
  file: Blob,
  maxEdge = MAX_PHOTO_EDGE,
  quality = JPEG_QUALITY,
): Promise<{ blob: Blob; width: number; height: number }> {
  if (file.type && !file.type.startsWith('image/')) {
    throw new Error('Choose a JPEG, PNG, or WebP photo.')
  }
  const drawable = await loadDrawable(file)
  try {
    const size = fittedSize(drawable.width, drawable.height, maxEdge)
    const canvas = document.createElement('canvas')
    canvas.width = size.width
    canvas.height = size.height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Could not prepare that photo.')
    context.drawImage(drawable.source, 0, 0, size.width, size.height)
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error('Could not compress that photo.'))),
        'image/jpeg',
        quality,
      )
    })
    return { blob, width: size.width, height: size.height }
  } catch (error) {
    if (error instanceof Error && /photo|size/i.test(error.message)) throw error
    throw new Error('That photo could not be prepared. Try a different picture.')
  } finally {
    drawable.close()
  }
}
