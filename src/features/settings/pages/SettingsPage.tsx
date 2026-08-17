import { Box, Button, Flex, Stack, Text } from '@chakra-ui/react'
import { Laptop, LogOut, Moon, Sun } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { useColorMode, type ColorModePreference } from '@/shared/ui/color-mode'
import { useAuth } from '@/features/auth/context/AuthContext'
import { useSignOut } from '@/features/auth/api/useSignOut'
import { RoleBadge } from '@/features/auth/components/RoleBadge'

const memberSinceFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
})

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
  const { profile, session } = useAuth()
  const signOut = useSignOut()

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
        <Text fontWeight="600" fontSize="md" mb={4}>
          Account
        </Text>

        {profile ? (
          <Stack gap={4}>
            <Flex direction={{ base: 'column', sm: 'row' }} gap={{ base: 1, sm: 8 }}>
              <Text w={{ sm: '140px' }} flexShrink={0} fontSize="sm" color="fg.muted">
                Name
              </Text>
              <Text fontSize="sm">{profile.display_name}</Text>
            </Flex>
            <Flex direction={{ base: 'column', sm: 'row' }} gap={{ base: 1, sm: 8 }}>
              <Text w={{ sm: '140px' }} flexShrink={0} fontSize="sm" color="fg.muted">
                Email
              </Text>
              <Text fontSize="sm">{session?.user.email}</Text>
            </Flex>
            <Flex direction={{ base: 'column', sm: 'row' }} align={{ sm: 'center' }} gap={{ base: 1, sm: 8 }}>
              <Text w={{ sm: '140px' }} flexShrink={0} fontSize="sm" color="fg.muted">
                Role
              </Text>
              <RoleBadge role={profile.role} />
            </Flex>
            <Flex direction={{ base: 'column', sm: 'row' }} gap={{ base: 1, sm: 8 }}>
              <Text w={{ sm: '140px' }} flexShrink={0} fontSize="sm" color="fg.muted">
                Member since
              </Text>
              <Text fontSize="sm">{memberSinceFormatter.format(new Date(profile.created_at))}</Text>
            </Flex>

            <Box pt={2}>
              <Button
                onClick={() => signOut.mutate()}
                loading={signOut.isPending}
                disabled={signOut.isPending}
                variant="outline"
                borderColor="border.default"
                size="sm"
              >
                <LogOut size={15} />
                Sign out
              </Button>
            </Box>
          </Stack>
        ) : null}
      </Box>

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
    </Stack>
  )
}
