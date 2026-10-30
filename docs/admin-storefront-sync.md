# Admin Panel & Storefront Synchronization Map

This document maps all storefront entities and dynamic components to their admin panel controls, identifying gaps, implemented fixes, cache invalidation tags, and final verification status.

---

## 1. Architectural Overview

- **Storefront (`/`, port 3000)**: Next.js 16 App Router, React 19, Clerk Auth (user IDs are strings like `user_2...`). Uses ISR (`revalidate = 60`) on homepage and dynamic routes with on-demand `revalidateTag` / `revalidatePath`.
- **Admin Panel (`admin-panel/`, port 3001)**: Next.js 16 App Router, NextAuth (Credentials). Uses Server Actions in `src/lib/db/adminQueries.ts` guarded by `assertAdmin()`, `sanitizeNoSql()`, and cross-app `notifyStorefront()`.
- **OMS Panel (`oms-panel/`, port 3002)**: Next.js 16 App Router, NextAuth. Handles inventory reservation, order fulfillment, and stock decrement; dispatches `notifyStorefront(['orders', 'products'])` on status changes.
- **Shared Database**: Single MongoDB Atlas instance accessed via Mongoose 8.
- **Cross-App Communication**: Storefront exposes `/api/revalidate` protected by `REVALIDATE_SECRET` with constant-time comparison (`crypto.timingSafeEqual`) and rate limiting. Admin and OMS use fail-safe `notifyStorefront(tags)` to trigger instant on-demand cache revalidation.

---

## 2. Synchronization Map & Final Status

| Entity / Section | Storefront File(s) | Admin Screen / Origin | Implemented Fix & Revalidation Tags | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Model Parity** | `src/lib/models/*` | `admin-panel/src/lib/models/*`, `oms-panel/src/lib/models/*` | Aligned all 16 shared Mongoose models across all 3 applications to canonical superset. Fixed `userId` type to String across Order/Address/Cart/Wishlist. Added automated 34-check parity test `tests/modelParity.test.ts`. | **Completed / Verified** |
| **Media Uploads** | `src/app/api/upload/route.ts` | `admin-panel/src/app/api/upload/route.ts` | Standardized admin upload handler with strict JPG/PNG/WebP validation, 5MB file size limit, and dual-write to both storefront and admin `public/uploads/` folders with standard `/uploads/<filename>` paths. | **Completed / Verified** |
| **Cross-App Revalidation** | `src/app/api/revalidate/route.ts` | `admin-panel/src/lib/sync.ts`, `oms-panel/src/lib/sync.ts` | Created authenticated `/api/revalidate` endpoint with constant-time secret comparison (`crypto.timingSafeEqual`), IP sliding-window rate limiting, and Next.js 16 `revalidateTag(tag, 'max')`. Created fail-safe `notifyStorefront()` helper in admin and OMS. Added 10-test suite `tests/revalidateApi.test.ts`. | **Completed / Verified** |
| **Site Settings (Header, Shipping, Policies, Maintenance)** | `src/components/Header.tsx`, `src/app/layout.tsx`, `src/lib/db/queries/settings.queries.ts` | `admin-panel/src/app/admin/settings/page.tsx` | Wrapped settings queries in `safeCache` with tag `site-settings`. Added `maintenance_mode` toggle to admin settings. Enabled layout-level maintenance banner and cart/checkout shipping threshold syncing. Mutations trigger `notifyStorefront(['site-settings'])`. | **Completed / Verified** |
| **Hero Carousel** | `src/app/page.tsx`, `src/components/HeroCarousel.tsx`, `src/lib/db/queries/homepage.queries.ts` | `admin-panel/src/app/admin/hero-slides/page.tsx` | Wrapped `getHeroSlides()` in `safeCache` with tag `hero`. Filters `isActive: true` and sorts by `sortOrder` ascending. Slide create/update/delete mutations recheck admin session and trigger `notifyStorefront(['hero'])`. | **Completed / Verified** |
| **Brands (`BrandsThatLead` & Ribbon)** | `src/app/page.tsx`, `src/components/BrandsThatLead.tsx`, `src/lib/db/queries/homepage.queries.ts` | `admin-panel/src/app/admin/brands/page.tsx` | Wrapped `getBrands()` in `safeCache` with tag `brands`. Enforces `isActive: true` and `sortOrder: 1`. Preserves exact mobile 2-row ~2.5 column carousel layout and desktop card grid with logo fallbacks. Brand mutations trigger `notifyStorefront(['brands', 'products'])`. | **Completed / Verified** |
| **Categories & Navigation** | `src/components/Header.tsx`, `src/lib/db/queries/navigation.queries.ts` | `admin-panel/src/app/admin/navigation/page.tsx` | Wrapped category and navigation queries in `safeCache` with tags `categories` and `navigation`. Admin nav link and category mutations trigger `notifyStorefront(['categories', 'navigation'])`. | **Completed / Verified** |
| **Homepage Dynamic Sections & Ads** | `src/app/page.tsx`, `src/components/ProductCarouselSection.tsx`, `src/lib/db/queries/homepage.queries.ts` | `admin-panel/src/app/admin/sections/page.tsx` | Wrapped `getHomepageSections()` in `safeCache` with tag `sections`. Homepage ad blocks read dynamic `ad_banners` from SiteSetting with fallback to default ads. Section mutations trigger `notifyStorefront(['sections'])`. | **Completed / Verified** |
| **Visible Changes (Clinical Proof)** | `src/app/page.tsx`, `src/components/VisibleChanges.tsx`, `src/lib/db/queries/homepage.queries.ts` | `admin-panel/src/app/admin/visible-changes/page.tsx` | Wrapped `getVisibleChanges()` in `safeCache` with tag `visible-changes`. Filters active items and sorts by `sortOrder`. Visible changes CRUD in admin triggers `notifyStorefront(['visible-changes'])`. | **Completed / Verified** |
| **Coupons** | `src/app/cart/page.tsx`, `src/app/checkout/page.tsx`, `src/app/api/cart/route.ts` | `admin-panel/src/app/admin/coupons/page.tsx` | `getActiveCoupons()` kept dynamic (zero caching) for instant checkout validation against live database. Admin coupon mutations trigger `notifyStorefront(['coupons'])`. | **Completed / Verified** |
| **Products & Live Stock** | `src/app/product/[slug]/page.tsx`, `src/app/shop/page.tsx`, `src/lib/db/queries/product.queries.ts` | `admin-panel/src/app/admin/products/page.tsx` | Wrapped `getProductBySlug` and `getProductCards` in `safeCache` with tags `products` and `product:{slug}`. Admin product create/update/delete actions enforce `assertAdmin()`, `sanitizeNoSql()`, and call `notifyStorefront(['products', 'product:${slug}', 'sections'])`. | **Completed / Verified** |
| **Review Moderation & Rating Recalc** | `src/components/ReviewList.tsx`, `src/lib/db/queries/helpers.ts` | Customer soft-delete & admin moderation | `recalculateProductRating` invalidates `products` and `product:{slug}` tags upon review approval, rating change, or soft-delete so PDP averages and review counts update immediately without stale cache. | **Completed / Verified** |
| **OMS Stock Reservation & Fulfillment** | `oms-panel/src/lib/db/omsQueries.ts` | `oms-panel/src/app/admin/orders/page.tsx` | Order status changes (paid, shipped, cancelled, refunded) in OMS trigger `notifyStorefront(['orders', 'products'])` to synchronize storefront stock and order states. | **Completed / Verified** |
| **About Us Content** | `src/app/about/page.tsx`, `src/lib/db/queries/settings.queries.ts` | `admin-panel/src/app/admin/about/page.tsx` | Wrapped `getAboutContent()` in `safeCache` with tag `about`. Admin `updateAboutSection` calls `notifyStorefront(['about'])` in addition to admin local revalidation. | **Completed / Verified** |

