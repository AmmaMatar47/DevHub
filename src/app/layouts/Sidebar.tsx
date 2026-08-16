import { Box, Flex, Text, Tooltip, useBreakpointValue } from '@chakra-ui/react'
import { NavLink } from 'react-router-dom'
import {
  BookOpen,
  Code2,
  FileText,
  HelpCircle,
  Home,
  RotateCcw,
  Settings,
  type LucideIcon,
} from 'lucide-react'

interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  end?: boolean
  badge?: number
}

const learnNav: NavItem[] = [
  { label: 'Home', to: '/', icon: Home, end: true },
  { label: 'Topics', to: '/topics', icon: BookOpen },
  { label: 'Articles', to: '/articles', icon: FileText },
  { label: 'Quizzes', to: '/quizzes', icon: HelpCircle },
  { label: 'Review', to: '/review', icon: RotateCcw, badge: 7 },
]

const referenceNav: NavItem[] = [
  { label: 'Snippets', to: '/snippets', icon: Code2 },
  { label: 'Settings', to: '/settings', icon: Settings },
]

interface SidebarProps {
  /** True inside the mobile Drawer, where labels are always shown regardless of viewport. */
  forceExpanded?: boolean
}

export function Sidebar({ forceExpanded = false }: SidebarProps) {
  const isRail = useBreakpointValue({ base: false, md: true, lg: false, xl: false }) ?? false
  const collapsed = isRail && !forceExpanded

  return (
    <Flex direction="column" h="full" py={5} gap={6} overflowY="auto">
      <Flex align="center" gap={2} px={collapsed ? 0 : 5} justify={collapsed ? 'center' : 'start'}>
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
        {!collapsed && (
          <Text fontWeight="600" fontSize="md" letterSpacing="-0.01em">
            DevHub
          </Text>
        )}
      </Flex>

      <NavSection title="Learn" items={learnNav} collapsed={collapsed} />
      <NavSection title="Reference" items={referenceNav} collapsed={collapsed} />
    </Flex>
  )
}

function NavSection({
  title,
  items,
  collapsed,
}: {
  title: string
  items: NavItem[]
  collapsed: boolean
}) {
  return (
    <Flex direction="column" gap={1} px={3}>
      {!collapsed && (
        <Text
          fontFamily="mono"
          fontSize="xs"
          fontWeight="500"
          letterSpacing="wide"
          textTransform="uppercase"
          color="fg.subtle"
          px={2}
          mb={1}
        >
          {title}
        </Text>
      )}
      {items.map((item) => (
        <NavItemLink key={item.to} item={item} collapsed={collapsed} />
      ))}
    </Flex>
  )
}

function NavItemLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const { label, to, icon: Icon, end, badge } = item

  const link = (
    <NavLink to={to} end={end} style={{ textDecoration: 'none', display: 'block' }}>
      {({ isActive }) => (
        <Flex
          align="center"
          gap={3}
          minH="44px"
          px={2.5}
          justify={collapsed ? 'center' : 'start'}
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
          {!collapsed && (
            <Text fontSize="sm" flex="1" truncate>
              {label}
            </Text>
          )}
          {!collapsed && badge != null && (
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

  return (
    <Tooltip.Root disabled={!collapsed} openDelay={200} positioning={{ placement: 'right' }}>
      <Tooltip.Trigger asChild>{link}</Tooltip.Trigger>
      <Tooltip.Positioner>
        <Tooltip.Content
          bg="bg.subtle"
          color="fg.default"
          borderRadius="l1"
          fontSize="xs"
          px={2}
          py={1}
        >
          {label}
        </Tooltip.Content>
      </Tooltip.Positioner>
    </Tooltip.Root>
  )
}
