import { Flex, Menu, Switch, Text } from '@chakra-ui/react'
import { Pencil } from 'lucide-react'
import { useEditMode } from '../context/EditModeContext'

/**
 * Editor/admin only. Lives in the profile menu rather than as a standalone
 * header control -- a labeled row reads more clearly than an icon alone.
 * The whole row is one click target (Menu.Item's own onClick), so the
 * Switch itself is purely visual (pointerEvents="none") to avoid double
 * handling a click that lands on it directly. closeOnSelect is off since
 * flipping this is a "stay and see the state change" interaction, not a
 * navigate-away one.
 */
export function EditModeMenuItem() {
  const { editMode, canEdit, setEditMode } = useEditMode()

  if (!canEdit) return null

  return (
    <Menu.Item
      value="edit-mode"
      closeOnSelect={false}
      onClick={() => setEditMode(!editMode)}
      _hover={{ bg: 'bg.subtle' }}
    >
      <Flex align="center" justify="space-between" w="full" gap={3}>
        <Flex align="center" gap={2}>
          <Pencil size={15} />
          <Text>Edit mode</Text>
        </Flex>
        <Switch.Root checked={editMode} pointerEvents="none" tabIndex={-1} aria-hidden>
          <Switch.HiddenInput />
          <Switch.Control
            bg={editMode ? 'accent.solid' : 'bg.subtle'}
            borderWidth="1px"
            borderColor={editMode ? 'accent.solid' : 'border.default'}
          >
            <Switch.Thumb bg="bg.surface" />
          </Switch.Control>
        </Switch.Root>
      </Flex>
    </Menu.Item>
  )
}
