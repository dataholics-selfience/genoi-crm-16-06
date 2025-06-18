import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAGP46j09m5LH_XhP2qdAfB_cLNHC82rZA",
  authDomain: "genoi-7777.firebaseapp.com",
  projectId: "genoi-7777",
  storageBucket: "genoi-7777.firebasestorage.app",
  messagingSenderId: "894331831616",
  appId: "1:894331831616:web:1e1583b1a3b8cdd140e6a5",
  measurementId: "G-GPH8EYLKFP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get Auth and Firestore instances
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;