/**
 * SafeStorage - Wrapper for LocalStorage
 * Prevents system crash when browser blocks storage access (e.g. running from file://)
 */
const SafeStorage = {
    // In-memory fallback
    memory: {},

    setItem: (key, value) => {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            console.warn(`SafeStorage: Blocked (Saving to RAM) -> ${key}`);
            SafeStorage.memory[key] = value;
        }
    },

    getItem: (key) => {
        try {
            return localStorage.getItem(key) || SafeStorage.memory[key] || null;
        } catch (e) {
            console.warn(`SafeStorage: Blocked (Reading from RAM) -> ${key}`);
            return SafeStorage.memory[key] || null;
        }
    },

    removeItem: (key) => {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            delete SafeStorage.memory[key];
        }
    },

    clear: () => {
        try {
            localStorage.clear();
        } catch (e) {
            SafeStorage.memory = {};
        }
    }
};

// Expose globally
window.SafeStorage = SafeStorage;
console.log("? SafeStorage Initialized");
