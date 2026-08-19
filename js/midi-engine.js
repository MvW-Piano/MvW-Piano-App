// MIDI-engine (Fase 1.1, Root_Note_Stappenplan.md): verbindt fysieke
// MIDI-apparaten (Web MIDI API — alleen Chrome/Edge) met een generieke
// note-on/note-off-event-stream. PianoUI (het virtuele 88-toetsen-klavier)
// voedt via simulateNoteOn/simulateNoteOff DEZELFDE stream (zie piano-ui.js)
// — alle MIDI-logica die hierop bouwt (Fase 2) werkt daardoor automatisch
// ook zonder fysiek MIDI-apparaat; de virtuele piano is de fallback, geen
// apart code-pad.
//
// Verbindt automatisch met ALLE beschikbare MIDI-inputs tegelijk (geen
// aparte apparaat-kiezer) — voor een thuis-oefensetup met doorgaans één
// aangesloten keyboard is dat voldoende en voorkomt een stuk UI die anders
// nog geen duidelijk nut heeft.
const MidiEngine = {
  access: null,
  inputs: [],
  listeners: [],
  connected: false,
  // Welke noten op dit moment daadwerkelijk ingedrukt zijn (fysiek + virtueel
  // door elkaar) — bijgehouden op dit ene centrale punt zodat consumenten
  // (bijv. akkoord-antwoordcontrole, zie App.evaluateMidiChordAnswer) niet
  // allemaal hun eigen note-on/note-off-boekhouding hoeven te dupliceren.
  activeNotes: new Set(),

  supported(){ return typeof navigator.requestMIDIAccess === 'function'; },

  init(){
    if (!this.supported()){
      this.updateStatusIndicator();
      return;
    }
    navigator.requestMIDIAccess({ sysex: false }).then(access => {
      this.access = access;
      this._wireInputs();
      access.onstatechange = () => this._wireInputs();
      // Sommige Windows/stuurprogramma-combinaties geven de browser de
      // MIDI-poort pas daadwerkelijk door zodra het tabblad/venster weer
      // focus krijgt — `onstatechange` alleen bleek dan niet genoeg (moest
      // handmatig naar een andere app en terug om het keyboard te laten
      // reageren). Een her-scan bij het terugkrijgen van focus/zichtbaarheid
      // maakt die handmatige stap overbodig. Roept GEEN nieuwe
      // requestMIDIAccess() aan (geen hernieuwde toestemmings-prompt), leest
      // alleen de al toegekende `access.inputs` opnieuw uit.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') this._wireInputs();
      });
      window.addEventListener('focus', () => this._wireInputs());
      // Eerste-verbinding-race (sinds v0.16.1, gebruikersfeedback): sommige
      // besturingssystemen/stuurprogramma's geven de MIDI-poort pas een
      // fractie ná het toekennen van toestemming daadwerkelijk door aan de
      // browser — access.inputs kan op het moment dat de Promise hierboven
      // oplost dus nog leeg zijn, ook al is er wél een apparaat aangesloten.
      // Tot nu toe was de enige workaround een focus-/zichtbaarheids-
      // wisseling (handmatig naar een andere app en terug) — dat loste het
      // symptoom toevallig op omdat het toevallig ook _wireInputs() opnieuw
      // aanriep, niet omdat het specifiek nodig was. Twee korte vertraagde
      // herscans dekken diezelfde race nu automatisch af, zonder een nieuwe
      // requestMIDIAccess() (dus geen hernieuwde toestemmings-prompt) en
      // zonder dat de gebruiker zelf van app moet wisselen.
      setTimeout(() => this._wireInputs(), 800);
      setTimeout(() => this._wireInputs(), 2500);
    }).catch(err => {
      console.warn('🎹 MIDI-toegang mislukt of geweigerd:', err);
      this.updateStatusIndicator();
    });
  },

  _wireInputs(){
    this.inputs = Array.from(this.access.inputs.values());
    this.inputs.forEach(input => { input.onmidimessage = (e) => this._handleMessage(e); });
    this.connected = this.inputs.length > 0;
    this.updateStatusIndicator();
  },

  _handleMessage(e){
    const [status, midi, velocity] = e.data;
    const command = status & 0xf0;
    if (command === 0x90 && velocity > 0) this._emit('on', midi, velocity, 'midi');
    else if (command === 0x80 || (command === 0x90 && velocity === 0)) this._emit('off', midi, 0, 'midi');
  },

  // Publieke ingang voor het virtuele klavier — zie architectuur-opmerking
  // hierboven.
  simulateNoteOn(midi, velocity = 100){ this._emit('on', midi, velocity, 'virtual'); },
  simulateNoteOff(midi){ this._emit('off', midi, 0, 'virtual'); },

  onNote(callback){ this.listeners.push(callback); },
  offNote(callback){ this.listeners = this.listeners.filter(cb => cb !== callback); },
  _emit(type, midi, velocity, source){
    // activeNotes bijwerken VÓÓR de listeners aanroepen, zodat een listener
    // die op dit event reageert altijd de actuele volledige set ziet
    // (inclusief de noot van dit event zelf).
    if (type === 'on') this.activeNotes.add(midi); else this.activeNotes.delete(midi);
    this.listeners.forEach(cb => {
      try { cb({ type, midi, velocity, source }); }
      catch(err){ console.error('MIDI-listener gaf een fout:', err); }
    });
  },

  deviceNames(){ return this.inputs.map(i => i.name || 'MIDI'); },

  statusText(){
    if (!this.supported()) return Lang.t('tooltip_midi_unsupported');
    if (this.connected) return Lang.t('tooltip_midi_connected', { device: this.deviceNames().join(', ') });
    return Lang.t('tooltip_midi_none');
  },

  updateStatusIndicator(){
    const dot = document.getElementById('midi-status-indicator');
    if (!dot) return;
    dot.classList.toggle('connected', this.connected);
    dot.title = this.statusText();
  }
};
