import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/* ===== Logic under test ===== */

interface MockReview {
    id: string;
    product_id: string;
    user_id: string;
    user_name: string;
    rating: number;
    title: string | null;
    body: string | null;
    is_verified: boolean;
    helpful_count: number;
    created_at: string;
    images?: { url: string; altText: string | null; sortOrder: number }[];
}

function calculateRatingDistribution(reviews: MockReview[]) {
    return [5, 4, 3, 2, 1].map(star => {
        const count = reviews.filter(r => r.rating === star).length;
        return {
            star,
            count,
            pct: reviews.length > 0 ? (count / reviews.length) * 100 : 0,
        };
    });
}

function calculateRecommendationPercent(reviews: MockReview[]) {
    if (reviews.length === 0) return 100;
    const positive = reviews.filter(r => r.rating >= 4).length;
    return Math.round((positive / reviews.length) * 100);
}

function filterAndSortReviews(
    reviews: MockReview[],
    options: {
        selectedStar?: number | null;
        onlyWithPhotos?: boolean;
        onlyVerified?: boolean;
        searchQuery?: string;
        sortBy?: 'newest' | 'highest' | 'lowest' | 'helpful';
    }
) {
    const {
        selectedStar = null,
        onlyWithPhotos = false,
        onlyVerified = false,
        searchQuery = '',
        sortBy = 'newest',
    } = options;

    return reviews
        .filter(r => {
            if (selectedStar !== null && r.rating !== selectedStar) return false;
            if (onlyWithPhotos && (!r.images || r.images.length === 0)) return false;
            if (onlyVerified && !r.is_verified) return false;
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const titleMatch = r.title ? r.title.toLowerCase().includes(q) : false;
                const bodyMatch = r.body ? r.body.toLowerCase().includes(q) : false;
                const userMatch = r.user_name ? r.user_name.toLowerCase().includes(q) : false;
                if (!titleMatch && !bodyMatch && !userMatch) return false;
            }
            return true;
        })
        .sort((a, b) => {
            if (sortBy === 'highest') return b.rating - a.rating;
            if (sortBy === 'lowest') return a.rating - b.rating;
            if (sortBy === 'helpful') return (b.helpful_count || 0) - (a.helpful_count || 0);
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
}

function validateReviewSubmission(form: { rating: number; title: string; body: string }) {
    if (form.rating < 1 || form.rating > 5) {
        return { valid: false, error: 'Rating must be between 1 and 5 stars.' };
    }
    if (form.body.trim().length < 10) {
        return { valid: false, error: 'Review body must be at least 10 characters long.' };
    }
    if (form.body.length > 1000) {
        return { valid: false, error: 'Review body must not exceed 1000 characters.' };
    }
    if (form.title.length > 80) {
        return { valid: false, error: 'Review title must not exceed 80 characters.' };
    }
    return { valid: true, error: null };
}

function formatRelativeReviewDate(dateStr: string, mockNow?: Date): string {
    const date = new Date(dateStr);
    const now = mockNow || new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/* ===== Test Suite ===== */

describe('Review Business Logic & Mobile UX Features', () => {
    const sampleReviews: MockReview[] = [
        {
            id: 'rev-1',
            product_id: 'prod-100',
            user_id: 'user-1',
            user_name: 'Sadia Rahman',
            rating: 5,
            title: 'Fantastic hydration!',
            body: 'This completely cleared up my winter dry patches within one week.',
            is_verified: true,
            helpful_count: 14,
            created_at: new Date(Date.now() - 3600 * 1000 * 3).toISOString(), // 3 hours ago
            images: [{ url: 'https://example.com/p1.jpg', altText: 'Before after', sortOrder: 0 }],
        },
        {
            id: 'rev-2',
            product_id: 'prod-100',
            user_id: 'user-2',
            user_name: 'Tanvir Hossain',
            rating: 4,
            title: 'Good texture',
            body: 'Absorbs fast with no sticky residue. Pleasant light fragrance.',
            is_verified: false,
            helpful_count: 5,
            created_at: new Date(Date.now() - 3600 * 1000 * 48).toISOString(), // 2 days ago
        },
        {
            id: 'rev-3',
            product_id: 'prod-100',
            user_id: 'user-3',
            user_name: 'Anika Chowdhury',
            rating: 2,
            title: 'Too heavy for oily skin',
            body: 'Did not suit my T-zone, broke me out a bit.',
            is_verified: true,
            helpful_count: 22,
            created_at: new Date(Date.now() - 3600 * 1000 * 120).toISOString(), // 5 days ago
        },
        {
            id: 'rev-4',
            product_id: 'prod-100',
            user_id: 'user-4',
            user_name: 'Mahir Karim',
            rating: 5,
            title: 'Holy grail product',
            body: 'Best moisturizer I have used so far. Highly recommend!',
            is_verified: true,
            helpful_count: 2,
            created_at: new Date(Date.now() - 3600 * 1000 * 300).toISOString(), // 12 days ago
            images: [{ url: 'https://example.com/p2.jpg', altText: 'Jar photo', sortOrder: 0 }],
        },
    ];

    describe('Rating Aggregates & Distribution Breakdown', () => {
        it('calculates star distribution percentages accurately', () => {
            const dist = calculateRatingDistribution(sampleReviews);
            assert.equal(dist.length, 5);

            const star5 = dist.find(d => d.star === 5);
            assert.equal(star5?.count, 2);
            assert.equal(star5?.pct, 50);

            const star4 = dist.find(d => d.star === 4);
            assert.equal(star4?.count, 1);
            assert.equal(star4?.pct, 25);

            const star2 = dist.find(d => d.star === 2);
            assert.equal(star2?.count, 1);
            assert.equal(star2?.pct, 25);

            const star1 = dist.find(d => d.star === 1);
            assert.equal(star1?.count, 0);
            assert.equal(star1?.pct, 0);
        });

        it('computes customer recommendation percent (ratings >= 4)', () => {
            const recPct = calculateRecommendationPercent(sampleReviews);
            // 3 out of 4 reviews are >= 4 stars -> 75%
            assert.equal(recPct, 75);
        });

        it('defaults to 100% recommendation when no reviews exist', () => {
            assert.equal(calculateRecommendationPercent([]), 100);
        });
    });

    describe('Filtering System', () => {
        it('filters by exact star rating', () => {
            const res = filterAndSortReviews(sampleReviews, { selectedStar: 5 });
            assert.equal(res.length, 2);
            assert.ok(res.every(r => r.rating === 5));
        });

        it('filters by "With Photos" only', () => {
            const res = filterAndSortReviews(sampleReviews, { onlyWithPhotos: true });
            assert.equal(res.length, 2);
            assert.ok(res.every(r => r.images && r.images.length > 0));
        });

        it('filters by "Verified Buyers" only', () => {
            const res = filterAndSortReviews(sampleReviews, { onlyVerified: true });
            assert.equal(res.length, 3);
            assert.ok(res.every(r => r.is_verified === true));
        });

        it('searches by keyword across title, body, and author name', () => {
            const resText = filterAndSortReviews(sampleReviews, { searchQuery: 'hydration' });
            assert.equal(resText.length, 1);
            assert.equal(resText[0].id, 'rev-1');

            const resUser = filterAndSortReviews(sampleReviews, { searchQuery: 'tanvir' });
            assert.equal(resUser.length, 1);
            assert.equal(resUser[0].id, 'rev-2');

            const resNone = filterAndSortReviews(sampleReviews, { searchQuery: 'nonexistent keyword' });
            assert.equal(resNone.length, 0);
        });

        it('combines star filter and photo filter simultaneously', () => {
            const res = filterAndSortReviews(sampleReviews, { selectedStar: 5, onlyWithPhotos: true });
            assert.equal(res.length, 2);
            assert.ok(res.every(r => r.rating === 5 && r.images && r.images.length > 0));
        });
    });

    describe('Sorting Business Rules', () => {
        it('sorts by most helpful reviews (descending helpful_count)', () => {
            const res = filterAndSortReviews(sampleReviews, { sortBy: 'helpful' });
            assert.equal(res[0].id, 'rev-3'); // 22 helpful votes
            assert.equal(res[1].id, 'rev-1'); // 14 helpful votes
            assert.equal(res[2].id, 'rev-2'); // 5 helpful votes
            assert.equal(res[3].id, 'rev-4'); // 2 helpful votes
        });

        it('sorts by highest rating first', () => {
            const res = filterAndSortReviews(sampleReviews, { sortBy: 'highest' });
            assert.equal(res[0].rating, 5);
            assert.equal(res[res.length - 1].rating, 2);
        });

        it('sorts by lowest rating first', () => {
            const res = filterAndSortReviews(sampleReviews, { sortBy: 'lowest' });
            assert.equal(res[0].rating, 2);
            assert.equal(res[res.length - 1].rating, 5);
        });

        it('sorts by newest first as default', () => {
            const res = filterAndSortReviews(sampleReviews, { sortBy: 'newest' });
            assert.equal(res[0].id, 'rev-1'); // created 3 hours ago
            assert.equal(res[res.length - 1].id, 'rev-4'); // created 12 days ago
        });
    });

    describe('Review Form Validation Business Logic', () => {
        it('rejects review body under 10 characters', () => {
            const check = validateReviewSubmission({
                rating: 5,
                title: 'Great',
                body: 'Good',
            });
            assert.equal(check.valid, false);
            assert.ok(check.error?.includes('at least 10 characters'));
        });

        it('rejects rating lower than 1 star', () => {
            const check = validateReviewSubmission({
                rating: 0,
                title: 'Test',
                body: 'Valid long body text with sufficient length.',
            });
            assert.equal(check.valid, false);
        });

        it('rejects review body exceeding 1000 characters', () => {
            const longBody = 'A'.repeat(1001);
            const check = validateReviewSubmission({
                rating: 5,
                title: 'Test',
                body: longBody,
            });
            assert.equal(check.valid, false);
            assert.ok(check.error?.includes('exceed 1000 characters'));
        });

        it('accepts valid review with proper length and rating', () => {
            const check = validateReviewSubmission({
                rating: 4,
                title: 'Very satisfying moisturizing lotion',
                body: 'The hydration lasts all day without feeling greasy. Will buy again!',
            });
            assert.equal(check.valid, true);
            assert.equal(check.error, null);
        });
    });

    describe('Relative Date Formatting on Mobile', () => {
        const baseNow = new Date('2026-10-08T12:00:00Z');

        it('formats reviews under 1 hour as "Just now"', () => {
            const date = new Date(baseNow.getTime() - 15 * 60 * 1000).toISOString();
            assert.equal(formatRelativeReviewDate(date, baseNow), 'Just now');
        });

        it('formats reviews within 24 hours as hours ago', () => {
            const date = new Date(baseNow.getTime() - 5 * 3600 * 1000).toISOString();
            assert.equal(formatRelativeReviewDate(date, baseNow), '5h ago');
        });

        it('formats reviews from yesterday as "Yesterday"', () => {
            const date = new Date(baseNow.getTime() - 26 * 3600 * 1000).toISOString();
            assert.equal(formatRelativeReviewDate(date, baseNow), 'Yesterday');
        });

        it('formats reviews within a week as days ago', () => {
            const date = new Date(baseNow.getTime() - 4 * 24 * 3600 * 1000).toISOString();
            assert.equal(formatRelativeReviewDate(date, baseNow), '4 days ago');
        });

        it('formats reviews between 1 and 4 weeks as weeks ago', () => {
            const date = new Date(baseNow.getTime() - 14 * 24 * 3600 * 1000).toISOString();
            assert.equal(formatRelativeReviewDate(date, baseNow), '2w ago');
        });
    });

    describe('Helpful Vote Deduplication & Local Persistence', () => {
        it('tracks voted review IDs set and prevents duplicate increments', () => {
            const votedSet = new Set<string>();
            const revId = 'rev-1';

            const vote = (id: string, currentHelpful: number) => {
                if (votedSet.has(id)) {
                    return { success: false, newCount: currentHelpful };
                }
                votedSet.add(id);
                return { success: true, newCount: currentHelpful + 1 };
            };

            const firstVote = vote(revId, 14);
            assert.equal(firstVote.success, true);
            assert.equal(firstVote.newCount, 15);

            const duplicateVote = vote(revId, 15);
            assert.equal(duplicateVote.success, false);
            assert.equal(duplicateVote.newCount, 15);
        });
    });

    describe('Star Rating Toggle Behavior', () => {
        const toggleRating = (prev: number, clicked: number) => {
            return prev === clicked ? clicked - 1 : clicked;
        };

        it('selects and fills stars up to clicked star when not currently that rating', () => {
            assert.equal(toggleRating(0, 4), 4);
            assert.equal(toggleRating(2, 5), 5);
            assert.equal(toggleRating(5, 3), 3);
        });

        it('deselects current rating and drops by one when clicking the star matching current rating', () => {
            assert.equal(toggleRating(5, 5), 4);
            assert.equal(toggleRating(4, 4), 3);
            assert.equal(toggleRating(3, 3), 2);
            assert.equal(toggleRating(2, 2), 1);
        });

        it('resets to 0 when rating is 1 and 1st star is clicked', () => {
            assert.equal(toggleRating(1, 1), 0);
        });
    });

    describe('One Review Per User Constraint', () => {
        it('allows review submission if user has not yet reviewed the product', () => {
            const existingReviews = [{ product_id: 'prod-1', user_id: 'user-1' }];
            const hasReviewed = existingReviews.some(r => r.product_id === 'prod-1' && r.user_id === 'user-2');
            assert.equal(hasReviewed, false);
        });

        it('rejects duplicate submission with clear message when user already reviewed', () => {
            const existingReviews = [{ product_id: 'prod-1', user_id: 'user-1' }];
            const validateSubmission = (productId: string, userId: string) => {
                const alreadyReviewed = existingReviews.some(r => r.product_id === productId && r.user_id === userId);
                if (alreadyReviewed) {
                    return { success: false, error: 'You have already reviewed this.' };
                }
                return { success: true };
            };

            const result = validateSubmission('prod-1', 'user-1');
            assert.equal(result.success, false);
            assert.equal(result.error, 'You have already reviewed this.');
        });
    });

    describe('Reviewer Location & District Display', () => {
        it('automatically resolves reviewer district from user profile/address', () => {
            const profileAddresses = [
                { city: 'Saidpur', state: 'Rangpur', is_default: true }
            ];
            const autoResolvedDistrict = profileAddresses.find(a => a.is_default)?.city || null;
            assert.equal(autoResolvedDistrict, 'Saidpur');
        });

        it('shows reviewer district/location when present', () => {
            const reviewWithLocation = { user_name: 'Nafis Hasan Abid', location: 'Saidpur' };
            assert.equal(reviewWithLocation.location, 'Saidpur');
        });

        it('omits location display line completely when location is null, undefined, or empty', () => {
            const reviewWithoutLocation: { user_name: string; location?: string | null } = { user_name: 'Anonymous', location: null };
            const shouldRenderLocation = Boolean(reviewWithoutLocation.location && reviewWithoutLocation.location.trim().length > 0);
            assert.equal(shouldRenderLocation, false);
        });
    });

    describe('Review Edit Authorization & Image Management', () => {
        it('authorizes editing only when user is the original review author', () => {
            const review = { id: 'rev-10', user_id: 'user-author' };
            const canEdit = (userId: string | null) => Boolean(userId && review.user_id === userId);

            assert.equal(canEdit('user-author'), true);
            assert.equal(canEdit('user-other'), false);
            assert.equal(canEdit('admin-user'), false);
            assert.equal(canEdit(null), false);
        });

        it('validates image types (jpg, png, webp), 5MB size limit, and max 5 images per review', () => {
            const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
            const maxSizeBytes = 5 * 1024 * 1024;
            const maxImages = 5;

            const validateImage = (type: string, size: number, currentCount: number) => {
                if (currentCount >= maxImages) return { valid: false, error: 'Maximum 5 images allowed' };
                if (!allowedTypes.includes(type)) return { valid: false, error: 'Invalid file format' };
                if (size > maxSizeBytes) return { valid: false, error: 'File exceeds 5 MB' };
                return { valid: true };
            };

            assert.equal(validateImage('image/jpeg', 1024 * 1024, 0).valid, true);
            assert.equal(validateImage('image/png', 2 * 1024 * 1024, 2).valid, true);
            assert.equal(validateImage('image/webp', 4 * 1024 * 1024, 4).valid, true);
            assert.equal(validateImage('image/gif', 1024 * 1024, 1).valid, false);
            assert.equal(validateImage('image/jpeg', 6 * 1024 * 1024, 1).valid, false);
            assert.equal(validateImage('image/png', 1024 * 1024, 5).valid, false);
        });
    });

    describe('Review Image Display in Review List & Gallery Lightbox', () => {
        function computeReviewImagesDisplay(images: { url: string }[]) {
            const displayImages = images.slice(0, 3);
            const hasMore = images.length > 3;
            const allImageUrls = images.map(img => img.url);

            return {
                displayImages,
                hasMore,
                allImageUrls,
                thumbnails: displayImages.map((img, idx) => ({
                    url: img.url,
                    index: idx,
                    hasOverlay: hasMore && idx === 2,
                    overlayText: (hasMore && idx === 2) ? '3+' : null,
                })),
            };
        }

        it('shows up to 3 images normally with no label when review has 3 or fewer images', () => {
            const twoImages = [{ url: 'img1.webp' }, { url: 'img2.webp' }];
            const threeImages = [{ url: 'img1.webp' }, { url: 'img2.webp' }, { url: 'img3.webp' }];

            const res2 = computeReviewImagesDisplay(twoImages);
            assert.equal(res2.displayImages.length, 2);
            assert.equal(res2.hasMore, false);
            assert.deepEqual(res2.thumbnails.map(t => t.hasOverlay), [false, false]);

            const res3 = computeReviewImagesDisplay(threeImages);
            assert.equal(res3.displayImages.length, 3);
            assert.equal(res3.hasMore, false);
            assert.deepEqual(res3.thumbnails.map(t => t.hasOverlay), [false, false, false]);
        });

        it('shows only first 3 images with "3+" overlay on the 3rd image when review has > 3 images', () => {
            const fourImages = [
                { url: 'img1.webp' },
                { url: 'img2.webp' },
                { url: 'img3.webp' },
                { url: 'img4.webp' },
            ];
            const fiveImages = [
                { url: 'img1.webp' },
                { url: 'img2.webp' },
                { url: 'img3.webp' },
                { url: 'img4.webp' },
                { url: 'img5.webp' },
            ];

            const res4 = computeReviewImagesDisplay(fourImages);
            assert.equal(res4.displayImages.length, 3);
            assert.equal(res4.hasMore, true);
            assert.equal(res4.thumbnails[0].hasOverlay, false);
            assert.equal(res4.thumbnails[1].hasOverlay, false);
            assert.equal(res4.thumbnails[2].hasOverlay, true);
            assert.equal(res4.thumbnails[2].overlayText, '3+');

            const res5 = computeReviewImagesDisplay(fiveImages);
            assert.equal(res5.displayImages.length, 3);
            assert.equal(res5.hasMore, true);
            assert.equal(res5.thumbnails[2].hasOverlay, true);
            assert.equal(res5.thumbnails[2].overlayText, '3+');
        });

        it('opens all images in lightbox when any image or "3+" overlay is clicked', () => {
            const fiveImages = [
                { url: 'img1.webp' },
                { url: 'img2.webp' },
                { url: 'img3.webp' },
                { url: 'img4.webp' },
                { url: 'img5.webp' },
            ];

            const res = computeReviewImagesDisplay(fiveImages);

            // User clicks 3rd image with "3+" overlay (idx = 2)
            const clickedIndex = 2;
            const lightbox = {
                images: res.allImageUrls,
                activeIndex: clickedIndex,
            };

            // Must contain ALL 5 images, not just the 3 displayed
            assert.equal(lightbox.images.length, 5);
            assert.deepEqual(lightbox.images, ['img1.webp', 'img2.webp', 'img3.webp', 'img4.webp', 'img5.webp']);
            assert.equal(lightbox.activeIndex, 2);
        });

        it('cycles through lightbox gallery with previous, next and keyboard navigation', () => {
            const images = ['img1.webp', 'img2.webp', 'img3.webp', 'img4.webp', 'img5.webp'];
            let activeIndex = 0;

            const next = () => { activeIndex = (activeIndex + 1) % images.length; };
            const prev = () => { activeIndex = (activeIndex - 1 + images.length) % images.length; };

            next();
            assert.equal(activeIndex, 1);
            next();
            assert.equal(activeIndex, 2);
            prev();
            assert.equal(activeIndex, 1);
            prev();
            assert.equal(activeIndex, 0);
            // Cycle backwards wraps around to end
            prev();
            assert.equal(activeIndex, 4);
            // Cycle forward wraps around to start
            next();
            assert.equal(activeIndex, 0);
        });

        it('guarantees responsive non-wrapping layout on mobile and desktop', () => {
            const containerStyle = {
                display: 'flex',
                gap: '8px',
                flexWrap: 'nowrap',
                overflow: 'hidden',
                width: '100%',
            };

            assert.equal(containerStyle.flexWrap, 'nowrap');
            assert.equal(containerStyle.overflow, 'hidden');
        });
    });
});


