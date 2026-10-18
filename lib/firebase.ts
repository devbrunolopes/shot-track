import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Configuração pública do aplicativo Web Firebase Shot Track.
const firebaseConfig = {
  apiKey: "AIzaSyCemNR_I9ci2IcKeXyl1gKNTgmFK7-gUnk",
  authDomain: "shot-track-6266c.firebaseapp.com",
  projectId: "shot-track-6266c",
  storageBucket: "shot-track-6266c.firebasestorage.app",
  messagingSenderId: "876695365160",
  appId: "1:876695365160:web:9f6bc4c696a23ea687f71d",
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
