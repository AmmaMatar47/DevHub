import { Box } from '@chakra-ui/react'
import type { DocStatus } from '../lib/buildTree'

const STATUS_LABEL: Partial<Record<DocStatus, string>> = {
  draft: 'DRAFT',
  needs_review: 'REVIEW',
}

interface DocStatusBadgeProps {
  status: DocStatus
  size?: 'xs' | 'sm'
}

/** Editors/admins only — members never receive draft/needs_review rows at all. */
export function DocStatusBadge({ status, size = 'sm' }: DocStatusBadgeProps) {
  const label = STATUS_LABEL[status]
  if (!label) return null

  return (
    <Box
      as="span"
      display="inline-flex"
      alignItems="center"
      px={size === 'sm' ? 1.5 : 1}
      py={size === 'sm' ? 0.5 : 0}
      borderRadius="l1"
      borderWidth="1px"
      borderColor="warning"
      color="warning"
      fontFamily="mono"
      fontSize="xs"
      fontWeight="500"
      letterSpacing="wide"
      lineHeight={size === 'sm' ? undefined : '1.4'}
      flexShrink={0}
    >
      {label}
    </Box>
  )
}
