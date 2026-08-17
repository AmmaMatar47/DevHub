import { IconButton } from '@chakra-ui/react'
import { Pencil } from 'lucide-react'
import { useEditMode } from '../context/EditModeContext'

/**
 * Editor/admin only. Off by default, persisted per user -- flipping it on
 * is what makes edit affordances (the Edit button on a doc page, its status
 * control, its history entry point) appear; badges for draft/needs_review
 * nodes are unaffected either way, since an editor still needs to proofread
 * unpublished pages while just reading.
 */
export function EditModeToggle() {
  const { editMode, canEdit, toggleEditMode } = useEditMode()

  if (!canEdit) return null

  const label = editMode ? 'Turn off edit mode (Ctrl+E)' : 'Turn on edit mode (Ctrl+E)'

  return (
    <IconButton
      aria-label={label}
      title={label}
      aria-pressed={editMode}
      variant={editMode ? 'solid' : 'ghost'}
      bg={editMode ? 'accent.solid' : undefined}
      color={editMode ? 'accent.contrast' : undefined}
      _hover={editMode ? { bg: 'accent.hover' } : undefined}
      size="sm"
      onClick={toggleEditMode}
    >
      <Pencil size={16} />
    </IconButton>
  )
}
