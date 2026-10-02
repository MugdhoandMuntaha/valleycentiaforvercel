"use server";

/**
 * Server Actions & Query Delegations
 * Maintains 100% backward compatibility for existing imports from '@/lib/db/queries'
 * while delegating implementation to focused domain modules (SRP).
 */

import * as nav from './queries/navigation.queries';
import * as home from './queries/homepage.queries';
import * as prod from './queries/product.queries';
import * as wish from './queries/wishlist.queries';
import * as rev from './queries/review.queries';
import * as addr from './queries/address.queries';
import * as ord from './queries/order.queries';
import * as coup from './queries/coupon.queries';
import * as sett from './queries/settings.queries';
import * as help from './queries/helpers';

// ============================================================================
// TYPES (declared directly as interfaces so Turbopack server actions parser emits 0 runtime code for them)
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
}

export interface AISearchParams {
    keywords: string[];
    categories: string[];
    concerns: string[];
    originalQuery: string;
}

export type Coupon = CouponData;
export type Review = ReviewData;

// Navigation
export async function getNavLinks(): Promise<NavLinkItem[]> {
    return nav.getNavLinks();
}

// Homepage
export async function getHeroSlides(): Promise<HeroSlideData[]> {
    return home.getHeroSlides();
}

export async function getBrands(): Promise<BrandData[]> {
    return home.getBrands();
}

export async function getHomepageSections(): Promise<HomepageSectionData[]> {
    return home.getHomepageSections();
}

export async function getVisibleChanges(): Promise<VisibleChangeItem[]> {
    return home.getVisibleChanges();
}

// Products
export async function getProductCards(filters?: ProductFilters): Promise<ProductCard[]> {
    return prod.getProductCards(filters);
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
    return prod.getProductBySlug(slug);
}

export async function getRelatedProducts(slug: string, limit?: number): Promise<ProductCard[]> {
    return prod.getRelatedProducts(slug, limit);
}

export async function getRelatedProductsSimple(currentSlug: string, limit?: number): Promise<ProductCard[]> {
    return prod.getRelatedProductsSimple(currentSlug, limit);
}

export async function searchProducts(query: string): Promise<ProductCard[]> {
    return prod.searchProducts(query);
}

export async function aiSearchProducts(params: AISearchParams): Promise<ProductCard[]> {
    return prod.aiSearchProducts(params);
}

export async function updateStockForOrder(
    orderItems: { productId: any; sizeLabel: string | null; quantity: number }[]
): Promise<void> {
    return prod.updateStockForOrder(orderItems);
}

export async function restoreStockForOrder(
    orderItems: { productId: any; sizeLabel?: string | null; quantity: number }[]
): Promise<void> {
    return prod.restoreStockForOrder(orderItems);
}

export async function getProductPageData(slug: string) {
    return prod.getProductPageData(slug);
}

// Wishlist
export async function getWishlist(userId: string): Promise<string[]> {
    return wish.getWishlist(userId);
}

export async function addToWishlist(userId: string, productId: string): Promise<{ error: string | null }> {
    return wish.addToWishlist(userId, productId);
}

export async function removeFromWishlist(userId: string, productId: string): Promise<{ error: string | null }> {
    return wish.removeFromWishlist(userId, productId);
}

export async function getWishlistProducts(userId: string): Promise<ProductCard[]> {
    return wish.getWishlistProducts(userId);
}

// Reviews
export async function getProductReviews(productId: string): Promise<ReviewData[]> {
    return rev.getProductReviews(productId);
}

export async function submitReview(
    data: Parameters<typeof rev.submitReview>[0]
): ReturnType<typeof rev.submitReview> {
    return rev.submitReview(data);
}

export async function deleteReview(
    data: Parameters<typeof rev.deleteReview>[0]
): ReturnType<typeof rev.deleteReview> {
    return rev.deleteReview(data);
}

export async function updateReview(
    data: Parameters<typeof rev.updateReview>[0]
): ReturnType<typeof rev.updateReview> {
    return rev.updateReview(data);
}

// Addresses
export async function getUserAddresses(userId: string): Promise<UserAddress[]> {
    return addr.getUserAddresses(userId);
}

export async function createAddress(userId: string, data: AddressFormData): Promise<{ id: string | null; error: string | null }> {
    return addr.createAddress(userId, data);
}

export async function updateAddress(id: string, userId: string, data: AddressFormData): Promise<{ error: string | null }> {
    return addr.updateAddress(id, userId, data);
}

export async function deleteAddress(id: string): Promise<{ error: string | null }> {
    return addr.deleteAddress(id);
}

export async function setDefaultAddress(userId: string, addressId: string): Promise<{ error: string | null }> {
    return addr.setDefaultAddress(userId, addressId);
}

// Orders
export async function getUserOrders(userId: string): Promise<UserOrder[]> {
    return ord.getUserOrders(userId);
}

export async function getUserOrderCount(userId: string): Promise<number> {
    return ord.getUserOrderCount(userId);
}

export async function getOrderByOrderNumber(
    orderNumber: string,
    accessCheck?: { userId?: string | null; phone?: string | null }
): Promise<UserOrder | null> {
    return ord.getOrderByOrderNumber(orderNumber, accessCheck);
}

// Coupons
export async function getActiveCoupons(): Promise<CouponData[]> {
    return coup.getActiveCoupons();
}

// Settings
export async function getSiteSettings(): Promise<Record<string, unknown>> {
    return sett.getSiteSettings();
}

export async function getSiteSetting(key: string): Promise<unknown> {
    return sett.getSiteSetting(key);
}

export async function getAboutContent(): Promise<Record<string, any>> {
    return sett.getAboutContent();
}

// Helpers
export async function attachCouponsToCards(cards: ProductCard[]): Promise<ProductCard[]> {
    return help.attachCouponsToCards(cards);
}

export async function recalculateProductRating(productId: string): Promise<void> {
    return help.recalculateProductRating(productId);
}
