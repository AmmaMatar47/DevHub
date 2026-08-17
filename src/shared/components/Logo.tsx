interface LogoProps {
  size?: number
}

export function Logo({ size = 24 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="3" y="7" width="26" height="4" rx="2" fill="currentColor" />
      <rect x="9" y="14" width="20" height="4" rx="2" fill="currentColor" />
      <rect x="15" y="21" width="14" height="4" rx="2" fill="var(--chakra-colors-accent-solid)" />
    </svg>
  )
}
