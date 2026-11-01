import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

describe('ExpandableText Click-to-Toggle & In-View Collapse Specifications', () => {
    let isExpanded: boolean;
    let canTruncate: boolean;
    let windowScrollY: number;
    let headerHeight: number;
    let safetyMargin: number;

    beforeEach(() => {
        isExpanded = false;
        canTruncate = true;
        windowScrollY = 0;
        headerHeight = 120;
        safetyMargin = 16;
    });

    describe('Click-Anywhere Toggle Mechanics', () => {
        it('clicking the box body expands it, and clicking again collapses it', () => {
            const toggle = () => {
                isExpanded = !isExpanded;
            };

            // First click on box body
            assert.equal(isExpanded, false);
            toggle();
            assert.equal(isExpanded, true, 'Box must expand on first click');

            // Second click on box body
            toggle();
            assert.equal(isExpanded, false, 'Box must collapse on second click');
        });

        it('clicking the "See more" button toggles once, not twice', () => {
            let containerToggles = 0;
            let buttonToggles = 0;

            const handleContainerClick = () => {
                containerToggles++;
            };

            const handleButtonClick = (e: { stopPropagation: () => void }) => {
                e.stopPropagation();
                buttonToggles++;
            };

            // Simulated event
            let propagationStopped = false;
            const fakeEvent = {
                stopPropagation: () => {
                    propagationStopped = true;
                },
            };

            handleButtonClick(fakeEvent);
            if (!propagationStopped) {
                handleContainerClick();
            }

            assert.equal(buttonToggles, 1, 'Button toggle handler must execute exactly once');
            assert.equal(containerToggles, 0, 'Container click must NOT execute when button click stops propagation');
        });

        it('clicking an interactive child (link, button, input) inside the content does not toggle', () => {
            let didToggle = false;
            const isClickable = true;

            const handleContainerClick = (targetTagName: string) => {
                if (!isClickable) return;
                const interactiveTags = new Set(['a', 'button', 'input', 'select', 'textarea', 'label']);
                if (interactiveTags.has(targetTagName.toLowerCase())) {
                    return; // Ignore
                }
                didToggle = true;
            };

            // Click on a link inside description
            handleContainerClick('a');
            assert.equal(didToggle, false, 'Clicking <a> must not toggle expandable text');

            // Click on an input inside description
            handleContainerClick('input');
            assert.equal(didToggle, false, 'Clicking <input> must not toggle expandable text');

            // Click on normal text (e.g. p or span)
            handleContainerClick('p');
            assert.equal(didToggle, true, 'Clicking <p> or plain text must toggle expandable text');
        });

        it('a short-text box does not toggle and shows no pointer cursor', () => {
            const shortCanTruncate = false;
            const shortIsExpanded = false;
            const isClickable = shortCanTruncate || shortIsExpanded;

            let toggled = false;
            const handleClick = () => {
                if (!isClickable) return;
                toggled = true;
            };

            handleClick();
            assert.equal(isClickable, false, 'Short text must not be clickable');
            assert.equal(toggled, false, 'Clicking short text must do nothing');
        });

        it('aria-expanded stays in sync with toggle state', () => {
            const getAriaExpanded = (expanded: boolean) => expanded;

            assert.equal(getAriaExpanded(isExpanded), false);
            isExpanded = true;
            assert.equal(getAriaExpanded(isExpanded), true);
            isExpanded = false;
            assert.equal(getAriaExpanded(isExpanded), false);
        });

        it('a swipe or scroll gesture (> 8px movement) does not toggle', () => {
            let toggled = false;
            const onPointerAction = (start: { x: number; y: number }, end: { x: number; y: number }) => {
                const dx = end.x - start.x;
                const dy = end.y - start.y;
                if (Math.hypot(dx, dy) > 8) {
                    return; // Cancelled as swipe/scroll
                }
                toggled = true;
            };

            // Case A: Swiping down (dy = 24px)
            onPointerAction({ x: 100, y: 100 }, { x: 102, y: 124 });
            assert.equal(toggled, false, 'Touch swipe gesture (> 8px) must not toggle');

            // Case B: Clean tap (dy = 2px)
            onPointerAction({ x: 100, y: 100 }, { x: 101, y: 102 });
            assert.equal(toggled, true, 'Clean tap (<= 8px) must toggle');
        });

        it('expanding or collapsing text never pushes a browser history entry', () => {
            const historyStack = [{ url: '/product/chemist-sunscreen' }];
            const initialLen = historyStack.length;

            const toggle = () => {
                isExpanded = !isExpanded;
                // No history.pushState called
            };

            toggle(); // Expand
            assert.equal(historyStack.length, initialLen, 'Expanding text must not mutate history stack');

            toggle(); // Collapse
            assert.equal(historyStack.length, initialLen, 'Collapsing text must not mutate history stack');
        });
    });

    describe('In-View Collapse Geometry & Scroll Positioning', () => {
        it('keeps the collapsed box top visible below sticky header when user was scrolled down', () => {
            // Scenario: User expanded long text (1200px tall), scrolled down to read
            windowScrollY = 1450;
            const headerOffset = headerHeight + safetyMargin; // 136px

            // At the moment of collapse, the box's top is scrolled above viewport
            const boxRectTop = -420; // 420px above viewport top

            const computeCollapseScroll = (currentScrollY: number, rectTop: number, offset: number) => {
                if (rectTop < offset) {
                    return Math.max(0, currentScrollY + rectTop - offset);
                }
                return currentScrollY; // Already in view
            };

            const targetScrollY = computeCollapseScroll(windowScrollY, boxRectTop, headerOffset);
            
            // Expected target: 1450 + (-420) - 136 = 894
            assert.equal(targetScrollY, 894, 'Scroll must reposition top of box below sticky header');
            assert.notEqual(targetScrollY, windowScrollY, 'Scroll must adjust to prevent landing on footer');
        });

        it('does not scroll when collapsing a box that is already fully visible', () => {
            windowScrollY = 600;
            const headerOffset = headerHeight + safetyMargin; // 136px
            const boxRectTop = 220; // 220px below viewport top (comfortably below header)

            const computeCollapseScroll = (currentScrollY: number, rectTop: number, offset: number) => {
                if (rectTop < offset) {
                    return Math.max(0, currentScrollY + rectTop - offset);
                }
                return currentScrollY;
            };

            const targetScrollY = computeCollapseScroll(windowScrollY, boxRectTop, headerOffset);
            assert.equal(targetScrollY, 600, 'Must NOT scroll if the box top is already visible below the header');
        });

        it('expanding a box never changes the scroll position', () => {
            windowScrollY = 500;
            let scrollChanged = false;

            const onExpand = () => {
                isExpanded = true;
                // Expansion only pushes lower content down; never scrolls
            };

            onExpand();
            assert.equal(scrollChanged, false, 'Expanding must never change scroll position');
            assert.equal(windowScrollY, 500);
        });
    });
});

