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
    const n = Math.max(slices.length, 1);
    // Notenbereik-instelling (Fase 2.1a, sinds v0.12.0): opts.clef ('treble'
    // of 'bass') tekent maar ÉÉN notenbalk i.p.v. de gewone grand staff —
    // alleen gebruikt door Noten Lezen wanneer de gebruiker een sleutel
    // kiest, alle andere aanroepers laten opts.clef weg en krijgen het
    // ongewijzigde grand-staff-gedrag hieronder (else-tak).
    if (opts.clef === 'treble' || opts.clef === 'bass'){
      const stave = new VF.Stave(this.MARGIN_X, this.TREBLE_Y, staveWidth);
      stave.addClef(opts.clef);
      stave.setContext(ctx).draw();

      const notes = (slices.length ? slices : [[]]).map(slice => this.buildNote(slice, opts.clef, useFlats, ink));
      const voice = new VF.Voice({ num_beats: n, beat_value: 4 }).setStrict(false).addTickables(notes);
      const formatter = new VF.Formatter();
      formatter.joinVoices([voice]);
      formatter.format([voice], Math.max(staveWidth - 70, 40));
      voice.draw(ctx, stave);
    } else {
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
    }

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
  },

  // ---- Muziektheorie-naslagwerk: kleine illustratieve voorbeelden (Fase
  // 3.2, sinds v0.15.0) ----
  // Eén korte fase op één notenbalk, met optionele articulatie/annotatie/
  // slur/tie per noot — voor de cheat-sheet-view (TheoryUI, zie
  // theory-ui.js/theory-data.js). Bewust een EIGEN, eenvoudiger
  // notenbouw-pad dan buildNote() hierboven (dat is toegespitst op
  // akkoorden/octaafcorrectie/voortekens voor de quizmodules) — hier gaat
  // het om een klein, vast voorbeeld zonder die complicaties, maar wel met
  // dezelfde thema-kleurdetectie/crop-naar-inhoud-aanpak als render()
  // hierboven, vandaar dat dit toch als ScoreRenderer-methode leeft i.p.v.
  // een losse renderer op te tuigen.
  // spec: `{ notes:[{keys, duration, articulation?, annotation?:{text,pos}}],
  // slur?:bool, tie?:bool }`. `pos` is `'above'`/`'below'`.
  renderSymbol(containerId, spec, opts = {}){
    const VF = Vex.Flow;
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    try {
      const canvasW = opts.canvasW || 220;
      const canvasH = 120;
      const renderer = new VF.Renderer(container, VF.Renderer.Backends.SVG);
      renderer.resize(canvasW, canvasH);
      const ctx = renderer.getContext();
      ctx.setFont('Inter, Arial', 10);
      const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
      const ink = isDark ? '#f2f4f9' : '#111827';
      if (ctx.setFillStyle) ctx.setFillStyle(ink);
      if (ctx.setStrokeStyle) ctx.setStrokeStyle(ink);

      const stave = new VF.Stave(4, 20, canvasW - 8);
      stave.setContext(ctx).draw();

      const notes = spec.notes.map(n => {
        const note = new VF.StaveNote({ keys:n.keys, duration:n.duration, auto_stem:true });
        note.setStyle({ fillStyle:ink, strokeStyle:ink });
        note.setLedgerLineStyle({ fillStyle:ink, strokeStyle:ink });
        if (n.articulation){
          const art = new VF.Articulation(n.articulation);
          try { note.addModifier(art, 0); }
          catch(e1){ try { note.addModifier(0, art); } catch(e2){ console.warn('Kon articulatie niet toevoegen:', e2); } }
        }
        if (n.annotation){
          const ann = new VF.Annotation(n.annotation.text);
          if (ann.setFont) ann.setFont('Inter', 12, 'italic');
          if (ann.setVerticalJustification && VF.Annotation.VerticalJustify){
            ann.setVerticalJustification(n.annotation.pos === 'above' ? VF.Annotation.VerticalJustify.TOP : VF.Annotation.VerticalJustify.BOTTOM);
          }
          try { note.addModifier(ann, 0); }
          catch(e1){ try { note.addModifier(0, ann); } catch(e2){ console.warn('Kon annotatie niet toevoegen:', e2); } }
        }
        return note;
      });

      const voice = new VF.Voice({ num_beats: notes.length, beat_value: 4 }).setStrict(false).addTickables(notes);
      const formatter = new VF.Formatter();
      formatter.joinVoices([voice]);
      formatter.format([voice], canvasW - 50);
      voice.draw(ctx, stave);

      if (spec.slur && notes.length >= 2) new VF.Curve(notes[0], notes[notes.length - 1], {}).setContext(ctx).draw();
      if (spec.tie && notes.length >= 2) new VF.StaveTie({ first_note: notes[0], last_note: notes[1] }).setContext(ctx).draw();

      const svg = container.querySelector('svg');
      if (svg){
        const bbox = svg.getBBox();
        const pad = 8;
        const y0 = Math.max(0, bbox.y - pad);
        // GEEN Math.min(canvasH - y0, ...)-clamp zoals render() hierboven
        // gebruikt — daar is CANVAS_H (320) altijd ruim genoeg voor de
        // quizinhoud, maar hier duwt bijv. een dynamiek-annotatie ONDER een
        // al-lage noot (met hulplijntje) de werkelijke inhoud verder naar
        // beneden dan de vaste canvasH (120) toelaat. De crop is puur een
        // viewBox-wijziging (geen echte clip-grens), dus een grotere `h` dan
        // canvasH is hier gewoon veilig — bevestigd bug (dynamiek-tekst werd
        // afgesneden) tijdens het testen van Fase 3.2.
        const h = bbox.height + pad * 2;
        svg.setAttribute('viewBox', `0 ${y0} ${canvasW} ${h}`);
        svg.removeAttribute('width');
        svg.removeAttribute('height');
        svg.style.removeProperty('width');
        svg.style.removeProperty('height');
      }
    } catch(err){
      console.error('Muziektheorie-voorbeeld kon niet worden getekend:', err);
      container.innerHTML = '<p style="color:#c1594e; font-size:.75rem; padding:8px;">Kon niet getekend worden.</p>';
    }
  }
};
