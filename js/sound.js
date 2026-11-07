/**
 * Diwali Surprise - High Performance Audio Engine
 * Handles Web Audio API lifecycle, mobile interaction unlock, and procedural sound fallback.
 * Author: Jaswant Yadav (@jaswant_0707)
 */

(function () {
  'use strict';

  let audioCtx = null;
  let isMuted = false;
  let isUnlocked = false;

  const audioSources = {
    lift: {
      volume: 0.8,
      playbackRateMin: 0.85,
      playbackRateMax: 0.95,
      files: ['lift1.mp3', 'lift2.mp3', 'lift3.mp3'],
      buffers: []
    },
    burst: {
      volume: 1.0,
      playbackRateMin: 0.8,
      playbackRateMax: 0.9,
      files: ['burst1.mp3', 'burst2.mp3'],
      buffers: []
    },
    burstSmall: {
      volume: 0.35,
      playbackRateMin: 0.8,
      playbackRateMax: 1.1,
      files: ['burst-sm-1.mp3', 'burst-sm-2.mp3'],
      buffers: []
    },
    crackle: {
      volume: 0.35,
      playbackRateMin: 0.9,
      playbackRateMax: 1.1,
      files: ['crackle1.mp3'],
      buffers: []
    },
    crackleSmall: {
      volume: 0.4,
      playbackRateMin: 0.9,
      playbackRateMax: 1.2,
      files: ['crackle-sm-1.mp3'],
      buffers: []
    }
  };

  let lastSmallBurstTime = 0;

  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    return audioCtx;
  }

  // Procedural Noise Buffer for synthetic burst/crackle fallback
  let noiseBuffer = null;
  function getNoiseBuffer(ctx) {
    if (!noiseBuffer && ctx) {
      const bufferSize = ctx.sampleRate * 2;
      noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
    }
    return noiseBuffer;
  }

  const SoundEngine = {
    get isMuted() {
      return isMuted;
    },

    get isUnlocked() {
      return isUnlocked;
    },

    /**
     * Call this inside a user interaction handler (such as 'Open the Surprise' click)
     */
    async unlockAudio() {
      const ctx = getAudioContext();
      if (!ctx) return false;

      try {
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }
        isUnlocked = true;
        // Warm up silent pulse for iOS Safari
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.value = 0.0001;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(0);
        osc.stop(ctx.currentTime + 0.05);

        // Preload sound files in the background
        this.preload();
        return true;
      } catch (err) {
        console.warn('AudioContext unlock failed:', err);
        return false;
      }
    },

    toggleMute(forceState) {
      if (typeof forceState === 'boolean') {
        isMuted = forceState;
      } else {
        isMuted = !isMuted;
      }
      return isMuted;
    },

    async preload() {
      const ctx = getAudioContext();
      if (!ctx) return;

      const basePath = 'assets/audio/';
      const types = Object.keys(audioSources);

      for (const type of types) {
        const source = audioSources[type];
        source.buffers = [];
        for (const fileName of source.files) {
          try {
            const resp = await fetch(basePath + fileName);
            if (resp.ok) {
              const arrayBuf = await resp.arrayBuffer();
              ctx.decodeAudioData(arrayBuf, (decoded) => {
                source.buffers.push(decoded);
              }, (decodeErr) => {
                console.warn(`Audio decode failed for ${fileName}:`, decodeErr);
              });
            }
          } catch (e) {
            // Non-blocking: procedural synth will take over
          }
        }
      }
    },

    /**
     * Synthesizes audio procedurally if mp3 buffers failed or haven't loaded yet
     */
    synthesize(type, scale = 1) {
      const ctx = getAudioContext();
      if (!ctx || ctx.state !== 'running' || isMuted) return;

      const now = ctx.currentTime;
      const gainNode = ctx.createGain();
      gainNode.connect(ctx.destination);

      if (type === 'lift') {
        // Whoosh sound: frequency-swept oscillator
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(700, now + 0.45);

        gainNode.gain.setValueAtTime(0.01, now);
        gainNode.gain.linearRampToValueAtTime(0.15 * scale, now + 0.2);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        osc.connect(gainNode);
        osc.start(now);
        osc.stop(now + 0.5);
      } else if (type === 'burst' || type === 'burstSmall') {
        // Explosion thump: low frequency pitch drop + filtered noise
        const isSmall = type === 'burstSmall';
        const duration = isSmall ? 0.35 : 0.7;
        const volume = (isSmall ? 0.2 : 0.6) * scale;

        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(isSmall ? 180 : 120, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + duration);

        const oscGain = ctx.createGain();
        oscGain.gain.setValueAtTime(volume, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(oscGain);
        oscGain.connect(gainNode);
        osc.start(now);
        osc.stop(now + duration);

        // Noise crack
        const noise = getNoiseBuffer(ctx);
        if (noise) {
          const noiseSrc = ctx.createBufferSource();
          noiseSrc.buffer = noise;
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(isSmall ? 1200 : 800, now);
          filter.frequency.exponentialRampToValueAtTime(100, now + duration);

          const noiseGain = ctx.createGain();
          noiseGain.gain.setValueAtTime(volume * 0.7, now);
          noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.8);

          noiseSrc.connect(filter);
          filter.connect(noiseGain);
          noiseGain.connect(gainNode);
          noiseSrc.start(now);
          noiseSrc.stop(now + duration);
        }
      } else if (type === 'crackle' || type === 'crackleSmall') {
        // High frequency pops
        const noise = getNoiseBuffer(ctx);
        if (noise) {
          const noiseSrc = ctx.createBufferSource();
          noiseSrc.buffer = noise;
          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(2500, now);
          filter.Q.value = 3;

          const crackleGain = ctx.createGain();
          crackleGain.gain.setValueAtTime(0.2 * scale, now);
          crackleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

          noiseSrc.connect(filter);
          filter.connect(crackleGain);
          crackleGain.connect(gainNode);
          noiseSrc.start(now);
          noiseSrc.stop(now + 0.15);
        }
      }
    },

    playSound(type, scale = 1) {
      if (isMuted || !isUnlocked) return;
      const ctx = getAudioContext();
      if (!ctx || ctx.state !== 'running') return;

      if (type === 'burstSmall') {
        const now = Date.now();
        if (now - lastSmallBurstTime < 25) return;
        lastSmallBurstTime = now;
      }

      const source = audioSources[type];
      if (!source) return;

      // If buffer is loaded, play it
      if (source.buffers && source.buffers.length > 0) {
        try {
          const buffer = source.buffers[(Math.random() * source.buffers.length) | 0];
          const bufferSource = ctx.createBufferSource();
          const gainNode = ctx.createGain();

          const rate = (Math.random() * (source.playbackRateMax - source.playbackRateMin) + source.playbackRateMin) * (2 - scale);
          bufferSource.playbackRate.value = rate;
          bufferSource.buffer = buffer;

          gainNode.gain.value = Math.max(0, Math.min(1, source.volume * scale));
          bufferSource.connect(gainNode);
          gainNode.connect(ctx.destination);
          bufferSource.start(0);
          return;
        } catch (e) {
          // Fall back to synth
        }
      }

      // Procedural fallback
      this.synthesize(type, scale);
    }
  };

  window.SoundEngine = SoundEngine;
})();
