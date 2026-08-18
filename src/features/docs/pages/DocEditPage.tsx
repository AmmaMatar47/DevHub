import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Box,
  Button,
  chakra,
  Dialog,
  Flex,
  Input,
  Portal,
  Skeleton,
  Spinner,
  Stack,
  Tabs,
  Text,
  useBreakpointValue,
} from '@chakra-ui/react'
import { AlertTriangle, Check, History, Save } from 'lucide-react'
import { useBlocker, useNavigate } from 'react-router-dom'
import { MarkdownContent } from '@/lib/markdown'
import { EmptyState } from '@/shared/components/EmptyState'
import { useDocNode } from '../api/useDocNode'
import { docTreeQueryKey } from '../api/useDocTree'
import { SaveConflictError, useUpdateDocNode, type SavedDocNode } from '../api/useUpdateDocNode'
import { ConflictDialog } from '../components/editor/ConflictDialog'
import { MarkdownEditorPane } from '../components/editor/MarkdownEditorPane'
import { RestoreDraftDialog } from '../components/editor/RestoreDraftDialog'
import { StatusControl } from '../components/editor/StatusControl'
import { VersionHistoryPanel } from '../components/editor/VersionHistoryPanel'
import type { DocStatus, DocTreeNode } from '../lib/buildTree'
import { difficultyLabel } from '../lib/difficulty'
import { clearLocalDraft, readLocalDraft, writeLocalDraft, type LocalDraft } from '../lib/localDraft'

const AUTOSAVE_INTERVAL_MS = 4000
const DIFFICULTY_OPTIONS = [null, 1, 2, 3] as const

interface EditableState {
  title: string
  content_md: string
  difficulty: number | null
  status: DocStatus
}

interface Baseline extends EditableState {
  updatedAt: string
  publishedAt: string | null
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

interface DocEditPageProps {
  node: DocTreeNode
}

function draftDiffersFromServer(draft: LocalDraft, server: EditableState): boolean {
  return (
    draft.title !== server.title ||
    draft.content_md !== server.content_md ||
    draft.difficulty !== server.difficulty ||
    draft.status !== server.status
  )
}

export function DocEditPage({ node }: DocEditPageProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: full, isPending, isError, refetch } = useDocNode(node.id)
  const updateMutation = useUpdateDocNode()
  const isSplit = useBreakpointValue({ base: false, lg: true }) ?? false

  const [title, setTitle] = useState('')
  const [contentMd, setContentMd] = useState('')
  const [difficulty, setDifficulty] = useState<number | null>(null)
  const [status, setStatus] = useState<DocStatus>('draft')

