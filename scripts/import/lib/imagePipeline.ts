import sharp from 'sharp'

const MAX_UPLOAD_BYTES = 3 * 1024 * 1024
const DISPLAY_MAX_EDGE = 1400
const DISPLAY_QUALITY = 82
const FULL_QUALITY = 90

export class ImageProcessingError extends Error {}

export interface ProcessedImage {
  display: Buffer
  full: Buffer
  /** Dimensions of the display tier -- what's reserved as layout space for
   * the inline render, matching src/features/docs/lib/imagePipeline.ts. */
  width: number
  height: number
  displayExt: 'webp' | 'gif'
  fullExt: 'webp' | 'gif'
}

/**
 * Node/sharp mirror of src/features/docs/lib/imagePipeline.ts -- same 3MB
 * cap, same 1400px display cap, same 0.82/0.90 quality split, same M4a.2
 * Part 0 single-tier rule (skip the second encode when the original is
 * already within the display cap; one file at 0.90, both tiers point at
 * it). Canvas isn't available outside a browser, so sharp stands in for it,
 * but the decisions are identical -- imported images must be
 * indistinguishable from ones uploaded through the editor.
 */
export async function processImage(fileBuffer: Buffer, label: string): Promise<ProcessedImage> {
  if (fileBuffer.byteLength > MAX_UPLOAD_BYTES) {
    const mb = (fileBuffer.byteLength / (1024 * 1024)).toFixed(2)
    throw new ImageProcessingError(`${label} is ${mb}MB, over the 3MB cap.`)
  }

  let metadata: sharp.Metadata
  try {
    metadata = await sharp(fileBuffer).metadata()
  } catch {
    throw new ImageProcessingError(`${label} could not be read. It may be corrupted.`)
  }

  const { width, height, format } = metadata
  if (!width || !height) {
    throw new ImageProcessingError(`Could not read dimensions for ${label}.`)
  }

  if (format === 'gif') {
    return { display: fileBuffer, full: fileBuffer, width, height, displayExt: 'gif', fullExt: 'gif' }
  }

  const withinDisplayCap = Math.max(width, height) <= DISPLAY_MAX_EDGE

  if (withinDisplayCap) {
    const single = format === 'webp' ? fileBuffer : await sharp(fileBuffer).webp({ quality: FULL_QUALITY }).toBuffer()
    return { display: single, full: single, width, height, displayExt: 'webp', fullExt: 'webp' }
  }

  const full = format === 'webp' ? fileBuffer : await sharp(fileBuffer).webp({ quality: FULL_QUALITY }).toBuffer()

  const scale = DISPLAY_MAX_EDGE / Math.max(width, height)
  const displayWidth = Math.max(1, Math.round(width * scale))
  const displayHeight = Math.max(1, Math.round(height * scale))
  const display = await sharp(fileBuffer)
    .resize(displayWidth, displayHeight)
    .webp({ quality: DISPLAY_QUALITY })
    .toBuffer()

  return { display, full, width: displayWidth, height: displayHeight, displayExt: 'webp', fullExt: 'webp' }
}
