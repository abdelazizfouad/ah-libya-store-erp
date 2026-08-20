import { initializeApp, getApps, getApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);

const useLocalFirebase = import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true';
const emulatorHost = import.meta.env.VITE_FIREBASE_EMULATOR_HOST || '127.0.0.1';
const emulatorPort = Number(import.meta.env.VITE_FIREBASE_EMULATOR_PORT || 8080);
const emulatorSsl = import.meta.env.VITE_FIREBASE_EMULATOR_SSL === 'true';
const emulatorAuthUrl = import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_URL || `http://${emulatorHost}:9099`;

if (useLocalFirebase) {
  connectAuthEmulator(auth, emulatorAuthUrl, { disableWarnings: true });
}

// Sign in anonymously to establish credentials for Firestore operations
signInAnonymously(auth).catch((err) => {
  console.warn('Anonymous auth initialization:', err);
});

// Initialize Firestore with specific databaseId if configured
export const db = useLocalFirebase
  ? initializeFirestore(app, { host: `${emulatorHost}:${emulatorPort}`, ssl: emulatorSsl })
  : firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);

export default app;

