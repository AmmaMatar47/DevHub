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

The data layer landed in M1: a Supabase client (`src/lib/supabase.ts`), the `profiles`/`doc_nodes`/
`doc_versions`/`tags` schema, and Row Level Security on every table. Copy `.env.example` to
`.env.local` and fill in `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` from your project's
Settings > API page. `pnpm supabase login` once, then `pnpm supabase link` to work with migrations
locally (`db:reset`, `db:diff`, `db:push`, `db:types`).

**Signup is invite-only.** New team members are created from the Supabase dashboard
(Authentication > Users > Invite), never through public signup — `auth.enable_signup` is `false` in
`supabase/config.toml`. Every new `auth.users` row gets a matching `profiles` row automatically
(role `member`, `display_name` falling back to the email's local-part when no name is set on the
account) via the `handle_new_user` trigger.

**Password resets are dashboard-only, for now.** The free plan's built-in email sending is
rate-limited to a handful of sends per hour, so there's no in-app "forgot password" flow — an admin
resets a user's password from the Supabase dashboard (Authentication > Users > select user > Reset
password) when asked. This is worth revisiting once the project has its own SMTP configured.

## Authentication

Sign-in (`/login`, email + password only — no sign-up, no OAuth) lives in `src/features/auth/`.
`AuthProvider` (mounted in `app/providers.tsx`) is the single source of truth for session, profile,
and role; `RequireAuth` guards every route under `AppLayout` and redirects to `/login` (preserving
the originally requested path) while `RequireRole` gates by minimum role for later milestones.

A role change made directly in the database won't reach a signed-in session until its JWT
refreshes — `AuthProvider` detects the mismatch between `profiles.role` and the JWT's `user_role`
claim, attempts one `refreshSession()`, and shows a non-blocking "sign in again" notice if that
doesn't resolve it. `is_active = false` signs the user out immediately, checked on every session
bootstrap and profile refetch, not only at sign-in.

### Bootstrapping the first admin

Every role after the first has to be granted by an existing admin through the app — but the very
first admin has no admin to ask. Promote them directly against the database instead:

```sql
update public.profiles
set role = 'admin'
where id = '<their auth.users id, from the dashboard>';
```

Run this from the Supabase SQL editor or a direct `psql` connection — **never** through the API
(the `anon`/`authenticated` REST endpoints, or a client-side call). This isn't optional: the
`prevent_profile_privilege_escalation` trigger deliberately blocks any role or `is_active` change
that arrives through a real PostgREST request unless the caller is already an admin, precisely to
stop a member from granting themselves admin. Direct SQL access has no such request context, which
is what makes it the only way to create the first admin at all.
