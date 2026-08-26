/* =====================================================
   HOLY GUARDIANS — DIGI SILHOUETTE
   Client-side only. DAPI direct + OpenCV.js segmentation in a browser Web Worker.
   Does not use the Holy Guardians Worker/API or legacy identifiers.
===================================================== */
(function () {
  "use strict";

  const DAPI_LIST_URL = "https://digi-api.com/api/v1/digimon?pageSize=2000";
  const DAPI_DETAIL_URL = "https://digi-api.com/api/v1/digimon/";
  const CATALOG_CACHE_KEY = "hg_digi_silhouette_catalog_v1";
  const CATALOG_CACHE_MS = 12 * 60 * 60 * 1000;
  const NETWORK_TIMEOUT_MS = 12000;
  const MAX_CANDIDATE_ATTEMPTS = 2;
  const PROCESSOR_INIT_TIMEOUT_MS = 45000;
  const SEGMENT_TIMEOUT_MS = 12000;
  const PROCESSOR_URL = "digi_silhouette_processor.js?v=20260826-v6";

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
    GRABCUT_ITERATIONS: 2,
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
    streamerMode: false,
    usedNames: new Set(),
    abortController: null,
    processorWorker: null,
    processorReady: false,
    processorReadyPromise: null,
    processorReadyResolve: null,
    processorReadyReject: null,
    processorInitTimer: null,
    processorPending: new Map(),
    processorJobSeq: 0,
    roundSeq: 0
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

  function ensureLocalStylePatch() {
    if (document.getElementById("hgDigiSilhouettePatchV7")) return;
    const style = document.createElement("style");
    style.id = "hgDigiSilhouettePatchV7";
    style.textContent = `
      .digi-silhouette-loading[hidden],
      .digi-silhouette-canvas[hidden],
      .digi-silhouette-original[hidden],
      .digi-silhouette-result[hidden] { display:none !important; }

      .digi-silhouette-screen {
        background:
          linear-gradient(rgba(68, 214, 255, .05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(68, 214, 255, .05) 1px, transparent 1px),
          radial-gradient(circle at center, rgba(28, 109, 188, .34), rgba(3, 21, 49, .96) 60%, rgba(1, 7, 18, .99) 100%) !important;
        box-shadow: inset 0 0 58px rgba(0, 0, 0, .35), inset 0 0 40px rgba(18, 150, 235, .12) !important;
      }

      .digi-silhouette-screen::before {
        border-color: rgba(88, 214, 255, .13) !important;
        box-shadow: 0 0 80px rgba(58, 188, 255, .08) !important;
      }

      .digi-silhouette-canvas {
        filter:
          drop-shadow(0 0 10px rgba(79, 219, 255, .20))
          drop-shadow(0 0 22px rgba(45, 168, 255, .16))
          drop-shadow(0 26px 18px rgba(0, 0, 0, .56)) !important;
      }
    `;
    document.head.appendChild(style);
  }

  function syncHidden(el, hidden) {
    if (!el) return;
    el.hidden = !!hidden;
    el.style.display = hidden ? "none" : "";
  }

  function renderBase(root) {
    root.innerHTML = `
      <div class="digi-silhouette-shell" id="digiSilhouetteShell">
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

        <main class="digi-silhouette-grid digi-silhouette-terminal-layout">
          <section class="digi-silhouette-viewer digi-silhouette-terminal-viewer tech-corners">
            <div class="digi-silhouette-viewer-head">
              <div>
                <small>WHO'S THAT DIGIMON?</small>
                <strong id="digiSilhouetteRoundLabel">ANALISANDO SINAL...</strong>
              </div>
              <span id="digiSilhouetteAttemptBadge">0 TENTATIVAS</span>
            </div>

            <div class="digi-silhouette-device-stage" id="digiSilhouetteDeviceStage">
              <div class="digi-silhouette-terminal-top">
                <div class="digi-silhouette-screen" id="digiSilhouetteScreen">
                  <div class="digi-silhouette-scanlines" aria-hidden="true"></div>

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
              </div>

              <section class="digi-silhouette-terminal-bottom" aria-labelledby="digiSilhouetteHintsTitle">
                <div class="digi-silhouette-hints-head digi-silhouette-terminal-hints-head">
                  <small>DATA FRAGMENTS</small>
                  <strong id="digiSilhouetteHintsTitle">DICAS</strong>
                </div>
                <div id="digiSilhouetteHintsList" class="digi-silhouette-hints-list digi-silhouette-terminal-hints-list">
                  <div class="digi-silhouette-hint-empty">Nenhuma dica liberada.</div>
                </div>
              </section>

              <img class="digi-silhouette-terminal-frame" src="digi_silhouette_terminal.png" alt="" aria-hidden="true">

              <button id="digiSilhouetteStreamerDeviceBtn" class="digi-silhouette-device-btn digi-silhouette-device-streamer" type="button" aria-label="Alternar modo streamer" aria-pressed="false" title="Modo Streamer"></button>
              <button id="digiSilhouetteHintDeviceBtn" class="digi-silhouette-device-btn digi-silhouette-device-hint" type="button" aria-label="Liberar dica" title="Dica" disabled></button>
              <button id="digiSilhouetteRevealDeviceBtn" class="digi-silhouette-device-btn digi-silhouette-device-reveal" type="button" aria-label="Revelar Digimon" title="Revelar" disabled></button>
              <button id="digiSilhouetteNextDeviceBtn" class="digi-silhouette-device-btn digi-silhouette-device-next" type="button" aria-label="Próximo Digimon" title="Próximo"></button>
            </div>

            <div class="digi-silhouette-device-map" aria-label="Mapa temporário dos controles">
              <span><b>◉</b> STREAMER</span>
              <span><b>▲</b> DICA</span>
              <span><b>▼</b> REVELAR</span>
              <span><b>●</b> PRÓXIMO</span>
            </div>

            <div class="digi-silhouette-status" id="digiSilhouetteStatus" aria-live="polite">INICIALIZANDO TERMINAL...</div>
          </section>

          <aside class="digi-silhouette-control digi-silhouette-identification-panel tech-corners">
            <div class="digi-silhouette-control-head">
              <small>IDENTIFICATION INPUT</small>
              <strong>QUAL É O DIGIMON?</strong>
            </div>

            <form id="digiSilhouetteForm" class="digi-silhouette-form" autocomplete="off">
              <label for="digiSilhouetteGuess">SEU CHUTE</label>
              <div class="digi-silhouette-input-wrap">
                <input id="digiSilhouetteGuess" type="text" maxlength="90" placeholder="Digite o nome..." spellcheck="false" autocomplete="off" list="digiSilhouetteSuggestions" disabled>
                <button id="digiSilhouetteGuessBtn" type="submit" disabled>CHUTAR</button>
              </div>
            </form>

            <datalist id="digiSilhouetteSuggestions"></datalist>

            <div class="digi-silhouette-control-help">
              <small>CONTROLES DO TERMINAL</small>
              <p>Use os botões físicos à esquerda do aparelho para Dica, Revelar, Próximo e Modo Streamer.</p>
            </div>

            <div class="digi-silhouette-note">
              <span>PROCESSAMENTO LOCAL</span>
              <p>O recorte da silhueta acontece no dispositivo do jogador. A Holy Guardians API não é consultada por este minigame.</p>
            </div>
          </aside>
        </main>
      </div>
    `;

    const form = $("#digiSilhouetteForm", root);
    if (form) form.addEventListener("submit", onGuess);

    const hintDevice = $("#digiSilhouetteHintDeviceBtn", root);
    if (hintDevice) hintDevice.addEventListener("click", showHint);

    const revealDevice = $("#digiSilhouetteRevealDeviceBtn", root);
    if (revealDevice) revealDevice.addEventListener("click", function () { reveal(false); });

    const nextDevice = $("#digiSilhouetteNextDeviceBtn", root);
    if (nextDevice) nextDevice.addEventListener("click", function () { newRound(true); });

    const streamerDevice = $("#digiSilhouetteStreamerDeviceBtn", root);
    if (streamerDevice) streamerDevice.addEventListener("click", function () { toggleStreamerMode(); });

    const guessInput = $("#digiSilhouetteGuess", root);
    if (guessInput) {
      guessInput.addEventListener("input", function () {
        updateSuggestionList(guessInput.value);
      });
      guessInput.addEventListener("focus", function () {
        updateSuggestionList(guessInput.value);
      });
    }
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

    syncHidden(loading, !active);
    if (active) {
      const strong = $("strong", loading);
      const small = $("small", loading);
      if (strong && main) strong.textContent = main;
      if (small && sub) small.textContent = sub;
      syncHidden(canvas, true);
      syncHidden(original, true);
      syncHidden(result, true);
    }
  }

  function setControls(enabled) {
    const ids = [
      "digiSilhouetteGuess",
      "digiSilhouetteGuessBtn",
      "digiSilhouetteHintDeviceBtn",
      "digiSilhouetteRevealDeviceBtn"
    ];
    ids.forEach(function (name) {
      const el = document.getElementById(name);
      if (el) el.disabled = !enabled;
    });
  }

  function toggleStreamerMode(force) {
    const next = typeof force === "boolean" ? force : !state.streamerMode;
    state.streamerMode = next;

    const shell = $("#digiSilhouetteShell");
    if (shell) shell.classList.toggle("is-streamer", next);

    const button = $("#digiSilhouetteStreamerDeviceBtn");
    if (button) {
      button.setAttribute("aria-pressed", next ? "true" : "false");
      button.title = next ? "Sair do Modo Streamer" : "Modo Streamer";
    }

    setStatus(next ? "MODO STREAMER ATIVADO." : "MODO STREAMER DESATIVADO.", next ? "success" : "normal");
  }

  function updateAttemptBadge() {
    const el = $("#digiSilhouetteAttemptBadge");
    if (!el) return;
    el.textContent = state.attempts + (state.attempts === 1 ? " TENTATIVA" : " TENTATIVAS");
  }

  function updateSuggestionList(query) {
    const list = $("#digiSilhouetteSuggestions");
    if (!list) return;

    const names = Array.isArray(state.catalog) ? state.catalog : [];
    const normalizedQuery = normalizarResposta(query || "");

    let matches = names;
    if (normalizedQuery) {
      const starts = [];
      const contains = [];
      names.forEach(function (name) {
        const normalizedName = normalizarResposta(name);
        if (!normalizedName) return;
        if (normalizedName.indexOf(normalizedQuery) === 0) starts.push(name);
        else if (normalizedName.indexOf(normalizedQuery) !== -1) contains.push(name);
      });
      matches = starts.concat(contains);
    }

    list.innerHTML = matches.slice(0, 40).map(function (name) {
      return '<option value="' + escaparAttr(name) + '"></option>';
    }).join("");
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
      const btn = $("#digiSilhouetteHintDeviceBtn");
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
      updateSuggestionList("");
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
        updateSuggestionList("");
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
    updateSuggestionList("");
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

  function rejectProcessorPending(error) {
    state.processorPending.forEach(function (job) {
      clearTimeout(job.timer);
      if (job.signal && job.onAbort) job.signal.removeEventListener("abort", job.onAbort);
      job.reject(error);
    });
    state.processorPending.clear();
  }

  function resetProcessorReadyState(error) {
    if (state.processorInitTimer) {
      clearTimeout(state.processorInitTimer);
      state.processorInitTimer = null;
    }
    if (error && state.processorReadyReject) {
      try { state.processorReadyReject(error); } catch (ignore) {}
    }
    state.processorReady = false;
    state.processorReadyPromise = null;
    state.processorReadyResolve = null;
    state.processorReadyReject = null;
  }

  function terminateProcessorWorker(error) {
    if (state.processorWorker) {
      try { state.processorWorker.terminate(); } catch (ignore) {}
      state.processorWorker = null;
    }
    if (state.processorPending.size) {
      rejectProcessorPending(error || new Error("Processamento cancelado."));
    }
    resetProcessorReadyState(error);
  }

  function ensureProcessorWorker() {
    if (state.processorWorker) return state.processorWorker;

    state.processorReady = false;
    state.processorReadyPromise = new Promise(function(resolve, reject) {
      state.processorReadyResolve = resolve;
      state.processorReadyReject = reject;
    });
    // Pre-warm may finish before a round starts; prevent a rejected warm-up
    // from becoming an unhandled promise while keeping the original promise reusable.
    state.processorReadyPromise.catch(function () {});

    const worker = new Worker(PROCESSOR_URL, { type: "module", name: "hg-digi-silhouette" });
    state.processorWorker = worker;

    state.processorInitTimer = setTimeout(function () {
      if (state.processorReady) return;
      const error = new Error("O núcleo de segmentação não iniciou em até 45 segundos.");
      terminateProcessorWorker(error);
    }, PROCESSOR_INIT_TIMEOUT_MS);

    worker.onmessage = function (event) {
      const data = event && event.data || {};

      if (data.type === "ready") {
        state.processorReady = true;
        if (state.processorInitTimer) {
          clearTimeout(state.processorInitTimer);
          state.processorInitTimer = null;
        }
        if (state.processorReadyResolve) state.processorReadyResolve(worker);
        state.processorReadyResolve = null;
        state.processorReadyReject = null;
        return;
      }

      if (data.type === "init-error") {
        const error = new Error(data.message || "Não foi possível iniciar o OpenCV local.");
        terminateProcessorWorker(error);
        return;
      }

      const job = state.processorPending.get(data.id);
      if (!job) return;

      state.processorPending.delete(data.id);
      clearTimeout(job.timer);
      if (job.signal && job.onAbort) job.signal.removeEventListener("abort", job.onAbort);

      if (data.type === "result" && data.maskBuffer) {
        job.resolve(new Uint8Array(data.maskBuffer));
      } else {
        job.reject(new Error(data.message || "Falha no processador de máscara."));
      }
    };

    worker.onerror = function (event) {
      const detail = event && event.message ? ": " + event.message : "";
      const error = new Error("O processador local de máscara falhou" + detail);
      terminateProcessorWorker(error);
    };

    return worker;
  }

  function waitForProcessorReady(signal) {
    ensureProcessorWorker();
    if (state.processorReady) return Promise.resolve(state.processorWorker);

    return new Promise(function(resolve, reject) {
      let settled = false;

      function done(fn, value) {
        if (settled) return;
        settled = true;
        if (signal) signal.removeEventListener("abort", onAbort);
        fn(value);
      }

      function onAbort() {
        done(reject, new DOMException("Aborted", "AbortError"));
      }

      if (signal) {
        if (signal.aborted) {
          reject(new DOMException("Aborted", "AbortError"));
          return;
        }
        signal.addEventListener("abort", onAbort, { once: true });
      }

      state.processorReadyPromise.then(function(worker) {
        done(resolve, worker);
      }).catch(function(error) {
        done(reject, error);
      });
    });
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

  async function segmentObject(canvas, signal) {
    const width = canvas.width;
    const height = canvas.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const imageData = ctx.getImageData(0, 0, width, height);

    setStatus("INICIALIZANDO NÚCLEO DE SEGMENTAÇÃO...", "loading");
    const worker = await waitForProcessorReady(signal);
    if (signal && signal.aborted) throw new DOMException("Aborted", "AbortError");
    setStatus("NÚCLEO PRONTO // GERANDO MÁSCARA...", "loading");

    const id = ++state.processorJobSeq;

    return new Promise(function (resolve, reject) {
      let settled = false;

      function finishResolve(mask) {
        if (settled) return;
        settled = true;
        resolve(mask);
      }

      function finishReject(error) {
        if (settled) return;
        settled = true;
        reject(error);
      }

      const onAbort = function () {
        const job = state.processorPending.get(id);
        if (!job) return;
        state.processorPending.delete(id);
        clearTimeout(job.timer);
        terminateProcessorWorker(new DOMException("Aborted", "AbortError"));
        finishReject(new DOMException("Aborted", "AbortError"));
      };

      if (signal) {
        if (signal.aborted) {
          finishReject(new DOMException("Aborted", "AbortError"));
          return;
        }
        signal.addEventListener("abort", onAbort, { once: true });
      }

      const timer = setTimeout(function () {
        if (!state.processorPending.has(id)) return;
        state.processorPending.delete(id);
        if (signal) signal.removeEventListener("abort", onAbort);
        const error = new Error("A máscara demorou demais e foi cancelada automaticamente.");
        terminateProcessorWorker(error);
        finishReject(error);
      }, SEGMENT_TIMEOUT_MS);

      state.processorPending.set(id, {
        resolve: finishResolve,
        reject: finishReject,
        timer: timer,
        signal: signal,
        onAbort: onAbort
      });

      try {
        worker.postMessage({
          type: "segment",
          id: id,
          width: width,
          height: height,
          config: SEGMENT,
          rgbaBuffer: imageData.data.buffer
        }, [imageData.data.buffer]);
      } catch (error) {
        state.processorPending.delete(id);
        clearTimeout(timer);
        if (signal) signal.removeEventListener("abort", onAbort);
        finishReject(error);
      }
    });
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
    const glow = new Uint8Array(mask.length);

    function markGlow(x, y, alpha) {
      if (x < 0 || y < 0 || x >= width || y >= height) return;
      const index = y * width + x;
      if (mask[index]) return;
      if (alpha > glow[index]) glow[index] = alpha;
    }

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const p = y * width + x;
        if (!mask[p]) continue;

        let edge = false;
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            if (!dx && !dy) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height || !mask[ny * width + nx]) {
              edge = true;
            }
          }
        }

        if (edge) {
          for (let dy = -2; dy <= 2; dy += 1) {
            for (let dx = -2; dx <= 2; dx += 1) {
              const distance = Math.max(Math.abs(dx), Math.abs(dy));
              if (distance === 0) continue;
              markGlow(x + dx, y + dy, distance === 1 ? 150 : 68);
            }
          }
        }
      }
    }

    for (let p = 0, i = 0; p < mask.length; p += 1, i += 4) {
      if (mask[p]) {
        image.data[i] = 3;
        image.data[i + 1] = 6;
        image.data[i + 2] = 10;
        image.data[i + 3] = 255;
      } else if (glow[p]) {
        image.data[i] = 74;
        image.data[i + 1] = 226;
        image.data[i + 2] = 255;
        image.data[i + 3] = glow[p];
      }
    }

    ctx.putImageData(image, 0, 0);
    syncHidden(canvas, false);
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
      setStatus("SEGMENTANDO EM THREAD SEPARADA // SITE CONTINUA RESPONSIVO...", "loading");
      await yieldToBrowser();
      mask = await segmentObject(source, signal);
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

  async function newRound(force) {
    if (state.loadingRound && !force) return;

    if (state.abortController) state.abortController.abort();

    const roundId = ++state.roundSeq;
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

    state.abortController = new AbortController();
    const signal = state.abortController.signal;

    setLoading(true, "LOCALIZANDO DIGIMON...", "Preparando máscara no navegador");
    setStatus("CONSULTANDO CATÁLOGO PÚBLICO DA DAPI...", "loading");

    try {
      const catalog = await loadCatalog(signal);
      if (roundId !== state.roundSeq) return;
      let lastError = null;

      for (let attempt = 0; attempt < MAX_CANDIDATE_ATTEMPTS; attempt += 1) {
        if (signal.aborted) throw new DOMException("Aborted", "AbortError");
        const name = chooseName(catalog);
        state.usedNames.add(name);

        try {
          setLoading(true, "GERANDO SILHUETA...", "Teste automático de máscara " + (attempt + 1) + "/" + MAX_CANDIDATE_ATTEMPTS);
          const candidate = await prepareCandidate(name, signal);
          if (roundId !== state.roundSeq) return;
          state.current = candidate;
          paintSilhouette(candidate.mask, candidate.width, candidate.height);

          const original = $("#digiSilhouetteOriginal");
          if (original) {
            original.src = candidate.image.href;
            original.alt = candidate.name;
            syncHidden(original, true);
          }

          const loading = $("#digiSilhouetteLoading");
          if (loading) syncHidden(loading, true);
          const result = $("#digiSilhouetteResult");
          if (result) syncHidden(result, true);
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
      const motivo = error && error.message ? error.message : "Erro ao preparar o jogo.";
      setLoading(true, "NÃO FOI POSSÍVEL GERAR A SILHUETA", "Motivo: " + motivo);
      setStatus(motivo.toUpperCase(), "error");
    } finally {
      if (roundId === state.roundSeq) state.loadingRound = false;
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
        syncHidden(canvas, true);
        canvas.classList.remove("is-revealing");
      }
      if (original) syncHidden(original, false);
      if (name) name.textContent = state.current.name;
      if (result) syncHidden(result, false);
      if (roundLabel) roundLabel.textContent = correct ? "IDENTIFICAÇÃO CONFIRMADA" : "SINAL REVELADO";
    }, 220);

    setStatus(correct ? "ACERTO CONFIRMADO. ALVO REVELADO." : "RESPOSTA REVELADA.", correct ? "success" : "normal");
  }

  function initialize() {
    const root = $("#digiSilhouetteRoot");
    if (!root) return;

    ensureLocalStylePatch();

    if (!state.mounted) {
      renderBase(root);
      state.mounted = true;
      toggleStreamerMode(false);
      try { ensureProcessorWorker(); } catch (error) { console.warn("[Digi Silhouette] pré-aquecimento falhou:", error); }
      newRound();
      return;
    }

    if (!state.current && !state.loadingRound) newRound();
  }

  window.inicializarDigiSilhouette = initialize;
})();
