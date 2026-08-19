import { useState } from 'react'
import { Box, Button, chakra, Flex, Skeleton, Stack, Text } from '@chakra-ui/react'
import { ChevronDown, ChevronRight, ChevronUp, FolderInput, Plus } from 'lucide-react'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/context/AuthContext'
import { hasMinimumRole } from '@/features/auth/lib/roles'
import { useDocTree } from '../api/useDocTree'
import { useReorderDocChildren } from '../api/useReorderDocChildren'
import { findNodeByPath, getAncestorChain, type DocTreeNode } from '../lib/buildTree'
import { useEditMode } from '../context/EditModeContext'
import { CreateDocNodeDialog, type CreateDocNodeParent } from './CreateDocNodeDialog'
import { DocStatusBadge } from './DocStatusBadge'
import { MoveDocNodeDialog } from './MoveDocNodeDialog'

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
  const { editMode } = useEditMode()
  const canSeeStatus = hasMinimumRole(role, 'editor')
  const segments = useCurrentDocSegments()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [lastAutoExpandedId, setLastAutoExpandedId] = useState<string | undefined>(undefined)
  // undefined = closed, null = new root section, a node = new child under it.
  const [createParent, setCreateParent] = useState<CreateDocNodeParent | null | undefined>(undefined)
  const [moveNode, setMoveNode] = useState<DocTreeNode | null>(null)

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
      <Flex align="center" justify="space-between" mb={1}>
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
            _hover={{ color: 'fg.default' }}
          >
            Documentation
          </Text>
        </RouterLink>
        {editMode ? (
          <chakra.button
            type="button"
            aria-label="New root section"
            title="New root section"
            display="flex"
            alignItems="center"
            justifyContent="center"
            boxSize="5"
            mr={2}
            flexShrink={0}
            borderRadius="l1"
            color="fg.subtle"
            cursor="pointer"
            _hover={{ bg: 'bg.subtle', color: 'fg.default' }}
            onClick={() => setCreateParent(null)}
          >
            <Plus size={13} />
          </chakra.button>
        ) : null}
      </Flex>

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
              siblings={tree}
              expanded={expanded}
              onToggle={toggle}
              currentId={currentNode?.id}
              canSeeStatus={canSeeStatus}
              editMode={editMode}
              onRequestCreateChild={setCreateParent}
              onRequestMove={setMoveNode}
            />
          ))}
        </Box>
      )}

      <CreateDocNodeDialog open={createParent !== undefined} onClose={() => setCreateParent(undefined)} parent={createParent ?? null} />
      {moveNode ? (
        <MoveDocNodeDialog open onClose={() => setMoveNode(null)} node={moveNode} tree={tree ?? []} />
      ) : null}
    </Box>
  )
}

interface DocTreeItemProps {
  node: DocTreeNode
  /** The sibling array node belongs to (its parent's children, or the root
   * array) -- used only to compute this node's index for "Move up"/"Move
   * down" and to build the swapped order to send reorder_doc_children. */
  siblings: DocTreeNode[]
  expanded: Set<string>
  onToggle: (id: string) => void
  currentId: string | undefined
  canSeeStatus: boolean
  editMode: boolean
  onRequestCreateChild: (parent: CreateDocNodeParent) => void
  onRequestMove: (node: DocTreeNode) => void
}

function DocTreeItem({
  node,
  siblings,
  expanded,
  onToggle,
  currentId,
  canSeeStatus,
  editMode,
  onRequestCreateChild,
  onRequestMove,
}: DocTreeItemProps) {
  const hasChildren = node.children.length > 0
  const isOpen = expanded.has(node.id)
  const isActive = node.id === currentId
  const href = `/docs/${node.path.join('/')}`
  const reorderMutation = useReorderDocChildren()

  const siblingIndex = siblings.findIndex((sibling) => sibling.id === node.id)
  const canMoveUp = siblingIndex > 0
  const canMoveDown = siblingIndex >= 0 && siblingIndex < siblings.length - 1

  function swapWithSibling(otherIndex: number) {
    if (reorderMutation.isPending) return
    if (otherIndex < 0 || otherIndex >= siblings.length) return
    const orderedIds = siblings.map((sibling) => sibling.id)
    const current = orderedIds[siblingIndex]
    const other = orderedIds[otherIndex]
    if (current === undefined || other === undefined) return
    orderedIds[siblingIndex] = other
    orderedIds[otherIndex] = current
    reorderMutation.mutate({ parentId: node.parentId, orderedIds })
  }

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

        {editMode ? (
          <>
            <chakra.button
              type="button"
              aria-label={`Move ${node.title} up`}
              title="Move up"
              disabled={!canMoveUp}
              display="flex"
              alignItems="center"
              justifyContent="center"
              boxSize="5"
              flexShrink={0}
              borderRadius="l1"
              color="fg.subtle"
              cursor={canMoveUp ? 'pointer' : 'not-allowed'}
              opacity={canMoveUp ? 1 : 0.35}
              _hover={canMoveUp ? { bg: 'bg.subtle', color: 'fg.default' } : undefined}
              onClick={() => swapWithSibling(siblingIndex - 1)}
            >
              <ChevronUp size={13} />
            </chakra.button>
            <chakra.button
              type="button"
              aria-label={`Move ${node.title} down`}
              title="Move down"
              disabled={!canMoveDown}
              display="flex"
              alignItems="center"
              justifyContent="center"
              boxSize="5"
              flexShrink={0}
              borderRadius="l1"
              color="fg.subtle"
              cursor={canMoveDown ? 'pointer' : 'not-allowed'}
              opacity={canMoveDown ? 1 : 0.35}
              _hover={canMoveDown ? { bg: 'bg.subtle', color: 'fg.default' } : undefined}
              onClick={() => swapWithSibling(siblingIndex + 1)}
            >
              <ChevronDown size={13} />
            </chakra.button>
            <chakra.button
              type="button"
              aria-label={`Move ${node.title} to...`}
              title="Move to..."
              display="flex"
              alignItems="center"
              justifyContent="center"
              boxSize="5"
              flexShrink={0}
              borderRadius="l1"
              color="fg.subtle"
              cursor="pointer"
              _hover={{ bg: 'bg.subtle', color: 'fg.default' }}
              onClick={() => onRequestMove(node)}
            >
              <FolderInput size={13} />
            </chakra.button>
            <chakra.button
              type="button"
              aria-label={`New page under ${node.title}`}
              title="New page under this section"
              display="flex"
              alignItems="center"
              justifyContent="center"
              boxSize="5"
              flexShrink={0}
              borderRadius="l1"
              color="fg.subtle"
              cursor="pointer"
              _hover={{ bg: 'bg.subtle', color: 'fg.default' }}
              onClick={() =>
                onRequestCreateChild({ id: node.id, depth: node.depth, path: node.path, title: node.title })
              }
            >
              <Plus size={13} />
            </chakra.button>
          </>
        ) : null}
      </Flex>

      {hasChildren && isOpen ? (
        <Box>
          {node.children.map((child) => (
            <DocTreeItem
              key={child.id}
              node={child}
              siblings={node.children}
              expanded={expanded}
              onToggle={onToggle}
              currentId={currentId}
              canSeeStatus={canSeeStatus}
              editMode={editMode}
              onRequestCreateChild={onRequestCreateChild}
              onRequestMove={onRequestMove}
            />
          ))}
        </Box>
      ) : null}
    </Box>
  )
}
