import { useLayoutEffect, useRef, type RefObject, type UIEvent } from 'react'
import { Flex, IconButton, Separator, Textarea } from '@chakra-ui/react'
import { Bold, Code, Heading2, Italic, Link as LinkIcon } from 'lucide-react'

interface MarkdownEditorPaneProps {
  value: string
  onChange: (value: string) => void
  onSave: () => void
  textareaRef: RefObject<HTMLTextAreaElement | null>
  onScroll?: (event: UIEvent<HTMLTextAreaElement>) => void
}

/**
 * Toolbar + textarea, kept together since the toolbar needs direct access
 * to the textarea's selection. Deliberately a plain, well-behaved textarea
 * rather than a WYSIWYG dependency -- the markdown source stays the single
 * source of truth, and this is what lib/markdown.tsx renders for preview.
 */
export function MarkdownEditorPane({ value, onChange, onSave, textareaRef, onScroll }: MarkdownEditorPaneProps) {
  const pendingSelectionRef = useRef<[number, number] | null>(null)

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

  return (
    <Flex direction="column" h="full" minH={0}>
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
      </Flex>
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
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
