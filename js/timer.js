/**
 * Timer Core Module
 * Handles timer logic, state management, and session tracking
 */

export const SessionType = {
    WORK: 'work',
    SHORT_BREAK: 'shortBreak',
    LONG_BREAK: 'longBreak'
};

export const TimerState = {
    IDLE: 'idle',
    RUNNING: 'running',
    PAUSED: 'paused',
    COMPLETED: 'completed'
};

export class Timer {
    constructor(config = {}) {
        this.config = {
            workDuration: config.workDuration || 25 * 60,        // seconds
            shortBreakDuration: config.shortBreakDuration || 5 * 60,
            longBreakDuration: config.longBreakDuration || 15 * 60,
            sessionsUntilLongBreak: config.sessionsUntilLongBreak || 4,
            autoStartBreaks: config.autoStartBreaks !== false,
            autoStartWork: config.autoStartWork === true,
            soundEnabled: config.soundEnabled !== false,
            notificationsEnabled: config.notificationsEnabled === true,
            notificationSound: config.notificationSound || 'bell'
        };

        // State
        this.state = TimerState.IDLE;
        this.currentSession = SessionType.WORK;
        this.timeRemaining = this.config.workDuration;
        this.totalWorkSessions = 0;
        this.completedWorkSessions = 0;
        this.totalFocusTime = 0; // in seconds

        // Timer reference
        this.intervalId = null;
        this.startTime = null;
        this.pausedTime = null;

        // Callbacks
        this.onTick = null;
        this.onSessionComplete = null;
        this.onStateChange = null;
        this.onSessionChange = null;
    }

    /**
     * Get default duration for current session type
     */
    getDefaultDuration(sessionType) {
        switch (sessionType) {
            case SessionType.WORK:
                return this.config.workDuration;
            case SessionType.SHORT_BREAK:
                return this.config.shortBreakDuration;
            case SessionType.LONG_BREAK:
                return this.config.longBreakDuration;
            default:
                return this.config.workDuration;
        }
    }

    /**
     * Get session display name
     */
    getSessionDisplayName(sessionType) {
        switch (sessionType) {
            case SessionType.WORK:
                return 'Work';
            case SessionType.SHORT_BREAK:
                return 'Short Break';
            case SessionType.LONG_BREAK:
                return 'Long Break';
            default:
                return 'Work';
        }
    }

    /**
     * Get next session type
     */
    getNextSession() {
        if (this.currentSession === SessionType.WORK) {
            this.completedWorkSessions++;
            this.totalWorkSessions++;
            this.totalFocusTime += this.config.workDuration;

            // Check if it's time for a long break
            if (this.completedWorkSessions % this.config.sessionsUntilLongBreak === 0) {
                return SessionType.LONG_BREAK;
            }
            return SessionType.SHORT_BREAK;
        }
        // After any break, go back to work
        return SessionType.WORK;
    }

    /**
     * Start the timer
     */
    start() {
        if (this.state === TimerState.RUNNING) return;

        if (this.state === TimerState.PAUSED) {
            // Resume from paused time
            this.startTime = Date.now() - this.pausedTime;
        } else {
            // Fresh start
            this.startTime = Date.now();
            this.timeRemaining = this.getDefaultDuration(this.currentSession);
        }

        this.state = TimerState.RUNNING;
        this._startInterval();
        this._notifyStateChange();
    }

    /**
     * Pause the timer
     */
    pause() {
        if (this.state !== TimerState.RUNNING) return;

        clearInterval(this.intervalId);
        this.intervalId = null;
        this.pausedTime = Date.now() - this.startTime;
        this.state = TimerState.PAUSED;
        this._notifyStateChange();
    }

    /**
     * Reset the timer to initial state
     */
    reset() {
        clearInterval(this.intervalId);
        this.intervalId = null;
        this.state = TimerState.IDLE;
        this.currentSession = SessionType.WORK;
        this.timeRemaining = this.config.workDuration;
        this.completedWorkSessions = 0;
        this.startTime = null;
        this.pausedTime = null;
        this._notifyStateChange();
        this._notifySessionChange();
    }

    /**
     * Skip to next session
     */
    skip() {
        this._completeSession(true);
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        const wasRunning = this.state === TimerState.RUNNING;
        const currentSessionType = this.currentSession;

        this.config = { ...this.config, ...newConfig };

        // If idle, update time remaining for current session
        if (this.state === TimerState.IDLE) {
            this.timeRemaining = this.getDefaultDuration(this.currentSession);
            this._notifySessionChange();
        }
        // If paused, update the paused time reference
        else if (this.state === TimerState.PAUSED) {
            this.timeRemaining = this.getDefaultDuration(this.currentSession);
        }
    }

    /**
     * Get current state snapshot
     */
    getState() {
        return {
            state: this.state,
            currentSession: this.currentSession,
            sessionDisplayName: this.getSessionDisplayName(this.currentSession),
            timeRemaining: this.timeRemaining,
            totalDuration: this.getDefaultDuration(this.currentSession),
            progress: this._getProgress(),
            completedWorkSessions: this.completedWorkSessions,
            totalWorkSessions: this.totalWorkSessions,
            totalFocusTime: this.totalFocusTime,
            sessionsUntilLongBreak: this.config.sessionsUntilLongBreak
        };
    }

    /**
     * Format time as MM:SS
     */
    static formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Format time as Hh Mm
     */
    static formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    }

    // Private Methods

    _startInterval() {
        this.intervalId = setInterval(() => this._tick(), 1000);
        // Immediate tick for responsiveness
        this._tick();
    }

    _tick() {
        if (this.state !== TimerState.RUNNING) return;

        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        this.timeRemaining = Math.max(0, this.getDefaultDuration(this.currentSession) - elapsed);

        this._notifyTick();

        if (this.timeRemaining <= 0) {
            this._completeSession();
        }
    }

    _completeSession(skipped = false) {
        clearInterval(this.intervalId);
        this.intervalId = null;

        const completedSession = this.currentSession;
        const wasWorkSession = completedSession === SessionType.WORK;

        // Notify completion
        if (this.onSessionComplete) {
            this.onSessionComplete({
                sessionType: completedSession,
                wasWorkSession,
                skipped
            });
        }

        // Determine next session
        const nextSession = this.getNextSession();
        this.currentSession = nextSession;
        this.timeRemaining = this.getDefaultDuration(nextSession);

        this.state = TimerState.COMPLETED;
        this._notifyStateChange();
        this._notifySessionChange();

        // Auto-start next session if configured
        const shouldAutoStart = (nextSession === SessionType.WORK && this.config.autoStartWork) ||
                               (nextSession !== SessionType.WORK && this.config.autoStartBreaks);

        if (shouldAutoStart && !skipped) {
            // Small delay for better UX
            setTimeout(() => this.start(), 1000);
        } else {
            this.state = TimerState.IDLE;
            this._notifyStateChange();
        }
    }

    _getProgress() {
        const total = this.getDefaultDuration(this.currentSession);
        if (total === 0) return 0;
        return 1 - (this.timeRemaining / total);
    }

    _notifyTick() {
        if (this.onTick) {
            this.onTick(this.getState());
        }
    }

    _notifyStateChange() {
        if (this.onStateChange) {
            this.onStateChange(this.state);
        }
    }

    _notifySessionChange() {
        if (this.onSessionChange) {
            this.onSessionChange(this.currentSession);
        }
    }

    /**
     * Cleanup
     */
    destroy() {
        clearInterval(this.intervalId);
        this.intervalId = null;
    }
}