"use server";

import { revalidatePath } from 'next/cache';
import connectToDatabase from '@/lib/mongodb';
import Product from '@/lib/models/Product';
import Brand from '@/lib/models/Brand';
import Category from '@/lib/models/Category';
import HomepageSection from '@/lib/models/HomepageSection';
import HeroSlide from '@/lib/models/HeroSlide';
import Coupon from '@/lib/models/Coupon';
import NavLink from '@/lib/models/NavLink';
import VisibleChange from '@/lib/models/VisibleChange';
import SiteSetting from '@/lib/models/SiteSetting';
import AboutContent from '@/lib/models/AboutContent';
import ProductCoupon from '@/lib/models/ProductCoupon';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import User from '@/lib/models/User';
import Guest from '@/lib/models/Guest';
import Order from '@/lib/models/Order';
import Address from '@/lib/models/Address';
import Review from '@/lib/models/Review';
import AuditLog from '@/lib/models/AuditLog';
import { maskPhoneNumber, normalizePhoneNumber } from '@/lib/phone';
import { isUserAdmin, hasAdminPermission, AdminPermission } from '@/lib/authUtils';
import { sanitizeNoSql } from '@/lib/sanitize';
import { notifyStorefront } from '@/lib/sync';

async function assertAdminPermission(permission: AdminPermission): Promise<{ id: string; email: string; role: string }> {
    if (process.env.NODE_ENV === 'test') {
        return { id: 'test_admin_id', email: 'admin@valleycentia.com', role: 'admin' };
    }
    const session = await getServerSession(authOptions);
    const user = session?.user as { id?: string; email?: string; role?: string; permissions?: string[] } | undefined;
    if (!user) {
        throw new Error('401: Authentication required');
    }
    const allowed = hasAdminPermission({
        userId: user.id,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
    }, permission);

    if (!allowed) {
        throw new Error('403: Forbidden: Administrative privileges required');
    }
    return { id: user.id || 'admin', email: user.email || 'admin', role: user.role || 'admin' };
}

async function assertAdmin(): Promise<void> {
    if (process.env.NODE_ENV === 'test') return;
    const session = await getServerSession(authOptions);
    const user = session?.user as { id?: string; email?: string; role?: string } | undefined;
    if (!user) {
        throw new Error('Authentication required');
    }
    const isAdmin = isUserAdmin({
        userId: user.id,
        email: user.email,
        role: user.role,
    });
    if (!isAdmin) {
        throw new Error('Forbidden: Administrative privileges required');
    }
}

// ============================================================================
// TYPES
// ============================================================================

export interface AdminProduct {
    id: string;
    name: string;
    slug: string;
    subtitle: string | null;
    short_description: string | null;
    description: string | null;
    how_to_use: string | null;
    ingredients: string | null;
    base_price: number;
    compare_at_price: number | null;
    discount_percent: number;
    cost_price: number | null;
    sku: string | null;
    barcode: string | null;
    weight_grams: number | null;
    is_active: boolean;
    is_featured: boolean;
    in_stock: boolean;
    stock_quantity: number;
    low_stock_threshold: number;
    rating_avg: number;
    review_count: number;
    meta_title: string | null;
    meta_description: string | null;
    tags: string[] | null;
    concerns: string[] | null;
    brand_id: string | null;
    category_id: string | null;
    created_at: string;
    updated_at: string;
    brand_name?: string | null;
    category_name?: string | null;
    primary_image_url?: string | null;
}

export interface AdminProductFull extends AdminProduct {
    images: { id?: string; url: string; alt_text: string | null; is_primary: boolean; sort_order: number }[];
    sizes: { id?: string; label: string; ml_value: string | null; price: number; sku_suffix: string | null; stock_quantity: number; is_default: boolean; is_active: boolean; sort_order: number }[];
    key_benefits: { id?: string; icon_name: string; title: string; description: string; sort_order: number }[];
    highlights: { id?: string; highlight: string; sort_order: number }[];
    badges: { id?: string; badge: string; custom_label: string | null; badge_color: string | null; is_primary: boolean }[];
    section_ids: string[];
}

export interface ProductFormData {
    name: string;
    slug: string;
    subtitle: string;
    short_description: string;
    description: string;
    how_to_use: string;
    ingredients: string;
    base_price: number;
    discount_percent: number;
    cost_price: number | null;
    sku: string;
    barcode: string;
    weight_grams: number | null;
    is_active: boolean;
    is_featured: boolean;
    in_stock: boolean;
    stock_quantity: number;
    low_stock_threshold: number;
    meta_title: string;
    meta_description: string;
    tags: string[];
    concerns: string[];
    brand_id: string | null;
    category_id: string | null;
    images: { url: string; alt_text: string; is_primary: boolean; sort_order: number }[];
    sizes: { label: string; ml_value: string; price: number; sku_suffix: string; stock_quantity: number; is_default: boolean; is_active: boolean; sort_order: number }[];
    key_benefits: { icon_name: string; title: string; description: string; sort_order: number }[];
    highlights: { highlight: string; sort_order: number }[];
    badges: { badge: string; custom_label: string; badge_color: string; is_primary: boolean }[];
    section_ids: string[];
}

export interface BrandOption { id: string; name: string; slug: string; }
export interface CategoryOption { id: string; name: string; slug: string; parent_id: string | null; }
export interface SectionOption { id: string; title: string; section_type: string; }

export interface AdminBrand {
    id: string; name: string; slug: string; tagline: string | null; description: string | null;
    logo_url: string | null; accent_color: string | null; text_color: string | null;
    is_active: boolean; sort_order: number; created_at: string; updated_at: string;
}

export interface BrandFormData {
    name: string; slug: string; tagline: string; description: string; logo_url: string;
    accent_color: string; text_color: string; is_active: boolean; sort_order: number;
}

export interface AdminSection {
    id: string; section_type: string; title: string; subtitle: string | null; badge_text: string | null;
    cta_text: string | null; cta_link: string | null; background_color: string | null;
    is_active: boolean; sort_order: number; created_at: string; updated_at: string; product_count?: number;
}

export interface SectionFormData {
    section_type: string; title: string; subtitle: string; badge_text: string; cta_text: string;
    cta_link: string; background_color: string; is_active: boolean; sort_order: number;
}

export interface AdminHeroSlide {
    id: string; title: string; subtitle: string | null; cta_text: string | null; cta_link: string | null;
    image_url: string; mobile_image_url: string | null; image_alt: string | null;
    background_color: string | null; text_color: string | null; is_active: boolean; sort_order: number;
    starts_at: string | null; expires_at: string | null; created_at: string; updated_at: string;
}

export interface HeroSlideFormData {
    title: string; subtitle: string; cta_text: string; cta_link: string; image_url: string;
    mobile_image_url: string; image_alt: string; background_color: string; text_color: string;
    is_active: boolean; sort_order: number;
}

export interface AboutContentMap { [key: string]: unknown; }

export interface AdminNavLink {
    id: string; parent_id: string | null; label: string; href: string; highlight: boolean;
    is_active: boolean; sort_order: number; linked_category_id: string | null;
    linked_category_name?: string | null; created_at: string; updated_at: string;
    children?: AdminNavLink[];
}

export interface NavLinkFormData {
    parent_id: string | null; label: string; href: string; highlight: boolean;
    is_active: boolean; sort_order: number; linked_category_id: string | null;
}

export interface SiteSettingRow {
    key: string; value: Record<string, unknown>; description: string | null; updated_at: string;
}

export interface AdminCoupon {
    id: string; code: string; description: string | null; discount_type: 'percentage' | 'fixed_amount';
    discount_value: number; minimum_order_value: number; max_discount_amount: number | null;
    usage_limit: number | null; usage_count: number; per_user_limit: number; is_active: boolean;
    starts_at: string; expires_at: string | null; created_at: string; updated_at: string;
}

export interface CouponFormData {
    code: string; description: string; discount_type: 'percentage' | 'fixed_amount';
    discount_value: number; minimum_order_value: number; max_discount_amount: number | null;
    usage_limit: number | null; per_user_limit: number; is_active: boolean; expires_at: string;
}

export interface AdminVisibleChange {
    id: string; product_id: string | null; before_image: string; after_image: string;
    before_label: string; after_label: string; is_active: boolean; sort_order: number;
    created_at: string; updated_at: string;
    product_name?: string | null; product_slug?: string | null; product_image?: string | null;
    product_price?: number | null; product_original_price?: number | null;
    product_discount_percent?: number | null; product_rating?: number | null;
    product_review_count?: number | null;
}

export interface VisibleChangeFormData {
    product_id: string | null; before_image: string; after_image: string;
    before_label: string; after_label: string; is_active: boolean; sort_order: number;
}

// ============================================================================
// PRODUCTS
// ============================================================================

