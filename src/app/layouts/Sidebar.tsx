import { Box, Flex, Text } from '@chakra-ui/react'
import { NavLink } from 'react-router-dom'
import { Code2, HelpCircle, Home, RotateCcw, type LucideIcon } from 'lucide-react'
import { DocTreeNav } from '@/features/docs/components/DocTreeNav'

interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  end?: boolean
  badge?: number
}

const mainNav: NavItem[] = [
  { label: 'Home', to: '/', icon: Home, end: true },
  { label: 'Quizzes', to: '/quizzes', icon: HelpCircle },
  { label: 'Review', to: '/review', icon: RotateCcw, badge: 7 },
  { label: 'Snippets', to: '/snippets', icon: Code2 },
]

/**
 * The four nav items are fixed at the top and never scroll -- the doc tree
 * below them can be any size and gets its own independent scroll container
 * (see the flex="1" / overflowY="auto" box), so it never pushes the nav
 * off-screen. Used as-is inside the mobile Drawer too; there is no second
 * nav component to keep in sync.
 */
export function Sidebar() {
  return (
    <Flex direction="column" h="full">
      <Flex direction="column" flexShrink={0} pt={5} pb={3} gap={4}>
        <Flex align="center" gap={2} px={5}>
          <Flex
            align="center"
            justify="center"
            boxSize="7"
            borderRadius="l1"
            bg="accent.solid"
            color="accent.contrast"
            fontFamily="mono"
            fontWeight="600"
            fontSize="sm"
            flexShrink={0}
          >
            D
          </Flex>
          <Text fontWeight="600" fontSize="md" letterSpacing="-0.01em">
            DevHub
          </Text>
        </Flex>

        <Flex direction="column" gap={1} px={3}>
          {mainNav.map((item) => (
            <NavItemLink key={item.to} item={item} />
          ))}
        </Flex>

        <Box borderTopWidth="1px" borderColor="border.default" mx={3} />
      </Flex>

      <Box flex="1" minH={0} overflowY="auto" pb={4}>
        <DocTreeNav />
      </Box>
    </Flex>
  )
}

function NavItemLink({ item }: { item: NavItem }) {
  const { label, to, icon: Icon, end, badge } = item

  return (
    <NavLink to={to} end={end} style={{ textDecoration: 'none', display: 'block' }}>
      {({ isActive }) => (
        <Flex
          align="center"
          gap={3}
          minH="40px"
          px={2.5}
          borderRadius="l1"
          borderLeftWidth="3px"
          borderLeftColor={isActive ? 'accent.solid' : 'transparent'}
          bg={isActive ? 'accent.subtle' : 'transparent'}
          color={isActive ? 'accent.fg' : 'fg.muted'}
          fontWeight={isActive ? '600' : '500'}
          transition="background-color 150ms, color 150ms"
          _hover={{
            bg: isActive ? 'accent.subtle' : 'bg.subtle',
            color: isActive ? 'accent.fg' : 'fg.default',
          }}
        >
          <Icon size={17} strokeWidth={2} style={{ flexShrink: 0 }} />
          <Text fontSize="sm" flex="1" truncate>
            {label}
          </Text>
          {badge != null && (
            <Box
              as="span"
              fontFamily="mono"
              fontSize="xs"
              px={1.5}
              py={0.5}
              borderRadius="l1"
              bg="accent.subtle"
              color="accent.fg"
            >
              {badge}
            </Box>
          )}
        </Flex>
      )}
    </NavLink>
  )
}
