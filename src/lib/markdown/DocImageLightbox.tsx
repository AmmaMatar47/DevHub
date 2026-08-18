import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Box, chakra, Dialog, Flex, IconButton, Portal, Spinner, Text } from '@chakra-ui/react'
import { ChevronLeft, ChevronRight, Minus, Plus, X } from 'lucide-react'
import type { ResolvedDocImage } from './useResolvedDocImages'

interface DocImageLightboxProps {
  orderedPaths: string[]
  images: Record<string, ResolvedDocImage>
  openPath: string | null
  onClose: () => void
  onNavigate: (direction: 1 | -1) => void
}

const MAX_SCALE = 6
const ZOOM_STEP = 1.4
const FIT_EPSILON = 0.001

/**
 * Chakra Dialog for the chrome (backdrop, focus trap, Escape-to-close) with
 * plain CSS transforms for zoom/pan -- no lightbox library. Scale is always
 * relative to the image's *natural* pixel size (fitScale, computed once the
 * full-tier image loads and its intrinsic dimensions are known), so "100%"
 * genuinely means one image pixel per screen pixel, and "fit" is whatever
 * scale makes it contain within the viewport.
 */
export function DocImageLightbox({ orderedPaths, images, openPath, onClose, onNavigate }: DocImageLightboxProps) {
  const entry = openPath ? images[openPath] : undefined
  const open = openPath !== null

  useEffect(() => {
    if (!open) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'ArrowLeft') onNavigate(-1)
      else if (event.key === 'ArrowRight') onNavigate(1)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onNavigate])

  return (
    <Dialog.Root open={open} onOpenChange={(details) => !details.open && onClose()}>
      <Portal>
        <Dialog.Backdrop bg="blackAlpha.900" />
        <Dialog.Positioner>
          <Dialog.Content
            bg="transparent"
            boxShadow="none"
            maxW="100vw"
            w="100vw"
            h="100dvh"
            maxH="100dvh"
            borderRadius="0"
            m={0}
          >
            <Box position="absolute" w="1px" h="1px" overflow="hidden" style={{ clip: 'rect(0,0,0,0)' }}>
              <Dialog.Title>{entry?.altText || 'Image viewer'}</Dialog.Title>
            </Box>
            <Dialog.Body p={0} h="full" display="flex" flexDirection="column" position="relative" overflow="hidden">
              <IconButton
                aria-label="Close"
                position="absolute"
                top={3}
                right={3}
                zIndex={2}
                variant="ghost"
                color="white"
                _hover={{ bg: 'whiteAlpha.200' }}
                onClick={onClose}
              >
                <X size={20} />
              </IconButton>

              {orderedPaths.length > 1 ? (
                <>
                  <IconButton
                    aria-label="Previous image"
                    position="absolute"
                    left={{ base: 1, md: 4 }}
                    top="50%"
                    transform="translateY(-50%)"
                    zIndex={2}
                    variant="ghost"
                    color="white"
                    _hover={{ bg: 'whiteAlpha.200' }}
                    onClick={() => onNavigate(-1)}
                  >
                    <ChevronLeft size={26} />
                  </IconButton>
                  <IconButton
                    aria-label="Next image"
                    position="absolute"
                    right={{ base: 1, md: 4 }}
                    top="50%"
                    transform="translateY(-50%)"
                    zIndex={2}
                    variant="ghost"
                    color="white"
                    _hover={{ bg: 'whiteAlpha.200' }}
                    onClick={() => onNavigate(1)}
                  >
                    <ChevronRight size={26} />
                  </IconButton>
                </>
              ) : null}

              {entry?.fullUrl ? (
                <ZoomableImage key={openPath} url={entry.fullUrl} alt={entry.altText ?? ''} />
              ) : openPath ? (
                <Flex flex="1" minH={0} align="center" justify="center">
                  <Text color="white" fontSize="sm">
                    This image couldn&apos;t be loaded.
                  </Text>
                </Flex>
              ) : null}
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

/**
 * Owns the image area, zoom controls, and caption for a single image --
 * keyed by path in the parent, so switching images (or reopening) resets
 * every bit of this state by remounting rather than by resetting state
 * inside an effect.
 */
function ZoomableImage({ url, alt }: { url: string; alt: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null)
  const [fitScale, setFitScale] = useState(1)
  const [scale, setScale] = useState(1)
  const [translate, setTranslate] = useState({ x: 0, y: 0 })

  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map())
  const pinchStart = useRef<{ distance: number; scale: number } | null>(null)
  const dragStart = useRef<{ x: number; y: number; originX: number; originY: number } | null>(null)

  const isZoomed = scale > fitScale + FIT_EPSILON

  function clampTranslate(next: { x: number; y: number }, currentScale: number) {
    if (!naturalSize || !containerRef.current) return { x: 0, y: 0 }
    const rect = containerRef.current.getBoundingClientRect()
    const renderedW = naturalSize.w * currentScale
    const renderedH = naturalSize.h * currentScale
    const maxX = Math.max(0, (renderedW - rect.width) / 2)
    const maxY = Math.max(0, (renderedH - rect.height) / 2)
    return { x: Math.min(maxX, Math.max(-maxX, next.x)), y: Math.min(maxY, Math.max(-maxY, next.y)) }
  }

  function setClampedScale(next: number) {
    const clamped = Math.min(MAX_SCALE, Math.max(fitScale, next))
    setScale(clamped)
    setTranslate((prev) => clampTranslate(prev, clamped))
  }

  function handleImageLoad(event: React.SyntheticEvent<HTMLImageElement>) {
    const img = event.currentTarget
    const naturalW = img.naturalWidth || 1
    const naturalH = img.naturalHeight || 1
    const rect = containerRef.current?.getBoundingClientRect()
    const fit = rect ? Math.min(rect.width / naturalW, rect.height / naturalH, 1) : 1
    setNaturalSize({ w: naturalW, h: naturalH })
    setFitScale(fit)
    setScale(fit)
    setTranslate({ x: 0, y: 0 })
  }

  function toggleFitActual() {
    setClampedScale(scale > fitScale + FIT_EPSILON ? fitScale : 1)
    setTranslate({ x: 0, y: 0 })
  }

  function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
    event.preventDefault()
    setClampedScale(scale * Math.exp(-event.deltaY * 0.0015))
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    activePointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })

    if (activePointers.current.size === 2) {
      const [a, b] = [...activePointers.current.values()]
      pinchStart.current = { distance: Math.hypot(a!.x - b!.x, a!.y - b!.y), scale }
      dragStart.current = null
    } else if (activePointers.current.size === 1 && isZoomed) {
      dragStart.current = { x: event.clientX, y: event.clientY, originX: translate.x, originY: translate.y }
    }
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!activePointers.current.has(event.pointerId)) return
    activePointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })

    if (activePointers.current.size === 2 && pinchStart.current) {
      const [a, b] = [...activePointers.current.values()]
      const distance = Math.hypot(a!.x - b!.x, a!.y - b!.y)
      setClampedScale(pinchStart.current.scale * (distance / pinchStart.current.distance))
    } else if (dragStart.current) {
      const dx = event.clientX - dragStart.current.x
      const dy = event.clientY - dragStart.current.y
      setTranslate(clampTranslate({ x: dragStart.current.originX + dx, y: dragStart.current.originY + dy }, scale))
    }
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    activePointers.current.delete(event.pointerId)
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      // Pointer capture may already be gone if the dialog closed mid-gesture.
    }
    if (activePointers.current.size < 2) pinchStart.current = null
    if (activePointers.current.size === 0) {
      dragStart.current = null
    } else if (activePointers.current.size === 1) {
      const [remaining] = [...activePointers.current.values()]
      dragStart.current = isZoomed
        ? { x: remaining!.x, y: remaining!.y, originX: translate.x, originY: translate.y }
        : null
    }
  }

  return (
    <Flex direction="column" flex="1" minH={0}>
      <Flex
        ref={containerRef}
        flex="1"
        minH={0}
        align="center"
        justify="center"
        overflow="hidden"
        position="relative"
        onWheel={handleWheel}
        onDoubleClick={toggleFitActual}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ touchAction: 'none' }}
        cursor={isZoomed ? 'grab' : 'default'}
      >
        {!naturalSize ? <Spinner color="white" position="absolute" /> : null}
        <chakra.img
          src={url}
          alt={alt}
          onLoad={handleImageLoad}
          draggable={false}
          opacity={naturalSize ? 1 : 0}
          style={{
            maxWidth: 'none',
            maxHeight: 'none',
            userSelect: 'none',
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: 'center center',
          }}
        />
      </Flex>

      <Flex align="center" justify="center" gap={2} py={2.5} bg="blackAlpha.700" flexShrink={0}>
        <IconButton
          aria-label="Zoom out"
          size="sm"
          variant="ghost"
          color="white"
          _hover={{ bg: 'whiteAlpha.200' }}
          onClick={() => setClampedScale(scale / ZOOM_STEP)}
        >
          <Minus size={16} />
        </IconButton>
        <IconButton
          aria-label="Zoom in"
          size="sm"
          variant="ghost"
          color="white"
          _hover={{ bg: 'whiteAlpha.200' }}
          onClick={() => setClampedScale(scale * ZOOM_STEP)}
        >
          <Plus size={16} />
        </IconButton>
      </Flex>

      {alt ? (
        <Text textAlign="center" color="white" fontSize="sm" pb={3} px={4} bg="blackAlpha.700">
          {alt}
        </Text>
      ) : null}
    </Flex>
  )
}
