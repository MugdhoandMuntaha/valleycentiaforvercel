import React from 'react';
import type { Metadata } from 'next';
import { getProductBySlug } from '@/lib/db/queries';

interface Props {
    children: React.ReactNode;
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://valleycentia.com';

    const product = await getProductBySlug(slug);
    if (!product) {
        return {
            title: 'Product Not Found | Valleycentia',
            description: 'The requested product could not be found.',
        };
    }

    const title = `${product.name} | Valleycentia`;
    const description = product.short_description || product.subtitle || `Shop ${product.name} at Valleycentia. Guaranteed authentic beauty, skincare, and hair care products in Bangladesh.`;
    const canonicalUrl = `${baseUrl}/product/${slug}`;
    const primaryImg = product.images?.[0]?.url || `${baseUrl}/og-default.jpg`;

    return {
        title,
        description,
        alternates: {
            canonical: canonicalUrl,
        },
        openGraph: {
            title,
            description,
            url: canonicalUrl,
            siteName: 'Valleycentia',
            images: [
                {
                    url: primaryImg,
                    width: 800,
                    height: 800,
                    alt: product.name,
                },
            ],
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [primaryImg],
        },
    };
}

export default async function ProductLayout({ children, params }: Props) {
    const { slug } = await params;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://valleycentia.com';
    const product = await getProductBySlug(slug);

    if (!product) {
        return <>{children}</>;
    }

    const primaryImg = product.images?.[0]?.url || `${baseUrl}/og-default.jpg`;
    const productUrl = `${baseUrl}/product/${slug}`;

    // Schema.org Product structured data
    const productJsonLd: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        image: product.images?.map(i => i.url) || [primaryImg],
        description: product.short_description || product.description || product.name,
        sku: product.slug,
        brand: {
            '@type': 'Brand',
            name: product.brand_name || 'Valleycentia',
        },
        offers: {
            '@type': 'Offer',
            url: productUrl,
            priceCurrency: 'BDT',
            price: product.coupon_price || product.base_price,
            priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            itemCondition: 'https://schema.org/NewCondition',
            availability: product.in_stock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        },
    };

    if (product.review_count > 0) {
        productJsonLd.aggregateRating = {
            '@type': 'AggregateRating',
            ratingValue: product.rating_avg,
            reviewCount: product.review_count,
        };
    }

    // Schema.org BreadcrumbList structured data
    const breadcrumbJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            {
                '@type': 'ListItem',
                position: 1,
                name: 'Home',
                item: baseUrl,
            },
            {
                '@type': 'ListItem',
                position: 2,
                name: 'Shop',
                item: `${baseUrl}/shop`,
            },
            ...(product.category_name ? [
                {
                    '@type': 'ListItem',
                    position: 3,
                    name: product.category_name,
                    item: `${baseUrl}/shop?category=${product.category_slug}`,
                },
                {
                    '@type': 'ListItem',
                    position: 4,
                    name: product.name,
                    item: productUrl,
                }
            ] : [
                {
                    '@type': 'ListItem',
                    position: 3,
                    name: product.name,
                    item: productUrl,
                }
            ]),
        ],
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
            />
            {children}
        </>
    );
}