export async function getAdminProducts(): Promise<AdminProduct[]> {
    await connectToDatabase();
    const products = await Product.find()
        .populate('brandId', 'name')
        .populate('categoryId', 'name')
        .sort({ createdAt: -1 })
        .lean();

    return products.map(p => {
        const brand = p.brandId as Record<string, unknown> | null;
        const category = p.categoryId as Record<string, unknown> | null;
        const primaryImage = p.images?.find(i => i.isPrimary) || p.images?.[0];

        return {
            id: String(p._id), name: p.name, slug: p.slug, subtitle: p.subtitle,
            short_description: p.shortDescription, description: p.description,
            how_to_use: p.howToUse, ingredients: p.ingredients,
            base_price: p.basePrice, compare_at_price: p.compareAtPrice,
            discount_percent: p.discountPercent, cost_price: p.costPrice,
            sku: p.sku, barcode: p.barcode, weight_grams: p.weightGrams,
            is_active: p.isActive, is_featured: p.isFeatured, in_stock: p.inStock,
            stock_quantity: p.stockQuantity, low_stock_threshold: p.lowStockThreshold,
            rating_avg: p.ratingAvg, review_count: p.reviewCount,
            meta_title: p.metaTitle, meta_description: p.metaDescription,
            tags: p.tags?.length ? p.tags : null, concerns: p.concerns?.length ? p.concerns : null,
            brand_id: p.brandId ? String((brand as Record<string, unknown>)?._id || p.brandId) : null,
            category_id: p.categoryId ? String((category as Record<string, unknown>)?._id || p.categoryId) : null,
            created_at: p.createdAt.toISOString(), updated_at: p.updatedAt.toISOString(),
            brand_name: brand ? (brand.name as string) : null,
            category_name: category ? (category.name as string) : null,
            primary_image_url: primaryImage ? primaryImage.url : null,
        };
    });
}

export async function getAdminProductById(id: string): Promise<AdminProductFull | null> {
    await connectToDatabase();
    const product = await Product.findById(id)
        .populate('brandId', 'name')
        .populate('categoryId', 'name')
        .lean();

    if (!product) return null;

    const brand = product.brandId as Record<string, unknown> | null;
    const category = product.categoryId as Record<string, unknown> | null;
    const primaryImage = product.images?.find(i => i.isPrimary) || product.images?.[0];

    // Get section assignments
    const sections = await HomepageSection.find({ 'products.productId': product._id }).select('_id').lean();

    return {
        id: String(product._id), name: product.name, slug: product.slug, subtitle: product.subtitle,
        short_description: product.shortDescription, description: product.description,
        how_to_use: product.howToUse, ingredients: product.ingredients,
        base_price: product.basePrice, compare_at_price: product.compareAtPrice,
        discount_percent: product.discountPercent, cost_price: product.costPrice,
        sku: product.sku, barcode: product.barcode, weight_grams: product.weightGrams,
        is_active: product.isActive, is_featured: product.isFeatured, in_stock: product.inStock,
        stock_quantity: product.stockQuantity, low_stock_threshold: product.lowStockThreshold,
        rating_avg: product.ratingAvg, review_count: product.reviewCount,
        meta_title: product.metaTitle, meta_description: product.metaDescription,
        tags: product.tags?.length ? product.tags : null, concerns: product.concerns?.length ? product.concerns : null,
        brand_id: product.brandId ? String((brand as Record<string, unknown>)?._id || product.brandId) : null,
        category_id: product.categoryId ? String((category as Record<string, unknown>)?._id || product.categoryId) : null,
        created_at: product.createdAt.toISOString(), updated_at: product.updatedAt.toISOString(),
        brand_name: brand ? (brand.name as string) : null,
        category_name: category ? (category.name as string) : null,
        primary_image_url: primaryImage ? primaryImage.url : null,
        images: (product.images || []).map(i => ({ id: String(i._id), url: i.url, alt_text: i.altText || null, is_primary: i.isPrimary, sort_order: i.sortOrder })),
        sizes: (product.sizes || []).map(s => ({ id: String(s._id), label: s.label, ml_value: s.mlValue || null, price: s.price, sku_suffix: s.skuSuffix || null, stock_quantity: s.stockQuantity, is_default: s.isDefault, is_active: s.isActive, sort_order: s.sortOrder })),
        key_benefits: (product.keyBenefits || []).map(kb => ({ id: String(kb._id), icon_name: kb.iconName, title: kb.title, description: kb.description, sort_order: kb.sortOrder })),
        highlights: (product.highlights || []).map(h => ({ id: String(h._id), highlight: h.highlight, sort_order: h.sortOrder })),
        badges: (product.badges || []).map(b => ({ id: String(b._id), badge: b.badge, custom_label: b.customLabel || null, badge_color: b.badgeColor || null, is_primary: b.isPrimary })),
        section_ids: sections.map(s => String(s._id)),
    };
}

export async function createProduct(data: ProductFormData): Promise<{ id: string | null; error: string | null }> {
    await connectToDatabase();
    try {
        await assertAdmin();
        const cleanData = sanitizeNoSql(data);
        const discountedPrice = data.discount_percent > 0 
            ? Math.round(data.base_price * (1 - data.discount_percent / 100) * 100) / 100
            : data.base_price;

        const product = await Product.create({
            name: data.name, slug: data.slug, subtitle: data.subtitle || null,
            shortDescription: data.short_description || null, description: data.description || null,
            howToUse: data.how_to_use || null, ingredients: data.ingredients || null,
            basePrice: discountedPrice,
            compareAtPrice: data.discount_percent > 0 ? data.base_price : null,
            discountPercent: data.discount_percent || 0, costPrice: discountedPrice,
            sku: data.sku || null, barcode: data.barcode || null, weightGrams: data.weight_grams,
            isActive: data.is_active, isFeatured: data.is_featured, inStock: data.in_stock,
            stockQuantity: data.stock_quantity || 0, lowStockThreshold: data.low_stock_threshold || 5,
            metaTitle: data.meta_title || null, metaDescription: data.meta_description || null,
            tags: data.tags.length > 0 ? data.tags : [], concerns: data.concerns.length > 0 ? data.concerns : [],
            brandId: data.brand_id || null, categoryId: data.category_id || null,
            images: data.images.map(i => ({ url: i.url, altText: i.alt_text, isPrimary: i.is_primary, sortOrder: i.sort_order })),
            sizes: data.sizes.map(s => ({ label: s.label, mlValue: s.ml_value, price: s.price, skuSuffix: s.sku_suffix, stockQuantity: s.stock_quantity, isDefault: s.is_default, isActive: s.is_active, sortOrder: s.sort_order })),
            keyBenefits: data.key_benefits.map(b => ({ iconName: b.icon_name, title: b.title, description: b.description, sortOrder: b.sort_order })),
            highlights: data.highlights.map(h => ({ highlight: h.highlight, sortOrder: h.sort_order })),
            badges: data.badges.map(b => ({ badge: b.badge, customLabel: b.custom_label, badgeColor: b.badge_color, isPrimary: b.is_primary })),
        });

        // Add to homepage sections
        if (data.section_ids?.length > 0) {
            for (const sectionId of data.section_ids) {
                await HomepageSection.findByIdAndUpdate(sectionId, {
                    $push: { products: { productId: product._id, sortOrder: 0 } },
                });
            }
        }

        await notifyStorefront(['products', `product:${cleanData.slug}`, 'sections']);
        return { id: String(product._id), error: null };
    } catch (err) {
        console.error('Product creation error:', err);
        return { id: null, error: err instanceof Error ? err.message : 'Failed to create product' };
    }
}

export async function updateProduct(id: string, data: ProductFormData): Promise<{ error: string | null }> {
    await connectToDatabase();
    try {
        await assertAdmin();
        const cleanData = sanitizeNoSql(data);
        const discountedPrice = data.discount_percent > 0 
            ? Math.round(data.base_price * (1 - data.discount_percent / 100) * 100) / 100
            : data.base_price;

        await Product.findByIdAndUpdate(id, {
            name: data.name, slug: data.slug, subtitle: data.subtitle || null,
            shortDescription: data.short_description || null, description: data.description || null,
            howToUse: data.how_to_use || null, ingredients: data.ingredients || null,
            basePrice: discountedPrice,
            compareAtPrice: data.discount_percent > 0 ? data.base_price : null,
            discountPercent: data.discount_percent || 0, costPrice: discountedPrice,
            sku: data.sku || null, barcode: data.barcode || null, weightGrams: data.weight_grams,
            isActive: data.is_active, isFeatured: data.is_featured, inStock: data.in_stock,
            stockQuantity: data.stock_quantity || 0, lowStockThreshold: data.low_stock_threshold || 5,
            metaTitle: data.meta_title || null, metaDescription: data.meta_description || null,
            tags: data.tags.length > 0 ? data.tags : [], concerns: data.concerns.length > 0 ? data.concerns : [],
            brandId: data.brand_id || null, categoryId: data.category_id || null,
            images: data.images.map(i => ({ url: i.url, altText: i.alt_text, isPrimary: i.is_primary, sortOrder: i.sort_order })),
            sizes: data.sizes.map(s => ({ label: s.label, mlValue: s.ml_value, price: s.price, skuSuffix: s.sku_suffix, stockQuantity: s.stock_quantity, isDefault: s.is_default, isActive: s.is_active, sortOrder: s.sort_order })),
            keyBenefits: data.key_benefits.map(b => ({ iconName: b.icon_name, title: b.title, description: b.description, sortOrder: b.sort_order })),
            highlights: data.highlights.map(h => ({ highlight: h.highlight, sortOrder: h.sort_order })),
            badges: data.badges.map(b => ({ badge: b.badge, customLabel: b.custom_label, badgeColor: b.badge_color, isPrimary: b.is_primary })),
        });

        // Update section assignments
        await HomepageSection.updateMany({}, { $pull: { products: { productId: id } } });
        if (data.section_ids?.length > 0) {
            for (const sectionId of data.section_ids) {
                await HomepageSection.findByIdAndUpdate(sectionId, {
                    $push: { products: { productId: id, sortOrder: 0 } },
                });
            }
        }

        await notifyStorefront(['products', `product:${cleanData.slug}`, 'sections']);
        return { error: null };
    } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed' };
    }
}

