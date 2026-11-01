import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import connectToDatabase from '@/lib/mongodb';
import CartItem from '@/lib/models/CartItem';
import Product from '@/lib/models/Product';
import { normalizeSize } from '@/lib/cartUtils';

interface ProductSizeDoc {
    _id: unknown;
    label: string;
    price: number;
    stockQuantity?: number;
}

interface ProductImageDoc {
    url: string;
    isPrimary?: boolean;
}

interface ProductPopulatedDoc {
    _id: unknown;
    slug: string;
    name: string;
    isDeleted?: boolean;
    basePrice: number;
    compareAtPrice?: number | null;
    stockQuantity?: number;
    sizes?: ProductSizeDoc[];
    images?: ProductImageDoc[];
}

interface DbCartItemDoc {
    productId?: ProductPopulatedDoc;
    sizeId?: unknown;
    quantity: number;
}

interface ClientCartItemInput {
    id: string;
    size?: string | null;
    quantity?: number;
}

export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        await connectToDatabase();

        const dbItems = await CartItem.find({ userId })
            .populate('productId')
            .lean() as unknown as DbCartItemDoc[];

        const items = dbItems.map((item) => {
            if (!item.productId) return null;
            const prod = item.productId;
            if (prod.isDeleted) return null;

            let price = prod.basePrice;
            const originalPrice = prod.compareAtPrice || undefined;
            let sizeLabel: string | undefined = undefined;
            let stockQuantity = prod.stockQuantity || 0;

            if (item.sizeId && prod.sizes && Array.isArray(prod.sizes)) {
                const sz = prod.sizes.find((s) => String(s._id) === String(item.sizeId));
                if (sz) {
                    price = sz.price;
                    sizeLabel = normalizeSize(sz.label);
                    stockQuantity = sz.stockQuantity || 0;
                }
            }

            let primaryImg = '/no-image.svg';
            if (prod.images && prod.images.length > 0) {
                const primary = prod.images.find((img) => img.isPrimary) || prod.images[0];
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
        const clientItems: ClientCartItemInput[] = Array.isArray(body.items) ? body.items : [];

        await connectToDatabase();

        // If client sends empty items, clear cart
        if (clientItems.length === 0) {
            await CartItem.deleteMany({ userId });
            return NextResponse.json({ success: true, count: 0 });
        }

        // Fetch products in bulk
        const productIds = clientItems.map((i) => i.id).filter(Boolean);
        const products = await Product.find({ _id: { $in: productIds }, isDeleted: { $ne: true } }).lean() as unknown as ProductPopulatedDoc[];
        const productMap = new Map(products.map((p) => [String(p._id), p]));

        // Consolidate/deduplicate client items by (productId, sizeId) to guarantee idempotency and avoid duplicate key errors
        const consolidated = new Map<string, { productId: unknown; sizeId: unknown; quantity: number }>();

        for (const item of clientItems) {
            if (!item || !item.id) continue;
            const prod = productMap.get(String(item.id));
            if (!prod) continue;

            let sizeId: unknown = null;
            let availableStock = prod.stockQuantity || 0;
            const normSize = normalizeSize(item.size);

            if (normSize && prod.sizes && Array.isArray(prod.sizes)) {
                const sz = prod.sizes.find((s) => s.label && s.label.toLowerCase() === normSize.toLowerCase());
                if (sz) {
                    sizeId = sz._id;
                    availableStock = sz.stockQuantity || 0;
                }
            }

            const itemKey = `${String(prod._id)}_${sizeId ? String(sizeId) : 'none'}`;
            const qty = Math.max(1, Number(item.quantity) || 1);
            const maxAllowed = Math.min(availableStock > 0 ? availableStock : 10, 10);

            const existing = consolidated.get(itemKey);
            if (existing) {
                // If client somehow posted duplicate items, consolidate their quantity up to max stock
                existing.quantity = Math.max(1, Math.min(existing.quantity + qty, maxAllowed));
            } else {
                consolidated.set(itemKey, {
                    productId: prod._id,
                    sizeId,
                    quantity: Math.max(1, Math.min(qty, maxAllowed)),
                });
            }
        }

        const toInsert = Array.from(consolidated.values()).map(c => ({
            userId,
            productId: c.productId,
            sizeId: c.sizeId,
            quantity: c.quantity,
        }));

        // Atomically replace items for user
        await CartItem.deleteMany({ userId });
        if (toInsert.length > 0) {
            await CartItem.insertMany(toInsert, { ordered: false });
        }

        return NextResponse.json({ success: true, count: toInsert.length });
    } catch (err) {
        console.error('Save cart error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
