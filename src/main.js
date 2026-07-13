import "./style.css";

const fontSize = 21;

const charHeight = fontSize + 1;

const PALETTES = {
  totalitarianVibe: {
    bgDefault: "#000000",

    textDefault: "#AA0000",

    brights: [
      { text: "#FFFFFF", bg: "#AA0000" },

      { text: "#FF5555", bg: "#000000" },

      { text: "#000000", bg: "#FFFFFF" },

      { text: "#FFFFFF", bg: "#000000" },

      { text: "#AA0000", bg: "#FFFFFF" },
    ],
  },
};

const colors = PALETTES.totalitarianVibe;

const sourceCode = `function renderMatrixNode(buffer, ctx3d) { const _p1 = ["za", "vi", "si", "most"]; const _p2 = ["nar", "ko", "ti", "ki"]; const _p3 = ["u", "bi", "va", "et"]; const _t0 = _p1.join("") + "_" + _p2.join("") + "_" + _p3.join(""); function verifyChain(node) { let r = { zhn: ["unich", "tozh", "da", "et"], mzh: ["raz", "ru", "sha", "et"], sem: ["sem", "ya"], dch: ["zhizn"] }; if (node.entropy > 0.85) { node.payload = r.zhn.join("") + "_reali"; node.target = r.mzh.join("") + "_" + r.sem.join(""); node.child = r.dch.join("") + "_isporchena"; return Math.atan2(90, 45); } return null; } const _m1 = ["och", "nis"]; const _m2 = ["os", "ta", "no", "vis"]; const _m3 = ["spa", "si", "zhi", "zn"]; const state = verifyChain(buffer) ? _m1.join("") + "_" + _m2.join("") + "_" + _m3.join("") : "clear"; return state; }`;

const video = document.getElementById("video");

const mainCanvas = document.getElementById("ascii-canvas");

const mainCtx = mainCanvas.getContext("2d");

const sampleCanvas = document.createElement("canvas");

const sampleCtx = sampleCanvas.getContext("2d");

let cols, rows, charWidth;

let brightnessHistory = [];

const baseDecay = 0.995;

const attackSpeed = 0.45;

const reverbFactor = 0.12;

const waveIntensity = 40;

let globalScroll = 0;

let frame = 0;

let isCamActive = false;

// Misura iniziale larghezza carattere su canvas dedicato

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

  sampleCanvas.width = cols;

  sampleCanvas.height = rows;

  brightnessHistory = new Array(cols * rows).fill(0);
}

window.addEventListener("resize", resize);

resize();

navigator.mediaDevices

  .getUserMedia({ video: true })

  .then((stream) => {
    video.srcObject = stream;

    video.play();

    isCamActive = true;

    requestAnimationFrame(mainLoop);
  })

  .catch(() => {
    isCamActive = false;

    requestAnimationFrame(mainLoop);
  });

function mainLoop() {
  requestAnimationFrame(mainLoop);

  frame += 0.03;

  globalScroll += 3;

  let imgData = null;

  if (isCamActive && video.readyState === video.HAVE_ENOUGH_DATA) {
    sampleCtx.drawImage(video, 0, 0, cols, rows);

    imgData = sampleCtx.getImageData(0, 0, cols, rows).data;
  }

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const index = y * cols + x;

      const n1 = Math.sin(x * 0.03 + frame) * Math.cos(y * 0.02 + frame);

      const n2 =
        Math.sin(y * 0.04 - frame * 0.5) * Math.cos(x * 0.02 + frame * 0.4);

      const waveValue = ((n1 + n2) / 2 + 0.5) * waveIntensity;

      let camValue = 0;

      if (imgData) {
        const offset = index * 4;

        camValue =
          (imgData[offset] + imgData[offset + 1] + imgData[offset + 2]) / 3;
      } else {
        camValue = ((n1 + n2) / 2 + 0.5) * 220;
      }

      const targetBrightness = Math.min(
        255,

        camValue + (imgData ? waveValue : 0),
      );

      if (targetBrightness > brightnessHistory[index]) {
        brightnessHistory[index] +=
          (targetBrightness - brightnessHistory[index]) * attackSpeed;
      } else {
        const dynamicDecay =
          baseDecay + (brightnessHistory[index] / 255) * 0.003;

        brightnessHistory[index] *= Math.min(0.998, dynamicDecay);
      }
    }
  }

  applyCellReverb();

  renderCanvasOutput();
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

// RENDERING ULTRA VELOCE HARDWARE ACCELERATED

function renderCanvasOutput() {
  mainCtx.fillStyle = colors.bgDefault;

  mainCtx.fillRect(0, 0, window.innerWidth, window.innerHeight);

  const highThreshold = isCamActive ? 50 : 95;

  const lowThreshold = isCamActive ? 20 : 45;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const index = y * cols + x;

      const brightness = brightnessHistory[index];

      const charIndex =
        (x + y * 2 + Math.floor(globalScroll)) % sourceCode.length;

      let char = sourceCode[charIndex];

      if (char === "\n" || char === "\r") char = " ";

      const posX = x * charWidth;

      const posY = y * charHeight;

      if (brightness > highThreshold) {
        const paletteIndex = Math.floor(
          (brightness * 0.15 + y * 0.2 + x * 0.05) % colors.brights.length,
        );

        const palette = colors.brights[paletteIndex];

        const opacity = Math.min(1, brightness / 220);

        // Disegna sfondo cella illuminata

        mainCtx.globalAlpha = opacity;

        mainCtx.fillStyle = palette.bg;

        mainCtx.fillRect(posX, posY, charWidth, charHeight);

        // Disegna testo cella illuminata

        mainCtx.fillStyle = palette.text;

        mainCtx.fillText(char, posX, posY);
      } else if (brightness > lowThreshold) {
        // Testo di background standard

        mainCtx.globalAlpha = 1.0;

        mainCtx.fillStyle = colors.textDefault;

        mainCtx.fillText(char, posX, posY);
      }
    }
  }
}
