/* ==========================================================
   I&D QUIZ — admin.js (interface DJ)
========================================================== */

/* ── PIN ─────────────────────────────────────────────────── */
if (sessionStorage.getItem('idquiz_dj') === 'ok') unlockDJ();

document.getElementById('btn-pin').addEventListener('click', checkPin);
document.getElementById('pin-input').addEventListener('keyup', e => { if (e.key === 'Enter') checkPin(); });

function checkPin() {
  if (document.getElementById('pin-input').value === DJ_PIN) {
    sessionStorage.setItem('idquiz_dj', 'ok');
    unlockDJ();
  } else {
    document.getElementById('pin-error').classList.remove('hidden');
    document.getElementById('pin-input').value = '';
  }
}

function unlockDJ() {
  document.getElementById('pin-screen').classList.add('hidden');
  document.getElementById('dj-screen').classList.remove('hidden');
  buildQuestionList();
  listenGame();
}

/* ── Construction de la liste des questions ──────────────── */
function buildQuestionList() {
  const list = document.getElementById('questions-list');
  list.innerHTML = '';
  QUESTIONS.forEach((q, i) => {
    const div = document.createElement('div');
    div.className = 'q-card';
    div.id = `qcard-${i}`;
    div.innerHTML = `
      <div class="q-card-header">
        <span class="q-card-num">Q${i + 1}</span>
        <span class="q-card-badge ${q.answer ? 'badge-vrai' : 'badge-faux'}">
          ${q.answer ? 'VRAI' : 'FAUX'}
        </span>
      </div>
      <div class="q-card-text">${q.text}</div>
    `;
    list.appendChild(div);
  });
}

/* ── État du jeu ─────────────────────────────────────────── */
let currentState = null;

function listenGame() {
  db.ref('quiz/game').on('value', snap => {
    const game = snap.val() || { status: 'waiting', currentQuestion: -1 };
    currentState = game;
    updateUI(game);
  });
}

function updateUI(game) {
  const statusDot  = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const statusQ    = document.getElementById('status-q');
  const btnLaunch  = document.getElementById('btn-launch');
  const btnResults = document.getElementById('btn-results');
  const btnNext    = document.getElementById('btn-next');
  const btnEnd     = document.getElementById('btn-end');

  // Mettre à jour le style des cartes
  QUESTIONS.forEach((_, i) => {
    const card = document.getElementById(`qcard-${i}`);
    if (!card) return;
    card.classList.remove('active', 'done');
    if (i < game.currentQuestion) card.classList.add('done');
    if (i === game.currentQuestion) card.classList.add('active');
  });

  if (game.status === 'waiting') {
    statusDot.classList.remove('active');
    statusText.textContent = 'En attente…';
    statusQ.textContent    = '';
    btnLaunch.disabled  = false;
    btnResults.disabled = true;
    btnNext.disabled    = true;
    btnEnd.disabled     = true;
    btnLaunch.textContent = '▶ Lancer la 1ère question';
  }
  else if (game.status === 'question') {
    statusDot.classList.add('active');
    statusText.textContent = '🎯 Question en cours';
    statusQ.textContent    = `Q${game.currentQuestion + 1} / ${QUESTIONS.length}`;
    btnLaunch.disabled  = true;
    btnResults.disabled = false;
    btnNext.disabled    = true;
    btnEnd.disabled     = true;
  }
  else if (game.status === 'results') {
    statusDot.classList.remove('active');
    statusText.textContent = '📊 Résultats affichés';
    statusQ.textContent    = `Q${game.currentQuestion + 1} / ${QUESTIONS.length}`;
    const isLast = game.currentQuestion >= QUESTIONS.length - 1;
    btnLaunch.disabled  = true;
    btnResults.disabled = true;
    btnNext.disabled    = isLast;
    btnEnd.disabled     = !isLast;
    if (!isLast) {
      btnNext.textContent = `→ Q${game.currentQuestion + 2}`;
    }
  }
  else if (game.status === 'finished') {
    statusDot.classList.remove('active');
    statusText.textContent = '🏁 Quiz terminé';
    statusQ.textContent    = '';
    btnLaunch.disabled  = true;
    btnResults.disabled = true;
    btnNext.disabled    = true;
    btnEnd.disabled     = true;
  }
}

/* ── Actions DJ ──────────────────────────────────────────── */

// Lancer la prochaine question
document.getElementById('btn-launch').addEventListener('click', async () => {
  const nextQ = currentState
    ? (currentState.status === 'waiting' ? 0 : currentState.currentQuestion + 1)
    : 0;
  if (nextQ >= QUESTIONS.length) return;

  await db.ref('quiz/game').set({
    status:            'question',
    currentQuestion:   nextQ,
    questionStartTime: Date.now(),
  });
  showToast(`Q${nextQ + 1} lancée ✓`);
});

// Afficher les résultats de la question en cours
document.getElementById('btn-results').addEventListener('click', async () => {
  if (!currentState) return;
  await db.ref('quiz/game/status').set('results');
  showToast('Résultats affichés sur l\'écran ✓');
});

// Passer à la question suivante (depuis l'écran résultats)
document.getElementById('btn-next').addEventListener('click', async () => {
  if (!currentState) return;
  const nextQ = currentState.currentQuestion + 1;
  await db.ref('quiz/game').set({
    status:            'question',
    currentQuestion:   nextQ,
    questionStartTime: Date.now(),
  });
  showToast(`Q${nextQ + 1} lancée ✓`);
});

// Terminer le jeu
document.getElementById('btn-end').addEventListener('click', async () => {
  if (!confirm('Terminer le quiz et afficher le classement final ?')) return;
  await db.ref('quiz/game/status').set('finished');
  showToast('Quiz terminé — classement final affiché ✓');
});

// Réinitialiser tout (avant ou après le jeu)
document.getElementById('btn-reset').addEventListener('click', async () => {
  if (!confirm('Effacer toutes les réponses et scores ? (Action irréversible)')) return;
  await db.ref('quiz').set({
    game: { status: 'waiting', currentQuestion: -1, questionStartTime: 0 },
    responses: null,
    scores: null,
  });
  showToast('Jeu réinitialisé ✓');
});

/* ── Toast ───────────────────────────────────────────────── */
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}
