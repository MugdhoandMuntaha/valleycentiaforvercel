import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import CartItem from '@/lib/models/CartItem';
import { updateStockForOrder } from '@/lib/db/queries';

function generateOrderNumber() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const random6 = Math.floor(100000 + Math.random() * 900000);
    return `VC-${day}${month}-${random6}`;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { userId, items, address, subtotal, shipping, tax, total } = body;

        const isGuest = !userId || userId === 'guest';

        if ((!userId && !isGuest) || !items?.length || !address || !total) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        await connectToDatabase();
        const orderNumber = generateOrderNumber();

        const orderItems = items.map((item: { id: string; name: string; image: string; slug: string; size?: string; quantity: number; price: number }) => ({
            productId: new mongoose.Types.ObjectId(item.id),
            productName: item.name,
            productImage: item.image,
            productSlug: item.slug,
            sizeLabel: item.size || null,
            unitPrice: item.price,
            quantity: item.quantity,
            totalPrice: item.price * item.quantity,
        }));

        // Create COD order in DB
        const order = await Order.create({
            userId: isGuest ? null : userId,
            orderNumber: orderNumber,
            shippingName: address.full_name,
            shippingPhone: address.phone,
            shippingAddressLine1: address.address_line_1,
            shippingAddressLine2: address.address_line_2 || null,
            shippingCity: address.city,
            shippingState: address.state,
            shippingPostalCode: address.postal_code,
            shippingCountry: address.country || 'Bangladesh',
            subtotal,
            shippingCost: shipping,
            tax,
            total,
            status: 'confirmed',
            paymentStatus: 'pending',
            paymentMethod: 'cod',
            orderItems,
            statusHistory: [{ status: 'confirmed', note: 'COD order confirmed' }],
        });

        if (!order) {
            return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
        }

        // Update stock quantities
        await updateStockForOrder(orderItems);

        // Clear existing cart items in database
        if (!isGuest && userId) {
            await CartItem.deleteMany({ userId });
        }

        return NextResponse.json({
            success: true,
            orderNumber,
            orderId: order._id,
            items: items.map((i: { name: string; quantity: number; price: number; size?: string }) => ({
                name: i.name,
                quantity: i.quantity,
                price: i.price,
                size: i.size,
            })),
            address,
            subtotal,
            shipping,
            tax,
            total,
        });
    } catch (err) {
        console.error('COD order error:', err);
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 });
    }
}
