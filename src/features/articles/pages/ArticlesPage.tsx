import { Stack } from '@chakra-ui/react'
import { FileText } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { EmptyState } from '@/shared/components/EmptyState'

export function ArticlesPage() {
  return (
    <Stack gap={8}>
      <PageHeader title="Articles" description="Long-form write-ups from the team." />
      <EmptyState
        icon={FileText}
        title="Coming in a later milestone"
        description="The article list, editor, and reader view will land once the content layer is wired up."
      />
    </Stack>
  )
}
