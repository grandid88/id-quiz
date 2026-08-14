/* ==========================================================
   I&D QUIZ — auth.js — 3G-2A
   Authentification Firebase anonyme + identifiant persistant
   du navigateur pour verrouiller une partie sur le téléphone.
========================================================== */

let currentAuthUser = null;
const DEVICE_ID_KEY = 'idQuizDeviceId_v1';

function createDeviceId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  window.crypto?.getRandomValues?.(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

function getDeviceId() {
  let id = null;
  try { id = localStorage.getItem(DEVICE_ID_KEY); } catch (_) {}
  if (!id) {
    id = createDeviceId();
    try { localStorage.setItem(DEVICE_ID_KEY, id); } catch (_) {}
  }
  return id;
}

async function initPlayerAuth() {
  if (!firebase?.auth) throw new Error('Firebase Authentication n\'est pas chargé.');
  const auth = firebase.auth();
  if (auth.currentUser) {
    currentAuthUser = auth.currentUser;
    return currentAuthUser;
  }
  const credential = await auth.signInAnonymously();
  currentAuthUser = credential.user;
  return currentAuthUser;
}

function getAuthUser() {
  return currentAuthUser || firebase.auth().currentUser || null;
}
function getAuthUid() {
  const user = getAuthUser();
  return user ? user.uid : null;
}
