// Scroll-Engine ("lopende band", Fase 1.2, Root_Note_Stappenplan.md) —
// generieke, herbruikbare scrollende-notenbalk-component. Eerste
// toepassing: Noten Lezen's lopende-band-modus (2.1c, zie app-core.js
// wireScrollBand()/_renderNotesBand()).
//
// Rendert de hele notenreeks IN ÉÉN KEER (VexFlow) op een brede strip, en
// verplaatst 'm daarna puur via een CSS-transform (translateX) — geen
// her-render per stap, dat zou (a) trager zijn en (b) telkens de al
// toegepaste groen-kleuring van eerder gespeelde noten resetten.
// "Schuift door via requestAnimationFrame" (letterlijk uit het
// stappenplan) is de vloeiende glide TUSSEN twee noten (zie _glideTo) —
// er draait geen constante achtergrond-animatieloop; die stopt vanzelf
// zodra een glide klaar is, dus voldoet vanzelf aan de eis dat de
// animatie niet moet doorlopen als de module verlaten wordt (extra
// zekerheid: stop() annuleert een eventuele lopende glide alsnog expliciet).
//
// Pacing-model: GEEN tijdsdruk — de strip schuift een stap door zodra de
// juiste noot gespeeld is, en wacht daarna op de volgende. Tijdsdruk
// ("mist de noot de lijn, telt als fout") is bewust gereserveerd voor de
// toekomstige Challenge-modus (bouwt op Fase 1.3, nog niet gebouwd).
//
// Noten die de hit-lijn passeren BLIJVEN STAAN, ingekleurd (groen) —
// verdwijnen niet. Dat is specifiek wat Noten Lezen's lopende-band-modus
// nodig heeft (vs. de nog te bouwen Vooruit Lezen, waar noten juist wél
// verdwijnen) — zie stappenplan Fase 1.2.
const ScrollEngine = {
  NOTE_SLOT_W: 90,
  // 270 i.p.v. een krappere waarde: bij "Moeilijk" (Noten Lezen, bereik
  // C1-C7) bleek een lagere waarde de onderkant van lage noten/
  // hulplijntjes af te snijden (SVG-viewBox clipt alles buiten
  // 0..CANVAS_H, er is geen crop-naar-inhoud zoals bij
  // ScoreRenderer.render()). Empirisch bepaald met de uiterste waarden
  // van dat bereik (MIDI 24 + 96 afgewisseld in dezelfde reeks) via
  // svg.getBBox(): bodem van de inhoud kwam op y≈244-245 uit, dus 270
  // geeft een veilige marge. Dit zijn LOGISCHE (pre-RENDER_SCALE)
  // eenheden — zie hieronder.
  CANVAS_H: 270,
  // Vergroot de hele weergave (sinds v0.11.0, op verzoek: "loopband was
  // een klein venster, noten beter leesbaar maken"). Toegepast via
  // ctx.scale() vlak vóór het tekenen — alle bestaande coördinaten
  // hierboven/hieronder blijven LOGISCHE eenheden, VexFlow rendert ze
  // simpelweg RENDER_SCALE keer zo groot in werkelijke pixels. Zowel de
  // canvas-afmetingen (renderer.resize) als de translateX-berekening
  // (_slotOffset) moeten hiermee rekening houden — zie _buildStrip().
  // Sinds v0.16.2 (gebruikersfeedback: "grootte van de notenbalk is niet
  // consistent tussen oefeningen") verder opgehoogd van 1.4 naar 2.2 — op
  // 1.4 was de notenbalklijn-afstand hier ~14px, terwijl Toonladders
  // (gewone ScoreRenderer, geen vaste canvas-breedte) op ~21.8px uitkwam;
  // empirisch gemeten (`getBoundingClientRect()` op twee opeenvolgende
  // notenbalklijnen) i.p.v. geschat, 2.2 geeft een vrijwel identieke
  // regelafstand. Kaarten-modus (één losse noot, bewust klein/ingezoomd)
  // gebruikt ScoreRenderer's eigen PAPER_CANVAS_W en blijft hier los van.
  RENDER_SCALE: 2.2,
  STEP_MS: 350,
  // Moet gelijk blijven aan de --scroll-hitline-x-waarde in styles.css
  // (de verticale hit-lijn-marker) — twee losse plekken omdat CSS geen
  // JS-constanten kan lezen; bij aanpassing dus BEIDE bijwerken. Dit is
  // een ECHTE pixelwaarde (geen logische eenheid, geen RENDER_SCALE op
  // toepassen) — het is simpelweg waar op het scherm de hit-lijn staat.
  HIT_LINE_X: 140,
  // Breedte van de vaste sleutel-"gutter" (zie _buildGutter) — een ECHTE
  // pixelwaarde, onder HIT_LINE_X zodat de gutter de noot bij de hit-lijn
  // nooit overlapt. 124 i.p.v. smaller: bij een verse render (index 0)
  // bleek een kleinere waarde net niet breed genoeg om de eigen sleutel
  // van de SCROLLENDE laag (die daar op dat moment nog onder ligt, zie
  // _buildStrip) volledig te verbergen — de bas-sleutel-stippen staken er
  // net overheen uit. Empirisch bijgesteld tot geen rest meer zichtbaar was.
  GUTTER_W: 124,
  // Gedeeld tussen _buildStrip() en _buildGutter() (logische eenheden) —
  // moet exact gelijk zijn, anders sluiten de notenbalklijnen van de vaste
  // gutter niet naadloos aan op die van de scrollende strip erachter.
  TREBLE_Y: 60,
  STAVE_GAP: 55,
  // Extra "leesruimte" (logische eenheden, sinds v0.16.1, gebruikersfeedback
  // met screenshots) tussen de gutter/hit-lijn en de HUIDIGE noot — zie
  // _slotOffset() hieronder. Zonder deze marge viel de noot bijna letterlijk
  // BOVENOP de hit-lijn, met als gevolg dat een voorteken (#/b) links van de
  // notenkop deels ONDER de ondoorzichtige gutter viel (bevestigd met
  // screenshots: een kruis/mol bij de huidige noot was tot een dun sliertje
  // afgesneden, terwijl latere noten verderop op de strip hun volledige
  // voorteken gewoon lieten zien). Verschoven op de oude "70"-anker (zie
  // _slotOffset) — laat de hit-lijn nu ook duidelijk VOOR (links van) de
  // naderende noot staan i.p.v. er dwars doorheen. **55 i.p.v. de eerdere
  // 32** (sinds v0.16.2): toen RENDER_SCALE van 1.4 naar 2.2 ging (zelfde
  // versie, zie hierboven) én de scrollende laag zijn eigen sleutel verloor
  // (_buildStrip()-bugfix, zie daar), verschoof de natuurlijke ademstart-
  // positie van noot 0 mee — empirisch herijkt via `getScreenCTM()`-metingen
  // tot de marge tot de hit-lijn weer ~50 echte pixels was (vergelijkbaar
  // met de oorspronkelijke v0.16.1-marge).
  NOTE_LEAD_GAP: 55,

  // Kleinst toegestane schaal (zie _effectiveScale hieronder) — voorkomt
  // dat de notatie op een heel kort scherm onleesbaar klein zou worden;
  // 1.1 blijft nog altijd groter dan de oorspronkelijke v0.10.0-waarde (1.0
  // vóór RENDER_SCALE bestond).
  MIN_RENDER_SCALE: 1.1,
  // Ruwe schatting (echte pixels) van wat er ROND de notatie nog nodig is
  // binnen de viewport-hoogte (topbalk, teller-tekst, status-tekst,
  // marges) — gebruikt door _effectiveScale() om te bepalen hoeveel ruimte
  // de notatie zelf mag innemen zonder dat #workspace moet gaan scrollen.
  CHROME_HEIGHT_BUDGET: 340,

  _raf: null,
  _stripEl: null,
  _activeScale: 2.2,
  _trebleNotes: [],
  _bassNotes: [],
  _events: [],
  _currentIndex: 0,
  _ink: '#111827',

  // events: array van SLICES (number[][], één akkoord — 1 of meer
  // gelijktijdige MIDI-nummers — per stap). Sinds Fase 2.6 (v0.14.0)
  // uitgebreid van number[] naar number[][] om Akkoordprogressies' Lopende
  // Band te ondersteunen (elke stap een heel akkoord i.p.v. één losse
  // noot); Noten Lezen (de oorspronkelijke consument) wikkelt zijn losse
  // noten simpelweg in als [m] vóór het aanroepen (zie app-core.js
  // _renderNotesBand). Rendert direct op de juiste positie, geen glide
  // nodig bij een (her)render. `opts.startIndex` (default 0)
  // laat de weergave hervatten bij een al gevorderde positie — nodig bij
  // een themawissel (zie ThemeManager.toggle()): de hele strip moet dan
  // opnieuw getekend worden in de nieuwe inktkleur, maar zonder de
  // voortgang van de gebruiker kwijt te raken. De al-voltooide noten
  // (0..startIndex-1) worden meteen weer groen gezet.
  // Sinds v0.16.3 (gebruikersfeedback met foto's van een compact secundair
  // beeldscherm): RENDER_SCALE (2.2) is vast genoeg gekozen om Toonladders'
  // grootte te evenaren op een gewoon scherm, maar op een korter scherm
  // maakte de vaste 2.2×-hoogte de hele flashcard-kaart hoger dan de
  // viewport — #workspace moest dan gaan scrollen (een verticale
  // schuifbalk, met de onderkant van de kaart buiten beeld), terwijl
  // Toonladders (geen vaste hoge canvas, gewoon ScoreRenderer) daar prima
  // paste. Schaalt de notatie dus naar beneden zodra CANVAS_H × schaal +
  // CHROME_HEIGHT_BUDGET niet meer in window.innerHeight past — nooit
  // BOVEN RENDER_SCALE, nooit ONDER MIN_RENDER_SCALE. Wordt bij elke
  // render() opnieuw bepaald (dus ook na een venster-formaatwijziging
  // tussen twee sessies in).
  _effectiveScale(){
    const available = window.innerHeight - this.CHROME_HEIGHT_BUDGET;
    const maxByViewport = Math.max(available, 0) / this.CANVAS_H;
    return Math.max(this.MIN_RENDER_SCALE, Math.min(this.RENDER_SCALE, maxByViewport));
  },

  render(containerId, events, opts = {}){
    this.stop();
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    this._activeScale = this._effectiveScale();
    container.style.height = Math.ceil(this.CANVAS_H * this._activeScale) + 'px';
    this._events = events;
    this._buildStrip(container, events, opts);
    // Vaste sleutel-"gutter" (sinds v0.11.0, op verzoek: vioolsleutel/
    // bassleutel blijven zichtbaar als herkenningspunt i.p.v. mee te
    // scrollen) — een APARTE, niet-getransformeerde SVG bovenop de linkerkant
    // van de scrollende strip, met een ondoorzichtige achtergrond die
    // verbergt wat er in de scrollende laag onder passeert. De scrollende
    // strip zelf tekent nog steeds gewoon zijn eigen sleutels (ongewijzigd,
    // zie _buildStrip) — die scrollen na de eerste paar noten toch al buiten
    // beeld, dus geen aparte "zonder sleutel"-variant nodig.
    this._buildGutter(container);
    const startIndex = opts.startIndex || 0;
    this._currentIndex = startIndex;
    this._setTransform(this._slotOffset(startIndex));
    for (let i = 0; i < startIndex; i++) this._colorNoteAt(i, '#22c55e');
  },

  // translateX werkt in ECHTE CSS-pixels (op het al-gerenderde, dus al
  // RENDER_SCALE-keer-vergrote SVG-element) — de logische afstand per noot
  // (NOTE_SLOT_W) en de linkermarge (waar noot 0 ademstart, "70" logische
  // eenheden) moeten dus BEIDE met de actieve schaal vermenigvuldigd worden
  // om in echte pixels te kloppen — sinds v0.16.3 `_activeScale`
  // (bepaald per render(), zie _effectiveScale()) i.p.v. de vaste
  // RENDER_SCALE rechtstreeks, anders zou een omlaag-geschaalde render op
  // een kort scherm alsnog met de VOLLE 2.2× rekenen en de noot verkeerd
  // positioneren. HIT_LINE_X zelf is al een echte pixelwaarde (een vast
  // scherm-doel), blijft ongemoeid. De "70" is de logische ademstart-marge
  // van noot 0 binnen de strip's eigen (nog niet getransformeerde)
  // coördinatenruimte — NOTE_LEAD_GAP wordt hier ALTIJD van afgetrokken
  // zodat de strip iets minder ver naar links schuift, wat de huidige noot
  // (incl. voorteken) juist verder naar RECHTS van de hit-lijn laat landen
  // (zie NOTE_LEAD_GAP hierboven).
  _slotOffset(index){
    return this.HIT_LINE_X - (index * this.NOTE_SLOT_W * this._activeScale) - ((70 - this.NOTE_LEAD_GAP) * this._activeScale);
  },

  _buildStrip(container, events, opts){
    const VF = Vex.Flow;
    // opts.useFlats mag sinds v0.16.1 ook een ARRAY zijn (per index een
    // eigen #/b-keuze, zie app-core.js's band-/challenge-generatie) i.p.v.
    // altijd één vaste boolean voor de hele reeks — op gebruikersverzoek,
    // zodat een lange lopende-band-/challenge-sessie niet de hele sessie
    // in dezelfde notatie-conventie vastzit. Gewone boolean blijft werken
    // (bestaande aanroepers als Akkoordprogressies' enkele-akkoord-render
    // via ScoreRenderer raken hier niet aan).
    const useFlatsOpt = opts.useFlats;
    const useFlatsAt = (i) => Array.isArray(useFlatsOpt) ? !!useFlatsOpt[i] : !!useFlatsOpt;
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    this._ink = isDark ? '#f2f4f9' : '#111827';
    // Notenbereik-instelling (Fase 2.1a, sinds v0.12.0): opts.clef
    // ('treble'/'bass') tekent maar één notenbalk i.p.v. de grand staff —
    // zelfde principe als ScoreRenderer._draw(), zie daar voor de
    // toelichting. _singleClef wordt ook door _buildGutter()/_colorNoteAt()
    // gebruikt.
    this._singleClef = (opts.clef === 'treble' || opts.clef === 'bass') ? opts.clef : null;

    const wrap = document.createElement('div');
    wrap.style.display = 'inline-block';
    wrap.style.willChange = 'transform';
    container.appendChild(wrap);
    this._stripEl = wrap;

    // canvasW/staveW/trebleY/gap hieronder blijven LOGISCHE eenheden — de
    // renderer krijgt de RENDER_SCALE-vermenigvuldigde afmetingen, en
    // ctx.scale() zorgt dat alles wat we dáárna met logische coördinaten
    // tekenen automatisch RENDER_SCALE keer zo groot uitpakt in echte
    // pixels (VexFlow's SVGContext ondersteunt scale() net als canvas2d).
    const canvasW = Math.max(events.length * this.NOTE_SLOT_W + 160, 400);
    const scale = this._activeScale;
    const renderer = new VF.Renderer(wrap, VF.Renderer.Backends.SVG);
    renderer.resize(canvasW * scale, this.CANVAS_H * scale);
    const ctx = renderer.getContext();
    ctx.scale(scale, scale);
    ctx.setFont('Inter, Arial', 10);
    if (ctx.setFillStyle) ctx.setFillStyle(this._ink);
    if (ctx.setStrokeStyle) ctx.setStrokeStyle(this._ink);

    const staveW = canvasW - 40;
    // trebleY: genoeg marge boven de notenbalk voor hulplijntjes/stokken
    // van hoge noten (zie CANVAS_H-toelichting hierboven).
    const trebleY = this.TREBLE_Y, gap = this.STAVE_GAP;
    const n = events.length;

    if (this._singleClef){
      const stave = new VF.Stave(20, trebleY, staveW);
      // GEEN stave.addClef() hier (sinds v0.16.2, bugfix) — de vaste gutter
      // (_buildGutter() hieronder) tekent AL een permanente sleutel; deze
      // scrollende laag had zijn EIGEN sleutel vroeger alleen omdat 'ie
      // toevallig verborgen zat achter de gutter. Sinds NOTE_LEAD_GAP
      // (v0.16.1) meer ademruimte gaf vóór de hit-lijn, schoof deze eigen
      // sleutel gedeeltelijk BUITEN de gutter uit — zichtbaar als een
      // dubbele notenbalk/sleutel bij de eerste noot (bevestigd met
      // screenshots). Simpelste, robuustste fix: deze sleutel nooit tekenen
      // i.p.v. de gutter-breedte/hit-lijn-positie tegen elkaar uit blijven
      // balanceren.
      stave.setContext(ctx).draw();

      const notes = events.map((slice, i) => ScoreRenderer.buildNote(slice, this._singleClef, useFlatsAt(i), this._ink));
      const voice = new VF.Voice({ num_beats: n, beat_value: 4 }).setStrict(false).addTickables(notes);
      const formatter = new VF.Formatter();
      formatter.joinVoices([voice]);
      formatter.format([voice], staveW - 60);
      voice.draw(ctx, stave);

      this._trebleNotes = this._singleClef === 'treble' ? notes : [];
      this._bassNotes = this._singleClef === 'bass' ? notes : [];
    } else {
      const trebleStave = new VF.Stave(20, trebleY, staveW);
      const bassStave = new VF.Stave(20, trebleY + gap, staveW);
      // GEEN addClef() ÉN GEEN StaveConnector (accolade/lijn) hier (sinds
      // v0.16.3, vervolgfix op v0.16.2) — de eerdere fix verwijderde alleen
      // de sleutel-glyphs, maar de accolade ({-vorm) die de scrollende laag
      // ZELF ook nog tekende bleek OM DEZELFDE REDEN gedeeltelijk buiten de
      // gutter uit te steken (bevestigd met een nieuwe screenshot: een
      // "golfje" zichtbaar naast de vaste gutter-accolade). De vaste gutter
      // (_buildGutter() hieronder) tekent al een permanente accolade, dus
      // ook dit hoeft de scrollende laag nooit zelf te doen.
      trebleStave.setContext(ctx).draw();
      bassStave.setContext(ctx).draw();

      const trebleNotes = [], bassNotes = [];
      events.forEach((slice, i) => {
        const treble = slice.filter(m => m >= 60);
        const bass = slice.filter(m => m < 60);
        trebleNotes.push(ScoreRenderer.buildNote(treble, 'treble', useFlatsAt(i), this._ink));
        bassNotes.push(ScoreRenderer.buildNote(bass, 'bass', useFlatsAt(i), this._ink));
      });
      const trebleVoice = new VF.Voice({ num_beats: n, beat_value: 4 }).setStrict(false).addTickables(trebleNotes);
      const bassVoice = new VF.Voice({ num_beats: n, beat_value: 4 }).setStrict(false).addTickables(bassNotes);
      const formatter = new VF.Formatter();
      formatter.joinVoices([trebleVoice]);
      formatter.joinVoices([bassVoice]);
      formatter.format([trebleVoice, bassVoice], staveW - 60);
      trebleVoice.draw(ctx, trebleStave);
      bassVoice.draw(ctx, bassStave);

      this._trebleNotes = trebleNotes;
      this._bassNotes = bassNotes;
    }
  },

  // Vaste sleutel-"gutter": een aparte, NIET-getransformeerde SVG met
  // alleen de sleutels + accolade + een stukje notenbalklijn, met een
  // ondoorzichtige achtergrond (CSS) die verbergt wat er in de scrollende
  // laag erachter voorbijkomt. Zelfde TREBLE_Y/STAVE_GAP/RENDER_SCALE als
  // _buildStrip() zodat de lijnen naadloos aansluiten.
  _buildGutter(container){
    const VF = Vex.Flow;
    const scale = this._activeScale;
    const gutter = document.createElement('div');
    gutter.className = 'scroll-gutter';
    container.appendChild(gutter);

    const logicalW = 130;
    const renderer = new VF.Renderer(gutter, VF.Renderer.Backends.SVG);
    renderer.resize(logicalW * scale, this.CANVAS_H * scale);
    const ctx = renderer.getContext();
    ctx.scale(scale, scale);
    if (ctx.setFillStyle) ctx.setFillStyle(this._ink);
    if (ctx.setStrokeStyle) ctx.setStrokeStyle(this._ink);

    const trebleY = this.TREBLE_Y, gap = this.STAVE_GAP;
    // Zelfde x-start (20) en stave-breedte-orde-grootte als _buildStrip(),
    // puur zodat de clef-tekening er identiek uitziet — de gutter-DIV zelf
    // knipt af op GUTTER_W via CSS overflow:hidden, dus de stave-breedte
    // hier mag gerust breder zijn dan wat zichtbaar blijft.
    if (this._singleClef){
      const stave = new VF.Stave(20, trebleY, logicalW);
      stave.addClef(this._singleClef);
      stave.setContext(ctx).draw();
    } else {
      const trebleStave = new VF.Stave(20, trebleY, logicalW);
      trebleStave.addClef('treble');
      const bassStave = new VF.Stave(20, trebleY + gap, logicalW);
      bassStave.addClef('bass');
      trebleStave.setContext(ctx).draw();
      bassStave.setContext(ctx).draw();
      new VF.StaveConnector(trebleStave, bassStave).setType(VF.StaveConnector.type.BRACE).setContext(ctx).draw();
      new VF.StaveConnector(trebleStave, bassStave).setType(VF.StaveConnector.type.SINGLE_LEFT).setContext(ctx).draw();
    }
  },

  _setTransform(px){ if (this._stripEl) this._stripEl.style.transform = `translateX(${px}px)`; },

  _glideTo(index){
    if (this._raf) cancelAnimationFrame(this._raf);
    const from = this._slotOffset(this._currentIndex);
    const to = this._slotOffset(index);
    const start = performance.now();
    const duration = this.STEP_MS;
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      this._setTransform(from + (to - from) * eased);
      if (t < 1){ this._raf = requestAnimationFrame(step); }
      else { this._raf = null; }
    };
    this._currentIndex = index;
    this._raf = requestAnimationFrame(step);
  },

  // Kleurt de noot/het akkoord op index i rechtstreeks op zijn SVG-element(en)
  // (via StaveNote.getSVGElement()) — geen her-render nodig, dus de rest van
  // de strip blijft ongemoeid staan. Sinds Fase 2.6: probeert ALTIJD zowel de
  // viool- als de bassleutel-noot op deze index (i.p.v. de vroegere >=60-
  // ternary die er maar één koos) — nodig omdat een akkoord-slice noten in
  // BEIDE clefs tegelijk kan hebben; bij een losse noot (Noten Lezen) of een
  // enkele-sleutel-weergave is de andere kant gewoon leeg/een GhostNote en
  // levert querySelectorAll dan simpelweg niets op.
  _colorNoteAt(i, color){
    [this._trebleNotes[i], this._bassNotes[i]].forEach(note => {
      if (!note || typeof note.getSVGElement !== 'function') return;
      const el = note.getSVGElement();
      if (!el) return;
      el.querySelectorAll('path, rect, ellipse').forEach(p => {
        p.setAttribute('fill', color);
        p.setAttribute('stroke', color);
      });
    });
  },
  // status: 'correct' (groen, blijft staan) of 'neutral' (terug naar de
  // gewone inktkleur van dit thema).
  markCurrent(status){
    this._colorNoteAt(this._currentIndex, status === 'correct' ? '#22c55e' : this._ink);
  },
  flashWrong(){
    this._colorNoteAt(this._currentIndex, '#ef4444');
    setTimeout(() => { this.markCurrent('neutral'); }, 400);
  },

  // Geeft de SLICE (array van MIDI-nummers) op de huidige index terug, niet
  // langer één los MIDI-nummer (sinds Fase 2.6) — aanroepers die altijd maar
  // één noot per stap hebben (Noten Lezen) lezen zelf target[0].
  currentTarget(){
    return this._events[this._currentIndex] !== undefined ? this._events[this._currentIndex] : null;
  },
  currentIndex(){ return this._currentIndex; },
  isLastNote(){ return this._currentIndex >= this._events.length - 1; },
  advance(){
    if (this.isLastNote()) return false;
    this._glideTo(this._currentIndex + 1);
    return true;
  },

  // ---- Challenge-modus (tijdsdruk, Fase 1.3, bouwt op ChallengeEngine
  // hierboven) ----
  // Wezenlijk ANDERS dan render()/advance() hierboven: die wachten
  // onbeperkt tot de juiste noot gespeeld is (geen tijdsdruk, bewuste
  // ontwerpkeuze van Fase 1.2). Hier schuift de strip ONAFHANKELIJK van
  // MIDI-invoer door op een vaste tijdsinterval (opts.intervalMs per noot)
  // — een noot die de hit-lijn passeert zonder al correct gespeeld te zijn
  // geldt als MISS (kort rood geflitst), de teller schuift gewoon door
  // naar de volgende. Draait daarom een ECHTE doorlopende
  // requestAnimationFrame-achtergrondloop (bewust anders dan de rest van
  // deze engine, zie de toelichting bovenaan dit bestand) — hergebruikt
  // `this._raf`/`stop()` van hierboven, dus MOET expliciet gestopt worden
  // bij het verlaten van de module (App.unwireNotesChallenge() roept
  // stop() aan) om te voorkomen dat de loop op de achtergrond doorloopt.
  // events: number[] (losse noten, zelfde soort input als de bestaande
  // Lopende-Band-aanroeper) — intern alsnog naar slices gewikkeld ([m])
  // voor consistentie met _buildStrip()/_colorNoteAt(). Sinds v0.16.3
  // (Akkoorden se Challenge-modus) mag events OOK al number[][] (akkoord-
  // slices) zijn, zelfde detectie-aanpak als ScoreRenderer/ScrollEngine.render()
  // elders — geen wikkeling dan nodig.
  // opts: { useFlats, clef, intervalMs, onMiss(), onSessionEnd() }.
  startChallenge(containerId, events, opts = {}){
    this.stop();
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    this._activeScale = this._effectiveScale();
    container.style.height = Math.ceil(this.CANVAS_H * this._activeScale) + 'px';
    const slices = Array.isArray(events[0]) ? events : events.map(m => [m]);
    this._events = slices;
    this._buildStrip(container, slices, opts);
    this._buildGutter(container);
    this._challengeIntervalMs = opts.intervalMs || 1500;
    this._challengeMatched = new Array(slices.length).fill(false);
    this._challengeCallbacks = opts;
    this._currentIndex = 0;
    this._setTransform(this._slotOffset(0));
    let start = null;
    const step = (now) => {
      if (!this._challengeCallbacks) return;
      if (start === null) start = now;
      const rawIndex = (now - start) / this._challengeIntervalMs;
      const targetIndex = Math.floor(rawIndex);
      // Elke noot wiens tijdvenster inmiddels volledig verstreken is zonder
      // een correcte match: MISS. `missIdx` per iteratie apart vastleggen
      // (i.p.v. this._currentIndex opnieuw uitlezen in de setTimeout) —
      // anders zou de kleur-terugzet-timer hieronder, als _currentIndex
      // intussen alweer is doorgeschoven, per ongeluk de VERKEERDE
      // (inmiddels huidige) noot resetten i.p.v. de gemiste.
      while (this._currentIndex < targetIndex && this._currentIndex < this._events.length){
        if (!this._challengeMatched[this._currentIndex]){
          const missIdx = this._currentIndex;
          this._colorNoteAt(missIdx, '#ef4444');
          setTimeout(() => { this._colorNoteAt(missIdx, this._ink); }, 400);
          if (this._challengeCallbacks.onMiss) this._challengeCallbacks.onMiss();
        }
        this._currentIndex++;
      }
      if (this._currentIndex >= this._events.length){
        const onSessionEnd = this._challengeCallbacks.onSessionEnd;
        this._challengeCallbacks = null;
        if (onSessionEnd) onSessionEnd();
        return;
      }
      this._setTransform(this._slotOffset(rawIndex));
      this._raf = requestAnimationFrame(step);
    };
    this._raf = requestAnimationFrame(step);
  },
  // Markeert de HUIDIGE (nog niet verstreken) Challenge-noot als correct
  // gespeeld — voorkomt dat de achtergrondloop 'm later alsnog als MISS
  // telt. Geen effect als de index al gemarkeerd was (dubbele MIDI-
  // events/herhaalde aanslag op dezelfde noot).
  markChallengeCorrect(){
    const i = this._currentIndex;
    if (!this._challengeMatched || i >= this._events.length || this._challengeMatched[i]) return;
    this._challengeMatched[i] = true;
    this.markCurrent('correct');
    // Sneller dan het ingestelde tempo mogen spelen (gebruikersfeedback,
    // sinds v0.16.3: "ik moet het tempo van de challenge aanhouden, ook als
    // ik sneller ben — de limiet is dan tot de volgende noot in beeld
    // komt") — schuift de VERWACHTE noot (currentTarget()) direct één
    // positie door zodra de huidige juist gespeeld is, ONAFHANKELIJK van de
    // klok (rawIndex in startChallenge()'s step()-lus hieronder). Puur de
    // INDEX ophogen, GEEN advance()/_glideTo() hier — die delen `this._raf`
    // met de doorlopende Challenge-tijdslus zelf; een glide zou die lus
    // stiekem afbreken (cancelAnimationFrame op het verkeerde RAF-gebruik).
    // De zichtbare scrollpositie blijft dus gewoon op de klok lopen (de
    // noten staan toch al ruim van tevoren zichtbaar op de vooraf getekende
    // strip, zie _buildStrip) — alleen WELKE noot als "volgende te spelen"
    // geldt loopt hiermee voor op de klok. Blijft de speler juist ACHTER,
    // dan haalt de klok deze index vanzelf weer in via de gewone while-lus
    // in step(). Nooit voorbij de LAATSTE noot (cap op length-1) — zo kan
    // een snelle speler de reeks nooit eerder "opraken" dan de klok zelf
    // ooit zou doen (sessie-einde blijft dus altijd echt de taak van de
    // countdown-timer, zie ChallengeEngine/app-core.js).
    if (this._currentIndex < this._events.length - 1) this._currentIndex++;
  },

  stop(){
    if (this._raf){ cancelAnimationFrame(this._raf); this._raf = null; }
    this._trebleNotes = []; this._bassNotes = []; this._events = []; this._stripEl = null;
    this._challengeCallbacks = null;
  }
};
