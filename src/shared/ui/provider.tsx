import { ChakraProvider } from '@chakra-ui/react'
import type { PropsWithChildren } from 'react'
import { system } from '@/lib/theme'
import { ColorModeProvider } from './color-mode'

export function Provider({ children }: PropsWithChildren) {
  return (
    <ChakraProvider value={system}>
      <ColorModeProvider>{children}</ColorModeProvider>
    </ChakraProvider>
  )
}
