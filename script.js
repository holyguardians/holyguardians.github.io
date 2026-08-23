/* =====================================================
   HOLY GUARDIANS — I18N ENGINE
   PT-BR (base) / EN-US / KO-KR
===================================================== */
(function(){
  "use strict";

  const STORAGE_KEY = "hg_language";
  const LANG_QUERY = {"pt-BR":"pt","en-US":"en","ko-KR":"ko"};
  const QUERY_LANG = {pt:"pt-BR",br:"pt-BR","pt-br":"pt-BR",en:"en-US","en-us":"en-US",ko:"ko-KR",kr:"ko-KR","ko-kr":"ko-KR"};
  const META = {
    "pt-BR": {code:"PT", flag:"language_flags/br.svg", name:"Português"},
    "en-US": {code:"EN", flag:"language_flags/us.svg", name:"English"},
    "ko-KR": {code:"KO", flag:"language_flags/kr.svg", name:"한국어"}
  };

  window.hgIdiomaAtual = "pt-BR";

  function localeData(lang){ return (window.HG_I18N && window.HG_I18N[lang]) || {}; }
  function strings(lang){ return localeData(lang).strings || {}; }
  window.hgT = function(chave, fallback){
    const atual=strings(window.hgIdiomaAtual);
    const base=strings("pt-BR");
    if(Object.prototype.hasOwnProperty.call(atual,chave)) return atual[chave];
    if(Object.prototype.hasOwnProperty.call(base,chave)) return base[chave];
    return fallback !== undefined ? fallback : chave;
  };
  window.hgTFormat = function(chave,vars,fallback){
    let s=String(window.hgT(chave,fallback));
    Object.keys(vars||{}).forEach(function(k){s=s.replaceAll("{"+k+"}",String(vars[k]));});
    return s;
  };
  window.hgIntlLocale = function(){ return window.hgIdiomaAtual==="ko-KR"?"ko-KR":window.hgIdiomaAtual==="en-US"?"en-US":"pt-BR"; };

  function selectorAll(sel){ try{return Array.from(document.querySelectorAll(sel));}catch(e){return [];} }
  const textBindings={
    ".hg-nav-panel-head strong":"nav.navigation",
    "#btnHome > span":"nav.home","#btnDatabase > span":"nav.digidex","#btnBuilder > span":"nav.teamBuilder","#btnElementos > span":"nav.elements","#btnCalculadora > span":"nav.calculator","#btnPvp > span:not(.nav-dropdown-chevron)":"nav.pvp",
    "#pvpNavMenu button:nth-of-type(1)":"nav.pvpBuild","#pvpNavMenu button:nth-of-type(2)":"nav.importTeam","#pvpNavMenu button:nth-of-type(3)":"nav.match",
    "#btnFeatures > span:not(.nav-dropdown-chevron)":"nav.contents","#featuresNavMenu button:nth-of-type(1)":"nav.draw",
    "#btnSocial > span":"nav.community","#btnMore > span:not(.hg-more-dots):not(.nav-dropdown-chevron)":"nav.more",".hg-nav-more-heading small":"nav.moreTools",".hg-nav-more-heading strong":"nav.shortcuts",
    "#btnComparacao > span":"nav.comparison","#btnCounterFinder > span":"nav.counterFinder","#btnHiddenQuests > span":"nav.hiddenQuests","#btnStatusSimulator > span":"nav.statusSimulator","#btnRaidBoss > span":"nav.raidBoss","#btnDekyuTreasure > span":"nav.dekyuTreasure","#btnDisplaySettings > span:last-child":"nav.displaySettings",
    ".hg-nav-panel-foot button":"nav.closeMenu",
    ".hg-display-settings-head small":"display.interface","#hgDisplaySettingsTitle":"display.title",".hg-display-screen-info > div:nth-child(1) span":"display.screen",".hg-display-screen-info > div:nth-child(2) span":"display.viewport",".hg-display-screen-info > div:nth-child(3) span":"display.scale",
    ".hg-display-settings-section:nth-of-type(2) .hg-display-settings-label > span":"display.preset",".hg-display-settings-section:nth-of-type(2) .hg-display-settings-label > small":"display.saved",
    "[data-hg-display-preset=auto] b":"display.auto","[data-hg-display-preset=auto] small":"display.autoSub","[data-hg-display-preset=compact] b":"display.compact","[data-hg-display-preset=comfortable] b":"display.comfortable","[data-hg-display-preset=large] b":"display.large","[data-hg-display-preset=ultrawide] small":"display.ultrawideSub",
    ".hg-display-manual-section .hg-display-settings-label > span":"display.fine",".hg-display-reset":"display.reset",
    ".hero-welcome":"home.welcome",".hero-motto":"home.motto",".hero-actions .action-button:nth-child(1) .hg-i18n-action-label":"home.openDigidex",".hero-actions .action-button:nth-child(2) .hg-i18n-action-label":"home.buildTeam",
    ".raid-home-heading h2":"home.raidBosses",".hg-i18n-live-schedule":"home.liveSchedule",".ofd-home-panel .panel-heading h2":"home.ofdToday",".ofd-home-countdown small":"home.nextUpdate",".ofd-week-panel .panel-heading h2":"home.ofdWeekly",".ofd-week-copy strong":"home.chooseOtherDay",".ofd-week-copy small":"home.chooseDayHint",
    "[data-ofd-day=SEG] > span":"weekday.SEG.short","[data-ofd-day=SEG] > small":"weekday.SEG.full","[data-ofd-day=TER] > span":"weekday.TER.short","[data-ofd-day=TER] > small":"weekday.TER.full","[data-ofd-day=QUA] > span":"weekday.QUA.short","[data-ofd-day=QUA] > small":"weekday.QUA.full","[data-ofd-day=QUI] > span":"weekday.QUI.short","[data-ofd-day=QUI] > small":"weekday.QUI.full","[data-ofd-day=SEX] > span":"weekday.SEX.short","[data-ofd-day=SEX] > small":"weekday.SEX.full","[data-ofd-day=SAB] > span":"weekday.SAB.short","[data-ofd-day=SAB] > small":"weekday.SAB.full","[data-ofd-day=DOM] > span":"weekday.DOM.short","[data-ofd-day=DOM] > small":"weekday.DOM.full",
    ".servers-panel .panel-heading h2":"home.activeServers",".server-status":"home.active",".staff-panel .panel-heading h2":"home.staff",".staff-subs-title":"home.subs",".home-social-panel .panel-heading h2":"home.socials",".home-social-card.youtube .home-social-action":"home.openChannel",".home-social-card.twitch .home-social-action":"home.openChannel",".home-social-card.discord .home-social-action":"home.openServer",".footer-center-motto":"home.motto",
    ".hidden-quests-header .page-subtitle":"hidden.subtitle",".hidden-quests-source span":"hidden.source",".hidden-quests-alert-head small":"hidden.before",".hidden-quests-alert-head strong":"hidden.authorInfo",".hidden-quests-search label":"hidden.searchLabel",".hidden-quests-summary small":"hidden.archive"
  };
  const htmlBindings={
    ".hero-lead":"home.heroLead",".ofd-time-alert p":"home.ofdReset",".ofd-week-time-hint p":"home.cycleHint",".footer-right":"home.footer"
  };
  const attrBindings=[
    ["#hgHeaderCountdowns","aria-label","header.events"],[".hg-header-event-boss","title","header.openRaid"],[".hg-header-event-dekyu","title","header.openDekyu"],["#hgMobileNavToggle","aria-label","nav.openNavigation"],
    ["#btnDisplaySettings","aria-label","nav.displaySettings"],["#btnDisplaySettings","title","nav.displaySettings"],[".hg-display-settings-close","aria-label","display.close"],[".hg-display-manual-controls button:first-child","aria-label","display.decrease"],[".hg-display-manual-controls button:last-child","aria-label","display.increase"],["#hgDisplayScaleRange","aria-label","display.scaleAria"],
    ["#raidHomeCarousel","aria-label","home.raidSelect"],[".raid-home-arrow-prev","aria-label","home.raidPrev"],[".raid-home-arrow-next","aria-label","home.raidNext"],["#raidHomeDots","aria-label","home.raidSelect"],
    ["#hiddenQuestSearch","placeholder","hidden.searchPlaceholder"],["#hiddenQuestImageModal .hidden-quest-image-close","aria-label","hidden.closeImage"]
  ];

  function applyBindings(){
    Object.keys(textBindings).forEach(function(sel){selectorAll(sel).forEach(function(el){el.textContent=window.hgT(textBindings[sel],el.textContent);});});
    Object.keys(htmlBindings).forEach(function(sel){selectorAll(sel).forEach(function(el){el.innerHTML=window.hgT(htmlBindings[sel],el.innerHTML);});});
    attrBindings.forEach(function(b){selectorAll(b[0]).forEach(function(el){el.setAttribute(b[1],window.hgT(b[2],el.getAttribute(b[1])||""));});});
    selectorAll("[data-i18n]").forEach(function(el){el.textContent=window.hgT(el.dataset.i18n,el.textContent);});
    const meta=document.querySelector('meta[name="description"]'); if(meta)meta.content=window.hgT("meta.description",meta.content);
  }

  function updateSwitcher(){
    const m=META[window.hgIdiomaAtual]||META["pt-BR"];
    const flag=document.getElementById("hgLanguageCurrentFlag"),code=document.getElementById("hgLanguageCurrentCode"),btn=document.getElementById("hgLanguageButton");
    if(flag)flag.src=m.flag;if(code)code.textContent=m.code;
    if(btn){btn.setAttribute("aria-label",window.hgT("language.buttonAria"));btn.title=m.name;}
    selectorAll("[data-hg-lang]").forEach(function(el){const active=el.dataset.hgLang===window.hgIdiomaAtual;el.classList.toggle("ativo",active);el.setAttribute("aria-checked",active?"true":"false");});
  }

  function rerenderDynamic(){
    try{ if(typeof window.atualizarBotaoHgSomEventos==="function") window.atualizarBotaoHgSomEventos(); }catch(e){}
    try{ if(typeof window.renderizarRaidHomeCarousel==="function") window.renderizarRaidHomeCarousel(); }catch(e){}
    try{ if(typeof window.carregarOfdsHome==="function") window.carregarOfdsHome(); }catch(e){}
    try{ if(typeof window.atualizarHgHeaderCountdowns==="function") window.atualizarHgHeaderCountdowns(new Date()); }catch(e){}
    try{ if(typeof window.hiddenQuestAtualizarIdioma==="function") window.hiddenQuestAtualizarIdioma(); }catch(e){}
    try{
      const ativa=document.querySelector(".pagina.ativa");
      if(ativa && typeof window.hgAtualizarTituloHeader==="function") window.hgAtualizarTituloHeader(ativa.id);
    }catch(e){}
  }

  function setUrlLang(lang){
    try{
      const u=new URL(window.location.href);
      if(lang==="pt-BR")u.searchParams.delete("lang");else u.searchParams.set("lang",LANG_QUERY[lang]);
      history.replaceState(history.state,"",u.pathname+(u.search||"")+(u.hash||""));
    }catch(e){}
  }

  window.hgDefinirIdioma=function(lang,opcoes){
    opcoes=opcoes||{};
    if(!META[lang])lang="pt-BR";
    window.hgIdiomaAtual=lang;
    try{localStorage.setItem(STORAGE_KEY,lang);}catch(e){}
    document.documentElement.lang=lang==="ko-KR"?"ko":lang==="en-US"?"en":"pt-BR";
    if(opcoes.atualizarUrl!==false)setUrlLang(lang);
    applyBindings();updateSwitcher();if(opcoes.rerender!==false)rerenderDynamic();
    document.dispatchEvent(new CustomEvent("hg:languagechange",{detail:{language:lang}}));
    window.hgFecharLanguageMenu();
  };

  window.hgToggleLanguageMenu=function(event){
    if(event){event.preventDefault();event.stopPropagation();}
    const menu=document.getElementById("hgLanguageMenu"),btn=document.getElementById("hgLanguageButton");if(!menu||!btn)return;
    const open=menu.hidden;menu.hidden=!open;btn.setAttribute("aria-expanded",open?"true":"false");
  };
  window.hgFecharLanguageMenu=function(){const menu=document.getElementById("hgLanguageMenu"),btn=document.getElementById("hgLanguageButton");if(menu)menu.hidden=true;if(btn)btn.setAttribute("aria-expanded","false");};

  window.hgI18nHiddenRegionLabel=function(slug,fallback){
    const hd=(localeData(window.hgIdiomaAtual).hiddenQuests||{}).regions||{};
    const base=(localeData("pt-BR").hiddenQuests||{}).regions||{};
    return hd[slug]||base[slug]||fallback||slug;
  };
  window.hgI18nHiddenIntro=function(baseIntro){
    const hd=localeData(window.hgIdiomaAtual).hiddenQuests||{};
    return Array.isArray(hd.intro)?hd.intro:(Array.isArray(baseIntro)?baseIntro:[]);
  };
  window.hgI18nLocalizarHiddenQuest=function(q){
    if(!q)return q;
    const lang=window.hgIdiomaAtual;
    const hd=localeData(lang).hiddenQuests||{};
    const tr=(hd.quests||{})[q.code]||{};
    const clone=Object.assign({},q);
    clone._baseTitle=q.title;clone._baseSteps=Array.isArray(q.steps)?q.steps.slice():[];clone._baseRegion=q.region;
    if(lang==="ko-KR")clone.title=tr.title||q.korean||q.title;else clone.title=tr.title||q.title;
    if(Array.isArray(tr.steps))clone.steps=tr.steps.slice();
    clone.region=window.hgI18nHiddenRegionLabel(q.regionSlug,q.region);
    clone.kind=window.hgT("hidden.kind."+String(q.kind||""),q.kind);
    if(Array.isArray(q.videos))clone.videos=q.videos.map(function(v,i){const nv=Object.assign({},v);if(Array.isArray(tr.videoLabels)&&tr.videoLabels[i])nv.label=tr.videoLabels[i];else if(lang!=="pt-BR"&&String(nv.label||"").toLowerCase().includes("guia em vídeo"))nv.label=window.hgT("hidden.videoGuide",nv.label);return nv;});
    return clone;
  };

  function initialLanguage(){
    let q="";try{q=(new URL(window.location.href)).searchParams.get("lang")||"";}catch(e){}
    if(q && QUERY_LANG[String(q).toLowerCase()])return QUERY_LANG[String(q).toLowerCase()];
    try{const saved=localStorage.getItem(STORAGE_KEY);if(META[saved])return saved;}catch(e){}
    return "pt-BR";
  }

  document.addEventListener("click",function(e){const sw=document.getElementById("hgLanguageSwitcher");if(sw&&!sw.contains(e.target))window.hgFecharLanguageMenu();});
  document.addEventListener("keydown",function(e){if(e.key==="Escape")window.hgFecharLanguageMenu();});
  document.addEventListener("DOMContentLoaded",function(){window.hgDefinirIdioma(initialLanguage(),{atualizarUrl:false,rerender:false});});
})();
