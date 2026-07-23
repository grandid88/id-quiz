/* ==========================================================
   I&D QUIZ — app.js v2 (joueur autonome, sans DJ)
========================================================== */

const screens = {
  register: document.getElementById('screen-register'),
  game:     document.getElementById('screen-game'),
  result:   document.getElementById('screen-result'),
  end:      document.getElementById('screen-end'),
};

const tablesGrid   = document.getElementById('tables-grid');
const prenomInput  = document.getElementById('input-prenom');
const btnRegister  = document.getElementById('btn-register');
const qNumber      = document.getElementById('q-number');
const qText        = document.getElementById('q-text');
const timerText    = document.getElementById('timer-text');
const timerBar     = document.getElementById('timer-bar');
const btnVrai      = document.getElementById('btn-vrai');
const btnFaux      = document.getElementById('btn-faux');
const toast        = document.getElementById('toast');

let player         = null;
let playerKey      = null;
let currentQIndex  = 0;
let totalScore     = 0;
let timerInterval  = null;
let questionStartTime = null;
let hasAnswered    = false;

/* ── Grille des tables ───────────────────────────────── */
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

/* ── Activation bouton register ───────────────────────── */
function checkReady() {
  const tableSelected = document.querySelector('input[name="table"]:checked');
  btnRegister.disabled = !(prenomInput.value.trim().length > 0 && tableSelected);
}
prenomInput.addEventListener('input', checkReady);
document.addEventListener('change', e => { if (e.target.name === 'table') checkReady(); });

/* ── Enregistrement → démarre immédiatement ──────────── */
btnRegister.addEventListener('click', () => {
  const prenom = prenomInput.value.trim();
  const table  = document.querySelector('input[name="table"]:checked').value;
  player    = { prenom, table };
  playerKey = sanitizeKey(prenom) + '_' + sanitizeKey(table) + '_' + Date.now();
  startGame();
});

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.add('hidden'));
  screens[name].classList.remove('hidden');
}

/* ── Démarrage ───────────────────────────────────────── */
function startGame() {
  currentQIndex = 0;
  totalScore    = 0;
  showQuestion(0);
}

/* ── Affichage question ───────────────────────────────── */
function showQuestion(qIdx) {
  const q = QUESTIONS[qIdx];
  if (!q) { finishGame(); return; }

  qNumber.textContent = `Affirmation ${qIdx + 1} / ${QUESTIONS.length}`;
  qText.textContent   = q.text;

  btnVrai.classList.remove('selected', 'dimmed');
  btnFaux.classList.remove('selected', 'dimmed');
  btnVrai.disabled = false;
  btnFaux.disabled = false;

  hasAnswered       = false;
  questionStartTime = Date.now();
  showScreen('game');
  startTimer(questionStartTime);
}

/* ── Timer ───────────────────────────────────────────── */
const CIRCUMFERENCE = 2 * Math.PI * 22;

function startTimer(startTimestamp) {
  clearTimer();
  function tick() {
    const elapsed   = (Date.now() - startTimestamp) / 1000;
    const remaining = Math.max(0, TIMER_SEC - elapsed);
    timerText.textContent = Math.ceil(remaining);
    timerBar.style.strokeDashoffset = CIRCUMFERENCE * (1 - remaining / TIMER_SEC);
    if (remaining <= 10) {
      timerBar.style.stroke = 'var(--terracotta)';
      timerText.style.color = 'var(--terracotta)';
    } else {
      timerBar.style.stroke = 'var(--gold)';
      timerText.style.color = 'var(--gold)';
    }
    if (remaining <= 0) { clearTimer(); if (!hasAnswered) submitAnswer(null); }
  }
  tick();
  timerInterval = setInterval(tick, 250);
}

function clearTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

/* ── Réponse ─────────────────────────────────────────── */
btnVrai.addEventListener('click', () => submitAnswer(true));
btnFaux.addEventListener('click', () => submitAnswer(false));

function submitAnswer(answer) {
  if (hasAnswered) return;
  hasAnswered = true;
  clearTimer();

  const elapsed = (Date.now() - questionStartTime) / 1000;
  const q       = QUESTIONS[currentQIndex];
  const correct = answer !== null && answer === q.answer;
  const points  = correct ? calcPoints(elapsed) : 0;
  totalScore   += points;

  if (answer === true)  { btnVrai.classList.add('selected'); btnFaux.classList.add('dimmed'); }
  if (answer === false) { btnFaux.classList.add('selected'); btnVrai.classList.add('dimmed'); }
  btnVrai.disabled = true;
  btnFaux.disabled = true;

  saveAnswerFirebase(currentQIndex, { correct, elapsed: Math.round(elapsed*10)/10, points });
  setTimeout(() => showResultScreen(answer, correct, points, q), 350);
}

/* ── Écran résultat ───────────────────────────────────── */
function showResultScreen(answer, correct, points, q) {
  const badge = document.getElementById('result-badge');
  badge.textContent = q.answer ? '✅  VRAI' : '❌  FAUX';
  badge.className   = `result-badge ${q.answer ? 'badge-vrai' : 'badge-faux'}`;

  document.getElementById('result-icon').textContent = correct ? '🎉' : '😢';
  const labelEl = document.getElementById('result-label');
  labelEl.textContent = correct ? 'Bonne réponse !' : answer === null ? 'Temps écoulé !' : 'Mauvaise réponse…';
  labelEl.style.color = correct ? '#2E7D32' : '#C62828';

  document.getElementById('result-comment').textContent = q.comment || '';
  document.getElementById('result-points').textContent    = `+${points}`;
  document.getElementById('result-pts-label').textContent = `point${points !== 1 ? 's' : ''} gagnés`;
  document.getElementById('result-total').textContent     = `Total : ${totalScore} pts`;

  const isLast = currentQIndex >= QUESTIONS.length - 1;
  document.getElementById('btn-next-question').textContent =
    isLast ? '🏆 Voir mon score final' : 'Affirmation suivante →';

  showScreen('result');
}

/* ── Bouton suivant ───────────────────────────────────── */
document.getElementById('btn-next-question').addEventListener('click', () => {
  currentQIndex++;
  if (currentQIndex >= QUESTIONS.length) finishGame();
  else showQuestion(currentQIndex);
});

/* ── Fin du jeu ───────────────────────────────────────── */
async function finishGame() {
  try {
    await db.ref(`quiz/players/${playerKey}`).set({
      prenom:      player.prenom,
      table:       player.table,
      score:       totalScore,
      completedAt: firebase.database.ServerValue.TIMESTAMP
    });
  } catch (err) { console.error(err); }
  document.getElementById('end-score').textContent = totalScore;
  showScreen('end');
}

async function saveAnswerFirebase(qIdx, data) {
  try {
    await db.ref(`quiz/players/${playerKey}/answers/q${qIdx}`).set(data);
  } catch (err) { console.error(err); }
}

function sanitizeKey(str) {
  return str.replace(/[.#$\[\]/\s]/g, '_');
}
