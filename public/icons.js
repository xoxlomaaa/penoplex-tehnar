const paths={
 link:'<path d="m10 8 2-2a4 4 0 0 1 6 6l-2 2M14 16l-2 2a4 4 0 0 1-6-6l2-2M9 15l6-6"/>',
 previous:'<path d="M6 5v14M17 5l-9 7 9 7V5Z"/>',
 arrow:'<path d="M7 17 17 7M7 7h10v10"/>',
 play:'<path d="m9 5 11 7-11 7V5Z"/>',
 help:'<circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.3 2.3 0 0 1 4.5.7c0 1.6-2.3 2-2.3 3.6M12 17h.01"/>',
 minus:'<path d="M5 12h14"/>',plus:'<path d="M5 12h14M12 5v14"/>',
 reset:'<path d="M4 9a8 8 0 1 1 0 6M4 4v5h5"/>',
 layers:'<path d="m12 3 10 5-10 5L2 8l10-5ZM2 12l10 5 10-5M2 16l10 5 10-5"/>',
 download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
 focus:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/><circle cx="12" cy="12" r="4"/>',
 isolate:'<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3ZM4 7.5l8 4.5 8-4.5M12 12v9"/>',
 close:'<path d="m6 6 12 12M6 18 18 6"/>',
 back:'<path d="M19 12H5m6-6-6 6 6 6"/>',
 chevron:'<path d="m8 10 4 4 4-4"/>',
 document:'<path d="M14 2H5v20h14V7l-5-5Zm0 0v6h5M8 12h8M8 16h6"/>',
};
export const icon=name=>`<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name]||paths.arrow}</svg>`;
