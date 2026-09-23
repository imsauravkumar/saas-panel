const admin = require('firebase-admin');

let firebaseApp = null;

const initializeFirebase = () => {
  if (firebaseApp) return firebaseApp;

  try {
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      let privateKey = process.env.FIREBASE_PRIVATE_KEY.trim();
      if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.slice(1, -1);
      }
      privateKey = privateKey.replace(/\\n/g, '\n');

      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      });
      console.log('[Firebase Admin] Initialized successfully with provided credentials.');
    } else {
      console.log('[Firebase Admin] Notice: Firebase credentials not set in .env. Running in hybrid dev mode with built-in JWT verification.');
    }
  } catch (error) {
    console.warn('[Firebase Admin Warning] Initialization failed:', error.message);
  }

  return firebaseApp;
};

module.exports = {
  admin,
  initializeFirebase,
  getFirebaseApp: () => firebaseApp,
};
