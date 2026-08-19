// Challenge-Engine ("tijdsdruk-wrapper", Fase 1.3, Root_Note_Stappenplan.md)
// — generieke, herbruikbare aftellende timer + score-teller die om een
// bestaande oefening heen kan. Geen kennis van MIDI, ScrollEngine, of een
// specifieke module — puur een klok + twee tellers (correct/gemist) met
// callbacks, zodat elke toekomstige Challenge-consument (Noten Lezen nu,
// eventueel Intervallen/Akkoordprogressies later, zie stappenplan Fase 2.5/
// 2.1d) 'm kan hergebruiken zonder zelf een timer te herschrijven. De eerste
// concrete toepassing (Noten Lezen se Challenge-modus) combineert dit met
// ScrollEngine.startChallenge() — zie app-core.js _renderNotesChallenge().
//
// Bewust `setTimeout`-polling (elke 200ms) i.p.v. requestAnimationFrame:
// een countdown-display heeft geen 60fps-vloeiendheid nodig (dat is aan de
// visuele kant, zie ScrollEngine's eigen RAF-loop), en setTimeout blijft
// werken ongeacht of het tabblad zichtbaar is (RAF pauzeert in
// achtergrondtabbladen, wat hier een oneerlijk voordeel/nadeel zou geven
// als iemand tussentijds van tabblad wisselt).
const ChallengeEngine = {
  active: false,
  correctCount: 0,
  missCount: 0,
  totalMs: 0,
  startTime: 0,
  _tickTimer: null,
  _onTick: null,
  _onEnd: null,

  // durationSec: lengte van de countdown. callbacks.onTick(remainingSec)
  // wordt zo'n 5×/seconde aangeroepen (genoeg voor een seconde-teller,
  // geen last van gemiste update-tijdstippen door tab-throttling zoals bij
  // een kaal setInterval); callbacks.onEnd({correct, miss}) precies één
  // keer, zodra de tijd om is.
  start(durationSec, callbacks = {}){
    this.stop();
    this.active = true;
    this.correctCount = 0; this.missCount = 0;
    this.totalMs = durationSec * 1000;
    this.startTime = performance.now();
    this._onTick = callbacks.onTick || null;
    this._onEnd = callbacks.onEnd || null;
    this._tick();
  },
  _tick(){
    if (!this.active) return;
    const elapsed = performance.now() - this.startTime;
    const remainingMs = Math.max(0, this.totalMs - elapsed);
    if (this._onTick) this._onTick(Math.ceil(remainingMs / 1000));
    if (remainingMs <= 0){ this._finish(); return; }
    this._tickTimer = setTimeout(() => this._tick(), 200);
  },
  _finish(){
    this.active = false;
    if (this._tickTimer){ clearTimeout(this._tickTimer); this._tickTimer = null; }
    if (this._onEnd) this._onEnd({ correct: this.correctCount, miss: this.missCount });
  },
  recordCorrect(){ if (this.active) this.correctCount++; },
  recordMiss(){ if (this.active) this.missCount++; },
  // Stopt de klok zonder onEnd aan te roepen — voor het VERLATEN van een
  // sessie (module-wissel), niet voor een normaal einde (dat loopt via
  // _finish()). Zelfde onderscheid als ScrollEngine.stop() vs. een
  // voltooide sessie.
  stop(){
    this.active = false;
    if (this._tickTimer){ clearTimeout(this._tickTimer); this._tickTimer = null; }
  }
};
