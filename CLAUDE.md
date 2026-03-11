\# CLAUDE.md — torah-treasures-online



\## Project Overview

E-commerce store for Jewish/Torah books and Judaica items.

Built with React + Vite + TypeScript + Shadcn/UI + Tailwind.

Backend: Supabase (hosted via Lovable Cloud).

Deployment: Vercel (auto-deploy on push to `main`).

Live URL: https://yehudaica.net



---



\## Tech Stack

\- \*\*Frontend:\*\* React 18, Vite 5, TypeScript, Tailwind CSS, Shadcn/UI

\- \*\*Routing:\*\* React Router v6

\- \*\*State/Data:\*\* TanStack Query v5

\- \*\*Backend:\*\* Supabase (project ID: `pddyniintqbllqujdpao`)

\- \*\*Auth:\*\* Supabase Auth (email/password)

\- \*\*Storage:\*\* Supabase Storage (buckets: product-images, banners, badges, custom-fonts)

\- \*\*Edge Functions:\*\* Supabase Edge Functions (Deno runtime)

\- \*\*Deployment:\*\* Vercel — connected to GitHub `main` branch



---



\## Environment Variables

Required in `.env.local` for local development:

```

VITE\\\_SUPABASE\\\_URL=https://pddyniintqbllqujdpao.supabase.co

VITE\\\_SUPABASE\\\_PUBLISHABLE\\\_KEY=<anon key>

```

Never commit `.env.local`. Never hardcode keys in source files.

In Vercel, these are set under Settings → Environment Variables.



---



\## Project Structure

```

src/

├── components/

│   ├── admin/        # Admin panel components

│   ├── storefront/   # Customer-facing components

│   └── ui/           # Shadcn base components (do not edit)

├── pages/

│   ├── admin/        # Admin pages (/admin/\\\*)

│   └── \\\*.tsx         # Storefront pages

├── contexts/         # React contexts (Auth, Cart)

├── hooks/            # Custom hooks

├── integrations/

│   └── supabase/     # Auto-generated Supabase client and types

└── lib/              # Utilities

supabase/

├── functions/        # Edge Functions (Deno)

└── migrations/       # SQL migrations (do not edit manually)

```



---



\## Git Workflow



\### Commit conventions

Use clear, descriptive English commit messages:

```

feat: add product variant selector on product page

fix: cart total not updating after quantity change

style: adjust mobile header padding

refactor: extract checkout logic into custom hook

docs: update CLAUDE.md with payment integration notes

```



\### Branch strategy

\- `main` = production. Every push triggers Vercel deploy.

\- For larger features, create a branch:

```bash

git checkout -b feat/payment-integration

\\# work...

git push origin feat/payment-integration

\\# then merge to main when ready

```



\### Standard commit flow after any change

```bash

git add .

git commit -m "description of what changed and why"

git push

```

Vercel deploys automatically within ~1 minute of push to `main`.



\### Commit pace

\- Small UI fixes → commit immediately after change

\- Feature work → commit at each logical milestone, not every file save

\- Never commit broken code to `main`



---



\## Vercel Deployment

\- Auto-deploys on every push to `main`

\- Build command: `npm run build` (Vite)

\- Output directory: `dist`

\- No server — this is a static SPA

\- All routing handled client-side via React Router



\*\*If a deploy fails:\*\* check Vercel → Deployments → Build Logs.

Common cause: TypeScript error or missing env variable.



---



\## Supabase Rules

\- The Supabase project is managed via Lovable Cloud

\- Do NOT run `supabase db push` or modify migrations manually

\- Schema changes must go through Lovable's interface or SQL editor in Supabase dashboard

\- Always use the generated client: `import { supabase } from "@/integrations/supabase/client"`

\- RLS (Row Level Security) is enabled — queries respect user auth state

\- Edge Functions live in `supabase/functions/` and run on Deno

\- Secrets for Edge Functions are set in Supabase dashboard → Settings → Edge Functions



---



\## Key Pages \& Routes

| Route | File | Description |

|-------|------|-------------|

| `/` | `pages/Index.tsx` | Homepage |

| `/product/:id` | `pages/ProductPage.tsx` | Product detail |

| `/category/:slug` | `pages/CategoryPage.tsx` | Category listing |

| `/cart` | `pages/CartPage.tsx` | Shopping cart |

| `/checkout` | `pages/CheckoutPage.tsx` | Checkout (payment goes here) |

| `/auth` | `pages/AuthPage.tsx` | Login/register |

| `/admin` | `pages/admin/AdminDashboard.tsx` | Admin panel |



---



\## Important Components

\- `CartContext.tsx` — global cart state, persisted in localStorage

\- `AuthContext.tsx` — user session via Supabase Auth

\- `storefront/Header.tsx` — main nav, cart icon, search

\- `storefront/DynamicHomepage.tsx` — renders homepage sections from DB



---



\## Payment Integration (Pending)

Payment provider: Meshulam (Israeli credit card processor).

When implementing:

1\. Create `supabase/functions/create-payment/index.ts`

2\. Add `MESHULAM\\\_PAGE\\\_ID` and `MESHULAM\\\_API\\\_KEY` to Supabase Edge Function secrets

3\. Call from `CheckoutPage.tsx` via `supabase.functions.invoke('create-payment', ...)`

4\. Add webhook handler at `supabase/functions/payment-webhook/index.ts`

5\. Update order status in `orders` table on successful payment callback



---



\## Do Not Touch

\- `src/components/ui/\\\*` — Shadcn auto-generated, do not edit

\- `src/integrations/supabase/types.ts` — auto-generated from DB schema

\- `supabase/migrations/\\\*` — managed by Lovable/Supabase

\- `.env.local` — never commit



---



\## Local Dev Commands

```bash

npm run dev        # start local server at localhost:5173

npm run build      # production build (test before big pushes)

npm run lint       # check for errors

```



---



\## Definition of Done

Before pushing to `main`:

\- \[ ] `npm run build` completes without errors

\- \[ ] Feature tested locally on localhost:5173

\- \[ ] No hardcoded keys or secrets in code

\- \[ ] Commit message is clear and descriptive

```



---



