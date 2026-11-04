/**
 * Pomodoro Timer - Main Application
 * Integrates Timer, Audio, and Storage modules
 */

import { Timer, SessionType, TimerState } from './timer.js';
import { audioManager } from './audio.js';
import { storageManager } from './storage.js';

// --- DOM Elements ---
const elements = {
    // Timer Display
    timerTime: document.getElementById('timerTime'),
    timerProgress: document.getElementById('timerProgress'),
    sessionType: document.getElementById('sessionType'),
    sessionCount: document.getElementById('sessionCount'),
    sessionIndicator: document.getElementById('sessionIndicator'),

    // Controls
    startBtn: document.getElementById('startBtn'),
    startBtnText: document.getElementById('startBtnText'),
    pauseBtn: document.getElementById('pauseBtn'),
    resetBtn: document.getElementById('resetBtn'),

    // Stats
    totalSessions: document.getElementById('totalSessions'),
    totalFocusTime: document.getElementById('totalFocusTime'),
    currentStreak: document.getElementById('currentStreak'),

    // Settings Inputs
    workDuration: document.getElementById('workDuration'),
    shortBreak: document.getElementById('shortBreak'),
    longBreak: document.getElementById('longBreak'),
    sessionsUntilLong: document.getElementById('sessionsUntilLong'),
    soundEnabled: document.getElementById('soundEnabled'),
    notificationsEnabled: document.getElementById('notificationsEnabled'),
    autoStartBreaks: document.getElementById('autoStartBreaks'),
    autoStartWork: document.getElementById('autoStartWork'),
    notificationSound: document.getElementById('notificationSound'),
    testSoundBtn: document.getElementById('testSoundBtn'),

    // Duration Buttons
    workDecrease: document.getElementById('workDecrease'),
    workIncrease: document.getElementById('workIncrease'),
    shortDecrease: document.getElementById('shortDecrease'),
    shortIncrease: document.getElementById('shortIncrease'),
    longDecrease: document.getElementById('longDecrease'),
    longIncrease: document.getElementById('longIncrease'),
    sessionsDecrease: document.getElementById('sessionsDecrease'),
    sessionsIncrease: document.getElementById('sessionsIncrease')
};

// --- Constants ---
const CIRCUMFERENCE = 2 * Math.PI * 120; // 2 * π * r (r=120)

// --- App State ---
let timer = null;
let isSettingsChanged = false;

// --- Initialize ---
async function init() {
    // Load saved settings
    const settings = storageManager.getSettings();

    // Create timer with saved settings
    timer = new Timer({
        workDuration: settings.workDuration * 60,
        shortBreakDuration: settings.shortBreakDuration * 60,
        longBreakDuration: settings.longBreakDuration * 60,
        sessionsUntilLongBreak: settings.sessionsUntilLongBreak,
        autoStartBreaks: settings.autoStartBreaks,
        autoStartWork: settings.autoStartWork,
        soundEnabled: settings.soundEnabled,
        notificationsEnabled: settings.notificationsEnabled,
        notificationSound: settings.notificationSound
    });

    // Configure audio
    audioManager.setEnabled(settings.soundEnabled);
    audioManager.setSound(settings.notificationSound);

    // Set up timer callbacks
    timer.onTick = handleTick;
    timer.onSessionComplete = handleSessionComplete;
    timer.onStateChange = handleStateChange;
    timer.onSessionChange = handleSessionChange;

    // Load stats
    updateStatsDisplay();

    // Initialize UI
    syncSettingsToUI();
    updateTimerDisplay(timer.getState());

    // Set up event listeners
    setupEventListeners();

    // Request notification permission if enabled
    if (settings.notificationsEnabled) {
        requestNotificationPermission();
    }

    // Handle visibility change (pause when tab hidden)
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Handle before unload
    window.addEventListener('beforeunload', handleBeforeUnload);

    console.log('Pomodoro Timer initialized');
}

// --- Timer Event Handlers ---

function handleTick(state) {
    updateTimerDisplay(state);
}

function handleSessionComplete(data) {
    // Play sound
    audioManager.play();

    // Show browser notification
    if (timer.config.notificationsEnabled && document.hidden) {
        showNotification(data);
    }

    // If it was a work session, update stats
    if (data.wasWorkSession) {
        storageManager.recordWorkSession(timer.config.workDuration);
        updateStatsDisplay();
    }

    // Visual feedback
    elements.timerProgress.classList.add('timer-progress--complete');
    elements.timerTime.parentElement.classList.add('timer-display--complete');

    setTimeout(() => {
        elements.timerProgress.classList.remove('timer-progress--complete');
        elements.timerTime.parentElement.classList.remove('timer-display--complete');
    }, 1500);
}

