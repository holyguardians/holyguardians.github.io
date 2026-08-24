/* =====================================================
   DIGI GUESS + DIGI ZOOM
   Standalone game module. Data is loaded only when a game is opened.
===================================================== */
(function () {
  "use strict";

  var DATA_URL = "data/digi_game_data.json";
  var dataPromise = null;
  var loading = { guess: false, zoom: false };
  var games = { guess: null, zoom: null };

  function t(key, fallback) {
    return typeof window.hgT === "function" ? window.hgT(key, fallback) : fallback;
  }
  function language() { return typeof window.hgGetLanguage === "function" ? window.hgGetLanguage() : "pt-BR"; }
  var VALUE_TRANSLATIONS = {"ko-KR":{"Baby I":"유년기 I","Baby II":"유년기 II","Child":"성장기","Adult":"성숙기","Perfect":"완전체","Ultimate":"궁극체","Armor":"아머체","Hybrid":"하이브리드체","Vaccine":"백신","Virus":"바이러스","Data":"데이터","Free":"프리","Unknown":"언노운","Reptile":"파충류","Dinosaur":"공룡형","Demon Lord":"마왕형","Deep Savers":"딥 세이버즈","Dragon's Roar":"드래곤즈 로어","Metal Empire":"메탈 엠파이어","Nature Spirits":"네이처 스피릿츠","Nightmare Soldiers":"나이트메어 솔저스","Virus Busters":"바이러스 버스터즈"}};
  function displayValue(value) { var shown=(VALUE_TRANSLATIONS[language()] || {})[value] || value; if (language() !== "ko-KR") { var stages={"Child":"Rookie","Adult":"Champion","Perfect":"Ultimate","Ultimate":"Mega"}; shown=stages[value] || shown; } return shown; }
  function displayName(item) { var name = String(item && item.name || ""); var names = language() === "ko-KR" && window.HG_I18N && window.HG_I18N["ko-KR"] && window.HG_I18N["ko-KR"].__digimonNames; return names && names[name] ? names[name] : name; }
  function stageValues(item) { var name=String(item && item.name || ""); var overrides={"Angewomon":"Perfect"}; if(overrides[name]) return [overrides[name]]; var levels = Array.isArray(item && item.level) ? item.level : []; if (levels.indexOf("Armor") !== -1) return ["Armor"]; if (levels.indexOf("Hybrid") !== -1) return ["Hybrid"]; var order=["Ultimate","Perfect","Adult","Child","Baby II","Baby I","Unknown"]; for(var i=0;i<order.length;i++) if(levels.indexOf(order[i])!==-1) return [order[i]]; return levels; }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  function dateKey(offsetDays) {
    /* Desafio diário troca às 21:00 no horário de Brasília. */
    var brt = new Date(Date.now() - 3 * 60 * 60 * 1000);
    if (brt.getUTCHours() < 21) brt.setUTCDate(brt.getUTCDate() - 1);
    brt.setUTCDate(brt.getUTCDate() + (Number(offsetDays) || 0));
    return brt.toISOString().slice(0, 10);
  }

  function hash(text) {
    var value = 2166136261;
    for (var i = 0; i < text.length; i++) value = Math.imul(value ^ text.charCodeAt(i), 16777619);
    return value >>> 0;
  }

  function loadData() {
    if (!dataPromise) {
      dataPromise = fetch(DATA_URL, { cache: "force-cache" })
        .then(function (response) { if (!response.ok) throw new Error("HTTP " + response.status); return response.json(); })
        .then(function (payload) {
          var list = Array.isArray(payload && payload.digimons) ? payload.digimons : [];
          return list.filter(function (item) { return item && item.id && item.name && item.image; });
        });
    }
    return dataPromise;
  }

  function sameList(a, b) {
    var left = Array.isArray(a) ? a : [];
    var right = Array.isArray(b) ? b : [];
    return left.length === right.length && left.every(function (item) { return right.indexOf(item) !== -1; });
  }

  function overlap(a, b) {
    return (Array.isArray(a) ? a : []).some(function (item) { return (Array.isArray(b) ? b : []).indexOf(item) !== -1; });
  }

  function displayList(value) {
    var list = Array.isArray(value) ? value : [];
    return list.length ? list.join(" · ") : "—";
  }

  function comparison(guess, answer, key) {
    if (key === "year") {
      var a = Number(answer.year) || 0;
      var g = Number(guess.year) || 0;
      if (a && g && a === g) return { tone: "correct", marker: "✓" };
      if (a && g) return { tone: "partial", marker: g < a ? "↑" : "↓" };
      return { tone: "wrong", marker: "×" };
    }
    var guessValues = guess[key] || [];
    var answerValues = answer[key] || [];
    if (sameList(guessValues, answerValues)) return { tone: "correct", marker: "✓" };
    if (overlap(guessValues, answerValues)) return { tone: "partial", marker: "≈" };
    return { tone: "wrong", marker: "×" };
  }

  function dailyTarget(list, mode, offsetDays) {
    return list[hash(dateKey(offsetDays) + "::" + mode) % list.length];
  }

  function gameStorageKey(mode, free) {
    return "hg_digi_game_" + mode + "_" + (free ? "free" : dateKey());
  }

  function saveGame(state) {
    if (state.free) return;
    try {
      localStorage.setItem(gameStorageKey(state.mode, false), JSON.stringify({ attemptIds: state.attempts.map(function (item) { return item.id; }), finished: state.finished }));
    } catch (error) {}
  }

  function restoreGame(state) {
    if (state.free) return;
    try {
      var saved = JSON.parse(localStorage.getItem(gameStorageKey(state.mode, false)) || "null");
      if (!saved || !Array.isArray(saved.attemptIds)) return;
      state.attempts = saved.attemptIds.map(function (id) { return state.byId[id]; }).filter(Boolean);
      state.finished = !!saved.finished;
    } catch (error) {}
  }

  function newGame(mode, free) {
    if (loading[mode]) return dataPromise;
    loading[mode] = true;
    return loadData().then(function (list) {
      var byId = Object.create(null);
      list.forEach(function (item) { byId[item.id] = item; });
      var state = {
        mode: mode,
        free: !!free,
        list: list,
        byId: byId,
        target: free ? list[Math.floor(Math.random() * list.length)] : dailyTarget(list, mode, 0),
        previous: free ? null : dailyTarget(list, mode, -1),
        attempts: [],
        finished: false, streamer: false, revealed: false,
        query: ""
      };
      restoreGame(state);
      if (state.attempts.some(function (item) { return item.id === state.target.id; })) state.finished = true;
      games[mode] = state;
      render(mode);
    }).catch(function () {
      var root = document.querySelector('[data-digi-game="' + mode + '"]');
      if (root) root.innerHTML = '<div class="digi-game-error">' + escapeHtml(t("digi.error", "Não foi possível carregar a lista de Digimon agora.")) + "</div>";
    }).finally(function () {
      loading[mode] = false;
    });
  }

  function resultCell(label, value, state) {
    return '<div class="digi-guess-cell ' + state.tone + '"><strong>' + value + '</strong><b>' + state.marker + "</b></div>";
  }

  function valueList(values, answerValues, highlightMatchesOnly) {
    var list = Array.isArray(values) ? values : [];
    return '<span class="digi-value-list">' + (list.length ? list.map(function (value) {
      return '<i class="' + (!highlightMatchesOnly || (answerValues || []).indexOf(value) !== -1 ? 'match' : '') + '">' + escapeHtml(displayValue(value)) + '</i>';
    }).join('') : '<i>—</i>') + '</span>';
  }

  function guessTableHeader() {
    return '<div class="digi-guess-head"><span>DIGIMON</span><span>' + escapeHtml(t("digi.level", "LEVEL")) + '</span><span>' + escapeHtml(t("digi.attribute", "ATTRIBUTE")) + '</span><span>' + escapeHtml(t("digi.type", "TYPE")) + '</span><span>' + escapeHtml(t("digi.field", "FIELD")) + '</span><span>' + escapeHtml(t("digi.year", "YEAR")) + '</span><span>X-ANTIBODY</span></div>';
  }

  function hasXAntibody(item) {
    return /x[- ]?antibody/i.test(String(item && item.name || ""));
  }

  function guessRows(state) {
    if (!state.attempts.length) return '<div class="digi-game-empty">' + escapeHtml(t("digi.empty", "Sua primeira tentativa aparecerá aqui.")) + "</div>";
    var answer = state.target;
    return state.attempts.slice().reverse().map(function (guess) {
      return '<article class="digi-guess-row">' +
        '<div class="digi-guess-name"><img src="' + escapeHtml(guess.image) + '" alt=""><strong>' + escapeHtml(displayName(guess)) + "</strong></div>" +
        resultCell('', valueList(stageValues(guess), stageValues(answer), false), (function(){ var g={level:stageValues(guess)},a={level:stageValues(answer)}; return comparison(g,a,"level"); }())) +
        resultCell('', valueList(guess.attribute, answer.attribute, false), comparison(guess, answer, "attribute")) +
        resultCell('', valueList(guess.type, answer.type, false), comparison(guess, answer, "type")) +
        resultCell('', valueList(guess.field, answer.field, true), comparison(guess, answer, "field")) +
        resultCell('', escapeHtml(guess.year || "—"), comparison(guess, answer, "year")) +
        resultCell('', hasXAntibody(guess) ? '<span class="digi-x-answer">SIM</span>' : '<span class="digi-x-answer">NÃO</span>', { tone: hasXAntibody(guess) === hasXAntibody(answer) ? "correct" : "wrong", marker: hasXAntibody(guess) === hasXAntibody(answer) ? "✓" : "×" }) +
      "</article>";
    }).join("");
  }

  function suggestionList(state) {
    var query = String(state.query || "").trim().toLowerCase();
    if (query.length < 2 || state.finished) return "";
    var selected = state.attempts.map(function (item) { return item.id; });
    var matches = state.list.filter(function (item) { return selected.indexOf(item.id) === -1 && (item.name.toLowerCase().indexOf(query) !== -1 || displayName(item).toLowerCase().indexOf(query) !== -1); }).sort(function (a, b) { var aStart = a.name.toLowerCase().indexOf(query) === 0 ? 0 : 1; var bStart = b.name.toLowerCase().indexOf(query) === 0 ? 0 : 1; return aStart - bStart || a.name.localeCompare(b.name); }).slice(0, 30);
    if (!matches.length) return '<div class="digi-suggestions-empty">' + escapeHtml(t("digi.noResults", "Nenhum Digimon encontrado.")) + "</div>";
    return matches.map(function (item) {
      return '<button type="button" data-digi-pick="' + item.id + '"><img src="' + escapeHtml(item.image) + '" alt=""><span>' + escapeHtml(displayName(item)) + "</span></button>";
    }).join("");
  }

  function resultBanner(state) {
    if (!state.finished) return "";
    if (state.streamer && !state.revealed) return '<div class="digi-result-banner streamer"><div><small>' + escapeHtml(t("digi.streamerProtected", "RESPOSTA PROTEGIDA PARA A LIVE")) + '</small><button type="button" data-digi-reveal>' + escapeHtml(t("digi.reveal", "REVELAR RESPOSTA")) + '</button></div></div>';
    var won = state.attempts.some(function (item) { return item.id === state.target.id; });
    return '<div class="digi-result-banner digi-reveal-card ' + (won ? "won" : "lost") + '"><span class="digi-reveal-sparks">✦ ✧ ✦</span><img src="' + escapeHtml(state.target.image) + '" alt=""><div><small>' + escapeHtml(won ? t("digi.won", "VOCÊ ACERTOU!") : t("digi.answer", "A RESPOSTA ERA")) + "</small><strong>" + escapeHtml(displayName(state.target)) + '</strong></div></div>' + (!state.free && state.previous ? '<div class="digi-previous"><img src="' + escapeHtml(state.previous.image) + '" alt=""><span>' + escapeHtml(t("digi.previous", "DESAFIO ANTERIOR")) + '</span><strong>' + escapeHtml(displayName(state.previous)) + '</strong></div>' : '');
  }

  function modeHeader(state) {
    var other = state.mode === "guess" ? "zoom" : "guess";
    var otherLabel = state.mode === "guess" ? "DIGI ZOOM" : "DIGI GUESS";
    var title = state.mode === "guess" ? "DIGI GUESS" : "DIGI ZOOM";
    var description = state.mode === "guess" ? t("digi.guessDescription", "Descubra o Digimon pelas pistas. Você tem 8 tentativas no desafio diário.") : t("digi.zoomDescription", "Identifique o Digimon escondido. A imagem revela mais a cada erro.");
    return '<header class="digi-game-header tech-corners"><div><small>HOLY GUARDIANS // DIGIMON ARCHIVE</small><h1>' + title + '</h1><p>' + escapeHtml(description) + '</p></div><div class="digi-game-header-actions"><button type="button" data-digi-credit>' + escapeHtml(t("digi.apiCredits", "CRÉDITOS DA API")) + '</button><button type="button" data-digi-other="' + other + '">' + otherLabel + ' <span>→</span></button><button type="button" class="' + (state.free ? "active" : "") + '" data-digi-free>' + escapeHtml(t("digi.freeMode", "MODO LIVRE")) + '</button><button type="button" class="' + (state.streamer ? "active" : "") + '" data-digi-streamer>' + escapeHtml(t("digi.streamer", "MODO STREAMER")) + '</button></div></header>';
  }

  function inputPanel(state) {
    if (state.finished) return '<button type="button" class="digi-new-game" data-digi-new>' + escapeHtml(state.free ? t("digi.newFree", "NOVO DIGIMON") : t("digi.playTomorrow", "VOLTE AMANHÃ")) + "</button>";
    return '<div class="digi-input-wrap"><label>' + escapeHtml(t("digi.search", "QUAL É O DIGIMON?")) + '</label><div class="digi-input-shell"><input id="digiGameInput" autocomplete="off" placeholder="' + escapeHtml(t("digi.placeholder", "Digite o nome de um Digimon...")) + '" value="' + escapeHtml(state.query) + '"><button type="button" data-digi-submit>' + escapeHtml(t("digi.guess", "TENTAR")) + '</button></div><div id="digiSuggestions" class="digi-suggestions">' + suggestionList(state) + '</div></div>';
  }

  function zoomBoard(state) {
    var wrong = state.attempts.filter(function (item) { return item.id !== state.target.id; }).length;
    var scale = Math.max(1, 22 - wrong * 1.55);
    return '<div class="digi-zoom-board"><div class="digi-zoom-screen"><img src="' + escapeHtml(state.target.image) + '" alt="' + escapeHtml(t("digi.hidden", "Digimon escondido")) + '" style="transform:scale(' + scale.toFixed(2) + ')"><span class="digi-zoom-scan"></span></div><div class="digi-zoom-info"><p>' + escapeHtml(t("digi.zoomHint", "Cada erro revela mais da imagem.")) + "</p></div></div>";
  }

  function render(mode) {
    var state = games[mode];
    var root = document.querySelector('[data-digi-game="' + mode + '"]');
    if (!state || !root) return;
    document.body.classList.toggle("hg-digi-streamer-active", !!state.streamer);
    var limit = state.free || mode === "zoom" ? "∞" : "15";
    root.innerHTML = '<div class="digi-game-wrap">' + modeHeader(state) +
      '<div class="digi-game-status"><span>' + escapeHtml(state.free ? t("digi.freeActive", "MODO LIVRE ATIVO") : t("digi.daily", "DESAFIO DIÁRIO")) + '</span><strong>' + escapeHtml(t("digi.attempts", "TENTATIVAS")) + ' ' + state.attempts.length + '/' + limit + "</strong></div>" +
      (mode === "zoom" ? zoomBoard(state) : "") + resultBanner(state) + inputPanel(state) +
      '<section class="digi-game-results">' + (mode === "guess" ? guessTableHeader() + guessRows(state) : '<div class="digi-zoom-guesses">' + state.attempts.map(function (item) { return '<span class="' + (item.id === state.target.id ? "correct" : "") + '">' + escapeHtml(item.name) + "</span>"; }).join("") + "</div>") + '</section><p class="digi-game-credit">' + escapeHtml(t("digi.dataSource", "Dados dos Digimon por")) + ' <a href="https://digi-api.com" target="_blank" rel="noopener noreferrer">Digi-API</a></p></div>';
    bind(mode, root);
  }

  function choose(mode, id) {
    var state = games[mode];
    var item = state && state.byId[Number(id)];
    if (!state || !item || state.finished || state.attempts.some(function (entry) { return entry.id === item.id; })) return;
    state.attempts.push(item);
    state.query = "";
    if (item.id === state.target.id || (!state.free && state.mode === "guess" && state.attempts.length >= 15)) state.finished = true;
    saveGame(state);
    render(mode);
  }

  function bind(mode, root) {
    var state = games[mode];
    var input = root.querySelector("#digiGameInput");
    if (input) {
      input.focus();
      input.addEventListener("input", function () { state.query = input.value; var list = root.querySelector("#digiSuggestions"); if (list) list.innerHTML = suggestionList(state); bindSuggestions(mode, root); });
      input.addEventListener("keydown", function (event) { if (event.key === "Enter") { event.preventDefault(); var first = root.querySelector("[data-digi-pick]"); if (first) choose(mode, first.getAttribute("data-digi-pick")); } });
    }
    bindSuggestions(mode, root);
    var submit = root.querySelector("[data-digi-submit]");
    if (submit) submit.addEventListener("click", function () { var first = root.querySelector("[data-digi-pick]"); if (first) choose(mode, first.getAttribute("data-digi-pick")); });
    var free = root.querySelector("[data-digi-free]");
    if (free) free.addEventListener("click", function () { newGame(mode, !state.free); });
    var fresh = root.querySelector("[data-digi-new]");
    if (fresh && state.free) fresh.addEventListener("click", function () { newGame(mode, true); });
    var other = root.querySelector("[data-digi-other]");
    if (other) other.addEventListener("click", function () { other.getAttribute("data-digi-other") === "guess" ? window.abrirDigiGuess() : window.abrirDigiZoom(); });
    var streamer = root.querySelector("[data-digi-streamer]");
    if (streamer) streamer.addEventListener("click", function () { state.streamer = !state.streamer; state.revealed = false; render(mode); window.scrollTo({ top: 0, behavior: "smooth" }); });
    var reveal = root.querySelector("[data-digi-reveal]");
    if (reveal) reveal.addEventListener("click", function () { state.revealed = true; render(mode); });
    var credit = root.querySelector("[data-digi-credit]");
    if (credit) credit.addEventListener("click", function () { window.open("https://digi-api.com/about", "_blank", "noopener"); });
  }

  function bindSuggestions(mode, root) {
    root.querySelectorAll("[data-digi-pick]").forEach(function (button) { button.onclick = function () { choose(mode, button.getAttribute("data-digi-pick")); }; });
  }

  window.inicializarDigiGame = function (mode) { if (!games[mode]) newGame(mode, false); else render(mode); };
  window.abrirDigiGuess = function () { if (typeof fecharFeaturesNavMenu === "function") fecharFeaturesNavMenu(); if (typeof mostrarPagina === "function") mostrarPagina("digiGuessPagina", document.getElementById("btnFeatures")); window.inicializarDigiGame("guess"); };
  window.abrirDigiZoom = function () { if (typeof fecharFeaturesNavMenu === "function") fecharFeaturesNavMenu(); if (typeof mostrarPagina === "function") mostrarPagina("digiZoomPagina", document.getElementById("btnFeatures")); window.inicializarDigiGame("zoom"); };
  document.addEventListener("hg:languagechange", function () { if (games.guess) render("guess"); if (games.zoom) render("zoom"); });
}());
