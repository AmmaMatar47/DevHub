const MAX_UPLOAD_BYTES = 3 * 1024 * 1024
const DISPLAY_MAX_EDGE = 1400
const DISPLAY_QUALITY = 0.82
const FULL_QUALITY = 0.9

export const ACCEPTED_IMAGE_MIME = 'image/png,image/jpeg,image/webp,image/gif'

type DetectedImageType = 'png' | 'jpeg' | 'webp' | 'gif'

export class ImageValidationError extends Error {}

export interface ProcessedImage {
  display: Blob
  full: Blob
  /** Dimensions of the display tier -- what's actually reserved as layout
   * space for the inline render, not the full/original resolution. */
  width: number
  height: number
  displayExt: 'webp' | 'gif'
  fullExt: 'webp' | 'gif'
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

/**
 * Reads magic bytes rather than trusting the File's reported MIME type or
 * its name's extension -- both are just labels the browser or OS attached,
 * not evidence of what the bytes actually are.
 */
function sniffImageType(bytes: Uint8Array): DetectedImageType | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'png'
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpeg'
  }
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
    return 'gif'
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'webp'
  }
  return null
}

async function encodeWebp(bitmap: ImageBitmap, width: number, height: number, quality: number): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new ImageValidationError('Image processing is not supported in this browser.')
  ctx.drawImage(bitmap, 0, 0, width, height)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', quality))
  if (!blob) throw new ImageValidationError('Failed to encode this image.')
  return blob
}

/**
 * Validates a file and produces the WebP tier(s) described in the M4a.1
 * spec: a Display tier (longest edge <=1400px, quality 0.82 -- diagrams
 * with text labels compress worse than photos, hence the higher-than-usual
 * quality) and a Full tier (original resolution, quality 0.90) for the
 * lightbox. Animated GIFs are left untouched -- canvas can only capture a
 * single frame, so re-encoding one would silently kill the animation.
 *
 * M4a.2 Part 0 fix: when the original is already within the display cap,
 * the two tiers would come out at identical dimensions and differ only in
 * quality (measured on a real file: 100KB at 0.82 vs 145KB at 0.90, with
 * the lightbox's "full" tier revealing zero extra detail over "display").
 * In that case only one file is encoded, at the higher 0.90 quality, and
 * both tiers point at it -- one upload instead of two, and no false
 * impression that zooming in shows more than the inline image already did.
 */
export async function validateAndProcessImage(file: File): Promise<ProcessedImage> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ImageValidationError(`This image is ${formatBytes(file.size)}. Images must be 3MB or smaller.`)
  }

  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  const detected = sniffImageType(header)
  if (!detected) {
    throw new ImageValidationError('This file is not a PNG, JPEG, WebP, or GIF image.')
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new ImageValidationError('This image could not be read. It may be corrupted.')
  }

  try {
    if (detected === 'gif') {
      return { display: file, full: file, width: bitmap.width, height: bitmap.height, displayExt: 'gif', fullExt: 'gif' }
    }

    const withinDisplayCap = Math.max(bitmap.width, bitmap.height) <= DISPLAY_MAX_EDGE

    if (withinDisplayCap) {
      const single = detected === 'webp' ? file : await encodeWebp(bitmap, bitmap.width, bitmap.height, FULL_QUALITY)
      return { display: single, full: single, width: bitmap.width, height: bitmap.height, displayExt: 'webp', fullExt: 'webp' }
    }

    const full = detected === 'webp' ? file : await encodeWebp(bitmap, bitmap.width, bitmap.height, FULL_QUALITY)

    const scale = DISPLAY_MAX_EDGE / Math.max(bitmap.width, bitmap.height)
    const displayWidth = Math.max(1, Math.round(bitmap.width * scale))
    const displayHeight = Math.max(1, Math.round(bitmap.height * scale))
    const display = await encodeWebp(bitmap, displayWidth, displayHeight, DISPLAY_QUALITY)

    return { display, full, width: displayWidth, height: displayHeight, displayExt: 'webp', fullExt: 'webp' }
  } finally {
    bitmap.close()
  }
}
