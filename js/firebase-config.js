/* ==========================================================
   I&D QUIZ — firebase-config.js
   ⚠️ Remplacer les valeurs ci-dessous par ta config Firebase
========================================================== */

const firebaseConfig = {
  apiKey:            "AIzaSyA3VQXnx2oCbEmhHEaiB6Yp1ZvTdkLe86U",
  authDomain:        "id-quiz-22e2c.firebaseapp.com",
  databaseURL:       "https://id-quiz-22e2c-default-rtdb.europe-west1.firebasedatabase.app",
  projectId:         "id-quiz-22e2c",
  storageBucket:     "id-quiz-22e2c.firebasestorage.app",
  messagingSenderId: "479965734332",
  appId:             "1:479965734332:web:0b44b6ca00950c1f1e37b9"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

/* ── Constantes du jeu ───────────────────────────────────── */
const DJ_PIN       = "2627";
const TIMER_SEC    = 30;

/* Points selon le temps de réponse (en secondes) */
function calcPoints(secondsElapsed) {
  if (secondsElapsed <= 10) return 100;
  if (secondsElapsed <= 20) return 70;
  return 40;
}

/* Liste des tables (cohérence avec Horizon) */
const TABLES = [
  { id: "Maurice",           emoji: "🌴" },
  { id: "Tahiti",            emoji: "🌺" },
  { id: "Martinique",        emoji: "🦜" },
  { id: "Guadeloupe",        emoji: "🌊" },
  { id: "Seychelles",        emoji: "🐠" },
  { id: "La Réunion",        emoji: "🌋" },
  { id: "Nouvelle-Calédonie",emoji: "🪸" },
  { id: "Sainte-Lucie",      emoji: "🍹" },
  { id: "Mayotte",           emoji: "🐢" }
];

/* ── Questions ──────────────────────────────────────────── */
const QUESTIONS = [
  {
    text:    "Isabelle a été dauphine d'un concours de miss !",
    answer:  true,
    comment: "Dans sa jeunesse !"
  },
  {
    text:    "Didier a participé à une action de la brigade des sapeurs-pompiers de Paris !",
    answer:  true,
    comment: "En tant qu'arbitre officiel dans un tournoi de handball interarmées — 1989 !"
  },
  {
    text:    "Didier a été responsable d'un groupe de filles !",
    answer:  true,
    comment: "En tant qu'entraîneur de handball — 1988-1990 !"
  },
  {
    text:    "Isabelle et Didier ont travaillé tous les deux dans le même hypermarché !",
    answer:  false,
    comment: "Ils ont tous les deux travaillé dans la grande distribution, mais pas dans la même enseigne !"
  },
  {
    text:    "Isabelle a fait l'objet d'un article dans le journal local !",
    answer:  true,
    comment: "Pour la création d'Isa Perm' Makup !"
  },
  {
    text:    "Isabelle & Didier ont été entendus dans le cadre d'une enquête policière !",
    answer:  true,
    comment: "En 2020, ils ont trouvé par hasard près de chez eux des objets appartenant à une personne recherchée !"
  },
  {
    text:    "Didier a été champion de tennis de table avant de pratiquer le handball !",
    answer:  false,
    comment: "Non, c'est son frère Jean-Luc !"
  },
  {
    text:    "Isabelle a été championne de twirling-bâton dans sa jeunesse !",
    answer:  false,
    comment: "Ce sont ses filles Amélie et Lucie !"
  },
  {
    text:    "Isabelle a nagé avec des tortues de mer !",
    answer:  true,
    comment: "Martinique 2022 !"
  },
  {
    text:    "Didier a hissé les voiles d'un bateau !",
    answer:  true,
    comment: "Martinique 2022 !"
  },
  {
    text:    "Isabelle et Didier ont rencontré le vrai Mac Donald !",
    answer:  true,
    comment: "Lors d'un trajet pour un mariage (Loïc & Lucie) en 2018 !"
  },
  {
    text:    "Didier adore la noix de coco !",
    answer:  false,
    comment: "C'est même son fruit exotique le plus détesté !"
  },
  {
    text:    "Isabelle a participé à un jeu télé !",
    answer:  false,
    comment: "Didier non plus !"
  },
  {
    text:    "Didier a déjà conduit un bateau !",
    answer:  true,
    comment: "Martinique 2022… mauvais souvenir !"
  },
  {
    text:    "Isabelle & Didier ont participé ensemble à une course à pied !",
    answer:  false,
    comment: "Isabelle seulement !"
  },
];
