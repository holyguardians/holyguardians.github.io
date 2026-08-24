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
    if (bossName) {
      var bossRaw = String(bossName.textContent || "").replace(/\s+/g, " ").trim();
      if (/^(CARREGANDO\.\.\.|LOADING\.\.\.|불러오는 중\.\.\.)$/i.test(bossRaw)) {
        setText(bossName, translate("header.loading", "CARREGANDO..."));
      } else if (currentLanguage === "ko-KR") {
        /* O timer principal reescreve o nome EN a cada atualização. Traduzimos
           imediatamente no mesmo ciclo, preservando a referência original. */
        var bossKo = koRaidBossName(bossRaw);
        if (bossKo) {
          bossName.setAttribute("data-hg-header-boss-original", bossRaw);
          setText(bossName, phase6KoReference(bossRaw, bossKo));
          setAttr(bossName, "title", bossRaw);
        } else {
          var bossOriginal = bossName.getAttribute("data-hg-header-boss-original") || "";
          var storedKo = bossOriginal ? koRaidBossName(bossOriginal) : "";
          if (storedKo && bossRaw === phase6KoReference(bossOriginal, storedKo)) setAttr(bossName, "title", bossOriginal);
        }
      } else {
        var storedBoss = bossName.getAttribute("data-hg-header-boss-original") || "";
        if (storedBoss && koRaidBossName(storedBoss) && bossRaw === phase6KoReference(storedBoss, koRaidBossName(storedBoss))) {
          setText(bossName, storedBoss);
        }
        if (bossName.hasAttribute("title")) bossName.removeAttribute("title");
      }
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
      phase6ApplyReferenceDirectText(one(".raid-home-preview-name", card), koMapName, "data-hg-home-raid-map-original");
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
    if (input.matches && input.matches("#pesquisa, #counterFinderTargetInput, .team-search, #statusSimulatorSearch, #calcDigimon, #tierListSearch, #tierListDmoSearch, #pvpPickerSearch, [id^='comparacaoDigimon']")) return true;
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
    phase6WrapSearchFunction("tierListAplicarFiltros", function () { return document.getElementById("tierListSearch"); });
    phase6WrapSearchFunction("tierListDmoAplicarFiltros", function () { return document.getElementById("tierListDmoSearch"); });
    phase6WrapSearchFunction("pvpRenderPicker", function () { return document.getElementById("pvpPickerSearch"); });
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
      if (currentLanguage === "ko-KR") {
        var nextSmall = original
          .replace(/^SKILL\s+(\d+)/i, function(_,n){return "스킬 "+n+" (Skill "+n+")";})
          .replace(/\bLEVEL\s+(\d+)/i, function(_,n){return translate("calc.tip.level", "레벨 (Level)") + " " + n;});
        setText(el, nextSmall);
      } else setText(el, original);
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
      /* Os tooltips usam nós de texto com original preservado. Quando voltamos
         para PT também precisamos reaplicar o original; retornar cedo deixava
         EN/KO preso na tela até o tooltip ser recriado. */
      if (currentLanguage === "pt-BR") {
        var ptTitle = one(":scope > strong", tip);
        if (ptTitle) {
          var ptTitleOriginal = ptTitle.getAttribute("data-hg-calc-tip-title-original");
          if (ptTitleOriginal) setText(ptTitle, ptTitleOriginal);
        }
        phase5TranslateTextNodes(tip, []);
        return;
      }

      // The calculator builds these tooltips in Portuguese/technical English in script.js.
      // Translate every presentation fragment here without touching calculation/database logic.
      var title = one(":scope > strong", tip);
      if (title) {
        var titleOriginal = title.getAttribute("data-hg-calc-tip-title-original") || String(title.textContent || "").trim();
        if (!title.getAttribute("data-hg-calc-tip-title-original")) title.setAttribute("data-hg-calc-tip-title-original", titleOriginal);
        var titleNext = titleOriginal;
        if (currentLanguage === "ko-KR") {
          titleNext = titleNext.replace(/\s*•\s*BURST\s*$/i, " • " + translate("calc.tip.burstSuffix", "버스트 (Burst)"));
        }
        setText(title, titleNext);
      }

      var tipRules = [
        [/BURST SKILL/g, translate("calc.burstSkill", "BURST SKILL")],
        [/BASE:\s*SKILL\s+(\d+)/g, function (_, n) {
          if (currentLanguage === "ko-KR") return translate("calc.tip.base", "기준 (Base):") + " 스킬 " + n + " (Skill " + n + ")";
          return translate("calc.tip.base", "BASE:") + " SKILL " + n;
        }],
        [/BASE:/g, translate("calc.tip.baseGeneric", "BASE:")],
        [/SKILL\s+(\d+)/g, function (_, n) { return currentLanguage === "ko-KR" ? "스킬 " + n + " (Skill " + n + ")" : "SKILL " + n; }],
        [/LEVEL\s+(\d+)/g, function (_, n) { return translate("calc.tip.level", "LEVEL") + " " + n; }],
        [/Tipo:/g, translate("calc.tip.type", "Tipo:")], [/Efeito:/g, translate("calc.tip.effect", "Efeito:")],
        [/Chance base:/g, translate("calc.tip.baseChance", "Chance base:")], [/Chance:/g, translate("calc.tip.chance", "Chance:")],
        [/Elemento base:/g, translate("calc.tip.baseElement", "Elemento base:")], [/Mudança por elemento:/g, translate("calc.tip.elementChange", "Mudança por elemento:")],
        [/Bônus Burst na taxa do efeito:/g, translate("calc.tip.burstRate", "Bônus Burst na taxa do efeito:")],
        [/Dano permanece igual:/g, translate("calc.tip.damageSame", "Dano permanece igual:")],
        [/Sem coeficiente percentual de dano na base/g, translate("calc.tip.noDamageCoefficient", "Sem coeficiente percentual de dano na base")],
        [/Dados de Burst indisponíveis para esta Skill/g, translate("calc.tip.burstUnavailableSkill", "Dados de Burst indisponíveis para esta Skill")],
        [/DAMAGE VALUE UP/g, translate("calc.tip.damageValueUp", "DAMAGE VALUE UP")],
        [/EFFECT RATE UP/g, translate("calc.tip.effectRateUp", "EFFECT RATE UP")],
        [/CAN CHANGE TO:/g, translate("calc.tip.canChangeTo", "CAN CHANGE TO:")],
        [/A Burst aumenta a taxa do efeito; não multiplica o dano normal desta Skill\./g, translate("calc.tip.burstEffectDescription", "A Burst aumenta a taxa do efeito; não multiplica o dano normal desta Skill.")],
        [/Valores de Burst lidos diretamente da DATABASE MASTER FINAL\./g, translate("calc.tip.burstValuesMaster", "Valores de Burst lidos diretamente da DATABASE MASTER FINAL.")]
      ];

      if (currentLanguage === "ko-KR") {
        // Translate element values and the hit counter while preserving the original English reference.
        ["DARKNESS","PHYSICAL","THUNDER","WATER","EARTH","STEEL","IRON","WOOD","WIND","FIRE","LIGHT","DARK","ICE"].forEach(function (elementName) {
          tipRules.push([new RegExp("\\b" + elementName + "\\b", "g"), phase5ElementLabel(elementName)]);
        });
        tipRules.push([/(\d+)\s+hits\b/gi, function (_, n) {
          return n + translate("calc.tip.hitCounterKo", "타") + " (" + n + " hits)";
        }]);
      }

      phase5TranslateTextNodes(tip, tipRules);
    });
  }



  /* =====================================================
     PHASE 7 — ELEMENTS / COMMUNITY / DISPLAY / COMPARISON
     Presentation-only i18n. Main site logic remains untouched.
  ===================================================== */

  function phase7ElementDisplay(value) {
    var original = String(value || "").trim().toUpperCase();
    if (!original) return "";
    if (currentLanguage !== "ko-KR") return original;
    var info = koElementData(original);
    return info ? info.ko + " (" + info.ref + ")" : original;
  }

  function applyElementsStaticTranslations() {
    var root = document.getElementById("elementosPagina");
    if (!root) return;
    setText(one(".elementos-box h2", root), translate("elements.title", "ELEMENTOS"));
    setText(one(".elementos-subtitulo", root), translate("elements.select", "SELECIONAR ELEMENTO"));
    setAttr(one("#elementosSceneArt", root), "alt", translate("elements.alt", "Elementos"));

    var buffTab = one(".elementos-info-tab-buff", root);
    var removeTab = one(".elementos-info-tab-remove", root);
    if (buffTab) {
      setText(one(".elementos-info-tab-handle span:nth-child(2)", buffTab), translate("elements.buff", "BUFF"));
      setText(one(".elementos-info-tab-panel strong", buffTab), translate("elements.buff", "BUFF"));
      setText(one(".elementos-info-tab-panel p", buffTab), translate("elements.buffDesc", "Elemento que ganha vantagem de dano ao atingir um alvo afetado por Stun ou DoT causado pelo elemento selecionado."));
    }
    if (removeTab) {
      setText(one(".elementos-info-tab-handle span:nth-child(2)", removeTab), translate("elements.remove", "REMOVE"));
      setText(one(".elementos-info-tab-panel strong", removeTab), translate("elements.remove", "REMOVE"));
      setText(one(".elementos-info-tab-panel p", removeTab), translate("elements.removeDesc", "Elemento capaz de remover o Stun ou DoT causado pelo elemento selecionado."));
    }
  }

  function applyElementsDynamicTranslations() {
    var root = document.getElementById("elementosPagina");
    if (!root) return;
    applyElementsStaticTranslations();

    var select = one("#elementoSelect", root);
    if (select) {
      all("option", select).forEach(function (option, index) {
        if (!option.value) setText(option, translate("elements.choose", "— Escolha um elemento —"));
        else setText(option, phase7ElementDisplay(option.value));
      });
    }

    var result = one("#elementoResultado", root);
    if (!result) return;
    var selected = select ? String(select.value || "").trim().toUpperCase() : "";
    var name = one(".elemento-resultado-nome > span", result);
    if (name && selected) setText(name, phase7ElementDisplay(selected));

    var buff = one(".elemento-buff", result);
    if (buff) {
      var strongs = all("strong", buff);
      if (strongs[0]) setText(strongs[0], translate("elements.buff", "BUFF"));
      if (strongs[1]) {
        var originalBuff = strongs[1].getAttribute("data-hg-element-original") || String(strongs[1].textContent || "").trim().toUpperCase();
        if (!strongs[1].getAttribute("data-hg-element-original")) strongs[1].setAttribute("data-hg-element-original", originalBuff);
        setText(strongs[1], phase7ElementDisplay(originalBuff));
      }
    }

    var remove = one(".elemento-remove", result);
    if (remove) {
      var rStrong = all("strong", remove);
      if (rStrong[0]) setText(rStrong[0], translate("elements.remove", "REMOVE"));
      if (rStrong[1]) {
        var originalRemove = rStrong[1].getAttribute("data-hg-element-original") || String(rStrong[1].textContent || "").trim().toUpperCase();
        if (!rStrong[1].getAttribute("data-hg-element-original")) rStrong[1].setAttribute("data-hg-element-original", originalRemove);
        setText(rStrong[1], phase7ElementDisplay(originalRemove));
      }
    }

    if (!one(".elemento-resultado-nome", result)) {
      var raw = String(result.textContent || "").replace(/\s+/g, " ").trim();
      if (/^(Selecione um elemento acima\.|Select an element above\.|위에서 속성을 선택하세요\.)$/i.test(raw)) {
        setText(result, translate("elements.empty", "Selecione um elemento acima."));
      } else if (/Buff|버프|advantage|유리/i.test(raw)) {
        setText(result, translate("elements.reminder", "Lembrando que o Buff é o elemento favorecido."));
      }
    }
  }

  function applyCommunityStaticTranslations() {
    var root = document.getElementById("socialPagina");
    if (!root) return;
    setText(one(".social-kicker", root), translate("community.kicker", "DIGIMON SUPER RUMBLE COMMUNITY"));
    setHtml(one(".social-title-main", root), escapeHtml(translate("community.titlePrefix", "NOSSA")) + ' <span>' + escapeHtml(translate("community.titleAccent", "COMUNIDADE")) + '</span>');
    setText(one(".social-intro", root), translate("community.intro", "Acompanhe conteúdos, lives e novidades do mundo digital."));

    var descKeys = { youtube:"community.youtubeDesc", twitch:"community.twitchDesc", kick:"community.kickDesc", discord:"community.discordDesc" };
    var descFallback = { youtube:"Canais e conteúdos da comunidade", twitch:"Lives e transmissões da comunidade", kick:"Lives e canais parceiros", discord:"Servidores e comunidades" };
    all(".community-platform", root).forEach(function (card) {
      var platform = String(card.getAttribute("data-community-platform") || "").toLowerCase();
      /* Platform names (YouTube/Twitch/Kick/Discord) are intentionally preserved. */
      setText(one(".social-card-copy small", card), translate(descKeys[platform] || "", descFallback[platform] || ""));
      var open = one(".community-open-label", card);
      if (open) setHtml(open, escapeHtml(translate("community.openList", "ABRIR LISTA")) + " <b>⌄</b>");
    });

    var cards = all(".community-wiki-card", root);
    if (cards[0]) {
      setText(one("div > strong", cards[0]), translate("community.wikiTitle", "Precisa de guias ou informações detalhadas sobre drops e etc.?"));
      setText(one("div > small", cards[0]), translate("community.wikiDesc", "Consulte a DSR Wiki para informações completas do jogo."));
      setAttr(one("a", cards[0]), "aria-label", translate("community.wikiAria", "Abrir DSR Wiki"));
      /* DSR WIKI is a brand name and stays unchanged. */
    }
    if (cards[1]) {
      setText(one("div > strong", cards[1]), translate("community.codeTitle", "A fim de fazer parte da maior comunidade BR de Digimon Super Rumble? Junte-se já."));
      setText(one("div > small", cards[1]), translate("community.codeDesc", "Entre no Discord da CODEBR e faça parte da comunidade."));
      setText(one("a > b", cards[1]), translate("community.codeJoin", "ENTRAR NO DISCORD ↗"));
      setAttr(one("a", cards[1]), "aria-label", translate("community.codeAria", "Entrar no Discord da CODEBR"));
    }
    if (cards[2]) {
      setText(one("div > strong", cards[2]), translate("community.aloTitle", "Faça parte da comunidade Alo Tamers! Se junte já"));
      setText(one("div > small", cards[2]), translate("community.aloDesc", "Entre no Discord da Alo Tamers e faça parte da comunidade."));
      setText(one("a > b", cards[2]), translate("community.aloJoin", "ENTRAR NO DISCORD ↗"));
      setAttr(one("a", cards[2]), "aria-label", translate("community.aloAria", "Entrar no Discord da Alo Tamers"));
    }
  }

  function applyCommunityDynamicTranslations() {
    var root = document.getElementById("socialPagina");
    if (!root) return;
    applyCommunityStaticTranslations();
    all(".community-link-list .community-empty", root).forEach(function (el) {
      var raw = String(el.textContent || "").replace(/\s+/g, " ").trim();
      var kind = el.getAttribute("data-hg-community-empty-kind");
      if (!kind) {
        kind = /não foi possível|could not|couldn't|불러올 수 없/i.test(raw) ? "error" : "empty";
        el.setAttribute("data-hg-community-empty-kind", kind);
      }
      setText(el, translate(kind === "error" ? "community.loadError" : "community.empty", kind === "error" ? "Não foi possível carregar os links agora." : "Nenhum link cadastrado nesta plataforma."));
    });
    all(".community-channel-link", root).forEach(function (link) {
      /* Creator/channel names and spreadsheet descriptions are intentionally untouched. */
      setText(one(":scope > b", link), translate("community.access", "ACESSAR ↗"));
    });
  }

  function applyDisplaySettingsTranslations() {
    var trigger = document.getElementById("btnDisplaySettings");
    if (trigger) {
      setAttr(trigger, "aria-label", translate("display.triggerAria", "Ajuste de tela"));
      setAttr(trigger, "title", translate("display.triggerAria", "Ajuste de tela"));
      setText(one(":scope > span:last-child", trigger), translate("more.displaySettings", "Ajuste de Tela"));
    }
    var panel = document.getElementById("hgDisplaySettingsPanel");
    if (!panel) return;
    setText(one(".hg-display-settings-head small", panel), translate("display.interface", "HOLY GUARDIANS // INTERFACE"));
    setText(one("#hgDisplaySettingsTitle", panel), translate("display.title", "AJUSTE DE TELA"));
    setAttr(one(".hg-display-settings-close", panel), "aria-label", translate("display.close", "Fechar"));
    var infos = all(".hg-display-screen-info > div > span", panel);
    if (infos[0]) setText(infos[0], translate("display.screen", "TELA"));
    if (infos[1]) setText(infos[1], translate("display.viewport", "VIEWPORT"));
    if (infos[2]) setText(infos[2], translate("display.scale", "ESCALA"));
    var labels = all(".hg-display-settings-label", panel);
    if (labels[0]) {
      setText(one("span", labels[0]), translate("display.preset", "PRESET"));
      setText(one("small", labels[0]), translate("display.savedBrowser", "Salvo somente neste navegador"));
    }
    if (labels[1]) {
      setText(one("span", labels[1]), translate("display.fine", "AJUSTE FINO"));
      /* 80% a 150% is numeric and intentionally unchanged. */
    }
    var presets = {};
    all("[data-hg-display-preset]", panel).forEach(function (button) { presets[button.getAttribute("data-hg-display-preset")] = button; });
    if (presets.auto) { setText(one("b", presets.auto), translate("display.auto", "AUTOMÁTICO")); setText(one("small", presets.auto), translate("display.autoDesc", "100% · padrão")); }
    if (presets.compact) setText(one("b", presets.compact), translate("display.compact", "COMPACTO"));
    if (presets.comfortable) setText(one("b", presets.comfortable), translate("display.comfortable", "CONFORTÁVEL"));
    if (presets.large) setText(one("b", presets.large), translate("display.large", "GRANDE"));
    if (presets.ultrawide) { setText(one("b", presets.ultrawide), translate("display.ultrawide", "ULTRAWIDE")); setText(one("small", presets.ultrawide), translate("display.ultrawideDesc", "mais largura + 112%")); }
    var manualButtons = all(".hg-display-manual-controls button", panel);
    if (manualButtons[0]) setAttr(manualButtons[0], "aria-label", translate("display.decrease", "Diminuir escala"));
    if (manualButtons[1]) setAttr(manualButtons[1], "aria-label", translate("display.increase", "Aumentar escala"));
    setAttr(one("#hgDisplayScaleRange", panel), "aria-label", translate("display.rangeAria", "Escala da interface"));
    setText(one(".hg-display-reset", panel), translate("display.reset", "RESTAURAR PADRÃO"));
    setText(one(".hg-display-settings-note", panel), translate("display.note", "O ajuste altera somente a visualização neste dispositivo e não muda a resolução real do monitor."));
  }

  function phase7ComparisonQuantity(root) {
    var active = one(".comparacao-qtd-btn.ativo", root);
    var qtd = Number(active && active.getAttribute("data-qtd"));
    return [2,4,8].indexOf(qtd) >= 0 ? qtd : 2;
  }

  function applyComparisonStaticTranslations() {
    var root = document.getElementById("comparacaoPagina");
    if (!root) return;
    var qtd = phase7ComparisonQuantity(root);
    setText(one(".comparacao-kicker", root), translate("comparison.kicker", "DIGIMON ANALYSIS // HOLY GUARDIANS SYSTEM"));
    setText(one(".comparacao-header .page-title", root), translate("comparison.title", "COMPARAÇÃO"));
    setText(one("#comparacaoSubtitle", root), qtd === 2 ? translate("comparison.subtitle2", "Selecione dois Digimons e compare seus dados lado a lado.") : formatTranslation("comparison.subtitleN", "Selecione {count} Digimons e compare seus dados usando a mesma lógica da comparação principal.", {count:qtd}));
    setText(one(".comparacao-quantidade-label", root), translate("comparison.compare", "COMPARAR"));
    setAttr(one(".comparacao-quantidade", root), "aria-label", translate("comparison.quantityAria", "Quantidade de Digimons para comparar"));
    setAttr(one("#comparacaoHeroIcon", root), "alt", translate("comparison.heroAlt", "Comparação"));
  }

  function applyComparisonDynamicTranslations() {
    var root = document.getElementById("comparacaoPagina");
    if (!root) return;
    applyComparisonStaticTranslations();
    var qtd = phase7ComparisonQuantity(root);

    all(".comparacao-selector", root).forEach(function (selector, index) {
      setText(one("label", selector), formatTranslation("comparison.digimonLabel", "DIGIMON {count}", {count:index + 1}));
      setAttr(one("input.comparacao-input", selector), "placeholder", translate("comparison.placeholder", "Digite o nome do Digimon..."));
    });

    all(".comparacao-sugestao span", root).forEach(function (el) { applyKoreanDigimonName(el); });
    all(".comparacao-card h3", root).forEach(function (el) { applyKoreanDigimonName(el); });
    all(".comparacao-stat-label", root).forEach(function (el) {
      var key = canonicalReferenceKey(el.textContent);
      if (key) applyReferenceLabel(el, key, true);
    });
    all(".comparacao-extra-box > .label", root).forEach(function (el) {
      var key = canonicalReferenceKey(el.textContent);
      if (key) applyReferenceLabel(el, key, true);
    });
    applyKoreanRelationTooltips(root);

    var empty = one("#comparacaoResultado .comparacao-empty", root);
    if (empty) setText(empty, qtd === 2 ? translate("comparison.empty2", "Escolha dois Digimons para iniciar a comparação.") : formatTranslation("comparison.emptyN", "Selecione até {count} Digimons para iniciar a comparação.", {count:qtd}));
  }



  /* =====================================================
     PHASE 8 — CONTENT TOOLS + FINAL NON-PVP AUDIT
     Tier List DSR / Tier List DMO / Giveaway + mobile title.
     Keeps platform/user names and canonical game data untouched.
  ===================================================== */

  function phase8SetTextNode(host, key, fallback) {
    if (!host) return;
    var node = Array.prototype.slice.call(host.childNodes || []).find(function (item) {
      return item.nodeType === 3 && String(item.nodeValue || "").trim();
    });
    if (!node) return;
    var before = String(node.nodeValue || "");
    var lead = (before.match(/^\s*/) || [""])[0];
    var trail = (before.match(/\s*$/) || [""])[0];
    var next = lead + String(translate(key, fallback)) + trail;
    if (node.nodeValue !== next) node.nodeValue = next;
  }

  function phase8SetAttr(element, name, key, fallback) {
    if (!element) return;
    setAttr(element, name, translate(key, fallback));
  }

  function phase8CompactDigimonName(element) {
    if (!element) return;
    var original = element.getAttribute("data-hg-phase8-digimon-original");
    var raw = String(element.textContent || "").replace(/\s+/g, " ").trim();
    if (!original) {
      original = raw || "";
      if (original) element.setAttribute("data-hg-phase8-digimon-original", original);
    }
    if (!original) return;
    if (currentLanguage === "ko-KR") {
      var ko = koDigimonName(original);
      if (ko) {
        setText(element, ko);
        setAttr(element, "title", original);
        return;
      }
    }
    setText(element, original);
    if (element.getAttribute("title") === original) element.removeAttribute("title");
  }

  function phase8TranslateStageCompact(element) {
    if (!element) return;
    var original = element.getAttribute("data-hg-phase8-stage-original") || String(element.textContent || "").trim();
    if (!original) return;
    element.setAttribute("data-hg-phase8-stage-original", original);
    if (currentLanguage === "ko-KR") {
      var info = koStageData(original);
      setText(element, info ? info.ko + " (" + info.ref + ")" : original);
    } else setText(element, original);
  }

  function applyContentNavTranslations() {
    var trigger = document.getElementById("btnFeatures");
    if (trigger) {
      var spans = all(":scope > span", trigger).filter(function (el) { return !el.classList.contains("nav-dropdown-chevron"); });
      if (spans[0]) setText(spans[0], translate("nav.content", "Conteúdos"));
    }
    var menu = document.getElementById("featuresNavMenu");
    var buttons = all("button", menu);
    if (buttons[0]) setText(buttons[0], translate("content.giveaway", "SORTEIO"));
    if (buttons[1]) setText(buttons[1], translate("content.tierDsr", "TIER LIST DSR"));
    if (buttons[2]) setText(buttons[2], translate("content.tierDmo", "TIER LIST DMO"));
  }

  function applyTierListDsrStaticTranslations() {
    var root = document.getElementById("tierListPagina");
    if (!root) return;
    setText(one(".tierlist-kicker", root), translate("tier.common.kicker", "HOLY GUARDIANS // FERRAMENTAS HG"));
    setText(one(".tierlist-hero h1", root), translate("tier.dsr.title", "TIER LIST DSR"));
    setText(one(".tierlist-hero p", root), translate("tier.dsr.subtitle", "Monte sua própria Tier List com os Digimons da nossa base. Crie quantas tiers quiser, renomeie, escolha as cores e arraste os ícones livremente."));
    var badgeSpans = all(".tierlist-hero-badge span", root);
    if (badgeSpans[0]) setText(badgeSpans[0], translate("tier.common.drag", "DRAG"));
    if (badgeSpans[1]) setText(badgeSpans[1], translate("tier.common.drop", "DROP"));
    setText(one(".tierlist-title-field > span", root), translate("tier.common.titleLabel", "TÍTULO DA TIER LIST"));
    var actions = all(".tierlist-toolbar-actions .tierlist-action", root);
    replaceButtonTextNode(actions[0], "tier.common.addTier", "ADICIONAR TIER");
    replaceButtonTextNode(actions[1], "tier.dmo.addIcon", "ADICIONAR ÍCONE");
    replaceButtonTextNode(actions[2], "tier.common.streamMode", "MODO STREAM");
    if (actions[3] && /GERANDO PNG|GENERATING PNG|PNG 생성 중/.test(actions[3].textContent || "")) setHtml(actions[3], '<span>◌</span> ' + escapeHtml(translate("tier.common.generatingPng", "GERANDO PNG...")));
    else replaceButtonTextNode(actions[3], "tier.common.exportPng", "EXPORTAR PNG");
    replaceButtonTextNode(actions[4], "tier.common.reset", "RESETAR");
    setText(one(".tierlist-export-brand small", root), translate("tier.dsr.exportBrand", "HOLY GUARDIANS // DSR TOOLS"));
    phase8SetAttr(one("#tierListBoardTitle", root), "aria-label", "tier.common.boardAria", "Título da Tier List");
    phase8SetAttr(one("#tierListBoardTitle", root), "title", "tier.common.boardTitle", "Clique para editar o título desta sessão");
    setText(one(".tierlist-pool-head small", root), translate("tier.dsr.available", "DIGIMONS DISPONÍVEIS"));
    setText(one(".tierlist-pool-head strong", root), translate("tier.common.dragDesired", "ARRASTE PARA A TIER DESEJADA"));
    phase8SetAttr(one("#tierListSearch", root), "placeholder", "tier.dsr.search", "Procurar Digimon...");

    var filters = all(".tierlist-filter-field", root);
    if (filters[0]) setText(one(":scope > span", filters[0]), currentLanguage === "ko-KR" ? "진화 단계 (Stage)" : translate("tier.common.stage", "STAGE"));
    if (filters[1]) setText(one(":scope > span", filters[1]), currentLanguage === "ko-KR" ? "타입 (Type)" : translate("tier.common.type", "TYPE"));
    var stageSelect = one("#tierListStageFilter", root);
    if (stageSelect) all("option", stageSelect).forEach(function (option) {
      if (!option.value) setText(option, translate("tier.common.all", "TODOS"));
      else if (currentLanguage === "ko-KR") applyKoreanStageLabel(option, option.value);
      else setText(option, option.value);
    });
    var typeSelect = one("#tierListTypeFilter", root);
    if (typeSelect) all("option", typeSelect).forEach(function (option) {
      if (!option.value) setText(option, translate("tier.common.all", "TODOS"));
      else setText(option, option.value);
    });
    filters.forEach(function (field) {
      var select = one("select", field), trigger = one(".tierlist-select-trigger b", field);
      if (select && trigger && select.selectedOptions && select.selectedOptions[0]) setText(trigger, select.selectedOptions[0].textContent);
    });
    setText(one(".tierlist-clear-filter", root), translate("tier.common.clearFilters", "LIMPAR FILTROS"));
    setText(one("#tierListEmpty", root), translate("tier.common.noMatches", "Nenhum Digimon corresponde aos filtros."));
    setHtml(one(".tierlist-tip p", root), translate("tier.dsr.tipHtml", "<strong>Dica:</strong> arraste os Digimons entre as tiers ou de volta para a lista. As alterações são salvas automaticamente neste navegador."));
    setText(one("#tierListStreamExit", root), translate("tier.common.exitStream", "SAIR DO MODO STREAM"));

    var modal = one("#tierListUploadModal", root);
    if (modal) {
      setText(one(".tierlist-dmo-upload-head small", modal), "HOLY GUARDIANS // DSR");
      setText(one("#tierListUploadTitle", modal), translate("tier.dmo.addIcon", "ADICIONAR ÍCONE"));
      phase8SetAttr(one(".tierlist-dmo-upload-head button", modal), "aria-label", "common.close", "Fechar");
      phase8SetAttr(one("#tierListUploadPreview", modal), "alt", "tier.dmo.previewAlt", "Prévia do ícone");
      var uploadLabels = all(".tierlist-dmo-upload-body label > span", modal);
      if (uploadLabels[0]) setText(uploadLabels[0], translate("tier.dmo.digimonName", "NOME DO DIGIMON"));
      if (uploadLabels[1]) setText(uploadLabels[1], currentLanguage === "ko-KR" ? "진화 단계 (Stage)" : translate("tier.common.stage", "STAGE"));
      if (uploadLabels[2]) setText(uploadLabels[2], currentLanguage === "ko-KR" ? "타입 (Type)" : translate("tier.common.type", "TYPE"));
      phase8SetAttr(one("#tierListUploadName", modal), "placeholder", "tier.dmo.nameExample", "Ex.: Digimon");
      var uploadStage = one("#tierListUploadStage", modal);
      if (uploadStage) all("option", uploadStage).forEach(function(option) {
        if (currentLanguage === "ko-KR") applyKoreanStageLabel(option, option.value);
        else setText(option, option.value);
      });
      setText(one(".tierlist-dmo-upload-body > p", modal), translate("tier.dmo.fileNote", "O arquivo é reduzido automaticamente e salvo apenas no navegador deste dispositivo."));
      var modalActions = all(".tierlist-dmo-upload-actions button", modal);
      if (modalActions[0]) setText(modalActions[0], translate("common.cancel", "CANCELAR"));
      if (modalActions[1]) setText(modalActions[1], translate("common.add", "ADICIONAR"));
    }
  }

  function phase8TierRowsDynamic(root) {
    all(".tierlist-row", root).forEach(function (row) {
      var label = one(".tierlist-label", row);
      if (label) phase8SetAttr(label, "aria-label", "tier.common.tierName", "Nome da tier");
      var controls = all(".tierlist-tier-controls > *", row);
      if (controls[0]) { phase8SetAttr(controls[0], "title", "tier.common.moveUp", "Subir tier"); phase8SetAttr(controls[0], "aria-label", "tier.common.moveUp", "Subir tier"); }
      if (controls[1]) { phase8SetAttr(controls[1], "title", "tier.common.moveDown", "Descer tier"); phase8SetAttr(controls[1], "aria-label", "tier.common.moveDown", "Descer tier"); }
      if (controls[2]) { phase8SetAttr(controls[2], "title", "tier.common.color", "Cor da tier"); phase8SetAttr(controls[2], "aria-label", "tier.common.color", "Cor da tier"); }
      if (controls[3]) { phase8SetAttr(controls[3], "title", "tier.common.deleteTier", "Excluir tier"); phase8SetAttr(controls[3], "aria-label", "tier.common.deleteTier", "Excluir tier"); }
      var tierName = one(".tierlist-label", row);
      if (tierName && /^NOVA TIER$|^NEW TIER$|^새 티어$/i.test(String(tierName.textContent || "").trim())) setText(tierName, translate("tier.common.newTier", "NOVA TIER"));
    });
    all(".tierlist-zone-placeholder", root).forEach(function (el) { setText(el, translate("tier.common.dropHere", "ARRASTE AQUI")); });
    all(".tierlist-loading", root).forEach(function (el) { setText(el, translate("tier.dsr.loading", "Carregando Digimons da database...")); });
  }

  function applyTierListDsrDynamicTranslations() {
    var root = document.getElementById("tierListPagina");
    if (!root) return;
    applyTierListDsrStaticTranslations();
    phase8TierRowsDynamic(root);
    all(".tierlist-digi", root).forEach(function (card) {
      var name = one(":scope > strong", card);
      phase8CompactDigimonName(name);
      phase8TranslateStageCompact(one(":scope > small", card));
      var originalName = name ? (name.getAttribute("data-hg-phase8-digimon-original") || name.textContent) : "Digimon";
      var back = one(".tierlist-card-return", card);
      if (back) setAttr(back, "aria-label", formatTranslation("tier.common.returnAvailable", "Voltar {name} para disponíveis", { name: originalName }));
      var customDelete = one(".tierlist-dsr-custom-delete", card);
      if (customDelete) {
        setAttr(customDelete, "title", translate("tier.dmo.deleteCustom", "Excluir ícone personalizado"));
        setAttr(customDelete, "aria-label", formatTranslation("tier.dmo.deleteNamed", "Excluir {name}", { name: originalName }));
      }
    });
    all(".tierlist-select-options .tierlist-select-option", root).forEach(function (button) {
      var value = String(button.getAttribute("data-value") || "");
      if (!value) setText(button, translate("tier.common.all", "TODOS"));
      else if (["ROOKIE","CHAMPION","ULTIMATE","MEGA"].indexOf(value.toUpperCase()) >= 0 && currentLanguage === "ko-KR") {
        var info = koStageData(value);
        if (info) setText(button, info.ko + " (" + info.ref + ")");
      } else if (value) setText(button, value);
    });
    var tooltip = document.getElementById("tierListDigiTooltip");
    if (tooltip && !tooltip.hidden) {
      var tName = one(".tierlist-tooltip-head strong", tooltip);
      if (tName) {
        var original = tName.getAttribute("data-hg-phase8-digimon-original") || String(tName.textContent || "").trim();
        tName.setAttribute("data-hg-phase8-digimon-original", original);
        if (currentLanguage === "ko-KR") {
          var ko = koDigimonName(original);
          setText(tName, ko ? ko + " (" + original + ")" : original);
        } else setText(tName, original);
      }
      var meta = one(".tierlist-tooltip-head small", tooltip);
      if (meta) {
        var rawMeta = meta.getAttribute("data-hg-phase8-meta-original") || String(meta.textContent || "").trim();
        meta.setAttribute("data-hg-phase8-meta-original", rawMeta);
        if (currentLanguage === "ko-KR") {
          var parts = rawMeta.split(" · ");
          var st = koStageData(parts[0]);
          setText(meta, (st ? st.ko + " (" + st.ref + ")" : parts[0]) + (parts[1] ? " · " + parts[1] : ""));
        } else setText(meta, rawMeta);
      }
      var fieldLabel = one(".tierlist-tooltip-field em", tooltip);
      if (fieldLabel) applyReferenceLabel(fieldLabel, "FIELD", true);
      all(".tierlist-tooltip-stats i", tooltip).forEach(function (label) { applyReferenceLabel(label, canonicalReferenceKey(label.textContent), true); });
    }
  }

  function applyTierListDmoStaticTranslations() {
    var root = document.getElementById("tierListDmoPagina");
    if (!root) return;
    setText(one(".tierlist-kicker", root), translate("tier.common.kicker", "HOLY GUARDIANS // FERRAMENTAS HG"));
    setText(one(".tierlist-hero h1", root), translate("tier.dmo.title", "TIER LIST DMO"));
    setText(one(".tierlist-hero p", root), translate("tier.dmo.subtitle", "Monte sua Tier List com os Digimons de rank U, SSS+ e SSS do DMO. Pesquise por nome, filtre por rank ou adicione seu próprio ícone sem depender de atualização do site."));
    setText(one(".tierlist-title-field > span", root), translate("tier.common.titleLabel", "TÍTULO DA TIER LIST"));
    var actions = all(".tierlist-toolbar-actions .tierlist-action", root);
    replaceButtonTextNode(actions[0], "tier.common.addTier", "ADICIONAR TIER");
    replaceButtonTextNode(actions[1], "tier.dmo.addIcon", "ADICIONAR ÍCONE");
    replaceButtonTextNode(actions[2], "tier.common.streamMode", "MODO STREAM");
    if (actions[3] && /GERANDO PNG|GENERATING PNG|PNG 생성 중/.test(actions[3].textContent || "")) setHtml(actions[3], '<span>◌</span> ' + escapeHtml(translate("tier.common.generatingPng", "GERANDO PNG...")));
    else replaceButtonTextNode(actions[3], "tier.common.exportPng", "EXPORTAR PNG");
    replaceButtonTextNode(actions[4], "tier.common.reset", "RESETAR");
    setText(one(".tierlist-export-brand small", root), translate("tier.dmo.exportBrand", "HOLY GUARDIANS // DMO TOOLS"));
    phase8SetAttr(one("#tierListDmoBoardTitle", root), "aria-label", "tier.common.boardAria", "Título da Tier List");
    phase8SetAttr(one("#tierListDmoBoardTitle", root), "title", "tier.common.boardTitle", "Clique para editar o título desta sessão");
    setText(one(".tierlist-pool-head small", root), translate("tier.dmo.catalog", "CATÁLOGO DMO"));
    setText(one(".tierlist-pool-head strong", root), translate("tier.dmo.dragRanks", "U • SSS+ • SSS // ARRASTE PARA A TIER DESEJADA"));
    phase8SetAttr(one("#tierListDmoSearch", root), "placeholder", "tier.dmo.search", "Procurar Digimon por nome...");
    phase8SetAttr(one(".tierlist-dmo-ranks", root), "aria-label", "tier.dmo.rankAria", "Filtrar por rank");
    var rankButtons = all(".tierlist-dmo-ranks button", root);
    rankButtons.forEach(function (button) {
      var rank = String(button.getAttribute("data-rank") || "");
      if (!rank) phase8SetTextNode(button, "tier.common.allEn", "ALL");
      else if (rank === "CUSTOM") phase8SetTextNode(button, "tier.dmo.custom", "CUSTOM");
    });
    setText(one(".tierlist-clear-filter", root), translate("tier.common.clearFilters", "LIMPAR FILTROS"));
    setText(one("#tierListDmoEmpty", root), translate("tier.common.noMatches", "Nenhum Digimon corresponde aos filtros."));
    setHtml(one(".tierlist-tip p", root), translate("tier.dmo.tipHtml", "<strong>Dica:</strong> o catálogo base usa os ranks U, SSS+ e SSS. Ícones adicionados por você ficam salvos somente neste navegador e também funcionam no Modo Stream."));
    setText(one("#tierListDmoStreamExit", root), translate("tier.common.exitStream", "SAIR DO MODO STREAM"));

    var modal = one("#tierListDmoUploadModal", root);
    if (modal) {
      setText(one(".tierlist-dmo-upload-head small", modal), translate("tier.dmo.modalBrand", "HOLY GUARDIANS // DMO"));
      setText(one("#tierListDmoUploadTitle", modal), translate("tier.dmo.addIcon", "ADICIONAR ÍCONE"));
      phase8SetAttr(one(".tierlist-dmo-upload-head button", modal), "aria-label", "common.close", "Fechar");
      phase8SetAttr(one("#tierListDmoUploadPreview", modal), "alt", "tier.dmo.previewAlt", "Prévia do ícone");
      var labels = all(".tierlist-dmo-upload-body label > span", modal);
      if (labels[0]) setText(labels[0], translate("tier.dmo.digimonName", "NOME DO DIGIMON"));
      if (labels[1]) setText(labels[1], currentLanguage === "ko-KR" ? "랭크 (Rank)" : translate("tier.dmo.rank", "RANK"));
      phase8SetAttr(one("#tierListDmoUploadName", modal), "placeholder", "tier.dmo.nameExample", "Ex.: Omegamon Alter-S");
      var customOption = one("#tierListDmoUploadRank option[value='CUSTOM']", modal);
      if (customOption) setText(customOption, translate("tier.dmo.custom", "CUSTOM"));
      setText(one(".tierlist-dmo-upload-body > p", modal), translate("tier.dmo.fileNote", "O arquivo é reduzido automaticamente e salvo apenas no navegador deste dispositivo."));
      var modalActions = all(".tierlist-dmo-upload-actions button", modal);
      if (modalActions[0]) setText(modalActions[0], translate("common.cancel", "CANCELAR"));
      if (modalActions[1]) setText(modalActions[1], translate("common.add", "ADICIONAR"));
    }
  }

  function applyTierListDmoDynamicTranslations() {
    var root = document.getElementById("tierListDmoPagina");
    if (!root) return;
    applyTierListDmoStaticTranslations();
    phase8TierRowsDynamic(root);
    all(".tierlist-digi", root).forEach(function (card) {
      var name = one(":scope > strong", card);
      phase8CompactDigimonName(name);
      var originalName = name ? (name.getAttribute("data-hg-phase8-digimon-original") || name.textContent) : "Digimon";
      var back = one(".tierlist-card-return", card);
      if (back) setAttr(back, "aria-label", formatTranslation("tier.common.returnAvailable", "Voltar {name} para disponíveis", { name: originalName }));
      var customDelete = one(".tierlist-dmo-custom-delete", card);
      if (customDelete) {
        setAttr(customDelete, "title", translate("tier.dmo.deleteCustom", "Excluir ícone personalizado"));
        setAttr(customDelete, "aria-label", formatTranslation("tier.dmo.deleteNamed", "Excluir {name}", { name: originalName }));
      }
    });
    ["tierListDmoExportBtn"].forEach(function (id) {
      var button = document.getElementById(id);
      if (button && /GERANDO PNG|GENERATING PNG|PNG 생성 중/.test(button.textContent || "")) {
        setHtml(button, '<span>◌</span> ' + escapeHtml(translate("tier.common.generatingPng", "GERANDO PNG...")));
      }
    });
  }

  function applySorteioStaticTranslations() {
    var root = document.getElementById("sorteioPagina");
    if (!root) return;
    setText(one(".sorteio-kicker", root), translate("giveaway.kicker", "HOLY GUARDIANS // FERRAMENTAS HG"));
    setText(one(".sorteio-hero .page-title", root), translate("giveaway.title", "SORTEIO"));
    setText(one(".sorteio-hero .page-subtitle", root), translate("giveaway.subtitle", "Monte a lista manualmente, conecte uma plataforma individual ou una YouTube, Twitch e Kick no Multi Stream em tempo real."));
    setText(one(".sorteio-status-card small", root), translate("giveaway.sessionStatus", "STATUS DA SESSÃO"));
    setText(one(".sorteio-source-copy small", root), translate("giveaway.source", "FONTE DOS PARTICIPANTES"));
    setText(one(".sorteio-source-copy strong", root), translate("giveaway.chooseSource", "ESCOLHA COMO ALIMENTAR A ROLETA"));

    var sourceButtons = all(".sorteio-source-btn", root);
    sourceButtons.forEach(function (button) {
      if (button.classList.contains("manual")) {
        setText(one("b", button), translate("giveaway.manual", "MANUAL"));
        setText(one("small", button), translate("giveaway.availableNow", "Disponível agora"));
      } else if (button.classList.contains("youtube") || button.classList.contains("twitch") || button.classList.contains("kick")) {
        setText(one("small", button), "Evil Guardians · " + translate("giveaway.available", "disponível"));
      }
    });

    var wheelHead = one(".sorteio-wheel-panel .sorteio-panel-head", root);
    if (wheelHead) {
      var copy = one(":scope > div:first-child", wheelHead);
      if (copy) { setText(one("small", copy), translate("giveaway.hgWheel", "ROLETA HG")); setText(one("strong", copy), translate("giveaway.current", "SORTEIO ATUAL")); }
    }
    var streamBtn = one("#sorteioStreamBtn", root);
    replaceButtonTextNode(streamBtn, "tier.common.streamMode", "MODO STREAM");
    phase8SetAttr(streamBtn, "title", "giveaway.streamTitle", "Exibir a roleta em modo limpo para OBS/stream");
    setText(one(".sorteio-participant-counter > span", root), translate("giveaway.participants", "PARTICIPANTES"));
    phase8SetAttr(one("#sorteioCanvas", root), "aria-label", "giveaway.canvasAria", "Roleta de participantes");
    setHtml(one("#sorteioWinnerBox small", root), '<span class="sorteio-winner-crown" aria-hidden="true">👑</span> ' + escapeHtml(translate("giveaway.winner", "VENCEDOR DO SORTEIO")));
    setText(one("#sorteioSpinBtn", root), translate("giveaway.spin", "GIRAR ROLETA"));

    var manualPanel = one("#sorteioManualPanel", root);
    if (manualPanel) {
      var manualLabels = all(".sorteio-field > span", manualPanel);
      if (manualLabels[0]) setText(manualLabels[0], translate("giveaway.addName", "ADICIONAR UM NOME"));
      if (manualLabels[1]) setText(manualLabels[1], translate("giveaway.pasteList", "COLAR UMA LISTA"));
      phase8SetAttr(one("#sorteioNomeInput", manualPanel), "placeholder", "giveaway.nameExample", "Ex: GrimSleep");
      phase8SetAttr(one("#sorteioListaInput", manualPanel), "placeholder", "giveaway.listPlaceholder", "Um nome por linha, vírgula ou ponto e vírgula...");
      setText(one("#sorteioAddListBtn", manualPanel), translate("giveaway.addList", "ADICIONAR LISTA"));
      setText(one("#sorteioImportBtn", manualPanel), translate("giveaway.import", "IMPORTAR TXT/CSV"));
    }

    var ytPanel = one("#sorteioYoutubePanel", root);
    if (ytPanel) {
      var ytLabels = all(".sorteio-field > span", ytPanel);
      if (ytLabels[0]) setText(ytLabels[0], translate("giveaway.youtubeLink", "LINK DA LIVE DO YOUTUBE"));
      if (ytLabels[1]) setText(ytLabels[1], translate("giveaway.command", "COMANDO PARA ENTRAR"));
    }
    var twPanel = one("#sorteioTwitchPanel", root);
    if (twPanel) {
      setText(one(".sorteio-twitch-auth-note b", twPanel), translate("giveaway.twitchSecure", "CONEXÃO SEGURA COM A TWITCH"));
      setText(one(".sorteio-twitch-auth-note small", twPanel), translate("giveaway.twitchSecureDesc", "O canal usado será a conta que autorizar o Evil Guardians na janela oficial da Twitch."));
      setText(one(".sorteio-field > span", twPanel), translate("giveaway.command", "COMANDO PARA ENTRAR"));
    }
    var kickPanel = one("#sorteioKickPanel", root);
    if (kickPanel) {
      setText(one(".sorteio-kick-auth-note b", kickPanel), translate("giveaway.kickSecure", "CONEXÃO SEGURA COM A KICK"));
      setText(one(".sorteio-kick-auth-note small", kickPanel), translate("giveaway.kickSecureDesc", "O canal usado será a conta que autorizar o Evil Guardians. Ao conectar e ao abrir o sorteio, ele também avisa no chat."));
      setText(one(".sorteio-field > span", kickPanel), translate("giveaway.command", "COMANDO PARA ENTRAR"));
    }
    var multiPanel = one("#sorteioMultiPanel", root);
    if (multiPanel) {
      setText(one(".sorteio-multi-note b", multiPanel), translate("giveaway.multiUnified", "MULTI STREAM // LISTA ÚNICA"));
      setHtml(one(".sorteio-multi-note small", multiPanel), translate("giveaway.multiDescHtml", "Conecte quantas plataformas quiser. Todos os <strong>!sorteio</strong> entram na mesma roleta em tempo real."));
      setText(one(":scope > .sorteio-field > span", multiPanel), translate("giveaway.commandAll", "COMANDO PARA ENTRAR EM TODAS"));
      setText(one(".sorteio-multi-platform-card.youtube .sorteio-field > span", multiPanel), translate("giveaway.liveLink", "LINK DA LIVE"));
      var summary = one(".sorteio-multi-summary span", multiPanel);
      if (summary) phase8SetTextNode(summary, "giveaway.platformsConnected", "/3 PLATAFORMAS CONECTADAS");
      setText(one(".sorteio-multi-summary > small", multiPanel), translate("giveaway.accountPerPlatform", "Uma conta pode participar uma vez em cada plataforma."));
    }

    ["#sorteioYoutubeConnectBtn", "#sorteioTwitchConnectBtn", "#sorteioKickConnectBtn"].forEach(function (sel) {
      var btn = one(sel, root);
      if (!btn) return;
      if (/CONECTANDO|CONNECTING|연결 중|AGUARDANDO|WAITING|대기 중/i.test(btn.textContent || "")) phase8TranslateDynamicText(btn);
      else setText(btn, translate("giveaway.connectEvil", "CONECTAR EVIL GUARDIANS"));
    });
    ["#sorteioYoutubeDisconnectBtn", "#sorteioTwitchDisconnectBtn", "#sorteioKickDisconnectBtn", "#sorteioMultiYoutubeDisconnectBtn", "#sorteioMultiTwitchDisconnectBtn", "#sorteioMultiKickDisconnectBtn"].forEach(function (sel) { setText(one(sel, root), translate("giveaway.disconnect", "DESCONECTAR")); });
    ["#sorteioMultiYoutubeConnectBtn", "#sorteioMultiTwitchConnectBtn", "#sorteioMultiKickConnectBtn"].forEach(function (sel) {
      var btn = one(sel, root);
      if (!btn) return;
      if (/CONECTANDO|CONNECTING|연결 중|AGUARDANDO|WAITING|대기 중/i.test(btn.textContent || "")) phase8TranslateDynamicText(btn);
      else setText(btn, translate("giveaway.connect", "CONECTAR"));
    });

    var checks = all(".sorteio-check-copy", root);
    /* O primeiro checkbox muda conforme Manual / Live / Multi e é tratado no bloco dinâmico. */
    if (checks[1]) { setText(one("b", checks[1]), translate("giveaway.removeWinner", "REMOVER VENCEDOR APÓS SORTEAR")); setText(one("small", checks[1]), translate("giveaway.removeWinnerDesc", "Útil para várias rodadas seguidas.")); }

    var controlCards = all(".sorteio-control-card", root);
    var participantsCard = one(".sorteio-participants-card", root);
    if (participantsCard) {
      setText(one(".sorteio-control-title small", participantsCard), translate("giveaway.currentList", "LISTA ATUAL"));
      setText(one(".sorteio-control-title strong", participantsCard), translate("giveaway.validParticipants", "PARTICIPANTES VÁLIDOS"));
      setText(one(".sorteio-clear-btn", participantsCard), translate("giveaway.clear", "LIMPAR"));
    }
    var historyCard = one(".sorteio-history-card", root);
    if (historyCard) {
      setText(one(".sorteio-control-title small", historyCard), translate("giveaway.localHistory", "HISTÓRICO LOCAL"));
      setText(one(".sorteio-control-title strong", historyCard), translate("giveaway.lastWinners", "ÚLTIMOS VENCEDORES"));
      setText(one(".sorteio-clear-btn", historyCard), translate("giveaway.clear", "LIMPAR"));
    }
    setText(one("#sorteioStreamExit", root), translate("tier.common.exitStream", "SAIR DO MODO STREAM"));
  }

  function phase8TranslateSorteioPhrase(raw) {
    var text = String(raw == null ? "" : raw).replace(/\s+/g, " ").trim();
    if (!text) return text;
    var exact = {
      "INSCRIÇÕES ABERTAS":"giveaway.entriesOpen", "INSCRIÇÕES ENCERRADAS":"giveaway.entriesClosed", "ABERTO":"giveaway.open", "FECHADO":"giveaway.closed",
      "FECHAR INSCRIÇÕES":"giveaway.closeEntries", "ABRIR INSCRIÇÕES":"giveaway.openEntries", "REABRIR INSCRIÇÕES":"giveaway.reopenEntries",
      "ENTRADA MANUAL":"giveaway.manualEntry", "PARTICIPANTES":"giveaway.participants", "EVIL GUARDIANS LIVE":"giveaway.evilLive",
      "UMA ENTRADA POR NOME":"giveaway.onePerName", "Ignora duplicados mesmo com maiúsculas/minúsculas diferentes.":"giveaway.duplicateDesc",
      "UMA ENTRADA POR USUÁRIO":"giveaway.onePerUser", "UMA ENTRADA POR USUÁRIO / PLATAFORMA":"giveaway.onePerUserPlatform",
      "A mesma conta entra uma vez em cada plataforma. Twitch, Kick e YouTube são validados separadamente.":"giveaway.separatePlatforms",
      "EVIL GUARDIANS CONECTADO":"giveaway.connected", "EVIL GUARDIANS DESCONECTADO":"giveaway.disconnected", "FALHA AO CONECTAR":"giveaway.connectFailed",
      "DESCONECTADO":"giveaway.disconnectedShort", "CONECTADO":"giveaway.connectedShort", "CONECTANDO...":"giveaway.connecting", "AGUARDANDO...":"giveaway.waiting",
      "Cole o link de uma live com chat ativo para começar.":"giveaway.youtubeIdle", "Autorize a Twitch para ligar seu canal ao sorteio.":"giveaway.twitchIdle", "Autorize a Kick para ligar seu canal ao sorteio.":"giveaway.kickIdle",
      "NENHUM PARTICIPANTE":"giveaway.noParticipants", "Adicione nomes para montar a roleta.":"giveaway.addNamesWheel", "Nenhum sorteio realizado nesta sessão.":"giveaway.noHistory",
      "MODO STREAM":"tier.common.streamMode", "SAIR DO MODO STREAM":"tier.common.exitStream", "GIRAR ROLETA":"giveaway.spin", "LIMPAR":"giveaway.clear",
      "CONECTAR":"giveaway.connect", "DESCONECTAR":"giveaway.disconnect", "CONECTAR EVIL GUARDIANS":"giveaway.connectEvil",
      "MANUAL":"giveaway.manual"
    };
    if (exact[text]) return translate(exact[text], text);

    var m;
    if ((m = text.match(/^(.+) selecionado\. Conecte o Evil Guardians\.$/))) return formatTranslation("giveaway.sourceSelected", "{platform} selecionado. Conecte o Evil Guardians.", { platform:m[1] });
    if ((m = text.match(/^Conecte o Evil Guardians à (.+) antes de abrir as inscrições\.$/))) return formatTranslation("giveaway.connectBeforeOpen", "Conecte o Evil Guardians à {platform} antes de abrir as inscrições.", { platform:m[1] });
    if ((m = text.match(/^Inscrições abertas, mas o aviso no chat da Kick falhou: (.+)\.$/))) return formatTranslation("giveaway.kickNoticeFailed", "Inscrições abertas, mas o aviso no chat da Kick falhou: {error}.", { error:m[1] });
    if ((m = text.match(/^Evil Guardians respondeu HTTP (.+)$/))) return formatTranslation("giveaway.httpError", "Evil Guardians respondeu HTTP {code}", { code:m[1] });
    if ((m = text.match(/^AGUARDANDO (.+)$/))) return formatTranslation("giveaway.awaitingPlatform", "AGUARDANDO {platform}", { platform:m[1] });
    if ((m = text.match(/^(.+) · ONLINE$/))) return formatTranslation("giveaway.onlineSuffix", "{name} · ONLINE", { name:m[1] });
    if ((m = text.match(/^(.+) · ouvindo (.+)$/i))) return formatTranslation("giveaway.listening", "{name} · ouvindo {command}", { name:m[1], command:m[2] });
    if ((m = text.match(/^O Evil Guardians identifica a conta da (.+) e ignora tentativas repetidas\.$/))) return formatTranslation("giveaway.identifiesAccount", "O Evil Guardians identifica a conta da {platform} e ignora tentativas repetidas.", { platform:m[1] });
    if ((m = text.match(/^Aguardando alguém mandar (.+) no chat\.$/))) return formatTranslation("giveaway.waitChat", "Aguardando alguém mandar {command} no chat.", { command:m[1] });
    if ((m = text.match(/^Aguardando alguém mandar (.+) no chat da (Twitch|Kick)\.$/))) return formatTranslation("giveaway.waitPlatformChat", "Aguardando alguém mandar {command} no chat da {platform}.", { command:m[1], platform:m[2] });
    if ((m = text.match(/^Aguardando (.+) em (.+)\.$/))) return formatTranslation("giveaway.waitMulti", "Aguardando {command} em {platforms}.", { command:m[1], platforms:m[2] });
    if ((m = text.match(/^Vencedor definido: (.+)\.$/))) return formatTranslation("giveaway.winnerDefined", "Vencedor definido: {name}.", { name:m[1] });
    if ((m = text.match(/^Sorteando entre (\d+) participantes\.\.\.$/))) return formatTranslation("giveaway.drawingAmong", "Sorteando entre {count} participantes...", { count:m[1] });
    if ((m = text.match(/^Lista congelada com (\d+) participante\(s\)\.$/))) return formatTranslation("giveaway.listFrozen", "Lista congelada com {count} participante(s).", { count:m[1] });
    if ((m = text.match(/^(\d+) participante\(s\) adicionado\(s\)(?: · (\d+) duplicado\(s\) ignorado\(s\))?\.$/))) return formatTranslation("giveaway.addedMany", "{count} participante(s) adicionado(s){duplicates}.", { count:m[1], duplicates:m[2] ? formatTranslation("giveaway.duplicateSuffix", " · {count} duplicado(s) ignorado(s)", {count:m[2]}) : "" });
    if ((m = text.match(/^Inscrições encerradas com (\d+) participante\(s\) · (.+)\.$/))) return formatTranslation("giveaway.closedWith", "Inscrições encerradas com {count} participante(s) · {platform}.", { count:m[1], platform:m[2] });
    if ((m = text.match(/^Inscrições abertas · (.+) ativo em (.+)\.$/))) return formatTranslation("giveaway.openCommand", "Inscrições abertas · {command} ativo em {platform}.", { command:m[1], platform:m[2] });
    if ((m = text.match(/^Lista da (.+) limpa · conexão mantida\.$/))) return formatTranslation("giveaway.listClearedConnection", "Lista da {platform} limpa · conexão mantida.", { platform:m[1] });
    if ((m = text.match(/^Evil Guardians conectado ao YouTube(?: no Multi Stream)?\.$/))) return text.indexOf("Multi Stream") >= 0 ? translate("giveaway.youtubeConnectedMulti", text) : translate("giveaway.youtubeConnected", text);
    if ((m = text.match(/^Evil Guardians desconectado do YouTube(?: · outras plataformas mantidas)?\.$/))) return text.indexOf("outras plataformas") >= 0 ? translate("giveaway.youtubeDisconnectedKeep", text) : translate("giveaway.youtubeDisconnected", text);
    if ((m = text.match(/^Evil Guardians conectado à (Twitch|Kick)(?: no Multi Stream)?(?: e pronto para ouvir o chat)?\.$/))) return formatTranslation("giveaway.platformConnected", "Evil Guardians conectado à {platform}.", { platform:m[1] });
    if ((m = text.match(/^(Twitch|Kick) desconectada(?: · outras plataformas mantidas| desta sessão do sorteio)?\.$/))) return formatTranslation("giveaway.platformDisconnected", "{platform} desconectada.", { platform:m[1] });
    if ((m = text.match(/^(\d+) participante\(s\) entrou\(aram\) pelo YouTube\.$/))) return formatTranslation("giveaway.youtubeJoined", "{count} participante(s) entrou(aram) pelo YouTube.", { count:m[1] });
    if ((m = text.match(/^YouTube: (.+)\. Tentando novamente\.\.\.$/))) return formatTranslation("giveaway.youtubeRetry", "YouTube: {error}. Tentando novamente...", { error:m[1] });

    var direct = {
      "O navegador não conseguiu alcançar o Evil Guardians. Verifique o Worker/CORS e tente novamente.":"giveaway.networkError",
      "Modo manual ativado.":"giveaway.manualActivated",
      "Cole o link da live do YouTube antes de conectar.":"giveaway.needYoutubeLink",
      "O Worker não confirmou a conexão com o chat do YouTube.":"giveaway.workerNoYoutube",
      "Não foi possível conectar à live.":"giveaway.liveConnectError",
      "Falha ao desconectar.":"giveaway.disconnectError",
      "O navegador bloqueou a janela da Twitch. Libere pop-ups para este site e tente novamente.":"giveaway.twitchPopupBlocked",
      "Autorize o Evil Guardians na janela da Twitch...":"giveaway.authorizeTwitch",
      "A Twitch autorizou a janela, mas o site não conseguiu sincronizar a sessão a tempo.":"giveaway.twitchSyncTimeout",
      "Não foi possível conectar à Twitch.":"giveaway.twitchConnectError",
      "Falha ao desconectar a Twitch.":"giveaway.twitchDisconnectError",
      "O navegador bloqueou a janela da Kick. Libere pop-ups para este site e tente novamente.":"giveaway.kickPopupBlocked",
      "Autorize o Evil Guardians na janela da Kick...":"giveaway.authorizeKick",
      "A Kick autorizou a janela, mas o site não conseguiu confirmar a conexão a tempo.":"giveaway.kickSyncTimeout",
      "Não foi possível conectar à Kick.":"giveaway.kickConnectError",
      "Falha ao desconectar a Kick.":"giveaway.kickDisconnectError",
      "Conecte pelo menos uma plataforma ao Multi Stream antes de abrir as inscrições.":"giveaway.connectOneMulti",
      "Não foi possível alterar a rodada ao vivo.":"giveaway.roundChangeError",
      "Inscrições reabertas. Você pode adicionar ou remover participantes.":"giveaway.entriesReopened",
      "Participante adicionado à roleta.":"giveaway.participantAdded",
      "Esse nome já está participando. Entrada duplicada ignorada.":"giveaway.duplicateIgnored",
      "As inscrições estão encerradas. Reabra para adicionar nomes.":"giveaway.entriesClosedAdd",
      "Cole pelo menos um nome antes de adicionar a lista.":"giveaway.pasteOneName",
      "Não foi possível ler esse arquivo.":"giveaway.fileReadError",
      "Conecte o Evil Guardians antes de limpar a rodada.":"giveaway.connectBeforeClear",
      "Não foi possível limpar a rodada ao vivo.":"giveaway.liveClearError",
      "Reabra as inscrições antes de alterar a lista.":"giveaway.reopenBeforeEdit",
      "Lista de participantes limpa.":"giveaway.participantListCleared",
      "Conecte o Evil Guardians a uma live do YouTube.":"giveaway.connectYoutube",
      "Conecte o Evil Guardians à Twitch.":"giveaway.connectTwitch",
      "Conecte o Evil Guardians à Kick.":"giveaway.connectKick",
      "Conecte YouTube, Twitch e/ou Kick para formar a lista unificada.":"giveaway.connectMultiList",
      "Feche as inscrições antes de girar a roleta.":"giveaway.closeBeforeSpin",
      "Adicione pelo menos 2 participantes.":"giveaway.needTwo",
      "Preparando o sorteio...":"giveaway.preparing",
      "O Digitama está reagindo...":"giveaway.digitamaReacting"
    };
    if (direct[text]) return translate(direct[text], text);
    return text;
  }

  function phase8TranslateDynamicText(element) {
    if (!element) return;
    var raw = String(element.textContent || "").replace(/\s+/g, " ").trim();
    var last = element.getAttribute("data-hg-phase8-last") || "";
    var original = element.getAttribute("data-hg-phase8-dynamic-original") || "";
    if (!original || (raw && raw !== last && raw !== original)) {
      original = raw;
      if (original) element.setAttribute("data-hg-phase8-dynamic-original", original);
    }
    if (!original) return;
    var next = phase8TranslateSorteioPhrase(original);
    setText(element, next);
    element.setAttribute("data-hg-phase8-last", next);
  }

  function phase8TranslateDynamicAttr(element, name, translator) {
    if (!element) return;
    var raw = String(element.getAttribute(name) || "");
    var baseKey = "data-hg-phase8-attr-" + name.replace(/[^a-z0-9_-]/gi, "-");
    var originalKey = baseKey + "-original", lastKey = baseKey + "-last";
    var original = element.getAttribute(originalKey) || "";
    var last = element.getAttribute(lastKey) || "";
    if (!original || (raw && raw !== last && raw !== original)) { original = raw; if (original) element.setAttribute(originalKey, original); }
    if (!original) return;
    var next = translator(original);
    setAttr(element, name, next);
    element.setAttribute(lastKey, next);
  }

  function phase8RedrawEmptySorteioCanvas() {
    var root = document.getElementById("sorteioPagina");
    var canvas = one("#sorteioCanvas", root);
    var total = one("#sorteioTotal", root);
    if (!canvas || !total || Number(total.textContent || 0) !== 0 || !canvas.getContext) return;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var w = canvas.width, h = canvas.height, cx = w/2, cy = h/2, radius = Math.min(w,h)*0.445;
    ctx.clearRect(0,0,w,h);
    var halo = ctx.createRadialGradient(cx,cy,radius*.72,cx,cy,radius*1.13);
    halo.addColorStop(0,"rgba(30,185,255,0)"); halo.addColorStop(.72,"rgba(38,171,255,.10)"); halo.addColorStop(1,"rgba(142,83,255,0)");
    ctx.fillStyle=halo; ctx.beginPath(); ctx.arc(cx,cy,radius*1.12,0,Math.PI*2); ctx.fill();
    ctx.save(); ctx.translate(cx,cy);
    var grad=ctx.createRadialGradient(0,0,40,0,0,radius); grad.addColorStop(0,"#0c2347"); grad.addColorStop(1,"#061226");
    ctx.fillStyle=grad; ctx.strokeStyle="rgba(76,211,255,.55)"; ctx.lineWidth=4; ctx.beginPath(); ctx.arc(0,0,radius,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle="#7edfff"; ctx.font='700 28px "Oxanium", Arial, sans-serif'; ctx.textAlign="center";
    ctx.fillText(translate("giveaway.canvasAdd", "ADICIONE PARTICIPANTES"),0,-16);
    ctx.fillStyle="#789ab8"; ctx.font='500 18px "Oxanium", Arial, sans-serif';
    ctx.fillText(translate("giveaway.canvasBuild", "para montar a roleta"),0,22); ctx.restore();
  }

  function applySorteioDynamicTranslations() {
    var root = document.getElementById("sorteioPagina");
    if (!root) return;
    applySorteioStaticTranslations();
    ["#sorteioStatusTopo","#sorteioEntryState","#sorteioLockBtn","#sorteioEntryKicker","#sorteioEntryTitle","#sorteioDuplicateTitle","#sorteioDuplicateDesc","#sorteioFeedback",
      "#sorteioMultiYoutubeStatus","#sorteioMultiTwitchStatus","#sorteioMultiKickStatus"].forEach(function (sel) { phase8TranslateDynamicText(one(sel, root)); });
    all(".sorteio-live-connection b, .sorteio-live-connection small", root).forEach(phase8TranslateDynamicText);
    all(".sorteio-empty-list b, .sorteio-empty-list span, .sorteio-empty-history", root).forEach(phase8TranslateDynamicText);
    all(".sorteio-participant-row small", root).forEach(function (el) {
      var original = el.getAttribute("data-hg-phase8-origin-original") || String(el.textContent || "").trim();
      if (!el.getAttribute("data-hg-phase8-origin-original")) el.setAttribute("data-hg-phase8-origin-original", original);
      setText(el, original === "MANUAL" ? translate("giveaway.manual", "MANUAL") : original);
    });
    all(".sorteio-history-row small", root).forEach(function (el) {
      var original = el.getAttribute("data-hg-phase8-history-original") || String(el.textContent || "").trim();
      if (!el.getAttribute("data-hg-phase8-history-original")) el.setAttribute("data-hg-phase8-history-original", original);
      setText(el, original.replace(/ · MANUAL$/, " · " + translate("giveaway.manual", "MANUAL")));
    });
    var winnerMeta = one("#sorteioWinnerMeta", root);
    if (winnerMeta && winnerMeta.textContent) {
      var wmOriginal = winnerMeta.getAttribute("data-hg-phase8-winner-meta-original") || String(winnerMeta.textContent || "").trim();
      if (!winnerMeta.getAttribute("data-hg-phase8-winner-meta-original")) winnerMeta.setAttribute("data-hg-phase8-winner-meta-original", wmOriginal);
      setText(winnerMeta, wmOriginal.replace(/^MANUAL · /, translate("giveaway.manual", "MANUAL") + " · "));
    }
    all("[data-sorteio-remove]", root).forEach(function (button) {
      phase8TranslateDynamicAttr(button, "aria-label", function (original) {
        var match = original.match(/^Remover (.+)$/);
        return match ? formatTranslation("giveaway.removeNamed", "Remover {name}", {name:match[1]}) : original;
      });
    });
    all(".sorteio-live-user-mark", root).forEach(function (mark) { setAttr(mark, "title", translate("giveaway.validatedEntry", "Entrada validada pelo Evil Guardians")); });
    var clearBtn = one("#sorteioClearBtn", root);
    if (clearBtn && clearBtn.title) {
      phase8TranslateDynamicAttr(clearBtn, "title", function (original) {
        if (/lista unificada/.test(original)) return translate("giveaway.clearUnifiedTitle", original);
        if (/participantes desta rodada/.test(original)) return translate("giveaway.clearRoundTitle", original);
        return original;
      });
    }
    phase8RedrawEmptySorteioCanvas();
  }

  var PHASE8_MOBILE_TITLES = {
    "HOME":"mobile.home", "DIGIDEX":"mobile.digidex", "DIGIVOLUTION":"mobile.digivolution", "COMPARAÇÃO":"mobile.comparison", "COUNTER FINDER":"mobile.counter",
    "HIDDEN QUESTS":"mobile.hidden", "TEAM BUILDER":"mobile.builder", "STATUS SIMULATOR":"mobile.status", "ELEMENTOS":"mobile.elements", "PVP":"mobile.pvp",
    "CALCULADORA":"mobile.calculator", "RAID BOSS":"mobile.raid", "DEKYU TREASURE":"mobile.dekyu", "TIER LIST DSR":"mobile.tierDsr", "TIER LIST DMO":"mobile.tierDmo",
    "SORTEIO":"mobile.giveaway", "COMUNIDADE":"mobile.community"
  };

  function applyMobilePageTitleTranslation() {
    var element = document.getElementById("hgMobilePageTitle");
    if (!element) return;
    var raw = String(element.textContent || "").replace(/\s+/g, " ").trim();
    var canonical = element.getAttribute("data-hg-mobile-canonical") || "";
    if (PHASE8_MOBILE_TITLES[raw]) {
      canonical = raw;
      element.setAttribute("data-hg-mobile-canonical", canonical);
    }
    if (!canonical) return;
    setText(element, translate(PHASE8_MOBILE_TITLES[canonical] || "", canonical));
  }

  function phase8TranslateDialogMessage(message) {
    var text = String(message == null ? "" : message);
    var exact = {
      "A Tier List precisa ter pelo menos uma tier.":"tier.dialog.needOne",
      "Resetar a Tier List DSR? As tiers personalizadas e posições salvas neste navegador serão apagadas.":"tier.dialog.resetDsr",
      "Resetar a Tier List DMO? As tiers personalizadas e posições salvas serão apagadas. Seus ícones enviados permanecerão disponíveis.":"tier.dialog.resetDmo",
      "O gerador de imagem ainda não carregou. Atualize a página e tente novamente.":"tier.dialog.generatorMissing",
      "Não foi possível gerar o PNG da Tier List. Atualize a página e tente novamente.":"tier.dialog.pngDsrError",
      "Não foi possível gerar o PNG. Se algum ícone externo ainda estiver carregando, aguarde alguns segundos e tente novamente.":"tier.dialog.pngDmoError",
      "Escolha um arquivo de imagem.":"tier.dialog.chooseImage",
      "Use uma imagem de até 8 MB.":"tier.dialog.max8mb",
      "Não foi possível ler essa imagem.":"tier.dialog.readImageError",
      "Escolha uma imagem primeiro.":"tier.dialog.chooseImageFirst",
      "Digite o nome do Digimon.":"tier.dialog.enterDigimonName",
      "Não foi possível salvar o ícone neste navegador. Tente uma imagem menor.":"tier.dialog.saveIconError"
    };
    if (exact[text]) return translate(exact[text], text);
    var m = text.match(/^Excluir a tier ["“](.+?)["”]\?( Os Digimons dela voltarão para disponíveis\.)?$/);
    if (m) return formatTranslation("tier.dialog.deleteTier", 'Excluir a tier "{name}"?{extra}', {name:m[1], extra:m[2] ? translate("tier.dialog.returnDigis", " Os Digimons dela voltarão para disponíveis.") : ""});
    m = text.match(/^Excluir o ícone personalizado ["“](.+?)["”] deste navegador\?$/);
    if (m) return formatTranslation("tier.dialog.deleteCustom", 'Excluir o ícone personalizado "{name}" deste navegador?', {name:m[1]});
    var pvpTranslated = phase9TranslatePvpDialogMessage(text);
    if (pvpTranslated !== text) return pvpTranslated;
    return phase8TranslateSorteioPhrase(text);
  }

  function installPhase8DialogTranslationHooks() {
    if (window.__hgPhase8DialogsInstalled) return;
    window.__hgPhase8DialogsInstalled = true;
    if (typeof window.alert === "function") {
      var originalAlert = window.alert.bind(window);
      window.alert = function (message) { return originalAlert(phase8TranslateDialogMessage(message)); };
    }
    if (typeof window.confirm === "function") {
      var originalConfirm = window.confirm.bind(window);
      window.confirm = function (message) { return originalConfirm(phase8TranslateDialogMessage(message)); };
    }
    if (typeof window.open === "function" && !window.open.__hgPhase8Wrapped) {
      var originalOpen = window.open;
      var wrappedOpen = function () {
        var popup = originalOpen.apply(window, arguments);
        try {
          if (popup && popup.document && typeof popup.document.write === "function") {
            var originalWrite = popup.document.write.bind(popup.document);
            popup.document.write = function (html) {
              var next = String(html == null ? "" : html)
                .replace("Preparando autorização da Twitch...", translate("giveaway.preparingTwitchAuth", "Preparando autorização da Twitch..."))
                .replace("Preparando autorização da Kick...", translate("giveaway.preparingKickAuth", "Preparando autorização da Kick..."));
              return originalWrite(next);
            };
          }
        } catch (error) { /* popup may become cross-origin later */ }
        return popup;
      };
      wrappedOpen.__hgPhase8Wrapped = true;
      window.open = wrappedOpen;
    }
  }



  /* =====================================================
     PHASE 9 — PVP FINAL BOSS
     Complete presentation-only localization for Team Builder, Import,
     Challenge Room, Draft, Ban, Formation, Battle and Substitution.
     Gameplay/network/state logic remains untouched.
  ===================================================== */

  function phase9PvpExactMap() {
    return dictionary(currentLanguage).__pvpExact || {};
  }

  function phase9PvpExact(raw) {
    var text = String(raw == null ? "" : raw);
    var map = phase9PvpExactMap();
    return Object.prototype.hasOwnProperty.call(map, text) ? String(map[text]) : text;
  }

  function phase9PvpStageLabel(stage, level) {
    var raw = String(stage || "").replace(/\s+/g, " ").trim();
    var canonical = raw;
    var upper = raw.toUpperCase();
    if (/ROOKIE|성장기/.test(upper) || /성장기/.test(raw)) canonical = "Rookie";
    else if (/CHAMPION|성숙기/.test(upper) || /성숙기/.test(raw)) canonical = "Champion";
    else if (/ULTIMATE|완전체/.test(upper) || /완전체/.test(raw)) canonical = "Ultimate";
    else if (/MEGA|궁극체/.test(upper) || /궁극체/.test(raw)) canonical = "Mega";
    if (currentLanguage === "ko-KR") {
      var info = koStageData(canonical);
      var label = info ? info.ko + " (" + info.ref + ")" : canonical;
      return level ? label + " · LV. " + level : label;
    }
    return (canonical || raw).toUpperCase() + (level ? " · LV. " + level : "");
  }

  function phase9PvpOriginalText(node) {
    if (!node) return "";
    var current = String(node.nodeValue || "");
    if (node.__hgPvpOriginalText == null ||
        (node.__hgPvpLastTranslated != null && current !== node.__hgPvpLastTranslated)) {
      node.__hgPvpOriginalText = current;
    }
    return String(node.__hgPvpOriginalText || "");
  }

  function phase9PvpTranslatePattern(raw) {
    var text = String(raw == null ? "" : raw).replace(/\s+/g, " ").trim();
    if (!text) return text;

    var exact = phase9PvpExact(text);
    if (exact !== text) return exact;

    var stageOnly = text.match(/^(ROOKIE|CHAMPION|ULTIMATE|MEGA)$/i);
    if (stageOnly) return phase9PvpStageLabel(stageOnly[1], null);

    var stageLv = text.match(/^(ROOKIE|CHAMPION|ULTIMATE|MEGA)\s*·\s*LV\.\s*(\d+)$/i);
    if (stageLv) return phase9PvpStageLabel(stageLv[1], stageLv[2]);

    var slot = text.match(/^SLOT\s+(\d+)$/i);
    if (slot && currentLanguage === "ko-KR") return "슬롯 (Slot) " + slot[1];

    var selectMore = text.match(/^SELECT\s+(\d+)\s+MORE$/i);
    if (selectMore) {
      if (currentLanguage === "ko-KR") return selectMore[1] + "마리 더 선택";
      if (currentLanguage === "en-US") return "SELECT " + selectMore[1] + " MORE";
    }

    var digiCount = text.match(/^(\d+)\s+DIGIMONS\s*·\s*(ROOKIE|CHAMPION|ULTIMATE|MEGA)\s*·\s*LV\.\s*(\d+)$/i);
    if (digiCount) {
      if (currentLanguage === "ko-KR") return digiCount[1] + " 디지몬 · " + phase9PvpStageLabel(digiCount[2], digiCount[3]);
      return digiCount[1] + " DIGIMONS · " + phase9PvpStageLabel(digiCount[2], digiCount[3]);
    }

    var spaces = text.match(/^(\d+)\s*\/\s*16\s+ESPAÇOS$/i);
    if (spaces) {
      if (currentLanguage === "ko-KR") return spaces[1] + " / 16 슬롯";
      if (currentLanguage === "en-US") return spaces[1] + " / 16 SLOTS";
    }

    var total = text.match(/^TOTAL:\s*(.+)$/i);
    if (total) {
      if (currentLanguage === "ko-KR") return "합계 (Total): " + total[1];
      if (currentLanguage === "en-US") return "TOTAL: " + total[1];
    }

    var deckSummary = text.match(/^ATTRBOOST\s+(.+?)\s*·\s*REDUCE\s+(.+)$/i);
    if (deckSummary && currentLanguage === "ko-KR") return "속성 강화 (Attr Boost) " + deckSummary[1] + " · 피해 감소 (Reduce) " + deckSummary[2];

    var choose = text.match(/^(.+?)\s+escolhe\s+(\d+)\s+Digimons?\.?$/i);
    if (choose) {
      if (currentLanguage === "ko-KR") return choose[1] + "님이 디지몬 " + choose[2] + "마리를 선택합니다.";
      if (currentLanguage === "en-US") return choose[1] + " chooses " + choose[2] + " Digimon" + (choose[2] === "1" ? "" : "s") + ".";
    }

    var position = text.match(/^(.+?):\s*defina a posição dos 3 Digimons\.$/i);
    if (position) {
      if (currentLanguage === "ko-KR") return position[1] + ": 3마리 디지몬의 포지션을 정하세요.";
      if (currentLanguage === "en-US") return position[1] + ": set the position of the 3 Digimon.";
    }

    var round = text.match(/^ROUND\s+(\d+)$/i);
    if (round) {
      if (currentLanguage === "ko-KR") return "라운드 (Round) " + round[1];
      return "ROUND " + round[1];
    }

    var turns = text.match(/^(\d+)\s+turnos?\s+restantes?$/i);
    if (turns) {
      if (currentLanguage === "ko-KR") return "남은 턴 " + turns[1] + "회";
      if (currentLanguage === "en-US") return turns[1] + " turn" + (turns[1] === "1" ? "" : "s") + " remaining";
    }

    var hpSp = text.match(/^HP\s+([\d.,]+)\s*·\s*SP\s+([\d.,]+)$/i);
    if (hpSp && currentLanguage === "ko-KR") return "체력 (HP) " + hpSp[1] + " · 스태미나 (SP) " + hpSp[2];

    var burst = text.match(/^([FB])\s*·\s*BURST\s+(\d+)\/5$/i);
    if (burst && currentLanguage === "ko-KR") return burst[1] + " · 버스트 (Burst) " + burst[2] + "/5";

    return text;
  }

  function phase9PvpTranslateTextNodes(root) {
    if (!root || !document.createTreeWalker) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var node;
    while ((node = walker.nextNode())) {
      var parent = node.parentElement;
      if (!parent || /^(SCRIPT|STYLE|TEXTAREA|OPTION)$/i.test(parent.tagName || "")) continue;
      var original = phase9PvpOriginalText(node);
      var match = original.match(/^(\s*)([\s\S]*?)(\s*)$/);
      var core = match ? match[2] : original;
      var translated = phase9PvpTranslatePattern(core);
      var next = (match ? match[1] : "") + translated + (match ? match[3] : "");
      if (node.nodeValue !== next) node.nodeValue = next;
      node.__hgPvpLastTranslated = next;
    }
  }

  function phase9PvpTrackOriginal(element, attrName) {
    if (!element) return "";
    var originalAttr = "data-hg-pvp-" + attrName + "-original";
    var lastAttr = "data-hg-pvp-" + attrName + "-last";
    var current = attrName === "text" ? String(element.textContent || "").replace(/\s+/g, " ").trim() : String(element.getAttribute(attrName) || "");
    var original = element.getAttribute(originalAttr) || "";
    var last = element.getAttribute(lastAttr) || "";
    if (!original || (last && current !== last)) {
      original = current;
      element.setAttribute(originalAttr, original);
    }
    return original;
  }

  function phase9PvpSetTrackedText(element, next) {
    if (!element) return;
    var value = String(next == null ? "" : next);
    setText(element, value);
    element.setAttribute("data-hg-pvp-text-last", value);
  }

  function phase9PvpApplyDigimonNames(root) {
    if (!root) return;
    var selectors = [
      ".pvp-slot-name", ".pvp-picker-copy > strong", ".pvp-build-tab-copy > strong", "#pvpBuildCurrentName",
      ".pvp-imported-ready-copy > strong", ".pvp-draft-digi > strong", ".pvp-draft-pick > b",
      ".pvp-ban-card > strong", ".pvp-formation-card > strong", ".pvp-battle-unit-name", ".pvp-turn-item > span",
      ".pvp-target-name-line > strong", ".pvp-hud-digi-top strong", ".pvp-sub-card > strong", ".pvp-draft-hover-head strong"
    ].join(",");
    all(selectors, root).forEach(function (element) {
      var current = String(element.textContent || "").replace(/\s+/g, " ").trim();
      if (!current || /^(SELECT DIGIMON|DIGIMON|EMPTY|EMPTY SLOT|AGUARDANDO\.\.\.)$/i.test(current)) return;
      var original = element.getAttribute("data-hg-pvp-digimon-original") || "";
      var last = element.getAttribute("data-hg-pvp-digimon-last") || "";
      if (!original || (last && current !== last)) {
        original = current.replace(/^(.+?)\s+\([^()]+\)$/,"$1");
        /* If the visible name is already Korean, recover its English key. */
        if (/[가-힣]/.test(original)) {
          var entries = phase6KoreanSearchEntries();
          var found = entries.find(function (entry) { return original === entry.ko || current.indexOf(entry.ko) === 0; });
          if (found) original = found.en;
        }
        element.setAttribute("data-hg-pvp-digimon-original", original);
      }
      var next = currentLanguage === "ko-KR" ? phase5DigimonDisplay(original) : original;
      if (element.textContent !== next) element.textContent = next;
      element.setAttribute("data-hg-pvp-digimon-last", next);
    });
  }

  function phase9PvpApplyStageLabels(root) {
    if (!root) return;
    all("#pvpStageLabel, #pvpStageOptions button, #pvpMatchCreateStage option, #pvpMatchRoomStage, #pvpDraftStage, .pvp-slot-meta, .pvp-current-stage, .pvp-picker-copy small, .pvp-draft-digi > small, .pvp-ban-card > small", root).forEach(function (element) {
      var raw = String(element.textContent || "").replace(/\s+/g, " ").trim();
      var tag = String(element.tagName || "").toUpperCase();

      /* OPTION não passa pelo tradutor de text nodes. Por isso, depois de virar
         궁극체 (Mega), por exemplo, ele precisava ser restaurado explicitamente
         ao sair do coreano. O value continua canônico e é a fonte mais segura. */
      if (tag === "OPTION") {
        var optionSource = String(element.value || element.getAttribute("data-hg-pvp-stage-original") || raw).trim();
        var optionMatch = optionSource.match(/(ROOKIE|CHAMPION|ULTIMATE|MEGA)/i) || raw.match(/\((ROOKIE|CHAMPION|ULTIMATE|MEGA)\)/i);
        if (!optionMatch) return;
        var optionStage = optionMatch[1].charAt(0).toUpperCase() + optionMatch[1].slice(1).toLowerCase();
        element.setAttribute("data-hg-pvp-stage-original", optionStage);
        setText(element, phase9PvpStageLabel(optionStage, null));
        return;
      }

      var m = raw.match(/(ROOKIE|CHAMPION|ULTIMATE|MEGA)(?:\s*·\s*LV\.\s*(\d+))?/i);
      if (!m) return;
      var original = element.getAttribute("data-hg-pvp-stage-original") || (m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase());
      element.setAttribute("data-hg-pvp-stage-original", original);
      var level = m[2] || "";
      var nextStage = phase9PvpStageLabel(original, level || null);
      if (/^\s*(ROOKIE|CHAMPION|ULTIMATE|MEGA)/i.test(raw)) {
        var consumed = m[0];
        var suffix = raw.slice(consumed.length);
        setText(element, nextStage + suffix);
      }
    });
  }

  function phase9PvpApplyReferences(root) {
    if (!root) return;
    all(".pvp-stat-input > span, .pvp-summary-game-stat, .pvp-extra-status-list strong, .pvp-meta-icon-group > small, .pvp-target-asset-badge > small", root).forEach(function (element) {
      var key = canonicalReferenceKey(element.textContent);
      if (key) applyReferenceLabel(element, key, true);
    });
    all(".pvp-element-icon-tag", root).forEach(function (tag) {
      var img = one("img[data-pvp-element]", tag);
      var original = img ? String(img.getAttribute("data-pvp-element") || "").trim().toUpperCase() : String(tag.getAttribute("title") || "").trim().toUpperCase();
      if (!original) return;
      var label = currentLanguage === "ko-KR" ? phase5ElementLabel(original) : original;
      setAttr(tag, "title", label);
      if (img) setAttr(img, "alt", label);
      var b = one("b", tag); if (b) setText(b, label);
    });
  }

  function phase9PvpTranslateAttrs(root) {
    if (!root) return;
    var picker = one("#pvpPickerSearch", root);
    if (picker) setAttr(picker, "placeholder", translate("pvp9.searchPlaceholder", "Search Digimon..."));
    var close = one(".pvp-picker-close", root);
    if (close) setAttr(close, "aria-label", translate("pvp9.close", "Close"));
    all("#pvpSlots .pvp-slot", root).forEach(function (slot) {
      var n = slot.getAttribute("data-slot") || "";
      setAttr(slot, "aria-label", formatTranslation("pvp9.selectSlotAria", "Select Digimon for slot {slot}", {slot:n}));
      var remove = one(".pvp-slot-remove", slot); if (remove) setAttr(remove, "title", translate("pvp9.remove", "Remove"));
    });
    var gauge = one("#pvpBattleGaugeSegments", root);
    if (gauge) setAttr(gauge, "aria-label", translate("pvp9.subGaugeAria", "Substitution gauge"));
  }

  function phase9PvpTranslateEffectText(text) {
    var raw = String(text || "");
    if (currentLanguage !== "ko-KR") return raw;
    var out = raw;
    var elementPairs = Object.keys(koDataMap("__elements") || {}).sort(function(a,b){return b.length-a.length});
    out = out.replace(/Has a (\d+(?:\.\d+)?)% chance to activate on attack\./gi, "공격 시 $1% 확률로 발동합니다.")
      .replace(/Deals damage over time each turn\./gi, "매 턴 지속 피해를 줍니다.")
      .replace(/Increases (STR|INT|DEF|RES|SPD) by (\d+(?:\.\d+)?)%/gi, function(_,s,n){var info=koreanReferenceData(s);return (info?info.ko+" ("+info.ref+")":s)+"을(를) "+n+"% 증가시킵니다.";})
      .replace(/Decreases (STR|INT|DEF|RES|SPD) by (\d+(?:\.\d+)?)%/gi, function(_,s,n){var info=koreanReferenceData(s);return (info?info.ko+" ("+info.ref+")":s)+"을(를) "+n+"% 감소시킵니다.";})
      .replace(/Unable to act\./gi, "행동할 수 없습니다.")
      .replace(/Damage over time\./gi, "지속 피해를 받습니다.")
      .replace(/Defense reduced\./gi, "방어력이 감소합니다.")
      .replace(/Status effect\./gi, "상태 이상 효과입니다.");
    elementPairs.forEach(function (el) {
      var info = koElementData(el); if (!info) return;
      var esc = el.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      out = out.replace(new RegExp("Becomes vulnerable to " + esc + " attribute\\.", "gi"), info.ko + " (" + info.ref + ") 속성에 취약해집니다.");
      out = out.replace(new RegExp("Removed when hit by " + esc + " attribute\\.", "gi"), info.ko + " (" + info.ref + ") 속성 공격을 받으면 해제됩니다.");
    });
    return out;
  }

  function phase9PvpApplySkillTooltips(root) {
    if (!root) return;
    all(".pvp-skill-tooltip p, .pvp-skill-hover > p, .pvp-skill-hover-info + p", root).forEach(function (element) {
      var original = element.getAttribute("data-hg-pvp-effect-original") || String(element.textContent || "").trim();
      element.setAttribute("data-hg-pvp-effect-original", original);
      setText(element, phase9PvpTranslateEffectText(original));
    });
    all(".pvp-skill-tooltip-title > b", root).forEach(function (element) {
      var original = element.getAttribute("data-hg-pvp-element-original") || String(element.textContent || "").trim().toUpperCase();
      element.setAttribute("data-hg-pvp-element-original", original);
      setText(element, currentLanguage === "ko-KR" ? phase5ElementLabel(original) : original);
    });
  }

  function phase9TranslatePvpDialogMessage(message) {
    var text = String(message == null ? "" : message);
    var map = dictionary(currentLanguage).__pvpDialogs || {};
    if (Object.prototype.hasOwnProperty.call(map, text)) return String(map[text]);
    var m = text.match(/^Não foi possível importar o time PvP\.\n\n([\s\S]+)$/);
    if (m) return formatTranslation("pvp9.dialog.importFailed", "Could not import the PvP team.\n\n{error}", {error:m[1]});
    m = text.match(/^(.+?), deseja realmente desistir da partida\? O oponente será declarado vencedor\.$/);
    if (m) return formatTranslation("pvp9.dialog.surrender", "{name}, do you really want to surrender? Your opponent will be declared the winner.", {name:m[1]});
    return text;
  }

  function applyPvpStaticTranslations() {
    var root = document.getElementById("pvpPagina");
    if (!root) return;
    phase9PvpTranslateTextNodes(root);
    phase9PvpApplyStageLabels(root);
    phase9PvpApplyReferences(root);
    phase9PvpApplyDigimonNames(root);
    phase9PvpTranslateAttrs(root);
    phase9PvpApplySkillTooltips(root);
  }

  function applyPvpDynamicTranslations() {
    var root = document.getElementById("pvpPagina");
    if (!root) return;
    phase9PvpTranslateTextNodes(root);
    phase9PvpApplyStageLabels(root);
    phase9PvpApplyReferences(root);
    phase9PvpApplyDigimonNames(root);
    phase9PvpTranslateAttrs(root);
    phase9PvpApplySkillTooltips(root);
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
    applyElementsStaticTranslations();
    applyCommunityStaticTranslations();
    applyDisplaySettingsTranslations();
    applyComparisonStaticTranslations();
    applyContentNavTranslations();
    applyTierListDsrStaticTranslations();
    applyTierListDmoStaticTranslations();
    applySorteioStaticTranslations();
    applyPvpStaticTranslations();
    applyMobilePageTitleTranslation();
    /* A header principal é estática, mas não usa data-i18n porque os ícones
       são inseridos pelo script do site. Traduzimos seus rótulos diretamente
       toda vez que o idioma muda. */
    var navLabels = [
      ["#btnHome > span", "nav.home", "Home"],
      ["#btnDatabase > span", "nav.digidex", "DIGIDEX"],
      ["#btnBuilder > span", "nav.teamBuilder", "Team Builder"],
      ["#btnElementos > span", "nav.elements", "Elementos"],
      ["#btnCalculadora > span", "nav.calculator", "Calculadora"],
      ["#btnPvp > span", "nav.pvp", "PvP"],
      ["#btnFeatures > span", "nav.content", "Conteúdos"],
      ["#btnSocial > span", "nav.community", "Comunidade"],
      ["#btnMore > span:not(.hg-more-dots):not(.nav-dropdown-chevron)", "nav.more", "Mais"]
    ];
    navLabels.forEach(function (entry) { setText(one(entry[0]), translate(entry[1], entry[2])); });
    setText(one("#btnDigiGuessContent"), translate("digi.menuGuess", "DIGI GUESS"));
    setText(one("#btnDigiZoomContent"), translate("digi.menuZoom", "DIGI ZOOM"));
    setText(one(".hg-nav-more-heading small"), translate("more.tools", "MAIS FERRAMENTAS //"));
    setText(one(".hg-nav-more-heading strong"), translate("more.shortcuts", "ATALHOS HG"));
    setText(one("#btnComparacao > span"), translate("more.comparison", "COMPARAÇÃO"));
    setText(one("#btnCounterFinder > span"), translate("more.counterFinder", "COUNTER FINDER"));
    setText(one("#btnHiddenQuests > span"), translate("more.hiddenQuests", "HIDDEN QUESTS"));
    setText(one("#btnStatusSimulator > span"), translate("more.statusSimulator", "Status Simulator"));
    setText(one("#btnRaidBoss > span"), translate("more.raidBoss", "Raid Boss"));
    setText(one("#btnDekyuTreasure > span"), translate("more.dekyuTreasure", "Dekyu Treasure"));
    setText(one("#btnDisplaySettings > span:last-child"), translate("more.displaySettings", "Ajuste de Tela"));
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
    var codes = ["SEG", "TER", "QUA", "QUI", "SEX", "SAB", "DOM"];
    var resolved = false;
    var aliases = {
      SEG: ["segunda-feira", "segunda"],
      TER: ["terça-feira", "terça", "terca-feira", "terca"],
      QUA: ["quarta-feira", "quarta"],
      QUI: ["quinta-feira", "quinta"],
      SEX: ["sexta-feira", "sexta"],
      SAB: ["sábado", "sabado", "SÁB", "SAB"],
      DOM: ["domingo"]
    };

    /* O texto da OFD é dinâmico e pode já estar em PT, EN ou KO quando o
       usuário troca o idioma novamente. Sempre reconhecemos TODAS as versões
       conhecidas e só então escrevemos a versão do idioma atual. */
    codes.forEach(function (code) {
      var variants = (aliases[code] || []).slice();
      Object.keys(LANGUAGE_META).forEach(function (language) {
        var data = dictionary(language);
        ["full", "short"].forEach(function (form) {
          var label = data["weekday." + code + "." + form];
          if (label != null && String(label).trim()) variants.push(String(label).trim());
        });
      });
      variants.push(code);
      variants = variants.filter(function (item, index, list) {
        var normalized = String(item || "").toLocaleLowerCase();
        return normalized && list.findIndex(function (other) {
          return String(other || "").toLocaleLowerCase() === normalized;
        }) === index;
      }).sort(function (a, b) { return String(b).length - String(a).length; });

      if (!variants.length) return;
      var escaped = variants.map(function (item) {
        return String(item).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      });
      var pattern = new RegExp("(" + escaped.join("|") + ")(?=\\s|,|•|$)", "i");
      if (resolved || !pattern.test(text)) return;
      var output = translate("weekday." + code + "." + (shortForm ? "short" : "full"), shortForm ? code : code);
      text = text.replace(pattern, String(output));
      resolved = true;
    });
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
      all(".raid-home-map-preview-kicker", card).forEach(function (el) { setText(el, translate("home.spawnMap", "MAPA DE SPAWN")); });
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

    /* PHASE 6: o carousel da HOME é reconstruído pelo renderer principal.
       Aplicamos nomes KO do boss/mapa aqui para cobrir também o slide visível. */
    phase6ApplyHomeRaidAndOverflowNames();
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
      applyBuilderDynamicTranslations();
      applyStatusSimulatorDynamicTranslations();
      applyCalculatorDynamicTranslations();
      applyElementsDynamicTranslations();
      applyCommunityDynamicTranslations();
      applyDisplaySettingsTranslations();
      applyComparisonDynamicTranslations();
      applyTierListDsrDynamicTranslations();
      applyTierListDmoDynamicTranslations();
      applySorteioDynamicTranslations();
      applyPvpDynamicTranslations();
      applyMobilePageTitleTranslation();
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
        case "elementosPagina":
          applyElementsDynamicTranslations();
          break;
        case "socialPagina":
          applyCommunityDynamicTranslations();
          break;
        case "comparacaoPagina":
          applyComparisonDynamicTranslations();
          break;
        case "tierListPagina":
          applyTierListDsrDynamicTranslations();
          break;
        case "tierListDmoPagina":
          applyTierListDmoDynamicTranslations();
          break;
        case "sorteioPagina":
          applySorteioDynamicTranslations();
          break;
        case "pvpPagina":
          applyPvpDynamicTranslations();
          break;
        case "hgDisplaySettingsPanel":
          applyDisplaySettingsTranslations();
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
    ["criarElementos", "mostrarElementoSelecionado"].forEach(function (name) {
      wrapRuntimeFunction(name, function () { applyDynamicTranslationsForRoot("elementosPagina"); });
    });
    ["renderCommunityLinks", "carregarComunidade", "toggleCommunityPlatform"].forEach(function (name) {
      wrapRuntimeFunction(name, function () { applyDynamicTranslationsForRoot("socialPagina"); });
    });
    ["setQuantidadeComparacao", "renderizarSelectoresComparacao", "atualizarSugestoesComparacao", "selecionarDigimonComparacao", "renderizarComparacao"].forEach(function (name) {
      wrapRuntimeFunction(name, function () { applyDynamicTranslationsForRoot("comparacaoPagina"); });
    });
    ["abrirHgDisplaySettings", "atualizarHgDisplaySettingsUi"].forEach(function (name) {
      wrapRuntimeFunction(name, function () { applyDisplaySettingsTranslations(); });
    });
    ["tierListRenderizar", "tierListRenderizarRows", "tierListRenderizarPool", "tierListAplicarFiltros", "tierListSincronizarFiltrosCustom", "tierListMostrarTooltip", "tierListAdicionarTier", "tierListAlternarModoStream", "tierListExportarPng"].forEach(function (name) {
      wrapRuntimeFunction(name, function () { applyDynamicTranslationsForRoot("tierListPagina"); });
    });
    ["tierListDmoRenderizar", "tierListDmoRenderizarRows", "tierListDmoRenderizarPool", "tierListDmoAplicarFiltros", "tierListDmoSelecionarRank", "tierListDmoAdicionarTier", "tierListDmoAlternarModoStream", "tierListDmoAbrirUpload", "tierListDmoReceberArquivo", "tierListDmoFecharUpload", "tierListDmoExportarPng"].forEach(function (name) {
      wrapRuntimeFunction(name, function () { applyDynamicTranslationsForRoot("tierListDmoPagina"); });
    });
    ["sorteioAtualizarFonteUI", "sorteioAtualizarEstadoInscricoes", "sorteioRenderParticipantes", "sorteioRenderHistorico", "sorteioRegistrarVencedor", "sorteioDefinirFeedback", "sorteioAtualizarTudo", "sorteioDesenhar", "sorteioAlternarModoStream"].forEach(function (name) {
      wrapRuntimeFunction(name, function () { applyDynamicTranslationsForRoot("sorteioPagina"); });
    });
    ["pvpCriarSlots", "pvpAtualizarTodosSlots", "pvpAtualizarSlotVisual", "pvpRenderPicker", "pvpRenderBuildTabs", "pvpRenderBuildAtual", "pvpRenderBabyGrid", "pvpRenderTetrisGrid", "pvpRenderBuffGrid", "pvpRenderElementDeck", "pvpRenderSkills", "pvpRenderSummary", "pvpAtualizarResumosWizard", "pvpMatchAtualizarTeamCheck", "pvpMatchSetConnection", "pvpMatchRenderWaiting", "pvpMatchRenderDraft", "pvpMatchRenderBan", "pvpMatchRenderFormation", "pvpBattleRender", "pvpBattleRenderOpponentLabel", "pvpBattleRenderTarget", "pvpBattleRenderFields", "pvpBattleRenderTurnQueue", "pvpBattleRenderSkills", "pvpBattleRenderLog", "pvpBattleRenderControls", "pvpBattleRenderSubstitution"].forEach(function (name) {
      wrapRuntimeFunction(name, function () { applyDynamicTranslationsForRoot("pvpPagina"); });
    });
    wrapRuntimeFunction("hgAtualizarTituloHeader", function () { applyMobilePageTitleTranslation(); });

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
    [document.getElementById("homePagina"), document.getElementById("hiddenQuestsPagina"), document.getElementById("databasePagina"), document.getElementById("counterFinderPagina"), document.getElementById("raidBossPagina"), document.getElementById("dekyuTreasurePagina"), document.getElementById("builderPagina"), document.getElementById("statusSimulatorPagina"), document.getElementById("calculadoraPagina"), document.getElementById("elementosPagina"), document.getElementById("socialPagina"), document.getElementById("comparacaoPagina"), document.getElementById("tierListPagina"), document.getElementById("tierListDmoPagina"), document.getElementById("sorteioPagina"), document.getElementById("pvpPagina"), document.getElementById("hgDisplaySettingsPanel"), document.getElementById("hgImpmonLive"), document.getElementById("siteTopbar")].forEach(function (root) {
      if (!root) return;
      var observer = new MutationObserver(function (mutations) {
        /* IMPORTANTE: o header precisa ser corrigido mesmo se outra tradução estiver
           momentaneamente com o observer silenciado. O timer original escreve PT. */
        if (root.id === "siteTopbar") {
          applyHeaderEventTranslations();
          applyMobilePageTitleTranslation();
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
    installPhase8DialogTranslationHooks();
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
