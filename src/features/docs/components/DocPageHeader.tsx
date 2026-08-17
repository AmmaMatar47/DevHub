import { Button, Flex, Text } from '@chakra-ui/react'
import { Pencil } from 'lucide-react'
import { Link as RouterLink } from 'react-router-dom'
import { useAuth } from '@/features/auth/context/AuthContext'
import { hasMinimumRole } from '@/features/auth/lib/roles'
import type { DocNode } from '../api/useDocNode'
import { useEditMode } from '../context/EditModeContext'
import { difficultyLabel } from '../lib/difficulty'
import { DocStatusBadge } from './DocStatusBadge'

const ORIGIN_LABEL: Record<DocNode['origin'], string> = {
  team: 'Team-written',
  course: 'Course',
  generated: 'AI-generated',
}

const updatedFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
})

interface DocPageHeaderProps {
  node: DocNode
  /** The tree path (e.g. ['react', 'hooks', 'use-state']) -- DocNode itself
   * doesn't carry it, only the tree node does. Used to build the edit link. */
  path: string[]
}

/**
 * Status and origin are editor/admin-only -- members never need to know a
 * page is AI-generated or still in review, they just read what's published.
 * The Edit button is gated separately, on top of that, by edit mode: an
 * editor with it off sees the exact same header a member would (badges
 * excepted -- those stay, since proofreading an unpublished page while
 * reading is a different need than actively editing it).
 */
export function DocPageHeader({ node, path }: DocPageHeaderProps) {
  const { role } = useAuth()
  const { editMode } = useEditMode()
  const canSeeEditorMeta = hasMinimumRole(role, 'editor')
  const updatedAt = updatedFormatter.format(new Date(node.updated_at))

  return (
    <Flex direction="column" gap={2}>
      <Flex align="center" justify="space-between" gap={2} wrap="wrap">
        <Flex align="center" gap={2} wrap="wrap">
          <Text as="h1" fontSize={{ base: '2xl', lg: '3xl' }} lineHeight="tight" fontWeight="600">
            {node.title}
          </Text>
          {canSeeEditorMeta ? <DocStatusBadge status={node.status} /> : null}
        </Flex>
        {canSeeEditorMeta && editMode ? (
          <Button asChild variant="outline" borderColor="border.default" size="sm">
            <RouterLink to={`/docs/${path.join('/')}/edit`}>
              <Pencil size={14} />
              Edit
            </RouterLink>
          </Button>
        ) : null}
      </Flex>

      <Flex align="center" gap={3} wrap="wrap" fontSize="sm" color="fg.muted">
        {node.author?.display_name ? <Text>By {node.author.display_name}</Text> : null}
        <Text>
          Updated {updatedAt}
          {node.last_editor?.display_name ? ` by ${node.last_editor.display_name}` : ''}
        </Text>
        {node.difficulty ? <Text>{difficultyLabel(node.difficulty)}</Text> : null}
        {canSeeEditorMeta ? (
          <Text fontFamily="mono" fontSize="xs" textTransform="uppercase" letterSpacing="wide">
            {ORIGIN_LABEL[node.origin]}
          </Text>
        ) : null}
      </Flex>
    </Flex>
  )
}
