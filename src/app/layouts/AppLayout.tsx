import { Box, Drawer, Flex, IconButton, Portal } from '@chakra-ui/react'
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { X } from 'lucide-react'
import { RoleMismatchBanner } from '@/features/auth/components/RoleMismatchBanner'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

export function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <Flex minH="100dvh" bg="bg.canvas">
      <Box
        as="nav"
        aria-label="Primary"
        display={{ base: 'none', md: 'block' }}
        w="240px"
        flexShrink={0}
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

      <Flex direction="column" flex="1" minW={0}>
        <Header onMenuClick={() => setDrawerOpen(true)} />
        <RoleMismatchBanner />
        <Box as="main" flex="1" w="full">
          <Box maxW="1200px" mx="auto" w="full" p={{ base: 4, md: 6, lg: 8 }}>
            <Outlet />
          </Box>
        </Box>
      </Flex>
    </Flex>
  )
}
