import { Box, Button, Flex, Progress, Text } from '@chakra-ui/react'
import { ArrowRight } from 'lucide-react'
import type { ContinueLearning } from '../placeholderData'

export function ContinueLearningCard({
  trackName,
  progressPercent,
  moduleLabel,
}: ContinueLearning) {
  return (
    <Box
      borderWidth="1px"
      borderColor="border.default"
      borderRadius="l2"
      bg="bg.surface"
      p={{ base: 4, lg: 6 }}
    >
      <Flex
        justify="space-between"
        align={{ base: 'start', sm: 'center' }}
        direction={{ base: 'column', sm: 'row' }}
        gap={4}
      >
        <Box flex="1" minW={0}>
          <Text
            fontFamily="mono"
            fontSize="xs"
            fontWeight="500"
            letterSpacing="wide"
            textTransform="uppercase"
            color="fg.subtle"
            mb={1}
          >
            Continue learning
          </Text>
          <Text fontWeight="600" fontSize="lg" mb={1}>
            {trackName}
          </Text>
          <Text color="fg.muted" fontSize="sm" mb={4}>
            {moduleLabel}
          </Text>

          <Progress.Root value={progressPercent} size="sm" maxW="360px">
            <Progress.Track bg="bg.subtle" borderRadius="l1">
              <Progress.Range bg="accent.solid" borderRadius="l1" />
            </Progress.Track>
          </Progress.Root>
          <Text fontFamily="mono" fontSize="xs" color="fg.subtle" mt={1.5}>
            {progressPercent}% complete
          </Text>
        </Box>

        <Button
          bg="accent.solid"
          color="accent.contrast"
          _hover={{ bg: 'accent.hover' }}
          size="sm"
          flexShrink={0}
        >
          Resume
          <ArrowRight size={15} />
        </Button>
      </Flex>
    </Box>
  )
}
