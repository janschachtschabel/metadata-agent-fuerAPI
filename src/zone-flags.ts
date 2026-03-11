/**
 * Zone.js flags — must be imported BEFORE zone.js.
 * Tells zone.js to register scroll/wheel/touch event listeners as passive,
 * eliminating the Chrome "[Violation] Added non-passive event listener
 * to a scroll-blocking event" warnings.
 */
(window as any).__zone_symbol__PASSIVE_EVENTS = ['scroll', 'wheel', 'touchstart', 'touchmove', 'touchend'];
