import { Flex, Menu, Portal, Text } from '@chakra-ui/react'
import { LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useSignOut } from '../api/useSignOut'
import { getInitials } from '../lib/initials'
import { RoleBadge } from './RoleBadge'

/** Real profile menu replacing M0's placeholder avatar. RequireAuth handles the
 * post-sign-out redirect automatically once status flips to unauthenticated. */
export function ProfileMenu() {
  const { profile, session } = useAuth()
  const signOut = useSignOut()

  if (!profile) return null

  const email = session?.user.email
  const initials = getInitials(profile.display_name, email)

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Flex
          as="button"
          align="center"
          justify="center"
          boxSize="8"
          borderRadius="l2"
          bg="bg.subtle"
          borderWidth="1px"
          borderColor="border.default"
          fontFamily="mono"
          fontSize="xs"
          fontWeight="500"
          color="fg.muted"
          flexShrink={0}
          cursor="pointer"
          _hover={{ borderColor: 'border.strong' }}
        >
          {initials}
        </Flex>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content bg="bg.surface" borderColor="border.default" borderRadius="l2" minW="220px">
            <Flex direction="column" gap={1} px={3} py={2.5}>
              <Text fontWeight="600" fontSize="sm" truncate>
                {profile.display_name}
              </Text>
              {email ? (
                <Text fontSize="xs" color="fg.muted" truncate>
                  {email}
                </Text>
              ) : null}
              <RoleBadge role={profile.role} />
            </Flex>
            <Menu.Separator borderColor="border.default" />
            <Menu.Item
              value="sign-out"
              onClick={() => signOut.mutate()}
              disabled={signOut.isPending}
              color="error"
              _hover={{ bg: 'bg.subtle' }}
            >
              <LogOut size={15} />
              Sign out
            </Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  )
}
