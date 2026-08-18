import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { assertRowsAffected } from '@/lib/assertRowsAffected'
import { validateAndProcessImage } from '../lib/imagePipeline'

export interface UploadDocImageInput {
  nodeId: string
  file: File
}

export interface UploadedDocImage {
  storagePath: string
  /** Literal `![](image:path)` -- the markdown alt text stays empty on
   * purpose. doc_images.alt_text (derived from the filename below) is the
   * real caption source the renderer reads, resolved through a batched
   * signed-URL lookup rather than baked into content_md. */
  markdown: string
}

function deriveAltText(fileName: string): string | null {
  const base = fileName.replace(/\.[^./\\]+$/, '').trim()
  const cleaned = base.replace(/[-_]+/g, ' ').trim()
  return cleaned.length > 0 ? cleaned : null
}

async function uploadDocImage({ nodeId, file }: UploadDocImageInput): Promise<UploadedDocImage> {
  const processed = await validateAndProcessImage(file)
  const id = crypto.randomUUID()
  const storagePath = `${nodeId}/${id}.${processed.displayExt}`
  const sameObjectForBothTiers = processed.display === processed.full
  const fullPath = sameObjectForBothTiers ? storagePath : `${nodeId}/${id}@full.${processed.fullExt}`

  const contentType = (ext: 'webp' | 'gif') => (ext === 'gif' ? 'image/gif' : 'image/webp')

  const { error: displayError } = await supabase.storage
    .from('doc-images')
    .upload(storagePath, processed.display, { contentType: contentType(processed.displayExt) })
  if (displayError) throw new Error(displayError.message)

  if (!sameObjectForBothTiers) {
    const { error: fullError } = await supabase.storage
      .from('doc-images')
      .upload(fullPath, processed.full, { contentType: contentType(processed.fullExt) })
    if (fullError) {
      await supabase.storage.from('doc-images').remove([storagePath])
      throw new Error(fullError.message)
    }
  }

  try {
    await assertRowsAffected(
      supabase
        .from('doc_images')
        .insert({
          node_id: nodeId,
          storage_path: storagePath,
          full_path: fullPath,
          alt_text: deriveAltText(file.name),
          width: processed.width,
          height: processed.height,
          byte_size: processed.display.size,
        })
        .select('id'),
      'You may not have permission to upload images to this page.',
    )
  } catch (error) {
    await supabase.storage.from('doc-images').remove(sameObjectForBothTiers ? [storagePath] : [storagePath, fullPath])
    throw error
  }

  return { storagePath, markdown: `![](image:${storagePath})` }
}

export function useUploadDocImage() {
  return useMutation({ mutationFn: uploadDocImage })
}
