import { useEffect, useState, type RefObject } from 'react'
import { Box, chakra, Stack, Text } from '@chakra-ui/react'

interface TocItem {
  id: string
  text: string
  level: 2 | 3
}

interface TableOfContentsProps {
  containerRef: RefObject<HTMLDivElement | null>
  /** The rendered markdown source -- used only to re-scan the DOM when content changes. */
  content: string
}

/** Desktop-only, right column. Scans the already-rendered h2/h3 elements
 * (ids come from src/lib/markdown.tsx's heading anchors) rather than
 * re-parsing the markdown, so it always matches what's actually on screen. */
export function TableOfContents({ containerRef, content }: TableOfContentsProps) {
  const [items, setItems] = useState<TocItem[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      setItems([])
      return
    }
    const headings = Array.from(container.querySelectorAll<HTMLElement>('h2, h3'))
    setItems(
      headings.map((el) => ({
        id: el.id,
        text: el.textContent ?? '',
        level: el.tagName === 'H2' ? 2 : 3,
      })),
    )
  }, [containerRef, content])

  useEffect(() => {
    if (items.length === 0) return

    const headingEls = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null)

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting)
        if (visible.length > 0) setActiveId(visible[0]?.target.id ?? null)
      },
      { rootMargin: '0px 0px -70% 0px', threshold: 0 },
    )

    headingEls.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [items])

  if (items.length < 3) return null

  return (
    <Box
      as="nav"
      aria-label="Table of contents"
      display={{ base: 'none', xl: 'block' }}
      w="220px"
      flexShrink={0}
      position="sticky"
      top="6"
      alignSelf="start"
      maxH="calc(100vh - 6rem)"
      overflowY="auto"
    >
      <Text fontFamily="mono" fontSize="xs" fontWeight="500" textTransform="uppercase" letterSpacing="wide" color="fg.subtle" mb={2}>
        On this page
      </Text>
      <Stack gap={0.5} fontSize="sm">
        {items.map((item) => {
          const isActive = activeId === item.id
          return (
            <chakra.a
              key={item.id}
              href={`#${item.id}`}
              pl={item.level === 3 ? 5 : 3}
              py={1}
              borderLeftWidth="2px"
              borderColor={isActive ? 'accent.solid' : 'transparent'}
              color={isActive ? 'accent.fg' : 'fg.muted'}
              fontWeight={isActive ? '600' : '400'}
              truncate
              display="block"
              _hover={{ color: 'fg.default' }}
            >
              {item.text}
            </chakra.a>
          )
        })}
      </Stack>
    </Box>
  )
}
