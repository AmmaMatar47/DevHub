import { Flex, Text } from '@chakra-ui/react'
import { Construction, type LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: LucideIcon
}

export function EmptyState({ title, description, icon: Icon = Construction }: EmptyStateProps) {
  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      gap={3}
      textAlign="center"
      borderWidth="1px"
      borderStyle="dashed"
      borderColor="border.default"
      borderRadius="l2"
      bg="bg.surface"
      py={{ base: 16, lg: 24 }}
      px={6}
    >
      <Flex
        align="center"
        justify="center"
        boxSize="12"
        borderRadius="l2"
        bg="accent.subtle"
        color="accent.fg"
      >
        <Icon size={22} strokeWidth={1.75} />
      </Flex>
      <Text fontWeight="600" fontSize="md">
        {title}
      </Text>
      {description ? (
        <Text color="fg.muted" fontSize="sm" maxW="40ch">
          {description}
        </Text>
      ) : null}
    </Flex>
  )
}
