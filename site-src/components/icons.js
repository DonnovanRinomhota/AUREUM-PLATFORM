/* Gold-line icons (24×24, stroke = currentColor). */
const P = {
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  cube: '<path d="M12 2l9 5v10l-9 5-9-5V7z"/><path d="M12 12l9-5M12 12L3 7M12 12v10"/>',
  cloud: '<path d="M7 18a4 4 0 0 1-.6-7.95A6 6 0 0 1 18 9.6 4.5 4.5 0 0 1 17.5 18z"/>',
  shield: '<path d="M12 2l8 3v6c0 5-3.4 9-8 11-4.6-2-8-6-8-11V5z"/>',
  shieldCheck: '<path d="M12 2l8 3v6c0 5-3.4 9-8 11-4.6-2-8-6-8-11V5z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  cart: '<path d="M3 4h2l2.4 11h10.2l2-8H6.2"/><circle cx="9" cy="19.5" r="1.4"/><circle cx="17" cy="19.5" r="1.4"/>',
  chart: '<path d="M5 20V12M12 20V5M19 20v-9"/><path d="M3 20h18"/>',
  bread: '<path d="M5 11c0-3 3-5 7-5s7 2 7 5c0 1-.6 1.8-1.5 2.2V18a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-4.8C5.6 12.8 5 12 5 11z"/>',
  store: '<path d="M4 9l1.6-5h12.8L20 9"/><path d="M4 9c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3"/><path d="M5 12v8h14v-8"/>',
  basket: '<path d="M3 10h18l-2 9H5z"/><path d="M8 10l3-6M16 10l-3-6"/>',
  hanger: '<path d="M12 8V6.5a2 2 0 1 0-2-2"/><path d="M12 8l9 6.2a1 1 0 0 1-.6 1.8H3.6A1 1 0 0 1 3 14.2z"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  truck: '<path d="M2 6h11v10H2zM13 9h4l3 3v4h-7"/><circle cx="7" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.3a6.5 6.5 0 0 1 3.5 5.7"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9L7 7M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"/>',
  lifebuoy: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5"/><path d="M5.6 5.6l3.9 3.9M14.5 14.5l3.9 3.9M18.4 5.6l-3.9 3.9M9.5 14.5l-3.9 3.9"/>',
  play: '<path d="M7 4.5v15l12-7.5z" fill="currentColor"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>'
};
export const icon = (name, size = 24, cls = 'ic') =>
  `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${P[name] || ''}</svg>`;
