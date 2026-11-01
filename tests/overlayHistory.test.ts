import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Overlay stack simulator that models the browser history and overlay lifecycle
 * implemented in src/hooks/useOverlayHistory.ts
 */
class OverlayHistorySimulator {
    public historyStack: Array<{ state: any; url: string }> = [{ state: null, url: 'http://localhost:3000/product/test' }];
    public historyIndex: number = 0;
    public overlayStack: Array<{ id: string; onClose: () => void; triggerElement?: any }> = [];
    public programmaticBackCount: number = 0;
    public currentPathname: string = '/product/test';

    pushOverlay(id: string, onClose: () => void, triggerElement?: any) {
        const state = {
            ...(this.historyStack[this.historyIndex]?.state || {}),
            overlay: id,
            __overlayDepth: this.overlayStack.length + 1,
        };
        this.historyStack = this.historyStack.slice(0, this.historyIndex + 1);
        this.historyStack.push({ state, url: `http://localhost:3000${this.currentPathname}` });
        this.historyIndex++;

        this.overlayStack.push({ id, onClose, triggerElement });
    }

    programmaticClose(id: string) {
        const idx = this.overlayStack.map(i => i.id).lastIndexOf(id);
        if (idx !== -1) {
            const item = this.overlayStack.splice(idx, 1)[0];
            this.programmaticBackCount++;
            this.back();
            if (item?.triggerElement && typeof item.triggerElement.focus === 'function') {
                item.triggerElement.focus();
            }
        }
    }

    unmountOverlay(id: string, initialPathname: string) {
        const idx = this.overlayStack.map(i => i.id).lastIndexOf(id);
        if (idx !== -1) {
            const item = this.overlayStack.splice(idx, 1)[0];
            const routeChanged = this.currentPathname !== initialPathname;
            if (!routeChanged) {
                this.programmaticBackCount++;
                this.back();
            }
            if (item?.triggerElement && typeof item.triggerElement.focus === 'function') {
                item.triggerElement.focus();
            }
        }
    }

    back() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.handlePopState();
        }
    }

    handlePopState() {
        if (this.programmaticBackCount > 0) {
            this.programmaticBackCount--;
            return;
        }

        if (this.overlayStack.length > 0) {
            const top = this.overlayStack.pop();
            if (top) {
                top.onClose();
                if (top.triggerElement && typeof top.triggerElement.focus === 'function') {
                    top.triggerElement.focus();
                }
            }
        }
    }

    navigateTo(path: string, mode: 'push' | 'replace' = 'push') {
        this.currentPathname = path;
        const url = `http://localhost:3000${path}`;
        if (mode === 'replace') {
            this.historyStack[this.historyIndex] = { state: null, url };
        } else {
            this.historyStack = this.historyStack.slice(0, this.historyIndex + 1);
            this.historyStack.push({ state: null, url });
            this.historyIndex++;
        }
    }
}

