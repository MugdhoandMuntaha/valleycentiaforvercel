import { MetadataRoute } from 'next';
import connectToDatabase from '@/lib/mongodb';
import Product from '@/lib/models/Product';
import Category from '@/lib/models/Category';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://valleycentia.com';

    let productEntries: MetadataRoute.Sitemap = [];
    let categoryEntries: MetadataRoute.Sitemap = [];

    try {
        await connectToDatabase();
        const products = await Product.find({ isActive: true, isDeleted: { $ne: true } }).select('slug updatedAt').lean();
        const categories = await Category.find({ isActive: true }).select('slug updatedAt').lean();

        productEntries = products.map(p => ({
            url: `${baseUrl}/product/${p.slug}`,
            lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
            changeFrequency: 'weekly',
            priority: 0.8,
        }));

        categoryEntries = categories.map(c => ({
            url: `${baseUrl}/shop?category=${c.slug}`,
            lastModified: c.updatedAt ? new Date(c.updatedAt) : new Date(),
            changeFrequency: 'weekly',
            priority: 0.7,
        }));
    } catch (e) {
        console.error('Failed to generate dynamic sitemap entries:', e);
    }

    const staticEntries: MetadataRoute.Sitemap = [
        { url: `${baseUrl}`, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
        { url: `${baseUrl}/shop`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
        { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
        { url: `${baseUrl}/shipping`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
        { url: `${baseUrl}/returns`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
        { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
        { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    ];

    return [...staticEntries, ...categoryEntries, ...productEntries];
}
