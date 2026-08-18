/* ============================================================
   MIDI HELPERS (Geen octaaf in output)
============================================================ */
const MIDI_NOTES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
function midiToName(midi, useFlats = false){
  const names = useFlats ? ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"] : MIDI_NOTES;
  return names[midi % 12];
}
function randomInt(min, max){ return Math.floor(Math.random() * (max - min + 1) + min); }
function capNote(s){ return s.charAt(0).toUpperCase() + s.slice(1); }
const MusicTheory = {
  scales: {
    "Majeur": [0,2,4,5,7,9,11,12], "Mineur Natuurlijk": [0,2,3,5,7,8,10,12], "Mineur Harmonisch": [0,2,3,5,7,8,11,12],
    "Mineur Melodisch": [0,2,3,5,7,9,11,12], "Pentatonisch Majeur": [0,2,4,7,9,12], "Pentatonisch Mineur": [0,3,5,7,10,12], "Blues": [0,3,5,6,7,10,12]
  },
  chords: {
    "Majeur": [0,4,7], "Mineur": [0,3,7], "Diminished": [0,3,6], "Sus2": [0,2,7], "Sus4": [0,5,7],
    "Maj7": [0,4,7,11], "Min7": [0,3,7,10], "Dom7": [0,4,7,10], "m7b5": [0,3,6,10],
    "Maj9": [0,4,7,11,14], "Min9": [0,3,7,10,14]
  },
  intervals: {
    "Kleine Secunde": 1, "Grote Secunde": 2, "Kleine Terts": 3, "Grote Terts": 4, "Reine Kwart": 5,
    "Tritonus": 6, "Reine Kwint": 7, "Kleine Sext": 8, "Grote Sext": 9, "Klein Septiem": 10, "Groot Septiem": 11, "Octaaf": 12
  },
  circle: {
    keys: ["C","G","D","A","E","B","F#","Db","Ab","Eb","Bb","F"],
    minors: ["Am","Em","Bm","F#m","C#m","G#m","D#m","Bbm","Fm","Cm","Gm","Dm"],
    accidentals: [0,1,2,3,4,5,6,-5,-4,-3,-2,-1]
  },
  // Uitbreidbare progressie-bibliotheek (Fase 2.6, sinds v0.14.0) — bewuste
  // keuzes uit Root_Note_Stappenplan.md, alle drie in majeur-context (zoals
  // de trapnamen in het stappenplan zelf al impliceren). `iv` = halve
  // tonen t.o.v. de tonica, `q` = akkoordsoort (Nederlands-gesleuteld,
  // zelfde MusicTheory.chords-keys als de rest van de app). Los van de
  // bestaande trap-voor-trap-vragenpool in App._generateOneQuestion() (die
  // blijft ongewijzigd voor de Kaarten-modus) — deze bibliotheek is
  // specifiek voor de nieuwe "Reeks"/"Lopende Band"-modi, waar een HELE,
  // herkenbare progressie als vaste volgorde geoefend wordt.
  progressions: {
    "Pop (I-V-vi-IV)": [
      {n:'I', iv:0, q:'Majeur'}, {n:'V', iv:7, q:'Majeur'}, {n:'vi', iv:9, q:'Mineur'}, {n:'IV', iv:5, q:'Majeur'}
    ],
    "Jazz-cadens (ii-V-I)": [
      {n:'ii', iv:2, q:'Mineur'}, {n:'V', iv:7, q:'Majeur'}, {n:'I', iv:0, q:'Majeur'}
    ],
    "'50s-progressie (I-vi-IV-V)": [
      {n:'I', iv:0, q:'Majeur'}, {n:'vi', iv:9, q:'Mineur'}, {n:'IV', iv:5, q:'Majeur'}, {n:'V', iv:7, q:'Majeur'}
    ]
  }
};
const INTERVAL_ABBR = {
  "Kleine Secunde":"m2", "Grote Secunde":"M2", "Kleine Terts":"m3", "Grote Terts":"M3",
  "Reine Kwart":"P4", "Tritonus":"TT", "Reine Kwint":"P5", "Kleine Sext":"m6",
  "Grote Sext":"M6", "Klein Septiem":"m7", "Groot Septiem":"M7", "Octaaf":"P8"
};

