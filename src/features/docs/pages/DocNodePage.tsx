import { useRef } from 'react'
import { Box, Button, Flex, Skeleton, Stack } from '@chakra-ui/react'
import { AlertTriangle, FileQuestion } from 'lucide-react'
import { MarkdownContent } from '@/lib/markdown'
import { EmptyState } from '@/shared/components/EmptyState'
import { useDocNode } from '../api/useDocNode'
import { Breadcrumbs } from '../components/Breadcrumbs'
import { DocPageHeader } from '../components/DocPageHeader'
import { PrevNextNav } from '../components/PrevNextNav'
import { SectionIndex } from '../components/SectionIndex'
import { TableOfContents } from '../components/TableOfContents'
import { getAncestorChain, type DocTreeNode } from '../lib/buildTree'

interface DocNodePageProps {
  tree: DocTreeNode[]
  node: DocTreeNode
}

/** A resolved node: full markdown content if it has any, otherwise an index
 * of its children -- a section with no content of its own is never a blank page. */
export function DocNodePage({ tree, node }: DocNodePageProps) {
  const ancestors = getAncestorChain(tree, node)
  const { data: full, isPending, isError, refetch } = useDocNode(node.id)
  const contentRef = useRef<HTMLDivElement>(null)

  return (
    <Stack gap={6}>
      <Breadcrumbs ancestors={ancestors} current={node} />

      {isPending ? (
        <Stack gap={4}>
          <Skeleton height="9" width="50%" />
          <Skeleton height="4" width="30%" />
          <Skeleton height="240px" />
        </Stack>
      ) : isError || !full ? (
        <Stack gap={4} align="center">
          <EmptyState
            icon={AlertTriangle}
            title="Couldn't load this page"
            description="Something went wrong loading this document."
          />
          <Button onClick={() => void refetch()} variant="outline" size="sm">
            Try again
          </Button>
        </Stack>
      ) : full.content_md ? (
        <Flex align="start" gap={8}>
          <Box flex="1" minW={0}>
            <DocPageHeader node={full} />
            <Box ref={contentRef}>
              <MarkdownContent content={full.content_md} />
            </Box>
            <PrevNextNav tree={tree} current={node} />
          </Box>
          <TableOfContents containerRef={contentRef} content={full.content_md} />
        </Flex>
      ) : (
        <>
          <DocPageHeader node={full} />
          {node.children.length > 0 ? (
            <SectionIndex nodes={node.children} />
          ) : (
            <EmptyState
              icon={FileQuestion}
              title="Nothing here yet"
              description="This page doesn't have any content yet."
            />
          )}
        </>
      )}
    </Stack>
  )
}
