import { Box } from '@chakra-ui/react'
import type { UserRole } from '../lib/roles'

const ROLE_LABEL: Record<UserRole, string> = {
  member: 'Member',
  editor: 'Editor',
  admin: 'Admin',
}

export function RoleBadge({ role }: { role: UserRole }) {
  return (
    <Box
      as="span"
      display="inline-flex"
      alignItems="center"
      px={2}
      py={0.5}
      borderRadius="l1"
      borderWidth="1px"
      borderColor="border.default"
      bg="bg.subtle"
      color="fg.muted"
      fontFamily="mono"
      fontSize="xs"
      fontWeight="500"
      textTransform="uppercase"
      letterSpacing="wide"
    >
      {ROLE_LABEL[role]}
    </Box>
  )
}
