import "./style.css";
import { parseBuffer } from "music-metadata";

class Perlin {
  constructor() {
    this.p = new Uint8Array(512);
    const perm = [
      151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225,
      140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148, 247,
      120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177,
      33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165,
      71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122, 60, 211,
      133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54, 65, 25,
      63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169, 200, 196,
      135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217,
      226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206,
      59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213, 119, 248,
      152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9, 129, 22,
      39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218,
      246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241,
      81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157,
      184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93,
      222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180,
    ];
    for (let i = 0; i < 256; i++) this.p[i] = this.p[i + 256] = perm[i];
  }
  fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }
  lerp(t, a, b) {
    return a + t * (b - a);
  }
  grad(hash, x, y, z) {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }
  noise(x, y, z) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);
    const u = this.fade(x),
      v = this.fade(y),
      w = this.fade(z);
    const A = this.p[X] + Y,
      AA = this.p[A] + Z,
      AB = this.p[A + 1] + Z;
    const B = this.p[X + 1] + Y,
      BA = this.p[B] + Z,
      BB = this.p[B + 1] + Z;
    return this.lerp(
      w,
      this.lerp(
        v,
        this.lerp(
          u,
          this.grad(this.p[AA], x, y, z),
          this.grad(this.p[BA], x - 1, y, z),
        ),
        this.lerp(
          u,
          this.grad(this.p[AB], x, y - 1, z),
          this.grad(this.p[BB], x - 1, y - 1, z),
        ),
      ),
      this.lerp(
        v,
        this.lerp(
          u,
          this.grad(this.p[AA + 1], x, y, z - 1),
          this.grad(this.p[BA + 1], x - 1, y, z - 1),
        ),
        this.lerp(
          u,
          this.grad(this.p[AB + 1], x, y - 1, z - 1),
          this.grad(this.p[BB + 1], x - 1, y - 1, z - 1),
        ),
      ),
    );
  }
}

const perlin = new Perlin();

const fontSize = 21;
const charHeight = fontSize + 1;

const PALETTES = {
  prd1030: {
    bgDefault: "#C7DDE2",
    textDefault: "#696F72",
    brights: [
      { text: "#292627", bg: "#C7DDE2" },
      { text: "#C7DDE2", bg: "#292627" },
      { text: "#696F72", bg: "#BACED2" },
      { text: "#9CABAF", bg: "#C7DDE2" },
      { text: "#BACED2", bg: "#292627" },
    ],
  },
};

const colors = PALETTES.prd1030;

let sourceCode = "";

const mainCanvas = document.getElementById("ascii-canvas");
const mainCtx = mainCanvas.getContext("2d");

let cols, rows, charWidth;
let brightnessHistory = [];
let waveXHistory = [];

const baseDecay = 0.96;
const attackSpeed = 0.25;
const reverbFactor = 0.05;
const waveIntensity = 160;
let globalScroll = 0;
let frame = 0;

const audioCtx = new AudioContext();
const analyser = audioCtx.createAnalyser();
analyser.fftSize = 256;
analyser.connect(audioCtx.destination);
const timeData = new Uint8Array(analyser.fftSize);
const freqData = new Uint8Array(analyser.frequencyBinCount);
let prevRms = 0;
let reverbEnergy = 0;
let audioReady = false;
let currentSource = null;
let currentTrack = "";

async function loadTrack(name) {
  currentTrack = name;
  if (currentSource) {
    currentSource.stop();
    currentSource.disconnect();
  }
  audioReady = false;
  sourceCode = name.replace(/_/g, " ");
  try {
    const resp = await fetch("/" + name + ".mp3");
    const buf = await resp.arrayBuffer();
    if (currentTrack !== name) return;
    parseBuffer(buf, "audio/mpeg")
      .then((md) => {
        if (currentTrack !== name) return;
        const c = md.common;
        sourceCode = [c.title, c.artist, c.album, c.year, c.track?.no, c.genre?.[0]]
          .filter(Boolean)
          .join(" . ");
      })
      .catch(() => {});
    const decoded = await audioCtx.decodeAudioData(buf);
    if (currentTrack !== name) return;
    const src = audioCtx.createBufferSource();
    src.buffer = decoded;
    src.loop = true;
    src.connect(analyser);
    src.start();
    currentSource = src;
    audioReady = true;
  } catch {}
}

document.getElementById("track-select").addEventListener("change", (e) => {
  loadTrack(e.target.value);
});
loadTrack("BinaryWar_Digital_TapeMaster_240426");

document.addEventListener("click", () => audioCtx.resume(), { once: true });

