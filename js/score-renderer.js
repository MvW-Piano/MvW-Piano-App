/* ============================================================
   SCORE RENDERER — Enharmonisch (Flats vs Sharps)
============================================================ */
const ScoreRenderer = {
  CANVAS_W: 620,
  CANVAS_H: 320,
  TREBLE_Y: 110,
  STAVE_GAP: 60,
  MARGIN_X: 12,
  OTTAVA_THRESHOLD: 3,

  midiToKey(midi, useFlats){
    const lettersSharp = ['c','c','d','d','e','f','f','g','g','a','a','b'];
    const accSharp =     ['', '#','', '#','', '', '#','', '#','', '#',''];
    const lettersFlat =  ['c','d','d','e','e','f','g','g','a','a','b','b'];
    const accFlat =      ['', 'b','', 'b','', '', 'b','', 'b','', 'b',''];
    const idx = midi % 12;
    const oct = Math.floor(midi / 12) - 1;
    return useFlats
        ? { key: `${lettersFlat[idx]}/${oct}`, acc: accFlat[idx] }
        : { key: `${lettersSharp[idx]}/${oct}`, acc: accSharp[idx] };
  },

  staffStep(midi, useFlats){
    const lettersSharp = ['c','c','d','d','e','f','f','g','g','a','a','b'];
    const lettersFlat =  ['c','d','d','e','e','f','g','g','a','a','b','b'];
    const letterMap = { c:0, d:1, e:2, f:3, g:4, a:5, b:6 };
    const idx = midi % 12;
    const oct = Math.floor(midi / 12) - 1;
    const letter = useFlats ? lettersFlat[idx] : lettersSharp[idx];
    return oct * 7 + letterMap[letter];
  },

  ottavaInfo(midi, clef, useFlats){
    const step = this.staffStep(midi, useFlats);
    const bottomRef = clef === 'treble' ? 30 : 18; 
    const topRef    = clef === 'treble' ? 38 : 26; 
    if (step < bottomRef) return { lines: Math.floor((bottomRef - step) / 2), dir: 'below' };
    if (step > topRef)    return { lines: Math.floor((step - topRef) / 2), dir: 'above' };
    return { lines: 0, dir: null };
  },

  buildNote(midis, clef, useFlats, ink){
    const VF = Vex.Flow;
    if (!midis || midis.length === 0) return new VF.GhostNote('q');
    const sorted = [...midis].sort((a,b) => a - b);
    const extreme = clef === 'treble' ? sorted[sorted.length - 1] : sorted[0];
    const info = this.ottavaInfo(extreme, clef, useFlats);
    let shift = 0, ottavaLabel = null;
    if (info.lines > this.OTTAVA_THRESHOLD){
      shift = info.dir === 'below' ? 12 : -12;
      const after = this.ottavaInfo(extreme + shift, clef, useFlats);
      if (after.lines <= this.OTTAVA_THRESHOLD){
        ottavaLabel = info.dir === 'below' ? '8vb' : '8va';
      } else {
        shift = 0; 
      }
    }

    const display = shift ? sorted.map(m => m + shift) : sorted;
    const parsed = display.map(m => this.midiToKey(m, useFlats));
    const note = new VF.StaveNote({ keys: parsed.map(p => p.key), duration: 'q', auto_stem: true, clef });
    // Expliciet de notitie-stijl zetten i.p.v. alleen op de algemene
    // canvas-contextkleur te vertrouwen (ctx.setFillStyle/setStrokeStyle in
    // _draw()) — hulplijntjes (bijv. bij middenC, dat precies op de rand
    // tussen de twee notenbalken valt) blijken die ambient contextkleur
    // niet altijd te volgen en gebruikten anders VexFlow's eigen zwarte
    // default, nauwelijks zichtbaar in het donkere thema. Hulplijntjes
    // hebben in VexFlow bovendien een EIGEN stijl-property (ledgerLineStyle,
    // default '#444') los van setStyle() — moet apart gezet worden.
    if (ink){
      note.setStyle({ fillStyle: ink, strokeStyle: ink });
      note.setLedgerLineStyle({ fillStyle: ink, strokeStyle: ink });
    }
    parsed.forEach((p, i) => {
      if (!p.acc) return;
      const accidental = new VF.Accidental(p.acc);
      try { note.addModifier(accidental, i); }
      catch(e1){
        try { note.addModifier(i, accidental); }
        catch(e2){ console.warn('Kon voorteken niet toevoegen:', e2); }
      }
    });
    if (ottavaLabel){
      try {
        const ann = new VF.Annotation(ottavaLabel);
        if (ann.setFont) ann.setFont('Inter', 12, 'italic');
        if (ann.setVerticalJustification && VF.Annotation.VerticalJustify){
          ann.setVerticalJustification(ottavaLabel === '8va' ? VF.Annotation.VerticalJustify.TOP : VF.Annotation.VerticalJustify.BOTTOM);
        }
        try { note.addModifier(ann, 0); } catch(e1){ note.addModifier(0, ann); }
      } catch(e){ console.warn('Kon 8va/8vb-label niet toevoegen:', e); }
    }
    return note;
  },

  render(containerId, slices, useFlats = false, opts = {}){
    const VF = Vex.Flow;
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    try {
      this._draw(VF, container, slices, useFlats, opts);
    } catch(err){
      console.error('Notenbalk kon niet worden getekend:', err);
      container.innerHTML = '<p style="color:#c1594e; font-size:.85rem; padding:20px;">De notenbalk kon niet worden getekend. Probeer de pagina te verversen.</p>';
    }
  },

  _draw(VF, container, slices, useFlats, opts = {}){
    {
    const canvasW = opts.canvasW || this.CANVAS_W;
    const renderer = new VF.Renderer(container, VF.Renderer.Backends.SVG);
    renderer.resize(canvasW, this.CANVAS_H);
    const ctx = renderer.getContext();
    ctx.setFont('Inter, Arial', 10);
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const ink = isDark ? '#f2f4f9' : '#111827';
    if (ctx.setFillStyle) ctx.setFillStyle(ink);
    if (ctx.setStrokeStyle) ctx.setStrokeStyle(ink);

    const staveWidth = canvasW - this.MARGIN_X * 2;
    const trebleStave = new VF.Stave(this.MARGIN_X, this.TREBLE_Y, staveWidth);
    trebleStave.addClef('treble');

    const bassY = this.TREBLE_Y + this.STAVE_GAP;
    const bassStave = new VF.Stave(this.MARGIN_X, bassY, staveWidth);
    bassStave.addClef('bass');

    trebleStave.setContext(ctx).draw();
    bassStave.setContext(ctx).draw();

    new VF.StaveConnector(trebleStave, bassStave).setType(VF.StaveConnector.type.BRACE).setContext(ctx).draw();
    new VF.StaveConnector(trebleStave, bassStave).setType(VF.StaveConnector.type.SINGLE_LEFT).setContext(ctx).draw();
    new VF.StaveConnector(trebleStave, bassStave).setType(VF.StaveConnector.type.SINGLE_RIGHT).setContext(ctx).draw();

    const n = Math.max(slices.length, 1);
    const trebleNotes = [], bassNotes = [];

    (slices.length ? slices : [[]]).forEach(slice => {
      const treble = slice.filter(m => m >= 60);
      const bass = slice.filter(m => m < 60);
      trebleNotes.push(this.buildNote(treble, 'treble', useFlats, ink));
      bassNotes.push(this.buildNote(bass, 'bass', useFlats, ink));
    });

    const trebleVoice = new VF.Voice({ num_beats: n, beat_value: 4 }).setStrict(false).addTickables(trebleNotes);
    const bassVoice = new VF.Voice({ num_beats: n, beat_value: 4 }).setStrict(false).addTickables(bassNotes);

    const formatter = new VF.Formatter();
    formatter.joinVoices([trebleVoice]);
    formatter.joinVoices([bassVoice]);
    formatter.format([trebleVoice, bassVoice], Math.max(staveWidth - 70, 40));

    trebleVoice.draw(ctx, trebleStave);
    bassVoice.draw(ctx, bassStave);

    const svg = container.querySelector('svg');
    if (svg){
      // Altijd verticaal strak bijknippen op de daadwerkelijke inhoud (via
      // getBBox) — de vaste CANVAS_H liet anders bij elke notenbalk (in elke
      // module) veel lege ruimte boven/onder de notenbalk staan. Breedte
      // (canvasW) bepaalt de aanroeper: smal voor "een paar noten aan het
      // begin", vol (620) voor lange reeksen zoals toonladders.
      const bbox = svg.getBBox();
      const pad = 10;
      const y0 = Math.max(0, bbox.y - pad);
      const h = Math.min(this.CANVAS_H - y0, bbox.height + pad * 2);
      svg.setAttribute('viewBox', `0 ${y0} ${canvasW} ${h}`);
      svg.removeAttribute('width');
      svg.removeAttribute('height');
      // VexFlow's renderer.resize() zet naast de attributen OOK een inline
      // style="width:...px;height:...px" — die wint altijd van de CSS-regel
      // (width:100%; height:auto), waardoor de zichtbare doos op de OUDE,
      // ongecropte hoogte bleef staan ondanks de kleinere viewBox hierboven.
      // Zonder deze twee regels lijkt de crop dus niets op te leveren.
      svg.style.removeProperty('width');
      svg.style.removeProperty('height');
    }
    }
  }
};
