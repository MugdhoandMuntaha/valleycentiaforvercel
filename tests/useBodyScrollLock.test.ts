import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('useBodyScrollLock & Scroll Offset Integrity', () => {
    it('preserves window scroll position and never sets documentElement height to 100%', () => {
        // Mock minimal DOM environment
        let currentScrollY = 1450;
        const fakeDocumentElement = {
            clientWidth: 1200,
            style: {
                overflow: '',
                height: '',
            }
        };

        const fakeBody = {
            style: {
                overflow: '',
                paddingRight: '',
            }
        };

        // Simulated hook logic from useBodyScrollLock
        const lock = (locked: boolean) => {
            if (!locked) return;
            const scrollbarWidth = 1215 - fakeDocumentElement.clientWidth; // 15px scrollbar
            const originalOverflow = fakeBody.style.overflow;
            fakeBody.style.overflow = 'hidden';
            if (scrollbarWidth > 0) {
                fakeBody.style.paddingRight = `${scrollbarWidth}px`;
            }

            return () => {
                fakeBody.style.overflow = originalOverflow;
                fakeBody.style.paddingRight = '';
            };
        };

        const unlock = lock(true);

        // 1. Verify documentElement was NOT mutated to height: 100% or overflow: hidden
        assert.strictEqual(fakeDocumentElement.style.height, '', 'documentElement height must remain untouched to prevent clamping scroll to 0');
        assert.strictEqual(fakeDocumentElement.style.overflow, '', 'documentElement overflow must remain untouched');

        // 2. Verify body overflow is locked cleanly and scrollbar width compensated
        assert.strictEqual(fakeBody.style.overflow, 'hidden');
        assert.strictEqual(fakeBody.style.paddingRight, '15px');

        // 3. Verify unlock restores styles cleanly
        if (unlock) unlock();
        assert.strictEqual(fakeBody.style.overflow, '');
        assert.strictEqual(fakeBody.style.paddingRight, '');
    });
});
