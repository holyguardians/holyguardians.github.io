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

  function normalizeLanguage(value) {
    var raw = String(value || "").trim();
    if (LANGUAGE_META[raw]) return raw;
    return ALIASES[raw.toLowerCase()] || "";
  }

  function languageFromUrl() {
    try {
      return normalizeLanguage(new URL(window.location.href).searchParams.get("lang"));
    } catch (error) {
      return "";
    }
  }

  function languageFromStorage() {
    try {
      return normalizeLanguage(localStorage.getItem(STORAGE_KEY));
    } catch (error) {
      return "";
    }
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

  function applyStaticTranslations() {
    document.querySelectorAll("[data-i18n]").forEach(function (element) {
      var key = element.getAttribute("data-i18n");
      element.textContent = translate(key, element.textContent);
    });

    document.querySelectorAll("[data-i18n-aria-label]").forEach(function (element) {
      var key = element.getAttribute("data-i18n-aria-label");
      element.setAttribute("aria-label", translate(key, element.getAttribute("aria-label") || ""));
    });

    document.querySelectorAll("[data-i18n-title]").forEach(function (element) {
      var key = element.getAttribute("data-i18n-title");
      element.setAttribute("title", translate(key, element.getAttribute("title") || ""));
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

    document.querySelectorAll("[data-hg-language]").forEach(function (button) {
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
    } catch (error) {
      // URL support is optional; language switching still works without it.
    }
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
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    var menu = document.getElementById("hgLanguageMenu");
    if (!menu) return;
    if (menu.hidden) openMenu();
    else closeMenu();
  }

  function setLanguage(language, options) {
    var next = normalizeLanguage(language) || DEFAULT_LANGUAGE;
    var opts = options || {};
    currentLanguage = next;

    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch (error) {
      // Storage is optional.
    }

    document.documentElement.lang = LANGUAGE_META[next].htmlLang;
    applyStaticTranslations();
    updateLanguageUi();
    if (opts.updateUrl !== false) updateUrl(next);
    closeMenu();

    document.dispatchEvent(new CustomEvent("hg:languagechange", {
      detail: { language: next }
    }));
  }

  function init() {
    currentLanguage = languageFromUrl() || languageFromStorage() || DEFAULT_LANGUAGE;
    document.documentElement.lang = LANGUAGE_META[currentLanguage].htmlLang;

    var trigger = document.getElementById("hgLanguageTrigger");
    var menu = document.getElementById("hgLanguageMenu");
    if (trigger) trigger.addEventListener("click", toggleMenu);
    if (menu) menu.addEventListener("click", function (event) { event.stopPropagation(); });

    document.querySelectorAll("[data-hg-language]").forEach(function (button) {
      button.addEventListener("click", function () {
        setLanguage(button.getAttribute("data-hg-language"));
      });
    });

    document.addEventListener("click", function (event) {
      var switcher = document.getElementById("hgLanguageSwitcher");
      if (switcher && !switcher.contains(event.target)) closeMenu();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeMenu();
    });

    applyStaticTranslations();
    updateLanguageUi();
  }

  window.hgT = translate;
  window.hgSetLanguage = setLanguage;
  window.hgGetLanguage = function () { return currentLanguage; };
  window.hgApplyTranslations = applyStaticTranslations;

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
}());
