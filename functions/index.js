const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");
initializeApp();
const db = getDatabase();
const TIMER_SEC = 15;
const QUESTIONS = [
  { answer: true, comment: "Dans sa jeunesse !" },
  {
    answer: true,
    comment:
      "En 1989, en tant qu'arbitre officiel dans un tournoi de handball interarmées à Bourges",
  },
  { answer: true, comment: "En tant qu'entraîneur de handball — 1988-1990 !" },
  {
    answer: false,
    comment:
      "Ils ont tous les deux travaillé dans la grande distribution, mais pas dans la même enseigne !",
  },
  {
    answer: true,
    comment: "Pour la création de son auto-entreprise : Isa Perm' Makup !",
  },
  {
    answer: true,
    comment:
      "En 2020, ils ont trouvé par hasard près de chez eux des objets appartenant à une personne recherchée !",
  },
  { answer: false, comment: "Non, c'est son frère Jean-Luc !" },
  { answer: false, comment: "Ce sont ses filles Amélie et Lucie !" },
  { answer: true, comment: "Martinique 2022 !" },
  { answer: true, comment: "Martinique 2022 !" },
  {
    answer: true,
    comment: "Lors d'un trajet pour un mariage (Loïc & Lucie) en 2018 !",
  },
  { answer: false, comment: "C'est même son fruit exotique le plus détesté !" },
  { answer: false, comment: "Jamais ! Et Didier non plus !" },
  { answer: true, comment: "De 1987 à 1988, pendant son service militaire." },
  { answer: false, comment: "Isabelle seulement !" },
];
const ALLOWED_TABLES = [
  "Maurice",
  "Tahiti",
  "Martinique",
  "Guadeloupe",
  "Seychelles",
  "La Réunion",
  "Nouvelle-Calédonie",
  "Sainte-Lucie",
  "Mayotte",
];

function requireAuth(request) {
  if (!request.auth || !request.auth.uid)
    throw new HttpsError("unauthenticated", "Authentification requise.");
  return request.auth.uid;
}
function playerRef(uid) {
  return db.ref(`quiz/players/${uid}`);
}
function deviceLockRef(deviceId) {
  return db.ref(`quiz/deviceLocks/${deviceId}`);
}
function cleanDeviceId(value) {
  const deviceId = String(value || "").trim();
  if (!/^[a-f0-9-]{16,80}$/i.test(deviceId))
    throw new HttpsError("invalid-argument", "Identifiant téléphone invalide.");
  return deviceId;
}
function cleanIdentity(data) {
  const firstName = String(data?.firstName || "").trim();
  const lastNameInitial = String(data?.lastNameInitial || "")
    .trim()
    .toUpperCase();
  const table = String(data?.table || "").trim();
  if (!firstName || firstName.length > 40)
    throw new HttpsError("invalid-argument", "Prénom invalide.");
  if (!/^[A-ZÀ-ÖØ-Ý]$/.test(lastNameInitial))
    throw new HttpsError("invalid-argument", "Initiale invalide.");
  if (!ALLOWED_TABLES.includes(table))
    throw new HttpsError("invalid-argument", "Table invalide.");
  return { firstName, lastNameInitial, table };
}

exports.preparePlayer = onCall({ cors: true }, async (request) => {
  const uid = requireAuth(request);
  const identity = cleanIdentity(request.data);
  const deviceId = cleanDeviceId(request.data?.deviceId);
  const ref = playerRef(uid);
  const snap = await ref.get();

  if (snap.exists()) {
    const player = snap.val();
    if (player.deviceId && player.deviceId !== deviceId) {
      throw new HttpsError(
        "failed-precondition",
        "Cette partie appartient déjà à un autre appareil.",
      );
    }
    return { uid, ...player, existing: true };
  }

  const lockRef = deviceLockRef(deviceId);
  const lockResult = await lockRef.transaction((current) => {
    if (current === null)
      return { uid, createdAt: Date.now(), status: "reserved" };
    if (current.uid === uid) return current;
    return;
  });
  if (!lockResult.committed) {
    throw new HttpsError(
      "already-exists",
      "Ce téléphone a déjà été utilisé pour I&D QUIZ.",
    );
  }

  const playerData = {
    ...identity,
    deviceId,
    status: "not_started",
    currentQuestion: 1,
    correctCount: 0,
    totalTime: 0,
    startedAt: null,
    completedAt: null,
    answers: {},
  };
  try {
    await ref.set(playerData);
    await lockRef.update({ status: "active", playerUid: uid });
  } catch (err) {
    await lockRef.remove().catch(() => {});
    throw err;
  }
  return { uid, ...playerData, existing: false };
});

