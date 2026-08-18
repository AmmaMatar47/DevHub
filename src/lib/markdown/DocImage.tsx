import { useState, type KeyboardEvent, type MouseEvent } from 'react'
import { Box, chakra, Skeleton, Text } from '@chakra-ui/react'
import { ImageOff } from 'lucide-react'
import { useDocImagesContext } from './DocImagesProvider'

const SKELETON_HEIGHT = '220px'

interface DocImageProps {
  path: string
  /** The markdown's own alt text -- always empty per the `![](image:path)`
   * convention (see useUploadDocImage), kept only as a last-resort fallback
   * if the doc_images row's alt_text is somehow missing. */
  fallbackAlt?: string
}

/**
 * Resolves through the batched map DocImagesProvider already fetched --
 * this component makes zero requests of its own. Three states: still
 * resolving (skeleton, sized generically since real dimensions aren't
 * known yet), broken (row missing, signed URL failed, or the <img> itself
 * failed to load), or loaded (space reserved via the stored width/height,
 * click opens the shared lightbox).
 */
export function DocImage({ path, fallbackAlt }: DocImageProps) {
  const { images, isLoading, openLightbox } = useDocImagesContext()
  const [loadFailed, setLoadFailed] = useState(false)
  const entry = images[path]

  if (isLoading && !entry) {
    return <Skeleton borderRadius="l2" my={4} w="full" maxW="full" height={SKELETON_HEIGHT} />
  }

  const alt = entry?.altText ?? fallbackAlt ?? ''
  const broken = !entry || !entry.displayUrl || loadFailed

  if (broken) {
    return (
      <Box
        as="figure"
        my={4}
        borderWidth="1px"
        borderColor="border.default"
        borderRadius="l2"
        bg="bg.subtle"
        px={4}
        py={8}
        display="flex"
        flexDirection="column"
        alignItems="center"
        gap={2}
        color="fg.muted"
      >
        <ImageOff size={22} />
        <Text fontSize="xs" textAlign="center">
          {alt ? `Couldn't load "${alt}"` : "Couldn't load this image"}
        </Text>
      </Box>
    )
  }

  function handleActivate(event: MouseEvent<HTMLImageElement> | KeyboardEvent<HTMLImageElement>) {
    const target = event.currentTarget
    target.focus()
    openLightbox(path, target)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLImageElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleActivate(event)
    }
  }

  return (
    <Box as="figure" my={4} maxW="full">
      <chakra.img
        src={entry.displayUrl ?? undefined}
        alt={alt}
        loading="lazy"
        tabIndex={0}
        role="button"
        aria-label={alt ? `Open image: ${alt}` : 'Open image'}
        onClick={handleActivate}
        onKeyDown={handleKeyDown}
        onError={() => setLoadFailed(true)}
        // Chakra's style-prop system intercepts numeric `width`/`height`
        // props as CSS sizing rather than forwarding them as HTML
        // attributes (which would reserve layout space at their natural
        // aspect ratio) -- aspectRatio has no such ambiguity, reserves the
        // same space, and scales responsively with the column instead of
        // pinning a fixed pixel size.
        aspectRatio={entry.width / entry.height}
        w="full"
        maxW="full"
        display="block"
        mx="auto"
        borderRadius="l2"
        cursor="zoom-in"
      />
      {alt ? (
        <Text as="figcaption" fontSize="xs" color="fg.muted" textAlign="center" mt={2}>
          {alt}
        </Text>
      ) : null}
    </Box>
  )
}
