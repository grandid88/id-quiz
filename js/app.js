/* ==========================================================
   I&D QUIZ — app.js (interface invité)
========================================================== */

/* ── Éléments DOM ─────────────────────────────────────────── */
const screens = {
  register: document.getElementById('screen-register'),
  wait:     document.getElementById('screen-wait'),
  game:     document.getElementById('screen-game'),
  result:   document.getElementById('screen-result'),
  end:      document.getElementById('screen-end'),
};

const tablesGrid   = document.getElementById('tables-grid');
const prenomInput  = document.getElementById('input-prenom');
const btnRegister  = document.getElementById('btn-register');
const waitPlayerInfo = document.getElementById('wait-player-info');
const qNumber      = document.getElementById('q-number');
const qText        = document.getElementById('q-text');
const timerText    = document.getElementById('timer-text');
const timerBar     = document.getElementById('timer-bar');
const btnVrai      = document.getElementById('btn-vrai');
const btnFaux      = document.getElementById('btn-faux');
const answeredMsg  = document.getElementById('answered-msg');
const toast        = document.getElementById('toast');

/* ── État local ───────────────────────────────────────────── */
let player = null;       // { prenom, table }
let timerInterval = null;
let questionStartTime = null;
let hasAnswered = false;
let currentQIndex = -1;

/* ── Construction de la grille des tables ─────────────────── */
TABLES.forEach(t => {
  const div = document.createElement('div');
  div.className = 'table-option';
  div.innerHTML = `
    <input type="radio" name="table" id="t-${t.id}" value="${t.id}">
    <label for="t-${t.id}">
      <span class="t-emoji">${t.emoji}</span>
      <span>${t.id}</span>
    </label>`;
  tablesGrid.appendChild(div);
});

/* ── Activation du bouton register ───────────────────────── */
function checkReady() {
  const tableSelected = document.querySelector('input[name="table"]:checked');
  btnRegister.disabled = !(prenomInput.value.trim().length > 0 && tableSelected);
}
prenomInput.addEventListener('input', checkReady);
document.addEventListener('change', e => { if (e.target.name === 'table') checkReady(); });

/* ── Enregistrement ───────────────────────────────────────── */
btnRegister.addEventListener('click', () => {
  const prenom = prenomInput.value.trim();
  const table  = document.querySelector('input[name="table"]:checked').value;
  player = { prenom, table };
  sessionStorage.setItem('idquiz_player', JSON.stringify(player));
  showScreen('wait');
  waitPlayerInfo.textContent = `${prenom} · Table ${table}`;
  listenGame();
});

/* Restaurer session si rechargement page */
const saved = sessionStorage.getItem('idquiz_player');
if (saved) {
  player = JSON.parse(saved);
  showScreen('wait');
  waitPlayerInfo.textContent = `${player.prenom} · Table ${player.table}`;
  listenGame();
}

/* ── Navigation entre écrans ─────────────────────────────── */
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.add('hidden'));
  screens[name].classList.remove('hidden');
}

/* ── Écoute Firebase — état du jeu ──────────────────────── */
function listenGame() {
  db.ref('quiz/game').on('value', snap => {
    const game = snap.val();
    if (!game) return;

    if (game.status === 'waiting') {
      showScreen('wait');
      clearTimer();
    }
    else if (game.status === 'question') {
      const qIdx = game.currentQuestion;
      if (qIdx !== currentQIndex) {
        currentQIndex = qIdx;
        hasAnswered = false;
        questionStartTime = Date.now(); // ✅ horloge locale du téléphone
        showQuestion(qIdx, questionStartTime);
      }
    }
    else if (game.status === 'results') {
      clearTimer();
      showQuestionResult(game.currentQuestion);
    }
    else if (game.status === 'finished') {
      clearTimer();
      showScreen('end');
    }
  });
}

/* ── Affichage d'une question ────────────────────────────── */
function showQuestion(qIdx, startTime) {
  const q = QUESTIONS[qIdx];
  if (!q) return;

  qNumber.textContent = `Question ${qIdx + 1} / ${QUESTIONS.length}`;
  qText.textContent = q.text;

  btnVrai.classList.remove('selected', 'dimmed');
  btnFaux.classList.remove('selected', 'dimmed');
  btnVrai.disabled = false;
  btnFaux.disabled = false;
  answeredMsg.classList.add('hidden');

  showScreen('game');
  startTimer(startTime);
}

