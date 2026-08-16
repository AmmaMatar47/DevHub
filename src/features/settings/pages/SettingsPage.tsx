import { Box, Flex, Stack, Text } from '@chakra-ui/react'
import { Laptop, Moon, SlidersHorizontal, Sun } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { EmptyState } from '@/shared/components/EmptyState'
import { useColorMode, type ColorModePreference } from '@/shared/ui/color-mode'

const APPEARANCE_OPTIONS: Array<{
  value: ColorModePreference
  label: string
  icon: typeof Sun
}> = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Laptop },
]

export function SettingsPage() {
  const { preference, setColorMode } = useColorMode()

  return (
    <Stack gap={8}>
      <PageHeader title="Settings" description="Manage your DevHub preferences." />

      <Box
        borderWidth="1px"
        borderColor="border.default"
        borderRadius="l2"
        bg="bg.surface"
        p={{ base: 4, lg: 6 }}
      >
        <Text fontWeight="600" fontSize="md" mb={1}>
          Appearance
        </Text>
        <Text color="fg.muted" fontSize="sm" mb={4}>
          Choose how DevHub looks on this device. System follows your OS setting.
        </Text>

        <Flex gap={2} wrap="wrap" role="radiogroup" aria-label="Color mode">
          {APPEARANCE_OPTIONS.map(({ value, label, icon: Icon }) => {
            const selected = preference === value
            return (
              <Flex
                key={value}
                as="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setColorMode(value)}
                align="center"
                gap={2}
                px={4}
                py={2.5}
                minH="44px"
                borderRadius="l1"
                borderWidth="1px"
                borderColor={selected ? 'accent.solid' : 'border.default'}
                bg={selected ? 'accent.subtle' : 'bg.subtle'}
                color={selected ? 'accent.fg' : 'fg.muted'}
                fontWeight={selected ? '600' : '500'}
                fontSize="sm"
                cursor="pointer"
                transition="background-color 150ms, color 150ms, border-color 150ms"
                _hover={{ borderColor: selected ? 'accent.solid' : 'border.strong' }}
              >
                <Icon size={16} />
                {label}
              </Flex>
            )
          })}
        </Flex>
      </Box>

      <EmptyState
        icon={SlidersHorizontal}
        title="More settings coming in a later milestone"
        description="Profile, notification, and workspace preferences will land alongside the account layer."
      />
    </Stack>
  )
}
