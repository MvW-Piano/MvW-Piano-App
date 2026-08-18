/* ============================================================
   TAAL / I18N — Nederlands (standaard) + Engels.
   Belangrijk architectuurprincipe: de interne data-modellen
   (MusicTheory.chords/scales/intervals-KEYS, opgeslagen instellingen in
   localStorage, CircleWheel-logica) blijven ALTIJD Nederlands-gesleuteld
   ("Majeur","Mineur Natuurlijk", enz.) — dat zijn interne identifiers, geen
   weergavetekst. Alleen wat je daadwerkelijk op het scherm ZIET wordt
   vertaald, via de losstaande *Names-opzoektabellen hieronder + Lang.t().
   Dit voorkomt dat een taalwissel oude opgeslagen instellingen (of de
   muziektheorie-logica zelf, die op deze Nederlandse strings matcht) breekt.
============================================================ */
const I18N = {
  nl: {
    nav_notes:'Noten Lezen', nav_scales:'Toonladders', nav_chords:'Akkoorden',
    nav_circle:'Kwintencirkel', nav_intervals:'Intervallen', nav_progressions:'Akkoordprogressies',
    nav_piano:'Virtuele Piano',
    navLabel_progressions:'Progressies', navLabel_piano:'Vrij Spelen',
    bnav_notes:'Noten', bnav_scales:'Ladders', bnav_chords:'Akk.', bnav_circle:'Cirkel',
    bnav_intervals:'Interv.', bnav_progressions:'Progr.', bnav_piano:'Piano',
    bnav_sound:'Geluid', bnav_theme:'Thema', bnav_fullscreen:'Scherm', bnav_reset:'Reset', bnav_lang:'Taal',
    tooltip_theme:'Wissel thema', tooltip_fullscreen:'Volledig scherm',
    tooltip_reset:'Instellingen resetten naar standaard', tooltip_samples:'Eigen pianogeluid laden',
    tooltip_sound_on:'Geluid uitzetten', tooltip_sound_off:'Geluid aanzetten',
    tooltip_midi_connected:'MIDI verbonden: {device}', tooltip_midi_none:'Geen MIDI-apparaat gevonden',
    tooltip_midi_unsupported:'MIDI wordt niet ondersteund in deze browser',
    settings_title:'Instellingen', settings_close:'Sluiten',
    level_label:'Niveau', level_easy:'Makkelijk (C3-C5)', level_easy_short:'Niv 1 (C3-C5)',
    level_med:'Gemiddeld (C2-C6)', level_med_short:'Niv 2 (C2-C6)',
    level_hard:'Moeilijk (C1-C7)', level_hard_short:'Niv 3 (C1-C7)',
    auto_label:'Auto', auto_on:'Aan', auto_off:'Uit', thinktime_label:'Bedenktijd:',
    type_label:'Type', inversions_label:'Omkeringen', mode_label:'Modus',
    display_label:'Weergave', playmode_label:'Afspeelmodus', interval_label:'Interval', key_label:'Toonsoort',
    inv_root:'Grondligging', inv_1:'1e Omkering', inv_2:'2e Omkering', inv_3:'3e Omkering', inv_all:'Alle Omkeringen',
    circle_mode_visual:'Kwintencirkel Interactief', circle_mode_rel:'Relatieve Toonsoort', circle_mode_acc:'Voortekens',
    int_display_visual:'Notenbalk', int_display_blind:'Blind (Audio)',
    int_play_melodic:'Melodisch', int_play_harmonic:'Harmonisch',
    prog_key_maj:'Majeur', prog_key_min:'Mineur', prog_key_both:'Beide',
    btn_play:'Speel Af', btn_showAnswer:'Toon Antwoord', btn_prev:'Vorige', btn_next:'Volgende',
    swipeHint:'Swipe ⬅➔ op de kaart om te wisselen',
    circleTapHint:'Tik op een toonsoort om het akkoord te horen.', listenBlind:'Luister goed... (Blind)',
    midiChordListening:'🎹 Speel het akkoord...', midiChordCorrect:'✓ Goed!', midiChordWrong:'Probeer opnieuw',
    qRelMinorOf:"Wat is de relatieve mineur van {key} Majeur?",
    qRelMajorOf:"Wat is de relatieve majeur van {key} mineur?",
    qWhichMajorHas:"Welke majeur toonsoort heeft {acc}?",
    qHowManyAccidentals:"Hoeveel voortekens heeft {key} Majeur?",
    qDegreeIn:"Wat is trap '{deg}' in {key} {kw}?",
    major:'Majeur', minorLower:'mineur',
    zeroAccidentals:'0 voortekens', nSharps:'{n} kruisen (#)', nFlats:'{n} mollen (b)',
    resetConfirm:'Alle instellingen terugzetten naar standaard? Dit geldt voor alle modules en kan niet ongedaan gemaakt worden.',
    piano_left:'Links', piano_center:'Midden (C4)', piano_right:'Rechts',
    homeSubtitle:'De Piano Trainer'
  },
  en: {
    nav_notes:'Note Reading', nav_scales:'Scales', nav_chords:'Chords',
    nav_circle:'Circle of Fifths', nav_intervals:'Intervals', nav_progressions:'Chord Progressions',
    nav_piano:'Virtual Piano',
    navLabel_progressions:'Progressions', navLabel_piano:'Free Play',
    bnav_notes:'Notes', bnav_scales:'Scales', bnav_chords:'Chords', bnav_circle:'Circle',
    bnav_intervals:'Interv.', bnav_progressions:'Progr.', bnav_piano:'Piano',
    bnav_sound:'Sound', bnav_theme:'Theme', bnav_fullscreen:'Screen', bnav_reset:'Reset', bnav_lang:'Language',
    tooltip_theme:'Switch theme', tooltip_fullscreen:'Fullscreen',
    tooltip_reset:'Reset settings to default', tooltip_samples:'Load your own piano sound',
    tooltip_sound_on:'Turn sound off', tooltip_sound_off:'Turn sound on',
    tooltip_midi_connected:'MIDI connected: {device}', tooltip_midi_none:'No MIDI device found',
    tooltip_midi_unsupported:'MIDI is not supported in this browser',
    settings_title:'Settings', settings_close:'Close',
    level_label:'Level', level_easy:'Easy (C3-C5)', level_easy_short:'Lvl 1 (C3-C5)',
    level_med:'Intermediate (C2-C6)', level_med_short:'Lvl 2 (C2-C6)',
    level_hard:'Hard (C1-C7)', level_hard_short:'Lvl 3 (C1-C7)',
    auto_label:'Auto', auto_on:'On', auto_off:'Off', thinktime_label:'Think time:',
    type_label:'Type', inversions_label:'Inversions', mode_label:'Mode',
    display_label:'Display', playmode_label:'Playback mode', interval_label:'Interval', key_label:'Key',
    inv_root:'Root Position', inv_1:'1st Inversion', inv_2:'2nd Inversion', inv_3:'3rd Inversion', inv_all:'All Inversions',
    circle_mode_visual:'Interactive Circle of Fifths', circle_mode_rel:'Relative Key', circle_mode_acc:'Key Signatures',
    int_display_visual:'Staff Notation', int_display_blind:'Blind (Audio)',
    int_play_melodic:'Melodic', int_play_harmonic:'Harmonic',
    prog_key_maj:'Major', prog_key_min:'Minor', prog_key_both:'Both',
    btn_play:'Play', btn_showAnswer:'Show Answer', btn_prev:'Previous', btn_next:'Next',
    swipeHint:'Swipe ⬅➔ on the card to switch',
    circleTapHint:'Tap a key to hear the chord.', listenBlind:'Listen carefully... (Blind)',
    midiChordListening:'🎹 Play the chord...', midiChordCorrect:'✓ Correct!', midiChordWrong:'Try again',
    qRelMinorOf:"What is the relative minor of {key} Major?",
    qRelMajorOf:"What is the relative major of {key} minor?",
    qWhichMajorHas:"Which major key has {acc}?",
    qHowManyAccidentals:"How many accidentals does {key} Major have?",
    qDegreeIn:"What is degree '{deg}' in {key} {kw}?",
    major:'Major', minorLower:'minor',
    zeroAccidentals:'0 accidentals', nSharps:'{n} sharps (#)', nFlats:'{n} flats (b)',
    resetConfirm:'Reset all settings to default? This applies to all modules and cannot be undone.',
    piano_left:'Left', piano_center:'Center (C4)', piano_right:'Right',
    homeSubtitle:'The Piano Trainer',
    // Weergavenamen voor de Nederlands-gesleutelde muziektheorie-data
    // (zie architectuur-opmerking hierboven) — alleen nodig in het Engels,
    // want in het Nederlands IS de interne key al de juiste weergavetekst.
    scaleNames:{
      'Majeur':'Major', 'Mineur Natuurlijk':'Natural Minor', 'Mineur Harmonisch':'Harmonic Minor',
      'Mineur Melodisch':'Melodic Minor', 'Pentatonisch Majeur':'Major Pentatonic',
      'Pentatonisch Mineur':'Minor Pentatonic', 'Blues':'Blues'
    },
    chordNames:{
      'Majeur':'Major', 'Mineur':'Minor', 'Diminished':'Diminished', 'Sus2':'Sus2', 'Sus4':'Sus4',
      'Maj7':'Maj7', 'Min7':'Min7', 'Dom7':'Dom7', 'm7b5':'m7♭5', 'Maj9':'Maj9', 'Min9':'Min9'
    },
    intervalNames:{
      'Kleine Secunde':'Minor Second', 'Grote Secunde':'Major Second', 'Kleine Terts':'Minor Third',
      'Grote Terts':'Major Third', 'Reine Kwart':'Perfect Fourth', 'Tritonus':'Tritone',
      'Reine Kwint':'Perfect Fifth', 'Kleine Sext':'Minor Sixth', 'Grote Sext':'Major Sixth',
      'Klein Septiem':'Minor Seventh', 'Groot Septiem':'Major Seventh', 'Octaaf':'Octave'
    }
  }
};

