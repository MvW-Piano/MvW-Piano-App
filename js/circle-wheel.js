const CircleWheel = {
  tonicIndex: 0,
  // De "actieve" grondtoon waar de akkoordsoort-knoppen rechts op werken —
  // wordt gezet door een klik op een taartpunt (dan naar díe taartpunt se
  // grondtoon) en teruggezet naar de tonica zodra je draait/een
  // toonsoort-knop links aanklikt (dat is dan weer de standaard).
  selectedRootLabel: 'C',
  // Akkoordsoort die bij `selectedRootLabel` hoort — een klik op een
  // taartpunt zet 'm op de daar diatonisch bijpassende soort (bijv. Am→
  // Mineur, Bm/vii°→Diminished); een klik op een akkoordsoort-knop zet 'm
  // op de gekozen soort. Draaien/toonsoort-knop links: terug naar 'Majeur'.
  selectedChordType: 'Majeur',
  // Wat er nu daadwerkelijk op de notenbalk/keyboard te zien is. Meestal
  // gelijk aan {selectedRootLabel, selectedChordType}, maar draaien zet
  // ALLEEN die twee terug (zie "enige functie" hierboven) zonder de
  // notenbalk te verversen — lastShown blijft dan tijdelijk achter bij wat
  // je het laatst echt hebt aangeklikt. Gebruikt om na een thema-wissel
  // exact hetzelfde te hertekenen.
  lastShown: { root: 'C', quality: 'Majeur' },
  wired: false,

  cofKeys: [
    {maj:'C', min:'Am', acc:0}, {maj:'G', min:'Em', acc:1}, {maj:'D', min:'Bm', acc:2},
    {maj:'A', min:'F#m', acc:3}, {maj:'E', min:'C#m', acc:4}, {maj:'B', min:'G#m', acc:5},
    {maj:'F#', min:'D#m', acc:6}, {maj:'Db', min:'Bbm', acc:-5}, {maj:'Ab', min:'Fm', acc:-4},
    {maj:'Eb', min:'Cm', acc:-3}, {maj:'Bb', min:'Gm', acc:-2}, {maj:'F', min:'Dm', acc:-1}
  ],
  rootToMidi: {"C":60,"G":67,"D":62,"A":69,"E":64,"B":71,"F#":66,"Db":61,"Ab":68,"Eb":63,"Bb":70,"F":65,"Am":69,"Em":64,"Bm":71,"F#m":66,"C#m":61,"G#m":68,"D#m":63,"Bbm":70,"Fm":65,"Cm":60,"Gm":67,"Dm":62},
  chordAbbr: {"Majeur":"Maj","Mineur":"Min","Diminished":"Dim","Sus2":"Sus2","Sus4":"Sus4","Maj7":"Maj7","Min7":"Min7","Dom7":"Dom7","m7b5":"m7b5","Maj9":"Maj9","Min9":"Min9"},

  romanFor(i){
    let offset = (i - this.tonicIndex) % 12;
    if (offset > 6) offset -= 12;
    if (offset < -6) offset += 12;
    if (offset === 0)  return { major: 'I',  minor: 'vi' };
    if (offset === -1) return { major: 'IV', minor: 'ii' };
    if (offset === 1)  return { major: 'V',  minor: 'iii' };
    if (offset === 2)  return { major: null, minor: 'vii°' };
    return { major: null, minor: null };
  },

  renderQuickJump(){
    const jump = document.getElementById('circle-quick-jump');
    jump.innerHTML = '';
    this.cofKeys.forEach((entry, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'circle-jump-btn' + (i === this.tonicIndex ? ' active' : '');
      btn.textContent = entry.maj;
      btn.title = 'Zet ' + entry.maj + ' bovenaan';
      btn.addEventListener('click', () => {
        this.tonicIndex = i;
        // De akkoordsoort-knoppen rechts springen terug naar de tonica +
        // Majeur (de standaard) — en die nieuwe tonica wordt ook meteen
        // getoond/gespeeld, zodat je 'm niet apart nog hoeft aan te klikken.
        this.selectedRootLabel = entry.maj;
        this.selectedChordType = 'Majeur';
        this.render();
        this.showChord(entry.maj, 'Majeur', { play: true });
      });
      jump.appendChild(btn);
    });
  },

  renderChordJump(){
    const jump = document.getElementById('circle-chord-jump');
    jump.innerHTML = '';
    Object.keys(MusicTheory.chords).forEach(k => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'circle-jump-btn chord' + (k === this.selectedChordType ? ' active' : '');
      btn.textContent = this.chordAbbr[k] || k.slice(0,5);
      btn.title = Lang.chordName(k);
      btn.addEventListener('click', () => {
        this.selectedChordType = k;
        this.renderChordJump();
        // Deze knoppen gaan over de LAATST AANGEKLIKTE grondtoon
        // (`selectedRootLabel` — standaard de tonica, maar een klik op een
        // taartpunt zoals "Am" verlegt dit naar A) — zo kun je bijv. na Am
        // aanklikken meteen op "Maj" drukken om A-majeur te horen, i.p.v.
        // dat dit altijd naar de tonica teruggrijpt.
        this.showChord(this.selectedRootLabel, k, { play: true });
      });
      jump.appendChild(btn);
    });
  },

  showChord(rootLabel, quality, opts = {}){
    const rootMidi = this.rootToMidi[rootLabel];
    const formula = MusicTheory.chords[quality];
    if (rootMidi === undefined || !formula) return;
    // Onthoudt wat er nu op de notenbalk/keyboard te zien is — los van de
    // tonica-gebonden `selectedChordType` hierboven — zodat een thema-wissel
    // (zie ThemeManager.toggle) precies datzelfde kan hertekenen, ook als
    // het laatst een taartpunt was i.p.v. een akkoordsoort-knop.
    this.lastShown = { root: rootLabel, quality };
    const notes = formula.map(iv => rootMidi + iv);
    if (opts.play) AudioEngine.playArpeggioAndChord(notes, 0.5);
    try {
      const preview = document.getElementById('circle-chord-preview');
      preview.style.display = 'flex';
      let useFlats = rootLabel.includes('b') || rootLabel === 'F' || rootLabel === 'Dm' || rootLabel === 'Gm' || rootLabel === 'Cm' || rootLabel === 'Fm' || rootLabel === 'Bbm' || rootLabel === 'Ebm';
      // canvasW smal + crop: toon alleen het sleutel+akkoord-deel groter
      // i.p.v. de hele, grotendeels lege notenbalk. Breedte-uitlijning met
      // het toetsenbord eronder komt nu van gedeelde CSS-centrering
      // (justify-content:safe center), niet meer van JS die de breedtes
      // geforceerd gelijk maakte — dat verhield zich niet met deze crop.
      ScoreRenderer.render('circle-chord-preview', [notes], useFlats, { canvasW: 275 });
    } catch(e){ console.warn('Kon akkoordvoorbeeld niet tekenen:', e); }
    try { MiniKeyboard.render('circle-keyboard-wrap', notes, notes[0]); }
    catch(e){ console.warn('Kon toetsenbord niet tekenen:', e); }
  },

  onWedgeClick(idx, ring){
    // Alleen taartpunten die daadwerkelijk bij de huidige toonsoort horen
    // (I/ii/iii/IV/V/vi/vii°) reageren — de overige 5×2 combinaties zijn
    // gedimd getekend (zie render()) en hier dus bewust inert.
    const roman = this.romanFor(idx);
    const isDiatonic = ring === 'major' ? !!roman.major : !!roman.minor;
    if (!isDiatonic) return;

    const entry = this.cofKeys[idx];
    const rootLabel = ring === 'major' ? entry.maj : entry.min;
    // Een klik op een taartpunt toont altijd de "standaard" akkoordsoort
    // die bij die trap hoort (buitenring = majeur, binnenring = mineur) —
    // bijv. Am (binnenring, vi) klinkt altijd als A-mineur. Uitzondering:
    // trap vii° is muziektheoretisch VERMINDERD, niet mineur, ook al staat
    // hij op de binnenring (bijv. in C majeur: B-D-F, niet B-D-F#).
    // Deze klik wordt ook de nieuwe "actieve grondtoon" voor de
    // akkoordsoort-knoppen rechts (die springen dus mee naar bijv. "Min"
    // voor Am, "Dim" voor Bm/vii°) — zo kun je daarna meteen op een andere
    // knop klikken om diezelfde grondtoon in een andere soort te horen.
    const quality = ring === 'major' ? 'Majeur' : (roman.minor === 'vii°' ? 'Diminished' : 'Mineur');
    this.selectedRootLabel = rootLabel;
    this.selectedChordType = quality;
    this.renderChordJump();
    this.showChord(rootLabel, quality, { play: true });
  },

  drawStave(g, accCount, styleVals) {
    if (accCount === 0) return;
    const isSharp = accCount > 0;
    const count = Math.abs(accCount);
    const sharpY = [-8, -2, -10, -4, 2, -6, 0];
    const flatY = [0, -6, 2, -4, 4, -2, -8];

    let html = `<path d="M -20 -8 L 24 -8 M -20 -4 L 24 -4 M -20 0 L 24 0 M -20 4 L 24 4 M -20 8 L 24 8" stroke="${styleVals.staveInk}" stroke-width="0.8"/>`;
    html += `<text x="-24" y="0" font-size="28" font-family="serif" fill="${styleVals.staveInk}" dominant-baseline="central">𝄞</text>`;

    for (let i = 0; i < count; i++) {
        let x = -5 + (i * 4.5);
        let y = isSharp ? sharpY[i] : flatY[i];
        let symbol = isSharp ? '♯' : '♭';
        html += `<text x="${x}" y="${y}" font-size="12" font-family="sans-serif" fill="${styleVals.staveInk}" dominant-baseline="central" font-weight="bold">${symbol}</text>`;
    }
    g.innerHTML = html;
  },

  render(){
    this.renderQuickJump();
    this.renderChordJump();

    const wrap = document.getElementById('circle-wheel-wrap');
    wrap.innerHTML = '';

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("id", "circle-svg");
    svg.setAttribute("viewBox", "0 0 480 480");
    svg.style.filter = "drop-shadow(0 8px 24px rgba(0,0,0,0.12))";

    const cx = 240, cy = 240;
    // Op mobiel is er geen ruimte voor de decoratieve mini-notenbalkjes rond
    // de rand — die duwden de taart terug tot radius 160 van de 240 die de
    // viewBox biedt, waardoor het wiel grotendeels leeg oogde. Zonder die
    // notenbalkjes kan de taart zelf tot vlak tegen de rand groeien.
    const isWide = window.matchMedia('(min-width:900px)').matches;
    const showStaves = isWide;
    const rOuter = isWide ? 160 : 222;
    const rInner = isWide ? 100 : 139;
    const rHole = isWide ? 45 : 63;
    const rTextMaj = isWide ? 140 : 194;
    const rRomanMaj = isWide ? 118 : 164;
    const rTextMin = isWide ? 82 : 114;
    const rRomanMin = isWide ? 60 : 83;
    const wheelRotation = -this.tonicIndex * 30;

    const style = getComputedStyle(document.body);
    const styleVals = {
        majFill: style.getPropertyValue('--wheel-maj').trim(),
        minFill: style.getPropertyValue('--wheel-min').trim(),
        lineStr: style.getPropertyValue('--wheel-line').trim(),
        ink: style.getPropertyValue('--wheel-ink').trim(),
        inkMin: style.getPropertyValue('--wheel-ink-min').trim(),
        inkDim: style.getPropertyValue('--wheel-ink-dim').trim(),
        staveInk: style.getPropertyValue('--wheel-stave').trim()
    };

    // De rotor omvat wedges + labels samen: tijdens het slepen (zie
    // wireInteraction) krijgt DEZE groep een extra live rotate-transform
    // bovenop de al berekende posities, zodat alles in één beweging meedraait
    // met de vinger/muis. Bij loslaten wordt alles opnieuw gerenderd (render())
    // met een bijgewerkte tonicIndex, dus de rotor-transform reset vanzelf.
    const rotor = document.createElementNS("http://www.w3.org/2000/svg", "g");
    rotor.setAttribute("id", "circle-rotor");
    svg.appendChild(rotor);

    const wedgeLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
    wedgeLayer.setAttribute("id", "circle-wedge-layer");
    wedgeLayer.setAttribute("transform", `rotate(${wheelRotation} ${cx} ${cy})`);
    rotor.appendChild(wedgeLayer);

    const labelLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
    rotor.appendChild(labelLayer);

    for (let i = 0; i < 12; i++){
      const entry = this.cofKeys[i];
      const roman = this.romanFor(i);

      let a1 = (i*30 - 15) * Math.PI/180, a2 = ((i+1)*30 - 15) * Math.PI/180;

      let o1x = cx + rOuter * Math.sin(a1), o1y = cy - rOuter * Math.cos(a1);
      let o2x = cx + rOuter * Math.sin(a2), o2y = cy - rOuter * Math.cos(a2);
      let i1x = cx + rInner * Math.sin(a1), i1y = cy - rInner * Math.cos(a1);
      let i2x = cx + rInner * Math.sin(a2), i2y = cy - rInner * Math.cos(a2);
      let h1x = cx + rHole * Math.sin(a1), h1y = cy - rHole * Math.cos(a1);
      let h2x = cx + rHole * Math.sin(a2), h2y = cy - rHole * Math.cos(a2);

      // Niet-diatonische taartpunten (horen niet bij de huidige toonsoort,
      // bijv. F#m als C bovenaan staat) worden gedimd én zijn niet klikbaar
      // — zie onWedgeClick, dat dezelfde romanFor()-uitkomst gebruikt om ze
      // te negeren.
      const DIM_OPACITY = '0.32';
      const isDarkTheme = document.documentElement.getAttribute('data-theme') !== 'light';

      const gMaj = document.createElementNS("http://www.w3.org/2000/svg", "g");
      gMaj.setAttribute('data-ring', 'major'); gMaj.setAttribute('data-index', i);
      if (!roman.major) gMaj.setAttribute('opacity', DIM_OPACITY);
      const pMaj = document.createElementNS("http://www.w3.org/2000/svg", "path");
      pMaj.setAttribute("d", `M ${i1x} ${i1y} L ${o1x} ${o1y} A ${rOuter} ${rOuter} 0 0 1 ${o2x} ${o2y} L ${i2x} ${i2y} A ${rInner} ${rInner} 0 0 0 ${i1x} ${i1y} Z`);
      pMaj.setAttribute("fill", styleVals.majFill);
      pMaj.setAttribute("stroke", styleVals.lineStr);
      pMaj.setAttribute("stroke-width", "2");
      gMaj.appendChild(pMaj); wedgeLayer.appendChild(gMaj);

      const gMin = document.createElementNS("http://www.w3.org/2000/svg", "g");
      gMin.setAttribute('data-ring', 'minor'); gMin.setAttribute('data-index', i);
      if (!roman.minor) gMin.setAttribute('opacity', DIM_OPACITY);
      const pMin = document.createElementNS("http://www.w3.org/2000/svg", "path");
      pMin.setAttribute("d", `M ${h1x} ${h1y} L ${i1x} ${i1y} A ${rInner} ${rInner} 0 0 1 ${i2x} ${i2y} L ${h2x} ${h2y} A ${rHole} ${rHole} 0 0 0 ${h1x} ${h1y} Z`);
      pMin.setAttribute("fill", styleVals.minFill);
      pMin.setAttribute("stroke", styleVals.lineStr);
      pMin.setAttribute("stroke-width", "2");
      gMin.appendChild(pMin); wedgeLayer.appendChild(gMin);

      const effAngleDeg = i*30 + wheelRotation;
      const effAngle = effAngleDeg * Math.PI/180;

      if (showStaves && entry.acc !== 0) {
        const rStave = 202;
        const txStave = cx + rStave*Math.sin(effAngle), tyStave = cy - rStave*Math.cos(effAngle);
        const gStave = document.createElementNS("http://www.w3.org/2000/svg", "g");
        gStave.setAttribute("transform", `translate(${txStave}, ${tyStave}) scale(1.3)`);
        gStave.style.pointerEvents = "none";
        this.drawStave(gStave, entry.acc, styleVals);
        labelLayer.appendChild(gStave);
      }

      const txMaj = cx + rTextMaj*Math.sin(effAngle), tyMaj = cy - rTextMaj*Math.cos(effAngle);
      const tMaj = document.createElementNS("http://www.w3.org/2000/svg", "text");
      tMaj.setAttribute("x", txMaj); tMaj.setAttribute("y", tyMaj); tMaj.setAttribute("font-family", "Inter");
      tMaj.setAttribute("font-size", "24"); tMaj.setAttribute("font-weight", "700");
      // Gedimde buitenring-letters: in het lichte thema een aparte grijzere
      // inktkleur i.p.v. de gewone (witte) ink op lage opacity — wit op
      // lichtblauw bij lage opacity was daar nauwelijks leesbaar. In het
      // donkere thema blijft dit exact zoals het was (--wheel-ink-dim is
      // daar gelijk aan --wheel-ink, en dezelfde lage opacity).
      tMaj.setAttribute("fill", roman.major ? styleVals.ink : styleVals.inkDim);
      tMaj.setAttribute("text-anchor", "middle"); tMaj.setAttribute("dominant-baseline", "central");
      if (!roman.major) tMaj.setAttribute('opacity', isDarkTheme ? DIM_OPACITY : '0.85');
      tMaj.style.pointerEvents = "none";
      tMaj.textContent = entry.maj; labelLayer.appendChild(tMaj);

      if (roman.major){
        const txR = cx + rRomanMaj*Math.sin(effAngle), tyR = cy - rRomanMaj*Math.cos(effAngle);
        const tR = document.createElementNS("http://www.w3.org/2000/svg", "text");
        tR.setAttribute("x", txR); tR.setAttribute("y", tyR); tR.setAttribute("font-family", "Inter");
        tR.setAttribute("font-size", "11"); tR.setAttribute("font-weight", "700"); tR.setAttribute("fill", styleVals.ink);
        tR.setAttribute("opacity", "0.9"); tR.setAttribute("text-anchor", "middle"); tR.setAttribute("dominant-baseline", "central");
        tR.style.pointerEvents = "none";
        tR.textContent = roman.major; labelLayer.appendChild(tR);
      }

      const txMin = cx + rTextMin*Math.sin(effAngle), tyMin = cy - rTextMin*Math.cos(effAngle);
      const tMin = document.createElementNS("http://www.w3.org/2000/svg", "text");
      tMin.setAttribute("x", txMin); tMin.setAttribute("y", tyMin); tMin.setAttribute("font-family", "Inter");
      tMin.setAttribute("font-size", "15"); tMin.setAttribute("font-weight", "600"); tMin.setAttribute("fill", styleVals.inkMin);
      tMin.setAttribute("text-anchor", "middle"); tMin.setAttribute("dominant-baseline", "central");
      if (!roman.minor) tMin.setAttribute('opacity', DIM_OPACITY);
      tMin.style.pointerEvents = "none";
      tMin.textContent = entry.min; labelLayer.appendChild(tMin);

      if (roman.minor){
        const txR2 = cx + rRomanMin*Math.sin(effAngle), tyR2 = cy - rRomanMin*Math.cos(effAngle);
        const tR2 = document.createElementNS("http://www.w3.org/2000/svg", "text");
        tR2.setAttribute("x", txR2); tR2.setAttribute("y", tyR2); tR2.setAttribute("font-family", "Inter");
        tR2.setAttribute("font-size", "10"); tR2.setAttribute("font-weight", "700"); tR2.setAttribute("fill", styleVals.inkMin);
        tR2.setAttribute("opacity", "0.9"); tR2.setAttribute("text-anchor", "middle"); tR2.setAttribute("dominant-baseline", "central");
        tR2.style.pointerEvents = "none";
        tR2.textContent = roman.minor; labelLayer.appendChild(tR2);
      }
    }

    // Twee vaste markeerlijntjes die altijd naar boven (12 uur) wijzen en
    // NIET meedraaien met het wiel — op verzoek een vast "wijzertje" i.p.v.
    // een markering die met de wedges meedraait. Ze staan daarom BUITEN de
    // rotor-groep, op vaste hoeken (niet gebaseerd op tonicIndex). Dat werkt
    // omdat wheelRotation (-tonicIndex*30) de actieve toonsoort na elke
    // render() sowieso altijd precies hier neerzet.
    [-15, 15].forEach(deg => {
      const rad = deg * Math.PI/180;
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", cx + rHole*Math.sin(rad)); line.setAttribute("y1", cy - rHole*Math.cos(rad));
      line.setAttribute("x2", cx + rOuter*Math.sin(rad)); line.setAttribute("y2", cy - rOuter*Math.cos(rad));
      line.setAttribute("stroke", "var(--wheel-tonic)");
      line.setAttribute("stroke-width", "2.5");
      line.setAttribute("stroke-linecap", "round");
      line.setAttribute("opacity", "0.9");
      line.setAttribute("class", "wheel-tonic-marker");
      line.style.pointerEvents = "none";
      svg.appendChild(line);
    });

    wrap.appendChild(svg);
    this.wireInteraction(svg, rotor, cx, cy);

    if (!this._previewed){
      this._previewed = true;
      const entry = this.cofKeys[this.tonicIndex];
      this.selectedRootLabel = entry.maj;
      this.showChord(entry.maj, this.selectedChordType, { play: false });
    }
  },

  wireInteraction(svg, rotor, cx, cy){
    // Sleep-om-te-draaien: het wiel kan met muis of vinger rondgedraaid
    // worden i.p.v. alleen via de losse toonsoort-knoppen. De hoek t.o.v.
    // het middelpunt wordt via getScreenCTM omgerekend naar SVG-coördinaten,
    // zodat het klopt ongeacht de werkelijke schermgrootte van het wiel.
    const pointToAngle = (clientX, clientY) => {
      const pt = svg.createSVGPoint();
      pt.x = clientX; pt.y = clientY;
      const loc = pt.matrixTransform(svg.getScreenCTM().inverse());
      return Math.atan2(loc.x - cx, -(loc.y - cy)) * 180 / Math.PI;
    };

    let dragging = false, lastAngle = 0, accumulated = 0, startX = 0, startY = 0, lastX = 0, lastY = 0, pressedWedge = null;

    // Er is BEWUST geen aparte 'click'-listener meer: `svg.setPointerCapture`
    // hieronder (nodig om het slepen buiten de svg-rand te kunnen blijven
    // volgen) bleek in deze browser ook de `target` van het daaropvolgende
    // 'click'-event te herschrijven naar de svg zelf i.p.v. de aangeklikte
    // taartpunt — waardoor `e.target.closest('[data-ring]')` niets meer
    // vond en klikken (dus ook het geluid) willekeurig in het niets vielen.
    // We onthouden nu zelf welke taartpunt bij pointerdown werd geraakt (vóór
    // capture actief is) en gebruiken dat direct bij het loslaten.
    svg.addEventListener('pointerdown', (e) => {
      dragging = true; accumulated = 0;
      startX = lastX = e.clientX; startY = lastY = e.clientY;
      lastAngle = pointToAngle(e.clientX, e.clientY);
      const el = e.target.closest ? e.target.closest('[data-ring]') : null;
      pressedWedge = el ? { ring: el.getAttribute('data-ring'), idx: parseInt(el.getAttribute('data-index')) } : null;
      svg.setPointerCapture(e.pointerId);
    });
    svg.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      lastX = e.clientX; lastY = e.clientY;
      const angle = pointToAngle(e.clientX, e.clientY);
      let step = angle - lastAngle;
      if (step > 180) step -= 360;
      if (step < -180) step += 360;
      accumulated += step;
      lastAngle = angle;
      rotor.setAttribute('transform', `rotate(${accumulated} ${cx} ${cy})`);
    });
    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      // Klik-vs-sleep beslissen op basis van VERPLAATSTE PIXELS, niet van de
      // opgebouwde hoek: dicht bij het midden van het wiel (bijv. de
      // binnenring/mineur-taartpunten) staat een paar pixels muis-tril al
      // gelijk aan een grote hoekverandering (hoek is zeer gevoelig bij
      // kleine straal) — daardoor werd een doodgewone klik daar bijna altijd
      // als "sleep" gezien. Pixelafstand is overal op het wiel even
      // betrouwbaar.
      const movedPx = Math.hypot(lastX - startX, lastY - startY);
      if (movedPx > 8){
        // Echte draai: naar dichtstbijzijnde toonsoort (stappen van 30°)
        // afronden. Vroeger werd hier meteen this.render() aangeroepen, dat
        // het hele wiel opnieuw opbouwt op de nieuwe (afgeronde) hoek — dat
        // gaf een harde jump-cut t.o.v. waar het slepen was gestopt (bijv.
        // van 47° in één keer naar 60°, zonder tussenstap), waardoor de
        // draaibeweging niet natuurlijk "doorliep". Nu wordt eerst de
        // ZICHTBARE rotor zelf met een CSS-transition naar de afgeronde
        // hoek geanimeerd; pas als die animatie klaar is volgt de
        // definitieve this.render() — die komt dan exact op dezelfde hoek
        // uit, dus zonder zichtbare sprong.
        const steps = Math.round(-accumulated / 30);
        const snapAccum = -steps * 30;
        let finished = false;
        const finishRotation = () => {
          if (finished) return;
          finished = true;
          rotor.removeEventListener('transitionend', finishRotation);
          rotor.style.transition = '';
          this.tonicIndex = ((this.tonicIndex + steps) % 12 + 12) % 12;
          // De akkoordsoort-knoppen rechts springen terug naar de tonica +
          // Majeur (de standaard voor de nieuwe tonica) — en die nieuwe
          // tonica wordt ook meteen getoond/gespeeld, zodat je na het
          // draaien niet apart nog op de grondtoon hoeft te klikken.
          this.selectedRootLabel = this.cofKeys[this.tonicIndex].maj;
          this.selectedChordType = 'Majeur';
          this.render();
          this.showChord(this.selectedRootLabel, 'Majeur', { play: true });
        };
        rotor.style.transition = 'transform .32s cubic-bezier(.22,1,.36,1)';
        requestAnimationFrame(() => {
          rotor.setAttribute('transform', `rotate(${snapAccum} ${cx} ${cy})`);
        });
        rotor.addEventListener('transitionend', finishRotation);
        // Tijd-gebaseerd vangnet (zie Ronde 4-les over _suppressClick): als
        // transitionend om wat voor reden dan ook niet vuurt, moet de draai
        // alsnog afgerond worden.
        setTimeout(finishRotation, 360);
      } else {
        // Nauwelijks beweging (een tik): geen echte draai — rotor terugzetten
        // en, als de tik op een taartpunt landde, die meteen afhandelen.
        rotor.removeAttribute('transform');
        if (pressedWedge) this.onWedgeClick(pressedWedge.idx, pressedWedge.ring);
      }
    };
    svg.addEventListener('pointerup', endDrag);
    svg.addEventListener('pointercancel', endDrag);
  }
};
