// ==========================================
// CONFIGURAÇÃO DO FIREBASE
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyDiCHEIVwAsHcqPc2Rk9hNuL1iPpa8IggQ",
    authDomain: "granbook-s.firebaseapp.com",
    projectId: "granbook-s",
    storageBucket: "granbook-s.firebasestorage.app",
    messagingSenderId: "680192974772",
    appId: "1:680192974772:web:b2477c1bc4855daf581ce1",
    measurementId: "G-K3ZB14FHNZ"
};

// Inicializa Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

// Estado Global da Aplicação
let currentUserData = null;