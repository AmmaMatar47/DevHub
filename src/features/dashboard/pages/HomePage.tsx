import { Box, Heading, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import { ContinueLearningCard } from '../components/ContinueLearningCard'
import { DueReviewList } from '../components/DueReviewList'
import { RecentlyAddedList } from '../components/RecentlyAddedList'
import { StatCard } from '../components/StatCard'
import { TeamActivityFeed } from '../components/TeamActivityFeed'
import {
  continueLearning,
  dueReviews,
  recentArticles,
  stats,
  teamActivity,
} from '../placeholderData'

function getGreeting(hour: number): string {
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

const today = new Date()
const formattedDate = today.toLocaleDateString('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
})

export function HomePage() {
  return (
    <Stack gap={10}>
      <Stack gap={1}>
        <Heading as="h1" fontSize={{ base: '2xl', lg: '3xl' }} lineHeight="tight" fontWeight="600">
          {getGreeting(today.getHours())}
        </Heading>
        <Text fontFamily="mono" fontSize="sm" color="fg.subtle">
          {formattedDate}
        </Text>
      </Stack>

      <SimpleGrid columns={{ base: 2, lg: 4 }} gap={4}>
        {stats.map((stat) => (
          <StatCard key={stat.id} {...stat} />
        ))}
      </SimpleGrid>

      <ContinueLearningCard {...continueLearning} />

      <SimpleGrid columns={{ base: 1, lg: 2 }} gap={8}>
        <Box>
          <Heading as="h2" fontSize="md" fontWeight="600" mb={3}>
            Due for review
          </Heading>
          <DueReviewList items={dueReviews} />
        </Box>
        <Box>
          <Heading as="h2" fontSize="md" fontWeight="600" mb={3}>
            Recently added
          </Heading>
          <RecentlyAddedList items={recentArticles} />
        </Box>
      </SimpleGrid>

      <Box>
        <Heading as="h2" fontSize="md" fontWeight="600" mb={4}>
          Team activity
        </Heading>
        <TeamActivityFeed items={teamActivity} />
      </Box>
    </Stack>
  )
}