export async function deleteProduct(id: string): Promise<{ error: string | null }> {
    await connectToDatabase();
    try {
        await assertAdmin();
        const existingProduct = await Product.findById(id).select('slug').lean();
        await Product.findByIdAndDelete(id);
        await HomepageSection.updateMany({}, { $pull: { products: { productId: id } } });
        const affectedTags = ['products', 'sections'];
        if (existingProduct?.slug) affectedTags.push(`product:${existingProduct.slug}`);
        await notifyStorefront(affectedTags);
        return { error: null };
    } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed' };
    }
}

// ============================================================================
// BRANDS & CATEGORIES (dropdowns)
// ============================================================================

export async function getBrandsAndCategories(): Promise<{ brands: BrandOption[]; categories: CategoryOption[]; sections: SectionOption[] }> {
    await connectToDatabase();
    const [brands, categories, sections] = await Promise.all([
        Brand.find({ isActive: true }).sort('name').lean(),
        Category.find({ isActive: true }).sort('name').lean(),
        HomepageSection.find({ isActive: true }).sort('sortOrder').lean(),
    ]);

    return {
        brands: brands.map(b => ({ id: String(b._id), name: b.name, slug: b.slug })),
        categories: categories.map(c => ({ id: String(c._id), name: c.name, slug: c.slug, parent_id: c.parentId ? String(c.parentId) : null })),
        sections: sections.map(s => ({ id: String(s._id), title: s.title, section_type: s.sectionType })),
    };
}

// ============================================================================
// BRANDS CRUD
// ============================================================================

export async function getAdminBrands(): Promise<AdminBrand[]> {
    await connectToDatabase();
    const brands = await Brand.find().sort({ sortOrder: 1, name: 1 }).lean();
    return brands.map(b => ({
        id: String(b._id), name: b.name, slug: b.slug, tagline: b.tagline, description: b.description,
        logo_url: b.logoUrl, accent_color: b.accentColor, text_color: b.textColor || null,
        is_active: b.isActive, sort_order: b.sortOrder,
        created_at: b.createdAt.toISOString(), updated_at: b.updatedAt.toISOString(),
    }));
}

export async function createBrand(data: BrandFormData): Promise<{ id: string | null; error: string | null }> {
    await connectToDatabase();
    try {
        await assertAdmin();
        const cleanData = sanitizeNoSql(data);
        const brand = await Brand.create({
            name: cleanData.name, slug: cleanData.slug, tagline: cleanData.tagline || null,
            description: cleanData.description || null, logoUrl: cleanData.logo_url || null,
            accentColor: cleanData.accent_color || null, textColor: cleanData.text_color || null,
            isActive: cleanData.is_active, sortOrder: cleanData.sort_order,
        });
        await notifyStorefront(['brands', 'products']);
        return { id: String(brand._id), error: null };
    } catch (err) {
        return { id: null, error: err instanceof Error ? err.message : 'Failed' };
    }
}

export async function updateBrand(id: string, data: BrandFormData): Promise<{ error: string | null }> {
    await connectToDatabase();
    try {
        await assertAdmin();
        const cleanData = sanitizeNoSql(data);
        await Brand.findByIdAndUpdate(id, {
            name: cleanData.name, slug: cleanData.slug, tagline: cleanData.tagline || null,
            description: cleanData.description || null, logoUrl: cleanData.logo_url || null,
            accentColor: cleanData.accent_color || null, textColor: cleanData.text_color || null,
            isActive: cleanData.is_active, sortOrder: cleanData.sort_order,
        });
        await notifyStorefront(['brands', 'products']);
        return { error: null };
    } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed' };
    }
}

export async function deleteBrand(id: string): Promise<{ error: string | null }> {
    await connectToDatabase();
    try {
        await assertAdmin();
        await Brand.findByIdAndDelete(id);
        await notifyStorefront(['brands', 'products']);
        return { error: null };
    }
    catch (err) { return { error: err instanceof Error ? err.message : 'Failed' }; }
}

// ============================================================================
// SECTIONS CRUD
// ============================================================================

export async function getAdminSections(): Promise<AdminSection[]> {
    await connectToDatabase();
    const sections = await HomepageSection.find().sort({ sortOrder: 1 }).lean();
    return sections.map(s => ({
        id: String(s._id), section_type: s.sectionType, title: s.title, subtitle: s.subtitle,
        badge_text: s.badgeText, cta_text: s.ctaText, cta_link: s.ctaLink,
        background_color: s.backgroundColor, is_active: s.isActive, sort_order: s.sortOrder,
        created_at: s.createdAt.toISOString(), updated_at: s.updatedAt.toISOString(),
        product_count: s.products?.length || 0,
    }));
}

export async function createSection(data: SectionFormData): Promise<{ id: string | null; error: string | null }> {
    await connectToDatabase();
    try {
        await assertAdmin();
        const cleanData = sanitizeNoSql(data);
        const section = await HomepageSection.create({
            sectionType: cleanData.section_type, title: cleanData.title, subtitle: cleanData.subtitle || null,
            badgeText: cleanData.badge_text || null, ctaText: cleanData.cta_text || null, ctaLink: cleanData.cta_link || null,
            backgroundColor: cleanData.background_color || null, isActive: cleanData.is_active, sortOrder: cleanData.sort_order,
        });
        await notifyStorefront(['sections']);
        return { id: String(section._id), error: null };
    } catch (err) {
        return { id: null, error: err instanceof Error ? err.message : 'Failed' };
    }
}

export async function updateSection(id: string, data: SectionFormData): Promise<{ error: string | null }> {
    await connectToDatabase();
    try {
        await assertAdmin();
        const cleanData = sanitizeNoSql(data);
        await HomepageSection.findByIdAndUpdate(id, {
            sectionType: cleanData.section_type, title: cleanData.title, subtitle: cleanData.subtitle || null,
            badgeText: cleanData.badge_text || null, ctaText: cleanData.cta_text || null, ctaLink: cleanData.cta_link || null,
            backgroundColor: cleanData.background_color || null, isActive: cleanData.is_active, sortOrder: cleanData.sort_order,
        });
        await notifyStorefront(['sections']);
        return { error: null };
    } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed' };
    }
}

export async function deleteSection(id: string): Promise<{ error: string | null }> {
    await connectToDatabase();
    try {
        await assertAdmin();
        await HomepageSection.findByIdAndDelete(id);
        await notifyStorefront(['sections']);
        return { error: null };
    }
    catch (err) { return { error: err instanceof Error ? err.message : 'Failed' }; }
}

// ============================================================================
// HERO SLIDES CRUD
// ============================================================================

export async function getAdminHeroSlides(): Promise<AdminHeroSlide[]> {
    await connectToDatabase();
    const slides = await HeroSlide.find().sort({ sortOrder: 1, createdAt: -1 }).lean();
    return slides.map(s => ({
        id: String(s._id), title: s.title, subtitle: s.subtitle, cta_text: s.ctaText,
        cta_link: s.ctaLink, image_url: s.imageUrl, mobile_image_url: s.mobileImageUrl || null,
        image_alt: s.imageAlt, background_color: s.backgroundColor, text_color: s.textColor,
        is_active: s.isActive, sort_order: s.sortOrder,
        starts_at: s.startsAt?.toISOString() || null, expires_at: s.expiresAt?.toISOString() || null,
        created_at: s.createdAt.toISOString(), updated_at: s.updatedAt.toISOString(),
    }));
}

export async function createHeroSlide(data: HeroSlideFormData): Promise<{ id: string | null; error: string | null }> {
    await connectToDatabase();
    try {
        await assertAdmin();
        const cleanData = sanitizeNoSql(data);
        const slide = await HeroSlide.create({
            title: cleanData.title, subtitle: cleanData.subtitle || null, ctaText: cleanData.cta_text || null,
            ctaLink: cleanData.cta_link || null, imageUrl: cleanData.image_url,
            mobileImageUrl: cleanData.mobile_image_url || null, imageAlt: cleanData.image_alt || null,
            backgroundColor: cleanData.background_color || null, textColor: cleanData.text_color || '#ffffff',
            isActive: cleanData.is_active, sortOrder: cleanData.sort_order,
        });
        await notifyStorefront(['hero']);
        return { id: String(slide._id), error: null };
    } catch (err) {
        return { id: null, error: err instanceof Error ? err.message : 'Failed' };
    }
}

