import { Button, Stack, Text } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import { CompassIcon } from 'lucide-react'
import { EmptyState } from './EmptyState'

export function NotFoundPage() {
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
        404
      </Text>
      <EmptyState
        icon={CompassIcon}
        title="Page not found"
        description="The page you're looking for doesn't exist or hasn't been built yet."
      />
      <Button asChild bg="accent.solid" color="accent.contrast" _hover={{ bg: 'accent.hover' }}>
        <RouterLink to="/">Back to home</RouterLink>
      </Button>
    </Stack>
  )
}
