import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Cross-App Model Parity Test
 * Ensures that all models shared between Storefront, Admin Panel, and OMS Panel
 * have identical schema definitions, field types, enums, defaults, and indexes.
 */

const SHARED_MODELS = [
    'AboutContent',
    'Address',
    'Brand',
    'CartItem',
    'Category',
    'Coupon',
    'HeroSlide',
    'HomepageSection',
    'NavLink',
    'Order',
    'Product',
    'Review',
    'SiteSetting',
    'User',
    'VisibleChange',
    'WishlistItem',
];

function normalizeContent(raw: string): string {
    return raw
        .replace(/\r\n/g, '\n')
        .trim();
}

describe('Shared Model Parity Across Apps (Storefront, Admin, OMS)', () => {
    const rootDir = process.cwd();
    const storefrontModelsDir = path.join(rootDir, 'src', 'lib', 'models');
    const adminModelsDir = path.join(rootDir, 'admin-panel', 'src', 'lib', 'models');
    const omsModelsDir = path.join(rootDir, 'oms-panel', 'src', 'lib', 'models');

    for (const modelName of SHARED_MODELS) {
        it(`verifies ${modelName}.ts is in parity between Storefront and Admin Panel`, () => {
            const storefrontPath = path.join(storefrontModelsDir, `${modelName}.ts`);
            const adminPath = path.join(adminModelsDir, `${modelName}.ts`);

            assert.ok(fs.existsSync(storefrontPath), `Missing storefront model: ${modelName}.ts`);
            assert.ok(fs.existsSync(adminPath), `Missing admin model: ${modelName}.ts`);

            const storefrontContent = normalizeContent(fs.readFileSync(storefrontPath, 'utf8'));
            const adminContent = normalizeContent(fs.readFileSync(adminPath, 'utf8'));

            assert.equal(
                adminContent,
                storefrontContent,
                `Model drift detected in ${modelName}.ts between Storefront and Admin Panel!`
            );
        });

        it(`verifies ${modelName}.ts is in parity between Storefront and OMS Panel`, () => {
            const storefrontPath = path.join(storefrontModelsDir, `${modelName}.ts`);
            const omsPath = path.join(omsModelsDir, `${modelName}.ts`);

            assert.ok(fs.existsSync(storefrontPath), `Missing storefront model: ${modelName}.ts`);
            assert.ok(fs.existsSync(omsPath), `Missing OMS model: ${modelName}.ts`);

            const storefrontContent = normalizeContent(fs.readFileSync(storefrontPath, 'utf8'));
            const omsContent = normalizeContent(fs.readFileSync(omsPath, 'utf8'));

            assert.equal(
                omsContent,
                storefrontContent,
                `Model drift detected in ${modelName}.ts between Storefront and OMS Panel!`
            );
        });
    }

    it('enforces userId is String across Address, CartItem, WishlistItem, Order to avoid Clerk CastErrors', () => {
        for (const file of ['Address.ts', 'CartItem.ts', 'WishlistItem.ts', 'Order.ts']) {
            const content = fs.readFileSync(path.join(adminModelsDir, file), 'utf8');
            assert.ok(
                !content.includes("userId: { type: Schema.Types.ObjectId"),
                `${file} in admin still uses ObjectId for userId instead of String!`
            );
        }
    });

    it('enforces Product model has isDeleted and deletedAt flags across all panels', () => {
        for (const dir of [storefrontModelsDir, adminModelsDir, omsModelsDir]) {
            const content = fs.readFileSync(path.join(dir, 'Product.ts'), 'utf8');
            assert.ok(content.includes('isDeleted:'), 'Product must have isDeleted field');
            assert.ok(content.includes('deletedAt:'), 'Product must have deletedAt field');
        }
    });
});

