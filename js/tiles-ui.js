// Tegel-overzicht (sinds v0.17.5, gebruikersverzoek: MIDI-vereisende en
// MIDI-vrije oefeningen liepen "kriskras door elkaar") — bouwt #tiles-grid
// volledig op uit TILE_REGISTRY (app-core.js), de enige bron van waarheid.
// Geen tegels met de hand in index.html, zodat een taalwissel/toekomstige
// module-toevoeging alleen de registry hoeft aan te passen.
// Geconsolideerd naar 1 tegel per app (was 17 tegels/9 groepen — één per
// App+Modus, gaf scroll-behoefte en onduidelijke groepering, zie
// Root_Note_Context.md): een klik opent de app direct in zijn laatst
// gebruikte modus (App.enterModule met modeValue=null, zie daar), de
// Modus-keuze zelf gebeurt nu in de app-header (App.renderModeSwitcher) —
// geen tussenstap meer. De badge op de tegel toont de MIDI-tier van de
// EERSTE/standaard modus (meestal "Flashcards"), dus "wat krijg ik als ik
// hierop klik".
// Layout: icoon links, titel+omschrijving ernaast op dezelfde knop
// (horizontaal), sluit aan bij de vormgeving van een eerdere logo-
// referentie van de gebruiker.
//
// Iconen (sinds de logo-herzieningsronde): de eerder uit een referentie-
// mockup geëxtraheerde PNG's waren op de tegel-achtergrond niet goed
// leesbaar (te veel blauw-op-blauw) — vervangen door een zelf-getekende,
// consistente SVG-set (TILE_ICONS), één simpel wit lijn-icoon per app-`id`,
// altijd getoond op een effen accent-gloed-cirkel (zie .tile-icon-wrap in
// styles.css: `background:linear-gradient(var(--accent),var(--accent-2))`)
// — wit-op-verzadigd-kleurverloop geeft in beide thema's gegarandeerd
// voldoende contrast, i.p.v. te vertrouwen op een subtiele tint-op-tint
// combinatie. Elk icoon is een klein, herkenbaar symbool voor wat de
// oefening inhoudelijk doet (notenbalk+noten, oplopende toonladder-trapjes,
// gestapeld akkoord, kwintencirkel-wiel, interval-maatstreepjes,
// akkoordprogressie-lijngrafiek, vooruitlezen-pijl, opengeslagen boek,
// pianotoetsen) — bewust GEEN emoji (rendert inconsistent per OS/browser)
// en geen fotorealistische illustraties (zouden qua stijl niet
// samenhangen). viewBox 24x24, alle strokes `currentColor` zodat de
// tegel-CSS de kleur (wit) op één plek bepaalt.
const TILE_ICONS = {
  notes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="11" x2="21" y2="11"/><line x1="3" y1="15" x2="21" y2="15"/><circle cx="8" cy="17" r="2.1" fill="currentColor" stroke="none"/><line x1="10" y1="17" x2="10" y2="6"/><circle cx="16" cy="9" r="2.1" fill="currentColor" stroke="none"/><line x1="18" y1="9" x2="18" y2="19"/></svg>',
  scales: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18 L8 18 L8 14 L13 14 L13 10 L18 10 L18 6 L21 6"/><circle cx="8" cy="18" r="1.4" fill="currentColor" stroke="none"/><circle cx="13" cy="14" r="1.4" fill="currentColor" stroke="none"/><circle cx="18" cy="10" r="1.4" fill="currentColor" stroke="none"/></svg>',
  chords: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="8.5" cy="18" rx="3.4" ry="2.5" fill="currentColor" stroke="none" transform="rotate(-18 8.5 18)"/><ellipse cx="8.5" cy="12.3" rx="3.4" ry="2.5" fill="currentColor" stroke="none" transform="rotate(-18 8.5 12.3)"/><ellipse cx="8.5" cy="6.6" rx="3.4" ry="2.5" fill="currentColor" stroke="none" transform="rotate(-18 8.5 6.6)"/><line x1="11.6" y1="6.6" x2="11.6" y2="18"/></svg>',
  circle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.5"/><line x1="12" y1="3.5" x2="12" y2="5.2"/><line x1="12" y1="18.8" x2="12" y2="20.5"/><line x1="3.5" y1="12" x2="5.2" y2="12"/><line x1="18.8" y1="12" x2="20.5" y2="12"/></svg>',
  intervals: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4 L18 4"/><path d="M6 4 L8.5 1.5 M6 4 L8.5 6.5"/><path d="M18 4 L15.5 1.5 M18 4 L15.5 6.5"/><line x1="3" y1="12" x2="21" y2="12"/><circle cx="8" cy="14.5" r="2.1" fill="currentColor" stroke="none"/><line x1="10" y1="14.5" x2="10" y2="9"/><circle cx="16" cy="9.5" r="2.1" fill="currentColor" stroke="none"/><line x1="18" y1="9.5" x2="18" y2="15"/></svg>',
  progressions: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18 L9 11 L14 14 L21 5"/><circle cx="3" cy="18" r="1.6" fill="currentColor" stroke="none"/><circle cx="9" cy="11" r="1.6" fill="currentColor" stroke="none"/><circle cx="14" cy="14" r="1.6" fill="currentColor" stroke="none"/><circle cx="21" cy="5" r="1.6" fill="currentColor" stroke="none"/></svg>',
  sightreading: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="2" y1="8" x2="14" y2="8"/><line x1="2" y1="12" x2="14" y2="12"/><line x1="2" y1="16" x2="14" y2="16"/><circle cx="6" cy="16" r="1.7" fill="currentColor" stroke="none"/><path d="M15 6 L21 12 L15 18"/></svg>',
  theory: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5 C10 3.5 6 3 3 3.5 L3 17 C6 16.5 10 17 12 18.5 C14 17 18 16.5 21 17 L21 3.5 C18 3 14 3.5 12 5 Z"/><line x1="12" y1="5" x2="12" y2="18.5"/></svg>',
  piano: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="1.5"/><line x1="7.5" y1="5" x2="7.5" y2="19"/><line x1="12" y1="5" x2="12" y2="19"/><line x1="16.5" y1="5" x2="16.5" y2="19"/><rect x="6" y="5" width="3" height="8" fill="currentColor" stroke="none"/><rect x="14.5" y="5" width="3" height="8" fill="currentColor" stroke="none"/></svg>'
};
const TilesUI = {
  render(){
    const grid = document.getElementById('tiles-grid');
    if (!grid) return;
    grid.innerHTML = TILE_REGISTRY.map(app => this._renderTile(app)).join('');
  },
  _renderTile(app){
    if (app.inert){
      // Vooruit Lezen — gewone, klikbare knop, maar de klik doet bewust
      // NIETS (geen onclick-attribuut): de module-code blijft ongewijzigd
      // tijdelijk uitgeschakeld, zie Root_Note_Context.md.
      return this._tileMarkup({
        id: app.id, label: Lang.t(app.navKey), desc: Lang.t(app.descKey),
        badge: `<span class="tile-badge tile-badge-construction">${Lang.t('tileUnderConstruction')}</span>`,
        extraClass: 'tile-disabled', onclick: null
      });
    }
    const tier = app.modes ? app.modes[0].tier : app.tier;
    return this._tileMarkup({
      id: app.id, label: Lang.t(app.navKey), desc: Lang.t(app.descKey),
      badge: this._badge(tier), extraClass: '',
      onclick: `App.enterModule('${app.id}',null)`
    });
  },
  // Kleurcodering per MIDI-tier: groen = optioneel (mag ook zonder MIDI),
  // amber = verplicht — zelfde soort onderscheid als de groen/rood
  // correct/fout-kleuren die elders in de app al gebruikt worden (zie
  // bijv. .sr-good/.sr-bad), dus geen nieuwe kleurtaal geïntroduceerd.
  _badge(tier){
    if (tier === 'enabled') return `<span class="tile-badge tile-badge-enabled">${Lang.t('tileMidiEnabled')}</span>`;
    if (tier === 'only') return `<span class="tile-badge tile-badge-only">${Lang.t('tileMidiOnly')}</span>`;
    return '';
  },
  _tileMarkup({ id, label, desc, badge, extraClass, onclick }){
    const onclickAttr = onclick ? ` onclick="${onclick}"` : '';
    return `<button type="button" class="tile-btn ${extraClass}"${onclickAttr}>
      ${badge}
      <span class="tile-icon-wrap">${TILE_ICONS[id] || ''}</span>
      <span class="tile-text">
        <span class="tile-label">${label}</span>
        <span class="tile-desc">${desc}</span>
      </span>
    </button>`;
  }
};
