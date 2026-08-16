import { Flex, Heading, Text } from '@chakra-ui/react'
import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <Flex
      justify="space-between"
      align={{ base: 'start', sm: 'center' }}
      direction={{ base: 'column', sm: 'row' }}
      gap={4}
      wrap="wrap"
    >
      <Flex direction="column" gap={1}>
        <Heading as="h1" fontSize={{ base: '2xl', lg: '3xl' }} lineHeight="tight" fontWeight="600">
          {title}
        </Heading>
        {description ? (
          <Text color="fg.muted" fontSize="sm" maxW="65ch">
            {description}
          </Text>
        ) : null}
      </Flex>
      {actions ? <Flex gap={2}>{actions}</Flex> : null}
    </Flex>
  )
}
