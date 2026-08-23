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

  function phase6SpecialLookup(bucket, value) {
    var raw = String(value || "").replace(/\s+/g, " ").trim();
    if (!raw) return "";
    var map = koDataMap(bucket);
    if (map[raw]) return map[raw];
    var lower = raw.toLowerCase();
    var keys = Object.keys(map || {});
    for (var i = 0; i < keys.length; i++) {
      if (String(keys[i]).toLowerCase() === lower) return map[keys[i]] || "";
    }
    return "";
  }

  function koMapName(value) {
    return phase6SpecialLookup("__mapNames", value);
  }

  function koRaidBossName(value) {
    var raw = String(value || "").replace(/\s+/g, " ").trim();
    return phase6SpecialLookup("__raidBossNames", raw) || koDigimonName(raw);
  }

  function koZoneName(value) {
    return phase6SpecialLookup("__zoneNames", value);
  }

  function koOverflowName(value) {
    return phase6SpecialLookup("__overflowNames", value) || koMapName(value) || koZoneName(value);
  }

  function phase6KoReference(original, translated) {
    var raw = String(original || "").trim();
    var ko = String(translated || "").trim();
    return ko && raw ? ko + " (" + raw + ")" : raw;
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

    var builder = document.getElementById("builderPagina");
    if (builder) applyKoreanRelationTooltips(builder);

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
    phase6ApplyRaidNames();
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
    phase6ApplyDekyuMapNames();
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



  /* =====================================================
     PHASE 6 — KOREAN OFFICIAL NAMES / MAPS / SEARCH ALIASES
     DSR WIKI Korean names are display/search aliases only.
     Canonical English values remain untouched for site logic.
  ===================================================== */

  function phase6StoredOriginal(element, attr, fallback) {
    if (!element) return "";
    var key = attr || "data-hg-phase6-original";
    var stored = element.getAttribute(key);
    if (stored != null && stored !== "") return stored;
    var raw = String(fallback != null ? fallback : element.textContent || "").replace(/\s+/g, " ").trim();
    if (raw) element.setAttribute(key, raw);
    return raw;
  }

  function phase6ApplyReferenceText(element, resolver, attr, fallback) {
    if (!element) return;
    var original = phase6StoredOriginal(element, attr, fallback);
    if (!original) return;
    if (currentLanguage === "ko-KR") {
      var translated = resolver(original);
      setText(element, translated ? phase6KoReference(original, translated) : original);
    } else {
      setText(element, original);
    }
  }

  function phase6DirectTextNode(host) {
    if (!host) return null;
    var nodes = Array.prototype.slice.call(host.childNodes || []);
    return nodes.find(function (node) { return node.nodeType === 3 && String(node.nodeValue || "").trim(); }) || null;
  }

  function phase6ApplyReferenceDirectText(host, resolver, attr) {
    if (!host) return;
    var node = phase6DirectTextNode(host);
    if (!node) return;
    var key = attr || "data-hg-phase6-direct-original";
    var original = host.getAttribute(key) || String(node.nodeValue || "").replace(/\s+/g, " ").trim();
    if (!original) return;
    if (!host.getAttribute(key)) host.setAttribute(key, original);
    var next = original;
    if (currentLanguage === "ko-KR") {
      var translated = resolver(original);
      if (translated) next = phase6KoReference(original, translated);
    }
    node.nodeValue = next + " ";
  }

  function phase6ApplyRaidNames() {
    var root = document.getElementById("raidBossPagina");
    if (!root) return;
    all("#raidList .raid-card", root).forEach(function (card) {
      phase6ApplyReferenceDirectText(one(".raid-card-top h3", card), koRaidBossName, "data-hg-raid-boss-original");
      phase6ApplyReferenceDirectText(one(".raid-map-link", card), koMapName, "data-hg-raid-map-original");
    });

    var alertTitle = document.getElementById("raidAlertTitle");
    if (alertTitle) {
      var raw = String(alertTitle.textContent || "").replace(/\s+/g, " ").trim();
      var ko = koRaidBossName(raw);
      if (currentLanguage === "ko-KR" && ko) setText(alertTitle, phase6KoReference(raw, ko));
    }
  }

  function phase6ApplyHomeRaidAndOverflowNames() {
    var home = document.getElementById("homePagina");
    if (!home) return;

    all("#raidHomeTrack .raid-home-card", home).forEach(function (card) {
      phase6ApplyReferenceText(one(".raid-home-info h3", card), koRaidBossName, "data-hg-home-boss-original");
      phase6ApplyReferenceDirectText(one(".raid-home-map", card), koMapName, "data-hg-home-raid-map-original");
    });

    all("#ofdHomeList .ofd-home-card, #ofdWeekList .ofd-week-card", home).forEach(function (card) {
      var name = one(".ofd-location-line strong", card);
      phase6ApplyReferenceText(name, koOverflowName, "data-hg-ofd-name-original");

      var map = one(".ofd-location-line span", card);
      if (map) {
        var raw = phase6StoredOriginal(map, "data-hg-ofd-map-original");
        var clean = String(raw || "").replace(/^\s*[—-]\s*/, "").trim();
        if (currentLanguage === "ko-KR") {
          var translated = koMapName(clean);
          setText(map, "— " + (translated ? phase6KoReference(clean, translated) : clean));
        } else {
          setText(map, raw);
        }
      }
    });
  }

  function phase6ApplyDekyuMapNames() {
    var root = document.getElementById("dekyuTreasurePagina");
    if (!root) return;

    all("#dekyuZone option", root).forEach(function (option) {
      var originalZone = String(option.value || option.getAttribute("data-hg-dekyu-zone-original") || option.textContent || "").trim();
      if (!originalZone || /Carregando áreas|Loading areas|지역 불러오는 중|Erro ao carregar áreas|Error loading areas|지역을 불러오지 못했습니다/i.test(originalZone)) return;
      option.setAttribute("data-hg-dekyu-zone-original", originalZone);
      if (currentLanguage === "ko-KR") {
        var translatedZone = koZoneName(originalZone);
        if (translatedZone) setText(option, phase6KoReference(originalZone, translatedZone));
      } else setText(option, originalZone);
    });

    var zoneLabel = one("#dekyuZoneLabel", root);
    var zoneSelect = one("#dekyuZone", root);
    if (zoneLabel && zoneSelect && zoneSelect.value) {
      var zoneOriginal = String(zoneSelect.value || "").trim();
      if (currentLanguage === "ko-KR") {
        var zoneKo = koZoneName(zoneOriginal);
        if (zoneKo) setText(zoneLabel, phase6KoReference(zoneOriginal, zoneKo));
      } else setText(zoneLabel, zoneOriginal);
    }

    all("#dekyuMap option", root).forEach(function (option) {
      var original = String(option.value || option.getAttribute("data-hg-dekyu-map-original") || option.textContent || "").trim();
      if (!original || /Carregando mapas|Loading maps|맵 불러오는 중|Erro ao carregar mapas|Error loading maps|맵을 불러오지 못했습니다/i.test(original)) return;
      option.setAttribute("data-hg-dekyu-map-original", original);
      if (currentLanguage === "ko-KR") {
        var translated = koMapName(original);
        if (translated) setText(option, phase6KoReference(original, translated));
      } else setText(option, original);
    });

    var title = one("#dekyuMapTitle", root);
    if (title) {
      var current = String(title.textContent || "").replace(/\s+/g, " ").trim();
      var placeholder = /^(Selecione um mapa|Select a map|맵을 선택하세요)$/i.test(current);
      if (!placeholder) {
        var mapSelect = one("#dekyuMap", root);
        var originalTitle = String(mapSelect && mapSelect.value || current).trim();
        if (currentLanguage === "ko-KR") {
          var ko = koMapName(originalTitle);
          if (ko) setText(title, phase6KoReference(originalTitle, ko));
        } else setText(title, originalTitle);
      }
    }
  }

  function phase6KoreanSearchEntries() {
    var map = koDataMap("__digimonNames");
    return Object.keys(map || {}).map(function (en) {
      return { en: String(en || "").trim(), ko: String(map[en] || "").trim() };
    }).filter(function (entry) { return entry.en && entry.ko; });
  }

  function phase6CommonPrefix(values) {
    var arr = (values || []).filter(Boolean);
    if (!arr.length) return "";
    var prefix = arr[0];
    for (var i = 1; i < arr.length && prefix; i++) {
      var value = arr[i];
      var max = Math.min(prefix.length, value.length);
      var j = 0;
      while (j < max && prefix[j] === value[j]) j++;
      prefix = prefix.slice(0, j);
    }
    return prefix.replace(/[\s_(:-]+$/g, "");
  }

  function phase6ResolveKoreanSearchAlias(value) {
    var raw = String(value || "").replace(/\s+/g, " ").trim();
    if (currentLanguage !== "ko-KR" || !/[가-힣]/.test(raw)) return "";
    var entries = phase6KoreanSearchEntries();
    var exact = entries.find(function (entry) { return entry.ko === raw; });
    if (exact) return exact.en;
    var matches = entries.filter(function (entry) { return entry.ko.indexOf(raw) !== -1; });
    if (!matches.length) return "";
    var lowerNames = matches.map(function (entry) { return entry.en.toLowerCase(); });
    var common = phase6CommonPrefix(lowerNames);
    return common.length >= 2 ? common : matches[0].en;
  }

  function phase6IsDigimonSearchInput(input) {
    if (!input || input.nodeType !== 1) return false;
    if (input.matches && input.matches("#pesquisa, #counterFinderTargetInput, .team-search, #statusSimulatorSearch, #calcDigimon, [id^='comparacaoDigimon']")) return true;
    return false;
  }

  function phase6AliasSearchEvent(event) {
    var input = event && event.target;
    if (!phase6IsDigimonSearchInput(input) || currentLanguage !== "ko-KR") return;
    if (event && event.isComposing) return;
    if (event && event.type === "keydown" && event.key !== "Enter") return;
    var original = String(input.value || "");
    var alias = phase6ResolveKoreanSearchAlias(original);
    if (!alias || alias === original) return;
    input.value = alias;
    var restore = function () {
      if (String(input.value || "") === alias) input.value = original;
    };
    if (typeof queueMicrotask === "function") queueMicrotask(restore);
    else Promise.resolve().then(restore);
  }

  function phase6WithAliasedInput(input, callback) {
    if (!input || currentLanguage !== "ko-KR") return callback();
    var original = String(input.value || "");
    var alias = phase6ResolveKoreanSearchAlias(original);
    if (!alias || alias === original) return callback();
    input.value = alias;
    try {
      return callback();
    } finally {
      if (String(input.value || "") === alias) input.value = original;
    }
  }

  function phase6WrapSearchFunction(name, inputResolver) {
    var original = window[name];
    if (typeof original !== "function" || original.__hgKoSearchWrapped) return;
    var wrapped = function () {
      var args = arguments;
      var self = this;
      var input = null;
      try { input = inputResolver ? inputResolver(args) : null; } catch (error) { input = null; }
      return phase6WithAliasedInput(input, function () { return original.apply(self, args); });
    };
    wrapped.__hgKoSearchWrapped = true;
    wrapped.__hgKoSearchOriginal = original;
    window[name] = wrapped;
  }

  function installPhase6KoreanSearchFunctionHooks() {
    phase6WrapSearchFunction("filtrar", function () { return document.getElementById("pesquisa"); });
    phase6WrapSearchFunction("counterFinderPesquisarAlvo", function () { return document.getElementById("counterFinderTargetInput"); });
    phase6WrapSearchFunction("counterFinderTeclaAlvo", function () { return document.getElementById("counterFinderTargetInput"); });
    phase6WrapSearchFunction("atualizarSugestoesStatusSimulator", function () { return document.getElementById("statusSimulatorSearch"); });
    phase6WrapSearchFunction("calcMostrarSugestoes", function () { return document.getElementById("calcDigimon"); });
    phase6WrapSearchFunction("atualizarCalculadora", function () { return document.getElementById("calcDigimon"); });
    phase6WrapSearchFunction("atualizarSugestoesComparacao", function (args) { return document.getElementById("comparacaoDigimon" + String(args[0] || "")); });
    phase6WrapSearchFunction("atualizarSugestoes", function (args) { return args[1] || null; });
  }

  function installPhase6KoreanSearchAliases() {
    if (document.documentElement.getAttribute("data-hg-ko-search-ready") === "1") return;
    document.documentElement.setAttribute("data-hg-ko-search-ready", "1");
    ["input", "focus", "keydown", "change"].forEach(function (type) {
      document.addEventListener(type, phase6AliasSearchEvent, true);
    });
  }



  /* =====================================================
     PHASE 5 — TEAM BUILDER / STATUS SIMULATOR / CALCULATOR
     Isolated translation layer. No gameplay/calculation logic is changed.
  ===================================================== */

  function phase5ElementLabel(value) {
    var original = String(value || "").trim().toUpperCase();
    if (currentLanguage !== "ko-KR") return original;
    var info = koElementData(original);
    return info ? info.ko + " (" + info.ref + ")" : original;
  }

  function phase5DigimonDisplay(original) {
    var raw = String(original || "").trim();
    if (currentLanguage !== "ko-KR") return raw;
    var ko = koDigimonName(raw);
    return ko ? ko + " (" + raw + ")" : raw;
  }

  function phase5TextNodeOriginal(node) {
    if (!node) return "";
    if (node.__hgI18nOriginalText == null) node.__hgI18nOriginalText = String(node.nodeValue || "");
    return String(node.__hgI18nOriginalText || "");
  }

  function phase5WalkTextNodes(root, callback) {
    if (!root || !document.createTreeWalker) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var node;
    while ((node = walker.nextNode())) callback(node);
  }

  function phase5TranslateTextNodes(root, rules) {
    if (!root) return;
    phase5WalkTextNodes(root, function (node) {
      var original = phase5TextNodeOriginal(node);
      var next = original;
      (rules || []).forEach(function (rule) {
        next = next.replace(rule[0], typeof rule[1] === "function" ? rule[1] : String(rule[1]));
      });
      if (node.nodeValue !== next) node.nodeValue = next;
    });
  }

  function phase5SetStoredText(element, key, fallback) {
    if (!element) return;
    if (!element.hasAttribute("data-hg-phase5-original")) element.setAttribute("data-hg-phase5-original", String(element.textContent || "").trim());
    var original = element.getAttribute("data-hg-phase5-original") || fallback || "";
    setText(element, currentLanguage === DEFAULT_LANGUAGE ? original : translate(key, original));
  }

  function phase5TranslateKoElementElement(element) {
    if (!element) return;
    var original = element.getAttribute("data-hg-element-original") || String(element.textContent || "").trim();
    if (!element.getAttribute("data-hg-element-original")) element.setAttribute("data-hg-element-original", original);
    setText(element, currentLanguage === "ko-KR" ? phase5ElementLabel(original) : original);
  }

  function applyBuilderStaticTranslations() {
    var root = document.getElementById("builderPagina");
    if (!root) return;
    setText(one(".builder-heading .page-title", root), translate("builder.title", "TEAM BUILDER"));
    setText(one(".builder-heading .page-subtitle", root), translate("builder.subtitle", "Selecione até 8 Digimons e monte seu time para o Guild Boss."));
    replaceButtonTextNode(one("#builderSaveImageBtn", root), "builder.saveImage", "SALVAR IMAGEM DO TIME");
    replaceButtonTextNode(one("#builderExportBtn", root), "builder.export", "EXPORTAR TIME");
    replaceButtonTextNode(one("#builderImportBtn", root), "builder.import", "IMPORTAR TIME");

    var boxes = all(".builder-analysis-box", root);
    if (boxes[0]) {
      setText(one(".builder-analysis-title span", boxes[0]), translate("builder.fieldSynergy", "FIELD SYNERGY"));
      setText(one(".builder-analysis-title small", boxes[0]), translate("builder.fieldSynergyHint", "2 / 3 DIGIMONS DIFERENTES"));
    }
    if (boxes[1]) {
      setText(one(".builder-analysis-title span", boxes[1]), translate("builder.teamUtility", "TEAM UTILITY"));
      setText(one(".builder-analysis-title small", boxes[1]), translate("builder.teamUtilityHint", "EFEITOS PRESENTES NO TIME"));
    }
    if (boxes[2]) {
      setText(one(".builder-analysis-title span", boxes[2]), translate("builder.elementCoverage", "ELEMENT COVERAGE"));
      setText(one(".builder-analysis-title small", boxes[2]), translate("builder.elementCoverageHint", "SKILLS ATUALMENTE SELECIONADAS"));
    }
  }

  function applyBuilderDynamicTranslations() {
    var root = document.getElementById("builderPagina");
    if (!root) return;

    all(".slot", root).forEach(function (slot, index) {
      setText(one(".slot-title", slot), formatTranslation("builder.slot", "SLOT {n}", { n: index + 1 }));
      setAttr(one(".team-search", slot), "placeholder", translate("builder.searchPlaceholder", "Digite o nome do Digimon..."));
      var status = one(".team-search-status", slot);
      if (status) {
        var currentStatus = String(status.textContent || "").trim();
        var lastStatus = status.getAttribute("data-hg-builder-status-last") || "";
        var raw = status.getAttribute("data-hg-builder-status-original") || currentStatus;
        if (currentStatus !== lastStatus) { raw = currentStatus; status.setAttribute("data-hg-builder-status-original", raw); }
        if (/^Nenhum Mega encontrado\.?$/i.test(raw)) setText(status, translate("builder.noMega", "Nenhum Mega encontrado."));
        else {
          var match = raw.match(/^(\d+)\s+op(?:ção|ções)$/i);
          if (match) setText(status, formatTranslation(Number(match[1]) === 1 ? "builder.optionOne" : "builder.optionMany", "{count} opções", { count: match[1] }));
          else if (/^✓\s+/.test(raw)) {
            var name = raw.replace(/^✓\s+/, "");
            setText(status, "✓ " + phase5DigimonDisplay(name));
          }
        }
        status.setAttribute("data-hg-builder-status-last", String(status.textContent || "").trim());
      }
    });

    all(".team-suggestion", root).forEach(function (el) {
      var original = el.getAttribute("data-hg-digimon-original") || String(el.textContent || "").trim();
      if (!original) return;
      if (!el.getAttribute("data-hg-digimon-original")) el.setAttribute("data-hg-digimon-original", original);
      setText(el, phase5DigimonDisplay(original));
    });

    all(".selected-info .type-label", root).forEach(function (el) { applyReferenceLabel(el, "TYPE", true); });
    all(".selected-info .field .label", root).forEach(function (el) { applyReferenceLabel(el, "FIELD", true); });
    all(".selected-info .strong .label", root).forEach(function (el) { applyReferenceLabel(el, "STRONG", true); });
    all(".selected-info .weak .label", root).forEach(function (el) { applyReferenceLabel(el, "WEAK", true); });

    all(".selected-info .mini-stat", root).forEach(function (el) {
      var original = el.getAttribute("data-hg-mini-original") || String(el.textContent || "").trim();
      if (!el.getAttribute("data-hg-mini-original")) el.setAttribute("data-hg-mini-original", original);
      var match = original.match(/^(DEF BREAK|HP|SP|STR|INT|DEF|RES|SPD|CC|DOT)\s*:\s*(.*)$/i);
      if (!match) return;
      var key = match[1].toUpperCase();
      var value = match[2];
      if (currentLanguage === "ko-KR") {
        var ref = koreanReferenceData(key);
        var displayValue = /^NO$/i.test(value) ? "없음 (NO)" : value.replace(/^SKILL\s+(\d+)$/i, function (_, n) { return "스킬 " + n + " (Skill " + n + ")"; });
        setText(el, (ref ? ref.ko + " (" + ref.ref + ")" : key) + ": " + displayValue);
      } else setText(el, original);
    });

    all(".selected-info .skill-title", root).forEach(function (el) {
      var original = el.getAttribute("data-hg-skill-title-original") || String(el.textContent || "").trim();
      if (!el.getAttribute("data-hg-skill-title-original")) el.setAttribute("data-hg-skill-title-original", original);
      if (currentLanguage !== "ko-KR") { setText(el, original); return; }
      var next = original.replace(/^SKILL\s+(\d+)/i, function (_, n) { return "스킬 " + n + " (Skill " + n + ")"; });
      next = next.replace(/\bBASE\s*:/gi, "기본 (Base):");
      Object.keys(koDataMap("__elements")).sort(function(a,b){return b.length-a.length;}).forEach(function (key) {
        var info = koElementData(key); if (!info) return;
        next = next.replace(new RegExp("\\b" + key + "\\b", "g"), info.ko + " (" + info.ref + ")");
      });
      setText(el, next);
    });

    all(".selected-info .skill select option", root).forEach(function (option) {
      var original = option.getAttribute("data-hg-element-original") || String(option.value || option.textContent || "").trim();
      if (!option.getAttribute("data-hg-element-original")) option.setAttribute("data-hg-element-original", original);
      setText(option, currentLanguage === "ko-KR" ? phase5ElementLabel(original) : original);
    });
    all(".selected-info .skill-efeito .efeito-buff > span:last-child, .selected-info .skill-efeito .efeito-remove > span:last-child", root).forEach(phase5TranslateKoElementElement);

    all(".builder-analysis .analysis-empty", root).forEach(function (el) {
      var original = el.getAttribute("data-hg-analysis-original") || String(el.textContent || "").trim();
      if (!el.getAttribute("data-hg-analysis-original")) el.setAttribute("data-hg-analysis-original", original);
      if (/^Nenhuma synergy ativa/i.test(original)) setText(el, translate("builder.noSynergy", original));
      else if (/^Selecione Digimons para analisar/i.test(original)) setText(el, translate("builder.noCoverage", original));
      else setText(el, original);
    });
    setText(one(".synergy-reference-title", root), translate("builder.synergyList", "SYNERGY LIST"));
    all(".utility-row strong", root).forEach(function (el) { var k=canonicalReferenceKey(el.textContent); if(k) applyReferenceLabel(el,k,true); });
    all(".coverage-row > strong", root).forEach(phase5TranslateKoElementElement);

    applyKoreanRelationTooltips(root);
  }

  function applyStatusSimulatorStaticTranslations() {
    var root = document.getElementById("statusSimulatorPagina");
    if (!root) return;
    setText(one(".status-simulator-header .page-title", root), translate("status.title", "STATUS SIMULATOR"));
    setText(one(".status-simulator-header .page-subtitle", root), translate("status.subtitle", "Combine Baby Correction, Tetris, acessórios e deck para visualizar os status finais do Digimon."));
    setText(one(".status-simulator-accuracy-note strong", root), translate("status.approxTitle", "VALORES APROXIMADOS"));
    setText(one(".status-simulator-accuracy-note span", root), translate("status.approxText", "Os cálculos críticos podem apresentar pequenas variações em relação ao jogo."));
    setText(one(".status-simulator-search > label", root), translate("status.selectDigimon", "SELECIONE O DIGIMON"));
    setAttr(one("#statusSimulatorSearch", root), "placeholder", translate("status.searchPlaceholder", "Digite o nome do Digimon..."));
    setText(one(".status-simulator-searchbox > button", root), translate("status.clear", "LIMPAR"));

    var tetrisTitle = one(".status-simulator-tetris-title", root);
    if (tetrisTitle) { setText(one(":scope > div > strong", tetrisTitle), translate("status.tetris", "TETRIS")); setText(one(":scope > div > small", tetrisTitle), translate("status.tetrisHint", "Escolha o valor e preencha até 16 espaços.")); }
    var step0 = one('.status-simulator-step[data-status-step="0"] .status-simulator-panel-title', root);
    var step1 = one('.status-simulator-step[data-status-step="1"] .status-simulator-panel-title', root);
    var step2 = one('.status-simulator-step[data-status-step="2"] .status-simulator-panel-title', root);
    var step3 = one('.status-simulator-step[data-status-step="3"] .status-simulator-panel-title', root);
    var step4 = one('.status-simulator-step[data-status-step="4"] .status-simulator-panel-title', root);
    if (step0) { setText(one("strong", step0), translate("status.baby", "BABY CORRECTION")); setText(one("small", step0), translate("status.babyHint", "Máximo de 14% por status e 28% no total.")); }
    if (step1) { setText(one("strong", step1), translate("status.accessories", "ACESSÓRIOS")); setText(one("small", step1), translate("status.accessoriesHint", "Informe os valores fixos presentes nos equipamentos.")); }
    if (step2) { setText(one("strong", step2), translate("status.clothing", "STATUS EM ROUPA")); setText(one("small", step2), translate("status.clothingHint", "Informe os bônus fixos presentes nas roupas.")); }
    if (step3) { setText(one("strong", step3), translate("status.deck", "STATUS OBTIDOS POR DECK")); setText(one("small", step3), translate("status.deckHint", "Informe os bônus fixos concedidos pelo deck.")); }
    if (step4) { setText(one("strong", step4), translate("status.final", "RESULTADO FINAL")); setText(one("small", step4), translate("status.finalHint", "Composição completa pronta para captura.")); }
    setText(one(".status-simulator-mega-potential > span", root), translate("status.megaPotential", "MEGA POTENTIAL"));
    setText(one(".status-simulator-cube-palette > span", root), translate("status.addCube", "ADICIONAR CUBO"));
    var cubeButtons = all(".status-simulator-cube-mode > button", root);
    cubeButtons.forEach(function (button) { replaceButtonTextNode(button, "status.cubesOf", "CUBOS DE"); });
    setText(one(".status-simulator-meter-line > span", root), translate("status.totalUsed", "TOTAL UTILIZADO"));
    setText(one(".status-simulator-tetris-actions button:first-of-type", root), translate("status.undo", "DESFAZER"));
    setText(one(".status-simulator-tetris-actions button:last-of-type", root), translate("status.reset", "RESET"));
    setText(one("#statusSimulatorBack", root), translate("status.back", "VOLTAR"));
  }

  function applyStatusSimulatorDynamicTranslations() {
    var root = document.getElementById("statusSimulatorPagina");
    if (!root) return;

    all("#statusSimulatorSuggestions button", root).forEach(function (button) {
      var name = one("strong", button), meta = one("small", button);
      if (name) applyKoreanDigimonName(name);
      if (meta) {
        var original = meta.getAttribute("data-hg-status-meta-original") || String(meta.textContent || "").trim();
        if (!meta.getAttribute("data-hg-status-meta-original")) meta.setAttribute("data-hg-status-meta-original", original);
        var parts = original.split("//").map(function (x) { return x.trim(); });
        var stageInfo = koStageData(parts[1]);
        if (currentLanguage === "ko-KR" && stageInfo) setText(meta, parts[0] + " // " + stageInfo.ko + " (" + stageInfo.ref + ")");
        else setText(meta, original);
      }
    });
    var none = one(".status-simulator-no-suggestion", root);
    if (none) setText(none, translate("status.noDigimon", "Nenhum Digimon encontrado."));

    var count = one("#statusSimulatorCubeCount", root);
    if (count) {
      var match = String(count.textContent || "").match(/^(\d+)\s*\/\s*16/);
      if (match) setText(count, formatTranslation("status.spaces", "{count} / 16 ESPAÇOS", { count: match[1] }));
    }
    var hint = one("#statusSimulatorMegaHint", root);
    if (hint) {
      var currentHint = String(hint.textContent || "").trim();
      var lastHint = hint.getAttribute("data-hg-status-hint-last") || "";
      var rawHint = hint.getAttribute("data-hg-status-hint-original") || currentHint;
      if (currentHint !== lastHint) { rawHint = currentHint; hint.setAttribute("data-hg-status-hint-original", rawHint); }
      var improved = rawHint.match(/^(\d+)\/(\d+)\s+MELHORADOS/i);
      if (improved) setText(hint, formatTranslation("status.improvedHint", "{used}/{max} MELHORADOS · CLIQUE NO ÍCONE PARA SAIR", { used: improved[1], max: improved[2] }));
      else setText(hint, translate("status.chooseMega", "Escolha um ícone e clique nos cubos."));
      hint.setAttribute("data-hg-status-hint-last", String(hint.textContent || "").trim());
    }
    all("#statusSimulatorTetris .status-simulator-cube.is-filled", root).forEach(function (cube) {
      var title = String(cube.getAttribute("title") || "");
      setAttr(cube, "title", title.indexOf("+1%") >= 0 ? translate("status.cubeMegaTitle", "Clique para aplicar/remover +1%") : translate("status.cubeRemoveTitle", "Clique para remover"));
      var stat = one("strong", cube); if (stat) applyReferenceLabel(stat, String(stat.textContent || "").trim(), true);
    });
    all("#statusSimulatorCubeButtons strong, #statusSimulatorBabyFields label > span, #statusSimulatorAccessoryFields label > span, #statusSimulatorClothingFields label > span, #statusSimulatorDeckFields label > span", root).forEach(function (el) {
      var key = canonicalReferenceKey(el.textContent); if (key) applyReferenceLabel(el, key, true);
    });

    var emptyCard = one(".status-simulator-empty-card", root);
    if (emptyCard) {
      setText(one("strong", emptyCard), translate("status.selectCard", "SELECIONE UM DIGIMON"));
      setText(one("span", emptyCard), translate("status.baseAppear", "Os status base aparecerão aqui."));
    }
    var digiCard = one("#statusSimulatorDigiCard", root);
    if (digiCard && !emptyCard) {
      var name = one(":scope > h3", digiCard); if (name) applyKoreanDigimonName(name);
      var stage = one(".status-simulator-stage-tag", digiCard);
      if (stage) applyKoreanStageLabel(stage, stage.getAttribute("data-hg-stage-original") || stage.textContent);
      all(".status-simulator-card-stats > div > span", digiCard).forEach(function (el) { var key=canonicalReferenceKey(el.textContent); if(key) applyReferenceLabel(el,key,true); });
      all(".status-simulator-card-stats > div > small", digiCard).forEach(function (el) {
        var original = el.getAttribute("data-hg-status-small-original") || String(el.textContent || "").trim();
        if (!el.getAttribute("data-hg-status-small-original")) el.setAttribute("data-hg-status-small-original", original);
        setText(el, currentLanguage === "pt-BR" ? original : original.replace(/^BASE\s+/i, translate("status.base", "BASE") + " "));
      });
    }

    var resultEmpty = one(".status-simulator-result-empty", root);
    if (resultEmpty) setText(resultEmpty, translate("status.resultEmpty", "Selecione um Digimon para calcular o resultado final."));
    all(".status-simulator-result-row", root).forEach(function (row) {
      var stat = one(":scope > strong", row); if (stat) { var key=canonicalReferenceKey(stat.textContent); if(key) applyReferenceLabel(stat,key,true); }
      var small = one(":scope > small", row);
      if (small) {
        var original = small.getAttribute("data-hg-result-original") || String(small.textContent || "").trim();
        if (!small.getAttribute("data-hg-result-original")) small.setAttribute("data-hg-result-original", original);
        var next = original;
        if (currentLanguage !== "pt-BR") {
          next = next.replace(/\bBASE\b/g, translate("status.base", "BASE"))
            .replace(/\bBABY\b/g, translate("status.babyShort", "BABY"))
            .replace(/\bACESS\.\b/g, translate("status.accessShort", "ACCESS."))
            .replace(/\bROUPA\b/g, translate("status.clothingShort", "CLOTHES"))
            .replace(/\bDECK\b/g, translate("status.deckShort", "DECK"));
        }
        setText(small, next);
      }
    });
    var crit = one(".status-simulator-crit-result", root);
    if (crit) {
      var curve = one(":scope > small", crit); if (curve) {
        var originalCurve = curve.getAttribute("data-hg-curve-original") || String(curve.textContent || "").trim();
        if (!curve.getAttribute("data-hg-curve-original")) curve.setAttribute("data-hg-curve-original", originalCurve);
        var nextCurve = currentLanguage === "pt-BR" ? originalCurve : originalCurve.replace(/^CURVA:/, translate("status.curve", "CURVE:")).replace(/INT BASE/g, translate("status.intBase", "BASE INT")).replace(/INT FINAL/g, translate("status.intFinal", "FINAL INT")).replace(/BÔNUS DE INT/g, translate("status.intBonus", "INT BONUS"));
        setText(curve, nextCurve);
      }
      setText(one(":scope > em", crit), translate("status.criticalNote", "VALORES CRÍTICOS APROXIMADOS · A FÓRMULA SEGUE EM CALIBRAÇÃO"));
    }

    var next = one("#statusSimulatorNext", root);
    if (next) {
      var raw = String(next.textContent || "").trim().toUpperCase();
      if (raw === "EDITAR" || raw === "EDIT" || raw.indexOf("수정") >= 0) setText(next, translate("status.edit", "EDITAR"));
      else if (raw === "VER RESULTADO" || raw === "VIEW RESULT" || raw.indexOf("결과") >= 0) setText(next, translate("status.viewResult", "VER RESULTADO"));
      else setText(next, translate("status.next", "NEXT"));
    }
    var step = one("#statusSimulatorStepLabel", root);
    if (step) {
      var rawStep = String(step.textContent || "").trim();
      if (/SIMULAÇÃO CONCLUÍDA|SIMULATION COMPLETE|시뮬레이션 완료/i.test(rawStep)) setText(step, translate("status.complete", "SIMULAÇÃO CONCLUÍDA"));
      else {
        var m = rawStep.match(/(\d+)\s+(?:DE|OF)\s+5/i) || rawStep.match(/(\d+)\s*\/\s*5/);
        if (m) setText(step, formatTranslation("status.step", "ETAPA {n} DE 5", { n: m[1] }));
      }
    }
  }

  function applyCalculatorStaticTranslations() {
    var root = document.getElementById("calculadoraPagina");
    if (!root) return;
    setText(one(".page-title", root), translate("calc.title", "CALCULADORA"));
    setText(one(".page-subtitle", root), translate("calc.subtitle", "Calcule o dano total das Skills Lv.10 com o seu bônus elemental."));
    setText(one('label[for="calcDigimon"]', root), translate("calc.digimon", "Digimon"));
    setAttr(one("#calcDigimon", root), "placeholder", translate("calc.searchPlaceholder", "Digite ou selecione um Digimon..."));
    setText(one('label[for="calcElemento"]', root), translate("calc.appliedElement", "Elemento aplicado"));
    setText(one('label[for="calcElementoValor"]', root), translate("calc.tamerElement", "Elemento Total do Tamer"));
    setHtml(one(".calc-help", root), translate("calc.help", one(".calc-help", root) ? one(".calc-help", root).innerHTML : ""));
    var empty = one("#calcResultados .calc-empty", root); if (empty) setText(empty, translate("calc.emptyStart", "Selecione um Digimon e informe o Elemento Total do Tamer para calcular."));
    setText(one(".calc-guide-title", root), translate("calc.guideTitle", "COMO USAR A CALCULADORA"));
    var guide = all(".calc-guide-text", root);
    if (guide[0]) setHtml(guide[0], translate("calc.guideOpen", guide[0].innerHTML));
    if (guide[1]) setHtml(guide[1], translate("calc.guideInsert", guide[1].innerHTML));
    setHtml(one(".calc-guide-note", root), translate("calc.guideNote", one(".calc-guide-note", root) ? one(".calc-guide-note", root).innerHTML : ""));
    all("#calcElemento option", root).forEach(function (option) {
      var original = option.getAttribute("data-hg-element-original") || String(option.value || option.textContent || "").trim();
      if (!option.getAttribute("data-hg-element-original")) option.setAttribute("data-hg-element-original", original);
      setText(option, currentLanguage === "ko-KR" ? phase5ElementLabel(original) : original);
    });
  }

  function applyCalculatorDynamicTranslations() {
    var root = document.getElementById("calculadoraPagina");
    if (!root) return;

    all(".calc-autocomplete-item", root).forEach(function (button) {
      var original = button.getAttribute("data-calc-digimon") || button.getAttribute("data-hg-digimon-original") || String(button.textContent || "").trim();
      if (!original) return;
      button.setAttribute("data-hg-digimon-original", original);
      setText(button, phase5DigimonDisplay(original));
    });
    var selectedName = one(".calc-selected-name", root); if (selectedName) applyKoreanDigimonName(selectedName);
    var calcEmpty = one("#calcResultados .calc-empty", root);
    if (calcEmpty) {
      var emptyRaw = String(calcEmpty.textContent || "").trim();
      if (/da lista para visualizar/i.test(emptyRaw) || /from the list to view/i.test(emptyRaw) || /목록에서.*선택/i.test(emptyRaw)) setText(calcEmpty, translate("calc.emptySelect", "Selecione um Digimon da lista para visualizar as Skills Lv.10."));
      else setText(calcEmpty, translate("calc.emptyStart", "Selecione um Digimon e informe o Elemento Total do Tamer para calcular."));
    }
    all(".calc-element-tag", root).forEach(phase5TranslateKoElementElement);

    all(".calc-skill-identity-copy > small", root).forEach(function (el) {
      var original = el.getAttribute("data-hg-calc-skill-small") || String(el.textContent || "").trim();
      if (!el.getAttribute("data-hg-calc-skill-small")) el.setAttribute("data-hg-calc-skill-small", original);
      if (currentLanguage === "ko-KR") setText(el, original.replace(/^SKILL\s+(\d+)/i, function(_,n){return "스킬 "+n+" (Skill "+n+")";}));
      else setText(el, original);
    });
    all(".calc-burst-title", root).forEach(function (el) { setText(el, translate("calc.burstSkill", "BURST SKILL")); });
    all(".calc-burst-selector-label", root).forEach(function (el) {
      var original = el.getAttribute("data-hg-burst-selector-original") || String(el.textContent || "").trim();
      if (!el.getAttribute("data-hg-burst-selector-original")) el.setAttribute("data-hg-burst-selector-original", original);
      setText(el, /Usar como base/i.test(original) ? translate("calc.useAsBase", "Usar como base") : translate("calc.burstBasedOn", "Burst baseada em"));
    });
    all(".calc-number-label", root).forEach(function (el) {
      var raw = el.getAttribute("data-hg-calc-label-original") || String(el.textContent || "").trim();
      if (!el.getAttribute("data-hg-calc-label-original")) el.setAttribute("data-hg-calc-label-original", raw);
      var map = {
        "Dano base total":"calc.baseDamageTotal", "Dano total":"calc.totalDamage", "Dano normal total":"calc.normalDamageTotal",
        "Chance base do efeito":"calc.baseEffectChance", "Dano na Burst":"calc.damageInBurst", "Bônus Burst na taxa":"calc.burstRateBonus",
        "Base Burst total":"calc.burstBaseTotal", "Dano Burst total":"calc.burstDamageTotal"
      };
      setText(el, map[raw] ? translate(map[raw], raw) : raw);
    });
    all(".calc-status", root).forEach(function (el) {
      var raw = el.getAttribute("data-hg-calc-status-original") || String(el.textContent || "").replace(/\s+/g," ").trim();
      if (!el.getAttribute("data-hg-calc-status-original")) el.setAttribute("data-hg-calc-status-original", raw);
      if (/^SEM COEFICIENTE$/i.test(raw)) setText(el, translate("calc.noCoefficient", "SEM COEFICIENTE"));
      else if (/^SEM BÔNUS$/i.test(raw)) setText(el, translate("calc.noBonus", "SEM BÔNUS"));
      else if (/^BURST DE EFEITO$/i.test(raw)) setText(el, translate("calc.effectBurst", "BURST DE EFEITO"));
      else {
        var m = raw.match(/^([A-Z]+)\s+APLICADO$/i);
        if (m) setText(el, formatTranslation("calc.elementApplied", "{element} APLICADO", { element: currentLanguage === "ko-KR" ? phase5ElementLabel(m[1]) : m[1] }));
        else setText(el, raw);
      }
    });

    var selectedMeta = one(".calc-selected-meta", root);
    if (selectedMeta) phase5TranslateTextNodes(selectedMeta, currentLanguage === "pt-BR" ? [] : [
      [/Skills Lv\.10/gi, translate("calc.skillsLv10", "Skills Lv.10")],
      [/Elemento selecionado:/gi, translate("calc.selectedElement", "Elemento selecionado:")],
      [/Elemento Total do Tamer:/gi, translate("calc.tamerElementColon", "Elemento Total do Tamer:")]
    ]);

    var rules = currentLanguage === "pt-BR" ? [] : [
      [/Skill de efeito/gi, translate("calc.effectSkill", "Skill de efeito")],
      [/chance base/gi, translate("calc.baseChance", "chance base")],
      [/Esta Skill não possui coeficiente percentual de dano utilizável na base, mas mantém normalmente seu elemento e as trocas de elemento\./gi, translate("calc.effectNoCoefficientText", "Esta Skill não possui coeficiente percentual de dano utilizável na base, mas mantém normalmente seu elemento e as trocas de elemento.")],
      [/Esta skill não possui coeficiente de ataque utilizável na base atual\./gi, translate("calc.noAttackCoefficientText", "Esta skill não possui coeficiente de ataque utilizável na base atual.")],
      [/Elemento Total do Tamer:/gi, translate("calc.tamerElementColon", "Elemento Total do Tamer:")],
      [/Bônus elemental por hit:/gi, translate("calc.elementBonusPerHit", "Bônus elemental por hit:")],
      [/Bônus elemental total:/gi, translate("calc.elementBonusTotal", "Bônus elemental total:")],
      [/Nenhuma Skill com dados de Burst utilizáveis está disponível\./gi, translate("calc.noBurstData", "Nenhuma Skill com dados de Burst utilizáveis está disponível.")],
      [/Efeito:/gi, translate("calc.effectColon", "Efeito:")],
      [/Burst:/gi, translate("calc.burstColon", "Burst:")],
      [/O dano não é multiplicado pela Burst\./gi, translate("calc.damageNotMultiplied", "O dano não é multiplicado pela Burst.")],
      [/Dano normal preservado:/gi, translate("calc.normalDamagePreserved", "Dano normal preservado:")],
      [/Bônus elemental por hit permanece normal:/gi, translate("calc.normalBonusPerHit", "Bônus elemental por hit permanece normal:")],
      [/Total com elemento:/gi, translate("calc.totalWithElement", "Total com elemento:")],
      [/Esta Skill não possui coeficiente percentual de dano na base, mas mantém normalmente seu elemento e suas trocas de elemento\./gi, translate("calc.noDamageCoefficientButElements", "Esta Skill não possui coeficiente percentual de dano na base, mas mantém normalmente seu elemento e suas trocas de elemento.")],
      [/original:/gi, translate("calc.originalColon", "original:")],
      [/Bônus elemental Burst por hit:/gi, translate("calc.burstBonusPerHit", "Bônus elemental Burst por hit:")],
      [/Bônus elemental Burst total:/gi, translate("calc.burstBonusTotal", "Bônus elemental Burst total:")],
      [/O elemento ([A-Z]+) não entra na Skill (\d+);\s*portanto não há bônus elemental nesta Burst\./gi, function(_,el,n){return formatTranslation("calc.noElementBurst", "O elemento {element} não entra na Skill {skill}; portanto não há bônus elemental nesta Burst.", {element: currentLanguage === "ko-KR" ? phase5ElementLabel(el) : el, skill:n});}]
    ];
    all(".calc-breakdown", root).forEach(function (el) { phase5TranslateTextNodes(el, rules); });

    all(".calc-skill-lv", root).forEach(function (el) {
      var original = el.getAttribute("data-hg-calc-lv-original") || String(el.textContent || "").trim();
      if (!el.getAttribute("data-hg-calc-lv-original")) el.setAttribute("data-hg-calc-lv-original", original);
      var next = original;
      if (currentLanguage !== "pt-BR") next = next.replace(/DADOS DA DATABASE MASTER FINAL/gi, translate("calc.masterData", "DADOS DA DATABASE MASTER FINAL"));
      setText(el, next);
    });
    all(".calc-burst-skill-option", root).forEach(function (button) {
      var original = button.getAttribute("data-hg-title-original") || button.getAttribute("title") || "";
      if (!button.getAttribute("data-hg-title-original")) button.setAttribute("data-hg-title-original", original);
      var next = original;
      if (currentLanguage !== "pt-BR") {
        next = next.replace(/Dados de Burst indisponíveis/g, translate("calc.burstUnavailable", "Dados de Burst indisponíveis"))
          .replace(/Burst aumenta a taxa do efeito; dano normal não é multiplicado/g, translate("calc.burstEffectTitle", "Burst aumenta a taxa do efeito; dano normal não é multiplicado"))
          .replace(/Burst de dano com valores exatos da MASTER/g, translate("calc.burstDamageTitle", "Burst de dano com valores exatos da MASTER"));
      }
      setAttr(button, "title", next);
    });
    all(".calc-skill-tooltip", root).forEach(function (tip) {
      if (currentLanguage === "pt-BR") return;
      var tipRules = [
        [/BURST SKILL/g, translate("calc.burstSkill", "BURST SKILL")],
        [/SKILL\s+(\d+)/g, function (_, n) { return currentLanguage === "ko-KR" ? "스킬 " + n + " (Skill " + n + ")" : "SKILL " + n; }],
        [/Tipo:/g, translate("calc.tip.type", "Tipo:")], [/Efeito:/g, translate("calc.tip.effect", "Efeito:")],
        [/Chance base:/g, translate("calc.tip.baseChance", "Chance base:")], [/Chance:/g, translate("calc.tip.chance", "Chance:")],
        [/Elemento base:/g, translate("calc.tip.baseElement", "Elemento base:")], [/Mudança por elemento:/g, translate("calc.tip.elementChange", "Mudança por elemento:")],
        [/Bônus Burst na taxa do efeito:/g, translate("calc.tip.burstRate", "Bônus Burst na taxa do efeito:")],
        [/Dano permanece igual:/g, translate("calc.tip.damageSame", "Dano permanece igual:")],
        [/Sem coeficiente percentual de dano na base/g, translate("calc.tip.noDamageCoefficient", "Sem coeficiente percentual de dano na base")],
        [/Dados de Burst indisponíveis para esta Skill/g, translate("calc.tip.burstUnavailableSkill", "Dados de Burst indisponíveis para esta Skill")]
      ];
      phase5TranslateTextNodes(tip, tipRules);
    });
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
    applyBuilderStaticTranslations();
    applyStatusSimulatorStaticTranslations();
    applyCalculatorStaticTranslations();
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
    phase6ApplyHomeRaidAndOverflowNames();
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
      applyBuilderDynamicTranslations();
      applyStatusSimulatorDynamicTranslations();
      applyCalculatorDynamicTranslations();
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
        case "builderPagina":
          applyBuilderDynamicTranslations();
          break;
        case "statusSimulatorPagina":
          applyStatusSimulatorDynamicTranslations();
          break;
        case "calculadoraPagina":
          applyCalculatorDynamicTranslations();
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

    ["criarSlots", "atualizarSugestoes", "mostrarDadosDoSlot", "atualizarPainelBuilder", "criarSkillSelect"].forEach(function (name) {
      wrapRuntimeFunction(name, function () { applyDynamicTranslationsForRoot("builderPagina"); });
    });
    ["renderizarStatusSimulator", "renderizarCamposStatusSimulator", "renderizarTetrisStatusSimulator", "renderizarCardStatusSimulator", "renderizarResultadoStatusSimulator", "renderizarEtapaStatusSimulator", "atualizarSugestoesStatusSimulator"].forEach(function (name) {
      wrapRuntimeFunction(name, function () { applyDynamicTranslationsForRoot("statusSimulatorPagina"); });
    });
    ["atualizarCalculadora", "calcMostrarSugestoes"].forEach(function (name) {
      wrapRuntimeFunction(name, function () { applyDynamicTranslationsForRoot("calculadoraPagina"); });
    });
    ["renderizarRaids", "renderizarRaidHomeCarousel"].forEach(function (name) {
      wrapRuntimeFunction(name, function () {
        applyDynamicTranslationsForRoot(name === "renderizarRaids" ? "raidBossPagina" : "homePagina");
      });
    });
    ["alterarZonaDekyu", "renderizarMapaDekyu"].forEach(function (name) {
      wrapRuntimeFunction(name, function () { applyDynamicTranslationsForRoot("dekyuTreasurePagina"); });
    });
  }

  function installObservers() {
    if (observerInstalled || typeof MutationObserver === "undefined") return;
    observerInstalled = true;
    [document.getElementById("homePagina"), document.getElementById("hiddenQuestsPagina"), document.getElementById("databasePagina"), document.getElementById("counterFinderPagina"), document.getElementById("raidBossPagina"), document.getElementById("dekyuTreasurePagina"), document.getElementById("builderPagina"), document.getElementById("statusSimulatorPagina"), document.getElementById("calculadoraPagina"), document.getElementById("hgImpmonLive"), document.getElementById("siteTopbar")].forEach(function (root) {
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

    installPhase6KoreanSearchAliases();
    applyStaticTranslations();
    updateLanguageUi();
    installRuntimeHooks();
    installPhase6KoreanSearchFunctionHooks();
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
