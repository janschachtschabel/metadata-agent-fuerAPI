/**
 * Zone.js flags — must be imported BEFORE zone.js.
 *
 * PASSIVE_EVENTS: Register these listeners as passive (no preventDefault),
 * eliminating Chrome "[Violation] Added non-passive event listener" warnings.
 *
 * UNPATCHED_EVENTS: Zone.js will NOT monkey-patch these events at all.
 * This means they do NOT trigger Angular change detection — critical for
 * scroll/pointer performance when the web component is embedded in external pages.
 */
(window as any).__zone_symbol__PASSIVE_EVENTS = ['scroll', 'wheel', 'touchstart', 'touchmove', 'touchend'];
(window as any).__zone_symbol__UNPATCHED_EVENTS = ['scroll', 'wheel', 'mousemove', 'mouseenter', 'mouseleave', 'pointermove', 'pointerover', 'pointerout', 'touchmove'];
