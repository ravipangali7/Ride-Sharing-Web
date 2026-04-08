# Web `src` audit — RideSharing admin and marketing app

This document inventories `[web/src](../src)`: navigation, pages, dynamic vs static behavior, gaps, dead code, and recommended fixes. It aligns with the codebase as of the audit date.

---

## 1. Introduction

### Layout

- **Public marketing site**: `[src/pages/Index.tsx](../src/pages/Index.tsx)` at `/`. Uses `fetchWebsiteHome` and `fetchMobileAppRelease` from `[src/lib/api.ts](../src/lib/api.ts)` for partial dynamic content (stats, download link). Most section copy and lists are **static arrays** in the same file.
- **Admin console**: Routes under `/admin/*` in `[src/App.tsx](../src/App.tsx)`. Shell = `[AdminLayout](../src/components/admin/AdminLayout.tsx)` + `[AdminSidebar](../src/components/admin/AdminSidebar.tsx)` (desktop) + header `[AdminHeader](../src/components/admin/AdminHeader.tsx)`.
- **Page patterns**:
  - **Rich modules** — `[ModulePage](../src/components/admin/ModulePage.tsx)` + dedicated pages (users, riders, rides, food, parcels, agents, tours, recurring rides, bargains) with API hooks, drawers, and forms.
  - **Generic CRUD** — `[SimplePages.tsx](../src/pages/admin/SimplePages.tsx)`: factory `CrudPage` maps each screen title to an API resource via `TITLE_TO_RESOURCE`, loads `/admin/{resource}/` and `/admin/{resource}/stats/`.
  - **Custom screens** — e.g. `[Dashboard.tsx](../src/pages/admin/Dashboard.tsx)`, `[DispatchConfig.tsx](../src/pages/admin/rides/DispatchConfig.tsx)`, `[ScheduledRides.tsx](../src/pages/admin/rides/ScheduledRides.tsx)`, `[AppVersionSettings.tsx](../src/pages/admin/AppVersionSettings.tsx)`.

### API base

- Configured via `VITE_API_BASE_URL`, defaulting to `https://ridesharingserver.luckyuser365.com/api` in `[api.ts](../src/lib/api.ts)`.

---

## 2. Sidebar → route → implementation matrix

Each row is a **sidebar label** (as shown in UI), its **path**, the **component / module** that renders, and notes on **data source** and **completeness**.


