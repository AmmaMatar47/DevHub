import { Box, Flex, IconButton, Input } from '@chakra-ui/react'
import { Menu as MenuIcon, Search } from 'lucide-react'
import { ColorModeToggle } from '@/shared/components/ColorModeToggle'

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <Flex
      as="header"
      align="center"
      gap={3}
      h={{ base: '56px', lg: '64px' }}
      px={{ base: 4, lg: 8 }}
      borderBottomWidth="1px"
      borderColor="border.default"
      bg="bg.canvas"
      position="sticky"
      top={0}
      zIndex="1"
    >
      <IconButton
        aria-label="Open navigation"
        variant="ghost"
        size="sm"
        display={{ base: 'inline-flex', md: 'none' }}
        onClick={onMenuClick}
      >
        <MenuIcon size={18} />
      </IconButton>

      <Box position="relative" flex="1" maxW="420px">
        <Box
          position="absolute"
          left={3}
          top="50%"
          transform="translateY(-50%)"
          color="fg.subtle"
          pointerEvents="none"
        >
          <Search size={15} />
        </Box>
        <Input
          disabled
          placeholder="Search…  ⌘K"
          size="sm"
          pl={9}
          bg="bg.subtle"
          borderColor="border.default"
          borderRadius="l1"
          color="fg.muted"
          _placeholder={{ color: 'fg.subtle' }}
        />
      </Box>

      <Flex align="center" gap={3} ml="auto">
        <ColorModeToggle />
        <Flex
          align="center"
          justify="center"
          boxSize="8"
          borderRadius="l2"
          bg="bg.subtle"
          borderWidth="1px"
          borderColor="border.default"
          fontFamily="mono"
          fontSize="xs"
          fontWeight="500"
          color="fg.muted"
          flexShrink={0}
        >
          JT
        </Flex>
      </Flex>
    </Flex>
  )
}