---

## 3. Cache Invalidation Strategy & Tag Taxonomy

| Tag | Revalidated When | Affected Storefront Routes |
| :--- | :--- | :--- |
| `site-settings` | Header announcement, shipping fees, thresholds, maintenance mode, or policies updated in admin settings | All pages (Header announcement), `/cart`, `/checkout`, `/privacy`, `/terms`, `/shipping`, `/returns` |
| `hero` | Hero slides created, edited, reordered, toggled active/inactive, or deleted | `/` (Homepage) |
| `brands` | Brands created, edited, reordered, toggled active/inactive, or deleted | `/` (`BrandsThatLead`, ribbon), `/shop` (brand filters) |
| `categories` | Categories created, edited, or reordered | `/shop`, Header navigation megamenu |
| `navigation` | Nav links created, edited, reordered, or deleted | All pages (Header navigation, mobile menu) |
| `sections` | Homepage sections created, edited, reordered, or products assigned | `/` (Homepage dynamic sections) |
| `products` | Product created, edited, price changed, stock updated, toggled active/inactive, or deleted | `/shop`, `/` (featured/carousels), search results |
| `product:{slug}` | Single product details, images, sizes, stock, reviews, or prices updated | `/product/[slug]`, `/cart` (live stock/price validation) |
| `visible-changes` | Clinical proof cards created, edited, or reordered | `/` (Homepage proof section) |
| `coupons` | Coupons created, activated, deactivated, or expired | `/cart`, `/checkout` |
| `about` | About page mission, stats, timeline, or values updated | `/about` |

---

## 4. Idempotent Data Seed

The repository includes an idempotent seed script:
```bash
npm run seed:sync
```
Located in `scripts/syncSeed.ts`, it uses MongoDB `$setOnInsert` operations to seed baseline records for:
- `SiteSetting`: Standard shipping fee (60), free shipping threshold (1000), announcement text, contact details, maintenance mode (`false`), and default `ad_banners`.
- `HeroSlide`: Baseline hero slides with priority `sortOrder`.
- `HomepageSection`: Dynamic section configurations (Bestsellers, New Arrivals).

Running this script multiple times is completely safe and will never overwrite customized or existing admin settings.

---

## 5. Verification Summary

- **Root Storefront**:
  - `npm test`: 173 passing tests across 39 test suites (0 failures).
  - `npx tsc --noEmit`: 0 TypeScript errors.
  - `npm run build`: Compiled successfully in 4.9s, all 37 routes generated cleanly.
- **Admin Panel**:
  - `npx tsc --noEmit`: 0 TypeScript errors.
  - `npm run build`: Compiled successfully in 3.4s, all 19 routes generated cleanly.
- **OMS Panel**:
  - `npx tsc --noEmit`: 0 TypeScript errors.
  - `npm run build`: Compiled successfully in 3.9s, all 12 routes generated cleanly.
