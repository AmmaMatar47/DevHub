import { useState } from 'react'
import { Box, Button, chakra, Flex, Skeleton, Stack, Text } from '@chakra-ui/react'
import { ChevronRight } from 'lucide-react'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/context/AuthContext'
import { hasMinimumRole } from '@/features/auth/lib/roles'
import { useDocTree } from '../api/useDocTree'
import { findNodeByPath, getAncestorChain, type DocTreeNode } from '../lib/buildTree'
import { DocStatusBadge } from './DocStatusBadge'

function useCurrentDocSegments(): string[] {
  const { pathname } = useLocation()
  if (!pathname.startsWith('/docs/')) return []
  return pathname.slice('/docs/'.length).split('/').filter(Boolean)
}

/** The sidebar's tree section: a small "Documentation" label linking to
 * /docs, followed by the real doc_nodes tree. Lives in its own independently
 * scrolling container (see Sidebar.tsx) so it never pushes the four fixed
 * nav items off-screen, however deep it gets. */
export function DocTreeNav() {
  const { data: tree, isPending, isError, refetch } = useDocTree()
  const { role } = useAuth()
  const canSeeStatus = hasMinimumRole(role, 'editor')
  const segments = useCurrentDocSegments()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [lastAutoExpandedId, setLastAutoExpandedId] = useState<string | undefined>(undefined)

  const currentNode = tree && segments.length > 0 ? findNodeByPath(tree, segments) : undefined

  // Auto-expand the current node's ancestors whenever navigation lands on a
  // new node -- computed during render (React's documented pattern for
  // "adjusting state when a prop changes") rather than in an effect, and
  // guarded by lastAutoExpandedId so it only fires once per node, never
  // fighting a manual collapse elsewhere in the tree.
  if (tree && currentNode && currentNode.id !== lastAutoExpandedId) {
    const ancestors = getAncestorChain(tree, currentNode)
    if (ancestors.length > 0) {
      const next = new Set(expanded)
      let changed = false
      for (const ancestor of ancestors) {
        if (!next.has(ancestor.id)) {
          next.add(ancestor.id)
          changed = true
        }
      }
      if (changed) setExpanded(next)
    }
    setLastAutoExpandedId(currentNode.id)
  }

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <Box px={3}>
      <RouterLink to="/docs" style={{ textDecoration: 'none' }}>
        <Text
          fontFamily="mono"
          fontSize="xs"
          fontWeight="500"
          letterSpacing="wide"
          textTransform="uppercase"
          color="fg.subtle"
          px={2}
          py={1.5}
          mb={1}
          _hover={{ color: 'fg.default' }}
        >
          Documentation
        </Text>
      </RouterLink>

      {isPending ? (
        <Stack gap={2} px={2} mt={2}>
          <Skeleton height="4" width="70%" />
          <Skeleton height="4" width="55%" />
          <Skeleton height="4" width="65%" />
        </Stack>
      ) : isError || !tree ? (
        <Stack gap={2} px={2} mt={2} align="start">
          <Text fontSize="xs" color="fg.muted">
            Couldn't load the doc tree.
          </Text>
          <Button size="xs" variant="outline" onClick={() => void refetch()}>
            Retry
          </Button>
        </Stack>
      ) : tree.length === 0 ? (
        <Text fontSize="xs" color="fg.subtle" px={2} mt={2}>
          No pages yet.
        </Text>
      ) : (
        <Box>
          {tree.map((node) => (
            <DocTreeItem
              key={node.id}
              node={node}
              expanded={expanded}
              onToggle={toggle}
              currentId={currentNode?.id}
              canSeeStatus={canSeeStatus}
            />
          ))}
        </Box>
      )}
    </Box>
  )
}

interface DocTreeItemProps {
  node: DocTreeNode
  expanded: Set<string>
  onToggle: (id: string) => void
  currentId: string | undefined
  canSeeStatus: boolean
}

function DocTreeItem({ node, expanded, onToggle, currentId, canSeeStatus }: DocTreeItemProps) {
  const hasChildren = node.children.length > 0
  const isOpen = expanded.has(node.id)
  const isActive = node.id === currentId
  const href = `/docs/${node.path.join('/')}`

  return (
    <Box>
      <Flex
        align="center"
        gap={1}
        minH="34px"
        pl={2 + node.depth * 3}
        pr={2}
        borderRadius="l1"
        borderLeftWidth="2px"
        borderLeftColor={isActive ? 'accent.solid' : 'transparent'}
        bg={isActive ? 'accent.subtle' : 'transparent'}
        _hover={{ bg: isActive ? 'accent.subtle' : 'bg.subtle' }}
      >
        {hasChildren ? (
          <chakra.button
            type="button"
            aria-label={isOpen ? `Collapse ${node.title}` : `Expand ${node.title}`}
            aria-expanded={isOpen}
            display="flex"
            alignItems="center"
            justifyContent="center"
            boxSize="5"
            flexShrink={0}
            borderRadius="l1"
            color="fg.subtle"
            cursor="pointer"
            _hover={{ bg: 'bg.subtle', color: 'fg.default' }}
            onClick={() => onToggle(node.id)}
          >
            <ChevronRight
              size={13}
              style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 150ms' }}
            />
          </chakra.button>
        ) : (
          <Box boxSize="5" flexShrink={0} />
        )}

        <RouterLink to={href} style={{ minWidth: 0, flex: 1, textDecoration: 'none' }}>
          <Text
            fontSize="sm"
            truncate
            title={node.title}
            py={1.5}
            color={isActive ? 'accent.fg' : 'fg.muted'}
            fontWeight={isActive ? '600' : '400'}
            _hover={{ color: isActive ? 'accent.fg' : 'fg.default' }}
          >
            {node.title}
          </Text>
        </RouterLink>

        {canSeeStatus ? <DocStatusBadge status={node.status} size="xs" /> : null}
      </Flex>

      {hasChildren && isOpen ? (
        <Box>
          {node.children.map((child) => (
            <DocTreeItem
              key={child.id}
              node={child}
              expanded={expanded}
              onToggle={onToggle}
              currentId={currentId}
              canSeeStatus={canSeeStatus}
            />
          ))}
        </Box>
      ) : null}
    </Box>
  )
}