const Lang = {
  KEY: 'pm_lang',
  current(){ return localStorage.getItem(this.KEY) || 'nl'; },
  t(key, params){
    let str = (I18N[this.current()] && I18N[this.current()][key]) || I18N.nl[key] || key;
    if (params) for (const k in params) str = str.split('{' + k + '}').join(params[k]);
    return str;
  },
  // Vertaalde weergavenaam voor een Nederlands-gesleutelde muziektheorie-
  // term — in het Nederlands is de key zelf al de juiste tekst.
  scaleName(key){ return this.current() === 'nl' ? key : (I18N.en.scaleNames[key] || key); },
  chordName(key){ return this.current() === 'nl' ? key : (I18N.en.chordNames[key] || key); },
  intervalName(key){ return this.current() === 'nl' ? key : (I18N.en.intervalNames[key] || key); },
  toggle(){
    localStorage.setItem(this.KEY, this.current() === 'nl' ? 'en' : 'nl');
    this.apply();
  },
  updateStaticText(){
    document.documentElement.lang = this.current();
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = this.t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = this.t(el.dataset.i18nTitle); });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', this.t(el.dataset.i18nAria)); });
    // Taalknop(pen) tonen altijd de HUIDIG actieve taal (niet de taal
    // waarnaartoe je zou schakelen) — op verzoek van de gebruiker, zelfde
    // "NL"/"EN"-tekst op alle drie plekken (home page, zijbalk, onderbalk).
    const langLabel = this.current() === 'nl' ? 'NL' : 'EN';
    const langTitle = 'Switch language / Wissel taal';
    const langStart = document.getElementById('lang-btn-start');
    if (langStart) langStart.textContent = langLabel;
    const langHeader = document.getElementById('lang-btn-header');
    if (langHeader){ langHeader.textContent = langLabel; langHeader.title = langTitle; }
    const langBnavIcon = document.getElementById('lang-btn-bnav-icon');
    if (langBnavIcon) langBnavIcon.textContent = langLabel;
    if (typeof SoundUI !== 'undefined') SoundUI.updateIcons();
    if (typeof MidiEngine !== 'undefined') MidiEngine.updateStatusIndicator();
  },
  // Ná de eerste keer wordt dit ook aangeroepen als de taal wisselt terwijl
  // de app al gestart is: instellingenpaneel + de huidige vraag/antwoord
  // moeten dan meteen in de nieuwe taal herrenderen (zonder een NIEUWE
  // willekeurige vraag te trekken — renderData() leest alleen de al
  // opgeslagen, taal-neutrale ruwe gegevens opnieuw uit, zie App.qa()).
  apply(){
    this.updateStaticText();
    if (typeof App === 'undefined' || !App.currentModule) return;
    if (App.currentModule === 'piano'){
      const mt = document.getElementById('module-title');
      if (mt) mt.innerText = this.t('nav_piano');
    } else {
      App.buildSettings(App.currentModule);
      if (App.history && App.history[App.historyIndex]) App.renderData(App.history[App.historyIndex]);
    }
  },
  init(){ this.updateStaticText(); }
};
