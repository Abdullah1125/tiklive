const paths = {
  studio:'<rect x="3" y="4" width="18" height="15" rx="3"/><path d="M3 9h18m-12 0v10"/>',
  game:'<path d="M7 7h10c2.1 0 3.1 2.3 3.7 5.8.6 3.7.6 5.7-1.8 5.7-1.6 0-3-2.7-4.9-2.7h-4c-1.9 0-3.3 2.7-4.9 2.7-2.4 0-2.4-2-1.8-5.7C3.9 9.3 4.9 7 7 7Z"/><path d="M7.5 10v4m-2-2h4m6.5-1h.1m2 2h.1"/>',
  feed:'<path d="M2 12h4l3-8 4 16 3-10 2 2h4"/>',
  wave:'<circle cx="12" cy="12" r="2"/><path d="M8 7a7 7 0 0 0 0 10m8-10a7 7 0 0 1 0 10M5 4a11 11 0 0 0 0 16M19 4a11 11 0 0 1 0 16"/>',
  monitor:'<rect x="2.5" y="4" width="19" height="14" rx="2.5"/><path d="M8 21h8m-4-3v3"/>',
  link:'<path d="m9 15 6-6m-4-2 2-2a4.5 4.5 0 0 1 6.5 6.5l-3 3m-3 2-2 2a4.5 4.5 0 0 1-6.5-6.5l3-3"/>',
  expand:'<path d="M4 10V4h6m4 0h6v6m0 4v6h-6m-4 0H4v-6"/>',
  controls:'<path d="M4 7h6m5 0h5M4 17h2m5 0h9"/><circle cx="12.5" cy="7" r="2.5"/><circle cx="8.5" cy="17" r="2.5"/>',
  users:'<circle cx="9" cy="8" r="3.5"/><path d="M2 20v-1a7 7 0 0 1 14 0v1m0-15a3.5 3.5 0 0 1 0 7m2 2a6 6 0 0 1 4 6"/>',
  heart:'<path d="M20.8 5.8a5 5 0 0 0-7.1 0L12 7.5l-1.7-1.7a5 5 0 0 0-7.1 7.1L12 21l8.8-8.1a5 5 0 0 0 0-7.1Z"/>',
  gift:'<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9M12 8v13m0-13S5 9 5.5 5.1C6 1 11 4.5 12 8Zm0 0s7 1 6.5-2.9C18 1 13 4.5 12 8Z"/>',
  flag:'<path d="M4 21V3m0 1q4-3 8 0t8 0v9q-4 3-8 0t-8 0"/>',
  chat:'<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l1-4a8.5 8.5 0 1 1 16-4.5Z"/><path d="M8 10h8m-8 4h5"/>',
  arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',
  external:'<path d="M14 3h7v7m0-7L11 13m-1-8H6a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-4"/>',
  pulse:'<path d="m14 2-10 12h7l-1 8 10-13h-7l1-7Z"/>',
  menu:'<path d="m8 10 4 4 4-4"/>',
  close:'<path d="m6 6 12 12M18 6 6 18"/>',
  music:'<path d="M9 17V6l11-3v12M9 9l11-3"/><ellipse cx="6" cy="18" rx="3" ry="2.4"/><ellipse cx="17" cy="16" rx="3" ry="2.4"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
};
export function icon(name) {
  return '<svg class="ico" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+(paths[name] || paths.feed)+'</svg>';
}
export function fillIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach(el => {el.innerHTML = icon(el.dataset.icon);});
}
