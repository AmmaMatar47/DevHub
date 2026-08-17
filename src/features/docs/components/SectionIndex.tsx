import { Box, SimpleGrid, Text } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import { BookOpen, FileText } from 'lucide-react'
import { useAuth } from '@/features/auth/context/AuthContext'
import { hasMinimumRole } from '@/features/auth/lib/roles'
import type { DocTreeNode } from '../lib/buildTree'
import { DocStatusBadge } from './DocStatusBadge'

interface SectionIndexProps {
  nodes: DocTreeNode[]
}

/** A section with no content of its own, or the /docs root, renders as an
 * index of its children rather than a blank page. */
export function SectionIndex({ nodes }: SectionIndexProps) {
  const { role } = useAuth()
  const canSeeStatus = hasMinimumRole(role, 'editor')

  return (
    <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap={4}>
      {nodes.map((node) => {
        const Icon = node.kind === 'section' ? BookOpen : FileText
        return (
          <RouterLink key={node.id} to={`/docs/${node.path.join('/')}`} style={{ display: 'block' }}>
            <Box
              borderWidth="1px"
              borderColor="border.default"
              borderRadius="l2"
              bg="bg.surface"
              p={4}
              h="full"
              transition="border-color 150ms, background-color 150ms"
              _hover={{ borderColor: 'border.strong', bg: 'bg.subtle' }}
            >
              <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={2} mb={2}>
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  boxSize="8"
                  borderRadius="l1"
                  bg="accent.subtle"
                  color="accent.fg"
                  flexShrink={0}
                >
                  <Icon size={16} strokeWidth={1.75} />
                </Box>
                {canSeeStatus ? <DocStatusBadge status={node.status} size="xs" /> : null}
              </Box>
              <Text fontWeight="600" fontSize="sm" truncate title={node.title}>
                {node.title}
              </Text>
              {node.kind === 'section' ? (
                <Text fontSize="xs" color="fg.subtle" mt={1}>
                  {node.children.length} {node.children.length === 1 ? 'item' : 'items'}
                </Text>
              ) : null}
            </Box>
          </RouterLink>
        )
      })}
    </SimpleGrid>
  )
}
