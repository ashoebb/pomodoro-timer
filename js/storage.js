/**
 * Storage Module
 * Handles settings persistence using localStorage
 */

const STORAGE_KEY = 'pomodoro-timer-settings';
const STATS_KEY = 'pomodoro-timer-stats';

const DEFAULT_SETTINGS = {
    workDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    sessionsUntilLongBreak: 4,
    autoStartBreaks: true,
    autoStartWork: false,
    soundEnabled: true,
    notificationsEnabled: false,
    notificationSound: 'bell'
};

const DEFAULT_STATS = {
    totalWorkSessions: 0,
    totalFocusTime: 0,
    currentStreak: 0,
    lastSessionDate: null,
    dailySessions: {}
};

export class StorageManager {
    constructor() {
        this.settings = this._loadSettings();
        this.stats = this._loadStats();
    }

    /**
     * Load settings from localStorage
     */
    _loadSettings() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                return { ...DEFAULT_SETTINGS, ...parsed };
            }
        } catch (e) {
            console.warn('Failed to load settings:', e);
        }
        return { ...DEFAULT_SETTINGS };
    }

    /**
     * Load stats from localStorage
     */
    _loadStats() {
        try {
            const stored = localStorage.getItem(STATS_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                return { ...DEFAULT_STATS, ...parsed };
            }
        } catch (e) {
            console.warn('Failed to load stats:', e);
        }
        return { ...DEFAULT_STATS };
    }

    /**
     * Save settings to localStorage
     */
    _saveSettings() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
        } catch (e) {
            console.warn('Failed to save settings:', e);
        }
    }

    /**
     * Save stats to localStorage
     */
    _saveStats() {
        try {
            localStorage.setItem(STATS_KEY, JSON.stringify(this.stats));
        } catch (e) {
            console.warn('Failed to save stats:', e);
        }
    }

    /**
     * Get all settings
     */
    getSettings() {
        return { ...this.settings };
    }

    /**
     * Get a specific setting
     */
    getSetting(key) {
        return this.settings[key];
    }

    /**
     * Update settings
     */
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this._saveSettings();
        return this.settings;
    }

    /**
     * Reset settings to defaults
     */
    resetSettings() {
        this.settings = { ...DEFAULT_SETTINGS };
        this._saveSettings();
        return this.settings;
    }

    /**
     * Get all stats
     */
    getStats() {
        return { ...this.stats };
    }

    /**
     * Record a completed work session
     */
    recordWorkSession(duration) {
        const today = new Date().toISOString().split('T')[0];

        this.stats.totalWorkSessions += 1;
        this.stats.totalFocusTime += duration;

        // Update daily sessions
        if (!this.stats.dailySessions[today]) {
            this.stats.dailySessions[today] = 0;
        }
        this.stats.dailySessions[today] += 1;

        // Update streak
        this._updateStreak(today);

        this.stats.lastSessionDate = today;
        this._saveStats();

        return this.stats;
    }

    /**
     * Update streak based on daily activity
     */
    _updateStreak(today) {
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        if (this.stats.lastSessionDate === today) {
            // Already recorded today, don't change streak
            return;
        }

        if (this.stats.lastSessionDate === yesterday) {
            // Consecutive day
            this.stats.currentStreak += 1;
        } else if (this.stats.lastSessionDate !== today) {
            // Streak broken or first session
            this.stats.currentStreak = 1;
        }
    }

    /**
     * Get streak
     */
    getStreak() {
        return this.stats.currentStreak;
    }

    /**
     * Get total focus time formatted
     */
    getTotalFocusTime() {
        return this.stats.totalFocusTime;
    }

    /**
     * Get total sessions
     */
    getTotalSessions() {
        return this.stats.totalWorkSessions;
    }

    /**
     * Get today's sessions
     */
    getTodaySessions() {
        const today = new Date().toISOString().split('T')[0];
        return this.stats.dailySessions[today] || 0;
    }

    /**
     * Export all data (for backup)
     */
    exportData() {
        return {
            settings: this.settings,
            stats: this.stats,
            exportedAt: new Date().toISOString()
        };
    }

    /**
     * Import data (for restore)
     */
    importData(data) {
        if (data.settings) {
            this.settings = { ...DEFAULT_SETTINGS, ...data.settings };
            this._saveSettings();
        }
        if (data.stats) {
            this.stats = { ...DEFAULT_STATS, ...data.stats };
            this._saveStats();
        }
    }

    /**
     * Clear all data
     */
    clearAll() {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STATS_KEY);
        this.settings = { ...DEFAULT_SETTINGS };
        this.stats = { ...DEFAULT_STATS };
    }
}

// Singleton instance
export const storageManager = new StorageManager();