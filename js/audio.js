/**
 * Audio Module
 * Handles sound notifications using Web Audio API and HTML5 Audio
 */

export class AudioManager {
    constructor() {
        this.audioContext = null;
        this.sounds = new Map();
        this.enabled = true;
        this.volume = 0.5;
        this.currentSound = 'bell';

        // Sound definitions using Web Audio API (synthesized)
        this.soundRecipes = {
            bell: {
                type: 'sine',
                frequency: [523.25, 659.25, 783.99], // C5, E5, G5
                duration: 0.8,
                envelope: { attack: 0.01, decay: 0.3, sustain: 0.1, release: 0.4 },
                gain: 0.3
            },
            chime: {
                type: 'sine',
                frequency: [880, 1108.73, 1318.51], // A5, C#6, E6
                duration: 1.2,
                envelope: { attack: 0.005, decay: 0.4, sustain: 0.05, release: 0.75 },
                gain: 0.25
            },
            ding: {
                type: 'sine',
                frequency: [1046.50], // C6
                duration: 0.5,
                envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.4 },
                gain: 0.4
            },
            alarm: {
                type: 'square',
                frequency: [440, 880], // A4, A5 alternating
                duration: 2.0,
                envelope: { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.1 },
                gain: 0.35,
                repeat: 3,
                repeatDelay: 0.3
            }
        };

        this._initAudioContext();
        this._preloadHtmlAudio();
    }

    /**
     * Initialize Web Audio API context
     */
    _initAudioContext() {
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
        }
    }

    /**
     * Preload HTML5 audio elements as fallback
     */
    _preloadHtmlAudio() {
        const soundFiles = ['bell', 'chime', 'ding', 'alarm'];
        soundFiles.forEach(name => {
            const audio = new Audio();
            audio.preload = 'auto';
            // We'll use synthesized sounds primarily, but keep HTML audio as fallback
            this.sounds.set(name, audio);
        });
    }

    /**
     * Resume audio context (needed for browser autoplay policies)
     */
    async resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }

    /**
     * Set enabled state
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }

    /**
     * Set volume (0-1)
     */
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
    }

    /**
     * Set current sound
     */
    setSound(soundName) {
        if (this.soundRecipes[soundName]) {
            this.currentSound = soundName;
        }
    }

    /**
     * Play notification sound
     */
    async play() {
        if (!this.enabled) return;

        await this.resume();

        if (this.audioContext) {
            this._playSynthesized(this.currentSound);
        } else {
            this._playHtmlFallback(this.currentSound);
        }
    }

    /**
     * Play test sound
     */
    async playTest(soundName) {
        const prevSound = this.currentSound;
        this.currentSound = soundName;
        await this.play();
        this.currentSound = prevSound;
    }

    /**
     * Play synthesized sound using Web Audio API
     */
    _playSynthesized(soundName) {
        const recipe = this.soundRecipes[soundName];
        if (!recipe) return;

        const now = this.audioContext.currentTime;
        const masterGain = this.audioContext.createGain();
        masterGain.gain.value = this.volume * (recipe.gain || 0.3);
        masterGain.connect(this.audioContext.destination);

        const playNote = (frequency, startTime, noteDuration) => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.type = recipe.type;
            oscillator.frequency.value = frequency;

            // ADSR Envelope
            const { attack, decay, sustain, release } = recipe.envelope;
            const peakTime = startTime + attack;
            const decayTime = peakTime + decay;
            const sustainTime = decayTime + (noteDuration * (sustain || 0));
            const releaseTime = startTime + noteDuration;

            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(1, peakTime);
            gainNode.gain.linearRampToValueAtTime(sustain || 0.1, decayTime);
            gainNode.gain.linearRampToValueAtTime(0, releaseTime);

            oscillator.connect(gainNode);
            gainNode.connect(masterGain);

            oscillator.start(startTime);
            oscillator.stop(releaseTime + 0.05);
        };

        if (recipe.repeat && recipe.repeat > 1) {
            // Repeating pattern (for alarm)
            for (let i = 0; i < recipe.repeat; i++) {
                const repeatStart = now + (i * (recipe.duration + (recipe.repeatDelay || 0.3)));
                recipe.frequency.forEach((freq, idx) => {
                    playNote(freq, repeatStart + (idx * 0.1), recipe.duration);
                });
            }
        } else {
            // Single play
            recipe.frequency.forEach((freq, idx) => {
                playNote(freq, now + (idx * 0.1), recipe.duration);
            });
        }
    }

    /**
     * Fallback to HTML5 audio (generates a simple beep using data URI)
     */
    _playHtmlFallback(soundName) {
        // Create a simple beep using data URI since we don't have actual sound files
        const frequencies = {
            bell: 523.25,
            chime: 880,
            ding: 1046.50,
            alarm: 440
        };

        const freq = frequencies[soundName] || 523.25;
        const audio = new Audio(this._generateTone(freq, soundName === 'alarm' ? 2 : 0.5));
        audio.volume = this.volume;
        audio.play().catch(() => {});
    }

    /**
     * Generate a simple tone as data URI
     */
    _generateTone(frequency, duration) {
        const sampleRate = 44100;
        const samples = Math.floor(sampleRate * duration);
        const buffer = new ArrayBuffer(44 + samples * 2);
        const view = new DataView(buffer);

        // WAV header
        const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        writeString(0, 'RIFF');
        view.setUint32(4, 36 + samples * 2, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeString(36, 'data');
        view.setUint32(40, samples * 2, true);

        // Generate sine wave
        for (let i = 0; i < samples; i++) {
            const t = i / sampleRate;
            // Add envelope
            const envelope = Math.min(1, t * 50) * Math.max(0, 1 - t / duration);
            const sample = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3;
            view.setInt16(44 + i * 2, sample * 32767, true);
        }

        const blob = new Blob([buffer], { type: 'audio/wav' });
        return URL.createObjectURL(blob);
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        this.sounds.forEach(audio => {
            audio.pause();
            audio.src = '';
        });
        this.sounds.clear();
    }
}

// Singleton instance
export const audioManager = new AudioManager();