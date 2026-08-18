// Muziektheorie-naslagwerk, ruwe data (Fase 3.2, sinds v0.15.0) — GEEN
// quizdata: dit voedt een doorbladerbare cheat-sheet-view (TheoryUI, zie
// theory-ui.js), geen App.history/qa()/_questionKey-integratie nodig
// (zelfde soort uitzondering als Kwintencirkel's visuele modus, zie
// Root_Note_Stappenplan.md Fase 3.2). Nederlands-gesleuteld, zelfde
// architectuurprincipe als de rest van de app: elk item heeft een `key`
// waaruit TheoryUI de i18n-teksten opbouwt (`theory_<key>_title`/
// `theory_<key>_desc` in lang.js), en een `render`-spec voor
// ScoreRenderer.renderSymbol() (zie score-renderer.js). Uitbreidbaar: een
// nieuw item toevoegen is een nieuw object in de juiste categorie plus twee
// nieuwe I18N-regels — geen verdere code nodig.
const TheoryData = [
  {
    key: 'restsDuration',
    items: [
      { key: 'restWhole', render: { notes: [
        { keys:['b/4'], duration:'w' }, { keys:['b/4'], duration:'wr' }
      ] } },
      { key: 'restHalf', render: { notes: [
        { keys:['b/4'], duration:'h' }, { keys:['b/4'], duration:'hr' }
      ] } },
      { key: 'restQuarter', render: { notes: [
        { keys:['b/4'], duration:'q' }, { keys:['b/4'], duration:'qr' }
      ] } },
      { key: 'restEighth', render: { notes: [
        { keys:['b/4'], duration:'8' }, { keys:['b/4'], duration:'8r' }
      ] } }
    ]
  },
  {
    key: 'legatoSlur',
    items: [
      { key: 'slur', render: { notes: [
        { keys:['c/4'], duration:'q' }, { keys:['e/4'], duration:'q' }, { keys:['g/4'], duration:'q' }
      ], slur:true } },
      { key: 'tie', render: { notes: [
        { keys:['c/4'], duration:'q' }, { keys:['c/4'], duration:'q' }
      ], tie:true } }
    ]
  },
  {
    key: 'articulation',
    items: [
      { key: 'staccato', render: { notes: [
        { keys:['c/4'], duration:'q', articulation:'a.' },
        { keys:['e/4'], duration:'q', articulation:'a.' }
      ] } },
      { key: 'accent', render: { notes: [
        { keys:['c/4'], duration:'q', articulation:'a>' },
        { keys:['e/4'], duration:'q', articulation:'a>' }
      ] } },
      { key: 'tenuto', render: { notes: [
        { keys:['c/4'], duration:'q', articulation:'a-' },
        { keys:['e/4'], duration:'q', articulation:'a-' }
      ] } }
    ]
  },
  {
    key: 'dynamics',
    items: ['pp', 'p', 'mp', 'mf', 'f', 'ff'].map(d => ({
      key: 'dyn_' + d,
      render: { notes: [{ keys:['c/4'], duration:'q', annotation:{ text:d, pos:'below' } }] }
    }))
  },
  {
    key: 'tempo',
    items: [
      { key: 'rit', render: { notes: [
        { keys:['c/4'], duration:'q', annotation:{ text:'rit.', pos:'above' } },
        { keys:['e/4'], duration:'q' }
      ] } },
      { key: 'accel', render: { notes: [
        { keys:['c/4'], duration:'q', annotation:{ text:'accel.', pos:'above' } },
        { keys:['e/4'], duration:'q' }
      ] } },
      { key: 'aTempo', render: { notes: [
        { keys:['c/4'], duration:'q', annotation:{ text:'a tempo', pos:'above' } },
        { keys:['e/4'], duration:'q' }
      ] } },
      { key: 'fermate', render: { notes: [
        { keys:['c/4'], duration:'q', articulation:'a@a' }
      ] } }
    ]
  }
];
