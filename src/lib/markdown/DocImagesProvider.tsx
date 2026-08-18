import { createContext, useContext, useRef, useState, type ReactNode } from 'react'
import { extractImagePaths } from './imageRefs'
import { useResolvedDocImages, type ResolvedDocImage } from './useResolvedDocImages'
import { DocImageLightbox } from './DocImageLightbox'

interface DocImagesContextValue {
  images: Record<string, ResolvedDocImage>
  isLoading: boolean
  openLightbox: (path: string, trigger: HTMLElement | null) => void
}

const DocImagesContext = createContext<DocImagesContextValue | null>(null)

export function useDocImagesContext(): DocImagesContextValue {
  const ctx = useContext(DocImagesContext)
  if (!ctx) throw new Error('useDocImagesContext must be used within DocImagesProvider')
  return ctx
}

interface DocImagesProviderProps {
  content: string
  children: ReactNode
}

/**
 * Wraps a rendered document with the batched image resolution (Part 3) and
 * the shared lightbox (Part 4). One provider per MarkdownContent render, so
 * "navigate between all images in the current document" naturally means
 * "all images this provider resolved" -- extractImagePaths' first-appearance
 * order is what the lightbox's left/right arrows walk.
 */
export function DocImagesProvider({ content, children }: DocImagesProviderProps) {
  const orderedPaths = extractImagePaths(content)
  const { data, isLoading } = useResolvedDocImages(orderedPaths)
  const images = data ?? {}

  const [openPath, setOpenPath] = useState<string | null>(null)
  const triggerRef = useRef<HTMLElement | null>(null)

  function openLightbox(path: string, trigger: HTMLElement | null) {
    triggerRef.current = trigger
    setOpenPath(path)
  }

  function closeLightbox() {
    setOpenPath(null)
    triggerRef.current?.focus()
    triggerRef.current = null
  }

  function navigate(direction: 1 | -1) {
    if (openPath === null || orderedPaths.length === 0) return
    const index = orderedPaths.indexOf(openPath)
    if (index === -1) return
    const nextIndex = (index + direction + orderedPaths.length) % orderedPaths.length
    setOpenPath(orderedPaths[nextIndex] ?? null)
  }

  return (
    <DocImagesContext.Provider value={{ images, isLoading, openLightbox }}>
      {children}
      <DocImageLightbox
        orderedPaths={orderedPaths}
        images={images}
        openPath={openPath}
        onClose={closeLightbox}
        onNavigate={navigate}
      />
    </DocImagesContext.Provider>
  )
}
