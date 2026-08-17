import { Box } from '@chakra-ui/react'
import { diffLines } from '../../lib/diffLines'

interface VersionDiffViewProps {
  oldText: string
  newText: string
}

/** Line-level diff against the current content -- red/removed lines existed
 * in this historical version and were since changed, green/added lines are
 * what's there now. A word-level diff would need a real diffing library;
 * this is enough for reviewing prose and code changes in history. */
export function VersionDiffView({ oldText, newText }: VersionDiffViewProps) {
  const lines = diffLines(oldText, newText)

  return (
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
  )
}
