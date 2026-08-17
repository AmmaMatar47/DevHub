import { Flex, IconButton, Text } from '@chakra-ui/react'
import { TriangleAlert, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useSignOut } from '../api/useSignOut'

/**
 * Shown when profiles.role and the JWT's user_role claim still disagree
 * after one refreshSession() attempt. Non-blocking by design -- the
 * database enforces access either way, this is purely informational.
 */
export function RoleMismatchBanner() {
  const { roleMismatch, dismissRoleMismatch } = useAuth()
  const signOut = useSignOut()

  if (!roleMismatch) return null

  return (
    <Flex
      align="center"
      gap={3}
      px={{ base: 4, lg: 8 }}
      py={2.5}
      bg="warning"
      color="accent.contrast"
      fontSize="sm"
    >
      <TriangleAlert size={16} style={{ flexShrink: 0 }} />
      <Text flex="1">
        Your permissions were updated. Sign in again to refresh what you can do here.
      </Text>
      <Flex
        as="button"
        onClick={() => signOut.mutate()}
        fontWeight="600"
        textDecoration="underline"
        flexShrink={0}
      >
        Sign in again
      </Flex>
      <IconButton
        aria-label="Dismiss"
        onClick={dismissRoleMismatch}
        variant="ghost"
        size="xs"
        color="accent.contrast"
        _hover={{ opacity: 0.7 }}
      >
        <X size={14} />
      </IconButton>
    </Flex>
  )
}
