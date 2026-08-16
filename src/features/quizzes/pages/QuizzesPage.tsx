import { Stack } from '@chakra-ui/react'
import { HelpCircle } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { EmptyState } from '@/shared/components/EmptyState'

export function QuizzesPage() {
  return (
    <Stack gap={8}>
      <PageHeader
        title="Quizzes"
        description="Test your knowledge with spaced-repetition quizzes."
      />
      <EmptyState
        icon={HelpCircle}
        title="Coming in a later milestone"
        description="The quiz builder and player will land once the content layer is wired up."
      />
    </Stack>
  )
}
