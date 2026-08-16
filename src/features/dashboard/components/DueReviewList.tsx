import { Box, Button, Flex, Stack, Text } from '@chakra-ui/react'
import type { DueReviewItem } from '../placeholderData'

export function DueReviewList({ items }: { items: DueReviewItem[] }) {
  return (
    <Stack gap={2}>
      {items.map((item) => (
        <Flex
          key={item.id}
          justify="space-between"
          align="center"
          gap={4}
          borderWidth="1px"
          borderColor="border.default"
          borderRadius="l2"
          bg="bg.surface"
          px={4}
          py={3}
        >
          <Box minW={0}>
            <Text
              fontFamily="mono"
              fontSize="xs"
              fontWeight="500"
              letterSpacing="wide"
              textTransform="uppercase"
              color="accent.fg"
              bg="accent.subtle"
              display="inline-block"
              px={1.5}
              py={0.5}
              borderRadius="l1"
              mb={1.5}
            >
              {item.topic}
            </Text>
            <Text fontSize="sm" color="fg.default" truncate>
              {item.prompt}
            </Text>
          </Box>
          <Button
            variant="outline"
            size="sm"
            borderColor="border.default"
            color="fg.default"
            flexShrink={0}
            _hover={{ bg: 'bg.subtle', borderColor: 'border.strong' }}
          >
            Review now
          </Button>
        </Flex>
      ))}
    </Stack>
  )
}
