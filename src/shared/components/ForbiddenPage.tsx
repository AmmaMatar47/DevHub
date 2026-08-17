import { Button, Stack, Text } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { EmptyState } from './EmptyState'

export function ForbiddenPage() {
  return (
    <Stack gap={6} align="center" textAlign="center" py={{ base: 10, lg: 16 }}>
      <Text
        fontFamily="mono"
        fontSize="xs"
        fontWeight="500"
        letterSpacing="wide"
        textTransform="uppercase"
        color="fg.subtle"
      >
        403
      </Text>
      <EmptyState
        icon={ShieldAlert}
        title="You don't have access to this page"
        description="Your account doesn't have the role required to view this. Contact an admin if you think this is wrong."
      />
      <Button asChild bg="accent.solid" color="accent.contrast" _hover={{ bg: 'accent.hover' }}>
        <RouterLink to="/">Back to home</RouterLink>
      </Button>
    </Stack>
  )
}
