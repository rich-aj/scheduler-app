// Web-compatible storage utility
// This replaces expo-file-system functionality for web

import { Platform } from 'react-native';

class Storage {
    constructor() {
        this.isWeb = Platform.OS === 'web';
    }

    // Get the storage directory path
    getDocumentDirectory() {
        if (this.isWeb) {
            return 'app-data://';
        }
        // For mobile, this would be the actual document directory
        return 'file:///path/to/documents/';
    }

    // Check if file exists
    async getInfoAsync(fileUri) {
        if (this.isWeb) {
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
        // For mobile, use expo-file-system
        const FileSystem = require('expo-file-system');
        return await FileSystem.getInfoAsync(fileUri);
    }

    // Read file content
    async readAsStringAsync(fileUri) {
        if (this.isWeb) {
            const fileName = this.getFileNameFromUri(fileUri);
            const data = localStorage.getItem(fileName);
            if (data === null) {
                throw new Error(`File not found: ${fileName}`);
            }
            return data;
        }
        // For mobile, use expo-file-system
        const FileSystem = require('expo-file-system');
        return await FileSystem.readAsStringAsync(fileUri);
    }

    // Write file content
    async writeAsStringAsync(fileUri, content) {
        if (this.isWeb) {
            const fileName = this.getFileNameFromUri(fileUri);
            localStorage.setItem(fileName, content);
            return fileUri;
        }
        // For mobile, use expo-file-system
        const FileSystem = require('expo-file-system');
        return await FileSystem.writeAsStringAsync(fileUri, content);
    }

    // Read directory contents
    async readDirectoryAsync(directoryUri) {
        if (this.isWeb) {
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
        // For mobile, use expo-file-system
        const FileSystem = require('expo-file-system');
        return await FileSystem.readDirectoryAsync(directoryUri);
    }

    // Delete file
    async deleteAsync(fileUri) {
        if (this.isWeb) {
            const fileName = this.getFileNameFromUri(fileUri);
            localStorage.removeItem(fileName);
            return fileUri;
        }
        // For mobile, use expo-file-system
        const FileSystem = require('expo-file-system');
        return await FileSystem.deleteAsync(fileUri);
    }

    // Helper method to convert file URI to localStorage key
    getFileNameFromUri(fileUri) {
        if (this.isWeb) {
            // Convert file URI to a localStorage key
            // e.g., "app-data://team_members.json" -> "church-scheduler-team_members.json"
            const fileName = fileUri.replace('app-data://', '');
            return `church-scheduler-${fileName}`;
        }
        return fileUri;
    }

    // Helper method to convert localStorage key to file URI
    getFileUriFromKey(key) {
        if (this.isWeb) {
            const fileName = key.replace('church-scheduler-', '');
            return `app-data://${fileName}`;
        }
        return key;
    }
}

// Create and export a singleton instance
const storage = new Storage();
export default storage;

// Export individual methods for compatibility with expo-file-system
export const {
    getInfoAsync,
    readAsStringAsync,
    writeAsStringAsync,
    readDirectoryAsync,
    deleteAsync
} = storage;