export async function updateHeroSlide(id: string, data: HeroSlideFormData): Promise<{ error: string | null }> {
    await connectToDatabase();
    try {
        await assertAdmin();
        const cleanData = sanitizeNoSql(data);
        await HeroSlide.findByIdAndUpdate(id, {
            title: cleanData.title, subtitle: cleanData.subtitle || null, ctaText: cleanData.cta_text || null,
            ctaLink: cleanData.cta_link || null, imageUrl: cleanData.image_url,
            mobileImageUrl: cleanData.mobile_image_url || null, imageAlt: cleanData.image_alt || null,
            backgroundColor: cleanData.background_color || null, textColor: cleanData.text_color || '#ffffff',
            isActive: cleanData.is_active, sortOrder: cleanData.sort_order,
        });
        await notifyStorefront(['hero']);
        return { error: null };
    } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed' };
    }
}

export async function deleteHeroSlide(id: string): Promise<{ error: string | null }> {
    await connectToDatabase();
    try {
        await assertAdmin();
        await HeroSlide.findByIdAndDelete(id);
        await notifyStorefront(['hero']);
        return { error: null };
    }
    catch (err) { return { error: err instanceof Error ? err.message : 'Failed' }; }
}

// ============================================================================
// ABOUT CONTENT
// ============================================================================

export async function getAboutContent(): Promise<AboutContentMap> {
    await connectToDatabase();
    const data = await AboutContent.find().lean();
    const map: AboutContentMap = {};
    data.forEach(row => { map[row.sectionKey] = row.content; });
    return map;
}

export async function updateAboutSection(sectionKey: string, content: unknown): Promise<{ error: string | null }> {
    await connectToDatabase();
    try {
        await assertAdmin();
        const cleanKey = sanitizeNoSql(sectionKey);
        const cleanContent = sanitizeNoSql(content);
        await AboutContent.findOneAndUpdate(
            { sectionKey: cleanKey },
            { sectionKey: cleanKey, content: cleanContent, updatedAt: new Date() },
            { upsert: true }
        );
        revalidatePath('/about');
        revalidatePath('/about-us');
        revalidatePath('/admin/about');
        await notifyStorefront(['about']);
        return { error: null };
    } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed' };
    }
}

// ============================================================================
// NAV LINKS CRUD
// ============================================================================

export async function getAdminNavLinks(): Promise<AdminNavLink[]> {
    await connectToDatabase();
    const all = await NavLink.find().populate('linkedCategoryId', 'name').sort({ sortOrder: 1 }).lean();

    const mapped: AdminNavLink[] = all.map(n => {
        const linkedCat = n.linkedCategoryId as unknown as Record<string, unknown> | null;
        return {
            id: String(n._id), parent_id: n.parentId ? String(n.parentId) : null,
            label: n.label, href: n.href, highlight: n.highlight, is_active: n.isActive,
            sort_order: n.sortOrder,
            linked_category_id: n.linkedCategoryId ? String((linkedCat as Record<string, unknown>)?._id || n.linkedCategoryId) : null,
            linked_category_name: linkedCat ? (linkedCat.name as string) : null,
            created_at: n.createdAt.toISOString(), updated_at: n.updatedAt.toISOString(),
        };
    });

    const topLevel = mapped.filter(n => !n.parent_id);
    const children = mapped.filter(n => n.parent_id);
    for (const parent of topLevel) {
        parent.children = children.filter(c => c.parent_id === parent.id).sort((a, b) => a.sort_order - b.sort_order);
    }
    return topLevel;
}

export async function createNavLink(data: NavLinkFormData): Promise<{ id: string | null; error: string | null }> {
    await connectToDatabase();
    try {
        await assertAdmin();
        const cleanData = sanitizeNoSql(data);
        const link = await NavLink.create({
            parentId: cleanData.parent_id || null, label: cleanData.label, href: cleanData.href,
            highlight: cleanData.highlight, isActive: cleanData.is_active, sortOrder: cleanData.sort_order,
            linkedCategoryId: cleanData.linked_category_id || null,
        });
        await notifyStorefront(['navigation', 'categories']);
        return { id: String(link._id), error: null };
    } catch (err) {
        return { id: null, error: err instanceof Error ? err.message : 'Failed' };
    }
}

export async function updateNavLink(id: string, data: NavLinkFormData): Promise<{ error: string | null }> {
    await connectToDatabase();
    try {
        await assertAdmin();
        const cleanData = sanitizeNoSql(data);
        await NavLink.findByIdAndUpdate(id, {
            parentId: cleanData.parent_id || null, label: cleanData.label, href: cleanData.href,
            highlight: cleanData.highlight, isActive: cleanData.is_active, sortOrder: cleanData.sort_order,
            linkedCategoryId: cleanData.linked_category_id || null,
        });
        await notifyStorefront(['navigation', 'categories']);
        return { error: null };
    } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed' };
    }
}

export async function deleteNavLink(id: string): Promise<{ error: string | null }> {
    await connectToDatabase();
    try {
        await assertAdmin();
        await NavLink.findByIdAndDelete(id);
        await notifyStorefront(['navigation', 'categories']);
        return { error: null };
    }
    catch (err) { return { error: err instanceof Error ? err.message : 'Failed' }; }
}

// ============================================================================
// SITE SETTINGS (ADMIN)
// ============================================================================

export async function getAdminSiteSettings(): Promise<SiteSettingRow[]> {
    await connectToDatabase();
    
    const DEFAULT_POLICIES = [
        {
            key: 'policy_terms',
            value: { content: 'Welcome to ValleyCentia. Please read these Terms of Service carefully before using our website or registering for an account.\n\n1. Account Creation & Verification\nWhen creating an account, you must provide accurate, complete, and current information.\n\n2. Intellectual Property\nThe website and its original content, features, and functionality are and will remain the exclusive property of ValleyCentia.' },
            description: 'Terms and Conditions Policy content'
        },
        {
            key: 'policy_privacy',
            value: { content: 'ValleyCentia values your privacy. This Privacy Policy details how we collect, use, and safeguard your personal information.\n\n1. Information We Collect\nWe collect name, email, shipping/billing address, and payment info.\n\n2. Sharing & Disclosures\nWe do not sell your personal data. We only share details with trusted third-party providers involved in fulfillment and delivery.' },
            description: 'Privacy Policy content'
        },
        {
            key: 'policy_returns',
            value: { content: 'Return & Refund Policy:\n\n1. Returns\nYou can return any product within 30 days of delivery if it is unused and in its original packaging.\n\n2. Refunds\nOnce we receive and inspect your item, we will process your refund within 7-10 business days.' },
            description: 'Return and Refund Policy content'
        },
        {
            key: 'policy_delivery',
            value: { content: 'Delivery Policy:\n\n1. Shipping Rates\nWe offer free shipping on orders over ৳499. For other orders, standard shipping fees apply based on region.\n\n2. Delivery Times\nOrders inside Dhaka are delivered in 2-3 business days. Orders outside Dhaka take 3-5 business days.' },
            description: 'Delivery Policy content'
        },
        {
            key: 'footer_about_text',
            value: { text: 'Curating premium fashion and accessories for the modern lifestyle. Quality craftsmanship meets contemporary design.' },
            description: 'Footer about text / description'
        },
        {
            key: 'footer_contact_info',
            value: { email: 'hello@valleycentia.com', phone: '+1 (234) 567-890', address: 'New York, NY 10001' },
            description: 'Footer contact info (email, phone, address)'
        },
        {
            key: 'footer_social_links',
            value: { facebook: '#', instagram: '#', twitter: '#', youtube: '#' },
            description: 'Footer social media links'
        },
        {
            key: 'footer_links',
            value: {
                links_json: JSON.stringify({
                    shop: [
                        { name: 'New Arrivals', href: '/shop?sort=new' },
                        { name: 'Best Sellers', href: '/shop?sort=popular' },
                        { name: 'Sale', href: '/shop?sale=true' },
                        { name: 'All Products', href: '/shop' }
                    ],
                    company: [
                        { name: 'About Us', href: '/about' },
                        { name: 'Careers', href: '/careers' },
                        { name: 'Press', href: '/press' },
                        { name: 'Blog', href: '/blog' }
                    ],
                    support: [
                        { name: 'Help Center', href: '/help' },
                        { name: 'Contact Us', href: '/about' }
                    ],
                    legal: [
                        { name: 'Privacy Policy', href: '/privacy' },
                        { name: 'Terms & Conditions', href: '/terms' },
                        { name: 'Cookie Policy', href: '/cookies' },
                        { name: 'Delivery Policy', href: '/shipping' },
                        { name: 'Return & Refund Policy', href: '/returns' }
                    ]
                }, null, 4)
            },
            description: 'Footer columns links configuration (JSON)'
        }
    ];

    for (const p of DEFAULT_POLICIES) {
        const exists = await SiteSetting.findOne({ key: p.key });
        if (!exists) {
            await SiteSetting.create({
                key: p.key,
                value: p.value,
                description: p.description,
                updatedAt: new Date()
            });
        }
    }

    const settings = await SiteSetting.find().sort({ key: 1 }).lean();
    return settings.map(s => ({
        key: s.key, value: s.value as Record<string, unknown>,
        description: s.description, updated_at: s.updatedAt.toISOString(),
    }));
}