function handleStateChange(state) {
    updateControlButtons(state);
}

function handleSessionChange(sessionType) {
    updateSessionDisplay(sessionType);
}

// --- UI Update Functions ---

function updateTimerDisplay(state) {
    // Update time
    elements.timerTime.textContent = Timer.formatTime(state.timeRemaining);

    // Update progress circle
    const offset = CIRCUMFERENCE * (1 - state.progress);
    elements.timerProgress.style.strokeDashoffset = offset;

    // Update session type color
    updateSessionTypeColor(state.currentSession);
}

function updateSessionDisplay(sessionType) {
    elements.sessionType.textContent = timer.getSessionDisplayName(sessionType);

    // Update session indicator class
    elements.sessionIndicator.className = 'session-indicator';
    elements.sessionType.className = `session-type session-type--${sessionType}`;

    // Update session count
    const completed = state.completedWorkSessions % timer.config.sessionsUntilLongBreak;
    const total = timer.config.sessionsUntilLongBreak;
    elements.sessionCount.textContent = `${completed}/${total}`;
    elements.sessionCount.setAttribute('aria-label', `Completed work sessions: ${completed} of ${total}`);
}

function updateSessionTypeColor(sessionType) {
    elements.timerProgress.className = 'timer-progress';
    switch (sessionType) {
        case SessionType.WORK:
            elements.timerProgress.classList.add('session-work');
            break;
        case SessionType.SHORT_BREAK:
            elements.timerProgress.classList.add('session-short-break');
            break;
        case SessionType.LONG_BREAK:
            elements.timerProgress.classList.add('session-long-break');
            break;
    }
}

function updateControlButtons(state) {
    const isRunning = state === TimerState.RUNNING;
    const isPaused = state === TimerState.PAUSED;
    const isIdle = state === TimerState.IDLE;
    const isCompleted = state === TimerState.COMPLETED;

    // Start button
    if (isRunning) {
        elements.startBtn.disabled = true;
        elements.startBtnText.textContent = 'Running';
        elements.startBtn.querySelector('.btn-icon').innerHTML = '<path fill="currentColor" d="M8 5v14l11-7z"/>';
    } else if (isPaused) {
        elements.startBtn.disabled = false;
        elements.startBtnText.textContent = 'Resume';
        elements.startBtn.querySelector('.btn-icon').innerHTML = '<path fill="currentColor" d="M8 5v14l11-7z"/>';
    } else if (isCompleted) {
        elements.startBtn.disabled = false;
        elements.startBtnText.textContent = 'Start Next';
        elements.startBtn.querySelector('.btn-icon').innerHTML = '<path fill="currentColor" d="M8 5v14l11-7z"/>';
    } else {
        elements.startBtn.disabled = false;
        elements.startBtnText.textContent = 'Start';
        elements.startBtn.querySelector('.btn-icon').innerHTML = '<path fill="currentColor" d="M8 5v14l11-7z"/>';
    }

    // Pause button
    elements.pauseBtn.disabled = !isRunning;

    // Reset button
    elements.resetBtn.disabled = isIdle;
}

function updateStatsDisplay() {
    elements.totalSessions.textContent = storageManager.getTotalSessions();
    elements.totalFocusTime.textContent = Timer.formatDuration(storageManager.getTotalFocusTime());
    elements.currentStreak.textContent = storageManager.getStreak();
}

function syncSettingsToUI() {
    const settings = storageManager.getSettings();

    elements.workDuration.value = settings.workDuration;
    elements.shortBreak.value = settings.shortBreakDuration;
    elements.longBreak.value = settings.longBreakDuration;
    elements.sessionsUntilLong.value = settings.sessionsUntilLongBreak;
    elements.soundEnabled.checked = settings.soundEnabled;
    elements.notificationsEnabled.checked = settings.notificationsEnabled;
    elements.autoStartBreaks.checked = settings.autoStartBreaks;
    elements.autoStartWork.checked = settings.autoStartWork;
    elements.notificationSound.value = settings.notificationSound;
}

// --- Event Listeners ---

