import { useState } from 'react'
import { Box, Button, chakra, Dialog, Flex, Portal, Skeleton, Stack, Text } from '@chakra-ui/react'
import { History, X } from 'lucide-react'
import { MarkdownContent } from '@/lib/markdown'
import { EmptyState } from '@/shared/components/EmptyState'
import { useDocVersions, type DocVersion } from '../../api/useDocVersions'
import type { DocStatus } from '../../lib/buildTree'
import { VersionDiffView } from './VersionDiffView'

const versionDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

interface VersionHistoryPanelProps {
  open: boolean
  onClose: () => void
  nodeId: string
  /** The editor's current content/metadata, used as the "current" side of
   * the diff -- not necessarily what's saved on the server if there are
   * unsaved edits. */
  currentTitle: string
  currentContent: string
  currentSlug: string
  currentStatus: DocStatus
  currentDifficulty: number | null
  onRestore: (version: { title: string; content_md: string; slug: string; status: DocStatus; difficulty: number | null }) => void
}

/**
 * doc_versions has been append-only with no read path since M1 -- this is
 * that read path. Editor/admin only, enforced by doc_versions_select_editor.
 */
export function VersionHistoryPanel({
  open,
  onClose,
  nodeId,
  currentTitle,
  currentContent,
  currentSlug,
  currentStatus,
  currentDifficulty,
  onRestore,
}: VersionHistoryPanelProps) {
  const { data: versions, isPending, isError } = useDocVersions(open ? nodeId : undefined)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [autoSelectedFor, setAutoSelectedFor] = useState<string | null>(null)
  const [mode, setMode] = useState<'view' | 'diff'>('view')
  const [confirmingRestore, setConfirmingRestore] = useState(false)

  // Select the newest version once versions load for this node -- computed
  // during render (not an effect) so it never fights a manual selection.
  if (versions && versions.length > 0 && autoSelectedFor !== nodeId) {
    setSelectedId(versions[0]?.id ?? null)
    setAutoSelectedFor(nodeId)
  }

  const selected: DocVersion | null = versions?.find((version) => version.id === selectedId) ?? null

  function handleClose() {
    setSelectedId(null)
    setAutoSelectedFor(null)
    setMode('view')
    setConfirmingRestore(false)
    onClose()
  }

  return (
    <Dialog.Root open={open} onOpenChange={(details) => !details.open && handleClose()}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content bg="bg.surface" borderColor="border.default" borderRadius="l2" maxW="1000px" w="92vw" h="80vh">
            <Dialog.Header>
              <Dialog.Title fontSize="md">Version history</Dialog.Title>
              <Button variant="ghost" size="xs" position="absolute" top={3} right={3} onClick={handleClose}>
                <X size={16} />
              </Button>
            </Dialog.Header>
            <Dialog.Body display="flex" flexDirection={{ base: 'column', md: 'row' }} gap={4} minH={0} overflow="hidden">
              <Box
                w={{ base: 'full', md: '260px' }}
                flexShrink={0}
                borderRightWidth={{ base: 0, md: '1px' }}
                borderBottomWidth={{ base: '1px', md: 0 }}
                borderColor="border.default"
                pr={{ base: 0, md: 3 }}
                pb={{ base: 3, md: 0 }}
                overflowY="auto"
              >
                {isPending ? (
                  <Stack gap={2}>
                    <Skeleton height="4" />
                    <Skeleton height="4" />
                    <Skeleton height="4" />
                  </Stack>
                ) : isError ? (
                  <Text fontSize="sm" color="fg.muted">
                    Couldn&apos;t load version history.
                  </Text>
                ) : versions && versions.length > 0 ? (
                  <Stack gap={1}>
                    {versions.map((version) => {
                      const isSelected = version.id === selectedId
                      return (
                        <chakra.button
                          key={version.id}
                          type="button"
                          onClick={() => setSelectedId(version.id)}
                          display="block"
                          w="full"
                          textAlign="left"
                          px={2}
                          py={2}
                          borderRadius="l1"
                          borderLeftWidth="2px"
                          borderLeftColor={isSelected ? 'accent.solid' : 'transparent'}
                          bg={isSelected ? 'accent.subtle' : 'transparent'}
                          cursor="pointer"
                          _hover={{ bg: isSelected ? 'accent.subtle' : 'bg.subtle' }}
                        >
                          <Text fontSize="sm" fontWeight={isSelected ? '600' : '500'} color={isSelected ? 'accent.fg' : 'fg.default'}>
                            {versionDateFormatter.format(new Date(version.created_at))}
                          </Text>
                          <Text fontSize="xs" color="fg.muted">
                            {version.editor?.display_name ?? 'Unknown editor'}
                            {version.is_approximate ? ' · approximate metadata' : ''}
                          </Text>
                        </chakra.button>
                      )
                    })}
                  </Stack>
                ) : (
                  <EmptyState
                    icon={History}
                    title="No history yet"
                    description="Versions are only recorded when a published page is edited."
                  />
                )}
              </Box>

              <Box flex="1" minW={0} overflowY="auto">
                {selected ? (
                  <Stack gap={3} h="full">
                    <Flex justify="space-between" align="center" wrap="wrap" gap={2}>
                      <Flex gap={1}>
                        <Button
                          size="xs"
                          variant={mode === 'view' ? 'solid' : 'outline'}
                          borderColor="border.default"
                          bg={mode === 'view' ? 'accent.solid' : undefined}
                          color={mode === 'view' ? 'accent.contrast' : undefined}
                          onClick={() => setMode('view')}
                        >
                          View
                        </Button>
                        <Button
                          size="xs"
                          variant={mode === 'diff' ? 'solid' : 'outline'}
                          borderColor="border.default"
                          bg={mode === 'diff' ? 'accent.solid' : undefined}
                          color={mode === 'diff' ? 'accent.contrast' : undefined}
                          onClick={() => setMode('diff')}
                        >
                          Diff against current
                        </Button>
                      </Flex>
                      {confirmingRestore ? (
                        <Flex gap={2} align="center">
                          <Text fontSize="xs" color="fg.muted">
                            Restore will create a new version, not overwrite this one. Title, content, slug, status, and
                            difficulty all revert to this version.
                          </Text>
                          <Button size="xs" variant="outline" borderColor="border.default" onClick={() => setConfirmingRestore(false)}>
                            Cancel
                          </Button>
                          <Button
                            size="xs"
                            bg="accent.solid"
                            color="accent.contrast"
                            _hover={{ bg: 'accent.hover' }}
                            onClick={() => {
                              onRestore({
                                title: selected.title,
                                content_md: selected.content_md ?? '',
                                slug: selected.slug,
                                status: selected.status,
                                difficulty: selected.difficulty,
                              })
                              setConfirmingRestore(false)
                              handleClose()
                            }}
                          >
                            Confirm restore
                          </Button>
                        </Flex>
                      ) : (
                        <Button size="xs" variant="outline" borderColor="border.default" onClick={() => setConfirmingRestore(true)}>
                          Restore this version
                        </Button>
                      )}
                    </Flex>

                    {selected.is_approximate ? (
                      <Text fontSize="xs" color="fg.muted">
                        Slug, status, and difficulty on this version were backfilled from the page&apos;s current values when
                        this column was added, not captured at the time this version was actually saved.
                      </Text>
                    ) : null}

                    {mode === 'view' ? (
                      <Box borderWidth="1px" borderColor="border.default" borderRadius="l1" p={4} overflowY="auto">
                        <Text fontWeight="600" fontSize="lg" mb={3}>
                          {selected.title}
                        </Text>
                        <MarkdownContent content={selected.content_md ?? ''} />
                      </Box>
                    ) : (
                      <VersionDiffView
                        oldText={`${selected.title}\n\n${selected.content_md ?? ''}`}
                        newText={`${currentTitle}\n\n${currentContent}`}
                        oldMeta={{ slug: selected.slug, status: selected.status, difficulty: selected.difficulty }}
                        newMeta={{ slug: currentSlug, status: currentStatus, difficulty: currentDifficulty }}
                      />
                    )}
                  </Stack>
                ) : null}
              </Box>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