| Sidebar label                          | Path                                            | Implementation                           | Dynamic?                                                          | Completeness / notes                                                                       |
| -------------------------------------- | ----------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Dashboard                              | `/admin/dashboard`                              | `Dashboard.tsx`                          | Yes — `fetchDashboardOverview`, activity, revenue, top performers | Full dashboard UX; depends on backend shape.                                               |
| All Users                              | `/admin/users`                                  | `users/UserList.tsx`                     | Yes — `useAdminResource("users")`, stats, detail queries          | Rich module; advanced filters applied client-side.                                         |
| Rider Profiles                         | `/admin/riders`                                 | `riders/RiderList.tsx`                   | Yes                                                               | Rich module.                                                                               |
| Rider Leaderboard                      | `/admin/riders/leaderboard`                     | `SimplePages` → `RiderLeaderboard`       | Yes — `rider_leaderboard` API if present                          | Was missing from sidebar; **now linked in sidebar** (see §8).                              |
| Rider Achievements                     | `/admin/riders/achievements`                    | `SimplePages` → `RiderAchievements`      | Yes — `rider_achievements` API if present                         | Was missing from sidebar; **now linked**.                                                  |
| Parcel Agents                          | `/admin/parcel-agents`                          | `parcel-agents/AgentList.tsx`            | Yes                                                               | Rich module.                                                                               |
| Ride Bookings                          | `/admin/rides`                                  | `rides/RideBookings.tsx`                 | Yes                                                               | Rich module.                                                                               |
| Tour Bookings                          | `/admin/rides/tours`                            | `rides/TourBookings.tsx`                 | Yes                                                               | Rich module.                                                                               |
| Scheduled Rides                        | `/admin/rides/scheduled`                        | `rides/ScheduledRides.tsx`               | Yes                                                               | Thin UI: table only, no `ModulePage` filters/pagination/drawer.                            |
| Recurring Rides                        | `/admin/rides/recurring`                        | `rides/RecurringRides.tsx`               | Yes                                                               | Rich module.                                                                               |
| Dispatch Config                        | `/admin/rides/dispatch`                         | `rides/DispatchConfig.tsx`               | Yes                                                               | Needs existing config row; no create-UI if empty.                                          |
| Bargain Offers                         | `/admin/rides/bargains`                         | `rides/BargainOffers.tsx`                | Yes                                                               | Rich module.                                                                               |
| Parcel Bookings                        | `/admin/parcels`                                | `parcels/ParcelBookings.tsx`             | Yes                                                               | Rich module.                                                                               |
| Restaurants / Menu Items / Food Orders | `/admin/food/*`                                 | `food/*.tsx`                             | Yes                                                               | Rich modules.                                                                              |
| Ecommerce (4 items)                    | `/admin/ecommerce/*`                            | `SimplePages` (`Vendors`, `Products`, …) | Yes — CRUD + stats API                                            | Placeholder stat labels until `_applyLiveStat` matches; `generateData` unused when API on. |
| Room rent (4 items)                    | `/admin/rooms/*`                                | `SimplePages`                            | Yes                                                               | Same CRUD pattern.                                                                         |
| Finance (7 items)                      | `/admin/finance/*`                              | `SimplePages`                            | Yes                                                               | Same.                                                                                      |
| Pricing (5 items)                      | `/admin/pricing/*`                              | `SimplePages`                            | Yes                                                               | Same.                                                                                      |
| Promotions (5 items)                   | `/admin/promotions/*`                           | `SimplePages`                            | Yes                                                               | Same.                                                                                      |
| Loyalty (7 items)                      | `/admin/loyalty/*`                              | `SimplePages`                            | Yes                                                               | Same.                                                                                      |
| Notifications (4 items)                | `/admin/notifications/*`                        | `SimplePages`                            | Yes                                                               | Same.                                                                                      |
| Support Tickets                        | `/admin/support`                                | `SimplePages` → `SupportTickets`         | Yes                                                               | Same.                                                                                      |
| App Settings                           | `/admin/settings/app`                           | `SimplePages`                            | Yes                                                               | Same.                                                                                      |
| Mobile APK release                     | `/admin/settings/app-version`                   | `AppVersionSettings.tsx`                 | Yes                                                               | Dedicated multipart upload + version. **Sidebar label clarified** vs version history.      |
| Service Charges                        | `/admin/settings/service-charges`               | `SimplePages`                            | Yes                                                               | Same.                                                                                      |
| Version history (CRUD)                 | `/admin/settings/versions`                      | `SimplePages` → `AppVersions`            | Yes                                                               | **Sidebar label clarified** to distinguish from APK screen.                                |
| Quick Replies / Cancellation           | `/admin/settings/quick-replies`, `cancellation` | `SimplePages`                            | Yes                                                               | Same.                                                                                      |
| Admins / Activity Logs                 | `/admin/admin-users`, `.../activity`            | `SimplePages`                            | Yes                                                               | Same.                                                                                      |
| Analytics                              | `/admin/analytics`                              | `SimplePages` → `Analytics`              | Yes                                                               | Table-style CRUD; not a charts-first analytics product.                                    |


**Auth:** `[Login.tsx](../src/pages/admin/Login.tsx)` at `/admin/login` (not in sidebar). **404:** `[NotFound.tsx](../src/pages/NotFound.tsx)`.

---

## 3. Routes without sidebar (before fixes)

These were registered in `[App.tsx](../src/App.tsx)` but **not** listed in `[AdminSidebar](../src/components/admin/AdminSidebar.tsx)`:

- `/admin/riders/leaderboard`
- `/admin/riders/achievements`

**Resolution:** Added sidebar entries under USERS (see code changes in §8).

---

## 4. Static, hardcoded, or mock content


