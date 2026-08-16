import { Box, Flex, Stack, Text } from '@chakra-ui/react'
import type { ActivityItem } from '../placeholderData'

export function TeamActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <Stack gap={4}>
      {items.map((item) => (
        <Flex key={item.id} gap={3} align="start">
          <Box boxSize="1.5" borderRadius="full" bg="accent.solid" mt="2" flexShrink={0} />
          <Box minW={0} flex="1">
            <Text fontSize="sm" color="fg.default">
              {item.text}
            </Text>
            <Text fontFamily="mono" fontSize="xs" color="fg.subtle" mt={0.5}>
              {item.timestamp}
            </Text>
          </Box>
        </Flex>
      ))}
    </Stack>
  )
}
