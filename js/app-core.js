// Iconen voor de instellingenbalk. fill/stroke="currentColor" zodat ze de
// tekstkleur van hun ouder-element volgen (var(--text-muted) e.d.) i.p.v.
// een hardcoded kleur — werkt daardoor vanzelf mee met het licht/donker-thema.
const UI_ICONS = {
  autoAdvance: `<svg class="aa-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M4 12a8 8 0 0 1 13.66-5.66L20 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <path d="M20 4v4h-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M20 12a8 8 0 0 1-13.66 5.66L4 16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <path d="M4 20v-4h4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="12" y="15" font-size="10.5" font-weight="800" text-anchor="middle" fill="currentColor" font-family="Inter, sans-serif">A</text>
  </svg>`,
  delay: `<svg class="aa-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="2"/>
    <path d="M12 7v5l3.5 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`
};
const App = {
  currentModule: null, history: [], historyIndex: -1,

  handleFileUpload(e){ const files = e.target.files; if (files && files.length > 0) AudioEngine.loadSamples(files); },

  // Knop-handler voor het map-icoontje. Ondersteunde browser: hergebruikt
  // een eerder gekozen map (met een korte toestemmings-bevestiging i.p.v.
  // opnieuw doorbladeren); niet-ondersteunde browser: precies het oude
  // gedrag (klassieke bestandenkiezer).
  async pickSamplesFolder(){
    if (!FileAccess.supported()){
      document.getElementById('global-sample-upload').click();
      return;
    }
    try {
      let handle = await FileAccess.getSavedHandle();
      if (handle){
        let perm = await handle.queryPermission({ mode: 'read' });
        if (perm !== 'granted') perm = await handle.requestPermission({ mode: 'read' });
        if (perm !== 'granted') handle = null;
      }
      if (!handle){
        handle = await window.showDirectoryPicker();
        await FileAccess.saveHandle(handle);
      }
      const files = await FileAccess.collectFiles(handle);
      if (files.length > 0) AudioEngine.loadSamples(files);
      else console.warn('🎹 Geen .wav/.mp3-bestanden gevonden in de gekozen map.');
    } catch(err){
      if (err.name !== 'AbortError') console.warn('🎹 Samples-map kiezen mislukt of geweigerd:', err);
    }
  },

  // Bij het opstarten: als er al eerder een map gekozen is ÉN de browser de
  // toegang nog steeds toestaat, worden de samples stil herladen — geen
  // klik nodig. queryPermission() vereist (in tegenstelling tot
  // requestPermission()) geen user-gesture, dus dit mag hier automatisch.
  // Is de toestemming verlopen/ingetrokken, dan gebeurt er stilletjes
  // niets; de gebruiker kan alsnog op het map-icoontje klikken.
  async tryAutoLoadSamples(){
    if (!FileAccess.supported()) return;
    try {
      const handle = await FileAccess.getSavedHandle();
      if (!handle) return;
      const perm = await handle.queryPermission({ mode: 'read' });
      if (perm !== 'granted') return;
      const files = await FileAccess.collectFiles(handle);
      if (files.length > 0) await AudioEngine.loadSamples(files);
    } catch(err){ console.warn('🎹 Automatisch herladen van samples mislukt:', err); }
  },

  // Reset-knop: zet alle instellingen (per module + thema) terug naar
  // standaard. Raakt bewust NIET de onthouden samples-map aan — dat is een
  // losstaande, expliciet gekozen voorkeur, geen "instelling" in dezelfde
  // zin, en opnieuw moeten kiezen zou de hele reden voor die functie
  // tenietdoen.
  resetAllSettings(){
    if (!confirm(Lang.t('resetConfirm'))) return;
    Object.keys(localStorage).filter(k => k.startsWith('pm_')).forEach(k => localStorage.removeItem(k));
    location.reload();
  },

  init(){
    document.getElementById('init-overlay').style.display = 'none';
    AudioEngine.init();
    MidiEngine.init();
    this.tryAutoLoadSamples();
    this.loadModule('notes');
  },

  toggleFullscreen(){
    const isFs = document.fullscreenElement || document.webkitFullscreenElement;
    if (!isFs){
      const el = document.documentElement;
      const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
      if (req) req.call(el).catch(() => {});
      else alert('Volledig scherm wordt door deze browser niet ondersteund.');
    } else {
      const exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
      if (exit) exit.call(document);
    }
  },

  // Instellingen wonen in #quick-controls; dat element verhuist eenmalig
  // (met al zijn knoppen/listeners intact) naar het instellingen-paneel
  // (drawer, zie SettingsUI) — daarna hoeft dit niets meer te doen zolang
  // het al op zijn plek staat. Vervangt de oude breed/smal-scherm-splitsing
  // (header-rij vs. inklapbaar paneel): de drawer werkt nu overal hetzelfde.
  moveQuickControlsToDrawer(){
    const qc = document.getElementById('quick-controls');
    const body = document.getElementById('settings-drawer-body');
    if (qc && body && qc.parentElement !== body) body.appendChild(qc);
  },

  loadModule(moduleId){
    this.clearAutoTimers();
    this.unwireMidiChordCheck();
    this.currentModule = moduleId;
    const ws = document.getElementById('workspace');
    if (ws) ws.scrollTop = 0;

    document.querySelectorAll('.nav-item, .bnav-item').forEach(el => el.classList.remove('active'));
    const activeNav = document.getElementById('nav-' + moduleId);
    if (activeNav) activeNav.classList.add('active');
    const activeBnav = document.getElementById('bnav-' + moduleId);
    if (activeBnav) activeBnav.classList.add('active');

    const flashUI = document.getElementById('flashcard-ui');
    const pianoUI = document.getElementById('piano-module');
    const quickControls = document.getElementById('quick-controls');
    const swipeHint = document.getElementById('swipe-hint');
    const settingsBtn = document.getElementById('settings-btn');
    document.getElementById('interval-extra-controls').style.display = 'none';
    SettingsUI.toggleDrawer(false);

    if (moduleId === 'piano'){
      flashUI.style.display = 'none'; swipeHint.style.display = 'none';
      pianoUI.style.display = 'flex'; quickControls.innerHTML = ''; settingsBtn.style.display = 'none';
      document.getElementById('module-title').innerText = Lang.t('nav_piano');
      PianoUI.init();
    } else {
      flashUI.style.display = 'flex'; swipeHint.style.display = 'block';
      pianoUI.style.display = 'none'; settingsBtn.style.display = 'inline-flex';

      document.getElementById('score-paper').style.display = 'none';
      document.getElementById('svg-container').style.display = 'none';
      document.getElementById('text-quiz').style.display = 'none';
      document.getElementById('answer-display').classList.remove('visible');

      this.buildSettings(moduleId);
      this.moveQuickControlsToDrawer();
      this.history = []; this.historyIndex = -1;
      this.nextQuestion();
      if (moduleId === 'chords') this.wireMidiChordCheck();
    }
  },

  // ---- MIDI-akkoordcontrole (Fase 2.2, bouwt op MidiEngine uit Fase 1.1) ----
  // Alleen actief zolang de Akkoorden-module open staat ÉN er een MIDI-
  // apparaat verbonden is (zie MidiEngine.connected) — zonder verbonden
  // apparaat kan een gebruiker vanaf dit scherm sowieso niets spelen (het
  // virtuele klavier leeft alleen in de losse "Vrij Spelen"-module), dus
  // zou de statustekst dan alleen verwarrend zijn. Volledig ADDITIEF: de
  // bestaande zelfbeoordelingsknoppen (Toon Antwoord/Vorige/Volgende)
  // blijven precies zoals ze waren.
  _midiChordBound: null,
  _midiChordDebounce: null,
  _midiChordAdvancing: false,

  wireMidiChordCheck(){
    if (!MidiEngine.connected) return;
    const status = document.getElementById('midi-answer-status');
    if (!status) return;
    status.style.display = 'block';
    status.className = '';
    status.textContent = Lang.t('midiChordListening');
    this._midiChordAdvancing = false;
    this._midiChordBound = () => this._onMidiChordEvent();
    MidiEngine.onNote(this._midiChordBound);
  },
  unwireMidiChordCheck(){
    if (this._midiChordBound) MidiEngine.offNote(this._midiChordBound);
    this._midiChordBound = null;
    if (this._midiChordDebounce){ clearTimeout(this._midiChordDebounce); this._midiChordDebounce = null; }
    const status = document.getElementById('midi-answer-status');
    if (status) status.style.display = 'none';
  },
  _onMidiChordEvent(){
    // Kleine marge i.p.v. bij elke losse noot meteen evalueren — een
    // akkoord wordt zelden perfect gelijktijdig ingedrukt (zie
    // Root_Note_Stappenplan.md Fase 2.2).
    if (this._midiChordDebounce) clearTimeout(this._midiChordDebounce);
    this._midiChordDebounce = setTimeout(() => this._evaluateMidiChordAnswer(), 120);
  },
  _evaluateMidiChordAnswer(){
    if (this._midiChordAdvancing || this.currentModule !== 'chords') return;
    const data = this.history[this.historyIndex];
    const status = document.getElementById('midi-answer-status');
    if (!data || !data.slices || !data.slices[0] || !status) return;
    const result = MusicTheory.matchChordNotes(MidiEngine.activeNotes, data.slices[0]);
    if (result === 'incomplete'){
      status.className = ''; status.textContent = Lang.t('midiChordListening');
    } else if (result === 'wrong'){
      status.className = 'wrong'; status.textContent = Lang.t('midiChordWrong');
    } else {
      status.className = 'correct'; status.textContent = Lang.t('midiChordCorrect');
      this._midiChordAdvancing = true;
      this.clearAutoTimers();
      setTimeout(() => {
        if (this.currentModule === 'chords'){
          this.nextQuestion();
          this._midiChordAdvancing = false;
          if (status){ status.className = ''; status.textContent = Lang.t('midiChordListening'); }
        }
      }, 600);
    }
  },

  // Notenbalk-breedte voor #score-paper per module: smal voor modules waar
  // maar een handjevol noten aan het begin van de balk staan (leesbaarder,
  // ziet er niet grotendeels leeg uit); undefined = volle breedte, nodig
  // voor Toonladders waar een hele reeks noten over de balk verspreid staat.
  // Waren te strak ingezoomd (notes/chords/progressions); ~1,25x breder
  // (=80% van de vorige zoom) gebracht op basis van gebruikersfeedback, met
  // "intervals" (Blind Audio > Toon Antwoord) als het bevestigd-goede
  // ijkpunt — die waarde bleef daarom ongewijzigd.
  PAPER_CANVAS_W: { notes: 188, chords: 275, progressions: 275, intervals: 260 },
  paperRenderOpts(id){
    const w = this.PAPER_CANVAS_W[id];
    return w ? { canvasW: w } : {};
  },
  // #score-paper krijgt CSS width:100%, dus zonder cap wordt een smalle
  // canvasW (bijv. 188 voor Noten Lezen) op een brede desktop-kaart
  // (tot 1400px) enorm uitgerekt — dezelfde valkuil als eerder al opgelost
  // voor #answer-score/#circle-chord-preview met een vaste max-width, hier
  // per module berekend met dezelfde verhouding als het bevestigd-goede
  // Intervallen-antwoordvoorbeeld (460px bij canvasW 260 ≈ 1,77x).
  // Toonladders (geen entry in PAPER_CANVAS_W) blijft bewust ongelimiteerd —
  // die had al vóór alle crop-wijzigingen de volle breedte, zonder klachten.
  applyPaperMaxWidth(id){
    const w = this.PAPER_CANVAS_W[id];
    document.getElementById('score-paper').style.maxWidth = w ? Math.round(w * 1.77) + 'px' : '';
  },

  // ---- Instellingen: knoppen i.p.v. dropdowns, opgeslagen per module ----
  getSetting(moduleId, key, fallback){
    const all = JSON.parse(localStorage.getItem('pm_settings_' + moduleId) || '{}');
    return all[key] !== undefined ? all[key] : fallback;
  },
  setSetting(moduleId, key, value){
    const all = JSON.parse(localStorage.getItem('pm_settings_' + moduleId) || '{}');
    all[key] = value;
    localStorage.setItem('pm_settings_' + moduleId, JSON.stringify(all));
  },

  // Eén-uit-meerdere-keuze (radiogedrag): precies één knop actief.
  renderSingleSelect(container, moduleId, key, options, fallback, onChangeExtra){
    // Sommige opties hebben een kortere `shortLabel` voor smal scherm (bijv.
    // "Niv 1 (C3-C5)" i.p.v. "Makkelijk (C3-C5)") — op breed scherm blijft
    // het volledige label staan, CSS wisselt tussen beide per breakpoint.
    container.innerHTML = options.map(o => o.shortLabel
      ? `<button type="button" class="opt-btn" data-value="${o.value}"><span class="lbl-full">${o.label}</span><span class="lbl-short">${o.shortLabel}</span></button>`
      : `<button type="button" class="opt-btn" data-value="${o.value}">${o.label}</button>`
    ).join('');
    const saved = this.getSetting(moduleId, key, fallback);
    container.querySelectorAll('.opt-btn').forEach(btn => {
      if (btn.dataset.value === saved) btn.classList.add('active');
      btn.addEventListener('click', () => {
        container.querySelectorAll('.opt-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.setSetting(moduleId, key, btn.dataset.value);
        if (onChangeExtra) onChangeExtra(btn.dataset.value);
        this.history = []; this.historyIndex = -1; this.nextQuestion();
      });
    });
  },

  // Meerdere-keuzes-mogelijk (checkbox-gedrag als knop): minstens één blijft altijd actief.
  renderMultiSelect(container, moduleId, key, options, fallbackValues, onChangeExtra){
    container.innerHTML = options.map(o => `<button type="button" class="opt-btn" data-value="${o.value}">${o.label}</button>`).join('');
    const saved = this.getSetting(moduleId, key, fallbackValues);
    const savedSet = new Set(saved);
    container.querySelectorAll('.opt-btn').forEach(btn => {
      if (savedSet.has(btn.dataset.value)) btn.classList.add('active');
      btn.addEventListener('click', () => {
        if (btn.classList.contains('active')){
          if (container.querySelectorAll('.opt-btn.active').length <= 1) return;
          btn.classList.remove('active');
        } else {
          btn.classList.add('active');
        }
        const vals = Array.from(container.querySelectorAll('.opt-btn.active')).map(b => b.dataset.value);
        this.setSetting(moduleId, key, vals);
        if (onChangeExtra) onChangeExtra(vals);
        this.history = []; this.historyIndex = -1; this.nextQuestion();
      });
    });
  },

  // ---- Automatisch doorgaan (Noten/Toonladders/Akkoorden/Progressies) ----
  autoTimer: null, autoTimer2: null,
  clearAutoTimers(){
    if (this.autoTimer){ clearTimeout(this.autoTimer); this.autoTimer = null; }
    if (this.autoTimer2){ clearTimeout(this.autoTimer2); this.autoTimer2 = null; }
  },
  maybeScheduleAuto(){
    this.clearAutoTimers();
    const id = this.currentModule;
    if (!['notes','scales','chords','progressions'].includes(id)) return;
    if (this.getSetting(id, 'autoAdvance', 'uit') !== 'aan') return;
    const delay = parseFloat(this.getSetting(id, 'autoDelay', '2')) * 1000;
    this.autoTimer = setTimeout(() => {
      // Geluid is niet meer een losse per-module instelling — dat wordt nu
      // centraal geregeld door de globale mute-knop (zie SoundUI), die zelf
      // binnen AudioEngine.playTone() ingrijpt. playCurrent() hier gewoon
      // altijd aanroepen is dus voldoende; is geluid uitgezet, dan blijft
      // het simpelweg stil.
      this.revealAnswer();
      this.playCurrent();
      this.autoTimer2 = setTimeout(() => { this.nextQuestion(); }, delay);
    }, delay);
  },
  buildAutoAdvanceControls(moduleId, container){
    const wrap = document.createElement('div');
    wrap.className = 'auto-adv-controls';
    wrap.innerHTML = `
      <div class="setting-group aa-toggle" data-role="auto">
        <label title="${Lang.t('auto_label')}">${UI_ICONS.autoAdvance}<span class="setting-label-text">${Lang.t('auto_label')}</span></label>
        <div class="opt-row" id="opt-auto-onoff"></div>
      </div>
      <div class="setting-group aa-delay" data-role="delay">
        <label title="${Lang.t('thinktime_label')}">${UI_ICONS.delay}<span class="setting-label-text">${Lang.t('thinktime_label')}</span> <span class="aa-delay-val" id="auto-delay-val-${moduleId}">2s</span></label>
        <input type="range" class="auto-delay-slider" id="auto-delay-slider-${moduleId}" min="0.5" max="5" step="0.5">
      </div>`;
    container.appendChild(wrap);
    this.renderSingleSelect(document.getElementById('opt-auto-onoff'), moduleId, 'autoAdvance',
      [{value:'uit', label:Lang.t('auto_off')}, {value:'aan', label:Lang.t('auto_on')}], 'uit', () => this.maybeScheduleAuto());

    const slider = document.getElementById(`auto-delay-slider-${moduleId}`);
    const valLabel = document.getElementById(`auto-delay-val-${moduleId}`);
    const savedDelay = this.getSetting(moduleId, 'autoDelay', '2');
    slider.value = savedDelay;
    valLabel.textContent = savedDelay + 's';
    slider.addEventListener('input', () => { valLabel.textContent = slider.value + 's'; });
    slider.addEventListener('change', () => {
      this.setSetting(moduleId, 'autoDelay', slider.value);
      this.maybeScheduleAuto();
    });
  },



  // Instellingen-labels/opties komen uit Lang.t()/Lang.*Name() — de
  // onderliggende `value`s (dus wat in localStorage/MusicTheory-lookups
  // terechtkomt) blijven ALTIJD de Nederlandse canonieke sleutel, alleen
  // het zichtbare `label` verandert mee met de taal. Zie de architectuur-
  // opmerking bij I18N hierboven.
  buildSettings(id){
    const c = document.getElementById('quick-controls');
    const t = document.getElementById('module-title');
    const extra = document.getElementById('interval-extra-controls');
    c.innerHTML = ''; extra.innerHTML = ''; extra.style.display = 'none';

    if (id === 'notes'){
      t.innerText = Lang.t('nav_notes');
      c.innerHTML = `
        <div class="setting-group">
          <label>${Lang.t('level_label')}</label>
          <div class="opt-row" id="opt-notes-level"></div>
        </div>`;
      this.renderSingleSelect(document.getElementById('opt-notes-level'), 'notes', 'level',
        [
          {value:'easy', label:Lang.t('level_easy'), shortLabel:Lang.t('level_easy_short')},
          {value:'med', label:Lang.t('level_med'), shortLabel:Lang.t('level_med_short')},
          {value:'hard', label:Lang.t('level_hard'), shortLabel:Lang.t('level_hard_short')}
        ], 'easy');
      this.buildAutoAdvanceControls('notes', c);

    } else if (id === 'scales'){
      t.innerText = Lang.t('nav_scales');
      const keys = Object.keys(MusicTheory.scales);
      c.innerHTML = `<div class="setting-group"><label>${Lang.t('type_label')}</label><div class="opt-row" id="opt-scale-types"></div></div>`;
      // Standaard alleen "Majeur" geselecteerd (was voorheen alle types) —
      // zelfde reden/patroon als de Akkoorden-default hierboven.
      this.renderMultiSelect(document.getElementById('opt-scale-types'), 'scales', 'types',
        keys.map(k => ({value:k, label:Lang.scaleName(k)})), ['Majeur']);
      this.buildAutoAdvanceControls('scales', c);

    } else if (id === 'chords'){
      t.innerText = Lang.t('nav_chords');
      const keys = Object.keys(MusicTheory.chords);
      c.innerHTML = `
        <div class="setting-group"><label>${Lang.t('type_label')}</label><div class="opt-row" id="opt-chord-types"></div></div>
        <div class="setting-group"><label>${Lang.t('inversions_label')}</label><div class="opt-row" id="opt-chord-inv"></div></div>`;
      // Standaard alleen "Majeur" geselecteerd (was voorheen alle types) —
      // op verzoek van de gebruiker, zodat een nieuwe/gewiste sessie niet
      // meteen met alle 11 types tegelijk start.
      this.renderMultiSelect(document.getElementById('opt-chord-types'), 'chords', 'types',
        keys.map(k => ({value:k, label:Lang.chordName(k)})), ['Majeur']);
      this.renderSingleSelect(document.getElementById('opt-chord-inv'), 'chords', 'inversion',
        [{value:'0', label:Lang.t('inv_root')}, {value:'1', label:Lang.t('inv_1')}, {value:'2', label:Lang.t('inv_2')}, {value:'3', label:Lang.t('inv_3')}, {value:'ALL', label:Lang.t('inv_all')}], '0');
      this.buildAutoAdvanceControls('chords', c);

    } else if (id === 'circle'){
      t.innerText = Lang.t('nav_circle');
      c.innerHTML = `
        <div class="setting-group">
          <label>${Lang.t('mode_label')}</label>
          <div class="opt-row" id="opt-circle-mode"></div>
        </div>`;
      this.renderSingleSelect(document.getElementById('opt-circle-mode'), 'circle', 'mode',
        [{value:'visual', label:Lang.t('circle_mode_visual')}, {value:'quiz-rel', label:Lang.t('circle_mode_rel')}, {value:'quiz-acc', label:Lang.t('circle_mode_acc')}], 'visual');

    } else if (id === 'intervals'){
      t.innerText = Lang.t('nav_intervals');
      const names = Object.keys(MusicTheory.intervals);
      c.innerHTML = `
        <div class="setting-group"><label>${Lang.t('display_label')}</label><div class="opt-row" id="opt-int-display"></div></div>
        <div class="setting-group"><label>${Lang.t('playmode_label')}</label><div class="opt-row" id="opt-int-play"></div></div>
        <div class="setting-group"><label>${Lang.t('interval_label')}</label><div class="opt-row" id="opt-int-choice"></div></div>`;
      this.renderSingleSelect(document.getElementById('opt-int-display'), 'intervals', 'display',
        [{value:'visual', label:Lang.t('int_display_visual')}, {value:'blind', label:Lang.t('int_display_blind')}], 'visual');
      this.renderSingleSelect(document.getElementById('opt-int-play'), 'intervals', 'play',
        [{value:'melodic', label:Lang.t('int_play_melodic')}, {value:'harmonic', label:Lang.t('int_play_harmonic')}], 'melodic');
      this.renderMultiSelect(document.getElementById('opt-int-choice'), 'intervals', 'choice',
        names.map(n => ({value:n, label: INTERVAL_ABBR[n] || n})), ['Octaaf']);

    } else if (id === 'progressions'){
      t.innerText = Lang.t('nav_progressions');
      c.innerHTML = `
        <div class="setting-group">
          <label>${Lang.t('key_label')}</label>
          <div class="opt-row" id="opt-prog-key"></div>
        </div>`;
      this.renderSingleSelect(document.getElementById('opt-prog-key'), 'progressions', 'key',
        [{value:'maj', label:Lang.t('prog_key_maj')}, {value:'min', label:Lang.t('prog_key_min')}, {value:'both', label:Lang.t('prog_key_both')}], 'maj');
      this.buildAutoAdvanceControls('progressions', c);
    }
  },

  prevQuestion(){
    if (this.historyIndex > 0){ this.historyIndex--; this.renderData(this.history[this.historyIndex]); }
  },

  nextQuestion(){
    if (this.historyIndex < this.history.length - 1){
      this.historyIndex++; this.renderData(this.history[this.historyIndex]);
    } else {
      let newData = this.generateNewData();
      if (newData){
        this.history.push(newData);
        if (this.history.length > 20) this.history.shift(); else this.historyIndex++;
        this.renderData(this.history[this.historyIndex]);
      }
    }
  },

  // Onthoudt, per module, de identiteits-sleutels van de laatst getoonde
  // vragen (zie _questionKey) — generateNewData() loot net zo lang opnieuw
  // tot een vraag NIET in dit recente venster zit. Voorkomt dat dezelfde
  // opgave kort na elkaar terugkomt, zonder dat je per module eerst ALLE
  // mogelijke combinaties (bij bijv. Akkoorden kunnen dat er 500+ zijn)
  // hoeft te hebben gezien voor er iets mag herhalen.
  recentQuestions: {},
  // 8 i.p.v. bijv. 12: bij een minimale instelling (1 akkoord-/toonladder-
  // type geselecteerd × 13 mogelijke grondtonen = 13 combinaties) moet het
  // venster ruim onder die 13 blijven, anders faalt de hieronder-staande
  // retry-poging vaak en glipt er alsnog een herhaling door (gemeten: bij
  // venster 12 op ruimte 13 zo'n 9% herhalingen — bij 8 nul).
  RECENT_WINDOW: 8,
  RECENT_MAX_TRIES: 30,

  generateNewData(){
    const id = this.currentModule;
    if (!this.recentQuestions[id]) this.recentQuestions[id] = [];
    const hist = this.recentQuestions[id];
    let data, key;
    for (let attempt = 0; attempt < this.RECENT_MAX_TRIES; attempt++){
      data = this._generateOneQuestion();
      key = this._questionKey(data);
      // Geen sleutel (bijv. Kwintencirkel in visuele modus, geen quiz) =
      // niets om op te herhalen te controleren — meteen accepteren.
      if (key === null || !hist.includes(key)) break;
    }
    if (key !== null){
      hist.push(key);
      if (hist.length > this.RECENT_WINDOW) hist.shift();
    }
    return data;
  },

  // Identiteits-sleutel van een vraag, voor de anti-herhaling hierboven —
  // gebaseerd op dezelfde taal-neutrale ruwe velden die qa() ook gebruikt
  // om te formatteren, dus nooit taal-afhankelijk.
  _questionKey(data){
    if (!data || !data.kind) return null;
    switch (data.kind){
      case 'note': return `note:${data.noteMidi}:${data.useFlats}`;
      case 'scale': return `scale:${data.scaleType}:${data.scaleRoot}`;
      case 'chord': return `chord:${data.chordType}:${data.chordRoot}:${data.chordInv}`;
      case 'circleRel': return `circleRel:${data.crIdx}:${data.crVariant}`;
      case 'circleAcc': return `circleAcc:${data.caIdx}:${data.caVariant}`;
      case 'interval': return `interval:${data.ivName}:${data.ivRoot}`;
      case 'progression': return `progression:${data.pgIsMaj}:${data.pgRootName}:${data.pgDegName}`;
      default: return null;
    }
  },

  // Slaat bewust ALLEEN taal-neutrale ruwe gegevens op (noten, Nederlands-
  // gesleutelde types, indexen) — GEEN kant-en-klare vraag-/antwoordtekst.
  // Die wordt apart, on-demand, geformatteerd door qa() hieronder — zowel
  // hier bij het genereren als bij een taalwissel (zie Lang.apply()), zodat
  // dezelfde vraag zonder opnieuw te loten in beide talen te tonen is.
  _generateOneQuestion(){
    let id = this.currentModule;
    let data = { type: 'none', slices: [] };

    if (id === 'notes'){
      let lvl = this.getSetting('notes', 'level', 'easy');
      let min = lvl === 'easy' ? 48 : (lvl === 'med' ? 36 : 24);
      let max = lvl === 'easy' ? 72 : (lvl === 'med' ? 84 : 96);
      let m = randomInt(min, max);
      let useFlats = Math.random() > 0.5;
      data.type = 'note'; data.slices = [[m]]; data.m = m;
      data.useFlats = useFlats;
      data.kind = 'note'; data.noteMidi = m;
    }
    else if (id === 'scales'){
      // Fallback MOET gelijk zijn aan de default die buildSettings() aan de
      // knoppenrij meegeeft (['Majeur']) — anders genereert de app in een
      // verse/gewiste sessie stiekem vragen over ALLE types, terwijl de UI
      // maar één knop gemarkeerd toont (bug, gemeld door gebruiker: pas na
      // een eerste handmatige klik werd de opgeslagen instelling — en dus
      // ook generateNewData()'s keuze — pas echt gelijk aan wat je zag).
      let types = this.getSetting('scales', 'types', ['Majeur']);
      if (!types.length) types = ['Majeur'];
      let type = types[randomInt(0, types.length - 1)];
      let root = randomInt(48, 60);
      let formula = MusicTheory.scales[type];
      let notes = formula.map(iv => root + iv);
      let useFlats = [53, 58, 51, 56, 49, 65, 70, 63, 68, 61].includes(root);
      data.type = 'sequence';
      data.useFlats = useFlats;
      data.slices = notes.map(n => [n]);
      data.kind = 'scale'; data.scaleRoot = root; data.scaleType = type;
    }
    else if (id === 'chords'){
      // Zelfde fix als bij Toonladders hierboven: fallback moet ['Majeur']
      // zijn, gelijk aan buildSettings()'s default voor de knoppenrij.
      let types = this.getSetting('chords', 'types', ['Majeur']);
      if (!types.length) types = ['Majeur'];
      let invSel = this.getSetting('chords', 'inversion', '0');
      let type = types[randomInt(0, types.length - 1)];
      let root = randomInt(48, 60);
      let formula = [...MusicTheory.chords[type]];
      let inv = invSel === 'ALL' ? randomInt(0, formula.length - 1) : Math.min(parseInt(invSel), formula.length - 1);
      for (let i = 0; i < inv; i++) formula[i] += 12;
      formula.sort((a,b) => a - b);
      let useFlats = [53, 58, 51, 56, 49, 65, 70, 63, 68, 61].includes(root);
      data.type = 'chord';
      data.useFlats = useFlats;
      data.slices = [formula.map(iv => root + iv)];
      data.kind = 'chord'; data.chordRoot = root; data.chordType = type; data.chordInv = inv;
    }
    else if (id === 'circle'){
      let mode = this.getSetting('circle', 'mode', 'visual');
      data.c_mode = mode;
      if (mode !== 'visual'){
        let idx = randomInt(0, 11);
        let keys = MusicTheory.circle.keys, minors = MusicTheory.circle.minors, accs = MusicTheory.circle.accidentals;
        let rootNote = "", chordType = "";
        data.useFlats = accs[idx] < 0;
        let variant = Math.random() > 0.5 ? 'a' : 'b';

        if (mode === 'quiz-rel'){
          let minorClean = minors[idx].replace(/m$/, '');
          data.kind = 'circleRel'; data.crIdx = idx; data.crVariant = variant; data.crMinorClean = minorClean;
          if (variant === 'a'){ rootNote = minors[idx]; chordType = "Mineur"; }
          else { rootNote = keys[idx]; chordType = "Majeur"; }
        } else {
          data.kind = 'circleAcc'; data.caIdx = idx; data.caVariant = variant;
          rootNote = keys[idx]; chordType = "Majeur";
        }
        const rootToMidi = {"C":60,"G":67,"D":62,"A":69,"E":64,"B":71,"F#":66,"Db":61,"Ab":68,"Eb":63,"Bb":70,"F":65,"Am":69,"Em":64,"Bm":71,"F#m":66,"C#m":61,"G#m":68,"D#m":63,"Bbm":70,"Fm":65,"Cm":60,"Gm":67,"Dm":62};
        let rootMidi = rootToMidi[rootNote];
        let formula = MusicTheory.chords[chordType];
        data.type = 'chord'; data.slices = [formula.map(iv => rootMidi + iv)];
      }
    }
    else if (id === 'intervals'){
      let mode = this.getSetting('intervals', 'display', 'visual');
      let playMode = this.getSetting('intervals', 'play', 'melodic');
      let names = this.getSetting('intervals', 'choice', ['Octaaf']);
      if (!names.length) names = Object.keys(MusicTheory.intervals);
      let name = names[randomInt(0, names.length - 1)];
      let root = randomInt(48, 64), top = root + MusicTheory.intervals[name];
      let useFlats = Math.random() > 0.5;
      data.i_mode = mode; data.type = playMode === 'melodic' ? 'sequence' : 'chord';
      data.useFlats = useFlats;
      data.slices = playMode === 'melodic' ? [[root],[top]] : [[root, top]];
      data.kind = 'interval'; data.ivName = name; data.ivRoot = root; data.ivTop = top;
    }
    else if (id === 'progressions'){
      let kType = this.getSetting('progressions', 'key', 'maj');
      let isMaj = kType === 'maj' ? true : (kType === 'min' ? false : Math.random() > 0.5);
      let rootKeyIdx = randomInt(0, 11);

      let rootName = isMaj ? MusicTheory.circle.keys[rootKeyIdx] : MusicTheory.circle.minors[rootKeyIdx].replace(/m$/, '');

      let accidentals = MusicTheory.circle.accidentals[rootKeyIdx];
      data.useFlats = accidentals < 0;

      const rootToMidiMap = {"C":60,"G":67,"D":62,"A":69,"E":64,"B":71,"F#":66,"Db":61,"Ab":68,"Eb":63,"Bb":70,"F":65,
                             "A":57,"E":64,"B":71,"C#":61,"G#":68,"D#":63};
      let rootMidi = rootToMidiMap[rootName];
      if(rootMidi > 64) rootMidi -= 12;

      const degs = isMaj ?
        [{n:'I', iv:0, q:'Majeur'}, {n:'ii', iv:2, q:'Mineur'}, {n:'IV', iv:5, q:'Majeur'}, {n:'V', iv:7, q:'Majeur'}, {n:'vi', iv:9, q:'Mineur'}] :
        [{n:'i', iv:0, q:'Mineur'}, {n:'III', iv:3, q:'Majeur'}, {n:'iv', iv:5, q:'Mineur'}, {n:'V', iv:7, q:'Majeur'}, {n:'VI', iv:8, q:'Majeur'}];

      let targetDeg = degs[randomInt(0, degs.length - 1)];
      let chordRoot = rootMidi + targetDeg.iv;

      data.type = 'chord'; data.slices = [MusicTheory.chords[targetDeg.q].map(iv => chordRoot + iv)];
      data.kind = 'progression'; data.pgRootName = rootName; data.pgIsMaj = isMaj;
      data.pgDegName = targetDeg.n; data.pgChordRoot = chordRoot; data.pgChordType = targetDeg.q;
    }

    return data;
  },

  // Formatteert de vraag ({q}) en het antwoord ({ans}) in de HUIDIGE taal
  // vanuit de taal-neutrale ruwe velden die generateNewData() opsloeg.
  // Aparte functie (i.p.v. inline in generateNewData) zodat een taalwissel
  // dezelfde vraag opnieuw kan formatteren zonder een nieuwe te loten.
  qa(data){
    if (!data) return { q:'', ans:'' };
    const t = (k, p) => Lang.t(k, p);
    switch (data.kind){
      case 'note':
        return { q:'', ans: midiToName(data.noteMidi, data.useFlats) };
      case 'scale':
        return { q:'', ans: `${midiToName(data.scaleRoot, data.useFlats)} ${Lang.scaleName(data.scaleType)}` };
      case 'chord': {
        const invText = data.chordInv === 0 ? t('inv_root') : t('inv_' + data.chordInv);
        return { q:'', ans: `${midiToName(data.chordRoot, data.useFlats)} ${Lang.chordName(data.chordType)} (${invText})` };
      }
      case 'circleRel': {
        const keys = MusicTheory.circle.keys;
        if (data.crVariant === 'a'){
          return { q: t('qRelMinorOf', {key:keys[data.crIdx]}), ans: `${data.crMinorClean} ${t('minorLower')}` };
        }
        return { q: t('qRelMajorOf', {key:data.crMinorClean}), ans: `${keys[data.crIdx]} ${t('major')}` };
      }
      case 'circleAcc': {
        const keys = MusicTheory.circle.keys, accs = MusicTheory.circle.accidentals;
        const n = accs[data.caIdx];
        const accText = n === 0 ? t('zeroAccidentals') : (n > 0 ? t('nSharps', {n}) : t('nFlats', {n:Math.abs(n)}));
        if (data.caVariant === 'a'){
          return { q: t('qWhichMajorHas', {acc:accText}), ans: `${keys[data.caIdx]} ${t('major')}` };
        }
        return { q: t('qHowManyAccidentals', {key:keys[data.caIdx]}), ans: accText };
      }
      case 'interval':
        return { q:'', ans: `${Lang.intervalName(data.ivName)} (${midiToName(data.ivRoot, data.useFlats)} → ${midiToName(data.ivTop, data.useFlats)})` };
      case 'progression': {
        const kw = data.pgIsMaj ? t('major') : t('minorLower');
        return {
          q: t('qDegreeIn', {deg:data.pgDegName, key:data.pgRootName, kw}),
          ans: `${midiToName(data.pgChordRoot, data.useFlats)} ${Lang.chordName(data.pgChordType)}`
        };
      }
      default:
        return { q:'', ans:'' };
    }
  },

  renderData(data){
    const ansDisp = document.getElementById('answer-display');
    ansDisp.style.transition = 'none';
    ansDisp.classList.remove('visible');
    void ansDisp.offsetHeight; 
    ansDisp.style.transition = '';

    const paper = document.getElementById('score-paper');
    const svgBox = document.getElementById('svg-container');
    const textQuiz = document.getElementById('text-quiz');
    const answerScore = document.getElementById('answer-score');
    paper.style.display = 'none'; svgBox.style.display = 'none'; textQuiz.style.display = 'none';
    answerScore.style.display = 'none'; answerScore.innerHTML = '';

    let id = this.currentModule;
    // Nieuwe vraag = nieuw akkoord om te spelen: MIDI-statustekst terug naar
    // neutraal, ongeacht via welke route (Volgende-knop, swipe, automatisch
    // doorgaan) hier beland is — anders blijft een oude "Probeer opnieuw"
    // soms nog even zichtbaar staan bij de volgende vraag.
    if (id === 'chords'){
      const midiStatus = document.getElementById('midi-answer-status');
      if (midiStatus && midiStatus.style.display !== 'none'){ midiStatus.className = ''; midiStatus.textContent = Lang.t('midiChordListening'); }
    }
    const isCircleVisual = (id === 'circle' && data.c_mode === 'visual');
    const { q, ans } = this.qa(data);

    document.getElementById('flashcard-actions').style.display = isCircleVisual ? 'none' : 'flex';
    document.getElementById('swipe-hint').style.display = isCircleVisual ? 'none' : 'block';

    if (isCircleVisual){
      svgBox.style.display = 'flex';
      CircleWheel.render();
      ansDisp.innerText = Lang.t('circleTapHint');
    }
    else if (id === 'circle' || (id === 'intervals' && data.i_mode === 'blind')){
      textQuiz.style.display = 'block';
      textQuiz.innerText = id === 'circle' ? q : Lang.t('listenBlind');
      if (id === 'intervals') setTimeout(() => this.playCurrent(), 400);
      ansDisp.innerText = ans;
    }
    else {
      paper.style.display = 'flex';
      if (id === 'progressions'){ textQuiz.style.display = 'block'; textQuiz.innerHTML = q; }
      this.applyPaperMaxWidth(id);
      ScoreRenderer.render('score-paper', data.slices, data.useFlats, this.paperRenderOpts(id));
      ansDisp.innerText = ans;
    }

    document.getElementById('btn-prev').disabled = this.historyIndex <= 0;
    this.maybeScheduleAuto();
  },

  playCurrent(){
    let data = this.history[this.historyIndex];
    if (!data || data.type === 'none') return;
    if (data.type === 'note' || data.type === 'chord'){
      if (['chords', 'progressions', 'circle'].includes(this.currentModule)){
        AudioEngine.playArpeggioAndChord(data.slices[0], 0.5);
      } else {
        AudioEngine.playChord(data.slices[0]);
      }
    }
    else if (data.type === 'sequence') AudioEngine.playSequence(data.slices, 0.4);
  },

  // Puur tonen (tekst/notenbalk), zonder geluid — gebruikt door zowel de
  // handmatige knop als automatisch doorgaan, dat zijn EIGEN "Geluid"-
  // instelling heeft en dus zelf bepaalt of playCurrent() erbij hoort.
  revealAnswer(){
    document.getElementById('answer-display').classList.add('visible');
    const data = this.history[this.historyIndex];
    if (data && this.currentModule === 'intervals' && data.i_mode === 'blind'){
      const box = document.getElementById('answer-score');
      // Moet 'flex' zijn (niet 'block'): #answer-score is met CSS
      // display:flex + justify-content:center gecentreerd, maar een
      // inline style wint altijd van CSS — met 'block' werd die centrering
      // dus genegeerd en stond de notenbalk scheef naar links.
      box.style.display = 'flex';
      // Kleinere canvasW zodat de 1-2 noten dicht bij elkaar staan i.p.v.
      // over de volle breedte uitgesmeerd — dat maakt het verschil tussen
      // bijv. P4 en P8 beter zichtbaar.
      ScoreRenderer.render('answer-score', data.slices, data.useFlats, { canvasW: 260 });
    }
  },

  // Knop-handler ("Toon Antwoord"): toont het antwoord én speelt het meteen
  // af — op verzoek, was voorheen alleen tonen (geluid moest apart via
  // "Speel Af"). playCurrent() doet zelf niets zonder afspeelbare data.
  toggleAnswer(){
    this.revealAnswer();
    this.playCurrent();
  }
};
