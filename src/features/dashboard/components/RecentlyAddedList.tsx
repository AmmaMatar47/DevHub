import { Flex, Stack, Text } from '@chakra-ui/react'
import type { RecentArticle } from '../placeholderData'

export function RecentlyAddedList({ items }: { items: RecentArticle[] }) {
  return (
    <Stack gap={0} borderWidth="1px" borderColor="border.default" borderRadius="l2" bg="bg.surface">
      {items.map((item, index) => (
        <Flex
          key={item.id}
          align="center"
          gap={3}
          px={4}
          py={3}
          borderBottomWidth={index === items.length - 1 ? '0' : '1px'}
          borderColor="border.default"
        >
          <Flex
            align="center"
            justify="center"
            boxSize="7"
            borderRadius="l1"
            bg="bg.subtle"
            fontFamily="mono"
            fontSize="xs"
            fontWeight="500"
            color="fg.muted"
            flexShrink={0}
          >
            {item.authorInitials}
          </Flex>
          <Flex direction="column" minW={0} flex="1">
            <Text fontSize="sm" fontWeight="500" color="fg.default" truncate>
              {item.title}
            </Text>
            <Text fontFamily="mono" fontSize="xs" color="fg.subtle">
              {item.topic}
            </Text>
          </Flex>
          <Text fontSize="xs" color="fg.subtle" flexShrink={0}>
            {item.addedAt}
          </Text>
        </Flex>
      ))}
    </Stack>
  )
}