  const [baseline, setBaseline] = useState<Baseline | null>(null)
  const [restorePrompt, setRestorePrompt] = useState<LocalDraft | null>(null)
  const [conflict, setConflict] = useState<SavedDocNode | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)

  const sourceRef = useRef<HTMLTextAreaElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const isSyncingScrollRef = useRef(false)

  // One-time initialization from the loaded row -- computed during render
  // (React's documented pattern for deriving state from a prop/query result)
  // rather than an effect, guarded by `baseline === null` so it only fires
  // once per node.
  if (full && baseline === null) {
    const server: EditableState = {
      title: full.title,
      content_md: full.content_md ?? '',
      difficulty: full.difficulty,
      status: full.status,
    }
    const draft = readLocalDraft(node.id)
    if (draft && draftDiffersFromServer(draft, server)) {
      setRestorePrompt(draft)
    }
    setTitle(server.title)
    setContentMd(server.content_md)
    setDifficulty(server.difficulty)
    setStatus(server.status)
    setBaseline({ ...server, updatedAt: full.updated_at, publishedAt: full.published_at })
  }

  const dirty =
    baseline !== null &&
    (title !== baseline.title ||
      contentMd !== baseline.content_md ||
      difficulty !== baseline.difficulty ||
      status !== baseline.status)

  // Autosave: local crash-recovery only, never a database write.
  useEffect(() => {
    if (!baseline) return
    const interval = setInterval(() => {
      if (dirty) {
        writeLocalDraft(node.id, {
          title,
          content_md: contentMd,
          difficulty,
          status,
          baseUpdatedAt: baseline.updatedAt,
          savedAt: new Date().toISOString(),
        })
      }
    }, AUTOSAVE_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [dirty, title, contentMd, difficulty, status, baseline, node.id])

  // Unsaved-changes guard: in-app navigation (back button included, since
  // it goes through the router) and tab close/refresh.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname,
  )

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!dirty) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [dirty])

  function handleRestoreDraft() {
    if (!restorePrompt) return
    setTitle(restorePrompt.title)
    setContentMd(restorePrompt.content_md)
    setDifficulty(restorePrompt.difficulty)
    setStatus(restorePrompt.status)
    setRestorePrompt(null)
  }

  function handleDiscardDraft() {
    clearLocalDraft(node.id)
    setRestorePrompt(null)
  }

  function performSave(values: { title: string; content_md: string; difficulty: number | null; status: DocStatus }) {
    if (!baseline || saveState === 'saving') return
    setSaveState('saving')
    setSaveError(null)

    const publishedAt =
      values.status === 'published' && baseline.publishedAt === null ? new Date().toISOString() : baseline.publishedAt

    updateMutation.mutate(
      { id: node.id, ...values, publishedAt, loadedAt: baseline.updatedAt },
      {
        onSuccess: (saved) => {
          if (saved.title !== baseline.title || saved.status !== baseline.status) {
            void queryClient.invalidateQueries({ queryKey: docTreeQueryKey })
          }
          clearLocalDraft(node.id)
          setBaseline({
            title: saved.title,
            content_md: saved.content_md ?? '',
            difficulty: saved.difficulty,
            status: saved.status,
            updatedAt: saved.updated_at,
            publishedAt: saved.published_at,
          })
          setTitle(saved.title)
          setContentMd(saved.content_md ?? '')
          setDifficulty(saved.difficulty)
          setStatus(saved.status)
          setSaveState('saved')
        },
        onError: (error) => {
          if (error instanceof SaveConflictError) {
            setConflict(error.serverRow)
            setSaveState('idle')
          } else {
            setSaveError(error instanceof Error ? error.message : 'Something went wrong saving this page.')
            setSaveState('error')
          }
        },
      },
    )
  }

  function handleSave() {
    performSave({ title, content_md: contentMd, difficulty, status })
  }

  function handleAcknowledgeConflict() {
    if (!conflict) return
    setBaseline((prev) => (prev ? { ...prev, updatedAt: conflict.updated_at, publishedAt: conflict.published_at } : prev))
    setConflict(null)
  }

  // Restore needs no special RPC -- it's the old title/content_md written
  // back through the exact same update path as a normal save (optimistic
  // concurrency, the version-snapshot trigger, everything), which is what
  // makes it itself reversible rather than a destructive one-off.
  function handleRestoreVersion(version: { title: string; content_md: string }) {
    setTitle(version.title)
    setContentMd(version.content_md)
    performSave({ title: version.title, content_md: version.content_md, difficulty, status })
  }

  function handleCancel() {
    void navigate(`/docs/${node.path.join('/')}`)
  }

  function syncScroll(source: HTMLElement, target: HTMLElement) {
    if (isSyncingScrollRef.current) return
    isSyncingScrollRef.current = true
    const sourceMax = source.scrollHeight - source.clientHeight
    const fraction = sourceMax > 0 ? source.scrollTop / sourceMax : 0
    const targetMax = target.scrollHeight - target.clientHeight
    target.scrollTop = fraction * targetMax
    requestAnimationFrame(() => {
      isSyncingScrollRef.current = false
    })
  }

  if (isPending) {
    return (
      <Stack gap={4}>
        <Skeleton height="9" width="50%" />
        <Skeleton height="500px" />
      </Stack>
    )
  }

  if (isError || !full) {
    return (
      <Stack gap={4} align="center">
        <EmptyState icon={AlertTriangle} title="Couldn't load this page" description="Something went wrong loading it for editing." />
        <Button onClick={() => void refetch()} variant="outline" size="sm">
          Try again
        </Button>
      </Stack>
    )
  }

  return (
    <Stack gap={4}>
      <Flex justify="space-between" align={{ base: 'start', lg: 'center' }} direction={{ base: 'column', lg: 'row' }} gap={3}>
        <Stack gap={2} flex="1" minW={0}>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Page title"
            variant="flushed"
            fontSize="xl"
            fontWeight="600"
            px={0}
            borderColor="border.default"
            _focusVisible={{ borderColor: 'accent.solid' }}
            aria-label="Page title"
          />
          <Flex align="center" gap={3} wrap="wrap">
            <StatusControl status={status} onChange={setStatus} />
            <Flex gap={1} role="radiogroup" aria-label="Difficulty">
              {DIFFICULTY_OPTIONS.map((option) => {
                const selected = option === difficulty
                return (
                  <chakra.button
                    key={option ?? 'none'}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setDifficulty(option)}
                    px={2.5}
                    py={1}
                    borderRadius="l1"
                    borderWidth="1px"
                    borderColor={selected ? 'accent.solid' : 'border.default'}
                    bg={selected ? 'accent.subtle' : 'bg.subtle'}
                    color={selected ? 'accent.fg' : 'fg.muted'}
                    fontSize="xs"
                    fontWeight={selected ? '600' : '500'}
                    cursor="pointer"
                  >
                    {difficultyLabel(option)}
                  </chakra.button>
                )
              })}
            </Flex>
          </Flex>
        </Stack>

        <Flex align="center" gap={2} flexShrink={0}>
          <SaveStatus state={saveState} error={saveError} dirty={dirty} />
          <Button variant="outline" size="sm" borderColor="border.default" onClick={() => setHistoryOpen(true)}>
            <History size={14} />
            History
          </Button>
          <Button variant="outline" size="sm" borderColor="border.default" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            size="sm"
            bg="accent.solid"
            color="accent.contrast"
            _hover={{ bg: 'accent.hover' }}
            onClick={handleSave}
            loading={saveState === 'saving'}
          >
            <Save size={14} />
            Save
          </Button>
        </Flex>
      </Flex>

      {isSplit ? (
        <Flex
          borderWidth="1px"
          borderColor="border.default"
          borderRadius="l2"
          overflow="hidden"
          h="calc(100vh - 260px)"
          minH="480px"
        >
          <Box flex="1" minW={0} borderRightWidth="1px" borderColor="border.default">
            <MarkdownEditorPane
              value={contentMd}
              onChange={setContentMd}
              onSave={handleSave}
              textareaRef={sourceRef}
              nodeId={node.id}
              onScroll={(event) => {
                if (previewRef.current) syncScroll(event.currentTarget, previewRef.current)
              }}
            />
          </Box>
          <Box
            flex="1"
            minW={0}
            overflowY="auto"
            ref={previewRef}
            onScroll={(event) => {
              if (sourceRef.current) syncScroll(event.currentTarget, sourceRef.current)
            }}
            p={6}
          >
            <MarkdownContent content={contentMd} />
          </Box>
        </Flex>
      ) : (
        <Tabs.Root defaultValue="write" fitted>
          <Tabs.List>
            <Tabs.Trigger value="write">Write</Tabs.Trigger>
            <Tabs.Trigger value="preview">Preview</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="write" p={0} h="60vh" minH="400px" borderWidth="1px" borderColor="border.default" borderRadius="l2" overflow="hidden">
            <MarkdownEditorPane
              value={contentMd}
              onChange={setContentMd}
              onSave={handleSave}
              textareaRef={sourceRef}
              nodeId={node.id}
            />
          </Tabs.Content>
          <Tabs.Content
            value="preview"
            h="60vh"
            minH="400px"
            overflowY="auto"
            borderWidth="1px"
            borderColor="border.default"
            borderRadius="l2"
            p={6}
          >
            <MarkdownContent content={contentMd} />
          </Tabs.Content>
        </Tabs.Root>
      )}

      {restorePrompt ? (
        <RestoreDraftDialog
          open
          draft={restorePrompt}
          serverChangedSinceDraft={restorePrompt.baseUpdatedAt !== full.updated_at}
          onRestore={handleRestoreDraft}
          onDiscard={handleDiscardDraft}
        />
      ) : null}

      {conflict ? (
        <ConflictDialog
          open
          onClose={() => setConflict(null)}
          myVersion={{ title, content_md: contentMd }}
          serverVersion={conflict}
          onAcknowledge={handleAcknowledgeConflict}
        />
      ) : null}

      <VersionHistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        nodeId={node.id}
        currentTitle={title}
        currentContent={contentMd}
        onRestore={handleRestoreVersion}
      />

      {blocker.state === 'blocked' ? (
        <UnsavedChangesPrompt onProceed={() => blocker.proceed()} onCancel={() => blocker.reset()} />
      ) : null}
    </Stack>
  )
}

