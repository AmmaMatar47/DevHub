import { Box, Drawer, Flex, IconButton, Portal } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { X } from 'lucide-react'
import { RoleMismatchBanner } from '@/features/auth/components/RoleMismatchBanner'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

// Matches the static sidebar's own breakpoint (display={{ base: 'none', md:
// 'block' }} below) -- 768px is Chakra's default `md`.
const DESKTOP_NAV_QUERY = '(min-width: 768px)'

export function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  // A plain matchMedia subscription rather than useBreakpointValue -- this
  // needs to react to a *live* resize (not just resolve once at mount), and
  // subscribing to an external system's change events, calling setState in
  // that callback, is exactly the case useEffect is for.
  const [isDesktopWidth, setIsDesktopWidth] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(DESKTOP_NAV_QUERY).matches,
  )

  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_NAV_QUERY)
    function handleChange(event: MediaQueryListEvent) {
      setIsDesktopWidth(event.matches)
    }
    mql.addEventListener('change', handleChange)
    return () => mql.removeEventListener('change', handleChange)
  }, [])

  // Once the static sidebar is showing, a still-open drawer on top of it is
  // stale -- corrected during render (self-clearing after one corrective
  // re-render) rather than in an effect.
  if (isDesktopWidth && drawerOpen) {
    setDrawerOpen(false)
  }

  return (
    <Flex h="100dvh" bg="bg.canvas" overflow="hidden">
      <Box
        as="nav"
        aria-label="Primary"
        display={{ base: 'none', md: 'block' }}
        w="240px"
        flexShrink={0}
        h="full"
        borderRightWidth="1px"
        borderColor="border.default"
        bg="bg.surface"
      >
        <Sidebar />
      </Box>

      <Drawer.Root
        open={drawerOpen}
        onOpenChange={(details) => setDrawerOpen(details.open)}
        placement="start"
      >
        <Drawer.Backdrop />
        <Portal>
          <Drawer.Positioner>
            <Drawer.Content bg="bg.surface" maxW="280px" boxShadow="lg">
              <Flex justify="flex-end" p={2}>
                <Drawer.CloseTrigger asChild>
                  <IconButton aria-label="Close navigation" variant="ghost" size="sm">
                    <X size={18} />
                  </IconButton>
                </Drawer.CloseTrigger>
              </Flex>
              <Box as="nav" aria-label="Primary" onClick={() => setDrawerOpen(false)} h="calc(100dvh - 48px)">
                <Sidebar />
              </Box>
            </Drawer.Content>
          </Drawer.Positioner>
        </Portal>
      </Drawer.Root>

      <Flex direction="column" flex="1" minW={0} h="full" overflow="hidden">
        <Header onMenuClick={() => setDrawerOpen(true)} />
        <RoleMismatchBanner />
        <Box as="main" flex="1" minH={0} w="full" overflowY="auto">
          <Box maxW="1200px" mx="auto" w="full" p={{ base: 4, md: 6, lg: 8 }}>
            <Outlet />
          </Box>
        </Box>
      </Flex>
    </Flex>
  )
}
