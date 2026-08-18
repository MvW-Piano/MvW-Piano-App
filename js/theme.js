const ThemeManager = {
  init(){
    const saved = localStorage.getItem('pm_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    this.updateIcons(saved);
  },
  toggle(){
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('pm_theme', next);
    this.updateIcons(next);
    const data = App.history && App.history[App.historyIndex];
    if (App.currentModule === 'circle' && data?.c_mode === 'visual'){
      CircleWheel.render();
      // CircleWheel.render() tekent alleen het wiel zelf opnieuw; het losse
      // akkoordvoorbeeld ernaast (met de kleuren van het vorige thema erin
      // "gebakken" door VexFlow) moet apart ververst worden, anders blijft
      // het er met de oude, onleesbare thema-kleuren bij staan.
      if (CircleWheel._previewed){
        CircleWheel.showChord(CircleWheel.lastShown.root, CircleWheel.lastShown.quality, { play: false });
      }
    } else if (data && data.slices){
      if (document.getElementById('score-paper')?.style.display !== 'none'){
        App.applyPaperMaxWidth(App.currentModule);
        ScoreRenderer.render('score-paper', data.slices, data.useFlats, App.paperRenderOpts(App.currentModule));
      }
      // Intervallen > Blind (Audio): het onthulde antwoord staat als eigen
      // notenbalk in #answer-score (zie App.revealAnswer()), los van
      // #score-paper — had dezelfde "VexFlow bakt kleuren"-valkuil (zie
      // hierboven bij CircleWheel) maar werd hier nog gemist. Alleen
      // opnieuw tekenen als 'ie daadwerkelijk zichtbaar is (na Toon
      // Antwoord) — anders bestaat er nog niets om te herkleuren.
      const answerScore = document.getElementById('answer-score');
      if (answerScore && answerScore.style.display !== 'none'){
        ScoreRenderer.render('answer-score', data.slices, data.useFlats, { canvasW: 260 });
      }
    }
  },
  updateIcons(theme){
    const btnStart = document.getElementById('theme-btn-start');
    const btnHeader = document.getElementById('theme-btn-header');
    const btnBnav = document.getElementById('theme-btn-bnav');
    const isDark = theme === 'dark';
    if (btnStart) btnStart.innerHTML = isDark ? '☀️' : '🌙';
    if (btnHeader) btnHeader.innerHTML = isDark ? '☀️' : '🌙';
    if (btnBnav){ const icon = btnBnav.querySelector('.bnav-icon'); if (icon) icon.textContent = isDark ? '☀️' : '🌙'; }
  }
};
