"use server";

import connectToDatabase from '@/lib/mongodb';
import SiteSetting from '@/lib/models/SiteSetting';
import AboutContent from '@/lib/models/AboutContent';
import { safeCache } from '@/lib/cache';

const fetchAllSiteSettings = async (): Promise<Record<string, unknown>> => {
    await connectToDatabase();
    const settings = await SiteSetting.find().lean();
    const result: Record<string, unknown> = {};
    settings.forEach(row => { result[row.key] = row.value; });
    return result;
};

const cachedSiteSettings = safeCache(
    fetchAllSiteSettings,
    ['all-site-settings'],
    { tags: ['site-settings'], revalidate: 3600 }
);

export async function getSiteSettings(): Promise<Record<string, unknown>> {
    return cachedSiteSettings();
}

export async function getSiteSetting(key: string): Promise<unknown> {
    const settings = await cachedSiteSettings();
    return settings[key] || null;
}

const fetchAllAboutContent = async (): Promise<Record<string, unknown>> => {
    await connectToDatabase();
    const data = await AboutContent.find().lean();
    const map: Record<string, unknown> = {};
    data.forEach(row => { map[row.sectionKey] = row.content; });
    return map;
};

const cachedAboutContent = safeCache(
    fetchAllAboutContent,
    ['all-about-content'],
    { tags: ['about'], revalidate: 3600 }
);

export async function getAboutContent(): Promise<Record<string, unknown>> {
    return cachedAboutContent();
}
