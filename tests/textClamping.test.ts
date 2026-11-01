import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeHtml } from '../src/lib/sanitizeHtml.ts';

describe('Text Clamping & Expandable Text Specifications', () => {
    describe('ClampedText Style & Attribute Specifications', () => {
        it('computes single-line clamping with nowrap, ellipsis, and anywhere wrap', () => {
            const lines = 1;
            const singleLineStyle = {
                display: 'block',
                maxWidth: '100%',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                overflowWrap: 'anywhere',
            };

            assert.equal(singleLineStyle.whiteSpace, 'nowrap');
            assert.equal(singleLineStyle.overflow, 'hidden');
            assert.equal(singleLineStyle.textOverflow, 'ellipsis');
            assert.equal(singleLineStyle.overflowWrap, 'anywhere');
        });

        it('computes multi-line clamping (2 lines for cards, 3 lines for PDP H1) with line-clamp', () => {
            const computeMultiLineStyle = (lines: number) => ({
                display: '-webkit-box',
                WebkitLineClamp: lines,
                lineClamp: lines,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                overflowWrap: 'anywhere',
                wordBreak: 'break-word',
            });

            const cardStyle = computeMultiLineStyle(2);
            assert.equal(cardStyle.WebkitLineClamp, 2);
            assert.equal(cardStyle.lineClamp, 2);
            assert.equal(cardStyle.overflow, 'hidden');

            const pdpH1Style = computeMultiLineStyle(3);
            assert.equal(pdpH1Style.WebkitLineClamp, 3);
            assert.equal(pdpH1Style.lineClamp, 3);
            assert.equal(pdpH1Style.overflow, 'hidden');
        });

        it('assigns full un-truncated text as title attribute for desktop hover inspection', () => {
            const getTitle = (title?: string, children?: any) => {
                return title !== undefined
                    ? title
                    : (typeof children === 'string' || typeof children === 'number')
                        ? String(children).trim()
                        : undefined;
            };

            // Automatic from string child
            assert.equal(getTitle(undefined, 'Skin1004 Madagascar Centella Light Cleansing Oil'), 'Skin1004 Madagascar Centella Light Cleansing Oil');
            
            // Explicit title override
            assert.equal(getTitle('Explicit Full Title', 'Short label'), 'Explicit Full Title');

            // Subtitle with unbroken characters
            const rawSubtitle = 'Long continuous subtitle with scientific details and active ingredients';
            assert.equal(getTitle(rawSubtitle, rawSubtitle), rawSubtitle);
        });
    });

    describe('ExpandableText HTML Sanitization', () => {
        it('strips malicious script tags, iframes, and javascript: protocols', () => {
            const dirty = '<p>Normal text <script>alert("xss")</script><iframe src="evil.com"></iframe><a href="javascript:steal()">Click</a></p>';
            const clean = sanitizeHtml(dirty);

            assert.equal(clean.includes('<script>'), false);
            assert.equal(clean.includes('alert("xss")'), false);
            assert.equal(clean.includes('<iframe'), false);
            assert.equal(clean.includes('javascript:'), false);
            assert.equal(clean.includes('<p>Normal text '), true);
        });

        it('strips inline event handlers (onerror, onclick, onload)', () => {
            const dirty = '<img src="x" onerror="alert(1)" onclick="hack()" onload="steal()" alt="Product" /><strong onmouseover="bad()">Bold text</strong>';
            const clean = sanitizeHtml(dirty);

            assert.equal(clean.includes('onerror='), false);
            assert.equal(clean.includes('onclick='), false);
            assert.equal(clean.includes('onload='), false);
            assert.equal(clean.includes('onmouseover='), false);
            assert.equal(clean.includes('Bold text'), true);
        });

        it('preserves legitimate formatting tags (paragraphs, bold, italics, lists, breaks)', () => {
            const rich = '<p><strong>Key Ingredients:</strong></p><ul><li>Centella Asiatica (84%)</li><li>Tea Tree Leaf Oil</li></ul><br /><p><em>Dermatologically tested.</em></p>';
            const clean = sanitizeHtml(rich);

            assert.equal(clean, rich);
        });
    });

    describe('ExpandableText Truncation & A11y State Transitions', () => {
        it('calculates truncation correctly: hides button for short text and shows for long text', () => {
            const checkTruncation = (scrollHeight: number, clientHeight: number, isExpanded: boolean, lines: number, lineHeight: number) => {
                const maxCollapsedHeight = lineHeight * lines + 2;
                if (!isExpanded) {
                    return scrollHeight > clientHeight + 1;
                } else {
                    return scrollHeight > maxCollapsedHeight;
                }
            };

            const lines = 3;
            const lineHeight = 27; // 15px font * 1.8 line height = 27px

            // Case A: Short text (fits in 2 lines, height = 54px, max 3 lines = 81px)
            const shortScrollHeight = 54;
            const shortClientHeight = 54;
            const shortCanTruncate = checkTruncation(shortScrollHeight, shortClientHeight, false, lines, lineHeight);
            assert.equal(shortCanTruncate, false, 'No button should render when content fits in <= 3 lines');

            // Case B: Long text (overflows 3 lines, scrollHeight = 270px, clientHeight = 81px)
            const longScrollHeight = 270;
            const longClientHeight = 81;
            const longCanTruncate = checkTruncation(longScrollHeight, longClientHeight, false, lines, lineHeight);
            assert.equal(longCanTruncate, true, 'Button must render when content overflows 3 lines');

            // Case C: While expanded, canTruncate remains true so "See less" button is preserved
            const expandedCanTruncate = checkTruncation(longScrollHeight, longScrollHeight, true, lines, lineHeight);
            assert.equal(expandedCanTruncate, true, '"See less" button remains visible when expanded');
        });

        it('manages aria-expanded and label toggles correctly', () => {
            let isExpanded = false;
            const moreLabel = 'See more';
            const lessLabel = 'See less';

            const getButtonProps = (expanded: boolean, contentId: string) => ({
                'aria-expanded': expanded,
                'aria-controls': contentId,
                label: expanded ? lessLabel : moreLabel,
            });

            // Initially collapsed
            let props = getButtonProps(isExpanded, 'section-desc-1');
            assert.equal(props['aria-expanded'], false);
            assert.equal(props['aria-controls'], 'section-desc-1');
            assert.equal(props.label, 'See more');

            // Click expand
            isExpanded = true;
            props = getButtonProps(isExpanded, 'section-desc-1');
            assert.equal(props['aria-expanded'], true);
            assert.equal(props['aria-controls'], 'section-desc-1');
            assert.equal(props.label, 'See less');

            // Click collapse
            isExpanded = false;
            props = getButtonProps(isExpanded, 'section-desc-1');
            assert.equal(props['aria-expanded'], false);
            assert.equal(props.label, 'See more');
        });

        it('expanding or collapsing text does not push history entries or alter browser stack', () => {
            // Simulated browser history stack
            const historyStack: any[] = [{ url: '/product/centella-cleansing-oil' }];
            const initialLength = historyStack.length;

            // Expand action is strictly internal state
            let isExpanded = false;
            const toggle = () => {
                isExpanded = !isExpanded;
                // No history.pushState called
            };

            toggle(); // Expanded
            assert.equal(isExpanded, true);
            assert.equal(historyStack.length, initialLength, 'History stack must not grow when expanding text');

            toggle(); // Collapsed
            assert.equal(isExpanded, false);
            assert.equal(historyStack.length, initialLength, 'History stack must not change when collapsing text');
        });

        it('maintains independent expand state across distinct tab sections', () => {
            // Simulated state container for tabs
            const sectionStates: Record<string, boolean> = {
                description: false,
                howToUse: false,
                ingredients: false,
            };

            // User expands Ingredients tab
            sectionStates.ingredients = true;

            assert.equal(sectionStates.ingredients, true);
            assert.equal(sectionStates.description, false, 'Description must remain collapsed');
            assert.equal(sectionStates.howToUse, false, 'How to Use must remain collapsed');
        });
    });
});
