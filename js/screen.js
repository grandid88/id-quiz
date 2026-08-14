/* ==========================================================
   I&D QUIZ — screen.js v3
   Classement final par bonnes réponses puis temps
   ========================================================== */

function showScreen(id) {
  document
    .querySelectorAll(".s-screen")
    .forEach((s) => s.classList.add("hidden"));

  const screen = document.getElementById(id);
  if (screen) screen.classList.remove("hidden");
}

const medals = ["🥇", "🥈", "🥉"];

let playersListenerAttached = false;

/* ── Écoute du mode de l'écran ─────────────────────────── */

db.ref("quiz/screen/mode").on("value", (snap) => {
  const mode = snap.val() || "waiting";

  if (mode === "leaderboard") {
    showLeaderboard();
  } else {
    showScreen("s-wait");
  }
});

/* ── Affichage et mise à jour du classement ────────────── */

function showLeaderboard() {
  showScreen("s-leaderboard");

  const list = document.getElementById("se-leaderboard");

  if (!list) {
    console.error("Élément #se-leaderboard introuvable dans screen.html");
    return;
  }

  if (playersListenerAttached) return;
  playersListenerAttached = true;

  db.ref("quiz/players").on("value", (snap) => {
    const data = snap.val() || {};

    const players = Object.values(data)
      .filter((p) => p.status === "completed")
      .sort((a, b) => {
        // 1er critère : plus de bonnes réponses = mieux
        if (b.correctCount !== a.correctCount) {
          return b.correctCount - a.correctCount;
        }

        // 2ème critère : temps total le plus court = mieux
        return Number(a.totalTime || 0) - Number(b.totalTime || 0);
      });

    list.innerHTML = "";

    players.forEach((p, i) => {
      const div = document.createElement("div");

      div.className = `rank-item ${i < 3 ? "rank-top-" + (i + 1) : ""}`;

      div.style.animationDelay = `${i * 0.08}s`;

      div.innerHTML = `
        <span class="rank-pos">
          ${medals[i] || i + 1}
        </span>

        <span class="rank-name">
          ${escapeHtml(p.firstName)}
        </span>

        <span class="rank-table">
          ${escapeHtml(p.table)}
        </span>

        <span class="rank-score">
          ${Number(p.correctCount || 0)}/${QUESTIONS.length}
          <small>
            ${Number(p.totalTime || 0).toFixed(1)} pts
          </small>
        </span>
      `;

      list.appendChild(div);
    });
  });
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str || "";
  return d.innerHTML;
}
