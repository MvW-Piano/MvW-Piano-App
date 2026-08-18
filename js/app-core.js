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
    this.unwireMidiScaleCheck();
    this.unwireMidiIntervalCheck();
    this.unwireScrollBand();
    this.unwireMidiNoteCheck();
    this.unwireMidiProgCheck();
    this.unwireProgBand();
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
    const theoryUI = document.getElementById('theory-view');
    const quickControls = document.getElementById('quick-controls');
    const swipeHint = document.getElementById('swipe-hint');
    const settingsBtn = document.getElementById('settings-btn');
    document.getElementById('interval-extra-controls').style.display = 'none';
    SettingsUI.toggleDrawer(false);

    if (moduleId === 'piano'){
      flashUI.style.display = 'none'; swipeHint.style.display = 'none'; theoryUI.style.display = 'none';
      pianoUI.style.display = 'flex'; quickControls.innerHTML = ''; settingsBtn.style.display = 'none';
      document.getElementById('module-title').innerText = Lang.t('nav_piano');
      PianoUI.init();
    } else if (moduleId === 'theory'){
      // Muziektheorie-naslagwerk (Fase 3.2): zelfde "los top-level scherm"-
      // opzet als Vrij Spelen hierboven — geen flashcard/instellingen, want
      // dit is geen quiz. TheoryUI.render() bouwt de hele cheat-sheet in één
      // keer op (idempotent, dus ook veilig bij een taal-/themawissel, zie
      // Lang.apply()/ThemeManager.toggle()).
      flashUI.style.display = 'none'; swipeHint.style.display = 'none'; pianoUI.style.display = 'none';
      quickControls.innerHTML = ''; settingsBtn.style.display = 'none';
      theoryUI.style.display = 'flex';
      document.getElementById('module-title').innerText = Lang.t('nav_theory');
      TheoryUI.render();
    } else {
      flashUI.style.display = 'flex'; swipeHint.style.display = 'block';
      pianoUI.style.display = 'none'; theoryUI.style.display = 'none'; settingsBtn.style.display = 'inline-flex';

      document.getElementById('score-paper').style.display = 'none';
      document.getElementById('svg-container').style.display = 'none';
      document.getElementById('text-quiz').style.display = 'none';
      document.getElementById('answer-display').classList.remove('visible');

      this.buildSettings(moduleId);
      this.moveQuickControlsToDrawer();
      this.history = []; this.historyIndex = -1;
      this.nextQuestion();
      if (moduleId === 'chords') this.wireMidiChordCheck();
      if (moduleId === 'scales') this.wireMidiScaleCheck();
      if (moduleId === 'intervals') this.wireMidiIntervalCheck();
      if (moduleId === 'notes'){ this.wireScrollBand(); this.wireMidiNoteCheck(); }
      if (moduleId === 'progressions'){ this.wireMidiProgCheck(); this.wireProgBand(); }
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
  // **Octaaf-instelling (sinds v0.9.0, op verzoek):** "Exact" (default)
  // verwacht het akkoord in het daadwerkelijk genoteerde register
  // (MusicTheory.matchExactNotes); "Vrij" herstelt het oude
  // toonhoogteklasse-gedrag (MusicTheory.matchChordNotes, elk octaaf goed).
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
    const octaveMode = this.getSetting('chords', 'octaveMode', 'exact');
    const result = octaveMode === 'exact'
      ? MusicTheory.matchExactNotes(MidiEngine.activeNotes, data.slices[0])
      : MusicTheory.matchChordNotes(MidiEngine.activeNotes, data.slices[0]);
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

  // ---- MIDI-toonladder-speel-na (Fase 2.3, bouwt op MidiEngine + dezelfde
  // wire/unwire-aanpak als de Akkoorden-controle hierboven) ----
  // In tegenstelling tot Akkoorden (gelijktijdige noten, octaaf-onafhankelijk)
  // is dit een REEKS: de gebruiker speelt de toonladder-noten ÉÉN VOOR ÉÉN
  // in de juiste volgorde. Octaaf doet er hier dus WEL toe — een
  // toonladder-oefening test juist het spelen in de gegenereerde positie
  // (en over 1 of 2 octaven, zie de "Octaven"-instelling), niet "ergens op
  // het klavier". "Marker schuift pas door bij een juiste noot" (letterlijk
  // uit het stappenplan): een foute noot verandert de verwachte index niet.
  _midiScaleBound: null,
  _midiScaleIndex: 0,
  _midiScaleAdvancing: false,

  wireMidiScaleCheck(){
    if (!MidiEngine.connected) return;
    const data = this.history[this.historyIndex];
    if (!data || !data.slices) return;
    this._midiScaleIndex = 0;
    this._midiScaleAdvancing = false;
    this._buildMidiScaleProgress(data);
    this._midiScaleBound = (e) => this._onMidiScaleEvent(e);
    MidiEngine.onNote(this._midiScaleBound);
  },
  unwireMidiScaleCheck(){
    if (this._midiScaleBound) MidiEngine.offNote(this._midiScaleBound);
    this._midiScaleBound = null;
    const progress = document.getElementById('midi-scale-progress');
    if (progress){ progress.style.display = 'none'; progress.innerHTML = ''; }
  },
  // Eén "pil" per noot in de reeks — opnieuw opgebouwd bij elke nieuwe
  // vraag (zie renderData()) zodat de lengte (1 of 2 octaven) altijd bij
  // de huidige vraag past. Toont de notennaam ALLEEN als de "Hint"-
  // instelling aan staat (default uit, sinds v0.9.0 op verzoek) — anders
  // gewoon het positienummer (1,2,3...), zodat je de noten daadwerkelijk
  // van de notenbalk moet lezen i.p.v. ze hier al te zien staan. Puur een
  // labelkeuze; de matchlogica blijft altijd op exact MIDI-nummer.
  _buildMidiScaleProgress(data){
    const progress = document.getElementById('midi-scale-progress');
    if (!progress) return;
    const hint = this.getSetting('scales', 'hint', 'uit') === 'aan';
    progress.style.display = 'flex';
    progress.innerHTML = data.slices.map((slice, i) => {
      const label = hint ? midiToName(slice[0], data.useFlats) : String(i + 1);
      const cls = i === this._midiScaleIndex ? 'current' : '';
      return `<span class="midi-scale-note ${cls}" data-index="${i}">${label}</span>`;
    }).join('');
  },
  _onMidiScaleEvent(e){
    if (e.type !== 'on' || this._midiScaleAdvancing || this.currentModule !== 'scales') return;
    const data = this.history[this.historyIndex];
    const progress = document.getElementById('midi-scale-progress');
    if (!data || !data.slices || !progress) return;
    const expected = data.slices[this._midiScaleIndex];
    if (!expected) return;
    const pill = progress.querySelector(`[data-index="${this._midiScaleIndex}"]`);
    if (e.midi === expected[0]){
      if (pill){ pill.classList.remove('wrong', 'current'); pill.classList.add('done'); }
      this._midiScaleIndex++;
      if (this._midiScaleIndex >= data.slices.length){
        this._midiScaleAdvancing = true;
        this.clearAutoTimers();
        setTimeout(() => {
          if (this.currentModule === 'scales'){ this.nextQuestion(); this._midiScaleAdvancing = false; }
        }, 700);
      } else {
        const nextPill = progress.querySelector(`[data-index="${this._midiScaleIndex}"]`);
        if (nextPill) nextPill.classList.add('current');
      }
    } else if (pill){
      pill.classList.add('wrong');
      setTimeout(() => { if (pill) pill.classList.remove('wrong'); }, 400);
    }
  },

  // ---- MIDI naspelen Intervallen (Fase 2.5, bouwt op MidiEngine) ----
  // Werkt in BEIDE afspeelmodi (data.type is 'chord' voor Harmonisch, hoort
  // dus bij dezelfde soort controle als Akkoorden — 'sequence' voor
  // Melodisch, hoort bij dezelfde soort controle als Toonladders) en in
  // BEIDE weergavemodi (Notenbalk/Blind — de matchlogica is identiek, alleen
  // wat er op het scherm te zien is verschilt, geregeld in renderData()).
  // Hergebruikt daarom bewust dezelfde twee UI-widgets als Akkoorden/
  // Toonladders (#midi-answer-status resp. #midi-scale-progress) i.p.v. een
  // derde eigen widget te bouwen — welke van de twee getoond wordt hangt af
  // van data.type, bepaald in _refreshMidiIntervalUI().
  // **Octaaf-instelling (sinds v0.9.0, zelfde als bij Akkoorden):** "Exact"
  // (default) verwacht de noten in het daadwerkelijk genoteerde register
  // (MusicTheory.matchExactNotes); "Vrij" vergelijkt puur op het VERSCHIL
  // tussen de twee noten, ongeacht register (MusicTheory.matchIntervalNotes)
  // — zie getSetting('intervals','octaveMode',...) in de functies hieronder.
  _midiIntervalBound: null,
  _midiIntervalDebounce: null,
  _midiIntervalFirstNote: null,
  _midiIntervalAdvancing: false,

  wireMidiIntervalCheck(){
    if (!MidiEngine.connected) return;
    if (!this.history[this.historyIndex]) return;
    this._midiIntervalAdvancing = false;
    this._refreshMidiIntervalUI();
    this._midiIntervalBound = (e) => this._onMidiIntervalEvent(e);
    MidiEngine.onNote(this._midiIntervalBound);
  },
  unwireMidiIntervalCheck(){
    if (this._midiIntervalBound) MidiEngine.offNote(this._midiIntervalBound);
    this._midiIntervalBound = null;
    if (this._midiIntervalDebounce){ clearTimeout(this._midiIntervalDebounce); this._midiIntervalDebounce = null; }
    const status = document.getElementById('midi-answer-status');
    const progress = document.getElementById('midi-scale-progress');
    if (status) status.style.display = 'none';
    if (progress){ progress.style.display = 'none'; progress.innerHTML = ''; }
  },
  // Kiest en reset het juiste widget voor de HUIDIGE vraag — data.type kan
  // per vraag verschillen (afspeelmodus is een instelling, kan tussentijds
  // wisselen), dus dit draait bij elke nieuwe vraag opnieuw (zie renderData()).
  _refreshMidiIntervalUI(){
    const data = this.history[this.historyIndex];
    if (!data) return;
    this._midiIntervalFirstNote = null;
    const status = document.getElementById('midi-answer-status');
    const progress = document.getElementById('midi-scale-progress');
    if (data.type === 'chord'){
      if (progress){ progress.style.display = 'none'; progress.innerHTML = ''; }
      if (status){ status.style.display = 'block'; status.className = ''; status.textContent = Lang.t('midiIntervalListening'); }
    } else {
      if (status) status.style.display = 'none';
      if (progress){
        progress.style.display = 'flex';
        progress.innerHTML = '<span class="midi-scale-note current" data-index="0">1</span><span class="midi-scale-note" data-index="1">2</span>';
      }
    }
  },
  _onMidiIntervalEvent(e){
    if (this._midiIntervalAdvancing || this.currentModule !== 'intervals') return;
    const data = this.history[this.historyIndex];
    if (!data) return;
    const octaveMode = this.getSetting('intervals', 'octaveMode', 'exact');
    if (data.type === 'chord'){
      // Harmonisch: net als Akkoorden reageren op zowel indrukken ALS
      // loslaten (bijv. een foute extra noot weer loslaten moet de status
      // ook zonder nieuwe aanslag kunnen herstellen).
      if (this._midiIntervalDebounce) clearTimeout(this._midiIntervalDebounce);
      this._midiIntervalDebounce = setTimeout(() => this._evaluateMidiIntervalHarmonic(data, octaveMode), 120);
    } else if (e.type === 'on'){
      // Melodisch: alleen aanslagen tellen (stap-voor-stap reeks), loslaten
      // is hier niet relevant.
      this._evaluateMidiIntervalMelodic(e.midi, data, octaveMode);
    }
  },
  _evaluateMidiIntervalHarmonic(data, octaveMode){
    if (this._midiIntervalAdvancing || this.currentModule !== 'intervals') return;
    const status = document.getElementById('midi-answer-status');
    if (!status) return;
    const result = octaveMode === 'exact'
      ? MusicTheory.matchExactNotes(MidiEngine.activeNotes, [data.ivRoot, data.ivTop])
      : MusicTheory.matchIntervalNotes(MidiEngine.activeNotes, data.ivTop - data.ivRoot);
    if (result === 'incomplete'){
      status.className = ''; status.textContent = Lang.t('midiIntervalListening');
    } else if (result === 'wrong'){
      status.className = 'wrong'; status.textContent = Lang.t('midiChordWrong');
    } else {
      status.className = 'correct'; status.textContent = Lang.t('midiChordCorrect');
      this._finishMidiIntervalCorrect();
    }
  },
  // "Exact": eerste noot moet letterlijk data.ivRoot zijn (foute eerste
  // noot flitst rood, wordt niet als referentie vastgelegd) en de tweede
  // moet letterlijk data.ivTop zijn. "Vrij": elke eerste noot mag als
  // referentie dienen (zelfde gedrag als vóór v0.9.0) — de tweede moet dan
  // het juiste AANTAL halve tonen hoger liggen dan die referentie.
  _evaluateMidiIntervalMelodic(midi, data, octaveMode){
    const progress = document.getElementById('midi-scale-progress');
    if (!progress) return;
    const p0 = progress.querySelector('[data-index="0"]');
    const p1 = progress.querySelector('[data-index="1"]');
    if (this._midiIntervalFirstNote === null){
      if (octaveMode === 'exact' && midi !== data.ivRoot){
        if (p0){ p0.classList.add('wrong'); setTimeout(() => { if (p0) p0.classList.remove('wrong'); }, 400); }
        return;
      }
      this._midiIntervalFirstNote = midi;
      if (p0){ p0.classList.remove('current'); p0.classList.add('done'); }
      if (p1) p1.classList.add('current');
      return;
    }
    const targetSecond = octaveMode === 'exact' ? data.ivTop : this._midiIntervalFirstNote + (data.ivTop - data.ivRoot);
    if (midi === targetSecond){
      if (p1){ p1.classList.remove('current', 'wrong'); p1.classList.add('done'); }
      this._finishMidiIntervalCorrect();
    } else if (p1){
      p1.classList.add('wrong');
      setTimeout(() => { if (p1) p1.classList.remove('wrong'); }, 400);
    }
  },
  _finishMidiIntervalCorrect(){
    this._midiIntervalAdvancing = true;
    this.clearAutoTimers();
    setTimeout(() => {
      if (this.currentModule === 'intervals'){ this.nextQuestion(); this._midiIntervalAdvancing = false; }
    }, 600);
  },

  // ---- Lopende-band-modus Noten Lezen (Fase 1.2/2.1c, bouwt op
  // ScrollEngine + MidiEngine) ----
  // Anders dan de andere MIDI-controles hierboven is dit geen los widget
  // bovenop de bestaande kaart-flow — het VERVANGT de hele kaart-weergave
  // zolang deze modus actief is (zie isNotesBand in renderData()). Alleen
  // bruikbaar met een verbonden MIDI-apparaat (geen virtueel klavier op dit
  // scherm); zonder apparaat toont _renderNotesBand() een duidelijke melding
  // i.p.v. een lege/niet-interactieve strip.
  _scrollBandBound: null,
  // Aantal correct gespeelde noten in de HUIDIGE sessie (sinds v0.11.0) —
  // de hele sessie is nu één doorlopende reeks van NOTES_BAND_LENGTH (100)
  // noten, dus dit loopt gewoon op tot 100 i.p.v. per reeksje van 8 te
  // resetten. Reset alleen bij het (opnieuw) binnenkomen van de module
  // (zie wireScrollBand) — een themawissel (her-render) laat 'm ongemoeid.
  _notesBandCorrectCount: 0,

  wireScrollBand(){
    if (!MidiEngine.connected) return;
    // Reset draait NA _renderNotesBand() (loadModule() roept nextQuestion()
    // vóór wireScrollBand() aan) — dus de teller-DOM hier ook expliciet
    // verversen, anders blijft de tekst van de vorige sessie (bijv.
    // "100/100 goed") nog even hangen ondanks dat de teller zelf al 0 is.
    this._notesBandCorrectCount = 0;
    this._updateScrollCounter();
    this._scrollBandBound = (e) => this._onScrollBandEvent(e);
    MidiEngine.onNote(this._scrollBandBound);
  },
  unwireScrollBand(){
    if (this._scrollBandBound) MidiEngine.offNote(this._scrollBandBound);
    this._scrollBandBound = null;
    ScrollEngine.stop();
  },
  _updateScrollCounter(){
    const counter = document.getElementById('scroll-counter');
    if (counter) counter.textContent = Lang.t('scrollCounter', { n: this._notesBandCorrectCount, total: this.NOTES_BAND_LENGTH });
  },
  // startIndex: alleen gebruikt bij een her-render zonder voortgang te
  // verliezen (zie ThemeManager.toggle()) — bij een gewone nieuwe vraag
  // start dit gewoon op 0.
  _renderNotesBand(data, startIndex = 0){
    const host = document.getElementById('scroll-strip-host');
    const status = document.getElementById('scroll-status');
    if (!host || !status) return;
    if (!MidiEngine.connected){
      host.innerHTML = '';
      status.className = ''; status.textContent = Lang.t('scrollNeedsMidi');
      return;
    }
    // ScrollEngine verwacht sinds Fase 2.6 SLICES (number[][]) i.p.v. losse
    // MIDI-nummers (om Akkoordprogressies' akkoord-per-stap te ondersteunen)
    // — Noten Lezen heeft altijd precies 1 noot per stap, dus simpelweg
    // inwikkelen als [m].
    ScrollEngine.render('scroll-strip-host', data.bandSequence.map(m => [m]), { useFlats: data.useFlats, startIndex, clef: data.n_clef });
    status.className = ''; status.textContent = Lang.t('midiNoteListening');
    this._updateScrollCounter();
  },
  _onScrollBandEvent(e){
    if (e.type !== 'on' || this.currentModule !== 'notes') return;
    const data = this.history[this.historyIndex];
    if (!data || data.n_mode !== 'band') return;
    const target = ScrollEngine.currentTarget();
    if (target === null) return;
    const status = document.getElementById('scroll-status');
    if (e.midi === target[0]){
      ScrollEngine.markCurrent('correct');
      this._notesBandCorrectCount++;
      this._updateScrollCounter();
      if (this._notesBandCorrectCount >= this.NOTES_BAND_LENGTH){
        // Hele sessie (100 noten) voltooid — hier stoppen, GEEN nieuwe
        // sessie automatisch starten (zou de bereikte 100/100 meteen weer
        // op 0 zetten). Opnieuw beginnen kan door de module te verlaten en
        // terug te komen (reset in wireScrollBand()).
        if (status){ status.className = 'correct'; status.textContent = Lang.t('scrollSessionComplete', { total: this.NOTES_BAND_LENGTH }); }
        this.clearAutoTimers();
      } else if (!ScrollEngine.advance()){
        // isLastNote() maar sessie nog niet vol (kan niet meer voorkomen
        // nu sequence-lengte === NOTES_BAND_LENGTH, maar defensief laten
        // staan) — niets te doen.
      }
    } else {
      ScrollEngine.flashWrong();
      if (status){
        status.className = 'wrong'; status.textContent = Lang.t('midiChordWrong');
        setTimeout(() => {
          if (this.currentModule === 'notes' && document.getElementById('scroll-status')){
            status.className = ''; status.textContent = Lang.t('midiNoteListening');
          }
        }, 400);
      }
    }
  },

  // ---- MIDI speel-na Noten Lezen, Kaarten-modus (Fase 2.1b, bouwt op
  // MidiEngine) ----
  // Nieuwe antwoordmodus NAAST de bestaande zelfbeoordeling (Toon Antwoord/
  // Vorige/Volgende blijven precies zoals ze waren) — hergebruikt
  // `#midi-answer-status`, hetzelfde widget als Akkoorden/Intervallen-
  // Harmonisch. Wordt (net als bij Intervallen) ALTIJD gewired zodra
  // MidiEngine.connected is, ongeacht Kaarten/Lopende Band — de handler
  // zelf checkt `data.n_mode`, zodat mid-sessie wisselen van Modus (zonder
  // module opnieuw te laden) meteen het juiste widget toont, net als bij
  // Intervallen se Melodisch/Harmonisch-wissel.
  // Altijd EXACTE MIDI-match (geen "Octaaf: Vrij"-optie zoals Akkoorden/
  // Intervallen) — Noten Lezen test bewust "vind deze ene toets", geen
  // relatief begrip zoals een interval of akkoordkwaliteit; zelfde
  // filosofie als Toonladders en de Lopende-Band-modus hierboven.
  _midiNoteBound: null,

  wireMidiNoteCheck(){
    if (!MidiEngine.connected) return;
    this._midiNoteBound = (e) => this._onMidiNoteEvent(e);
    MidiEngine.onNote(this._midiNoteBound);
    this._refreshMidiNoteUI();
  },
  unwireMidiNoteCheck(){
    if (this._midiNoteBound) MidiEngine.offNote(this._midiNoteBound);
    this._midiNoteBound = null;
    const status = document.getElementById('midi-answer-status');
    if (status) status.style.display = 'none';
  },
  _refreshMidiNoteUI(){
    const data = this.history[this.historyIndex];
    const status = document.getElementById('midi-answer-status');
    if (!data || !status) return;
    if (data.n_mode === 'kaarten'){
      status.style.display = 'block'; status.className = ''; status.textContent = Lang.t('midiNoteListeningStatic');
    } else {
      status.style.display = 'none';
    }
  },
  _onMidiNoteEvent(e){
    if (e.type !== 'on' || this.currentModule !== 'notes') return;
    const data = this.history[this.historyIndex];
    if (!data || data.n_mode !== 'kaarten') return;
    const status = document.getElementById('midi-answer-status');
    if (!status) return;
    if (e.midi === data.noteMidi){
      status.className = 'correct'; status.textContent = Lang.t('midiChordCorrect');
      this.clearAutoTimers();
      setTimeout(() => { if (this.currentModule === 'notes') this.nextQuestion(); }, 600);
    } else {
      status.className = 'wrong'; status.textContent = Lang.t('midiChordWrong');
      setTimeout(() => {
        if (this.currentModule === 'notes' && document.getElementById('midi-answer-status')){
          status.className = ''; status.textContent = Lang.t('midiNoteListeningStatic');
        }
      }, 400);
    }
  },

  // ---- MIDI-koppeling Akkoordprogressies, Kaarten + Reeks (Fase 2.6,
  // bouwt op MidiEngine, hergebruikt de matchlogica uit 2.2/2.3) ----
  // ALTIJD samen gewired zodra MidiEngine.connected is (zie loadModule()),
  // net als bij Intervallen/Noten Lezen — welk widget getoond wordt en welke
  // vergelijking gebeurt hangt af van data.pg_mode, gecheckt in elke handler,
  // zodat mid-sessie wisselen van Modus (via de instelling, zonder de module
  // opnieuw te laden) meteen goed werkt. "Lopende Band" heeft een EIGEN
  // wire/unwire-paar hieronder (wireProgBand), want dat vervangt de hele
  // kaart-weergave i.p.v. een widget erbovenop te tonen — zelfde opsplitsing
  // als Noten Lezen se Kaarten- vs. Band-MIDI-controle hierboven.
  // Kaarten: één akkoord tegelijk, zelfde aanpak als Akkoorden (2.2).
  // Reeks: een hele benoemde progressie stap voor stap, met een pillenrij
  // (romeinse cijfers, geen "Hint"-instelling nodig — de HELE oefening is
  // een bekende, benoemde progressie naspelen, geen theorie-vraag om te
  // verbergen). Beide respecteren de "Octaaf"-instelling (Exact/Vrij).
  _midiProgBound: null,
  _midiProgDebounce: null,
  _midiProgAdvancing: false,
  _progSeqIndex: 0,
  _progSeqDebounce: null,
  _progSeqAdvancing: false,

  wireMidiProgCheck(){
    if (!MidiEngine.connected) return;
    this._midiProgAdvancing = false;
    this._progSeqAdvancing = false;
    this._refreshMidiProgUI();
    this._midiProgBound = (e) => this._onMidiProgEvent(e);
    MidiEngine.onNote(this._midiProgBound);
  },
  unwireMidiProgCheck(){
    if (this._midiProgBound) MidiEngine.offNote(this._midiProgBound);
    this._midiProgBound = null;
    if (this._midiProgDebounce){ clearTimeout(this._midiProgDebounce); this._midiProgDebounce = null; }
    if (this._progSeqDebounce){ clearTimeout(this._progSeqDebounce); this._progSeqDebounce = null; }
    const status = document.getElementById('midi-answer-status');
    const progress = document.getElementById('midi-scale-progress');
    if (status) status.style.display = 'none';
    if (progress){ progress.style.display = 'none'; progress.innerHTML = ''; }
  },
  // Kiest en reset het juiste widget voor de HUIDIGE vraag/modus — draait bij
  // elke nieuwe vraag opnieuw (zie renderData()), zelfde patroon als
  // _refreshMidiIntervalUI()/_refreshMidiNoteUI().
  _refreshMidiProgUI(){
    const data = this.history[this.historyIndex];
    if (!data) return;
    const status = document.getElementById('midi-answer-status');
    const progress = document.getElementById('midi-scale-progress');
    if (data.pg_mode === 'kaarten'){
      if (progress){ progress.style.display = 'none'; progress.innerHTML = ''; }
      if (status){ status.style.display = 'block'; status.className = ''; status.textContent = Lang.t('midiChordListening'); }
    } else if (data.pg_mode === 'reeks'){
      if (status) status.style.display = 'none';
      this._progSeqIndex = 0;
      this._progSeqAdvancing = false;
      this._buildProgSeqProgress(data);
    } else {
      if (status) status.style.display = 'none';
      if (progress){ progress.style.display = 'none'; progress.innerHTML = ''; }
    }
  },
  _onMidiProgEvent(e){
    if (this.currentModule !== 'progressions') return;
    const data = this.history[this.historyIndex];
    if (!data) return;
    if (data.pg_mode === 'kaarten'){
      if (this._midiProgDebounce) clearTimeout(this._midiProgDebounce);
      this._midiProgDebounce = setTimeout(() => this._evaluateMidiProgAnswer(), 120);
    } else if (data.pg_mode === 'reeks'){
      if (this._progSeqDebounce) clearTimeout(this._progSeqDebounce);
      this._progSeqDebounce = setTimeout(() => this._evaluateProgSeqStep(), 120);
    }
  },
  _evaluateMidiProgAnswer(){
    if (this._midiProgAdvancing || this.currentModule !== 'progressions') return;
    const data = this.history[this.historyIndex];
    const status = document.getElementById('midi-answer-status');
    if (!data || data.pg_mode !== 'kaarten' || !data.slices || !data.slices[0] || !status) return;
    const octaveMode = this.getSetting('progressions', 'octaveMode', 'exact');
    const result = octaveMode === 'exact'
      ? MusicTheory.matchExactNotes(MidiEngine.activeNotes, data.slices[0])
      : MusicTheory.matchChordNotes(MidiEngine.activeNotes, data.slices[0]);
    if (result === 'incomplete'){
      status.className = ''; status.textContent = Lang.t('midiChordListening');
    } else if (result === 'wrong'){
      status.className = 'wrong'; status.textContent = Lang.t('midiChordWrong');
    } else {
      status.className = 'correct'; status.textContent = Lang.t('midiChordCorrect');
      this._midiProgAdvancing = true;
      this.clearAutoTimers();
      setTimeout(() => {
        if (this.currentModule === 'progressions'){
          this.nextQuestion();
          this._midiProgAdvancing = false;
          const s = document.getElementById('midi-answer-status');
          if (s){ s.className = ''; s.textContent = Lang.t('midiChordListening'); }
        }
      }, 600);
    }
  },
  // Eén pil per akkoord in de progressie, gelabeld met de romeinse trapnaam
  // (data.progDegs) — anders dan Toonladders se pillenrij is er hier bewust
  // GEEN "Hint aan/uit"-keuze: de trapnaam verbergen zou hier niets meer
  // testen (de reeks is per definitie al een bekende, benoemde progressie).
  _buildProgSeqProgress(data){
    const progress = document.getElementById('midi-scale-progress');
    if (!progress || !data.progDegs) return;
    progress.style.display = 'flex';
    progress.innerHTML = data.progDegs.map((d, i) => {
      const cls = i === this._progSeqIndex ? 'current' : '';
      return `<span class="midi-scale-note ${cls}" data-index="${i}">${d.n}</span>`;
    }).join('');
  },
  _evaluateProgSeqStep(){
    if (this._progSeqAdvancing || this.currentModule !== 'progressions') return;
    const data = this.history[this.historyIndex];
    const progress = document.getElementById('midi-scale-progress');
    if (!data || data.pg_mode !== 'reeks' || !data.slices || !progress) return;
    const target = data.slices[this._progSeqIndex];
    if (!target) return;
    const octaveMode = this.getSetting('progressions', 'octaveMode', 'exact');
    const result = octaveMode === 'exact'
      ? MusicTheory.matchExactNotes(MidiEngine.activeNotes, target)
      : MusicTheory.matchChordNotes(MidiEngine.activeNotes, target);
    const pill = progress.querySelector(`[data-index="${this._progSeqIndex}"]`);
    if (result === 'correct'){
      if (pill){ pill.classList.remove('current', 'wrong'); pill.classList.add('done'); }
      this._progSeqIndex++;
      if (this._progSeqIndex >= data.slices.length){
        this._progSeqAdvancing = true;
        this.clearAutoTimers();
        setTimeout(() => {
          if (this.currentModule === 'progressions'){ this.nextQuestion(); this._progSeqAdvancing = false; }
        }, 700);
      } else {
        const nextPill = progress.querySelector(`[data-index="${this._progSeqIndex}"]`);
        if (nextPill) nextPill.classList.add('current');
      }
    } else if (result === 'wrong' && pill){
      pill.classList.add('wrong');
      setTimeout(() => { if (pill) pill.classList.remove('wrong'); }, 400);
    }
  },

  // ---- Lopende-band-modus Akkoordprogressies (Fase 2.6, bouwt op
  // ScrollEngine + MidiEngine, zelfde patroon als Noten Lezen se Lopende
  // Band hierboven) ----
  // Enige wezenlijke verschil: elke stap hier is een AKKOORD (3+
  // gelijktijdige noten) i.p.v. een losse toets, dus reageert dit op zowel
  // 'on'- als 'off'-events met een kleine debounce (net als Akkoorden/
  // Intervallen-Harmonisch), i.p.v. direct op de eerste aanslag zoals Noten
  // Lezen se Lopende Band. Het aantal stappen per sessie ligt niet vast
  // (PROGRESSIONS_BAND_COUNT herkenbare progressies achter elkaar, elk 3 of
  // 4 akkoorden lang) — de teller gebruikt daarom data.progBandSequence.length
  // als totaal i.p.v. een vaste constante zoals NOTES_BAND_LENGTH.
  _scrollProgBandBound: null,
  _progBandDebounce: null,
  _progBandCorrectCount: 0,

  wireProgBand(){
    if (!MidiEngine.connected) return;
    this._progBandCorrectCount = 0;
    this._updateProgBandCounter();
    this._scrollProgBandBound = (e) => this._onProgBandEvent(e);
    MidiEngine.onNote(this._scrollProgBandBound);
  },
  unwireProgBand(){
    if (this._scrollProgBandBound) MidiEngine.offNote(this._scrollProgBandBound);
    this._scrollProgBandBound = null;
    if (this._progBandDebounce){ clearTimeout(this._progBandDebounce); this._progBandDebounce = null; }
    ScrollEngine.stop();
  },
  _updateProgBandCounter(){
    const counter = document.getElementById('scroll-counter');
    const data = this.history[this.historyIndex];
    const total = data && data.progBandSequence ? data.progBandSequence.length : 0;
    if (counter) counter.textContent = Lang.t('scrollCounter', { n: this._progBandCorrectCount, total });
  },
  _renderProgBand(data, startIndex = 0){
    const host = document.getElementById('scroll-strip-host');
    const status = document.getElementById('scroll-status');
    if (!host || !status) return;
    if (!MidiEngine.connected){
      host.innerHTML = '';
      status.className = ''; status.textContent = Lang.t('scrollNeedsMidi');
      return;
    }
    ScrollEngine.render('scroll-strip-host', data.progBandSequence, { useFlats: data.useFlats, startIndex });
    status.className = ''; status.textContent = Lang.t('midiChordListening');
    this._updateProgBandCounter();
  },
  _onProgBandEvent(e){
    if (this.currentModule !== 'progressions') return;
    const data = this.history[this.historyIndex];
    if (!data || data.pg_mode !== 'band') return;
    if (this._progBandDebounce) clearTimeout(this._progBandDebounce);
    this._progBandDebounce = setTimeout(() => this._evaluateProgBandStep(), 120);
  },
  _evaluateProgBandStep(){
    if (this.currentModule !== 'progressions') return;
    const data = this.history[this.historyIndex];
    const status = document.getElementById('scroll-status');
    if (!data || data.pg_mode !== 'band' || !status) return;
    const target = ScrollEngine.currentTarget();
    if (!target) return;
    const octaveMode = this.getSetting('progressions', 'octaveMode', 'exact');
    const result = octaveMode === 'exact'
      ? MusicTheory.matchExactNotes(MidiEngine.activeNotes, target)
      : MusicTheory.matchChordNotes(MidiEngine.activeNotes, target);
    if (result === 'correct'){
      ScrollEngine.markCurrent('correct');
      this._progBandCorrectCount++;
      this._updateProgBandCounter();
      if (this._progBandCorrectCount >= data.progBandSequence.length){
        status.className = 'correct'; status.textContent = Lang.t('scrollSessionComplete', { total: data.progBandSequence.length });
        this.clearAutoTimers();
      } else {
        ScrollEngine.advance();
        status.className = ''; status.textContent = Lang.t('midiChordListening');
      }
    } else if (result === 'wrong'){
      ScrollEngine.flashWrong();
      status.className = 'wrong'; status.textContent = Lang.t('midiChordWrong');
      setTimeout(() => {
        if (this.currentModule === 'progressions' && document.getElementById('scroll-status')){
          status.className = ''; status.textContent = Lang.t('midiChordListening');
        }
      }, 400);
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
    const opts = w ? { canvasW: w } : {};
    // Notenbereik-instelling (Fase 2.1a): alleen relevant voor Noten Lezen,
    // en alleen als er daadwerkelijk voor één sleutel gekozen is — "both"
    // laat ScoreRenderer gewoon de bestaande grand-staff tekenen.
    if (id === 'notes'){
      const clef = this.getSetting('notes', 'clef', 'both');
      if (clef !== 'both') opts.clef = clef;
    }
    return opts;
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
    // Lopende-band-modus (Fase 1.2) heeft geen "antwoord onthullen"-concept
    // en wordt puur door MIDI-input voortgestuwd — de gewone Noten Lezen-
    // auto-advance-instelling (zelfde sleutel, alleen relevant voor
    // Kaarten) mag hier dus nooit een timer opstarten.
    if (id === 'notes' && this.getSetting('notes', 'mode', 'kaarten') === 'band') return;
    // Zelfde reden als hierboven: Akkoordprogressies' Reeks/Lopende-Band-
    // modi (Fase 2.6) zijn ook puur MIDI-gestuurd, geen "onthullen"-concept.
    if (id === 'progressions' && this.getSetting('progressions', 'mode', 'kaarten') !== 'kaarten') return;
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
        </div>
        <div class="setting-group">
          <label>${Lang.t('mode_label')}</label>
          <div class="opt-row" id="opt-notes-mode"></div>
        </div>
        <div class="setting-group">
          <label>${Lang.t('clef_label')}</label>
          <div class="opt-row" id="opt-notes-clef"></div>
        </div>`;
      this.renderSingleSelect(document.getElementById('opt-notes-level'), 'notes', 'level',
        [
          {value:'easy', label:Lang.t('level_easy'), shortLabel:Lang.t('level_easy_short')},
          {value:'med', label:Lang.t('level_med'), shortLabel:Lang.t('level_med_short')},
          {value:'hard', label:Lang.t('level_hard'), shortLabel:Lang.t('level_hard_short')}
        ], 'easy');
      // Notenbereik-instelling (Fase 2.1a, sinds v0.12.0): bepaalt zowel
      // welke sleutel(s) ScoreRenderer/ScrollEngine tekenen als welk
      // MIDI-bereik _generateOneQuestion() gebruikt (zie daar — bewust
      // dezelfde fallback 'both' op beide plekken, zelfde valkuil als
      // eerder bij Akkoorden/Toonladders se defaults, ditmaal vermeden).
      // Werkt in zowel Kaarten als Lopende Band.
      this.renderSingleSelect(document.getElementById('opt-notes-clef'), 'notes', 'clef',
        [{value:'both', label:Lang.t('clef_both')}, {value:'treble', label:Lang.t('clef_treble')}, {value:'bass', label:Lang.t('clef_bass')}], 'both');
      // Modus-instelling (Fase 1.2/2.1c, sinds v0.10.0): "Kaarten" is de
      // bestaande flashcard-flow (zelfbeoordeling, ongewijzigd), "Lopende
      // Band" is de nieuwe MIDI-gestuurde scrollende notenbalk (zie
      // ScrollEngine + App.wireScrollBand()) — vereist een verbonden
      // MIDI-apparaat. "Automatisch doorgaan" hoort alleen bij Kaarten
      // (er is in Lopende Band niets om automatisch te "onthullen" —
      // voortgang komt daar puur uit MIDI-input), dus die knoppenrij
      // verschijnt alleen in die stand.
      this.renderSingleSelect(document.getElementById('opt-notes-mode'), 'notes', 'mode',
        [{value:'kaarten', label:Lang.t('mode_cards')}, {value:'band', label:Lang.t('mode_band')}], 'kaarten',
        // De Auto-knoppenrij hoort/verschijnt alleen bij Kaarten — zonder
        // deze her-render zou hij pas na het opnieuw openen van de module
        // verdwijnen/verschijnen i.p.v. meteen bij het wisselen.
        () => this.buildSettings('notes'));
      if (this.getSetting('notes', 'mode', 'kaarten') === 'kaarten') this.buildAutoAdvanceControls('notes', c);

    } else if (id === 'scales'){
      t.innerText = Lang.t('nav_scales');
      const keys = Object.keys(MusicTheory.scales);
      c.innerHTML = `
        <div class="setting-group"><label>${Lang.t('type_label')}</label><div class="opt-row" id="opt-scale-types"></div></div>
        <div class="setting-group"><label>${Lang.t('octaves_label')}</label><div class="opt-row" id="opt-scale-octaves"></div></div>
        <div class="setting-group"><label>${Lang.t('hint_label')}</label><div class="opt-row" id="opt-scale-hint"></div></div>`;
      // Standaard alleen "Majeur" geselecteerd (was voorheen alle types) —
      // zelfde reden/patroon als de Akkoorden-default hierboven.
      this.renderMultiSelect(document.getElementById('opt-scale-types'), 'scales', 'types',
        keys.map(k => ({value:k, label:Lang.scaleName(k)})), ['Majeur']);
      // Octaven-instelling (Fase 2.3): bewust LOS van een bestaand niveau
      // (die bestaat niet eens voor Toonladders) — puur bepalend voor hoe
      // ver de gegenereerde toonladder-reeks doorloopt, zowel op de
      // notenbalk als voor de MIDI-speel-na-controle hieronder.
      this.renderSingleSelect(document.getElementById('opt-scale-octaves'), 'scales', 'octaves',
        [{value:'1', label:Lang.t('oct_1')}, {value:'2', label:Lang.t('oct_2')}], '1');
      // Hint-instelling (sinds v0.9.0, op verzoek): standaard UIT, zodat de
      // MIDI-pillen-rij geen notennamen verklapt — je moet de noten echt
      // van de notenbalk lezen. Alleen het label op de pillen verandert
      // hierdoor (zie _buildMidiScaleProgress()); de matchlogica van de
      // MIDI-controle zelf blijft ongewijzigd exact op MIDI-nummer.
      // Geen onChangeExtra nodig: renderSingleSelect roept sowieso
      // nextQuestion() aan bij elke instellingswijziging, en renderData()
      // bouwt de pillen-rij (met het nieuwe hint-label) daar al opnieuw op.
      this.renderSingleSelect(document.getElementById('opt-scale-hint'), 'scales', 'hint',
        [{value:'uit', label:Lang.t('auto_off')}, {value:'aan', label:Lang.t('auto_on')}], 'uit');
      this.buildAutoAdvanceControls('scales', c);

    } else if (id === 'chords'){
      t.innerText = Lang.t('nav_chords');
      const keys = Object.keys(MusicTheory.chords);
      c.innerHTML = `
        <div class="setting-group"><label>${Lang.t('type_label')}</label><div class="opt-row" id="opt-chord-types"></div></div>
        <div class="setting-group"><label>${Lang.t('inversions_label')}</label><div class="opt-row" id="opt-chord-inv"></div></div>
        <div class="setting-group"><label>${Lang.t('octave_label')}</label><div class="opt-row" id="opt-chord-octave"></div></div>`;
      // Standaard alleen "Majeur" geselecteerd (was voorheen alle types) —
      // op verzoek van de gebruiker, zodat een nieuwe/gewiste sessie niet
      // meteen met alle 11 types tegelijk start.
      this.renderMultiSelect(document.getElementById('opt-chord-types'), 'chords', 'types',
        keys.map(k => ({value:k, label:Lang.chordName(k)})), ['Majeur']);
      this.renderSingleSelect(document.getElementById('opt-chord-inv'), 'chords', 'inversion',
        [{value:'0', label:Lang.t('inv_root')}, {value:'1', label:Lang.t('inv_1')}, {value:'2', label:Lang.t('inv_2')}, {value:'3', label:Lang.t('inv_3')}, {value:'ALL', label:Lang.t('inv_all')}], '0');
      // Octaaf-instelling (sinds v0.9.0, op verzoek): "Exact" (default) wil
      // zeggen dat de MIDI-controle het akkoord in het daadwerkelijk
      // genoteerde octaaf verwacht (zie MusicTheory.matchExactNotes) —
      // "Vrij" herstelt het oude gedrag (elk octaaf goed, zie
      // MusicTheory.matchChordNotes). Alleen relevant met MIDI verbonden,
      // maar staat hier altijd (net als de andere instellingen) zodat 'm
      // vooraf al kan worden ingesteld.
      this.renderSingleSelect(document.getElementById('opt-chord-octave'), 'chords', 'octaveMode',
        [{value:'exact', label:Lang.t('octave_exact')}, {value:'vrij', label:Lang.t('octave_free')}], 'exact');
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
        <div class="setting-group"><label>${Lang.t('interval_label')}</label><div class="opt-row" id="opt-int-choice"></div></div>
        <div class="setting-group"><label>${Lang.t('octave_label')}</label><div class="opt-row" id="opt-int-octave"></div></div>`;
      this.renderSingleSelect(document.getElementById('opt-int-display'), 'intervals', 'display',
        [{value:'visual', label:Lang.t('int_display_visual')}, {value:'blind', label:Lang.t('int_display_blind')}], 'visual');
      this.renderSingleSelect(document.getElementById('opt-int-play'), 'intervals', 'play',
        [{value:'melodic', label:Lang.t('int_play_melodic')}, {value:'harmonic', label:Lang.t('int_play_harmonic')}], 'melodic');
      this.renderMultiSelect(document.getElementById('opt-int-choice'), 'intervals', 'choice',
        names.map(n => ({value:n, label: INTERVAL_ABBR[n] || n})), ['Octaaf']);
      // Zelfde "Exact"/"Vrij"-keuze als bij Akkoorden, zie toelichting daar
      // en bij MusicTheory.matchExactNotes/matchIntervalNotes.
      this.renderSingleSelect(document.getElementById('opt-int-octave'), 'intervals', 'octaveMode',
        [{value:'exact', label:Lang.t('octave_exact')}, {value:'vrij', label:Lang.t('octave_free')}], 'exact');

    } else if (id === 'progressions'){
      t.innerText = Lang.t('nav_progressions');
      // Modus-instelling (Fase 2.6, sinds v0.14.0): "Kaarten" = bestaande
      // trap-voor-trap-pool (ongewijzigd, "Majeur/Mineur/Beide" hoort daar
      // alleen bij). "Reeks"/"Lopende Band" gebruiken de nieuwe
      // MusicTheory.progressions-bibliotheek (altijd majeur-context, zie
      // daar) — geen Majeur/Mineur-instelling in die twee standen.
      const progMode = this.getSetting('progressions', 'mode', 'kaarten');
      c.innerHTML = `
        <div class="setting-group">
          <label>${Lang.t('mode_label')}</label>
          <div class="opt-row" id="opt-prog-mode"></div>
        </div>
        ${progMode === 'kaarten' ? `<div class="setting-group">
          <label>${Lang.t('key_label')}</label>
          <div class="opt-row" id="opt-prog-key"></div>
        </div>` : ''}
        <div class="setting-group">
          <label>${Lang.t('octave_label')}</label>
          <div class="opt-row" id="opt-prog-octave"></div>
        </div>`;
      this.renderSingleSelect(document.getElementById('opt-prog-mode'), 'progressions', 'mode',
        [{value:'kaarten', label:Lang.t('mode_cards')}, {value:'reeks', label:Lang.t('mode_sequence')}, {value:'band', label:Lang.t('mode_band')}], 'kaarten',
        // Majeur/Mineur-rij en Auto-doorgaan horen alleen bij Kaarten —
        // her-render nodig zodat ze meteen verschijnen/verdwijnen bij het
        // wisselen, zelfde patroon als Noten Lezen se Modus-instelling.
        () => this.buildSettings('progressions'));
      if (progMode === 'kaarten'){
        this.renderSingleSelect(document.getElementById('opt-prog-key'), 'progressions', 'key',
          [{value:'maj', label:Lang.t('prog_key_maj')}, {value:'min', label:Lang.t('prog_key_min')}, {value:'both', label:Lang.t('prog_key_both')}], 'maj');
      }
      // Zelfde "Exact"/"Vrij"-keuze als Akkoorden/Intervallen (zie
      // MusicTheory.matchExactNotes/matchChordNotes) — geldt voor alle drie
      // Progressies-modi, dus buiten de progMode-check.
      this.renderSingleSelect(document.getElementById('opt-prog-octave'), 'progressions', 'octaveMode',
        [{value:'exact', label:Lang.t('octave_exact')}, {value:'vrij', label:Lang.t('octave_free')}], 'exact');
      if (progMode === 'kaarten') this.buildAutoAdvanceControls('progressions', c);
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
  // Aantal noten in één lopende-band-SESSIE (Fase 1.2/2.1c) — sinds
  // v0.11.0 op verzoek 100 i.p.v. een kort reeksje van 8: de hele sessie
  // wordt in één keer gegenereerd en als ÉÉN doorlopende strip gerenderd
  // (geen "spring terug naar het begin" om de zoveel noten meer, zie
  // ScrollEngine — dat was de expliciete klacht). De teller
  // (`_notesBandCorrectCount`) telt hiertegen op.
  NOTES_BAND_LENGTH: 100,
  // Aantal progressies achter elkaar in Akkoordprogressies' Lopende-Band-
  // sessie (Fase 2.6) — 8 progressies × 3-4 akkoorden = 24-32 akkoorden
  // per sessie, bewust korter dan Noten Lezen se 100 (elk akkoord kost
  // veel meer "leestijd"/toetsaanslagen dan één losse noot).
  PROGRESSIONS_BAND_COUNT: 8,

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
      // Notenbereik-instelling (Fase 2.1a): fallback MOET letterlijk gelijk
      // zijn aan buildSettings()'s eigen fallback ('both') — zelfde valkuil
      // als eerder bij Akkoorden/Toonladders, zie Root_Note_Context.md.
      // Midden-C (60) is de knip: vioolsleutel = alles vanaf 60, basleutel
      // = alles onder 60. Bij elk Niveau overlapt het bereik al ruim beide
      // kanten, dus dit versmalt het bereik zonder het leeg te maken.
      let clef = this.getSetting('notes', 'clef', 'both');
      if (clef === 'treble') min = Math.max(min, 60);
      else if (clef === 'bass') max = Math.min(max, 59);
      let mode = this.getSetting('notes', 'mode', 'kaarten');
      data.n_mode = mode; data.n_clef = clef;
      if (mode === 'band'){
        // Lopende-band-modus (Fase 1.2/2.1c): één "vraag" is hier een hele
        // reeks losse noten i.p.v. één noot — data.slices blijft leeg
        // (niets in deze modus gebruikt de gewone kaart-rendering), de
        // reeks zelf staat in data.bandSequence. Geen anti-herhaling nodig
        // (zie _questionKey hieronder) — bij NOTES_BAND_LENGTH willekeurige
        // noten uit een bereik van minstens 25 stuks is een exacte herhaalde
        // reeks astronomisch onwaarschijnlijk.
        const seq = [];
        for (let i = 0; i < this.NOTES_BAND_LENGTH; i++) seq.push(randomInt(min, max));
        data.type = 'none'; data.slices = [];
        data.useFlats = Math.random() > 0.5;
        data.kind = 'notesBand'; data.bandSequence = seq;
      } else {
        let m = randomInt(min, max);
        let useFlats = Math.random() > 0.5;
        data.type = 'note'; data.slices = [[m]]; data.m = m;
        data.useFlats = useFlats;
        data.kind = 'note'; data.noteMidi = m;
      }
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
      let octaves = parseInt(this.getSetting('scales', 'octaves', '1'));
      let formula = MusicTheory.buildScaleFormula(MusicTheory.scales[type], octaves);
      let notes = formula.map(iv => root + iv);
      let useFlats = [53, 58, 51, 56, 49, 65, 70, 63, 68, 61].includes(root);
      data.type = 'sequence';
      data.useFlats = useFlats;
      data.slices = notes.map(n => [n]);
      data.kind = 'scale'; data.scaleRoot = root; data.scaleType = type; data.octaves = octaves;
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
      // Modus-instelling (Fase 2.6, sinds v0.14.0): "Kaarten" is de
      // bestaande trap-voor-trap-vragenpool hieronder, ONGEWIJZIGD. "Reeks"
      // en "Lopende Band" zijn nieuw en gebruiken de losstaande
      // MusicTheory.progressions-bibliotheek (herkenbare, benoemde
      // progressies) i.p.v. een willekeurige trap uit de pool — bewust
      // gescheiden datamodellen, zie Root_Note_Context.md.
      let mode = this.getSetting('progressions', 'mode', 'kaarten');
      data.pg_mode = mode;

      if (mode === 'reeks' || mode === 'band'){
        const buildOneProgression = () => {
          const names = Object.keys(MusicTheory.progressions);
          const progName = names[randomInt(0, names.length - 1)];
          const degs = MusicTheory.progressions[progName];
          const rootKeyIdx = randomInt(0, 11);
          const rootName = MusicTheory.circle.keys[rootKeyIdx];
          const accidentals = MusicTheory.circle.accidentals[rootKeyIdx];
          const rootToMidiMap = {"C":60,"G":67,"D":62,"A":69,"E":64,"B":71,"F#":66,"Db":61,"Ab":68,"Eb":63,"Bb":70,"F":65};
          const rootMidi = rootToMidiMap[rootName];
          const slices = degs.map(d => {
            const chordRoot = rootMidi + d.iv;
            return MusicTheory.chords[d.q].map(iv => chordRoot + iv);
          });
          return { progName, rootName, useFlats: accidentals < 0, slices, degs };
        };
        if (mode === 'reeks'){
          // Eén hele, herkenbare progressie per "vraag" — vergelijkbaar met
          // hoe Toonladders/Intervallen-Melodisch een stap-voor-stap-reeks
          // met pillen tonen, hier per AKKOORD i.p.v. per losse noot.
          // data.slices/data.type hergebruiken de BESTAANDE notenbalk-/
          // afspeel-infrastructuur ongewijzigd (ScoreRenderer tekent elke
          // slice als een akkoord op de balk, playCurrent()'s
          // 'sequence'-tak speelt de akkoorden na elkaar) — enkel de MIDI-
          // stap-voor-stap-controle (progDegs-pillen) is nieuw.
          const prog = buildOneProgression();
          data.type = 'sequence'; data.slices = prog.slices;
          data.useFlats = prog.useFlats;
          data.kind = 'progressionSeq';
          data.progName = prog.progName; data.progRootName = prog.rootName;
          data.progDegs = prog.degs;
        } else {
          // Lopende Band: meerdere progressies achter elkaar geplakt tot
          // ÉÉN doorlopende sessie (zelfde "geen tussentijdse reset"-
          // principe als Noten Lezen sinds v0.11.0).
          let seq = [], useFlats = false;
          for (let i = 0; i < this.PROGRESSIONS_BAND_COUNT; i++){
            const prog = buildOneProgression();
            seq = seq.concat(prog.slices);
            useFlats = prog.useFlats;
          }
          data.type = 'none'; data.slices = [];
          data.useFlats = useFlats;
          data.kind = 'progressionBand'; data.progBandSequence = seq;
        }
      } else {
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
      case 'progressionSeq':
        // Geen "vraag/antwoord om te onthullen" — de Reeks-modus is een
        // uitvoeringsoefening op een BEKENDE, benoemde progressie, dus het
        // opschrift toont direct naam + toonsoort als context (net als een
        // lead sheet-titel), niet iets om te raden.
        return { q: `${Lang.progressionName(data.progName)} — ${data.progRootName}`, ans: '' };
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
    // Nieuwe toonladder = nieuwe reeks: index en pillen-rij opnieuw opbouwen
    // (zelfde route-onafhankelijke reset als bij Akkoorden hierboven).
    if (id === 'scales'){
      const progress = document.getElementById('midi-scale-progress');
      if (progress && progress.style.display !== 'none'){
        this._midiScaleIndex = 0;
        this._buildMidiScaleProgress(data);
      }
    }
    // Nieuw interval: juiste widget (status-regel of 2-stappen-pillen)
    // opnieuw kiezen/resetten — data.type kan per vraag wisselen als de
    // afspeelmodus-instelling (Melodisch/Harmonisch) is aangepast.
    if (id === 'intervals' && MidiEngine.connected) this._refreshMidiIntervalUI();
    // Nieuwe noot (Kaarten) of nieuwe reeks (Lopende Band): juiste widget
    // opnieuw kiezen/resetten — data.n_mode kan mid-sessie wisselen als de
    // Modus-instelling is aangepast, zelfde reden als bij Intervallen.
    if (id === 'notes' && MidiEngine.connected) this._refreshMidiNoteUI();
    // Nieuwe progressie-vraag (Kaarten/Reeks): juiste widget opnieuw kiezen/
    // resetten — data.pg_mode kan mid-sessie wisselen als de Modus-instelling
    // is aangepast, zelfde reden als bij Intervallen/Noten Lezen hierboven.
    if (id === 'progressions' && MidiEngine.connected) this._refreshMidiProgUI();
    const isCircleVisual = (id === 'circle' && data.c_mode === 'visual');
    const isNotesBand = (id === 'notes' && data.n_mode === 'band');
    const isProgBand = (id === 'progressions' && data.pg_mode === 'band');
    const { q, ans } = this.qa(data);

    document.getElementById('flashcard-actions').style.display = (isCircleVisual || isNotesBand || isProgBand) ? 'none' : 'flex';
    document.getElementById('swipe-hint').style.display = (isCircleVisual || isNotesBand || isProgBand) ? 'none' : 'block';

    if (isCircleVisual){
      svgBox.style.display = 'flex';
      document.getElementById('scroll-view').style.display = 'none';
      document.querySelector('.circle-main').style.display = 'grid';
      CircleWheel.render();
      ansDisp.innerText = Lang.t('circleTapHint');
    }
    else if (isNotesBand){
      svgBox.style.display = 'flex';
      document.querySelector('.circle-main').style.display = 'none';
      document.getElementById('scroll-view').style.display = 'flex';
      this._renderNotesBand(data);
    }
    else if (isProgBand){
      svgBox.style.display = 'flex';
      document.querySelector('.circle-main').style.display = 'none';
      document.getElementById('scroll-view').style.display = 'flex';
      this._renderProgBand(data);
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
