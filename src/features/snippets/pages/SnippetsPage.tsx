import { Stack } from '@chakra-ui/react'
import { Code2 } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { EmptyState } from '@/shared/components/EmptyState'

export function SnippetsPage() {
  return (
    <Stack gap={8}>
      <PageHeader title="Snippets" description="A searchable library of reusable code." />
      <EmptyState
        icon={Code2}
        title="Coming in a later milestone"
        description="The snippet library will land once the content layer is wired up."
      />
    </Stack>
  )
}
