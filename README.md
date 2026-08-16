# DevHub

DevHub is the team's internal learning and knowledge platform — a home for articles, quizzes with
spaced repetition, reusable code snippets, and search, built for a six-person development team.
This milestone (**M0**) is the project scaffold only: a running, themed application shell with a
fully-built home page and every other route stubbed out. There is no backend, no authentication,
and no data layer yet — those arrive in later milestones.

## Getting started

```bash
pnpm install
pnpm dev
```

Other scripts:

```bash
pnpm build      # typecheck + production build
pnpm preview    # preview the production build locally
pnpm lint        # eslint
pnpm format      # prettier --write
pnpm typecheck   # tsc, no emit
```

## Folder structure

```
src/
├── app/                  # router, providers, layouts (AppLayout, AuthLayout)
├── features/             # one folder per feature area (dashboard, topics, articles, ...)
│   └── <feature>/
│       ├── components/   # feature-local components
│       └── pages/        # routed page components
├── shared/
│   ├── ui/                # Chakra CLI snippet output (provider, color-mode)
│   ├── components/        # cross-feature components (PageHeader, EmptyState, ...)
│   └── hooks/              # cross-feature hooks
├── lib/                  # theme.ts — the Chakra system config
└── types/                # shared TypeScript types
```

**Import rule:** a feature may import from `shared/` and `lib/`, but never reach into another
feature's internals (e.g. `features/articles` must not import from `features/topics/components`).
If two features need the same thing, promote it to `shared/`.

The `@/` path alias points at `src/` (configured in both `tsconfig.app.json` and `vite.config.ts`).

## Theme

All colours are defined as semantic tokens in [`src/lib/theme.ts`](src/lib/theme.ts) and consumed
by name everywhere else — there should be zero hard-coded hex values outside that file. To change
a colour, edit the token there and it updates in both light and dark mode automatically.

| Token                                                                               | Purpose                                                                            |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `bg.canvas` / `bg.surface` / `bg.subtle`                                            | Page background, card background, recessed background                              |
| `border.default` / `border.strong`                                                  | The only two border colours in the app                                             |
| `fg.default` / `fg.muted` / `fg.subtle`                                             | Text hierarchy                                                                     |
| `accent.solid` / `accent.hover` / `accent.subtle` / `accent.fg` / `accent.contrast` | Ochre accent — primary actions, active nav, focus rings. Used sparingly by design. |
| `success` / `error` / `warning` / `info`                                            | Status colours                                                                     |

Typography: **IBM Plex Sans** for UI/body text, **IBM Plex Mono** for code, labels, metadata, and
numbers (loaded via Google Fonts in `index.html`). Border radii are kept small (4–6px) and surfaces
are separated with borders rather than shadows, in line with the "quiet developer tool" design
direction.

Colour mode (light / dark / system) is handled by `next-themes`, wired up in
`src/shared/ui/provider.tsx` and `src/shared/ui/color-mode.tsx`, and exposed to users via
`src/shared/components/ColorModeToggle.tsx` in the header and the Appearance section of Settings.

## Supabase

Deliberately not present yet. `.env.example` documents the two variables (`VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`) that a later milestone will introduce, but no Supabase client, types, or
auth code exists in this codebase.
