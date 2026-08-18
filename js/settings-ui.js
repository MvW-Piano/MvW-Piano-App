// Instellingen-paneel (drawer): opent/sluit #settings-drawer. Vervangt de
// oude breed-scherm-header-rij + inklapbaar mobiel paneel door één simpel
// opt-in mechanisme, gelijk op elke schermbreedte.
const SettingsUI = {
  toggleDrawer(force){
    const d = document.getElementById('settings-drawer');
    const bd = document.getElementById('settings-drawer-backdrop');
    const open = typeof force === 'boolean' ? force : !d.classList.contains('open');
    d.classList.toggle('open', open);
    bd.classList.toggle('open', open);
  }
};
