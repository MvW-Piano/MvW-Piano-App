// Centrale geluid-mute (verving de losse "Geluid Aan/Uit"-instelling die
// eerder per module bij Automatisch Doorgaan stond) — één schakelaar voor
// de hele app, naast thema/fullscreen/samples/reset. AudioEngine.playTone()
// is het ENE punt waar alle geluid doorheen komt, dus SoundUI.isOn() daar
// checken is genoeg om alles (auto-doorgaan, "Toon Antwoord", "Speel Af",
// kwintencirkel-klikken, Vrij Spelen) in één keer te (ont)dempen. Eén klik
// = geluid aan, nog een klik = uit (toggle), met een 🔊/🔇-icoon dat de
// stand toont.
const SoundUI = {
  KEY: 'pm_sound',
  isOn(){ return localStorage.getItem(this.KEY) !== 'uit'; },
  toggle(){
    localStorage.setItem(this.KEY, this.isOn() ? 'uit' : 'aan');
    this.updateIcons();
  },
  updateIcons(){
    const on = this.isOn();
    const icon = on ? '🔊' : '🔇';
    const title = Lang.t(on ? 'tooltip_sound_on' : 'tooltip_sound_off');
    const btnHeader = document.getElementById('sound-btn-header');
    if (btnHeader){ btnHeader.innerHTML = icon; btnHeader.title = title; }
  },
  init(){ this.updateIcons(); }
};
