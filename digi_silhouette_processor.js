/* =====================================================
   HOLY GUARDIANS — DIGI SILHOUETTE PROCESSOR
   Browser Web Worker only. Runs OpenCV segmentation off the UI thread.
   No Cloudflare Worker / no Holy Guardians API / no legacy identifiers.
===================================================== */
"use strict";

const OPENCV_URL = "https://docs.opencv.org/4.x/opencv.js";
let cvReadyPromise = null;

function ensureOpenCv() {
  if (cvReadyPromise) return cvReadyPromise;

  cvReadyPromise = new Promise(function (resolve, reject) {
    let settled = false;
    const started = Date.now();

    function finish(value) {
      if (settled) return;
      if (value && value.Mat) {
        settled = true;
        resolve(value);
      }
    }

    function fail(error) {
      if (settled) return;
      settled = true;
      reject(error instanceof Error ? error : new Error(String(error || "OpenCV indisponível.")));
    }

    try {
      importScripts(OPENCV_URL);
    } catch (error) {
      fail(new Error("Não foi possível carregar o módulo local de segmentação."));
      return;
    }

    try {
      if (self.cv && typeof self.cv.then === "function") {
        self.cv.then(function (resolved) {
          self.cv = resolved;
          finish(resolved);
        }).catch(fail);
      } else {
        finish(self.cv);
      }
    } catch (error) {
      fail(error);
      return;
    }

    (function poll() {
      if (settled) return;
      if (self.cv && self.cv.Mat) {
        finish(self.cv);
        return;
      }
      if (Date.now() - started > 18000) {
        fail(new Error("Tempo esgotado ao iniciar o processador de máscara."));
        return;
      }
      setTimeout(poll, 50);
    })();
  });

  return cvReadyPromise;
}

// Preload OpenCV as soon as the worker is created. This one-time warm-up is
// intentionally separate from the per-mask timeout in the main thread.
ensureOpenCv().then(function () {
  self.postMessage({ type: "ready" });
}).catch(function (error) {
  self.postMessage({
    type: "init-error",
    message: error && error.message ? error.message : String(error || "Falha ao iniciar OpenCV.")
  });
});

function forEachNeighbor(index, width, height, callback) {
  const x = index % width;
  const y = (index / width) | 0;
  for (let dy = -1; dy <= 1; dy += 1) {
    const ny = y + dy;
    if (ny < 0 || ny >= height) continue;
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      if (nx < 0 || nx >= width) continue;
      callback(ny * width + nx);
    }
  }
}

