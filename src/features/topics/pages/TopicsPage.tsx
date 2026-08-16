import { Stack } from '@chakra-ui/react'
import { BookOpen } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { EmptyState } from '@/shared/components/EmptyState'

export function TopicsPage() {
  return (
    <Stack gap={8}>
      <PageHeader
        title="Topics"
        description="Browse articles, snippets, and quizzes grouped by subject."
      />
      <EmptyState
        icon={BookOpen}
        title="Coming in a later milestone"
        description="Topic pages will list every article and quiz once the content layer is wired up."
      />
    </Stack>
  )
}
