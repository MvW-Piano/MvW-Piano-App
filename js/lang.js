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
    nav_sightreading:'Vooruit Lezen',
    tooltip_sightreading:'Vooruit Lezen — vereist een MIDI-keyboard, werkt het prettigst op een groter scherm',
    nav_theory:'Muziektheorie', nav_piano:'Virtuele Piano',
    navLabel_progressions:'Progressies', navLabel_theory:'Theorie', navLabel_piano:'Vrij Spelen',
    // Tegel-overzicht (sinds v0.17.5) — zie TilesUI/TILE_REGISTRY. De drie
    // badge-teksten blijven bewust letterlijk Engels in beide talen, zelfde
    // precedent als de eerdere (sinds vervallen) `midiBadge:'MIDI'`.
    tiles_heading:'Kies je oefening', tooltip_back:'Terug',
    tileMidiEnabled:'MIDI Enabled', tileMidiOnly:'MIDI Only', tileUnderConstruction:'Under Construction',
    // Omschrijvingen op tegel-niveau (sinds de consolidatie naar 1 tegel per
    // app, zie TILE_REGISTRY/TilesUI) — dekken alle modi van de app in één
    // zin, zodat een eerste-keer-gebruiker meteen snapt wat de app kan
    // zonder eerst te hoeven klikken. De losse tileDesc_<app>_<modus>-teksten
    // hieronder blijven bestaan als tooltip op de modus-schakelaar-knoppen
    // in de app-header (zie App.renderModeSwitcher).
    tileDesc_notes:'Herken noten op de notenbalk — als kaarten, een scrollende band, of tegen de klok.',
    tileDesc_chords:'Herken en speel akkoorden — als kaarten, een scrollende band, of tegen de klok.',
    tileDesc_circle:'Verken het kwintencirkel-wiel, oefen relatieve toonsoorten en voortekens.',
    tileDesc_progressions:'Herken en speel akkoordprogressies — als kaarten, een reeks, of een lopende band.',
    // Korte omschrijvingen per Modus (gebruikersverzoek, herziene tegel-
    // opzet) — nu hergebruikt als tooltip op de modus-schakelaar in de
    // app-header, niet meer op losse Modus-tegels.
    tileDesc_notes_kaarten:'Herken losse noten op de notenbalk, in je eigen tempo.',
    tileDesc_notes_band:'Speel mee met een scrollende notenbalk, geen tijdsdruk.',
    tileDesc_notes_challenge:'Tegen de klok — mis je de lijn, dan telt het als fout.',
    tileDesc_scales:'Oefen toonladders in alle toonsoorten, met optioneel MIDI-speel-na.',
    tileDesc_chords_kaarten:'Herken akkoorden en hun omkeringen op de notenbalk.',
    tileDesc_chords_band:'Speel akkoorden mee op een scrollende notenbalk.',
    tileDesc_chords_challenge:'Akkoorden spelen tegen de klok.',
    tileDesc_circle_visual:'Verken het kwintencirkel-wiel en hoor elk akkoord.',
    tileDesc_circle_rel:'Oefen relatieve majeur/mineur-paren.',
    tileDesc_circle_acc:'Oefen het aantal voortekens per toonsoort.',
    tileDesc_intervals:'Herken intervallen, visueel of op het gehoor.',
    tileDesc_prog_kaarten:'Herken Romeinse-cijfer-trappen in bekende progressies.',
    tileDesc_prog_reeks:'Speel een genoemde progressie stap voor stap na.',
    tileDesc_prog_band:'Speel meerdere progressies achter elkaar mee.',
    tileDesc_sightreading:'Melodie en akkoorden tegelijk lezen — nog in ontwikkeling.',
    tileDesc_theory:'Naslagwerk met notatiesymbolen, geen quiz.',
    tileDesc_piano:'Een virtueel 88-toetsen klavier om vrij op te spelen.',
    reset_module_label:'Reset deze app',
    resetModuleConfirm:'Instellingen van deze app terugzetten naar standaard? Dit geldt voor alle modi van deze app en kan niet ongedaan gemaakt worden.',
    sr_chords_label:'Akkoorden', sr_melodyhand_label:'Melodie',
    sr_melodyhand_right:'Rechts (vioolsleutel)', sr_melodyhand_left:'Links (basleutel)',
    sr_speedRate_label:'Afspeelsnelheid',
    sr_stat_melody:'Melodie', sr_stat_chords:'Akkoorden', sr_stat_score:'Score',
    sightReadingComplete:'🎉 Sessie afgerond — Melodie {melodyCorrect}/{melodyMiss}, Akkoorden {chordCorrect}/{chordMiss}, Score: {score}',
    tooltip_theme:'Wissel thema', tooltip_fullscreen:'Volledig scherm', tooltip_samples:'Eigen pianogeluid laden',
    tooltip_sound_on:'Geluid uitzetten', tooltip_sound_off:'Geluid aanzetten',
    tooltip_midi_connected:'MIDI verbonden: {device}', tooltip_midi_none:'Geen MIDI-apparaat gevonden',
    tooltip_midi_unsupported:'MIDI wordt niet ondersteund in deze browser',
    settings_title:'Instellingen', settings_close:'Sluiten',
    level_label:'Niveau', level_easy:'Makkelijk (C3-C5)', level_easy_short:'Niv 1 (C3-C5)',
    level_med:'Gemiddeld (C2-C6)', level_med_short:'Niv 2 (C2-C6)',
    level_hard:'Moeilijk (C1-C7)', level_hard_short:'Niv 3 (C1-C7)',
    auto_label:'Auto', auto_on:'Aan', auto_off:'Uit', thinktime_label:'Bedenktijd:',
    type_label:'Type', inversions_label:'Omkeringen', mode_label:'Modus',
    octaves_label:'Octaven', oct_1:'1 Octaaf', oct_2:'2 Octaven',
    hint_label:'Hint', octave_label:'Octaaf', octave_exact:'Exact', octave_free:'Vrij',
    mode_cards:'Flashcards', mode_band:'Continu', mode_sequence:'Reeks', mode_challenge:'Challenge',
    challengeSpeed_label:'Snelheid',
    challengeDuration_label:'Duur', challengeDuration_s:'{s} sec',
    challengeStatus:'⏱ {time} — ✓ {correct} ✗ {miss}',
    challengeComplete:'🎉 Uitdaging afgerond — {correct} goed, {miss} gemist!',
    clef_label:'Notenbereik', clef_treble:'Vioolsleutel', clef_bass:'Basleutel', clef_both:'Beide',
    scrollNeedsMidi:'Sluit een MIDI-apparaat aan om deze modus te gebruiken.',
    midiNoteListening:'🎹 Speel de naderende noot...',
    midiNoteListeningStatic:'🎹 Speel de getoonde noot...',
    scrollCounter:'{n} / {total} goed', scrollSessionComplete:'🎉 Sessie voltooid — {total}/{total} goed!',
    midiScaleWrong:'Probeer opnieuw', midiScaleComplete:'✓ Toonladder compleet!',
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
    midiIntervalListening:'🎹 Speel het interval...',
    qRelMinorOf:"Wat is de relatieve mineur van {key} Majeur?",
    qRelMajorOf:"Wat is de relatieve majeur van {key} mineur?",
    qWhichMajorHas:"Welke majeur toonsoort heeft {acc}?",
    qHowManyAccidentals:"Hoeveel voortekens heeft {key} Majeur?",
    qDegreeIn:"Wat is trap '{deg}' in {key} {kw}?",
    major:'Majeur', minorLower:'mineur',
    zeroAccidentals:'0 voortekens', nSharps:'{n} kruisen (#)', nFlats:'{n} mollen (b)',
    piano_left:'Links', piano_center:'Midden (C4)', piano_right:'Rechts',
    homeSubtitle:'De Piano Trainer',
    // Muziektheorie-naslagwerk (Fase 3.2, sinds v0.15.0) — zie theory-data.js
    // voor de datastructuur en theory-ui.js voor hoe deze keys opgebouwd
    // worden (`theory_cat_<catKey>` / `theory_<itemKey>_title` /
    // `theory_<itemKey>_desc`).
    theory_cat_restsDuration:'Rusten & Notenduur', theory_cat_legatoSlur:'Legato & Binding',
    theory_cat_articulation:'Articulatie', theory_cat_dynamics:'Dynamiek', theory_cat_tempo:'Tempo-aanduidingen',
    theory_restWhole_title:'Hele noot & hele rust', theory_restWhole_desc:'Duurt 4 tellen in een maatsoort van 4/4 — de langste gangbare notenwaarde.',
    theory_restHalf_title:'Halve noot & halve rust', theory_restHalf_desc:'Duurt 2 tellen.',
    theory_restQuarter_title:'Kwartnoot & kwartrust', theory_restQuarter_desc:'Duurt 1 tel — de meest voorkomende notenwaarde.',
    theory_restEighth_title:'Achtste noot & achtste rust', theory_restEighth_desc:'Duurt een halve tel.',
    theory_slur_title:'Legato boog (slur)', theory_slur_desc:'Een boog over noten van VERSCHILLENDE toonhoogte: speel ze vloeiend verbonden, zonder hoorbare onderbreking ertussen.',
    theory_tie_title:'Overbinding (tie)', theory_tie_desc:'Een boog tussen twee noten van DEZELFDE toonhoogte: telt op tot één langere klank, geen nieuwe aanslag bij de tweede noot.',
    theory_staccato_title:'Staccato', theory_staccato_desc:'Een puntje boven of onder de notenkop: speel de noot kort en los, korter dan de genoteerde duur.',
    theory_accent_title:'Accent', theory_accent_desc:"Een '>'-teken boven of onder de notenkop: speel deze noot merkbaar luider/nadrukkelijker dan de omliggende noten.",
    theory_tenuto_title:'Tenuto', theory_tenuto_desc:'Een streepje boven of onder de notenkop: speel de noot de volle genoteerde duur, licht nadrukkelijk aangehouden.',
    theory_dyn_pp_title:'Pianissimo (pp)', theory_dyn_pp_desc:'Heel zacht.',
    theory_dyn_p_title:'Piano (p)', theory_dyn_p_desc:'Zacht.',
    theory_dyn_mp_title:'Mezzopiano (mp)', theory_dyn_mp_desc:'Matig zacht.',
    theory_dyn_mf_title:'Mezzoforte (mf)', theory_dyn_mf_desc:'Matig luid.',
    theory_dyn_f_title:'Forte (f)', theory_dyn_f_desc:'Luid.',
    theory_dyn_ff_title:'Fortissimo (ff)', theory_dyn_ff_desc:'Heel luid.',
    theory_rit_title:'Ritardando (rit.)', theory_rit_desc:'Geleidelijk langzamer spelen.',
    theory_accel_title:'Accelerando (accel.)', theory_accel_desc:'Geleidelijk sneller spelen.',
    theory_aTempo_title:'A tempo', theory_aTempo_desc:'Terug naar het oorspronkelijke tempo, na een rit./accel. of andere tempowisseling.',
    theory_fermate_title:'Fermate', theory_fermate_desc:'Houd deze noot langer aan dan de genoteerde duur, naar eigen inzicht van de speler/dirigent.'
  },
  en: {
    nav_notes:'Note Reading', nav_scales:'Scales', nav_chords:'Chords',
    nav_circle:'Circle of Fifths', nav_intervals:'Intervals', nav_progressions:'Chord Progressions',
    nav_sightreading:'Sight Reading',
    tooltip_sightreading:'Sight Reading — requires a MIDI keyboard, works best on a larger screen',
    nav_theory:'Music Theory', nav_piano:'Virtual Piano',
    navLabel_progressions:'Progressions', navLabel_theory:'Theory', navLabel_piano:'Free Play',
    tiles_heading:'Choose your exercise', tooltip_back:'Back',
    tileMidiEnabled:'MIDI Enabled', tileMidiOnly:'MIDI Only', tileUnderConstruction:'Under Construction',
    tileDesc_notes:'Recognize notes on the staff — as cards, a scrolling band, or against the clock.',
    tileDesc_chords:'Recognize and play chords — as cards, a scrolling band, or against the clock.',
    tileDesc_circle:'Explore the circle of fifths wheel, practice relative keys and accidentals.',
    tileDesc_progressions:'Recognize and play chord progressions — as cards, a sequence, or a scrolling band.',
    tileDesc_notes_kaarten:'Recognize single notes on the staff, at your own pace.',
    tileDesc_notes_band:'Play along with a scrolling staff, no time pressure.',
    tileDesc_notes_challenge:'Beat the clock — miss the line and it counts as wrong.',
    tileDesc_scales:'Practice scales in every key, with optional MIDI play-along.',
    tileDesc_chords_kaarten:'Recognize chords and their inversions on the staff.',
    tileDesc_chords_band:'Play chords along with a scrolling staff.',
    tileDesc_chords_challenge:'Play chords against the clock.',
    tileDesc_circle_visual:'Explore the circle of fifths wheel and hear every chord.',
    tileDesc_circle_rel:'Practice relative major/minor pairs.',
    tileDesc_circle_acc:'Practice the number of accidentals per key.',
    tileDesc_intervals:'Recognize intervals, visually or by ear.',
    tileDesc_prog_kaarten:'Recognize Roman-numeral degrees in familiar progressions.',
    tileDesc_prog_reeks:'Play a named progression step by step.',
    tileDesc_prog_band:'Play several progressions along in a row.',
    tileDesc_sightreading:'Read melody and chords at once — still under construction.',
    tileDesc_theory:'Reference guide with notation symbols, no quiz.',
    tileDesc_piano:'A virtual 88-key keyboard to play freely.',
    reset_module_label:'Reset this app',
    resetModuleConfirm:'Reset this app\'s settings to default? This applies to all modes of this app and cannot be undone.',
    sr_chords_label:'Chords', sr_melodyhand_label:'Melody',
    sr_melodyhand_right:'Right hand (treble clef)', sr_melodyhand_left:'Left hand (bass clef)',
    sr_speedRate_label:'Playback speed',
    sr_stat_melody:'Melody', sr_stat_chords:'Chords', sr_stat_score:'Score',
    sightReadingComplete:'🎉 Session complete — Melody {melodyCorrect}/{melodyMiss}, Chords {chordCorrect}/{chordMiss}, Score: {score}',
    tooltip_theme:'Switch theme', tooltip_fullscreen:'Fullscreen', tooltip_samples:'Load your own piano sound',
    tooltip_sound_on:'Turn sound off', tooltip_sound_off:'Turn sound on',
    tooltip_midi_connected:'MIDI connected: {device}', tooltip_midi_none:'No MIDI device found',
    tooltip_midi_unsupported:'MIDI is not supported in this browser',
    settings_title:'Settings', settings_close:'Close',
    level_label:'Level', level_easy:'Easy (C3-C5)', level_easy_short:'Lvl 1 (C3-C5)',
    level_med:'Intermediate (C2-C6)', level_med_short:'Lvl 2 (C2-C6)',
    level_hard:'Hard (C1-C7)', level_hard_short:'Lvl 3 (C1-C7)',
    auto_label:'Auto', auto_on:'On', auto_off:'Off', thinktime_label:'Think time:',
    type_label:'Type', inversions_label:'Inversions', mode_label:'Mode',
    octaves_label:'Octaves', oct_1:'1 Octave', oct_2:'2 Octaves',
    hint_label:'Hint', octave_label:'Octave', octave_exact:'Exact', octave_free:'Free',
    mode_cards:'Flashcards', mode_band:'Continuous', mode_sequence:'Sequence', mode_challenge:'Challenge',
    challengeSpeed_label:'Speed',
    challengeDuration_label:'Duration', challengeDuration_s:'{s} sec',
    challengeStatus:'⏱ {time} — ✓ {correct} ✗ {miss}',
    challengeComplete:'🎉 Challenge complete — {correct} correct, {miss} missed!',
    clef_label:'Note Range', clef_treble:'Treble Clef', clef_bass:'Bass Clef', clef_both:'Both',
    scrollNeedsMidi:'Connect a MIDI device to use this mode.',
    midiNoteListening:'🎹 Play the approaching note...',
    midiNoteListeningStatic:'🎹 Play the shown note...',
    scrollCounter:'{n} / {total} correct', scrollSessionComplete:'🎉 Session complete — {total}/{total} correct!',
    midiScaleWrong:'Try again', midiScaleComplete:'✓ Scale complete!',
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
    midiIntervalListening:'🎹 Play the interval...',
    qRelMinorOf:"What is the relative minor of {key} Major?",
    qRelMajorOf:"What is the relative major of {key} minor?",
    qWhichMajorHas:"Which major key has {acc}?",
    qHowManyAccidentals:"How many accidentals does {key} Major have?",
    qDegreeIn:"What is degree '{deg}' in {key} {kw}?",
    major:'Major', minorLower:'minor',
    zeroAccidentals:'0 accidentals', nSharps:'{n} sharps (#)', nFlats:'{n} flats (b)',
    piano_left:'Left', piano_center:'Center (C4)', piano_right:'Right',
    homeSubtitle:'The Piano Trainer',
    theory_cat_restsDuration:'Rests & Note Values', theory_cat_legatoSlur:'Legato & Slurs',
    theory_cat_articulation:'Articulation', theory_cat_dynamics:'Dynamics', theory_cat_tempo:'Tempo Markings',
    theory_restWhole_title:'Whole note & whole rest', theory_restWhole_desc:'Lasts 4 beats in 4/4 time — the longest common note value.',
    theory_restHalf_title:'Half note & half rest', theory_restHalf_desc:'Lasts 2 beats.',
    theory_restQuarter_title:'Quarter note & quarter rest', theory_restQuarter_desc:'Lasts 1 beat — the most common note value.',
    theory_restEighth_title:'Eighth note & eighth rest', theory_restEighth_desc:'Lasts half a beat.',
    theory_slur_title:'Slur', theory_slur_desc:'A curve over notes of DIFFERENT pitches: play them smoothly connected, with no audible break between them.',
    theory_tie_title:'Tie', theory_tie_desc:'A curve between two notes of the SAME pitch: adds their durations together into one longer sound, no new attack on the second note.',
    theory_staccato_title:'Staccato', theory_staccato_desc:'A dot above or below the notehead: play the note short and detached, shorter than its written duration.',
    theory_accent_title:'Accent', theory_accent_desc:"A '>' mark above or below the notehead: play this note noticeably louder/more forceful than the surrounding notes.",
    theory_tenuto_title:'Tenuto', theory_tenuto_desc:'A short line above or below the notehead: play the note for its full written duration, slightly emphasized.',
    theory_dyn_pp_title:'Pianissimo (pp)', theory_dyn_pp_desc:'Very soft.',
    theory_dyn_p_title:'Piano (p)', theory_dyn_p_desc:'Soft.',
    theory_dyn_mp_title:'Mezzo-piano (mp)', theory_dyn_mp_desc:'Moderately soft.',
    theory_dyn_mf_title:'Mezzo-forte (mf)', theory_dyn_mf_desc:'Moderately loud.',
    theory_dyn_f_title:'Forte (f)', theory_dyn_f_desc:'Loud.',
    theory_dyn_ff_title:'Fortissimo (ff)', theory_dyn_ff_desc:'Very loud.',
    theory_rit_title:'Ritardando (rit.)', theory_rit_desc:'Gradually slow down.',
    theory_accel_title:'Accelerando (accel.)', theory_accel_desc:'Gradually speed up.',
    theory_aTempo_title:'A tempo', theory_aTempo_desc:'Return to the original tempo, after a rit./accel. or other tempo change.',
    theory_fermate_title:'Fermata', theory_fermate_desc:"Hold this note longer than its written duration, at the performer's/conductor's discretion.",
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
    },
    progressionNames:{
      'Pop (I-V-vi-IV)':'Pop (I-V-vi-IV)',
      'Jazz-cadens (ii-V-I)':'Jazz Cadence (ii-V-I)',
      "'50s-progressie (I-vi-IV-V)":"'50s Progression (I-vi-IV-V)"
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
  progressionName(key){ return this.current() === 'nl' ? key : (I18N.en.progressionNames[key] || key); },
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
    // "NL"/"EN"-tekst op alle drie plekken (home page, tegel-pagina, topbar
    // in-module — sinds v0.17.5, was voorheen home/zijbalk/onderbalk).
    const langLabel = this.current() === 'nl' ? 'NL' : 'EN';
    const langTitle = 'Switch language / Wissel taal';
    const langStart = document.getElementById('lang-btn-start');
    if (langStart) langStart.textContent = langLabel;
    const langHeader = document.getElementById('lang-btn-header');
    if (langHeader){ langHeader.textContent = langLabel; langHeader.title = langTitle; }
    const langTiles = document.getElementById('lang-btn-tiles');
    if (langTiles) langTiles.textContent = langLabel;
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
    if (typeof App === 'undefined') return;
    // Tegel-pagina (sinds v0.17.5): App.currentModule is dan null — de 17
    // tegels worden als rauwe innerHTML opgebouwd (TilesUI.render()), niet
    // via [data-i18n], dus updateStaticText() hierboven ververst ze niet
    // vanzelf. Bugfix: zonder deze regel bleef de tegel-INHOUD (titels/
    // omschrijvingen/badges) in de oude taal staan na een taalwissel terwijl
    // je al op de tegel-pagina stond — alleen de vaste kop ("Kies je
    // oefening") volgde de taalwissel wel via [data-i18n].
    if (!App.currentModule){
      if (typeof TilesUI !== 'undefined') TilesUI.render();
      return;
    }
    if (App.currentModule === 'piano'){
      App.updateModuleTitle('piano');
    } else if (App.currentModule === 'theory'){
      App.updateModuleTitle('theory');
      if (typeof TheoryUI !== 'undefined') TheoryUI.render();
    } else {
      App.buildSettings(App.currentModule);
      if (App.history && App.history[App.historyIndex]) App.renderData(App.history[App.historyIndex]);
    }
  },
  init(){ this.updateStaticText(); }
};