mainCtx.font = `bold ${fontSize}px monospace`;
charWidth = mainCtx.measureText("M").width;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  mainCanvas.width = window.innerWidth * dpr;
  mainCanvas.height = window.innerHeight * dpr;
  mainCtx.scale(dpr, dpr);
  mainCtx.font = `bold ${fontSize}px monospace`;
  mainCtx.textBaseline = "top";
  cols = Math.floor(window.innerWidth / charWidth);
  rows = Math.floor(window.innerHeight / charHeight);
  brightnessHistory = new Array(cols * rows).fill(0);
  waveXHistory = new Array(cols * rows).fill(0);
}

window.addEventListener("resize", resize);
resize();

requestAnimationFrame(mainLoop);

function mainLoop() {
  requestAnimationFrame(mainLoop);
  frame += 0.012;
  globalScroll += 2;

  let rms = 0,
    bass = 0,
    midLow = 0,
    midHigh = 0,
    highs = 0,
    voice = 0,
    onset = 0;
  if (audioReady && audioCtx.state === "running") {
    analyser.getByteTimeDomainData(timeData);
    analyser.getByteFrequencyData(freqData);

    let sumSq = 0;
    for (let i = 0; i < timeData.length; i++) {
      const v = timeData[i] - 128;
      sumSq += v * v;
    }
    rms = Math.sqrt(sumSq / timeData.length) / 128;

    const binCount = analyser.frequencyBinCount;
    for (let i = 0; i < binCount; i++) {
      const amp = freqData[i] / 255;
      if (i < 5) bass += amp;
      else if (i < 16) midLow += amp;
      else if (i < 41) midHigh += amp;
      else if (i > binCount - 5) highs += amp;
      else voice += amp;
    }
    bass /= 5;
    midLow /= 11;
    midHigh /= 25;
    highs /= 5;
    voice /= Math.max(1, binCount - 46);
    reverbEnergy += (highs - reverbEnergy) * 0.02;

    onset = Math.abs(rms - prevRms) * 8;
    prevRms = rms;
  }

  const elapsed = audioReady ? audioCtx.currentTime : 0;
  const timeDrift = Math.sin(elapsed * 0.07) * 0.15;
  const timeDrift2 = Math.cos(elapsed * 0.11) * 0.1;

  const tempo = Math.min(1, rms * 3 + onset * 2);

  const kickEnergy = Math.min(1, bass * 2 + onset);
  const kickAmp = 1 + kickEnergy;
  const kickThreshold = 0.08 - kickEnergy * 0.04;
  const kickBoost = 1 + kickEnergy * 0.3;
  const bassFreq = (0.005 + bass * 0.03) * (1 + timeDrift);
  const bassSpeed = (0.1 + bass * 0.6) * (1 + timeDrift2);
  const mlFreq = (0.008 + midLow * 0.04) * (1 + timeDrift);
  const mlSpeed = (0.2 + midLow * 0.5) * (1 + timeDrift2);
  const mhFreq = (0.01 + midHigh * 0.05) * (1 + timeDrift);
  const mhSpeed = (0.3 + midHigh * 0.5) * (1 + timeDrift2);
  const hFreq = (0.015 + highs * 0.06) * (1 + timeDrift);
  const hSpeed = (0.4 + highs * 0.6) * (1 + timeDrift2);
  const tFreq = (0.02 + tempo * 0.08) * (1 + timeDrift);
  const tSpeed = (0.5 + tempo * 1.0) * (1 + timeDrift2);
  const angle =
    ((highs / Math.max(0.01, highs + bass)) * Math.PI) / 3 + timeDrift2 * 0.3;
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  const voiceDrift = voice * 140;
  const reverbDrift = reverbEnergy * 90;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const index = y * cols + x;

      const rx = x * cosA - y * sinA;
      const ry = x * sinA + y * cosA;

      const cBass =
        Math.sin(rx * bassFreq + frame * bassSpeed) *
        Math.cos(ry * bassFreq * 0.5 + frame * bassSpeed * 0.5);
      const cMidLow =
        Math.sin(rx * mlFreq * 0.7 + frame * mlSpeed * 0.6) *
        Math.cos(ry * mlFreq + frame * mlSpeed * 0.4);
      const cMidHigh =
        Math.sin(ry * mhFreq - frame * mhSpeed * 0.5) *
        Math.cos(rx * mhFreq * 0.8 + frame * mhSpeed);
      const cHigh =
        Math.sin(rx * hFreq + ry * hFreq * 0.3 + frame * hSpeed * 0.3) *
        Math.cos(rx * hFreq * 0.5 - ry * hFreq * 0.4 + frame * hSpeed * 0.6);
      const cTempo =
        Math.sin(rx * tFreq * 0.4 + ry * tFreq * 0.6 + frame * tSpeed) *
        Math.cos(rx * tFreq * 0.3 - ry * tFreq * 0.5 + frame * tSpeed * 0.5);
      const cVoice =
        Math.sin(rx * 0.004 + ry * 0.006 + frame * 0.2 + voice * 3) *
        Math.cos(rx * 0.002 + ry * 0.003 + frame * 0.12 + voice * 1.5);

      const noiseX = (perlin.noise(rx * 0.03, ry * 0.03, frame * 0.25) + perlin.noise(rx * 0.08, ry * 0.08, frame * 0.5) * 0.5) * 0.7;
      const noiseY = (perlin.noise(rx * 0.05, ry * 0.05, frame * 0.35) + perlin.noise(rx * 0.1, ry * 0.1, frame * 0.6) * 0.5) * 0.7;

      const waveX = (cBass * kickAmp * 4 + cHigh * kickAmp * 3 + cVoice * 3 + reverbEnergy * 5 + noiseX) / (1 + kickAmp * 2);
      const waveY =
        (cBass * kickAmp * 8 +
          cVoice * 10 +
          reverbEnergy * 16 +
          cMidHigh * 10 +
          cHigh * 10 +
          cTempo * kickAmp +
          cMidLow * 10 +
          noiseY) /
        (4 + kickAmp * 2);

      let waveValue = 0;
      if (waveY > kickThreshold) {
        waveValue = waveIntensity * 1.5 * kickBoost;
      } else if (waveY > -0.05) {
        waveValue = waveIntensity * 0.35 * kickBoost;
      }

      const targetBrightness = Math.min(255, waveValue);

      if (targetBrightness > brightnessHistory[index]) {
        brightnessHistory[index] +=
          (targetBrightness - brightnessHistory[index]) * attackSpeed;
      } else {
        brightnessHistory[index] +=
          (targetBrightness - brightnessHistory[index]) * (1 - baseDecay);
      }

      if (waveX > waveXHistory[index]) {
        waveXHistory[index] += (waveX - waveXHistory[index]) * attackSpeed;
      } else {
        waveXHistory[index] += (waveX - waveXHistory[index]) * (1 - baseDecay);
      }
    }
  }

  applyCellReverb();
  renderCanvasOutput(voiceDrift, reverbDrift, waveXHistory);
}

