/**
 * Component Library - Material Design 3 Components
 * 
 * This file contains specifications for commonly used UI components
 * based on Material Design 3 guidelines. These can be used as templates
 * for building user interfaces.
 * 
 * Implemented:
 * - Accordion (collapsible content sections)
 * - Carousel (sliding content panels)
 * - Progress indicators
 * - Badges
 * 
 * Future components from Material Design 3 spec:
 * 1. Buttons (standard, filled, outlined, text, icon)
 * 2. Floating Action Button (FAB)
 * 3. Extended FAB
 * 4. Icon buttons
 * 5. Segmented buttons
 * 6. Split buttons
 * 7. Loading indicators
 * 8. Snackbars
 * 9. Banners
 * 10. Cards
 * 11. Dialogs
 * 12. Bottom sheets
 * 13. Side sheets
 * 14. Tooltips
 * 15. Lists
 * 16. Dividers
 * 17. Top/Bottom app bars
 * 18. Navigation (bar, rail, drawer)
 * 19. Tabs
 * 20. Search
 * 21. Pagination
 * 22. Checkboxes
 * 23. Radio buttons
 * 24. Switches
 * 25. Sliders
 * 26. Chips
 * 27. Date/Time pickers
 * 28. Menus
 * 29. Text fields (standard, outlined, filled)
 * 30. Text areas
 * 31. Password fields
 * 32. Autocomplete fields
 */

import type { AccordionNode, CarouselNode, ProgressNode, BadgeNode, NodeSpec } from './dsl';

/**
 * Accordion component template
 * A vertically stacked set of expandable sections
 */
export function createAccordion(items: { title: string; content: NodeSpec; defaultExpanded?: boolean }[], options?: { allowMultiple?: boolean }): AccordionNode {
  return {
    type: 'accordion',
    items,
    allowMultiple: options?.allowMultiple ?? false,
  };
}

/**
 * Carousel component template  
 * A horizontal scrolling container for content
 */
export function createCarousel(items: NodeSpec[], options?: { autoPlay?: boolean; interval?: number; showDots?: boolean; showArrows?: boolean }): CarouselNode {
  return {
    type: 'carousel',
    items,
    autoPlay: options?.autoPlay ?? false,
    interval: options?.interval ?? 3000,
    showDots: options?.showDots ?? true,
    showArrows: options?.showArrows ?? true,
  };
}

/**
 * Progress indicator template
 * Shows completion percentage
 */
export function createProgress(value: number, label?: string): ProgressNode {
  return {
    type: 'progress',
    value,
    label,
  };
}

/**
 * Badge component template
 * Small status indicator
 */
export function createBadge(text: string, position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'): BadgeNode {
  return {
    type: 'badge',
    text,
    position: position ?? 'top-right',
  };
}

// Example usage patterns
export const componentExamples = {
  accordion: createAccordion([
    { title: 'Section 1', content: { type: 'text', text: 'Content 1' } },
    { title: 'Section 2', content: { type: 'text', text: 'Content 2' }, defaultExpanded: true },
  ]),
  
  carousel: createCarousel([
    { type: 'box', variant: 'card', children: [{ type: 'text', text: 'Slide 1' }] },
    { type: 'box', variant: 'card', children: [{ type: 'text', text: 'Slide 2' }] },
  ]),
  
  progress: createProgress(75, 'Loading...'),
  
  badge: createBadge('New'),
};