| Area                                         | Evidence                                                                    | Issue                                                                        | Recommended solution                                                                                                  |
| -------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Marketing services / features / testimonials | `[Index.tsx](../src/pages/Index.tsx)` top-level arrays                      | Not driven by CMS                                                            | Extend `fetchWebsiteHome` contract and map fields, or add a small CMS.                                                |
| Hero stats fallback                          | `Index.tsx` — uses `homeData` with string fallbacks like `"10,000+"`        | Partially dynamic                                                            | Keep fallbacks; document API fields for content owners.                                                               |
| God Eye map                                  | `[GodEyeMap.tsx](../src/components/admin/GodEyeMap.tsx)` `generateEntities` | **Mock** positions around Kathmandu; tooltip says “live”                     | Add `/admin/...` locations API + polling/WebSocket; rename UI until real data exists.                                 |
| Sidebar operator card                        | `[AdminSidebar.tsx](../src/components/admin/AdminSidebar.tsx)`              | Was hardcoded “Super Admin” / “superadmin”                                   | **Now reads** `sessionStorage` `admin_user` (name, email/username, initials).                                         |
| `CrudPage` KPI defaults                      | `[SimplePages.tsx](../src/pages/admin/SimplePages.tsx)` each `stats: [...]` | Numeric placeholders until `fetchAdminStats` + `_applyLiveStat` match labels | Align stat **labels** with backend `ResourceStats` or extend `_applyLiveStat`; optionally hide cards with no mapping. |
| `generateData` in `SimplePages`              | Same file, per export                                                       | Unused when `TITLE_TO_RESOURCE` resolves (normal case)                       | Keep for offline/storybook, or gate behind env flag to reduce bundle noise.                                           |
| Duplicate “App Version” wording              | Sidebar had two similar labels                                              | Operator confusion                                                           | **Renamed** to “Mobile APK release” and “Version history (CRUD)”.                                                     |


---

## 5. Broken, stubbed, or misleading UI


| Location                            | Issue                                                             | Recommended solution                                                                                       |
| ----------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| ~~`AdminLayout` mobile bottom bar~~ | ~~Buttons did not navigate~~                                      | **Fixed:** primary tabs navigate; “More” opens sheet with full nav (see §8).                               |
| `AdminHeader` search                | Placeholder “Search... (⌘K)” with no behavior                     | Implement command palette + search API, or soften copy / hide.                                             |
| `AdminHeader` bell                  | No dropdown or API                                                | Wire to notifications or hide.                                                                             |
| Breadcrumbs                         | Non-clickable text                                                | Optional: `Link` for parent segments.                                                                      |
| `Login` “Remember this device”      | Checkbox does nothing                                             | Persist refresh token policy or remove.                                                                    |
| ~~`CrudPage` Export~~               | ~~No-op `onExport` still showed button~~                          | **Fixed:** CSV export of **filtered** rows; or omit button when no data.                                   |
| ~~`CrudPage` advanced filters~~     | ~~Dialog state not applied to table when `advFilterFields` used~~ | **Fixed:** `matchesAdvFilters` applied in filter pipeline (ready for configs that pass `advFilterFields`). |
| ~~`CrudPage` errors~~               | ~~No `isError` UI~~                                               | **Fixed:** error message when list query fails.                                                            |
| ~~Stats after CRUD~~                | ~~Stats query not invalidated on mutation~~                       | **Fixed:** `useAdminMutations` also invalidates `admin-stats`.                                             |
| `ModulePage`                        | Previously passed no-op `onExport`                                | **Fixed:** `onExport` omitted so Export button hidden until parents supply a real handler.                 |
| God Eye                             | “Live” copy vs mock data                                          | See §4 — rename or implement live feed.                                                                    |


---

## 6. Dead or redundant code


