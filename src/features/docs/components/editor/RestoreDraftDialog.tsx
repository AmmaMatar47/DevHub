import { Button, Dialog, Portal, Text } from '@chakra-ui/react'
import type { LocalDraft } from '../../lib/localDraft'

const savedAtFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

interface RestoreDraftDialogProps {
  open: boolean
  draft: LocalDraft
  /** True when the server's updated_at has moved past what this draft was
   * based on -- i.e. both the local draft and the server diverged from the
   * same starting point. Restoring is still safe: the save baseline stays
   * the draft's original baseUpdatedAt, so a save attempt will correctly
   * hit the normal conflict flow rather than silently overwriting whatever
   * changed on the server in between. */
  serverChangedSinceDraft: boolean
  onRestore: () => void
  onDiscard: () => void
}

export function RestoreDraftDialog({
  open,
  draft,
  serverChangedSinceDraft,
  onRestore,
  onDiscard,
}: RestoreDraftDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={() => undefined}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content bg="bg.surface" borderColor="border.default" borderRadius="l2" maxW="440px">
            <Dialog.Header>
              <Dialog.Title fontSize="md">Restore your unsaved draft?</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Text fontSize="sm" color="fg.muted">
                You have local changes to this page from {savedAtFormatter.format(new Date(draft.savedAt))} that
                were never saved -- probably from a crash or a closed tab.
              </Text>
              {serverChangedSinceDraft ? (
                <Text fontSize="sm" color="warning" mt={3}>
                  This page has also been edited on the server since that draft was written. Restoring is still
                  safe -- if you save, you'll see the usual conflict screen to compare and reconcile rather than
                  overwriting anything.
                </Text>
              ) : null}
            </Dialog.Body>
            <Dialog.Footer gap={2}>
              <Button variant="outline" borderColor="border.default" size="sm" onClick={onDiscard}>
                Discard draft
              </Button>
              <Button
                bg="accent.solid"
                color="accent.contrast"
                _hover={{ bg: 'accent.hover' }}
                size="sm"
                onClick={onRestore}
              >
                Restore draft
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
