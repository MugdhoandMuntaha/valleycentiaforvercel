// ============================================================================
// SHARED TYPES for query modules (kept compatible with existing frontend)
// ============================================================================

export interface HeroSlideData {
    id: string;
    title: string;
    subtitle: string | null;
    cta_text: string | null;
    cta_link: string | null;
    image_url: string;
    mobile_image_url: string | null;
    image_alt: string | null;
    background_color: string | null;
    text_color: string | null;
}

export interface ProductCard {
    id: string;
    slug: string;
    name: string;
    subtitle: string | null;
    short_description: string | null;
    base_price: number;
    compare_at_price: number | null;
    discount_percent: number;
    rating_avg: number;
    review_count: number;
    in_stock: boolean;
    is_featured: boolean;
    concerns: string[] | null;
    tags: string[] | null;
    brand_name: string | null;
    brand_slug: string | null;
    category_name: string | null;
    category_slug: string | null;
    primary_image_url: string | null;
    badges: { badge: string; label: string | null; color: string | null }[] | null;
    stock_quantity?: number;
    sizes?: { id: string; label: string; ml: string | null; price: number; is_default: boolean; stockQuantity?: number }[] | null;
    coupon_price?: number | null;
    coupon_code?: string | null;
}

export interface BrandData {
    id: string;
    name: string;
    slug: string;
    tagline: string | null;
    description: string | null;
    logo_url: string | null;
    accent_color: string | null;
    text_color: string | null;
}

export interface HomepageSectionData {
    id: string;
    section_type: string;
    title: string;
    subtitle: string | null;
    badge_text: string | null;
    cta_text: string | null;
    cta_link: string | null;
    background_color: string | null;
    sort_order: number;
    products: SectionProductCard[];
}

export interface SectionProductCard extends ProductCard {
    custom_badge_text: string | null;
    custom_badge_color: string | null;
    section_sort_order: number;
    coupon_price: number | null;
    coupon_code: string | null;
}

export interface ProductDetail {
    id: string;
    slug: string;
    name: string;
    subtitle: string | null;
    short_description: string | null;
    description: string | null;
    how_to_use: string | null;
    ingredients: string | null;
    base_price: number;
    compare_at_price: number | null;
    discount_percent: number;
    rating_avg: number;
    review_count: number;
    in_stock: boolean;
    stock_quantity: number;
    concerns: string[] | null;
    tags: string[] | null;
    brand_name: string | null;
    brand_slug: string | null;
    category_name: string | null;
    category_slug: string | null;
    images: { url: string; alt: string | null }[] | null;
    sizes: { id: string; label: string; ml: string | null; price: number; is_default: boolean; stockQuantity?: number }[] | null;
    key_benefits: { icon: string; title: string; desc: string }[] | null;
    highlights: string[] | null;
    badges: { badge: string; label: string | null; color: string | null }[] | null;
    coupon_price: number | null;
    coupon_code: string | null;
}

export interface NavLinkItem {
    id: string;
    label: string;
    href: string;
    highlight: boolean;
    children: { label: string; href: string }[];
}

export interface ReviewData {
    id: string;
    product_id: string;
    user_id: string;
    rating: number;
    title: string | null;
    body: string | null;
    is_verified: boolean;
    helpful_count: number;
    created_at: string;
    user_name?: string;
    images?: { url: string; altText: string | null; sortOrder: number }[];
}

export interface UserAddress {
    id: string;
    user_id: string;
    label: string;
    full_name: string;
    phone: string;
    address_line_1: string;
    address_line_2: string | null;
    city: string;
    state: string | null;
    postal_code: string | null;
    country: string;
    landmark: string | null;
    is_default: boolean;
    created_at: string;
    updated_at: string;
}

export interface AddressFormData {
    label: string;
    full_name: string;
    phone: string;
    address_line_1: string;
    address_line_2: string;
    city: string;
    state?: string | null;
    postal_code?: string | null;
    country: string;
    landmark: string;
    is_default: boolean;
}

export interface OrderItem {
    id: string;
    product_id: string;
    product_name: string;
    product_image: string | null;
    product_slug: string | null;
    size: string | null;
    quantity: number;
    unit_price: number;
    total_price: number;
}

export interface UserOrder {
    id: string;
    order_number: string;
    status: string;
    payment_status: string;
    subtotal: number;
    shipping_cost: number;
    tax: number;
    total: number;
    shipping_name: string;
    shipping_city: string;
    shipping_state: string;
    created_at: string;
    order_items: OrderItem[];
}

export interface CouponData {
    id: string;
    code: string;
    description: string | null;
    discount_type: 'percentage' | 'fixed_amount';
    discount_value: number;
    minimum_order_value: number;
    max_discount_amount: number | null;
    is_active: boolean;
}

export interface VisibleChangeItem {
    id: string;
    slug: string;
    beforeImage: string;
    afterImage: string;
    beforeLabel: string;
    afterLabel: string;
    productThumb: string;
    productName: string;
    rating: number;
    reviewCount: string;
    price: number;
    originalPrice: number;
    discountPercent: number;
}

export interface ProductFilters {
    category?: string;
    brand?: string;
    concern?: string;
    type?: string;
    sort?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    inStockOnly?: boolean;
    limit?: number;
    page?: number;
}

export interface AISearchParams {
    keywords: string[];
    categories: string[];
    concerns: string[];
    originalQuery: string;
}
