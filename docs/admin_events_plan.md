# Admin Events — v1 Plan

Branches (all `feature/admin-events`, from `develop`):
- `circles-admin-panel` @ `e65f305`
- `circles-core-service` @ `77a1ea4`
- `circles-mobile-app` (to create when mobile work starts)

We build all three parts: backend (core-service), admin panel, mobile.
Source: October CRs PDF §4. Mobile counterpart: `circles-mobile-app/docs/october_crs_mobile_plan.md` §1.4.

---

## 1. v1 scope (decided 2026-10-09)

Simple first, tweak later.

1. Admin creates the event in **Luma** by hand (tickets, prices, capacity, payments, check-in all stay in Luma).
2. Admin creates the **same event in the admin panel**, pasting the Luma link.
3. The event shows in the mobile app for **everyone** (guests and members), **pinned at the top of the All Moments tab**. All visible admin events show (expect only 1–2 at a time), ordered by start time; regular Live Moments follow below.
4. Admin controls how long it stays: a **Visible until** date/time in the form (defaults to the end time).
5. Admin event cards have a **neon gradient border** in the same colours as the mobile `NeonSlider` (`#A855F7` purple → white → `#3B82F6` blue).
6. Tapping the card opens the event; the main button opens the Luma link.
7. **Who can join** (decided 2026-10-09), set per event:
   - **Everyone**: all users see the card and can join.
   - **Members only**: all users see the card; guests see it locked and must buy a membership to join.
8. **Member early access** (only with Everyone): members can join as soon as the event is published; everyone else from an admin-set **Opens to everyone at** time.

**Not in v1** (later, if wanted): member and guest prices, member ticket code, +1, Luma API sync, push on publish/cancel.

---

## 2. Data model

A separate `events` resource, **not** a Live Moment. Live Moments carry host approval, join requests, check-in, a 6 h expiry and "who can see you" filtering, none of which fit an event ticketed on Luma.

| Field | Type | Admin input | Rule |
|---|---|---|---|
| `id` | uuid | — | |
| `title` | string ≤ 120 | text | required |
| `description` | text ≤ 2000 | textarea | optional |
| `venueId` | uuid, nullable | searchable venue dropdown (`SearchableSelect`) | optional; when set, the app shows the venue name and links to it |
| `locationName` | string ≤ 255, nullable | text | used when no venue is picked |
| `startsAt` | timestamptz | `DateTimePicker` (calendar + hour/minute) | required |
| `endsAt` | timestamptz | `DateTimePicker` | required, after `startsAt` |
| `coverImageS3FileName` | string, nullable | image upload (`useFileUpload`, folder `eventimages`) | response returns `coverImageUrl` |
| `lumaUrl` | string | text | required, `https://` URL |
| `visibleUntil` | timestamptz, nullable | `DateTimePicker`, clearable; hint shows it relative to the event ("until 30 min before the event starts") | when the card leaves the app; empty = `endsAt` |
| `isPublished` | boolean | switch | only published events reach the app |
| `audience` | `everyone` \| `members_only`, default `everyone` | dropdown "Who can join" | DB check constraint |
| `generalAccessAt` | timestamptz, nullable | switch "Member early access" + `DateTimePicker` "Opens to everyone at"; hint relative to the start | null = no early access; forced null for `members_only`; must be before `endsAt` |
| `createdAt` / `updatedAt` / `deletedAt` | | — | soft delete |

App visibility rule: `isPublished && COALESCE(visibleUntil, endsAt) > now`, ordered by `startsAt` ascending. No limit on count. Every user gets every visible event, including members-only ones.

App join rule (`resolveAccess`, enforced by the backend):

| User | Everyone | Everyone + early access, before `generalAccessAt` | Members only |
|---|---|---|---|
| Member | can join | can join | can join |
| Guest | can join | locked, `EARLY_ACCESS` | locked, `MEMBERS_ONLY` |

Member = active paid subscription (`hasActivePaidSubscription`, same helper as the member/guest tag). When locked, the app response has `lumaUrl: null`, so the link is not handed to guests.

---

## 3. Backend (circles-core-service, built by us)

Core-service owns it: Live Moments live there, and the panel already calls it through `${BASE_URL}/core-service/...`.

`src/modules/events` already exists (outbox/consumption log), so the new module is **`src/modules/admin-events`**, table **`core_admin_events`**.

