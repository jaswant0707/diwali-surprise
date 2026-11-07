/**
 * Diwali Surprise - Faithful Original Fireworks Engine
 * Adapted from Caleb Miller's complete fireworks simulation with continuous auto-launch,
 * sky lighting, mobile responsiveness, and resilient Web Audio integration.
 * Author: Jaswant Yadav (@jaswant_0707)
 */

(function () {
  'use strict';

  // Ensure dependencies are accessible
  const Stage = window.Stage;
  const MyMath = window.MyMath;
  const fscreen = window.fscreen;

  const IS_MOBILE = window.innerWidth <= 640;
  const IS_DESKTOP = window.innerWidth > 800;
  const IS_HEADER = false;

  const IS_HIGH_END_DEVICE = (() => {
    const hwConcurrency = navigator.hardwareConcurrency;
    if (!hwConcurrency) return false;
    const minCount = window.innerWidth <= 1024 ? 4 : 8;
    return hwConcurrency >= minCount;
  })();

  const MAX_WIDTH = 7680;
  const MAX_HEIGHT = 4320;
  const GRAVITY = 0.9;
  let simSpeed = 1;

  function getDefaultScaleFactor() {
    if (IS_MOBILE) return 0.9;
    return 1;
  }

  let stageW, stageH;

  const QUALITY_LOW = 1;
  const QUALITY_NORMAL = 2;
  const QUALITY_HIGH = 3;

  let quality = IS_HIGH_END_DEVICE ? QUALITY_HIGH : (IS_MOBILE ? QUALITY_NORMAL : QUALITY_NORMAL);
  let isLowQuality = quality === QUALITY_LOW;
  let isNormalQuality = quality === QUALITY_NORMAL;
  let isHighQuality = quality === QUALITY_HIGH;

  const SKY_LIGHT_NONE = 0;
  const SKY_LIGHT_DIM = 1;
  const SKY_LIGHT_NORMAL = 2;

  // Festive Diwali Palette
  const COLOR = {
    Red: '#ff0043',
    Green: '#14fc56',
    Blue: '#1e7fff',
    Purple: '#e60aff',
    Gold: '#ffbf36',
    White: '#ffffff'
  };

  const INVISIBLE = '_INVISIBLE_';
  const PI_2 = Math.PI * 2;
  const PI_HALF = Math.PI * 0.5;

  let trailsStage = null;
  let mainStage = null;
  let stages = [];
  let canvasContainerNode = null;
  let stageContainerNode = null;

  // State store
  const store = {
    state: {
      paused: true, // starts paused until user clicks Open the Surprise
      soundEnabled: true,
      menuOpen: false,
      config: {
        quality: String(quality),
        shell: 'Random',
        size: IS_DESKTOP ? '3' : '2',
        autoLaunch: true, // Continuous fireworks show
        finale: false,
        skyLighting: String(SKY_LIGHT_NORMAL),
        hideControls: true,
        longExposure: false,
        scaleFactor: getDefaultScaleFactor()
      }
    },
    setState(nextState) {
      this.state = Object.assign({}, this.state, nextState);
    }
  };

  const isRunning = () => !store.state.paused && !store.state.menuOpen;
  const soundEnabledSelector = () => store.state.soundEnabled;
  const canPlaySoundSelector = () => isRunning() && soundEnabledSelector();
  const qualitySelector = () => +store.state.config.quality;
  const shellNameSelector = () => store.state.config.shell;
  const shellSizeSelector = () => +store.state.config.size;
  const skyLightingSelector = () => +store.state.config.skyLighting;
  const scaleFactorSelector = () => store.state.config.scaleFactor;

  // Audio Manager with Web Audio API and procedural synthesizer fallback
  let audioCtx = null;
  function getAudioContext() {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    return audioCtx;
  }

  // Procedural noise buffer for synthetic sound fallback
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

  const soundManager = {
    baseURL: 'assets/audio/',
    sources: {
      lift: {
        volume: 0.9,
        playbackRateMin: 0.85,
        playbackRateMax: 0.95,
        fileNames: ['lift1.mp3', 'lift2.mp3', 'lift3.mp3'],
        buffers: []
      },
      burst: {
        volume: 1,
        playbackRateMin: 0.8,
        playbackRateMax: 0.9,
        fileNames: ['burst1.mp3', 'burst2.mp3'],
        buffers: []
      },
      burstSmall: {
        volume: 0.25,
        playbackRateMin: 0.8,
        playbackRateMax: 1,
        fileNames: ['burst-sm-1.mp3', 'burst-sm-2.mp3'],
        buffers: []
      },
      crackle: {
        volume: 0.25,
        playbackRateMin: 1,
        playbackRateMax: 1,
        fileNames: ['crackle1.mp3'],
        buffers: []
      },
      crackleSmall: {
        volume: 0.35,
        playbackRateMin: 1,
        playbackRateMax: 1,
        fileNames: ['crackle-sm-1.mp3'],
        buffers: []
      }
    },

    _hasPreloaded: false,
    _isPreloading: false,

    preload() {
      if (this._hasPreloaded || this._isPreloading) return Promise.resolve();
      this._isPreloading = true;
      const ctx = getAudioContext();
      if (!ctx) {
        this._isPreloading = false;
        return Promise.resolve();
      }

      const types = Object.keys(this.sources);
      const allPromises = [];

      types.forEach(type => {
        const source = this.sources[type];
        source.buffers = [];
        source.fileNames.forEach(fileName => {
          const fileURL = this.baseURL + fileName;
          const promise = fetch(fileURL)
            .then(res => {
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              return res.arrayBuffer();
            })
            .then(data => new Promise(resolve => {
              ctx.decodeAudioData(data, buffer => {
                source.buffers.push(buffer);
                resolve(buffer);
              }, (err) => {
                console.warn('Audio decode error:', fileName, err);
                resolve(null);
              });
            }))
            .catch((err) => {
              console.warn('Audio fetch error:', fileName, err);
              return null;
            });
          allPromises.push(promise);
        });
      });

      return Promise.all(allPromises).then(() => {
        this._hasPreloaded = true;
        this._isPreloading = false;
      });
    },

    unlockAudio() {
      const ctx = getAudioContext();
      if (ctx) {
        if (ctx.state === 'suspended') {
          ctx.resume().catch(e => console.warn('Audio resume error during unlock:', e));
        }
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          gain.gain.value = 0.0001;
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(0);
          osc.stop(ctx.currentTime + 0.01);
        } catch (e) {}
      }
      this.preload();
    },

    resumeAll() {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(e => console.warn('Audio resume error:', e));
      }
      this.preload();
    },

    pauseAll() {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'running') {
        ctx.suspend().catch(e => console.warn('Audio suspend error:', e));
      }
    },

    _lastSmallBurstTime: 0,

    synthesizeSound(type, scale = 1) {
      const ctx = getAudioContext();
      if (!ctx || ctx.state !== 'running' || !canPlaySoundSelector()) return;

      const now = ctx.currentTime;
      const gainNode = ctx.createGain();
      gainNode.connect(ctx.destination);

      if (type === 'lift') {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(700, now + 0.45);
        gainNode.gain.setValueAtTime(0.01, now);
        gainNode.gain.linearRampToValueAtTime(0.12 * scale, now + 0.2);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.connect(gainNode);
        osc.start(now);
        osc.stop(now + 0.5);
      } else if (type === 'burst' || type === 'burstSmall') {
        const isSmall = type === 'burstSmall';
        const duration = isSmall ? 0.3 : 0.65;
        const vol = (isSmall ? 0.2 : 0.6) * scale;

        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(isSmall ? 180 : 110, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + duration);

        const oscGain = ctx.createGain();
        oscGain.gain.setValueAtTime(vol, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(oscGain);
        oscGain.connect(gainNode);
        osc.start(now);
        osc.stop(now + duration);

        const noise = getNoiseBuffer(ctx);
        if (noise) {
          const noiseSrc = ctx.createBufferSource();
          noiseSrc.buffer = noise;
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(isSmall ? 1000 : 700, now);
          filter.frequency.exponentialRampToValueAtTime(80, now + duration);

          const noiseGain = ctx.createGain();
          noiseGain.gain.setValueAtTime(vol * 0.7, now);
          noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.8);

          noiseSrc.connect(filter);
          filter.connect(noiseGain);
          noiseGain.connect(gainNode);
          noiseSrc.start(now);
          noiseSrc.stop(now + duration);
        }
      } else if (type === 'crackle' || type === 'crackleSmall') {
        const noise = getNoiseBuffer(ctx);
        if (noise) {
          const noiseSrc = ctx.createBufferSource();
          noiseSrc.buffer = noise;
          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(2600, now);
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
      scale = MyMath.clamp(scale, 0, 1);
      if (!canPlaySoundSelector() || simSpeed < 0.95) return;

      if (type === 'burstSmall') {
        const now = Date.now();
        if (now - this._lastSmallBurstTime < 20) return;
        this._lastSmallBurstTime = now;
      }

      const source = this.sources[type];
      if (!source) return;

      const ctx = getAudioContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      // If decoded audio buffers exist, play them
      if (source.buffers && source.buffers.length > 0) {
        try {
          const initialVolume = source.volume;
          const initialPlaybackRate = MyMath.random(source.playbackRateMin, source.playbackRateMax);
          const scaledVolume = initialVolume * scale;
          const scaledPlaybackRate = initialPlaybackRate * (2 - scale);

          const gainNode = ctx.createGain();
          gainNode.gain.value = scaledVolume;

          const buffer = MyMath.randomChoice(source.buffers);
          const bufferSource = ctx.createBufferSource();
          bufferSource.playbackRate.value = scaledPlaybackRate;
          bufferSource.buffer = buffer;
          bufferSource.connect(gainNode);
          gainNode.connect(ctx.destination);
          bufferSource.start(0);
          return;
        } catch (e) {}
      }

      // Resilient fallback synthesizer
      this.synthesizeSound(type, scale);
    }
  };

  // Color Derivations
  const COLOR_NAMES = Object.keys(COLOR);
  const COLOR_CODES = COLOR_NAMES.map(colorName => COLOR[colorName]);
  const COLOR_CODES_W_INVIS = [...COLOR_CODES, INVISIBLE];
  const COLOR_TUPLES = {};
  COLOR_CODES.forEach(hex => {
    COLOR_TUPLES[hex] = {
      r: parseInt(hex.substr(1, 2), 16),
      g: parseInt(hex.substr(3, 2), 16),
      b: parseInt(hex.substr(5, 2), 16),
    };
  });

  function randomColorSimple() {
    return COLOR_CODES[(Math.random() * COLOR_CODES.length) | 0];
  }

  let lastColor;
  function randomColor(options) {
    const notSame = options && options.notSame;
    const notColor = options && options.notColor;
    const limitWhite = options && options.limitWhite;
    let color = randomColorSimple();

    if (limitWhite && color === COLOR.White && Math.random() < 0.6) {
      color = randomColorSimple();
    }

    if (notSame) {
      while (color === lastColor) {
        color = randomColorSimple();
      }
    } else if (notColor) {
      while (color === notColor) {
        color = randomColorSimple();
      }
    }

    lastColor = color;
    return color;
  }

  function whiteOrGold() {
    return Math.random() < 0.5 ? COLOR.Gold : COLOR.White;
  }

  function makePistilColor(shellColor) {
    return (shellColor === COLOR.White || shellColor === COLOR.Gold)
      ? randomColor({ notColor: shellColor })
      : whiteOrGold();
  }

  // Shell Types
  const crysanthemumShell = (size = 1) => {
    const glitter = Math.random() < 0.25;
    const singleColor = Math.random() < 0.72;
    const color = singleColor ? randomColor({ limitWhite: true }) : [randomColor(), randomColor({ notSame: true })];
    const pistil = singleColor && Math.random() < 0.42;
    const pistilColor = pistil && makePistilColor(color);
    const secondColor = singleColor && (Math.random() < 0.2 || color === COLOR.White) ? pistilColor || randomColor({ notColor: color, limitWhite: true }) : null;
    const streamers = !pistil && color !== COLOR.White && Math.random() < 0.42;
    let starDensity = glitter ? 1.1 : 1.25;
    if (isLowQuality) starDensity *= 0.8;
    if (isHighQuality) starDensity = 1.2;
    return {
      shellSize: size,
      spreadSize: 300 + size * 100,
      starLife: 900 + size * 200,
      starDensity,
      color,
      secondColor,
      glitter: glitter ? 'light' : '',
      glitterColor: whiteOrGold(),
      pistil,
      pistilColor,
      streamers
    };
  };

  const ghostShell = (size = 1) => {
    const shell = crysanthemumShell(size);
    shell.starLife *= 1.5;
    let ghostColor = randomColor({ notColor: COLOR.White });
    shell.streamers = true;
    const pistil = Math.random() < 0.42;
    const pistilColor = pistil && makePistilColor(ghostColor);
    shell.color = INVISIBLE;
    shell.secondColor = ghostColor;
    shell.glitter = '';
    return shell;
  };

  const strobeShell = (size = 1) => {
    const color = randomColor({ limitWhite: true });
    return {
      shellSize: size,
      spreadSize: 280 + size * 92,
      starLife: 1100 + size * 200,
      starLifeVariation: 0.40,
      starDensity: 1.1,
      color,
      glitter: 'light',
      glitterColor: COLOR.White,
      strobe: true,
      strobeColor: Math.random() < 0.5 ? COLOR.White : null,
      pistil: Math.random() < 0.5,
      pistilColor: makePistilColor(color)
    };
  };

  const palmShell = (size = 1) => {
    const color = randomColor();
    const thick = Math.random() < 0.5;
    return {
      shellSize: size,
      color,
      spreadSize: 250 + size * 75,
      starDensity: thick ? 0.15 : 0.4,
      starLife: 1800 + size * 200,
      glitter: thick ? 'thick' : 'heavy'
    };
  };

  const ringShell = (size = 1) => {
    const color = randomColor();
    const pistil = Math.random() < 0.75;
    return {
      shellSize: size,
      ring: true,
      color,
      spreadSize: 300 + size * 100,
      starLife: 900 + size * 200,
      starCount: 2.2 * PI_2 * (size + 1),
      pistil,
      pistilColor: makePistilColor(color),
      glitter: !pistil ? 'light' : '',
      glitterColor: color === COLOR.Gold ? COLOR.Gold : COLOR.White,
      streamers: Math.random() < 0.3
    };
  };

  const crossetteShell = (size = 1) => {
    const color = randomColor({ limitWhite: true });
    return {
      shellSize: size,
      spreadSize: 300 + size * 100,
      starLife: 750 + size * 160,
      starLifeVariation: 0.4,
      starDensity: 0.85,
      color,
      crossette: true,
      pistil: Math.random() < 0.5,
      pistilColor: makePistilColor(color)
    };
  };

  const floralShell = (size = 1) => ({
    shellSize: size,
    spreadSize: 300 + size * 120,
    starDensity: 0.12,
    starLife: 500 + size * 50,
    starLifeVariation: 0.5,
    color: Math.random() < 0.65 ? 'random' : (Math.random() < 0.15 ? randomColor() : [randomColor(), randomColor({ notSame: true })]),
    floral: true
  });

  const fallingLeavesShell = (size = 1) => ({
    shellSize: size,
    color: INVISIBLE,
    spreadSize: 300 + size * 120,
    starDensity: 0.12,
    starLife: 500 + size * 50,
    starLifeVariation: 0.5,
    glitter: 'medium',
    glitterColor: COLOR.Gold,
    fallingLeaves: true
  });

  const willowShell = (size = 1) => ({
    shellSize: size,
    spreadSize: 300 + size * 100,
    starDensity: 0.6,
    starLife: 3000 + size * 300,
    glitter: 'willow',
    glitterColor: COLOR.Gold,
    color: INVISIBLE
  });

  const crackleShell = (size = 1) => {
    const color = Math.random() < 0.75 ? COLOR.Gold : randomColor();
    return {
      shellSize: size,
      spreadSize: 380 + size * 75,
      starDensity: isLowQuality ? 0.65 : 1,
      starLife: 600 + size * 100,
      starLifeVariation: 0.32,
      glitter: 'light',
      glitterColor: COLOR.Gold,
      color,
      crackle: true,
      pistil: Math.random() < 0.65,
      pistilColor: makePistilColor(color)
    };
  };

  const horsetailShell = (size = 1) => {
    const color = randomColor();
    return {
      shellSize: size,
      horsetail: true,
      color,
      spreadSize: 250 + size * 38,
      starDensity: 0.9,
      starLife: 2500 + size * 300,
      glitter: 'medium',
      glitterColor: Math.random() < 0.5 ? whiteOrGold() : color,
      strobe: color === COLOR.White
    };
  };

  const shellTypes = {
    'Random': randomShell,
    'Crackle': crackleShell,
    'Crossette': crossetteShell,
    'Crysanthemum': crysanthemumShell,
    'Falling Leaves': fallingLeavesShell,
    'Floral': floralShell,
    'Ghost': ghostShell,
    'Horse Tail': horsetailShell,
    'Palm': palmShell,
    'Ring': ringShell,
    'Strobe': strobeShell,
    'Willow': willowShell
  };

  const shellNames = Object.keys(shellTypes);

  function randomShellName() {
    return Math.random() < 0.5 ? 'Crysanthemum' : shellNames[(Math.random() * (shellNames.length - 1) + 1) | 0];
  }

  function randomShell(size) {
    return shellTypes[randomShellName()](size);
  }

  function shellFromConfig(size) {
    return shellTypes[shellNameSelector()](size);
  }

  const fastShellBlacklist = ['Falling Leaves', 'Floral', 'Willow'];
  function randomFastShell() {
    const isRandom = shellNameSelector() === 'Random';
    let shellName = isRandom ? randomShellName() : shellNameSelector();
    if (isRandom) {
      while (fastShellBlacklist.includes(shellName)) {
        shellName = randomShellName();
      }
    }
    return shellTypes[shellName];
  }

  function fitShellPositionInBoundsH(position) {
    const edge = 0.18;
    return (1 - edge * 2) * position + edge;
  }

  function fitShellPositionInBoundsV(position) {
    return position * 0.75;
  }

  function getRandomShellPositionH() {
    return fitShellPositionInBoundsH(Math.random());
  }

  function getRandomShellPositionV() {
    return fitShellPositionInBoundsV(Math.random());
  }

  function launchShellFromConfig(event) {
    const shell = new Shell(shellFromConfig(shellSizeSelector()));
    const w = mainStage.width;
    const h = mainStage.height;
    shell.launch(
      event ? event.x / w : getRandomShellPositionH(),
      event ? 1 - event.y / h : getRandomShellPositionV()
    );
  }

  // Sequences
  function seqRandomShell() {
    const size = shellSizeSelector();
    const shell = new Shell(shellFromConfig(size));
    shell.launch(getRandomShellPositionH(), getRandomShellPositionV());
    return 2000;
  }

  function seqTwoRandom() {
    const size = shellSizeSelector();
    const shell1 = new Shell(shellFromConfig(size));
    const shell2 = new Shell(shellFromConfig(size));
    const leftX = fitShellPositionInBoundsH(Math.random() * 0.45);
    const rightX = fitShellPositionInBoundsH(0.55 + Math.random() * 0.45);
    shell1.launch(leftX, getRandomShellPositionV());
    setTimeout(() => {
      shell2.launch(rightX, getRandomShellPositionV());
    }, 200);
    return 2600;
  }

  function seqTriple() {
    const size = shellSizeSelector();
    const shell1 = new Shell(shellFromConfig(size));
    const shell2 = new Shell(shellFromConfig(size));
    const shell3 = new Shell(shellFromConfig(size));
    shell1.launch(fitShellPositionInBoundsH(0.2), fitShellPositionInBoundsV(0.6));
    setTimeout(() => shell2.launch(fitShellPositionInBoundsH(0.5), fitShellPositionInBoundsV(0.8)), 200);
    setTimeout(() => shell3.launch(fitShellPositionInBoundsH(0.8), fitShellPositionInBoundsV(0.6)), 400);
    return 3000;
  }

  function seqPyramid() {
    const barrageCountHalf = IS_DESKTOP ? 6 : 4;
    const count = barrageCountHalf * 2;
    let delay = 0;
    for (let i = 0; i < count; i++) {
      const offset = (i + 1) / count / 2;
      const delayOffset = Math.random() * 30 + 30;
      setTimeout(() => {
        const shell = new Shell(crysanthemumShell(shellSizeSelector()));
        shell.launch(0.5 + offset, 0.4 + offset * 0.5);
      }, delay);
      setTimeout(() => {
        const shell = new Shell(crysanthemumShell(shellSizeSelector()));
        shell.launch(0.5 - offset, 0.4 + offset * 0.5);
      }, delay + delayOffset);
      delay += 200;
    }
    return 3400 + barrageCountHalf * 250;
  }

  function seqSmallBarrage() {
    seqSmallBarrage.lastCalled = Date.now();
    const barrageCount = IS_DESKTOP ? 11 : 5;
    const specialIndex = IS_DESKTOP ? 3 : 1;
    const shellSize = Math.max(0, shellSizeSelector() - 1);
    const randomMainShell = Math.random() < 0.78 ? crysanthemumShell : ringShell;
    const randomSpecialShell = randomFastShell();

    function launchShell(x, useSpecial) {
      const isRandom = shellNameSelector() === 'Random';
      let shellType = isRandom
        ? (useSpecial ? randomSpecialShell : randomMainShell)
        : shellTypes[shellNameSelector()];
      const shell = new Shell(shellType(shellSize));
      const height = (Math.cos(x * 5 * Math.PI + PI_HALF) + 1) / 2;
      shell.launch(x, height * 0.75);
    }

    let count = 0;
    let delay = 0;
    while (count < barrageCount) {
      if (count === 0) {
        launchShell(0.5, false);
        count += 1;
      } else {
        const offset = (count + 1) / barrageCount / 2;
        const delayOffset = Math.random() * 30 + 30;
        const useSpecial = count === specialIndex;
        setTimeout(() => {
          launchShell(0.5 + offset, useSpecial);
        }, delay);
        setTimeout(() => {
          launchShell(0.5 - offset, useSpecial);
        }, delay + delayOffset);
        count += 2;
      }
      delay += 200;
    }
    return 3400 + barrageCount * 120;
  }
  seqSmallBarrage.cooldown = 15000;
  seqSmallBarrage.lastCalled = Date.now();

  let isFirstSeq = true;
  function startSequence() {
    const size = shellSizeSelector();
    if (isFirstSeq) {
      isFirstSeq = false;
      // Grand celebratory opening: 3 multi-color shells burst across left, center, right
      const shellCenter = new Shell(crysanthemumShell(size));
      const shellLeft = new Shell(shellFromConfig(size));
      const shellRight = new Shell(shellFromConfig(size));
      shellCenter.launch(0.5, 0.7);
      setTimeout(() => shellLeft.launch(0.25, 0.6), 180);
      setTimeout(() => shellRight.launch(0.75, 0.6), 360);
      return 1500;
    }

    const rand = Math.random();
    if (rand < 0.12 && Date.now() - seqSmallBarrage.lastCalled > seqSmallBarrage.cooldown) {
      return seqSmallBarrage();
    }
    if (rand < 0.28) {
      return seqPyramid();
    }
    if (rand < 0.55) {
      return seqTwoRandom();
    } else if (rand < 0.8) {
      return seqTriple();
    } else {
      return seqRandomShell();
    }
  }

  // Particle Collections & Star / Spark Classes
  function createParticleCollection() {
    const collection = {};
    COLOR_CODES_W_INVIS.forEach(color => {
      collection[color] = [];
    });
    return collection;
  }

  const Star = {
    drawWidth: 3,
    airDrag: 0.98,
    airDragHeavy: 0.992,
    active: createParticleCollection(),
    _pool: [],

    _new() {
      return {};
    },

    add(x, y, color, angle, speed, life, speedOffX, speedOffY) {
      const instance = this._pool.pop() || this._new();
      instance.visible = true;
      instance.heavy = false;
      instance.x = x;
      instance.y = y;
      instance.prevX = x;
      instance.prevY = y;
      instance.color = color;
      instance.speedX = Math.sin(angle) * speed + (speedOffX || 0);
      instance.speedY = Math.cos(angle) * speed + (speedOffY || 0);
      instance.life = life;
      instance.fullLife = life;
      instance.spinAngle = Math.random() * PI_2;
      instance.spinSpeed = 0.8;
      instance.spinRadius = 0;
      instance.sparkFreq = 0;
      instance.sparkSpeed = 1;
      instance.sparkTimer = 0;
      instance.sparkColor = color;
      instance.sparkLife = 750;
      instance.sparkLifeVariation = 0.25;
      instance.strobe = false;

      this.active[color].push(instance);
      return instance;
    },

    returnInstance(instance) {
      if (instance.onDeath) instance.onDeath(instance);
      instance.onDeath = null;
      instance.secondColor = null;
      instance.transitionTime = 0;
      instance.colorChanged = false;
      this._pool.push(instance);
    }
  };

  const Spark = {
    drawWidth: 1,
    airDrag: 0.9,
    active: createParticleCollection(),
    _pool: [],

    _new() {
      return {};
    },

    add(x, y, color, angle, speed, life) {
      const instance = this._pool.pop() || this._new();
      instance.x = x;
      instance.y = y;
      instance.prevX = x;
      instance.prevY = y;
      instance.color = color;
      instance.speedX = Math.sin(angle) * speed;
      instance.speedY = Math.cos(angle) * speed;
      instance.life = life;

      this.active[color].push(instance);
      return instance;
    },

    returnInstance(instance) {
      this._pool.push(instance);
    }
  };

  const BurstFlash = {
    active: [],
    _pool: [],

    _new() {
      return {};
    },

    add(x, y, radius) {
      const instance = this._pool.pop() || this._new();
      instance.x = x;
      instance.y = y;
      instance.radius = radius;
      this.active.push(instance);
      return instance;
    },

    returnInstance(instance) {
      this._pool.push(instance);
    }
  };

  function createParticleArc(start, arcLength, count, randomness, particleFactory) {
    const angleDelta = arcLength / count;
    const end = start + arcLength - (angleDelta * 0.5);

    if (end > start) {
      for (let angle = start; angle < end; angle = angle + angleDelta) {
        particleFactory(angle + Math.random() * angleDelta * randomness);
      }
    } else {
      for (let angle = start; angle > end; angle = angle + angleDelta) {
        particleFactory(angle + Math.random() * angleDelta * randomness);
      }
    }
  }

  function createBurst(count, particleFactory, startAngle = 0, arcLength = PI_2) {
    const R = 0.5 * Math.sqrt(count / Math.PI);
    const C = 2 * R * Math.PI;
    const C_HALF = C / 2;

    for (let i = 0; i <= C_HALF; i++) {
      const ringAngle = i / C_HALF * PI_HALF;
      const ringSize = Math.cos(ringAngle);
      const partsPerFullRing = C * ringSize;
      const partsPerArc = partsPerFullRing * (arcLength / PI_2);

      const angleInc = PI_2 / partsPerFullRing;
      const angleOffset = Math.random() * angleInc + startAngle;
      const maxRandomAngleOffset = angleInc * 0.33;

      for (let j = 0; j < partsPerArc; j++) {
        const randomAngleOffset = Math.random() * maxRandomAngleOffset;
        let angle = angleInc * j + angleOffset + randomAngleOffset;
        particleFactory(angle, ringSize);
      }
    }
  }

  function crossetteEffect(star) {
    const startAngle = Math.random() * PI_HALF;
    createParticleArc(startAngle, PI_2, 4, 0.5, (angle) => {
      Star.add(star.x, star.y, star.color, angle, Math.random() * 0.6 + 0.75, 600);
    });
  }

  function floralEffect(star) {
    const count = 12 + 6 * quality;
    createBurst(count, (angle, speedMult) => {
      Star.add(star.x, star.y, star.color, angle, speedMult * 2.4, 1000 + Math.random() * 300, star.speedX, star.speedY);
    });
    BurstFlash.add(star.x, star.y, 46);
    soundManager.playSound('burstSmall');
  }

  function fallingLeavesEffect(star) {
    createBurst(7, (angle, speedMult) => {
      const newStar = Star.add(star.x, star.y, INVISIBLE, angle, speedMult * 2.4, 2400 + Math.random() * 600, star.speedX, star.speedY);
      newStar.sparkColor = COLOR.Gold;
      newStar.sparkFreq = 144 / quality;
      newStar.sparkSpeed = 0.28;
      newStar.sparkLife = 750;
      newStar.sparkLifeVariation = 3.2;
    });
    BurstFlash.add(star.x, star.y, 46);
    soundManager.playSound('burstSmall');
  }

  function crackleEffect(star) {
    const count = isHighQuality ? 32 : 16;
    createParticleArc(0, PI_2, count, 1.8, (angle) => {
      Spark.add(star.x, star.y, COLOR.Gold, angle, Math.pow(Math.random(), 0.45) * 2.4, 300 + Math.random() * 200);
    });
  }

  class Shell {
    constructor(options) {
      Object.assign(this, options);
      this.starLifeVariation = options.starLifeVariation || 0.125;
      this.color = options.color || randomColor();
      this.glitterColor = options.glitterColor || this.color;

      if (!this.starCount) {
        const density = options.starDensity || 1;
        const scaledSize = this.spreadSize / 54;
        this.starCount = Math.max(6, scaledSize * scaledSize * density);
      }
    }

    launch(position, launchHeight) {
      const width = stageW;
      const height = stageH;
      const hpad = 60;
      const vpad = 50;
      const minHeightPercent = 0.45;
      const minHeight = height - height * minHeightPercent;

      const launchX = position * (width - hpad * 2) + hpad;
      const launchY = height;
      const burstY = minHeight - (launchHeight * (minHeight - vpad));

      const launchDistance = launchY - burstY;
      const launchVelocity = Math.pow(launchDistance * 0.04, 0.64);

      const comet = this.comet = Star.add(
        launchX,
        launchY,
        typeof this.color === 'string' && this.color !== 'random' ? this.color : COLOR.White,
        Math.PI,
        launchVelocity * (this.horsetail ? 1.2 : 1),
        launchVelocity * (this.horsetail ? 100 : 400)
      );

      comet.heavy = true;
      comet.spinRadius = MyMath.random(0.32, 0.85);
      comet.sparkFreq = 32 / quality;
      if (isHighQuality) comet.sparkFreq = 8;
      comet.sparkLife = 320;
      comet.sparkLifeVariation = 3;

      if (this.glitter === 'willow' || this.fallingLeaves) {
        comet.sparkFreq = 20 / quality;
        comet.sparkSpeed = 0.5;
        comet.sparkLife = 500;
      }
      if (this.color === INVISIBLE) {
        comet.sparkColor = COLOR.Gold;
      }

      if (Math.random() > 0.4 && !this.horsetail) {
        comet.secondColor = INVISIBLE;
        comet.transitionTime = Math.pow(Math.random(), 1.5) * 700 + 500;
      }

      comet.onDeath = () => this.burst(comet.x, comet.y);
      soundManager.playSound('lift');
    }

    burst(x, y) {
      const speed = this.spreadSize / 96;
      let color, onDeath, sparkFreq, sparkSpeed, sparkLife;
      let sparkLifeVariation = 0.25;
      let playedDeathSound = false;

      if (this.crossette) {
        onDeath = (star) => {
          if (!playedDeathSound) {
            soundManager.playSound('crackleSmall');
            playedDeathSound = true;
          }
          crossetteEffect(star);
        };
      }
      if (this.crackle) {
        onDeath = (star) => {
          if (!playedDeathSound) {
            soundManager.playSound('crackle');
            playedDeathSound = true;
          }
          crackleEffect(star);
        };
      }
      if (this.floral) onDeath = floralEffect;
      if (this.fallingLeaves) onDeath = fallingLeavesEffect;

      if (this.glitter === 'light') {
        sparkFreq = 400;
        sparkSpeed = 0.3;
        sparkLife = 300;
        sparkLifeVariation = 2;
      } else if (this.glitter === 'medium') {
        sparkFreq = 200;
        sparkSpeed = 0.44;
        sparkLife = 700;
        sparkLifeVariation = 2;
      } else if (this.glitter === 'heavy') {
        sparkFreq = 80;
        sparkSpeed = 0.8;
        sparkLife = 1400;
        sparkLifeVariation = 2;
      } else if (this.glitter === 'thick') {
        sparkFreq = 16;
        sparkSpeed = isHighQuality ? 1.65 : 1.5;
        sparkLife = 1400;
        sparkLifeVariation = 3;
      } else if (this.glitter === 'streamer') {
        sparkFreq = 32;
        sparkSpeed = 1.05;
        sparkLife = 620;
        sparkLifeVariation = 2;
      } else if (this.glitter === 'willow') {
        sparkFreq = 120;
        sparkSpeed = 0.34;
        sparkLife = 1400;
        sparkLifeVariation = 3.8;
      }

      sparkFreq = sparkFreq / quality;

      const starFactory = (angle, speedMult) => {
        const standardInitialSpeed = this.spreadSize / 1800;
        const star = Star.add(
          x,
          y,
          color || randomColor(),
          angle,
          speedMult * speed,
          this.starLife + Math.random() * this.starLife * this.starLifeVariation,
          this.horsetail ? (this.comet && this.comet.speedX) : 0,
          this.horsetail ? (this.comet && this.comet.speedY) : -standardInitialSpeed
        );

        if (this.secondColor) {
          star.transitionTime = this.starLife * (Math.random() * 0.05 + 0.32);
          star.secondColor = this.secondColor;
        }

        if (this.strobe) {
          star.transitionTime = this.starLife * (Math.random() * 0.08 + 0.46);
          star.strobe = true;
          star.strobeFreq = Math.random() * 20 + 40;
          if (this.strobeColor) {
            star.secondColor = this.strobeColor;
          }
        }

        star.onDeath = onDeath;

        if (this.glitter) {
          star.sparkFreq = sparkFreq;
          star.sparkSpeed = sparkSpeed;
          star.sparkLife = sparkLife;
          star.sparkLifeVariation = sparkLifeVariation;
          star.sparkColor = this.glitterColor;
          star.sparkTimer = Math.random() * star.sparkFreq;
        }
      };

      if (typeof this.color === 'string') {
        color = this.color === 'random' ? null : this.color;
        if (this.ring) {
          const ringStartAngle = Math.random() * Math.PI;
          const ringSquash = Math.pow(Math.random(), 2) * 0.85 + 0.15;
          createParticleArc(0, PI_2, this.starCount, 0, angle => {
            const initSpeedX = Math.sin(angle) * speed * ringSquash;
            const initSpeedY = Math.cos(angle) * speed;
            const newSpeed = MyMath.pointDist(0, 0, initSpeedX, initSpeedY);
            const newAngle = MyMath.pointAngle(0, 0, initSpeedX, initSpeedY) + ringStartAngle;
            const star = Star.add(
              x,
              y,
              color,
              newAngle,
              newSpeed,
              this.starLife + Math.random() * this.starLife * this.starLifeVariation
            );
            if (this.glitter) {
              star.sparkFreq = sparkFreq;
              star.sparkSpeed = sparkSpeed;
              star.sparkLife = sparkLife;
              star.sparkLifeVariation = sparkLifeVariation;
              star.sparkColor = this.glitterColor;
              star.sparkTimer = Math.random() * star.sparkFreq;
            }
          });
        } else {
          createBurst(this.starCount, starFactory);
        }
      } else if (Array.isArray(this.color)) {
        if (Math.random() < 0.5) {
          const start = Math.random() * Math.PI;
          const start2 = start + Math.PI;
          const arc = Math.PI;
          color = this.color[0];
          createBurst(this.starCount, starFactory, start, arc);
          color = this.color[1];
          createBurst(this.starCount, starFactory, start2, arc);
        } else {
          color = this.color[0];
          createBurst(this.starCount / 2, starFactory);
          color = this.color[1];
          createBurst(this.starCount / 2, starFactory);
        }
      }

      if (this.pistil) {
        const innerShell = new Shell({
          spreadSize: this.spreadSize * 0.5,
          starLife: this.starLife * 0.6,
          starLifeVariation: this.starLifeVariation,
          starDensity: 1.4,
          color: this.pistilColor,
          glitter: 'light',
          glitterColor: this.pistilColor === COLOR.Gold ? COLOR.Gold : COLOR.White,
          isSubBurst: true
        });
        innerShell.burst(x, y);
      }

      if (this.streamers) {
        const innerShell = new Shell({
          spreadSize: this.spreadSize * 0.9,
          starLife: this.starLife * 0.8,
          starLifeVariation: this.starLifeVariation,
          starCount: Math.floor(Math.max(6, this.spreadSize / 45)),
          color: COLOR.White,
          glitter: 'streamer',
          isSubBurst: true
        });
        innerShell.burst(x, y);
      }

      BurstFlash.add(x, y, this.spreadSize / 4);

      if (!this.isSubBurst) {
        const maxDiff = 2;
        const sizeDifferenceFromMaxSize = Math.min(maxDiff, shellSizeSelector() - (this.shellSize || 2));
        const soundScale = (1 - sizeDifferenceFromMaxSize / maxDiff) * 0.3 + 0.7;
        soundManager.playSound('burst', soundScale);
      }
    }
  }

  // Animation Loop Globals
  let currentFrame = 0;
  let autoLaunchTime = 0;

  function updateGlobals(timeStep) {
    currentFrame++;
    if (store.state.config.autoLaunch) {
      autoLaunchTime -= timeStep;
      if (autoLaunchTime <= 0) {
        const nextCadence = startSequence() * 0.55;
        autoLaunchTime = Math.max(750, Math.min(2200, nextCadence));
      }
    }
  }

  function update(frameTime, lag) {
    if (!isRunning()) return;

    const width = stageW;
    const height = stageH;
    const timeStep = frameTime * simSpeed;
    const speed = simSpeed * lag;

    updateGlobals(timeStep);

    const starDrag = 1 - (1 - Star.airDrag) * speed;
    const starDragHeavy = 1 - (1 - Star.airDragHeavy) * speed;
    const sparkDrag = 1 - (1 - Spark.airDrag) * speed;
    const gAcc = (timeStep / 1000) * GRAVITY;

    COLOR_CODES_W_INVIS.forEach(color => {
      const stars = Star.active[color];
      for (let i = stars.length - 1; i >= 0; i--) {
        const star = stars[i];
        if (star.updateFrame === currentFrame) continue;
        star.updateFrame = currentFrame;

        star.life -= timeStep;
        if (star.life <= 0) {
          stars.splice(i, 1);
          Star.returnInstance(star);
        } else {
          const burnRate = Math.pow(star.life / star.fullLife, 0.5);
          const burnRateInverse = 1 - burnRate;

          star.prevX = star.x;
          star.prevY = star.y;
          star.x += star.speedX * speed;
          star.y += star.speedY * speed;

          if (!star.heavy) {
            star.speedX *= starDrag;
            star.speedY *= starDrag;
          } else {
            star.speedX *= starDragHeavy;
            star.speedY *= starDragHeavy;
          }
          star.speedY += gAcc;

          if (star.spinRadius) {
            star.spinAngle += star.spinSpeed * speed;
            star.x += Math.sin(star.spinAngle) * star.spinRadius * speed;
            star.y += Math.cos(star.spinAngle) * star.spinRadius * speed;
          }

          if (star.sparkFreq) {
            star.sparkTimer -= timeStep;
            while (star.sparkTimer < 0) {
              star.sparkTimer += star.sparkFreq * 0.75 + star.sparkFreq * burnRateInverse * 4;
              Spark.add(
                star.x,
                star.y,
                star.sparkColor,
                Math.random() * PI_2,
                Math.random() * star.sparkSpeed * burnRate,
                star.sparkLife * 0.8 + Math.random() * star.sparkLifeVariation * star.sparkLife
              );
            }
          }

          if (star.life < star.transitionTime) {
            if (star.secondColor && !star.colorChanged) {
              star.colorChanged = true;
              star.color = star.secondColor;
              stars.splice(i, 1);
              Star.active[star.secondColor].push(star);
              if (star.secondColor === INVISIBLE) {
                star.sparkFreq = 0;
              }
            }

            if (star.strobe) {
              star.visible = Math.floor(star.life / star.strobeFreq) % 3 === 0;
            }
          }
        }
      }

      const sparks = Spark.active[color];
      for (let i = sparks.length - 1; i >= 0; i--) {
        const spark = sparks[i];
        spark.life -= timeStep;
        if (spark.life <= 0) {
          sparks.splice(i, 1);
          Spark.returnInstance(spark);
        } else {
          spark.prevX = spark.x;
          spark.prevY = spark.y;
          spark.x += spark.speedX * speed;
          spark.y += spark.speedY * speed;
          spark.speedX *= sparkDrag;
          spark.speedY *= sparkDrag;
          spark.speedY += gAcc;
        }
      }
    });

    render(speed);
  }

  // Sky Lighting
  const currentSkyColor = { r: 0, g: 0, b: 0 };
  const targetSkyColor = { r: 0, g: 0, b: 0 };
  function colorSky(speed) {
    if (!canvasContainerNode) return;
    const maxSkySaturation = skyLightingSelector() * 15;
    const maxStarCount = 500;
    let totalStarCount = 0;
    targetSkyColor.r = 0;
    targetSkyColor.g = 0;
    targetSkyColor.b = 0;

    COLOR_CODES.forEach(color => {
      const tuple = COLOR_TUPLES[color];
      const count = Star.active[color].length;
      totalStarCount += count;
      targetSkyColor.r += tuple.r * count;
      targetSkyColor.g += tuple.g * count;
      targetSkyColor.b += tuple.g * count;
    });

    const intensity = Math.pow(Math.min(1, totalStarCount / maxStarCount), 0.3);
    const maxColorComponent = Math.max(1, targetSkyColor.r, targetSkyColor.g, targetSkyColor.b);
    targetSkyColor.r = targetSkyColor.r / maxColorComponent * maxSkySaturation * intensity;
    targetSkyColor.g = targetSkyColor.g / maxColorComponent * maxSkySaturation * intensity;
    targetSkyColor.b = targetSkyColor.b / maxColorComponent * maxSkySaturation * intensity;

    const colorChange = 10;
    currentSkyColor.r += (targetSkyColor.r - currentSkyColor.r) / colorChange * speed;
    currentSkyColor.g += (targetSkyColor.g - currentSkyColor.g) / colorChange * speed;
    currentSkyColor.b += (targetSkyColor.b - currentSkyColor.b) / colorChange * speed;

    canvasContainerNode.style.backgroundColor = `rgb(${currentSkyColor.r | 0}, ${currentSkyColor.g | 0}, ${currentSkyColor.b | 0})`;
  }

  function render(speed) {
    if (!trailsStage || !mainStage) return;

    const { dpr } = mainStage;
    const width = stageW;
    const height = stageH;
    const trailsCtx = trailsStage.ctx;
    const mainCtx = mainStage.ctx;

    if (skyLightingSelector() !== SKY_LIGHT_NONE) {
      colorSky(speed);
    }

    const scaleFactor = scaleFactorSelector();
    trailsCtx.scale(dpr * scaleFactor, dpr * scaleFactor);
    mainCtx.scale(dpr * scaleFactor, dpr * scaleFactor);

    trailsCtx.globalCompositeOperation = 'source-over';
    trailsCtx.fillStyle = `rgba(0, 0, 0, ${0.175 * speed})`;
    trailsCtx.fillRect(0, 0, width, height);

    mainCtx.clearRect(0, 0, width, height);

    // Draw burst flashes
    while (BurstFlash.active.length) {
      const bf = BurstFlash.active.pop();
      const burstGradient = trailsCtx.createRadialGradient(bf.x, bf.y, 0, bf.x, bf.y, bf.radius);
      burstGradient.addColorStop(0.024, 'rgba(255, 255, 255, 1)');
      burstGradient.addColorStop(0.125, 'rgba(255, 160, 20, 0.2)');
      burstGradient.addColorStop(0.32, 'rgba(255, 140, 20, 0.11)');
      burstGradient.addColorStop(1, 'rgba(255, 120, 20, 0)');
      trailsCtx.fillStyle = burstGradient;
      trailsCtx.fillRect(bf.x - bf.radius, bf.y - bf.radius, bf.radius * 2, bf.radius * 2);
      BurstFlash.returnInstance(bf);
    }

    trailsCtx.globalCompositeOperation = 'lighten';

    // Draw stars
    trailsCtx.lineWidth = Star.drawWidth;
    trailsCtx.lineCap = isLowQuality ? 'square' : 'round';
    mainCtx.strokeStyle = '#fff';
    mainCtx.lineWidth = 1;
    mainCtx.beginPath();
    COLOR_CODES.forEach(color => {
      const stars = Star.active[color];
      trailsCtx.strokeStyle = color;
      trailsCtx.beginPath();
      stars.forEach(star => {
        if (star.visible) {
          trailsCtx.moveTo(star.x, star.y);
          trailsCtx.lineTo(star.prevX, star.prevY);
          mainCtx.moveTo(star.x, star.y);
          mainCtx.lineTo(star.x - star.speedX * 1.6, star.y - star.speedY * 1.6);
        }
      });
      trailsCtx.stroke();
    });
    mainCtx.stroke();

    // Draw sparks
    trailsCtx.lineWidth = Spark.drawWidth;
    trailsCtx.lineCap = 'butt';
    COLOR_CODES.forEach(color => {
      const sparks = Spark.active[color];
      trailsCtx.strokeStyle = color;
      trailsCtx.beginPath();
      sparks.forEach(spark => {
        trailsCtx.moveTo(spark.x, spark.y);
        trailsCtx.lineTo(spark.prevX, spark.prevY);
      });
      trailsCtx.stroke();
    });

    trailsCtx.setTransform(1, 0, 0, 1, 0, 0);
    mainCtx.setTransform(1, 0, 0, 1, 0, 0);
  }

  function handleResize() {
    if (!trailsStage || !mainStage) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const containerW = Math.min(w, MAX_WIDTH);
    const containerH = w <= 420 ? h : Math.min(h, MAX_HEIGHT);

    if (stageContainerNode) {
      stageContainerNode.style.width = containerW + 'px';
      stageContainerNode.style.height = containerH + 'px';
    }

    stages.forEach(stage => stage.resize(containerW, containerH));

    const scaleFactor = scaleFactorSelector();
    stageW = containerW / scaleFactor;
    stageH = containerH / scaleFactor;
  }

  // Pointer interactions
  function handlePointerStart(event) {
    if (!isRunning()) return;
    if (event.onCanvas) {
      launchShellFromConfig(event);
    }
  }

  let isInitialized = false;

  const FireworksEngine = {
    get isRunning() {
      return isRunning();
    },

    init() {
      if (isInitialized) return;

      const StageClass = window.Stage || Stage;
      if (!StageClass) {
        console.error('Stage.js is not loaded.');
        return;
      }

      stageContainerNode = document.querySelector('.stage-container');
      canvasContainerNode = document.querySelector('.canvas-container');

      trailsStage = new StageClass('trails-canvas');
      mainStage = new StageClass('main-canvas');
      stages = [trailsStage, mainStage];

      Spark.drawWidth = isHighQuality ? 0.75 : 1;

      handleResize();
      window.addEventListener('resize', handleResize);

      mainStage.addEventListener('pointerstart', handlePointerStart);
      mainStage.addEventListener('ticker', update);

      // Visibility change pause/resume for mobile battery & performance
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          soundManager.pauseAll();
        } else if (isRunning()) {
          soundManager.resumeAll();
        }
      });

      // Start preloading audio files in background
      soundManager.preload();

      isInitialized = true;
      console.log('✨ Original FireworksEngine initialized successfully.');
    },

    unlockAudio() {
      soundManager.unlockAudio();
    },

    start() {
      if (!isInitialized) {
        this.init();
      }

      // Unpause simulation
      store.setState({ paused: false, soundEnabled: true });

      // Unlock and resume audio context
      soundManager.resumeAll();

      // Launch immediate initial celebratory shell
      autoLaunchTime = 0;
      console.log('🎇 Fireworks celebration started.');
    },

    pause() {
      store.setState({ paused: true });
      soundManager.pauseAll();
    },

    resume() {
      store.setState({ paused: false });
      soundManager.resumeAll();
    },

    toggleSound(forceState) {
      if (typeof forceState === 'boolean') {
        store.setState({ soundEnabled: forceState });
      } else {
        store.setState({ soundEnabled: !store.state.soundEnabled });
      }
      if (store.state.soundEnabled) {
        soundManager.resumeAll();
      } else {
        soundManager.pauseAll();
      }
      return store.state.soundEnabled;
    },

    launchShell(x, y) {
      if (!mainStage) return;
      const shell = new Shell(shellFromConfig(shellSizeSelector()));
      const w = mainStage.width;
      const h = mainStage.height;
      shell.launch(
        typeof x === 'number' ? x : getRandomShellPositionH(),
        typeof y === 'number' ? y : getRandomShellPositionV()
      );
    },

    getStats() {
      let stars = 0, sparks = 0;
      COLOR_CODES.forEach(c => {
        if (Star.active[c]) stars += Star.active[c].length;
        if (Spark.active[c]) sparks += Spark.active[c].length;
      });
      return {
        running: isRunning(),
        currentFrame,
        stars,
        sparks,
        autoLaunchTime: Math.round(autoLaunchTime)
      };
    }
  };

  window.FireworksEngine = FireworksEngine;
  window.SoundEngine = {
    playSound: (type, scale) => soundManager.playSound(type, scale),
    unlockAudio: () => soundManager.unlockAudio(),
    toggleMute: (force) => !FireworksEngine.toggleSound(force === undefined ? undefined : !force)
  };
})();
