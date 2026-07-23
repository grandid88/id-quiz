/* ==========================================================
   I&D QUIZ — screen.js v2 (classement final uniquement)
========================================================== */

function showScreen(id) {
  document.querySelectorAll('.s-screen').forEach(s => s.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

/* ── Écoute du mode de l'écran ───────────────────────── */
db.ref('quiz/screen/mode').on('value', snap => {
  const mode = snap.val() || 'waiting';
  if (mode === 'leaderboard') {
    loadAndShowLeaderboard();
  } else {
    showScreen('s-wait');
  }
});

/* ── Chargement et affichage du classement ───────────── */
async function loadAndShowLeaderboard() {
  const snap    = await db.ref('quiz/players').get();
  const data    = snap.val() || {};
  const players = Object.values(data)
    .filter(p => p.score !== undefined)
    .sort((a, b) => b.score - a.score);

  const list   = document.getElementById('se-leaderboard');
  list.innerHTML = '';

  const medals = ['🥇','🥈','🥉'];

  players.forEach((p, i) => {
    const div = document.createElement('div');
    div.className = `rank-item ${i < 3 ? 'rank-top-' + (i+1) : ''}`;
    div.style.animationDelay = `${i * 0.08}s`;
    div.innerHTML = `
      <span class="rank-pos">${medals[i] || (i+1)}</span>
      <span class="rank-name">${escapeHtml(p.prenom)}</span>
      <span class="rank-table">${escapeHtml(p.table)}</span>
      <span class="rank-score">${p.score} <small>pts</small></span>`;
    list.appendChild(div);
  });

  showScreen('s-leaderboard');

  // Écoute en temps réel pour mises à jour
  db.ref('quiz/players').on('value', snap2 => {
    const data2   = snap2.val() || {};
    const players2 = Object.values(data2)
      .filter(p => p.score !== undefined)
      .sort((a, b) => b.score - a.score);
    list.innerHTML = '';
    players2.forEach((p, i) => {
      const div = document.createElement('div');
      div.className = `rank-item ${i < 3 ? 'rank-top-' + (i+1) : ''}`;
      div.style.animationDelay = `${i * 0.08}s`;
      div.innerHTML = `
        <span class="rank-pos">${medals[i] || (i+1)}</span>
        <span class="rank-name">${escapeHtml(p.prenom)}</span>
        <span class="rank-table">${escapeHtml(p.table)}</span>
        <span class="rank-score">${p.score} <small>pts</small></span>`;
      list.appendChild(div);
    });
  });
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}
