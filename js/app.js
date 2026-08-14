/* ==========================================================
   I&D QUIZ — app.js v3C
   Le téléphone affiche et transmet. Le serveur valide la réponse,
   le temps, le score et l'état de la partie.
========================================================== */
const screens = {
  register: document.getElementById("screen-register"),
  game: document.getElementById("screen-game"),
  result: document.getElementById("screen-result"),
  end: document.getElementById("screen-end"),
};
const tablesGrid = document.getElementById("tables-grid");
const prenomInput = document.getElementById("input-prenom");
const nomInitialInput = document.getElementById("input-nom");
const btnRegister = document.getElementById("btn-register");
const registerStatus = document.getElementById("register-status");
const qNumber = document.getElementById("q-number");
const qText = document.getElementById("q-text");
const timerText = document.getElementById("timer-text");
const timerBar = document.getElementById("timer-bar");
const btnVrai = document.getElementById("btn-vrai");
const btnFaux = document.getElementById("btn-faux");
const CIRCUMFERENCE = 2 * Math.PI * 22;
let player = null,
  currentQIndex = 0,
  timerInterval = null,
  questionStartTime = null,
  hasAnswered = false,
  questionToken = 0;
let authReady = false;
const functionsApi = firebase.functions();
const startQuestionFn = functionsApi.httpsCallable("startQuestion");
const submitAnswerFn = functionsApi.httpsCallable("submitAnswer");

TABLES.forEach((t) => {
  const div = document.createElement("div");
  div.className = "table-option";
  div.innerHTML = `<input type="radio" name="table" id="t-${t.id}" value="${t.id}"><label for="t-${t.id}"><span class="t-emoji">${t.emoji}</span><span>${t.id}</span></label>`;
  tablesGrid.appendChild(div);
});
function checkReady() {
  const selected = document.querySelector('input[name="table"]:checked');
  const firstOk = prenomInput.value.trim().length > 0;
  const initialOk = /^[A-Za-zÀ-ÖØ-öø-ÿ]$/.test(nomInitialInput.value.trim());
  btnRegister.disabled = !(authReady && firstOk && initialOk && selected);
}
prenomInput.addEventListener("input", checkReady);
nomInitialInput.addEventListener("input", () => {
  nomInitialInput.value = nomInitialInput.value
    .replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, "")
    .slice(0, 1)
    .toUpperCase();
  checkReady();
});
document.addEventListener("change", (e) => {
  if (e.target.name === "table") checkReady();
});

btnRegister.addEventListener("click", async () => {
  if (!authReady) return;
  const selected = document.querySelector('input[name="table"]:checked');
  if (!selected) return;
  btnRegister.disabled = true;
  registerStatus.textContent = "Vérification de votre participation…";
  try {
    const existing = await getPlayerState();
    if (existing?.status === "completed") {
      registerStatus.textContent =
        "🔒 Cette partie a déjà été jouée sur ce téléphone.";
      return;
    }
    player = await preparePlayerIdentity({
      firstName: prenomInput.value.trim(),
      lastNameInitial: nomInitialInput.value.trim().toUpperCase(),
      table: selected.value,
    });
    if (player.status === "completed") {
      registerStatus.textContent =
        "🔒 Cette partie a déjà été jouée sur ce téléphone.";
      return;
    }
    if (player.status !== "in_progress") player = await startPlayerGame();
    startGame();
  } catch (err) {
    console.error(err);
    registerStatus.textContent =
      "Impossible de démarrer la partie. Vérifiez votre connexion et réessayez.";
    btnRegister.disabled = false;
  }
});
function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.add("hidden"));
  screens[name].classList.remove("hidden");
}
function startGame() {
  currentQIndex = Math.max(0, Number(player?.currentQuestion || 1) - 1);
  showQuestion(currentQIndex);
}

async function showQuestion(qIdx) {
  const q = QUESTIONS[qIdx];
  if (!q) return finishGame();
  questionToken++;
  const token = questionToken;
  clearTimer();
  hasAnswered = false;

  btnVrai.classList.remove("selected", "dimmed");
  btnFaux.classList.remove("selected", "dimmed");

  btnVrai.disabled = true;
  btnFaux.disabled = true;

  qNumber.textContent = `Affirmation ${qIdx + 1} / ${QUESTIONS.length}`;
  qText.textContent = q.text;
  showScreen("game");
  timerText.textContent = TIMER_SEC.toFixed(1);
  timerBar.style.strokeDashoffset = 0;
  timerBar.style.stroke = "var(--gold)";
  timerText.style.color = "#fffdf5";
  try {
    const result = await startQuestionFn({ question: qIdx + 1 });
    if (token !== questionToken) return;
    questionStartTime = Number(result.data.startedAt);
    btnVrai.disabled = false;
    btnFaux.disabled = false;
    startTimer(result.data.startedAt);
  } catch (err) {
    console.error(err);
    registerStatus.textContent =
      "Impossible de lancer cette affirmation. Rechargez la page.";
  }
}
function startTimer(startTimestamp) {
  clearTimer();
  const tick = () => {
    const elapsed = (Date.now() - startTimestamp) / 1000;
    const remaining = Math.max(0, TIMER_SEC - elapsed);
    timerText.textContent = remaining.toFixed(1);
    timerBar.style.strokeDashoffset =
      CIRCUMFERENCE * (1 - remaining / TIMER_SEC);
    const urgent = remaining <= 5;
    timerBar.style.stroke = urgent ? "var(--terracotta)" : "var(--gold)";
    timerText.style.color = "#fffdf5";
    if (remaining <= 0) {
      clearTimer();
      if (!hasAnswered) submitAnswer(null);
    }
  };
  tick();
  timerInterval = setInterval(tick, 50);
}
function clearTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}
btnVrai.addEventListener("click", () => submitAnswer(true));
btnFaux.addEventListener("click", () => submitAnswer(false));

