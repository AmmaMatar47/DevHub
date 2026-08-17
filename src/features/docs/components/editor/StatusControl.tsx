import { useState } from 'react'
import { Button, chakra, Dialog, Flex, Portal, Text } from '@chakra-ui/react'
import type { DocStatus } from '../../lib/buildTree'

const STATUS_LABEL: Record<DocStatus, string> = {
  draft: 'Draft',
  needs_review: 'Needs review',
  published: 'Published',
}

const STATUS_ORDER: DocStatus[] = ['draft', 'needs_review', 'published']

interface StatusControlProps {
  status: DocStatus
  onChange: (next: DocStatus) => void
}

/**
 * Any editor/admin can move a node to any status -- RLS already permits it,
 * this is UI affordance only. Moving to 'published' is the one transition
 * that changes what members can see, so it's the only one gated behind a
 * confirmation.
 */
export function StatusControl({ status, onChange }: StatusControlProps) {
  const [confirmingPublish, setConfirmingPublish] = useState(false)

  function handleSelect(next: DocStatus) {
    if (next === status) return
    if (next === 'published') {
      setConfirmingPublish(true)
      return
    }
    onChange(next)
  }

  return (
    <>
      <Flex gap={1} role="radiogroup" aria-label="Status">
        {STATUS_ORDER.map((option) => {
          const selected = option === status
          return (
            <chakra.button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => handleSelect(option)}
              px={3}
              py={1.5}
              borderRadius="l1"
              borderWidth="1px"
              borderColor={selected ? 'accent.solid' : 'border.default'}
              bg={selected ? 'accent.subtle' : 'bg.subtle'}
              color={selected ? 'accent.fg' : 'fg.muted'}
              fontWeight={selected ? '600' : '500'}
              fontSize="xs"
              cursor="pointer"
              transition="background-color 150ms, color 150ms, border-color 150ms"
              _hover={{ borderColor: selected ? 'accent.solid' : 'border.strong' }}
            >
              {STATUS_LABEL[option]}
            </chakra.button>
          )
        })}
      </Flex>

      <Dialog.Root open={confirmingPublish} onOpenChange={(details) => setConfirmingPublish(details.open)}>
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content bg="bg.surface" borderColor="border.default" borderRadius="l2" maxW="420px">
              <Dialog.Header>
                <Dialog.Title fontSize="md">Publish this page?</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Text fontSize="sm" color="fg.muted">
                  Publishing makes this content visible to every member, not just editors and admins. This is the
                  one status change in this editor that isn't easily invisible again -- unpublishing hides it, but
                  anyone who saw it while it was live already saw it.
                </Text>
              </Dialog.Body>
              <Dialog.Footer gap={2}>
                <Button variant="outline" borderColor="border.default" size="sm" onClick={() => setConfirmingPublish(false)}>
                  Cancel
                </Button>
                <Button
                  bg="accent.solid"
                  color="accent.contrast"
                  _hover={{ bg: 'accent.hover' }}
                  size="sm"
                  onClick={() => {
                    onChange('published')
                    setConfirmingPublish(false)
                  }}
                >
                  Publish
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </>
  )
}
