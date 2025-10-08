/**
 * Prevents Angular change detection from
 * running with certain Web Component callbacks
 */
// eslint-disable-next-line no-underscore-dangle
(window as any).__Zone_disable_customElements = true;

// Marcar eventos de entrada como 'passive' para evitar advertencias de listeners no pasivos
// Más info: https://angular.io/guide/zone
// eslint-disable-next-line no-underscore-dangle
(window as any).__zone_symbol__PASSIVE_EVENTS = ['touchstart', 'touchmove', 'touchend', 'touchcancel', 'wheel', 'mousewheel'];

// Opcional: despatchar algunos eventos para que Zone.js no los parchee
// eslint-disable-next-line no-underscore-dangle
(window as any).__zone_symbol__UNPATCHED_EVENTS = ['scroll', 'mousemove'];