async function submitAnswer(answer) {
  if (hasAnswered) return;
  hasAnswered = true;
  clearTimer();
  btnVrai.disabled = true;
  btnFaux.disabled = true;
  if (answer === true) {
    btnVrai.classList.add("selected");
    btnFaux.classList.add("dimmed");
  }
  if (answer === false) {
    btnFaux.classList.add("selected");
    btnVrai.classList.add("dimmed");
  }
  try {
    const result = await submitAnswerFn({
      question: currentQIndex + 1,
      answer,
    });
    const d = result.data;
    player = {
      ...player,
      currentQuestion: d.completed ? QUESTIONS.length : currentQIndex + 2,
      correctCount: d.correctCount,
      totalTime: d.totalTime,
      status: d.completed ? "completed" : "in_progress",
    };
    showResultScreen(d);
  } catch (err) {
    console.error(err);
    hasAnswered = false;
    btnVrai.disabled = false;
    btnFaux.disabled = false;
    alert(
      "Votre réponse n’a pas pu être enregistrée. Vérifiez votre connexion puis réessayez.",
    );
  }
}
function showResultScreen(d) {
  const badge = document.getElementById("result-badge");
  badge.textContent = d.correctAnswer ? "VRAIE" : "FAUSSE";
  badge.className = `result-badge ${
    d.correctAnswer ? "badge-vrai" : "badge-faux"
  }`;
  const resultIcon = document.getElementById("result-icon");

  resultIcon.className = `result-icon ${
    d.correct ? "icon-correct" : d.timedOut ? "icon-timeout" : "icon-wrong"
  }`;

  resultIcon.textContent = "";
  const label = document.getElementById("result-label");
  label.textContent = d.correct
    ? "Bonne réponse !"
    : d.timedOut
      ? "Temps écoulé !"
      : "Mauvaise réponse…";
  label.style.color = d.correct
    ? "#2E7D32"
    : d.timedOut
      ? "#B27A18"
      : "#C62828";
  document.getElementById("result-comment").textContent = d.comment || "";
  document.getElementById("result-points").textContent = d.correct
    ? d.responseTime.toFixed(2)
    : "0";
  document.getElementById("result-pts-label").textContent = d.correct
    ? "points pour cette affirmation"
    : "0 point comptabilisé";
  document.getElementById("result-total").innerHTML =
    `<span class="total-main">Total : ${d.totalTime.toFixed(2)} pts</span>
   <span class="total-correct">${d.correctCount} / ${QUESTIONS.length} correctes</span>`;
  const nextButton = document.getElementById("btn-next-question");
  nextButton.classList.toggle("final-score-button", d.completed);
  nextButton.innerHTML = d.completed
    ? `<span class="final-trophy final-trophy-left" aria-hidden="true"></span>
     <span class="final-score-text">Voir mon score final</span>
     <span class="final-trophy final-trophy-right" aria-hidden="true"></span>`
    : `<span>Affirmation suivante</span>
     <span class="next-arrow" aria-hidden="true"></span>`;
  showScreen("result");
}
document.getElementById("btn-next-question").addEventListener("click", () => {
  if (currentQIndex >= QUESTIONS.length - 1) finishGame();
  else showQuestion(++currentQIndex);
});
async function finishGame() {
  clearTimer();
  const latest = await getPlayerState();
  player = latest || player;
  document.getElementById("end-score").textContent = `${Number(
    player.totalTime || 0,
  )
    .toFixed(2)
    .replace(".", ",")} pts`;

  document.querySelector("#screen-end .end-score-label").textContent =
    `${Number(player.correctCount || 0)} bonne${Number(player.correctCount || 0) > 1 ? "s" : ""} réponse${Number(player.correctCount || 0) > 1 ? "s" : ""} sur ${QUESTIONS.length}`;
  showScreen("end");
}

(async function initRegistration() {
  try {
    await initPlayerAuth();
    authReady = true;
    checkReady();
    const existing = await loadCurrentPlayer();
    if (existing?.status === "completed") {
      registerStatus.textContent =
        "🔒 Ce téléphone a déjà servi pour I&D QUIZ.";
      prenomInput.disabled = true;
      nomInitialInput.disabled = true;
      document
        .querySelectorAll('input[name="table"]')
        .forEach((el) => (el.disabled = true));
      btnRegister.disabled = true;
    } else if (existing?.status === "in_progress")
      registerStatus.textContent =
        "Une partie est déjà en cours sur ce téléphone. Saisissez vos informations pour la reprendre.";
  } catch (err) {
    console.error(err);
    registerStatus.textContent = "Connexion au jeu impossible pour le moment.";
    btnRegister.disabled = true;
  }
})();