// MIDI-akkoordcontrole, "Vrij"-octaafmodus (sinds Fase 2.2,
// Root_Note_Stappenplan.md) — puur muziektheorie, geen DOM/App-
// afhankelijkheid. Vergelijkt op toonhoogteKLASSE (modulo 12), niet op
// exacte MIDI-nummers: een gebruiker mag het akkoord in elk octaaf spelen.
// De baston (laagste ingedrukte noot) moet wél de juiste toonhoogteklasse
// hebben — dat is wat een omkering (inversie) muzikaal correct maakt, puur
// dezelfde verzameling toonhoogteklassen zou omkeringen niet van elkaar
// onderscheiden. Sinds v0.9.0 NIET meer de default (zie matchExactNotes
// verderop) — enkel nog gebruikt als de gebruiker de "Octaaf: Vrij"-
// instelling aanzet (op verzoek: standaard moet een akkoord nu in de
// daadwerkelijk genoteerde octaaf gespeeld worden).
// Resultaat: 'incomplete' (nog geen foute noten, nog niet compleet — blijf
// wachten, geen rood/groen), 'wrong' (foute noot(en) en/of foute bas) of
// 'correct'.
MusicTheory.matchChordNotes = function(activeMidiNotes, targetMidiNotes){
  const active = Array.from(activeMidiNotes);
  if (active.length === 0) return 'incomplete';
  const targetPCs = new Set(targetMidiNotes.map(n => n % 12));
  const activePCs = new Set(active.map(n => n % 12));
  const hasWrongNote = Array.from(activePCs).some(pc => !targetPCs.has(pc));
  if (hasWrongNote) return 'wrong';
  if (activePCs.size < targetPCs.size) return 'incomplete';
  const expectedBassPC = Math.min(...targetMidiNotes) % 12;
  const actualBassPC = Math.min(...active) % 12;
  return actualBassPC === expectedBassPC ? 'correct' : 'wrong';
};

// Bouwt een meerdere-octaven-versie van een schaalformule (sinds Fase 2.3).
// `baseFormula` is zoals opgeslagen in MusicTheory.scales — eindigt altijd
// op de eigen octaaf-afsluitnoot (12 voor alle huidige schalen). Voor
// octaves>1 wordt elk octaaf-blok (exclusief de afsluitnoot) herhaald en
// opgeteld bij het vorige octaaf, met daarna één enkele topnoot voor het
// hele bereik — dus bijv. Majeur × 2 octaven wordt
// [0,2,4,5,7,9,11, 12,14,16,17,19,21,23, 24] i.p.v. de afsluitnoot dubbel
// te tellen.
MusicTheory.buildScaleFormula = function(baseFormula, octaves){
  if (octaves <= 1) return baseFormula;
  const perOctave = baseFormula.slice(0, -1);
  const octaveSpan = baseFormula[baseFormula.length - 1];
  let result = [];
  for (let o = 0; o < octaves; o++){
    result = result.concat(perOctave.map(iv => iv + octaveSpan * o));
  }
  result.push(octaveSpan * octaves);
  return result;
};

// MIDI-intervalcontrole, "Vrij"-octaafmodus (sinds Fase 2.5) — voor de
// HARMONISCHE afspeelmodus (beide noten tegelijk, net als een akkoord van
// 2 noten). Op het EXACTE verschil tussen de twee noten (geen
// toonhoogteklasse/modulo) — dat verschil IS het interval — maar wél
// octaaf-onafhankelijk: de gebruiker hoeft niet de exacte gehoorde/getoonde
// toonhoogte te reproduceren, alleen dezelfde afstand tussen twee noten.
// Sinds v0.9.0 NIET meer de default (zie matchExactNotes hieronder) — enkel
// nog gebruikt als de gebruiker de "Octaaf: Vrij"-instelling aanzet.
// Resultaat: 'incomplete' (0 of 1 noot ingedrukt), 'wrong' (verkeerde
// afstand, of meer dan 2 noten) of 'correct'.
MusicTheory.matchIntervalNotes = function(activeMidiNotes, targetSemitones){
  const active = Array.from(activeMidiNotes);
  if (active.length < 2) return 'incomplete';
  if (active.length > 2) return 'wrong';
  return Math.abs(active[1] - active[0]) === targetSemitones ? 'correct' : 'wrong';
};

// MIDI-controle, "Exact"-octaafmodus (sinds v0.9.0, op verzoek van de
// gebruiker) — de DEFAULT voor Akkoorden en de harmonische/melodische
// Intervallen-controle: de ingedrukte noten moeten LETTERLIJK dezelfde
// MIDI-nummers zijn als het doel, dus ook in het juiste octaaf/register
// (een akkoord op de bassleutel = een lagere octaaf dan hetzelfde akkoord
// rond middenC). Generiek genoeg voor zowel akkoorden (3+ noten) als een
// interval-tweetal — vervangt daar de toonhoogteklasse-vergelijking van
// matchChordNotes/de octaaf-onafhankelijke matchIntervalNotes hierboven,
// die nu allebei alleen nog gelden als "Octaaf: Vrij" aan staat.
// Resultaat: 'incomplete' / 'wrong' (verkeerde noot, of te veel noten) /
// 'correct'.
MusicTheory.matchExactNotes = function(activeMidiNotes, targetMidiNotes){
  const active = Array.from(activeMidiNotes);
  if (active.length === 0) return 'incomplete';
  const targetSet = new Set(targetMidiNotes);
  const hasWrongNote = active.some(n => !targetSet.has(n));
  if (hasWrongNote) return 'wrong';
  if (active.length < targetSet.size) return 'incomplete';
  return 'correct';
};
