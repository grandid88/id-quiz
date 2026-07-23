/* ==========================================================
   I&D QUIZ — screen.js v2 (classement final par temps)
========================================================== */

function showScreen(id) {
  document.querySelectorAll('.s-screen').forEach(s => s.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

const medals = ['🥇','🥈','🥉'];

/* ── Écoute du mode de l'écran ───────────────────────── */
db.ref('quiz/screen/mode').on('value', snap => {
  const mode = snap.val() || 'waiting';
  if (mode === 'leaderboard') showLeaderboard();
  else showScreen('s-wait');
});

/* ── Affichage et mise à jour du classement ──────────── */
function showLeaderboard() {
  showScreen('s-leaderboard');
  const list = document.getElementById('se-leaderboard');

  db.ref('quiz/players').on('value', snap => {
    const data    = snap.val() || {};
    const players = Object.values(data)
      .filter(p => p.timeScore !== undefined)
      .sort((a, b) => {
        // 1er critère : plus de bonnes réponses = mieux
        if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
        // 2ème critère : temps le plus court = mieux
        return a.timeScore - b.timeScore;
      });

    list.innerHTML = '';
    players.forEach((p, i) => {
      const div = document.createElement('div');
      div.className = `rank-item ${i < 3 ? 'rank-top-' + (i+1) : ''}`;
      div.style.animationDelay = `${i * 0.08}s`;
      div.innerHTML = `
        <span class="rank-pos">${medals[i] || (i+1)}</span>
        <span class="rank-name">${escapeHtml(p.prenom)}</span>
        <span class="rank-table">${escapeHtml(p.table)}</span>
        <span class="rank-score">
          ${p.correctCount}/${QUESTIONS.length}
          <small>${p.timeScore.toFixed(1)} pts</small>
        </span>`;
      list.appendChild(div);
    });
  });
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}
