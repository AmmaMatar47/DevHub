import { Button, Skeleton, Stack } from '@chakra-ui/react'
import { AlertTriangle } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { RequireRole } from '@/features/auth/components/RequireRole'
import { EmptyState } from '@/shared/components/EmptyState'
import { NotFoundPage } from '@/shared/components/NotFoundPage'
import { PageHeader } from '@/shared/components/PageHeader'
import { useDocTree } from '../api/useDocTree'
import { SectionIndex } from '../components/SectionIndex'
import { findNodeByPath } from '../lib/buildTree'
import { DocEditPage } from './DocEditPage'
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
  const rawSegments = (params['*'] ?? '').split('/').filter(Boolean)
  // react-router requires `*` to be the last path segment, so /docs/*/edit
  // isn't expressible as a literal nested route -- the trailing "edit" is
  // parsed out of the splat here instead, same tree/path resolution either way.
  const isEditRoute = rawSegments.at(-1) === 'edit'
  const segments = isEditRoute ? rawSegments.slice(0, -1) : rawSegments
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
    // There's no real node to edit at the root -- it's a synthesized
    // listing, not a doc_nodes row -- so /docs/edit has nothing to resolve.
    if (isEditRoute) return <NotFoundPage />
    return (
      <Stack gap={6}>
        <PageHeader title="Documentation" description="Browse everything the team has written." />
        <SectionIndex nodes={tree} />
      </Stack>
    )
  }

  const node = findNodeByPath(tree, segments)
  if (!node) return <NotFoundPage />

  if (isEditRoute) {
    return (
      <RequireRole minimumRole="editor">
        <DocEditPage node={node} />
      </RequireRole>
    )
  }

  return <DocNodePage tree={tree} node={node} />
}
