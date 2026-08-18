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
  }
};
const INTERVAL_ABBR = {
  "Kleine Secunde":"m2", "Grote Secunde":"M2", "Kleine Terts":"m3", "Grote Terts":"M3",
  "Reine Kwart":"P4", "Tritonus":"TT", "Reine Kwint":"P5", "Kleine Sext":"m6",
  "Grote Sext":"M6", "Klein Septiem":"m7", "Groot Septiem":"M7", "Octaaf":"P8"
};

// MIDI-akkoordcontrole (sinds Fase 2.2, Root_Note_Stappenplan.md) — puur
// muziektheorie, geen DOM/App-afhankelijkheid, dus herbruikbaar voor elke
// toekomstige module die "worden de juiste akkoordnoten ingedrukt?" moet
// controleren (Akkoorden 2.2, later ook Akkoordprogressies 2.6 — bewust
// dezelfde functie i.p.v. een tweede keer bouwen, zie stappenplan).
// Vergelijkt op toonhoogteKLASSE (modulo 12), niet op exacte MIDI-nummers:
// een gebruiker mag het akkoord in elk octaaf spelen. De baston (laagste
// ingedrukte noot) moet wél de juiste toonhoogteklasse hebben — dat is wat
// een omkering (inversie) muzikaal correct maakt, puur dezelfde verzameling
// toonhoogteklassen zou omkeringen niet van elkaar onderscheiden.
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
