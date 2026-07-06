/* ==========================================================
   I&D QUIZ — screen.js (vidéoprojecteur)
========================================================== */

const SCREENS = {
  wait:     document.getElementById('s-wait'),
  question: document.getElementById('s-question'),
  results:  document.getElementById('s-results'),
  end:      document.getElementById('s-end'),
};

function showScreen(name) {
  Object.values(SCREENS).forEach(s => s.classList.add('hidden'));
  SCREENS[name].classList.remove('hidden');
}

let timerInterval = null;
let responsesListener = null;

/* ── Écoute Firebase ─────────────────────────────────────── */
db.ref('quiz/game').on('value', snap => {
  const game = snap.val();
  if (!game) return;

  if (game.status === 'waiting') {
    clearTimer();
    if (responsesListener) { responsesListener.off(); responsesListener = null; }
    showScreen('wait');
  }
  else if (game.status === 'question') {
    showQuestion(game.currentQuestion, game.questionStartTime);
  }
  else if (game.status === 'results') {
    clearTimer();
    showResults(game.currentQuestion);
  }
  else if (game.status === 'finished') {
    clearTimer();
    showEnd();
  }
});

/* ── Question ────────────────────────────────────────────── */
function showQuestion(qIdx, startTime) {
  const q = QUESTIONS[qIdx];
  if (!q) return;

  document.getElementById('sq-number').textContent = `Question ${qIdx + 1} / ${QUESTIONS.length}`;
  document.getElementById('sq-text').textContent   = q.text;
  document.getElementById('sq-participants').textContent = '0 réponse(s)';

  showScreen('question');
  startScreenTimer(startTime);

  // Compter les réponses en temps réel
  if (responsesListener) responsesListener.off();
  responsesListener = db.ref(`quiz/responses/q${qIdx}`);
  responsesListener.on('value', snap => {
    let count = 0;
    if (snap.val()) {
      Object.values(snap.val()).forEach(tableResponses => {
        count += Object.keys(tableResponses).length;
      });
    }
    document.getElementById('sq-participants').textContent =
      `${count} réponse${count > 1 ? 's' : ''} reçue${count > 1 ? 's' : ''}`;
  });
}

/* ── Timer barre ─────────────────────────────────────────── */
function startScreenTimer(startTimestamp) {
  clearTimer();
  const bar    = document.getElementById('sq-timer-bar');
  const numEl  = document.getElementById('sq-timer-num');

  function tick() {
    const elapsed   = (Date.now() - startTimestamp) / 1000;
    const remaining = Math.max(0, TIMER_SEC - elapsed);
    const pct       = (remaining / TIMER_SEC) * 100;

    bar.style.width      = `${pct}%`;
    numEl.textContent    = Math.ceil(remaining);

    if (remaining <= 10) {
      bar.style.background = 'linear-gradient(90deg, var(--faux), var(--coral))';
      numEl.style.color    = 'var(--coral)';
    } else {
      bar.style.background = 'linear-gradient(90deg, var(--gold), var(--coral))';
      numEl.style.color    = 'var(--gold)';
    }
    if (remaining <= 0) clearTimer();
  }
  tick();
  timerInterval = setInterval(tick, 250);
}

function clearTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

