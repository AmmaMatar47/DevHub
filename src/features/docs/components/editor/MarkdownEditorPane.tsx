import { useLayoutEffect, useRef, useState, type RefObject, type UIEvent } from 'react'
import { Flex, IconButton, Separator, Spinner, Text, Textarea } from '@chakra-ui/react'
import { AlertTriangle, Bold, Code, Heading2, Image as ImageIcon, Italic, Link as LinkIcon, X } from 'lucide-react'
import { useUploadDocImage } from '../../api/useUploadDocImage'
import { ACCEPTED_IMAGE_MIME } from '../../lib/imagePipeline'

interface MarkdownEditorPaneProps {
  value: string
  onChange: (value: string) => void
  onSave: () => void
  textareaRef: RefObject<HTMLTextAreaElement | null>
  onScroll?: (event: UIEvent<HTMLTextAreaElement>) => void
  /** Images upload into storage under `{nodeId}/{uuid}.webp` -- required to
   * paste, drop, or pick a file, so every entry point below is a no-op
   * until a real node exists. */
  nodeId: string
}

type UploadState = { status: 'uploading'; name: string } | { status: 'error'; message: string } | null

/**
 * Toolbar + textarea, kept together since the toolbar needs direct access
 * to the textarea's selection. Deliberately a plain, well-behaved textarea
 * rather than a WYSIWYG dependency -- the markdown source stays the single
 * source of truth, and this is what lib/markdown.tsx renders for preview.
 */
