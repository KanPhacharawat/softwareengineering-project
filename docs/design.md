# UI Design Direction (design.md)

Version history

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-11-05 | First version, written in F-00 before any screen is built |
| 1.1 | 2026-11-05 | UI language rule: English only, no Thai in the UI |
| 1.2 | 2026-11-06 | F-01: login page layout and session behaviour in the UI (section 5.1) |

This document sets the visual and interaction rules for every CPMS screen. Every feature that adds UI
(F-01 onward) follows it. When a screen needs something not covered here, extend this document in the same PR.

## 1. Direction and reference

Reference: [codern.app](https://codern.app), a Thai coding platform (autograder) for university courses. We take its
direction, not its pixels:

- Plain and calm. Neutral greys, white surfaces, one dark primary colour. Colour is used for meaning (status), not
  decoration.
- Content first. A thin top bar, a centred content column, simple tables and cards. No hero images, gradients or
  illustrations.
- Built from shadcn/ui on Tailwind with Lucide icons, the same foundation Codern's web app uses
  (`codern-org/web`: React + Vite, Tailwind, Radix/shadcn components, `lucide-react`, class-based dark mode,
  HSL CSS-variable colour tokens, Thai web font fallback).
- Thai-friendly typography: Codern pairs a Latin font with a Thai font; we use one family, Noto Sans Thai, which
  covers both Thai and Latin.

Note: the live codern.app site is a client-rendered app and its exact colour values were not readable. The token values
below are the shadcn/ui "zinc" neutral theme, which matches Codern's neutral, low-colour look.

## 2. Stack

| Concern | Choice | Notes |
|---|---|---|
| Components | [shadcn/ui](https://ui.shadcn.com) (style `new-york`, base colour `zinc`) | Components are copied into `web/src/components/ui/` with `npx shadcn@latest add <name>`; edit them there, do not wrap them in another layer. |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) | Utility classes only. No separate CSS files per component. Merge classes with `cn()` from `web/src/lib/utils.ts`. |
| Icons | [lucide-react](https://lucide.dev) | No other icon set, no emoji as icons. |
| Font | [Noto Sans Thai](https://fonts.google.com/noto/specimen/Noto+Sans+Thai) from Google Fonts | Loaded in `web/index.html`, weights 400, 500, 600, 700. |
| Dark mode | Class-based (`.dark` on `<html>`) | Tokens for dark exist from day one; a theme toggle is optional (not in Sprint 1 scope). |

## 3. Colour tokens

All colours come from CSS variables in `web/src/index.css`, used through Tailwind names (`bg-background`,
`text-muted-foreground`, `border-border`, `bg-primary` ...). Never write raw hex or Tailwind palette colours
(`bg-blue-500`) in components, except the status colours in section 3.2.

### 3.1 Base theme (shadcn zinc)

| Token | Light | Dark | Use |
|---|---|---|---|
| `background` | `#ffffff` | `#09090b` | Page background |
| `foreground` | `#09090b` | `#fafafa` | Body text |
| `card` / `popover` | `#ffffff` | `#09090b` | Cards, dialogs, menus |
| `muted` | `#f4f4f5` | `#27272a` | Table header, subtle panels |
| `muted-foreground` | `#71717a` | `#a1a1aa` | Secondary text, hints, timestamps |
| `primary` | `#18181b` | `#fafafa` | Main button, active nav |
| `primary-foreground` | `#fafafa` | `#18181b` | Text on primary |
| `secondary` / `accent` | `#f4f4f5` | `#27272a` | Secondary buttons, hover rows |
| `destructive` | `#ef4444` | `#7f1d1d` | Errors, destructive actions |
| `border` / `input` | `#e4e4e7` | `#27272a` | Borders, input outlines |
| `ring` | `#18181b` | `#d4d4d8` | Focus ring |

### 3.2 Status colours (milestones and submissions)

Status is the only place with colour. Use the shadcn `Badge` with these classes; always show a text label, never
colour alone.

| Status | Meaning | Badge classes | Lucide icon |
|---|---|---|---|
| `OPEN` | Before due date, nothing submitted | `bg-sky-50 text-sky-700 border-sky-200` | `CircleDot` |
| `SUBMITTED` | Submission saved, waiting for feedback | `bg-amber-50 text-amber-700 border-amber-200` | `Clock` |
| `FEEDBACK_GIVEN` | Feedback recorded, submission locked | `bg-emerald-50 text-emerald-700 border-emerald-200` | `CircleCheck` |
| `MISSED` | Due date passed with no submission | `bg-red-50 text-red-700 border-red-200` | `CircleX` |

Dark mode variants: `dark:bg-<hue>-950 dark:text-<hue>-300 dark:border-<hue>-900`.

## 4. Typography

Font stack: `"Noto Sans Thai", ui-sans-serif, system-ui, sans-serif`. Monospace (IDs, links) uses the Tailwind
default `font-mono`.

| Role | Classes | Example |
|---|---|---|
| Page title | `text-2xl font-semibold tracking-tight` | "My teams", team name |
| Section title | `text-lg font-semibold` | "Milestones", "Feedback" |
| Card title | `text-base font-medium` | Milestone title in a card |
| Body | `text-sm` (14 px), line height `leading-6` | Descriptions, table cells |
| Secondary | `text-sm text-muted-foreground` | Due date, "submitted by" |
| Small label | `text-xs font-medium text-muted-foreground` | Form hints, table headers |

Thai text needs more line height than Latin: keep `leading-6` or more for body text and never set `leading-none`
on Thai paragraphs. Do not use weights below 400.

## 5. Layout and spacing

- App shell: sticky top bar (`h-14 border-b bg-background/95 backdrop-blur`), then a centred container
  `mx-auto max-w-5xl px-4 md:px-6 py-8`.
- Top bar: product name "CPMS" with a Lucide `GraduationCap` icon on the left; on the right the user's name, a role
  `Badge` (`variant="secondary"`) and a ghost "Log out" button with `LogOut` icon.
- Page header: title on the left, primary action on the right (`flex items-center justify-between gap-4 mb-6`).
  Breadcrumb above the title on nested pages (My teams / Team Alpha / Milestone 1).
- Spacing scale: Tailwind 4 px steps. Inside cards `p-6`, between stacked sections `space-y-6`, inside forms
  `space-y-4`, between label and input `space-y-2`.
- Radius: `--radius: 0.5rem`; cards `rounded-xl`, buttons and inputs `rounded-md`, badges `rounded-md`.
- Shadow: `shadow-sm` on cards only. No large shadows.
- Responsive: mobile first. Tables scroll horizontally inside `overflow-x-auto` below `md`; two-column detail pages
  stack to one column below `md`. Below `sm` the top bar hides the user's name and keeps the role badge and
  "Log out", so it never wraps.

### 5.1 Login page and session (F-01)

- `/login` has no top bar. It is a single centred column (`min-h-svh flex flex-col items-center justify-center
  gap-6 px-4`): the logo row (`GraduationCap size-5` + "CPMS"), then one `Card` `w-full max-w-sm` holding the page
  title "Log in to CPMS" (page title classes), a one-line `CardDescription`, and the form.
- Form: "Email" and "Password" fields (section 6 form rules), one full-width primary "Log in" button. Empty fields
  are checked in the browser first ("Enter your email", "Enter your password") and focus moves to the first
  invalid field. A failed login shows one destructive `Alert` "Invalid email or password" above the fields, clears
  the password and focuses it. The message never says which of the two was wrong.
- While the session check runs on first load, the page shows `Skeleton` blocks shaped like the top bar and page.
- No session (first visit, expired session, or any API call answering 401) goes to `/login`; after login the user
  returns to the page they asked for, or `/`. A logged-in user who opens `/login` goes to `/`.
- "Log out" in the top bar shows `Loader2` while it runs, then goes to `/login`.

## 6. Components (shadcn/ui)

| Need | Component | Rule |
|---|---|---|
| Actions | `Button` | One `default` (primary) button per view. Others `outline`, `secondary` or `ghost`. Destructive actions `destructive`. Icon left of label, `size-4`. |
| Forms | `Form` pattern with `Label`, `Input`, `Textarea` | Label above input. Field error under the input in `text-sm text-destructive`, using the API `fields` message. Submit button disabled with a `Loader2 animate-spin` icon while sending. |
| Date/time | `Input type="datetime-local"` | Shown and entered in Asia/Bangkok time (SDS section 3). |
| Data lists | `Table` inside a `Card` | Header row `bg-muted/50`, rows hover `bg-muted/50`, row click opens detail. |
| Records | `Card` (`CardHeader`, `CardTitle`, `CardDescription`, `CardContent`) | Submission card, feedback card, team card. |
| Status | `Badge` | Section 3.2. |
| Messages | `Alert` | Error banner `variant="destructive"` with `CircleAlert`; info notice (deadline passed, locked after feedback) default variant with `Info` or `Lock`. |
| Confirmation | `AlertDialog` | Only for actions that cannot be undone (e.g. submitting feedback, which locks the submission). |
| Short success | `Sonner` toast | "Milestone created", "Submission saved". |
| Loading | `Skeleton` | Same shape as the content it replaces. |

## 7. Icons (Lucide)

Size `size-4` inline with text and in buttons, `size-5` in the top bar, `size-10` in empty states, stroke width
default (2). Icons inherit text colour (`text-muted-foreground` when decorative).

| Meaning | Icon |
|---|---|
| App logo | `GraduationCap` |
| Team | `Users` |
| Milestone | `Flag` |
| Due date | `CalendarClock` |
| Submission / link | `FileText`, `ExternalLink` |
| Feedback | `MessageSquare` |
| Locked | `Lock` |
| Create | `Plus` |
| Edit | `Pencil` |
| Log out | `LogOut` |
| Loading | `Loader2` with `animate-spin` |
| Error / info | `CircleAlert`, `Info` |

## 8. States (SDS section 3)

Every page that loads data handles three states:

- Loading: `Skeleton` blocks shaped like the final content.
- Empty: centred block with a `size-10 text-muted-foreground` icon, a one-line message ("No milestones yet") and,
  if the user may act, the primary action.
- Error: destructive `Alert` with the API `error.message`. 401 redirects to `/login`; 404 shows
  "Not found or you do not have access".

## 9. Writing in the UI

- Language: English only. Every UI string (labels, buttons, messages, placeholders, page titles, empty states,
  errors) is written in English, and `<html lang="en">`. No Thai text in the UI or its source. Noto Sans Thai is
  kept only so that Thai text typed by users (e.g. a submission title) still renders correctly.
- Sentence case for titles and buttons ("New milestone", not "New Milestone").
- Buttons say the action: "Create milestone", "Save submission", "Send feedback".
- Dates: `5 Nov 2026, 23:59` in Asia/Bangkok, with the relative time in muted text where helpful ("in 3 days").

## 10. Accessibility

- Every input has a `Label`; icon-only buttons have `aria-label`.
- Visible focus ring (`focus-visible:ring-ring`), kept from shadcn defaults.
- Text contrast at least 4.5:1 (zinc tokens and the status badge pairs above meet it).
- Status is always written as text next to its colour and icon.
