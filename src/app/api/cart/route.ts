import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import connectToDatabase from '@/lib/mongodb';
import CartItem from '@/lib/models/CartItem';
import Product from '@/lib/models/Product';

export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        await connectToDatabase();

        const dbItems = await CartItem.find({ userId })
            .populate('productId')
            .lean();

        const items = dbItems.map((item: any) => {
            if (!item.productId) return null;
            const prod = item.productId;
            if (prod.isDeleted) return null;

            let price = prod.basePrice;
            let originalPrice = prod.compareAtPrice || undefined;
            let sizeLabel = undefined;
            let stockQuantity = prod.stockQuantity || 0;

            if (item.sizeId && prod.sizes) {
                const sz = prod.sizes.find((s: any) => String(s._id) === String(item.sizeId));
                if (sz) {
                    price = sz.price;
                    sizeLabel = sz.label;
                    stockQuantity = sz.stockQuantity || 0;
                }
            }

            let primaryImg = '/no-image.svg';
            if (prod.images && prod.images.length > 0) {
                const primary = prod.images.find((img: any) => img.isPrimary) || prod.images[0];
                primaryImg = primary.url;
            }

            const effectiveQty = Math.max(1, Math.min(item.quantity, stockQuantity > 0 ? stockQuantity : 10));

            return {
                id: String(prod._id),
                slug: prod.slug,
                name: prod.name,
                image: primaryImg,
                price: Math.ceil(price),
                originalPrice: originalPrice ? Math.ceil(originalPrice) : undefined,
                size: sizeLabel,
                quantity: effectiveQty,
                stockQuantity: stockQuantity,
            };
        }).filter(Boolean);

        return NextResponse.json({ items });
    } catch (err) {
        console.error('Fetch cart error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const body = await req.json();
        const clientItems = body.items || [];

        await connectToDatabase();

        // Clear existing cart items
        await CartItem.deleteMany({ userId });

        // Map and insert new ones
        const toInsert = [];
        for (const item of clientItems) {
            const prod = await Product.findOne({ _id: item.id, isDeleted: { $ne: true } }).lean();
            if (!prod) continue;

            let sizeId = null;
            let availableStock = prod.stockQuantity || 0;
            if (item.size && prod.sizes) {
                const sz = prod.sizes.find((s: any) => s.label === item.size);
                if (sz) {
                    sizeId = sz._id;
                    availableStock = sz.stockQuantity || 0;
                }
            }

            const validQty = Math.max(1, Math.min(Number(item.quantity) || 1, availableStock > 0 ? availableStock : 10, 10));

            toInsert.push({
                userId,
                productId: prod._id,
                sizeId,
                quantity: validQty,
            });
        }

        if (toInsert.length > 0) {
            await CartItem.insertMany(toInsert);
        }

        return NextResponse.json({ success: true, count: toInsert.length });
    } catch (err) {
        console.error('Save cart error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