| # | File | Change |
|---|---|---|
| 1 | `migrations/1789300000000-CreateAdminEvents.ts` + `1789400000000-AddAdminEventAccess.ts` | Table, `ends_at > starts_at` check, index on `(is_published, starts_at)`; then `audience` (check constraint) + `general_access_at`. Both applied to the shared dev DB on 2026-10-09 (run on their own; PR #86's pending migration untouched). |
| 2 | `admin-events/entities/admin-event.orm-entity.ts` | ORM entity. |
| 3 | `admin-events/dto/create-admin-event.dto.ts`, `update-admin-event.dto.ts` | class-validator rules from section 2 (`endsAt > startsAt` checked in service). |
| 4 | `admin-events/services/admin-events.service.ts` | CRUD, list with search + pagination, `listVisible()`, venue name lookup, cover URL via the existing CloudFront helper. |
| 5 | `admin-events/controllers/admin-events-admin.controller.ts` | `@Public()` + `@UseGuards(AdminApiKeyGuard)`, same as `venues-admin.controller.ts`. |
| 6 | `admin-events/controllers/admin-events.controller.ts` | User route, default `CompositeAuthGuard`. |
| 7 | `admin-events/admin-events.module.ts` + `app.module` | Register module. |
| 8 | `admin-events.service.spec.ts` | Create/update rules, early-access normalisation, Luma link hidden from a locked guest, `resolveAccess` table. |

Routes:
- Admin (admin Cognito token / API key): `GET /admin/admin-events?page&limit&search`, `GET /admin/admin-events/:id`, `POST /admin/admin-events`, `PATCH /admin/admin-events/:id`, `DELETE /admin/admin-events/:id` (soft delete). Exact prefix follows the venues admin routing at build time.
- User (app token): `GET /admin-events` → visible events, `startsAt` asc, each with `venue { id, name } | null`, `coverImageUrl`, `audience`, `generalAccessAt`, and per user `canJoin`, `lockReason` (`MEMBERS_ONLY` | `EARLY_ACCESS` | null), `lumaUrl` (null when locked).
- Response envelope same as the rest of core-service, so the panel's unwrap helper works unchanged.

---

## 4. Admin panel work (this branch)

Template: the venues feature (plain `useState` form, service functions, shadcn `Table`, server-side pagination).

| # | File | Change |
|---|---|---|
| 1 | `src/services/admin-event.service.ts` (new) | Types, mapper, `fetchEvents`, `fetchEventById`, `createEvent`, `updateEvent`, `deleteEvent`. Same unwrap + error pattern as `venue.service.ts`. |
| 2 | `src/app/(dashboard)/dashboard/events/page.tsx` (new) | List: search, table (cover, title, venue, starts, access, status), pagination, Add button. `?id=` renders the detail. |
| 3 | `src/app/(dashboard)/dashboard/events/create/page.tsx` (new) | `<EventForm mode="create" />`. |
| 4 | `src/app/(dashboard)/dashboard/events/EventDetailClient.tsx` (new) | Fetch by id, render `EventForm` in view/edit (`?edit=true`), delete. |
| 5 | `src/app/(dashboard)/dashboard/events/event-form.tsx` (new) | Fields from section 2. Venue dropdown loads `fetchVenues`. Cover via `useFileUpload`. Validation via `toast.error`. Hints from `visibility.ts`. |
| 5a | `src/components/ui/date-time-picker.tsx` (new) | Calendar + hour/minute dropdowns, built from the existing `Calendar`, `Popover`, `Select`. |
| 6 | `src/constants/navkeys.ts` | `EventsPage = '/dashboard/events'`. |
| 7 | `dashboard-siderbar.tsx` | Sidebar entry "Events" (lucide `CalendarDays`). |
| 8 | `src/components/shared/page-header.tsx` | `routeMap` + `segmentLabelMap` entries. |
| 9 | `e2e/events.spec.ts` (new) + `e2e/helpers.ts` | Copy `venues.spec.ts`: list renders, Add opens create, empty required fields blocked. |

Built after the backend routes exist on the branch, so the panel is wired for real from the start.

---

## 5. Mobile work (separate branch in `circles-mobile-app`)

1. `src/api/admin-events/` service: `getAdminEvents()` → `GET /core-service/admin-events`.
2. `AllMomentsTab.tsx`: fetch events alongside the feed; render them as the `FlatList` `ListHeaderComponent` so they sit above all moments. Refetch on pull-to-refresh.
3. `AdminEventCard` component: cover, title, date/time, venue or location, "Get tickets" button → `Linking.openURL(lumaUrl)`.
4. Neon border: `react-native-svg` `LinearGradient` (already installed) with stops `#A855F7` → white → `#3B82F6`, same as `NeonSlider.tsx:60-64`, drawn as a rounded-rect stroke around the card. Reuse the colours from one shared constant, not copied hex values.
5. Card shown to everyone. Button by `canJoin` / `lockReason` from the API:
   - `canJoin` → "Get tickets" opens `lumaUrl`.
   - `MEMBERS_ONLY` → locked "Members only" button (`MemberLock`), tap opens the membership sheet.
   - `EARLY_ACCESS` → "Members booking now · opens to everyone in 2 d 3 h" (countdown from `generalAccessAt`), tap opens the membership sheet. Refetch when the countdown hits zero.
   - Member with early access live → small "Member early access" tag on the card.

---

## 6. Build order

| Step | Scope | Depends on backend | Estimate |
|---|---|---|---|
| 1 | Backend module, migration, routes, spec (section 3) | — | 1 day |
| 2 | Admin panel pages (section 4, items 1–8) | Step 1 | 1.5 days |
| 3 | Mobile card + All Moments pinning (section 5) | Step 1 | 1 day |
| 4 | Deploy backend to dev, run migration, e2e spec, end-to-end check | Steps 1–3 | 0.5 day |

---

## 7. Open questions

1. ~~Who builds the backend~~ — answered 2026-10-09: we build it, in core-service.
2. ~~Several events at once~~ — answered 2026-10-09: show all visible ones at the top, then Live Moments.
3. ~~When a past event drops off~~ — answered 2026-10-09: admin sets "Visible until" (defaults to end time).
