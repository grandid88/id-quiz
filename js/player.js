/* ==========================================================
   I&D QUIZ — player.js — étape 3G-2A
   Le joueur est lié à l'auth.uid ET à un identifiant persistant
   du navigateur. Les écritures sensibles passent par Functions.
========================================================== */

const PLAYER_PATH = 'quiz/players';
let currentPlayer = null;
const playerFunctionsApi = firebase.functions();
const preparePlayerFn = playerFunctionsApi.httpsCallable('preparePlayer');
const startPlayerGameFn = playerFunctionsApi.httpsCallable('startPlayerGame');

function playerRef(uid = getAuthUid()) {
  if (!uid) throw new Error('Aucun auth.uid disponible.');
  return db.ref(`${PLAYER_PATH}/${uid}`);
}

async function loadCurrentPlayer() {
  const uid = getAuthUid();
  if (!uid) return null;
  const snapshot = await playerRef(uid).once('value');
  if (!snapshot.exists()) { currentPlayer = null; return null; }
  currentPlayer = { uid, ...snapshot.val() };
  return currentPlayer;
}

async function createOrLoadPlayer({ firstName, lastNameInitial, table }) {
  const result = await preparePlayerFn({
    firstName,
    lastNameInitial,
    table,
    deviceId: getDeviceId()
  });
  currentPlayer = result.data;
  return currentPlayer;
}

async function preparePlayerIdentity(identity) { return createOrLoadPlayer(identity); }
async function startPlayerGame() {
  const result = await startPlayerGameFn({ deviceId: getDeviceId() });
  currentPlayer = result.data;
  return currentPlayer;
}
async function getPlayerState() { return loadCurrentPlayer(); }
function isPlayerCompleted(player = currentPlayer) { return !!player && player.status === 'completed'; }
function isPlayerInProgress(player = currentPlayer) { return !!player && player.status === 'in_progress'; }
function isPlayerStarted(player = currentPlayer) { return isPlayerInProgress(player) || isPlayerCompleted(player); }
