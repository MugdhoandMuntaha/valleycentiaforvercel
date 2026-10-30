import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // 1. Validate image type (jpg, png, webp)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const allowedExts = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.name).toLowerCase();
    if (!allowedTypes.includes(file.type) && !allowedExts.includes(ext)) {
      return NextResponse.json({ error: 'Only JPG, PNG, and WebP images are allowed' }, { status: 400 });
    }

    // 2. Validate size (max 5 MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Image size must be 5 MB or less' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 3. Resolve upload directories: storefront root public/uploads AND admin public/uploads
    const cwd = process.cwd();
    const possibleDirs = [
      path.resolve(cwd, '..', 'public', 'uploads'), // when running inside admin-panel/
      path.resolve(cwd, 'public', 'uploads'),        // when running from root or in admin-panel
    ];

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
    const filename = `${uniqueSuffix}-${safeName}`;

    // Write to all reachable public/uploads targets
    let written = false;
    for (const dir of possibleDirs) {
      try {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        await fs.promises.writeFile(path.join(dir, filename), buffer);
        written = true;
      } catch (e) {
        console.warn(`[Admin Upload] Could not write to ${dir}:`, e);
      }
    }

    if (!written) {
      return NextResponse.json({ error: 'Failed to write file to upload directory' }, { status: 500 });
    }

    const fileUrl = `/uploads/${filename}`;
    return NextResponse.json({ url: fileUrl });
  } catch (error: any) {
    console.error('Error uploading file in admin:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
