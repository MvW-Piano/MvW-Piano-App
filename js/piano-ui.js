const PianoUI = {
  initialized: false,
  init(){
    if (!this.initialized){
      const pk = document.getElementById('piano-keys');
      pk.innerHTML = '';
      for (let m = 21; m <= 108; m++){
        let isBlack = [1,3,6,8,10].includes(m % 12);
        let key = document.createElement('div');
        key.className = `key ${isBlack ? 'black' : 'white'}`;
        key.id = `key-${m}`;
        if (m % 12 === 0 && !isBlack){
          let lbl = document.createElement('span'); lbl.innerText = 'C' + ((m/12) - 1); key.appendChild(lbl);
        }
        const press = (e) => {
          e.preventDefault();
          if (e.type === 'touchstart' && AudioEngine.ctx && AudioEngine.ctx.state === 'suspended') AudioEngine.ctx.resume();
          AudioEngine.playTone(m, 2.0, 0.8); key.classList.add('active');
        };
        const release = (e) => { e.preventDefault(); key.classList.remove('active'); };
        key.addEventListener('mousedown', press);
        key.addEventListener('touchstart', press, {passive:false});
        key.addEventListener('mouseup', release);
        key.addEventListener('mouseleave', release);
        key.addEventListener('touchend', release);
        pk.appendChild(key);
      }
      this.initialized = true;
    }
    this.centerC4();
  },
  scroll(amt){ document.getElementById('piano-wrapper').scrollBy({ left: amt, behavior: 'smooth' }); },
  centerC4(){
    setTimeout(() => {
      const wrapper = document.getElementById('piano-wrapper');
      const keys = document.getElementById('piano-keys').children;
      if (keys[39]) wrapper.scrollTo({ left: keys[39].offsetLeft - (wrapper.offsetWidth / 2) + 20, behavior: 'smooth' });
    }, 100);
  }
};

const MiniKeyboard = {
  START: 60, END: 88,
  render(containerId, activeMidis = [], rootMidi = null){
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    const row = document.createElement('div');
    row.style.display = 'flex';

    for (let m = this.START; m <= this.END; m++){
      const isBlack = [1,3,6,8,10].includes(m % 12);
      const key = document.createElement('div');
      key.className = `mini-key ${isBlack ? 'black' : 'white'}`;
      if (activeMidis.includes(m)){
        const dot = document.createElement('span');
        dot.className = 'mk-dot ' + (m === rootMidi ? 'root' : 'tone');
        key.appendChild(dot);
      }
      row.appendChild(key);
    }
    container.appendChild(row);
  }
};