function applyCellReverb() {
  const tempBuffer = [...brightnessHistory];
  for (let y = 1; y < rows - 1; y++) {
    for (let x = 1; x < cols - 1; x++) {
      const idx = y * cols + x;
      const neighborsAverage =
        (tempBuffer[idx - cols] +
          tempBuffer[idx + cols] +
          tempBuffer[idx - 1] +
          tempBuffer[idx + 1]) /
        4;
      brightnessHistory[idx] =
        brightnessHistory[idx] * (1 - reverbFactor) +
        neighborsAverage * reverbFactor;
    }
  }
}

function renderCanvasOutput(voiceDrift, reverbDrift, waveXHistory) {
  mainCtx.fillStyle = colors.bgDefault;
  mainCtx.fillRect(0, 0, window.innerWidth, window.innerHeight);

  const highThreshold = 55;
  const lowThreshold = 20;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const index = y * cols + x;
      const brightness = brightnessHistory[index];
      const charIndex =
        (x + y * 2 + Math.floor(globalScroll)) % sourceCode.length;
      let char = sourceCode[charIndex];

      if (char === "\n" || char === "\r") char = " ";

      const driftX =
        voiceDrift * perlin.noise(y * 0.05, 0, frame * 0.1) +
        reverbDrift * perlin.noise(y * 0.08, 1, frame * 0.15);
      const waveXOffset = waveXHistory[index] * charWidth * 0.4;
      const posX = x * charWidth + driftX + waveXOffset;
      const posY = y * charHeight;

      if (brightness > highThreshold) {
        const paletteIndex = Math.floor(
          (brightness * 0.15 + y * 0.2 + x * 0.05) % colors.brights.length,
        );
        const palette = colors.brights[paletteIndex];
        const opacity = Math.min(1, brightness / 180);

        mainCtx.globalAlpha = opacity;
        mainCtx.fillStyle = palette.bg;
        mainCtx.fillRect(posX, posY, charWidth, charHeight);

        mainCtx.fillStyle = palette.text;
        mainCtx.fillText(char, posX, posY);
      } else if (brightness > lowThreshold) {
        mainCtx.globalAlpha = 1.0;
        mainCtx.fillStyle = colors.textDefault;
        mainCtx.fillText(char, posX, posY);
      }
    }
  }
}
