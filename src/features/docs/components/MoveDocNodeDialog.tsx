import { useState } from 'react'
import { Box, Button, chakra, Dialog, Portal, Skeleton, Stack, Text } from '@chakra-ui/react'
import { useMoveDocNode } from '../api/useMoveDocNode'
import { useMoveTargets, type MoveTarget } from '../api/useMoveTargets'
import { findNodeById, type DocTreeNode } from '../lib/buildTree'

const ROOT_TARGET = 'ROOT' as const
type SelectedTarget = string | null

interface MoveTargetTreeNode extends MoveTarget {
  children: MoveTargetTreeNode[]
}

function buildMoveTargetTree(targets: MoveTarget[]): MoveTargetTreeNode[] {
  const byId = new Map<string, MoveTargetTreeNode>()
  for (const target of targets) byId.set(target.id, { ...target, children: [] })

  const roots: MoveTargetTreeNode[] = []
  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  return roots
}

interface MoveDocNodeDialogProps {
  open: boolean
  onClose: () => void
  node: DocTreeNode
  /** The full current tree -- used only to count a target's existing
   * children so the moved node lands last among its new siblings, the
   * same "append at the end" rule create_doc_node uses. Not used for any
   * validity decision -- that's entirely get_move_targets' job. */
  tree: DocTreeNode[]
}

/**
 * Menu-based move, not drag-and-drop -- easier to make accessible, easier
 * to test, impossible to trigger by accident. Every row's valid/invalid
 * state and reason comes straight from get_move_targets (which shares
 * subtree_height() with move_doc_node itself); this component does no
 * depth-cap arithmetic of its own.
 */
export function MoveDocNodeDialog({ open, onClose, node, tree }: MoveDocNodeDialogProps) {
  const { data: targets, isPending, isError } = useMoveTargets(open ? node.id : undefined)
  const moveMutation = useMoveDocNode()
  const [selected, setSelected] = useState<SelectedTarget>(null)
  const [error, setError] = useState<string | null>(null)

  function handleClose() {
    setSelected(null)
    setError(null)
    moveMutation.reset()
    onClose()
  }

  function handleConfirm() {
    if (selected === null) return
    setError(null)
    const newParentId = selected === ROOT_TARGET ? null : selected
    const newPosition = newParentId === null ? tree.length : (findNodeById(tree, newParentId)?.children.length ?? 0)

    moveMutation.mutate(
      { nodeId: node.id, newParentId, newPosition },
      {
        onSuccess: handleClose,
        onError: (mutationError) => {
          setError(mutationError instanceof Error ? mutationError.message : 'Something went wrong moving this page.')
        },
      },
    )
  }

  const moveTargetTree = targets ? buildMoveTargetTree(targets) : []

  return (
    <Dialog.Root open={open} onOpenChange={(details) => !details.open && handleClose()}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content bg="bg.surface" borderColor="border.default" borderRadius="l2" maxW="480px" h="70vh">
            <Dialog.Header>
              <Dialog.Title fontSize="md">Move &quot;{node.title}&quot;</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body overflowY="auto">
              {isPending ? (
                <Stack gap={2}>
                  <Skeleton height="4" width="70%" />
                  <Skeleton height="4" width="55%" />
                  <Skeleton height="4" width="65%" />
                </Stack>
              ) : isError ? (
                <Text fontSize="sm" color="fg.muted">
                  Couldn&apos;t load move targets.
                </Text>
              ) : (
                <Stack gap={0.5}>
                  <TargetRow
                    label="Top level"
                    depth={0}
                    isValid
                    reason={null}
                    selected={selected === ROOT_TARGET}
                    onSelect={() => setSelected(ROOT_TARGET)}
                  />
                  {moveTargetTree.map((target) => (
                    <MoveTargetRow key={target.id} target={target} selected={selected} onSelect={setSelected} />
                  ))}
                </Stack>
              )}

              {error ? (
                <Text fontSize="xs" color="error" mt={3}>
                  {error}
                </Text>
              ) : null}
            </Dialog.Body>
            <Dialog.Footer gap={2}>
              <Button variant="outline" borderColor="border.default" size="sm" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                bg="accent.solid"
                color="accent.contrast"
                _hover={{ bg: 'accent.hover' }}
                size="sm"
                onClick={handleConfirm}
                loading={moveMutation.isPending}
                disabled={selected === null || moveMutation.isPending}
              >
                Move here
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

function MoveTargetRow({
  target,
  selected,
  onSelect,
}: {
  target: MoveTargetTreeNode
  selected: SelectedTarget
  onSelect: (id: string) => void
}) {
  return (
    <>
      <TargetRow
        label={target.title}
        depth={target.depth + 1}
        isValid={target.isValid}
        reason={target.reason}
        selected={selected === target.id}
        onSelect={() => onSelect(target.id)}
      />
      {target.children.map((child) => (
        <MoveTargetRow key={child.id} target={child} selected={selected} onSelect={onSelect} />
      ))}
    </>
  )
}

function TargetRow({
  label,
  depth,
  isValid,
  reason,
  selected,
  onSelect,
}: {
  label: string
  depth: number
  isValid: boolean
  reason: string | null
  selected: boolean
  onSelect: () => void
}) {
  return (
    <Box>
      <chakra.button
        type="button"
        role="radio"
        aria-checked={selected}
        disabled={!isValid}
        onClick={onSelect}
        display="block"
        w="full"
        textAlign="left"
        pl={2 + depth * 3}
        pr={2}
        py={1.5}
        borderRadius="l1"
        borderLeftWidth="2px"
        borderLeftColor={selected ? 'accent.solid' : 'transparent'}
        bg={selected ? 'accent.subtle' : 'transparent'}
        cursor={isValid ? 'pointer' : 'not-allowed'}
        opacity={isValid ? 1 : 0.5}
        _hover={isValid ? { bg: selected ? 'accent.subtle' : 'bg.subtle' } : undefined}
      >
        <Text fontSize="sm" color={selected ? 'accent.fg' : 'fg.default'} fontWeight={selected ? '600' : '400'} truncate>
          {label}
        </Text>
      </chakra.button>
      {!isValid && reason ? (
        <Text fontSize="xs" color="fg.subtle" pl={2 + depth * 3 + 2} mt={-0.5} mb={1}>
          {reason}
        </Text>
      ) : null}
    </Box>
  )
}