export function MarkdownEditorPane({ value, onChange, onSave, textareaRef, onScroll, nodeId }: MarkdownEditorPaneProps) {
  const pendingSelectionRef = useRef<[number, number] | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadState, setUploadState] = useState<UploadState>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const uploadMutation = useUploadDocImage()

  useLayoutEffect(() => {
    const pending = pendingSelectionRef.current
    const el = textareaRef.current
    if (pending && el) {
      el.focus()
      el.setSelectionRange(pending[0], pending[1])
      pendingSelectionRef.current = null
    }
  }, [value, textareaRef])

  function wrapSelection(before: string, after: string, placeholder: string) {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = value.slice(start, end) || placeholder
    const newValue = value.slice(0, start) + before + selected + after + value.slice(end)
    pendingSelectionRef.current = [start + before.length, start + before.length + selected.length]
    onChange(newValue)
  }

  function insertLink() {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = value.slice(start, end) || 'link text'
    const url = 'url'
    const insertion = `[${selected}](${url})`
    const newValue = value.slice(0, start) + insertion + value.slice(end)
    const urlStart = start + selected.length + 3
    pendingSelectionRef.current = [urlStart, urlStart + url.length]
    onChange(newValue)
  }

  function insertHeading() {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const lineStart = value.lastIndexOf('\n', start - 1) + 1
    const prefix = '## '
    const newValue = value.slice(0, lineStart) + prefix + value.slice(lineStart)
    pendingSelectionRef.current = [start + prefix.length, end + prefix.length]
    onChange(newValue)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Tab') {
      event.preventDefault()
      const el = event.currentTarget
      const start = el.selectionStart
      const end = el.selectionEnd
      const newValue = value.slice(0, start) + '  ' + value.slice(end)
      pendingSelectionRef.current = [start + 2, start + 2]
      onChange(newValue)
      return
    }

    const mod = event.metaKey || event.ctrlKey
    if (!mod) return

    const key = event.key.toLowerCase()
    if (key === 'b') {
      event.preventDefault()
      wrapSelection('**', '**', 'bold text')
    } else if (key === 'i') {
      event.preventDefault()
      wrapSelection('*', '*', 'italic text')
    } else if (key === 's') {
      event.preventDefault()
      onSave()
    }
  }

  function insertAtPosition(text: string, at: number) {
    const newValue = value.slice(0, at) + text + value.slice(at)
    const cursor = at + text.length
    pendingSelectionRef.current = [cursor, cursor]
    onChange(newValue)
  }

  /**
   * Shared by all three entry points (paste/drop/toolbar). Nothing is
   * inserted into content_md until the upload actually succeeds -- the
   * markdown and the doc_images row are written together server-side, so
   * there's never a window where the editor holds a reference to an image
   * that doesn't exist yet.
   */
  function uploadFile(file: File, insertAt: number) {
    setUploadState({ status: 'uploading', name: file.name })
    uploadMutation.mutate(
      { nodeId, file },
      {
        onSuccess: (result) => {
          insertAtPosition(result.markdown, insertAt)
          setUploadState(null)
        },
        onError: (error) => {
          setUploadState({
            status: 'error',
            message: error instanceof Error ? error.message : 'Something went wrong uploading this image.',
          })
        },
      },
    )
  }

  function handlePaste(event: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = event.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          event.preventDefault()
          uploadFile(file, event.currentTarget.selectionStart)
        }
        return
      }
    }
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    if (Array.from(event.dataTransfer.types).includes('Files')) {
      event.preventDefault()
      setIsDragOver(true)
    }
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragOver(false)
    const file = Array.from(event.dataTransfer.files).find((candidate) => candidate.type.startsWith('image/'))
    if (!file) return
    uploadFile(file, textareaRef.current ? textareaRef.current.selectionStart : value.length)
  }

  function handleFileInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    uploadFile(file, textareaRef.current ? textareaRef.current.selectionStart : value.length)
  }

  return (
    <Flex
      direction="column"
      h="full"
      minH={0}
      position="relative"
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      <Flex
        gap={1}
        px={2}
        py={1.5}
        borderBottomWidth="1px"
        borderColor="border.default"
        bg="bg.subtle"
        flexShrink={0}
      >
        <ToolbarButton label="Bold (Ctrl+B)" onClick={() => wrapSelection('**', '**', 'bold text')}>
          <Bold size={15} />
        </ToolbarButton>
        <ToolbarButton label="Italic (Ctrl+I)" onClick={() => wrapSelection('*', '*', 'italic text')}>
          <Italic size={15} />
        </ToolbarButton>
        <ToolbarButton label="Link" onClick={insertLink}>
          <LinkIcon size={15} />
        </ToolbarButton>
        <ToolbarButton label="Code" onClick={() => wrapSelection('`', '`', 'code')}>
          <Code size={15} />
        </ToolbarButton>
        <Separator orientation="vertical" h="20px" alignSelf="center" />
        <ToolbarButton label="Heading" onClick={insertHeading}>
          <Heading2 size={15} />
        </ToolbarButton>
        <ToolbarButton label="Insert image" onClick={() => fileInputRef.current?.click()}>
          <ImageIcon size={15} />
        </ToolbarButton>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_IMAGE_MIME}
          onChange={handleFileInputChange}
          hidden
          aria-hidden="true"
          tabIndex={-1}
        />
      </Flex>

      {uploadState ? (
        <Flex
          align="center"
          gap={2}
          px={4}
          py={1.5}
          fontSize="xs"
          borderBottomWidth="1px"
          borderColor="border.default"
          bg={uploadState.status === 'error' ? 'errorSubtle' : 'bg.subtle'}
          color={uploadState.status === 'error' ? 'error' : 'fg.muted'}
          flexShrink={0}
        >
          {uploadState.status === 'uploading' ? (
            <>
              <Spinner size="xs" />
              <Text truncate>Uploading {uploadState.name}…</Text>
            </>
          ) : (
            <>
              <AlertTriangle size={13} />
              <Text truncate flex="1">
                {uploadState.message}
              </Text>
              <IconButton
                aria-label="Dismiss"
                size="2xs"
                variant="ghost"
                onClick={() => setUploadState(null)}
              >
                <X size={12} />
              </IconButton>
            </>
          )}
        </Flex>
      ) : null}

      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onScroll={onScroll}
        flex="1"
        minH={0}
        resize="none"
        borderWidth="0"
        borderRadius="0"
        fontFamily="mono"
        fontSize="sm"
        lineHeight="1.7"
        p={4}
        _focusVisible={{ outline: 'none', boxShadow: 'none' }}
        spellCheck={false}
        aria-label="Markdown source"
      />

      {isDragOver ? (
        <Flex
          position="absolute"
          inset={0}
          align="center"
          justify="center"
          bg="accent.subtle"
          borderWidth="2px"
          borderStyle="dashed"
          borderColor="accent.solid"
          pointerEvents="none"
          zIndex={1}
        >
          <Flex direction="column" align="center" gap={2} color="accent.fg" fontWeight="600">
            <ImageIcon size={28} />
            <Text fontSize="sm">Drop image to upload</Text>
          </Flex>
        </Flex>
      ) : null}
    </Flex>
  )
}

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <IconButton
      aria-label={label}
      title={label}
      type="button"
      size="xs"
      variant="ghost"
      onClick={onClick}
      tabIndex={0}
    >
      {children}
    </IconButton>
  )
}
