import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'

const config = defineConfig({
  globalCss: {
    'html, body': {
      bg: 'bg.canvas',
      color: 'fg.default',
      colorScheme: 'light dark',
    },
    '*::selection': {
      bg: 'accent.subtle',
    },
    '*:focus-visible': {
      outline: '2px solid',
      outlineColor: 'accent.solid',
      outlineOffset: '2px',
    },
  },
  theme: {
    tokens: {
      fonts: {
        heading: { value: `'IBM Plex Sans', system-ui, sans-serif` },
        body: { value: `'IBM Plex Sans', system-ui, sans-serif` },
        mono: { value: `'IBM Plex Mono', ui-monospace, monospace` },
      },
      fontSizes: {
        xs: { value: '0.6875rem' }, // 11px
        sm: { value: '0.8125rem' }, // 13px
        md: { value: '0.9375rem' }, // 15px — base body
        lg: { value: '1.0625rem' }, // 17px
        xl: { value: '1.25rem' }, // 20px
        '2xl': { value: '1.5rem' }, // 24px
        '3xl': { value: '1.875rem' }, // 30px
        '4xl': { value: '2.25rem' }, // 36px
      },
      lineHeights: {
        tight: { value: '1.15' },
        heading: { value: '1.2' },
        normal: { value: '1.5' },
        prose: { value: '1.65' },
      },
      letterSpacings: {
        wide: { value: '0.1em' },
      },
      radii: {
        l1: { value: '4px' },
        l2: { value: '6px' },
      },
      colors: {
        ochre: {
          solid: { value: '#C98A2B' },
          hover: { value: '#B37A22' },
          darkFg: { value: '#E0A54A' },
          lightFg: { value: '#96661F' },
        },
        success: { value: '#2F855A' },
        error: { value: '#C53030' },
        warning: { value: '#B7791F' },
        info: { value: '#2B6CB0' },
      },
    },
    semanticTokens: {
      colors: {
        bg: {
          canvas: {
            value: { base: '#FBFBF9', _dark: '#0E1116' },
          },
          surface: {
            value: { base: '#FFFFFF', _dark: '#161A21' },
          },
          subtle: {
            value: { base: '#F3F3EF', _dark: '#1C212A' },
          },
        },
        border: {
          default: {
            value: { base: '#E4E4DE', _dark: '#242A33' },
          },
          strong: {
            value: { base: '#CFCFC7', _dark: '#333B47' },
          },
        },
        fg: {
          default: {
            value: { base: '#14181D', _dark: '#E6E9ED' },
          },
          muted: {
            value: { base: '#5B6570', _dark: '#8C97A5' },
          },
          subtle: {
            value: { base: '#8A939D', _dark: '#5E6875' },
          },
        },
        accent: {
          solid: { value: '{colors.ochre.solid}' },
          hover: { value: '{colors.ochre.hover}' },
          subtle: { value: 'rgba(201, 138, 43, 0.12)' },
          fg: {
            value: { base: '{colors.ochre.lightFg}', _dark: '{colors.ochre.darkFg}' },
          },
          // Text color for content placed directly on an accent.solid background —
          // ochre reads better with near-black text than white in both modes.
          contrast: { value: '#14181D' },
        },
        success: { value: '{colors.success}' },
        error: { value: '{colors.error}' },
        warning: { value: '{colors.warning}' },
        info: { value: '{colors.info}' },
      },
    },
  },
})

export const system = createSystem(defaultConfig, config)