export async function updateSiteSetting(key: string, value: Record<string, unknown>): Promise<{ error: string | null }> {
    await connectToDatabase();
    try {
        await assertAdmin();
        const cleanKey = sanitizeNoSql(key);
        const cleanValue = sanitizeNoSql(value);
        await SiteSetting.findOneAndUpdate({ key: cleanKey }, { value: cleanValue, updatedAt: new Date() });
        await notifyStorefront(['site-settings']);
        return { error: null };
    } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed' };
    }
}

// ============================================================================
// COUPONS CRUD (ADMIN)
// ============================================================================

export async function getAdminCoupons(): Promise<AdminCoupon[]> {
    await connectToDatabase();
    const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();
    return coupons.map(c => ({
        id: String(c._id), code: c.code, description: c.description,
        discount_type: c.discountType as 'percentage' | 'fixed_amount',
        discount_value: c.discountValue, minimum_order_value: c.minimumOrderValue,
        max_discount_amount: c.maxDiscountAmount, usage_limit: c.usageLimit,
        usage_count: c.usageCount, per_user_limit: c.perUserLimit, is_active: c.isActive,
        starts_at: c.startsAt.toISOString(), expires_at: c.expiresAt?.toISOString() || null,
        created_at: c.createdAt.toISOString(), updated_at: c.updatedAt.toISOString(),
    }));
}

export async function createCoupon(data: CouponFormData): Promise<{ id: string | null; error: string | null }> {
    await connectToDatabase();
    try {
        await assertAdmin();
        const cleanData = sanitizeNoSql(data);
        const coupon = await Coupon.create({
            code: cleanData.code.toUpperCase().trim(), description: cleanData.description || null,
            discountType: cleanData.discount_type, discountValue: cleanData.discount_value,
            minimumOrderValue: cleanData.minimum_order_value || 0, maxDiscountAmount: cleanData.max_discount_amount || null,
            usageLimit: cleanData.usage_limit || null, perUserLimit: cleanData.per_user_limit || 1,
            isActive: cleanData.is_active, expiresAt: cleanData.expires_at || null,
        });
        await notifyStorefront(['coupons']);
        return { id: String(coupon._id), error: null };
    } catch (err) {
        return { id: null, error: err instanceof Error ? err.message : 'Failed' };
    }
}

export async function updateCoupon(id: string, data: CouponFormData): Promise<{ error: string | null }> {
    await connectToDatabase();
    try {
        await assertAdmin();
        const cleanData = sanitizeNoSql(data);
        await Coupon.findByIdAndUpdate(id, {
            code: cleanData.code.toUpperCase().trim(), description: cleanData.description || null,
            discountType: cleanData.discount_type, discountValue: cleanData.discount_value,
            minimumOrderValue: cleanData.minimum_order_value || 0, maxDiscountAmount: cleanData.max_discount_amount || null,
            usageLimit: cleanData.usage_limit || null, perUserLimit: cleanData.per_user_limit || 1,
            isActive: cleanData.is_active, expiresAt: cleanData.expires_at || null,
        });
        await notifyStorefront(['coupons']);
        return { error: null };
    } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed' };
    }
}

export async function deleteCoupon(id: string): Promise<{ error: string | null }> {
    await connectToDatabase();
    try {
        await assertAdmin();
        await Coupon.findByIdAndDelete(id);
        await notifyStorefront(['coupons']);
        return { error: null };
    }
    catch (err) { return { error: err instanceof Error ? err.message : 'Failed' }; }
}

// ============================================================================
// VISIBLE CHANGES CRUD
// ============================================================================

export async function getAdminVisibleChanges(): Promise<AdminVisibleChange[]> {
    await connectToDatabase();
    const changes = await VisibleChange.find()
        .populate('productId', 'name slug basePrice compareAtPrice discountPercent ratingAvg reviewCount images sizes')
        .sort({ sortOrder: 1, createdAt: -1 }).lean();

    return changes.map(vc => {
        const product = vc.productId as unknown as Record<string, unknown> | null;
        const images = product ? (product.images as Array<Record<string, unknown>>) || [] : [];
        const primaryImage = images.find(i => i.isPrimary) || images[0];
        const sizes = product ? (product.sizes as Array<Record<string, unknown>>) || [] : [];
        const activeSizes = sizes.filter(s => s && s.isActive !== false);
        const defaultSize = activeSizes.find(s => s.isDefault) || activeSizes[0];

        const basePrice = defaultSize ? (defaultSize.price as number) : (product ? (product.basePrice as number) : null);
        const discountPercent = product ? ((product.discountPercent as number) || 0) : null;

        let compareAtPrice: number | null = null;
        if (defaultSize) {
            const sizePrice = defaultSize.price as number;
            compareAtPrice = (discountPercent !== null && discountPercent > 0)
                ? Math.ceil(sizePrice / (1 - discountPercent / 100))
                : sizePrice;
        } else if (product) {
            compareAtPrice = (product.compareAtPrice as number) || null;
        }

        return {
            id: String(vc._id), product_id: vc.productId ? String((product as Record<string, unknown>)?._id || vc.productId) : null,
            before_image: vc.beforeImage, after_image: vc.afterImage,
            before_label: vc.beforeLabel, after_label: vc.afterLabel,
            is_active: vc.isActive, sort_order: vc.sortOrder,
            created_at: vc.createdAt.toISOString(), updated_at: vc.updatedAt.toISOString(),
            product_name: product ? (product.name as string) : null,
            product_slug: product ? (product.slug as string) : null,
            product_image: primaryImage ? (primaryImage.url as string) : null,
            product_price: basePrice,
            product_original_price: compareAtPrice,
            product_discount_percent: discountPercent,
            product_rating: product ? (product.ratingAvg as number) : null,
            product_review_count: product ? (product.reviewCount as number) : null,
        };
    });
}

export async function createVisibleChange(data: VisibleChangeFormData): Promise<{ id: string | null; error: string | null }> {
    await connectToDatabase();
    try {
        await assertAdmin();
        const cleanData = sanitizeNoSql(data);
        const vc = await VisibleChange.create({
            productId: cleanData.product_id || null, beforeImage: cleanData.before_image,
            afterImage: cleanData.after_image, beforeLabel: cleanData.before_label || 'Day 1',
            afterLabel: cleanData.after_label || 'Day 30', isActive: cleanData.is_active, sortOrder: cleanData.sort_order,
        });
        await notifyStorefront(['visible-changes']);
        return { id: String(vc._id), error: null };
    } catch (err) {
        return { id: null, error: err instanceof Error ? err.message : 'Failed' };
    }
}

export async function updateVisibleChange(id: string, data: VisibleChangeFormData): Promise<{ error: string | null }> {
    await connectToDatabase();
    try {
        await assertAdmin();
        const cleanData = sanitizeNoSql(data);
        await VisibleChange.findByIdAndUpdate(id, {
            productId: cleanData.product_id || null, beforeImage: cleanData.before_image,
            afterImage: cleanData.after_image, beforeLabel: cleanData.before_label || 'Day 1',
            afterLabel: cleanData.after_label || 'Day 30', isActive: cleanData.is_active, sortOrder: cleanData.sort_order,
        });
        await notifyStorefront(['visible-changes']);
        return { error: null };
    } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed' };
    }
}

export async function deleteVisibleChange(id: string): Promise<{ error: string | null }> {
    await connectToDatabase();
    try {
        await assertAdmin();
        await VisibleChange.findByIdAndDelete(id);
        await notifyStorefront(['visible-changes']);
        return { error: null };
    }
    catch (err) { return { error: err instanceof Error ? err.message : 'Failed' }; }
}

export async function getActiveProductsSimple(): Promise<{ id: string; name: string; slug: string }[]> {
    await connectToDatabase();
    const list = await Product.find({ isActive: true }).select('name slug').sort('name').lean();
    return list.map(p => ({ id: String(p._id), name: p.name, slug: p.slug }));
}

export async function getAvailableCouponsSimple(): Promise<{ id: string; code: string }[]> {
    await connectToDatabase();
    const list = await Coupon.find({ isActive: true }).sort('code').lean();
    return list.map(c => ({ id: String(c._id), code: c.code }));
}

export async function getProductCoupon(productId: string): Promise<{ couponId: string; couponPrice: number | null } | null> {
    await connectToDatabase();
    const pc = await ProductCoupon.findOne({ productId }).lean();
    if (!pc) return null;
    return { couponId: String(pc.couponId), couponPrice: pc.couponPrice };
}

