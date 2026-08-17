import { Box, Flex, Text } from '@chakra-ui/react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link as RouterLink } from 'react-router-dom'
import { flattenTree, type DocTreeNode } from '../lib/buildTree'

interface PrevNextNavProps {
  tree: DocTreeNode[]
  current: DocTreeNode
}

/** Walks the tree in the same document order as the sidebar (depth-first,
 * position-sorted) so "next" always matches what a reader would expect
 * after finishing the current page. */
export function PrevNextNav({ tree, current }: PrevNextNavProps) {
  const flat = flattenTree(tree)
  const index = flat.findIndex((node) => node.id === current.id)
  const prev = index > 0 ? flat[index - 1] : undefined
  const next = index >= 0 && index < flat.length - 1 ? flat[index + 1] : undefined

  if (!prev && !next) return null

  return (
    <Flex justify="space-between" gap={4} mt={10} pt={6} borderTopWidth="1px" borderColor="border.default">
      {prev ? (
        <RouterLink to={`/docs/${prev.path.join('/')}`} style={{ flex: 1, minWidth: 0 }}>
          <Flex
            direction="column"
            gap={1}
            p={3}
            borderWidth="1px"
            borderColor="border.default"
            borderRadius="l2"
            transition="border-color 150ms, background-color 150ms"
            _hover={{ borderColor: 'border.strong', bg: 'bg.subtle' }}
          >
            <Flex align="center" gap={1} color="fg.subtle" fontSize="xs">
              <ChevronLeft size={12} />
              Previous
            </Flex>
            <Text fontSize="sm" fontWeight="600" truncate>
              {prev.title}
            </Text>
          </Flex>
        </RouterLink>
      ) : (
        <Box flex="1" />
      )}
      {next ? (
        <RouterLink to={`/docs/${next.path.join('/')}`} style={{ flex: 1, minWidth: 0 }}>
          <Flex
            direction="column"
            gap={1}
            p={3}
            borderWidth="1px"
            borderColor="border.default"
            borderRadius="l2"
            alignItems="flex-end"
            textAlign="right"
            transition="border-color 150ms, background-color 150ms"
            _hover={{ borderColor: 'border.strong', bg: 'bg.subtle' }}
          >
            <Flex align="center" gap={1} color="fg.subtle" fontSize="xs">
              Next
              <ChevronRight size={12} />
            </Flex>
            <Text fontSize="sm" fontWeight="600" truncate>
              {next.title}
            </Text>
          </Flex>
        </RouterLink>
      ) : (
        <Box flex="1" />
      )}
    </Flex>
  )
}
