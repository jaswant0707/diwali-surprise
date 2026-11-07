/**
 * Diwali Surprise - Modular Fireworks Engine
 * Adapted from Caleb Miller's fireworks simulation with performance optimizations for mobile,
 * Diwali festive color tuning, and zero UI clutter.
 * Author: Jaswant Yadav (@jaswant_0707)
 */

(function () {
  'use strict';

  const IS_MOBILE = window.innerWidth <= 768;
  const IS_DESKTOP = window.innerWidth > 800;
  const IS_HIGH_END_DEVICE = (() => {
    const hwConcurrency = navigator.hardwareConcurrency;
    if (!hwConcurrency) return false;
    const minCount = window.innerWidth <= 1024 ? 4 : 8;
    return hwConcurrency >= minCount;
  })();

  const MAX_WIDTH = 5120;
  const MAX_HEIGHT = 2880;
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

  let quality = IS_HIGH_END_DEVICE ? QUALITY_HIGH : (IS_MOBILE ? QUALITY_LOW : QUALITY_NORMAL);
  let isLowQuality = quality === QUALITY_LOW;
  let isHighQuality = quality === QUALITY_HIGH;

  // Diwali festive rich palette (Golden & vibrant tones)
  const COLOR = {
    Red: '#ff1744',
    Green: '#00e676',
    Blue: '#2979ff',
    Purple: '#d500f9',
    Gold: '#ffc107',
    Amber: '#ff9100',
    White: '#ffffff'
  };

  const INVISIBLE = '_INVISIBLE_';
  const PI_2 = Math.PI * 2;
  const PI_HALF = Math.PI * 0.5;

  let trailsStage, mainStage, stages;
  let isEngineRunning = false;

  const COLOR_NAMES = Object.keys(COLOR);
  const COLOR_CODES = COLOR_NAMES.map(name => COLOR[name]);
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
    return Math.random() < 0.65 ? COLOR.Gold : COLOR.White;
  }

  function makePistilColor(shellColor) {
    return (shellColor === COLOR.White || shellColor === COLOR.Gold)
      ? randomColor({ notColor: shellColor })
      : whiteOrGold();
  }

  // Shell types
  const crysanthemumShell = (size = 1) => {
    const glitter = Math.random() < 0.35;
    const singleColor = Math.random() < 0.72;
    const color = singleColor ? randomColor({ limitWhite: true }) : [randomColor(), randomColor({ notSame: true })];
    const pistil = singleColor && Math.random() < 0.45;
    const pistilColor = pistil && makePistilColor(color);
    const secondColor = singleColor && (Math.random() < 0.25 || color === COLOR.White) ? pistilColor || randomColor({ notColor: color, limitWhite: true }) : null;
    const streamers = !pistil && color !== COLOR.White && Math.random() < 0.42;
    let starDensity = glitter ? 1.1 : 1.25;
    if (isLowQuality) starDensity *= 0.75;
    if (isHighQuality) starDensity = 1.2;

    return {
      shellSize: size,
      spreadSize: 280 + size * 90,
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
    shell.starLife *= 1.4;
    let ghostColor = randomColor({ notColor: COLOR.White });
    shell.streamers = true;
    const pistil = Math.random() < 0.4;
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
      spreadSize: 260 + size * 85,
      starLife: 1050 + size * 180,
      starLifeVariation: 0.40,
      starDensity: isLowQuality ? 0.8 : 1.1,
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
      spreadSize: 240 + size * 70,
      starDensity: thick ? 0.15 : 0.35,
      starLife: 1600 + size * 200,
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
      spreadSize: 280 + size * 90,
      starLife: 900 + size * 200,
      starCount: (isLowQuality ? 1.5 : 2.2) * PI_2 * (size + 1),
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
      spreadSize: 280 + size * 90,
      starLife: 750 + size * 150,
      starLifeVariation: 0.4,
      starDensity: isLowQuality ? 0.6 : 0.85,
      color,
      crossette: true,
      pistil: Math.random() < 0.5,
      pistilColor: makePistilColor(color)
    };
  };

  const floralShell = (size = 1) => ({
    shellSize: size,
    spreadSize: 280 + size * 100,
    starDensity: 0.12,
    starLife: 500 + size * 50,
    starLifeVariation: 0.5,
    color: Math.random() < 0.65 ? 'random' : (Math.random() < 0.2 ? randomColor() : [randomColor(), randomColor({ notSame: true })]),
    floral: true
  });

  const fallingLeavesShell = (size = 1) => ({
    shellSize: size,
    color: INVISIBLE,
    spreadSize: 280 + size * 100,
    starDensity: 0.12,
    starLife: 500 + size * 50,
    starLifeVariation: 0.5,
    glitter: 'medium',
    glitterColor: COLOR.Gold,
    fallingLeaves: true
  });

  const willowShell = (size = 1) => ({
    shellSize: size,
    spreadSize: 280 + size * 90,
    starDensity: isLowQuality ? 0.4 : 0.6,
    starLife: 2600 + size * 250,
    glitter: 'willow',
    glitterColor: COLOR.Gold,
    color: INVISIBLE
  });

  const crackleShell = (size = 1) => {
    const color = Math.random() < 0.75 ? COLOR.Gold : randomColor();
    return {
      shellSize: size,
      spreadSize: 340 + size * 70,
      starDensity: isLowQuality ? 0.55 : 0.9,
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
      spreadSize: 240 + size * 35,
      starDensity: isLowQuality ? 0.6 : 0.85,
      starLife: 2200 + size * 250,
      glitter: 'medium',
      glitterColor: Math.random() < 0.5 ? whiteOrGold() : color,
      strobe: color === COLOR.White
    };
  };

  const shellTypes = {
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
    return Math.random() < 0.45 ? 'Crysanthemum' : shellNames[(Math.random() * shellNames.length) | 0];
  }

  function randomShell(size) {
    return shellTypes[randomShellName()](size);
  }

  function playSoundSafe(type, scale = 1) {
    if (window.SoundEngine) {
      window.SoundEngine.playSound(type, scale);
    }
  }

  // Particle Collections
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
    drawWidth: isHighQuality ? 0.75 : 1,
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
    const count = 10 + 5 * quality;
    createBurst(count, (angle, speedMult) => {
      Star.add(star.x, star.y, star.color, angle, speedMult * 2.4, 900 + Math.random() * 300, star.speedX, star.speedY);
    });
    BurstFlash.add(star.x, star.y, 44);
    playSoundSafe('burstSmall');
  }

  function fallingLeavesEffect(star) {
    createBurst(6, (angle, speedMult) => {
      const newStar = Star.add(star.x, star.y, INVISIBLE, angle, speedMult * 2.4, 2200 + Math.random() * 600, star.speedX, star.speedY);
      newStar.sparkColor = COLOR.Gold;
      newStar.sparkFreq = 144 / quality;
      newStar.sparkSpeed = 0.28;
      newStar.sparkLife = 750;
      newStar.sparkLifeVariation = 3.2;
    });
    BurstFlash.add(star.x, star.y, 44);
    playSoundSafe('burstSmall');
  }

  function crackleEffect(star) {
    const count = isHighQuality ? 28 : (isLowQuality ? 12 : 18);
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
      const hpad = 50;
      const vpad = 40;
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
      if (isHighQuality) comet.sparkFreq = 10;
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
      playSoundSafe('lift');
    }

    burst(x, y) {
      const speed = this.spreadSize / 96;
      let color, onDeath, sparkFreq, sparkSpeed, sparkLife;
      let sparkLifeVariation = 0.25;
      let playedDeathSound = false;

      if (this.crossette) {
        onDeath = (star) => {
          if (!playedDeathSound) {
            playSoundSafe('crackleSmall');
            playedDeathSound = true;
          }
          crossetteEffect(star);
        };
      }
      if (this.crackle) {
        onDeath = (star) => {
          if (!playedDeathSound) {
            playSoundSafe('crackle');
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
          this.horsetail ? this.comet && this.comet.speedX : 0,
          this.horsetail ? this.comet && this.comet.speedY : -standardInitialSpeed
        );

        if (this.secondColor) {
          star.transitionTime = this.starLife * (Math.random() * 0.05 + 0.32);
          star.secondColor = this.secondColor;
        }

        if (this.strobe) {
          star.transitionTime = this.starLife * (Math.random() * 0.08 + 0.46);
          star.strobe = true;
          star.strobeFreq = Math.random() * 20 + 40;
          if (this.strobeColor) star.secondColor = this.strobeColor;
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
          createParticleArc(0, PI_2, this.starCount, 0, (angle) => {
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
        color = this.color[0];
        createBurst(this.starCount / 2, starFactory);
        color = this.color[1];
        createBurst(this.starCount / 2, starFactory);
      }

      if (this.pistil) {
        const innerShell = new Shell({
          spreadSize: this.spreadSize * 0.5,
          starLife: this.starLife * 0.6,
          starLifeVariation: this.starLifeVariation,
          starDensity: 1.3,
          color: this.pistilColor,
          glitter: 'light',
          glitterColor: this.pistilColor === COLOR.Gold ? COLOR.Gold : COLOR.White
        });
        innerShell.burst(x, y);
      }

      if (this.streamers) {
        const innerShell = new Shell({
          spreadSize: this.spreadSize * 0.85,
          starLife: this.starLife * 0.8,
          starLifeVariation: this.starLifeVariation,
          starCount: Math.floor(Math.max(6, this.spreadSize / 48)),
          color: COLOR.White,
          glitter: 'streamer'
        });
        innerShell.burst(x, y);
      }

      BurstFlash.add(x, y, this.spreadSize / 4);

      if (this.comet) {
        playSoundSafe('burst', 0.9);
      }
    }
  }

  // Sequences
  function fitH(pos) {
    const edge = 0.16;
    return (1 - edge * 2) * pos + edge;
  }

  function fitV(pos) {
    return pos * 0.75;
  }

  function seqRandomShell() {
    const size = IS_MOBILE ? 1.5 : 2.5;
    const shell = new Shell(randomShell(size));
    shell.launch(fitH(Math.random()), fitV(Math.random()));
    return 1800;
  }

  function seqTwoRandom() {
    const size = IS_MOBILE ? 1.3 : 2.2;
    const s1 = new Shell(randomShell(size));
    const s2 = new Shell(randomShell(size));
    const left = fitH(Math.random() * 0.45);
    const right = fitH(0.55 + Math.random() * 0.45);
    s1.launch(left, fitV(Math.random()));
    setTimeout(() => {
      s2.launch(right, fitV(Math.random()));
    }, 180);
    return 2400;
  }

  function seqTriple() {
    const size = IS_MOBILE ? 1.2 : 2.0;
    const s1 = new Shell(randomShell(size));
    const s2 = new Shell(randomShell(size));
    const s3 = new Shell(randomShell(size));
    s1.launch(fitH(0.2), fitV(0.6));
    setTimeout(() => s2.launch(fitH(0.5), fitV(0.8)), 160);
    setTimeout(() => s3.launch(fitH(0.8), fitV(0.6)), 320);
    return 2800;
  }

  function seqPyramid() {
    const size = IS_MOBILE ? 1.0 : 1.8;
    const count = IS_MOBILE ? 3 : 5;
    let delay = 0;
    for (let i = 0; i < count; i++) {
      const x = (i + 0.5) / count;
      const height = (Math.sin((i / (count - 1)) * Math.PI) * 0.5 + 0.35);
      setTimeout(() => {
        const shell = new Shell(randomShell(size));
        shell.launch(fitH(x), fitV(height));
      }, delay);
      delay += 180;
    }
    return 3200;
  }

  let autoLaunchTimer = 0;
  let currentFrame = 0;

  function runSequence() {
    const r = Math.random();
    if (r < 0.25) return seqPyramid();
    if (r < 0.55) return seqTwoRandom();
    if (r < 0.8) return seqTriple();
    return seqRandomShell();
  }

  function update(frameTime, lag) {
    if (!isEngineRunning) return;

    const timeStep = frameTime * simSpeed;
    const speed = simSpeed * lag;
    currentFrame++;

    autoLaunchTimer -= timeStep;
    if (autoLaunchTimer <= 0) {
      autoLaunchTimer = runSequence();
    }

    const starDrag = 1 - (1 - Star.airDrag) * speed;
    const starDragHeavy = 1 - (1 - Star.airDragHeavy) * speed;
    const sparkDrag = 1 - (1 - Spark.airDrag) * speed;
    const gAcc = (timeStep / 1000) * GRAVITY;

    COLOR_CODES_W_INVIS.forEach((color) => {
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
              if (star.secondColor === INVISIBLE) star.sparkFreq = 0;
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

  function render(speed) {
    if (!trailsStage || !mainStage) return;

    const { dpr } = mainStage;
    const width = stageW;
    const height = stageH;
    const trailsCtx = trailsStage.ctx;
    const mainCtx = mainStage.ctx;

    const scaleFactor = getDefaultScaleFactor();
    trailsCtx.scale(dpr * scaleFactor, dpr * scaleFactor);
    mainCtx.scale(dpr * scaleFactor, dpr * scaleFactor);

    trailsCtx.globalCompositeOperation = 'source-over';
    trailsCtx.fillStyle = `rgba(0, 0, 0, ${0.18 * speed})`;
    trailsCtx.fillRect(0, 0, width, height);

    mainCtx.clearRect(0, 0, width, height);

    while (BurstFlash.active.length) {
      const bf = BurstFlash.active.pop();
      const burstGradient = trailsCtx.createRadialGradient(bf.x, bf.y, 0, bf.x, bf.y, bf.radius);
      burstGradient.addColorStop(0.02, 'rgba(255, 255, 255, 1)');
      burstGradient.addColorStop(0.12, 'rgba(255, 180, 40, 0.22)');
      burstGradient.addColorStop(0.35, 'rgba(255, 140, 20, 0.1)');
      burstGradient.addColorStop(1, 'rgba(255, 120, 20, 0)');
      trailsCtx.fillStyle = burstGradient;
      trailsCtx.fillRect(bf.x - bf.radius, bf.y - bf.radius, bf.radius * 2, bf.radius * 2);
      BurstFlash.returnInstance(bf);
    }

    trailsCtx.globalCompositeOperation = 'lighten';

    trailsCtx.lineWidth = Star.drawWidth;
    trailsCtx.lineCap = isLowQuality ? 'square' : 'round';
    mainCtx.strokeStyle = '#fff';
    mainCtx.lineWidth = 1;
    mainCtx.beginPath();

    COLOR_CODES.forEach((color) => {
      const stars = Star.active[color];
      trailsCtx.strokeStyle = color;
      trailsCtx.beginPath();
      stars.forEach((star) => {
        if (star.visible) {
          trailsCtx.moveTo(star.x, star.y);
          trailsCtx.lineTo(star.prevX, star.prevY);
          mainCtx.moveTo(star.x, star.y);
          mainCtx.lineTo(star.x - star.speedX * 1.5, star.y - star.speedY * 1.5);
        }
      });
      trailsCtx.stroke();
    });
    mainCtx.stroke();

    trailsCtx.lineWidth = Spark.drawWidth;
    trailsCtx.lineCap = 'butt';
    COLOR_CODES.forEach((color) => {
      const sparks = Spark.active[color];
      trailsCtx.strokeStyle = color;
      trailsCtx.beginPath();
      sparks.forEach((spark) => {
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
    const containerH = Math.min(h, MAX_HEIGHT);

    const container = document.querySelector('.stage-container');
    if (container) {
      container.style.width = containerW + 'px';
      container.style.height = containerH + 'px';
    }

    stages.forEach(stage => stage.resize(containerW, containerH));
    const scaleFactor = getDefaultScaleFactor();
    stageW = containerW / scaleFactor;
    stageH = containerH / scaleFactor;
  }

  const FireworksEngine = {
    init(containerEl) {
      if (!window.Stage) {
        console.error('Stage.js is required for FireworksEngine.');
        return;
      }

      trailsStage = new Stage('trails-canvas');
      mainStage = new Stage('main-canvas');
      stages = [trailsStage, mainStage];

      handleResize();
      window.addEventListener('resize', handleResize);

      // Tap on canvas launches custom shell
      mainStage.addEventListener('pointerstart', (event) => {
        if (!isEngineRunning) return;
        if (event.onCanvas) {
          const shell = new Shell(randomShell(IS_MOBILE ? 1.5 : 2.5));
          const w = mainStage.width;
          const h = mainStage.height;
          shell.launch(event.x / w, 1 - (event.y / h));
        }
      });

      // Pause when browser tab is inactive to preserve mobile performance
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.pause();
        } else if (isEngineRunning) {
          this.resume();
        }
      });

      mainStage.addEventListener('ticker', update);
      console.log('✨ FireworksEngine initialized.');
    },

    start() {
      isEngineRunning = true;
      autoLaunchTimer = 400; // Launch initial shell quickly
    },

    pause() {
      isEngineRunning = false;
    },

    resume() {
      isEngineRunning = true;
    },

    triggerFinale() {
      let count = 0;
      const finaleInterval = setInterval(() => {
        const size = IS_MOBILE ? 1.3 : 2.2;
        const shell = new Shell(randomShell(size));
        shell.launch(fitH(Math.random()), fitV(0.4 + Math.random() * 0.5));
        count++;
        if (count >= 12) clearInterval(finaleInterval);
      }, 150);
    }
  };

  window.FireworksEngine = FireworksEngine;
})();