export async function assignProductCoupon(productId: string, couponId: string | null, couponPrice: number | null): Promise<void> {
    await connectToDatabase();
    await assertAdmin();
    // Delete existing assignment
    await ProductCoupon.deleteMany({ productId });
    // Insert new one if selected
    if (couponId) {
        await ProductCoupon.create({
            productId,
            couponId,
            couponPrice,
        });
    }
    await notifyStorefront(['products', 'coupons']);
}

// ============================================================================
// USERS & GUESTS MANAGEMENT TYPES & ACTIONS
// ============================================================================

export interface AdminUserRow {
    id: string;
    avatar_url: string | null;
    full_name: string | null;
    display_name: string | null;
    email: string;
    phone: string | null;
    registered_date: string;
    last_login: string | null;
    status: 'active' | 'suspended';
    is_anonymized: boolean;
    total_orders: number;
    total_spend: number;
}

export interface AdminUsersFilter {
    page?: number;
    limit?: number;
    search?: string;
    status?: 'all' | 'active' | 'suspended';
    dateFrom?: string;
    dateTo?: string;
    hasOrders?: 'all' | 'yes' | 'no';
    sortBy?: 'name' | 'registered' | 'last_login' | 'spend' | 'orders';
    sortOrder?: 'asc' | 'desc';
}

export interface AdminGuestRow {
    id: string;
    name: string | null;
    phone: string;
    email: string | null;
    first_seen: string;
    last_seen: string;
    status: 'active' | 'suspended';
    order_count: number;
    total_spend: number;
    is_merged: boolean;
}

export interface AdminGuestsFilter {
    page?: number;
    limit?: number;
    search?: string;
    status?: 'all' | 'active' | 'suspended';
    dateFrom?: string;
    dateTo?: string;
    hasOrders?: 'all' | 'yes' | 'no';
    sortBy?: 'name' | 'first_seen' | 'last_seen' | 'spend' | 'orders';
    sortOrder?: 'asc' | 'desc';
}

export interface UserProfileDetails {
    user: {
        id: string;
        avatar_url: string | null;
        full_name: string | null;
        display_name: string | null;
        email: string;
        phone: string | null;
        role: string;
        status: 'active' | 'suspended';
        is_email_verified: boolean;
        is_phone_verified: boolean;
        provider: string;
        registered_date: string;
        last_login: string | null;
        is_anonymized: boolean;
        total_orders: number;
        total_spend: number;
    };
    addresses: Array<{
        id: string;
        label: string;
        full_name: string;
        phone: string;
        address_line_1: string;
        address_line_2: string | null;
        city: string;
        state: string | null;
        postal_code: string | null;
        country: string;
        is_default: boolean;
    }>;
    orders: Array<{
        id: string;
        order_number: string;
        status: string;
        payment_status: string;
        payment_method: string | null;
        total: number;
        currency: string;
        created_at: string;
        item_count: number;
        items: Array<{
            name: string;
            quantity: number;
            price: number;
        }>;
    }>;
    reviews: Array<{
        id: string;
        product_id: string;
        rating: number;
        title: string | null;
        body: string | null;
        status: string;
        is_verified: boolean;
        is_approved: boolean;
        helpful_count: number;
        report_count: number;
        created_at: string;
    }>;
    reports: {
        filed: Array<{
            review_id: string;
            reason: string;
            details: string | null;
            created_at: string;
        }>;
        received: Array<{
            review_id: string;
            reporter_id: string;
            reason: string;
            details: string | null;
            created_at: string;
        }>;
    };
    status_history: Array<{
        status: string;
        note: string | null;
        changed_by: string | null;
        created_at: string;
    }>;
    audit_notes: Array<{
        id: string;
        action: string;
        performed_by: string | null;
        performed_at: string;
        details?: Record<string, unknown> | null;
    }>;
}

export interface GuestProfileDetails {
    guest: {
        id: string;
        name: string | null;
        phone: string;
        email: string | null;
        status: 'active' | 'suspended';
        first_seen: string;
        last_seen: string;
        order_count: number;
        total_spend: number;
        is_merged: boolean;
        merged_to_user_id: string | null;
        merged_at: string | null;
    };
    addresses: Array<{
        full_name: string;
        phone: string;
        address_line_1: string;
        address_line_2: string | null;
        city: string;
        state: string | null;
        postal_code: string | null;
        country: string;
        created_at: string;
    }>;
    orders: Array<{
        id: string;
        order_number: string;
        status: string;
        payment_status: string;
        payment_method: string | null;
        total: number;
        currency: string;
        created_at: string;
    }>;
    change_history: Array<{
        field: string;
        old_value: string | null;
        new_value: string | null;
        changed_at: string;
        reason: string | null;
    }>;
    order_metadata: Array<{
        order_id: string;
        ip: string | null;
        user_agent: string | null;
        created_at: string;
    }>;
}

export async function getAdminUsers(filters: AdminUsersFilter = {}): Promise<{
    users: AdminUserRow[];
    total: number;
    page: number;
    totalPages: number;
}> {
    await connectToDatabase();
    await assertAdminPermission('view_customers');

    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(filters.limit) || 10));

    // Base query: all customer accounts (strictly excluding staff/admin)
    const query: Record<string, unknown> = {
        role: { $nin: ['admin', 'superadmin'] },
    };

    if (filters.status && filters.status !== 'all') {
        query.status = filters.status;
    }

    if (filters.dateFrom || filters.dateTo) {
        query.createdAt = {};
        if (filters.dateFrom) {
            (query.createdAt as Record<string, unknown>).$gte = new Date(filters.dateFrom);
        }
        if (filters.dateTo) {
            const end = new Date(filters.dateTo);
            end.setHours(23, 59, 59, 999);
            (query.createdAt as Record<string, unknown>).$lte = end;
        }
    }

    if (filters.search && filters.search.trim()) {
        const s = filters.search.trim();
        const normalized = normalizePhoneNumber(s);
        const searchRegex = new RegExp(s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'i');
        const orConditions: Array<Record<string, unknown>> = [
            { fullName: searchRegex },
            { displayName: searchRegex },
            { email: searchRegex },
            { clerkId: searchRegex },
        ];
        if (normalized) {
            orConditions.push({ phone: normalized });
        } else {
            orConditions.push({ phone: searchRegex });
        }
        query.$or = orConditions;
    }

    // 1. Fetch matching users
    const allMatchingUsers = await User.find(query).lean();

    // 2. Aggregate orders per user to get totalOrders & totalSpend
    const userIdentifiers: string[] = [];
    allMatchingUsers.forEach(u => {
        if (u._id) userIdentifiers.push(String(u._id));
        if (u.clerkId) userIdentifiers.push(u.clerkId);
    });

    const orderStats = await Order.aggregate([
        {
            $match: {
                userId: { $in: userIdentifiers },
                isDeleted: false,
            },
        },
        {
            $group: {
                _id: "$userId",
                count: { $sum: 1 },
                spend: { $sum: "$total" },
            },
        },
    ]);

    const statsMap = new Map<string, { count: number; spend: number }>();
    orderStats.forEach(st => {
        if (st._id) statsMap.set(String(st._id), { count: st.count, spend: st.spend });
    });

    // 3. Map users with aggregated stats and masked phone
    let mappedUsers: AdminUserRow[] = allMatchingUsers.map(u => {
        const uId = String(u._id);
        const stat1 = statsMap.get(uId);
        const stat2 = u.clerkId ? statsMap.get(u.clerkId) : undefined;
        const totalOrders = (stat1?.count || 0) + (stat2?.count || 0);
        const totalSpend = (stat1?.spend || 0) + (stat2?.spend || 0);

        return {
            id: uId,
            avatar_url: u.avatarUrl || null,
            full_name: u.fullName || u.displayName || 'Unnamed User',
            display_name: u.displayName || null,
            email: u.email || '—',
            phone: maskPhoneNumber(u.phone),
            registered_date: u.createdAt ? u.createdAt.toISOString() : new Date().toISOString(),
            last_login: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
            status: (u.status as 'active' | 'suspended') || 'active',
            is_anonymized: Boolean(u.isAnonymized),
            total_orders: totalOrders,
            total_spend: totalSpend,
        };
    });

    // 4. Filter by hasOrders
    if (filters.hasOrders === 'yes') {
        mappedUsers = mappedUsers.filter(u => u.total_orders > 0);
    } else if (filters.hasOrders === 'no') {
        mappedUsers = mappedUsers.filter(u => u.total_orders === 0);
    }

    // 5. Sort
    const sortBy = filters.sortBy || 'registered';
    const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;

    mappedUsers.sort((a, b) => {
        if (sortBy === 'name') {
            return sortOrder * (a.full_name || '').localeCompare(b.full_name || '');
        }
        if (sortBy === 'spend') {
            return sortOrder * (a.total_spend - b.total_spend);
        }
        if (sortBy === 'orders') {
            return sortOrder * (a.total_orders - b.total_orders);
        }
        if (sortBy === 'last_login') {
            const timeA = a.last_login ? new Date(a.last_login).getTime() : 0;
            const timeB = b.last_login ? new Date(b.last_login).getTime() : 0;
            return sortOrder * (timeA - timeB);
        }
        // default: registered
        const timeA = new Date(a.registered_date).getTime();
        const timeB = new Date(b.registered_date).getTime();
        return sortOrder * (timeA - timeB);
    });

    const total = mappedUsers.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const paginated = mappedUsers.slice((page - 1) * limit, page * limit);

    return {
        users: paginated,
        total,
        page,
        totalPages,
    };
}

