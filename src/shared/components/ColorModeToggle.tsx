import { ClientOnly, IconButton, Menu, Portal, Skeleton } from '@chakra-ui/react'
import { Laptop, Moon, Sun } from 'lucide-react'
import { useColorMode, type ColorModePreference } from '@/shared/ui/color-mode'

const OPTIONS: Array<{ value: ColorModePreference; label: string; icon: typeof Sun }> = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Laptop },
]

export function ColorModeToggle() {
  const { colorMode, preference, setColorMode } = useColorMode()
  const TriggerIcon = colorMode === 'dark' ? Moon : Sun

  return (
    <ClientOnly fallback={<Skeleton boxSize="9" borderRadius="l1" />}>
      <Menu.Root>
        <Menu.Trigger asChild>
          <IconButton
            variant="ghost"
            size="sm"
            aria-label={`Color mode: ${preference}. Click to change.`}
          >
            <TriggerIcon size={16} />
          </IconButton>
        </Menu.Trigger>
        <Portal>
          <Menu.Positioner>
            <Menu.Content
              bg="bg.surface"
              borderWidth="1px"
              borderColor="border.default"
              borderRadius="l2"
              minW="10rem"
              py={1}
              boxShadow="lg"
            >
              <Menu.RadioItemGroup
                value={preference}
                onValueChange={(details) => {
                  const next = details.value as ColorModePreference
                  setColorMode(next)
                }}
              >
                {OPTIONS.map(({ value, label, icon: OptionIcon }) => (
                  <Menu.RadioItem
                    key={value}
                    value={value}
                    display="flex"
                    alignItems="center"
                    gap={2}
                    fontSize="sm"
                    px={3}
                    py={2}
                    cursor="pointer"
                    color="fg.default"
                    _highlighted={{ bg: 'bg.subtle' }}
                  >
                    <OptionIcon size={14} />
                    {label}
                  </Menu.RadioItem>
                ))}
              </Menu.RadioItemGroup>
            </Menu.Content>
          </Menu.Positioner>
        </Portal>
      </Menu.Root>
    </ClientOnly>
  )
}
