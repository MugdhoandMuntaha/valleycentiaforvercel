"use server";

import connectToDatabase from '@/lib/mongodb';
import SiteSetting from '@/lib/models/SiteSetting';
import AboutContent from '@/lib/models/AboutContent';

export async function getSiteSettings(): Promise<Record<string, unknown>> {
    await connectToDatabase();
    const settings = await SiteSetting.find().lean();
    const result: Record<string, unknown> = {};
    settings.forEach(row => { result[row.key] = row.value; });
    return result;
}

export async function getSiteSetting(key: string): Promise<unknown> {
    await connectToDatabase();
    const setting = await SiteSetting.findOne({ key }).lean();
    return setting?.value || null;
}

export async function getAboutContent(): Promise<Record<string, any>> {
    await connectToDatabase();
    const data = await AboutContent.find().lean();
    const map: Record<string, any> = {};
    data.forEach(row => { map[row.sectionKey] = row.content; });
    return map;
}
