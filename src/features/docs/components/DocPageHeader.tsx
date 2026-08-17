import { Flex, Text } from '@chakra-ui/react'
import { useAuth } from '@/features/auth/context/AuthContext'
import { hasMinimumRole } from '@/features/auth/lib/roles'
import type { DocNode } from '../api/useDocNode'
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
}

/** Status and origin are editor/admin-only -- members never need to know a
 * page is AI-generated or still in review, they just read what's published. */
export function DocPageHeader({ node }: DocPageHeaderProps) {
  const { role } = useAuth()
  const canSeeEditorMeta = hasMinimumRole(role, 'editor')
  const updatedAt = updatedFormatter.format(new Date(node.updated_at))

  return (
    <Flex direction="column" gap={2}>
      <Flex align="center" gap={2} wrap="wrap">
        <Text as="h1" fontSize={{ base: '2xl', lg: '3xl' }} lineHeight="tight" fontWeight="600">
          {node.title}
        </Text>
        {canSeeEditorMeta ? <DocStatusBadge status={node.status} /> : null}
      </Flex>

      <Flex align="center" gap={3} wrap="wrap" fontSize="sm" color="fg.muted">
        {node.author?.display_name ? <Text>By {node.author.display_name}</Text> : null}
        <Text>
          Updated {updatedAt}
          {node.last_editor?.display_name ? ` by ${node.last_editor.display_name}` : ''}
        </Text>
        {node.difficulty ? (
          <Text aria-label={`Difficulty ${node.difficulty} of 3`}>
            {'●'.repeat(node.difficulty)}
            {'○'.repeat(3 - node.difficulty)}
          </Text>
        ) : null}
        {canSeeEditorMeta ? (
          <Text fontFamily="mono" fontSize="xs" textTransform="uppercase" letterSpacing="wide">
            {ORIGIN_LABEL[node.origin]}
          </Text>
        ) : null}
      </Flex>
    </Flex>
  )
}