exports.startPlayerGame = onCall({ cors: true }, async (request) => {
  const uid = requireAuth(request);
  const deviceId = cleanDeviceId(request.data?.deviceId);
  const ref = playerRef(uid);
  const snap = await ref.get();
  if (!snap.exists())
    throw new HttpsError("failed-precondition", "Fiche joueur introuvable.");
  const player = snap.val();
  if (player.deviceId !== deviceId)
    throw new HttpsError(
      "failed-precondition",
      "Appareil non autorisé pour cette partie.",
    );
  if (player.status === "completed")
    throw new HttpsError(
      "failed-precondition",
      "Cette partie est déjà terminée.",
    );
  if (player.status === "in_progress") return { uid, ...player };
  const now = Date.now();
  await ref.update({
    status: "in_progress",
    currentQuestion: 1,
    startedAt: now,
  });
  return {
    uid,
    ...player,
    status: "in_progress",
    currentQuestion: 1,
    startedAt: now,
  };
});

exports.startQuestion = onCall({ cors: true }, async (request) => {
  const uid = requireAuth(request);
  const playerSnap = await playerRef(uid).get();
  if (!playerSnap.exists())
    throw new HttpsError("failed-precondition", "Joueur introuvable.");
  const player = playerSnap.val();
  if (player.status !== "in_progress")
    throw new HttpsError("failed-precondition", "Partie non active.");
  const question = Number(request.data?.question);
  const expected = Number(player.currentQuestion || 1);
  if (
    !Number.isInteger(question) ||
    question !== expected ||
    question < 1 ||
    question > QUESTIONS.length
  )
    throw new HttpsError(
      "invalid-argument",
      "Question invalide ou inattendue.",
    );
  const now = Date.now();
  const answers = player.answers || {};
  const key = `q${question}`;
  if (answers[key])
    throw new HttpsError("already-exists", "Question déjà traitée.");
  await playerRef(uid).update({ questionStartedAt: now });
  return { question, startedAt: now, deadline: now + TIMER_SEC * 1000 };
});

exports.submitAnswer = onCall({ cors: true }, async (request) => {
  const uid = requireAuth(request);
  const playerSnap = await playerRef(uid).get();
  if (!playerSnap.exists())
    throw new HttpsError("failed-precondition", "Joueur introuvable.");
  const player = playerSnap.val();
  if (player.status !== "in_progress")
    throw new HttpsError("failed-precondition", "Partie non active.");
  const question = Number(request.data?.question);
  const answer = request.data?.answer;
  const expected = Number(player.currentQuestion || 1);
  if (
    !Number.isInteger(question) ||
    question !== expected ||
    question < 1 ||
    question > QUESTIONS.length
  )
    throw new HttpsError(
      "invalid-argument",
      "Question invalide ou inattendue.",
    );
  if (!(answer === true || answer === false || answer === null))
    throw new HttpsError("invalid-argument", "Réponse invalide.");
  const key = `q${question}`;
  const answers = player.answers || {};
  if (answers[key])
    throw new HttpsError("already-exists", "Question déjà répondue.");
  const startedAt = Number(player.questionStartedAt);
  if (!Number.isFinite(startedAt))
    throw new HttpsError("failed-precondition", "Chronomètre serveur absent.");
  const now = Date.now();
  const elapsed = Math.max(0, Math.min(TIMER_SEC, (now - startedAt) / 1000));
  const timedOut = answer === null || now - startedAt > TIMER_SEC * 1000;
  const acceptedAnswer = timedOut ? null : answer;
  const correct =
    acceptedAnswer !== null &&
    acceptedAnswer === QUESTIONS[question - 1].answer;
  const responseTime = timedOut ? TIMER_SEC : Math.round(elapsed * 100) / 100;
  const nextQuestion = question + 1;
  const correctCount = Number(player.correctCount || 0) + (correct ? 1 : 0);
  const totalTime =
    Number(player.totalTime || 0) + (correct ? responseTime : 0);
  const completed = question === QUESTIONS.length;
  const answerData = {
    answer: acceptedAnswer,
    correct,
    responseTime,
    timedOut,
    submittedAt: now,
  };
  const updates = {
    [`answers/${key}`]: answerData,
    correctCount,
    totalTime: Math.round(totalTime * 100) / 100,
    currentQuestion: completed ? QUESTIONS.length : nextQuestion,
    questionStartedAt: null,
    status: completed ? "completed" : "in_progress",
  };
  if (completed) updates.completedAt = now;
  await playerRef(uid).update(updates);
  if (completed)
    await deviceLockRef(player.deviceId).update({
      status: "completed",
      completedAt: now,
    });
  return {
    question,
    answer: acceptedAnswer,
    correct,
    timedOut,
    responseTime,
    correctCount,
    totalTime: Math.round(totalTime * 100) / 100,
    comment: QUESTIONS[question - 1].comment,
    correctAnswer: QUESTIONS[question - 1].answer,
    completed,
  };
});