export async function getAdminGuests(filters: AdminGuestsFilter = {}): Promise<{
    guests: AdminGuestRow[];
    total: number;
    page: number;
    totalPages: number;
}> {
    await connectToDatabase();
    await assertAdminPermission('view_customers');

    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(filters.limit) || 10));

    const query: Record<string, unknown> = {};

    if (filters.status && filters.status !== 'all') {
        query.status = filters.status;
    }

    if (filters.dateFrom || filters.dateTo) {
        query.firstSeen = {};
        if (filters.dateFrom) {
            (query.firstSeen as Record<string, unknown>).$gte = new Date(filters.dateFrom);
        }
        if (filters.dateTo) {
            const end = new Date(filters.dateTo);
            end.setHours(23, 59, 59, 999);
            (query.firstSeen as Record<string, unknown>).$lte = end;
        }
    }

    if (filters.search && filters.search.trim()) {
        const s = filters.search.trim();
        const normalized = normalizePhoneNumber(s);
        const searchRegex = new RegExp(s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'i');
        const orConditions: Array<Record<string, unknown>> = [
            { name: searchRegex },
            { email: searchRegex },
        ];
        if (normalized) {
            orConditions.push({ phone: normalized });
        } else {
            orConditions.push({ phone: searchRegex });
        }
        query.$or = orConditions;
    }

    if (filters.hasOrders === 'yes') {
        query.orderCount = { $gt: 0 };
    } else if (filters.hasOrders === 'no') {
        query.orderCount = { $eq: 0 };
    }

    const sortObj: Record<string, 1 | -1> = {};
    const dir = filters.sortOrder === 'asc' ? 1 : -1;
    if (filters.sortBy === 'name') sortObj.name = dir;
    else if (filters.sortBy === 'last_seen') sortObj.lastSeen = dir;
    else if (filters.sortBy === 'spend') sortObj.totalSpend = dir;
    else if (filters.sortBy === 'orders') sortObj.orderCount = dir;
    else sortObj.firstSeen = dir;

    const total = await Guest.countDocuments(query);
    const totalPages = Math.ceil(total / limit) || 1;

    const list = await Guest.find(query)
        .sort(sortObj)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

    const guests: AdminGuestRow[] = list.map(g => ({
        id: String(g._id),
        name: g.name || 'Guest User',
        phone: maskPhoneNumber(g.phone),
        email: g.email || null,
        first_seen: g.firstSeen.toISOString(),
        last_seen: g.lastSeen.toISOString(),
        status: (g.status as 'active' | 'suspended') || 'active',
        order_count: g.orderCount || 0,
        total_spend: g.totalSpend || 0,
        is_merged: Boolean(g.isMerged),
    }));

    return {
        guests,
        total,
        page,
        totalPages,
    };
}

export async function getUserProfileDetails(userId: string): Promise<UserProfileDetails> {
    await connectToDatabase();
    const admin = await assertAdminPermission('view_customers');

    const user = await User.findOne({
        $or: [
            { _id: isValidMongoId(userId) ? userId : null },
            { clerkId: userId },
        ],
    }).lean();

    if (!user) {
        throw new Error('User not found');
    }

    const userIds = [String(user._id), user.clerkId].filter(Boolean) as string[];

    // Fetch addresses, orders, reviews, reports, statusHistory, auditLogs
    const [addresses, orders, reviews, filedReports, auditLogs] = await Promise.all([
        Address.find({ userId: { $in: userIds } }).sort({ isDefault: -1, createdAt: -1 }).lean(),
        Order.find({ userId: { $in: userIds }, isDeleted: false }).sort({ createdAt: -1 }).lean(),
        Review.find({ userId: { $in: userIds }, isDeleted: false }).sort({ createdAt: -1 }).lean(),
        Review.find({ 'reports.userId': { $in: userIds } }).lean(),
        AuditLog.find({ recordId: String(user._id) }).sort({ performedAt: -1 }).limit(50).lean(),
    ]);

    // Calculate spend & order stats
    const totalSpend = orders.reduce((sum, o) => sum + (o.total || 0), 0);

    // Extract filed reports
    const filedList: Array<{ review_id: string; reason: string; details: string | null; created_at: string }> = [];
    filedReports.forEach(rev => {
        (rev.reports || []).forEach(r => {
            if (userIds.includes(r.userId)) {
                filedList.push({
                    review_id: String(rev._id),
                    reason: r.reason,
                    details: r.details || null,
                    created_at: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
                });
            }
        });
    });

    // Extract reports received on reviews written by user
    const receivedList: Array<{ review_id: string; reporter_id: string; reason: string; details: string | null; created_at: string }> = [];
    reviews.forEach(rev => {
        (rev.reports || []).forEach(r => {
            receivedList.push({
                review_id: String(rev._id),
                reporter_id: r.userId,
                reason: r.reason,
                details: r.details || null,
                created_at: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
            });
        });
    });

    // Log profile view in AuditLog
    await AuditLog.create({
        tableName: 'users',
        recordId: String(user._id),
        action: 'VIEW',
        performedBy: admin.id,
        metadata: {
            adminEmail: admin.email,
            note: 'Profile viewed in admin modal',
        },
        performedAt: new Date(),
    });

    return {
        user: {
            id: String(user._id),
            avatar_url: user.avatarUrl || null,
            full_name: user.fullName || user.displayName || 'Unnamed User',
            display_name: user.displayName || null,
            email: user.email || '',
            phone: user.phone || null, // Unmasked for modal view
            role: user.role || 'customer',
            status: (user.status as 'active' | 'suspended') || 'active',
            is_email_verified: Boolean(user.isEmailVerified),
            is_phone_verified: Boolean(user.isPhoneVerified),
            provider: user.provider || 'clerk',
            registered_date: user.createdAt.toISOString(),
            last_login: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
            is_anonymized: Boolean(user.isAnonymized),
            total_orders: orders.length,
            total_spend: totalSpend,
        },
        addresses: addresses.map(a => ({
            id: String(a._id),
            label: a.label || 'Home',
            full_name: a.fullName,
            phone: a.phone,
            address_line_1: a.addressLine1,
            address_line_2: a.addressLine2 || null,
            city: a.city,
            state: a.state || null,
            postal_code: a.postalCode || null,
            country: a.country || 'Bangladesh',
            is_default: Boolean(a.isDefault),
        })),
        orders: orders.map(o => ({
            id: String(o._id),
            order_number: o.orderNumber,
            status: o.status,
            payment_status: o.paymentStatus,
            payment_method: o.paymentMethod || null,
            total: o.total,
            currency: o.currency || 'BDT',
            created_at: o.createdAt.toISOString(),
            item_count: (o.orderItems || []).reduce((sum: number, it: { quantity: number }) => sum + it.quantity, 0),
            items: (o.orderItems || []).map((it: { productName: string; quantity: number; unitPrice: number }) => ({
                name: it.productName,
                quantity: it.quantity,
                price: it.unitPrice,
            })),
        })),
        reviews: reviews.map(r => ({
            id: String(r._id),
            product_id: String(r.productId),
            rating: r.rating,
            title: r.title || null,
            body: r.body || null,
            status: r.status,
            is_verified: Boolean(r.isVerified),
            is_approved: Boolean(r.isApproved),
            helpful_count: r.helpfulCount || 0,
            report_count: r.reportCount || 0,
            created_at: r.createdAt.toISOString(),
        })),
        reports: {
            filed: filedList,
            received: receivedList,
        },
        status_history: (user.statusHistory || []).map(sh => ({
            status: sh.status,
            note: sh.note || null,
            changed_by: sh.changedBy || null,
            created_at: sh.createdAt.toISOString(),
        })),
        audit_notes: auditLogs.map(al => ({
            id: String(al._id),
            action: al.action,
            performed_by: al.performedBy || null,
            performed_at: al.performedAt.toISOString(),
            details: al.metadata || al.newData || null,
        })),
    };
}

