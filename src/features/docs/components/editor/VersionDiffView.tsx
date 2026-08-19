import { Box, Stack, Text } from '@chakra-ui/react'
import { diffLines } from '../../lib/diffLines'
import type { DocStatus } from '../../lib/buildTree'
import { difficultyLabel } from '../../lib/difficulty'

interface VersionMeta {
  slug: string
  status: DocStatus
  difficulty: number | null
}

interface VersionDiffViewProps {
  oldText: string
  newText: string
  oldMeta?: VersionMeta
  newMeta?: VersionMeta
}

const METADATA_FIELDS = [
  { key: 'slug', label: 'Slug', format: (meta: VersionMeta) => meta.slug },
  { key: 'status', label: 'Status', format: (meta: VersionMeta) => meta.status },
  { key: 'difficulty', label: 'Difficulty', format: (meta: VersionMeta) => difficultyLabel(meta.difficulty) },
] as const

/** Line-level diff against the current content -- red/removed lines existed
 * in this historical version and were since changed, green/added lines are
 * what's there now. A word-level diff would need a real diffing library;
 * this is enough for reviewing prose and code changes in history. */
export function VersionDiffView({ oldText, newText, oldMeta, newMeta }: VersionDiffViewProps) {
  const lines = diffLines(oldText, newText)
  const changedMetaFields =
    oldMeta && newMeta ? METADATA_FIELDS.filter((field) => field.format(oldMeta) !== field.format(newMeta)) : []

  return (
    <Stack gap={3}>
      {changedMetaFields.length > 0 && oldMeta && newMeta ? (
        <Stack gap={1} borderWidth="1px" borderColor="border.default" borderRadius="l1" p={3} fontSize="xs">
          {changedMetaFields.map((field) => (
            <Box key={field.key}>
              <Text as="span" fontWeight="600">
                {field.label}:
              </Text>{' '}
              <Text as="span" bg="errorSubtle" px={1}>
                {field.format(oldMeta)}
              </Text>{' '}
              →{' '}
              <Text as="span" bg="successSubtle" px={1}>
                {field.format(newMeta)}
              </Text>
            </Box>
          ))}
        </Stack>
      ) : null}

      <Box
        as="pre"
        fontFamily="mono"
        fontSize="xs"
        lineHeight="1.6"
        borderWidth="1px"
        borderColor="border.default"
        borderRadius="l1"
        overflow="hidden"
      >
        {lines.map((line, index) => (
          <Box
            key={index}
            as="div"
            px={3}
            bg={line.type === 'added' ? 'successSubtle' : line.type === 'removed' ? 'errorSubtle' : 'transparent'}
            color={line.type === 'unchanged' ? 'fg.muted' : 'fg.default'}
            whiteSpace="pre-wrap"
          >
            {line.type === 'added' ? '+ ' : line.type === 'removed' ? '- ' : '  '}
            {line.text}
          </Box>
        ))}
      </Box>
    </Stack>
  )
}
