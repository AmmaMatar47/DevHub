import { Flex, Text } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import type { DocTreeNode } from '../lib/buildTree'

interface BreadcrumbsProps {
  ancestors: DocTreeNode[]
  current: DocTreeNode
}

/** Each ancestor is a link; the current node is plain text. Middle segments
 * collapse to an ellipsis on mobile rather than wrapping to three lines. */
export function Breadcrumbs({ ancestors, current }: BreadcrumbsProps) {
  const collapsible = ancestors.length > 1

  return (
    <Flex as="nav" aria-label="Breadcrumb" align="center" fontSize="sm" color="fg.muted" wrap="nowrap" minW={0}>
      <RouterLink to="/docs" style={{ flexShrink: 0 }}>
        <Text as="span" _hover={{ color: 'fg.default' }}>
          Docs
        </Text>
      </RouterLink>

      {ancestors.map((ancestor, index) => {
        const isMiddle = collapsible && index > 0 && index < ancestors.length - 1
        const href = `/docs/${ancestor.path.join('/')}`
        return (
          <Flex key={ancestor.id} align="center" minW={0} flexShrink={isMiddle ? 1 : 0}>
            <ChevronRight size={14} style={{ flexShrink: 0, margin: '0 4px' }} />
            <RouterLink to={href} style={{ minWidth: 0 }}>
              <Text
                as="span"
                truncate
                display={isMiddle ? { base: 'none', sm: 'inline' } : 'inline'}
                _hover={{ color: 'fg.default' }}
              >
                {ancestor.title}
              </Text>
              <Text as="span" display={isMiddle ? { base: 'inline', sm: 'none' } : 'none'}>
                …
              </Text>
            </RouterLink>
          </Flex>
        )
      })}

      <Flex align="center" minW={0}>
        <ChevronRight size={14} style={{ flexShrink: 0, margin: '0 4px' }} />
        <Text as="span" color="fg.default" fontWeight="500" truncate title={current.title}>
          {current.title}
        </Text>
      </Flex>
    </Flex>
  )
}
