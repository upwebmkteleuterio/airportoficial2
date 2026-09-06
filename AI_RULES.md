# AI_RULES.md

## Tech stack

- **React 19 + TypeScript** are used for the UI. Keep components typed, functional, and focused.
- **Vite 6** is the frontend build tool and development server. Preserve the existing Vite configuration and HMR behavior.
- **Tailwind CSS 4** is the primary styling system, integrated through `@tailwindcss/vite`. Prefer utility classes over new global CSS.
- **React Query (`@tanstack/react-query`)** manages asynchronous server data, caching, retries, and refetching.
- **Zustand** manages small pieces of shared client state, such as UI state, theme state, and the active application context.
- **Lucide React** supplies interface icons. Use icon components instead of manually drawn SVGs or emoji in the product UI.
- **Motion** supplies purposeful animations and transitions, especially for modals, panels, loading states, and page-level feedback.
- **Express + esbuild** provide the Node server build and API endpoints; server-only secrets must stay on the server.
- **Google GenAI, `react-markdown`, and jsPDF** support AI-generated QA/UX reports, safe Markdown rendering, and PDF export respectively.

## Project structure

- Put application source code under `src/`.
- Put route-level screens in `src/pages/` and reusable UI in `src/components/`.
- Keep route definitions and route-level navigation in `src/App.tsx`.
- Put reusable data-fetching logic in `src/hooks/`, API/data access in `src/services/`, shared state in `src/store/`, domain types in `src/types/`, and pure helpers in `src/utils/`.
- Update `src/pages/Index.tsx` for the default page when that page exists or is introduced. Ensure new components are rendered from an active page so they are visible in the app.
- Do not edit existing shadcn/ui primitive files. Wrap or compose them in new application components when customization is needed.

## Library usage rules

- Use **React** for component composition and UI state local to one component. Use controlled inputs and accessible semantic HTML for forms.
- Use **React Router** for new URL-addressable routes and navigation. Keep the route table in `src/App.tsx`; do not scatter route definitions across pages. Preserve existing path behavior when changing navigation.
- Use **Tailwind CSS** for layout, spacing, responsive behavior, colors, typography, borders, focus states, and dark mode. Use `clsx` and `tailwind-merge` when conditional class names need to be composed. Avoid adding one-off inline styles unless a value truly must be calculated at runtime.
- Use the available **shadcn/ui and Radix UI components** for dialogs, dropdowns, tabs, tooltips, menus, alerts, and other accessible primitives before creating custom equivalents.
- Use **Lucide React** for icons and set icon size, stroke width, and accessible labels consistently. Do not add another icon library.
- Use **React Query** for data that comes from services or APIs. Keep query keys stable, invalidate affected queries after mutations, and expose loading/error states in the UI. Do not duplicate server data in Zustand.
- Use **Zustand** only for cross-page client state that must persist outside a component tree. Keep stores small and action-oriented; do not use it as a replacement for React Query or form-local state.
- Use **Motion** only when animation improves orientation or feedback. Keep transitions short and subtle, respect reduced-motion preferences, and do not animate every element.
- Use **Express** for server endpoints in `server.ts` and keep API routes separate from browser-only code. Use `dotenv` only on the server; never expose `GEMINI_API_KEY` or other secrets in client code.
- Use **`@google/genai`** only from server-side code for Gemini calls. Validate request payloads at the API boundary and return safe, user-facing errors without leaking keys, prompts, stack traces, or provider details.
- Use **`react-markdown`** for rendering trusted or model-generated Markdown. Do not inject report content with `dangerouslySetInnerHTML`; configure allowed rendering behavior if custom elements are added.
- Use **jsPDF** only for client-side PDF export of already-rendered or explicitly selected report content. Keep export actions explicit and provide a useful loading or failure state.
- Use the existing service and hook patterns for domain data. Do not call APIs directly from deeply nested presentational components.

## Implementation standards

- Prefer small, focused components and straightforward data flow over new abstractions.
- Preserve the existing Portuguese (Brazil) product language and use clear, consistent labels and feedback messages.
- Every interactive control must have an accessible name, visible keyboard focus, and an appropriate disabled/loading state.
- Modals, drawers, dropdowns, and tooltips must use accessible primitives and support keyboard dismissal and focus management.
- Validate user input at system boundaries, especially API requests, public enrollment forms, file uploads, and generated report parameters.
- Never interpolate untrusted user input into HTML, SQL, shell commands, or prompts without appropriate handling. Never commit credentials or hard-code secrets.
- Keep changes scoped to the requested feature. Do not introduce a new dependency when an installed library or existing component already solves the problem.
- Run the TypeScript check after source changes and resolve errors in the files touched by the change.