function borderConnected(candidate, width, height) {
  const total = width * height;
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  function push(index) {
    if (!candidate[index] || visited[index]) return;
    visited[index] = 1;
    queue[tail++] = index;
  }

  for (let x = 0; x < width; x += 1) {
    push(x);
    push((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    push(y * width);
    push(y * width + width - 1);
  }

  while (head < tail) {
    const index = queue[head++];
    forEachNeighbor(index, width, height, push);
  }

  return visited;
}

function filterSmallComponents(binary, width, height, minArea) {
  const total = width * height;
  const visited = new Uint8Array(total);
  const output = new Uint8Array(total);
  const queue = new Int32Array(total);

  for (let start = 0; start < total; start += 1) {
    if (!binary[start] || visited[start]) continue;

    let head = 0;
    let tail = 0;
    visited[start] = 1;
    queue[tail++] = start;

    while (head < tail) {
      const index = queue[head++];
      forEachNeighbor(index, width, height, function (next) {
        if (!binary[next] || visited[next]) return;
        visited[next] = 1;
        queue[tail++] = next;
      });
    }

    if (tail >= minArea) {
      for (let i = 0; i < tail; i += 1) output[queue[i]] = 1;
    }
  }

  return output;
}

function saturation255(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max <= 0) return 0;
  return ((max - min) * 255) / max;
}

function buildMask(cv, rgba, width, height, config) {
  const total = width * height;
  const whiteish = new Uint8Array(total);
  const strong = new Uint8Array(total);
  const mins = new Uint8Array(total);
  const chromas = new Uint8Array(total);

  for (let p = 0, i = 0; p < total; p += 1, i += 4) {
    const r = rgba[i];
    const g = rgba[i + 1];
    const b = rgba[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const chroma = max - min;
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    const sat = saturation255(r, g, b);

    mins[p] = min;
    chromas[p] = chroma;
    if (min >= config.BG_BRIGHT_MIN && chroma <= config.BG_CHROMA_MAX) whiteish[p] = 1;
    if (sat > config.FG_SAT_MIN || gray < config.FG_DARK_MAX) strong[p] = 1;
  }

  const sureBackground = borderConnected(whiteish, width, height);
  const frame = Math.max(config.FRAME_MIN, Math.round(Math.min(width, height) * config.FRAME_RATIO));
  const safeFrame = frame * 2;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (x < safeFrame || y < safeFrame || x >= width - safeFrame || y >= height - safeFrame) {
        strong[y * width + x] = 0;
      }
    }
  }

  const strongFiltered = filterSmallComponents(strong, width, height, config.MIN_SEED_AREA);
  const seed = new Uint8Array(total);
  seed.fill(cv.GC_PR_FGD);

  for (let p = 0; p < total; p += 1) {
    if (sureBackground[p]) seed[p] = cv.GC_BGD;
    else if (mins[p] >= config.PROB_BG_BRIGHT_MIN && chromas[p] <= config.PROB_BG_CHROMA_MAX) seed[p] = cv.GC_PR_BGD;
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (x < frame || y < frame || x >= width - frame || y >= height - frame) seed[y * width + x] = cv.GC_BGD;
    }
  }

  for (let p = 0; p < total; p += 1) {
    if (strongFiltered[p]) seed[p] = cv.GC_FGD;
  }

  let src = null;
  let rgb = null;
  let maskMat = null;
  let bgdModel = null;
  let fgdModel = null;
  let cleanMat = null;
  let closedMat = null;
  let smoothMat = null;
  let kernel = null;

  try {
    src = new cv.Mat(height, width, cv.CV_8UC4);
    src.data.set(rgba);

    rgb = new cv.Mat();
    cv.cvtColor(src, rgb, cv.COLOR_RGBA2RGB);

    maskMat = new cv.Mat(height, width, cv.CV_8UC1);
    maskMat.data.set(seed);
    bgdModel = new cv.Mat();
    fgdModel = new cv.Mat();

    cv.grabCut(
      rgb,
      maskMat,
      new cv.Rect(0, 0, width, height),
      bgdModel,
      fgdModel,
      config.GRABCUT_ITERATIONS,
      cv.GC_INIT_WITH_MASK
    );

    const rawForeground = new Uint8Array(total);
    for (let p = 0; p < total; p += 1) {
      const value = maskMat.data[p];
      if (value === cv.GC_FGD || value === cv.GC_PR_FGD) rawForeground[p] = 1;
    }

    const filtered = filterSmallComponents(rawForeground, width, height, config.MIN_FINAL_AREA);
    cleanMat = new cv.Mat(height, width, cv.CV_8UC1);
    for (let p = 0; p < total; p += 1) cleanMat.data[p] = filtered[p] ? 255 : 0;

    kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(3, 3));
    closedMat = new cv.Mat();
    smoothMat = new cv.Mat();
    cv.morphologyEx(cleanMat, closedMat, cv.MORPH_CLOSE, kernel, new cv.Point(-1, -1), 1);
    cv.medianBlur(closedMat, smoothMat, 3);

    const finalMask = new Uint8Array(total);
    for (let p = 0; p < total; p += 1) finalMask[p] = smoothMat.data[p] > 127 ? 1 : 0;
    return finalMask;
  } finally {
    [src, rgb, maskMat, bgdModel, fgdModel, cleanMat, closedMat, smoothMat, kernel].forEach(function (mat) {
      if (mat && typeof mat.delete === "function") mat.delete();
    });
  }
}

self.onmessage = async function (event) {
  const data = event && event.data || {};
  if (data.type !== "segment") return;

  const id = data.id;
  try {
    const cv = await ensureOpenCv();
    const rgba = new Uint8ClampedArray(data.rgbaBuffer);
    const mask = buildMask(cv, rgba, Number(data.width), Number(data.height), data.config || {});
    self.postMessage({ type: "result", id: id, maskBuffer: mask.buffer }, [mask.buffer]);
  } catch (error) {
    self.postMessage({
      type: "error",
      id: id,
      message: error && error.message ? error.message : String(error || "Falha na segmentação.")
    });
  }
};
