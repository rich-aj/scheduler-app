// Web-compatible storage utility with Firebase integration
// This replaces expo-file-system functionality for web and provides real-time sync

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import firebaseService from '../services/firebaseService';

const isWeb = Platform.OS === 'web';

const storage = {
    // Get the storage directory path
    getDocumentDirectory() {
        if (isWeb) {
            return 'app-data://';
        }
        return FileSystem.documentDirectory;
    },

    // Check if file exists
    async getInfoAsync(fileUri) {
        if (isWeb) {
            const fileName = this.getFileNameFromUri(fileUri);
            const data = localStorage.getItem(fileName);
            return {
                exists: data !== null,
                uri: fileUri,
                size: data ? data.length : 0,
                isDirectory: false,
                modificationTime: data ? Date.now() : 0
            };
        }
        return await FileSystem.getInfoAsync(fileUri);
    },

    // Read file content
    async readAsStringAsync(fileUri) {
        if (isWeb) {
            const fileName = this.getFileNameFromUri(fileUri);
            const cleanFileName = fileName
                .replace(/\./g, '_DOT_')
                .replace(/#/g, '_HASH_')
                .replace(/\$/g, '_DOLLAR_')
                .replace(/\[/g, '_OPEN_BRACKET_')
                .replace(/\]/g, '_CLOSE_BRACKET_')
                .replace(/ /g, '_SPACE_')
                .replace(/:/g, '_COLON_');
            const firebasePath = `files/${cleanFileName}`;

            // Try Firebase first
            const result = await firebaseService.readData(firebasePath);
            console.log(`Firebase read result for ${fileName}:`, result);
            if (result.success && result.data !== null) {
                console.log(`Read from Firebase: ${fileName} -> ${cleanFileName}, data:`, result.data);
                return result.data;
            }

            // If Firebase has no data, check localStorage and migrate to Firebase
            let data = localStorage.getItem(fileName);
            console.log(`localStorage data for ${fileName}:`, data);

            // If not found with original filename, try with cleaned filename
            if ((data === null || data === '{}' || data === 'null') && fileName !== cleanFileName) {
                data = localStorage.getItem(cleanFileName);
                console.log(`localStorage data for ${cleanFileName}:`, data);
            }

            if (data !== null && data !== '{}' && data !== 'null') {
                // Migrate localStorage data to Firebase
                console.log(`Read from localStorage and migrating: ${fileName} -> ${cleanFileName}`);
                const migrateResult = await firebaseService.writeData(firebasePath, data);
                if (migrateResult.success) {
                    console.log(`Successfully migrated ${fileName} to Firebase`);
                } else {
                    console.error(`Failed to migrate ${fileName} to Firebase:`, migrateResult.error);
                }
                return data;
            }

            // Return default data for web if file doesn't exist anywhere
            return this.getDefaultData(fileName);
        }
        return await FileSystem.readAsStringAsync(fileUri);
    },

    // Write file content
    async writeAsStringAsync(fileUri, content) {
        if (isWeb) {
            // Use Firebase for web instead of localStorage
            const fileName = this.getFileNameFromUri(fileUri);
            const cleanFileName = fileName
                .replace(/\./g, '_DOT_')
                .replace(/#/g, '_HASH_')
                .replace(/\$/g, '_DOLLAR_')
                .replace(/\[/g, '_OPEN_BRACKET_')
                .replace(/\]/g, '_CLOSE_BRACKET_')
                .replace(/ /g, '_SPACE_')
                .replace(/:/g, '_COLON_');
            const firebasePath = `files/${cleanFileName}`;

            // Always write to localStorage first to ensure it's available
            localStorage.setItem(fileName, content);
            console.log(`Wrote to localStorage: ${fileName}, content length: ${content.length}`);

            // Then try to write to Firebase
            const result = await firebaseService.writeData(firebasePath, content);
            if (result.success) {
                console.log(`Wrote to Firebase: ${firebasePath}`);
            } else {
                console.log(`Firebase write failed for ${firebasePath}, but localStorage backup saved`);
            }

            return fileUri;
        }
        return await FileSystem.writeAsStringAsync(fileUri, content);
    },

    // Read directory contents
    async readDirectoryAsync(directoryUri) {
        if (isWeb) {
            // Get all localStorage keys that start with our app prefix
            const files = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('church-scheduler-')) {
                    files.push(key);
                }
            }
            return files;
        }
        return await FileSystem.readDirectoryAsync(directoryUri);
    },

    // Delete file
    async deleteAsync(fileUri) {
        if (isWeb) {
            const fileName = this.getFileNameFromUri(fileUri);
            localStorage.removeItem(fileName);
            return fileUri;
        }
        return await FileSystem.deleteAsync(fileUri);
    },

    // Helper method to convert file URI to localStorage key
    getFileNameFromUri(fileUri) {
        if (isWeb) {
            // Convert file URI to a localStorage key
            // e.g., "app-data://team_members.json" -> "church-scheduler-team_members.json"
            const fileName = fileUri.replace('app-data://', '');
            return `church-scheduler-${fileName}`;
        }
        return fileUri;
    },

    // Helper method to convert localStorage key to file URI
    getFileUriFromKey(key) {
        if (isWeb) {
            const fileName = key.replace('church-scheduler-', '');
            return `app-data://${fileName}`;
        }
        return key;
    },

    // Get default data for web when files don't exist
    getDefaultData(fileName) {
        if (fileName.includes('team_members')) {
            return JSON.stringify({
                members: []
            });
        }
        if (fileName.includes('pending_requests')) {
            return JSON.stringify({ requests: [] });
        }
        if (fileName.includes('current_user')) {
            return JSON.stringify({
                id: 1,
                teamMemberId: 'TM001',
                name: 'Boma Ibiba',
                email: 'boma@example.com',
                roles: ['Main Lead A'],
                loginTime: new Date().toISOString()
            });
        }
        return '{}';
    },

    // Export data for syncing between platforms
    async exportData() {
        if (isWeb) {
            const data = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('church-scheduler-')) {
                    const fileName = key.replace('church-scheduler-', '');
                    data[fileName] = localStorage.getItem(key);
                }
            }
            return JSON.stringify(data, null, 2);
        } else {
            // For mobile, read all files and return as JSON
            const files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory);
            const data = {};
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const fileUri = FileSystem.documentDirectory + file;
                    const content = await FileSystem.readAsStringAsync(fileUri);
                    data[file] = content;
                }
            }
            return JSON.stringify(data, null, 2);
        }
    },

    // Import data from another platform
    async importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            for (const [fileName, content] of Object.entries(data)) {
                const fileUri = this.getDocumentDirectory() + fileName;
                await this.writeAsStringAsync(fileUri, content);
            }
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Real-time sync for web - listen to Firebase changes
    startRealtimeSync(callback) {
        if (isWeb) {
            const unsubscribe = firebaseService.listenToData('files', (result) => {
                if (result.success && result.data) {
                    // Update localStorage with Firebase data
                    Object.entries(result.data).forEach(([fileName, content]) => {
                        localStorage.setItem(fileName, content);
                    });
                    callback(result);
                }
            });
            return unsubscribe;
        }
        return () => { }; // No-op for mobile
    },

    // Check Firebase connection
    async testConnection() {
        if (isWeb) {
            const result = await firebaseService.readData('test');
            return result.success;
        }
        return true; // Mobile doesn't use Firebase
    },


    // Force sync from Firebase
    async forceSyncFromFirebase() {
        if (isWeb) {
            try {
                // Read all data from Firebase
                const result = await firebaseService.readData('files');

                if (!result.success) {
                    console.log(`❌ Firebase read failed: ${result.error}`);
                    return { success: false, error: result.error };
                }

                if (!result.data) {
                    console.log('⚠️ No data found in Firebase');
                    return { success: false, error: 'No data in Firebase' };
                }

                const firebaseData = result.data;
                const fileCount = Object.keys(firebaseData).length;

                // Clear existing localStorage
                const keysToRemove = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith('church-scheduler-')) {
                        keysToRemove.push(key);
                    }
                }
                keysToRemove.forEach(key => localStorage.removeItem(key));

                // Write Firebase data to localStorage
                let syncedCount = 0;

                for (const [cleanFileName, content] of Object.entries(firebaseData)) {
                    // Convert clean filename back to original format
                    let originalFileName = cleanFileName
                        .replace(/_DOT_/g, '.')
                        .replace(/_HASH_/g, '#')
                        .replace(/_DOLLAR_/g, '$')
                        .replace(/_OPEN_BRACKET_/g, '[')
                        .replace(/_CLOSE_BRACKET_/g, ']')
                        .replace(/_SPACE_/g, ' ')
                        .replace(/_COLON_/g, ':');

                    const fullFileName = `church-scheduler-${originalFileName}`;
                    localStorage.setItem(fullFileName, content);
                    syncedCount++;
                }

                console.log(`✅ Sync complete! Synced ${syncedCount} files from Firebase.`);
                return { success: true, syncedCount };

            } catch (error) {
                console.log(`❌ Sync error: ${error.message}`);
                return { success: false, error: error.message };
            }
        }
        return { success: false, error: 'Not applicable for mobile' };
    },

    // Clear all local storage and force fresh sync from Firebase
    async clearAndSyncFromFirebase() {
        if (isWeb) {
            try {
                // Clear ALL localStorage data
                localStorage.clear();

                // Force a fresh sync from Firebase
                const result = await firebaseService.readData('files');
                if (result.success && result.data) {
                    const firebaseData = result.data;
                    let syncedCount = 0;

                    // Write Firebase data to localStorage with proper filename conversion
                    Object.entries(firebaseData).forEach(([cleanFileName, content]) => {
                        // Convert cleaned Firebase filename back to original format
                        const originalFileName = cleanFileName
                            .replace(/_DOT_/g, '.')
                            .replace(/_HASH_/g, '#')
                            .replace(/_DOLLAR_/g, '$')
                            .replace(/_OPEN_BRACKET_/g, '[')
                            .replace(/_CLOSE_BRACKET_/g, ']')
                            .replace(/_SPACE_/g, ' ')
                            .replace(/_COLON_/g, ':');

                        const fullFileName = `church-scheduler-${originalFileName}`;
                        localStorage.setItem(fullFileName, content);
                        syncedCount++;
                    });

                    return { success: true, message: `Cleared local storage and synced ${syncedCount} files from Firebase` };
                } else {
                    return { success: false, message: 'No data found in Firebase' };
                }
            } catch (error) {
                console.error('Clear and sync error:', error);
                return { success: false, message: error.message };
            }
        }
        return { success: true, message: 'Mobile - no sync needed' };
    },

    // Clear EVERYTHING - both local storage and Firebase
    async clearEverything() {
        if (isWeb) {
            try {
                // Clear ALL localStorage data
                localStorage.clear();

                // Clear ALL Firebase data by writing empty object
                const clearResult = await firebaseService.writeData('files', {});

                // Also clear team members specifically
                await firebaseService.writeData('files/team_members_DOT_json', '');

                if (clearResult.success) {
                    return { success: true, message: 'Cleared all data from local storage and Firebase. All devices will sync to empty state!' };
                } else {
                    return { success: false, message: `Failed to clear Firebase: ${clearResult.error}` };
                }
            } catch (error) {
                console.error('Clear everything error:', error);
                return { success: false, message: error.message };
            }
        }
        return { success: true, message: 'Mobile - no clear needed' };
    },

    // Force clear signal for all devices
    async forceClearAllDevices() {
        if (isWeb) {
            try {
                // Write a special "CLEAR_ALL" signal to Firebase
                const clearSignal = await firebaseService.writeData('CLEAR_ALL_SIGNAL', {
                    timestamp: Date.now(),
                    action: 'CLEAR_ALL_DATA'
                });

                if (clearSignal.success) {
                    // Also clear local storage
                    localStorage.clear();
                    return { success: true, message: 'Clear signal sent to all devices. They will clear their local storage automatically.' };
                } else {
                    return { success: false, message: `Failed to send clear signal: ${clearSignal.error}` };
                }
            } catch (error) {
                console.error('Force clear all devices error:', error);
                return { success: false, message: error.message };
            }
        }
        return { success: true, message: 'Mobile - no clear needed' };
    },

};

export default storage;
