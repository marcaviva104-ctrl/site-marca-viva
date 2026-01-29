/**
 * SafeStorage - Robust LocalStorage Wrapper
 * Prevents crashes when access to localStorage is denied (e.g. file:// protocol, private mode).
 * Falls back to in-memory storage so the app continues to function (volatile).
 */

const SafeStorage = {
    _memoryStore: {},
    _isAvailable: null,

    // Check if native storage works
    checkAvailability: function () {
        if (this._isAvailable !== null) return this._isAvailable;
        try {
            const test = '__storage_test__';
            window.localStorage.setItem(test, test);
            window.localStorage.removeItem(test);
            this._isAvailable = true;
            console.log("SafeStorage: Native LocalStorage is available.");
        } catch (e) {
            this._isAvailable = false;
            console.warn("SafeStorage: Native LocalStorage BLOCKED. Using Memory Fallback.");
        }
        return this._isAvailable;
    },

    setItem: function (key, value) {
        if (this.checkAvailability()) {
            try {
                window.localStorage.setItem(key, value);
            } catch (e) {
                console.warn(`SafeStorage: Write failed for ${key}`, e);
                this._memoryStore[key] = String(value);
            }
        } else {
            this._memoryStore[key] = String(value);
        }
    },

    getItem: function (key) {
        if (this.checkAvailability()) {
            try {
                return window.localStorage.getItem(key);
            } catch (e) {
                return this._memoryStore[key] || null;
            }
        } else {
            return this._memoryStore[key] || null;
        }
    },

    removeItem: function (key) {
        if (this.checkAvailability()) {
            try {
                window.localStorage.removeItem(key);
            } catch (e) { }
        }
        delete this._memoryStore[key];
    },

    clear: function () {
        if (this.checkAvailability()) {
            try {
                window.localStorage.clear();
            } catch (e) { }
        }
        this._memoryStore = {};
    }
};

// Global Exposure
window.SafeStorage = SafeStorage;

// Optional: Override global localStorage (Aggressive Fix)
// This makes all existing scripts "just work" without rewriting them.
// Uncomment to force fix everywhere:
/*
try {
    Object.defineProperty(window, 'localStorage', {
        value: SafeStorage,
        configurable: true,
        enumerable: true,
        writable: true
    });
    console.log("SafeStorage: Global localStorage overridden.");
} catch(e) {
    console.warn("SafeStorage: Could not override global localStorage. Use window.SafeStorage manually.");
}
*/
