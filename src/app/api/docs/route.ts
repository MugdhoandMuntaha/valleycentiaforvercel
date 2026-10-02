import { NextRequest, NextResponse } from 'next/server';

/**
 * OpenAPI 3.0.3 Specification for Valleycentia Commerce REST APIs
 */
const openApiSpec = {
    openapi: '3.0.3',
    info: {
        title: 'Valleycentia Commerce API',
        description: 'Production-grade, idempotent RESTful API for Valleycentia Storefront, Checkout, Payment Gateway, and Inventory Management.',
        version: '1.0.0',
        contact: {
            name: 'Valleycentia Engineering Team',
            email: 'dev@valleycentia.com',
            url: 'https://valleycentia.com',
        },
    },
    servers: [
        {
            url: '/api/v1',
            description: 'Version 1 (Production API)',
        },
        {
            url: '/api',
            description: 'Canonical Direct API (Backward Compatibility)',
        },
    ],
    paths: {
        '/payment/cod': {
            post: {
                summary: 'Place Cash on Delivery (COD) Order',
                description: 'Creates a verified COD order. Supports idempotency via Idempotency-Key header to eliminate duplicate order submission.',
                parameters: [
                    {
                        name: 'Idempotency-Key',
                        in: 'header',
                        required: false,
                        schema: { type: 'string' },
                        description: 'Unique client-generated UUID to guarantee idempotent order creation.',
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['items', 'address'],
                                properties: {
                                    userId: { type: 'string', nullable: true, example: 'user_2xyz...' },
                                    email: { type: 'string', format: 'email', example: 'customer@example.com' },
                                    items: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            required: ['id', 'quantity'],
                                            properties: {
                                                id: { type: 'string', example: '65f1234567890abcdef12345' },
                                                quantity: { type: 'integer', minimum: 1, example: 2 },
                                                size: { type: 'string', example: '100ml' },
                                            },
                                        },
                                    },
                                    address: {
                                        type: 'object',
                                        required: ['full_name', 'phone', 'address_line_1', 'city', 'state'],
                                        properties: {
                                            full_name: { type: 'string', example: 'Rahim Ahmed' },
                                            phone: { type: 'string', example: '+8801712345678' },
                                            address_line_1: { type: 'string', example: 'House 12, Road 5, Dhanmondi' },
                                            address_line_2: { type: 'string', nullable: true },
                                            city: { type: 'string', example: 'Dhaka' },
                                            state: { type: 'string', example: 'Dhaka' },
                                            postal_code: { type: 'string', example: '1205' },
                                            country: { type: 'string', default: 'Bangladesh' },
                                        },
                                    },
                                    shipping: { type: 'number', example: 60 },
                                    couponCode: { type: 'string', nullable: true, example: 'SAVE10' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Order placed successfully (or existing order returned if idempotent replay)',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        orderNumber: { type: 'string', example: 'VC-0210-987654' },
                                        order: { type: 'object' },
                                    },
                                },
                            },
                        },
                    },
                    '400': { description: 'Missing required parameters or price recalculation mismatch' },
                    '500': { description: 'Database or inventory reservation error' },
                },
            },
        },
        '/payment/init': {
            post: {
                summary: 'Initiate Online Gateway Payment Session',
                description: 'Verifies server-canonical price calculation, creates a pending order, and initializes a secured SSLCommerz session.',
                parameters: [
                    {
                        name: 'Idempotency-Key',
                        in: 'header',
                        required: false,
                        schema: { type: 'string' },
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['items', 'address'],
                                properties: {
                                    userId: { type: 'string', nullable: true },
                                    email: { type: 'string' },
                                    items: { type: 'array' },
                                    address: { type: 'object' },
                                    shipping: { type: 'number' },
                                    couponCode: { type: 'string', nullable: true },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Payment session created',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        url: { type: 'string', description: 'SSLCommerz Gateway Page redirect URL' },
                                        orderNumber: { type: 'string' },
                                    },
                                },
                            },
                        },
                    },
                    '400': { description: 'Validation error' },
                    '500': { description: 'Payment gateway communication failure' },
                },
            },
        },
        '/payment/success': {
            post: {
                summary: 'Payment Callback & IPN Webhook',
                description: 'Idempotently captures payment callbacks, validates server-to-server with SSLCommerz, decrements inventory, and updates order status.',
                requestBody: {
                    required: true,
                    content: {
                        'application/x-www-form-urlencoded': {
                            schema: {
                                type: 'object',
                                required: ['tran_id', 'status'],
                                properties: {
                                    tran_id: { type: 'string' },
                                    val_id: { type: 'string' },
                                    status: { type: 'string', example: 'VALID' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '302': { description: 'Redirects browser to /checkout/success or /checkout/fail' },
                },
            },
        },
        '/cart': {
            get: {
                summary: 'Fetch User Cart',
                description: 'Retrieves active cart items for authenticated user.',
                responses: {
                    '200': { description: 'Array of cart items' },
                },
            },
            post: {
                summary: 'Sync Cart',
                description: 'Synchronizes client cart items into server database.',
                responses: {
                    '200': { description: 'Cart synchronized' },
                },
            },
        },
        '/ai-search': {
            post: {
                summary: 'AI Semantic Product Search',
                description: 'Natural language search query transformed into semantic embedding or relevance score via Google Gemini.',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['query'],
                                properties: {
                                    query: { type: 'string', example: 'lightweight hydrating moisturizer for dry skin' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': { description: 'Semantic recommendations and product list' },
                },
            },
        },
    },
};

function renderSwaggerHtml(): string {
    const specJson = JSON.stringify(openApiSpec);
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Valleycentia API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #fbfbfb;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .topbar {
      display: none !important;
    }
    .swagger-ui .info {
      margin: 30px 0 20px 0;
    }
    .swagger-ui .info .title {
      font-weight: 700;
      color: #111;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js" crossorigin></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        spec: ${specJson},
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout"
      });
    };
  </script>
</body>
</html>`;
}

export async function GET(req: NextRequest) {
    const accept = req.headers.get('accept') || '';
    const format = req.nextUrl.searchParams.get('format');
    const wantsHtml = format === 'ui' || (!format && accept.includes('text/html') && !accept.includes('application/json'));

    if (wantsHtml) {
        return new NextResponse(renderSwaggerHtml(), {
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
            },
        });
    }

    return NextResponse.json(openApiSpec, {
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
    });
}
