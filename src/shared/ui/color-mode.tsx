import { ClientOnly, IconButton, Skeleton, type IconButtonProps } from '@chakra-ui/react'
import { ThemeProvider, useTheme, type ThemeProviderProps } from 'next-themes'
import { forwardRef } from 'react'
import { Moon, Sun } from 'lucide-react'

export type ColorMode = 'light' | 'dark'
export type ColorModePreference = ColorMode | 'system'

export function ColorModeProvider(props: ThemeProviderProps) {
  return (
    <ThemeProvider
      attribute="class"
      disableTransitionOnChange
      defaultTheme="system"
      enableSystem
      {...props}
    />
  )
}

export interface UseColorModeReturn {
  /** The mode actually applied to the page right now. */
  colorMode: ColorMode
  /** The user's stored preference — may be 'system'. */
  preference: ColorModePreference
  setColorMode: (mode: ColorModePreference) => void
  toggleColorMode: () => void
}

export function useColorMode(): UseColorModeReturn {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const colorMode: ColorMode = resolvedTheme === 'dark' ? 'dark' : 'light'
  const preference = (theme as ColorModePreference | undefined) ?? 'system'

  return {
    colorMode,
    preference,
    setColorMode: setTheme,
    toggleColorMode: () => setTheme(colorMode === 'dark' ? 'light' : 'dark'),
  }
}

export function useColorModeValue<T>(light: T, dark: T): T {
  const { colorMode } = useColorMode()
  return colorMode === 'dark' ? dark : light
}

export function ColorModeIcon() {
  const { colorMode } = useColorMode()
  return colorMode === 'dark' ? <Moon size={16} /> : <Sun size={16} />
}

type ColorModeButtonProps = Omit<IconButtonProps, 'aria-label'>

export const ColorModeButton = forwardRef<HTMLButtonElement, ColorModeButtonProps>(
  function ColorModeButton(props, ref) {
    const { toggleColorMode } = useColorMode()

    return (
      <ClientOnly fallback={<Skeleton boxSize="8" borderRadius="l1" />}>
        <IconButton
          onClick={toggleColorMode}
          variant="ghost"
          size="sm"
          aria-label="Toggle color mode"
          ref={ref}
          {...props}
        >
          <ColorModeIcon />
        </IconButton>
      </ClientOnly>
    )
  },
)
