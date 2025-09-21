import {
    ref,
    set,
    get,
    push,
    remove,
    onValue,
    off,
    child,
    update
} from 'firebase/database';
import { database } from '../config/firebase';

class FirebaseService {
    // Write data to Firebase
    async writeData(path, data) {
        try {
            const dataRef = ref(database, path);
            await set(dataRef, data);
            return { success: true };
        } catch (error) {
            console.error('Firebase write error:', error);
            return { success: false, error: error.message };
        }
    }

    // Read data from Firebase
    async readData(path) {
        try {
            const dataRef = ref(database, path);
            const snapshot = await get(dataRef);
            return { success: true, data: snapshot.val() };
        } catch (error) {
            console.error('Firebase read error:', error);
            return { success: false, error: error.message };
        }
    }

    // Listen to real-time changes
    listenToData(path, callback) {
        const dataRef = ref(database, path);
        onValue(dataRef, (snapshot) => {
            const data = snapshot.val();
            callback({ success: true, data });
        }, (error) => {
            console.error('Firebase listen error:', error);
            callback({ success: false, error: error.message });
        });
        return () => off(dataRef);
    }

    // Update specific fields
    async updateData(path, updates) {
        try {
            const dataRef = ref(database, path);
            await update(dataRef, updates);
            return { success: true };
        } catch (error) {
            console.error('Firebase update error:', error);
            return { success: false, error: error.message };
        }
    }

    // Delete data
    async deleteData(path) {
        try {
            const dataRef = ref(database, path);
            await remove(dataRef);
            return { success: true };
        } catch (error) {
            console.error('Firebase delete error:', error);
            return { success: false, error: error.message };
        }
    }

    // Push new data with auto-generated key
    async pushData(path, data) {
        try {
            const dataRef = ref(database, path);
            const newRef = push(dataRef);
            await set(newRef, data);
            return { success: true, key: newRef.key };
        } catch (error) {
            console.error('Firebase push error:', error);
            return { success: false, error: error.message };
        }
    }

    // Check if data exists
    async exists(path) {
        try {
            const dataRef = ref(database, path);
            const snapshot = await get(dataRef);
            return { success: true, exists: snapshot.exists() };
        } catch (error) {
            console.error('Firebase exists error:', error);
            return { success: false, error: error.message };
        }
    }
}

export default new FirebaseService();