| Item                                           | Evidence                                                                                                                   | Recommendation                                                          |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| ~~`generateUsers` + `names` in UserList~~      | Never invoked                                                                                                              | **Removed** in this pass.                                               |
| `NavLink.tsx` in `components/`                 | Not imported                                                                                                               | Remove or adopt as single wrapper for active styles.                    |
| `components/ui/sidebar.tsx` + `use-mobile.tsx` | Sidebar kit unused; admin uses custom sidebar                                                                              | Remove if tree-shaking does not drop deps, or keep for future redesign. |
| Unused shadcn primitives                       | e.g. `carousel`, `chart`, `menubar`, `navigation-menu`, `hover-card`, `input-otp`, `resizable`, `aspect-ratio` under `ui/` | Run import analysis; delete unused files to shrink deps.                |


---

## 7. Missing product / UX pieces

- **Pagination** on `CrudPage` (currently `page_size: 200` only).
- **Mobile parity** — sheet lists all routes; deep navigation still easier on desktop.
- **Global admin error boundary** — optional React error boundary route wrapper.
- **Real-time God Eye** — backend contract + map updates.
- **Public site** — no `/privacy`, `/terms`, blog, etc. (only `Index` + `NotFound`).
- `**advFilterFields` on CRUD configs** — infrastructure works; individual `SimplePages` exports can opt in per resource.

---

## 8. Fixes applied in this implementation pass

The following were implemented in the codebase alongside this document:

1. `**web/docs/WEB_SRC_AUDIT.md`** — this file.
2. `**[AdminSidebar.tsx](../src/components/admin/AdminSidebar.tsx)`** — Exported `adminNavGroups`; added Rider Leaderboard + Rider Achievements; sidebar profile from `admin_user` session JSON; clearer settings labels; `Medal` icon import for achievements.
3. `**[AdminLayout.tsx](../src/components/admin/AdminLayout.tsx)**` — Functional mobile nav (navigate + active state) + `Sheet` “More” menu using `adminNavGroups`.
4. `**[SimplePages.tsx](../src/pages/admin/SimplePages.tsx)**` — `matchesAdvFilters` helper; `filtered` uses advanced filters; list `isError` UI; CSV export via real `handleExport`; `PageHeader` only gets `onExport` when exporting; mutations invalidate stats via shared hook.
5. `**[useAdminMutations.ts](../src/hooks/useAdminMutations.ts)**` — Invalidate `["admin-stats", resource]` on create/update/delete success.
6. `**[ModulePage.tsx](../src/components/admin/ModulePage.tsx)**` — Removed no-op `onExport` prop so Export is hidden unless provided.
7. `**[UserList.tsx](../src/pages/admin/users/UserList.tsx)**` — Removed unused `generateUsers`, `names`, and `genders` mock helpers.

---

## 9. Prioritized backlog (remaining work)

### P0 — User-visible or trust issues

- Replace or label **God Eye** mock data honestly until API exists.
- **Admin header** search and notifications: implement or remove misleading affordances.

### P1 — Data and scale

- **Pagination** for `CrudPage` and large `ModulePage` lists.
- Align **CRUD stat labels** with backend stats schema across all `SimplePages` configs.

### P2 — Cleanup

- Remove unused **shadcn** components after verification.
- Decide fate of `**NavLink.tsx`** wrapper.
- **Login** remember-me: implement or delete checkbox.

---

## 10. File index (quick reference)


| Path                                    | Role                                      |
| --------------------------------------- | ----------------------------------------- |
| `src/App.tsx`                           | All routes                                |
| `src/components/admin/AdminSidebar.tsx` | Desktop sidebar + `adminNavGroups`        |
| `src/components/admin/AdminLayout.tsx`  | Auth gate, mobile nav + sheet             |
| `src/components/admin/AdminHeader.tsx`  | Breadcrumbs, search, God Eye, user chip   |
| `src/components/admin/ModulePage.tsx`   | Shared layout for rich modules            |
| `src/pages/admin/SimplePages.tsx`       | Generic `CrudPage` + dozens of exports    |
| `src/lib/api.ts`                        | HTTP client, admin endpoints              |
| `src/hooks/useAdminResource.ts`         | List queries                              |
| `src/hooks/useAdminMutations.ts`        | Create/update/delete + cache invalidation |


---

*End of audit.*