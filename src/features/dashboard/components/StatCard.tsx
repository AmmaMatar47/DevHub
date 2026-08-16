import { Box, Text } from '@chakra-ui/react'
import type { StatItem } from '../placeholderData'

export function StatCard({ label, value }: StatItem) {
  return (
    <Box
      borderWidth="1px"
      borderColor="border.default"
      borderRadius="l2"
      bg="bg.surface"
      px={4}
      py={4}
    >
      <Text fontSize="3xl" fontWeight="600" lineHeight="tight" color="fg.default">
        {value}
      </Text>
      <Text
        fontFamily="mono"
        fontSize="xs"
        fontWeight="500"
        letterSpacing="wide"
        textTransform="uppercase"
        color="fg.subtle"
        mt={1}
      >
        {label}
      </Text>
    </Box>
  )
}
