"use server";

import connectToDatabase from '@/lib/mongodb';
import NavLinkModel from '@/lib/models/NavLink';
import Category from '@/lib/models/Category';
import type { NavLinkItem } from './types';

export async function getNavLinks(): Promise<NavLinkItem[]> {
    await connectToDatabase();

    const all = await NavLinkModel.find({ isActive: true }).sort('sortOrder').lean();

    const topLevel = all.filter(n => !n.parentId);
    const manualChildren = all.filter(n => n.parentId);

    // Get linked category children
    const linkedCategoryIds = topLevel.map(n => n.linkedCategoryId).filter(Boolean);

    let categoryChildrenMap: Record<string, { name: string; slug: string }[]> = {};
    if (linkedCategoryIds.length > 0) {
        const catChildren = await Category.find({
            parentId: { $in: linkedCategoryIds },
            isActive: true,
        }).sort('name').lean();

        for (const child of catChildren) {
            const parentKey = String(child.parentId);
            if (!categoryChildrenMap[parentKey]) categoryChildrenMap[parentKey] = [];
            categoryChildrenMap[parentKey].push({ name: child.name, slug: child.slug });
        }
    }

    return topLevel.map(item => {
        let children: { label: string; href: string }[] = [];

        if (item.linkedCategoryId && categoryChildrenMap[String(item.linkedCategoryId)]) {
            children = categoryChildrenMap[String(item.linkedCategoryId)].map(c => ({
                label: c.name,
                href: `/shop?type=${c.slug}`,
            }));
        }

        const manual = manualChildren
            .filter(c => String(c.parentId) === String(item._id))
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map(c => ({ label: c.label, href: c.href }));

        children = [...children, ...manual];

        return {
            id: String(item._id),
            label: item.label,
            href: item.href,
            highlight: item.highlight,
            children,
        };
    });
}
