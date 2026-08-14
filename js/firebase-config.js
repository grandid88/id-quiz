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
const TIMER_SEC    = 15;

/* Points selon le temps de réponse (en secondes) */
/* Le calcul des points est exclusivement effectué par Cloud Functions. */

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
    comment: "Dans sa jeunesse !"
  },
  {
    text:    "Didier a participé à une action de la brigade des sapeurs-pompiers de Paris !",
    comment: "En 1989, en tant qu'arbitre officiel dans un tournoi de handball interarmées à Bourges"
  },
  {
    text:    "Didier a été à la tête d'un groupe de filles !",
    comment: "En tant qu'entraîneur de handball — 1988-1990 !"
  },
  {
    text:    "Isabelle et Didier ont travaillé tous les deux dans le même hypermarché !",
    comment: "Ils ont tous les deux travaillé dans la grande distribution, mais pas dans la même enseigne !"
  },
  {
    text:    "Isabelle a fait l'objet d'un article dans le journal local !",
    comment: "Pour la création de son aut-entreprise : Isa Perm' Makup !"
  },
  {
    text:    "Isabelle & Didier ont été entendus dans le cadre d'une enquête policière !",
    comment: "En 2020, ils ont trouvé par hasard près de chez eux des objets appartenant à une personne recherchée !"
  },
  {
    text:    "Didier a été champion de tennis de table avant de pratiquer le handball !",
    comment: "Non, c'est son frère Jean-Luc !"
  },
  {
    text:    "Isabelle a été championne de twirling-bâton dans sa jeunesse !",
    comment: "Ce sont ses filles Amélie et Lucie !"
  },
  {
    text:    "Isabelle a nagé avec des tortues de mer !",
    comment: "Martinique 2022 !"
  },
  {
    text:    "Didier a hissé les voiles d'un bateau !",
    comment: "Martinique 2022 !"
  },
  {
    text:    "Isabelle et Didier ont rencontré le vrai Mac Donald !",
    comment: "Lors d'un trajet pour un mariage (Loïc & Lucie) en 2018 !"
  },
  {
    text:    "Didier adore la noix de coco !",
    comment: "C'est même son fruit exotique le plus détesté !"
  },
  {
    text:    "Isabelle a participé à un jeu télé !",
    comment: "Jamais ! Et Didier non plus !"
  },
  {
    text:    "Didier a connu les tranchées de Verdun !",
    comment: "De 1987 à 1988, pendant son service militaire."
  },
  {
    text:    "Isabelle & Didier ont participé ensemble à une course à pied !",
    comment: "Isabelle seulement !"
  },
];
