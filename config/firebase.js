import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Your Firebase configuration
// Replace these with your actual Firebase project config
const firebaseConfig = {
    apiKey: "AIzaSyCedeZJmvaKhm9QEanbshun4tBwZ04lJYw",
    authDomain: "scheduler-app-7f78b.firebaseapp.com",
    databaseURL: "https://scheduler-app-7f78b-default-rtdb.firebaseio.com",
    projectId: "scheduler-app-7f78b",
    storageBucket: "scheduler-app-7f78b.firebasestorage.app",
    messagingSenderId: "743952652426",
    appId: "1:743952652426:web:bf3afd51dfa532e2a57573"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database and get a reference to the service
export const database = getDatabase(app);

export default app;
