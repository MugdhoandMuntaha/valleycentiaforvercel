import HeroCarousel from '@/components/HeroCarousel';
import BrandScrollingRibbon from '@/components/BrandScrollingRibbon';
import ProductCarouselSection from '@/components/ProductCarouselSection';
import BrandsThatLead from '@/components/BrandsThatLead';
import { getHeroSlides, getHomepageSections, getBrands } from '@/lib/db/queries';
import type { SectionProductCard } from '@/lib/db/queries';
import type { SectionProduct } from '@/data/homeSections';

/** Map Supabase section products → the SectionProduct shape ProductCarouselSection expects */
function toSectionProduct(p: SectionProductCard): SectionProduct {
  const badges = p.badges as { badge: string; label: string | null; color: string | null }[] | null;
  const primaryBadge = badges?.find((b) => b.label) || badges?.[0];
  const badgeText = p.custom_badge_text || (primaryBadge ? (primaryBadge.label || primaryBadge.badge).replace(/_/g, ' ').toUpperCase() : undefined);
  const badgeColor = p.custom_badge_color || primaryBadge?.color || undefined;
  return {
    id: p.id,
    slug: (p.slug as string) || '',
    image: (p.primary_image_url as string) || '/no-image.svg',
    title: (p.name as string) || '',
    description: (p.short_description as string) || '',
    price: Math.ceil(Number(p.base_price) || 0),
    originalPrice: p.compare_at_price ? Math.ceil(Number(p.compare_at_price)) : undefined,
    discountPercent: p.discount_percent ? Number(p.discount_percent) : undefined,
    couponPrice: p.coupon_price ? Math.ceil(Number(p.coupon_price)) : undefined,
    couponCode: (p.coupon_code as string) || undefined,
    rating: Number(p.rating_avg) || 0,
    reviewCount: formatReviewCount(Number(p.review_count) || 0),
    badge: badgeText,
    badgeColor,
    inStock: p.in_stock !== undefined ? p.in_stock : true,
    stockQuantity: p.stock_quantity !== undefined ? p.stock_quantity : 0,
    sizes: p.sizes || null,
  };
}

function formatReviewCount(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return String(count);
}

/** Section types that are NOT product carousels — they're rendered separately */
const NON_PRODUCT_SECTION_TYPES = ['hero_carousel', 'brands_that_lead', 'visible_change'];

/** Alternate default backgrounds for product sections */
const DEFAULT_BACKGROUNDS = ['#ffffff', '#f9f9f6'];

export const revalidate = 60; // Regenerate homepage at most once every 60 seconds (ISR)

export default async function HomePage() {
  // Fetch all data server-side in parallel
  const [slides, sections, brands] = await Promise.all([
    getHeroSlides(),
    getHomepageSections(),
    getBrands(),
  ]);

  // Map hero slides
  const heroSlides = slides.map((s) => ({
    image: s.image_url,
    mobileImage: s.mobile_image_url || undefined,
    alt: s.image_alt || s.title,
    background: s.background_color || '#f0efed',
    link: s.cta_link || undefined,
  }));

  // Map brands for BrandsThatLead
  const brandCards = brands.map((b, i) => {
    const accent = b.accent_color || '#c4a882';
    return {
      id: i + 1,
      name: b.name,
      slug: b.slug,
      tagline: b.tagline || '',
      image: b.logo_url || '/no-image.svg',
      background: `linear-gradient(135deg, ${accent}cc 0%, ${accent} 50%, ${accent}dd 100%)`,
      textColor: b.text_color || undefined,
    };
  });

  // Filter active sections that are either non-product sections OR product sections with actual products
  const activeSections = sections.filter(s =>
    NON_PRODUCT_SECTION_TYPES.includes(s.section_type) || (s.products && s.products.length > 0)
  );

  return (
    <>
      {/* ===== HERO CAROUSEL ===== */}
      <HeroCarousel slides={heroSlides} />

      {/* ===== BRAND SCROLLING RIBBON ===== */}
      <BrandScrollingRibbon brands={brands} />

      {/* ===== DYNAMIC SECTIONS ORDERED BY DB SORT_ORDER ===== */}
      {activeSections.map((section, index) => {
        if (section.section_type === 'hero_carousel') {
          return null;
        }

        if (section.section_type === 'brands_that_lead') {
          return (
            <BrandsThatLead
              key={section.id}
              brands={brandCards}
              background={section.background_color || '#f9f9f6'}
            />
          );
        }



        // Default to ProductCarouselSection for other types (best_sellers, new_launches, power_care_duos, custom)
        return (
          <ProductCarouselSection
            key={section.id}
            title={section.title}
            subtitle={section.subtitle || ''}
            products={section.products.map(toSectionProduct)}
            background={section.background_color || DEFAULT_BACKGROUNDS[index % DEFAULT_BACKGROUNDS.length]}
            viewAllHref={section.cta_link || `/shop?section=${section.section_type}`}
          />
        );
      })}


    </>
  );
}



  