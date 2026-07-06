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

/* ── Questions pré-enregistrées ─────────────────────────── */
/* Format : { text: "affirmation", answer: true | false }    */
const QUESTIONS = [
  { text: "Isabelle et Didier se sont rencontrés un vendredi 13.", answer: false },
  { text: "Isabelle a fait ses études à Paris.", answer: true },
  { text: "Didier a demandé Isabelle en mariage lors d'un voyage à l'étranger.", answer: true },
  { text: "Isabelle est l'aînée de sa fratrie.", answer: false },
  { text: "Didier sait jouer d'un instrument de musique.", answer: true },
  { text: "Ils ont adopté un animal de compagnie ensemble.", answer: false },
  { text: "Le premier voyage en amoureux d'Isabelle & Didier était en Italie.", answer: true },
  { text: "Isabelle déteste le chocolat.", answer: false },
  { text: "Didier a déjà sauté en parachute.", answer: true },
  { text: "Isabelle & Didier prévoient leur lune de miel à l'Île Maurice.", answer: true },
];

/* ⚠️ Mets à jour ces questions avec les vraies réponses
   avant le mariage, directement dans ce fichier. */