function setupEventListeners() {
    // Timer Controls
    elements.startBtn.addEventListener('click', handleStartClick);
    elements.pauseBtn.addEventListener('click', handlePauseClick);
    elements.resetBtn.addEventListener('click', handleResetClick);

    // Settings - Duration Inputs
    setupDurationInput(elements.workDuration, 'workDuration');
    setupDurationInput(elements.shortBreak, 'shortBreakDuration');
    setupDurationInput(elements.longBreak, 'longBreakDuration');
    setupDurationInput(elements.sessionsUntilLong, 'sessionsUntilLongBreak');

    // Settings - Increment/Decrement Buttons
    setupStepButtons(
        elements.workDecrease, elements.workIncrease, elements.workDuration,
        'workDuration', 1, 60
    );
    setupStepButtons(
        elements.shortDecrease, elements.shortIncrease, elements.shortBreak,
        'shortBreakDuration', 1, 30
    );
    setupStepButtons(
        elements.longDecrease, elements.longIncrease, elements.longBreak,
        'longBreakDuration', 5, 60
    );
    setupStepButtons(
        elements.sessionsDecrease, elements.sessionsIncrease, elements.sessionsUntilLong,
        'sessionsUntilLongBreak', 2, 10
    );

    // Settings - Toggles
    elements.soundEnabled.addEventListener('change', (e) => {
        updateSetting('soundEnabled', e.target.checked);
        audioManager.setEnabled(e.target.checked);
    });

    elements.notificationsEnabled.addEventListener('change', async (e) => {
        const enabled = e.target.checked;
        updateSetting('notificationsEnabled', enabled);
        if (enabled) {
            await requestNotificationPermission();
        }
    });

    elements.autoStartBreaks.addEventListener('change', (e) => {
        updateSetting('autoStartBreaks', e.target.checked);
    });

    elements.autoStartWork.addEventListener('change', (e) => {
        updateSetting('autoStartWork', e.target.checked);
    });

    // Sound Selection
    elements.notificationSound.addEventListener('change', (e) => {
        updateSetting('notificationSound', e.target.value);
        audioManager.setSound(e.target.value);
    });

    elements.testSoundBtn.addEventListener('click', () => {
        audioManager.playTest(elements.notificationSound.value);
    });

    // Keyboard Shortcuts
    document.addEventListener('keydown', handleKeydown);
}

function setupDurationInput(input, settingKey) {
    input.addEventListener('change', () => {
        const value = parseInt(input.value, 10);
        if (!isNaN(value)) {
            updateSetting(settingKey, value);
        } else {
            input.value = storageManager.getSetting(settingKey);
        }
    });

    input.addEventListener('blur', () => {
        const value = parseInt(input.value, 10);
        const min = parseInt(input.min, 10) || 1;
        const max = parseInt(input.max, 10) || 60;
        if (isNaN(value) || value < min) input.value = min;
        if (value > max) input.value = max;
        updateSetting(settingKey, parseInt(input.value, 10));
    });
}

function setupStepButtons(decreaseBtn, increaseBtn, input, settingKey, min, max) {
    decreaseBtn.addEventListener('click', () => {
        const current = parseInt(input.value, 10);
        if (!isNaN(current) && current > min) {
            input.value = current - 1;
            updateSetting(settingKey, current - 1);
        }
    });

    increaseBtn.addEventListener('click', () => {
        const current = parseInt(input.value, 10);
        if (!isNaN(current) && current < max) {
            input.value = current + 1;
            updateSetting(settingKey, current + 1);
        }
    });
}

function updateSetting(key, value) {
    storageManager.updateSettings({ [key]: value });
    isSettingsChanged = true;

    // Update timer config if timer exists
    if (timer) {
        const configUpdate = {};
        switch (key) {
            case 'workDuration':
                configUpdate.workDuration = value * 60;
                break;
            case 'shortBreakDuration':
                configUpdate.shortBreakDuration = value * 60;
                break;
            case 'longBreakDuration':
                configUpdate.longBreakDuration = value * 60;
                break;
            case 'sessionsUntilLongBreak':
                configUpdate.sessionsUntilLongBreak = value;
                break;
            case 'autoStartBreaks':
                configUpdate.autoStartBreaks = value;
                break;
            case 'autoStartWork':
                configUpdate.autoStartWork = value;
                break;
        }
        if (Object.keys(configUpdate).length > 0) {
            timer.updateConfig(configUpdate);
            // Update display if idle
            if (timer.state === TimerState.IDLE) {
                updateTimerDisplay(timer.getState());
            }
        }
    }
}

