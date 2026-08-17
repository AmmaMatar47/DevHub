import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react'
import { useAuth } from '@/features/auth/context/AuthContext'
import { hasMinimumRole } from '@/features/auth/lib/roles'

interface EditModeContextValue {
  /** What every edit affordance should actually check -- true only when
   * the user is editor+ *and* has switched edit mode on. */
  editMode: boolean
  /** The role check alone, for deciding whether to show the toggle itself. */
  canEdit: boolean
  toggleEditMode: () => void
  setEditMode: (value: boolean) => void
}

const EditModeContext = createContext<EditModeContextValue | null>(null)

function storageKey(userId: string): string {
  return `devhub:edit-mode:${userId}`
}

/**
 * Shared "am I in edit mode" state -- gates affordances (edit button,
 * status control, history entry point on the read view), never access.
 * RLS is unchanged and is what actually enforces who can write; a user with
 * this off who navigates straight to an edit URL still gets the editor,
 * because the boundary was never here. Deliberately built as its own
 * provider (not folded into AuthContext) so M4b's create/move/reorder/
 * delete affordances can hang off the same switch without growing auth's
 * responsibilities.
 *
 * Defaults off and persists per user in localStorage -- a role's own
 * on/off preference, not a global one, and never left on by default just
 * because someone else on the same machine turned it on.
 */
export function EditModeProvider({ children }: PropsWithChildren) {
  const { session, role } = useAuth()
  const userId = session?.user.id
  const canEdit = hasMinimumRole(role, 'editor')

  const [editModeRaw, setEditModeRaw] = useState(false)
  const [loadedFor, setLoadedFor] = useState<string | null>(null)

  // Load the per-user preference once we know who's signed in -- computed
  // during render, guarded so it only runs once per userId, rather than in
  // an effect (see the identical pattern in DocTreeNav's ancestor auto-expand).
  if (userId && loadedFor !== userId) {
    setEditModeRaw(localStorage.getItem(storageKey(userId)) === 'true')
    setLoadedFor(userId)
  }

  function setEditMode(value: boolean) {
    setEditModeRaw(value)
    if (userId) localStorage.setItem(storageKey(userId), String(value))
  }

  function toggleEditMode() {
    setEditMode(!editModeRaw)
  }

  useEffect(() => {
    if (!canEdit) return
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'e') {
        event.preventDefault()
        toggleEditMode()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEdit, editModeRaw])

  // Never true for a non-editor, even if a stale preference exists from
  // before a role downgrade.
  const editMode = canEdit && editModeRaw

  return (
    <EditModeContext.Provider value={{ editMode, canEdit, toggleEditMode, setEditMode }}>
      {children}
    </EditModeContext.Provider>
  )
}

export function useEditMode(): EditModeContextValue {
  const context = useContext(EditModeContext)
  if (!context) throw new Error('useEditMode must be used within an EditModeProvider')
  return context
}
