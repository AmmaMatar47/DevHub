import { Button, Skeleton, Stack } from '@chakra-ui/react'
import { AlertTriangle } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { EmptyState } from '@/shared/components/EmptyState'
import { NotFoundPage } from '@/shared/components/NotFoundPage'
import { PageHeader } from '@/shared/components/PageHeader'
import { useDocTree } from '../api/useDocTree'
import { SectionIndex } from '../components/SectionIndex'
import { findNodeByPath } from '../lib/buildTree'
import { DocNodePage } from './DocNodePage'

/**
 * get_doc_tree() already applies RLS -- a node the caller can't see simply
 * isn't in the returned rows, so an invalid path and a hidden path both
 * resolve to `undefined` here and both render the same 404. No separate
 * "forbidden" case exists or is needed: authorization already happened at
 * the data layer, not in this component.
 */
export function DocPage() {
  const params = useParams()
  const segments = (params['*'] ?? '').split('/').filter(Boolean)
  const { data: tree, isPending, isError, refetch } = useDocTree()

  if (isPending) {
    return (
      <Stack gap={6}>
        <Skeleton height="8" width="240px" />
        <Skeleton height="180px" />
      </Stack>
    )
  }

  if (isError || !tree) {
    return (
      <Stack gap={4} align="center">
        <EmptyState
          icon={AlertTriangle}
          title="Couldn't load documentation"
          description="Something went wrong loading the doc tree."
        />
        <Button onClick={() => void refetch()} variant="outline" size="sm">
          Try again
        </Button>
      </Stack>
    )
  }

  if (segments.length === 0) {
    return (
      <Stack gap={6}>
        <PageHeader title="Documentation" description="Browse everything the team has written." />
        <SectionIndex nodes={tree} />
      </Stack>
    )
  }

  const node = findNodeByPath(tree, segments)
  if (!node) return <NotFoundPage />

  return <DocNodePage tree={tree} node={node} />
}
