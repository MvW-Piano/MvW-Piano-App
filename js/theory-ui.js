// Muziektheorie-naslagwerk UI (Fase 3.2, sinds v0.15.0) — bouwt de
// doorbladerbare cheat-sheet op uit TheoryData (theory-data.js). Geen
// quiz-navigatie (geen App.history/nextQuestion/qa) — gewoon één keer de
// hele lijst als DOM opbouwen; ScoreRenderer.renderSymbol() tekent per item
// een klein voorbeeld. render() is idempotent (leegt #theory-content eerst
// bij elke aanroep), dus veilig opnieuw aan te roepen bij een taal- of
// themawissel (zie App.loadModule()/Lang.apply()/ThemeManager.toggle()).
const TheoryUI = {
  render(){
    const host = document.getElementById('theory-content');
    if (!host) return;
    host.innerHTML = TheoryData.map(cat => `
      <section class="theory-category">
        <h2>${Lang.t('theory_cat_' + cat.key)}</h2>
        <div class="theory-grid">
          ${cat.items.map(item => `
            <div class="theory-card">
              <div class="theory-card-visual" id="theory-vis-${item.key}"></div>
              <h3>${Lang.t('theory_' + item.key + '_title')}</h3>
              <p>${Lang.t('theory_' + item.key + '_desc')}</p>
            </div>
          `).join('')}
        </div>
      </section>
    `).join('');
    TheoryData.forEach(cat => cat.items.forEach(item => {
      ScoreRenderer.renderSymbol('theory-vis-' + item.key, item.render);
    }));
  }
};
