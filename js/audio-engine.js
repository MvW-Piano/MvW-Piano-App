/* ============================================================
   AUDIO ENGINE
============================================================ */
const AudioEngine = {
  ctx: null, audioCache: {}, sampledMidiNotes: [],
  init(){ const AudioContext = window.AudioContext || window.webkitAudioContext; this.ctx = new AudioContext(); },

  async loadSamples(files){
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    console.log('🎹 Eigen pianogeluid: bezig met inladen...');
    let loadedCount = 0;
    this.sampledMidiNotes = []; this.audioCache = {};
    for(let file of files){
      if (file.name.toLowerCase().endsWith('.wav') || file.name.toLowerCase().endsWith('.mp3')){
        try {
          const ab = await file.arrayBuffer();
          const buf = await this.ctx.decodeAudioData(ab);
          let midiMatch = file.name.match(/\d+/);
          let midiNum = midiMatch ? parseInt(midiMatch[0]) : null;
          if (midiNum){ this.audioCache[midiNum] = buf; if (!this.sampledMidiNotes.includes(midiNum)) this.sampledMidiNotes.push(midiNum); }
          loadedCount++;
        } catch(e){ console.error("Fout bij inladen", e); }
      }
    }
    if (loadedCount > 0){
      this.sampledMidiNotes.sort((a,b) => a - b);
      console.log(`🎹 Eigen pianogeluid: ${loadedCount} samples geladen en actief.`);
    } else {
      console.warn('🎹 Eigen pianogeluid: geen bruikbare .wav/.mp3-bestanden gevonden in de gekozen map.');
    }
  },

  playTone(midi, duration = 1.5, volume = 0.5){
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    // Toetsaanslag-visual blijft altijd zichtbaar, ook met geluid uit —
    // alleen het daadwerkelijke geluid wordt hieronder overgeslagen via de
    // centrale mute-knop (zie SoundUI). Dit is nu het ENE punt waar alle
    // geluid van de app doorheen komt (playChord/playSequence/
    // playArpeggioAndChord roepen allemaal deze functie aan), dus hier
    // gaten is genoeg om de hele app in één keer te (ont)dempen.
    const key = document.getElementById(`key-${midi}`);
    if (key){ key.classList.add('active'); setTimeout(() => key.classList.remove('active'), 300); }
    if (typeof SoundUI !== 'undefined' && !SoundUI.isOn()) return;
    const now = this.ctx.currentTime;
    let buf = null, pitchShift = 0;
    if (this.sampledMidiNotes.length > 0){
      const closest = this.sampledMidiNotes.reduce((prev, curr) => Math.abs(curr - midi) < Math.abs(prev - midi) ? curr : prev);
      buf = this.audioCache[closest]; pitchShift = midi - closest;
    }
    if (buf){
      const src = this.ctx.createBufferSource(); src.buffer = buf;
      src.playbackRate.value = Math.pow(2, pitchShift / 12);
      const gain = this.ctx.createGain(); gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      src.connect(gain); gain.connect(this.ctx.destination); src.start(now);
    } else {
      const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain(); const filter = this.ctx.createBiquadFilter();
      osc.type = 'triangle'; osc.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
      filter.type = 'lowpass'; filter.frequency.value = 1000 + (midi * 10);
      osc.connect(filter); filter.connect(gain); gain.connect(this.ctx.destination);
      gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(volume, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.start(now); osc.stop(now + duration);
    }
  },

  playSequence(midiSlices, delaySec = 0.5){
    midiSlices.forEach((slice, index) => { setTimeout(() => { slice.forEach(midi => this.playTone(midi)); }, index * delaySec * 1000); });
  },
  playChord(midiArray, duration = 1.5, volume = 0.5){ midiArray.forEach(midi => this.playTone(midi, duration, volume)); },

  // CHORD_SUSTAIN_SEC: hoe lang het gelijktijdige akkoord (na de arpeggio)
  // doorklinkt — simuleert het ingedrukt houden van het sustain-pedaal.
  // Alleen de losse arpeggio-noten hiervoor blijven kort (die zijn bedoeld
  // als snelle voorbeeld-tikken, geen samenklank). PROEF-WAARDE: samen met
  // de gebruiker getest voordat dit breder wordt uitgerold/aangepast.
  CHORD_SUSTAIN_SEC: 3.0,

  playArpeggioAndChord(midiArray, noteDelay = 0.5){
    if (!midiArray || midiArray.length === 0) return;
    const sorted = [...midiArray].sort((a,b) => a - b);
    sorted.forEach((midi, index) => {
      setTimeout(() => {
        this.playTone(midi, 1.0, 0.6);
      }, index * noteDelay * 1000);
    });
    setTimeout(() => {
      this.playChord(sorted, this.CHORD_SUSTAIN_SEC);
    }, sorted.length * noteDelay * 1000 + 120);
  }
};
