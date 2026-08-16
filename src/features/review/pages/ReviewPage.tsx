import { Stack } from '@chakra-ui/react'
import { RotateCcw } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { EmptyState } from '@/shared/components/EmptyState'

export function ReviewPage() {
  return (
    <Stack gap={8}>
      <PageHeader
        title="Review"
        description="Spaced-repetition items due for review surface here."
      />
      <EmptyState
        icon={RotateCcw}
        title="Coming in a later milestone"
        description="The review queue will land once the spaced-repetition engine is wired up."
      />
    </Stack>
  )
}