// --- Control Handlers ---

function handleStartClick() {
    if (timer.state === TimerState.IDLE || timer.state === TimerState.COMPLETED) {
        timer.start();
    } else if (timer.state === TimerState.PAUSED) {
        timer.start(); // Resume
    }
}

function handlePauseClick() {
    if (timer.state === TimerState.RUNNING) {
        timer.pause();
    }
}

function handleResetClick() {
    timer.reset();
    updateTimerDisplay(timer.getState());
    updateSessionDisplay(SessionType.WORK);
}

// --- Keyboard Shortcuts ---

function handleKeydown(e) {
    // Ignore if typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

    switch (e.code) {
        case 'Space':
            e.preventDefault();
            if (timer.state === TimerState.RUNNING) {
                timer.pause();
            } else {
                timer.start();
            }
            break;
        case 'KeyR':
            e.preventDefault();
            timer.reset();
            updateTimerDisplay(timer.getState());
            updateSessionDisplay(SessionType.WORK);
            break;
        case 'ArrowLeft':
            e.preventDefault();
            adjustCurrentTime(-60); // -1 minute
            break;
        case 'ArrowRight':
            e.preventDefault();
            adjustCurrentTime(60); // +1 minute
            break;
        case 'KeyS':
            e.preventDefault();
            // Focus first setting input
            elements.workDuration.focus();
            break;
    }
}

function adjustCurrentTime(delta) {
    if (timer.state === TimerState.IDLE || timer.state === TimerState.PAUSED) {
        const state = timer.getState();
        const newTime = Math.max(0, state.timeRemaining + delta);
        // We can't directly set timeRemaining, so we'd need to add a method to Timer
        // For now, just update the config for the current session
        const sessionDurations = {
            [SessionType.WORK]: 'workDuration',
            [SessionType.SHORT_BREAK]: 'shortBreakDuration',
            [SessionType.LONG_BREAK]: 'longBreakDuration'
        };
        const key = sessionDurations[timer.currentSession];
        if (key) {
            const newMinutes = Math.round(newTime / 60);
            const min = key === 'workDuration' ? 1 : (key === 'shortBreakDuration' ? 1 : 5);
            const max = key === 'workDuration' ? 60 : (key === 'shortBreakDuration' ? 30 : 60);
            const clamped = Math.max(min, Math.min(max, newMinutes));
            updateSetting(key, clamped);
        }
    }
}

// --- Notification Handling ---

async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.warn('Notifications not supported');
        elements.notificationsEnabled.checked = false;
        updateSetting('notificationsEnabled', false);
        return;
    }

    if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            elements.notificationsEnabled.checked = false;
            updateSetting('notificationsEnabled', false);
        }
    } else if (Notification.permission === 'denied') {
        elements.notificationsEnabled.checked = false;
        updateSetting('notificationsEnabled', false);
    }
}

function showNotification(data) {
    if (Notification.permission !== 'granted') return;

    const titles = {
        [SessionType.WORK]: 'Work Session Complete!',
        [SessionType.SHORT_BREAK]: 'Short Break Over!',
        [SessionType.LONG_BREAK]: 'Long Break Over!'
    };

    const bodies = {
        [SessionType.WORK]: 'Time for a break. Well done!',
        [SessionType.SHORT_BREAK]: 'Ready to get back to work?',
        [SessionType.LONG_BREAK]: 'Long break finished. Let\'s focus!'
    };

    new Notification(titles[data.sessionType] || 'Session Complete', {
        body: bodies[data.sessionType] || 'Your session has ended.',
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">⏱️</text></svg>',
        tag: 'pomodoro-timer',
        requireInteraction: true
    });
}

// --- Visibility & Lifecycle ---

function handleVisibilityChange() {
    if (document.hidden && timer.state === TimerState.RUNNING) {
        // Timer continues running in background via setInterval
        // But we could pause if desired - for now let it run
    }
}

function handleBeforeUnload() {
    // Save any pending state
    if (timer.state === TimerState.RUNNING) {
        // Timer is running, it will continue via setInterval
        // The elapsed time is tracked via startTime
    }
}

// --- Initialize App ---
document.addEventListener('DOMContentLoaded', init);

// Export for debugging
window.pomodoroApp = {
    timer,
    audioManager,
    storageManager
};