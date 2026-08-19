import { useState } from 'react'
import { Button, chakra, Dialog, Flex, Input, Portal, Stack, Text } from '@chakra-ui/react'
import { useNavigate } from 'react-router-dom'
import { useCreateDocNode } from '../api/useCreateDocNode'
import type { DocKind } from '../lib/buildTree'
import { SLUG_PATTERN, slugify } from '../lib/slugify'

const KIND_LABEL: Record<DocKind, string> = {
  section: 'Section',
  page: 'Page',
}
const KIND_ORDER: DocKind[] = ['section', 'page']

export interface CreateDocNodeParent {
  id: string
  depth: number
  path: string[]
  title: string
}

interface CreateDocNodeDialogProps {
  open: boolean
  onClose: () => void
  /** null creates a new root section (sidebar top-level). */
  parent: CreateDocNodeParent | null
}

/**
 * Depth-3 parents are blocked with an explanation inside the dialog rather
 * than by disabling whatever opened it -- a silently-disabled "+" gives no
 * indication of *why*, and the depth cap is exactly the kind of thing an
 * editor wouldn't otherwise think to check.
 */
export function CreateDocNodeDialog({ open, onClose, parent }: CreateDocNodeDialogProps) {
  const navigate = useNavigate()
  const createMutation = useCreateDocNode()

  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [kind, setKind] = useState<DocKind>(parent ? 'page' : 'section')
  const [error, setError] = useState<string | null>(null)

  const atDepthCap = parent !== null && parent.depth >= 3
  const trimmedTitle = title.trim()
  const slugFormatValid = SLUG_PATTERN.test(slug)
  const canSubmit = !atDepthCap && trimmedTitle.length > 0 && slugFormatValid && !createMutation.isPending

  function reset() {
    setTitle('')
    setSlug('')
    setSlugTouched(false)
    setKind(parent ? 'page' : 'section')
    setError(null)
    createMutation.reset()
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleTitleChange(value: string) {
    setTitle(value)
    if (!slugTouched) setSlug(slugify(value))
  }

  function handleSubmit() {
    if (!canSubmit) return
    setError(null)
    createMutation.mutate(
      { parentId: parent?.id ?? null, title: trimmedTitle, slug, kind },
      {
        onSuccess: (created) => {
          const path = [...(parent?.path ?? []), created.slug]
          reset()
          onClose()
          void navigate(`/docs/${path.join('/')}/edit`)
        },
        onError: (mutationError) => {
          setError(mutationError instanceof Error ? mutationError.message : 'Something went wrong creating this page.')
        },
      },
    )
  }

  return (
    <Dialog.Root open={open} onOpenChange={(details) => !details.open && handleClose()}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content bg="bg.surface" borderColor="border.default" borderRadius="l2" maxW="440px">
            <Dialog.Header>
              <Dialog.Title fontSize="md">{parent ? `New page under ${parent.title}` : 'New section'}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              {atDepthCap ? (
                <Text fontSize="sm" color="fg.muted">
                  "{parent?.title}" is already at the maximum nesting depth (4 levels). Create the new page under a
                  shallower section instead.
                </Text>
              ) : (
                <Stack gap={3}>
                  <Stack gap={1}>
                    <Text fontSize="xs" fontWeight="600" color="fg.muted">
                      Title
                    </Text>
                    <Input
                      value={title}
                      onChange={(event) => handleTitleChange(event.target.value)}
                      placeholder="Page title"
                      size="sm"
                      borderColor="border.default"
                      autoFocus
                    />
                  </Stack>

                  <Stack gap={1}>
                    <Text fontSize="xs" fontWeight="600" color="fg.muted">
                      Slug
                    </Text>
                    <Input
                      value={slug}
                      onChange={(event) => {
                        setSlug(event.target.value)
                        setSlugTouched(true)
                      }}
                      placeholder="page-slug"
                      size="sm"
                      fontFamily="mono"
                      borderColor={slug.length > 0 && !slugFormatValid ? 'error' : 'border.default'}
                    />
                    {slug.length > 0 && !slugFormatValid ? (
                      <Text fontSize="xs" color="error">
                        Lowercase letters, numbers, and hyphens only -- no leading, trailing, or doubled hyphens.
                      </Text>
                    ) : null}
                  </Stack>

                  <Stack gap={1}>
                    <Text fontSize="xs" fontWeight="600" color="fg.muted">
                      Kind
                    </Text>
                    <Flex gap={1} role="radiogroup" aria-label="Kind">
                      {KIND_ORDER.map((option) => {
                        const selected = option === kind
                        return (
                          <chakra.button
                            key={option}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => setKind(option)}
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
                            _hover={{ borderColor: selected ? 'accent.solid' : 'border.strong' }}
                          >
                            {KIND_LABEL[option]}
                          </chakra.button>
                        )
                      })}
                    </Flex>
                  </Stack>

                  {error ? (
                    <Text fontSize="xs" color="error">
                      {error}
                    </Text>
                  ) : null}
                </Stack>
              )}
            </Dialog.Body>
            <Dialog.Footer gap={2}>
              <Button variant="outline" borderColor="border.default" size="sm" onClick={handleClose}>
                Cancel
              </Button>
              {atDepthCap ? null : (
                <Button
                  bg="accent.solid"
                  color="accent.contrast"
                  _hover={{ bg: 'accent.hover' }}
                  size="sm"
                  onClick={handleSubmit}
                  loading={createMutation.isPending}
                  disabled={!canSubmit}
                >
                  Create
                </Button>
              )}
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
