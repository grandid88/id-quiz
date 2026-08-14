/* ==========================================================
   I&D QUIZ — admin.js v2 (déclenchement classement final)
========================================================== */

if (sessionStorage.getItem("idquiz_dj") === "ok") unlockDJ();

document.getElementById("btn-pin").addEventListener("click", checkPin);
document.getElementById("pin-input").addEventListener("keyup", (e) => {
  if (e.key === "Enter") checkPin();
});

function checkPin() {
  if (document.getElementById("pin-input").value === DJ_PIN) {
    sessionStorage.setItem("idquiz_dj", "ok");
    unlockDJ();
  } else {
    document.getElementById("pin-error").classList.remove("hidden");
    document.getElementById("pin-input").value = "";
  }
}

function unlockDJ() {
  document.getElementById("pin-screen").classList.add("hidden");
  document.getElementById("dj-screen").classList.remove("hidden");
  listenPlayers();
}

/* ── Écoute des joueurs ayant terminé ─────────────────── */
function listenPlayers() {
  db.ref("quiz/players").on("value", (snap) => {
    const data = snap.val() || {};
    const players = Object.values(data)
      .filter((p) => p.status === "completed")
      .sort((a, b) => {
        if (b.correctCount !== a.correctCount) {
          return b.correctCount - a.correctCount;
        }
        return a.totalTime - b.totalTime;
      });

    // Mise à jour compteur
    document.getElementById("players-count").textContent =
      players.length === 0
        ? "0 joueur a terminé"
        : `${players.length} joueur${players.length > 1 ? "s" : ""} ${players.length > 1 ? "ont" : "a"} terminé`;

    // Mini classement dans l'admin
    const list = document.getElementById("mini-classement");
    list.innerHTML = "";
    players.slice(0, 10).forEach((p, i) => {
      const medals = ["🥇", "🥈", "🥉"];
      const div = document.createElement("div");
      div.className = "mini-rank-item";
      div.innerHTML = `
        <span class="mini-rank">${medals[i] || i + 1}</span>
        <span class="mini-name">${escapeHtml(p.firstName)} — ${escapeHtml(p.table)}</span>
        <span class="mini-score">${p.correctCount}/${QUESTIONS.length} · ${Number(p.totalTime || 0).toFixed(1)} pts</span>`;
      list.appendChild(div);
    });
  });
}

/* ── Afficher le classement sur le vidéoprojecteur ──── */
document
  .getElementById("btn-show-leaderboard")
  .addEventListener("click", async () => {
    await db.ref("quiz/screen/mode").set("leaderboard");
    showToast("Classement affiché sur le grand écran ✓");
  });

/* ── Masquer le classement (retour à l'attente) ───────── */
document
  .getElementById("btn-hide-leaderboard")
  .addEventListener("click", async () => {
    await db.ref("quiz/screen/mode").set("waiting");
    showToast("Écran remis en attente ✓");
  });

/* ── Réinitialiser tous les scores ───────────────────── */
document.getElementById("btn-reset").addEventListener("click", async () => {
  if (!confirm("Effacer tous les scores ? (Action irréversible)")) return;
  await db.ref("quiz").set({ screen: { mode: "waiting" } });
  showToast("Jeu réinitialisé ✓");
});

/* ── Déconnexion ─────────────────────────────────────── */
document.getElementById("btn-logout").addEventListener("click", () => {
  sessionStorage.removeItem("idquiz_dj");
  location.reload();
});

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str || "";
  return d.innerHTML;
}

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2500);
}