export async function getGuestProfileDetails(guestIdOrPhone: string): Promise<GuestProfileDetails> {
    await connectToDatabase();
    const admin = await assertAdminPermission('view_customers');

    const guest = await Guest.findOne({
        $or: [
            { _id: isValidMongoId(guestIdOrPhone) ? guestIdOrPhone : null },
            { phone: guestIdOrPhone },
            { phone: normalizePhoneNumber(guestIdOrPhone) || 'none' },
        ],
    }).lean();

    if (!guest) {
        throw new Error('Guest record not found');
    }

    const orders = await Order.find({
        $or: [
            { _id: { $in: guest.orderIds } },
            { shippingPhone: guest.phone },
        ],
        isDeleted: false,
    }).sort({ createdAt: -1 }).lean();

    // Log guest profile view
    await AuditLog.create({
        tableName: 'guests',
        recordId: String(guest._id),
        action: 'VIEW',
        performedBy: admin.id,
        metadata: {
            adminEmail: admin.email,
            note: 'Guest profile viewed in admin modal',
        },
        performedAt: new Date(),
    });

    return {
        guest: {
            id: String(guest._id),
            name: guest.name || 'Guest User',
            phone: guest.phone, // Unmasked for modal view
            email: guest.email || null,
            status: (guest.status as 'active' | 'suspended') || 'active',
            first_seen: guest.firstSeen.toISOString(),
            last_seen: guest.lastSeen.toISOString(),
            order_count: guest.orderCount || orders.length,
            total_spend: guest.totalSpend || orders.reduce((sum, o) => sum + (o.total || 0), 0),
            is_merged: Boolean(guest.isMerged),
            merged_to_user_id: guest.mergedToUserId || null,
            merged_at: guest.mergedAt ? guest.mergedAt.toISOString() : null,
        },
        addresses: (guest.addresses || []).map(a => ({
            full_name: a.fullName,
            phone: a.phone,
            address_line_1: a.addressLine1,
            address_line_2: a.addressLine2 || null,
            city: a.city,
            state: a.state || null,
            postal_code: a.postalCode || null,
            country: a.country || 'Bangladesh',
            created_at: a.createdAt.toISOString(),
        })),
        orders: orders.map(o => ({
            id: String(o._id),
            order_number: o.orderNumber,
            status: o.status,
            payment_status: o.paymentStatus,
            payment_method: o.paymentMethod || null,
            total: o.total,
            currency: o.currency || 'BDT',
            created_at: o.createdAt.toISOString(),
        })),
        change_history: (guest.changeHistory || []).map(ch => ({
            field: ch.field,
            old_value: ch.oldValue || null,
            new_value: ch.newValue || null,
            changed_at: ch.changedAt.toISOString(),
            reason: ch.reason || null,
        })),
        order_metadata: (guest.orderMetadata || []).map(om => ({
            order_id: om.orderId,
            ip: om.ip || null,
            user_agent: om.userAgent || null,
            created_at: om.createdAt.toISOString(),
        })),
    };
}

export async function suspendUser(userId: string, reason: string): Promise<{ success: boolean; error: string | null }> {
    await connectToDatabase();
    try {
        const admin = await assertAdminPermission('suspend_users');
        const cleanReason = sanitizeNoSql(reason) || 'Suspended by administrator';

        const user = await User.findOne({
            $or: [{ _id: isValidMongoId(userId) ? userId : null }, { clerkId: userId }],
        });

        if (!user) return { success: false, error: 'User not found' };

        user.status = 'suspended';
        user.statusHistory.push({
            status: 'suspended',
            note: cleanReason,
            changedBy: admin.id,
            createdAt: new Date(),
        });
        await user.save();

        await AuditLog.create({
            tableName: 'users',
            recordId: String(user._id),
            action: 'SUSPEND',
            newData: { status: 'suspended', reason: cleanReason },
            performedBy: admin.id,
            performedAt: new Date(),
        });

        return { success: true, error: null };
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Failed to suspend user' };
    }
}

export async function reactivateUser(userId: string, note?: string): Promise<{ success: boolean; error: string | null }> {
    await connectToDatabase();
    try {
        const admin = await assertAdminPermission('suspend_users');
        const cleanNote = sanitizeNoSql(note) || 'Reactivated by administrator';

        const user = await User.findOne({
            $or: [{ _id: isValidMongoId(userId) ? userId : null }, { clerkId: userId }],
        });

        if (!user) return { success: false, error: 'User not found' };

        user.status = 'active';
        user.statusHistory.push({
            status: 'active',
            note: cleanNote,
            changedBy: admin.id,
            createdAt: new Date(),
        });
        await user.save();

        await AuditLog.create({
            tableName: 'users',
            recordId: String(user._id),
            action: 'REACTIVATE',
            newData: { status: 'active', note: cleanNote },
            performedBy: admin.id,
            performedAt: new Date(),
        });

        return { success: true, error: null };
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Failed to reactivate user' };
    }
}

export async function suspendGuest(guestId: string, reason: string): Promise<{ success: boolean; error: string | null }> {
    await connectToDatabase();
    try {
        const admin = await assertAdminPermission('suspend_users');
        const cleanReason = sanitizeNoSql(reason) || 'Suspended by administrator';

        const guest = await Guest.findById(guestId);
        if (!guest) return { success: false, error: 'Guest not found' };

        guest.status = 'suspended';
        guest.changeHistory.push({
            field: 'status',
            oldValue: 'active',
            newValue: 'suspended',
            changedAt: new Date(),
            reason: cleanReason,
        });
        await guest.save();

        await AuditLog.create({
            tableName: 'guests',
            recordId: String(guest._id),
            action: 'SUSPEND',
            newData: { status: 'suspended', reason: cleanReason },
            performedBy: admin.id,
            performedAt: new Date(),
        });

        return { success: true, error: null };
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Failed to suspend guest' };
    }
}

export async function reactivateGuest(guestId: string, note?: string): Promise<{ success: boolean; error: string | null }> {
    await connectToDatabase();
    try {
        const admin = await assertAdminPermission('suspend_users');
        const cleanNote = sanitizeNoSql(note) || 'Reactivated by administrator';

        const guest = await Guest.findById(guestId);
        if (!guest) return { success: false, error: 'Guest not found' };

        guest.status = 'active';
        guest.changeHistory.push({
            field: 'status',
            oldValue: 'suspended',
            newValue: 'active',
            changedAt: new Date(),
            reason: cleanNote,
        });
        await guest.save();

        await AuditLog.create({
            tableName: 'guests',
            recordId: String(guest._id),
            action: 'REACTIVATE',
            newData: { status: 'active', note: cleanNote },
            performedBy: admin.id,
            performedAt: new Date(),
        });

        return { success: true, error: null };
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Failed to reactivate guest' };
    }
}

export async function exportCustomerData(id: string, isGuest: boolean): Promise<{ data: string | null; error: string | null }> {
    await connectToDatabase();
    try {
        const admin = await assertAdminPermission('export_data');

        let exportPayload: Record<string, unknown> = {};

        if (isGuest) {
            const guestDetails = await getGuestProfileDetails(id);
            exportPayload = {
                type: 'guest',
                profile: guestDetails.guest,
                addresses: guestDetails.addresses,
                orders: guestDetails.orders,
                changeHistory: guestDetails.change_history,
            };
            await AuditLog.create({
                tableName: 'guests',
                recordId: id,
                action: 'EXPORT',
                performedBy: admin.id,
                performedAt: new Date(),
            });
        } else {
            const userDetails = await getUserProfileDetails(id);
            // Strict security: omit passwords, hashes, card info
            exportPayload = {
                type: 'registered_user',
                profile: userDetails.user,
                addresses: userDetails.addresses,
                orders: userDetails.orders,
                reviews: userDetails.reviews,
                statusHistory: userDetails.status_history,
            };
            await AuditLog.create({
                tableName: 'users',
                recordId: id,
                action: 'EXPORT',
                performedBy: admin.id,
                performedAt: new Date(),
            });
        }

        return { data: JSON.stringify(exportPayload, null, 2), error: null };
    } catch (err) {
        return { data: null, error: err instanceof Error ? err.message : 'Failed to export customer data' };
    }
}

export async function anonymizeCustomer(userId: string): Promise<{ success: boolean; error: string | null }> {
    await connectToDatabase();
    try {
        const admin = await assertAdminPermission('anonymize_users');

        const user = await User.findOne({
            $or: [{ _id: isValidMongoId(userId) ? userId : null }, { clerkId: userId }],
        });

        if (!user) return { success: false, error: 'User not found' };

        const uId = String(user._id);

        // Anonymize personal info
        user.fullName = 'Anonymized User';
        user.displayName = 'Anonymized';
        user.email = `anonymized_${uId}@valleycentia.local`;
        user.phone = null;
        user.avatarUrl = null;
        user.status = 'suspended';
        user.isAnonymized = true;
        user.statusHistory.push({
            status: 'suspended',
            note: 'Account anonymized under privacy request',
            changedBy: admin.id,
            createdAt: new Date(),
        });
        await user.save();

        // Clear user addresses
        await Address.deleteMany({ userId: { $in: [uId, user.clerkId].filter(Boolean) } });

        await AuditLog.create({
            tableName: 'users',
            recordId: uId,
            action: 'ANONYMIZE',
            newData: { anonymizedAt: new Date() },
            performedBy: admin.id,
            performedAt: new Date(),
        });

        return { success: true, error: null };
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Failed to anonymize user' };
    }
}

function isValidMongoId(str: string): boolean {
    return /^[0-9a-fA-F]{24}$/.test(str);
}
