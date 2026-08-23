(function () {
  "use strict";

  var STORAGE_KEY = "hg_language";
  var DEFAULT_LANGUAGE = "pt-BR";
  var LANGUAGE_META = {
    "pt-BR": { code: "PT", flag: "i18n_flag_br.svg", htmlLang: "pt-BR", query: "pt" },
    "en-US": { code: "EN", flag: "i18n_flag_us.svg", htmlLang: "en", query: "en" },
    "ko-KR": { code: "KO", flag: "i18n_flag_kr.svg", htmlLang: "ko", query: "ko" }
  };
  var ALIASES = {
    pt: "pt-BR", "pt-br": "pt-BR", "pt_br": "pt-BR",
    en: "en-US", "en-us": "en-US", "en_us": "en-US",
    ko: "ko-KR", kr: "ko-KR", "ko-kr": "ko-KR", "ko_kr": "ko-KR"
  };

  var currentLanguage = DEFAULT_LANGUAGE;
  var hiddenBaseData = null;
  var dynamicApplyQueued = false;
  var observerInstalled = false;
  var observerMuteDepth = 0;
  var dynamicRootQueued = Object.create(null);
  var runtimeHooksInstalled = false;

  function cloneData(value) {
    try { return JSON.parse(JSON.stringify(value)); }
    catch (error) { return value; }
  }

  if (window.HG_HIDDEN_QUESTS_DATA) hiddenBaseData = cloneData(window.HG_HIDDEN_QUESTS_DATA);

  function normalizeLanguage(value) {
    var raw = String(value || "").trim();
    if (LANGUAGE_META[raw]) return raw;
    return ALIASES[raw.toLowerCase()] || "";
  }

  function languageFromUrl() {
    try { return normalizeLanguage(new URL(window.location.href).searchParams.get("lang")); }
    catch (error) { return ""; }
  }

  function languageFromStorage() {
    try { return normalizeLanguage(localStorage.getItem(STORAGE_KEY)); }
    catch (error) { return ""; }
  }

  function dictionary(language) {
    return (window.HG_I18N && window.HG_I18N[language]) || {};
  }

  function translate(key, fallback) {
    var active = dictionary(currentLanguage);
    var base = dictionary(DEFAULT_LANGUAGE);
    if (Object.prototype.hasOwnProperty.call(active, key)) return active[key];
    if (Object.prototype.hasOwnProperty.call(base, key)) return base[key];
    return fallback == null ? key : fallback;
  }

  function formatTranslation(key, fallback, values) {
    var text = String(translate(key, fallback));
    Object.keys(values || {}).forEach(function (name) {
      text = text.split("{" + name + "}").join(String(values[name] == null ? "" : values[name]));
    });
    return text;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function setText(element, value) {
    if (!element) return;
    var next = String(value == null ? "" : value);
    if (element.textContent !== next) element.textContent = next;
  }

  function setHtml(element, value) {
    if (!element) return;
    var next = String(value == null ? "" : value);
    if (element.innerHTML !== next) element.innerHTML = next;
  }

  function setAttr(element, name, value) {
    if (!element) return;
    var next = String(value == null ? "" : value);
    if (element.getAttribute(name) !== next) element.setAttribute(name, next);
  }

  function withObserverMuted(callback) {
    observerMuteDepth += 1;
    try { return callback(); }
    finally {
      window.setTimeout(function () {
        observerMuteDepth = Math.max(0, observerMuteDepth - 1);
      }, 0);
    }
  }

  function mutationElement(mutation) {
    if (!mutation || !mutation.target) return null;
    return mutation.target.nodeType === 1 ? mutation.target : mutation.target.parentElement;
  }

  function mutationsOnlyInside(mutations, selector) {
    if (!mutations || !mutations.length) return false;
    return Array.prototype.every.call(mutations, function (mutation) {
      var el = mutationElement(mutation);
      return !!(el && el.closest && el.closest(selector));
    });
  }

  function all(selector, root) {
    try { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); }
    catch (error) { return []; }
  }

  function one(selector, root) {
    try { return (root || document).querySelector(selector); }
    catch (error) { return null; }
  }


  function koreanReferenceData(key) {
    var refs = dictionary("ko-KR").__referenceLabels || {};
    return refs[String(key || "").toUpperCase()] || null;
  }

  function koreanReferenceHtml(key, compact) {
    var info = koreanReferenceData(key);
    if (!info) return escapeHtml(String(key || ""));
    var klass = "hg-ko-ref-label" + (compact ? " hg-ko-ref-label-compact" : "");
    return '<span class="' + klass + '"><span class="hg-ko-ref-main">' + escapeHtml(info.ko) + '</span><small class="hg-ko-ref-en">(' + escapeHtml(info.ref) + ')</small></span>';
  }

  function canonicalReferenceKey(raw) {
    var text = String(raw == null ? "" : raw).replace(/\s+/g, " ").trim();
    var upper = text.toUpperCase();
    var keys = ["DEF BREAK","STRONG","WEAK","FIELD","TYPE","CC","DOT","HP","SP","STR","INT","DEF","RES","SPD"];
    for (var i = 0; i < keys.length; i++) {
      if (upper === keys[i]) return keys[i];
      var info = koreanReferenceData(keys[i]);
      if (info && (text === info.ko || text.indexOf(info.ko + " ") === 0 || text.indexOf("(" + info.ref + ")") >= 0)) return keys[i];
    }
    return "";
  }

  function applyReferenceLabel(element, key, compact) {
    if (!element) return;
    var canonical = String(key || element.getAttribute("data-hg-ref-key") || canonicalReferenceKey(element.textContent)).toUpperCase();
    if (!canonical) return;
    element.setAttribute("data-hg-ref-key", canonical);
    if (currentLanguage === "ko-KR") {
      element.classList.add("hg-ko-ref-host");
      setHtml(element, koreanReferenceHtml(canonical, !!compact));
      var info = koreanReferenceData(canonical);
      if (info) setAttr(element, "title", info.ko + " (" + info.ref + ")");
    } else {
      element.classList.remove("hg-ko-ref-host");
      setText(element, canonical === "DOT" ? "DOT" : canonical);
      if (element.hasAttribute("title")) element.removeAttribute("title");
    }
  }

  function canonicalSkillToken(text) {
    var raw = String(text == null ? "" : text).replace(/\s+/g, " ").trim();
    var match = raw.match(/^(?:SKILL|스킬)\s*(\d+)(?:\s*\(Skill\s*\d+\))?$/i);
    return match ? Number(match[1]) : 0;
  }

  function applySkillReferenceText(element) {
    if (!element) return;
    var slot = Number(element.getAttribute("data-hg-skill-ref") || canonicalSkillToken(element.textContent));
    if (!slot) return;
    element.setAttribute("data-hg-skill-ref", String(slot));
    setText(element, currentLanguage === "ko-KR" ? "스킬 " + slot + " (Skill " + slot + ")" : "SKILL " + slot);
  }

  function applyNoReferenceText(element) {
    if (!element) return;
    var raw = String(element.textContent || "").replace(/\s+/g, " ").trim();
    var isNo = element.getAttribute("data-hg-no-ref") === "1" || /^NO$/i.test(raw) || /^없음(?:\s*\(NO\))?$/i.test(raw);
    if (!isNo) return;
    element.setAttribute("data-hg-no-ref", "1");
    setText(element, currentLanguage === "ko-KR" ? "없음 (NO)" : "NO");
  }


  function koDataMap(name) {
    return dictionary("ko-KR")[name] || {};
  }

  function koStageData(value) {
    return koDataMap("__stages")[String(value || "").trim().toUpperCase()] || null;
  }

  function koElementData(value) {
    return koDataMap("__elements")[String(value || "").trim().toUpperCase()] || null;
  }

  function koRelationEffectData(value) {
    return koDataMap("__relationEffects")[String(value || "").replace(/\s+/g, " ").trim().toUpperCase()] || null;
  }

  function koStatusEffectData(value) {
    return koDataMap("__statusEffects")[String(value || "").trim().toUpperCase()] || null;
  }

  function koDigimonName(value) {
    var raw = String(value || "").trim();
    return koDataMap("__digimonNames")[raw] || "";
  }

  function koReferenceInline(info) {
    if (!info) return "";
    return escapeHtml(info.ko) + ' <small class="hg-ko-inline-ref">(' + escapeHtml(info.ref) + ')</small>';
  }

  function applyKoreanStageLabel(element, stage) {
    if (!element) return;
    var original = String(stage || element.getAttribute("data-hg-stage-original") || element.textContent || "").trim();
    if (!element.getAttribute("data-hg-stage-original")) element.setAttribute("data-hg-stage-original", original);
    var info = koStageData(original);
    if (currentLanguage === "ko-KR" && info) {
      if (String(element.tagName || "").toUpperCase() === "OPTION") setText(element, info.ko + " (" + info.ref + ")");
      else setHtml(element, koReferenceInline(info));
    } else setText(element, original);
  }

  function applyKoreanDigimonName(element) {
    if (!element) return;
    var original = element.getAttribute("data-hg-digimon-original") || String(element.textContent || "").replace(/\s+/g, " ").trim();
    if (!original || original === "-") return;
    if (!element.getAttribute("data-hg-digimon-original")) element.setAttribute("data-hg-digimon-original", original);
    var translated = koDigimonName(original);
    if (currentLanguage === "ko-KR" && translated) {
      element.classList.add("hg-ko-digimon-name-host");
      setHtml(element, '<span class="hg-ko-digimon-name">' + escapeHtml(translated) + '</span><small class="hg-ko-digimon-name-ref">(' + escapeHtml(original) + ')</small>');
    } else {
      element.classList.remove("hg-ko-digimon-name-host");
      setText(element, original);
    }
  }

  function applyKoreanDigimonNames() {
    var root = document.getElementById("databasePagina");
    if (root) {
      all(".card .card-name, .digidex-table-name strong, .digidex-profile-identity h2, .digidex-profile-breadcrumb button, .digidex-evo-node-copy > strong", root).forEach(applyKoreanDigimonName);
    }
    var counter = document.getElementById("counterFinderPagina");
    if (counter) {
      all(".counter-finder-suggestion b, .counter-finder-target-copy h3, .counter-finder-result-ident h3", counter).forEach(applyKoreanDigimonName);
    }
    var tooltip = document.getElementById("counterFinderDigiTooltip");
    if (tooltip && !tooltip.hidden) all(".counter-finder-tooltip-head > div > strong", tooltip).forEach(applyKoreanDigimonName);
  }

  function applyKoreanRelationTooltips(root) {
    all(".hg-relation-tooltip", root || document).forEach(function (tooltip) {
      var elementEl = one(".hg-relation-tooltip-head small", tooltip);
      var effectEl = one(".hg-relation-tooltip-head strong", tooltip);
      var copyEl = one(".hg-relation-tooltip-copy", tooltip);
      if (!elementEl || !effectEl) return;

      var originalElement = elementEl.getAttribute("data-hg-original") || String(elementEl.textContent || "").trim();
      var originalEffect = effectEl.getAttribute("data-hg-original") || String(effectEl.textContent || "").trim();
      if (!elementEl.getAttribute("data-hg-original")) elementEl.setAttribute("data-hg-original", originalElement);
      if (!effectEl.getAttribute("data-hg-original")) effectEl.setAttribute("data-hg-original", originalEffect);
      var originalCopy = copyEl ? (copyEl.getAttribute("data-hg-original") || String(copyEl.textContent || "").trim()) : "";
      if (copyEl && !copyEl.getAttribute("data-hg-original")) copyEl.setAttribute("data-hg-original", originalCopy);

      if (currentLanguage === "ko-KR") {
        var elementInfo = koElementData(originalElement);
        var effectInfo = koRelationEffectData(originalEffect);
        if (elementInfo) setHtml(elementEl, koReferenceInline(elementInfo));
        if (effectInfo) {
          setHtml(effectEl, koReferenceInline(effectInfo));
          if (copyEl) setText(copyEl, effectInfo.desc || originalCopy);
        }
      } else {
        setText(elementEl, originalElement);
        setText(effectEl, originalEffect);
        if (copyEl) setText(copyEl, originalCopy);
      }
    });
  }

  function applyKoreanDigidexFilters() {
    var root = document.getElementById("databasePagina");
    if (!root) return;

    var stageLabel = one(".stage-filter-label", root);
    if (stageLabel) setText(stageLabel, currentLanguage === "ko-KR" ? translate("digidex.stageLabel", "진화 단계 (Stage)") : "STAGE");
    all(".stage-filter-btn[data-stage] strong", root).forEach(function (el) {
      var btn = el.closest(".stage-filter-btn");
      var stage = btn ? (btn.getAttribute("data-stage") || "ALL") : "";
      if (stage) applyKoreanStageLabel(el, stage);
    });

    var fieldSummary = one("#filtroField summary > span:first-child", root);
    if (fieldSummary) setText(fieldSummary, currentLanguage === "ko-KR" ? translate("digidex.fieldFilter", "필드 (Field)") : "FIELD");

    all("#filtroEfeito .digidex-effect-item", root).forEach(function (label) {
      var input = one("input.digidex-effect-check", label);
      var visible = all(":scope > span", label).slice(-1)[0];
      if (!input || !visible) return;
      var key = String(input.value || "").toUpperCase().replace("_", " ");
      if (key === "DEF BREAK" || key === "CC" || key === "DOT") applyReferenceLabel(visible, key, false);
    });

    all("#filtroSkillElementosLista label", root).forEach(function (label) {
      var input = one("input.digidex-skill-element-check", label);
      var visible = all(":scope > span", label).slice(-1)[0];
      if (!input || !visible) return;
      var original = input.value;
      var info = koElementData(original);
      if (currentLanguage === "ko-KR" && info) setHtml(visible, koReferenceInline(info));
      else setText(visible, original);
    });

    all("#filtroStatusEffectsLista .digidex-status-effect-item", root).forEach(function (label) {
      var input = one("input.digidex-status-effect-check", label);
      var spans = all(":scope > span", label);
      var visible = spans.length ? spans[spans.length - 1] : null;
      if (!input || !visible) return;
      var original = input.getAttribute("data-hg-status-original") || String(input.value || "").toUpperCase();
      input.setAttribute("data-hg-status-original", original);
      var info = koStatusEffectData(original);
      if (currentLanguage === "ko-KR" && info) setHtml(visible, koReferenceInline(info));
      else {
        var mainStatus = {PETRIFY:"PETRIFY", CONFUSION:"CONFUSION", PARALYSIS:"PARALYSIS", METALLIZATION:"METALLIZATION", ISOLATION:"ISOLATION", PRESSURE:"PRESSURE", VACUUM:"VACUUM", SUBMERGE:"SUBMERGE", SNIPER:"SNIPER", SILENCE:"SILENCE", CHARM:"CHARM", FREEZE:"FREEZE", STUN:"STUN", SEAL:"SEAL", SLEEP:"SLEEP", PANIC:"PANIC", PUPPET:"PUPPET", BIND:"BIND", BLIND:"BLIND", FEAR:"FEAR"};
        setText(visible, mainStatus[original] || original);
      }
    });
  }

  function applyKoreanCounterStages() {
    var root = document.getElementById("counterFinderPagina");
    if (!root) return;
    all("#counterFinderStage option", root).forEach(function (option) {
      var value = String(option.value || "").toUpperCase();
      if (value === "ALL") {
        setText(option, currentLanguage === "ko-KR" ? "전체 (All)" : translate("counter.all", "TODOS"));
      } else if (koStageData(value)) applyKoreanStageLabel(option, value);
    });
    all(".counter-finder-target-tags > span", root).forEach(function (el) {
      var raw = el.getAttribute("data-hg-stage-original") || String(el.textContent || "").trim();
      if (koStageData(raw)) applyKoreanStageLabel(el, raw);
    });
    all(".counter-finder-suggestion small", root).forEach(function (el) {
      var raw = el.getAttribute("data-hg-original") || String(el.textContent || "").trim();
      if (!el.getAttribute("data-hg-original")) el.setAttribute("data-hg-original", raw);
      var parts = raw.split("•").map(function (x) { return x.trim(); });
      var info = koStageData(parts[0]);
      if (currentLanguage === "ko-KR" && info) setText(el, info.ko + " (" + info.ref + ")" + (parts[1] ? " • " + parts[1] : ""));
      else setText(el, raw);
    });
  }

  function applyKoreanReferenceTranslations() {
    var digidex = document.getElementById("databasePagina");
    if (digidex) {
      all(".card .type-label", digidex).forEach(function (el) { applyReferenceLabel(el, "TYPE", true); });
      all(".card .stats .label", digidex).forEach(function (el) { applyReferenceLabel(el, "", false); });
      all(".card .stats .value", digidex).forEach(function (el) {
        applySkillReferenceText(el);
        applyNoReferenceText(el);
      });

      all(".digidex-table thead th", digidex).forEach(function (el) {
        var key = canonicalReferenceKey(el.textContent);
        if (key) applyReferenceLabel(el, key, true);
        else applySkillReferenceText(el);
      });
      all(".digidex-table tbody tr", digidex).forEach(function (row) {
        var cells = all(":scope > td", row);
        [12,13,14].forEach(function (index) {
          var cell = cells[index];
          if (!cell) return;
          applySkillReferenceText(cell);
          applyNoReferenceText(cell);
        });
      });

      all("#filtroSkillElemento .digidex-skill-scope label", digidex).forEach(function (label) {
        var input = one("input", label);
        var textNode = Array.prototype.slice.call(label.childNodes || []).find(function (node) { return node.nodeType === 3 && String(node.nodeValue || "").trim(); });
        if (!textNode) return;
        var slot = canonicalSkillToken(textNode.nodeValue);
        if (!slot) return;
        var next = currentLanguage === "ko-KR" ? " 스킬 " + slot + " (Skill " + slot + ")" : " SKILL " + slot;
        if (textNode.nodeValue !== next) textNode.nodeValue = next;
        if (input) input.setAttribute("aria-label", currentLanguage === "ko-KR" ? "스킬 " + slot + " (Skill " + slot + ")" : "SKILL " + slot);
      });

      var profile = document.getElementById("digidexProfile");
      if (profile && !profile.hidden) {
        all(".digidex-profile-relations i", profile).forEach(function (el) { applyReferenceLabel(el, "", true); });
        all(".digidex-profile-stats i", profile).forEach(function (el) { applyReferenceLabel(el, "", true); });
      }
    }

    var counter = document.getElementById("counterFinderPagina");
    if (counter) {
      all(".counter-finder-result-meta small", counter).forEach(function (el) { applyReferenceLabel(el, "", true); });
      all(".counter-finder-target-relations > div > small", counter).forEach(function (el) { applyReferenceLabel(el, "", true); });
      all(".counter-finder-target-spd small", counter).forEach(function (el) { applyReferenceLabel(el, "SPD", true); });
      all(".counter-finder-effects-list b", counter).forEach(function (el) {
        var current = String(el.textContent || "");
        var base = el.getAttribute("data-hg-effect-base") || "";
        if (!base) {
          var upper = current.toUpperCase();
          if (upper.indexOf("DEF BREAK") >= 0 || upper.indexOf("CC") >= 0 || upper.indexOf("DOT") >= 0) {
            base = current;
            el.setAttribute("data-hg-effect-base", base);
          }
        }
        if (!base) return;
        var output = base;
        if (currentLanguage === "ko-KR") {
          ["DEF BREAK","CC","DOT"].forEach(function (key) {
            var info = koreanReferenceData(key);
            if (!info) return;
            output = output.replace(new RegExp(key.replace(" ", "\\s+"), "i"), info.ko + " (" + info.ref + ")");
          });
        }
        setText(el, output);
      });
    }

    var tooltip = document.getElementById("counterFinderDigiTooltip");
    if (tooltip && !tooltip.hidden) applyCounterTooltipReferenceTranslations(tooltip);

    applyKoreanDigidexFilters();
    applyKoreanCounterStages();
    applyKoreanDigimonNames();
    applyKoreanRelationTooltips(document.getElementById("databasePagina"));
  }

  function applyCounterTooltipReferenceTranslations(tooltip) {
    if (!tooltip) return;
    all(".counter-finder-tooltip-profile-meta em", tooltip).forEach(function (el) { applyReferenceLabel(el, "", true); });
    all(".counter-finder-tooltip-stats i", tooltip).forEach(function (el) { applyReferenceLabel(el, "", true); });
    applyKoreanDigimonNames();
  }


  function applyHeaderEventTranslations() {
    var header = document.getElementById("siteTopbar");
    if (!header) return;

    setText(one(".hg-header-event-boss .hg-header-event-label", header), translate("header.nextBoss", "PRÓXIMO BOSS"));
    setText(one(".hg-header-event-dekyu .hg-header-event-label", header), translate("header.dekyuTreasure", "DEKYU TREASURE"));

    var bossName = one("#hgHeaderBossName", header);
    if (bossName && /^(CARREGANDO\.\.\.|LOADING\.\.\.|불러오는 중\.\.\.)$/i.test(String(bossName.textContent || "").trim())) {
      setText(bossName, translate("header.loading", "CARREGANDO..."));
    }

    var dekyuTime = one("#hgHeaderDekyuTime", header);
    if (dekyuTime) {
      var raw = String(dekyuTime.textContent || "").replace(/\s+/g, " ").trim();
      var match = raw.match(/^(?:PRÓXIMO|PROXIMO|NEXT|다음)\s+(.+)$/i);
      if (match) setText(dekyuTime, translate("header.next", "PRÓXIMO") + " " + match[1]);
    }

    var sound = one("#hgHeaderSoundToggle", header);
    if (sound) {
      var enabled = sound.getAttribute("aria-pressed") === "true" || sound.classList.contains("is-enabled");
      setAttr(sound, "aria-label", translate(enabled ? "header.sound.disableAria" : "header.sound.enableAria", enabled ? "Desligar som de aviso de Boss e Dekyu" : "Ligar som de aviso de Boss e Dekyu"));
      setAttr(sound, "title", translate(enabled ? "header.sound.enabledTitle" : "header.sound.disabledTitle", enabled ? "Som de eventos ligado · avisa 5 min antes" : "Som de eventos desligado · avisa 5 min antes"));
    }
  }

  function applyRaidStaticTranslations() {
    var root = document.getElementById("raidBossPagina");
    if (!root) return;

    setText(one(".raid-kicker", root), translate("raid.kicker", "KST RAID MONITOR // HOLY GUARDIANS"));
    setText(one(".raid-header .page-title", root), translate("raid.title", "RAID BOSS"));
    setText(one(".raid-header .page-subtitle", root), translate("raid.subtitle", "Próximos nascimentos sincronizados com o horário do servidor coreano."));
    setAttr(one(".raid-how-to", root), "aria-label", translate("raid.howAria", "Como usar a agenda de raids"));
    setText(one(".raid-how-to strong", root), translate("raid.howTitle", "COMO USAR"));
    setText(one(".raid-how-to span", root), translate("raid.howText", "Passe o mouse sobre o ícone para saber os status e clique no nome do mapa para ver os possíveis spots de spawn dos bosses."));
    setText(one(".raid-alarm-control span", root), translate("raid.notify", "AVISAR"));
    setText(one(".raid-notice-control span", root), translate("raid.minutesBefore", "MINUTOS ANTES"));

    var bot = one(".hg-discord-bot-link", root);
    if (bot) {
      setAttr(bot, "aria-label", translate("raid.addBotAria", "Adicionar Evil Guardians ao seu Discord"));
      setAttr(bot, "title", translate("raid.addBotAria", "Adicionar Evil Guardians ao seu Discord"));
      setHtml(one("span", bot), translate("raid.addBot", "ADICIONAR<br>BOT"));
    }

    setText(one(".raid-time-strip > span", root), translate("raid.serverTime", "HORÁRIO DO SERVIDOR (KST)"));
    setText(one(".raid-time-strip > small", root), translate("raid.noticeOpen", "Os avisos funcionam enquanto esta página estiver aberta."));
    setAttr(one("#raidMapClose", root), "aria-label", translate("raid.close", "Fechar"));
    setAttr(one("#raidMapImage", root), "alt", translate("raid.mapImageAlt", "Mapa do raid"));
  }

  function applyRaidDynamicTranslations() {
    var root = document.getElementById("raidBossPagina");
    if (!root) return;
    applyRaidStaticTranslations();

    all("#raidList .raid-empty", root).forEach(function (el) {
      var raw = String(el.textContent || "").trim();
      if (/carregando agenda de raids|loading raid schedule|레이드 일정.*불러/i.test(raw)) setText(el, translate("raid.loading", "Carregando agenda de raids..."));
    });

    all("#raidList .raid-card", root).forEach(function (card) {
      var icon = one(".raid-card-icon", card);
      var img = one(".raid-card-icon img", card);
      var name = img ? String(img.getAttribute("alt") || "").trim() : "";
      if (icon && name) setAttr(icon, "aria-label", formatTranslation("raid.infoAria", "Informações de {name}", { name: name }));
      all(".raid-rotation-tag", card).forEach(function (el) { setText(el, translate("raid.rotation", "ROTAÇÃO")); });

      var mapButton = one(".raid-map-link", card);
      if (mapButton) {
        var nodes = Array.prototype.slice.call(mapButton.childNodes || []);
        var textNode = nodes.find(function (node) { return node.nodeType === 3 && String(node.nodeValue || "").trim(); });
        if (textNode && /^(Mapa indisponível|Map unavailable|맵 정보 없음)$/i.test(String(textNode.nodeValue || "").trim())) {
          textNode.nodeValue = translate("raid.mapUnavailable", "Mapa indisponível") + " ";
        }
      }

      var tooltip = one(".raid-boss-tooltip", card);
      if (tooltip) {
        var rows = all(":scope > div", tooltip);
        var keys = ["raid.tip.level", "raid.tip.name", "raid.tip.attribute", "raid.tip.hp", "raid.tip.location"];
        var fallbacks = ["Level:", "Name:", "Attribute:", "HP:", "Implementation Location:"];
        rows.forEach(function (row, index) {
          var label = one(":scope > span", row);
          if (label && keys[index]) setText(label, translate(keys[index], fallbacks[index]));
        });
      }
    });

    all("#raidMapSpots .raid-map-spot", root).forEach(function (spot) {
      setAttr(spot, "title", translate("raid.possibleSpawn", "Possível ponto de nascimento"));
    });

    var modalTitle = one("#raidMapTitle", root);
    if (modalTitle) {
      var modalRaw = String(modalTitle.textContent || "").trim();
      if (/^(MAPA DO RAID|RAID MAP|레이드 맵)$/i.test(modalRaw)) setText(modalTitle, translate("raid.mapTitle", "MAPA DO RAID"));
    }

    var alertTitle = one("#raidAlertTitle", document);
    if (alertTitle) {
      var titleRaw = String(alertTitle.textContent || "").trim();
      if (/^(RAID PRÓXIMA|RAID INCOMING|레이드 임박)$/i.test(titleRaw)) setText(alertTitle, translate("raid.alertSoon", "RAID PRÓXIMA"));
    }
    var alertText = one("#raidAlertText", document);
    if (alertText) {
      var textRaw = String(alertText.textContent || "").trim();
      var born = textRaw.match(/^(?:Nasce em|Spawns in|등장까지)\s+(.+?)\s+[—-]\s+(.+)$/i);
      if (born) setText(alertText, formatTranslation("raid.bornIn", "Nasce em {time} — {map}", { time: born[1], map: born[2] }));
    }
  }

  function applyDekyuStaticTranslations() {
    var root = document.getElementById("dekyuTreasurePagina");
    if (!root) return;

    setText(one(".dekyu-kicker", root), translate("dekyu.kicker", "TREASURE COORDINATES // HOLY GUARDIANS"));
    setText(one(".dekyu-header .page-title", root), translate("dekyu.title", "DEKYU TREASURE"));
    setText(one(".dekyu-header .page-subtitle", root), translate("dekyu.subtitle", "Selecione uma área e um mapa para localizar todos os Dekyu Treasures disponíveis."));
    setHtml(one(".dekyu-alert p", root), translate("dekyu.alert", "<strong>ATENÇÃO:</strong> O Dekyu Treasure pode surgir de forma aleatória em qualquer um dos spots mostrados nos mapas abaixo, de 6 em 6 horas, a partir do momento em que surgiu pela última vez."));

    var bot = one(".dekyu-discord-bot-link", root);
    if (bot) {
      setAttr(bot, "aria-label", translate("dekyu.addBotAria", "Adicionar Evil Guardians ao seu Discord"));
      setAttr(bot, "title", translate("dekyu.addBotAria", "Adicionar Evil Guardians ao seu Discord"));
      setHtml(one("span", bot), translate("dekyu.addBot", "ADICIONAR<br>BOT"));
    }

    setText(one(".dekyu-panel-kicker", root), translate("dekyu.panelKicker", "MAP NAVIGATION // HG"));
    setText(one(".dekyu-side-panel > h3", root), translate("dekyu.locate", "LOCALIZAR TESOUROS"));
    setAttr(one(".dekyu-side-panel", root), "aria-label", translate("dekyu.controlsAria", "Controles do mapa"));

    var fields = all(".dekyu-select-field > span", root);
    if (fields[0]) setText(fields[0], translate("dekyu.area", "ÁREA"));
    if (fields[1]) setText(fields[1], translate("dekyu.map", "MAPA"));
    setText(one(".dekyu-summary > span", root), translate("dekyu.locations", "LOCALIZAÇÕES"));
    setText(one(".dekyu-summary > small", root), translate("dekyu.mappedSpots", "SPOTS MAPEADOS"));
    setText(one(".dekyu-respawn > span", root), translate("dekyu.nextSpawn", "PRÓXIMO SURGIMENTO"));
    setAttr(one(".dekyu-schedule", root), "aria-label", translate("dekyu.scheduleAria", "Horários de surgimento"));
    setAttr(one("#dekyuMapImage", root), "alt", translate("dekyu.mapImageAlt", "Mapa com localizações de Dekyu Treasure"));
  }

  function applyDekyuDynamicTranslations() {
    var root = document.getElementById("dekyuTreasurePagina");
    if (!root) return;
    applyDekyuStaticTranslations();

    var zoneLabel = one("#dekyuZoneLabel", root);
    if (zoneLabel) {
      var zoneRaw = String(zoneLabel.textContent || "").trim();
      if (/^(ÁREA|AREA|지역)$/i.test(zoneRaw)) setText(zoneLabel, translate("dekyu.area", "ÁREA"));
    }

    var mapTitle = one("#dekyuMapTitle", root);
    if (mapTitle) {
      var titleRaw = String(mapTitle.textContent || "").trim();
      if (/^(Selecione um mapa|Select a map|맵을 선택하세요)$/i.test(titleRaw)) setText(mapTitle, translate("dekyu.selectMap", "Selecione um mapa"));
    }

    var status = one("#dekyuMapStatus", root);
    if (status) {
      var statusRaw = String(status.textContent || "").replace(/\s+/g, " ").trim();
      var count = statusRaw.match(/^(\d+)\s+(?:PONTO(?:S)? MAPEADO(?:S)?|MAPPED POINTS?|개 지점 매핑됨)$/i);
      if (count) {
        var amount = Number(count[1]);
        setText(status, formatTranslation(amount === 1 ? "dekyu.mappedPointOne" : "dekyu.mappedPointMany", amount === 1 ? "{count} PONTO MAPEADO" : "{count} PONTOS MAPEADOS", { count: amount }));
      } else if (/^(SEM DADOS|NO DATA|데이터 없음)$/i.test(statusRaw)) setText(status, translate("dekyu.noData", "SEM DADOS"));
      else if (/carregando coordenadas|loading coordinates|좌표.*불러/i.test(statusRaw)) setText(status, translate("dekyu.loadingCoordinates", "Carregando coordenadas..."));
    }

    var empty = one("#dekyuEmpty", root);
    if (empty) {
      var emptyRaw = String(empty.textContent || "").trim();
      if (/^(Nenhum mapa disponível\.|No map available\.|사용 가능한 맵이 없습니다\.)$/i.test(emptyRaw)) setText(empty, translate("dekyu.noMap", "Nenhum mapa disponível."));
      else if (/^O mapa ainda não foi encontrado na pasta DSR MAPS\.|not yet.*DSR MAPS|DSR MAPS.*찾지 못/i.test(emptyRaw)) setText(empty, translate("dekyu.mapMissing", "O mapa ainda não foi encontrado na pasta DSR MAPS."));
      else if (/^(Carregando mapa\.\.\.|Loading map\.\.\.|맵 불러오는 중\.\.\.)$/i.test(emptyRaw)) setText(empty, translate("dekyu.loadingMap", "Carregando mapa..."));
      else if (/^(Não foi possível carregar este mapa\.|Could not load this map\.|이 맵을 불러올 수 없습니다\.)$/i.test(emptyRaw)) setText(empty, translate("dekyu.mapLoadError", "Não foi possível carregar este mapa."));
      else {
        var err = emptyRaw.match(/^(?:Erro ao carregar Dekyu Treasure\.|Could not load Dekyu Treasure\.|Dekyu Treasure를 불러오지 못했습니다\.)\s*(.*)$/i);
        if (err) setText(empty, translate("dekyu.treasureLoadError", "Erro ao carregar Dekyu Treasure.") + (err[1] ? " " + err[1] : ""));
      }
    }

    all("#dekyuZone option", root).forEach(function (option) {
      var raw = String(option.textContent || "").trim();
      if (/^(Carregando áreas\.\.\.|Loading areas\.\.\.|지역 불러오는 중\.\.\.)$/i.test(raw)) setText(option, translate("dekyu.loadingAreas", "Carregando áreas..."));
      else if (/^(Erro ao carregar áreas|Error loading areas|지역을 불러오지 못했습니다)$/i.test(raw)) setText(option, translate("dekyu.areasLoadError", "Erro ao carregar áreas"));
    });
    all("#dekyuMap option", root).forEach(function (option) {
      var raw = String(option.textContent || "").trim();
      if (/^(Carregando mapas\.\.\.|Loading maps\.\.\.|맵 불러오는 중\.\.\.)$/i.test(raw)) setText(option, translate("dekyu.loadingMaps", "Carregando mapas..."));
      else if (/^(Erro ao carregar mapas|Error loading maps|맵을 불러오지 못했습니다)$/i.test(raw)) setText(option, translate("dekyu.mapsLoadError", "Erro ao carregar mapas"));
    });

    var respawnSmall = one(".dekyu-respawn > small", root);
    if (respawnSmall) {
      var timeEl = one("#dekyuNextTime", respawnSmall);
      var time = timeEl ? String(timeEl.textContent || "--:--").trim() : "--:--";
      setHtml(respawnSmall, formatTranslation("dekyu.atBrasilia", "ÀS <b>{time}</b> • HORÁRIO DE BRASÍLIA", { time: escapeHtml(time) }));
      var newTime = one("#dekyuNextTime", respawnSmall);
      if (newTime) newTime.id = "dekyuNextTime";
    }
  }

  function applyImpmonLiveTranslations() {
    var root = document.getElementById("hgImpmonLive");
    if (!root) return;

    var toggle = one("#hgImpmonLiveToggle", root);
    if (toggle) {
      var minimized = root.classList.contains("hg-impmon-minimized");
      setAttr(toggle, "aria-label", translate(minimized ? "live.showAria" : "live.minimizeAria", minimized ? "Mostrar aviso de lives" : "Minimizar aviso de lives"));
      setAttr(toggle, "title", translate(minimized ? "live.showTitle" : "live.minimizeTitle", minimized ? "Mostrar Impmon" : "Minimizar"));
    }

    var names = one("#hgImpmonLiveNames", root);
    var single = names ? one(".hg-impmon-single-name", names) : null;
    var links = names ? all(".hg-impmon-live-name", names) : [];
    if (names && !single && !links.length) {
      var placeholder = String(names.textContent || "").trim();
      if (/^(STREAMERS HG|HG STREAMERS|HG 스트리머)$/i.test(placeholder)) setText(names, translate("live.streamers", "STREAMERS HG"));
    }

    var status = one("#hgImpmonLiveStatus", root);
    var hint = one("#hgImpmonLiveHint", root);
    if (single) {
      setText(status, translate("live.singleStatus", "🔴 AO VIVO AGORA"));
      setText(hint, translate("live.singleHint", "CLIQUE NO IMPMON PARA ASSISTIR"));
    } else if (links.length) {
      setText(status, formatTranslation("live.multiStatus", "🔴 {count} AO VIVO AGORA", { count: links.length }));
      setText(hint, translate("live.multiHint", "CLIQUE NO NOME PARA ASSISTIR"));
    }
  }

  function applyStaticTranslations() {
    all("[data-i18n]").forEach(function (element) {
      var key = element.getAttribute("data-i18n");
      setText(element, translate(key, element.textContent));
    });

    all("[data-i18n-aria-label]").forEach(function (element) {
      var key = element.getAttribute("data-i18n-aria-label");
      setAttr(element, "aria-label", translate(key, element.getAttribute("aria-label") || ""));
    });

    all("[data-i18n-title]").forEach(function (element) {
      var key = element.getAttribute("data-i18n-title");
      setAttr(element, "title", translate(key, element.getAttribute("title") || ""));
    });

    applyHomeStaticTranslations();
    applyHiddenStaticTranslations();
    applyDigidexStaticTranslations();
    applyCounterStaticTranslations();
    applyHeaderEventTranslations();
    applyRaidStaticTranslations();
    applyDekyuStaticTranslations();
    applyImpmonLiveTranslations();
    setText(one("#btnCounterFinder > span"), translate("more.counterFinder", "COUNTER FINDER"));
    setText(one("#btnHiddenQuests > span"), translate("more.hiddenQuests", "HIDDEN QUESTS"));
  }

  function replaceButtonTextNode(button, key, fallback) {
    if (!button) return;
    var nodes = Array.prototype.slice.call(button.childNodes || []);
    var target = nodes.find(function (node) {
      return node.nodeType === 3 && String(node.nodeValue || "").trim();
    });
    if (!target) return;
    var translated = translate(key, fallback);
    var before = String(target.nodeValue || "");
    var lead = before.match(/^\s*/);
    var trail = before.match(/\s*$/);
    var next = (lead ? lead[0] : "") + translated + (trail ? trail[0] : "");
    if (target.nodeValue !== next) target.nodeValue = next;
  }

  function applyHomeStaticTranslations() {
    var home = document.getElementById("homePagina");
    if (!home) return;

    setText(one(".hero-welcome", home), translate("home.welcome", "BEM-VINDO À"));
    setText(one(".hero-motto", home), translate("home.motto", "FORÇA • UNIÃO • EVOLUÇÃO"));
    setHtml(one(".hero-lead", home), translate("home.heroLead", one(".hero-lead", home) ? one(".hero-lead", home).innerHTML : ""));

    var actionButtons = all(".hero-actions .action-button", home);
    replaceButtonTextNode(actionButtons[0], "home.openDigidex", "ACESSAR DIGIDEX");
    replaceButtonTextNode(actionButtons[1], "home.buildTeam", "MONTAR TIME");

    setText(one(".raid-home-heading h2", home), translate("home.raidBosses", "Raid Bosses"));
    var liveSchedule = one(".raid-home-heading-status", home);
    if (liveSchedule) {
      var liveText = translate("home.liveSchedule", "LIVE SCHEDULE");
      var liveNode = Array.prototype.slice.call(liveSchedule.childNodes).find(function (n) { return n.nodeType === 3 && String(n.nodeValue || "").trim(); });
      if (liveNode && String(liveNode.nodeValue || "").trim() !== liveText) liveNode.nodeValue = " " + liveText;
    }
    setAttr(one("#raidHomeCarousel", home), "aria-label", translate("home.raidSelect", "Próximos Raid Bosses"));
    setAttr(one(".raid-home-arrow-prev", home), "aria-label", translate("home.raidPrev", "Boss anterior"));
    setAttr(one(".raid-home-arrow-next", home), "aria-label", translate("home.raidNext", "Próximo boss"));
    setAttr(one("#raidHomeDots", home), "aria-label", translate("home.raidSelect", "Selecionar Raid Boss"));

    setText(one(".ofd-home-panel .panel-heading h2", home), translate("home.ofdToday", "OFDs de Hoje"));
    setText(one(".ofd-home-countdown small", home), translate("home.nextUpdate", "PRÓXIMA ATUALIZAÇÃO"));
    setHtml(one(".ofd-time-alert p", home), translate("home.ofdReset", one(".ofd-time-alert p", home) ? one(".ofd-time-alert p", home).innerHTML : ""));

    setText(one(".ofd-week-panel .panel-heading h2", home), translate("home.ofdWeekly", "Overflow Dungeons Semanal"));
    setText(one(".ofd-week-copy strong", home), translate("home.chooseOtherDay", "CONSULTAR OUTRO DIA"));
    setText(one(".ofd-week-copy small", home), translate("home.chooseDayHint", "Selecione o dia brasileiro. Abaixo mostramos também o dia correspondente na Coreia."));
    setAttr(one(".ofd-week-days", home), "aria-label", translate("home.weekdaysAria", "Dias da semana"));
    all(".ofd-week-days button", home).forEach(function (button) {
      var code = String(button.getAttribute("data-ofd-day") || "").toUpperCase();
      setText(one("span", button), translate("weekday." + code + ".short", one("span", button) ? one("span", button).textContent : code));
      setText(one("small", button), translate("weekday." + code + ".full", one("small", button) ? one("small", button).textContent : code));
    });
    setHtml(one(".ofd-week-time-hint p", home), translate("home.cycleHint", one(".ofd-week-time-hint p", home) ? one(".ofd-week-time-hint p", home).innerHTML : ""));

    setText(one(".servers-panel .panel-heading h2", home), translate("home.activeServers", "Servers Ativos"));
    all(".server-status", home).forEach(function (element) { setText(element, translate("home.active", "ATIVA •")); });
    setText(one(".staff-panel .panel-heading h2", home), translate("home.staff", "Staff DSR"));
    setText(one(".staff-subs-title", home), translate("home.subs", "SUBS"));
    setText(one(".home-social-panel .panel-heading h2", home), translate("home.socials", "Nossas Redes"));

    all(".home-social-card.youtube .home-social-action, .home-social-card.twitch .home-social-action", home)
      .forEach(function (element) { setText(element, translate("home.openChannel", "ACESSAR CANAL →")); });
    all(".home-social-card.discord .home-social-action", home)
      .forEach(function (element) { setText(element, translate("home.openServer", "ACESSAR SERVIDOR →")); });

    setText(one(".footer-center-motto", home), translate("home.motto", "FORÇA • UNIÃO • EVOLUÇÃO"));
    setHtml(one(".footer-right", home), translate("home.footer", one(".footer-right", home) ? one(".footer-right", home).innerHTML : ""));
  }

  function applyHiddenStaticTranslations() {
    var root = document.getElementById("hiddenQuestsPagina");
    if (!root) return;
    setText(one(".hidden-quests-header .page-subtitle", root), translate("hidden.subtitle", "Guia traduzido com rotas, objetivos, recompensas, imagens e vídeos do post original do DSR."));
    setText(one(".hidden-quests-source span", root), translate("hidden.source", "FONTE ORIGINAL"));
    setAttr(one(".hidden-quests-alert", root), "aria-label", translate("hidden.alertAria", "Informações importantes"));
    setText(one(".hidden-quests-alert-head small", root), translate("hidden.before", "ANTES DE COMEÇAR"));
    setText(one(".hidden-quests-alert-head strong", root), translate("hidden.authorInfo", "INFORMAÇÕES IMPORTANTES DO AUTOR"));
    setText(one(".hidden-quests-search label", root), translate("hidden.searchLabel", "BUSCAR QUEST / NPC / DIGIMON / ITEM"));
    setAttr(one("#hiddenQuestSearch", root), "placeholder", translate("hidden.searchPlaceholder", "Ex.: Dekyu, Dark Castle, Leafmon..."));
    setText(one(".hidden-quests-summary small", root), translate("hidden.archive", "ARQUIVO HG"));
    setAttr(one("#hiddenQuestRegionFilters", root), "aria-label", translate("hidden.filterAria", "Filtrar por região"));
    setAttr(one(".hidden-quest-image-close", root), "aria-label", translate("hidden.closeImage", "Fechar imagem"));
  }

  function hiddenTranslations(language) {
    var langData = dictionary(language || currentLanguage);
    return langData.__hiddenQuests || {};
  }

  function ensureHiddenBase() {
    if (!hiddenBaseData && window.HG_HIDDEN_QUESTS_DATA) hiddenBaseData = cloneData(window.HG_HIDDEN_QUESTS_DATA);
    return hiddenBaseData;
  }

  function hiddenRegionLabel(slug, fallback) {
    var active = hiddenTranslations(currentLanguage).regions || {};
    var base = hiddenTranslations(DEFAULT_LANGUAGE).regions || {};
    return active[slug] || base[slug] || fallback || slug;
  }

  function localizeHiddenQuestPackage() {
    var base = ensureHiddenBase();
    if (!base) return;
    var pkg = cloneData(base);
    var translationData = hiddenTranslations(currentLanguage);
    if (Array.isArray(translationData.intro)) pkg.intro = translationData.intro.slice();

    var questTranslations = translationData.quests || {};
    pkg.quests = (Array.isArray(base.quests) ? base.quests : []).map(function (quest) {
      var copy = cloneData(quest);
      var tr = questTranslations[quest.code] || {};
      if (currentLanguage === "ko-KR") copy.title = tr.title || quest.korean || quest.title;
      else copy.title = tr.title || quest.title;
      if (Array.isArray(tr.steps)) copy.steps = tr.steps.slice();
      copy.region = hiddenRegionLabel(quest.regionSlug, quest.region);
      if (Array.isArray(copy.videos)) {
        copy.videos = copy.videos.map(function (video, index) {
          var v = cloneData(video);
          if (Array.isArray(tr.videoLabels) && tr.videoLabels[index]) v.label = tr.videoLabels[index];
          return v;
        });
      }
      return copy;
    });
    window.HG_HIDDEN_QUESTS_DATA = pkg;
  }

  function refreshHiddenQuestUi() {
    var root = document.getElementById("hiddenQuestsPagina");
    if (!root) return;
    var pkg = window.HG_HIDDEN_QUESTS_DATA || {};
    var intro = document.getElementById("hiddenQuestIntro");
    if (intro && Array.isArray(pkg.intro)) {
      var html = pkg.intro.map(function (text) { return '<div class="hidden-quests-alert-item">' + escapeHtml(text) + '</div>'; }).join("");
      setHtml(intro, html);
    }
    all(".hidden-quest-filter-btn", root).forEach(function (button) {
      var slug = button.getAttribute("data-region") || "all";
      setText(button, hiddenRegionLabel(slug, button.textContent));
    });
    if (typeof window.hiddenQuestAplicarFiltros === "function") {
      try { window.hiddenQuestAplicarFiltros(); } catch (error) { /* isolated addon: never block site */ }
    }
    applyHiddenDynamicTranslations();
  }

  function localizedWeekdayText(value, shortForm) {
    var text = String(value == null ? "" : value);
    var map = [
      [/(segunda-feira|segunda|SEG)(?=\b|,)/gi, translate("weekday.SEG." + (shortForm ? "short" : "full"), shortForm ? "SEG" : "SEGUNDA")],
      [/(terça-feira|terça|terca-feira|terca|TER)(?=\b|,)/gi, translate("weekday.TER." + (shortForm ? "short" : "full"), shortForm ? "TER" : "TERÇA")],
      [/(quarta-feira|quarta|QUA)(?=\b|,)/gi, translate("weekday.QUA." + (shortForm ? "short" : "full"), shortForm ? "QUA" : "QUARTA")],
      [/(quinta-feira|quinta|QUI)(?=\b|,)/gi, translate("weekday.QUI." + (shortForm ? "short" : "full"), shortForm ? "QUI" : "QUINTA")],
      [/(sexta-feira|sexta|SEX)(?=\b|,)/gi, translate("weekday.SEX." + (shortForm ? "short" : "full"), shortForm ? "SEX" : "SEXTA")],
      [/(sábado|sabado|SÁB|SAB)(?=\b|,)/gi, translate("weekday.SAB." + (shortForm ? "short" : "full"), shortForm ? "SÁB" : "SÁBADO")],
      [/(domingo|DOM)(?=\b|,)/gi, translate("weekday.DOM." + (shortForm ? "short" : "full"), shortForm ? "DOM" : "DOMINGO")]
    ];
    map.forEach(function (entry) { text = text.replace(entry[0], entry[1]); });
    return text;
  }

  function replaceDirectText(element, matcher, value) {
    if (!element) return;
    Array.prototype.slice.call(element.childNodes || []).forEach(function (node) {
      if (node.nodeType !== 3) return;
      var raw = String(node.nodeValue || "");
      if (!matcher.test(raw)) return;
      var leading = (raw.match(/^\s*/) || [""])[0];
      var trailing = (raw.match(/\s*$/) || [""])[0];
      var next = leading + value + trailing;
      if (node.nodeValue !== next) node.nodeValue = next;
    });
  }

  function applyHomeDynamicTranslations() {
    var home = document.getElementById("homePagina");
    if (!home) return;

    all("#raidHomeTrack .raid-home-loading strong", home).forEach(function (el) { setText(el, translate("home.raidLoading", "CARREGANDO AGENDA DE RAIDS...")); });
    all("#raidHomeTrack .raid-home-loading small", home).forEach(function (el) { setText(el, translate("home.raidSync", "Sincronizando com o horário KST.")); });
    all("#raidHomeTrack .raid-home-card", home).forEach(function (card) {
      var status = one(".raid-home-status", card);
      if (status) {
        var statusText = String(status.textContent || "").toUpperCase();
        var label = statusText.indexOf("PRÓXIMO") >= 0 || statusText.indexOf("NEXT") >= 0 || statusText.indexOf("다음") >= 0
          ? translate("home.nextSpawn", "PRÓXIMO SPAWN")
          : translate("home.scheduled", "AGENDADO");
        var statusHtml = '<i></i>' + escapeHtml(label);
        setHtml(status, statusHtml);
      }
      var rotation = one(".raid-home-rotation", card);
      if (rotation) setText(rotation, "↻ " + translate("home.rotation", "ROTAÇÃO"));
      var mapButton = one(".raid-home-map", card);
      if (mapButton && /Mapa indisponível|Map unavailable|지도 없음/i.test(mapButton.textContent || "")) {
        setHtml(mapButton, escapeHtml(translate("home.mapUnavailable", "Mapa indisponível")) + " <span>⌖</span>");
      }
      var openButton = one(".raid-home-open", card);
      if (openButton) replaceDirectText(openButton, /VER AGENDA DE RAID|VIEW RAID SCHEDULE|레이드 일정 보기/i, translate("home.viewRaidSchedule", "VER AGENDA DE RAID"));
      var brt = one(".raid-home-time small", card);
      if (brt) {
        var brtText = localizedWeekdayText(brt.textContent, true);
        if (/HORÁRIO INDISPONÍVEL/i.test(brtText)) brtText = translate("home.timeUnavailable", "HORÁRIO INDISPONÍVEL");
        setText(brt, brtText);
      }
    });

    var day = document.getElementById("ofdHomeDay");
    if (day) {
      var dayText = String(day.textContent || "");
      var dayPrefix = dayText.split(" • ")[0] || translate("home.todayBrazil", "HOJE NO BRASIL");
      dayPrefix = localizedWeekdayText(dayPrefix, false);
      setText(day, dayPrefix + " • " + translate("home.brazilTime", "HORÁRIO DO BRASIL"));
    }
    var kstDay = document.getElementById("ofdHomeKstDay");
    if (kstDay) {
      var kstText = String(kstDay.textContent || "");
      var kstPrefix = kstText.split(" • ")[0] || translate("home.kstRotation", "ROTAÇÃO KST");
      kstPrefix = localizedWeekdayText(kstPrefix, false);
      setText(kstDay, kstPrefix + " • " + translate("home.kstAvailability", "DISPONIBILIDADE KST"));
    }

    all("#ofdHomeList .ofd-home-card, #ofdWeekList .ofd-week-card", home).forEach(function (card) {
      var meta = one(".ofd-home-copy small", card);
      if (meta) {
        var match = String(meta.textContent || "").match(/(?:NV|LV)\s*([^•]+)\s*•\s*(?:TICKET|티켓)\s*(.+)$/i);
        if (match) setHtml(meta, escapeHtml(translate("home.levelShort", "NV")) + " " + escapeHtml(String(match[1]).trim()) + " <b>•</b> " + escapeHtml(translate("home.ticket", "TICKET")) + " " + escapeHtml(String(match[2]).trim()));
      }
      var available = one(".ofd-home-open", card);
      if (available) setHtml(available, "<i></i> " + escapeHtml(translate("home.available", "DISPONÍVEL")));
    });

    all("#ofdHomeList .ofd-home-empty", home).forEach(function (el) { setText(el, translate("home.noOfdPeriod", "Nenhuma OFD disponível neste período.")); });
    all("#ofdWeekList .ofd-home-empty", home).forEach(function (el) { setText(el, translate("home.noOfdDay", "Nenhuma OFD disponível neste dia.")); });

    var weekTitle = document.getElementById("ofdWeekTitle");
    if (weekTitle) {
      var strong = one("strong", weekTitle);
      var small = one("small", weekTitle);
      if (strong) {
        var sPrefix = String(strong.textContent || "").split(" • ")[0];
        setText(strong, localizedWeekdayText(sPrefix, false) + " • " + translate("home.brazilTime", "HORÁRIO DO BRASIL"));
      } else if (String(weekTitle.textContent || "").trim()) {
        setText(weekTitle, translate("home.ofdDay", "OFDs DO DIA"));
      }
      if (small) {
        var kPrefix = String(small.textContent || "").split(" • ")[0];
        setText(small, localizedWeekdayText(kPrefix, false) + " • KST");
      }
    }
  }

  function questBaseByCode(code) {
    var base = ensureHiddenBase();
    var list = base && Array.isArray(base.quests) ? base.quests : [];
    return list.find(function (quest) { return String(quest.code) === String(code); }) || null;
  }

  function applyHiddenDynamicTranslations() {
    var root = document.getElementById("hiddenQuestsPagina");
    if (!root) return;

    all(".hidden-quest-filter-btn", root).forEach(function (button) {
      var slug = button.getAttribute("data-region") || "all";
      setText(button, hiddenRegionLabel(slug, button.textContent));
    });

    var activeFilter = one(".hidden-quest-filter-btn.ativo", root);
    var filterStatus = document.getElementById("hiddenQuestFilterStatus");
    if (filterStatus) {
      var activeSlug = activeFilter ? activeFilter.getAttribute("data-region") : "all";
      setText(filterStatus, hiddenRegionLabel(activeSlug || "all", translate("hidden.regionAll", "TODAS AS REGIÕES")));
    }

    var count = document.getElementById("hiddenQuestCount");
    if (count) {
      var numberMatch = String(count.textContent || "").match(/\d+/);
      var amount = numberMatch ? Number(numberMatch[0]) : 0;
      setText(count, amount + " " + translate(amount === 1 ? "hidden.questOne" : "hidden.questMany", amount === 1 ? "QUEST" : "QUESTS"));
    }

    var empty = one(".hidden-quests-empty", root);
    if (empty) {
      setText(one("strong", empty), translate("hidden.noneTitle", "NENHUMA QUEST ENCONTRADA"));
      setText(one("span", empty), translate("hidden.noneText", "Tente outro termo ou região."));
    }

    all(".hidden-quest-card", root).forEach(function (card) {
      var code = String(card.id || "").replace(/^hiddenQuestCard-/, "");
      var baseQuest = questBaseByCode(code);
      var chips = all(".hidden-quest-title-top .hidden-quest-chip", card);
      if (baseQuest && chips[1]) setText(chips[1], translate("hidden.kind." + String(baseQuest.kind || ""), baseQuest.kind || ""));
      var chain = one(".hidden-quest-chip.chain", card);
      if (chain) setText(chain, translate("hidden.chain", "CHAIN QUEST"));

      var titles = all(".hidden-quest-section-title", card);
      if (titles[0]) setText(titles[0], translate("hidden.steps", "PASSOS / INFORMAÇÕES"));
      if (titles[1]) setText(titles[1], translate("hidden.images", "IMAGENS DO POST"));

      all(".hidden-quest-step", card).forEach(function (step) {
        var text = String(step.textContent || "").trim();
        var isReward = /^(Recompensa|Reward|보상)\s*:/i.test(text);
        step.classList.toggle("reward", isReward);
      });

      all(".hidden-quest-no-images", card).forEach(function (message) {
        if (message.closest(".hidden-quest-gallery-shell")) setText(message, translate("hidden.noImages", "SEM IMAGENS NECESSÁRIAS NESTA QUEST"));
        else setText(message, translate("hidden.noSteps", "O post não fornece passos textuais adicionais para esta entrada."));
      });

      var imageCount = one(".hidden-quest-image-count", card);
      if (imageCount) {
        var nMatch = String(imageCount.textContent || "").match(/\d+/);
        var n = nMatch ? Number(nMatch[0]) : all(".hidden-quest-gallery button", card).length;
        setText(imageCount, n + " " + translate(n === 1 ? "hidden.imgOne" : "hidden.imgMany", n === 1 ? "IMG" : "IMGS"));
      }

      all(".hidden-quest-gallery button", card).forEach(function (button, index) {
        var title = one(".hidden-quest-title-top strong", card);
        var caption = (title ? title.textContent : "") + " · " + translate("hidden.image", "imagem") + " " + (index + 1);
        setAttr(button, "data-caption", caption);
        var img = one("img", button);
        if (img) setAttr(img, "alt", caption);
      });

      all(".hidden-quest-nav button", card).forEach(function (button) {
        var text = String(button.textContent || "").toUpperCase();
        if (text.indexOf("ANTERIOR") >= 0 || text.indexOf("PREVIOUS") >= 0 || text.indexOf("이전") >= 0) setText(button, translate("hidden.previous", "← ANTERIOR"));
        else setText(button, translate("hidden.next", "PRÓXIMA →"));
      });
    });
  }


  function digidexSortTranslationKey(sort) {
    var value = String(sort == null ? "" : sort).toUpperCase();
    if (!value) return "digidex.sort.alpha";
    var asc = /_ASC$/.test(value);
    var stat = value.replace(/_ASC$/, "");
    return "digidex.sort." + (asc ? "low" : "high") + "." + stat;
  }

  function applyDigidexStaticTranslations() {
    var root = document.getElementById("databasePagina");
    if (!root) return;

    setText(one(".digidex-header-copy .page-subtitle", root), translate("digidex.subtitle", "Consulte os Digimons da database da Holy Guardians."));
    setAttr(one(".digidex-view-toggle", root), "aria-label", translate("digidex.viewAria", "Modo de visualização"));
    setText(document.getElementById("digidexViewCard"), translate("digidex.cardView", "▦ CARD VIEW"));
    setText(document.getElementById("digidexViewTable"), translate("digidex.tableView", "☷ TABLE VIEW"));
    setText(one(".digidex-system-status", root), translate("digidex.databaseOnline", "DATABASE ONLINE"));

    var typeFilter = one(".type-filter", root);
    setAttr(typeFilter, "aria-label", translate("digidex.typeFilterAria", "Filtrar por Type"));
    var allType = one(".type-filter-btn", root);
    if (allType) {
      setText(allType, translate("digidex.all", "ALL"));
      setAttr(allType, "title", translate("digidex.allTypesTitle", "Todos os Types"));
    }

    var stageFilter = one(".stage-filter", root);
    setAttr(stageFilter, "aria-label", translate("digidex.stageFilterAria", "Filtrar por Stage — permite múltipla seleção"));
    var stageAll = one('.stage-filter-btn[data-stage=""] strong', root);
    if (stageAll) setText(stageAll, translate("digidex.all", "ALL"));

    setAttr(document.getElementById("pesquisa"), "placeholder", translate("digidex.searchPlaceholder", "Pesquisar Digimon..."));
    setText(one("#filtroSkillElemento summary > span:first-child", root), translate("digidex.skillElement", "SKILL ELEMENT"));
    setText(one("#filtroSkillElemento .digidex-filter-title", root), translate("digidex.searchIn", "PROCURAR EM"));
    setText(one("#filtroEfeito summary > span:first-child", root), translate("digidex.effectType", "EFFECT TYPE"));
    setText(one("#filtroEfeito .digidex-filter-title", root), translate("digidex.effectKind", "TIPO DE EFEITO"));
    setText(one("#filtroStatusEffect summary > span:first-child", root), translate("digidex.statusEffect", "STATUS EFFECT"));
    setText(one("#filtroStatusEffect .digidex-filter-title", root), translate("digidex.specificEffect", "EFEITO ESPECÍFICO"));
    setText(one("#filtroOrdenacao .digidex-filter-title", root), translate("digidex.sortResults", "ORDENAR RESULTADOS"));
    setText(one(".digidex-clear-filters", root), translate("digidex.clearFilters", "LIMPAR FILTROS"));

    all("#filtroOrdenacao .digidex-sort-option", root).forEach(function (button) {
      var key = digidexSortTranslationKey(button.getAttribute("data-sort"));
      setText(button, translate(key, button.textContent));
    });
    var activeSort = one("#filtroOrdenacao .digidex-sort-option.ativo", root);
    var sortLabel = document.getElementById("digidexOrdenacaoLabel");
    if (sortLabel) {
      var activeSortValue = activeSort ? activeSort.getAttribute("data-sort") : "";
      setText(sortLabel, translate(digidexSortTranslationKey(activeSortValue), translate("digidex.sort.alpha", "ORDEM ALFABÉTICA")));
    }
  }

  function translateDigidexTooltipLabel(label) {
    var normalized = String(label || "").trim().toLowerCase();
    var keys = {
      "level": "digidex.tip.level", "nível": "digidex.tip.level", "레벨": "digidex.tip.level",
      "type": "digidex.tip.type", "tipo": "digidex.tip.type", "타입": "digidex.tip.type",
      "range": "digidex.tip.range", "alcance": "digidex.tip.range", "범위": "digidex.tip.range",
      "base": "digidex.tip.base", "기본": "digidex.tip.base",
      "damage": "digidex.tip.damage", "dano": "digidex.tip.damage", "데미지": "digidex.tip.damage",
      "effect": "digidex.tip.effect", "efeito": "digidex.tip.effect", "효과": "digidex.tip.effect",
      "chance": "digidex.tip.chance", "확률": "digidex.tip.chance",
      "can change to": "digidex.tip.canChangeTo", "pode mudar para": "digidex.tip.canChangeTo", "변경 가능": "digidex.tip.canChangeTo"
    };
    var key = keys[normalized];
    return key ? translate(key, label) : label;
  }

  function applyDigidexDynamicTranslations() {
    var root = document.getElementById("databasePagina");
    if (!root) return;
    applyDigidexStaticTranslations();

    all(".digidex-status-effect-empty", root).forEach(function (el) {
      setText(el, translate("digidex.noCcSubtype", "NENHUM SUBTIPO DE CC ENCONTRADO NA DATABASE"));
    });

    var profile = document.getElementById("digidexProfile");
    if (!profile || profile.hidden) return;

    all(".digidex-profile-loading", profile).forEach(function (el) {
      if (one(".digidex-profile-loading-dot", el)) {
        replaceDirectText(el, /CARREGANDO|LOADING|불러오는|로드/i, translate("digidex.profileLoading", "CARREGANDO DIGIVOLUTION MASTER..."));
      } else {
        setText(el, translate("digidex.profileLoadingFull", "CARREGANDO PERFIL // DIGIVOLUTION MASTER..."));
      }
    });

    var errorBox = one(".digidex-profile-error", profile);
    if (errorBox) {
      setText(one("strong", errorBox), translate("digidex.profileError", "Não foi possível abrir o perfil."));
      setText(one("button", errorBox), translate("digidex.back", "VOLTAR PARA A DIGIDEX"));
    }

    var back = one(".digidex-profile-back", profile);
    if (back) setText(back, translate("digidex.backArrow", "← VOLTAR PARA DIGIDEX"));

    var kicker = one(".digidex-profile-kicker", profile);
    if (kicker) {
      var parts = String(kicker.textContent || "").split("//");
      var stage = parts.length > 1 ? String(parts.slice(1).join("//")).trim() : "";
      setText(kicker, translate("digidex.currentDigimon", "CURRENT DIGIMON") + (stage ? " // " + stage : ""));
    }

    var skillTitle = one(".digidex-profile-skills-section .digidex-profile-section-title span", profile);
    if (skillTitle) setText(skillTitle, translate("digidex.skillsTitle", "SKILLS // LEVEL 10"));
    var skillHint = one(".digidex-profile-skills-section .digidex-profile-section-title small", profile);
    if (skillHint) setText(skillHint, translate("digidex.skillsHint", "Passe o mouse no ícone ou nome para ver os detalhes."));

    all(".digidex-profile-skill.is-empty strong", profile).forEach(function (el) { setText(el, translate("digidex.noSkill", "SEM SKILL")); });
    all(".digidex-profile-no-stats", profile).forEach(function (el) { setText(el, translate("digidex.noStats", "Stats completos indisponíveis nesta entrada da Digidex.")); });

    var evoFrom = one(".digidex-evo-from-column > header strong", profile);
    var evoTo = one(".digidex-evo-to-column > header strong", profile);
    if (evoFrom) setText(evoFrom, translate("digidex.evolvesFrom", "EVOLVES FROM"));
    if (evoTo) setText(evoTo, translate("digidex.evolvesTo", "EVOLVES TO"));
    var fromEmpty = one(".digidex-evo-from-column .digidex-evo-empty", profile);
    var toEmpty = one(".digidex-evo-to-column .digidex-evo-empty", profile);
    if (fromEmpty) setText(fromEmpty, translate("digidex.lineStart", "INÍCIO DA LINHA"));
    if (toEmpty) setText(toEmpty, translate("digidex.lineEnd", "FIM DA LINHA"));

    all(".digidex-evo-requirements-box", profile).forEach(function (box) {
      setText(one(".digidex-evo-req-head strong", box), translate("digidex.evolutionRequirements", "EVOLUTION REQUIREMENTS"));
      var potential = one(".digidex-evo-potential-btn", box);
      if (potential) setText(potential, translate("digidex.showPotential", "MOSTRAR POTENCIAL"));
      all(".digidex-evo-req-empty", box).forEach(function (el) { setText(el, translate("digidex.noAdditionalReq", "SEM REQUISITO ADICIONAL REGISTRADO")); });
      all(".digidex-evo-req-item i", box).forEach(function (label) {
        var txt = String(label.textContent || "").trim().toUpperCase();
        if (txt === "LEVEL" || txt === "NÍVEL" || txt === "레벨") setText(label, translate("digidex.reqLevel", "LEVEL"));
        else if (txt === "BOND" || txt === "친밀도") setText(label, translate("digidex.reqBond", "BOND"));
        else if (txt === "ITEM" || txt === "아이템") setText(label, translate("digidex.reqItem", "ITEM"));
      });
    });

    all(".digidex-profile-skill-tooltip-grid i", profile).forEach(function (label) {
      setText(label, translateDigidexTooltipLabel(label.textContent));
    });
  }

  function applyCounterStaticTranslations() {
    var root = document.getElementById("counterFinderPagina");
    if (!root) return;

    setText(one(".counter-finder-header .page-subtitle", root), translate("counter.subtitle", "Escolha um Digimon e encontre os melhores matchups usando Skills e status da DATABASE MASTER."));
    setText(one(".counter-finder-source span", root), translate("counter.source", "FONTE"));

    var rules = all(".counter-finder-rule-strip > span", root);
    if (rules[0]) setHtml(rules[0], translate("counter.typeRule", rules[0].innerHTML));

    setText(one(".counter-finder-control-head small", root), translate("counter.targetKicker", "01 // TARGET"));
    setText(one(".counter-finder-control-head strong", root), translate("counter.targetQuestion", "QUAL DIGIMON VOCÊ QUER COUNTERAR?"));
    setText(one('label[for="counterFinderTargetInput"] > span', root), translate("counter.targetDigimon", "DIGIMON ALVO"));
    setAttr(document.getElementById("counterFinderTargetInput"), "placeholder", translate("counter.searchPlaceholder", "Digite o nome do Digimon..."));
    setText(one('label[for="counterFinderStage"] > span', root), translate("counter.candidateStage", "STAGE DOS CANDIDATOS"));
    var stageAll = one('#counterFinderStage option[value="ALL"]', root);
    if (stageAll) setText(stageAll, currentLanguage === "ko-KR" ? "전체 (All)" : translate("counter.all", "TODOS"));
    setText(one('label[for="counterFinderTargetPosition"] > span', root), translate("counter.targetPosition", "POSIÇÃO DO ALVO"));
    setText(one('#counterFinderTargetPosition option[value="ANY"]', root), translate("counter.position.any", "NÃO DEFINIDA"));
    setText(one('#counterFinderTargetPosition option[value="FRONT"]', root), translate("counter.position.front", "FRONT LINE"));
    setText(one('#counterFinderTargetPosition option[value="BACK"]', root), translate("counter.position.back", "BACK LINE"));
    setText(one(".counter-finder-how strong", root), translate("counter.howTitle", "COMO O MATCHUP É LIDO"));
    setText(one(".counter-finder-how p", root), translate("counter.howText", one(".counter-finder-how p", root) ? one(".counter-finder-how p", root).textContent : ""));

    var resultsHead = one(".counter-finder-results-head", root);
    if (resultsHead) {
      setText(one("div small", resultsHead), translate("counter.analysisKicker", "02 // ANALYSIS"));
      setText(one("div strong", resultsHead), translate("counter.bestCounters", "MELHORES COUNTERS"));
    }
  }

  function counterMatchLabelForCard(card) {
    if (!card) return "";
    if (card.classList.contains("counter-finder-elite")) return translate("counter.match.great", "ÓTIMO MATCHUP");
    if (card.classList.contains("counter-finder-forte")) return translate("counter.match.advantage", "VANTAGEM");
    if (card.classList.contains("counter-finder-neutro")) return translate("counter.match.balanced", "EQUILIBRADO");
    return translate("counter.match.risky", "ARRISCADO");
  }

  function translateCounterReason(raw) {
    var text = String(raw || "").trim();
    var m;

    m = text.match(/^TYPE: causa\s+([^ ]+)\s+de modificador de dano contra\s+(.+)$/i);
    if (m) return formatTranslation("counter.reason.typeDamage", "TYPE: causa {mod} de modificador de dano contra {type}", { mod: m[1], type: m[2] });
    if (/^TYPE ofensivo neutro:/i.test(text)) return translate("counter.reason.typeNeutral", "TYPE ofensivo neutro: 0% de modificador de dano");

    m = text.match(/^TYPE defensivo: o alvo causa\s+([^ ]+)\s+contra este candidato$/i);
    if (m) return formatTranslation("counter.reason.typeDefense", "TYPE defensivo: o alvo causa {mod} contra este candidato", { mod: m[1] });

    m = text.match(/^Melhor Skill:\s*S([^ ]+)\s+(.+?)\s+·\s+(BASE|CONVERSÃO)\s+(.+?)\s+·\s+coef\.\s+([\d.,]+)%$/i);
    if (m) return formatTranslation("counter.reason.bestSkill", "Melhor Skill: S{slot} {skill} · {mode} {element} · coef. {coef}%", {
      slot: m[1], skill: m[2], mode: String(m[3]).toUpperCase() === "BASE" ? translate("counter.base", "BASE") : translate("counter.conversion", "CONVERSÃO"), element: m[4], coef: m[5]
    });

    m = text.match(/^(Base|Conversão)\s+([^ ]+)\s+explora WEAK\s*(.*)$/i);
    if (m) return formatTranslation("counter.reason.exploitWeak", "{mode} {element} explora WEAK {effect}", {
      mode: /^base$/i.test(m[1]) ? translate("counter.base", "BASE") : translate("counter.conversion", "CONVERSÃO"), element: m[2], effect: m[3]
    }).trim();

    m = text.match(/^(Base|Conversão)\s+([^ ]+)\s+encontra STRONG\s*(.*)$/i);
    if (m) return formatTranslation("counter.reason.hitsStrong", "{mode} {element} encontra STRONG {effect}", {
      mode: /^base$/i.test(m[1]) ? translate("counter.base", "BASE") : translate("counter.conversion", "CONVERSÃO"), element: m[2], effect: m[3]
    }).trim();

    if (/^Alvo:\s*/i.test(text)) return translate("counter.reason.targetPrefix", "Alvo:") + " " + translateCounterReason(text.replace(/^Alvo:\s*/i, ""));
    if (/^Defesa favorável:\s*/i.test(text)) return translate("counter.reason.goodDefensePrefix", "Defesa favorável:") + " " + translateCounterReason(text.replace(/^Defesa favorável:\s*/i, ""));

    m = text.match(/^SPD\s+(\d+)\s+vs\s+(\d+)\s+·\s+tende a agir antes\s+\(([^)]+)\)$/i);
    if (m) return formatTranslation("counter.reason.spdBefore", "SPD {a} vs {b} · tende a agir antes ({diff})", { a: m[1], b: m[2], diff: m[3] });
    m = text.match(/^SPD\s+(\d+)\s+vs\s+(\d+)\s+·\s+tende a agir depois\s+\(([^)]+)\)$/i);
    if (m) return formatTranslation("counter.reason.spdAfter", "SPD {a} vs {b} · tende a agir depois ({diff})", { a: m[1], b: m[2], diff: m[3] });
    m = text.match(/^SPD empatado em\s+(\d+)$/i);
    if (m) return formatTranslation("counter.reason.spdTie", "SPD empatado em {spd}", { spd: m[1] });

    m = text.match(/^Ameaça do alvo:\s*(.+)$/i);
    if (m) return translate("counter.reason.targetThreat", "Ameaça do alvo:") + " " + m[1];
    if (/^Alvo em BACK: o candidato depende de Skills Melee enquanto houver Front$/i.test(text)) return translate("counter.reason.backMelee", text);
    if (/^Alvo em BACK: possui opção Ranged para alcançar a back line$/i.test(text)) return translate("counter.reason.backRanged", text);

    return text;
  }

  function applyCounterDynamicTranslations() {
    var root = document.getElementById("counterFinderPagina");
    if (!root) return;
    applyCounterStaticTranslations();

    all(".counter-finder-suggestion-empty", root).forEach(function (el) {
      var text = String(el.textContent || "");
      if (/Carregando|Loading|불러/i.test(text)) setText(el, translate("counter.loadingDatabase", "Carregando DATABASE MASTER..."));
      else setText(el, translate("counter.noDigimonFound", "Nenhum Digimon encontrado."));
    });

    var targetEmpty = one("#counterFinderTargetCard .counter-finder-target-empty", root);
    if (targetEmpty) {
      setText(one("strong", targetEmpty), translate("counter.selectEnemy", "SELECIONE O DIGIMON INIMIGO"));
      setText(one("small", targetEmpty), translate("counter.analyzerText", "O analisador lê Skills, efeitos, Strong/Weak, stats e TYPE diretamente da DATABASE MASTER."));
    }

    var targetCopy = one("#counterFinderTargetCard .counter-finder-target-copy", root);
    if (targetCopy) {
      setText(one(":scope > small", targetCopy), translate("counter.targetAnalyzed", "ALVO ANALISADO //"));
      var tags = all(".counter-finder-target-tags > span", targetCopy);
      var effectsTag = tags.length ? tags[tags.length - 1] : null;
      if (effectsTag) {
        var match = String(effectsTag.textContent || "").match(/\d+/);
        var amount = match ? Number(match[0]) : 0;
        setText(effectsTag, formatTranslation(amount === 1 ? "counter.effectMappedOne" : "counter.effectMappedMany", amount === 1 ? "{count} EFEITO MAPEADO" : "{count} EFEITOS MAPEADOS", { count: amount }));
      }
    }
    setText(one("#counterFinderTargetCard .counter-finder-target-elements > small", root), translate("counter.elementsAvailable", "ELEMENTOS DISPONÍVEIS"));

    all(".counter-finder-type-duel > div > span", root).forEach(function (el) { setText(el, translate("counter.damage", "DANO")); });

    all(".counter-finder-matchup-strip", root).forEach(function (strip) {
      var labels = all("small", strip);
      if (labels[0]) setText(labels[0], translate("counter.offensiveType", "OFENSIVA TYPE"));
      if (labels[1]) setText(labels[1], translate("counter.typeReceived", "TYPE RECEBIDO"));
      if (labels[2]) setText(labels[2], translate("counter.spdDelta", "SPD Δ"));
      if (labels[3]) setText(labels[3], translate("counter.bestSkill", "MELHOR SKILL"));
    });

    all(".counter-finder-best-skill", root).forEach(function (box) {
      if (box.classList.contains("empty")) {
        setText(box, translate("counter.noOffensiveSkill", "SEM SKILL OFENSIVA MAPEADA"));
        return;
      }
      setText(one(":scope > div > small", box), translate("counter.bestOffensive", "MELHOR OPÇÃO OFENSIVA"));
      var detail = one(":scope > div > span", box);
      if (detail) {
        var raw = String(detail.textContent || "");
        var m = raw.match(/^(BASE|CONVERSÃO|CONVERSION|기본|변환)\s+(.+)$/i);
        if (m) {
          var isBase = /^(BASE|기본)$/i.test(m[1]);
          setText(detail, (isBase ? translate("counter.base", "BASE") : translate("counter.conversion", "CONVERSÃO")) + " " + m[2]);
        }
      }
    });

    all(".counter-finder-effects-empty", root).forEach(function (el) { setText(el, translate("counter.noEffects", "SEM CC / DOT / DEF BREAK MAPEADO")); });

    var count = document.getElementById("counterFinderResultCount");
    if (count) {
      var countText = String(count.textContent || "").trim();
      var n = countText.match(/^\s*(\d+)/);
      if (n) setText(count, formatTranslation("counter.bestCandidates", "{count} MELHORES CANDIDATOS", { count: Number(n[1]) }));
      else if (/AGUARDANDO ALVO|WAITING|대상/i.test(countText)) setText(count, translate("counter.waitingTarget", "AGUARDANDO ALVO"));
      else if (/CARREGANDO MASTER|LOADING MASTER|MASTER 불러/i.test(countText)) setText(count, translate("counter.loadingMaster", "CARREGANDO MASTER"));
      else if (/ERRO NA DATABASE|DATABASE ERROR|데이터베이스 오류/i.test(countText)) setText(count, translate("counter.databaseError", "ERRO NA DATABASE"));
    }

    all("#counterFinderResults .counter-finder-results-empty", root).forEach(function (box) {
      var strong = one("strong", box);
      var small = one("small", box);
      var raw = String(strong && strong.textContent || "");
      if (/PRONTA PARA CARREGAR|READY TO LOAD|로드 준비/i.test(raw)) {
        setText(strong, translate("counter.databaseReady", "DATABASE MASTER PRONTA PARA CARREGAR"));
        if (small) setText(small, translate("counter.databaseReadyHint", "Abra ou pesquise um Digimon para iniciar a análise."));
      } else if (/NENHUM MATCHUP CALCULADO|NO MATCHUP|매치업.*없/i.test(raw)) {
        setText(strong, translate("counter.noMatchup", "NENHUM MATCHUP CALCULADO"));
        if (small) setText(small, translate("counter.chooseAbove", "Escolha um Digimon acima para iniciar a análise."));
      } else if (/NENHUM CANDIDATO NESTE STAGE|NO CANDIDATE|후보.*없/i.test(raw)) {
        setText(strong, translate("counter.noCandidateStage", "NENHUM CANDIDATO NESTE STAGE"));
      } else if (/NÃO FOI POSSÍVEL CARREGAR|COULD NOT LOAD|불러오지 못/i.test(raw)) {
        setText(strong, translate("counter.cannotLoadDb", "NÃO FOI POSSÍVEL CARREGAR A DATABASE MASTER"));
      } else if (/CARREGANDO DATABASE MASTER|LOADING DATABASE MASTER|DATABASE MASTER.*불러/i.test(raw)) {
        setText(strong, translate("counter.loadingDb", "CARREGANDO DATABASE MASTER"));
        if (small) setText(small, translate("counter.dataSamePvp", "Os dados são os mesmos usados pelas ferramentas PvP da Holy Guardians."));
      }
    });

    all("#counterFinderResults .counter-finder-result", root).forEach(function (card) {
      var scoreLabel = one(".counter-finder-score span", card);
      if (scoreLabel) setText(scoreLabel, counterMatchLabelForCard(card));
      var open = one(".counter-finder-open", card);
      if (open) replaceDirectText(open, /ABRIR NA DIGIDEX|OPEN IN DIGIDEX|디지덱스에서 보기/i, translate("counter.openDigidex", "ABRIR NA DIGIDEX"));
      var profileButton = one(".counter-finder-result-icon", card);
      if (profileButton) {
        var nameEl = one(".counter-finder-result-ident h3", card);
        var name = nameEl ? nameEl.textContent : "Digimon";
        setAttr(profileButton, "aria-label", formatTranslation("counter.viewStats", "Ver status de {name}", { name: name }));
      }
      all(".counter-finder-reasons li", card).forEach(function (li) {
        var textNode = Array.prototype.slice.call(li.childNodes || []).find(function (node) { return node.nodeType === 3 && String(node.nodeValue || "").trim(); });
        if (!textNode) return;
        var raw = String(textNode.nodeValue || "").trim();
        var translated = translateCounterReason(raw);
        var lead = (String(textNode.nodeValue || "").match(/^\s*/) || [""])[0];
        if (textNode.nodeValue !== lead + translated) textNode.nodeValue = lead + translated;
      });
    });
  }

  function applyCounterTooltipTranslations() {
    var tooltip = document.getElementById("counterFinderDigiTooltip");
    if (!tooltip || tooltip.hidden) return;
    applyCounterTooltipReferenceTranslations(tooltip);
  }

  function refreshCounterFinderUi() {
    if (!document.getElementById("counterFinderPagina")) return;
    try {
      if (typeof window.counterFinderRenderizarTarget === "function") window.counterFinderRenderizarTarget();
      if (typeof window.counterFinderRenderizarResultados === "function") window.counterFinderRenderizarResultados();
    } catch (error) { /* isolated addon */ }
    applyCounterDynamicTranslations();
  }

  function applyDynamicTranslations() {
    return withObserverMuted(function () {
      applyHomeDynamicTranslations();
      applyHiddenDynamicTranslations();
      applyDigidexDynamicTranslations();
      applyCounterDynamicTranslations();
      applyHeaderEventTranslations();
      applyRaidDynamicTranslations();
      applyDekyuDynamicTranslations();
      applyImpmonLiveTranslations();
      applyKoreanReferenceTranslations();
      applyCounterTooltipTranslations();
    });
  }

  function queueDynamicTranslations() {
    if (dynamicApplyQueued) return;
    dynamicApplyQueued = true;
    window.setTimeout(function () {
      dynamicApplyQueued = false;
      applyDynamicTranslations();
    }, 0);
  }

  function applyDynamicTranslationsForRoot(rootId) {
    return withObserverMuted(function () {
      switch (String(rootId || "")) {
        case "homePagina":
          applyHomeDynamicTranslations();
          break;
        case "hiddenQuestsPagina":
          applyHiddenDynamicTranslations();
          break;
        case "databasePagina":
          applyDigidexDynamicTranslations();
          applyKoreanReferenceTranslations();
          break;
        case "counterFinderPagina":
          applyCounterDynamicTranslations();
          applyKoreanReferenceTranslations();
          applyCounterTooltipTranslations();
          break;
        case "raidBossPagina":
          applyRaidDynamicTranslations();
          break;
        case "dekyuTreasurePagina":
          applyDekyuDynamicTranslations();
          break;
        case "hgImpmonLive":
          applyImpmonLiveTranslations();
          break;
        case "siteTopbar":
          applyHeaderEventTranslations();
          break;
      }
    });
  }

  function queueDynamicTranslationsForRoot(rootId) {
    var key = String(rootId || "");
    if (!key || dynamicRootQueued[key]) return;
    dynamicRootQueued[key] = true;
    window.setTimeout(function () {
      dynamicRootQueued[key] = false;
      applyDynamicTranslationsForRoot(key);
    }, 0);
  }

  function wrapRuntimeFunction(name, after) {
    var original = window[name];
    if (typeof original !== "function" || original.__hgI18nWrapped) return;
    var wrapped = function () {
      var result = original.apply(this, arguments);
      try { after(); } catch (error) { /* isolated addon */ }
      return result;
    };
    wrapped.__hgI18nWrapped = true;
    wrapped.__hgI18nOriginal = original;
    window[name] = wrapped;
  }

  function installRuntimeHooks() {
    if (runtimeHooksInstalled) return;
    runtimeHooksInstalled = true;

    /* O script principal reescreve "PRÓXIMO HH:00" duas vezes por segundo
       (timers de Raid e Dekyu). Traduzimos no MESMO call stack para nunca existir
       um frame visível em português quando EN/KO estiver ativo. */
    wrapRuntimeFunction("atualizarHgHeaderCountdowns", function () {
      withObserverMuted(applyHeaderEventTranslations);
    });

    /* O Counter Finder reconstrói cards inteiros. Traduzir logo após o render
       evita depender de um observer global e elimina o vai-e-volta no KO. */
    ["counterFinderRenderizarTarget", "counterFinderRenderizarResultados", "counterFinderPesquisarAlvo", "counterFinderMostrarTooltip"].forEach(function (name) {
      wrapRuntimeFunction(name, function () {
        applyDynamicTranslationsForRoot("counterFinderPagina");
      });
    });
  }

  function installObservers() {
    if (observerInstalled || typeof MutationObserver === "undefined") return;
    observerInstalled = true;
    [document.getElementById("homePagina"), document.getElementById("hiddenQuestsPagina"), document.getElementById("databasePagina"), document.getElementById("counterFinderPagina"), document.getElementById("raidBossPagina"), document.getElementById("dekyuTreasurePagina"), document.getElementById("hgImpmonLive"), document.getElementById("siteTopbar")].forEach(function (root) {
      if (!root) return;
      var observer = new MutationObserver(function (mutations) {
        /* IMPORTANTE: o header precisa ser corrigido mesmo se outra tradução estiver
           momentaneamente com o observer silenciado. O timer original escreve PT. */
        if (root.id === "siteTopbar") {
          applyHeaderEventTranslations();
          return;
        }

        if (observerMuteDepth > 0) return;

        /* Relógios alteram apenas números e não devem retraduzir outras páginas. */
        if (root.id === "homePagina" &&
            mutationsOnlyInside(mutations, "#ofdHomeCountdown, [id^='raidHomeCountdown']")) return;
        if (root.id === "raidBossPagina" &&
            mutationsOnlyInside(mutations, "#raidKstClock, [id^='raidCountdown']")) return;
        if (root.id === "dekyuTreasurePagina" &&
            mutationsOnlyInside(mutations, "#dekyuCountdown, #dekyuNextTime")) return;

        /* Cada seção traduz APENAS a si mesma. Antes qualquer relógio do site
           disparava uma tradução completa, fazendo o Counter KO oscilar. */
        queueDynamicTranslationsForRoot(root.id);
      });
      observer.observe(root, { childList: true, subtree: true, characterData: true });
    });
  }

  function updateLanguageUi() {
    var meta = LANGUAGE_META[currentLanguage] || LANGUAGE_META[DEFAULT_LANGUAGE];
    var code = document.getElementById("hgLanguageCurrentCode");
    var flag = document.getElementById("hgLanguageCurrentFlag");
    var switcher = document.getElementById("hgLanguageSwitcher");
    if (code) code.textContent = meta.code;
    if (flag) flag.src = meta.flag;
    if (switcher) switcher.setAttribute("data-language", currentLanguage);
    all("[data-hg-language]").forEach(function (button) {
      var selected = button.getAttribute("data-hg-language") === currentLanguage;
      button.setAttribute("aria-checked", selected ? "true" : "false");
      button.classList.toggle("is-active", selected);
    });
  }

  function updateUrl(language) {
    try {
      var url = new URL(window.location.href);
      if (language === DEFAULT_LANGUAGE) url.searchParams.delete("lang");
      else url.searchParams.set("lang", LANGUAGE_META[language].query);
      window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    } catch (error) { /* optional */ }
  }

  function closeMenu() {
    var trigger = document.getElementById("hgLanguageTrigger");
    var menu = document.getElementById("hgLanguageMenu");
    if (trigger) trigger.setAttribute("aria-expanded", "false");
    if (menu) menu.hidden = true;
  }

  function openMenu() {
    var trigger = document.getElementById("hgLanguageTrigger");
    var menu = document.getElementById("hgLanguageMenu");
    if (trigger) trigger.setAttribute("aria-expanded", "true");
    if (menu) menu.hidden = false;
  }

  function toggleMenu(event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    var menu = document.getElementById("hgLanguageMenu");
    if (!menu) return;
    if (menu.hidden) openMenu(); else closeMenu();
  }

  function setLanguage(language, options) {
    var next = normalizeLanguage(language) || DEFAULT_LANGUAGE;
    var opts = options || {};
    currentLanguage = next;
    try { localStorage.setItem(STORAGE_KEY, next); } catch (error) { /* optional */ }
    document.documentElement.lang = LANGUAGE_META[next].htmlLang;
    localizeHiddenQuestPackage();
    applyStaticTranslations();
    updateLanguageUi();
    refreshHiddenQuestUi();
    refreshCounterFinderUi();
    queueDynamicTranslations();
    if (opts.updateUrl !== false) updateUrl(next);
    closeMenu();
    document.dispatchEvent(new CustomEvent("hg:languagechange", { detail: { language: next } }));
  }

  function init() {
    currentLanguage = languageFromUrl() || languageFromStorage() || DEFAULT_LANGUAGE;
    document.documentElement.lang = LANGUAGE_META[currentLanguage].htmlLang;
    localizeHiddenQuestPackage();

    var trigger = document.getElementById("hgLanguageTrigger");
    var menu = document.getElementById("hgLanguageMenu");
    if (trigger) trigger.addEventListener("click", toggleMenu);
    if (menu) menu.addEventListener("click", function (event) { event.stopPropagation(); });

    all("[data-hg-language]").forEach(function (button) {
      button.addEventListener("click", function () { setLanguage(button.getAttribute("data-hg-language")); });
    });

    document.addEventListener("click", function (event) {
      var switcher = document.getElementById("hgLanguageSwitcher");
      if (switcher && !switcher.contains(event.target)) closeMenu();
    });
    document.addEventListener("keydown", function (event) { if (event.key === "Escape") closeMenu(); });
    document.addEventListener("mouseover", function (event) {
      if (event.target && event.target.closest && event.target.closest(".counter-finder-profile-trigger")) window.setTimeout(applyCounterTooltipTranslations, 0);
    }, true);
    document.addEventListener("focusin", function (event) {
      if (event.target && event.target.closest && event.target.closest(".counter-finder-profile-trigger")) window.setTimeout(applyCounterTooltipTranslations, 0);
    });

    applyStaticTranslations();
    updateLanguageUi();
    installRuntimeHooks();
    installObservers();
    window.setTimeout(function () {
      refreshHiddenQuestUi();
      refreshCounterFinderUi();
      applyDynamicTranslations();
    }, 0);
  }

  window.hgT = translate;
  window.hgSetLanguage = setLanguage;
  window.hgGetLanguage = function () { return currentLanguage; };
  window.hgApplyTranslations = function () {
    applyStaticTranslations();
    localizeHiddenQuestPackage();
    refreshHiddenQuestUi();
    refreshCounterFinderUi();
    applyDynamicTranslations();
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
}());
