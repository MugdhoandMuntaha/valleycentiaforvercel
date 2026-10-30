# Admin Panel & Storefront Synchronization Map

This document maps all storefront entities and dynamic components to their admin panel controls, identifying gaps, planned fixes, cache invalidation tags, and implementation priorities.

---

## 1. Architectural Overview

- **Storefront (`/`, port 3000)**: Next.js 16 App Router, React 19, Clerk Auth (user IDs are strings like `user_2...`). Uses ISR (`revalidate = 60`) on homepage and dynamic routes.
- **Admin Panel (`admin-panel/`, port 3001)**: Next.js 16 App Router, NextAuth (Credentials). Uses Server Actions in `src/lib/db/adminQueries.ts`.
- **OMS Panel (`oms-panel/`, port 3002)**: Next.js 16 App Router, NextAuth. Handles inventory reservation, order fulfillment, and stock decrement.
- **Shared Database**: Single MongoDB Atlas instance accessed via Mongoose 8.
- **Cross-App Communication**: Storefront exposes `/api/revalidate` protected by `REVALIDATE_SECRET` and timing-safe header verification. Admin and OMS use `notifyStorefront(tags)` to trigger instant on-demand cache revalidation.

---

## 2. Synchronization Map

| Entity / Section | Storefront File(s) | Current Source | Admin Screen | Gap | Planned Fix | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Model Parity** | `src/lib/models/*` | Root models (superset) | `admin-panel/src/lib/models/*`, `oms-panel/src/lib/models/*` | 8 drifted models (`Product`, `Order`, `User`, `Address`, `CartItem`, `WishlistItem`, `Coupon`, `Review`). `userId` is `string` in root vs `ObjectId` in admin/OMS causing CastErrors. | Align all models across all 3 apps to canonical superset. Add `tests/modelParity.test.ts`. | **P0 (Critical)** |
| **Media Uploads** | `src/app/api/upload/route.ts` | Local filesystem `public/uploads/` | `admin-panel/src/app/api/upload/route.ts` | Admin upload missing MIME type and 5MB size limit checks; uploads must resolve in both admin preview and storefront. | Standardize admin upload route with strict MIME/size validation; save to storefront `public/uploads/` with admin preview mirror. | **P0 (Critical)** |
| **Cross-App Revalidation** | `src/app/api/revalidate/route.ts` | None | `admin-panel/src/lib/sync.ts` | Admin cannot directly trigger Next.js cache revalidation on the storefront. | Create authenticated `/api/revalidate` with `crypto.timingSafeEqual` and rate limiting. Create non-blocking `notifyStorefront()` helper in admin and OMS. | **P0 (Critical)** |
| **Products & Stock** | `src/app/product/[slug]/page.tsx`, `src/app/shop/page.tsx`, `src/lib/db/queries/product.queries.ts` | Direct DB queries (no cache tags) | `admin-panel/src/app/admin/products/page.tsx`, `new/`, `[id]/edit/` | Mutations lack session auth check, input sanitization, and storefront revalidation. No cache tags on PDP. Soft-deleted products lack uniform filtering. | Tag `products`, `product:{slug}`, `sections`. Admin product CRUD rechecks session + role, sanitizes input, and calls `notifyStorefront`. OMS stock changes call `notifyStorefront`. | **P0 (Critical)** |
| **Brands (`BrandsThatLead` & Ribbon)** | `src/app/page.tsx`, `src/components/BrandsThatLead.tsx`, `src/components/BrandScrollingRibbon.tsx` | `getBrands()` in `homepage.queries.ts` | `admin-panel/src/app/admin/brands/page.tsx` | Admin mutations lack auth check, sanitization, and storefront revalidation. Desktop brand cards expect `logo_url` and accent colors; missing logos need graceful fallback. | Tag `brands`, `products`. Add auth/sanitization to `adminQueries.ts` brand actions. Call `notifyStorefront(['brands', 'products'])`. Maintain exact mobile carousel & desktop layouts. | **P0 (Critical)** |
| **Hero Carousel** | `src/app/page.tsx`, `src/components/HeroCarousel.tsx` | `getHeroSlides()` in `homepage.queries.ts` | `admin-panel/src/app/admin/hero-slides/page.tsx` | Admin hero mutations lack auth and do not call `notifyStorefront(['hero'])`. Storefront query doesn't use `unstable_cache`. | Tag `hero`. Wrap `getHeroSlides()` in tagged cache. Add auth/sanitization and call `notifyStorefront(['hero'])` on slide create/update/delete. | **P1 (High)** |
| **Categories & Navigation** | `src/components/Header.tsx`, `src/components/header/Navigation.tsx`, `src/app/shop/page.tsx` | `getNavLinks()`, `getCategories()` | `admin-panel/src/app/admin/navigation/page.tsx` | Admin nav mutations do not notify storefront. Deactivating category doesn't invalidate nav or shop tags. | Tag `categories`, `navigation`. Add auth/sanitization to admin nav actions and call `notifyStorefront(['categories', 'navigation'])`. | **P1 (High)** |
| **Homepage Sections & Ads** | `src/app/page.tsx`, `src/components/ProductCarouselSection.tsx`, `src/components/AdBannerGrid.tsx` | `getHomepageSections()` | `admin-panel/src/app/admin/sections/page.tsx` | Admin section mutations lack auth, do not notify storefront (`sections`). `AdBannerGrid` ad banners are hardcoded. | Tag `sections`. Add auth/sanitization to section CRUD. Provide admin control or settings for ad banner slots. Revalidate `sections`. | **P1 (High)** |
| **Site Settings (Header, Shipping, Policies)** | `src/components/Header.tsx`, `src/app/cart/page.tsx`, `src/app/checkout/page.tsx`, `src/app/privacy/page.tsx`, etc. | `getSiteSetting()`, `getSiteSettings()` | `admin-panel/src/app/admin/settings/page.tsx` | Client-side fetch in `useEffect` in Header/Cart/Checkout causes layout shift. Admin updates do not trigger storefront revalidation. Maintenance mode missing. | Tag `site-settings`. Add `maintenance_mode` toggle to settings. Server-render or tagged cache for header settings. Revalidate `site-settings` on mutation. | **P1 (High)** |
| **Coupons** | `src/app/cart/page.tsx`, `src/app/checkout/page.tsx`, `src/app/api/cart/route.ts` | `getActiveCoupons()`, `validateCoupon()` | `admin-panel/src/app/admin/coupons/page.tsx` | Admin coupon mutations lack auth and storefront notification. Cart/checkout must validate coupons in real time against live DB. | Keep checkout/cart coupon validation dynamic (zero stale cache). Revalidate `coupons` tag on admin coupon CRUD. | **P1 (High)** |
| **Visible Changes (Proof Showcase)** | `src/app/page.tsx`, `src/components/VisibleChanges.tsx` | `getVisibleChanges()` in `homepage.queries.ts` | `admin-panel/src/app/admin/visible-changes/page.tsx` | Admin mutations lack auth and do not notify storefront. | Tag `visible-changes`. Add auth/sanitization to visible change CRUD and call `notifyStorefront(['visible-changes'])`. | **P2 (Medium)** |
| **Review Moderation & Rating Recalc** | `src/components/ReviewList.tsx`, `src/components/ReviewForm.tsx` | `getReviewsByProduct()`, `createReview()`, `softDeleteReview()` | User soft delete & admin moderation | Soft deleting or approving a review updates product `ratingAvg` and `reviewCount`, but doesn't invalidate storefront PDP cache tags. | Call `notifyStorefront(['product:${slug}', 'products'])` on review creation, moderation, and soft-deletion. | **P1 (High)** |
| **About Us Content** | `src/app/about/page.tsx` | `getAboutContent()` in `settings.queries.ts` | `admin-panel/src/app/admin/about/page.tsx` | Admin `updateAboutSection` calls `revalidatePath` in admin app only, not in storefront. | Tag `about`. Add auth check and call `notifyStorefront(['about'])` on update. | **P2 (Medium)** |

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

## 4. Execution Sequence

1. **Foundations**:
   - Storefront `/api/revalidate` endpoint (`REVALIDATE_SECRET`, constant-time comparison, rate-limiting).
   - Admin `notifyStorefront(tags)` helper with failure tolerance.
   - Shared media upload parity & dual-write/resolvable URLs.
   - Canonical model parity alignment across root, admin-panel, and oms-panel.
   - Model parity test (`tests/modelParity.test.ts`).
2. **Vertical Slices**:
   - Slice 1: SiteSetting (Shipping, threshold, announcement banner, maintenance mode).
   - Slice 2: Hero Slides.
   - Slice 3: Brands (`BrandsThatLead` + Ribbon).
   - Slice 4: Categories & Navigation.
   - Slice 5: Homepage Sections & Ads.
   - Slice 6: Visible Changes.
   - Slice 7: Coupons.
   - Slice 8: Products & Stock (PDP, shop, OMS reservation/decrement sync).
3. **Verification**:
   - Storefront: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`.
   - Admin Panel: `npx tsc --noEmit`, `npm run lint`, `npm run build`.
   - OMS Panel: `npx tsc --noEmit`, `npm run build`.
   - Revalidate API test (`tests/revalidateApi.test.ts`).
