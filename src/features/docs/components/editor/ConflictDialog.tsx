import { Box, Button, Dialog, Flex, Portal, SimpleGrid, Text } from '@chakra-ui/react'
import { Copy, X } from 'lucide-react'
import type { SavedDocNode } from '../../api/useUpdateDocNode'

interface ConflictDialogProps {
  open: boolean
  onClose: () => void
  myVersion: { title: string; content_md: string }
  serverVersion: SavedDocNode
  /** Rebases the save baseline to the server's current updated_at, without
   * touching a single character of the user's own draft -- their next save
   * attempt can then succeed once they've manually reconciled. */
  onAcknowledge: () => void
}

/**
 * Shown when a save comes back with zero rows and a refetch confirms it's
 * because someone else saved first (see SaveConflictError). No auto-merge:
 * both versions are just laid out for comparison so the user can copy
 * whatever they need across by hand. Dismissing without "Continue editing"
 * changes nothing -- the next save attempt will hit the same conflict again,
 * which is the safe default.
 */
export function ConflictDialog({ open, onClose, myVersion, serverVersion, onAcknowledge }: ConflictDialogProps) {
  async function copyMine() {
    await navigator.clipboard.writeText(`# ${myVersion.title}\n\n${myVersion.content_md}`)
  }

  return (
    <Dialog.Root open={open} onOpenChange={(details) => !details.open && onClose()}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content bg="bg.surface" borderColor="border.default" borderRadius="l2" maxW="900px" w="90vw">
            <Dialog.Header>
              <Dialog.Title fontSize="md">Someone else saved changes to this page</Dialog.Title>
              <Button variant="ghost" size="xs" position="absolute" top={3} right={3} onClick={onClose}>
                <X size={16} />
              </Button>
            </Dialog.Header>
            <Dialog.Body>
              <Text fontSize="sm" color="fg.muted" mb={4}>
                Your save didn't go through, and nothing was overwritten. Compare the two versions below, then
                copy whatever you need from the server version into your own before saving again.
              </Text>
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                <Box>
                  <Flex justify="space-between" align="center" mb={1}>
                    <Text fontWeight="600" fontSize="sm">
                      Your version (unsaved)
                    </Text>
                    <Button size="xs" variant="outline" borderColor="border.default" onClick={() => void copyMine()}>
                      <Copy size={12} />
                      Copy
                    </Button>
                  </Flex>
                  <VersionPreview title={myVersion.title} content={myVersion.content_md} />
                </Box>
                <Box>
                  <Text fontWeight="600" fontSize="sm" mb={1}>
                    Current version on the server
                  </Text>
                  <VersionPreview title={serverVersion.title} content={serverVersion.content_md ?? ''} />
                </Box>
              </SimpleGrid>
            </Dialog.Body>
            <Dialog.Footer>
              <Button
                bg="accent.solid"
                color="accent.contrast"
                _hover={{ bg: 'accent.hover' }}
                size="sm"
                onClick={onAcknowledge}
              >
                Continue editing (I&apos;ll reconcile manually)
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

function VersionPreview({ title, content }: { title: string; content: string }) {
  return (
    <Box
      as="pre"
      borderWidth="1px"
      borderColor="border.default"
      borderRadius="l1"
      bg="bg.subtle"
      p={3}
      maxH="320px"
      overflowY="auto"
      fontFamily="mono"
      fontSize="xs"
      whiteSpace="pre-wrap"
    >
      {title}
      {'\n\n'}
      {content}
    </Box>
  )
}
