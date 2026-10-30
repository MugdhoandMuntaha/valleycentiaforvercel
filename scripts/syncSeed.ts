import nextEnv from '@next/env';
const { loadEnvConfig } = nextEnv;

// Load environment variables from .env.local
loadEnvConfig(process.cwd());

import connectToDatabase from '../src/lib/mongodb.ts';
import SiteSetting from '../src/lib/models/SiteSetting.ts';
import HeroSlide from '../src/lib/models/HeroSlide.ts';
import HomepageSection from '../src/lib/models/HomepageSection.ts';

export async function runSyncSeed() {
    console.log('[SyncSeed] Connecting to MongoDB...');
    await connectToDatabase();
    console.log('[SyncSeed] Connected.');

    // 1. Idempotent SiteSetting seeding ($setOnInsert preserves existing values)
    const defaultSettings: Array<{ key: string; value: Record<string, unknown>; description: string }> = [
        {
            key: 'header_settings',
            value: { show_announcement: false, announcement_text: 'Free shipping on orders above ৳499' },
            description: 'Header announcement bar configuration',
        },
        {
            key: 'maintenance_mode',
            value: { enabled: false, message: 'We are currently performing scheduled maintenance. Please check back soon!' },
            description: 'Maintenance mode toggle for the storefront',
        },
        {
            key: 'free_shipping_threshold',
            value: { amount: 499, currency: 'BDT' },
            description: 'Minimum order value for free shipping',
        },
        {
            key: 'shipping_fee',
            value: { amount: 49, dhaka: 60, outside_dhaka: 120, currency: 'BDT' },
            description: 'Standard shipping fees by delivery region',
        },
        {
            key: 'max_cart_quantity',
            value: { value: 10 },
            description: 'Maximum quantity per product in shopping cart',
        },
        {
            key: 'contact_email',
            value: { value: 'support@valleycentia.com' },
            description: 'Customer service support contact email',
        },
        {
            key: 'careers_email',
            value: { value: 'careers@valleycentia.com' },
            description: 'Careers recruitment contact email',
        },
        {
            key: 'policy_terms',
            value: {
                content: 'Welcome to ValleyCentia. Please read these Terms of Service carefully before using our website or registering for an account.\n\n1. Account Creation & Verification\nWhen creating an account, you must provide accurate, complete, and current information.\n\n2. Intellectual Property\nThe website and its original content, features, and functionality are and will remain the exclusive property of ValleyCentia.',
            },
            description: 'Terms and Conditions Policy content',
        },
        {
            key: 'policy_privacy',
            value: {
                content: 'ValleyCentia values your privacy. This Privacy Policy details how we collect, use, and safeguard your personal information.\n\n1. Information We Collect\nWe collect name, email, shipping/billing address, and payment info.\n\n2. Sharing & Disclosures\nWe do not sell your personal data. We only share details with trusted third-party providers involved in fulfillment and delivery.',
            },
            description: 'Privacy Policy content',
        },
        {
            key: 'policy_returns',
            value: {
                content: 'Return & Refund Policy:\n\n1. Returns\nYou can return any product within 30 days of delivery if it is unused and in its original packaging.\n\n2. Refunds\nOnce we receive and inspect your item, we will process your refund within 7-10 business days.',
            },
            description: 'Return and Refund Policy content',
        },
        {
            key: 'policy_delivery',
            value: {
                content: 'Delivery Policy:\n\n1. Shipping Rates\nWe offer free shipping on orders over ৳499. For other orders, standard shipping fees apply based on region.\n\n2. Delivery Times\nOrders inside Dhaka are delivered in 2-3 business days. Orders outside Dhaka take 3-5 business days.',
            },
            description: 'Delivery Policy content',
        },
        {
            key: 'footer_about_text',
            value: { text: 'Curating premium fashion and accessories for the modern lifestyle. Quality craftsmanship meets contemporary design.' },
            description: 'Footer about text / description',
        },
        {
            key: 'footer_contact_info',
            value: { email: 'hello@valleycentia.com', phone: '+1 (234) 567-890', address: 'New York, NY 10001' },
            description: 'Footer contact info',
        },
        {
            key: 'footer_social_links',
            value: { facebook: '#', instagram: '#', twitter: '#', youtube: '#' },
            description: 'Footer social media links',
        },
        {
            key: 'ad_banners',
            value: {
                banners_json: JSON.stringify([
                    { id: 1, image: '/ads/ad-skincare.jpg', alt: 'Your Glow Essentials – Premium Skincare Collection', href: '/shop?category=skincare' },
                    { id: 2, image: '/ads/ad-makeup.jpg', alt: 'Makeup Meets Skincare – Radiant Beauty', href: '/shop?category=makeup' },
                    { id: 3, image: '/ads/ad-babycare.jpg', alt: 'Gentle Care Happy Baby – Organic & Nurturing', href: '/shop?category=baby-care' },
                    { id: 4, image: '/ads/ad-haircare.svg', alt: 'Healthy Hair Starts Here – Hair Care Collection', href: '/shop?category=hair-care' }
                ], null, 2)
            },
            description: 'Homepage Ad Banner Grid (JSON configuration)',
        },
    ];

    for (const item of defaultSettings) {
        await SiteSetting.findOneAndUpdate(
            { key: item.key },
            { $setOnInsert: { key: item.key, value: item.value, description: item.description, updatedAt: new Date() } },
            { upsert: true }
        );
    }
    console.log('[SyncSeed] SiteSettings verified and up-to-date.');

    // 2. Ensure active Hero Slide exists if collection is empty
    const heroCount = await HeroSlide.countDocuments();
    if (heroCount === 0) {
        console.log('[SyncSeed] Seeding initial HeroSlide...');
        await HeroSlide.create({
            title: 'Elevate Your Style',
            subtitle: 'Discover curated collections of premium accessories and beauty essentials.',
            ctaText: 'Shop Collection',
            ctaLink: '/shop',
            imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80',
            imageAlt: 'Elevate Your Style Banner',
            isActive: true,
            sortOrder: 1,
        });
        console.log('[SyncSeed] Initial HeroSlide created.');
    }

    // 3. Ensure Homepage Sections exist
    const sectionCount = await HomepageSection.countDocuments();
    if (sectionCount === 0) {
        console.log('[SyncSeed] Seeding default Homepage Sections...');
        await HomepageSection.create([
            { sectionType: 'best_sellers', title: 'Best Sellers Across Brands', subtitle: 'The most-loved essentials, all in one place', badgeText: '🔥 Most Loved', sortOrder: 1, isActive: true },
            { sectionType: 'new_launches', title: 'New Launches', subtitle: 'New formulas to love every day', badgeText: '✨ Just Dropped', sortOrder: 2, isActive: true },
            { sectionType: 'power_care_duos', title: 'Power Care Duos', subtitle: 'Essentials that work from root to glow', badgeText: '💪 Power Pairs', sortOrder: 3, isActive: true },
            { sectionType: 'brands_that_lead', title: 'Brands That Lead. Ingredients That Deliver.', subtitle: 'Explore our portfolio of science-backed brands', badgeText: null, sortOrder: 4, isActive: true },
        ]);
        console.log('[SyncSeed] Homepage sections created.');
    }

    console.log('[SyncSeed] All sync seed operations completed successfully.');
}

if (process.argv[1]?.endsWith('syncSeed.ts') || process.argv[1]?.endsWith('syncSeed.js')) {
    runSyncSeed()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error('[SyncSeed] Error:', err);
            process.exit(1);
        });
}
