import { Box, Center } from '@chakra-ui/react'
import { Outlet } from 'react-router-dom'

/** Centred-card shell for future auth screens. Not yet wired into any route. */
export function AuthLayout() {
  return (
    <Center minH="100dvh" bg="bg.canvas" p={4}>
      <Box
        w="full"
        maxW="sm"
        bg="bg.surface"
        borderWidth="1px"
        borderColor="border.default"
        borderRadius="l2"
        p={8}
      >
        <Outlet />
      </Box>
    </Center>
  )
}