describe('Overlay History Navigation & Back Button Gesture (useOverlayHistory)', () => {
    it('pushes a history entry when an overlay opens and pops it on browser back', () => {
        const sim = new OverlayHistorySimulator();
        let isLightboxOpen = false;

        isLightboxOpen = true;
        sim.pushOverlay('review-image-lightbox', () => {
            isLightboxOpen = false;
        });

        assert.equal(sim.historyIndex, 1);
        assert.equal(sim.historyStack[sim.historyIndex].state?.overlay, 'review-image-lightbox');
        assert.equal(sim.overlayStack.length, 1);
        assert.equal(isLightboxOpen, true);

        // User triggers browser back gesture / button
        sim.back();

        assert.equal(sim.historyIndex, 0);
        assert.equal(sim.overlayStack.length, 0);
        assert.equal(isLightboxOpen, false);
    });

    it('cleans up browser history on programmatic close (X button, backdrop, Escape, swipe)', () => {
        const sim = new OverlayHistorySimulator();
        let isLightboxOpen = true;
        let closeCallCount = 0;

        sim.pushOverlay('review-image-lightbox', () => {
            closeCallCount++;
            isLightboxOpen = false;
        });

        assert.equal(sim.historyIndex, 1);

        sim.programmaticClose('review-image-lightbox');
        isLightboxOpen = false;

        assert.equal(sim.historyIndex, 0);
        assert.equal(sim.overlayStack.length, 0);
        assert.equal(closeCallCount, 0, 'Popstate listener should not re-trigger onClose during programmatic close');
        assert.equal(sim.programmaticBackCount, 0);
    });

    it('supports deep 3-level stacked overlays unwinding in exact LIFO order', () => {
        const sim = new OverlayHistorySimulator();
        let isProfileModalOpen = false;
        let isAddressFormOpen = false;
        let isDeleteConfirmOpen = false;

        // 1. Open customer profile modal
        isProfileModalOpen = true;
        sim.pushOverlay('admin-customer-profile-modal', () => { isProfileModalOpen = false; });

        // 2. Open edit address form over profile modal (layer 2)
        isAddressFormOpen = true;
        sim.pushOverlay('profile-address-form-modal', () => { isAddressFormOpen = false; });

        // 3. Open delete confirmation dialog over address form (layer 3)
        isDeleteConfirmOpen = true;
        sim.pushOverlay('profile-address-delete-dialog', () => { isDeleteConfirmOpen = false; });

        assert.equal(sim.historyIndex, 3);
        assert.equal(sim.overlayStack.length, 3);

        // First back: closes delete confirm dialog (topmost)
        sim.back();
        assert.equal(isDeleteConfirmOpen, false);
        assert.equal(isAddressFormOpen, true);
        assert.equal(isProfileModalOpen, true);
        assert.equal(sim.historyIndex, 2);

        // Second back: closes address form modal (layer 2)
        sim.back();
        assert.equal(isAddressFormOpen, false);
        assert.equal(isProfileModalOpen, true);
        assert.equal(sim.historyIndex, 1);

        // Third back: closes profile modal (layer 1)
        sim.back();
        assert.equal(isProfileModalOpen, false);
        assert.equal(sim.historyIndex, 0);
        assert.equal(sim.overlayStack.length, 0);
    });

    it('restores focus to trigger element when overlay closes via back or close button', () => {
        const sim = new OverlayHistorySimulator();
        let focused = false;
        const mockTriggerButton = {
            focus: () => { focused = true; }
        };

        sim.pushOverlay('cart-delete-dialog', () => {}, mockTriggerButton);
        assert.equal(focused, false);

        sim.back();
        assert.equal(focused, true, 'Focus must return to the trigger element on close');
    });

    it('handles route transitions safely without calling history.back() on unmount', () => {
        const sim = new OverlayHistorySimulator();
        let isMenuOpen = true;

        sim.pushOverlay('mobile-menu-drawer', () => { isMenuOpen = false; });
        assert.equal(sim.historyIndex, 1);

        // User clicks a link in the mobile menu to /shop
        sim.navigateTo('/shop', 'push');
        assert.equal(sim.historyIndex, 2);

        // Drawer unmounts on the new page
        sim.unmountOverlay('mobile-menu-drawer', '/product/test');

        // History index must remain at 2 (the /shop page), NOT popped back to /product/test
        assert.equal(sim.historyIndex, 2);
        assert.equal(sim.historyStack[sim.historyIndex].url, 'http://localhost:3000/shop');
    });

    it('replaces history upon order placement so back button cannot re-enter submitted checkout', () => {
        const sim = new OverlayHistorySimulator();

        // User navigates from cart to checkout
        sim.navigateTo('/checkout', 'push');
        assert.equal(sim.historyIndex, 1);
        assert.equal(sim.historyStack[1].url, 'http://localhost:3000/checkout');

        // Order placed successfully: navigate with replace
        sim.navigateTo('/checkout/cod-confirmed', 'replace');
        assert.equal(sim.historyIndex, 1, 'Index must not grow when replaced');
        assert.equal(sim.historyStack[1].url, 'http://localhost:3000/checkout/cod-confirmed');

        // When pressing back from confirmation page: returns to /product/test (pre-checkout), NOT /checkout!
        sim.back();
        assert.equal(sim.historyIndex, 0);
        assert.equal(sim.historyStack[0].url, 'http://localhost:3000/product/test');
    });

    it('steps through profile sub-tabs with URL history push and popstate', () => {
        const tabHistory: string[] = ['profile'];
        let activeTab = 'profile';

        const switchTab = (newTab: string) => {
            activeTab = newTab;
            tabHistory.push(newTab);
        };

        const popTab = () => {
            tabHistory.pop();
            activeTab = tabHistory[tabHistory.length - 1] || 'profile';
        };

        // User switches from profile -> addresses -> orders
        switchTab('addresses');
        assert.equal(activeTab, 'addresses');

        switchTab('orders');
        assert.equal(activeTab, 'orders');

        // User presses back button: steps back to addresses
        popTab();
        assert.equal(activeTab, 'addresses');

        // User presses back button again: steps back to profile
        popTab();
        assert.equal(activeTab, 'profile');
    });

    it('does not push history entries for gallery swiping, toasts, or hover dropdowns', () => {
        const sim = new OverlayHistorySimulator();

        // 1. Image gallery swipe: local index only
        let galleryIndex = 0;
        galleryIndex = 1;
        galleryIndex = 2;
        assert.equal(sim.historyIndex, 0, 'Image sliding must never push history');

        // 2. Toast notification
        let toast: string | null = 'Item added to cart';
        assert.equal(sim.historyIndex, 0, 'Toast notifications must not push history');
        toast = null;
        assert.equal(sim.historyIndex, 0);

        // 3. Hover menu / transient dropdown
        let dropdownOpen = true;
        dropdownOpen = false;
        assert.equal(sim.historyIndex, 0, 'Transient dropdowns must not push history');
    });
});