/* ── Timer ───────────────────────────────────────────────── */
const CIRCUMFERENCE = 2 * Math.PI * 22; // r=22

function startTimer(startTimestamp) {
  clearTimer();
  function tick() {
    const elapsed = (Date.now() - startTimestamp) / 1000;
    const remaining = Math.max(0, TIMER_SEC - elapsed);
    timerText.textContent = Math.ceil(remaining);

    const progress = remaining / TIMER_SEC;
    timerBar.style.strokeDashoffset = CIRCUMFERENCE * (1 - progress);

    // Couleur d'alerte sur les 10 dernières secondes
    if (remaining <= 10) {
      timerBar.style.stroke = 'var(--terracotta)';
      timerText.style.color = 'var(--terracotta)';
    } else {
      timerBar.style.stroke = 'var(--gold)';
      timerText.style.color = 'var(--gold)';
    }

    if (remaining <= 0) {
      clearTimer();
      if (!hasAnswered) {
        btnVrai.disabled = true;
        btnFaux.disabled = true;
        answeredMsg.textContent = "Temps écoulé !";
        answeredMsg.classList.remove('hidden');
      }
    }
  }
  tick();
  timerInterval = setInterval(tick, 250);
}

function clearTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

/* ── Réponse invité ──────────────────────────────────────── */
btnVrai.addEventListener('click', () => submitAnswer(true));
btnFaux.addEventListener('click', () => submitAnswer(false));

async function submitAnswer(answer) {
  if (hasAnswered) return;
  hasAnswered = true;

  const elapsed = (Date.now() - questionStartTime) / 1000;

  btnVrai.classList.toggle('selected', answer === true);
  btnFaux.classList.toggle('selected', answer === false);
  btnVrai.classList.toggle('dimmed', answer !== true);
  btnFaux.classList.toggle('dimmed', answer !== false);
  btnVrai.disabled = true;
  btnFaux.disabled = true;
  answeredMsg.classList.remove('hidden');
  answeredMsg.textContent = "Réponse enregistrée — en attente des résultats…";

  // Enregistrer la réponse dans Firebase
  const points = QUESTIONS[currentQIndex].answer === answer ? calcPoints(elapsed) : 0;
  const refPath = `quiz/responses/q${currentQIndex}/${sanitizeKey(player.table)}/${sanitizeKey(player.prenom + '_' + Date.now())}`;

  try {
    await db.ref(refPath).set({
      prenom:   player.prenom,
      table:    player.table,
      answer:   answer,
      correct:  QUESTIONS[currentQIndex].answer === answer,
      points:   points,
      elapsed:  Math.round(elapsed * 10) / 10,
      timestamp: firebase.database.ServerValue.TIMESTAMP
    });

    // Ajouter les points au score de la table
    if (points > 0) {
      await db.ref(`quiz/scores/${sanitizeKey(player.table)}`).transaction(cur => (cur || 0) + points);
    }
  } catch (err) {
    console.error(err);
  }
}

/* ── Résultat après question ─────────────────────────────── */
async function showQuestionResult(qIdx) {
  const q = QUESTIONS[qIdx];
  const myAnswer = hasAnswered
    ? (btnVrai.classList.contains('selected') ? true
      : btnFaux.classList.contains('selected') ? false : null)
    : null;

  const correct = myAnswer !== null && myAnswer === q.answer;
  const elapsed = questionStartTime
    ? (Date.now() - questionStartTime) / 1000
    : TIMER_SEC + 1;
  const pts = correct ? calcPoints(elapsed) : 0;

  document.getElementById('result-icon').textContent   = correct ? '🎉' : '😢';
  document.getElementById('result-label').textContent  = correct ? 'Bonne réponse !' : 'Mauvaise réponse…';
  document.getElementById('result-label').style.color  = correct ? 'var(--vrai-light)' : 'var(--faux-light)';
  document.getElementById('result-points').textContent = `+${pts}`;
  document.getElementById('result-pts-label').textContent = `point${pts !== 1 ? 's' : ''} gagnés`;

  // Score total de la table
  const scoreSnap = await db.ref(`quiz/scores/${sanitizeKey(player.table)}`).get();
  const tableScore = scoreSnap.val() || 0;
  document.getElementById('result-table-score').textContent =
    `Table ${player.table} : ${tableScore} pts au total`;

  showScreen('result');
}

/* ── Utilitaire ───────────────────────────────────────────── */
function sanitizeKey(str) {
  return str.replace(/[.#$\[\]/]/g, '_');
}

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}