/* ── Résultats ───────────────────────────────────────────── */
async function showResults(qIdx) {
  const q = QUESTIONS[qIdx];

  // Badge réponse correcte
  const badge = document.getElementById('sr-answer-badge');
  badge.textContent = q.answer ? '✅  VRAI' : '❌  FAUX';
  badge.className   = `answer-revealed ${q.answer ? 'vrai' : 'faux'}`;
  document.getElementById('sr-q-text').textContent = q.text;

  // Lire toutes les réponses
  const snap = await db.ref(`quiz/responses/q${qIdx}`).get();
  const data = snap.val() || {};

  let vraiCount = 0, fauxCount = 0;
  const tableStats = {}; // { tableId: { totalTime, correctCount, totalPoints } }

  Object.entries(data).forEach(([tableKey, tableData]) => {
    Object.values(tableData).forEach(r => {
      if (r.answer === true)  vraiCount++;
      if (r.answer === false) fauxCount++;

      if (!tableStats[r.table]) tableStats[r.table] = { totalElapsed: 0, correctCount: 0, totalPoints: 0 };
      if (r.correct) {
        tableStats[r.table].totalElapsed  += r.elapsed || TIMER_SEC;
        tableStats[r.table].correctCount  += 1;
        tableStats[r.table].totalPoints   += r.points || 0;
      }
    });
  });

  // Barres de stats
  const total = vraiCount + fauxCount || 1;
  document.getElementById('sr-vrai-count').textContent = `${vraiCount} invité${vraiCount > 1 ? 's' : ''}`;
  document.getElementById('sr-faux-count').textContent = `${fauxCount} invité${fauxCount > 1 ? 's' : ''}`;
  document.getElementById('sr-vrai-bar').style.width   = `${(vraiCount / total) * 100}%`;
  document.getElementById('sr-faux-bar').style.width   = `${(fauxCount / total) * 100}%`;

  // Top 3 tables les plus rapides (parmi celles ayant des bonnes réponses)
  const ranked = Object.entries(tableStats)
    .filter(([, s]) => s.correctCount > 0)
    .map(([table, s]) => ({ table, avgTime: s.totalElapsed / s.correctCount, pts: s.totalPoints }))
    .sort((a, b) => a.avgTime - b.avgTime)
    .slice(0, 3);

  const medals = ['🥇', '🥈', '🥉'];
  const podiumEl = document.getElementById('sr-podium');
  podiumEl.innerHTML = '';
  if (ranked.length === 0) {
    podiumEl.innerHTML = '<p style="color:rgba(255,248,240,0.4);font-size:16px">Aucune bonne réponse cette fois !</p>';
  } else {
    ranked.forEach((item, i) => {
      const div = document.createElement('div');
      div.className = `podium-item rank-${i + 1}`;
      div.style.animationDelay = `${i * 0.15}s`;
      div.innerHTML = `
        <span class="podium-rank">${medals[i]}</span>
        <span class="podium-table">Table ${item.table}</span>
        <span class="podium-time">${item.avgTime.toFixed(1)}s</span>
        <span class="podium-pts">+${item.pts} pts</span>
      `;
      podiumEl.appendChild(div);
    });
  }

  // Classement général
  const scoresSnap = await db.ref('quiz/scores').get();
  const scores = scoresSnap.val() || {};
  const classement = Object.entries(scores)
    .map(([table, pts]) => ({ table, pts }))
    .sort((a, b) => b.pts - a.pts);

  const classEl = document.getElementById('sr-classement');
  classEl.innerHTML = '';
  classement.slice(0, 9).forEach((item, i) => {
    const div = document.createElement('div');
    div.className = 'classement-item';
    div.innerHTML = `
      <span class="class-rank">${i + 1}</span>
      <span class="class-table">${item.table}</span>
      <span class="class-pts">${item.pts} pts</span>
    `;
    classEl.appendChild(div);
  });

  showScreen('results');
}

/* ── Fin du jeu ──────────────────────────────────────────── */
async function showEnd() {
  const scoresSnap = await db.ref('quiz/scores').get();
  const scores     = scoresSnap.val() || {};
  const ranked     = Object.entries(scores)
    .map(([table, pts]) => ({ table, pts }))
    .sort((a, b) => b.pts - a.pts)
    .slice(0, 3);

  const medals = [
    { icon: '🥇', cls: 'p1' },
    { icon: '🥈', cls: 'p2' },
    { icon: '🥉', cls: 'p3' },
  ];
  const podEl = document.getElementById('se-podium');
  podEl.innerHTML = '';
  ranked.forEach((item, i) => {
    const div = document.createElement('div');
    div.className = `end-podium-item ${medals[i].cls}`;
    div.innerHTML = `
      <span class="end-podium-medal">${medals[i].icon}</span>
      <span class="end-podium-name">Table ${item.table}</span>
      <span class="end-podium-pts">${item.pts} <span>pts</span></span>
    `;
    podEl.appendChild(div);
  });

  showScreen('end');
}