function SaveStatus({ state, error, dirty }: { state: SaveState; error: string | null; dirty: boolean }) {
  if (state === 'saving') {
    return (
      <Flex align="center" gap={1.5} fontSize="xs" color="fg.muted">
        <Spinner size="xs" />
        Saving…
      </Flex>
    )
  }
  if (state === 'error') {
    return (
      <Flex align="center" gap={1.5} fontSize="xs" color="error" maxW="240px">
        <AlertTriangle size={13} />
        <Text truncate title={error ?? undefined}>
          {error ?? 'Save failed'}
        </Text>
      </Flex>
    )
  }
  if (state === 'saved' && !dirty) {
    return (
      <Flex align="center" gap={1.5} fontSize="xs" color="success">
        <Check size={13} />
        Saved
      </Flex>
    )
  }
  if (dirty) {
    return (
      <Text fontSize="xs" color="fg.subtle">
        Unsaved changes
      </Text>
    )
  }
  return null
}

function UnsavedChangesPrompt({ onProceed, onCancel }: { onProceed: () => void; onCancel: () => void }) {
  return (
    <Dialog.Root open onOpenChange={(details) => !details.open && onCancel()} role="alertdialog">
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content bg="bg.surface" borderColor="border.default" borderRadius="l2" maxW="360px">
            <Dialog.Header>
              <Dialog.Title fontSize="md">Leave without saving?</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Text fontSize="sm" color="fg.muted">
                You have unsaved changes to this page. They&apos;re autosaved locally, but not to the database.
              </Text>
            </Dialog.Body>
            <Dialog.Footer gap={2}>
              <Button variant="outline" size="sm" borderColor="border.default" onClick={onCancel}>
                Stay
              </Button>
              <Button variant="outline" size="sm" borderColor="error" color="error" onClick={onProceed}>
                Leave
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
