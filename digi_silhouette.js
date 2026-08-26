/* =====================================================
   HOLY GUARDIANS — DIGI SILHOUETTE
   Client-side only. DAPI direct + lazy OpenCV.js segmentation.
   Does not use the Holy Guardians Worker/API or legacy identifiers.
===================================================== */
(function () {
  "use strict";

  const DAPI_LIST_URL = "https://digi-api.com/api/v1/digimon?pageSize=2000";
  const DAPI_DETAIL_URL = "https://digi-api.com/api/v1/digimon/";
  const OPENCV_URL = "https://docs.opencv.org/4.x/opencv.js";
  const CATALOG_CACHE_KEY = "hg_digi_silhouette_catalog_v1";
  const CATALOG_CACHE_MS = 12 * 60 * 60 * 1000;
  const NETWORK_TIMEOUT_MS = 12000;
  const MAX_CANDIDATE_ATTEMPTS = 3;

  const SEGMENT = Object.freeze({
    BG_BRIGHT_MIN: 238,
    BG_CHROMA_MAX: 20,
    FG_SAT_MIN: 45,
    FG_DARK_MAX: 175,
    PROB_BG_BRIGHT_MIN: 225,
    PROB_BG_CHROMA_MAX: 25,
    FRAME_RATIO: 0.012,
    FRAME_MIN: 4,
    MIN_SEED_AREA: 8,
    MIN_FINAL_AREA: 10,
    GRABCUT_ITERATIONS: 3,
    MAX_PROCESS_SIDE: 320
  });

  const state = {
    mounted: false,
    loadingRound: false,
    catalog: [],
    current: null,
    hintsShown: 0,
    attempts: 0,
    revealed: false,
    usedNames: new Set(),
    cvPromise: null,
    abortController: null
  };

  const $ = function (selector, root) {
    return (root || document).querySelector(selector);
  };

  function normalizarResposta(value) {
    return String(value == null ? "" : value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .trim();
  }

  function textoPrimeiro(list, key) {
    if (!Array.isArray(list) || !list.length) return "DESCONHECIDO";
    const value = list[0] && list[0][key];
    return String(value || "DESCONHECIDO").toUpperCase();
  }

  function escaparAttr(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function renderBase(root) {
    root.innerHTML = `
      <div class="digi-silhouette-shell">
        <header class="digi-silhouette-hero tech-corners">
          <div class="digi-silhouette-kicker">HOLY GUARDIANS // DIGITAL IDENTIFICATION</div>
          <div class="digi-silhouette-hero-grid">
            <div>
              <h1>DIGI <span>SILHOUETTE</span></h1>
              <p>Reconheça o Digimon apenas pela silhueta. A imagem é processada no seu navegador.</p>
            </div>
            <div class="digi-silhouette-system" aria-label="Status do sistema">
              <small>SEGMENTATION CORE</small>
              <strong><i></i> LOCAL</strong>
              <span>ZERO HG WORKER</span>
            </div>
          </div>
        </header>

        <main class="digi-silhouette-grid">
          <section class="digi-silhouette-viewer tech-corners">
            <div class="digi-silhouette-viewer-head">
              <div>
                <small>WHO'S THAT DIGIMON?</small>
                <strong id="digiSilhouetteRoundLabel">ANALISANDO SINAL...</strong>
              </div>
              <span id="digiSilhouetteAttemptBadge">0 TENTATIVAS</span>
            </div>

            <div class="digi-silhouette-screen" id="digiSilhouetteScreen">
              <div class="digi-silhouette-scanlines" aria-hidden="true"></div>
              <div class="digi-silhouette-corners" aria-hidden="true"><i></i><i></i><i></i><i></i></div>

              <div class="digi-silhouette-loading" id="digiSilhouetteLoading" aria-live="polite">
                <span class="digi-silhouette-spinner" aria-hidden="true"></span>
                <strong>LOCALIZANDO DIGIMON...</strong>
                <small>Preparando máscara no navegador</small>
              </div>

              <canvas id="digiSilhouetteCanvas" class="digi-silhouette-canvas" hidden></canvas>
              <img id="digiSilhouetteOriginal" class="digi-silhouette-original" alt="" crossorigin="anonymous" hidden>

              <div class="digi-silhouette-result" id="digiSilhouetteResult" hidden>
                <small>IDENTIFICAÇÃO CONFIRMADA</small>
                <strong id="digiSilhouetteName"></strong>
              </div>
            </div>

            <div class="digi-silhouette-status" id="digiSilhouetteStatus" aria-live="polite">INICIALIZANDO TERMINAL...</div>
          </section>

          <aside class="digi-silhouette-control tech-corners">
            <div class="digi-silhouette-control-head">
              <small>IDENTIFICATION INPUT</small>
              <strong>QUAL É O DIGIMON?</strong>
            </div>

            <form id="digiSilhouetteForm" class="digi-silhouette-form" autocomplete="off">
              <label for="digiSilhouetteGuess">SEU CHUTE</label>
              <div class="digi-silhouette-input-wrap">
                <input id="digiSilhouetteGuess" type="text" maxlength="90" placeholder="Digite o nome..." spellcheck="false" disabled>
                <button id="digiSilhouetteGuessBtn" type="submit" disabled>CHUTAR</button>
              </div>
            </form>

            <div class="digi-silhouette-actions">
              <button id="digiSilhouetteHintBtn" type="button" disabled>DICA</button>
              <button id="digiSilhouetteRevealBtn" type="button" disabled>REVELAR</button>
              <button id="digiSilhouetteNextBtn" type="button">PRÓXIMO</button>
            </div>

            <section class="digi-silhouette-hints" aria-labelledby="digiSilhouetteHintsTitle">
              <div class="digi-silhouette-hints-head">
                <small>DATA FRAGMENTS</small>
                <strong id="digiSilhouetteHintsTitle">DICAS</strong>
              </div>
              <div id="digiSilhouetteHintsList" class="digi-silhouette-hints-list">
                <div class="digi-silhouette-hint-empty">Nenhuma dica liberada.</div>
              </div>
            </section>

            <div class="digi-silhouette-note">
              <span>PROCESSAMENTO LOCAL</span>
              <p>O recorte da silhueta acontece no dispositivo do jogador. A Holy Guardians API não é consultada por este minigame.</p>
            </div>
          </aside>
        </main>
      </div>
    `;

    $("#digiSilhouetteForm", root).addEventListener("submit", onGuess);
    $("#digiSilhouetteHintBtn", root).addEventListener("click", showHint);
    $("#digiSilhouetteRevealBtn", root).addEventListener("click", function () { reveal(false); });
    $("#digiSilhouetteNextBtn", root).addEventListener("click", newRound);
  }

  function setStatus(message, tone) {
    const el = $("#digiSilhouetteStatus");
    if (!el) return;
    el.textContent = message;
    el.dataset.tone = tone || "normal";
  }

  function setLoading(active, main, sub) {
    const loading = $("#digiSilhouetteLoading");
    const canvas = $("#digiSilhouetteCanvas");
    const original = $("#digiSilhouetteOriginal");
    const result = $("#digiSilhouetteResult");
    if (!loading) return;

    loading.hidden = !active;
    if (active) {
      const strong = $("strong", loading);
      const small = $("small", loading);
      if (strong && main) strong.textContent = main;
      if (small && sub) small.textContent = sub;
      if (canvas) canvas.hidden = true;
      if (original) original.hidden = true;
      if (result) result.hidden = true;
    }
  }

  function setControls(enabled) {
    const ids = ["digiSilhouetteGuess", "digiSilhouetteGuessBtn", "digiSilhouetteHintBtn", "digiSilhouetteRevealBtn"];
    ids.forEach(function (name) {
      const el = document.getElementById(name);
      if (el) el.disabled = !enabled;
    });
  }

  function updateAttemptBadge() {
    const el = $("#digiSilhouetteAttemptBadge");
    if (!el) return;
    el.textContent = state.attempts + (state.attempts === 1 ? " TENTATIVA" : " TENTATIVAS");
  }

  function resetHints() {
    state.hintsShown = 0;
    const list = $("#digiSilhouetteHintsList");
    if (list) list.innerHTML = '<div class="digi-silhouette-hint-empty">Nenhuma dica liberada.</div>';
  }

  function hintsForCurrent() {
    const digi = state.current && state.current.detail;
    if (!digi) return [];

    const levels = Array.isArray(digi.levels) ? digi.levels.map(function (x) { return x && x.level; }).filter(Boolean) : [];
    const attrs = Array.isArray(digi.attributes) ? digi.attributes.map(function (x) { return x && x.attribute; }).filter(Boolean) : [];
    const types = Array.isArray(digi.types) ? digi.types.map(function (x) { return x && x.type; }).filter(Boolean) : [];

    return [
      { label: "LEVEL", value: levels.length ? levels.join(" / ").toUpperCase() : "DESCONHECIDO" },
      { label: "ATTRIBUTE", value: attrs.length ? attrs.join(" / ").toUpperCase() : "DESCONHECIDO" },
      { label: "TYPE", value: types.length ? types.join(" / ").toUpperCase() : "DESCONHECIDO" },
      { label: "X-ANTIBODY", value: digi.xAntibody === true ? "SIM" : "NÃO" },
      { label: "ANO", value: String(digi.releaseDate || "DESCONHECIDO").toUpperCase() }
    ];
  }

  function showHint() {
    if (!state.current || state.revealed) return;
    const hints = hintsForCurrent();
    if (!hints.length) return;

    if (state.hintsShown >= hints.length) {
      setStatus("TODAS AS DICAS JÁ FORAM LIBERADAS.", "normal");
      return;
    }

    state.hintsShown += 1;
    const list = $("#digiSilhouetteHintsList");
    if (!list) return;

    list.innerHTML = hints.slice(0, state.hintsShown).map(function (hint, index) {
      return '<div class="digi-silhouette-hint"><span>0' + (index + 1) + '</span><small>' + escaparAttr(hint.label) + '</small><strong>' + escaparAttr(hint.value) + '</strong></div>';
    }).join("");

    if (state.hintsShown >= hints.length) {
      const btn = $("#digiSilhouetteHintBtn");
      if (btn) btn.disabled = true;
    }
  }

  function catalogFromCache(allowExpired) {
    try {
      const saved = JSON.parse(localStorage.getItem(CATALOG_CACHE_KEY) || "null");
      if (!saved || !Array.isArray(saved.names) || !saved.names.length) return null;
      if (!allowExpired && Number(saved.expiresAt) <= Date.now()) return null;
      return saved.names;
    } catch (error) {
      return null;
    }
  }

  function yieldToBrowser() {
    return new Promise(function (resolve) {
      requestAnimationFrame(function () {
        setTimeout(resolve, 0);
      });
    });
  }

  function fetchWithTimeout(url, options, timeoutMs) {
    const opts = Object.assign({}, options || {});
    const parentSignal = opts.signal || null;
    const controller = new AbortController();
    const limit = Number(timeoutMs) > 0 ? Number(timeoutMs) : NETWORK_TIMEOUT_MS;
    let timedOut = false;

    const onParentAbort = function () { controller.abort(); };
    if (parentSignal) {
      if (parentSignal.aborted) controller.abort();
      else parentSignal.addEventListener("abort", onParentAbort, { once: true });
    }

    opts.signal = controller.signal;
    const timer = setTimeout(function () {
      timedOut = true;
      controller.abort();
    }, limit);

    return fetch(url, opts).catch(function (error) {
      if (timedOut) throw new Error("A DAPI demorou demais para responder.");
      throw error;
    }).finally(function () {
      clearTimeout(timer);
      if (parentSignal) parentSignal.removeEventListener("abort", onParentAbort);
    });
  }

  function saveCatalogCache(names) {
    try {
      localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify({
        expiresAt: Date.now() + CATALOG_CACHE_MS,
        names: names
      }));
    } catch (error) {
      /* Storage is optional. */
    }
  }

  async function loadCatalog(signal) {
    if (state.catalog.length) return state.catalog;

    const cached = catalogFromCache(false);
    if (cached) {
      state.catalog = cached;
      return state.catalog;
    }

    let response;
    try {
      response = await fetchWithTimeout(DAPI_LIST_URL, { mode: "cors", cache: "default", signal: signal }, NETWORK_TIMEOUT_MS);
    } catch (error) {
      const stale = catalogFromCache(true);
      if (stale) {
        state.catalog = stale;
        setStatus("DAPI LENTA // USANDO CATÁLOGO LOCAL EM CACHE.", "loading");
        return state.catalog;
      }
      throw error;
    }

    if (!response.ok) throw new Error("DAPI indisponível para carregar o catálogo.");
    const data = await response.json();

    const rows = Array.isArray(data && data.content)
      ? data.content
      : Array.isArray(data)
        ? data
        : Array.isArray(data && data.digimon)
          ? data.digimon
          : [];

    const names = rows
      .map(function (row) { return String(row && row.name || row && row.digimon || "").trim(); })
      .filter(Boolean)
      .filter(function (name, index, all) { return all.indexOf(name) === index; });

    if (!names.length) throw new Error("A DAPI não retornou Digimons para o jogo.");

    state.catalog = names;
    saveCatalogCache(names);
    return state.catalog;
  }

  function chooseName(catalog) {
    let pool = catalog.filter(function (name) { return !state.usedNames.has(name); });
    if (!pool.length) {
      state.usedNames.clear();
      pool = catalog.slice();
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  async function loadDetailByName(name, signal) {
    const response = await fetchWithTimeout(DAPI_DETAIL_URL + encodeURIComponent(name), {
      mode: "cors",
      cache: "default",
      signal: signal
    }, NETWORK_TIMEOUT_MS);
    if (!response.ok) throw new Error("Não foi possível carregar " + name + ".");
    return response.json();
  }

  function pickImage(detail) {
    const images = Array.isArray(detail && detail.images) ? detail.images : [];
    const item = images.find(function (image) { return image && image.href; });
    if (!item) return null;
    return {
      href: String(item.href),
      transparent: item.transparent === true
    };
  }

  function loadImage(url, signal) {
    return new Promise(function (resolve, reject) {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.decoding = "async";

      const onAbort = function () {
        image.src = "";
        reject(new DOMException("Aborted", "AbortError"));
      };

      if (signal) {
        if (signal.aborted) return onAbort();
        signal.addEventListener("abort", onAbort, { once: true });
      }

      image.onload = function () {
        if (signal) signal.removeEventListener("abort", onAbort);
        resolve(image);
      };
      image.onerror = function () {
        if (signal) signal.removeEventListener("abort", onAbort);
        reject(new Error("A imagem da DAPI não pôde ser processada pelo navegador."));
      };
      image.src = url;
    });
  }

  function waitForOpenCv() {
    if (state.cvPromise) return state.cvPromise;

    state.cvPromise = new Promise(function (resolve, reject) {
      const started = Date.now();

      function finishWhenReady() {
        let cvValue = window.cv;

        if (cvValue && typeof cvValue.then === "function") {
          cvValue.then(function (resolved) {
            window.cv = resolved;
            if (resolved && resolved.Mat) resolve(resolved);
            else reject(new Error("OpenCV carregou sem o módulo esperado."));
          }).catch(reject);
          return;
        }

        if (cvValue && cvValue.Mat) {
          resolve(cvValue);
          return;
        }

        if (Date.now() - started > 15000) {
          reject(new Error("Tempo esgotado ao preparar a segmentação local."));
          return;
        }

        setTimeout(finishWhenReady, 60);
      }

      if (window.cv) {
        finishWhenReady();
        return;
      }

      let script = document.querySelector('script[data-hg-opencv="1"]');
      if (!script) {
        script = document.createElement("script");
        script.src = OPENCV_URL;
        script.async = true;
        script.dataset.hgOpencv = "1";
        script.onerror = function () { reject(new Error("Não foi possível carregar o módulo de segmentação.")); };
        document.head.appendChild(script);
      }

      finishWhenReady();
    });

    return state.cvPromise;
  }

  function sourceCanvasForImage(image) {
    const naturalW = image.naturalWidth || image.width || 1;
    const naturalH = image.naturalHeight || image.height || 1;
    const scale = Math.min(1, SEGMENT.MAX_PROCESS_SIDE / Math.max(naturalW, naturalH));
    const width = Math.max(1, Math.round(naturalW * scale));
    const height = Math.max(1, Math.round(naturalH * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    return canvas;
  }

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
    let components = 0;
    let largest = 0;

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
        components += 1;
        largest = Math.max(largest, tail);
        for (let i = 0; i < tail; i += 1) output[queue[i]] = 1;
      }
    }

    return { binary: output, components: components, largest: largest };
  }

  function saturation255(r, g, b) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max <= 0) return 0;
    return ((max - min) * 255) / max;
  }

  function alphaMaskFromCanvas(canvas) {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const mask = new Uint8Array(canvas.width * canvas.height);
    for (let i = 0, p = 0; i < pixels.length; i += 4, p += 1) {
      mask[p] = pixels[i + 3] >= 12 ? 1 : 0;
    }
    return mask;
  }

  async function segmentObject(canvas) {
    const cv = await waitForOpenCv();
    const width = canvas.width;
    const height = canvas.height;
    const total = width * height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const rgba = ctx.getImageData(0, 0, width, height).data;

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
      if (min >= SEGMENT.BG_BRIGHT_MIN && chroma <= SEGMENT.BG_CHROMA_MAX) whiteish[p] = 1;
      if (sat > SEGMENT.FG_SAT_MIN || gray < SEGMENT.FG_DARK_MAX) strong[p] = 1;
    }

    const sureBackground = borderConnected(whiteish, width, height);
    const frame = Math.max(SEGMENT.FRAME_MIN, Math.round(Math.min(width, height) * SEGMENT.FRAME_RATIO));
    const safeFrame = frame * 2;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (x < safeFrame || y < safeFrame || x >= width - safeFrame || y >= height - safeFrame) {
          strong[y * width + x] = 0;
        }
      }
    }

    const strongFiltered = filterSmallComponents(strong, width, height, SEGMENT.MIN_SEED_AREA).binary;
    const seed = new Uint8Array(total);
    seed.fill(cv.GC_PR_FGD);

    for (let p = 0; p < total; p += 1) {
      if (sureBackground[p]) seed[p] = cv.GC_BGD;
      else if (mins[p] >= SEGMENT.PROB_BG_BRIGHT_MIN && chromas[p] <= SEGMENT.PROB_BG_CHROMA_MAX) seed[p] = cv.GC_PR_BGD;
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
      src = cv.imread(canvas);
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
        SEGMENT.GRABCUT_ITERATIONS,
        cv.GC_INIT_WITH_MASK
      );

      const rawForeground = new Uint8Array(total);
      for (let p = 0; p < total; p += 1) {
        const value = maskMat.data[p];
        if (value === cv.GC_FGD || value === cv.GC_PR_FGD) rawForeground[p] = 1;
      }

      const filtered = filterSmallComponents(rawForeground, width, height, SEGMENT.MIN_FINAL_AREA).binary;
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

  function evaluateMask(mask, width, height) {
    const total = width * height;
    let count = 0;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    let borderCount = 0;
    const borderDepth = 2;

    for (let p = 0; p < total; p += 1) {
      if (!mask[p]) continue;
      count += 1;
      const x = p % width;
      const y = (p / width) | 0;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (x < borderDepth || y < borderDepth || x >= width - borderDepth || y >= height - borderDepth) borderCount += 1;
    }

    if (!count || maxX < minX || maxY < minY) return { ok: false, reason: "empty" };

    const ratio = count / total;
    const boxW = (maxX - minX + 1) / width;
    const boxH = (maxY - minY + 1) / height;
    const borderRatio = borderCount / count;

    const ok = ratio >= 0.03 && ratio <= 0.72 && boxW >= 0.14 && boxH >= 0.14 && borderRatio <= 0.08;
    return { ok: ok, ratio: ratio, boxW: boxW, boxH: boxH, borderRatio: borderRatio };
  }

  function paintSilhouette(mask, width, height) {
    const canvas = $("#digiSilhouetteCanvas");
    if (!canvas) return;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    const image = ctx.createImageData(width, height);

    for (let p = 0, i = 0; p < mask.length; p += 1, i += 4) {
      if (!mask[p]) continue;
      image.data[i] = 0;
      image.data[i + 1] = 0;
      image.data[i + 2] = 0;
      image.data[i + 3] = 255;
    }

    ctx.putImageData(image, 0, 0);
    canvas.hidden = false;
  }

  async function prepareCandidate(name, signal) {
    const detail = await loadDetailByName(name, signal);
    const imageInfo = pickImage(detail);
    if (!imageInfo) throw new Error("Digimon sem imagem utilizável.");

    const image = await loadImage(imageInfo.href, signal);
    const source = sourceCanvasForImage(image);

    let mask;
    if (imageInfo.transparent) {
      mask = alphaMaskFromCanvas(source);
    } else {
      setStatus("SEGMENTANDO O OBJETO LOCALMENTE...", "loading");
      await yieldToBrowser();
      mask = await segmentObject(source);
      await yieldToBrowser();
    }

    const quality = evaluateMask(mask, source.width, source.height);
    if (!quality.ok) throw new Error("Máscara descartada pelo controle de qualidade.");

    return {
      name: String(detail.name || name),
      detail: detail,
      image: imageInfo,
      mask: mask,
      width: source.width,
      height: source.height,
      quality: quality
    };
  }

  async function newRound() {
    if (state.loadingRound) return;
    state.loadingRound = true;
    state.revealed = false;
    state.current = null;
    state.attempts = 0;
    updateAttemptBadge();
    resetHints();
    setControls(false);

    const input = $("#digiSilhouetteGuess");
    if (input) input.value = "";
    const roundLabel = $("#digiSilhouetteRoundLabel");
    if (roundLabel) roundLabel.textContent = "ANALISANDO SINAL...";

    if (state.abortController) state.abortController.abort();
    state.abortController = new AbortController();
    const signal = state.abortController.signal;

    setLoading(true, "LOCALIZANDO DIGIMON...", "Preparando máscara no navegador");
    setStatus("CONSULTANDO CATÁLOGO PÚBLICO DA DAPI...", "loading");

    try {
      const catalog = await loadCatalog(signal);
      let lastError = null;

      for (let attempt = 0; attempt < MAX_CANDIDATE_ATTEMPTS; attempt += 1) {
        if (signal.aborted) throw new DOMException("Aborted", "AbortError");
        const name = chooseName(catalog);
        state.usedNames.add(name);

        try {
          setLoading(true, "GERANDO SILHUETA...", "Teste automático de máscara " + (attempt + 1) + "/" + MAX_CANDIDATE_ATTEMPTS);
          const candidate = await prepareCandidate(name, signal);
          state.current = candidate;
          paintSilhouette(candidate.mask, candidate.width, candidate.height);

          const original = $("#digiSilhouetteOriginal");
          if (original) {
            original.src = candidate.image.href;
            original.alt = candidate.name;
            original.hidden = true;
          }

          const loading = $("#digiSilhouetteLoading");
          if (loading) loading.hidden = true;
          const result = $("#digiSilhouetteResult");
          if (result) result.hidden = true;
          if (roundLabel) roundLabel.textContent = "SINAL BLOQUEADO // IDENTIFIQUE O ALVO";

          setControls(true);
          setStatus("SILHUETA PRONTA. IDENTIFIQUE O DIGIMON.", "success");
          if (input) {
            input.disabled = false;
            input.focus({ preventScroll: true });
          }
          return;
        } catch (error) {
          if (error && error.name === "AbortError") throw error;
          lastError = error;
          console.warn("[Digi Silhouette] candidato descartado:", name, error);
          await yieldToBrowser();
        }
      }

      throw lastError || new Error("Nenhuma máscara passou no controle de qualidade.");
    } catch (error) {
      if (error && error.name === "AbortError") return;
      console.error("[Digi Silhouette]", error);
      setLoading(true, "NÃO FOI POSSÍVEL GERAR A SILHUETA", "Clique em PRÓXIMO para tentar novamente");
      setStatus(error && error.message ? error.message.toUpperCase() : "ERRO AO PREPARAR O JOGO.", "error");
    } finally {
      state.loadingRound = false;
    }
  }

  function onGuess(event) {
    event.preventDefault();
    if (!state.current || state.revealed) return;

    const input = $("#digiSilhouetteGuess");
    const guess = normalizarResposta(input && input.value);
    if (!guess) {
      setStatus("DIGITE UM NOME ANTES DE CHUTAR.", "error");
      return;
    }

    state.attempts += 1;
    updateAttemptBadge();

    const answer = normalizarResposta(state.current.name);
    if (guess === answer) {
      setStatus("IDENTIFICAÇÃO CORRETA!", "success");
      reveal(true);
      return;
    }

    setStatus("NÃO É ESSE DIGIMON. TENTE NOVAMENTE.", "error");
    if (input) {
      input.select();
      input.focus({ preventScroll: true });
    }
  }

  function reveal(correct) {
    if (!state.current || state.revealed) return;
    state.revealed = true;
    setControls(false);

    const canvas = $("#digiSilhouetteCanvas");
    const original = $("#digiSilhouetteOriginal");
    const result = $("#digiSilhouetteResult");
    const name = $("#digiSilhouetteName");
    const roundLabel = $("#digiSilhouetteRoundLabel");

    if (canvas) canvas.classList.add("is-revealing");

    window.setTimeout(function () {
      if (canvas) {
        canvas.hidden = true;
        canvas.classList.remove("is-revealing");
      }
      if (original) original.hidden = false;
      if (name) name.textContent = state.current.name;
      if (result) result.hidden = false;
      if (roundLabel) roundLabel.textContent = correct ? "IDENTIFICAÇÃO CONFIRMADA" : "SINAL REVELADO";
    }, 220);

    setStatus(correct ? "ACERTO CONFIRMADO. ALVO REVELADO." : "RESPOSTA REVELADA.", correct ? "success" : "normal");
  }

  function initialize() {
    const root = $("#digiSilhouetteRoot");
    if (!root) return;

    if (!state.mounted) {
      renderBase(root);
      state.mounted = true;
      newRound();
      return;
    }

    if (!state.current && !state.loadingRound) newRound();
  }

  window.inicializarDigiSilhouette = initialize;
})();
