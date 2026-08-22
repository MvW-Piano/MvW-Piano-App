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
// Iconen (sinds de Neon-herstijling, v0.18.0): niet langer een zelf-
// getekende SVG-set — vervangen door negen pictogrammen uit de door de
// gebruiker aangeleverde "PianoICO_Library" (neon lijntekening,
// cyaan/magenta-kleurverloop op een eigen donkere cirkel-badge, PNG). Elk
// icoon draagt die eigen cirkel-badge AL ingebakken (getekend als onderdeel
// van de PNG) — anders dan de vorige SVG-aanpak hoeft `.tile-icon-wrap` dus
// GEEN losse gradient-achtergrondcirkel meer te leveren, puur de <img> zelf
// tonen (zie styles.css). Bestanden staan in `assets/icons/tile-<id>.png`,
// hernoemd vanaf hun originele volgnummer in de library (zie
// Root_Note_Context.md voor de volledige nummer-toewijzing + hoe die
// gekozen is via een zelfgemaakt contactvel van alle 396 iconen).
const TILE_ICONS = {
  notes: 'assets/icons/tile-notes.png',
  scales: 'assets/icons/tile-scales.png',
  chords: 'assets/icons/tile-chords.png',
  circle: 'assets/icons/tile-circle.png',
  intervals: 'assets/icons/tile-intervals.png',
  progressions: 'assets/icons/tile-progressions.png',
  sightreading: 'assets/icons/tile-sightreading.png',
  theory: 'assets/icons/tile-theory.png',
  piano: 'assets/icons/tile-piano.png'
};
const TilesUI = {
  render(){
    const grid = document.getElementById('tiles-grid');
    if (!grid) return;
    grid.innerHTML = this._orderedRegistry().map(app => this._renderTile(app)).join('');
  },
  // Vaste weergavevolgorde (gebruikersverzoek, sinds v0.18.1): "Under
  // Construction"-tegels (`inert:true`, momenteel alleen Vooruit Lezen)
  // staan ALTIJD helemaal onderaan, met Vrij Spelen (`piano`) daar altijd
  // direct vóór. Gewone tegels behouden onderling gewoon hun
  // TILE_REGISTRY-volgorde. Puur een DISPLAY-sortering — TILE_REGISTRY zelf
  // (app-core.js) blijft de bron van waarheid voor tegel-inhoud/volgorde-
  // basis; zodra een tegel niet langer `inert` is (de oefening is af) valt
  // hij hierdoor vanzelf terug tussen de gewone tegels op zijn eigen
  // registry-positie, geen handmatige volgorde-fix nodig. Werkt ook voor
  // een eventuele TOEKOMSTIGE tweede "Under Construction"-tegel: elke
  // `inert`-tegel verhuist automatisch mee naar onderaan, in hun onderlinge
  // registry-volgorde.
  _orderedRegistry(){
    const normal = TILE_REGISTRY.filter(app => !app.inert && app.id !== 'piano');
    const piano = TILE_REGISTRY.filter(app => app.id === 'piano');
    const inert = TILE_REGISTRY.filter(app => app.inert);
    return [...normal, ...piano, ...inert];
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
      <span class="tile-icon-wrap"><img src="${TILE_ICONS[id] || ''}" alt="" draggable="false"></span>
      <span class="tile-text">
        <span class="tile-label">${label}</span>
        <span class="tile-desc">${desc}</span>
      </span>
    </button>`;
  }
};
