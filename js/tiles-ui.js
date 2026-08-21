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
// EERSTE/standaard modus (meestal "Kaarten", altijd zonder MIDI te
// gebruiken voor apps die ook een MIDI-only modus hebben), dus "wat krijg
// ik als ik hierop klik".
// Layout sinds de logo-ronde (gebruikersverzoek): icoon LINKS, titel+
// omschrijving ERNAAST op dezelfde knop (horizontaal), i.p.v. de eerdere
// gecentreerde verticale stapel — sluit aan bij de vormgeving van de
// meegeleverde logo-referentie. `iconImg` (PNG, zie TILE_REGISTRY) heeft
// voorrang; apps zonder eigen logo (momenteel alleen Akkoorden) vallen
// terug op hun emoji (`icon`).
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
        icon: app.icon, iconImg: app.iconImg, label: Lang.t(app.navKey), desc: Lang.t(app.descKey),
        badge: `<span class="tile-badge tile-badge-construction">${Lang.t('tileUnderConstruction')}</span>`,
        extraClass: 'tile-disabled', onclick: null
      });
    }
    const tier = app.modes ? app.modes[0].tier : app.tier;
    return this._tileMarkup({
      icon: app.icon, iconImg: app.iconImg, label: Lang.t(app.navKey), desc: Lang.t(app.descKey),
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
  _tileMarkup({ icon, iconImg, label, desc, badge, extraClass, onclick }){
    const onclickAttr = onclick ? ` onclick="${onclick}"` : '';
    const iconMarkup = iconImg
      ? `<img class="tile-icon-img" src="${iconImg}" alt="" draggable="false">`
      : `<span class="tile-icon">${icon}</span>`;
    return `<button type="button" class="tile-btn ${extraClass}"${onclickAttr}>
      ${badge}
      <span class="tile-icon-wrap">${iconMarkup}</span>
      <span class="tile-text">
        <span class="tile-label">${label}</span>
        <span class="tile-desc">${desc}</span>
      </span>
    </button>`;
  }
};
