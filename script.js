
/* =====================================================
   GITHUB PAGES → HOLY GUARDIANS API
===================================================== */

const HG_API_URL = "https://script.google.com/macros/s/AKfycbxMJE0SjJhdHSupnoinJ6GlCxIOHwLl96uqjPDBGaAnGJHLrvZoWWz2-kPCvCQR0coe/exec";

function chamarApiJsonp(api, parametrosExtras) {
  return new Promise(function(resolve, reject) {
    const callback =
      "__hgCallback_" +
      Date.now() +
      "_" +
      Math.random()
        .toString(36)
        .slice(2);

    const script =
      document.createElement("script");

    const timer =
      setTimeout(function() {
        limpar();
        reject(
          new Error(
            "Tempo esgotado ao consultar a Holy Guardians API."
          )
        );
      }, 30000);

    function limpar() {
      clearTimeout(timer);

      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }

      try {
        delete window[callback];
      } catch (erro) {
        window[callback] = undefined;
      }
    }

    window[callback] =
      function(resposta) {
        limpar();

        if (
          !resposta ||
          resposta.ok !== true
        ) {
          reject(
            new Error(
              resposta && resposta.error
                ? resposta.error
                : "Resposta inválida da Holy Guardians API."
            )
          );
          return;
        }

        resolve(resposta);
      };

    script.onerror =
      function() {
        limpar();
        reject(
          new Error(
            "Não foi possível acessar a Holy Guardians API."
          )
        );
      };

    const extras = parametrosExtras && typeof parametrosExtras === "object"
      ? Object.keys(parametrosExtras).map(function(chave) {
          return "&" + encodeURIComponent(chave) + "=" + encodeURIComponent(parametrosExtras[chave]);
        }).join("")
      : "";

    script.src =
      HG_API_URL +
      "?api=" +
      encodeURIComponent(api) +
      extras +
      "&callback=" +
      encodeURIComponent(callback) +
      "&_=" +
      Date.now();

    document.head.appendChild(script);
  });
}


let database = [];

let imagensSite = {};

let filtroTypeSelecionado = "";
let filtroStageSelecionado = "";

const DIGIDEX_STAGES = ["ROOKIE", "CHAMPION", "ULTIMATE", "MEGA"];

const TYPE_ICONS = {
  DATA: "type_icons/type_data.png",
  VACCINE: "type_icons/type_vaccine.png",
  VIRUS: "type_icons/type_virus.png",
  UNKNOWN: "type_icons/type_unknown.png",
  FREE: "type_icons/type_free.png"
};


/* =====================================================
   DIGIDEX — VIEW / FILTROS AVANÇADOS
===================================================== */

let digidexView =
  localStorage.getItem("hg_digidex_view") === "table"
    ? "table"
    : "card";


const DIGIDEX_ELEMENTOS = [
  "DARKNESS",
  "EARTH",
  "FIRE",
  "ICE",
  "LIGHT",
  "PHYSICAL",
  "STEEL",
  "THUNDER",
  "WATER",
  "WIND",
  "WOOD"
];


const DIGIDEX_FIELDS = [
  "DA",
  "DR",
  "DS",
  "JT",
  "ME",
  "NSO",
  "NSP",
  "UK",
  "VB",
  "WG"
];


function obterElementosSkill(skill) {

  if (!skill) {
    return [];
  }

  let valores = [];

  if (
    typeof skill === "object" &&
    !Array.isArray(skill)
  ) {

    if (Array.isArray(skill.elementos)) {
      valores = skill.elementos;
    } else if (skill.base) {
      valores = [skill.base];
    }

  } else if (Array.isArray(skill)) {

    valores = skill;

  } else {

    valores = [skill];

  }

  return valores
    .map(function(valor) {
      return normalizarElemento(valor);
    })
    .filter(Boolean)
    .filter(function(valor, indice, lista) {
      return lista.indexOf(valor) === indice;
    });

}


function renderizarElementosSkillTabela(skill) {

  const elementos =
    obterElementosSkill(skill);

  if (!elementos.length) {
    return "-";
  }

  return `
    <div class="digidex-table-elements">
      ${elementos.map(function(elemento) {
        return renderizarIconeElemento(elemento);
      }).join("")}
    </div>
  `;

}


function alterarVisualizacaoDigidex(modo) {

  digidexView =
    modo === "table"
      ? "table"
      : "card";

  localStorage.setItem(
    "hg_digidex_view",
    digidexView
  );

  atualizarBotoesViewDigidex();
  filtrar();

}


function atualizarBotoesViewDigidex() {

  const card =
    document.getElementById(
      "digidexViewCard"
    );

  const table =
    document.getElementById(
      "digidexViewTable"
    );

  if (card) {
    card.classList.toggle(
      "ativo",
      digidexView === "card"
    );
  }

  if (table) {
    table.classList.toggle(
      "ativo",
      digidexView === "table"
    );
  }

}


function criarLinhaTabelaDigidex(d) {

  const tipo =
    normalizarType(d.type);

  const nomeCodificado = encodeURIComponent(String(d.digimon || ""));

  return `
    <tr class="digidex-profile-trigger" role="button" tabindex="0"
        onclick="abrirPerfilDigidex(decodeURIComponent('${nomeCodificado}'))"
        onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();abrirPerfilDigidex(decodeURIComponent('${nomeCodificado}'));}">
      <td class="digidex-table-name">
        <div class="digidex-table-name-wrap">
          ${
            d.icon
              ? `<img src="${d.icon}" alt="" loading="lazy">`
              : ""
          }
          <strong>${escaparHtml(d.digimon || "-")}</strong>
        </div>
      </td>

      <td>
        <span class="digidex-table-type ${getClasseType(tipo)}">
          ${renderizarTypeIcon(tipo)}
        </span>
      </td>

      <td>${renderizarRelacaoAtributo(d,"strong")}</td>
      <td>${renderizarRelacaoAtributo(d,"weak")}</td>
      <td>${renderizarField(d.field)}</td>

      <td>${escaparHtml(d.hp || "-")}</td>
      <td>${escaparHtml(d.sp || "-")}</td>
      <td>${escaparHtml(d.str || "-")}</td>
      <td>${escaparHtml(d.int || "-")}</td>
      <td>${escaparHtml(d.def || "-")}</td>
      <td>${escaparHtml(d.res || "-")}</td>
      <td>${escaparHtml(d.spd || "-")}</td>

      <td>${escaparHtml(d.cc || "-")}</td>
      <td>${escaparHtml(d.dot || "-")}</td>
      <td>${escaparHtml(d.defBreak || "-")}</td>

      <td>${renderizarElementosSkillTabela(d.skill1)}</td>
      <td>${renderizarElementosSkillTabela(d.skill2)}</td>
      <td>${renderizarElementosSkillTabela(d.skill3)}</td>
    </tr>
  `;

}


function renderizarTabelaDigidex(lista) {

  return `
    <div class="digidex-table-shell">
      <table class="digidex-table">
        <thead>
          <tr>
            <th>DIGIMON</th>
            <th>TYPE</th>
            <th>STRONG</th>
            <th>WEAK</th>
            <th>FIELD</th>
            <th>HP</th>
            <th>SP</th>
            <th>STR</th>
            <th>INT</th>
            <th>DEF</th>
            <th>RES</th>
            <th>SPD</th>
            <th>CC</th>
            <th>DOT</th>
            <th>DEF BREAK</th>
            <th>SKILL 1</th>
            <th>SKILL 2</th>
            <th>SKILL 3</th>
          </tr>
        </thead>

        <tbody>
          ${lista.map(criarLinhaTabelaDigidex).join("")}
        </tbody>
      </table>
    </div>
  `;

}


function valoresMarcadosDigidex(seletor) {

  return Array.from(
    document.querySelectorAll(
      seletor + ":checked"
    )
  ).map(function(input) {
    return String(input.value || "")
      .trim()
      .toUpperCase();
  });

}


function atualizarContadoresFiltrosDigidex() {

  const skillMarcados =
    valoresMarcadosDigidex(
      ".digidex-skill-element-check"
    );

  const fieldMarcados =
    valoresMarcadosDigidex(
      ".digidex-field-check"
    );

  const efeitosMarcados =
    valoresMarcadosDigidex(
      ".digidex-effect-check"
    );

  const skillCount =
    document.getElementById(
      "filtroSkillContador"
    );

  const fieldCount =
    document.getElementById(
      "filtroFieldContador"
    );

  const efeitoCount =
    document.getElementById(
      "filtroEfeitoContador"
    );

  if (skillCount) {
    skillCount.textContent =
      skillMarcados.length
        ? "(" + skillMarcados.length + ")"
        : "";
  }

  if (fieldCount) {
    fieldCount.textContent =
      fieldMarcados.length
        ? "(" + fieldMarcados.length + ")"
        : "";
  }

  if (efeitoCount) {
    efeitoCount.textContent =
      efeitosMarcados.length
        ? "(" + efeitosMarcados.length + ")"
        : "";
  }

}


function valorPossuiEfeitoDigidex(valor) {

  const normalizado =
    String(valor == null ? "" : valor)
      .trim()
      .toUpperCase();

  return ![
    "",
    "-",
    "NO",
    "NÃO",
    "NAO",
    "FALSE",
    "0",
    "NONE",
    "N/A"
  ].includes(normalizado);

}


function limparFiltrosDigidex() {

  const pesquisa = document.getElementById("pesquisa");
  const ordenacao = document.getElementById("ordenacao");

  if (pesquisa) pesquisa.value = "";
  if (ordenacao) ordenacao.value = "";

  filtroTypeSelecionado = "";
  filtroStageSelecionado = "";

  document.querySelectorAll(".type-filter-btn").forEach(function(botao, indice) {
    botao.classList.toggle("ativo", indice === 0);
  });

  document.querySelectorAll(".stage-filter-btn").forEach(function(botao, indice) {
    botao.classList.toggle("ativo", indice === 0);
  });

  document.querySelectorAll(
    ".digidex-skill-element-check, .digidex-field-check, .digidex-effect-check"
  ).forEach(function(input) {
    input.checked = false;
  });

  ["filtroSkill1", "filtroSkill2", "filtroSkill3"].forEach(function(id) {
    const input = document.getElementById(id);
    if (input) input.checked = true;
  });

  document.querySelectorAll(".digidex-filter-menu[open]").forEach(function(menu) {
    menu.removeAttribute("open");
  });

  filtrar();

}


function montarFiltrosAvancadosDigidex() {

  const listaSkills =
    document.getElementById(
      "filtroSkillElementosLista"
    );

  const listaFields =
    document.getElementById(
      "filtroFieldsLista"
    );

  if (listaSkills) {

    listaSkills.innerHTML =
      DIGIDEX_ELEMENTOS.map(function(elemento) {

        return `
          <label class="digidex-check-item">
            <input
              class="digidex-skill-element-check"
              type="checkbox"
              value="${elemento}"
              onchange="filtrar()"
            >

            <span class="digidex-filter-icon">
              ${renderizarIconeElemento(elemento)}
            </span>

            <span>${elemento}</span>
          </label>
        `;

      }).join("");

  }


  if (listaFields) {

    listaFields.innerHTML =
      DIGIDEX_FIELDS.map(function(field) {

        const src =
          pegarImagemField(field);

        return `
          <label class="digidex-check-item">
            <input
              class="digidex-field-check"
              type="checkbox"
              value="${field}"
              onchange="filtrar()"
            >

            <span class="digidex-filter-icon">
              ${
                src
                  ? `<img src="${src}" alt="${field}">`
                  : field
              }
            </span>

            <span>${field}</span>
          </label>
        `;

      }).join("");

  }

  atualizarContadoresFiltrosDigidex();
  atualizarBotoesViewDigidex();

}

/* =====================================================
   TEAM BUILDER — SALVAR IMAGEM / EXPORTAR / IMPORTAR
===================================================== */

function builderSlotsSelecionados() {
  return Array.from(document.querySelectorAll("#builderPagina .slot")).map(function(slot, index) {
    const info = slot.querySelector(".selected-info");
    const d = info && info._hgDigimon ? info._hgDigimon : null;
    const selects = info ? Array.from(info.querySelectorAll(".skill select")) : [];

    return {
      slot: index + 1,
      digimon: d ? String(d.digimon || "").trim() : "",
      skills: selects.map(function(select) {
        return normalizarElemento(select.value);
      })
    };
  });
}

function builderTimeCompleto() {
  const slots = builderSlotsSelecionados();
  return slots.length === 8 && slots.every(function(slot) { return !!slot.digimon; });
}

function atualizarEstadoAcoesBuilder(qtdSelecionados) {
  const save = document.getElementById("builderSaveImageBtn");
  const exp = document.getElementById("builderExportBtn");
  const qtd = typeof qtdSelecionados === "number" ? qtdSelecionados : builderDigimonsSelecionados().length;

  if (save) {
    save.disabled = !builderTimeCompleto();
    save.title = save.disabled
      ? "Preencha os 8 slots para salvar a imagem do time."
      : "Salvar o time completo em PNG.";
  }

  if (exp) {
    exp.disabled = qtd === 0;
    exp.title = exp.disabled
      ? "Selecione pelo menos 1 Digimon para exportar o time."
      : "Salvar este time em JSON para importar depois.";
  }
}

function builderBaixarBlob(blob, nomeArquivo) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
}

function builderDataArquivo() {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return ano + "-" + mes + "-" + dia;
}

function exportarTimeBuilder() {
  const slots = builderSlotsSelecionados();
  const preenchidos = slots.filter(function(slot) { return !!slot.digimon; });

  if (!preenchidos.length) {
    alert("Selecione pelo menos 1 Digimon antes de exportar o time.");
    return;
  }

  const pacote = {
    format: "holy-guardians-team",
    version: 1,
    exportedAt: new Date().toISOString(),
    slots: slots.map(function(slot) {
      return {
        slot: slot.slot,
        digimon: slot.digimon || null,
        skill1: slot.skills[0] || null,
        skill2: slot.skills[1] || null,
        skill3: slot.skills[2] || null
      };
    })
  };

  const blob = new Blob(
    [JSON.stringify(pacote, null, 2)],
    { type: "application/json;charset=utf-8" }
  );

  builderBaixarBlob(blob, "holy_guardians_team_" + builderDataArquivo() + ".json");
}

function abrirImportacaoTimeBuilder() {
  const input = document.getElementById("builderImportFile");
  if (!input) return;
  input.value = "";
  input.click();
}

function builderLimparSlot(numeroSlot) {
  const slots = document.querySelectorAll("#builderPagina .slot");
  const slot = slots[numeroSlot - 1];
  if (!slot) return;

  const input = slot.querySelector(".team-search");
  const status = slot.querySelector(".team-search-status");
  const suggestions = slot.querySelector(".team-suggestions");
  const info = document.getElementById("info" + numeroSlot);

  if (input) input.value = "";
  if (status) status.textContent = "";
  if (suggestions) {
    suggestions.innerHTML = "";
    suggestions.style.display = "none";
  }
  if (info) {
    info.innerHTML = "";
    info._hgDigimon = null;
  }
}

function builderEncontrarDigimon(nome) {
  const alvo = String(nome || "").trim().toLowerCase();
  if (!alvo) return null;

  /*
   * TEAM BUILDER = MEGA ONLY.
   * Mantemos a DATABASE completa para Digidex/Comparacao, mas o Builder
   * trabalha apenas com Megas, inclusive ao importar um time salvo.
   */
  return database.find(function(d) {
    return (
      normalizarStageDigidex(d && d.stage) === "MEGA"
      && String(d.digimon || "").trim().toLowerCase() === alvo
    );
  }) || null;
}

function builderAplicarSkillImportada(select, valor) {
  if (!select || !valor) return;
  const alvo = normalizarElemento(valor);
  const option = Array.from(select.options).find(function(op) {
    return normalizarElemento(op.value) === alvo;
  });
  if (!option) return;
  select.value = option.value;
  select.dispatchEvent(new Event("change", { bubbles: true }));
}

async function importarTimeBuilder(file) {
  if (!file) return;

  try {
    const texto = await file.text();
    const pacote = JSON.parse(texto);

    if (!pacote || pacote.format !== "holy-guardians-team" || !Array.isArray(pacote.slots)) {
      throw new Error("Este arquivo não é um time exportado pelo Team Builder da Holy Guardians.");
    }

    if (!database || !database.length) {
      throw new Error("A DATABASE ainda não terminou de carregar. Aguarde alguns segundos e tente novamente.");
    }

    const avisos = [];

    for (let i = 1; i <= 8; i++) {
      const salvo = pacote.slots.find(function(item) { return Number(item.slot) === i; }) || pacote.slots[i - 1] || null;

      if (!salvo || !salvo.digimon) {
        builderLimparSlot(i);
        continue;
      }

      const d = builderEncontrarDigimon(salvo.digimon);
      if (!d) {
        builderLimparSlot(i);
        avisos.push("Slot " + i + ": " + salvo.digimon + " não foi encontrado na DATABASE atual.");
        continue;
      }

      const slots = document.querySelectorAll("#builderPagina .slot");
      const slot = slots[i - 1];
      const input = slot ? slot.querySelector(".team-search") : null;
      const status = slot ? slot.querySelector(".team-search-status") : null;
      const suggestions = slot ? slot.querySelector(".team-suggestions") : null;

      if (input) input.value = d.digimon;
      if (status) status.textContent = "✓ " + d.digimon;
      if (suggestions) {
        suggestions.innerHTML = "";
        suggestions.style.display = "none";
      }

      mostrarDadosDoSlot(i, d);

      const info = document.getElementById("info" + i);
      const selects = info ? Array.from(info.querySelectorAll(".skill select")) : [];
      builderAplicarSkillImportada(selects[0], salvo.skill1);
      builderAplicarSkillImportada(selects[1], salvo.skill2);
      builderAplicarSkillImportada(selects[2], salvo.skill3);
    }

    atualizarPainelBuilder();

    if (avisos.length) {
      alert("Time importado com avisos:\n\n" + avisos.join("\n"));
    }
  } catch (erro) {
    alert("Não foi possível importar o time.\n\n" + (erro && erro.message ? erro.message : erro));
  }
}

function builderEsperarImagem(img, timeoutMs) {
  return new Promise(function(resolve) {
    if (!img) {
      resolve(false);
      return;
    }

    if (img.complete && img.naturalWidth > 0) {
      resolve(true);
      return;
    }

    let finalizado = false;
    const concluir = function(ok) {
      if (finalizado) return;
      finalizado = true;
      resolve(!!ok);
    };

    img.addEventListener("load", function() { concluir(true); }, { once: true });
    img.addEventListener("error", function() { concluir(false); }, { once: true });
    setTimeout(function() {
      concluir(img.complete && img.naturalWidth > 0);
    }, timeoutMs || 1800);
  });
}

function builderEsperarImagens(container) {
  const imagens = Array.from(container.querySelectorAll("img"));
  return Promise.all(imagens.map(function(img) {
    return builderEsperarImagem(img, 1800);
  }));
}

function builderBasenameUrl(src) {
  const valor = String(src || "").trim();
  if (!valor) return "";
  try {
    const url = new URL(valor, window.location.href);
    const partes = url.pathname.split("/").filter(Boolean);
    return partes.length ? decodeURIComponent(partes[partes.length - 1]) : "";
  } catch (erro) {
    return valor.split("?")[0].split("#")[0].split("/").pop() || "";
  }
}

function builderSlugDigimonExport(nome) {
  return String(nome || "")
    .replace(/^\[MUTANT\]\s*/i, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[’']/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-")
    .toLowerCase();
}

function builderCandidatosDigimonExport(img) {
  const candidatos = [];
  const adicionar = function(valor) {
    valor = String(valor || "").trim();
    if (valor && candidatos.indexOf(valor) === -1) candidatos.push(valor);
  };

  const alt = String(img && img.getAttribute("alt") || "").trim();
  const slug = builderSlugDigimonExport(alt);
  const srcAtual = String(img && (img.currentSrc || img.src || img.getAttribute("src")) || "").trim();
  const basename = builderBasenameUrl(srcAtual);

  if (/\.(?:png|webp|jpe?g)$/i.test(basename) && !/^(?:uc|view|download)$/i.test(basename)) {
    adicionar("digivolution_assets/digimons/" + basename);
  }

  if (slug) {
    adicionar("digivolution_assets/digimons/" + slug + ".webp");
    adicionar("digivolution_assets/digimons/" + slug.replace(/-mode$/i, "mode") + ".webp");
  }

  /* Variações de grafia que aparecem no banco/jogo. */
  const aliases = {
    "milleniumon": ["millenniummon.webp", "millenniumon.webp", "milleniumon.webp"],
    "millenniummon": ["millenniummon.webp", "millenniumon.webp", "milleniumon.webp"],
    "beelzemon-blastmode": ["beelzemon-blastmode.webp"],
    "belphemon-sleepmode": ["belphemon-sleepmode.webp"],
    "belphemon-ragemode": ["belphemon-ragemode.webp"]
  };

  (aliases[slug] || []).forEach(function(nomeArquivo) {
    adicionar("digivolution_assets/digimons/" + nomeArquivo);
  });

  return candidatos;
}

function builderCandidatosLocalExport(img) {
  if (!img) return [];

  if (img.id === "builderExportLogoImg") {
    return ["holyguardians_logo.png"];
  }

  const classe = String(img.className || "");
  const alt = String(img.getAttribute("alt") || "").trim().toUpperCase();

  if ((classe.indexOf("field-icon-img") !== -1 || (img.closest && img.closest(".analysis-icon"))) && alt) {
    return ["FIELD ICONS/" + alt + ".png"];
  }

  if (classe.indexOf("element-icon-img") !== -1 && alt) {
    return ["ELEMENTOS ICONS/" + alt + ".png"];
  }

  if (img.closest && img.closest(".team-image-box")) {
    return builderCandidatosDigimonExport(img);
  }

  return [];
}

function builderTestarImagemLocal(src) {
  return new Promise(function(resolve) {
    const teste = new Image();
    let finalizado = false;

    const concluir = function(ok) {
      if (finalizado) return;
      finalizado = true;
      resolve(ok ? src : "");
    };

    teste.onload = function() { concluir(true); };
    teste.onerror = function() { concluir(false); };
    teste.src = src;

    if (teste.complete && teste.naturalWidth > 0) concluir(true);
    setTimeout(function() {
      concluir(teste.complete && teste.naturalWidth > 0);
    }, 1400);
  });
}

async function builderEscolherImagemLocal(img) {
  const candidatos = builderCandidatosLocalExport(img);
  for (let i = 0; i < candidatos.length; i++) {
    const valido = await builderTestarImagemLocal(candidatos[i]);
    if (valido) return valido;
  }
  return "";
}

async function builderTrocarImagensParaExport(container) {
  const imagens = Array.from(container.querySelectorAll("img"));
  const restaurar = [];

  await Promise.all(imagens.map(async function(img) {
    const candidatos = builderCandidatosLocalExport(img);
    if (!candidatos.length) return;

    const local = await builderEscolherImagemLocal(img);
    if (!local) return;

    restaurar.push({
      img: img,
      src: img.getAttribute("src") || "",
      loading: img.getAttribute("loading")
    });

    img.removeAttribute("loading");
    img.src = local;
    await builderEsperarImagem(img, 1600);
  }));

  return function restaurarImagens() {
    restaurar.forEach(function(item) {
      item.img.src = item.src;
      if (item.loading == null) {
        item.img.removeAttribute("loading");
      } else {
        item.img.setAttribute("loading", item.loading);
      }
    });
  };
}

async function salvarImagemDoTime() {
  if (!builderTimeCompleto()) {
    alert("Complete os 8 slots antes de salvar a imagem do time.");
    return;
  }

  if (typeof html2canvas !== "function") {
    alert("O gerador de imagem ainda não carregou. Atualize a página e tente novamente.");
    return;
  }

  const area = document.querySelector("#builderPagina .internal-wrap");
  const pagina = document.getElementById("builderPagina");
  const botao = document.getElementById("builderSaveImageBtn");
  if (!area || !pagina) return;

  const textoOriginal = botao ? botao.innerHTML : "";
  let restaurarImagens = function() {};

  try {
    if (botao) {
      botao.disabled = true;
      botao.innerHTML = "<span>◌</span> GERANDO PNG...";
    }

    pagina.classList.add("builder-exporting");

    /*
     * A troca acontece NO DOM real antes do html2canvas.
     * Assim o html2canvas recebe somente imagens já carregadas da própria
     * GitHub Pages, em vez de tentar carregar imagens novas dentro do clone.
     */
    restaurarImagens = await builderTrocarImagensParaExport(area);
    await builderEsperarImagens(area);
    await new Promise(function(resolve) {
      requestAnimationFrame(function() { requestAnimationFrame(resolve); });
    });

    const canvas = await html2canvas(area, {
      backgroundColor: "#030914",
      scale: 1.25,
      useCORS: true,
      allowTaint: false,
      logging: false,
      imageTimeout: 5000,
      scrollX: 0,
      scrollY: -window.scrollY,
      windowWidth: Math.max(document.documentElement.clientWidth, area.scrollWidth + 40),
      windowHeight: Math.max(document.documentElement.clientHeight, area.scrollHeight + 40),
      ignoreElements: function(element) {
        return element.hasAttribute && element.hasAttribute("data-html2canvas-ignore");
      }
    });

    const blob = await new Promise(function(resolve) {
      canvas.toBlob(resolve, "image/png", 1);
    });

    if (!blob) throw new Error("Não foi possível montar o arquivo PNG.");
    builderBaixarBlob(blob, "holy_guardians_team_" + builderDataArquivo() + ".png");
  } catch (erro) {
    console.error("Erro ao salvar imagem do time:", erro);
    alert("Não foi possível gerar a imagem do time. Atualize a página e tente novamente.");
  } finally {
    try { restaurarImagens(); } catch (erro) {}
    pagina.classList.remove("builder-exporting");
    if (botao) botao.innerHTML = textoOriginal;
    atualizarEstadoAcoesBuilder();
  }
}



/* =====================================================
   ELEMENTOS
===================================================== */

const relacoesElementos = {

  WIND: {
    buff: "EARTH",
    removido: "WOOD"
  },

  LIGHT: {
    buff: "ICE",
    removido: "WIND"
  },

  FIRE: {
    buff: "WATER",
    removido: "ICE"
  },

  THUNDER: {
    buff: "FIRE",
    removido: "PHYSICAL"
  },

  STEEL: {
    buff: "WOOD",
    removido: "DARKNESS"
  },

  PHYSICAL: {
    buff: "STEEL",
    removido: "LIGHT"
  },

  ICE: {
    buff: "THUNDER",
    removido: "WATER"
  },

  DARKNESS: {
    buff: "LIGHT",
    removido: "THUNDER"
  },

  WATER: {
    buff: "WIND",
    removido: "EARTH"
  },

  WOOD: {
    buff: "DARKNESS",
    removido: "FIRE"
  },

  EARTH: {
    buff: "PHYSICAL",
    removido: "STEEL"
  }

};


const emojisElementos = {

  WIND: "🌪️",
  LIGHT: "✨",
  FIRE: "🔥",
  THUNDER: "⚡",
  STEEL: "⚙️",
  PHYSICAL: "👊",
  ICE: "❄️",
  DARKNESS: "🌑",
  WATER: "💧",
  WOOD: "🌿",
  EARTH: "🪨"

};




/* =====================================================
   DIGIDEX — FECHAR FILTROS AO CLICAR FORA
===================================================== */

function inicializarFechamentoFiltrosDigidex() {

  document.addEventListener(
    "click",
    function(event) {

      const menus =
        Array.from(
          document.querySelectorAll(
            ".digidex-filter-menu[open]"
          )
        );

      if (!menus.length) {
        return;
      }

      menus.forEach(function(menu) {

        if (!menu.contains(event.target)) {
          menu.removeAttribute("open");
        }

      });

    }
  );


  document
    .querySelectorAll(
      ".digidex-filter-menu"
    )
    .forEach(function(menu) {

      menu.addEventListener(
        "toggle",
        function() {

          if (!menu.open) {
            return;
          }

          document
            .querySelectorAll(
              ".digidex-filter-menu[open]"
            )
            .forEach(function(outro) {

              if (outro !== menu) {
                outro.removeAttribute("open");
              }

            });

        }
      );

    });

}


/* =====================================================
   STAFF
===================================================== */

const staff = [

  {
    nome: "HGxNunes",
    cargo: "MASTER",
    imagem: "HGxNunes"
  },

  {
    nome: "GrimSleep",
    cargo: "SUB",
    imagem: "GrimSleep"
  },

  {
    nome: "EMOx",
    cargo: "SUB",
    imagem: "EMOx"
  },

  {
    nome: "HGxDrHouse",
    cargo: "SUB",
    imagem: "HGxDrHouse"
  },

  {
    nome: "Shinzin",
    cargo: "SUB",
    imagem: "Shinzin"
  },

  {
    nome: "lNutri",
    cargo: "SUB",
    imagem: "lNutri"
  },

  {
    nome: "Kirr",
    cargo: "SUB",
    imagem: "Kirr"
  }

];


/* =====================================================
   NORMALIZAÇÃO
===================================================== */

function normalizarType(tipo) {

  const valor =
    String(
      tipo || ""
    )
      .trim()
      .toUpperCase();

  if (
    valor === "UK" ||
    valor === "UNKNOWN"
  ) {

    return "UNKNOWN";

  }

  return valor;

}



/* =====================================================
   HG GLOBAL — STRONG / WEAK RELATION TOOLTIP
   Fonte consolidada: pvp-data.json
===================================================== */

const HG_RELATION_BY_DIGIMON={"agumon":{"strong":"Wind","strongEffect":"Resistance","weak":"Water","weakEffect":"Weakness"},"agumons":{"strong":"Fire","strongEffect":"Evasion","weak":"Water","weakEffect":"Cannot Evade"},"agumonsburstmode":{"strong":"Fire","strongEffect":"Evasion","weak":"Water","weakEffect":"Effect Probability"},"armadillomon":{"strong":"Physical","strongEffect":"Resistance","weak":"Water","weakEffect":"Weakness"},"betamon":{"strong":"Iron","strongEffect":"Resistance","weak":"Earth","weakEffect":"Cannot Evade"},"biyomon":{"strong":"Wind","strongEffect":"Evasion","weak":"Water","weakEffect":"Weakness"},"candlemon":{"strong":"Wind","strongEffect":"Resistance","weak":"Water","weakEffect":"Weakness"},"chuumon":{"strong":"Physical","strongEffect":"Evasion","weak":"Dark","weakEffect":"Cannot Evade"},"crabmon":{"strong":"Water","strongEffect":"Evasion","weak":"Thunder","weakEffect":"Weakness"},"demidevimon":{"strong":"Dark","strongEffect":"Resistance","weak":"Light","weakEffect":"Cannot Evade"},"dorumon":{"strong":"Iron","strongEffect":"Resistance","weak":"Earth","weakEffect":"Weakness"},"dracmon":{"strong":"Dark","strongEffect":"Resistance","weak":"Light","weakEffect":"Effect Probability"},"dracomon":{"strong":"Physical","strongEffect":"Reflection","weak":"Water","weakEffect":"Weakness"},"elecmon":{"strong":"Thunder","strongEffect":"Resistance","weak":"Earth","weakEffect":"Weakness"},"elecmonviolet":{"strong":"Thunder","strongEffect":"Resistance","weak":"Earth","weakEffect":"Weakness"},"falcomon":{"strong":"Wind","strongEffect":"Evasion","weak":"Fire","weakEffect":"Weakness"},"floramon":{"strong":"Wood","strongEffect":"Resistance","weak":"Fire","weakEffect":"Weakness"},"funbeemon":{"strong":"Ice","strongEffect":"Resistance","weak":"Physical","weakEffect":"Weakness"},"gabumon":{"strong":"Physical","strongEffect":"Resistance","weak":"Water","weakEffect":"Cannot Evade"},"gaomon":{"strong":"Physical","strongEffect":"Evasion","weak":"Dark","weakEffect":"Effect Probability"},"gazimon":{"strong":"Dark","strongEffect":"Reflection","weak":"Thunder","weakEffect":"Weakness"},"gizamon":{"strong":"Fire","strongEffect":"Evasion","weak":"Thunder","weakEffect":"Weakness"},"goblimon":{"strong":"Ice","strongEffect":"Reflection","weak":"Earth","weakEffect":"Weakness"},"gomamon":{"strong":"Fire","strongEffect":"Reflection","weak":"Wood","weakEffect":"Cannot Evade"},"gotsumon":{"strong":"Physical","strongEffect":"Resistance","weak":"Water","weakEffect":"Cannot Evade"},"guilmon":{"strong":"Fire","strongEffect":"Resistance","weak":"Earth","weakEffect":"Cannot Evade"},"hagurumon":{"strong":"Light","strongEffect":"Evasion","weak":"Thunder","weakEffect":"Cannot Evade"},"hawkmon":{"strong":"Wind","strongEffect":"Reflection","weak":"Fire","weakEffect":"Weakness"},"impmon":{"strong":"Dark","strongEffect":"Evasion","weak":"Water","weakEffect":"Cannot Evade"},"keramon":{"strong":"Dark","strongEffect":"Resistance","weak":"Light","weakEffect":"Cannot Evade"},"kokuwamon":{"strong":"Physical","strongEffect":"Evasion","weak":"Water","weakEffect":"Effect Probability"},"kotemon":{"strong":"Thunder","strongEffect":"Evasion","weak":"Water","weakEffect":"Cannot Evade"},"kudamon":{"strong":"Light","strongEffect":"Evasion","weak":"Fire","weakEffect":"Effect Probability"},"kunemon":{"strong":"Thunder","strongEffect":"Resistance","weak":"Physical","weakEffect":"Weakness"},"lopmon":{"strong":"Ice","strongEffect":"Evasion","weak":"Fire","weakEffect":"Cannot Evade"},"lopmonwhite":{"strong":"Ice","strongEffect":"Resistance","weak":"Dark","weakEffect":"Weakness"},"monmon":{"strong":"Wood","strongEffect":"Evasion","weak":"Ice","weakEffect":"Weakness"},"monodramon":{"strong":"Physical","strongEffect":"Evasion","weak":"Fire","weakEffect":"Effect Probability"},"mushroomon":{"strong":"Water","strongEffect":"Resistance","weak":"Ice","weakEffect":"Weakness"},"otamamon":{"strong":"Water","strongEffect":"Evasion","weak":"Physical","weakEffect":"Weakness"},"palmon":{"strong":"Water","strongEffect":"Resistance","weak":"Fire","weakEffect":"Weakness"},"patamon":{"strong":"Earth","strongEffect":"Evasion","weak":"Dark","weakEffect":"Cannot Evade"},"penmon":{"strong":"Ice","strongEffect":"Evasion","weak":"Fire","weakEffect":"Weakness"},"pomumon":{"strong":"Wood","strongEffect":"Evasion","weak":"Dark","weakEffect":"Cannot Evade"},"renamon":{"strong":"Wind","strongEffect":"Evasion","weak":"Physical","weakEffect":"Weakness"},"salamon":{"strong":"Dark","strongEffect":"Reflection","weak":"Iron","weakEffect":"Weakness"},"shakomon":{"strong":"Water","strongEffect":"Evasion","weak":"Thunder","weakEffect":"Cannot Evade"},"solarmon":{"strong":"Fire","strongEffect":"Resistance","weak":"Water","weakEffect":"Weakness"},"soundbirdmon":{"strong":"Dark","strongEffect":"Evasion","weak":"Light","weakEffect":"Cannot Evade"},"sunarizamon":{"strong":"Earth","strongEffect":"Resistance","weak":"Wind","weakEffect":"Cannot Evade"},"tapirmon":{"strong":"Dark","strongEffect":"Evasion","weak":"Light","weakEffect":"Cannot Evade"},"tentomon":{"strong":"Water","strongEffect":"Resistance","weak":"Ice","weakEffect":"Cannot Evade"},"terriermon":{"strong":"Wind","strongEffect":"Evasion","weak":"Ice","weakEffect":"Cannot Evade"},"toyagumon":{"strong":"Iron","strongEffect":"Reflection","weak":"Physical","weakEffect":"Cannot Evade"},"toyagumonblack":{"strong":"Iron","strongEffect":"Resistance","weak":"Physical","weakEffect":"Effect Probability"},"veemon":{"strong":"Dark","strongEffect":"Evasion","weak":"Physical","weakEffect":"Cannot Evade"},"wormmon":{"strong":"Earth","strongEffect":"Reflection","weak":"Fire","weakEffect":"Weakness"},"airdramon":{"strong":"Physical","strongEffect":"Resistance","weak":"Iron","weakEffect":"Effect Probability"},"angemon":{"strong":"Dark","strongEffect":"Resistance","weak":"Iron","weakEffect":"Cannot Evade"},"ankylomon":{"strong":"Earth","strongEffect":"Reflection","weak":"Water","weakEffect":"Cannot Evade"},"apemon":{"strong":"Physical","strongEffect":"Resistance","weak":"Iron","weakEffect":"Weakness"},"aquilamon":{"strong":"Wind","strongEffect":"Evasion","weak":"Fire","weakEffect":"Effect Probability"},"bakemon":{"strong":"Dark","strongEffect":"Evasion","weak":"Light","weakEffect":"Weakness"},"birdramon":{"strong":"Wind","strongEffect":"Evasion","weak":"Water","weakEffect":"Cannot Evade"},"bladekuwagamon":{"strong":"Thunder","strongEffect":"Resistance","weak":"Earth","weakEffect":"Weakness"},"centarumon":{"strong":"Physical","strongEffect":"Evasion","weak":"Dark","weakEffect":"Effect Probability"},"clockmon":{"strong":"Iron","strongEffect":"Resistance","weak":"Ice","weakEffect":"Weakness"},"coelamon":{"strong":"Water","strongEffect":"Resistance","weak":"Earth","weakEffect":"Cannot Evade"},"coredramongreen":{"strong":"Fire","strongEffect":"Evasion","weak":"Water","weakEffect":"Weakness"},"darklizamon":{"strong":"Dark","strongEffect":"Resistance","weak":"Light","weakEffect":"Cannot Evade"},"darktyrannomon":{"strong":"Dark","strongEffect":"Resistance","weak":"Water","weakEffect":"Weakness"},"deltamon":{"strong":"Dark","strongEffect":"Evasion","weak":"Light","weakEffect":"Weakness"},"deputymon":{"strong":"Dark","strongEffect":"Evasion","weak":"Water","weakEffect":"Weakness"},"devidramon":{"strong":"Dark","strongEffect":"Evasion","weak":"Light","weakEffect":"Weakness"},"devimon":{"strong":"Dark","strongEffect":"Reflection","weak":"Light","weakEffect":"Weakness"},"dokugumon":{"strong":"Wind","strongEffect":"Evasion","weak":"Fire","weakEffect":"Cannot Evade"},"dolphmon":{"strong":"Water","strongEffect":"Resistance","weak":"Physical","weakEffect":"Cannot Evade"},"dorugamon":{"strong":"Iron","strongEffect":"Evasion","weak":"Earth","weakEffect":"Cannot Evade"},"drimogemon":{"strong":"Earth","strongEffect":"Evasion","weak":"Water","weakEffect":"Cannot Evade"},"ebidramon":{"strong":"Water","strongEffect":"Resistance","weak":"Thunder","weakEffect":"Effect Probability"},"exveemon":{"strong":"Wind","strongEffect":"Reflection","weak":"Fire","weakEffect":"Effect Probability"},"eyesmon":{"strong":"Dark","strongEffect":"Reflection","weak":"Light","weakEffect":"Weakness"},"eyesmonscattermode":{"strong":"Dark","strongEffect":"Resistance","weak":"Light","weakEffect":"Effect Probability"},"flarelizamon":{"strong":"Fire","strongEffect":"Resistance","weak":"Water","weakEffect":"Cannot Evade"},"flymon":{"strong":"Physical","strongEffect":"Evasion","weak":"Fire","weakEffect":"Weakness"},"frigimon":{"strong":"Ice","strongEffect":"Resistance","weak":"Fire","weakEffect":"Weakness"},"gaogamon":{"strong":"Wind","strongEffect":"Resistance","weak":"Earth","weakEffect":"Cannot Evade"},"gargomon":{"strong":"Physical","strongEffect":"Resistance","weak":"Dark","weakEffect":"Cannot Evade"},"garurumon":{"strong":"Wood","strongEffect":"Resistance","weak":"Physical","weakEffect":"Weakness"},"gatomon":{"strong":"Dark","strongEffect":"Evasion","weak":"Physical","weakEffect":"Weakness"},"gekomon":{"strong":"Water","strongEffect":"Resistance","weak":"Thunder","weakEffect":"Weakness"},"geogreymon":{"strong":"Fire","strongEffect":"Reflection","weak":"Earth","weakEffect":"Effect Probability"},"gesomon":{"strong":"Physical","strongEffect":"Evasion","weak":"Light","weakEffect":"Cannot Evade"},"golemon":{"strong":"Earth","strongEffect":"Reflection","weak":"Wood","weakEffect":"Weakness"},"gorillamon":{"strong":"Dark","strongEffect":"Evasion","weak":"Light","weakEffect":"Weakness"},"greymon":{"strong":"Wind","strongEffect":"Reflection","weak":"Water","weakEffect":"Effect Probability"},"growlmon":{"strong":"Fire","strongEffect":"Resistance","weak":"Water","weakEffect":"Cannot Evade"},"guardromon":{"strong":"Physical","strongEffect":"Resistance","weak":"Thunder","weakEffect":"Weakness"},"icemon":{"strong":"Physical","strongEffect":"Reflection","weak":"Fire","weakEffect":"Weakness"},"ikkakumon":{"strong":"Wood","strongEffect":"Reflection","weak":"Physical","weakEffect":"Weakness"},"kabuterimon":{"strong":"Iron","strongEffect":"Reflection","weak":"Earth","weakEffect":"Weakness"},"kiwimon":{"strong":"Wind","strongEffect":"Evasion","weak":"Fire","weakEffect":"Cannot Evade"},"kokatorimon":{"strong":"Physical","strongEffect":"Resistance","weak":"Fire","weakEffect":"Effect Probability"},"kurisarimon":{"strong":"Physical","strongEffect":"Resistance","weak":"Light","weakEffect":"Cannot Evade"},"kuwagamon":{"strong":"Iron","strongEffect":"Resistance","weak":"Physical","weakEffect":"Weakness"},"kyubimon":{"strong":"Fire","strongEffect":"Resistance","weak":"Water","weakEffect":"Cannot Evade"},"leomon":{"strong":"Physical","strongEffect":"Resistance","weak":"Dark","weakEffect":"Effect Probability"},"madleomon":{"strong":"Dark","strongEffect":"Evasion","weak":"Fire","weakEffect":"Cannot Evade"},"mechanorimon":{"strong":"Iron","strongEffect":"Reflection","weak":"Thunder","weakEffect":"Effect Probability"},"meramon":{"strong":"Fire","strongEffect":"Resistance","weak":"Water","weakEffect":"Weakness"},"minotaurmon":{"strong":"Dark","strongEffect":"Resistance","weak":"Fire","weakEffect":"Effect Probability"},"mojyamon":{"strong":"Water","strongEffect":"Resistance","weak":"Fire","weakEffect":"Weakness"},"monochromon":{"strong":"Physical","strongEffect":"Resistance","weak":"Water","weakEffect":"Weakness"},"musyamon":{"strong":"Iron","strongEffect":"Evasion","weak":"Fire","weakEffect":"Weakness"},"nanimon":{"strong":"Earth","strongEffect":"Resistance","weak":"Fire","weakEffect":"Cannot Evade"},"ninjamon":{"strong":"Wind","strongEffect":"Evasion","weak":"Fire","weakEffect":"Weakness"},"numemon":{"strong":"Dark","strongEffect":"Reflection","weak":"Ice","weakEffect":"Cannot Evade"},"octomon":{"strong":"Water","strongEffect":"Resistance","weak":"Wood","weakEffect":"Cannot Evade"},"opossummon":{"strong":"Fire","strongEffect":"Evasion","weak":"Physical","weakEffect":"Cannot Evade"},"orgemon":{"strong":"Dark","strongEffect":"Evasion","weak":"Physical","weakEffect":"Cannot Evade"},"peckmon":{"strong":"Wind","strongEffect":"Evasion","weak":"Fire","weakEffect":"Cannot Evade"},"raptordramon":{"strong":"Iron","strongEffect":"Resistance","weak":"Fire","weakEffect":"Cannot Evade"},"raremon":{"strong":"Dark","strongEffect":"Reflection","weak":"Fire","weakEffect":"Weakness"},"redvegiemon":{"strong":"Wood","strongEffect":"Resistance","weak":"Fire","weakEffect":"Weakness"},"reppamon":{"strong":"Iron","strongEffect":"Evasion","weak":"Ice","weakEffect":"Effect Probability"},"roachmon":{"strong":"Physical","strongEffect":"Evasion","weak":"Water","weakEffect":"Weakness"},"sangloupmon":{"strong":"Physical","strongEffect":"Evasion","weak":"Light","weakEffect":"Weakness"},"seadramon":{"strong":"Ice","strongEffect":"Resistance","weak":"Thunder","weakEffect":"Effect Probability"},"shellmon":{"strong":"Physical","strongEffect":"Reflection","weak":"Earth","weakEffect":"Cannot Evade"},"snimon":{"strong":"Physical","strongEffect":"Evasion","weak":"Fire","weakEffect":"Weakness"},"soulmon":{"strong":"Dark","strongEffect":"Resistance","weak":"Light","weakEffect":"Effect Probability"},"starmon":{"strong":"Physical","strongEffect":"Evasion","weak":"Fire","weakEffect":"Weakness"},"stingmon":{"strong":"Wood","strongEffect":"Resistance","weak":"Fire","weakEffect":"Cannot Evade"},"strikedramon":{"strong":"Fire","strongEffect":"Reflection","weak":"Earth","weakEffect":"Weakness"},"sukamon":{"strong":"Earth","strongEffect":"Evasion","weak":"Ice","weakEffect":"Cannot Evade"},"sunflowmon":{"strong":"Water","strongEffect":"Reflection","weak":"Fire","weakEffect":"Effect Probability"},"tankmon":{"strong":"Iron","strongEffect":"Resistance","weak":"Thunder","weakEffect":"Weakness"},"thundermon":{"strong":"Thunder","strongEffect":"Resistance","weak":"Earth","weakEffect":"Effect Probability"},"togemon":{"strong":"Water","strongEffect":"Resistance","weak":"Fire","weakEffect":"Effect Probability"},"tortomon":{"strong":"Earth","strongEffect":"Resistance","weak":"Iron","weakEffect":"Weakness"},"turuiemon":{"strong":"Iron","strongEffect":"Evasion","weak":"Ice","weakEffect":"Effect Probability"},"tuskmon":{"strong":"Physical","strongEffect":"Resistance","weak":"Ice","weakEffect":"Weakness"},"tyrannomon":{"strong":"Fire","strongEffect":"Resistance","weak":"Physical","weakEffect":"Weakness"},"unimon":{"strong":"Physical","strongEffect":"Evasion","weak":"Thunder","weakEffect":"Cannot Evade"},"veedramon":{"strong":"Light","strongEffect":"Resistance","weak":"Wind","weakEffect":"Effect Probability"},"vegiemon":{"strong":"Wood","strongEffect":"Reflection","weak":"Fire","weakEffect":"Weakness"},"vilemon":{"strong":"Dark","strongEffect":"Resistance","weak":"Light","weakEffect":"Weakness"},"waspmon":{"strong":"Wind","strongEffect":"Evasion","weak":"Thunder","weakEffect":"Weakness"},"wendigomon":{"strong":"Dark","strongEffect":"Evasion","weak":"Light","weakEffect":"Effect Probability"},"wizardmon":{"strong":"Thunder","strongEffect":"Evasion","weak":"Dark","weakEffect":"Weakness"},"woodmon":{"strong":"Earth","strongEffect":"Evasion","weak":"Fire","weakEffect":"Cannot Evade"},"youkomon":{"strong":"Dark","strongEffect":"Evasion","weak":"Light","weakEffect":"Cannot Evade"},"aeroveedramon":{"strong":"Physical","strongEffect":"Evasion","weak":"Iron","weakEffect":"Weakness"},"andromon":{"strong":"Iron","strongEffect":"Resistance","weak":"Thunder","weakEffect":"Weakness"},"angewomon":{"strong":"Dark","strongEffect":"Resistance","weak":"Earth","weakEffect":"Cannot Evade"},"antylamon":{"strong":"Dark","strongEffect":"Evasion","weak":"Light","weakEffect":"Cannot Evade"},"antylamondeva":{"strong":"Iron","strongEffect":"Reflection","weak":"Dark","weakEffect":"Effect Probability"},"arukenimon":{"strong":"Earth","strongEffect":"Resistance","weak":"Fire","weakEffect":"Weakness"},"astamon":{"strong":"Dark","strongEffect":"Reflection","weak":"Water","weakEffect":"Cannot Evade"},"asuramon":{"strong":"Fire","strongEffect":"Resistance","weak":"Water","weakEffect":"Weakness"},"baalmon":{"strong":"Dark","strongEffect":"Evasion","weak":"Light","weakEffect":"Effect Probability"},"bigmamemon":{"strong":"Physical","strongEffect":"Resistance","weak":"Water","weakEffect":"Cannot Evade"},"blossomon":{"strong":"Water","strongEffect":"Resistance","weak":"Wind","weakEffect":"Weakness"},"bluemeramon":{"strong":"Ice","strongEffect":"Resistance","weak":"Fire","weakEffect":"Weakness"},"cannonbeemon":{"strong":"Physical","strongEffect":"Resistance","weak":"Fire","weakEffect":"Weakness"},"cherrymon":{"strong":"Earth","strongEffect":"Reflection","weak":"Fire","weakEffect":"Effect Probability"},"chirinmon":{"strong":"Light","strongEffect":"Reflection","weak":"Dark","weakEffect":"Effect Probability"},"chohakkaimon":{"strong":"Fire","strongEffect":"Evasion","weak":"Water","weakEffect":"Cannot Evade"},"crowmon":{"strong":"Thunder","strongEffect":"Resistance","weak":"Ice","weakEffect":"Weakness"},"cyberdramon":{"strong":"Light","strongEffect":"Reflection","weak":"Fire","weakEffect":"Weakness"},"datamon":{"strong":"Iron","strongEffect":"Resistance","weak":"Thunder","weakEffect":"Weakness"},"deramon":{"strong":"Wind","strongEffect":"Reflection","weak":"Fire","weakEffect":"Cannot Evade"},"digitamamon":{"strong":"Dark","strongEffect":"Reflection","weak":"Light","weakEffect":"Weakness"},"divermon":{"strong":"Water","strongEffect":"Resistance","weak":"Iron","weakEffect":"Weakness"},"doumon":{"strong":"Dark","strongEffect":"Resistance","weak":"Fire","weakEffect":"Weakness"},"dragomon":{"strong":"Physical","strongEffect":"Evasion","weak":"Thunder","weakEffect":"Cannot Evade"},"etemon":{"strong":"Physical","strongEffect":"Resistance","weak":"Light","weakEffect":"Cannot Evade"},"garbagemon":{"strong":"Earth","strongEffect":"Resistance","weak":"Ice","weakEffect":"Weakness"},"garudamon":{"strong":"Wind","strongEffect":"Evasion","weak":"Ice","weakEffect":"Cannot Evade"},"gigadramon":{"strong":"Iron","strongEffect":"Resistance","weak":"Water","weakEffect":"Cannot Evade"},"giromon":{"strong":"Iron","strongEffect":"Reflection","weak":"Fire","weakEffect":"Weakness"},"gogmamon":{"strong":"Earth","strongEffect":"Resistance","weak":"Iron","weakEffect":"Cannot Evade"},"grademon":{"strong":"Physical","strongEffect":"Evasion","weak":"Earth","weakEffect":"Weakness"},"groundramon":{"strong":"Earth","strongEffect":"Resistance","weak":"Water","weakEffect":"Cannot Evade"},"hippogryphonmon":{"strong":"Wind","strongEffect":"Resistance","weak":"Iron","weakEffect":"Weakness"},"iceleomon":{"strong":"Ice","strongEffect":"Resistance","weak":"Fire","weakEffect":"Cannot Evade"},"infermon":{"strong":"Physical","strongEffect":"Resistance","weak":"Water","weakEffect":"Weakness"},"jokermon":{"strong":"Dark","strongEffect":"Resistance","weak":"Physical","weakEffect":"Weakness"},"karatenmon":{"strong":"Wind","strongEffect":"Resistance","weak":"Ice","weakEffect":"Cannot Evade"},"kimeramon":{"strong":"Fire","strongEffect":"Evasion","weak":"Light","weakEffect":"Weakness"},"knightmon":{"strong":"Physical","strongEffect":"Resistance","weak":"Thunder","weakEffect":"Cannot Evade"},"ladydevimon":{"strong":"Dark","strongEffect":"Evasion","weak":"Light","weakEffect":"Weakness"},"lilamon":{"strong":"Wind","strongEffect":"Reflection","weak":"Fire","weakEffect":"Cannot Evade"},"lillymon":{"strong":"Water","strongEffect":"Resistance","weak":"Fire","weakEffect":"Weakness"},"loaderleomon":{"strong":"Physical","strongEffect":"Reflection","weak":"Fire","weakEffect":"Weakness"},"machgaogamon":{"strong":"Iron","strongEffect":"Evasion","weak":"Dark","weakEffect":"Effect Probability"},"magnaangemon":{"strong":"Light","strongEffect":"Resistance","weak":"Dark","weakEffect":"Weakness"},"magnaangemonpriestmode":{"strong":"Light","strongEffect":"Resistance","weak":"Dark","weakEffect":"Weakness"},"makuramon":{"strong":"Fire","strongEffect":"Resistance","weak":"Light","weakEffect":"Cannot Evade"},"mamemon":{"strong":"Iron","strongEffect":"Evasion","weak":"Fire","weakEffect":"Cannot Evade"},"mammothmon":{"strong":"Ice","strongEffect":"Evasion","weak":"Fire","weakEffect":"Weakness"},"marindevimon":{"strong":"Water","strongEffect":"Evasion","weak":"Light","weakEffect":"Cannot Evade"},"mastertyrannomon":{"strong":"Fire","strongEffect":"Resistance","weak":"Water","weakEffect":"Weakness"},"megadramon":{"strong":"Iron","strongEffect":"Resistance","weak":"Ice","weakEffect":"Cannot Evade"},"megakabuterimon":{"strong":"Iron","strongEffect":"Reflection","weak":"Thunder","weakEffect":"Weakness"},"megaseadramon":{"strong":"Wind","strongEffect":"Resistance","weak":"Physical","weakEffect":"Cannot Evade"},"mephistomon":{"strong":"Dark","strongEffect":"Resistance","weak":"Light","weakEffect":"Cannot Evade"},"metalgreymon":{"strong":"Iron","strongEffect":"Reflection","weak":"Water","weakEffect":"Weakness"},"metalgreymonalterousmode":{"strong":"Iron","strongEffect":"Reflection","weak":"Water","weakEffect":"Weakness"},"metalgreymonvirus":{"strong":"Dark","strongEffect":"Evasion","weak":"Physical","weakEffect":"Cannot Evade"},"metalmamemon":{"strong":"Iron","strongEffect":"Resistance","weak":"Wood","weakEffect":"Cannot Evade"},"metalphantomon":{"strong":"Dark","strongEffect":"Evasion","weak":"Light","weakEffect":"Weakness"},"metaltyrannomon":{"strong":"Physical","strongEffect":"Reflection","weak":"Fire","weakEffect":"Cannot Evade"},"meteormon":{"strong":"Physical","strongEffect":"Reflection","weak":"Water","weakEffect":"Effect Probability"},"mistymon":{"strong":"Fire","strongEffect":"Resistance","weak":"Water","weakEffect":"Weakness"},"monzaemon":{"strong":"Physical","strongEffect":"Evasion","weak":"Fire","weakEffect":"Effect Probability"},"mummymon":{"strong":"Earth","strongEffect":"Resistance","weak":"Fire","weakEffect":"Effect Probability"},"myotismon":{"strong":"Dark","strongEffect":"Evasion","weak":"Light","weakEffect":"Weakness"},"neodevimon":{"strong":"Dark","strongEffect":"Resistance","weak":"Light","weakEffect":"Cannot Evade"},"okuwamon":{"strong":"Earth","strongEffect":"Evasion","weak":"Fire","weakEffect":"Cannot Evade"},"orochimon":{"strong":"Water","strongEffect":"Reflection","weak":"Fire","weakEffect":"Effect Probability"},"paildramon":{"strong":"Iron","strongEffect":"Evasion","weak":"Earth","weakEffect":"Cannot Evade"},"parrotmon":{"strong":"Thunder","strongEffect":"Resistance","weak":"Ice","weakEffect":"Weakness"},"phantomon":{"strong":"Dark","strongEffect":"Resistance","weak":"Light","weakEffect":"Effect Probability"},"piximon":{"strong":"Dark","strongEffect":"Reflection","weak":"Wind","weakEffect":"Effect Probability"},"pumpkinmon":{"strong":"Dark","strongEffect":"Evasion","weak":"Light","weakEffect":"Cannot Evade"},"rapidmon":{"strong":"Physical","strongEffect":"Resistance","weak":"Fire","weakEffect":"Weakness"},"rebellimon":{"strong":"Iron","strongEffect":"Reflection","weak":"Thunder","weakEffect":"Weakness"},"rizegreymon":{"strong":"Iron","strongEffect":"Reflection","weak":"Water","weakEffect":"Weakness"},"scorpiomon":{"strong":"Earth","strongEffect":"Resistance","weak":"Physical","weakEffect":"Cannot Evade"},"shakkoumon":{"strong":"Fire","strongEffect":"Resistance","weak":"Thunder","weakEffect":"Effect Probability"},"shogungekomon":{"strong":"Water","strongEffect":"Resistance","weak":"Thunder","weakEffect":"Weakness"},"silphymon":{"strong":"Wind","strongEffect":"Evasion","weak":"Fire","weakEffect":"Effect Probability"},"skullgreymon":{"strong":"Dark","strongEffect":"Reflection","weak":"Light","weakEffect":"Weakness"},"skullmeramon":{"strong":"Fire","strongEffect":"Resistance","weak":"Earth","weakEffect":"Effect Probability"},"skullsatamon":{"strong":"Dark","strongEffect":"Resistance","weak":"Light","weakEffect":"Cannot Evade"},"skullscorpiomon":{"strong":"Physical","strongEffect":"Resistance","weak":"Ice","weakEffect":"Weakness"},"superstarmon":{"strong":"Physical","strongEffect":"Evasion","weak":"Fire","weakEffect":"Weakness"},"taomon":{"strong":"Physical","strongEffect":"Evasion","weak":"Dark","weakEffect":"Effect Probability"},"triceramon":{"strong":"Thunder","strongEffect":"Evasion","weak":"Ice","weakEffect":"Weakness"},"vademon":{"strong":"Wood","strongEffect":"Resistance","weak":"Light","weakEffect":"Cannot Evade"},"volcanomon":{"strong":"Iron","strongEffect":"Resistance","weak":"Water","weakEffect":"Cannot Evade"},"wargrowlmon":{"strong":"Fire","strongEffect":"Reflection","weak":"Ice","weakEffect":"Cannot Evade"},"warumonzaemon":{"strong":"Dark","strongEffect":"Evasion","weak":"Light","weakEffect":"Weakness"},"weregarurumon":{"strong":"Physical","strongEffect":"Evasion","weak":"Ice","weakEffect":"Effect Probability"},"weregarurumonsagittariusmode":{"strong":"Iron","strongEffect":"Evasion","weak":"Water","weakEffect":"Effect Probability"},"whamon":{"strong":"Physical","strongEffect":"Resistance","weak":"Thunder","weakEffect":"Effect Probability"},"zudomon":{"strong":"Iron","strongEffect":"Reflection","weak":"Wind","weakEffect":"Effect Probability"},"agumonkizuna":{"strong":"Fire","strongEffect":"Reflection","weak":"Water","weakEffect":"Effect Probability"},"apocalymon":{"strong":"Dark","strongEffect":"Reflection","weak":"Light","weakEffect":"Cannot Evade"},"armageddemon":{"strong":"Fire","strongEffect":"Evasion","weak":"Light","weakEffect":"Weakness"},"azulongmon":{"strong":"Water","strongEffect":"Resistance","weak":"Earth","weakEffect":"Weakness"},"babamon":{"strong":"Earth","strongEffect":"Resistance","weak":"Fire","weakEffect":"Cannot Evade"},"baihumon":{"strong":"Iron","strongEffect":"Reflection","weak":"Water","weakEffect":"Cannot Evade"},"bancholeomon":{"strong":"Physical","strongEffect":"Resistance","weak":"Ice","weakEffect":"Weakness"},"bancholeomonburstmode":{"strong":"Fire","strongEffect":"Reflection","weak":"Water","weakEffect":"Effect Probability"},"banchomamemon":{"strong":"Iron","strongEffect":"Reflection","weak":"Wood","weakEffect":"Cannot Evade"},"beelzemon":{"strong":"Dark","strongEffect":"Evasion","weak":"Light","weakEffect":"Effect Probability"},"beelzemonxwars":{"strong":"Dark","strongEffect":"Evasion","weak":"Fire","weakEffect":"Effect Probability"},"beelzemonblastmode":{"strong":"Dark","strongEffect":"Evasion","weak":"Wind","weakEffect":"Cannot Evade"},"belphemonragemode":{"strong":"Light","strongEffect":"Reflection","weak":"Physical","weakEffect":"Cannot Evade"},"belphemonsleepmode":{"strong":"Dark","strongEffect":"Resistance","weak":"Iron","weakEffect":"Effect Probability"},"blackseraphimon":{"strong":"Fire","strongEffect":"Reflection","weak":"Light","weakEffect":"Cannot Evade"},"blackwargreymon":{"strong":"Dark","strongEffect":"Resistance","weak":"Light","weakEffect":"Effect Probability"},"blastmon":{"strong":"Earth","strongEffect":"Resistance","weak":"Iron","weakEffect":"Cannot Evade"},"blitzgreymon":{"strong":"Water","strongEffect":"Reflection","weak":"Earth","weakEffect":"Cannot Evade"},"bloomlordmon":{"strong":"Water","strongEffect":"Resistance","weak":"Ice","weakEffect":"Effect Probability"},"breakdramon":{"strong":"Iron","strongEffect":"Reflection","weak":"Fire","weakEffect":"Cannot Evade"},"cherubimonblack":{"strong":"Light","strongEffect":"Resistance","weak":"Iron","weakEffect":"Weakness"},"cherubimongood":{"strong":"Physical","strongEffect":"Evasion","weak":"Dark","weakEffect":"Effect Probability"},"clavisangemon":{"strong":"Dark","strongEffect":"Resistance","weak":"Thunder","weakEffect":"Weakness"},"craniamon":{"strong":"Physical","strongEffect":"Resistance","weak":"Wind","weakEffect":"Cannot Evade"},"creepymon":{"strong":"Dark","strongEffect":"Reflection","weak":"Light","weakEffect":"Effect Probability"},"cresgarurumon":{"strong":"Ice","strongEffect":"Resistance","weak":"Fire","weakEffect":"Cannot Evade"},"diaboromon":{"strong":"Dark","strongEffect":"Resistance","weak":"Light","weakEffect":"Cannot Evade"},"donedevimon":{"strong":"Dark","strongEffect":"Evasion","weak":"Fire","weakEffect":"Cannot Evade"},"dynasmon":{"strong":"Wind","strongEffect":"Resistance","weak":"Wood","weakEffect":"Cannot Evade"},"eaglemon":{"strong":"Iron","strongEffect":"Resistance","weak":"Fire","weakEffect":"Cannot Evade"},"ebemon":{"strong":"Thunder","strongEffect":"Resistance","weak":"Water","weakEffect":"Weakness"},"ebonwumon":{"strong":"Wood","strongEffect":"Reflection","weak":"Thunder","weakEffect":"Cannot Evade"},"examon":{"strong":"Dark","strongEffect":"Resistance","weak":"Ice","weakEffect":"Effect Probability"},"fanglongmon":{"strong":"Iron","strongEffect":"Reflection","weak":"Wind","weakEffect":"Cannot Evade"},"gabumonkizuna":{"strong":"Iron","strongEffect":"Resistance","weak":"Fire","weakEffect":"Cannot Evade"},"gaiomon":{"strong":"Iron","strongEffect":"Reflection","weak":"Physical","weakEffect":"Cannot Evade"},"gallantmon":{"strong":"Iron","strongEffect":"Evasion","weak":"Ice","weakEffect":"Weakness"},"gallantmoncrimsonmode":{"strong":"Light","strongEffect":"Reflection","weak":"Physical","weakEffect":"Weakness"},"ghoulmon":{"strong":"Dark","strongEffect":"Evasion","weak":"Light","weakEffect":"Effect Probability"},"goldramon":{"strong":"Fire","strongEffect":"Evasion","weak":"Thunder","weakEffect":"Effect Probability"},"grandiskuwagamon":{"strong":"Iron","strongEffect":"Reflection","weak":"Fire","weakEffect":"Cannot Evade"},"grankuwagamon":{"strong":"Wood","strongEffect":"Resistance","weak":"Fire","weakEffect":"Effect Probability"},"gryphonmon":{"strong":"Wind","strongEffect":"Resistance","weak":"Thunder","weakEffect":"Cannot Evade"},"gulfmon":{"strong":"Physical","strongEffect":"Resistance","weak":"Water","weakEffect":"Cannot Evade"},"herculeskabuterimon":{"strong":"Thunder","strongEffect":"Reflection","weak":"Earth","weakEffect":"Cannot Evade"},"himachinedramon":{"strong":"Iron","strongEffect":"Resistance","weak":"Fire","weakEffect":"Effect Probability"},"imperialdramondragonmode":{"strong":"Wind","strongEffect":"Evasion","weak":"Dark","weakEffect":"Effect Probability"},"imperialdramondragonmodeinfected":{"strong":"Light","strongEffect":"Evasion","weak":"Ice","weakEffect":"Effect Probability"},"imperialdramonfightermode":{"strong":"Wind","strongEffect":"Evasion","weak":"Dark","weakEffect":"Effect Probability"},"imperialdramonpaladinmode":{"strong":"Dark","strongEffect":"Resistance","weak":"Physical","weakEffect":"Effect Probability"},"justimonaccelarm":{"strong":"Earth","strongEffect":"Resistance","weak":"Wind","weakEffect":"Cannot Evade"},"justimonblitzarm":{"strong":"Thunder","strongEffect":"Reflection","weak":"Physical","weakEffect":"Weakness"},"justimoncriticalarm":{"strong":"Light","strongEffect":"Resistance","weak":"Water","weakEffect":"Weakness"},"kentaurosmon":{"strong":"Dark","strongEffect":"Evasion","weak":"Physical","weakEffect":"Weakness"},"kingwhamon":{"strong":"Physical","strongEffect":"Reflection","weak":"Thunder","weakEffect":"Cannot Evade"},"kuzuhamon":{"strong":"Dark","strongEffect":"Evasion","weak":"Light","weakEffect":"Effect Probability"},"kuzuhamonmaidmode":{"strong":"Dark","strongEffect":"Evasion","weak":"Light","weakEffect":"Effect Probability"},"leopardmon":{"strong":"Earth","strongEffect":"Evasion","weak":"Water","weakEffect":"Effect Probability"},"leviamon":{"strong":"Fire","strongEffect":"Resistance","weak":"Wood","weakEffect":"Weakness"},"lilithmon":{"strong":"Dark","strongEffect":"Reflection","weak":"Light","weakEffect":"Effect Probability"},"lordknightmon":{"strong":"Thunder","strongEffect":"Reflection","weak":"Physical","weakEffect":"Effect Probability"},"machinedramon":{"strong":"Iron","strongEffect":"Reflection","weak":"Light","weakEffect":"Weakness"},"machinedramonkai":{"strong":"Iron","strongEffect":"Resistance","weak":"Light","weakEffect":"Cannot Evade"},"magnadramon":{"strong":"Light","strongEffect":"Evasion","weak":"Iron","weakEffect":"Cannot Evade"},"malomyotismon":{"strong":"Dark","strongEffect":"Reflection","weak":"Light","weakEffect":"Cannot Evade"},"marineangemon":{"strong":"Water","strongEffect":"Evasion","weak":"Fire","weakEffect":"Effect Probability"},"marsmon":{"strong":"Earth","strongEffect":"Evasion","weak":"Thunder","weakEffect":"Effect Probability"},"mastemon":{"strong":"Dark","strongEffect":"Evasion","weak":"Physical","weakEffect":"Cannot Evade"},"megagargomon":{"strong":"Physical","strongEffect":"Evasion","weak":"Fire","weakEffect":"Weakness"},"megidramon":{"strong":"Fire","strongEffect":"Evasion","weak":"Water","weakEffect":"Cannot Evade"},"metaletemon":{"strong":"Thunder","strongEffect":"Reflection","weak":"Light","weakEffect":"Cannot Evade"},"metalgarurumon":{"strong":"Ice","strongEffect":"Resistance","weak":"Earth","weakEffect":"Cannot Evade"},"metalseadramon":{"strong":"Water","strongEffect":"Evasion","weak":"Physical","weakEffect":"Cannot Evade"},"millenniumon":{"strong":"Iron","strongEffect":"Resistance","weak":"Light","weakEffect":"Effect Probability"},"miragegaogamon":{"strong":"Dark","strongEffect":"Resistance","weak":"Ice","weakEffect":"Effect Probability"},"miragegaogamonburstmode":{"strong":"Dark","strongEffect":"Reflection","weak":"Earth","weakEffect":"Effect Probability"},"moonmillenniumon":{"strong":"Physical","strongEffect":"Reflection","weak":"Iron","weakEffect":"Cannot Evade"},"neomyotismon":{"strong":"Dark","strongEffect":"Reflection","weak":"Fire","weakEffect":"Effect Probability"},"neptunemon":{"strong":"Water","strongEffect":"Reflection","weak":"Thunder","weakEffect":"Weakness"},"omnimon":{"strong":"Dark","strongEffect":"Resistance","weak":"Physical","weakEffect":"Effect Probability"},"omnimonmercifulmode":{"strong":"Dark","strongEffect":"Reflection","weak":"Wood","weakEffect":"Weakness"},"omnimonalters":{"strong":"Thunder","strongEffect":"Reflection","weak":"Iron","weakEffect":"Cannot Evade"},"ophanimon":{"strong":"Light","strongEffect":"Resistance","weak":"Fire","weakEffect":"Effect Probability"},"ophanimonfalldownmode":{"strong":"Dark","strongEffect":"Resistance","weak":"Light","weakEffect":"Cannot Evade"},"parasimon":{"strong":"Earth","strongEffect":"Resistance","weak":"Light","weakEffect":"Weakness"},"pharaohmon":{"strong":"Dark","strongEffect":"Resistance","weak":"Fire","weakEffect":"Weakness"},"phoenixmon":{"strong":"Fire","strongEffect":"Evasion","weak":"Water","weakEffect":"Weakness"},"piedmon":{"strong":"Dark","strongEffect":"Evasion","weak":"Light","weakEffect":"Effect Probability"},"plesiomon":{"strong":"Earth","strongEffect":"Resistance","weak":"Iron","weakEffect":"Cannot Evade"},"pukumon":{"strong":"Wood","strongEffect":"Resistance","weak":"Thunder","weakEffect":"Weakness"},"puppetmon":{"strong":"Dark","strongEffect":"Resistance","weak":"Light","weakEffect":"Effect Probability"},"ravemon":{"strong":"Wind","strongEffect":"Evasion","weak":"Iron","weakEffect":"Weakness"},"ravemonburstmode":{"strong":"Dark","strongEffect":"Evasion","weak":"Light","weakEffect":"Cannot Evade"},"reapermon":{"strong":"Fire","strongEffect":"Resistance","weak":"Water","weakEffect":"Cannot Evade"},"rosemon":{"strong":"Wood","strongEffect":"Evasion","weak":"Fire","weakEffect":"Effect Probability"},"rosemonburstmode":{"strong":"Wood","strongEffect":"Evasion","weak":"Fire","weakEffect":"Effect Probability"},"saberleomon":{"strong":"Physical","strongEffect":"Evasion","weak":"Thunder","weakEffect":"Cannot Evade"},"sakuyamon":{"strong":"Fire","strongEffect":"Reflection","weak":"Dark","weakEffect":"Cannot Evade"},"seraphimon":{"strong":"Light","strongEffect":"Evasion","weak":"Fire","weakEffect":"Cannot Evade"},"shinegreymon":{"strong":"Fire","strongEffect":"Resistance","weak":"Water","weakEffect":"Effect Probability"},"shinegreymonburstmode":{"strong":"Fire","strongEffect":"Resistance","weak":"Water","weakEffect":"Effect Probability"},"shinegreymonruinmode":{"strong":"Fire","strongEffect":"Reflection","weak":"Water","weakEffect":"Weakness"},"skullmammothmon":{"strong":"Physical","strongEffect":"Evasion","weak":"Iron","weakEffect":"Cannot Evade"},"slashangemon":{"strong":"Physical","strongEffect":"Resistance","weak":"Fire","weakEffect":"Effect Probability"},"tigervespamon":{"strong":"Physical","strongEffect":"Evasion","weak":"Fire","weakEffect":"Cannot Evade"},"titamon":{"strong":"Dark","strongEffect":"Resistance","weak":"Thunder","weakEffect":"Cannot Evade"},"ulforceveedramon":{"strong":"Wind","strongEffect":"Reflection","weak":"Earth","weakEffect":"Effect Probability"},"valkyrimon":{"strong":"Wind","strongEffect":"Evasion","weak":"Thunder","weakEffect":"Effect Probability"},"varodurumon":{"strong":"Dark","strongEffect":"Resistance","weak":"Fire","weakEffect":"Effect Probability"},"venommyotismon":{"strong":"Dark","strongEffect":"Resistance","weak":"Light","weakEffect":"Weakness"},"vikemon":{"strong":"Ice","strongEffect":"Reflection","weak":"Dark","weakEffect":"Cannot Evade"},"wargreymon":{"strong":"Fire","strongEffect":"Resistance","weak":"Water","weakEffect":"Cannot Evade"},"zanbamon":{"strong":"Physical","strongEffect":"Evasion","weak":"Iron","weakEffect":"Weakness"},"zeedmillenniumon":{"strong":"Dark","strongEffect":"Resistance","weak":"Light","weakEffect":"Effect Probability"},"zhuqiaomon":{"strong":"Fire","strongEffect":"Reflection","weak":"Thunder","weakEffect":"Cannot Evade"}};

const HG_RELATION_EFFECT_TEXT={
  "Resistance":"Takes 25% reduced damage from attacks of this attribute.",
  "Evasion":"Has 2x evasion rate against attacks of this attribute.",
  "Reflection":"Reflects 25% of the damage received from attacks of this attribute.",
  "Weakness":"Takes 25% increased damage from attacks of this attribute.",
  "Cannot Evade":"Attacks of this attribute cannot be evaded.",
  "Effect Probability":"If the attack has an effect with this attribute, the chance of inflicting the effect increases."
};

function hgRelationKey(nome){
  return String(nome||"")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .toLowerCase()
    .replace(/[^a-z0-9]/g,"");
}

function hgRelationData(digi,kind){
  const isStrong=String(kind||"").toLowerCase()==="strong";
  const nome=typeof digi==="string"
    ?digi
    :(digi&&((digi.digimon||digi.name)))||"";

  const mapa=HG_RELATION_BY_DIGIMON[hgRelationKey(nome)]||{};

  const element=String(
    (digi&&typeof digi==="object"
      ?(isStrong?(digi.strong||digi.strongAgaints):(digi.weak||digi.weakAgaints))
      :"")
    ||(isStrong?mapa.strong:mapa.weak)
    ||""
  ).trim();

  const effect=String(
    (digi&&typeof digi==="object"
      ?(isStrong?(digi.strongEffect||digi.strong_effect):(digi.weakEffect||digi.weak_effect))
      :"")
    ||(isStrong?mapa.strongEffect:mapa.weakEffect)
    ||""
  ).trim();

  return{element:element,effect:effect,nome:nome,kind:isStrong?"strong":"weak"};
}

function hgRelationEffectClass(effect){
  return String(effect||"")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,"-")
    .replace(/^-+|-+$/g,"");
}

function hgRelationTooltipHtml(element,effect,kind,iconHtml){
  if(!element)return "-";

  const descricao=HG_RELATION_EFFECT_TEXT[effect]||"";
  const classe=hgRelationEffectClass(effect);
  const label=String(kind||"").toLowerCase()==="strong"?"STRONG":"WEAK";

  if(!effect){
    return `<span class="hg-relation hg-relation-${String(kind||"").toLowerCase()}">
      ${iconHtml}
    </span>`;
  }

  return `<span class="hg-relation hg-relation-${String(kind||"").toLowerCase()} hg-relation-${classe}" tabindex="0">
    <span class="hg-relation-trigger" aria-label="${escaparHtml(label+" "+element+" "+effect)}">
      ${iconHtml}
    </span>
    <span class="hg-relation-tooltip" role="tooltip">
      <span class="hg-relation-tooltip-head">
        <span class="hg-relation-tooltip-icon">${iconHtml}</span>
        <span>
          <small>${escaparHtml(element)}</small>
          <strong>${escaparHtml(effect)}</strong>
        </span>
      </span>
      ${descricao?`<span class="hg-relation-tooltip-copy">${escaparHtml(descricao)}</span>`:""}
    </span>
  </span>`;
}

function renderizarRelacaoAtributo(digi,kind){
  const info=hgRelationData(digi,kind);
  if(!info.element)return "-";
  return hgRelationTooltipHtml(
    info.element,
    info.effect,
    info.kind,
    renderizarIconeElemento(info.element)
  );
}

function normalizarElemento(elemento) {

  const valor =
    String(
      elemento || ""
    )
      .trim()
      .toUpperCase();

  if (
    valor === "DARK"
  ) {

    return "DARKNESS";

  }

  return valor;

}


function getEmojiElemento(elemento) {

  const chave =
    normalizarElemento(
      elemento
    );

  return (
    emojisElementos[chave] ||
    "⚔️"
  );

}


function getClasseType(tipo) {

  const valor =
    normalizarType(
      tipo
    );

  if (
    valor === "VACCINE"
  ) {
    return "type-vaccine";
  }

  if (
    valor === "VIRUS"
  ) {
    return "type-virus";
  }

  if (
    valor === "DATA"
  ) {
    return "type-data";
  }

  if (
    valor === "FREE"
  ) {
    return "type-free";
  }

  if (
    valor === "UK" ||
    valor === "UNKNOWN"
  ) {
    return "type-uk";
  }

  return "";

}


function renderizarTypeIcon(tipo, mostrarNome = false) {
  const valor = normalizarType(tipo);
  const src = TYPE_ICONS[valor];

  if (!src) {
    return `<span class="type-icon-fallback">${escaparHtml(valor || "-")}</span>`;
  }

  return `
    <span class="type-icon-wrap" title="${escaparHtml(valor)}" aria-label="${escaparHtml(valor)}">
      <img class="type-icon-img" src="${src}" alt="${escaparHtml(valor)}">
      ${mostrarNome ? `<span class="type-icon-name">${escaparHtml(valor)}</span>` : ""}
    </span>
  `;
}


function selecionarFiltroType(tipo, botao) {
  filtroTypeSelecionado = normalizarType(tipo);

  document.querySelectorAll(".type-filter-btn").forEach(function(item) {
    item.classList.toggle("ativo", item === botao);
  });

  filtrar();
}

function normalizarStageDigidex(stage) {
  return String(stage || "").trim().toUpperCase();
}

function selecionarFiltroStage(stage, botao) {
  const normalizado = normalizarStageDigidex(stage);

  filtroStageSelecionado =
    DIGIDEX_STAGES.includes(normalizado)
      ? normalizado
      : "";

  document.querySelectorAll(".stage-filter-btn").forEach(function(item) {
    item.classList.toggle("ativo", item === botao);
  });

  filtrar();
}

function atualizarContadoresStageDigidex() {
  const contagem = {
    ALL: 0,
    ROOKIE: 0,
    CHAMPION: 0,
    ULTIMATE: 0,
    MEGA: 0
  };

  (Array.isArray(database) ? database : []).forEach(function(digi) {
    const stage = normalizarStageDigidex(digi && digi.stage);
    if (!DIGIDEX_STAGES.includes(stage)) return;
    contagem.ALL += 1;
    contagem[stage] += 1;
  });

  document.querySelectorAll("[data-stage-count]").forEach(function(el) {
    const chave = String(el.getAttribute("data-stage-count") || "").toUpperCase();
    el.textContent = contagem[chave] ? String(contagem[chave]) : "0";
  });
}


/* =====================================================
   NAVEGAÇÃO
===================================================== */

/* =====================================================
   AJUSTE DE TELA — PÚBLICO / PERSISTENTE POR NAVEGADOR
===================================================== */

const HG_DISPLAY_SETTINGS_KEY = "hgDisplaySettingsV1";
const HG_DISPLAY_SETTINGS_COOKIE = "hgDisplaySettingsV1";
const HG_DISPLAY_MIN_SCALE = 80;
const HG_DISPLAY_MAX_SCALE = 150;
const HG_DISPLAY_STEP = 5;

const HG_DISPLAY_PRESETS = {
  auto: { scale: 100, ultrawide: false },
  compact: { scale: 90, ultrawide: false },
  comfortable: { scale: 110, ultrawide: false },
  large: { scale: 120, ultrawide: false },
  ultrawide: { scale: 112, ultrawide: true }
};

let hgDisplayState = {
  preset: "auto",
  scale: 100,
  ultrawide: false
};

function limitarHgDisplayScale(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return 100;
  return Math.min(HG_DISPLAY_MAX_SCALE, Math.max(HG_DISPLAY_MIN_SCALE, Math.round(numero)));
}

function normalizarHgDisplaySettingsSalvo(salvo) {
  if (!salvo || typeof salvo !== "object") return null;

  const ultrawide = Boolean(salvo.ultrawide);
  let preset = Object.prototype.hasOwnProperty.call(HG_DISPLAY_PRESETS, salvo.preset)
    ? salvo.preset
    : "custom";

  /* Se o usuário ajustou manualmente a escala depois de escolher ULTRAWIDE,
     o modo continua sendo ULTRAWIDE. Assim ele permanece visualmente ativo
     e volta exatamente como estava após F5 / retorno para uma partida. */
  if (ultrawide) preset = "ultrawide";

  return {
    preset: preset,
    scale: limitarHgDisplayScale(salvo.scale),
    ultrawide: ultrawide
  };
}

function lerHgDisplaySettingsCookie() {
  try {
    const prefixo = HG_DISPLAY_SETTINGS_COOKIE + "=";
    const item = String(document.cookie || "")
      .split(";")
      .map(function(valor) { return valor.trim(); })
      .find(function(valor) { return valor.indexOf(prefixo) === 0; });
    if (!item) return null;
    return JSON.parse(decodeURIComponent(item.slice(prefixo.length)));
  } catch (erro) {
    return null;
  }
}

function lerHgDisplaySettings() {
  let salvo = null;

  try {
    salvo = JSON.parse(localStorage.getItem(HG_DISPLAY_SETTINGS_KEY) || "null");
  } catch (erro) {
    salvo = null;
  }

  if (!salvo) salvo = lerHgDisplaySettingsCookie();
  return normalizarHgDisplaySettingsSalvo(salvo);
}

function salvarHgDisplaySettings() {
  const serializado = JSON.stringify(hgDisplayState);

  try {
    localStorage.setItem(HG_DISPLAY_SETTINGS_KEY, serializado);
  } catch (erro) {
    /* Mantemos cookie como fallback quando o storage estiver bloqueado. */
  }

  try {
    document.cookie = HG_DISPLAY_SETTINGS_COOKIE + "=" + encodeURIComponent(serializado) +
      "; path=/; max-age=31536000; SameSite=Lax";
  } catch (erro) {
    /* A interface continua funcionando mesmo sem persistência. */
  }
}

function atualizarHgDisplayRuntimeMetrics() {
  const root = document.documentElement;
  const body = document.body;
  if (!root || !body) return;

  if (!hgDisplayState.ultrawide || window.innerWidth < 2200) {
    root.style.removeProperty("--hg-pvp-ultrawide-arena-height");
    return;
  }

  const scale = limitarHgDisplayScale(hgDisplayState.scale) / 100;
  const viewportH = window.innerHeight || root.clientHeight || 900;
  const topbar = document.querySelector(".topbar");
  const headerH = topbar ? Math.max(0, topbar.getBoundingClientRect().height) : 0;

  /* A página usa CSS zoom. Em escala alta, 58vh também era ampliado e fazia
     a arena empurrar log/skills para baixo. Calculamos a altura em CSS px
     já descontando o zoom, reservando espaço para o HUD inferior. */
  const alturaInternaDisponivel = (viewportH - headerH - 24) / Math.max(.8, scale);
  const alturaHudInferior = 220;
  const estrutura = 66;
  const arena = Math.max(440, Math.min(650, Math.floor(alturaInternaDisponivel - alturaHudInferior - estrutura)));

  root.style.setProperty("--hg-pvp-ultrawide-arena-height", arena + "px");
}

function aplicarHgDisplaySettings(estado, persistir = true) {
  const body = document.body;
  if (!body) return;

  const scale = limitarHgDisplayScale(estado && estado.scale);
  const ultrawide = Boolean(estado && estado.ultrawide);
  const presetInformado = estado && estado.preset;
  const preset = Object.prototype.hasOwnProperty.call(HG_DISPLAY_PRESETS, presetInformado)
    ? presetInformado
    : "custom";

  hgDisplayState = { preset, scale, ultrawide };

  body.dataset.hgDisplayPreset = preset;
  body.classList.toggle("hg-display-scaled", scale !== 100);
  body.classList.toggle("hg-display-ultrawide", ultrawide);
  document.documentElement.style.setProperty("--hg-interface-scale", String(scale / 100));
  /* O header acompanha a preferência do usuário também.
     Mantemos um teto visual no CSS para não estourar a navegação em telas menores. */
  document.documentElement.style.setProperty("--hg-header-scale", String(scale / 100));
  atualizarHgDisplayRuntimeMetrics();

  if (persistir) salvarHgDisplaySettings();
  atualizarHgDisplaySettingsUi();
}

function selecionarHgDisplayPreset(nome) {
  const preset = HG_DISPLAY_PRESETS[nome] || HG_DISPLAY_PRESETS.auto;
  aplicarHgDisplaySettings({
    preset: HG_DISPLAY_PRESETS[nome] ? nome : "auto",
    scale: preset.scale,
    ultrawide: preset.ultrawide
  });
}

function ajustarHgDisplayScale(delta) {
  const atual = limitarHgDisplayScale(hgDisplayState.scale);
  const proximo = limitarHgDisplayScale(atual + Number(delta || 0));
  aplicarHgDisplaySettings({
    preset: hgDisplayState.ultrawide ? "ultrawide" : "custom",
    scale: proximo,
    ultrawide: hgDisplayState.ultrawide
  });
}

function definirHgDisplayScale(valor) {
  aplicarHgDisplaySettings({
    preset: hgDisplayState.ultrawide ? "ultrawide" : "custom",
    scale: limitarHgDisplayScale(valor),
    ultrawide: hgDisplayState.ultrawide
  });
}

function resetarHgDisplaySettings() {
  aplicarHgDisplaySettings({ preset: "auto", scale: 100, ultrawide: false });
}

function atualizarHgDisplayScreenInfo() {
  const screenEl = document.getElementById("hgDisplayScreenSize");
  const viewportEl = document.getElementById("hgDisplayViewportSize");

  if (screenEl) {
    const sw = window.screen && window.screen.width ? window.screen.width : "—";
    const sh = window.screen && window.screen.height ? window.screen.height : "—";
    screenEl.textContent = sw + " × " + sh;
  }

  if (viewportEl) {
    viewportEl.textContent = window.innerWidth + " × " + window.innerHeight;
  }
}

function atualizarHgDisplaySettingsUi() {
  const valor = limitarHgDisplayScale(hgDisplayState.scale);
  const scaleValue = document.getElementById("hgDisplayScaleValue");
  const manualValue = document.getElementById("hgDisplayManualValue");
  const range = document.getElementById("hgDisplayScaleRange");

  if (scaleValue) scaleValue.textContent = valor + "%";
  if (manualValue) manualValue.textContent = valor + "%";
  if (range && Number(range.value) !== valor) range.value = String(valor);

  document.querySelectorAll("[data-hg-display-preset]").forEach(function(botao) {
    botao.classList.toggle("ativo", botao.dataset.hgDisplayPreset === hgDisplayState.preset);
  });

  atualizarHgDisplayScreenInfo();
}

function abrirHgDisplaySettings() {
  const panel = document.getElementById("hgDisplaySettingsPanel");
  const trigger = document.getElementById("btnDisplaySettings");
  if (!panel) return;

  panel.hidden = false;
  panel.classList.add("aberto");
  if (trigger) trigger.setAttribute("aria-expanded", "true");
  atualizarHgDisplaySettingsUi();
}

function fecharHgDisplaySettings() {
  const panel = document.getElementById("hgDisplaySettingsPanel");
  const trigger = document.getElementById("btnDisplaySettings");
  if (!panel) return;

  panel.classList.remove("aberto");
  panel.hidden = true;
  if (trigger) trigger.setAttribute("aria-expanded", "false");
}

function toggleHgDisplaySettings(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  const panel = document.getElementById("hgDisplaySettingsPanel");
  if (!panel) return;
  if (panel.hidden) abrirHgDisplaySettings();
  else fecharHgDisplaySettings();
}

function inicializarHgDisplaySettings() {
  const salvo = lerHgDisplaySettings();
  if (salvo) aplicarHgDisplaySettings(salvo, false);
  else aplicarHgDisplaySettings({ preset: "auto", scale: 100, ultrawide: false }, false);

  document.addEventListener("click", function(event) {
    const panel = document.getElementById("hgDisplaySettingsPanel");
    const trigger = document.getElementById("btnDisplaySettings");
    if (!panel || panel.hidden) return;
    if (panel.contains(event.target) || (trigger && trigger.contains(event.target))) return;
    fecharHgDisplaySettings();
  });

  document.addEventListener("keydown", function(event) {
    if (event.key === "Escape") fecharHgDisplaySettings();
  });

  window.addEventListener("resize", function() {
    atualizarHgDisplayScreenInfo();
    atualizarHgDisplayRuntimeMetrics();
  }, { passive: true });

  /* pageshow também cobre F5, bfcache e retorno para a tela de partida. */
  window.addEventListener("pageshow", function() {
    const persistido = lerHgDisplaySettings();
    if (persistido) aplicarHgDisplaySettings(persistido, false);
    else atualizarHgDisplayRuntimeMetrics();
  });

  window.addEventListener("beforeunload", salvarHgDisplaySettings);
}

/* =====================================================
   HEADER RECOLHÍVEL — LOGO COMO CONTROLE
===================================================== */

const HG_HEADER_COLLAPSE_KEY = "hgHeaderCollapsed";

function aplicarEstadoSiteHeader(recolhido, persistir = true) {
  const topbar = document.querySelector(".topbar");
  const toggle = document.getElementById("headerToggle");
  const menu = document.getElementById("siteNavMenu");

  if (!topbar || !toggle || !menu) return;

  const fechado = Boolean(recolhido);
  topbar.classList.toggle("header-collapsed", fechado);

  toggle.setAttribute("aria-expanded", fechado ? "false" : "true");
  toggle.setAttribute("aria-label", fechado ? "Expandir menu" : "Recolher menu");
  toggle.setAttribute("title", fechado ? "Expandir menu" : "Recolher menu");
  menu.setAttribute("aria-hidden", fechado ? "true" : "false");

  /* Garante que o submenu PvP não fique logicamente aberto atrás do header. */
  if (fechado) {
    const dropdown = document.getElementById("pvpNavDropdown");
    const pvpMenu = document.getElementById("pvpNavMenu");
    const pvpButton = document.getElementById("btnPvp");
    const featuresDropdown = document.getElementById("featuresNavDropdown");
    const featuresMenu = document.getElementById("featuresNavMenu");
    const featuresButton = document.getElementById("btnFeatures");
    if (dropdown) dropdown.classList.remove("aberto", "open");
    if (pvpMenu) pvpMenu.classList.remove("aberto", "open");
    if (pvpButton) pvpButton.setAttribute("aria-expanded", "false");
    if (featuresDropdown) featuresDropdown.classList.remove("aberto", "open");
    if (featuresMenu) featuresMenu.classList.remove("aberto", "open");
    if (featuresButton) featuresButton.setAttribute("aria-expanded", "false");
  }

  if (persistir) {
    try {
      localStorage.setItem(HG_HEADER_COLLAPSE_KEY, fechado ? "1" : "0");
    } catch (erro) {
      /* O header continua funcionando mesmo se o storage estiver bloqueado. */
    }
  }
}

function toggleSiteHeader(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  /* Se o painel de tela estiver aberto, fecha antes de recolher a navegação. */
  if (typeof fecharHgDisplaySettings === "function") {
    fecharHgDisplaySettings();
  }

  const topbar = document.querySelector(".topbar");
  if (!topbar) return;

  aplicarEstadoSiteHeader(!topbar.classList.contains("header-collapsed"));
}

function inicializarSiteHeaderRecolhivel() {
  const toggle = document.getElementById("headerToggle");
  if (!toggle) return;

  let recolhido = false;
  try {
    recolhido = localStorage.getItem(HG_HEADER_COLLAPSE_KEY) === "1";
  } catch (erro) {
    recolhido = false;
  }

  aplicarEstadoSiteHeader(recolhido, false);

  toggle.addEventListener("keydown", function(event) {
    if (event.key === "Enter" || event.key === " ") {
      toggleSiteHeader(event);
    }
  });
}

function mostrarPagina(
  id,
  botao,
  atualizarUrl = true
) {

  document
    .querySelectorAll(
      ".pagina"
    )
    .forEach(
      function(pagina) {

        pagina
          .classList
          .remove(
            "ativa"
          );

      }
    );


  const pagina =
    document.getElementById(
      id
    );


  if (pagina) {

    pagina
      .classList
      .add(
        "ativa"
      );

  }


  document
    .querySelectorAll(
      ".nav-button"
    )
    .forEach(
      function(btn) {

        btn
          .classList
          .remove(
            "ativo"
          );

      }
    );


  if (botao) {

    botao
      .classList
      .add(
        "ativo"
      );

  }


  if (atualizarUrl) {

    const mapaRotas = {
      homePagina: "home",
      databasePagina: "digidex",
      digivolutionPagina: "digivolution",
      comparacaoPagina: "comparacao",
      builderPagina: "team-builder",
      statusSimulatorPagina: "status-simulator",
      elementosPagina: "elementos",
      pvpPagina: "pvp",
      calculadoraPagina: "calculadora",
      raidBossPagina: "raid-boss",
      dekyuTreasurePagina: "dekyu-treasure",
      sorteioPagina: "sorteio",
      socialPagina: "comunidade"
    };

    const rota =
      mapaRotas[id] || "home";

    if (
      window.location.hash !==
      "#" + rota
    ) {
      history.pushState(
        { pagina: id },
        "",
        "#" + rota
      );
    }

  }


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


function abrirPaginaPelaUrl() {

  const rotaInfo = rotaDigidexPerfilAtual();
  const rota = rotaInfo.base;

  const mapa = {
    home: { pagina: "homePagina", botao: "btnHome" },
    digidex: { pagina: "databasePagina", botao: "btnDatabase" },
    digivolution: { pagina: "digivolutionPagina", botao: "btnDigivolution" },
    comparacao: { pagina: "comparacaoPagina", botao: "btnComparacao" },
    "team-builder": { pagina: "builderPagina", botao: "btnBuilder" },
    "status-simulator": { pagina: "statusSimulatorPagina", botao: "btnStatusSimulator" },
    elementos: { pagina: "elementosPagina", botao: "btnElementos" },
    pvp: { pagina: "pvpPagina", botao: "btnPvp" },
    calculadora: { pagina: "calculadoraPagina", botao: "btnCalculadora" },
    "raid-boss": { pagina: "raidBossPagina", botao: "btnRaidBoss" },
    "dekyu-treasure": { pagina: "dekyuTreasurePagina", botao: "btnDekyuTreasure" },
    sorteio: { pagina: "sorteioPagina", botao: "btnFeatures" },
    social: { pagina: "socialPagina", botao: "btnSocial" },
    comunidade: { pagina: "socialPagina", botao: "btnSocial" }
  };

  const destino = mapa[rota] || mapa.home;

  mostrarPagina(
    destino.pagina,
    document.getElementById(destino.botao),
    false
  );

  if (rota !== "digidex") return;

  if (!rotaInfo.perfil) {
    fecharPerfilDigidex(true);
    return;
  }

  // No primeiro carregamento a DATABASE pode ainda estar chegando da API.
  // Esperamos ela para que HP/SP/STR/etc. já apareçam no perfil restaurado pelo F5.
  if (!Array.isArray(database) || !database.length) return;

  abrirPerfilDigidex(rotaInfo.perfil, false, true);
}


/* =====================================================
   IMAGENS
===================================================== */

function pegarImagem(nome) {

  const chave =
    String(
      nome || ""
    )
      .trim()
      .toLowerCase()
      .replace(
        /\.$/,
        ""
      );

  return (
    imagensSite[chave] ||
    imagensSite[
      chave + "."
    ] ||
    ""
  );

}


function definirImagem(
  id,
  nome
) {

  const elemento =
    document.getElementById(
      id
    );

  if (!elemento) {
    return;
  }


  const src =
    pegarImagem(
      nome
    );


  if (src) {

    elemento.src =
      src;

  }

}


/* =====================================================
   ASSETS HOME
===================================================== */

function aplicarAssetsHome() {

  const hero =
    document.getElementById(
      "heroHome"
    );


  const fundo =
    pegarImagem(
      "fundo_site"
    ) ||
    pegarImagem(
      "fundo_home"
    );


  if (hero) {

    if (fundo) {

      const homePagina =
        document.getElementById(
          "homePagina"
        );

      if (homePagina) {
        homePagina.style.setProperty(
          "--home-background",
          `url("${fundo}")`
        );
      }

      console.log(
        "✅ FUNDO V7:",
        fundo
      );

    } else {

      console.log(
        "❌ fundo_site / fundo_home NÃO encontrado no Drive"
      );

    }

  }


  definirImagem(
    "heroLettering",
    "lettering_hg_dsr"
  );


  definirImagem(
    "heroArt",
    "arte_principal"
  );


  definirImagem(
    "historyDmoLucemon",
    "digimonmasters"
  );


  definirImagem(
    "historyDmoNa",
    "digimonmasters"
  );


  definirImagem(
    "historyLadmo",
    "dmo"
  );


  definirImagem(
    "historyDsr",
    "dsr"
  );


  definirImagem(
    "historyFlagUsa",
    "flag_usa"
  );


  definirImagem(
    "historyFlagKorea",
    "flag_korea"
  );


  definirImagem(
    "serverUsa",
    "flag_usa"
  );


  definirImagem(
    "serverKorea",
    "flag_korea"
  );


  definirImagem(
    "historyIconNa",
    "icon_na"
  );


  definirImagem(
    "historyIconOmegamon",
    "icon_na"
  );


  definirImagem(
    "historyIconAlphamon",
    "icon_na"
  );


  definirImagem(
    "footerYoutube",
    "youtube"
  );


  definirImagem(
    "footerTwitch",
    "twitch"
  );


  definirImagem(
    "footerDiscord",
    "discord"
  );


  definirImagem(
    "socialYoutube",
    "youtube"
  );


  definirImagem(
    "socialTwitch",
    "twitch"
  );


  definirImagem(
    "socialDiscord",
    "discord"
  );


  definirImagem(
    "socialMikomode",
    "Mikomode"
  );


  definirImagem(
    "elementosSceneArt",
    "elementos_hakase"
  );


  definirImagem(
    "navIconHome",
    "icon_home"
  );


  definirImagem(
    "navIconDigidex",
    "icon_digidex"
  );


  definirImagem(
    "navIconComparacao",
    "comparlayout"
  );


  definirImagem(
    "comparacaoHeroIcon",
    "icon_compar"
  );


  definirImagem(
    "navIconBuilder",
    "icon_builder"
  );


  definirImagem(
    "navIconPvp",
    "icon_builder"
  );


  definirImagem(
    "navIconElementos",
    "icon_elementos"
  );


  definirImagem(
    "navIconCalculadora",
    "icon_calculadora"
  );


  definirImagem(
    "navIconSocial",
    "icon_social"
  );


  definirImagem(
    "heroIconDigidex",
    "icon_digidex"
  );


  definirImagem(
    "heroIconBuilder",
    "icon_builder"
  );

}


/* =====================================================
   STAFF
===================================================== */

function criarStaff() {

  const masterContainer =
    document.getElementById(
      "staffMaster"
    );


  const subsContainer =
    document.getElementById(
      "staffSubs"
    );


  if (
    !masterContainer ||
    !subsContainer
  ) {

    return;

  }


  masterContainer.innerHTML =
    "";


  subsContainer.innerHTML =
    "";


  const master =
    staff.find(
      function(pessoa) {

        return (
          pessoa.cargo ===
          "MASTER"
        );

      }
    );


  if (master) {

    const imagem =
      pegarImagem(
        master.imagem
      );


    masterContainer.innerHTML = `

      <div class="staff-avatar">

        ${
          imagem
          ?
          `<img src="${imagem}">`
          :
          "👤"
        }

      </div>


      <div>

        <div class="master-label">
          👑 MASTER
        </div>

        <div class="master-name">
          ${master.nome}
        </div>

      </div>

    `;

  }


  staff
    .filter(
      function(pessoa) {

        return (
          pessoa.cargo ===
          "SUB"
        );

      }
    )
    .forEach(
      function(pessoa) {

        const imagem =
          pegarImagem(
            pessoa.imagem
          );


        const item =
          document.createElement(
            "div"
          );


        item.className =
          "staff-sub";


        item.innerHTML = `

          <div class="staff-avatar">

            ${
              imagem
              ?
              `<img src="${imagem}">`
              :
              "👤"
            }

          </div>

          <div class="staff-sub-name">
            ${pessoa.nome}
          </div>

        `;


        subsContainer.appendChild(
          item
        );

      }
    );

}


/* =====================================================
   DIGIDEX
===================================================== */

/* =====================================================
   V16 — FIELD POR ÍCONES DO DRIVE
===================================================== */

function separarFields(valor) {

  return String(
    valor || ""
  )
    .toUpperCase()
    .replace(/[\/|,;+]+/g, " ")
    .split(/\s+/)
    .map(function(item) {
      return item.trim();
    })
    .filter(Boolean);

}


function pegarImagemField(codigo) {

  const field =
    String(codigo || "")
      .trim()
      .toLowerCase();

  if (!field) {
    return "";
  }

  const candidatos = [
    field,
    "field_" + field,
    "field-" + field,
    "field " + field,
    "icone_" + field,
    "icon_" + field
  ];

  for (let i = 0; i < candidatos.length; i++) {

    const src =
      pegarImagem(
        candidatos[i]
      );

    if (src) {
      return src;
    }

  }

  return "";

}



/* =====================================================
   IMAGENS DOS ELEMENTOS
===================================================== */

function pegarImagemElemento(codigo) {

  const normalizado=normalizarElemento(codigo);
  if(!normalizado)return "";

  const aliases=(normalizado==="STEEL"||normalizado==="IRON")
    ?["iron","steel"]
    :[normalizado.toLowerCase()];

  for(let a=0;a<aliases.length;a++){

    const elemento=aliases[a];

    const candidatos=[
      elemento,
      elemento+".png",
      elemento+".webp",
      "elemento_"+elemento,
      "element_"+elemento,
      "icone_"+elemento,
      "icon_"+elemento
    ];

    for(let i=0;i<candidatos.length;i++){

      const candidato=candidatos[i];
      const srcDireto=pegarImagem(candidato);

      if(srcDireto){
        return srcDireto;
      }

      const chaveEncontrada=Object.keys(imagensSite||{}).find(function(chave){

        const limpa=String(chave||"")
          .trim()
          .toLowerCase()
          .replace(/\.(png|webp|jpg|jpeg)$/i,"")
          .replace(/^(elemento_|element_|icone_|icon_)/,"");

        return limpa===elemento;
      });

      if(chaveEncontrada){
        return imagensSite[chaveEncontrada]||"";
      }
    }
  }

  return "";
}


function renderizarIconeElemento(valor) {

  const elemento =
    normalizarElemento(
      valor
    );

  if (!elemento) {
    return "-";
  }

  const src =
    pegarImagemElemento(
      elemento
    );

  if (!src) {

    return `
      <span
        class="element-icon-fallback"
        title="${elemento}"
      >
        ${elemento}
      </span>
    `;

  }

  return `
    <span
      class="element-icon-wrap"
      title="${elemento}"
      aria-label="${elemento}"
    >
      <img
        class="element-icon-img"
        src="${src}"
        alt="${elemento}"
      >
    </span>
  `;

}


/* =====================================================
   V18 — PADRONIZAÇÃO VISUAL AUTOMÁTICA DOS FIELDs
   =====================================================
   Alguns PNGs possuem margens transparentes muito maiores.
   Aqui medimos apenas os pixels visíveis e escalamos cada ícone
   para que todos ocupem aproximadamente o mesmo tamanho aparente.
===================================================== */

function normalizarIconeField(img) {

  if (!img || !img.naturalWidth || !img.naturalHeight) {
    return;
  }

  try {

    const canvas =
      document.createElement("canvas");

    const largura =
      img.naturalWidth;

    const altura =
      img.naturalHeight;

    canvas.width = largura;
    canvas.height = altura;

    const ctx =
      canvas.getContext(
        "2d",
        { willReadFrequently: true }
      );

    ctx.clearRect(
      0,
      0,
      largura,
      altura
    );

    ctx.drawImage(
      img,
      0,
      0,
      largura,
      altura
    );

    const pixels =
      ctx.getImageData(
        0,
        0,
        largura,
        altura
      ).data;

    let minX = largura;
    let minY = altura;
    let maxX = -1;
    let maxY = -1;

    /*
     * Alpha 12 evita contar sombras/transparências quase invisíveis
     * como parte do tamanho principal do símbolo.
     */
    const alphaMinimo = 12;

    for (let y = 0; y < altura; y++) {

      for (let x = 0; x < largura; x++) {

        const alpha =
          pixels[
            (y * largura + x) * 4 + 3
          ];

        if (alpha <= alphaMinimo) {
          continue;
        }

        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;

      }

    }

    if (
      maxX < minX ||
      maxY < minY
    ) {
      return;
    }

    const visivelW =
      maxX - minX + 1;

    const visivelH =
      maxY - minY + 1;

    const fracaoVisivel =
      Math.max(
        visivelW / largura,
        visivelH / altura
      );

    if (!fracaoVisivel) {
      return;
    }

    /*
     * 29px = tamanho visual-alvo.
     * O DA, que já estava com o tamanho desejado, fica praticamente
     * inalterado; PNGs com muita borda transparente são ampliados.
     */
    const tamanhoBase = 46;
    const tamanhoVisualAlvo = 40;

    let escala =
      tamanhoVisualAlvo /
      (tamanhoBase * fracaoVisivel);

    /* Limites de segurança para nenhum arquivo aberrante explodir. */
    escala =
      Math.max(
        0.82,
        Math.min(
          escala,
          2.25
        )
      );

    img.style.setProperty(
      "--field-auto-scale",
      escala.toFixed(3)
    );

  } catch (erro) {

    /*
     * Se algum navegador bloquear a leitura do PNG no canvas,
     * mantemos o tamanho original em vez de quebrar a Digidex.
     */
    img.style.setProperty(
      "--field-auto-scale",
      "1"
    );

    console.warn(
      "Não foi possível normalizar o FIELD",
      img.alt || "",
      erro
    );

  }

}


function renderizarField(valor) {

  const fields =
    separarFields(
      valor
    );

  if (!fields.length) {
    return "-";
  }

  return `
    <div class="field-icons">
      ${fields.map(function(codigo) {

        const src =
          pegarImagemField(
            codigo
          );

        if (src) {
          return `
            <span
              class="field-icon-item"
              title="${codigo}"
              aria-label="${codigo}"
            >
              <img
                class="field-icon-img"
                src="${src}"
                alt="${codigo}"
                loading="lazy"
                onload="normalizarIconeField(this)"
              >
            </span>
          `;
        }

        return `
          <span
            class="field-icon-fallback"
            title="${codigo}"
          >
            ${codigo}
          </span>
        `;

      }).join("")}
    </div>
  `;

}


function criarCard(d) {

  const tipo =
    normalizarType(
      d.type
    );


  const classeTipo =
    getClasseType(
      tipo
    );


  const fallbackCard = fallbackSourceDigimonEvolution(d.digimon);
  const fallbackCardAttr = fallbackCard && fallbackCard !== d.icon
    ? ` onerror="this.onerror=null;this.src='${escaparHtml(fallbackCard)}'"`
    : "";

  const imagem =
    d.icon
      ?
      `

        <div class="card-image">

          <img
            src="${escaparHtml(d.icon)}"
            alt="${escaparHtml(d.digimon)}"
            loading="lazy"${fallbackCardAttr}
          >

        </div>

      `
      :
      `

        <div class="card-image">
          ⚔️
        </div>

      `;


  const nomeCodificado = encodeURIComponent(String(d.digimon || ""));
  const cardMutant = /^\s*\[mutant\]/i.test(String(d.digimon || ""));

  return `

    <div class="card digidex-profile-trigger${cardMutant ? " is-mutant-digidex" : ""}" role="button" tabindex="0"
      onclick="abrirPerfilDigidex(decodeURIComponent('${nomeCodificado}'))"
      onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();abrirPerfilDigidex(decodeURIComponent('${nomeCodificado}'));}">

      ${imagem}

      <h2 class="card-name">
        ${d.digimon}
      </h2>

      <div class="stats">

        <div class="type ${classeTipo}">
          <span class="type-label">TYPE</span>
          ${renderizarTypeIcon(tipo)}
        </div>

        <div class="stat">
          <div class="label">CC</div>
          <div class="value">${d.cc || "-"}</div>
        </div>

        <div class="stat">
          <div class="label">DOT</div>
          <div class="value">${d.dot || "-"}</div>
        </div>

        <div class="stat">
          <div class="label">HP</div>
          <div class="value">${d.hp || "-"}</div>
        </div>

        <div class="stat">
          <div class="label">SP</div>
          <div class="value">${d.sp || "-"}</div>
        </div>

        <div class="stat">
          <div class="label">STR</div>
          <div class="value">${d.str || "-"}</div>
        </div>

        <div class="stat">
          <div class="label">INT</div>
          <div class="value">${d.int || "-"}</div>
        </div>

        <div class="stat">
          <div class="label">DEF</div>
          <div class="value">${d.def || "-"}</div>
        </div>

        <div class="stat">
          <div class="label">RES</div>
          <div class="value">${d.res || "-"}</div>
        </div>

        <div class="stat">
          <div class="label">SPD</div>
          <div class="value">${d.spd || "-"}</div>
        </div>

        <div class="stat">
          <div class="label">DEF BREAK</div>
          <div class="value">${d.defBreak || "-"}</div>
        </div>

        <div
          class="stat"
          style="grid-column:1/-1;"
        >

          <div class="label">
            FIELD
          </div>

          <div class="value">
            ${renderizarField(d.field)}
          </div>

        </div>

        <div class="stat strong element-stat">

          <div class="label">
            STRONG
          </div>

          <div class="value">
            ${renderizarRelacaoAtributo(d,"strong")}
          </div>

        </div>

        <div class="stat weak element-stat">

          <div class="label">
            WEAK
          </div>

          <div class="value">
            ${renderizarRelacaoAtributo(d,"weak")}
          </div>

        </div>

      </div>

    </div>

  `;

}


function filtrar() {

  const campo =
    document.getElementById(
      "pesquisa"
    );

  const ordenacao =
    document.getElementById(
      "ordenacao"
    );


  const texto =
    campo
      ? campo.value.toLowerCase().trim()
      : "";


  const tipoSelecionado =
    filtroTypeSelecionado;

  const stageSelecionado =
    filtroStageSelecionado;

  atualizarContadoresStageDigidex();


  const ordem =
    ordenacao
      ? ordenacao.value
      : "";


  const elementosSelecionados =
    valoresMarcadosDigidex(
      ".digidex-skill-element-check"
    ).map(normalizarElemento);


  const fieldsSelecionados =
    valoresMarcadosDigidex(
      ".digidex-field-check"
    );


  const efeitosSelecionados =
    valoresMarcadosDigidex(
      ".digidex-effect-check"
    );


  const buscarSkill1 =
    document.getElementById("filtroSkill1")
      ? document.getElementById("filtroSkill1").checked
      : true;

  const buscarSkill2 =
    document.getElementById("filtroSkill2")
      ? document.getElementById("filtroSkill2").checked
      : true;

  const buscarSkill3 =
    document.getElementById("filtroSkill3")
      ? document.getElementById("filtroSkill3").checked
      : true;


  let filtrados =
    database.filter(
      function(d) {

        const nome =
          String(d.digimon || "")
            .toLowerCase();


        const tipo =
          normalizarType(d.type);

        const stage =
          normalizarStageDigidex(d.stage);


        const nomeOk =
          nome.includes(texto);


        const tipoOk =
          !tipoSelecionado ||
          tipo === tipoSelecionado;

        const stageOk =
          DIGIDEX_STAGES.includes(stage) &&
          (!stageSelecionado || stage === stageSelecionado);


        let skillOk = true;

        if (elementosSelecionados.length) {

          const skillsSelecionadas = [];

          if (buscarSkill1) {
            skillsSelecionadas.push(
              obterElementosSkill(d.skill1)
            );
          }

          if (buscarSkill2) {
            skillsSelecionadas.push(
              obterElementosSkill(d.skill2)
            );
          }

          if (buscarSkill3) {
            skillsSelecionadas.push(
              obterElementosSkill(d.skill3)
            );
          }

          skillOk =
            skillsSelecionadas.length > 0 &&
            skillsSelecionadas.every(
              function(elementosDaSkill) {
                return elementosSelecionados.some(
                  function(elemento) {
                    return elementosDaSkill.includes(
                      elemento
                    );
                  }
                );
              }
            );

        }


        let fieldOk = true;

        if (fieldsSelecionados.length) {

          const fieldsDoDigimon =
            separarFields(d.field)
              .map(function(field) {
                return field.toUpperCase();
              });

          fieldOk =
            fieldsSelecionados.some(
              function(field) {
                return fieldsDoDigimon.includes(
                  field
                );
              }
            );

        }


        let efeitoOk = true;

        if (efeitosSelecionados.length) {

          efeitoOk = efeitosSelecionados.some(function(efeito) {

            if (efeito === "DOT") {
              return valorPossuiEfeitoDigidex(d.dot);
            }

            if (efeito === "CC") {
              return valorPossuiEfeitoDigidex(d.cc);
            }

            if (efeito === "DEF_BREAK") {
              return valorPossuiEfeitoDigidex(d.defBreak);
            }

            return false;

          });

        }


        return (
          nomeOk &&
          tipoOk &&
          stageOk &&
          skillOk &&
          fieldOk &&
          efeitoOk
        );

      }
    );


  if (!ordem) {

    filtrados.sort(
      function(a,b) {

        return String(
          a.digimon || ""
        ).localeCompare(
          String(b.digimon || "")
        );

      }
    );

  } else {

    let campoOrdenacao =
      ordem;

    let crescente =
      false;


    if (ordem.endsWith("_ASC")) {

      crescente = true;

      campoOrdenacao =
        ordem.replace(
          "_ASC",
          ""
        );

    }


    filtrados.sort(
      function(a,b) {

        const chave =
          campoOrdenacao.toLowerCase();

        const valorA =
          Number(a[chave]) || 0;

        const valorB =
          Number(b[chave]) || 0;

        return crescente
          ? valorA - valorB
          : valorB - valorA;

      }
    );

  }


  const lista =
    document.getElementById(
      "lista"
    );


  if (!lista) {
    return;
  }


  atualizarContadoresFiltrosDigidex();
  atualizarBotoesViewDigidex();


  if (!filtrados.length) {

    lista.className =
      digidexView === "table"
        ? "digidex-table-container"
        : "grid";

    lista.innerHTML = `
      <div class="erro">
        Nenhum Digimon encontrado.
      </div>
    `;

    return;

  }


  if (digidexView === "table") {

    lista.className =
      "digidex-table-container";

    lista.innerHTML =
      renderizarTabelaDigidex(
        filtrados
      );

    return;

  }


  lista.className =
    "grid";

  lista.innerHTML =
    filtrados
      .map(criarCard)
      .join("");

}


/* =====================================================
   DIGIDEX — PERFIL + EVOLUTION TREE
===================================================== */

const HG_EVOLUTION_CACHE_KEY = "hg_evolution_master_20260818_v5";
let evolutionMaster = null;
let evolutionMasterPromise = null;
let digidexEvolutionTrail = [];

function normalizarNomeEvolution(valor) {
  let nome = String(valor || "").trim().toLowerCase();
  try {
    nome = nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  } catch (erro) {}
  return nome
    .replace(/\\/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function criarSlugDigidexPerfil(valor) {
  let nome = String(valor || "").trim().toLowerCase();
  try {
    nome = nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  } catch (erro) {}
  return nome
    .replace(/\[mutant\]/g, " mutant ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "digimon";
}

function rotaDigidexPerfilAtual() {
  const bruto = String(window.location.hash || "#home").replace(/^#/, "");
  const partes = bruto.split("/");
  const base = String(partes.shift() || "home").trim().toLowerCase();
  let perfil = partes.join("/").trim();
  try { perfil = decodeURIComponent(perfil); } catch (erro) {}
  return { base: base, perfil: perfil };
}

function atualizarUrlPerfilDigidex(current, substituir) {
  if (!current) return;
  const slug = criarSlugDigidexPerfil(current.name);
  const hash = "#digidex/" + encodeURIComponent(slug);
  if (window.location.hash === hash) return;
  const metodo = substituir ? "replaceState" : "pushState";
  history[metodo]({ pagina: "databasePagina", digimon: current.name, did: current.did }, "", hash);
}


function numeroEvolution(valor) {
  if (valor == null) return null;
  const texto = String(valor).trim();
  if (!texto) return null;
  const numero = Number(texto.replace(",", "."));
  return Number.isFinite(numero) ? numero : null;
}

function formatarEvolutionNumero(valor) {
  const numero = numeroEvolution(valor);
  if (numero === null) return "";
  return String(Math.round(numero * 100) / 100).replace(".", ",");
}

function evolutionCacheSalvar(dados) {
  try {
    localStorage.setItem(HG_EVOLUTION_CACHE_KEY, JSON.stringify({
      savedAt: Date.now(),
      data: dados
    }));
  } catch (erro) {
    // Sem problema: a sessão continua usando a cópia em memória.
  }
}

function evolutionCacheLer() {
  try {
    /* F5/Ctrl+F5 deve sempre refletir mudanças feitas na MASTER. */
    const navegacao = performance && performance.getEntriesByType
      ? performance.getEntriesByType("navigation")[0]
      : null;
    if (navegacao && navegacao.type === "reload") return null;

    const bruto = localStorage.getItem(HG_EVOLUTION_CACHE_KEY);
    if (!bruto) return null;
    const pacote = JSON.parse(bruto);
    const dados = pacote && pacote.data ? pacote.data : pacote;
    const salvoEm = pacote && pacote.savedAt ? Number(pacote.savedAt) : 0;

    /* Em navegação normal, refresca automaticamente após 5 minutos. */
    if (salvoEm && Date.now() - salvoEm > 5 * 60 * 1000) return null;
    if (!dados || !Array.isArray(dados.digimons) || !Array.isArray(dados.evolutions)) return null;
    return dados;
  } catch (erro) {
    return null;
  }
}

function prepararIndicesEvolution(dados) {
  if (!dados || dados.__indexed) return dados;

  dados.byDid = {};
  dados.byName = {};
  dados.bySlug = {};
  dados.skillsByDid = {};
  dados.incomingByDid = {};
  dados.outgoingByDid = {};

  (dados.digimons || []).forEach(function(d) {
    if (d.did != null) dados.byDid[String(d.did)] = d;
    dados.byName[normalizarNomeEvolution(d.name)] = d;
    const slug = criarSlugDigidexPerfil(d.name);
    if (!dados.bySlug[slug]) dados.bySlug[slug] = d;
  });

  (dados.skills || []).forEach(function(skill) {
    const key = String(skill.did == null ? "" : skill.did);
    if (!dados.skillsByDid[key]) dados.skillsByDid[key] = [];
    dados.skillsByDid[key].push(skill);
  });

  Object.keys(dados.skillsByDid).forEach(function(key) {
    dados.skillsByDid[key].sort(function(a, b) {
      return (Number(a.slot) || 0) - (Number(b.slot) || 0);
    });
  });

  (dados.evolutions || []).forEach(function(evo) {
    const fromKey = String(evo.fromDid == null ? "" : evo.fromDid);
    const partnerKey = String(evo.partnerDid == null ? "" : evo.partnerDid);
    const toKey = String(evo.toDid == null ? "" : evo.toDid);

    if (fromKey) {
      if (!dados.outgoingByDid[fromKey]) dados.outgoingByDid[fromKey] = [];
      dados.outgoingByDid[fromKey].push(evo);
    }

    if (partnerKey) {
      if (!dados.outgoingByDid[partnerKey]) dados.outgoingByDid[partnerKey] = [];
      dados.outgoingByDid[partnerKey].push(evo);
    }

    if (toKey) {
      if (!dados.incomingByDid[toKey]) dados.incomingByDid[toKey] = [];
      dados.incomingByDid[toKey].push(evo);
    }
  });

  Object.defineProperty(dados, "__indexed", {
    value: true,
    enumerable: false,
    configurable: true
  });

  return dados;
}

function carregarEvolutionMaster() {
  if (evolutionMaster) return Promise.resolve(evolutionMaster);
  if (evolutionMasterPromise) return evolutionMasterPromise;

  const cache = evolutionCacheLer();
  if (cache) {
    evolutionMaster = prepararIndicesEvolution(cache);
    return Promise.resolve(evolutionMaster);
  }

  evolutionMasterPromise = chamarApiJsonp("evolution-master")
    .then(function(resposta) {
      const dados = resposta && resposta.evolutionMaster;
      if (!dados || !Array.isArray(dados.digimons)) {
        throw new Error("DIGIVOLUTION MASTER retornou dados inválidos.");
      }
      evolutionCacheSalvar(dados);
      evolutionMaster = prepararIndicesEvolution(dados);
      return evolutionMaster;
    })
    .finally(function() {
      evolutionMasterPromise = null;
    });

  return evolutionMasterPromise;
}

function encontrarDigimonEvolution(nomeOuDid) {
  if (!evolutionMaster) return null;
  const chaveDid = String(nomeOuDid == null ? "" : nomeOuDid);
  if (evolutionMaster.byDid && evolutionMaster.byDid[chaveDid]) {
    return evolutionMaster.byDid[chaveDid];
  }
  const porNome = evolutionMaster.byName[normalizarNomeEvolution(nomeOuDid)];
  if (porNome) return porNome;
  const slug = criarSlugDigidexPerfil(nomeOuDid);
  return evolutionMaster.bySlug && evolutionMaster.bySlug[slug] || null;
}

function encontrarDatabaseEvolution(nome) {
  const alvo = normalizarNomeEvolution(nome);
  return (database || []).find(function(d) {
    return normalizarNomeEvolution(d.digimon) === alvo;
  }) || null;
}

function fecharPerfilDigidex(semAtualizarUrl) {
  const pagina = document.getElementById("databasePagina");
  const perfil = document.getElementById("digidexProfile");
  if (pagina) pagina.classList.remove("digidex-profile-open");
  if (perfil) perfil.hidden = true;
  digidexEvolutionTrail = [];
  if (!semAtualizarUrl && window.location.hash !== "#digidex") {
    history.pushState({ pagina: "databasePagina" }, "", "#digidex");
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function abrirPerfilDigidex(nomeOuDid, navegando, semAtualizarUrl) {
  const pagina = document.getElementById("databasePagina");
  const perfil = document.getElementById("digidexProfile");
  if (!pagina || !perfil) return;

  pagina.classList.add("digidex-profile-open");
  perfil.hidden = false;
  perfil.innerHTML = `
    <div class="digidex-profile-loading">
      <span class="digidex-profile-loading-dot"></span>
      CARREGANDO DIGIVOLUTION MASTER...
    </div>
  `;

  carregarEvolutionMaster()
    .then(function() {
      const current = encontrarDigimonEvolution(nomeOuDid);
      if (!current) {
        throw new Error("Digimon não encontrado na DIGIVOLUTION MASTER: " + nomeOuDid);
      }

      if (!navegando) {
        digidexEvolutionTrail = [];
      }

      const last = digidexEvolutionTrail[digidexEvolutionTrail.length - 1];
      if (!last || String(last.did) !== String(current.did)) {
        digidexEvolutionTrail.push({ did: current.did, name: current.name });
      }

      if (!semAtualizarUrl) atualizarUrlPerfilDigidex(current, false);
      renderizarPerfilDigidexEvolution(current);
      window.scrollTo({ top: 0, behavior: "smooth" });
    })
    .catch(function(erro) {
      perfil.innerHTML = `
        <div class="digidex-profile-error">
          <strong>Não foi possível abrir o perfil.</strong>
          <span>${escaparHtml(erro && erro.message ? erro.message : String(erro))}</span>
          <button type="button" onclick="fecharPerfilDigidex()">VOLTAR PARA A DIGIDEX</button>
        </div>
      `;
    });
}

function navegarEvolutionDid(did) {
  abrirPerfilDigidex(String(did), true);
}

function voltarTrilhaEvolution(indice) {
  if (indice < 0 || indice >= digidexEvolutionTrail.length) return;
  const item = digidexEvolutionTrail[indice];
  digidexEvolutionTrail = digidexEvolutionTrail.slice(0, indice);
  abrirPerfilDigidex(String(item.did), true);
}

function dedupeEvolutionRows(rows, currentDid) {
  const mapa = {};

  (rows || []).forEach(function(row) {
    const key = [row.toDid, row.category, row.subtype].join("|");
    const atual = mapa[key];
    if (!atual) {
      mapa[key] = row;
      return;
    }

    const currentName = encontrarDigimonEvolution(currentDid);
    const nomeAtual = currentName ? normalizarNomeEvolution(currentName.name) : "";
    const ownerNovo = normalizarNomeEvolution(row.requirementOwner);
    const ownerAtual = normalizarNomeEvolution(atual.requirementOwner);

    if (ownerNovo === nomeAtual && ownerAtual !== nomeAtual) {
      mapa[key] = row;
    }
  });

  return Object.keys(mapa).map(function(key) { return mapa[key]; });
}

function incomingEvolutionSources(current) {
  const rows = (evolutionMaster.incomingByDid[String(current.did)] || []);
  const mapa = {};

  rows.forEach(function(row) {
    [
      { did: row.fromDid, name: row.from, stage: row.fromStage, icon: row.fromIcon },
      row.partnerDid ? { did: row.partnerDid, name: row.partner, stage: row.partnerStage, icon: row.partnerIcon } : null
    ].filter(Boolean).forEach(function(source) {
      const key = String(source.did || normalizarNomeEvolution(source.name));
      if (!mapa[key]) mapa[key] = source;
    });
  });

  return Object.keys(mapa).map(function(key) { return mapa[key]; });
}

function outgoingEvolutionRows(current) {
  return dedupeEvolutionRows(
    evolutionMaster.outgoingByDid[String(current.did)] || [],
    current.did
  ).sort(function(a, b) {
    const pa = numeroEvolution(a.probability);
    const pb = numeroEvolution(b.probability);
    return (pb == null ? -1 : pb) - (pa == null ? -1 : pa);
  });
}

function renderEvolutionStage(stage) {
  const valor = String(stage || "-").toUpperCase();
  return `<span class="digidex-evo-stage digidex-evo-stage-${valor.toLowerCase().replace(/[^a-z0-9]+/g,"-")}">${escaparHtml(valor)}</span>`;
}

function renderEvolutionProbability(probability) {
  const valor = numeroEvolution(probability);
  return valor === null
    ? ""
    : `<strong class="digidex-evo-probability">${escaparHtml(formatarEvolutionNumero(valor))}%</strong>`;
}

function evolutionStatsComRequisito(row) {
  const stats = row && row.stats ? row.stats : {};
  return ["str", "int", "def", "res", "spd"].filter(function(stat) {
    const info = stats[stat] || {};
    return numeroEvolution(info.required) !== null || numeroEvolution(info.percent) !== null;
  });
}

function evolutionTemPotential(row) {
  const cubo = numeroEvolution(row && row.cubePercent);
  if (cubo === null || cubo <= 0) return false;
  return evolutionStatsComRequisito(row).some(function(stat) {
    const pct = numeroEvolution(((row.stats || {})[stat] || {}).percent);
    return pct !== null && pct > 0;
  });
}

function renderEvolutionRequirementsBox(row) {
  const linhas = [];
  const level = numeroEvolution(row.level);
  const bond = numeroEvolution(row.bond);

  if (level !== null) {
    linhas.push(`<span class="digidex-evo-req-item"><i>LEVEL</i><b>${escaparHtml(formatarEvolutionNumero(level))}</b></span>`);
  }
  if (bond !== null) {
    linhas.push(`<span class="digidex-evo-req-item"><i>BOND</i><b>${escaparHtml(formatarEvolutionNumero(bond))}</b></span>`);
  }

  const stats = row.stats || {};
  evolutionStatsComRequisito(row).forEach(function(stat) {
    const info = stats[stat] || {};
    const req = numeroEvolution(info.required);
    const pct = numeroEvolution(info.percent);
    // Na lista de requisitos, o que importa para o jogador é o percentual de Potential.
    // O valor natural e o valor final exigido continuam preservados nos dados e no modal
    // "Mostrar Potencial", mas não poluem mais o resumo da evolução.
    const valor = pct !== null
      ? `+${formatarEvolutionNumero(pct)}%`
      : (req !== null ? formatarEvolutionNumero(req) : "-");
    linhas.push(`<span class="digidex-evo-req-item digidex-evo-req-stat"><i>${stat.toUpperCase()}</i><b>${escaparHtml(valor)}</b></span>`);
  });

  (row.items || []).forEach(function(item) {
    if (!item || !item.name) return;
    const qtd = item.quantity !== "" && item.quantity != null ? ` ×${item.quantity}` : "";
    const local = pegarImagem(item.name);
    const src = local || item.icon || "";
    const fallback = local && item.icon ? item.icon : "";
    linhas.push(`
      <span class="digidex-evo-req-item digidex-evo-req-wide digidex-evo-req-item-with-icon">
        <span class="digidex-evo-req-item-icon">${src ? renderImagemEvolution(src, item.name, fallback) : "◆"}</span>
        <span class="digidex-evo-req-item-copy"><i>ITEM</i><b>${escaparHtml(item.name + qtd)}</b></span>
      </span>
    `);
  });

  if (row.partner) {
    linhas.push(`<span class="digidex-evo-req-item digidex-evo-req-wide"><i>JOGRESS</i><b>${escaparHtml(row.partner)}</b></span>`);
  }

  if (!linhas.length) {
    linhas.push(`<span class="digidex-evo-req-empty">SEM REQUISITO ADICIONAL REGISTRADO</span>`);
  }

  const podePotential = evolutionTemPotential(row);
  return `
    <div class="digidex-evo-requirements-box">
      <div class="digidex-evo-req-head">
        <strong>EVOLUTION REQUIREMENTS</strong>
        ${row.requirementOwner ? `<small>${escaparHtml(row.requirementOwner)}</small>` : ""}
      </div>
      <div class="digidex-evo-req-grid">${linhas.join("")}</div>
      ${podePotential ? `
        <button type="button" class="digidex-evo-potential-btn" onclick="abrirPotentialModalEvolution('${escaparHtml(String(row.id || ""))}')">
          MOSTRAR POTENCIAL
        </button>
      ` : ""}
    </div>
  `;
}

function converterEvolutionParaPotential(row) {
  const statsOrig = row && row.stats ? row.stats : {};
  const stats = {};
  ["str", "int", "def", "res", "spd"].forEach(function(stat) {
    const info = statsOrig[stat] || {};
    const pct = numeroEvolution(info.percent);
    if (pct === null) return;
    stats[stat.toUpperCase()] = {
      value: numeroEvolution(info.required),
      natural: numeroEvolution(info.natural),
      percent: pct
    };
  });

  return {
    id: row.id,
    to: row.to,
    displayName: row.to,
    requirementOwner: row.requirementOwner || row.from,
    cubePercent: numeroEvolution(row.cubePercent),
    requirements: {
      level: numeroEvolution(row.level),
      bond: numeroEvolution(row.bond),
      stats: stats,
      items: row.items || []
    }
  };
}

function abrirPotentialModalEvolution(id) {
  if (!evolutionMaster || !Array.isArray(evolutionMaster.evolutions)) return;
  const row = evolutionMaster.evolutions.find(function(item) {
    return String(item.id || "") === String(id || "");
  });
  if (!row || !evolutionTemPotential(row)) return;

  digivolutionAtual = converterEvolutionParaPotential(row);
  POTENTIAL_STATS.forEach(function(stat) { babyCorrections[stat] = 0; });

  const modal = document.getElementById("potentialModal");
  const titulo = document.getElementById("potentialTitle");
  const subtitulo = document.getElementById("potentialSubtitle");
  const campos = document.getElementById("babyCorrectionFields");
  if (!modal) return;

  if (titulo) titulo.textContent = `PLANO DE POTENCIAL — ${digivolutionAtual.displayName || digivolutionAtual.to}`;
  if (subtitulo) {
    const levelTxt = digivolutionAtual.requirements.level != null ? digivolutionAtual.requirements.level : "-";
    subtitulo.textContent = `${digivolutionAtual.requirementOwner || "DIGIMON ANTERIOR"} // LEVEL ${levelTxt} // CADA CUBO: ${digivolutionAtual.cubePercent || 4}%`;
  }
  if (campos) campos.innerHTML = POTENTIAL_STATS.map(function(stat) {
    return `<label><span>${stat}</span><span class="baby-stepper"><input id="baby-${stat}" type="number" min="0" max="14" step="1" value="0" inputmode="numeric" oninput="alterarBabyCorrection('${stat}', this)"><span class="baby-stepper-buttons"><button type="button" onclick="ajustarBabyCorrection('${stat}', 1)" aria-label="Aumentar ${stat}">▲</button><button type="button" onclick="ajustarBabyCorrection('${stat}', -1)" aria-label="Diminuir ${stat}">▼</button></span></span><small>%</small></label>`;
  }).join("");

  modal.classList.add("ativo");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  atualizarPotentialPlanner();
}


function fallbackSourceDigimonEvolution(nome) {
  const chave = normalizarChaveDigivolution(nome);
  const mapa = {
    imperialdramondragonmodeinfected: "https://dsrworldwiki.com/assets/digimons/imperialdramon_dragonmode_infected.png"
  };
  return mapa[chave] || "";
}

function fallbackSourceSkillEvolution(skill) {
  const id = Number(skill && skill.skillId);
  const mapa = {
    513701: "https://dsrworldwiki.com/assets/skills/Imperialdramon_Dragonmode_Infected_1.png",
    513702: "https://dsrworldwiki.com/assets/skills/Imperialdramon_Dragonmode_Infected_2.png",
    513703: "https://dsrworldwiki.com/assets/skills/Imperialdramon_Dragonmode_Infected_3.png"
  };

  let origem = mapa[id] || "";

  if (!origem) {
    /*
     * A MASTER guarda os ícones live como PVP_ASSETS/skill/*.webp.
     * Quando algum WEBP ainda não existe no Git, a fonte DSR possui
     * o equivalente PNG com o mesmo basename.
     */
    const bruto = String(skill && skill.icon || "").trim();
    if (!bruto) return "";

    let arquivo = bruto.split("/").pop().split("?")[0].split("#")[0];
    if (!arquivo) return "";
    arquivo = arquivo.replace(/\.(webp|jpg|jpeg)$/i, ".png");

    origem = "https://dsrworldwiki.com/assets/skills/" + encodeURIComponent(arquivo)
      .replace(/%28/g, "(")
      .replace(/%29/g, ")");
  }

  /*
   * A origem externa pode bloquear hotlink direto. O proxy fica SOMENTE
   * como fallback dos ícones ausentes; o Git continua sendo a primeira fonte.
   */
  return "https://images.weserv.nl/?url=" + encodeURIComponent(origem) +
    "&w=96&h=96&fit=contain&output=webp";
}

function renderImagemEvolution(src, alt, fallback) {
  const principal = String(src || "").trim();
  const reserva = String(fallback || "").trim();
  if (!principal && !reserva) return "?";
  const inicial = principal || reserva;
  const textoAlt = escaparHtml(alt || "");

  if (reserva && reserva !== inicial) {
    return `<img src="${escaparHtml(inicial)}" alt="${textoAlt}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.onerror=function(){this.style.display='none';this.parentElement.classList.add('image-failed')};this.src='${escaparHtml(reserva)}'">`;
  }

  return `<img src="${escaparHtml(inicial)}" alt="${textoAlt}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.style.display='none';this.parentElement.classList.add('image-failed')">`;
}

function fallbackDigimonEvolution(nome) {
  return pegarImagem(nome) || fallbackSourceDigimonEvolution(nome);
}

function isMutantEvolutionEntity(did, nome, categoria) {
  const category = String(categoria || "").trim().toUpperCase();
  if (category === "MUTANT" || category === "MUTATION") return true;

  const name = String(nome || "").trim();
  if (/^\[mutant\]/i.test(name)) return true;

  if (evolutionMaster) {
    const byDid = evolutionMaster.byDid && evolutionMaster.byDid[String(did == null ? "" : did)];
    const byName = evolutionMaster.byName && evolutionMaster.byName[normalizarNomeEvolution(name)];
    const digi = byDid || byName;
    if (digi && digi.mutant) return true;
  }

  return false;
}

function renderEvolutionSourceCard(source) {
  const mutant = isMutantEvolutionEntity(source.did, source.name, source.category);
  return `
    <button type="button" class="digidex-evo-node digidex-evo-node-from${mutant ? " is-mutant" : ""}" onclick="navegarEvolutionDid('${escaparHtml(String(source.did))}')">
      <span class="digidex-evo-node-image">
        ${renderImagemEvolution(source.icon, source.name, fallbackDigimonEvolution(source.name))}
      </span>
      <span class="digidex-evo-node-copy">
        <strong>${escaparHtml(source.name || "-")}</strong>
        ${renderEvolutionStage(source.stage)}
      </span>
    </button>
  `;
}

function renderEvolutionTargetCard(row) {
  const mutant = isMutantEvolutionEntity(row.toDid, row.to, row.category);
  return `
    <article class="digidex-evo-target-card${mutant ? " is-mutant" : ""}">
      <button type="button" class="digidex-evo-node digidex-evo-node-to${mutant ? " is-mutant" : ""}" onclick="navegarEvolutionDid('${escaparHtml(String(row.toDid))}')">
        <span class="digidex-evo-node-image">
          ${renderImagemEvolution(row.toIcon, row.to, fallbackDigimonEvolution(row.to))}
        </span>
        <span class="digidex-evo-node-copy">
          <strong>${escaparHtml(row.to || "-")}</strong>
          <span class="digidex-evo-node-meta">
            ${renderEvolutionStage(row.toStage)}
            ${row.category ? `<small>${escaparHtml(row.category)}</small>` : ""}
          </span>
        </span>
        ${renderEvolutionProbability(row.probability)}
      </button>
      ${renderEvolutionRequirementsBox(row)}
    </article>
  `;
}

function renderSkillTooltipEvolution(skill) {
  const linhas = [];
  const hits = numeroEvolution(skill.hits);
  const perHit = numeroEvolution(skill.perHit);
  const total = numeroEvolution(skill.total);
  const chance = numeroEvolution(skill.effectChance);

  linhas.push(`<span><i>Level</i><b>10</b></span>`);
  if (skill.type) linhas.push(`<span><i>Type</i><b>${escaparHtml(skill.type)}</b></span>`);
  if (skill.range) linhas.push(`<span><i>Range</i><b>${escaparHtml(skill.range)}</b></span>`);
  if (skill.base) linhas.push(`<span><i>Base</i><b>${escaparHtml(skill.base)}</b></span>`);

  if (hits !== null && hits > 0 && perHit !== null && perHit > 0) {
    const dano = formatarEvolutionNumero(hits) + " × " + formatarEvolutionNumero(perHit) + "%" +
      (total !== null && total > 0 ? " = " + formatarEvolutionNumero(total) + "%" : "");
    linhas.push(`<span class="wide"><i>Damage</i><b>${escaparHtml(dano)}</b></span>`);
  }

  const effects = [];
  if (skill.cc && !["NO",""].includes(skill.cc)) effects.push("CC" + (skill.ccType ? ": " + skill.ccType : ""));
  if (skill.dot && !["NO",""].includes(skill.dot)) effects.push("DOT");
  if (skill.defBreak && !["NO",""].includes(skill.defBreak)) effects.push("DEF BREAK");
  if (skill.effectName) effects.push(skill.effectName);
  if (effects.length) linhas.push(`<span class="wide"><i>Effect</i><b>${escaparHtml(Array.from(new Set(effects)).join(" • "))}</b></span>`);
  if (chance !== null) linhas.push(`<span><i>Chance</i><b>${escaparHtml(formatarEvolutionNumero(chance))}%</b></span>`);

  const elements = Array.isArray(skill.elements) ? skill.elements : [];
  if (elements.length) {
    linhas.push(`<span class="wide"><i>Can change to</i><b>${escaparHtml(elements.join(", "))}</b></span>`);
  }

  return `
    <span class="digidex-profile-skill-tooltip" role="tooltip">
      <strong>${escaparHtml(skill.name || "Skill")}</strong>
      <span class="digidex-profile-skill-tooltip-grid">${linhas.join("")}</span>
      ${(skill.effectDescription || skill.description) ? `<em>${escaparHtml(skill.effectDescription || skill.description)}</em>` : ""}
    </span>
  `;
}

function renderSkillCardEvolution(skill, index) {
  const slot = Number(skill && skill.slot) || (index + 1);
  if (!skill) {
    return `<div class="digidex-profile-skill is-empty"><span>S${slot}</span><strong>SEM SKILL</strong></div>`;
  }

  return `
    <div class="digidex-profile-skill" tabindex="0">
      <span class="digidex-profile-skill-icon">
        ${(skill.icon || fallbackSourceSkillEvolution(skill)) ? renderImagemEvolution(skill.icon, skill.name, fallbackSourceSkillEvolution(skill)) : `<b>S${slot}</b>`}
      </span>
      <span class="digidex-profile-skill-copy">
        <strong>${escaparHtml(skill.name || ("SKILL " + slot))}</strong>
        <small>LV.10${skill.base ? " • " + escaparHtml(skill.base) : ""}</small>
      </span>
      ${renderSkillTooltipEvolution(skill)}
    </div>
  `;
}

function renderStatsPerfilEvolution(db) {
  if (!db) {
    return `<div class="digidex-profile-no-stats">Stats completos indisponíveis nesta entrada da Digidex.</div>`;
  }

  return `
    <div class="digidex-profile-stats">
      ${["hp","sp","str","int","def","res","spd"].map(function(stat) {
        return `<span><i>${stat.toUpperCase()}</i><b>${escaparHtml(db[stat] || "-")}</b></span>`;
      }).join("")}
    </div>
  `;
}

function renderizarPerfilDigidexEvolution(current) {
  const perfil = document.getElementById("digidexProfile");
  if (!perfil) return;

  const db = encontrarDatabaseEvolution(current.name);
  const skills = (evolutionMaster.skillsByDid[String(current.did)] || []).slice(0, 3);
  const incoming = incomingEvolutionSources(current);
  const outgoing = outgoingEvolutionRows(current);
  const tipo = db ? normalizarType(db.type) : normalizarType(current.attribute);
  const fields = db ? db.field : current.fields;
  const strong = db ? db.strong : current.strong;
  const weak = db ? db.weak : current.weak;
  const currentMutant = isMutantEvolutionEntity(current.did, current.name, current.category);
  const relationData = {
    digimon: current.name,
    name: current.name,
    strong: strong,
    weak: weak,
    strongEffect: db && (db.strongEffect || db.strong_effect),
    weakEffect: db && (db.weakEffect || db.weak_effect)
  };

  const trilha = digidexEvolutionTrail.map(function(item, indice) {
    const atual = indice === digidexEvolutionTrail.length - 1;
    return `
      ${indice ? `<span class="digidex-profile-crumb-arrow">›</span>` : ""}
      <button type="button" ${atual ? "disabled" : `onclick="voltarTrilhaEvolution(${indice})"`}>${escaparHtml(item.name)}</button>
    `;
  }).join("");

  perfil.innerHTML = `
    <div class="digidex-profile-toolbar">
      <button type="button" class="digidex-profile-back" onclick="fecharPerfilDigidex()">← VOLTAR PARA DIGIDEX</button>
      <div class="digidex-profile-breadcrumb">${trilha}</div>
      <span class="digidex-profile-master-status"><i></i>DIGIVOLUTION MASTER</span>
    </div>

    <div class="digidex-profile-hero${currentMutant ? " is-mutant" : ""}">
      <div class="digidex-profile-portrait${currentMutant ? " is-mutant" : ""}">
        ${renderImagemEvolution(current.icon, current.name, fallbackDigimonEvolution(current.name))}
      </div>

      <div class="digidex-profile-identity${currentMutant ? " is-mutant" : ""}">
        <span class="digidex-profile-kicker">CURRENT DIGIMON // ${escaparHtml(current.stage || "-")}</span>
        <h2>${escaparHtml(current.name)}</h2>
        <div class="digidex-profile-tags">
          ${renderEvolutionStage(current.stage)}
          ${tipo ? `<span class="digidex-profile-type ${getClasseType(tipo)}">${renderizarTypeIcon(tipo)}</span>` : ""}
          ${currentMutant ? `<span class="digidex-profile-mutant">MUTANT</span>` : ""}
        </div>
      </div>

      <div class="digidex-profile-relations">
        <span><i>STRONG</i><b>${strong ? renderizarRelacaoAtributo(relationData, "strong") : "-"}</b></span>
        <span><i>WEAK</i><b>${weak ? renderizarRelacaoAtributo(relationData, "weak") : "-"}</b></span>
        <span class="wide"><i>FIELD</i><b>${fields ? renderizarField(fields) : "-"}</b></span>
      </div>
    </div>

    ${renderStatsPerfilEvolution(db)}

    <section class="digidex-profile-section digidex-profile-skills-section">
      <div class="digidex-profile-section-title">
        <span>SKILLS // LEVEL 10</span>
        <small>Passe o mouse no ícone ou nome para ver os detalhes.</small>
      </div>
      <div class="digidex-profile-skills">
        ${[0,1,2].map(function(index) {
          const skill = skills.find(function(s) { return Number(s.slot) === index + 1; });
          return renderSkillCardEvolution(skill, index);
        }).join("")}
      </div>
    </section>

    <section class="digidex-profile-section digidex-evolution-tree digidex-evolution-flow">
      <div class="digidex-evo-layout">
        <div class="digidex-evo-column digidex-evo-from-column">
          <header><span>←</span><strong>EVOLVES FROM</strong><small>${incoming.length}</small></header>
          <div class="digidex-evo-list">
            ${incoming.length ? incoming.map(renderEvolutionSourceCard).join("") : `<div class="digidex-evo-empty">INÍCIO DA LINHA</div>`}
          </div>
        </div>

        <div class="digidex-evo-column digidex-evo-to-column">
          <header><strong>EVOLVES TO</strong><small>${outgoing.length}</small><span>→</span></header>
          <div class="digidex-evo-list">
            ${outgoing.length ? outgoing.map(renderEvolutionTargetCard).join("") : `<div class="digidex-evo-empty">FIM DA LINHA</div>`}
          </div>
        </div>
      </div>
    </section>
  `;
}


/* =====================================================
   STATUS SIMULATOR
===================================================== */

const STATUS_SIMULATOR_STATS = ["HP", "SP", "STR", "INT", "DEF", "RES", "SPD"];
const STATUS_SIMULATOR_TETRIS_STATS = ["STR", "INT", "DEF", "RES", "SPD"];
const STATUS_SIMULATOR_COLORS = {
  HP: "#20c879", SP: "#38c7e8", STR: "#ff3548", INT: "#3388f5",
  DEF: "#e7c900", RES: "#bf3bd4", SPD: "#2ce85c"
};

const STATUS_SIMULATOR_CRIT_BASES = {
  imperialfightermode: 17.15,
  imperialdramonfightermode: 17.15,
  cressgarurumon: 17.42,
  cressgaruru: 17.42,
  metalseadramon: 17.00,
  dynasmon: 16.57,
  machinedramon: 17.85,
  omegamon: 17.58,
  ulforceveedramon: 16.85,
  metalgarurumon: 15.85,
  leopardmon: 18.71,
  plesiomon: 18.28,
  goldramon: 16.43,
  saberleomon: 16.16,
  skullmammothmon: 14.57,
  ravemon: 17.57,
  gallantmon: 17.14,
  blastmon: 15.92,
  neptunemon: 16.71,
  beelzemon: 17.42,
  shadowseraphimon: 16.71,
  lilithmon: 18.71,
  blackwargreymon: 14.85,
  titamon: 16.57,
  marsmon: 16.67,
  kuzuhamon: 15.57,
  donedevimon: 14.85,
  lordknightmon: 17.57
};
const STATUS_SIMULATOR_CRIT_BASE_MEDIA = 16.7954;

let statusSimulatorDigimon = null;
let statusSimulatorCubePercent = 4;
let statusSimulatorCubes = [];
let statusSimulatorMegaPotential = 0;
let statusSimulatorBaby = {};
let statusSimulatorAccessories = {};
let statusSimulatorClothing = {};
let statusSimulatorDeck = {};
let statusSimulatorStep = 0;

function numeroStatusSimulator(valor) {
  const numero = Number(String(valor ?? 0).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(numero) ? Math.max(0, numero) : 0;
}

function formatarStatusSimulator(valor) {
  return Math.round(Number(valor) || 0).toLocaleString("pt-BR");
}

function resetarValoresStatusSimulator() {
  STATUS_SIMULATOR_STATS.forEach(function(stat) {
    statusSimulatorBaby[stat] = 0;
    statusSimulatorDeck[stat] = 0;
    statusSimulatorAccessories[stat] = 0;
    statusSimulatorClothing[stat] = 0;
  });
  statusSimulatorCubes = [];
  statusSimulatorMegaPotential = 0;
  statusSimulatorCubePercent = 4;
  statusSimulatorStep = 0;
}

function inicializarStatusSimulator() {
  const busca = document.getElementById("statusSimulatorSearch");
  if (!busca || busca.dataset.statusSimulatorReady === "true") return;
  busca.dataset.statusSimulatorReady = "true";
  resetarValoresStatusSimulator();
  busca.addEventListener("input", atualizarSugestoesStatusSimulator);
  busca.addEventListener("focus", atualizarSugestoesStatusSimulator);
  busca.addEventListener("keydown", function(evento) {
    if (evento.key !== "Enter") return;
    const termo = String(busca.value || "").trim().toLowerCase();
    const indice = database.findIndex(function(item) {
      return String(item.digimon || "").trim().toLowerCase() === termo;
    });
    if (indice >= 0) selecionarDigimonStatusSimulator(indice);
  });
  document.addEventListener("click", function(evento) {
    if (!evento.target.closest(".status-simulator-searchbox")) fecharSugestoesStatusSimulator();
  });
  renderizarCamposStatusSimulator();
  renderizarStatusSimulator();
}

function atualizarSugestoesStatusSimulator() {
  const busca = document.getElementById("statusSimulatorSearch");
  const lista = document.getElementById("statusSimulatorSuggestions");
  if (!busca || !lista) return;
  const termo = String(busca.value || "").trim().toLowerCase();
  if (!termo) {
    lista.innerHTML = "";
    lista.classList.remove("ativo");
    return;
  }
  const encontrados = database.map(function(item, indice) { return { item, indice }; }).filter(function(entrada) {
    return String(entrada.item.digimon || "").toLowerCase().includes(termo);
  }).slice(0, 8);
  lista.innerHTML = encontrados.map(function(entrada) {
    const item = entrada.item;
    return `<button type="button" onclick="selecionarDigimonStatusSimulator(${entrada.indice})">
      <span class="status-simulator-suggestion-icon">${item.icon ? `<img src="${escaparHtml(item.icon)}" alt="">` : "◆"}</span>
      <span><strong>${escaparHtml(item.digimon)}</strong><small>${escaparHtml(item.type || "UNKNOWN")} // ${escaparHtml(item.stage || "-")}</small></span>
    </button>`;
  }).join("") || `<div class="status-simulator-no-suggestion">Nenhum Digimon encontrado.</div>`;
  lista.classList.add("ativo");
}

function fecharSugestoesStatusSimulator() {
  const lista = document.getElementById("statusSimulatorSuggestions");
  if (lista) lista.classList.remove("ativo");
}

function selecionarDigimonStatusSimulator(indice) {
  const item = database[Number(indice)];
  if (!item) return;
  statusSimulatorDigimon = item;
  const busca = document.getElementById("statusSimulatorSearch");
  if (busca) busca.value = item.digimon || "";
  fecharSugestoesStatusSimulator();
  renderizarStatusSimulator();
}

function renderizarCamposStatusSimulator() {
  const baby = document.getElementById("statusSimulatorBabyFields");
  const accessories = document.getElementById("statusSimulatorAccessoryFields");
  const clothing = document.getElementById("statusSimulatorClothingFields");
  const deck = document.getElementById("statusSimulatorDeckFields");
  const cubeButtons = document.getElementById("statusSimulatorCubeButtons");
  if (baby) baby.innerHTML = STATUS_SIMULATOR_STATS.map(function(stat) {
    return `<label style="--stat-color:${STATUS_SIMULATOR_COLORS[stat]}"><span>${stat}</span><input type="number" min="0" max="14" step="1" value="0" inputmode="numeric" oninput="alterarBabyStatusSimulator('${stat}', this)"><small>%</small></label>`;
  }).join("");
  if (accessories) accessories.innerHTML = STATUS_SIMULATOR_TETRIS_STATS.map(function(stat) {
    return criarCampoFixoStatusSimulator(stat, "accessory");
  }).join("");
  if (clothing) clothing.innerHTML = STATUS_SIMULATOR_TETRIS_STATS.map(function(stat) {
    return criarCampoFixoStatusSimulator(stat, "clothing");
  }).join("");
  if (deck) deck.innerHTML = STATUS_SIMULATOR_STATS.map(function(stat) {
    return criarCampoFixoStatusSimulator(stat, "deck");
  }).join("");
  if (cubeButtons) cubeButtons.innerHTML = STATUS_SIMULATOR_TETRIS_STATS.map(function(stat) {
    return `<button type="button" style="--cube-color:${STATUS_SIMULATOR_COLORS[stat]}" onclick="adicionarCuboStatus('${stat}')"><strong>${stat}</strong><small>+${statusSimulatorCubePercent}%</small></button>`;
  }).join("");
}

function criarCampoFixoStatusSimulator(stat, grupo) {
  return `<label style="--stat-color:${STATUS_SIMULATOR_COLORS[stat]}"><span>${stat}</span><input type="number" min="0" step="1" value="0" inputmode="numeric" oninput="alterarValorFixoStatusSimulator('${grupo}', '${stat}', this)"></label>`;
}

function alterarBabyStatusSimulator(stat, input) {
  let valor = Math.round(Math.min(14, numeroStatusSimulator(input.value)));
  const totalOutros = STATUS_SIMULATOR_STATS.reduce(function(total, nome) {
    return total + (nome === stat ? 0 : (Number(statusSimulatorBaby[nome]) || 0));
  }, 0);
  valor = Math.min(valor, Math.max(0, 28 - totalOutros));
  statusSimulatorBaby[stat] = valor;
  input.value = valor;
  renderizarStatusSimulator();
}

function alterarValorFixoStatusSimulator(grupo, stat, input) {
  const valor = Math.round(numeroStatusSimulator(input.value));
  input.value = valor;
  if (grupo === "deck") statusSimulatorDeck[stat] = valor;
  else if (grupo === "clothing") statusSimulatorClothing[stat] = valor;
  else statusSimulatorAccessories[stat] = valor;
  renderizarStatusSimulator();
}

function alterarModoCuboStatus(percentual) {
  const novo = Number(percentual) === 5 ? 5 : 4;
  statusSimulatorCubePercent = novo;
  renderizarCamposCubosStatusSimulator();
  renderizarStatusSimulator();
}

function adicionarCuboStatus(stat) {
  if (!STATUS_SIMULATOR_TETRIS_STATS.includes(stat) || statusSimulatorCubes.length >= 16) return;
  statusSimulatorCubes.push({ stat, percent: statusSimulatorCubePercent });
  renderizarStatusSimulator();
}

function removerCuboStatus(indice) {
  const cube = statusSimulatorCubes[Number(indice)];
  if (statusSimulatorMegaPotential && cube) {
    const selecionados = statusSimulatorCubes.filter(function(item) { return item.mega; }).length;
    if (cube.mega) cube.mega = false;
    else if (selecionados < statusSimulatorMegaPotential) cube.mega = true;
    renderizarStatusSimulator();
    return;
  }
  statusSimulatorCubes.splice(Number(indice), 1);
  renderizarStatusSimulator();
}

function alterarMegaPotentialStatus(nivel) {
  const novo = [4, 5, 6].includes(Number(nivel)) ? Number(nivel) : 0;
  statusSimulatorMegaPotential = statusSimulatorMegaPotential === novo ? 0 : novo;
  if (!statusSimulatorMegaPotential) {
    statusSimulatorCubes.forEach(function(cube) { cube.mega = false; });
  } else {
    let mantidos = 0;
    statusSimulatorCubes.forEach(function(cube) {
      if (cube.mega && mantidos < statusSimulatorMegaPotential) mantidos += 1;
      else if (cube.mega) cube.mega = false;
    });
  }
  renderizarStatusSimulator();
}

function removerUltimoCuboStatus() {
  statusSimulatorCubes.pop();
  renderizarStatusSimulator();
}

function resetarTetrisStatus() {
  statusSimulatorCubes = [];
  statusSimulatorMegaPotential = 0;
  renderizarStatusSimulator();
}

function renderizarCamposCubosStatusSimulator() {
  const botao4 = document.getElementById("statusCube4");
  const botao5 = document.getElementById("statusCube5");
  if (botao4) botao4.classList.toggle("ativo", statusSimulatorCubePercent === 4);
  if (botao5) botao5.classList.toggle("ativo", statusSimulatorCubePercent === 5);
  const cubeButtons = document.getElementById("statusSimulatorCubeButtons");
  if (cubeButtons) cubeButtons.querySelectorAll("small").forEach(function(item) {
    item.textContent = `+${statusSimulatorCubePercent}%`;
  });
}

function percentuaisTetrisStatusSimulator() {
  const totais = {};
  STATUS_SIMULATOR_STATS.forEach(function(stat) { totais[stat] = 0; });
  statusSimulatorCubes.forEach(function(cube) { totais[cube.stat] += cube.percent + (cube.mega ? 1 : 0); });
  return totais;
}

function calcularLinhaStatusSimulator(stat) {
  const base = statusSimulatorDigimon ? numeroStatusSimulator(statusSimulatorDigimon[stat.toLowerCase()]) : 0;
  const tetris = percentuaisTetrisStatusSimulator();
  const babyPercent = Number(statusSimulatorBaby[stat]) || 0;
  const tetrisPercent = Number(tetris[stat]) || 0;
  const babyGain = babyPercent > 0 ? Math.ceil(base * babyPercent / 100) : 0;
  const tetrisGain = tetrisPercent > 0 ? Math.ceil(base * tetrisPercent / 100) : 0;
  const accessory = Number(statusSimulatorAccessories[stat]) || 0;
  const clothing = Number(statusSimulatorClothing[stat]) || 0;
  const deck = Number(statusSimulatorDeck[stat]) || 0;
  return { stat, base, babyPercent, babyGain, tetrisPercent, tetrisGain, accessory, clothing, deck, final: base + babyGain + tetrisGain + accessory + clothing + deck };
}

function calcularCritRateStatusSimulator() {
  const intBase = statusSimulatorDigimon ? numeroStatusSimulator(statusSimulatorDigimon.int) : 0;
  const intFinal = calcularLinhaStatusSimulator("INT").final;
  const bonusInt = Math.max(0, intFinal - intBase);
  const chave = normalizarChaveDigivolution(statusSimulatorDigimon && statusSimulatorDigimon.digimon);
  const burstMode = /burstmode|bm$/.test(chave) ? 1 : 0;
  const ajustesCritDown = {
    lilithmon: -0.0706,
    blackseraphimon: 0.0545,
    beelzemon: 0.2379,
    ulforceveedramon: -0.2218
  };
  const ajusteCritDown = Number(ajustesCritDown[chave]) || 0;
  const critRate = Math.max(0, 26.950915089047466 + intFinal * 0.04994600527878049 - intBase * 0.03651377191538811 - burstMode * 0.25833219773252186);
  const critDown = Math.max(0, 18.26819125664886 + intFinal * 0.00823240939263425 - intBase * 0.009013734512031439 - burstMode * 9.615389959281332 + ajusteCritDown);
  const critDmg = Math.max(0, 172.3803368817766 + intFinal * 0.04887066469303948 - intBase * 0.04877349125268096 - burstMode * 0.2554690272742557);
  const damageRangeMin = 95;
  const damageRangeMax = Math.max(damageRangeMin, 112.1233752759157 + intFinal * 0.01543433379605434 - intBase * 0.015440216843529378 - burstMode * 0.08093217150093454);
  return {
    critRate,
    critDown,
    critDmg,
    damageRangeMin,
    damageRangeMax,
    intBase,
    intFinal,
    bonusInt
  };
}

function renderizarStatusSimulator() {
  const babyTotal = STATUS_SIMULATOR_STATS.reduce(function(total, stat) { return total + (Number(statusSimulatorBaby[stat]) || 0); }, 0);
  const babyTotalEl = document.getElementById("statusSimulatorBabyTotal");
  const babyTrack = document.getElementById("statusSimulatorBabyTrack");
  if (babyTotalEl) babyTotalEl.textContent = `${babyTotal}% / 28%`;
  if (babyTrack) babyTrack.style.width = `${babyTotal / 28 * 100}%`;
  renderizarCamposCubosStatusSimulator();
  renderizarTetrisStatusSimulator();
  renderizarCardStatusSimulator();
  renderizarResultadoStatusSimulator();
  renderizarEtapaStatusSimulator();
}

function renderizarTetrisStatusSimulator() {
  const board = document.getElementById("statusSimulatorTetris");
  const counter = document.getElementById("statusSimulatorCubeCount");
  if (counter) counter.textContent = `${statusSimulatorCubes.length} / 16 ESPAÇOS`;
  if (!board) return;
  board.innerHTML = Array.from({ length: 16 }, function(_, indice) {
    const cube = statusSimulatorCubes[indice];
    if (!cube) return `<div class="status-simulator-cube-slot"><span>${String(indice + 1).padStart(2, "0")}</span></div>`;
    return `<button type="button" class="status-simulator-cube is-filled${cube.mega ? " is-mega" : ""}" style="--cube-color:${STATUS_SIMULATOR_COLORS[cube.stat]}" onclick="removerCuboStatus(${indice})" title="${statusSimulatorMegaPotential ? "Clique para aplicar/remover +1%" : "Clique para remover"}"><strong>${cube.stat}</strong><small>${cube.percent + (cube.mega ? 1 : 0)}%</small>${cube.mega ? `<em>+1%</em>` : ""}</button>`;
  }).join("");
  const selecionados = statusSimulatorCubes.filter(function(cube) { return cube.mega; }).length;
  document.querySelectorAll(".status-simulator-mega-buttons button").forEach(function(botao) {
    botao.classList.toggle("ativo", botao.classList.contains(`mp${statusSimulatorMegaPotential}`));
  });
  const hint = document.getElementById("statusSimulatorMegaHint");
  if (hint) hint.textContent = statusSimulatorMegaPotential ? `${selecionados}/${statusSimulatorMegaPotential} MELHORADOS · CLIQUE NO ÍCONE PARA SAIR` : "Escolha um ícone e clique nos cubos.";
}

function renderizarCardStatusSimulator() {
  const card = document.getElementById("statusSimulatorDigiCard");
  if (!card) return;
  if (!statusSimulatorDigimon) {
    card.innerHTML = `<div class="status-simulator-empty-card"><img src="icon_status_simulator.png" alt=""><strong>SELECIONE UM DIGIMON</strong><span>Os status base aparecerão aqui.</span></div>`;
    return;
  }
  const digi = statusSimulatorDigimon;
  const linhas = STATUS_SIMULATOR_STATS.map(calcularLinhaStatusSimulator);
  const tipo = normalizarType(digi.type) || "UNKNOWN";
  const typeIcon = { VACCINE: "type_icons/type_vaccine.png", VIRUS: "type_icons/type_virus.png", DATA: "type_icons/type_data.png", FREE: "type_icons/type_free.png", UNKNOWN: "type_icons/type_unknown.png" }[tipo];
  card.innerHTML = `
    <div class="status-simulator-digi-image">${digi.icon ? `<img src="${escaparHtml(digi.icon)}" alt="${escaparHtml(digi.digimon)}">` : "◆"}</div>
    <h3>${escaparHtml(digi.digimon)}</h3>
    <div class="status-simulator-digi-tags"><span class="status-simulator-stage-tag">${escaparHtml(digi.stage || "-")}</span><span class="status-simulator-type-tag">${typeIcon ? `<img src="${typeIcon}" alt="${escaparHtml(tipo)}">` : ""}${escaparHtml(tipo)}</span></div>
    <div class="status-simulator-card-stats">${linhas.map(function(linha) {
      const bonus = linha.final - linha.base;
      return `<div style="--stat-color:${STATUS_SIMULATOR_COLORS[linha.stat]}"><span>${linha.stat}</span><div class="status-simulator-stat-value"><strong>${formatarStatusSimulator(linha.final)}</strong>${bonus > 0 ? `<b>(+${formatarStatusSimulator(bonus)})</b>` : ""}</div><small>BASE ${formatarStatusSimulator(linha.base)}</small></div>`;
    }).join("")}</div>`;
}

function renderizarResultadoStatusSimulator() {
  const tabela = document.getElementById("statusSimulatorResultTable");
  if (!tabela) return;
  if (!statusSimulatorDigimon) {
    tabela.innerHTML = `<div class="status-simulator-result-empty">Selecione um Digimon para calcular o resultado final.</div>`;
    return;
  }
  const linhas = STATUS_SIMULATOR_STATS.map(calcularLinhaStatusSimulator);
  const crit = calcularCritRateStatusSimulator();
  tabela.innerHTML = `
    ${linhas.map(function(linha) {
      return `<div class="status-simulator-result-row" style="--stat-color:${STATUS_SIMULATOR_COLORS[linha.stat]}">
        <strong>${linha.stat}</strong><b>${formatarStatusSimulator(linha.final)}</b>
        <small>BASE ${formatarStatusSimulator(linha.base)} · BABY +${formatarStatusSimulator(linha.babyGain)} (${linha.babyPercent}%) · TETRIS +${formatarStatusSimulator(linha.tetrisGain)} (${linha.tetrisPercent}%) · ACESS. +${formatarStatusSimulator(linha.accessory)} · ROUPA +${formatarStatusSimulator(linha.clothing)} · DECK +${formatarStatusSimulator(linha.deck)}</small>
      </div>`;
    }).join("")}
    <div class="status-simulator-crit-result">
      <div class="status-simulator-crit-grid">
        <div><strong>CRIT RATE</strong><b>${crit.critRate.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</b></div>
        <div><strong>CRIT DOWN</strong><b>${crit.critDown.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</b></div>
        <div class="status-simulator-range"><strong>DAMAGE RANGE</strong><b>${crit.damageRangeMin.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}% ~ ${crit.damageRangeMax.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</b></div>
        <div><strong>CRITDMG</strong><b>${crit.critDmg.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</b></div>
      </div>
      <small>CURVA: INT BASE ${formatarStatusSimulator(crit.intBase)} · INT FINAL ${formatarStatusSimulator(crit.intFinal)} · BÔNUS DE INT +${formatarStatusSimulator(crit.bonusInt)}</small>
      <em>VALORES CRÍTICOS APROXIMADOS · A FÓRMULA SEGUE EM CALIBRAÇÃO</em>
    </div>`;
}

function renderizarEtapaStatusSimulator() {
  document.querySelectorAll("#statusSimulatorStagePanel .status-simulator-step").forEach(function(step) {
    step.classList.toggle("ativo", Number(step.dataset.statusStep) === statusSimulatorStep);
  });
  const panel = document.getElementById("statusSimulatorStagePanel");
  const back = document.getElementById("statusSimulatorBack");
  const next = document.getElementById("statusSimulatorNext");
  const label = document.getElementById("statusSimulatorStepLabel");
  const track = document.getElementById("statusSimulatorProgressTrack");
  if (panel) panel.dataset.step = statusSimulatorStep;
  if (back) back.disabled = statusSimulatorStep === 0;
  if (next) {
    next.textContent = statusSimulatorStep === 4 ? "EDITAR" : (statusSimulatorStep === 3 ? "VER RESULTADO" : "NEXT");
    next.disabled = !statusSimulatorDigimon;
  }
  if (label) label.textContent = statusSimulatorStep === 4 ? "SIMULAÇÃO CONCLUÍDA" : `ETAPA ${statusSimulatorStep + 1} DE 5`;
  if (track) track.style.width = `${(statusSimulatorStep + 1) * 20}%`;
}

function mudarEtapaStatusSimulator(direcao) {
  if (!statusSimulatorDigimon) return;
  if (statusSimulatorStep === 4 && Number(direcao) > 0) statusSimulatorStep = 0;
  else statusSimulatorStep = Math.max(0, Math.min(4, statusSimulatorStep + Number(direcao || 0)));
  renderizarEtapaStatusSimulator();
}

function limparStatusSimulator() {
  statusSimulatorDigimon = null;
  resetarValoresStatusSimulator();
  const busca = document.getElementById("statusSimulatorSearch");
  if (busca) busca.value = "";
  document.querySelectorAll("#statusSimulatorBabyFields input, #statusSimulatorAccessoryFields input, #statusSimulatorClothingFields input, #statusSimulatorDeckFields input").forEach(function(input) { input.value = 0; });
  fecharSugestoesStatusSimulator();
  renderizarStatusSimulator();
}

/* =====================================================
   TEAM BUILDER
===================================================== */

function criarSlots() {

  const container =
    document.getElementById(
      "slots"
    );


  if (!container) {
    return;
  }


  container.innerHTML =
    "";


  for (
    let i = 1;
    i <= 8;
    i++
  ) {

    const slot =
      document.createElement(
        "div"
      );


    slot.className =
      "slot";


    const titulo =
      document.createElement(
        "div"
      );


    titulo.className =
      "slot-title";


    titulo.innerText =
      "SLOT " + i;


    const input =
      document.createElement(
        "input"
      );


    input.type =
      "text";


    input.className =
      "team-search";


    input.placeholder =
      "Digite o nome do Digimon...";


    input.autocomplete =
      "off";


    const status =
      document.createElement(
        "div"
      );


    status.className =
      "team-search-status";


    const suggestions =
      document.createElement(
        "div"
      );


    suggestions.className =
      "team-suggestions";


    const info =
      document.createElement(
        "div"
      );


    info.id =
      "info" + i;


    info.className =
      "selected-info";


    input.addEventListener(
      "input",
      function() {

        atualizarSugestoes(
          i,
          input,
          suggestions,
          status
        );

      }
    );


    slot.appendChild(
      titulo
    );


    slot.appendChild(
      input
    );


    slot.appendChild(
      status
    );


    slot.appendChild(
      suggestions
    );


    slot.appendChild(
      info
    );


    container.appendChild(
      slot
    );

  }

  atualizarPainelBuilder();
}



/* =====================================================
   SUGESTÕES TEAM BUILDER
===================================================== */

function atualizarSugestoes(
  numeroSlot,
  input,
  suggestions,
  status
) {

  const busca =
    String(
      input.value ||
      ""
    )
      .trim()
      .toLowerCase();


  suggestions.innerHTML =
    "";


  if (!busca) {

    suggestions.style.display =
      "none";


    status.textContent =
      "";


    const info =
      document.getElementById(
        "info" +
        numeroSlot
      );


    if (info) {
      info.innerHTML = "";
      info._hgDigimon = null;
    }
    atualizarPainelBuilder();
    return;

  }


  const encontrados =
    database
      .filter(
        function(d) {

          /*
           * O Team Builder e exclusivo para Megas.
           * Importante: isso filtra somente os DIGIMONS exibidos no Builder.
           * As opcoes de elemento das Skills continuam intactas, inclusive
           * nas Skills marcadas como CC, DOT ou DEF BREAK.
           */
          return (
            normalizarStageDigidex(d && d.stage) === "MEGA"
            && String(
              d.digimon ||
              ""
            )
              .toLowerCase()
              .includes(
                busca
              )
          );

        }
      )
      .slice(
        0,
        12
      );


  if (
    encontrados.length ===
    0
  ) {

    suggestions.style.display =
      "none";


    status.textContent =
      "Nenhum Mega encontrado.";


    return;

  }


  suggestions.style.display =
    "block";


  status.textContent =
    encontrados.length +
    " opção" +
    (
      encontrados.length > 1
      ?
      "ões"
      :
      ""
    );


  encontrados.forEach(
    function(d) {

      const item =
        document.createElement(
          "div"
        );


      item.className =
        "team-suggestion";


      item.textContent =
        d.digimon;


      item.addEventListener(
        "mousedown",
        function(event) {

          event.preventDefault();


          input.value =
            d.digimon;


          suggestions.style.display =
            "none";


          status.textContent =
            "✓ " +
            d.digimon;


          mostrarDadosDoSlot(
            numeroSlot,
            d
          );

        }
      );


      suggestions.appendChild(
        item
      );

    }
  );

}


/* =====================================================
   SKILLS
===================================================== */

function criarSkillSelect(
  nomeSkill,
  valores
) {

  /*
   * A DATABASE NOVA entrega a skill como objeto:
   * { texto, calculo, base, elementos }
   *
   * Guardamos o objeto completo para não perder
   * o cálculo/base enquanto o select usa apenas
   * a lista de elementos.
   */
  const dadosSkill =
    (
      valores &&
      typeof valores === "object" &&
      !Array.isArray(valores)
    )
      ? valores
      : null;


  let elementosSkill =
    dadosSkill
      ? (
          Array.isArray(dadosSkill.elementos)
            ? dadosSkill.elementos.slice()
            : (
                dadosSkill.base
                  ? [dadosSkill.base]
                  : []
              )
        )
      : valores;


  if (
    !Array.isArray(
      elementosSkill
    )
  ) {

    elementosSkill =
      (
        elementosSkill === null ||
        elementosSkill === undefined ||
        elementosSkill === ""
      )
      ?
      []
      :
      [elementosSkill];

  }


  elementosSkill =
    elementosSkill.filter(
      function(
        valor,
        indice,
        array
      ) {

        return (
          valor !== null
          &&
          valor !== undefined
          &&
          String(
            valor
          ).trim() !== ""
          &&
          array.indexOf(
            valor
          ) === indice
        );

      }
    );


  const grupo =
    document.createElement(
      "div"
    );


  grupo.className =
    "skill";


  const titulo =
    document.createElement(
      "span"
    );


  titulo.className =
    "skill-title";


  let textoTitulo =
    nomeSkill;


  if (
    dadosSkill &&
    dadosSkill.calculo
  ) {

    textoTitulo +=
      " • " +
      String(
        dadosSkill.calculo
      ).trim();

  }


  if (
    dadosSkill &&
    dadosSkill.base
  ) {

    textoTitulo +=
      " • BASE: " +
      String(
        dadosSkill.base
      ).trim();

  }


  titulo.textContent =
    textoTitulo;


  const selectSkill =
    document.createElement(
      "select"
    );


  selectSkill.className =
    "skill-select-icon sem-icone";


  if (
    elementosSkill.length ===
    0
  ) {

    const opcao =
      document.createElement(
        "option"
      );


    opcao.value =
      "";


    opcao.textContent =
      "-";


    selectSkill.appendChild(
      opcao
    );

  }


  elementosSkill.forEach(
    function(valor) {

      const texto =
        String(
          valor
        )
          .trim();


      if (!texto) {
        return;
      }


      const opcao =
        document.createElement(
          "option"
        );


      opcao.value =
        texto;


      opcao.textContent =
        texto;


      selectSkill.appendChild(
        opcao
      );

    }
  );


  const efeito =
    document.createElement(
      "div"
    );


  efeito.className =
    "skill-efeito";


  function atualizarIconeSkill() {

    const elemento =
      normalizarElemento(
        selectSkill.value
      );


    const src =
      pegarImagemElemento(
        elemento
      );


    if (src) {

      selectSkill.classList.remove(
        "sem-icone"
      );


      selectSkill.style.backgroundImage =
        `url("${src}")`;

    } else {

      selectSkill.classList.add(
        "sem-icone"
      );


      selectSkill.style.backgroundImage =
        "none";

    }

  }


  function atualizarEfeito() {

    atualizarIconeSkill();


    const chave =
      normalizarElemento(
        selectSkill.value
      );


    const relacao =
      relacoesElementos[
        chave
      ];


    efeito.innerHTML =
      "";


    if (!relacao) {
      return;
    }


    const buffSpan =
      document.createElement(
        "span"
      );


    buffSpan.className =
      "efeito-buff";


    buffSpan.innerHTML =
      `
        <span class="seta-buff">⬆</span>
        ${renderizarIconeElemento(relacao.buff)}
        <span>${relacao.buff}</span>
      `;


    const removeSpan =
      document.createElement(
        "span"
      );


    removeSpan.className =
      "efeito-remove";


    removeSpan.innerHTML =
      `
        <span class="seta-remove">⬇</span>
        ${renderizarIconeElemento(relacao.removido)}
        <span>${relacao.removido}</span>
      `;


    efeito.appendChild(
      buffSpan
    );


    efeito.appendChild(
      removeSpan
    );

  }


  selectSkill.addEventListener(
    "change",
    function() {
      atualizarEfeito();
      atualizarPainelBuilder();
    }
  );


  grupo.appendChild(
    titulo
  );


  grupo.appendChild(
    selectSkill
  );


  grupo.appendChild(
    efeito
  );


  atualizarEfeito();


  return grupo;
}

/* =====================================================
   MOSTRAR DADOS DO SLOT
===================================================== */

function mostrarDadosDoSlot(
  numeroSlot,
  digimonSelecionado
) {

  const info =
    document.getElementById(
      "info" +
      numeroSlot
    );


  if (!info) {
    return;
  }


  const d =
    digimonSelecionado;


  if (!d) {
    return;
  }


  info.innerHTML = "";
  info._hgDigimon = d;

  const imagemBox =
    document.createElement(
      "div"
    );


  imagemBox.className =
    "team-image-box";


  if (d.icon) {

    const imagem =
      document.createElement(
        "img"
      );


    imagem.src =
      d.icon;


    imagem.alt =
      d.digimon;


    imagemBox.appendChild(
      imagem
    );

  } else {

    imagemBox.textContent =
      "⚔️";

  }


  info.appendChild(
    imagemBox
  );


  const tipo =
    normalizarType(
      d.type
    );


  const typeBox =
    document.createElement(
      "div"
    );


  typeBox.className =
    "type "
    +
    getClasseType(
      tipo
    );


  typeBox.innerHTML =
    `<span class="type-label">TYPE</span>${renderizarTypeIcon(tipo)}`;


  info.appendChild(
    typeBox
  );


  const field =
    document.createElement(
      "div"
    );


  field.className =
    "field";


  field.innerHTML =
    `
      <div class="label">
        FIELD
      </div>

      <div class="value">
        ${renderizarField(d.field)}
      </div>
    `;


  info.appendChild(
    field
  );


  const strong =
    document.createElement(
      "div"
    );


  strong.className =
    "strong element-stat";


  strong.innerHTML =
    `
      <div class="label">
        STRONG
      </div>

      <div class="value">
        ${renderizarRelacaoAtributo(d,"strong")}
      </div>
    `;


  info.appendChild(
    strong
  );


  const weak =
    document.createElement(
      "div"
    );


  weak.className =
    "weak element-stat";


  weak.innerHTML =
    `
      <div class="label">
        WEAK
      </div>

      <div class="value">
        ${renderizarRelacaoAtributo(d,"weak")}
      </div>
    `;


  info.appendChild(
    weak
  );


  const status = [

    /* STATUS PRINCIPAIS */
    ["HP", d.hp],
    ["SP", d.sp],
    ["STR", d.str],
    ["INT", d.int],
    ["DEF", d.def],
    ["RES", d.res],
    ["SPD", d.spd],

    /* STATUS SECUNDÁRIOS */
    ["CC", d.cc],
    ["DOT", d.dot],
    ["DEF BREAK", d.defBreak]

  ];


  status.forEach(
    function(item) {

      const mini =
        document.createElement(
          "div"
        );


      mini.className =
        "mini-stat";


      mini.textContent =
        item[0]
        +
        ": "
        +
        (
          item[1] ||
          "-"
        );


      info.appendChild(
        mini
      );

    }
  );


  info.appendChild(
    criarSkillSelect(
      "SKILL 1",
      d.skill1
    )
  );


  info.appendChild(
    criarSkillSelect(
      "SKILL 2",
      d.skill2
    )
  );


  info.appendChild(
    criarSkillSelect(
      "SKILL 3",
      d.skill3
    )
  );

  atualizarPainelBuilder();
}

/* =====================================================
   TEAM BUILDER — ANALISE DO TIME
===================================================== */

const BUILDER_SYNERGY = {
  DR:  { stat: "RES",   two: "4%",  three: "6%" },
  NSP: { stat: "CRIT",  two: "7%",  three: "12%" },
  WG:  { stat: "HP",    two: "8%",  three: "15%" },
  DS:  { stat: "SPD",   two: "4%",  three: "6%" },
  VB:  { stat: "SP",    two: "8%",  three: "15%" },
  NSO: { stat: "INT",   two: "3%",  three: "5%" },
  ME:  { stat: "DEF",   two: "6%",  three: "10%" },
  JT:  { stat: "STR",   two: "5%",  three: "8%" },
  DA:  { stat: "EVA",   two: "2%",  three: "4%" },
  UK:  { stat: "CHAIN", two: "10%", three: "15%" }
};

function builderTemEfeito(valor) {
  const v = String(valor == null ? "" : valor).trim().toUpperCase();
  return !["", "-", "NO", "NÃO", "NAO", "FALSE", "0", "NONE", "N/A"].includes(v);
}

function builderDigimonsSelecionados() {
  return Array.from(document.querySelectorAll("#builderPagina .selected-info"))
    .map(function(info) { return info._hgDigimon || null; })
    .filter(Boolean);
}

function builderFieldIcon(field) {
  const src = pegarImagemField(field);
  return src ? `<img src="${src}" alt="${field}" class="field-icon-img" onload="normalizarIconeField(this)">` : `<b>${field}</b>`;
}

function atualizarPainelBuilder() {
  const synergyEl = document.getElementById("builderSynergyActive");
  const refEl = document.getElementById("builderSynergyReference");
  const utilityEl = document.getElementById("builderUtility");
  const coverageEl = document.getElementById("builderElementCoverage");
  if (!synergyEl || !refEl || !utilityEl || !coverageEl) return;

  const digis = builderDigimonsSelecionados();
  const fieldNames = {};

  digis.forEach(function(d) {
    const nome = String(d.digimon || "").trim().toLowerCase();
    separarFields(d.field).forEach(function(field) {
      field = String(field).toUpperCase();
      if (!BUILDER_SYNERGY[field]) return;
      if (!fieldNames[field]) fieldNames[field] = new Set();
      if (nome) fieldNames[field].add(nome);
    });
  });

  const ativos = Object.keys(BUILDER_SYNERGY).map(function(field) {
    const qtd = Math.min(3, fieldNames[field] ? fieldNames[field].size : 0);
    if (qtd < 2) return "";
    const cfg = BUILDER_SYNERGY[field];
    const bonus = qtd >= 3 ? cfg.three : cfg.two;
    return `<div class="synergy-active-row"><span class="analysis-icon">${builderFieldIcon(field)}</span><strong>${field} ×${qtd}</strong><span class="analysis-arrow">→</span><em>${cfg.stat} +${bonus}</em></div>`;
  }).filter(Boolean);

  synergyEl.innerHTML = ativos.length ? ativos.join("") : `<div class="analysis-empty">Nenhuma synergy ativa. São necessários 2 Digimons diferentes com o mesmo Field.</div>`;

  refEl.innerHTML = `<div class="synergy-reference-title">SYNERGY LIST</div>` + Object.keys(BUILDER_SYNERGY).map(function(field) {
    const cfg = BUILDER_SYNERGY[field];
    return `<div class="synergy-ref-row"><span class="analysis-icon small">${builderFieldIcon(field)}</span><b>${field}</b><span>×2 ${cfg.stat} +${cfg.two}</span><span>×3 ${cfg.stat} +${cfg.three}</span></div>`;
  }).join("");

  const utility = [
    ["CC", digis.filter(function(d){ return builderTemEfeito(d.cc); }).length],
    ["DOT", digis.filter(function(d){ return builderTemEfeito(d.dot); }).length],
    ["DEF BREAK", digis.filter(function(d){ return builderTemEfeito(d.defBreak); }).length]
  ];
  utilityEl.innerHTML = utility.map(function(item) {
    const pct = digis.length ? (item[1] / digis.length) * 100 : 0;
    return `<div class="utility-row"><div><strong>${item[0]}</strong><span>${item[1]} / ${digis.length || 0}</span></div><div class="analysis-meter"><i style="width:${pct}%"></i></div></div>`;
  }).join("");

  const counts = {}; let total = 0;
  document.querySelectorAll("#builderPagina .selected-info .skill select").forEach(function(select) {
    const el = normalizarElemento(select.value);
    if (!el) return;
    counts[el] = (counts[el] || 0) + 1; total++;
  });
  const ordered = Object.keys(counts).sort(function(a,b){ return counts[b]-counts[a] || a.localeCompare(b); });
  coverageEl.innerHTML = ordered.length ? ordered.map(function(el) {
    const pct = total ? counts[el] * 100 / total : 0;
    const label = Math.round(pct * 10) / 10;
    return `<div class="coverage-row"><span class="coverage-icon">${renderizarIconeElemento(el)}</span><strong>${el}</strong><div class="analysis-meter"><i style="width:${pct}%"></i></div><b>${String(label).replace(".", ",")}%</b></div>`;
  }).join("") : `<div class="analysis-empty">Selecione Digimons para analisar os elementos das skills.</div>`;

  atualizarEstadoAcoesBuilder(digis.length);
}



/* =====================================================
   ELEMENTOS
===================================================== */

function criarElementos() {

  const select =
    document.getElementById(
      "elementoSelect"
    );


  if (!select) {
    return;
  }


  select.innerHTML = `

    <option value="">
      — Escolha um elemento —
    </option>

  `;


  select.classList.add(
    "elemento-select-icon",
    "sem-icone"
  );


  Object.keys(
    relacoesElementos
  )
    .forEach(
      function(elemento) {

        const option =
          document.createElement(
            "option"
          );


        option.value =
          elemento;


        option.textContent =
          elemento;


        select.appendChild(
          option
        );

      }
    );

}


function mostrarElementoSelecionado() {

  const select =
    document.getElementById(
      "elementoSelect"
    );


  const resultado =
    document.getElementById(
      "elementoResultado"
    );


  if (
    !select ||
    !resultado
  ) {

    return;

  }


  const elemento =
    normalizarElemento(
      select.value
    );


  const srcElementoSelecionado =
    pegarImagemElemento(
      elemento
    );


  if (srcElementoSelecionado) {

    select.classList.remove(
      "sem-icone"
    );

    select.style.backgroundImage =
      `url("${srcElementoSelecionado}")`;

  } else {

    select.classList.add(
      "sem-icone"
    );

    select.style.backgroundImage =
      "none";

  }


  if (!elemento) {

    resultado.innerHTML =
      "Selecione um elemento acima.";


    return;

  }


  const relacao =
    relacoesElementos[
      elemento
    ];


  if (!relacao) {
    return;
  }


  resultado.innerHTML = `

    <div class="elemento-resultado-nome">

      ${renderizarIconeElemento(elemento)}

      <span>
        ${elemento}
      </span>

    </div>

    <div
      class="elemento-resultado-linha elemento-buff"
    >

      <span class="seta-buff">⬆</span>

      <strong>BUFF</strong>

      ${renderizarIconeElemento(relacao.buff)}

      <strong>
        ${relacao.buff}
      </strong>

    </div>

    <div
      class="elemento-resultado-linha elemento-remove"
    >

      <span class="seta-remove">⬇</span>

      <strong>REMOVE</strong>

      ${renderizarIconeElemento(relacao.removido)}

      <strong>
        ${relacao.removido}
      </strong>

    </div>

  `;

}


/* =====================================================
   CARREGAR IMAGENS
===================================================== */

function carregarImagensSite() {

  chamarApiJsonp("images")
    .then(
      function(resposta) {

        imagensSite =
          resposta.images ||
          {};

        montarFiltrosAvancadosDigidex();
        filtrarDigivolutions();
        montarCenaElementosHakase();
        renderizarRaids();

        if (
          Array.isArray(database) &&
          database.length > 0
        ) {
          filtrar();
        }

        const logo =
          pegarImagem(
            "holyguardians_logo"
          );

        const headerLogo =
          document.getElementById(
            "headerLogo"
          );

        const headerLogoGlow =
          document.getElementById(
            "headerLogoGlow"
          );

        if (
          headerLogo &&
          logo
        ) {
          headerLogo.src =
            logo;

          if (headerLogoGlow) {
            headerLogoGlow.src =
              logo;
          }
        }

        aplicarAssetsHome();
        aplicarAssetHakaseDigidex();
        criarStaff();

        if (
          database &&
          database.length
        ) {
          filtrar();
        }

      }
    )
    .catch(
      function(erro) {

        console.log(
          "Erro ao carregar imagens:",
          erro
        );

        criarStaff();

      }
    );

}



/* =====================================================
   ASSET DIGIDEX — AGUMON HAKASE
===================================================== */

function aplicarAssetHakaseDigidex() {

  const imagem =
    document.getElementById(
      "digidexHakase"
    );

  const wrap =
    document.getElementById(
      "digidexHakaseWrap"
    );

  if (
    !imagem ||
    !wrap
  ) {
    return;
  }


  const src =
    pegarImagem(
      "agumon_hakase"
    );


  if (!src) {

    wrap
      .classList
      .remove(
        "loaded"
      );

    return;
  }


  imagem.onload =
    function() {

      wrap
        .classList
        .add(
          "loaded"
        );

    };


  imagem.onerror =
    function() {

      wrap
        .classList
        .remove(
          "loaded"
        );

    };


  imagem.src =
    src;

}



/* =====================================================
   COMPARAÇÃO
===================================================== */

const comparacaoLados = ["A","B","C","D","E","F","G","H"];

const comparacaoSelecionados = {
  A: null,
  B: null,
  C: null,
  D: null,
  E: null,
  F: null,
  G: null,
  H: null
};

let quantidadeComparacao = 2;


function setQuantidadeComparacao(qtd) {
  qtd = Number(qtd);

  if (![2, 4, 8].includes(qtd)) {
    qtd = 2;
  }

  quantidadeComparacao = qtd;

  document
    .querySelectorAll(".comparacao-qtd-btn")
    .forEach(function(botao) {
      botao.classList.toggle(
        "ativo",
        Number(botao.dataset.qtd) === qtd
      );
    });

  const subtitle =
    document.getElementById("comparacaoSubtitle");

  if (subtitle) {
    subtitle.textContent =
      qtd === 2
        ? "Selecione dois Digimons e compare seus dados lado a lado."
        : "Selecione " + qtd + " Digimons e compare seus dados usando a mesma lógica da comparação principal.";
  }

  renderizarSelectoresComparacao();
  renderizarComparacao();
}


function renderizarSelectoresComparacao() {
  const container =
    document.getElementById("comparacaoSelectores");

  if (!container) {
    return;
  }

  const ladosAtivos =
    comparacaoLados.slice(0, quantidadeComparacao);

  container.className =
    "comparacao-selectores comparacao-selectores-" +
    quantidadeComparacao;

  container.innerHTML =
    ladosAtivos
      .map(function(lado, indice) {
        const selecionado =
          comparacaoSelecionados[lado];

        const seletor = `
          <div class="comparacao-selector">
            <label for="comparacaoDigimon${lado}">
              DIGIMON ${indice + 1}
            </label>
            <input
              id="comparacaoDigimon${lado}"
              class="comparacao-input"
              type="text"
              placeholder="Digite o nome do Digimon..."
              autocomplete="off"
              value="${selecionado ? escaparHtml(selecionado.digimon) : ""}"
              oninput="atualizarSugestoesComparacao('${lado}')"
              onfocus="atualizarSugestoesComparacao('${lado}')"
            >
            <div
              id="comparacaoSugestoes${lado}"
              class="comparacao-sugestoes"
            ></div>
          </div>
        `;

        if (
          quantidadeComparacao === 2 &&
          indice === 0
        ) {
          return seletor +
            '<div class="comparacao-vs">VS</div>';
        }

        return seletor;
      })
      .join("");
}


function escaparHtml(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function numeroComparacao(valor) {
  if (valor === null || valor === undefined || valor === "") {
    return null;
  }

  const limpo = String(valor)
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");

  const numero = Number(limpo);

  return Number.isFinite(numero)
    ? numero
    : null;
}


function procurarDigimonComparacao(nome) {
  const alvo = String(nome || "")
    .trim()
    .toLowerCase();

  if (!alvo) {
    return null;
  }

  return database.find(function(d) {
    return String(d.digimon || "")
      .trim()
      .toLowerCase() === alvo;
  }) || null;
}


function atualizarSugestoesComparacao(lado) {
  const input =
    document.getElementById(
      "comparacaoDigimon" + lado
    );

  const box =
    document.getElementById(
      "comparacaoSugestoes" + lado
    );

  if (!input || !box) {
    return;
  }

  const termo =
    String(input.value || "")
      .trim()
      .toLowerCase();

  comparacaoSelecionados[lado] =
    procurarDigimonComparacao(
      input.value
    );

  renderizarComparacao();

  if (!termo) {
    box.innerHTML = "";
    return;
  }

  const resultados =
    database
      .filter(function(d) {
        return String(d.digimon || "")
          .toLowerCase()
          .includes(termo);
      })
      .slice(0, 8);

  box.innerHTML =
    resultados
      .map(function(d) {
        return `
          <button
            type="button"
            class="comparacao-sugestao"
            onclick="selecionarDigimonComparacao(
              '${lado}',
              '${String(d.digimon || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'
            )"
          >
            ${
              d.icon
                ? `<img src="${d.icon}" alt="">`
                : ""
            }
            <span>${escaparHtml(d.digimon)}</span>
          </button>
        `;
      })
      .join("");
}


function selecionarDigimonComparacao(
  lado,
  nome
) {
  const d =
    procurarDigimonComparacao(
      nome
    );

  if (!d) {
    return;
  }

  comparacaoSelecionados[lado] =
    d;

  const input =
    document.getElementById(
      "comparacaoDigimon" + lado
    );

  const box =
    document.getElementById(
      "comparacaoSugestoes" + lado
    );

  if (input) {
    input.value =
      d.digimon;
  }

  if (box) {
    box.innerHTML =
      "";
  }

  renderizarComparacao();
}


function classeValorComparacao(
  valorA,
  valorB,
  lado
) {
  const a =
    numeroComparacao(
      valorA
    );

  const b =
    numeroComparacao(
      valorB
    );

  if (a === null || b === null) {
    return "";
  }

  if (a === b) {
    return "empate";
  }

  if (
    (lado === "A" && a > b) ||
    (lado === "B" && b > a)
  ) {
    return "vencedor";
  }

  return "";
}


function valorSeguroComparacao(valor) {
  return (
    valor === null ||
    valor === undefined ||
    valor === ""
  )
    ? "-"
    : escaparHtml(valor);
}


function classeStatCardMultiplo(
  valorAtual,
  todosValores
) {
  const atual =
    numeroComparacao(valorAtual);

  const validos =
    todosValores
      .map(numeroComparacao)
      .filter(function(v) {
        return v !== null;
      });

  if (
    atual === null ||
    validos.length < 2
  ) {
    return "";
  }

  const maximo =
    Math.max.apply(null, validos);

  const minimo =
    Math.min.apply(null, validos);

  /* Todos iguais = empate real, sem verde/vermelho. */
  if (maximo === minimo) {
    return "empate";
  }

  /*
   * Modo principal de 2:
   * preserva exatamente a lógica tradicional.
   */
  if (quantidadeComparacao === 2) {
    if (atual === maximo) {
      return "maior";
    }

    if (atual === minimo) {
      return "menor";
    }

    return "";
  }

  /*
   * Modos 4 e 8:
   * o maior valor é o vencedor (verde ▲).
   * TODOS os demais ficam como perdedores (vermelho ▼).
   *
   * Em empate no topo, todos os maiores ficam verdes.
   */
  if (atual === maximo) {
    return "maior";
  }

  return "menor";
}


function setaStatCardMultiplo(
  valorAtual,
  todosValores
) {
  const classe =
    classeStatCardMultiplo(
      valorAtual,
      todosValores
    );

  if (classe === "maior") {
    return `
      <span class="comparacao-stat-seta">
        ▲
      </span>
    `;
  }

  if (classe === "menor") {
    return `
      <span class="comparacao-stat-seta">
        ▼
      </span>
    `;
  }

  return "";
}


function statCardComparacaoMultipla(
  label,
  valorAtual,
  todosValores
) {
  const classe =
    classeStatCardMultiplo(
      valorAtual,
      todosValores
    );

  return `
    <div class="comparacao-stat ${classe}">

      <div class="comparacao-stat-label">
        ${label}
      </div>

      <div class="comparacao-stat-value ${classe}">
        ${setaStatCardMultiplo(valorAtual, todosValores)}
        <span>
          ${valorSeguroComparacao(valorAtual)}
        </span>
      </div>

    </div>
  `;
}


function cardComparacaoMultipla(
  d,
  selecionados
) {
  const tipo =
    normalizarType(d.type);

  const valores = {
    hp: selecionados.map(function(x) { return x.hp; }),
    sp: selecionados.map(function(x) { return x.sp; }),
    str: selecionados.map(function(x) { return x.str; }),
    int: selecionados.map(function(x) { return x.int; }),
    def: selecionados.map(function(x) { return x.def; }),
    res: selecionados.map(function(x) { return x.res; }),
    spd: selecionados.map(function(x) { return x.spd; })
  };

  return `
    <div class="comparacao-card">

      <div class="comparacao-card-head">
        ${
          d.icon
            ? `
              <div class="comparacao-retrato">
                <img
                  src="${d.icon}"
                  alt="${escaparHtml(d.digimon)}"
                >
              </div>
            `
            : ""
        }

        <h3>
          ${escaparHtml(d.digimon)}
        </h3>

        <div class="comparacao-card-type ${getClasseType(tipo)}">
          ${renderizarTypeIcon(tipo)}
        </div>
      </div>

      <div class="comparacao-stats">

        ${statCardComparacaoMultipla("HP", d.hp, valores.hp)}
        ${statCardComparacaoMultipla("SP", d.sp, valores.sp)}
        ${statCardComparacaoMultipla("STR", d.str, valores.str)}
        ${statCardComparacaoMultipla("INT", d.int, valores.int)}
        ${statCardComparacaoMultipla("DEF", d.def, valores.def)}
        ${statCardComparacaoMultipla("RES", d.res, valores.res)}
        ${statCardComparacaoMultipla("SPD", d.spd, valores.spd)}

      </div>

      <div class="comparacao-extra">

        <div class="comparacao-extra-box">
          <div class="label">FIELD</div>
          <div class="value">
            ${renderizarField(d.field)}
          </div>
        </div>

        <div class="comparacao-extra-dupla">
          <div class="comparacao-extra-box">
            <div class="label">STRONG</div>
            <div class="value">
              ${renderizarRelacaoAtributo(d,"strong")}
            </div>
          </div>

          <div class="comparacao-extra-box">
            <div class="label">WEAK</div>
            <div class="value">
              ${renderizarRelacaoAtributo(d,"weak")}
            </div>
          </div>
        </div>

      </div>
    </div>
  `;
}


function renderizarComparacao() {
  const resultado =
    document.getElementById(
      "comparacaoResultado"
    );

  if (!resultado) {
    return;
  }

  const ladosAtivos =
    comparacaoLados.slice(
      0,
      quantidadeComparacao
    );

  /*
   * Só entram na comparação os Digimons que já foram
   * realmente selecionados nos slots ativos.
   *
   * Assim:
   * 1 escolhido  -> 1 card aparece, ainda neutro
   * 2 escolhidos -> os 2 já se comparam
   * 3 escolhidos -> os 3 já se comparam
   * 4 escolhidos -> comparação global entre os 4
   * e o mesmo vale progressivamente até 8.
   */
  const completos =
    ladosAtivos
      .map(function(lado) {
        return comparacaoSelecionados[lado];
      })
      .filter(Boolean);


  if (!completos.length) {

    resultado.innerHTML = `
      <div class="comparacao-empty">
        ${
          quantidadeComparacao === 2
            ? "Escolha dois Digimons para iniciar a comparação."
            : "Selecione até " + quantidadeComparacao +
              " Digimons para iniciar a comparação."
        }
      </div>
    `;

    return;
  }


  resultado.innerHTML = `
    <div class="
      comparacao-grid
      comparacao-grid-${quantidadeComparacao}
      comparacao-grid-preenchidos-${completos.length}
    ">
      ${
        completos
          .map(function(d) {
            /*
             * IMPORTANTE:
             * passamos a lista COMPLETA dos selecionados atuais.
             * Logo HP/SP/STR/INT/DEF/RES/SPD de cada card são
             * comparados contra todos os demais, e não em pares.
             */
            return cardComparacaoMultipla(
              d,
              completos
            );
          })
          .join("")
      }
    </div>
  `;
}

document.addEventListener(
  "click",
  function(evento) {

    comparacaoLados.forEach(
      function(lado) {

        const input =
          document.getElementById(
            "comparacaoDigimon" + lado
          );

        const box =
          document.getElementById(
            "comparacaoSugestoes" + lado
          );

        if (
          input &&
          box &&
          !input.contains(evento.target) &&
          !box.contains(evento.target)
        ) {
          box.innerHTML =
            "";
        }

      }
    );

  }
);



/* =====================================================
   CALCULADORA DE DANO ELEMENTAL — SKILLS LV10
   ===================================================== */

function calcInterpretarCoeficienteSkill(skill) {
  if (!skill || typeof skill !== "object") {
    return {
      available: false,
      hits: 0,
      perHit: 0,
      baseTotal: 0,
      baseElement: "",
      elements: []
    };
  }

  /*
   * A MASTER agora entrega os números estruturados da própria aba SKILLS.
   * O texto continua como fallback para manter compatibilidade com dados antigos.
   */
  let hits = Number(skill.hits);
  let perHit = Number(skill.perHit);
  let baseTotal = Number(skill.baseTotal);

  if (!Number.isFinite(hits)) hits = 0;
  if (!Number.isFinite(perHit)) perHit = 0;
  if (!Number.isFinite(baseTotal)) baseTotal = 0;

  if (!(hits > 0 && perHit > 0 && baseTotal > 0)) {
    const calculo = String(skill.calculo || "").trim();

    const match = calculo.match(
      /(\d+)\s*[x×]\s*([\d.,]+)\s*%\s*(?:=\s*([\d.,]+)\s*%)?/i
    );

    if (match) {
      hits = Number(match[1]) || 0;
      perHit = Number(String(match[2]).replace(",", ".")) || 0;
      baseTotal =
        match[3] !== undefined
          ? Number(String(match[3]).replace(",", ".")) || 0
          : hits * perHit;
    } else {
      const percentual = calculo.match(/([\d.,]+)\s*%/);

      if (percentual) {
        hits = 1;
        perHit = Number(String(percentual[1]).replace(",", ".")) || 0;
        baseTotal = perHit;
      }
    }
  }

  const baseElement =
    normalizarElemento(skill.base || "");

  const elements = [];

  (
    Array.isArray(skill.elementos)
      ? skill.elementos
      : (baseElement ? [baseElement] : [])
  ).forEach(function(elemento) {
    const normalizado =
      normalizarElemento(elemento);

    if (
      normalizado &&
      elements.indexOf(normalizado) === -1
    ) {
      elements.push(normalizado);
    }
  });

  if (
    baseElement &&
    elements.indexOf(baseElement) === -1
  ) {
    elements.unshift(baseElement);
  }

  return {
    available:
      hits > 0 &&
      perHit > 0 &&
      baseTotal > 0,
    hits: hits,
    perHit: perHit,
    baseTotal: baseTotal,
    baseElement: baseElement,
    elements: elements
  };
}


/* Os coeficientes exatos agora vêm diretamente da DATABASE MASTER FINAL. */

function calcMetaPvpDoDigimon(nome) {
  if (!Array.isArray(pvpDatabase) || !pvpDatabase.length) return null;
  const alvo = calcNormalizarNome(nome);
  return pvpDatabase.find(function(item) {
    return calcNormalizarNome(item && item.name) === alvo;
  }) || null;
}

function calcMarcadorTemSkill(valor, numeroSkill) {
  const texto = String(valor == null ? "" : valor).trim().toUpperCase();
  return texto.indexOf("SKILL " + numeroSkill) !== -1;
}

function calcEnriquecerSkillsComMeta(nomeDigimon, skills, dadosApi) {
  const metaDigi = calcMetaPvpDoDigimon(nomeDigimon);
  const metaSkills = metaDigi && Array.isArray(metaDigi.skills) ? metaDigi.skills : [];

  function numeroOpcional(valor) {
    if (valor === "" || valor === null || valor === undefined) return null;
    const numero = Number(String(valor).replace(",", "."));
    return Number.isFinite(numero) ? numero : null;
  }

  (skills || []).forEach(function(skill, index) {
    if (!skill) return;

    const numero = index + 1;
    const apiSkill =
      dadosApi &&
      dadosApi["skill" + numero] &&
      typeof dadosApi["skill" + numero] === "object"
        ? dadosApi["skill" + numero]
        : null;

    const meta = metaSkills.find(function(item) {
      return Number(item && item.slot) === numero;
    }) || metaSkills[index] || null;

    const efeitos = [];
    const categoriaApi = String(apiSkill && apiSkill.effectCategory || "").toUpperCase();
    const apiCc = String(apiSkill && apiSkill.cc || "").toUpperCase() === "YES" || categoriaApi.indexOf("CC") !== -1;
    const apiDot = String(apiSkill && apiSkill.dot || "").toUpperCase() === "YES" || categoriaApi.indexOf("DOT") !== -1;
    const apiDef = String(apiSkill && apiSkill.defBreak || "").toUpperCase() === "YES" || categoriaApi.indexOf("DEF_BREAK") !== -1 || categoriaApi.indexOf("DEF BREAK") !== -1;

    const metaCc = meta && String(meta.cc || "").toUpperCase() === "YES";
    const metaDot = meta && String(meta.dot || "").toUpperCase() === "YES";
    const metaDef = meta && String(meta.defBreak || "").toUpperCase() === "YES";

    if (apiCc || metaCc || calcMarcadorTemSkill(dadosApi && dadosApi.cc, numero)) efeitos.push("CC");
    if (apiDot || metaDot || calcMarcadorTemSkill(dadosApi && dadosApi.dot, numero)) efeitos.push("DOT");
    if (apiDef || metaDef || calcMarcadorTemSkill(dadosApi && dadosApi.defBreak, numero)) efeitos.push("DEF BREAK");

    skill.slot = numero;
    skill.name = String(
      apiSkill && apiSkill.name
        ? apiSkill.name
        : (meta && meta.name ? meta.name : "Skill " + numero)
    );

    skill.icon = String(
      apiSkill && apiSkill.icon
        ? apiSkill.icon
        : (meta && meta.icon ? meta.icon : "")
    );

    skill.effectName = String(apiSkill && apiSkill.effectName || "").trim();
    skill.effectCategory = categoriaApi;
    skill.effectChance = numeroOpcional(apiSkill && apiSkill.effectChance);
    skill.ccType = String(apiSkill && apiSkill.ccType || "").trim();
    skill.attributeEffects = String(apiSkill && apiSkill.attributeEffects || "").trim();
    skill.description = String(
      apiSkill && apiSkill.effectDescription
        ? apiSkill.effectDescription
        : (meta && meta.description ? meta.description : "")
    );

    skill.effects = efeitos;
    skill.hasEffect = efeitos.length > 0 || (categoriaApi && categoriaApi !== "NONE");
    skill.burst =
      apiSkill && apiSkill.burst && typeof apiSkill.burst === "object"
        ? apiSkill.burst
        : null;
  });

  return skills;
}

function calcNomeSkill(skill, index) {
  return String((skill && skill.name) || ("Skill " + (index + 1))).trim();
}

function calcNumeroMetaOpcional(valor) {
  if (valor === "" || valor === null || valor === undefined) return null;
  const numero = Number(String(valor).replace(",", "."));
  return Number.isFinite(numero) ? numero : null;
}

function calcBurstMeta(skill) {
  return skill && skill.burst && typeof skill.burst === "object"
    ? skill.burst
    : null;
}

function calcBurstEhEfeito(skill) {
  const burst = calcBurstMeta(skill);
  return Boolean(
    burst &&
    String(burst.functionType || "").toUpperCase() === "EFFECT_RATE_UP"
  );
}

function calcBurstEhDano(skill) {
  const burst = calcBurstMeta(skill);
  return Boolean(
    burst &&
    String(burst.functionType || "").toUpperCase() === "DAMAGE_VALUE_UP"
  );
}

function calcBurstRateUpPercent(skill) {
  const burst = calcBurstMeta(skill);
  if (!burst) return null;

  const direto = calcNumeroMetaOpcional(burst.effectRateUpPercent);
  if (Number.isFinite(direto)) return direto;

  const bruto = calcNumeroMetaOpcional(burst.functionValue2);
  return Number.isFinite(bruto) ? bruto / 100 : null;
}

function calcBurstDisponivel(skill) {
  if (!skill) return false;

  if (calcBurstEhEfeito(skill)) {
    return Boolean(skill.hasEffect);
  }

  if (calcBurstEhDano(skill)) {
    const burst = calcBurstMeta(skill);
    const perHit = Number(burst && burst.perHit);
    const total = Number(burst && burst.total);

    return Boolean(
      skill.available &&
      Number.isFinite(perHit) && perHit > 0 &&
      Number.isFinite(total) && total > 0
    );
  }

  return false;
}

function calcSkillIdentityHtml(skill, index, compacto, modoTooltip) {
  const numero = index + 1;
  const nome = calcNomeSkill(skill, index);
  const icone = String((skill && skill.icon) || "").trim();
  const descricao = String((skill && skill.description) || "").trim();
  const efeitos = Array.isArray(skill && skill.effects) ? skill.effects : [];
  const elementoBase = String((skill && skill.baseElement) || "").trim();
  const hits = Number(skill && skill.hits) || 0;
  const perHit = Number(skill && skill.perHit) || 0;
  const baseTotal = Number(skill && skill.baseTotal) || 0;
  const effectName = String((skill && skill.effectName) || "").trim();
  const effectChance = calcNumeroMetaOpcional(skill && skill.effectChance);
  const attributeEffects = String((skill && skill.attributeEffects) || "").trim();
  const burst = modoTooltip === "burst";
  const burstMeta = calcBurstMeta(skill);

  const tooltipLinhas = [];
  let tooltipTitulo = nome;
  let tooltipDescricao = descricao;

  if (burst) {
    const nomeBurst = String(burstMeta && burstMeta.name || "").trim();
    tooltipTitulo = (nomeBurst || nome) + " • BURST";
    tooltipLinhas.push("BURST SKILL • BASE: SKILL " + numero + " • LEVEL 10");

    if (calcBurstEhEfeito(skill)) {
      tooltipLinhas.push("Tipo: EFFECT RATE UP");
      if (effectName) tooltipLinhas.push("Efeito: " + effectName);
      else if (efeitos.length) tooltipLinhas.push("Efeito: " + efeitos.join(" + "));
      if (Number.isFinite(effectChance)) tooltipLinhas.push("Chance base: " + calcFormatar(effectChance) + "%");

      const rateUp = calcBurstRateUpPercent(skill);
      if (Number.isFinite(rateUp)) tooltipLinhas.push("Bônus Burst na taxa do efeito: +" + calcFormatar(rateUp) + "%");

      if (hits && perHit && baseTotal) {
        tooltipLinhas.push("Dano permanece igual: " + hits + " hits × " + calcFormatar(perHit) + "% = " + calcFormatar(baseTotal) + "%");
      } else {
        tooltipLinhas.push("Sem coeficiente percentual de dano na base");
      }

      tooltipDescricao = descricao || "A Burst aumenta a taxa do efeito; não multiplica o dano normal desta Skill.";
    } else if (calcBurstEhDano(skill)) {
      tooltipLinhas.push("Tipo: DAMAGE VALUE UP");
      if (elementoBase) tooltipLinhas.push("Elemento base: " + elementoBase);

      const burstPerHit = Number(burstMeta && burstMeta.perHit);
      const burstTotal = Number(burstMeta && burstMeta.total);
      if (hits && Number.isFinite(burstPerHit) && Number.isFinite(burstTotal)) {
        tooltipLinhas.push(
          hits + " hits × " + calcFormatar(burstPerHit) + "% = " + calcFormatar(burstTotal) + "%"
        );
      }

      tooltipDescricao = "Valores de Burst lidos diretamente da DATABASE MASTER FINAL.";
    } else {
      tooltipLinhas.push("Dados de Burst indisponíveis para esta Skill");
    }
  } else {
    tooltipLinhas.push("SKILL " + numero + " • LEVEL 10");
    if (elementoBase) tooltipLinhas.push("Elemento base: " + elementoBase);
    if (hits && perHit) {
      tooltipLinhas.push(
        hits + " hits × " + calcFormatar(perHit) + "%" +
        (baseTotal > 0 ? " = " + calcFormatar(baseTotal) + "%" : "")
      );
    }
    if (effectName) tooltipLinhas.push("Efeito: " + effectName);
    else if (efeitos.length) tooltipLinhas.push("Efeito: " + efeitos.join(" + "));
    if (Number.isFinite(effectChance)) tooltipLinhas.push("Chance: " + calcFormatar(effectChance) + "%");
    if (attributeEffects) tooltipLinhas.push("Mudança por elemento: " + attributeEffects);
  }

  const tooltip = `
    <span class="calc-skill-tooltip ${burst ? "calc-burst-tooltip" : "calc-normal-tooltip"}" role="tooltip">
      <strong>${escaparHtml(tooltipTitulo)}</strong>
      <small>${escaparHtml(tooltipLinhas.join(" • "))}</small>
      ${tooltipDescricao ? `<em>${escaparHtml(tooltipDescricao)}</em>` : ""}
    </span>
  `;

  return `
    <span class="calc-skill-identity ${compacto ? "compacto" : ""}" tabindex="0">
      <span class="calc-skill-icon-frame">
        ${icone
          ? `<img src="${escaparHtml(icone)}" alt="${escaparHtml(nome)}">`
          : `<b>S${numero}</b>`}
      </span>
      <span class="calc-skill-identity-copy">
        <strong>${escaparHtml(nome)}</strong>
        <small>SKILL ${numero}${compacto ? "" : " • LEVEL 10"}</small>
      </span>
      ${tooltip}
    </span>
  `;
}

function calcDadosDoDigimon(d) {
  if (!d) return null;

  const nome = String(d.digimon || "").trim();
  const skills = [
    calcInterpretarCoeficienteSkill(d.skill1),
    calcInterpretarCoeficienteSkill(d.skill2),
    calcInterpretarCoeficienteSkill(d.skill3)
  ];

  calcEnriquecerSkillsComMeta(nome, skills, d);

  return {
    name: nome,
    icon: d.icon || "",
    skills: skills
  };
}


function calcObterDatabase() {
  return (
    Array.isArray(database)
      ? database
      : []
  )
    .map(calcDadosDoDigimon)
    .filter(function(digi) {
      return digi && digi.name;
    });
}


function calcNormalizarNome(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function calcNumero(valor) {
  const n = Number(
    String(valor ?? "")
      .replace(",", ".")
  );
  return Number.isFinite(n) ? n : 0;
}

function calcFormatar(valor) {
  if (!Number.isFinite(valor)) return "-";
  return valor
    .toLocaleString("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
}

function calcEncontrarDigimon(nome) {
  const alvo = calcNormalizarNome(nome);
  if (!alvo) return null;

  return calcObterDatabase().find(function(item) {
    return calcNormalizarNome(item.name) === alvo;
  }) || null;
}

function calcEncontrarDadosSite(nome) {
  if (!Array.isArray(database)) return null;
  const alvo = calcNormalizarNome(nome);

  return database.find(function(item) {
    return calcNormalizarNome(item.digimon) === alvo;
  }) || null;
}

function inicializarCalculadora() {

  /*
   * A calculadora usa autocomplete próprio (.calc-autocomplete-item).
   * A implementação antiga dependia de um <datalist> chamado `lista`,
   * que foi removido para evitar o dropdown nativo gigante do navegador.
   * Mantemos apenas a inicialização da calculadora/autocomplete atual.
   */

  calcConfigurarAutocomplete();

  if (typeof pvpCarregarDatabase === "function" && !pvpDatabase.length) {
    pvpCarregarDatabase().then(function() {
      atualizarCalculadora();
    });
  }

  atualizarCalculadora();
}


function calcFecharSugestoes() {

  const caixa =
    document.getElementById(
      "calcDigimonSugestoes"
    );

  if (!caixa) {
    return;
  }

  caixa.hidden = true;
  caixa.innerHTML = "";

}


function calcMostrarSugestoes() {

  const input =
    document.getElementById(
      "calcDigimon"
    );

  const caixa =
    document.getElementById(
      "calcDigimonSugestoes"
    );

  if (
    !input ||
    !caixa
  ) {
    return;
  }

  const termo =
    String(
      input.value || ""
    )
      .trim()
      .toLowerCase();

  /*
   * Sem texto digitado, mostramos no máximo 6 nomes.
   * Digitando, filtramos e continuamos limitando a lista.
   */
  const limite =
    6;

  const nomes =
    (
      calcObterDatabase()
    )
      .map(
        function(digi) {
          return String(
            digi.name || ""
          ).trim();
        }
      )
      .filter(Boolean)
      .filter(
        function(nome) {

          if (!termo) {
            return true;
          }

          return nome
            .toLowerCase()
            .includes(
              termo
            );

        }
      )
      .slice(
        0,
        limite
      );


  if (
    nomes.length ===
    0
  ) {

    caixa.hidden =
      true;

    caixa.innerHTML =
      "";

    return;
  }


  caixa.innerHTML =
    nomes
      .map(
        function(nome) {

          return `
            <button
              type="button"
              class="calc-autocomplete-item"
              data-calc-digimon="${nome.replace(/"/g, "&quot;")}"
            >
              ${nome}
            </button>
          `;

        }
      )
      .join("");


  caixa.hidden =
    false;


  caixa
    .querySelectorAll(
      ".calc-autocomplete-item"
    )
    .forEach(
      function(botao) {

        botao.addEventListener(
          "mousedown",
          function(evento) {

            /*
             * mousedown evita o blur do input
             * fechar a lista antes do clique.
             */
            evento.preventDefault();

            input.value =
              botao.dataset
                .calcDigimon ||
              "";

            calcFecharSugestoes();

            atualizarCalculadora();

          }
        );

      }
    );

}


function calcConfigurarAutocomplete() {

  const input =
    document.getElementById(
      "calcDigimon"
    );

  if (
    !input ||
    input.dataset
      .autocompleteConfigurado ===
      "sim"
  ) {
    return;
  }

  input.dataset
    .autocompleteConfigurado =
      "sim";


  input.removeAttribute(
    "list"
  );


  input.addEventListener(
    "focus",
    calcMostrarSugestoes
  );


  input.addEventListener(
    "input",
    function() {

      calcMostrarSugestoes();

      /*
       * Mantém o comportamento atual:
       * se o nome digitado já for válido,
       * atualizamos a calculadora.
       */
      atualizarCalculadora();

    }
  );


  input.addEventListener(
    "keydown",
    function(evento) {

      if (
        evento.key ===
        "Escape"
      ) {

        calcFecharSugestoes();

      }

    }
  );


  document.addEventListener(
    "mousedown",
    function(evento) {

      const caixa =
        document.getElementById(
          "calcDigimonSugestoes"
        );

      if (
        !caixa ||
        caixa.hidden
      ) {
        return;
      }

      if (
        evento.target ===
          input ||
        caixa.contains(
          evento.target
        )
      ) {
        return;
      }

      calcFecharSugestoes();

    }
  );

}


let calcBurstSkillSelecionada = 0;

function calcSelecionarBurstSkill(valor) {
  const indice = Number(valor);

  calcBurstSkillSelecionada =
    Number.isInteger(indice) &&
    indice >= 0 &&
    indice <= 2
      ? indice
      : 0;

  atualizarCalculadora();
}


function atualizarCalculadora() {
  calcConfigurarAutocomplete();

  const input = document.getElementById("calcDigimon");
  const selectElemento = document.getElementById("calcElemento");
  const inputValor = document.getElementById("calcElementoValor");
  const resultados = document.getElementById("calcResultados");
  const selected = document.getElementById("calcSelected");

  if (
    !input ||
    !selectElemento ||
    !inputValor ||
    !resultados ||
    !selected
  ) {
    return;
  }

  const digi =
    calcEncontrarDigimon(
      input.value
    );

  const elemento =
    String(
      selectElemento.value || ""
    ).toUpperCase();

  const bonusElemento =
    Math.max(
      0,
      calcNumero(
        inputValor.value
      )
    );

  /*
   * REGRA NORMAL CONFIRMADA PELOS TESTES:
   *
   * bônus por hit =
   * dano base daquele hit × (Elemento Total do Tamer / 100)
   *
   * BURST:
   * - DAMAGE_VALUE_UP usa os valores exatos de Burst da MASTER.
   * - EFFECT_RATE_UP preserva o dano normal e aumenta a taxa do efeito.
   */
  const fatorElemento =
    bonusElemento / 100;


  if (!digi) {

    selected.style.display =
      "none";

    resultados.innerHTML = `
      <div class="calc-empty">
        Selecione um Digimon da lista para visualizar as Skills Lv.10.
      </div>
    `;

    return;
  }


  const dadosSite =
    calcEncontrarDadosSite(
      digi.name
    );

  const imagem =
    dadosSite &&
    dadosSite.icon
      ? `<img src="${dadosSite.icon}" alt="${digi.name}">`
      : `<span>⚔️</span>`;


  selected.style.display =
    "flex";

  selected.innerHTML = `
    <div class="calc-selected-image">
      ${imagem}
    </div>

    <div class="calc-selected-copy">
      <div class="calc-selected-name">
        ${digi.name}
      </div>

      <div class="calc-selected-meta">
        Skills Lv.10
        • Elemento selecionado:
        <strong>${elemento}</strong>
        • Elemento Total do Tamer:
        <strong>${calcFormatar(bonusElemento)}%</strong>
      </div>
    </div>
  `;


  const cardsSkills =
    digi.skills
      .map(
        function(
          skill,
          index
        ) {

          const numeroSkill =
            index + 1;


          if (
            !skill.available ||
            !Number.isFinite(
              skill.baseTotal
            )
          ) {

            const tags =
              (
                skill.elements ||
                []
              )
                .map(
                  function(el) {

                    return `
                      <span
                        class="calc-element-tag ${
                          el === elemento
                            ? "ativo"
                            : ""
                        }"
                      >
                        ${el}
                      </span>
                    `;

                  }
                )
                .join("");

            const efeitoNome = String(skill.effectName || "").trim();
            const efeitoChance = calcNumeroMetaOpcional(skill.effectChance);
            const efeitoDescricao = String(skill.description || "").trim();
            const efeitoLabel = efeitoNome || (Array.isArray(skill.effects) ? skill.effects.join(" + ") : "");

            return `
              <article class="calc-skill-card nao-aplica">

                <div class="calc-skill-top">

                  ${calcSkillIdentityHtml(skill, index, false)}

                  <span class="calc-status ${skill.hasEffect ? "sim" : "nao"}">
                    ${
                      skill.hasEffect
                        ? escaparHtml(
                            efeitoLabel +
                            (Number.isFinite(efeitoChance) ? " • " + calcFormatar(efeitoChance) + "%" : "")
                          )
                        : "SEM COEFICIENTE"
                    }
                  </span>

                </div>

                <div class="calc-breakdown">
                  ${
                    skill.hasEffect
                      ? `
                        ${efeitoNome ? `<strong>${escaparHtml(efeitoNome)}</strong>` : "Skill de efeito"}
                        ${Number.isFinite(efeitoChance) ? ` • chance base <strong>${calcFormatar(efeitoChance)}%</strong>` : ""}
                        <br>
                        Esta Skill não possui coeficiente percentual de dano utilizável na base, mas mantém normalmente seu elemento e as trocas de elemento.
                        ${efeitoDescricao ? `<br>${escaparHtml(efeitoDescricao)}` : ""}
                      `
                      : `Esta skill não possui coeficiente de ataque utilizável na base atual.`
                  }
                </div>

                <div class="calc-elements">
                  ${tags}
                </div>

              </article>
            `;

          }


          const aplica =
            Array.isArray(
              skill.elements
            )
            &&
            skill.elements.includes(
              elemento
            );


          const bonusPorHit =
            aplica
              ? (
                  skill.perHit *
                  fatorElemento
                )
              : 0;


          const bonusDano =
            bonusPorHit *
            skill.hits;


          const totalFinal =
            skill.baseTotal +
            bonusDano;


          const tags =
            (
              skill.elements ||
              []
            )
              .map(
                function(el) {

                  return `
                    <span
                      class="calc-element-tag ${
                        el === elemento
                          ? "ativo"
                          : ""
                      }"
                    >
                      ${el}
                    </span>
                  `;

                }
              )
              .join("");


          return `
            <article
              class="calc-skill-card ${
                aplica
                  ? "aplica"
                  : "nao-aplica"
              }"
            >

              <div class="calc-skill-top">

                ${calcSkillIdentityHtml(skill, index, false)}

                <span
                  class="calc-status ${
                    aplica
                      ? "sim"
                      : "nao"
                  }"
                >
                  ${
                    aplica
                      ? elemento + " APLICADO"
                      : "SEM BÔNUS"
                  }
                </span>

              </div>


              <div class="calc-formula-row">

                <div>
                  <div class="calc-number-label">
                    Dano base total
                  </div>

                  <div class="calc-number">
                    ${calcFormatar(skill.baseTotal)}%
                  </div>
                </div>

                <div class="calc-arrow">
                  →
                </div>

                <div>
                  <div class="calc-number-label">
                    Dano total
                  </div>

                  <div class="calc-number final">
                    ${calcFormatar(totalFinal)}%
                  </div>
                </div>

              </div>


              <div class="calc-breakdown">

                <strong>
                  ${skill.hits} hits × ${calcFormatar(skill.perHit)}%
                </strong>
                ${skill.baseTotalExato ? "≈" : "="} ${calcFormatar(skill.baseTotal)}%

                <br>

                ${
                  aplica
                    ? `
                      Elemento Total do Tamer:
                      <strong>
                        ${calcFormatar(bonusElemento)}%
                      </strong>

                      <br>

                      Bônus elemental por hit:
                      <strong
                        class="calc-number bonus"
                        style="font-size:13px;"
                      >
                        +${calcFormatar(bonusPorHit)}%
                      </strong>

                      (${calcFormatar(skill.perHit)} × ${calcFormatar(bonusElemento)}%)

                      <br>

                      Bônus elemental total:
                      <strong>
                        +${calcFormatar(bonusDano)}%
                      </strong>

                      <br>

                      ${
                        skill.baseTotalExato
                          ? `
                            <strong>${calcFormatar(skill.baseTotal)}%</strong>
                            + <strong>${calcFormatar(bonusDano)}%</strong>
                            = <strong>${calcFormatar(totalFinal)}%</strong>
                          `
                          : `
                            <strong>
                              ${skill.hits} hits ×
                              (${calcFormatar(skill.perHit)}% + ${calcFormatar(bonusPorHit)}%)
                            </strong>
                            =
                            <strong>${calcFormatar(totalFinal)}%</strong>
                          `
                      }
                    `
                    : `
                      O elemento ${elemento} não entra nesta skill.
                    `
                }

              </div>


              <div class="calc-elements">
                ${tags}
              </div>

            </article>
          `;

        }
      )
      .join("");


  const skillsDisponiveis =
    digi.skills
      .map(function(skill, index) {
        return { skill: skill, index: index };
      })
      .filter(function(item) {
        return calcBurstDisponivel(item.skill);
      });


  if (
    !skillsDisponiveis.some(function(item) {
      return item.index === calcBurstSkillSelecionada;
    })
  ) {
    calcBurstSkillSelecionada =
      skillsDisponiveis.length
        ? skillsDisponiveis[0].index
        : 0;
  }


  const opcoesBurst =
    digi.skills
      .map(function(skill, index) {
        const disponivel = calcBurstDisponivel(skill);
        const nome = calcNomeSkill(skill, index);
        let motivo = "Dados de Burst indisponíveis";

        if (disponivel && calcBurstEhEfeito(skill)) {
          motivo = "Burst aumenta a taxa do efeito; dano normal não é multiplicado";
        } else if (disponivel && calcBurstEhDano(skill)) {
          motivo = "Burst de dano com valores exatos da MASTER";
        }

        return `
          <button
            type="button"
            class="calc-burst-skill-option ${index === calcBurstSkillSelecionada ? "ativo" : ""} ${disponivel ? "" : "indisponivel"}"
            onclick="calcSelecionarBurstSkill(${index})"
            ${disponivel ? "" : "disabled"}
            title="${escaparHtml(nome + " — " + motivo)}"
          >
            ${calcSkillIdentityHtml(skill, index, true, "burst")}
          </button>
        `;
      })
      .join("");


  const skillBurst =
    digi.skills[
      calcBurstSkillSelecionada
    ];


  let cardBurst = `
    <article class="calc-skill-card calc-burst-card nao-aplica">
      <div class="calc-skill-top">
        <div>
          <div class="calc-skill-title calc-burst-title">
            BURST SKILL
          </div>
          <div class="calc-skill-lv">
            DADOS DA DATABASE MASTER FINAL
          </div>
        </div>
      </div>

      <div class="calc-burst-selector-row">
        <span class="calc-burst-selector-label">Usar como base</span>
        <div class="calc-burst-skill-options">${opcoesBurst}</div>
      </div>

      <div class="calc-breakdown">
        Nenhuma Skill com dados de Burst utilizáveis está disponível.
      </div>
    </article>
  `;


  if (
    skillBurst &&
    calcBurstDisponivel(skillBurst)
  ) {
    const numeroSkillBurst = calcBurstSkillSelecionada + 1;
    const nomeSkillBurst = calcNomeSkill(skillBurst, calcBurstSkillSelecionada);
    const burstMeta = calcBurstMeta(skillBurst) || {};
    const nomeBurst = String(burstMeta.name || nomeSkillBurst).trim();

    const aplicaBurst =
      Array.isArray(skillBurst.elements) &&
      skillBurst.elements.includes(elemento);

    const tagsBurst =
      (skillBurst.elements || [])
        .map(function(el) {
          return `
            <span
              class="calc-element-tag ${el === elemento ? "ativo" : ""}"
            >
              ${el}
            </span>
          `;
        })
        .join("");

    if (calcBurstEhEfeito(skillBurst)) {
      const effectName = String(skillBurst.effectName || (skillBurst.effects || []).join(" + ") || "Efeito").trim();
      const effectChance = calcNumeroMetaOpcional(skillBurst.effectChance);
      const rateUp = calcBurstRateUpPercent(skillBurst);

      let danoNormalTotal = null;
      let bonusNormalPorHit = 0;
      let bonusNormalTotal = 0;

      if (skillBurst.available) {
        bonusNormalPorHit =
          aplicaBurst
            ? skillBurst.perHit * fatorElemento
            : 0;

        bonusNormalTotal =
          bonusNormalPorHit * skillBurst.hits;

        danoNormalTotal =
          skillBurst.baseTotal + bonusNormalTotal;
      }

      cardBurst = `
        <article class="calc-skill-card calc-burst-card aplica">

          <div class="calc-skill-top">
            <div>
              <div class="calc-skill-title calc-burst-title">
                BURST SKILL
              </div>
              <div class="calc-skill-lv">
                ${escaparHtml(nomeBurst)} • LEVEL 10 • EFFECT RATE UP
              </div>
            </div>

            <span class="calc-status sim">
              BURST DE EFEITO
            </span>
          </div>

          <div class="calc-burst-selector-row">
            <span class="calc-burst-selector-label">Burst baseada em</span>
            <div class="calc-burst-skill-options">${opcoesBurst}</div>
          </div>

          <div class="calc-formula-row calc-burst-formula">
            <div>
              <div class="calc-number-label">
                ${skillBurst.available ? "Dano normal total" : "Chance base do efeito"}
              </div>
              <div class="calc-number">
                ${
                  skillBurst.available
                    ? calcFormatar(danoNormalTotal) + "%"
                    : (Number.isFinite(effectChance) ? calcFormatar(effectChance) + "%" : "-")
                }
              </div>
            </div>

            <div class="calc-arrow">→</div>

            <div>
              <div class="calc-number-label">
                ${skillBurst.available ? "Dano na Burst" : "Bônus Burst na taxa"}
              </div>
              <div class="calc-number final calc-burst-final">
                ${
                  skillBurst.available
                    ? calcFormatar(danoNormalTotal) + "%"
                    : (Number.isFinite(rateUp) ? "+" + calcFormatar(rateUp) + "%" : "RATE UP")
                }
              </div>
            </div>
          </div>

          <div class="calc-breakdown calc-burst-breakdown">
            Efeito:
            <strong>${escaparHtml(effectName)}</strong>
            ${Number.isFinite(effectChance) ? ` • chance base <strong>${calcFormatar(effectChance)}%</strong>` : ""}

            <br>

            Burst:
            <strong>EFFECT RATE UP${Number.isFinite(rateUp) ? " +" + calcFormatar(rateUp) + "%" : ""}</strong>

            <br>

            <strong>O dano não é multiplicado pela Burst.</strong>
            ${
              skillBurst.available
                ? `
                  <br>
                  Dano normal preservado:
                  <strong>${skillBurst.hits} hits × ${calcFormatar(skillBurst.perHit)}%</strong>
                  = ${calcFormatar(skillBurst.baseTotal)}%
                  ${
                    aplicaBurst
                      ? `
                        <br>
                        Bônus elemental por hit permanece normal:
                        <strong>+${calcFormatar(bonusNormalPorHit)}%</strong>
                        <br>
                        Total com elemento:
                        <strong>${calcFormatar(danoNormalTotal)}%</strong>
                      `
                      : ""
                  }
                `
                : `
                  <br>
                  Esta Skill não possui coeficiente percentual de dano na base, mas mantém normalmente seu elemento e suas trocas de elemento.
                `
            }
          </div>

          <div class="calc-elements">
            ${tagsBurst}
          </div>

        </article>
      `;
    } else if (calcBurstEhDano(skillBurst)) {
      const burstPerHit = Number(burstMeta.perHit);
      const burstBaseTotal = Number(burstMeta.total);

      const bonusBurstPorHit =
        aplicaBurst
          ? burstPerHit * fatorElemento
          : 0;

      const bonusBurstTotal =
        bonusBurstPorHit * skillBurst.hits;

      const totalBurst =
        burstBaseTotal + bonusBurstTotal;

      cardBurst = `
        <article
          class="calc-skill-card calc-burst-card ${aplicaBurst ? "aplica" : "nao-aplica"}"
        >

          <div class="calc-skill-top">
            <div>
              <div class="calc-skill-title calc-burst-title">
                BURST SKILL
              </div>
              <div class="calc-skill-lv">
                ${escaparHtml(nomeBurst)} • LEVEL 10 • DAMAGE VALUE UP
              </div>
            </div>

            <span class="calc-status ${aplicaBurst ? "sim" : "nao"}">
              ${aplicaBurst ? elemento + " APLICADO" : "SEM BÔNUS"}
            </span>
          </div>

          <div class="calc-burst-selector-row">
            <span class="calc-burst-selector-label">Burst baseada em</span>
            <div class="calc-burst-skill-options">${opcoesBurst}</div>
          </div>

          <div class="calc-formula-row calc-burst-formula">
            <div>
              <div class="calc-number-label">Base Burst total</div>
              <div class="calc-number">${calcFormatar(burstBaseTotal)}%</div>
            </div>

            <div class="calc-arrow">→</div>

            <div>
              <div class="calc-number-label">Dano Burst total</div>
              <div class="calc-number final calc-burst-final">${calcFormatar(totalBurst)}%</div>
            </div>
          </div>

          <div class="calc-breakdown calc-burst-breakdown">
            ${escaparHtml(nomeSkillBurst)} original:
            <strong>${skillBurst.hits} hits × ${calcFormatar(skillBurst.perHit)}%</strong>
            = ${calcFormatar(skillBurst.baseTotal)}%

            <br>

            ${escaparHtml(nomeBurst)}:
            <strong>${skillBurst.hits} hits × ${calcFormatar(burstPerHit)}%</strong>
            = ${calcFormatar(burstBaseTotal)}%

            <br>

            ${
              aplicaBurst
                ? `
                  Bônus elemental Burst por hit:
                  <strong class="calc-number bonus" style="font-size:13px;">
                    +${calcFormatar(bonusBurstPorHit)}%
                  </strong>
                  (${calcFormatar(burstPerHit)} × ${calcFormatar(bonusElemento)}%)

                  <br>

                  Bônus elemental Burst total:
                  <strong>+${calcFormatar(bonusBurstTotal)}%</strong>

                  <br>

                  <strong>
                    ${skillBurst.hits} hits ×
                    (${calcFormatar(burstPerHit)}% + ${calcFormatar(bonusBurstPorHit)}%)
                  </strong>
                  = <strong>${calcFormatar(totalBurst)}%</strong>
                `
                : `
                  O elemento ${elemento} não entra na Skill ${numeroSkillBurst};
                  portanto não há bônus elemental nesta Burst.
                `
            }
          </div>

          <div class="calc-elements">
            ${tagsBurst}
          </div>

        </article>
      `;
    }
  }


  resultados.innerHTML =
    cardsSkills +
    cardBurst;
}

/* =====================================================
   DIGIVOLUTION — REQUISITOS E POTENTIAL PLANNER
===================================================== */

const POTENTIAL_STATS = ["HP", "SP", "STR", "INT", "DEF", "RES", "SPD"];
const POTENTIAL_COLORS = {
  HP: "#20c879",
  SP: "#38c7e8",
  STR: "#ff3548",
  INT: "#3388f5",
  DEF: "#ffd62e",
  RES: "#a747ef",
  SPD: "#53d25e"
};

let digivolutionAtual = null;
let babyCorrections = {};

function normalizarChaveDigivolution(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
}

function obterIconeDigivolution(nome, iconeExplicito) {
  if (iconeExplicito) return iconeExplicito;
  const chave = normalizarChaveDigivolution(nome);
  const digi = (database || []).find(function(item) {
    return normalizarChaveDigivolution(item.digimon) === chave;
  });
  return digi && digi.icon ? digi.icon : pegarImagem(nome);
}

function renderizarAvatarDigivolution(nome, classe, iconeExplicito) {
  const src = obterIconeDigivolution(nome, iconeExplicito);
  const inicial = String(nome || "?").replace(/^\[MUTANT\]\s*/i, "").charAt(0).toUpperCase();
  return `
    <span class="${classe || "digivolution-avatar"}">
      ${src ? `<img src="${escaparHtml(src)}" alt="${escaparHtml(nome)}" loading="lazy">` : `<b>${escaparHtml(inicial)}</b>`}
    </span>
  `;
}

function digivolutionTemStatus(item) {
  return Object.values((item.requirements && item.requirements.stats) || {}).some(function(stat) {
    return stat && (Number.isFinite(Number(stat.value)) || Number.isFinite(Number(stat.percent)));
  });
}

function digivolutionTemPotential(item) {
  return Object.values((item.requirements && item.requirements.stats) || {}).some(function(stat) {
    return stat && Number.isFinite(Number(stat.percent));
  });
}

function renderizarRequisitosDigivolution(item) {
  const req = item.requirements || {};
  const stats = req.stats || {};
  const requisitos = [];

  if (req.level) requisitos.push(`<span><small>LEVEL</small><strong>${escaparHtml(req.level)}</strong></span>`);
  if (req.bond != null) requisitos.push(`<span><small>FRIENDSHIP</small><strong>${escaparHtml(req.bond)}%</strong></span>`);

  Object.keys(stats).forEach(function(nome) {
    const stat = stats[nome] || {};
    const valorNecessario = Number.isFinite(Number(stat.percent)) ? `${Number(stat.percent)}%` : (stat.value || "-");
    requisitos.push(`<span class="req-${nome.toLowerCase()}"><small>${escaparHtml(nome)}</small><strong>${escaparHtml(valorNecessario)}</strong></span>`);
  });

  return requisitos.join("");
}

function renderizarItensDigivolution(item) {
  const itens = (item.requirements && item.requirements.items) || [];
  if (!itens.length) return `<div class="digivolution-no-items">NENHUM ITEM NECESSÁRIO</div>`;

  return itens.map(function(requisito) {
    const nomeArquivo = String(requisito.icon || "").split("/").pop();
    const iconesIncorporados = window.HG_DIGIVOLUTION_ITEM_ICONS || {};
    const src = iconesIncorporados[nomeArquivo] || requisito.icon || pegarImagem(requisito.name);
    return `
      <div class="digivolution-item">
        <span class="digivolution-item-icon">
          ${src ? `<img src="${escaparHtml(src)}" alt="${escaparHtml(requisito.name)}">` : `<b>◆</b>`}
        </span>
        <span><strong>${escaparHtml(requisito.name)}</strong><small>QUANTIDADE: ${Number(requisito.quantity) || 1}</small></span>
      </div>
    `;
  }).join("");
}

function categoriaNormalDigivolution(item) {
  const categoria = String(item.category || "").toUpperCase();
  const subtipo = String(item.subtype || "").toLowerCase();
  return subtipo === "normal" && (categoria === "MEGA" || categoria === "NORMAL");
}

function assinaturaRequisitosDigivolution(item) {
  const req = item.requirements || {};
  const anteriores = (item.from || []).map(function(entrada) {
    return normalizarChaveDigivolution(typeof entrada === "string" ? entrada : entrada.name);
  }).sort();
  const stats = Object.keys(req.stats || {}).sort().map(function(nome) {
    const stat = req.stats[nome] || {};
    return [nome, stat.value ?? null, stat.natural ?? null, stat.percent ?? null];
  });
  const itens = (req.items || []).map(function(requisito) {
    return [normalizarChaveDigivolution(requisito.name), Number(requisito.quantity) || 1];
  }).sort(function(a, b) { return a[0].localeCompare(b[0]); });
  return JSON.stringify({
    anteriores: anteriores,
    dono: normalizarChaveDigivolution(item.requirementOwner),
    nivel: req.level ?? null,
    amizade: req.bond ?? null,
    stats: stats,
    itens: itens,
    cubo: Number(item.cubePercent) || 0
  });
}

function numeroProbabilidadeDigivolution(valor) {
  const numero = Number(String(valor || "").replace("%", "").replace(",", ".").trim());
  return Number.isFinite(numero) ? numero : 0;
}

function formatarProbabilidadeDigivolution(valor) {
  const arredondado = Math.round(Number(valor) * 10) / 10;
  return `${Number.isInteger(arredondado) ? arredondado : String(arredondado).replace(".", ",")}%`;
}

function normalizarClassificacaoDigivolution(item) {
  const nome = normalizarChaveDigivolution(item.displayName || item.to);
  if (nome.startsWith("justimon")) {
    return Object.assign({}, item, {
      category: "MEGA",
      subtype: "normal"
    });
  }
  return item;
}

function criarResultadoMutantDigivolution(item, probabilidade) {
  const anterior = (item.from || [])[0];
  return {
    name: "Mutant",
    to: "mutant",
    icon: anterior && typeof anterior !== "string" ? anterior.icon : "",
    probability: formatarProbabilidadeDigivolution(probabilidade),
    originalId: "",
    mutant: true
  };
}

function criarGrupoComMutantDigivolution(item, chanceMutant) {
  return Object.assign({}, item, {
    id: `mutant-${normalizarChaveDigivolution(item.id || item.to)}-${normalizarChaveDigivolution(item.requirementOwner)}`,
    grouped: true,
    outcomes: [{
      name: item.displayName || item.to,
      to: item.to,
      icon: item.targetIcon,
      probability: formatarProbabilidadeDigivolution(numeroProbabilidadeDigivolution(item.probability)),
      originalId: item.id,
      mutant: false
    }, criarResultadoMutantDigivolution(item, chanceMutant)],
    displayName: "POSSÍVEIS EVOLUÇÕES",
    probability: "100%"
  });
}

function agruparDigivolutions(dados) {
  const grupos = new Map();
  const saida = [];

  dados.map(normalizarClassificacaoDigivolution).forEach(function(item) {
    const categoria = String(item.category || "").toUpperCase();
    const chance = numeroProbabilidadeDigivolution(item.probability);

    if (categoria === "JOGRESS" && chance > 0 && chance < 100) {
      saida.push(criarGrupoComMutantDigivolution(item, 100 - chance));
      return;
    }

    if (!categoriaNormalDigivolution(item)) {
      if (Math.abs(chance - 95) < 0.001) {
        saida.push(criarGrupoComMutantDigivolution(item, 5));
        return;
      }
      saida.push(item);
      return;
    }
    const assinatura = assinaturaRequisitosDigivolution(item);
    if (!grupos.has(assinatura)) grupos.set(assinatura, []);
    grupos.get(assinatura).push(item);
  });

  grupos.forEach(function(itens) {
    if (itens.length < 2) {
      const unico = itens[0];
      const chance = numeroProbabilidadeDigivolution(unico.probability);
      saida.push(Math.abs(chance - 95) < 0.001
        ? criarGrupoComMutantDigivolution(unico, 5)
        : unico);
      return;
    }

    const base = itens[0];
    const somaInformada = itens.reduce(function(total, item) {
      return total + numeroProbabilidadeDigivolution(item.probability);
    }, 0);
    const fator = somaInformada > 0 ? 95 / somaInformada : 1;
    const resultados = itens.map(function(item) {
      return {
        name: item.displayName || item.to,
        to: item.to,
        icon: item.targetIcon,
        probability: formatarProbabilidadeDigivolution(numeroProbabilidadeDigivolution(item.probability) * fator),
        originalId: item.id,
        mutant: false
      };
    });
    resultados.push(criarResultadoMutantDigivolution(base, 5));

    saida.push(Object.assign({}, base, {
      id: `grupo-${normalizarChaveDigivolution(base.requirementOwner)}-${normalizarChaveDigivolution(base.id)}`,
      grouped: true,
      outcomes: resultados,
      displayName: "POSSÍVEIS EVOLUÇÕES",
      probability: "100%"
    }));
  });

  return saida;
}

function renderizarResultadosDigivolution(item) {
  return (item.outcomes || []).map(function(resultado) {
    return `
      <div class="digivolution-outcome${resultado.mutant ? " is-mutant" : ""}">
        ${renderizarAvatarDigivolution(resultado.name, "digivolution-outcome-icon", resultado.icon)}
        <span><strong>${escaparHtml(resultado.name)}</strong><small>PROBABILIDADE: ${escaparHtml(resultado.probability)}</small></span>
      </div>
    `;
  }).join("");
}

function criarCardDigivolution(item) {
  const anteriores = (item.from || []).map(function(entrada) {
    const anterior = typeof entrada === "string" ? { name: entrada, icon: "" } : entrada;
    return `<div class="digivolution-from">${renderizarAvatarDigivolution(anterior.name, "digivolution-from-icon", anterior.icon)}<strong>${escaparHtml(anterior.name)}</strong></div>`;
  }).join("");
  const podeCalcular = digivolutionTemPotential(item);
  const categoriaVisivel = String(item.category || "").toUpperCase() === "MEGA" ? "NORMAL" : (item.category || "NORMAL");

  return `
    <article class="digivolution-card">
      ${item.grouped ? `
        <div class="digivolution-group-heading">
          <div class="digivolution-tags"><span>${escaparHtml(item.stage || "-")}</span><span>${escaparHtml(categoriaVisivel)}</span></div>
          <h3>POSSÍVEIS EVOLUÇÕES</h3>
        </div>
        <div class="digivolution-outcomes">${renderizarResultadosDigivolution(item)}</div>
      ` : `
        <div class="digivolution-card-top">
          ${renderizarAvatarDigivolution(item.displayName || item.to, "digivolution-target-icon", item.targetIcon)}
          <div class="digivolution-target-copy">
            <div class="digivolution-tags"><span>${escaparHtml(item.stage || "-")}</span><span>${escaparHtml(categoriaVisivel)}</span></div>
            <h3>${escaparHtml(item.displayName || item.to)}</h3>
            <small>PROBABILIDADE: ${escaparHtml(item.probability || "-")}</small>
          </div>
        </div>
      `}

      <div class="digivolution-section-label">EVOLVES FROM</div>
      <div class="digivolution-from-list">${anteriores || "-"}</div>

      <div class="digivolution-section-label">EVOLUTION REQUIREMENTS — ${escaparHtml(item.requirementOwner || "")}</div>
      <div class="digivolution-requirements">${renderizarRequisitosDigivolution(item)}</div>
      <div class="digivolution-items">${renderizarItensDigivolution(item)}</div>

      <div class="digivolution-card-actions">
        <button type="button" ${podeCalcular ? `onclick="abrirPotentialModal('${escaparHtml(item.id)}')"` : "disabled"}>
          ${podeCalcular ? "MOSTRAR POTENCIAL" : "PERCENTUAIS EM VALIDAÇÃO"}
        </button>
      </div>
    </article>
  `;
}

function filtrarDigivolutions() {
  const originais = Array.isArray(window.HG_DIGIVOLUTIONS) ? window.HG_DIGIVOLUTIONS : [];
  const dados = agruparDigivolutions(originais);
  const busca = String((document.getElementById("digivolutionBusca") || {}).value || "").trim().toLowerCase();
  const category = String((document.getElementById("digivolutionCategory") || {}).value || "").toUpperCase();
  const tipo = String((document.getElementById("digivolutionRequirement") || {}).value || "").toUpperCase();

  const filtrados = dados.filter(function(item) {
    const anteriores = (item.from || []).map(function(entrada) { return typeof entrada === "string" ? entrada : entrada.name; });
    const resultados = (item.outcomes || []).map(function(resultado) { return resultado.name; });
    const texto = [item.to, item.displayName, item.requirementOwner].concat(anteriores, resultados).join(" ").toLowerCase();
    const req = item.requirements || {};
    const buscaOk = !busca || texto.includes(busca);
    const stageOk = String(item.stage || "").toUpperCase() === "MEGA";
    const categoryOk = !category || String(item.category || "").toUpperCase() === category;
    let requisitoOk = true;
    if (tipo === "STATUS") requisitoOk = digivolutionTemStatus(item);
    if (tipo === "ITEM") requisitoOk = Array.isArray(req.items) && req.items.length > 0;
    if (tipo === "BOND") requisitoOk = req.bond != null;
    return buscaOk && stageOk && categoryOk && requisitoOk;
  });

  const lista = document.getElementById("digivolutionLista");
  const resumo = document.getElementById("digivolutionResumo");
  if (resumo) resumo.textContent = `${filtrados.length} EVOLUÇÃO${filtrados.length === 1 ? "" : "ÕES"} ENCONTRADA${filtrados.length === 1 ? "" : "S"}`;
  if (lista) lista.innerHTML = filtrados.length ? filtrados.map(criarCardDigivolution).join("") : `<div class="digivolution-empty">Nenhuma evolução encontrada.</div>`;
}

function limparFiltrosDigivolution() {
  ["digivolutionBusca", "digivolutionCategory", "digivolutionRequirement"].forEach(function(id) {
    const campo = document.getElementById(id);
    if (campo) campo.value = "";
  });
  filtrarDigivolutions();
}

function inicializarDigivolution() {
  POTENTIAL_STATS.forEach(function(stat) { babyCorrections[stat] = 0; });
  filtrarDigivolutions();
  const modal = document.getElementById("potentialModal");
  if (modal) modal.addEventListener("click", function(evento) {
    if (evento.target === modal) fecharPotentialModal();
  });
}

function carregarDigivolutions() {
  const lista = document.getElementById("digivolutionLista");
  const resumo = document.getElementById("digivolutionResumo");

  if (resumo) resumo.textContent = "CARREGANDO EVOLUÇÕES...";
  if (lista) lista.innerHTML = `<div class="digivolution-empty">Carregando database de Digivolutions...</div>`;

  return chamarApiJsonp("digivolutions")
    .then(function(resposta) {
      window.HG_DIGIVOLUTIONS = Array.isArray(resposta.digivolutions)
        ? resposta.digivolutions
        : [];
      filtrarDigivolutions();
    })
    .catch(function(erro) {
      window.HG_DIGIVOLUTIONS = [];
      if (resumo) resumo.textContent = "NÃO FOI POSSÍVEL CARREGAR AS EVOLUÇÕES";
      if (lista) {
        lista.innerHTML = `<div class="digivolution-empty">Erro ao carregar Digivolutions. ${escaparHtml(erro.message || erro)}</div>`;
      }
    });
}

function abrirPotentialModal(id) {
  const originais = Array.isArray(window.HG_DIGIVOLUTIONS) ? window.HG_DIGIVOLUTIONS : [];
  const dados = agruparDigivolutions(originais);
  digivolutionAtual = dados.find(function(item) { return item.id === id; }) || null;
  if (!digivolutionAtual) return;
  POTENTIAL_STATS.forEach(function(stat) { babyCorrections[stat] = 0; });

  const modal = document.getElementById("potentialModal");
  const titulo = document.getElementById("potentialTitle");
  const subtitulo = document.getElementById("potentialSubtitle");
  const campos = document.getElementById("babyCorrectionFields");
  if (titulo) titulo.textContent = `PLANO DE POTENCIAL — ${digivolutionAtual.displayName || digivolutionAtual.to}`;
  if (subtitulo) subtitulo.textContent = `${digivolutionAtual.requirementOwner || "DIGIMON ANTERIOR"} // LEVEL ${digivolutionAtual.requirements.level || "-"} // CADA CUBO: ${digivolutionAtual.cubePercent || 4}%`;
  if (campos) campos.innerHTML = POTENTIAL_STATS.map(function(stat) {
    return `<label><span>${stat}</span><span class="baby-stepper"><input id="baby-${stat}" type="number" min="0" max="14" step="1" value="0" inputmode="numeric" oninput="alterarBabyCorrection('${stat}', this)"><span class="baby-stepper-buttons"><button type="button" onclick="ajustarBabyCorrection('${stat}', 1)" aria-label="Aumentar ${stat}">▲</button><button type="button" onclick="ajustarBabyCorrection('${stat}', -1)" aria-label="Diminuir ${stat}">▼</button></span></span><small>%</small></label>`;
  }).join("");

  modal.classList.add("ativo");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  atualizarPotentialPlanner();
}

function fecharPotentialModal() {
  const modal = document.getElementById("potentialModal");
  if (modal) {
    modal.classList.remove("ativo");
    modal.setAttribute("aria-hidden", "true");
  }
  document.body.classList.remove("modal-open");
}

function alterarBabyCorrection(stat, input) {
  const anterior = Number(babyCorrections[stat]) || 0;
  let valor = Number(String(input.value || "0").replace(",", "."));
  if (!Number.isFinite(valor)) valor = 0;
  valor = Math.round(Math.max(0, Math.min(14, valor)));
  const totalSemAtual = POTENTIAL_STATS.reduce(function(total, nome) {
    return total + (nome === stat ? 0 : (Number(babyCorrections[nome]) || 0));
  }, 0);
  valor = Math.floor(Math.min(valor, Math.max(0, 28 - totalSemAtual)));
  babyCorrections[stat] = valor;
  if (Number(input.value) !== valor || anterior !== valor) input.value = valor;
  atualizarPotentialPlanner();
}

function ajustarBabyCorrection(stat, delta) {
  const input = document.getElementById(`baby-${stat}`);
  if (!input) return;
  input.value = (Number(babyCorrections[stat]) || 0) + Number(delta || 0);
  alterarBabyCorrection(stat, input);
}

function atualizarPotentialPlanner() {
  if (!digivolutionAtual) return;
  const stats = digivolutionAtual.requirements.stats || {};
  const cubo = Number(digivolutionAtual.cubePercent) || 4;
  const totalBaby = POTENTIAL_STATS.reduce(function(total, stat) { return total + (Number(babyCorrections[stat]) || 0); }, 0);
  const totalEl = document.getElementById("babyCorrectionTotal");
  const track = document.getElementById("babyCorrectionTrack");
  const message = document.getElementById("babyCorrectionMessage");
  if (totalEl) totalEl.textContent = `${totalBaby.toFixed(1).replace(".0", "")}% / 28%`;
  if (track) track.style.width = `${Math.min(100, totalBaby / 28 * 100)}%`;
  if (message) message.textContent = `${Math.max(0, 28 - totalBaby).toFixed(1).replace(".0", "")}% DE BABY CORRECTION DISPONÍVEL`;

  const requisitos = [];
  const blocos = [];
  Object.keys(stats).forEach(function(stat) {
    const info = stats[stat] || {};
    if (!Number.isFinite(Number(info.percent))) return;
    const necessario = Number(info.percent);
    const baby = Number(babyCorrections[stat]) || 0;
    const restante = Math.max(0, necessario - baby);
    const quantidade = Math.ceil(restante / cubo - 1e-9);
    const potencial = restante;
    requisitos.push(`<div><span><b>${stat}</b><small>${info.value || "-"} (+${necessario}%)</small></span><strong>${baby}% BABY + ${potencial}% POTENTIAL</strong></div>`);
    for (let i = 0; i < quantidade; i += 1) {
      const valorDoCubo = Math.min(cubo, restante - (i * cubo));
      blocos.push({ stat: stat, valor: Number(valorDoCubo.toFixed(10)) });
    }
  });

  const reqEl = document.getElementById("potentialRequirements");
  const board = document.getElementById("potentialBoard");
  const cubeTotal = document.getElementById("potentialCubeTotal");
  const result = document.getElementById("potentialResult");
  if (reqEl) reqEl.innerHTML = requisitos.join("") || `<div class="potential-unavailable">Percentuais ainda não validados.</div>`;
  if (board) board.innerHTML = blocos.map(function(bloco) {
    return `<div class="potential-cube" style="--cube-color:${POTENTIAL_COLORS[bloco.stat] || "#46dfff"}"><strong>${bloco.stat}</strong><span>${bloco.valor}%</span></div>`;
  }).join("") || `<div class="potential-board-empty">NENHUM CUBO NECESSÁRIO</div>`;
  if (board) board.style.setProperty("--tetris-rows", Math.max(1, Math.ceil(blocos.length / 4)));
  if (cubeTotal) cubeTotal.textContent = `${blocos.length} CUBO${blocos.length === 1 ? "" : "S"}`;
  if (result) result.textContent = blocos.length > 20 ? "ATENÇÃO: A CONFIGURAÇÃO ULTRAPASSA 20 ESPAÇOS DE POTENCIAL." : `${20 - blocos.length} DE 20 ESPAÇOS LIVRES.`;
  if (board) board.classList.toggle("potential-overflow", blocos.length > 20);
}


/* =====================================================
   RAID BOSS — AGENDA KST
===================================================== */

const RAID_DAY_MS = 24 * 60 * 60 * 1000;
const RAID_KST_OFFSET = 9 * 60 * 60 * 1000;

let raidConfigAtual = {
  name: "Kimeramon",
  cycleStart: "2026-08-13",
  baseTime: "19:00",
  increment: 25,
  cycleDays: 14,
  map: "Desert Area",
  iconFile: "rotation_boss.webp",
  mapFile: "rotation_boss_map.png",
  spots: [],
  level: 101,
  attribute: "DATA",
  hp: 4873672
};

let raidEventosAtuais = [];
let raidNotificados = {};
let raidTimerInterval = null;

let RAID_SCHEDULE = [
  { name: "Pumpkinmon", gameName: "PUMPKINMON", level: 91, attribute: "DATA", hp: 2481551, gameLocation: "Shibuya", icon: "pumpmon.webp", map: "Shibuya", mapFile: "shibuya.webp", type: "daily", time: "19:30", spots: [{ x: 26.428, y: 90.168 }, { x: 87.804, y: 68.24 }, { x: 27.76, y: 8.012 }, { x: 19.524, y: 60.128 }, { x: 62.048, y: 77.36 }] },
  { name: "Gotsumon", gameName: "MUTATIONGOTSUMON", level: 91, attribute: "DATA", hp: 2271328, gameLocation: "Shibuya", icon: "", map: "Shibuya", mapFile: "shibuya.webp", type: "daily", time: "21:30", spots: [{ x: 27.66, y: 87.516 }, { x: 63.016, y: 79.328 }, { x: 68.484, y: 8.48 }, { x: 89.244, y: 70.004 }, { x: 33.156, y: 10.22 }] },
  { name: "BlackSeraphimon", gameName: "BLACKSERAPHIMON", level: 100, attribute: "VIRUS", hp: 4513252, gameLocation: "???", icon: "blackseraphimon.webp", map: "Spiral Mountain — Apocalymon Area", mapFile: "apocalymon_area.webp", type: "biweekly", time: "23:00", baseDate: "2025-05-31", spots: [{ x: 43.015, y: 54.66 }] },
  { name: "Ophanimon: Fallen Mode", gameName: "OPHANIMON:FALLDOWNMODE", level: 100, attribute: "VACCINE", hp: 5014724, gameLocation: "???", icon: "ophanimon_falldown_mode.webp", map: "Spiral Mountain — Apocalymon Area", mapFile: "apocalymon_area.webp", type: "biweekly", time: "23:00", baseDate: "2025-06-07", spots: [{ x: 40.565, y: 44.405 }] },
  { name: "Megidramon", gameName: "MEGIDRAMON", level: 100, attribute: "VIRUS", hp: 5050544, gameLocation: "???", icon: "megidramon.webp", map: "Spiral Mountain — Apocalymon Area", mapFile: "apocalymon_area.webp", type: "biweekly", time: "22:00", baseDate: "2025-06-08", spots: [{ x: 42.395, y: 47.945 }] },
  { name: "Omnimon", gameName: "OMNIMON", level: 100, attribute: "VACCINE", hp: 7465767, gameLocation: "Dark Castle Valley", icon: "omegamon.png", map: "Dark Castle Valley", mapFile: "dark_castle_valley.webp", type: "biweekly", time: "22:00", baseDate: "2025-06-01", spots: [{ x: 68.9364, y: 15.3455 }] },
  { name: "Zhuqiaomon", gameName: "ZHUQIAOMON", level: 100, attribute: "VIRUS", hp: 4656529, gameLocation: "Gear Savannah", icon: "zhuqiaomon.webp", map: "Gear Savannah", mapFile: "gear_savanna.webp", type: "weekly", time: "22:00", days: [2], spots: [{ x: 76.3314, y: 68.5859 }, { x: 65.3514, y: 72.1425 }] },
  { name: "Ebonwumon", gameName: "EBONWUMON", level: 100, attribute: "VACCINE", hp: 4656529, gameLocation: "Dragon's Eye Lake", icon: "ebonwumon.webp", map: "Dragon's Eye Lake", mapFile: "dragons_eye_lake.webp", type: "weekly", time: "22:00", days: [3], spots: [{ x: 43.35, y: 60.9214 }, { x: 44.0643, y: 86.7786 }] },
  { name: "Azulongmon", gameName: "AZULONGMON", level: 100, attribute: "DATA", hp: 4656529, gameLocation: "Dark Castle Valley", icon: "qinglongmon.webp", map: "Dark Castle Valley", mapFile: "dark_castle_valley.webp", type: "weekly", time: "22:00", days: [4], spots: [{ x: 36.2909, y: 30.3545 }, { x: 32.4091, y: 40.4364 }] },
  { name: "Baihumon", gameName: "BAIHUMON", level: 100, attribute: "DATA", hp: 4656529, gameLocation: "Desert Area", icon: "baihumon.webp", map: "Desert Area", mapFile: "desert_area.webp", type: "weekly", time: "22:00", days: [5], spots: [{ x: 50.9849, y: 42.3209 }, { x: 45.3686, y: 26.3093 }] },
  { name: "Examon", gameName: "EXAMON", level: 100, attribute: "DATA", hp: 5723587, gameLocation: "Dark Castle Valley", icon: "examon.webp", map: "Dark Castle Valley", mapFile: "dark_castle_valley.webp", type: "biweekly", time: "00:30", baseDate: "2026-04-26", spots: [{ x: 29.4182, y: 14.6182 }] },
  { name: "Kingdrasil_7D6", gameName: "YGGDRASIL_7D6", level: 100, attribute: "UNKNOWN", hp: 99999999, gameLocation: "Infinite Mountain", icon: "yggdrasill_7d6.webp", map: "Infinite Mountain", mapFile: "infinite_mountain.webp", type: "custom", spots: [{ x: 19.6574, y: 50.8294 }], schedules: [
    { day: 5, time: "21:00" }, { day: 6, time: "09:00" }, { day: 6, time: "21:00" },
    { day: 0, time: "09:00" }, { day: 0, time: "21:00" }, { day: 1, time: "09:00" }
  ] }
];

function raidKstDate(dateString, timeString) {
  return new Date(dateString + "T" + timeString + ":00+09:00");
}

function raidKstParts(date) {
  const kst = new Date(date.getTime() + RAID_KST_OFFSET);
  return {
    year: kst.getUTCFullYear(),
    month: kst.getUTCMonth() + 1,
    date: kst.getUTCDate(),
    day: kst.getUTCDay(),
    hour: kst.getUTCHours(),
    minute: kst.getUTCMinutes(),
    second: kst.getUTCSeconds()
  };
}

function raidDateString(date) {
  const p = raidKstParts(date);
  return p.year + "-" + String(p.month).padStart(2, "0") + "-" + String(p.date).padStart(2, "0");
}

function proximoRaidFixo(raid, agora) {
  if (raid.type === "daily") {
    let alvo = raidKstDate(raidDateString(agora), raid.time);
    if (alvo <= agora) alvo = new Date(alvo.getTime() + RAID_DAY_MS);
    return alvo;
  }

  if (raid.type === "weekly") {
    for (let i = 0; i < 14; i++) {
      const dia = new Date(agora.getTime() + i * RAID_DAY_MS);
      const alvo = raidKstDate(raidDateString(dia), raid.time);
      if (raid.days.includes(raidKstParts(alvo).day) && alvo > agora) return alvo;
    }
  }

  if (raid.type === "biweekly") {
    const base = raidKstDate(raid.baseDate, raid.time);
    const ciclo = 14 * RAID_DAY_MS;
    let saltos = Math.floor((agora.getTime() - base.getTime()) / ciclo);
    if (saltos < 0) saltos = 0;
    let alvo = new Date(base.getTime() + saltos * ciclo);
    if (alvo <= agora) alvo = new Date(alvo.getTime() + ciclo);
    return alvo;
  }

  if (raid.type === "custom") {
    let melhor = null;
    raid.schedules.forEach(function(item) {
      const candidato = proximoRaidFixo({ type: "weekly", time: item.time, days: [item.day] }, agora);
      if (!melhor || candidato < melhor) melhor = candidato;
    });
    return melhor;
  }

  return null;
}

function proximoBossRotativo(agora) {
  const cfg = raidConfigAtual;
  const cicloDias = Math.max(1, Number(cfg.cycleDays) || 14);
  const incremento = Number(cfg.increment) || 0;
  const base = raidKstDate(cfg.cycleStart, cfg.baseTime);
  const cicloMs = cicloDias * RAID_DAY_MS;
  let ciclo = Math.floor((agora.getTime() - base.getTime()) / cicloMs);
  if (ciclo < 0) ciclo = 0;

  for (let tentativa = 0; tentativa < 2; tentativa++) {
    const inicio = new Date(base.getTime() + (ciclo + tentativa) * cicloMs);
    for (let dia = 0; dia < cicloDias; dia++) {
      const alvo = new Date(inicio.getTime() + dia * RAID_DAY_MS + dia * incremento * 60000);
      if (alvo > agora) return alvo;
    }
  }

  return new Date(base.getTime() + (ciclo + 1) * cicloMs);
}

function montarEventosRaid() {
  const agora = new Date();
  const eventos = RAID_SCHEDULE.map(function(raid) {
    return Object.assign({}, raid, {
      nextTime: proximoRaidFixo(raid, agora),
      iconPath: resolverIconeRaid(raid),
      mapPath: raid.mapUrl || (raid.mapFile ? "raid_assets/maps/" + raid.mapFile : "")
    });
  });

  eventos.push({
    name: raidConfigAtual.name || "Boss de Rotação",
    map: raidConfigAtual.map || "-",
    nextTime: proximoBossRotativo(agora),
    iconPath: raidConfigAtual.iconUrl || ("raid_assets/icons/" + (raidConfigAtual.iconFile || "rotation_boss.webp")),
    mapPath: raidConfigAtual.mapUrl || ("raid_assets/maps/" + (raidConfigAtual.mapFile || "rotation_boss_map.png")),
    spots: raidConfigAtual.spots || [],
    gameName: String(raidConfigAtual.name || "Boss de Rotação").toUpperCase(),
    level: raidConfigAtual.level,
    attribute: raidConfigAtual.attribute,
    hp: raidConfigAtual.hp,
    gameLocation: raidConfigAtual.map || "-",
    rotation: true
  });

  eventos.sort(function(a, b) { return a.nextTime - b.nextTime; });
  raidEventosAtuais = eventos;
}

function normalizarNomeRaidParaIcone(valor) {
  return normalizarChaveDigivolution(valor)
    .replace(/^(mutation|mutant)+/, "");
}

function resolverIconeRaid(raid) {
  const nomeNormalizado = normalizarNomeRaidParaIcone(raid.gameName || raid.name);
  const digi = (database || []).find(function(item) {
    return normalizarNomeRaidParaIcone(item.digimon) === nomeNormalizado;
  });
  if (digi && digi.icon) return digi.icon;
  const drive = pegarImagem(nomeNormalizado) || pegarImagem(raid.name);
  if (drive) return drive;
  if (raid.iconUrl) return raid.iconUrl;
  if (raid.icon) return "raid_assets/icons/" + raid.icon;
  return "icon_raid.png";
}

function formatarRaidContagem(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const dias = Math.floor(total / 86400);
  const horas = Math.floor((total % 86400) / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const segundos = total % 60;
  return (dias ? dias + "d " : "") + String(horas).padStart(2, "0") + ":" + String(minutos).padStart(2, "0") + ":" + String(segundos).padStart(2, "0");
}

function formatarRaidKst(date) {
  const p = raidKstParts(date);
  return String(p.date).padStart(2, "0") + "/" + String(p.month).padStart(2, "0") + " " + String(p.hour).padStart(2, "0") + ":" + String(p.minute).padStart(2, "0") + " KST";
}

function formatarRaidHp(valor) {
  const numero = Number(String(valor || "").replace(/[^0-9]/g, ""));
  return Number.isFinite(numero) && numero > 0
    ? numero.toLocaleString("pt-BR")
    : "-";
}

function renderizarRaidTooltip(raid) {
  if (!raid.level && !raid.hp && !raid.attribute) return "";
  const atributo = String(raid.attribute || "UNKNOWN").toUpperCase();
  return `
    <div class="raid-boss-tooltip" role="tooltip">
      <div><span>Level:</span><strong>${escaparHtml(raid.level || "-")}</strong></div>
      <div><span>Name:</span><strong>${escaparHtml(raid.gameName || raid.name)}</strong></div>
      <div class="raid-tooltip-attribute"><span>Attribute:</span>${renderizarTypeIcon(atributo, true)}</div>
      <div><span>HP:</span><strong>${formatarRaidHp(raid.hp)}</strong></div>
      <div><span>Implementation Location:</span><strong>${escaparHtml(raid.gameLocation || raid.map || "-")}</strong></div>
    </div>
  `;
}

function renderizarRaids() {
  const lista = document.getElementById("raidList");
  if (!lista) return;
  montarEventosRaid();
  lista.innerHTML = raidEventosAtuais.map(function(raid, indice) {
    return `
      <article class="raid-card ${indice === 0 ? "raid-next" : ""}" data-raid-index="${indice}">
        <div class="raid-card-icon" tabindex="0" aria-label="Informações de ${escaparHtml(raid.name)}">
          <img src="${raid.iconPath}" alt="${escaparHtml(raid.name)}">
          ${renderizarRaidTooltip(raid)}
        </div>
        <div class="raid-card-main">
          <div class="raid-card-top">
            <h3>${escaparHtml(raid.name)}${raid.rotation ? '<span class="raid-rotation-tag">ROTAÇÃO</span>' : ""}</h3>
            <span class="raid-kst-time">${formatarRaidKst(raid.nextTime)}</span>
          </div>
          <button class="raid-map-link" type="button" onclick="abrirMapaRaid(${indice})">${escaparHtml(raid.map || "Mapa indisponível")} <span>⌖</span></button>
          <div class="raid-countdown" id="raidCountdown${indice}">${formatarRaidContagem(raid.nextTime - new Date())}</div>
        </div>
      </article>
    `;
  }).join("");
}

function atualizarRaidTimers() {
  const agora = new Date();
  const clock = document.getElementById("raidKstClock");
  if (clock) {
    const p = raidKstParts(agora);
    clock.textContent = String(p.date).padStart(2, "0") + "/" + String(p.month).padStart(2, "0") + "/" + p.year + " " + String(p.hour).padStart(2, "0") + ":" + String(p.minute).padStart(2, "0") + ":" + String(p.second).padStart(2, "0");
  }

  let precisaRenderizar = false;
  raidEventosAtuais.forEach(function(raid, indice) {
    const diff = raid.nextTime - agora;
    const contador = document.getElementById("raidCountdown" + indice);
    if (contador) {
      contador.textContent = formatarRaidContagem(diff);
      contador.classList.toggle("raid-soon", diff > 0 && diff <= 5 * 60000);
    }
    if (diff <= 0) precisaRenderizar = true;
    verificarRaidAlerta(raid, diff);
  });

  if (precisaRenderizar) renderizarRaids();
}

function verificarRaidAlerta(raid, diff) {
  const toggle = document.getElementById("raidAlarmToggle");
  const input = document.getElementById("raidNoticeMinutes");
  const minutos = Math.min(60, Math.max(1, Number(input && input.value) || 5));
  const chave = raid.name + "_" + raid.nextTime.getTime();
  if (!toggle || !toggle.checked || diff <= 0 || diff > minutos * 60000 || raidNotificados[chave]) return;

  raidNotificados[chave] = true;
  tocarAlarmeRaid();
  const alerta = document.getElementById("raidAlert");
  const icon = document.getElementById("raidAlertIcon");
  const titulo = document.getElementById("raidAlertTitle");
  const texto = document.getElementById("raidAlertText");
  if (alerta && icon && titulo && texto) {
    icon.src = raid.iconPath;
    titulo.textContent = raid.name;
    texto.textContent = "Nasce em " + formatarRaidContagem(diff) + " — " + raid.map;
    alerta.classList.add("ativo");
  }

  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("Holy Guardians — Raid Boss", { body: raid.name + " nasce em " + minutos + " minutos — " + raid.map, icon: raid.iconPath });
  }
}

function tocarAlarmeRaid() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const ganho = ctx.createGain();
    osc.frequency.value = 880;
    ganho.gain.setValueAtTime(0.18, ctx.currentTime);
    ganho.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.connect(ganho); ganho.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.8);
  } catch (erro) {}
}

function fecharRaidAlerta() {
  const alerta = document.getElementById("raidAlert");
  if (alerta) alerta.classList.remove("ativo");
}

function abrirMapaRaid(indice) {
  const raid = raidEventosAtuais[indice];
  const modal = document.getElementById("raidMapModal");
  const imagem = document.getElementById("raidMapImage");
  const titulo = document.getElementById("raidMapTitle");
  const spots = document.getElementById("raidMapSpots");
  if (!raid || !modal || !imagem || !titulo || !spots || !raid.mapPath) return;

  titulo.textContent = raid.name + " — " + raid.map;
  imagem.src = raid.mapPath;
  spots.innerHTML = (raid.spots || []).map(function(spot) {
    return `<span class="raid-map-spot" style="left:${Number(spot.x)}%;top:${Number(spot.y)}%" title="Possível ponto de nascimento"><img src="raid_marker.png" alt="" aria-hidden="true"></span>`;
  }).join("");
  modal.classList.add("ativo");
  modal.setAttribute("aria-hidden", "false");
}

function fecharMapaRaid() {
  const modal = document.getElementById("raidMapModal");
  if (modal) { modal.classList.remove("ativo"); modal.setAttribute("aria-hidden", "true"); }
}

function parseRaidSpots(valor) {
  if (Array.isArray(valor)) return valor;
  return String(valor || "").split(";").map(function(par) {
    const partes = par.trim().split(",").map(Number);
    return partes.length === 2 && partes.every(Number.isFinite) ? { x: partes[0], y: partes[1] } : null;
  }).filter(Boolean);
}

function aplicarRaidConfigBruto(bruto) {
  if (Array.isArray(bruto)) bruto = bruto[0];
  if (!bruto || typeof bruto !== "object") return false;
  function campo() {
    for (let i = 0; i < arguments.length; i++) if (bruto[arguments[i]] !== undefined && bruto[arguments[i]] !== "") return bruto[arguments[i]];
    return undefined;
  }
  raidConfigAtual = {
    name: campo("name", "NAME") || raidConfigAtual.name,
    cycleStart: campo("cycleStart", "CYCLE START", "cycle_start") || raidConfigAtual.cycleStart,
    baseTime: campo("baseTime", "BASE TIME", "base_time") || raidConfigAtual.baseTime,
    increment: Number(campo("increment", "INCREMENT")) || raidConfigAtual.increment,
    cycleDays: Number(campo("cycleDays", "CYCLE DAYS", "cycle_days")) || raidConfigAtual.cycleDays,
    map: campo("map", "MAP") || raidConfigAtual.map,
    iconFile: campo("iconFile", "ICON FILE", "icon_file") || "rotation_boss.webp",
    iconUrl: campo("icon", "ICON", "iconUrl", "ICON URL", "icon_url") || "",
    mapFile: campo("mapFile", "MAP FILE", "map_file") || "rotation_boss_map.png",
    mapUrl: campo("mapUrl", "MAP URL", "map_url") || "",
    spots: parseRaidSpots(campo("spots", "SPOTS")),
    level: Number(campo("level", "LEVEL")) || raidConfigAtual.level,
    attribute: campo("attribute", "ATTRIBUTE") || raidConfigAtual.attribute,
    hp: Number(String(campo("hp", "HP") || "").replace(/[^0-9]/g, "")) || raidConfigAtual.hp
  };
  return true;
}

function aplicarRaidBossesBruto(bruto) {
  if (!Array.isArray(bruto)) return false;

  const agenda = bruto
    .filter(function(raid) {
      return raid && raid.enabled !== false && raid.name;
    })
    .map(function(raid) {
      return {
        name: raid.name,
        gameName: raid.gameName || String(raid.name).toUpperCase(),
        level: Number(raid.level) || 0,
        attribute: String(raid.attribute || "UNKNOWN").toUpperCase(),
        hp: Number(raid.hp) || 0,
        gameLocation: raid.location || raid.map || "-",
        icon: raid.iconFile || "",
        iconUrl: raid.icon || raid.iconUrl || "",
        map: raid.map || raid.location || "-",
        mapFile: raid.mapFile || "",
        mapUrl: raid.mapUrl || "",
        type: String(raid.type || "").toLowerCase(),
        time: raid.time || "",
        days: Array.isArray(raid.days) ? raid.days.map(Number) : [],
        baseDate: raid.baseDate || "",
        schedules: Array.isArray(raid.schedules) ? raid.schedules : [],
        spots: parseRaidSpots(raid.spots)
      };
    });

  RAID_SCHEDULE = agenda;
  return true;
}

function carregarDadosRaid() {
  return Promise.allSettled([
    chamarApiJsonp("raid-config"),
    chamarApiJsonp("raid-bosses")
  ]).then(function(resultados) {
    const config = resultados[0];
    const bosses = resultados[1];

    if (config.status === "fulfilled") {
      const respostaConfig = config.value;
      aplicarRaidConfigBruto(
        respostaConfig.raidConfig ||
        respostaConfig.config ||
        respostaConfig.data
      );
    }

    if (bosses.status === "fulfilled") {
      const respostaBosses = bosses.value;
      aplicarRaidBossesBruto(
        respostaBosses.raidBosses ||
        respostaBosses.bosses ||
        respostaBosses.data
      );
    }

    renderizarRaids();
  });
}

function inicializarRaidBoss() {
  const toggle = document.getElementById("raidAlarmToggle");
  const fechar = document.getElementById("raidMapClose");
  const modal = document.getElementById("raidMapModal");
  if (toggle) toggle.addEventListener("change", function() {
    if (this.checked && "Notification" in window && Notification.permission === "default") Notification.requestPermission();
  });
  if (fechar) fechar.addEventListener("click", fecharMapaRaid);
  if (modal) modal.addEventListener("click", function(evento) { if (evento.target === modal) fecharMapaRaid(); });
  carregarDadosRaid();
  if (raidTimerInterval) clearInterval(raidTimerInterval);
  raidTimerInterval = setInterval(atualizarRaidTimers, 1000);
  atualizarRaidTimers();
}


/* =====================================================
   DEKYU TREASURE
===================================================== */

let dekyuZonas = [];
let dekyuTimerInterval = null;

function obterProximoHorarioDekyu(agoraMs) {
  const agora = Number.isFinite(agoraMs) ? agoraMs : Date.now();
  const deslocamentoBrasilia = 3 * 60 * 60 * 1000;
  const agoraBrasilia = new Date(agora - deslocamentoBrasilia);
  const ano = agoraBrasilia.getUTCFullYear();
  const mes = agoraBrasilia.getUTCMonth();
  const dia = agoraBrasilia.getUTCDate();
  const horarios = [2, 8, 14, 20];

  for (const hora of horarios) {
    const candidato = Date.UTC(ano, mes, dia, hora, 0, 0) + deslocamentoBrasilia;
    if (candidato > agora) return { instante: candidato, hora: hora };
  }

  return {
    instante: Date.UTC(ano, mes, dia + 1, 2, 0, 0) + deslocamentoBrasilia,
    hora: 2
  };
}

function atualizarContadorDekyu() {
  const contador = document.getElementById("dekyuCountdown");
  const proximoHorario = document.getElementById("dekyuNextTime");
  if (!contador || !proximoHorario) return;

  const agora = Date.now();
  const proximo = obterProximoHorarioDekyu(agora);
  const restante = Math.max(0, proximo.instante - agora);
  const horas = Math.floor(restante / 3600000);
  const minutos = Math.floor((restante % 3600000) / 60000);
  const segundos = Math.floor((restante % 60000) / 1000);

  contador.textContent = [horas, minutos, segundos]
    .map(function(valor) { return String(valor).padStart(2, "0"); })
    .join(":");
  proximoHorario.textContent = String(proximo.hora).padStart(2, "0") + ":00";
}

function obterZonaDekyuSelecionada() {
  const select = document.getElementById("dekyuZone");
  const nome = String(select && select.value || "");
  return dekyuZonas.find(function(zona) { return zona.name === nome; }) || null;
}

function obterMapaDekyuSelecionado() {
  const zona = obterZonaDekyuSelecionada();
  const select = document.getElementById("dekyuMap");
  const nome = String(select && select.value || "");
  return zona && Array.isArray(zona.maps)
    ? zona.maps.find(function(mapa) { return mapa.name === nome; }) || null
    : null;
}

function alterarZonaDekyu(mapaPreferido) {
  const zona = obterZonaDekyuSelecionada();
  const selectMapa = document.getElementById("dekyuMap");
  if (!selectMapa) return;

  const mapas = zona && Array.isArray(zona.maps) ? zona.maps : [];
  selectMapa.innerHTML = mapas.map(function(mapa) {
    return `<option value="${escaparHtml(mapa.name)}">${escaparHtml(mapa.name)}</option>`;
  }).join("");

  const preferido = mapas.find(function(mapa) { return mapa.name === mapaPreferido; });
  if (preferido) selectMapa.value = preferido.name;

  renderizarMapaDekyu();
}

function renderizarMapaDekyu() {
  const zona = obterZonaDekyuSelecionada();
  const mapa = obterMapaDekyuSelecionado();
  const imagem = document.getElementById("dekyuMapImage");
  const spots = document.getElementById("dekyuSpots");
  const vazio = document.getElementById("dekyuEmpty");
  const titulo = document.getElementById("dekyuMapTitle");
  const zonaLabel = document.getElementById("dekyuZoneLabel");
  const status = document.getElementById("dekyuMapStatus");
  const contador = document.getElementById("dekyuCount");

  if (!imagem || !spots || !vazio) return;

  if (!zona || !mapa) {
    imagem.removeAttribute("src");
    spots.innerHTML = "";
    vazio.textContent = "Nenhum mapa disponível.";
    vazio.hidden = false;
    if (titulo) titulo.textContent = "Selecione um mapa";
    if (zonaLabel) zonaLabel.textContent = "ÁREA";
    if (status) status.textContent = "SEM DADOS";
    if (contador) contador.textContent = "0";
    return;
  }

  const localizacoes = Array.isArray(mapa.spots) ? mapa.spots : [];
  if (titulo) titulo.textContent = mapa.name;
  if (zonaLabel) zonaLabel.textContent = zona.name;
  if (status) status.textContent = `${localizacoes.length} PONTO${localizacoes.length === 1 ? "" : "S"} MAPEADO${localizacoes.length === 1 ? "" : "S"}`;
  if (contador) contador.textContent = String(localizacoes.length);

  spots.innerHTML = localizacoes.map(function(spot) {
    const x = Math.max(0, Math.min(100, Number(spot.x) || 0));
    const y = Math.max(0, Math.min(100, Number(spot.y) || 0));
    return `
      <span class="dekyu-spot"
        style="left:${x}%;top:${y}%"
        aria-hidden="true">
        <img src="dekyu_treasure.png" alt="" aria-hidden="true">
      </span>
    `;
  }).join("");

  if (!mapa.mapUrl) {
    imagem.removeAttribute("src");
    vazio.textContent = "O mapa ainda não foi encontrado na pasta DSR MAPS.";
    vazio.hidden = false;
    return;
  }

  vazio.textContent = "Carregando mapa...";
  vazio.hidden = false;
  imagem.onload = function() { vazio.hidden = true; };
  imagem.onerror = function() {
    vazio.textContent = "Não foi possível carregar este mapa.";
    vazio.hidden = false;
  };
  imagem.src = mapa.mapUrl;
}

function inicializarDekyuTreasure() {
  const selectZona = document.getElementById("dekyuZone");
  const selectMapa = document.getElementById("dekyuMap");
  const vazio = document.getElementById("dekyuEmpty");
  if (!selectZona || !selectMapa) return;

  atualizarContadorDekyu();
  if (dekyuTimerInterval) clearInterval(dekyuTimerInterval);
  dekyuTimerInterval = setInterval(atualizarContadorDekyu, 1000);

  chamarApiJsonp("dekyu-treasures")
    .then(function(resposta) {
      dekyuZonas = Array.isArray(resposta.dekyuTreasures)
        ? resposta.dekyuTreasures
        : [];

      selectZona.innerHTML = dekyuZonas.map(function(zona) {
        return `<option value="${escaparHtml(zona.name)}">${escaparHtml(zona.name)}</option>`;
      }).join("");

      const zonaInicial = dekyuZonas.find(function(zona) {
        return zona.name === "File Island";
      }) || dekyuZonas[0];

      if (zonaInicial) selectZona.value = zonaInicial.name;
      alterarZonaDekyu("Dragon's Eye Lake");
    })
    .catch(function(erro) {
      dekyuZonas = [];
      selectZona.innerHTML = `<option value="">Erro ao carregar áreas</option>`;
      selectMapa.innerHTML = `<option value="">Erro ao carregar mapas</option>`;
      if (vazio) {
        vazio.textContent = `Erro ao carregar Dekyu Treasure. ${erro.message || erro}`;
        vazio.hidden = false;
      }
    });
}

/* =====================================================
   CARREGAR DATABASE
===================================================== */

function carregarDatabase() {

  const loading =
    document.getElementById(
      "loading"
    );

  chamarApiJsonp("database")
    .then(
      function(resposta) {

        database =
          resposta.database ||
          [];

        if (loading) {
          loading.style.display =
            "none";
        }

        filtrar();
        filtrarDigivolutions();
        criarSlots();
        criarElementos();
        renderizarComparacao();
        inicializarCalculadora();
        renderizarStatusSimulator();
        renderizarRaids();

        // Se a URL for #digidex/<digimon>, restaura o perfil depois que os stats chegaram.
        abrirPaginaPelaUrl();

      }
    )
    .catch(
      function(erro) {

        if (!loading) {
          return;
        }

        loading.innerHTML = `
          <div class="erro">
            ❌ Erro ao carregar DATABASE.
            <br><br>
            ${
              erro.message ||
              erro
            }
          </div>
        `;

      }
    );

}


/* =====================================================
   HOME — HISTÓRIA E OFDS DIÁRIAS
===================================================== */

let historiaHomeIndice = 0;
let historiaHomeTimer = null;
let ofdHomeTimer = null;
let ofdAgendaHome = [];
let ofdDiaSelecionadoHome = "";

const OFD_DAY_CODES = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"];
const OFD_DAY_NAMES = {
  SEG: "SEGUNDA-FEIRA", TER: "TERÇA-FEIRA", QUA: "QUARTA-FEIRA",
  QUI: "QUINTA-FEIRA", SEX: "SEXTA-FEIRA", SAB: "SÁBADO", DOM: "DOMINGO"
};

const OFD_DAY_NEXT = {
  SEG: "TER", TER: "QUA", QUA: "QUI", QUI: "SEX",
  SEX: "SAB", SAB: "DOM", DOM: "SEG"
};

const OFD_HOME_FALLBACK = [
  { name: "Infinity Mountain", map: "Infinity Mountain", level: "41–60", ticket: "C", days: [3, 5, 0], order: 1 },
  { name: "Desert Area", map: "Desert Area", level: "55–75", ticket: "D", days: [2, 4, 6], order: 2 },
  { name: "Dark Castle Valley", map: "Dark Castle", level: "60–80", ticket: "E", days: [1, 5, 0], order: 3 },
  { name: "Real World", map: "World Expo Hall", level: "85–95", ticket: "F", days: [1, 3, 6], order: 4 },
  { name: "Sprial Mt.", map: "Spiral Mountain Top", level: "90–100", ticket: "G", days: [1, 4, 0], order: 5 },
  { name: "Data World", map: "Data Area", level: "95–103", ticket: "H", days: [2, 4, 6], order: 6 }
];

function atualizarHistoriaHome() {
  const cards = Array.from(document.querySelectorAll(".history-grid .history-card"));
  const dots = Array.from(document.querySelectorAll(".history-dots button"));
  if (!cards.length) return;
  historiaHomeIndice = (historiaHomeIndice + cards.length) % cards.length;
  cards.forEach(function(card, indice) {
    card.classList.toggle("ativo", indice === historiaHomeIndice);
    card.setAttribute("aria-hidden", indice === historiaHomeIndice ? "false" : "true");
  });
  dots.forEach(function(dot, indice) {
    dot.classList.toggle("ativo", indice === historiaHomeIndice);
    dot.setAttribute("aria-current", indice === historiaHomeIndice ? "true" : "false");
  });
}

function iniciarRotacaoHistoriaHome() {
  clearInterval(historiaHomeTimer);
  historiaHomeTimer = setInterval(function() {
    historiaHomeIndice += 1;
    atualizarHistoriaHome();
  }, 10000);
}

function mudarHistoria(direcao) {
  historiaHomeIndice += Number(direcao) || 0;
  atualizarHistoriaHome();
  iniciarRotacaoHistoriaHome();
}

function selecionarHistoria(indice) {
  historiaHomeIndice = Number(indice) || 0;
  atualizarHistoriaHome();
  iniciarRotacaoHistoriaHome();
}

function inicializarHistoriaHome() {
  const carrossel = document.querySelector(".history-carousel");
  if (!carrossel) return;
  atualizarHistoriaHome();
  iniciarRotacaoHistoriaHome();
  carrossel.addEventListener("mouseenter", function() { clearInterval(historiaHomeTimer); });
  carrossel.addEventListener("mouseleave", iniciarRotacaoHistoriaHome);
  carrossel.addEventListener("focusin", function() { clearInterval(historiaHomeTimer); });
  carrossel.addEventListener("focusout", iniciarRotacaoHistoriaHome);
}

function obterRelogioBrasilia() {
  const agora = new Date();
  const partes = {};
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(agora).forEach(function(parte) {
    if (parte.type !== "literal") partes[parte.type] = Number(parte.value);
  });

  let dataLogica = new Date(Date.UTC(partes.year, partes.month - 1, partes.day));
  if (partes.hour >= 12) dataLogica.setUTCDate(dataLogica.getUTCDate() + 1);
  let proximoReset = Date.UTC(partes.year, partes.month - 1, partes.day, 15, 0, 0);
  if (agora.getTime() >= proximoReset) proximoReset += 86400000;

  return {
    weekday: dataLogica.getUTCDay(),
    brazilWeekday: new Date(Date.UTC(partes.year, partes.month - 1, partes.day)).getUTCDay(),
    brazilDateLabel: new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo", weekday: "long", day: "2-digit", month: "2-digit"
    }).format(agora),
    kstDateLabel: new Intl.DateTimeFormat("pt-BR", {
      timeZone: "UTC", weekday: "long", day: "2-digit", month: "2-digit"
    }).format(dataLogica),
    nextReset: proximoReset
  };
}

function renderizarOfdsHome(ofds, diaBrasilTexto, diaKstTexto) {
  const lista = document.getElementById("ofdHomeList");
  const dia = document.getElementById("ofdHomeDay");
  const diaKst = document.getElementById("ofdHomeKstDay");
  if (dia) dia.textContent = String(diaBrasilTexto || "HOJE NO BRASIL").toUpperCase() + " • HORÁRIO DO BRASIL";
  if (diaKst) diaKst.textContent = String(diaKstTexto || "ROTAÇÃO KST").toUpperCase() + " • DISPONIBILIDADE KST";
  if (!lista) return;

  const validas = (Array.isArray(ofds) ? ofds : [])
    .filter(function(ofd) { return String(ofd.ticket || "").toUpperCase() !== "B"; })
    .sort(function(a, b) { return (Number(a.order) || 99) - (Number(b.order) || 99); });

  if (!validas.length) {
    lista.innerHTML = `<div class="ofd-home-empty">Nenhuma OFD disponível neste período.</div>`;
    return;
  }

  lista.innerHTML = validas.map(function(ofd) {
    const ticket = String(ofd.ticket || "-").toUpperCase();
    return `
      <article class="ofd-home-card">
        <div class="ofd-ticket-icon ticket-${escaparHtml(ticket.toLowerCase())}">
          ${ofd.icon
            ? `<img src="${escaparHtml(ofd.icon)}" alt="Passe ${escaparHtml(ticket)}" loading="lazy">`
            : `<span>${escaparHtml(ticket)}</span>`}
        </div>
        <div class="ofd-home-copy">
          <div class="ofd-location-line">
            <strong>${escaparHtml(ofd.name || "OFD")}</strong>
            ${ofd.map ? `<span>— ${escaparHtml(ofd.map)}</span>` : ""}
          </div>
          <small>NV ${escaparHtml(ofd.level || "-")} <b>•</b> TICKET ${escaparHtml(ticket)}</small>
        </div>
        <div class="ofd-home-open"><i></i> DISPONÍVEL</div>
      </article>
    `;
  }).join("");
}

function obterDiasCodigosOfdHome(ofd) {
  const dias = Array.isArray(ofd.days)
    ? ofd.days
    : String(ofd.days || "").split(/[,;|/\s]+/);
  return dias.map(function(dia) {
    return typeof dia === "number"
      ? OFD_DAY_CODES[dia]
      : String(dia || "").trim().toUpperCase().slice(0, 3);
  }).filter(Boolean);
}

function renderizarAgendaOfdHome() {
  const lista = document.getElementById("ofdWeekList");
  const titulo = document.getElementById("ofdWeekTitle");
  if (!lista) return;

  const codigoBrasil = ofdDiaSelecionadoHome || "SEG";
  const codigoKst = OFD_DAY_NEXT[codigoBrasil] || "TER";
  const itens = ofdAgendaHome.filter(function(ofd) {
    return String(ofd.ticket || "").toUpperCase() !== "B" &&
      obterDiasCodigosOfdHome(ofd).includes(codigoKst);
  }).sort(function(a, b) {
    return (Number(a.order) || 99) - (Number(b.order) || 99);
  });

  if (titulo) {
    titulo.innerHTML = `<strong>${escaparHtml(OFD_DAY_NAMES[codigoBrasil] || codigoBrasil)} • HORÁRIO DO BRASIL</strong><small>${escaparHtml(OFD_DAY_NAMES[codigoKst] || codigoKst)} • KST</small>`;
  }

  document.querySelectorAll(".ofd-week-days button").forEach(function(botao) {
    const ativo = botao.dataset.ofdDay === codigoBrasil;
    botao.classList.toggle("ativo", ativo);
    botao.setAttribute("aria-pressed", ativo ? "true" : "false");
  });

  lista.innerHTML = itens.length ? itens.map(function(ofd) {
    const ticket = String(ofd.ticket || "-").toUpperCase();
    return `
      <article class="ofd-week-card">
        <div class="ofd-ticket-icon ticket-${escaparHtml(ticket.toLowerCase())}">
          ${ofd.icon
            ? `<img src="${escaparHtml(ofd.icon)}" alt="Passe ${escaparHtml(ticket)}" loading="lazy">`
            : `<span>${escaparHtml(ticket)}</span>`}
        </div>
        <div class="ofd-home-copy">
          <div class="ofd-location-line">
            <strong>${escaparHtml(ofd.name || "OFD")}</strong>
            ${ofd.map ? `<span>— ${escaparHtml(ofd.map)}</span>` : ""}
          </div>
          <small>NV ${escaparHtml(ofd.level || "-")} <b>•</b> TICKET ${escaparHtml(ticket)}</small>
        </div>
      </article>
    `;
  }).join("") : `<div class="ofd-home-empty">Nenhuma OFD disponível neste dia.</div>`;
}

function selecionarDiaOfdHome(codigo) {
  ofdDiaSelecionadoHome = String(codigo || "").toUpperCase();
  renderizarAgendaOfdHome();
}

function atualizarContadorOfdHome() {
  const campo = document.getElementById("ofdHomeCountdown");
  if (!campo) return;
  const relogio = obterRelogioBrasilia();
  const restante = Math.max(0, relogio.nextReset - Date.now());
  const horas = Math.floor(restante / 3600000);
  const minutos = Math.floor((restante % 3600000) / 60000);
  const segundos = Math.floor((restante % 60000) / 1000);
  campo.textContent = [horas, minutos, segundos].map(function(valor) {
    return String(valor).padStart(2, "0");
  }).join(":");
  if (restante < 1000) carregarOfdsHome();
}

function carregarOfdsHome() {
  const relogio = obterRelogioBrasilia();
  if (!ofdDiaSelecionadoHome) ofdDiaSelecionadoHome = OFD_DAY_CODES[relogio.brazilWeekday];
  ofdAgendaHome = OFD_HOME_FALLBACK.slice();
  const fallback = OFD_HOME_FALLBACK.filter(function(ofd) {
    return ofd.days.includes(relogio.weekday);
  });

  renderizarOfdsHome(fallback, relogio.brazilDateLabel, relogio.kstDateLabel);
  renderizarAgendaOfdHome();

  chamarApiJsonp("ofds")
    .then(function(resposta) {
      if (Array.isArray(resposta.schedule) && resposta.schedule.length) {
        ofdAgendaHome = resposta.schedule;
        renderizarAgendaOfdHome();
      }
      renderizarOfdsHome(
        resposta.ofds || [],
        resposta.brazilDayLabel || relogio.brazilDateLabel,
        resposta.kstDayLabel || resposta.dayLabel || relogio.kstDateLabel
      );
    })
    .catch(function() {
      renderizarOfdsHome(fallback, relogio.brazilDateLabel, relogio.kstDateLabel);
    });

  clearInterval(ofdHomeTimer);
  atualizarContadorOfdHome();
  ofdHomeTimer = setInterval(atualizarContadorOfdHome, 1000);
}


/* =====================================================
   COMUNIDADE — LINKS CONTROLADOS PELA PLANILHA SOCIAL
===================================================== */

const COMMUNITY_PLATFORMS = ["youtube", "twitch", "kick", "discord"];

function renderCommunityLinks(platform, links) {
  const platformName = String(platform || "").toLowerCase();
  const target = document.getElementById(
    "communityList" + platformName.charAt(0).toUpperCase() + platformName.slice(1)
  );
  if (!target) return;

  const validLinks = (Array.isArray(links) ? links : []).filter(function(item) {
    return item && item.url;
  });

  if (!validLinks.length) {
    target.innerHTML = `<div class="community-empty">Nenhum link cadastrado nesta plataforma.</div>`;
    return;
  }

  target.innerHTML = validLinks.map(function(item) {
    return `
      <a class="community-channel-link" href="${escaparHtml(item.url)}" target="_blank" rel="noopener noreferrer">
        <span><strong>${escaparHtml(item.name || "Canal da comunidade")}</strong>${item.description ? `<small>${escaparHtml(item.description)}</small>` : ""}</span>
        <b>ACESSAR ↗</b>
      </a>
    `;
  }).join("");
}

function carregarComunidade() {
  COMMUNITY_PLATFORMS.forEach(function(platform) {
    renderCommunityLinks(platform, []);
  });

  chamarApiJsonp("social")
    .then(function(response) {
      const social = response.social || {};
      COMMUNITY_PLATFORMS.forEach(function(platform) {
        renderCommunityLinks(platform, social[platform] || []);
      });
    })
    .catch(function() {
      document.querySelectorAll(".community-link-list").forEach(function(list) {
        list.innerHTML = `<div class="community-empty">Não foi possível carregar os links agora.</div>`;
      });
    });
}

function toggleCommunityPlatform(platform, button) {
  const card = button ? button.closest(".community-platform") : null;
  if (!card) return;
  const list = card.querySelector(".community-link-list");
  const willOpen = !card.classList.contains("aberta");

  document.querySelectorAll(".community-platform.aberta").forEach(function(other) {
    other.classList.remove("aberta");
    const otherButton = other.querySelector(".community-platform-trigger");
    const otherList = other.querySelector(".community-link-list");
    if (otherButton) otherButton.setAttribute("aria-expanded", "false");
    if (otherList) otherList.hidden = true;
  });

  if (willOpen) {
    card.classList.add("aberta");
    button.setAttribute("aria-expanded", "true");
    if (list) list.hidden = false;
  }
}


/* =====================================================
   INICIAR
===================================================== */


window.addEventListener(
  "hashchange",
  abrirPaginaPelaUrl
);

window.addEventListener(
  "popstate",
  abrirPaginaPelaUrl
);


document.addEventListener(
  "DOMContentLoaded",
  function() {

    inicializarSiteHeaderRecolhivel();
    inicializarHgDisplaySettings();
    atualizarBotoesViewDigidex();
    montarFiltrosAvancadosDigidex();
    inicializarFechamentoFiltrosDigidex();
    inicializarDigivolution();
    inicializarStatusSimulator();
    inicializarSorteio();
    abrirPaginaPelaUrl();

    carregarDigivolutions();

    carregarImagensSite();

    inicializarCalculadora();

    carregarDatabase();

    inicializarRaidBoss();

    inicializarDekyuTreasure();

    inicializarHistoriaHome();

    carregarOfdsHome();

    carregarComunidade();

  }
);


/* =====================================================
   MONTAR CENA HAKASE NA ABA ELEMENTOS
   ===================================================== */

function montarCenaElementosHakase() {

  const pagina =
    document.getElementById(
      "elementosPagina"
    );

  if (!pagina) {
    return;
  }

  const wrap =
    pagina.querySelector(
      ".internal-wrap"
    );

  const box =
    wrap
      ? wrap.querySelector(
          ".elementos-box"
        )
      : null;

  if (
    !wrap ||
    !box ||
    wrap.querySelector(
      ".elementos-scene"
    )
  ) {
    return;
  }

  const srcHakase =
    pegarImagem(
      "elementos_hakase"
    );

  const scene =
    document.createElement(
      "div"
    );

  scene.className =
    "elementos-scene";

  const imagem =
    document.createElement(
      "img"
    );

  imagem.className =
    "elementos-hakase-img";

  imagem.alt =
    "Elementos";

  imagem.src =
    srcHakase || "";

  const board =
    document.createElement(
      "div"
    );

  board.className =
    "elementos-board-ui";

  board.appendChild(
    box
  );

  scene.appendChild(
    imagem
  );

  scene.appendChild(
    board
  );

  wrap.appendChild(
    scene
  );

}

/* =====================================================
   ELEMENTOS — ABAS LATERAIS DE AJUDA
===================================================== */

function toggleElementosInfoTab(botao) {

  const tab =
    botao.closest(".elementos-info-tab");

  if (!tab) {
    return;
  }

  const vaiAbrir =
    !tab.classList.contains("aberta");

  document
    .querySelectorAll(".elementos-info-tab.aberta")
    .forEach(function(outra) {

      outra.classList.remove("aberta");

      const outroBotao =
        outra.querySelector(".elementos-info-tab-handle");

      if (outroBotao) {
        outroBotao.setAttribute("aria-expanded", "false");
      }

    });

  if (vaiAbrir) {

    tab.classList.add("aberta");
    botao.setAttribute("aria-expanded", "true");

  }

}


document.addEventListener(
  "click",
  function(event) {

    if (event.target.closest(".elementos-info-tab")) {
      return;
    }

    document
      .querySelectorAll(".elementos-info-tab.aberta")
      .forEach(function(tab) {

        tab.classList.remove("aberta");

        const botao =
          tab.querySelector(".elementos-info-tab-handle");

        if (botao) {
          botao.setAttribute("aria-expanded", "false");
        }

      });

  }
);

/* =====================================================
   PVP — MENU / BUILD / IMPORT / EXPORT / MATCH V2
===================================================== */

const PVP_STORAGE_KEY = "holy_guardians_pvp_team_v2";
const PVP_DATA_URL = "pvp-data.json";

let pvpDatabase = [];
let pvpStageAtual = "Mega";
let pvpPickerSlot = null;
let pvpDadosCarregando = null;

const PVP_STAGE_LEVEL = { Rookie:15, Champion:60, Ultimate:90, Mega:100 };

const PVP_TETRIS_STATS = ["STR","INT","DEF","RES","SPD"];

const PVP_ELEMENTS = ["DARKNESS","PHYSICAL","FIRE","WIND","WATER","ICE","THUNDER","EARTH","WOOD","STEEL","LIGHT"];
const pvpElementIconResolvedCache={};

function pvpNovoMapaElementos(){
  const obj={};
  PVP_ELEMENTS.forEach(function(e){obj[e]=0});
  return obj;
}

function pvpCriarTeamDeckPadrao(){
  return{
    buff:{HP:0,SP:0,STR:0,INT:0,DEF:0,RES:0,SPD:0},
    attrBoost:pvpNovoMapaElementos(),
    attrReduce:pvpNovoMapaElementos(),
    configured:false
  };
}

function pvpNormalizarTeamDeck(deck){
  const base=pvpCriarTeamDeckPadrao();
  if(!deck||typeof deck!=="object")return base;

  base.buff=Object.assign(base.buff,deck.buff||{});
  base.attrBoost=Object.assign(base.attrBoost,deck.attrBoost||{});
  base.attrReduce=Object.assign(base.attrReduce,deck.attrReduce||{});
  base.configured=!!deck.configured;
  return base;
}

let pvpTeamDeck=pvpCriarTeamDeckPadrao();

function pvpAplicarDeckGlobalAoBuild(build){
  if(!build)return build;
  build.buff=pvpTeamDeck.buff;
  build.attrBoost=pvpTeamDeck.attrBoost;
  build.attrReduce=pvpTeamDeck.attrReduce;
  return build;
}

function pvpInvalidarBuildsPorDeck(){
  pvpBuildSlots().forEach(function(slot){
    if(!slot._hgPvpBuild)return;
    slot._hgPvpBuild=pvpNormalizarBuildSchema(slot._hgPvpBuild);
    pvpAplicarDeckGlobalAoBuild(slot._hgPvpBuild);
    slot._hgPvpBuild.complete=false;
  });
}

function pvpDeckGlobalAlterado(){
  pvpInvalidarBuildsPorDeck();
  const atual=pvpBuildAtualSlot();
  const build=atual?pvpGetSlotBuild(atual):null;
  if(build)pvpAtualizarResumosWizard(build);
  pvpRenderBuildTabs();
  pvpSalvarEstadoLocal();
}

function pvpNextDepoisBaby(){
  pvpSetBuildStep(pvpTeamDeck.configured?2:1);
}

function pvpConcluirDeckGlobal(){
  pvpTeamDeck.configured=true;
  pvpInvalidarBuildsPorDeck();
  pvpSalvarEstadoLocal();
  pvpSetBuildStep(2);
}

function pvpNormalizarBuildSchema(build){
  const vazioStats={HP:0,SP:0,STR:0,INT:0,DEF:0,RES:0,SPD:0};

  if(!build||typeof build!=="object")build={};
  build.baby=Object.assign({},vazioStats,build.baby||{});
  build.tetris=Object.assign({},vazioStats,build.tetris||{});
  build.buff=Object.assign({},vazioStats,build.buff||{});
  build.attrBoost=Object.assign(pvpNovoMapaElementos(),build.attrBoost||{});
  build.attrReduce=Object.assign(pvpNovoMapaElementos(),build.attrReduce||{});
  build.skillElements=Object.assign({},build.skillElements||{});
  build.burstSkill=Number(build.burstSkill)||1;
  if(build.burstSkill<1||build.burstSkill>3)build.burstSkill=1;
  build.step=Math.max(0,Math.min(3,Number(build.step)||0));
  build.complete=!!build.complete;
  return build;
}

function pvpValorPercentualInput(valor){
  let txt=String(valor??"").replace(",",".").replace(/[^0-9.]/g,"");
  const partes=txt.split(".");
  if(partes.length>2)txt=partes.shift()+"."+partes.join("");
  const n=Math.max(0,Math.min(999.99,Number(txt)||0));
  return Math.round(n*100)/100;
}

function pvpSomarMapaElementos(mapa){
  return PVP_ELEMENTS.reduce(function(total,e){return total+(Number(mapa&&mapa[e])||0)},0);
}

function pvpFormatPct(valor){
  return Number(valor||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})+"%";
}


function pvpTypeIconHtml(type){
  const tipo=normalizarType(type)||"UNKNOWN";
  const src=TYPE_ICONS[tipo]||"";
  if(!src)return `<span class="pvp-mini-text-tag">${pvpEscapeHtml(tipo)}</span>`;
  return `<span class="pvp-mini-icon-tag pvp-type-icon-tag" title="${pvpEscapeHtml(tipo)}">
    <img src="${src}" alt="${pvpEscapeHtml(tipo)}"><b>${pvpEscapeHtml(tipo)}</b>
  </span>`;
}

function pvpFieldIconHtml(field){
  const f=String(field||"").trim().toUpperCase();
  if(!f)return "";
  const src=(typeof pegarImagemField==="function" ? pegarImagemField(f) : "") || `FIELD ICONS/${encodeURIComponent(f)}.png`;
  return `<span class="pvp-mini-icon-tag" title="${pvpEscapeHtml(f)}">
    <img src="${src}" alt="${pvpEscapeHtml(f)}"><b>${pvpEscapeHtml(f)}</b>
  </span>`;
}

function pvpElementIconHtml(element){
  const e=(typeof normalizarElemento==="function"
    ?normalizarElemento(element)
    :String(element||"").trim().toUpperCase());

  if(!e)return "";

  const logical=(e==="IRON"||e==="STEEL")?"STEEL":e;
  const aliases=logical==="STEEL"?["IRON","STEEL"]:[logical];
  const candidates=[];

  function pushCandidate(src){
    if(src&&!candidates.includes(src))candidates.push(src);
  }

  // Se já descobrimos qual URL funciona, ela vem SEMPRE primeiro.
  pushCandidate(pvpElementIconResolvedCache[logical]);

  aliases.forEach(function(alias){
    if(typeof pegarImagemElemento==="function"){
      pushCandidate(pegarImagemElemento(alias));
    }

    if(typeof imagensSite==="object"&&imagensSite){
      Object.keys(imagensSite).forEach(function(key){
        const limpa=String(key||"")
          .trim()
          .toLowerCase()
          .replace(/\.(png|webp|jpg|jpeg)$/i,"")
          .replace(/^(elemento_|element_|icone_|icon_)/,"");

        if(limpa===alias.toLowerCase()){
          pushCandidate(imagensSite[key]);
        }
      });
    }

    const nomes=[
      alias,
      alias.toLowerCase(),
      "elemento_"+alias.toLowerCase(),
      "element_"+alias.toLowerCase(),
      "icone_"+alias.toLowerCase(),
      "icon_"+alias.toLowerCase()
    ];

    nomes.forEach(function(nome){
      ["png","webp"].forEach(function(ext){
        pushCandidate(`ELEMENTOS ICONS/${encodeURIComponent(nome)}.${ext}`);
      });
    });
  });

  if(!candidates.length)return "";

  const encoded=pvpEscapeHtml(JSON.stringify(candidates));

  // O wrapper fica invisível enquanto tenta os candidatos.
  // Assim nenhum ícone quebrado aparece/pisca na tela.
  return `<span class="pvp-mini-icon-tag pvp-element-icon-tag pvp-element-icon-loading"
      title="${pvpEscapeHtml(logical)}">
    <img src="${candidates[0]}"
      data-pvp-element="${pvpEscapeHtml(logical)}"
      data-pvp-icon-candidates="${encoded}"
      data-pvp-icon-index="0"
      onload="pvpIconeElementoCarregado(this)"
      onerror="pvpTentarProximoIconeElemento(this)"
      alt="${pvpEscapeHtml(logical)}">
    <b>${pvpEscapeHtml(logical)}</b>
  </span>`;
}

function pvpIconeElementoCarregado(img){
  if(!img)return;

  const logical=String(img.dataset.pvpElement||"").trim().toUpperCase();
  if(logical){
    pvpElementIconResolvedCache[logical]=img.currentSrc||img.src||"";
  }

  const wrapper=img.closest(".pvp-mini-icon-tag");
  if(wrapper)wrapper.classList.remove("pvp-element-icon-loading");
}

function pvpTentarProximoIconeElemento(img){
  if(!img)return;

  let candidates=[];
  try{
    candidates=JSON.parse(img.dataset.pvpIconCandidates||"[]");
  }catch(erro){}

  const next=Number(img.dataset.pvpIconIndex||0)+1;

  if(next<candidates.length){
    img.dataset.pvpIconIndex=String(next);
    img.src=candidates[next];
    return;
  }

  // Nenhum candidato funcionou: remove tudo sem mostrar ícone quebrado.
  const wrapper=img.closest(".pvp-mini-icon-tag");
  if(wrapper)wrapper.remove();
}

function pvpRelationHtml(digi,kind){
  if(!digi)return "";
  const info=hgRelationData(digi,kind);
  if(!info.element)return "";

  return hgRelationTooltipHtml(
    info.element,
    info.effect,
    info.kind,
    pvpElementIconHtml(info.element)
  );
}

function pvpMetaIconsHtml(digi){
  if(!digi)return "";

  const fields=String(digi.fields||"")
    .split(/[,/|]+/)
    .map(function(x){return x.trim()})
    .filter(Boolean);

  return `<div class="pvp-meta-icons">
    <div class="pvp-meta-icon-group">
      <small>TYPE</small>
      ${pvpTypeIconHtml(digi.attribute)}
    </div>

    <div class="pvp-meta-icon-group pvp-meta-relation pvp-meta-strong">
      <small>STRONG</small>
      ${pvpRelationHtml(digi,"strong")}
    </div>

    <div class="pvp-meta-icon-group pvp-meta-relation pvp-meta-weak">
      <small>WEAK</small>
      ${pvpRelationHtml(digi,"weak")}
    </div>

    ${fields.length?`<div class="pvp-meta-icon-group">
      <small>FIELD</small>
      <div class="pvp-meta-icon-list">${fields.map(pvpFieldIconHtml).join("")}</div>
    </div>`:""}
  </div>`;
}


function fecharFeaturesNavMenu(){
  const dropdown=document.getElementById("featuresNavDropdown");
  const button=document.getElementById("btnFeatures");
  if(dropdown)dropdown.classList.remove("aberto");
  if(button)button.setAttribute("aria-expanded","false");
}
function toggleFeaturesNavMenu(event){
  if(event){event.preventDefault();event.stopPropagation()}
  const dropdown=document.getElementById("featuresNavDropdown");
  const button=document.getElementById("btnFeatures");
  if(!dropdown)return;
  const abrir=!dropdown.classList.contains("aberto");
  fecharPvpNavMenu();
  dropdown.classList.toggle("aberto",abrir);
  if(button)button.setAttribute("aria-expanded",abrir?"true":"false");
}
function abrirSorteio(){
  fecharFeaturesNavMenu();
  mostrarPagina("sorteioPagina",document.getElementById("btnFeatures"));
  inicializarSorteio();
}

function fecharPvpNavMenu(){
  const d=document.getElementById("pvpNavDropdown");
  const b=document.getElementById("btnPvp");
  if(d)d.classList.remove("aberto");
  if(b)b.setAttribute("aria-expanded","false");
}
function togglePvpNavMenu(event){
  if(event){event.preventDefault();event.stopPropagation()}
  fecharFeaturesNavMenu();
  const d=document.getElementById("pvpNavDropdown");
  const b=document.getElementById("btnPvp");
  if(!d)return;
  const abrir=!d.classList.contains("aberto");
  d.classList.toggle("aberto",abrir);
  if(b)b.setAttribute("aria-expanded",abrir?"true":"false");
}
function pvpToggleStageMenu(event){if(event){event.preventDefault();event.stopPropagation()}const el=document.getElementById("pvpStageSelect");if(el)el.classList.toggle("aberto")}
function pvpFecharStageMenu(){const el=document.getElementById("pvpStageSelect");if(el)el.classList.remove("aberto")}
function pvpStageTexto(stage){return String(stage||"Mega").toUpperCase()+" · LV. "+(PVP_STAGE_LEVEL[stage]||100)}

function pvpSelecionarStage(stage,level){
  pvpStageAtual=stage;
  const label=document.getElementById("pvpStageLabel");
  if(label)label.textContent=String(stage).toUpperCase()+" · LV. "+level;
  pvpFecharStageMenu();

  document.querySelectorAll("#pvpSlots .pvp-slot").forEach(function(slot){
    const did=Number(slot.dataset.did||0);
    if(!did)return;
    const digi=pvpDatabase.find(function(item){return Number(item.did)===did});
    if(digi&&digi.stage!==stage)pvpLimparSlot(slot);
  });
  pvpSalvarEstadoLocal();
}

function pvpMostrarView(nome){
  document.querySelectorAll("#pvpPagina .pvp-view").forEach(function(v){v.classList.remove("ativa")});
  const id=
    nome==="match"?"pvpMatchView":
    nome==="individual"?"pvpIndividualView":
    nome==="import"?"pvpImportView":
    nome==="imported-ready"?"pvpImportedReadyView":
    "pvpBuildView";
  const alvo=document.getElementById(id);
  if(alvo)alvo.classList.add("ativa")
}
function abrirPvpBuild(){fecharPvpNavMenu();mostrarPagina("pvpPagina",document.getElementById("btnPvp"));pvpMostrarView("build");pvpCriarSlots();pvpCarregarDatabase()}
function abrirPvpMatch(){fecharPvpNavMenu();mostrarPagina("pvpPagina",document.getElementById("btnPvp"));pvpMostrarView("match")}

async function pvpCarregarDatabase(){
  if(pvpDatabase.length)return pvpDatabase;
  if(pvpDadosCarregando)return pvpDadosCarregando;
  pvpDadosCarregando=fetch(PVP_DATA_URL,{cache:"no-store"})
    .then(function(resp){if(!resp.ok)throw new Error("HTTP "+resp.status);return resp.json()})
    .then(function(data){pvpDatabase=Array.isArray(data)?data:[];pvpAtualizarTodosSlots();return pvpDatabase})
    .catch(function(erro){console.error("[PvP] Falha ao carregar pvp-data.json",erro);alert("Não foi possível carregar a DATABASE PvP. Confirme que pvp-data.json está no GitHub ao lado do index.html.");return[]})
    .finally(function(){pvpDadosCarregando=null});
  return pvpDadosCarregando
}

function pvpCriarSlots(){
  const container=document.getElementById("pvpSlots");
  if(!container||container.dataset.ready==="1")return;
  container.innerHTML="";
  for(let i=1;i<=8;i++){
    const slot=document.createElement("article");
    slot.className="pvp-slot tech-corners";
    slot.dataset.slot=String(i);slot.dataset.did="";slot.dataset.digimon="";
    slot.tabIndex=0;slot.setAttribute("role","button");slot.setAttribute("aria-label","Selecionar Digimon para o slot "+i);
    slot.onclick=function(event){if(event.target.closest(".pvp-slot-remove"))return;pvpAbrirPicker(i)};
    slot.onkeydown=function(event){if(event.key==="Enter"||event.key===" "){event.preventDefault();pvpAbrirPicker(i)}};
    slot.innerHTML=
      '<div class="pvp-slot-number">SLOT '+String(i).padStart(2,"0")+'</div>'+
      '<button type="button" class="pvp-slot-remove" title="Remover">×</button>'+
      '<div class="pvp-slot-portrait tech-icon-frame"><img class="pvp-slot-img" alt="" hidden><span class="pvp-slot-plus">+</span></div>'+
      '<div class="pvp-slot-name">SELECT DIGIMON</div>'+
      '<div class="pvp-slot-meta">Clique para escolher um Digimon</div>'+
      '<div class="pvp-slot-tags"></div>';
    const removeBtn=slot.querySelector(".pvp-slot-remove");
    if(removeBtn)removeBtn.onclick=function(event){event.stopPropagation();pvpLimparSlot(slot)};
    container.appendChild(slot)
  }
  container.dataset.ready="1";
  pvpRestaurarEstadoLocal()
}

function pvpLimparSlot(slot){
  if(!slot)return;
  slot.dataset.did="";slot.dataset.digimon="";slot._hgPvpBuild=null;
  pvpAtualizarSlotVisual(slot,null);pvpSalvarEstadoLocal();pvpAtualizarBotaoEtapa2()
}

function pvpAtualizarTodosSlots(){
  document.querySelectorAll("#pvpSlots .pvp-slot").forEach(function(slot){
    const did=Number(slot.dataset.did||0);
    const digi=did?pvpDatabase.find(function(item){return Number(item.did)===did}):null;
    pvpAtualizarSlotVisual(slot,digi||null)
  })
}

function pvpAtualizarSlotVisual(slot,digi){
  if(!slot)return;
  const img=slot.querySelector(".pvp-slot-img"),plus=slot.querySelector(".pvp-slot-plus"),
        nome=slot.querySelector(".pvp-slot-name"),meta=slot.querySelector(".pvp-slot-meta"),
        tags=slot.querySelector(".pvp-slot-tags"),remove=slot.querySelector(".pvp-slot-remove");

  if(!digi){
    slot.classList.remove("preenchido");
    if(img){img.hidden=true;img.removeAttribute("src");img.alt=""}
    if(plus){plus.hidden=false;plus.textContent="+"}
    if(nome)nome.textContent="SELECT DIGIMON";
    if(meta)meta.textContent="Clique para escolher um Digimon";
    if(tags)tags.innerHTML="";
    if(remove)remove.style.display="none";
    return
  }

  slot.classList.add("preenchido");slot.dataset.did=String(digi.did);slot.dataset.digimon=digi.name;
  if(img){
    img.hidden=false;img.src=digi.icon;img.alt=digi.name;
    img.onerror=function(){this.hidden=true;if(plus){plus.hidden=false;plus.textContent="?"}}
  }
  if(plus)plus.hidden=true;
  if(nome)nome.textContent=digi.name;
  if(meta)meta.textContent=digi.stage.toUpperCase()+" · LV. "+digi.level;
  if(tags)tags.innerHTML=pvpMetaIconsHtml(digi);
  if(remove)remove.style.display="grid"
}

async function pvpAbrirPicker(slotNumero){
  await pvpCarregarDatabase();
  pvpPickerSlot=Number(slotNumero);
  const overlay=document.getElementById("pvpPickerOverlay"),input=document.getElementById("pvpPickerSearch");
  if(!overlay)return;
  overlay.classList.add("aberto");overlay.setAttribute("aria-hidden","false");document.body.classList.add("pvp-modal-open");
  if(input){input.value="";setTimeout(function(){input.focus()},20)}
  pvpRenderPicker()
}
function pvpFecharPicker(){
  const overlay=document.getElementById("pvpPickerOverlay");
  if(overlay){overlay.classList.remove("aberto");overlay.setAttribute("aria-hidden","true")}
  document.body.classList.remove("pvp-modal-open");pvpPickerSlot=null
}

function pvpRenderPicker(){
  const grid=document.getElementById("pvpPickerGrid"),input=document.getElementById("pvpPickerSearch"),count=document.getElementById("pvpPickerCount");
  if(!grid)return;
  const termo=(input?input.value:"").trim().toLowerCase();
  const escolhidos=new Set(Array.from(document.querySelectorAll("#pvpSlots .pvp-slot")).map(function(slot){return Number(slot.dataset.did||0)}).filter(Boolean));
  const lista=pvpDatabase.filter(function(digi){return digi.stage===pvpStageAtual&&(!termo||String(digi.name).toLowerCase().includes(termo))})
    .sort(function(a,b){return String(a.name).localeCompare(String(b.name),"en",{sensitivity:"base"})});
  if(count)count.textContent=lista.length+" DIGIMONS · "+pvpStageTexto(pvpStageAtual);
  grid.innerHTML="";
  lista.forEach(function(digi){
    const btn=document.createElement("button"),repetido=escolhidos.has(Number(digi.did));
    btn.type="button";btn.className="pvp-picker-card tech-corners"+(repetido?" ja-usado":"");btn.disabled=repetido;
    btn.innerHTML='<span class="pvp-picker-icon tech-icon-frame"><img src="'+digi.icon+'" alt="'+pvpEscapeHtml(digi.name)+'"></span>'+
      '<span class="pvp-picker-copy"><strong>'+pvpEscapeHtml(digi.name)+'</strong><small>'+digi.stage.toUpperCase()+' · LV. '+digi.level+'</small><span class="pvp-picker-mini-meta">'+pvpTypeIconHtml(digi.attribute)+(Array.isArray(digi.elements)?digi.elements.map(pvpElementIconHtml).join(""):"")+'</span></span>'+
      (repetido?'<em>IN TEAM</em>':'');
    btn.onclick=function(){pvpEscolherDigimon(digi.did)};grid.appendChild(btn)
  });
  if(!lista.length)grid.innerHTML='<div class="pvp-picker-empty">Nenhum Digimon encontrado nessa Stage.</div>'
}

function pvpEscapeHtml(texto){return String(texto||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}

function pvpEscolherDigimon(did){
  const digi=pvpDatabase.find(function(item){return Number(item.did)===Number(did)});
  const slot=document.querySelector('#pvpSlots .pvp-slot[data-slot="'+pvpPickerSlot+'"]');
  if(!digi||!slot)return;
  slot.dataset.did=String(digi.did);slot.dataset.digimon=digi.name;
  pvpAtualizarSlotVisual(slot,digi);pvpSalvarEstadoLocal();pvpAtualizarBotaoEtapa2();pvpFecharPicker()
}

function pvpLerEstado(){
  const slots=Array.from(document.querySelectorAll("#pvpSlots .pvp-slot")).map(function(slot,index){
    const build=slot._hgPvpBuild?pvpNormalizarBuildSchema(slot._hgPvpBuild):null;
    if(build)pvpAplicarDeckGlobalAoBuild(build);
    return{
      slot:index+1,
      did:slot.dataset.did?Number(slot.dataset.did):null,
      digimon:slot.dataset.digimon||null,
      build:build
    }
  });

  return{
    format:"holy-guardians-pvp-team",
    version:3,
    stage:pvpStageAtual,
    level:PVP_STAGE_LEVEL[pvpStageAtual]||100,
    teamDeck:pvpTeamDeck,
    slots:slots
  }
}

function pvpAplicarEstado(pacote){
  if(!pacote||pacote.format!=="holy-guardians-pvp-team"||!Array.isArray(pacote.slots)){
    throw new Error("Este arquivo não é um time PvP exportado pela Holy Guardians.");
  }

  pvpCriarSlots();

  const stagesValidas=["Rookie","Champion","Ultimate","Mega"];
  const stage=stagesValidas.includes(pacote.stage)?pacote.stage:"Mega";

  // V3 usa teamDeck. Para V2 antigo, usa o deck do primeiro build salvo.
  let deckFonte=pacote.teamDeck||null;
  if(!deckFonte){
    const legado=pacote.slots.find(function(item){
      return item&&item.build&&(item.build.buff||item.build.attrBoost||item.build.attrReduce);
    });
    if(legado&&legado.build){
      deckFonte={
        buff:legado.build.buff||{},
        attrBoost:legado.build.attrBoost||{},
        attrReduce:legado.build.attrReduce||{},
        configured:true
      };
    }
  }

  pvpTeamDeck=pvpNormalizarTeamDeck(deckFonte);
  pvpSelecionarStage(stage,PVP_STAGE_LEVEL[stage]);

  document.querySelectorAll("#pvpSlots .pvp-slot").forEach(function(slot,index){
    const salvo=pacote.slots.find(function(item){return Number(item.slot)===index+1})||pacote.slots[index]||null;

    slot.dataset.did=salvo&&salvo.did?String(salvo.did):"";
    slot.dataset.digimon=salvo&&salvo.digimon?String(salvo.digimon):"";

    if(salvo&&salvo.build){
      slot._hgPvpBuild=pvpNormalizarBuildSchema(salvo.build);
      pvpAplicarDeckGlobalAoBuild(slot._hgPvpBuild);
    }else{
      slot._hgPvpBuild=null;
    }
  });

  pvpAtualizarTodosSlots();
  pvpSalvarEstadoLocal()
}

function pvpSalvarEstadoLocal(){try{localStorage.setItem(PVP_STORAGE_KEY,JSON.stringify(pvpLerEstado()))}catch(erro){}}

function pvpRestaurarEstadoLocal(){
  try{
    const salvo=localStorage.getItem(PVP_STORAGE_KEY);

    if(!salvo){
      pvpTeamDeck=pvpCriarTeamDeckPadrao();
      pvpSelecionarStage("Mega",100);
      return
    }

    const pacote=JSON.parse(salvo);

    if(pacote&&pacote.stage&&PVP_STAGE_LEVEL[pacote.stage]){
      pvpStageAtual=pacote.stage;
      const label=document.getElementById("pvpStageLabel");
      if(label)label.textContent=pvpStageTexto(pvpStageAtual)
    }

    let deckFonte=pacote&&pacote.teamDeck?pacote.teamDeck:null;

    if(!deckFonte&&pacote&&Array.isArray(pacote.slots)){
      const legado=pacote.slots.find(function(item){
        return item&&item.build&&(item.build.buff||item.build.attrBoost||item.build.attrReduce);
      });

      if(legado&&legado.build){
        deckFonte={
          buff:legado.build.buff||{},
          attrBoost:legado.build.attrBoost||{},
          attrReduce:legado.build.attrReduce||{},
          configured:true
        };
      }
    }

    pvpTeamDeck=pvpNormalizarTeamDeck(deckFonte);

    if(pacote&&Array.isArray(pacote.slots)){
      document.querySelectorAll("#pvpSlots .pvp-slot").forEach(function(slot,index){
        const s=pacote.slots.find(function(item){return Number(item.slot)===index+1})||pacote.slots[index];
        if(!s)return;

        slot.dataset.did=s.did?String(s.did):"";
        slot.dataset.digimon=s.digimon||"";

        if(s.build){
          slot._hgPvpBuild=pvpNormalizarBuildSchema(s.build);
          pvpAplicarDeckGlobalAoBuild(slot._hgPvpBuild);
        }else{
          slot._hgPvpBuild=null;
        }
      })
    }

    pvpAtualizarTodosSlots()
  }catch(erro){
    pvpTeamDeck=pvpCriarTeamDeckPadrao();
    pvpSelecionarStage("Mega",100)
  }
}


function pvpRenderTimeImportado(){
  const grid=document.getElementById("pvpImportedReadyGrid");
  const warning=document.getElementById("pvpImportedReadyWarning");
  const matchBtn=document.getElementById("pvpImportedMatchBtn");
  if(!grid)return;

  const slots=pvpBuildSlots();
  grid.innerHTML="";

  slots.forEach(function(slot,index){
    const did=Number(slot.dataset.did||0);
    const digi=did?pvpDatabase.find(function(item){return Number(item.did)===did}):null;
    const build=pvpGetSlotBuild(slot);

    const card=document.createElement("article");
    card.className="pvp-imported-ready-card tech-corners"+(build.complete?" concluido":" incompleto");

    card.innerHTML=
      '<div class="pvp-imported-ready-icon tech-icon-frame">'+
        (digi&&digi.icon?'<img src="'+digi.icon+'" alt="'+pvpEscapeHtml(digi.name)+'">':'<span>?</span>')+
      '</div>'+
      '<div class="pvp-imported-ready-copy">'+
        '<small>SLOT '+String(index+1).padStart(2,"0")+'</small>'+
        '<strong>'+(digi?pvpEscapeHtml(digi.name):pvpEscapeHtml(slot.dataset.digimon||"EMPTY SLOT"))+'</strong>'+
        '<span>'+(digi?digi.stage.toUpperCase()+' · LV. '+digi.level:'SEM DIGIMON')+'</span>'+
      '</div>'+
      '<div class="pvp-imported-ready-state">'+
        (build.complete?'✓ BUILD':'PENDENTE')+
      '</div>';

    grid.appendChild(card);
  });

  const pronto=pvpTodosBuildsConcluidos();
  if(warning)warning.classList.toggle("visivel",!pronto);
  if(matchBtn){
    matchBtn.disabled=!pronto;
    matchBtn.title=pronto?"Time pronto para Match":"Conclua os 8 builds antes da Match";
  }
}

function pvpEditarTimeImportado(){
  if(pvpSlotsPreenchidos().length!==8){
    pvpMostrarView("build");
    pvpAtualizarBotaoEtapa2();
    return;
  }

  pvpBuildIndex=0;
  pvpMostrarView("individual");
  pvpRenderBuildTabs();
  pvpRenderBuildAtual();
}

function pvpMatchComTimeImportado(){
  if(!pvpTodosBuildsConcluidos()){
    alert("Este time possui builds incompletos. Edite o time antes de seguir para Match.");
    return;
  }
  pvpSalvarEstadoLocal();
  abrirPvpMatch();
}

function abrirImportacaoTimePvp(){
  fecharPvpNavMenu();
  mostrarPagina("pvpPagina",document.getElementById("btnPvp"));
  pvpMostrarView("import");
}
async function importarTimePvp(file){
  if(!file)return;
  try{
    await pvpCarregarDatabase();
    const texto=await file.text();
    pvpAplicarEstado(JSON.parse(texto));

    const input=document.getElementById("pvpImportFile");
    if(input)input.value="";

    if(pvpSlotsPreenchidos().length===8){
      pvpMostrarView("imported-ready");
      pvpRenderTimeImportado();
    }else{
      pvpMostrarView("build");
      pvpAtualizarBotaoEtapa2();
      alert("O arquivo foi carregado, mas o time não possui 8 Digimons completos.");
    }
  }catch(erro){
    alert("Não foi possível importar o time PvP.\n\n"+(erro&&erro.message?erro.message:erro))
  }
}
function exportarTimePvp(){
  fecharPvpNavMenu();pvpCriarSlots();
  const pacote=pvpLerEstado();pacote.exportedAt=new Date().toISOString();
  const blob=new Blob([JSON.stringify(pacote,null,2)],{type:"application/json;charset=utf-8"});
  builderBaixarBlob(blob,"holy_guardians_pvp_team_"+builderDataArquivo()+".json")
}

document.addEventListener("click",function(event){
  const dropdown=document.getElementById("pvpNavDropdown");if(dropdown&&!dropdown.contains(event.target))fecharPvpNavMenu();
  const featuresDropdown=document.getElementById("featuresNavDropdown");if(featuresDropdown&&!featuresDropdown.contains(event.target))fecharFeaturesNavMenu();
  const stage=document.getElementById("pvpStageSelect");if(stage&&!stage.contains(event.target))pvpFecharStageMenu();
  const overlay=document.getElementById("pvpPickerOverlay");if(overlay&&event.target===overlay)pvpFecharPicker()
});
document.addEventListener("keydown",function(event){if(event.key==="Escape"){fecharPvpNavMenu();fecharFeaturesNavMenu();pvpFecharStageMenu();pvpFecharPicker()}});
document.addEventListener("DOMContentLoaded",function(){pvpCriarSlots();pvpCarregarDatabase()});


/* =====================================================
   PVP — INDIVIDUAL BUILD V3
===================================================== */

const PVP_BUILD_STATS = ["HP","SP","STR","INT","DEF","RES","SPD"];
let pvpBuildIndex = 0;

function pvpSlotsPreenchidos(){
  return Array.from(document.querySelectorAll("#pvpSlots .pvp-slot"))
    .filter(function(slot){return !!slot.dataset.did});
}

function pvpAtualizarBotaoEtapa2(){
  const btn=document.getElementById("pvpGoBuildBtn");
  if(!btn)return;
  const total=pvpSlotsPreenchidos().length;
  btn.disabled=total!==8;
  btn.classList.toggle("ready",total===8);
  const text=btn.querySelector("span");
  if(text)text.textContent=total===8?"CONFIGURE BUILDS":"SELECT "+(8-total)+" MORE";
}

function pvpGetSlotBuild(slot){
  if(!slot._hgPvpBuild){
    slot._hgPvpBuild=pvpNormalizarBuildSchema({});
  }else{
    slot._hgPvpBuild=pvpNormalizarBuildSchema(slot._hgPvpBuild);
  }
  pvpAplicarDeckGlobalAoBuild(slot._hgPvpBuild);
  return slot._hgPvpBuild;
}

function pvpIrParaBuildIndividual(){
  if(pvpSlotsPreenchidos().length!==8)return;
  pvpBuildIndex=0;
  pvpMostrarView("individual");
  pvpRenderBuildTabs();
  pvpRenderBuildAtual();
}

function pvpVoltarSelecao(){
  pvpMostrarView("build");
  pvpAtualizarBotaoEtapa2();
}

function pvpBuildSlots(){
  return Array.from(document.querySelectorAll("#pvpSlots .pvp-slot"));
}

function pvpBuildAtualSlot(){
  return pvpBuildSlots()[pvpBuildIndex]||null;
}

function pvpRenderBuildTabs(){
  const wrap=document.getElementById("pvpBuildTabs");
  if(!wrap)return;
  wrap.innerHTML="";
  pvpBuildSlots().forEach(function(slot,index){
    const did=Number(slot.dataset.did||0);
    const digi=pvpDatabase.find(function(item){return Number(item.did)===did});
    const build=pvpGetSlotBuild(slot);
    const btn=document.createElement("button");
    btn.type="button";
    btn.className="pvp-build-tab"+(index===pvpBuildIndex?" ativo":"")+(build.complete?" completo":"");
    btn.innerHTML=
      '<span class="pvp-build-tab-icon tech-icon-frame"><img src="'+(digi?digi.icon:"")+'" alt=""></span>'+
      '<span class="pvp-build-tab-copy"><strong>'+(digi?pvpEscapeHtml(digi.name):"EMPTY")+'</strong><small>SLOT '+String(index+1).padStart(2,"0")+'</small></span>'+
      '<span class="pvp-build-tab-check">'+(build.complete?"✓":"")+'</span>';
    btn.onclick=function(){pvpBuildIndex=index;pvpRenderBuildTabs();pvpRenderBuildAtual()};
    wrap.appendChild(btn)
  })
}

function pvpRenderBuildAtual(){
  const slot=pvpBuildAtualSlot();
  if(!slot)return;
  const did=Number(slot.dataset.did||0);
  const digi=pvpDatabase.find(function(item){return Number(item.did)===did});
  const build=pvpGetSlotBuild(slot);

  const img=document.getElementById("pvpBuildCurrentImg");
  const name=document.getElementById("pvpBuildCurrentName");
  const meta=document.getElementById("pvpBuildCurrentMeta");
  const sl=document.getElementById("pvpBuildCurrentSlot");

  if(img&&digi){img.src=digi.icon;img.alt=digi.name}
  if(name)name.textContent=digi?digi.name:"DIGIMON";
  if(meta&&digi)meta.innerHTML=`<span class="pvp-current-stage">${digi.stage.toUpperCase()} · LV. ${digi.level}</span>${pvpMetaIconsHtml(digi)}`;
  if(sl)sl.textContent="SLOT "+String(pvpBuildIndex+1).padStart(2,"0");

  pvpRenderBabyGrid(build);
  pvpRenderBuffGrid(build);
  pvpRenderElementDeck(build);
  pvpRenderSkills(build,digi);
  pvpRenderTetrisGrid(build);
  pvpRenderSummary(build,digi);
  pvpSetBuildStep(build.step);
  pvpAtualizarFinalActions();
}

function pvpRenderBabyGrid(build){
  const grid=document.getElementById("pvpBabyGrid");
  if(!grid)return;
  grid.innerHTML="";
  PVP_BUILD_STATS.forEach(function(stat){
    const row=document.createElement("label");
    row.className="pvp-stat-input";
    row.innerHTML='<span>'+stat+'</span><input class="pvp-number-clean" type="text" inputmode="numeric" maxlength="2" autocomplete="off" value="'+(build.baby[stat]||0)+'"><em>%</em>';
    const input=row.querySelector("input");
    input.oninput=function(){
      let raw=String(input.value||"").replace(/\D/g,"").slice(0,2);
      let v=Math.max(0,Math.min(14,Number(raw)||0));
      const others=PVP_BUILD_STATS.reduce(function(sum,s){
        return sum+(s===stat?0:(Number(build.baby[s])||0))
      },0);
      if(others+v>28)v=Math.max(0,28-others);
      input.value=String(v);
      build.baby[stat]=v;
      build.complete=false;
      pvpAtualizarBuildCalculado()
    };
    grid.appendChild(row)
  });
  pvpAtualizarBabyTotal(build);
  pvpAtualizarResumosWizard(build)
}

function pvpAtualizarBabyTotal(build){
  const total=PVP_BUILD_STATS.reduce(function(sum,s){return sum+(Number(build.baby[s])||0)},0);
  const el=document.getElementById("pvpBabyTotal");
  if(el)el.textContent="TOTAL: "+total+"% / 28%"
}

function pvpTetrisCubeList(build){
  const cubes=[];
  PVP_TETRIS_STATS.forEach(function(stat){
    const qtd=Math.max(0,Number(build.tetris[stat]||0));
    for(let i=0;i<qtd;i++)cubes.push(stat);
  });
  return cubes.slice(0,16);
}

function pvpTetrisColor(stat){
  return {STR:"#eb4e66",INT:"#4d8fff",DEF:"#e6b54d",RES:"#a86bf2",SPD:"#43cfbf"}[stat]||"#40bde8";
}

function pvpAdicionarCuboTetris(build,stat){
  if(!PVP_TETRIS_STATS.includes(stat))return;
  if(pvpTetrisCubeList(build).length>=16)return;
  build.tetris[stat]=(Number(build.tetris[stat]||0))+1;
  build.complete=false;
  pvpRenderTetrisGrid(build);
  pvpAtualizarBuildCalculado();
}

function pvpRemoverUltimoCuboTetris(build){
  const cubes=pvpTetrisCubeList(build);
  if(!cubes.length)return;
  const stat=cubes[cubes.length-1];
  build.tetris[stat]=Math.max(0,(Number(build.tetris[stat]||0))-1);
  build.complete=false;
  pvpRenderTetrisGrid(build);
  pvpAtualizarBuildCalculado();
}

function pvpResetTetris(build){
  PVP_BUILD_STATS.forEach(function(stat){build.tetris[stat]=0});
  build.complete=false;
  pvpRenderTetrisGrid(build);
  pvpAtualizarBuildCalculado();
}

function pvpRenderTetrisGrid(build){
  const grid=document.getElementById("pvpTetrisGrid");
  if(!grid)return;

  build.tetris.HP=0;
  build.tetris.SP=0;

  const cubes=pvpTetrisCubeList(build);
  const board=Array.from({length:16},function(_,index){
    const stat=cubes[index];
    if(!stat)return `<div class="pvp-tetris-slot"><span>${String(index+1).padStart(2,"0")}</span></div>`;
    return `<div class="pvp-tetris-cube" style="--pvp-cube-color:${pvpTetrisColor(stat)}">
      <strong>${stat}</strong><small>3%</small>
    </div>`;
  }).join("");

  const palette=PVP_TETRIS_STATS.map(function(stat){
    const qtd=Number(build.tetris[stat]||0);
    return `<button type="button" class="pvp-tetris-add" style="--pvp-cube-color:${pvpTetrisColor(stat)}" data-stat="${stat}">
      <strong>${stat}</strong><small>+3%</small><em>${qtd}×</em>
    </button>`;
  }).join("");

  grid.innerHTML=`<div class="pvp-tetris-compact-workspace">
    <div class="pvp-tetris-board-wrap">
      <div class="pvp-tetris-mode-label"><span>CUBOS DE</span><strong>3%</strong></div>
      <div class="pvp-tetris-board">${board}</div>
      <div class="pvp-tetris-actions">
        <span>${cubes.length} / 16 ESPAÇOS</span>
        <button type="button" data-action="undo">DESFAZER</button>
        <button type="button" data-action="reset">RESET</button>
      </div>
    </div>
    <aside class="pvp-tetris-palette">
      <span>ADICIONAR CUBO</span>
      <div class="pvp-tetris-add-grid">${palette}</div>
      <small>Mesmo sistema visual do Status Simulator, reduzido para o PvP.</small>
    </aside>
  </div>`;

  grid.querySelectorAll(".pvp-tetris-add").forEach(function(btn){
    btn.onclick=function(){pvpAdicionarCuboTetris(build,btn.dataset.stat)};
  });
  const undo=grid.querySelector('[data-action="undo"]');
  const reset=grid.querySelector('[data-action="reset"]');
  if(undo)undo.onclick=function(){pvpRemoverUltimoCuboTetris(build)};
  if(reset)reset.onclick=function(){pvpResetTetris(build)};
}

function pvpRenderBuffGrid(build){
  const grid=document.getElementById("pvpBuffGrid");
  if(!grid)return;

  pvpAplicarDeckGlobalAoBuild(build);
  grid.innerHTML="";

  PVP_BUILD_STATS.forEach(function(stat){
    const row=document.createElement("label");
    row.className="pvp-stat-input";
    row.innerHTML='<span>'+stat+'</span><input class="pvp-number-clean" type="text" inputmode="numeric" maxlength="3" autocomplete="off" value="'+(pvpTeamDeck.buff[stat]||0)+'"><em>+</em>';
    const input=row.querySelector("input");

    input.oninput=function(){
      const raw=String(input.value||"").replace(/\D/g,"").slice(0,3);
      const v=Math.max(0,Math.min(999,Number(raw)||0));
      input.value=String(v);
      pvpTeamDeck.buff[stat]=v;
      pvpDeckGlobalAlterado();
      pvpAtualizarBuildCalculado();
    };

    grid.appendChild(row)
  })
}


function pvpRenderElementDeck(build){
  const grid=document.getElementById("pvpElementDeckGrid");
  if(!grid)return;

  pvpAplicarDeckGlobalAoBuild(build);

  grid.innerHTML=PVP_ELEMENTS.map(function(element){
    const boost=Number(pvpTeamDeck.attrBoost[element]||0);
    const reduce=Number(pvpTeamDeck.attrReduce[element]||0);

    return `<div class="pvp-element-deck-row">
      <div class="pvp-element-deck-name">
        ${pvpElementIconHtml(element)}
        <strong>${element}</strong>
      </div>
      <label>
        <span>${element} DMG</span>
        <div class="pvp-element-percent-field">
          <input type="text" inputmode="decimal" maxlength="6" data-kind="boost" data-element="${element}" value="${boost}">
          <em>%</em>
        </div>
      </label>
      <label>
        <span>${element} DMG REDUCE</span>
        <div class="pvp-element-percent-field">
          <input type="text" inputmode="decimal" maxlength="6" data-kind="reduce" data-element="${element}" value="${reduce}">
          <em>%</em>
        </div>
      </label>
    </div>`;
  }).join("");

  grid.querySelectorAll("input").forEach(function(input){
    input.oninput=function(){
      const element=input.dataset.element;
      const kind=input.dataset.kind;
      let raw=String(input.value||"").replace(",",".").replace(/[^0-9.]/g,"");
      const firstDot=raw.indexOf(".");

      if(firstDot>=0){
        raw=raw.slice(0,firstDot+1)+raw.slice(firstDot+1).replace(/\./g,"");
        const pair=raw.split(".");
        raw=pair[0].slice(0,3)+(pair.length>1?"."+pair[1].slice(0,2):"");
      }else{
        raw=raw.slice(0,3);
      }

      input.value=raw;
      const value=pvpValorPercentualInput(raw);

      if(kind==="boost")pvpTeamDeck.attrBoost[element]=value;
      else pvpTeamDeck.attrReduce[element]=value;

      pvpDeckGlobalAlterado();
      pvpAtualizarBuildCalculado();
    };

    input.onblur=function(){
      const kind=input.dataset.kind;
      const element=input.dataset.element;
      const value=kind==="boost"
        ?pvpTeamDeck.attrBoost[element]
        :pvpTeamDeck.attrReduce[element];

      input.value=Number(value||0);
    };
  });
}

function pvpSkillElementosDisponiveis(skill){
  const lista=Array.isArray(skill&&skill.conversions)?skill.conversions.slice():[];
  if(skill&&skill.attribute&&!lista.includes(skill.attribute))lista.unshift(skill.attribute);
  return lista.filter(function(e){return PVP_ELEMENTS.includes(e)});
}

function pvpSkillElementoSelecionado(build,skill){
  const key="F"+skill.slot;
  const disponiveis=pvpSkillElementosDisponiveis(skill);
  let atual=build.skillElements[key];
  if(!disponiveis.includes(atual))atual=disponiveis[0]||skill.attribute||"";
  build.skillElements[key]=atual;
  return atual;
}

function pvpSkillDamage(skill,element,boostPct,multiplicador){
  const mult=Number(multiplicador)||1;
  const hits=Number(skill&&skill.hits)||1;
  const perHit=Number(skill&&skill.perHit);
  const baseTotal=Number(skill&&skill.baseTotal);

  if(!Number.isFinite(perHit)||!Number.isFinite(baseTotal)){
    return{available:false,hits:hits,perHit:0,baseTotal:0,bonusPorHit:0,bonusTotal:0,total:0};
  }

  // Mesma matemática da Calculadora, isolada no PvP.
  // A Calculadora existente permanece intocada.
  const fator=Math.max(0,Number(boostPct)||0)/100;
  const aplica=pvpSkillElementosDisponiveis(skill).includes(element);
  const bonusNormalPorHit=aplica?perHit*fator:0;

  const finalPerHit=perHit*mult;
  const finalBaseTotal=baseTotal*mult;
  const finalBonusPorHit=bonusNormalPorHit*mult;
  const finalBonusTotal=finalBonusPorHit*hits;

  return{
    available:true,
    applies:aplica,
    hits:hits,
    perHit:finalPerHit,
    baseTotal:finalBaseTotal,
    bonusPorHit:finalBonusPorHit,
    bonusTotal:finalBonusTotal,
    total:finalBaseTotal+finalBonusTotal
  };
}

function pvpSkillDetalhesHtml(skill){
  const extras=[];
  if(skill.effectRaw)extras.push(`<div><strong>EFFECT</strong><span>${pvpEscapeHtml(skill.effectRaw).replace(/\n/g,"<br>")}</span></div>`);
  if(skill.attributeEffects)extras.push(`<div><strong>ATTRIBUTE EFFECTS</strong><span>${pvpEscapeHtml(skill.attributeEffects)}</span></div>`);
  if(skill.cc==="YES")extras.push(`<div><strong>CC</strong><span>${pvpEscapeHtml(skill.ccType||"YES")}</span></div>`);
  if(skill.dot==="YES")extras.push(`<div><strong>DOT</strong><span>YES</span></div>`);
  if(skill.defBreak==="YES")extras.push(`<div><strong>DEF BREAK</strong><span>YES</span></div>`);

  return `<div class="pvp-skill-hover">
    <div class="pvp-skill-hover-top">
      ${skill.icon?`<img src="${skill.icon}" alt="${pvpEscapeHtml(skill.name)}">`:""}
      <div><small>Lv. 10</small><strong>${pvpEscapeHtml(skill.name)}</strong></div>
      <em>ACTIVE SKILL</em>
    </div>
    <div class="pvp-skill-hover-info">
      <div><strong>Skill Type</strong><span>${pvpEscapeHtml(skill.skillType||"-")}</span></div>
      <div><strong>Number of Attacks</strong><span>${skill.hits||1}</span></div>
      <div><strong>Damage</strong><span>${pvpEscapeHtml(skill.damageText||"-")}</span></div>
      <div><strong>Applies to</strong><span>${pvpEscapeHtml(skill.appliesTo||"-")}</span></div>
      <div><strong>Scope</strong><span>${pvpEscapeHtml(skill.scope||"-")}</span></div>
    </div>
    ${skill.description?`<p>${pvpEscapeHtml(skill.description)}</p>`:""}
    ${extras.join("")}
  </div>`;
}

function pvpRenderSkills(build,digi){
  const grid=document.getElementById("pvpSkillsGrid");
  const burst=document.getElementById("pvpBurstSkillPanel");
  if(!grid||!burst)return;

  const skills=Array.isArray(digi&&digi.skills)?digi.skills.slice(0,3):[];

  grid.innerHTML=skills.map(function(skill){
    const selected=pvpSkillElementoSelecionado(build,skill);
    const boost=Number(build.attrBoost[selected]||0);
    const damage=pvpSkillDamage(skill,selected,boost,1);

    const choices=pvpSkillElementosDisponiveis(skill).map(function(element){
      return `<button type="button" class="pvp-skill-element-choice ${element===selected?"ativo":""}" data-slot="${skill.slot}" data-element="${element}" title="${element}">
        ${pvpElementIconHtml(element)}
      </button>`;
    }).join("");

    return `<article class="pvp-skill-card tech-corners" data-skill-slot="${skill.slot}">
      <div class="pvp-skill-main">
        <div class="pvp-skill-icons">
          <div class="pvp-skill-icon tech-icon-frame">
            ${skill.icon?`<img src="${skill.icon}" alt="${pvpEscapeHtml(skill.name)}">`:"<span>?</span>"}
          </div>
          ${pvpElementIconHtml(selected)}
        </div>
        <div class="pvp-skill-copy">
          <small>F${skill.slot} · LV.10</small>
          <strong>${pvpEscapeHtml(skill.name)}</strong>
          <em>MASTERED</em>
        </div>
        <div class="pvp-skill-damage">
          <small>BASE LV.10</small>
          <strong>${damage.available?calcFormatar(damage.baseTotal)+"%":"-"}</strong>
          <span>+${damage.available?calcFormatar(damage.bonusTotal):"0"}% ${selected}</span>
          <b>${damage.available?calcFormatar(damage.total)+"%":"-"}</b>
        </div>
      </div>

      <div class="pvp-skill-element-select">
        <span>CONVERTIBLE ATTRIBUTES</span>
        <div>${choices}</div>
      </div>

      ${pvpSkillDetalhesHtml(skill)}
    </article>`;
  }).join("");

  if(!skills.length){
    grid.innerHTML='<div class="pvp-skills-empty">Nenhuma Skill disponível na base para este Digimon.</div>';
  }

  grid.querySelectorAll(".pvp-skill-element-choice").forEach(function(btn){
    btn.onclick=function(event){
      event.stopPropagation();
      const key="F"+btn.dataset.slot;
      build.skillElements[key]=btn.dataset.element;
      build.complete=false;
      pvpRenderSkills(build,digi);
      pvpAtualizarBuildCalculado();
    };
  });

  const burstSkill=skills.find(function(s){return Number(s.slot)===Number(build.burstSkill)})||skills[0]||null;
  if(burstSkill)build.burstSkill=burstSkill.slot;

  const burstButtons=skills.map(function(skill){
    return `<button type="button" class="${Number(skill.slot)===Number(build.burstSkill)?"ativo":""}" data-burst-slot="${skill.slot}">
      F${skill.slot}
    </button>`;
  }).join("");

  if(!burstSkill){
    burst.innerHTML='<div class="pvp-skills-empty">Burst indisponível.</div>';
    return;
  }

  const burstElement=pvpSkillElementoSelecionado(build,burstSkill);
  const burstBoost=Number(build.attrBoost[burstElement]||0);
  const burstDamage=pvpSkillDamage(burstSkill,burstElement,burstBoost,3);

  burst.innerHTML=`<article class="pvp-burst-card tech-corners">
    <div class="pvp-burst-head">
      <div>
        <small>F4 // BURST SKILL</small>
        <strong>${pvpEscapeHtml(burstSkill.name)}</strong>
        <em>MASTERED · ×3</em>
      </div>
      <div class="pvp-burst-source"><span>BASE SKILL</span>${burstButtons}</div>
    </div>

    <div class="pvp-burst-content">
      <div class="pvp-skill-icon tech-icon-frame">
        ${burstSkill.icon?`<img src="${burstSkill.icon}" alt="${pvpEscapeHtml(burstSkill.name)}">`:""}
      </div>
      ${pvpElementIconHtml(burstElement)}
      <div class="pvp-burst-values">
        <span>BASE BURST <strong>${burstDamage.available?calcFormatar(burstDamage.baseTotal)+"%":"-"}</strong></span>
        <span>${burstElement} BONUS <strong>+${burstDamage.available?calcFormatar(burstDamage.bonusTotal):"0"}%</strong></span>
        <b>TOTAL ${burstDamage.available?calcFormatar(burstDamage.total)+"%":"-"}</b>
      </div>
    </div>
  </article>`;

  burst.querySelectorAll("[data-burst-slot]").forEach(function(btn){
    btn.onclick=function(){
      build.burstSkill=Number(btn.dataset.burstSlot)||1;
      build.complete=false;
      pvpRenderSkills(build,digi);
      pvpAtualizarBuildCalculado();
    };
  });
}

function pvpSetBuildStep(step){
  const slot=pvpBuildAtualSlot();
  if(!slot)return;
  const build=pvpGetSlotBuild(slot);
  build.step=Math.max(0,Math.min(3,Number(step)||0));

  document.querySelectorAll("#pvpIndividualView .pvp-wizard-step").forEach(function(section){
    const active=Number(section.dataset.pvpStep)===build.step;
    section.classList.toggle("ativo",active);
    section.classList.toggle("minimizado",!active);
  });

  pvpAtualizarResumosWizard(build);
  pvpSalvarEstadoLocal();
}

function pvpAtualizarResumosWizard(build){
  if(!build)return;

  const babyTotal=PVP_BUILD_STATS.reduce(function(total,s){return total+(Number(build.baby[s])||0)},0);
  const cubes=pvpTetrisCubeList(build).length;
  const boost=pvpSomarMapaElementos(build.attrBoost);
  const reduce=pvpSomarMapaElementos(build.attrReduce);

  const babyEl=document.getElementById("pvpBabyStepSummary");
  const deckEl=document.getElementById("pvpDeckStepSummary");
  const skillsEl=document.getElementById("pvpSkillsStepSummary");
  const tetrisEl=document.getElementById("pvpTetrisStepSummary");

  if(babyEl)babyEl.textContent=babyTotal+" / 28%";
  if(deckEl)deckEl.textContent="ATTRBOOST "+pvpFormatPct(boost)+" · REDUCE "+pvpFormatPct(reduce);

  if(skillsEl){
    const parts=["F1","F2","F3"].map(function(k){return build.skillElements[k]||k});
    skillsEl.textContent=parts.join(" · ")+" · BURST F"+(build.burstSkill||1);
  }

  if(tetrisEl)tetrisEl.textContent=cubes+" / 16 ESPAÇOS";
}

function pvpTooltipElementos(mapa){
  const linhas=PVP_ELEMENTS
    .filter(function(e){return Number(mapa&&mapa[e])>0})
    .map(function(e){return e+" "+pvpFormatPct(mapa[e])});
  return linhas.length?linhas.join("\n"):"Nenhum elemento configurado";
}

function pvpGetBaseStat(digi,stat){
  if(!digi)return 0;
  const key="base"+stat;
  return Number(digi[key]||0)
}


function pvpCalcularCriticosCalibrados(build,digi){
  if(!digi)return null;

  /* -------------------------
     INT-derived values
     ------------------------- */
  const intBase=Number(pvpGetBaseStat(digi,"INT"))||0;
  const babyIntPercent=Number(build.baby.INT||0);
  const tetrisIntPercent=(Number(build.tetris.INT||0))*3;
  const deckInt=Number(build.buff.INT||0);

  const babyIntGain=babyIntPercent>0?Math.ceil(intBase*babyIntPercent/100):0;
  const tetrisIntGain=tetrisIntPercent>0?Math.ceil(intBase*tetrisIntPercent/100):0;
  const intFinal=intBase+babyIntGain+tetrisIntGain+deckInt;
  const bonusInt=Math.max(0,intFinal-intBase);

  const chave=normalizarChaveDigivolution(digi.name||"");
  const burstMode=/burstmode|bm$/.test(chave)?1:0;

  /*
   * INT — CALIBRAÇÃO EMPÍRICA V8.6
   *
   * Os offsets abaixo ancoram CRITDMG e DAMAGE RANGE nos Ultimates
   * medidos no jogo com o mesmo Deck Buff de teste.
   *
   * IMPORTANTE: não são valores finais fixos. O cálculo-base continua
   * recebendo INT BASE / INT FINAL normalmente; o offset apenas corrige
   * a curva individual observada de cada Digimon. Assim, Baby/Tetris/
   * Deck INT continuam alterando os derivados em tempo real.
   *
   * CRIT RATE não foi recalibrado sem leitura equivalente no jogo.
   * Arukenimon mantém a correção de CRIT RATE já validada anteriormente.
   */
  const calibracaoPvp={
    arukenimon:{
      critRate:-6.588071339586276,
      critDmg:-9.58824301987506,
      damageRangeMax:-3.98568401032475
    },
    taomon:{
      critDmg:-16.96540435488808,
      damageRangeMax:-5.747470542753632
    },
    bigmamemon:{
      critDmg:-23.855987395530235,
      damageRangeMax:-7.567435244468783
    },
    skullmeramon:{
      critDmg:-23.862595189474575,
      damageRangeMax:-7.567035197240486
    },
    whamon:{
      critDmg:-23.854238273603755,
      damageRangeMax:-7.567541139323339
    },
    scorpiomon:{
      critDmg:-6.965404354888079,
      damageRangeMax:-3.1174705427536225
    },
    pumpkinmon:{
      critDmg:-23.859291292502405,
      damageRangeMax:-7.567235220854627
    },
    infermon:{
      critDmg:-23.868231249015395,
      damageRangeMax:-7.566693980486917
    }
  };

  const ajuste=calibracaoPvp[chave]||{
    critRate:0,
    critDmg:0,
    damageRangeMax:0
  };

  const critRate=Math.max(
    0,
    26.950915089047466
      +intFinal*0.04994600527878049
      -intBase*0.03651377191538811
      -burstMode*0.25833219773252186
      +(Number(ajuste.critRate)||0)
  );

  const critDmg=Math.max(
    0,
    172.3803368817766
      +intFinal*0.04887066469303948
      -intBase*0.04877349125268096
      -burstMode*0.2554690272742557
      +(Number(ajuste.critDmg)||0)
  );

  const damageRangeMin=95;
  const damageRangeMax=Math.max(
    damageRangeMin,
    112.1233752759157
      +intFinal*0.01543433379605434
      -intBase*0.015440216843529378
      -burstMode*0.08093217150093454
      +(Number(ajuste.damageRangeMax)||0)
  );

  /* -------------------------
     RES-derived values — CALIBRAÇÃO EMPÍRICA V8.3
     -------------------------
     Regras confirmadas pelos testes em:
     Mega Lv100 / Ultimate Lv90 / Champion Lv60 / Rookie Lv15.

     1) Baby RES e Tetris RES são percentuais sobre o RES BASE.
     2) Cada fonte é arredondada separadamente com Math.ceil.
     3) Buff Deck RES aumenta o RES mostrado, mas NÃO entrou nos
        derivados abaixo em nenhum dos casos medidos até agora.
  */
  const resBase=Number(pvpGetBaseStat(digi,"RES"))||0;
  const levelFactor=Math.max(0,Number(digi.level||100)/100);

  const babyResPercent=Math.max(0,Number(build.baby.RES||0));
  const tetrisResPercent=Math.max(0,Number(build.tetris.RES||0))*3;

  const babyResGain=babyResPercent>0
    ?Math.ceil(resBase*babyResPercent/100)
    :0;

  const tetrisResGain=tetrisResPercent>0
    ?Math.ceil(resBase*tetrisResPercent/100)
    :0;

  const resPercentGain=babyResGain+tetrisResGain;

  /*
   * CRIT RESIST
   * Confirmado inclusive no Rookie com Baby RES sem cubo:
   * sqrt((Baby RES Gain + Tetris RES Gain) * Level Factor)
   */
  const critResist=Math.sqrt(Math.max(0,resPercentGain*levelFactor));

  /*
   * CRIT DOWN
   * O termo natural muda por Stage/Lv; o RES base continua sendo
   * o valor individual de cada Digimon.
   *
   * Coeficientes ajustados sobre os pontos reais enviados:
   * Rookie   Lv15  = 0.04219966864307316
   * Champion Lv60  = 0.014792899408284023
   * Ultimate Lv90  = 0.008739848130289869
   * Mega     Lv100 = 0.006699507521875943
   *
   * O componente do ganho percentual é compartilhado:
   * Crit Resist * 2.017
   */
  const stageKey=String(digi.stage||"").trim().toUpperCase();
  const critDownBaseCoef={
    ROOKIE:0.04219966864307316,
    CHAMPION:0.014792899408284023,
    ULTIMATE:0.008739848130289869,
    MEGA:0.006699507521875943
  }[stageKey] ?? 0.006699507521875943;

  const critDown=Math.max(
    0,
    resBase*critDownBaseCoef
      +critResist*2.017
  );

  /*
   * ABNORMAL RESIST
   * O fator de nível afeta tanto a parcela do RES base quanto
   * a parcela de Baby/Tetris.
   */
  const abnormalResistMin=Math.max(
    0,
    (resBase*0.009 + resPercentGain*0.045)*levelFactor
  );

  const abnormalResistMax=Math.max(
    abnormalResistMin,
    (resBase*0.011 + resPercentGain*0.055)*levelFactor
  );

  return{
    critRate,
    critDown,
    critDmg,
    critResist,
    abnormalResistMin,
    abnormalResistMax,
    damageRangeMin,
    damageRangeMax,
    intBase,
    intFinal,
    bonusInt,
    resBase,
    babyResGain,
    tetrisResGain,
    resPercentGain,
    babyResPercent,
    tetrisResPercent,
    critDownBaseCoef,
    levelFactor
  };
}

function pvpRenderCriticos(build,digi){
  const crit=pvpCalcularCriticosCalibrados(build,digi);
  if(!crit)return "";

  const attrBoost=pvpSomarMapaElementos(build.attrBoost);
  const attrReduce=pvpSomarMapaElementos(build.attrReduce);
  const boostTip=pvpEscapeHtml(pvpTooltipElementos(build.attrBoost));
  const reduceTip=pvpEscapeHtml(pvpTooltipElementos(build.attrReduce));

  const fmt=function(v){
    return Number(v||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})+"%";
  };

  return `<div class="pvp-crit-result pvp-extra-status-result">
    <div class="pvp-extra-status-list">
      <div><strong>CRIT RATE</strong><b>${fmt(crit.critRate)}</b></div>
      <div><strong>CRIT DOWN</strong><b>${fmt(crit.critDown)}</b></div>
      <div class="pvp-extra-wide"><strong>DAMAGE RANGE</strong><b>${fmt(crit.damageRangeMin)} ~ ${fmt(crit.damageRangeMax)}</b></div>
      <div><strong>CRITDMG</strong><b>${fmt(crit.critDmg)}</b></div>
      <div><strong>CRIT RESIST</strong><b>${fmt(crit.critResist)}</b></div>
      <div><strong>ABNORMAL RESIST</strong><b>${fmt(crit.abnormalResistMin)} ~ ${fmt(crit.abnormalResistMax)}</b></div>
      <div class="pvp-extra-tooltip" data-tooltip="${reduceTip}"><strong>ATTR REDUCE</strong><b>${pvpFormatPct(attrReduce)}</b></div>
      <div class="pvp-extra-tooltip" data-tooltip="${boostTip}"><strong>ATTRBOOST</strong><b>${pvpFormatPct(attrBoost)}</b></div>
    </div>
    <small>INT BASE ${formatarStatusSimulator(crit.intBase)} · INT FINAL ${formatarStatusSimulator(crit.intFinal)} · RES BASE ${formatarStatusSimulator(crit.resBase)} · LV FACTOR ×${Number(crit.levelFactor||1).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})} · BABY RES +${formatarStatusSimulator(crit.babyResGain)} · TETRIS RES +${formatarStatusSimulator(crit.tetrisResGain)}</small>
    <em>INT: CRITDMG / DAMAGE RANGE CALIBRADOS NOS ULTIMATES TESTADOS · RES MANTIDO NOS CASOS VALIDADOS · TOLERÂNCIA-ALVO ≤ 0,10%</em>
  </div>`;
}

function pvpRenderSummary(build,digi){
  const wrap=document.getElementById("pvpSummaryStats");
  if(!wrap)return;

  wrap.classList.add("pvp-summary-game");
  wrap.innerHTML="";

  PVP_BUILD_STATS.forEach(function(stat){
    const base=pvpGetBaseStat(digi,stat);
    const babyPct=Number(build.baby[stat]||0);
    const tetrisPct=(Number(build.tetris[stat]||0))*3;
    const deck=Number(build.buff[stat]||0);

    const pvpHpBonus=stat==="HP"?Math.floor(base*0.50):0;
    const babyBonus=babyPct>0?Math.ceil(base*(babyPct/100)):0;
    const tetrisBonus=tetrisPct>0?Math.ceil(base*(tetrisPct/100)):0;
    const totalBonus=pvpHpBonus+babyBonus+tetrisBonus+deck;
    const final=base+totalBonus;

    const row=document.createElement("div");
    row.className="pvp-summary-game-row";
    row.style.setProperty("--stat-color",STATUS_SIMULATOR_COLORS[stat]||"#55dfff");
    row.innerHTML=
      '<strong class="pvp-summary-game-stat">'+stat+'</strong>'+
      '<div class="pvp-summary-game-main">'+
        '<b>'+formatarStatusSimulator(final)+'</b>'+
        (totalBonus>0?'<em>(+'+formatarStatusSimulator(totalBonus)+')</em>':'')+
      '</div>'+
      '<small>BASE '+formatarStatusSimulator(base)+
        (stat==="HP"?' · <span class="pvp-rank-adjustment">RANK ADJUSTMENT +50%</span> (+'+formatarStatusSimulator(pvpHpBonus)+')':'')+
        ' · BABY +'+formatarStatusSimulator(babyBonus)+' ('+babyPct+'%)'+
        ' · DECK +'+formatarStatusSimulator(deck)+
        ' · TETRIS +'+formatarStatusSimulator(tetrisBonus)+' ('+tetrisPct+'%)'+
      '</small>';
    wrap.appendChild(row)
  });

  wrap.insertAdjacentHTML("beforeend",pvpRenderCriticos(build,digi));

  const done=document.getElementById("pvpMarkDoneBtn");
  if(done){
    done.classList.toggle("done",!!build.complete);
    done.textContent=build.complete?"✓ BUILD CONCLUÍDO":"✓ MARCAR BUILD COMO CONCLUÍDO"
  }
}
function pvpAtualizarBuildCalculado(){
  const slot=pvpBuildAtualSlot();
  if(!slot)return;
  const build=pvpGetSlotBuild(slot);
  const did=Number(slot.dataset.did||0);
  const digi=pvpDatabase.find(function(item){return Number(item.did)===did});

  pvpAtualizarBabyTotal(build);
  pvpAtualizarResumosWizard(build);
  pvpRenderSummary(build,digi);
  pvpRenderBuildTabs();
  pvpSalvarEstadoLocal();
  pvpAtualizarFinalActions()
}

function pvpConcluirBuildAtual(){
  const slot=pvpBuildAtualSlot();
  if(!slot)return;

  const build=pvpGetSlotBuild(slot);
  const estavaConcluido=!!build.complete;
  build.complete=!build.complete;

  pvpRenderBuildTabs();
  pvpRenderBuildAtual();
  pvpSalvarEstadoLocal();
  pvpAtualizarFinalActions();

  // Ao concluir, vai para o próximo Digimon ainda pendente.
  if(!estavaConcluido && build.complete){
    const slots=pvpBuildSlots();
    const total=slots.length;
    let destino=-1;

    for(let passo=1;passo<total;passo++){
      const idx=(pvpBuildIndex+passo)%total;
      const outro=pvpGetSlotBuild(slots[idx]);
      if(!outro.complete){
        destino=idx;
        break;
      }
    }

    if(destino>=0){
      pvpBuildIndex=destino;
      pvpRenderBuildTabs();
      pvpRenderBuildAtual();

      const painel=document.querySelector("#pvpIndividualView .pvp-build-current");
      if(painel){
        painel.scrollIntoView({behavior:"smooth",block:"start"});
      }
    }
  }
}

function pvpBuildAnterior(){
  pvpBuildIndex=Math.max(0,pvpBuildIndex-1);
  pvpRenderBuildTabs();pvpRenderBuildAtual()
}
function pvpBuildProximo(){
  pvpBuildIndex=Math.min(7,pvpBuildIndex+1);
  pvpRenderBuildTabs();pvpRenderBuildAtual()
}

function pvpLimparBuildAtual(){
  const slot=pvpBuildAtualSlot();
  if(!slot)return;
  if(!confirm("Limpar Baby Correction, Skills e Tetris deste Digimon? O Buff Deck global dos 8 será mantido."))return;
  slot._hgPvpBuild=null;
  pvpRenderBuildTabs();pvpRenderBuildAtual();pvpSalvarEstadoLocal()
}

function pvpLimparTimeCompleto(){
  if(!confirm("Limpar todo o time PvP? Isso remove os 8 Digimons, todos os builds e o Buff Deck global."))return;

  pvpTeamDeck=pvpCriarTeamDeckPadrao();

  pvpBuildSlots().forEach(function(slot){
    pvpLimparSlot(slot);
    slot._hgPvpBuild=null
  });

  localStorage.removeItem(PVP_STORAGE_KEY);
  pvpBuildIndex=0;
  pvpMostrarView("build");
  pvpAtualizarBotaoEtapa2()
}

function pvpTodosBuildsConcluidos(){
  const slots=pvpBuildSlots();
  return slots.length===8&&slots.every(function(slot){return !!slot.dataset.did&&!!pvpGetSlotBuild(slot).complete})
}

function pvpAtualizarFinalActions(){
  const box=document.getElementById("pvpFinalActions");
  if(box)box.classList.toggle("visivel",pvpTodosBuildsConcluidos())
}

function pvpSalvarTime(){
  if(!pvpTodosBuildsConcluidos()){
    alert("Conclua os 8 builds antes de salvar o time para Match.");
    return;
  }

  pvpSalvarEstadoLocal();
  abrirPvpMatch();
}

const _pvpAplicarEstadoOriginal=pvpAplicarEstado;
pvpAplicarEstado=function(pacote){
  _pvpAplicarEstadoOriginal(pacote);
  pvpAtualizarBotaoEtapa2()
};

const _pvpRestaurarEstadoOriginal=pvpRestaurarEstadoLocal;
pvpRestaurarEstadoLocal=function(){
  _pvpRestaurarEstadoOriginal();
  pvpAtualizarBotaoEtapa2()
};
/* =====================================================
   PVP — CHALLENGE ROOM ALPHA V1
   Front-end multiplayer + local test mode
===================================================== */

const PVP_MATCH_SERVER_B64 = "aHR0cHM6Ly9ob2x5LWd1YXJkaWFucy1jaGFsbGVuZ2Utcm9vbS5oaWx0b25naXVzZXBwZWNoaWFyZWxvLndvcmtlcnMuZGV2";
const PVP_MATCH_NICK_KEY = "hg_pvp_match_nick_v1";
const PVP_MATCH_STAGE_LEVELS = { Rookie:15, Champion:60, Ultimate:90, Mega:100 };
const PVP_MATCH_DRAFT_BLOCKS = [
  { role:"host", count:1 },
  { role:"guest", count:2 },
  { role:"host", count:2 },
  { role:"guest", count:2 },
  { role:"host", count:1 }
];

let pvpMatchSocket = null;
let pvpMatchRoomState = null;
let pvpMatchRole = null;
let pvpMatchToken = "";
let pvpMatchRoomId = "";
let pvpMatchLocalMode = false;
let pvpMatchLocalRole = "host";
let pvpMatchFormationDraft = {};
let pvpBattleSelectedTarget = null;
let pvpBattleSubOut = null;
let pvpBattleSubIn = null;
let pvpBattleIntentByUnit = Object.create(null);
let pvpBattleAutoTimer = null;
let pvpBattleAutoBusy = false;
let pvpBattlePendingAction = null;
let pvpBattleSubMode = "manual";
const PVP_BATTLE_AUTO_TURN_MS = 2200;
const PVP_BATTLE_GAUGE_MAX = 5;
const PVP_BATTLE_GAUGE_GAIN_PER_GLOBAL_TURN = 0.25;

function pvpMatchApiBase(){
  try {
    return atob(PVP_MATCH_SERVER_B64).trim().replace(/\/+$/,"");
  } catch (erro) {
    return "";
  }
}

function pvpMatchSanitizarNick(input){
  if(!input)return;
  input.value=String(input.value||"").replace(/[^A-Za-z0-9]/g,"").slice(0,16);
  if(input.value)localStorage.setItem(PVP_MATCH_NICK_KEY,input.value);
}

function pvpMatchNickValido(){
  const input=document.getElementById("pvpMatchNick");
  const nick=String(input&&input.value||"").replace(/[^A-Za-z0-9]/g,"").slice(0,16);
  if(input)input.value=nick;
  if(nick.length<3){alert("Use um nick com 3 a 16 caracteres, somente letras e números.");return null}
  localStorage.setItem(PVP_MATCH_NICK_KEY,nick);
  return nick;
}

function pvpMatchTeamAtual(){
  try{return pvpLerEstado()}catch(erro){return null}
}

function pvpMatchTeamValido(team,stage){
  if(!team||team.format!=="holy-guardians-pvp-team"||!Array.isArray(team.slots))return false;
  if(team.stage!==stage)return false;
  const valid=team.slots.filter(function(s){return s&&s.did&&s.build&&s.build.complete});
  if(valid.length!==8)return false;
  return valid.every(function(s){
    const digi=pvpDatabase.find(function(d){return Number(d.did)===Number(s.did)});
    return digi&&digi.stage===stage;
  });
}

function pvpMatchAtualizarTeamCheck(){
  const box=document.getElementById("pvpMatchTeamCheck");
  const stageSelect=document.getElementById("pvpMatchCreateStage");
  if(!box)return;
  const team=pvpMatchTeamAtual();
  const slots=team&&Array.isArray(team.slots)?team.slots:[];
  const completos=slots.filter(function(s){return s&&s.did&&s.build&&s.build.complete}).length;
  const stage=team&&team.stage?team.stage:pvpStageAtual;
  const roomStage=stageSelect&&stageSelect.value?stageSelect.value:stage;
  const stageOk=stage===roomStage;
  box.innerHTML=
    '<div><span>TEAM</span><b class="'+(completos===8?'ok':'bad')+'">'+completos+'/8 BUILDS</b></div>'+ 
    '<div><span>STAGE DO TIME</span><b class="'+(stageOk?'ok':'bad')+'">'+pvpEscapeHtml(String(stage||"-" ).toUpperCase())+'</b></div>'+ 
    '<div><span>STAGE DA SALA</span><b class="'+(stageOk?'ok':'bad')+'">'+pvpEscapeHtml(String(roomStage||"-" ).toUpperCase())+'</b></div>'+ 
    '<div><span>MATCH READY</span><b class="'+(completos===8&&stageOk?'ok':'bad')+'">'+(completos===8&&stageOk?'READY':'AJUSTE O TIME')+'</b></div>';
}

function pvpMatchAtualizarStageLobby(){
  pvpMatchAtualizarTeamCheck();
}

function pvpMatchConfigurarServidor(){
  return;
}

function pvpMatchAtualizarServerHint(){
  return;
}

function pvpMatchSetConnection(tipo){
  const badge=document.getElementById("pvpMatchConnectionBadge");
  if(!badge)return;
  badge.classList.remove("online","local");
  if(tipo==="online"){badge.textContent="ONLINE";badge.classList.add("online")}
  else if(tipo==="local"){badge.textContent="LOCAL TEST";badge.classList.add("local")}
  else badge.textContent="OFFLINE";
}

function pvpMatchTela(id){
  document.querySelectorAll("#pvpMatchView .pvp-match-screen").forEach(function(el){el.classList.remove("ativa")});
  const alvo=document.getElementById(id);
  if(alvo)alvo.classList.add("ativa");
}

function pvpMatchVoltarAoTime(){
  if(pvpMatchRoomState&&!confirm("Sair da Challenge Room e voltar para editar o time?"))return;
  pvpMatchSairSala(true);
  pvpMostrarView("individual");
  pvpBuildIndex=0;
  pvpRenderBuildTabs();
  pvpRenderBuildAtual();
}

const _abrirPvpMatchChallengeAlpha=abrirPvpMatch;
abrirPvpMatch=function(){
  fecharPvpNavMenu();
  mostrarPagina("pvpPagina",document.getElementById("btnPvp"));
  pvpMostrarView("match");
  pvpCarregarDatabase().then(function(){
    const nick=document.getElementById("pvpMatchNick");
    if(nick&&!nick.value)nick.value=localStorage.getItem(PVP_MATCH_NICK_KEY)||"";
    const stage=document.getElementById("pvpMatchCreateStage");
    if(stage)stage.value=pvpStageAtual;
    pvpMatchAtualizarTeamCheck();
    pvpMatchAtualizarServerHint();
    pvpMatchSetConnection("offline");
    pvpMatchTela("pvpMatchLobby");
    pvpMatchLerRoomDaUrl();
  });
};

function pvpMatchLerRoomDaUrl(){
  try{
    const url=new URL(window.location.href);
    const room=String(url.searchParams.get("room")||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
    if(room){
      const input=document.getElementById("pvpMatchJoinCode");
      if(input)input.value=room;
    }
  }catch(erro){}
}

async function pvpMatchRequest(path,options){
  const base=pvpMatchApiBase();
  if(!base)throw new Error("Servidor da Challenge Room indisponível.");
  const resp=await fetch(base+path,Object.assign({headers:{"Content-Type":"application/json"}},options||{}));
  let data={};
  try{data=await resp.json()}catch(erro){}
  if(!resp.ok)throw new Error(data&&data.error?data.error:"Falha no servidor da Challenge Room.");
  return data;
}

async function pvpMatchCriarSala(){
  const nick=pvpMatchNickValido();if(!nick)return;
  const stage=document.getElementById("pvpMatchCreateStage")?.value||pvpStageAtual;
  const team=pvpMatchTeamAtual();
  if(!pvpMatchTeamValido(team,stage)){
    alert("Seu time precisa ter 8 builds completos da mesma Stage escolhida para criar a sala. Use EDITAR TIME para corrigir.");
    return;
  }
  try{
    const data=await pvpMatchRequest("/api/rooms",{method:"POST",body:JSON.stringify({nick:nick,stage:stage,team:team})});
    pvpMatchRole="host";pvpMatchToken=data.token;pvpMatchRoomId=data.roomId;pvpMatchLocalMode=false;
    pvpMatchConectarSocket();
  }catch(erro){alert(erro.message||erro)}
}

async function pvpMatchEntrarSala(){
  const nick=pvpMatchNickValido();if(!nick)return;
  const code=String(document.getElementById("pvpMatchJoinCode")?.value||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
  if(code.length<4){alert("Digite um Room ID válido.");return}
  const team=pvpMatchTeamAtual();
  if(!team||!pvpTodosBuildsConcluidos()){alert("Conclua os 8 builds do seu time antes de entrar em uma Match.");return}
  try{
    const data=await pvpMatchRequest("/api/rooms/"+encodeURIComponent(code)+"/join",{method:"POST",body:JSON.stringify({nick:nick,team:team})});
    pvpMatchRole="guest";pvpMatchToken=data.token;pvpMatchRoomId=data.roomId;pvpMatchLocalMode=false;
    pvpMatchConectarSocket();
  }catch(erro){
    if(/stage/i.test(String(erro.message||"")))alert((erro.message||"")+"\n\nUse EDITAR TIME e monte um time da Stage exigida pela sala.");
    else alert(erro.message||erro);
  }
}

function pvpMatchWsUrl(){
  const base=pvpMatchApiBase();
  return base.replace(/^http/i,"ws")+"/api/rooms/"+encodeURIComponent(pvpMatchRoomId)+"/ws?token="+encodeURIComponent(pvpMatchToken);
}

function pvpMatchConectarSocket(){
  if(pvpMatchSocket){try{pvpMatchSocket.close()}catch(erro){}}
  pvpMatchTela("pvpMatchWaiting");
  pvpMatchSetConnection("offline");
  const ws=new WebSocket(pvpMatchWsUrl());
  pvpMatchSocket=ws;
  ws.onopen=function(){pvpMatchSetConnection("online")};
  ws.onmessage=function(event){
    let msg=null;try{msg=JSON.parse(event.data)}catch(erro){}
    if(!msg)return;
    if(msg.type==="room_state")pvpMatchReceberEstado(msg.state);
    if(msg.type==="error")alert(msg.message||"Erro na Challenge Room.");
  };
  ws.onclose=function(){if(!pvpMatchLocalMode)pvpMatchSetConnection("offline")};
  ws.onerror=function(){pvpMatchSetConnection("offline")};
}

function pvpMatchSend(type,payload){
  if(pvpMatchLocalMode){pvpMatchLocalAction(type,payload||{});return true}
  if(!pvpMatchSocket||pvpMatchSocket.readyState!==WebSocket.OPEN){alert("A conexão com a sala caiu. Tente entrar novamente.");return false}
  pvpMatchSocket.send(JSON.stringify({type:type,payload:payload||{}}));
  return true;
}

function pvpMatchReceberEstado(state){
  if(!state)return;
  pvpMatchRoomState=state;pvpMatchRoomId=state.roomId||pvpMatchRoomId;
  if(pvpBattlePendingAction&&state.battle&&Array.isArray(state.battle.turnOrder)&&state.battle.turnOrder.length){
    const currentId=state.battle.turnOrder[(Number(state.battle.turnIndex)||0)%state.battle.turnOrder.length];
    if(currentId!==pvpBattlePendingAction.unitId)pvpBattlePendingAction=null;
  }
  pvpMatchRenderByPhase();
}

function pvpMatchRenderByPhase(){
  const state=pvpMatchRoomState;if(!state)return;
  if(state.phase==="lobby"){pvpMatchTela("pvpMatchWaiting");pvpMatchRenderWaiting();return}
  if(state.phase==="draft"){pvpMatchTela("pvpMatchDraft");pvpMatchRenderDraft();return}
  if(state.phase==="ban"){pvpMatchTela("pvpMatchBan");pvpMatchRenderBan();return}
  if(state.phase==="formation"){pvpMatchTela("pvpMatchFormation");pvpMatchRenderFormation();return}
  if(state.phase==="battle"||state.phase==="finished"){pvpMatchTela("pvpMatchBattle");pvpBattleEnsureState();pvpBattleRender();return}
}

function pvpMatchPlayer(role){return pvpMatchRoomState&&pvpMatchRoomState.players?pvpMatchRoomState.players[role]:null}
function pvpMatchOpponentRole(role){return role==="host"?"guest":"host"}

function pvpMatchRenderWaiting(){
  const state=pvpMatchRoomState||{};
  const host=state.players&&state.players.host;
  const guest=state.players&&state.players.guest;
  const room=document.getElementById("pvpMatchRoomCode");if(room)room.textContent=state.roomId||"------";
  const stage=document.getElementById("pvpMatchRoomStage");if(stage)stage.textContent=String(state.stage||"-").toUpperCase();
  function playerCard(id,p,label){
    const card=document.getElementById(id);if(!card)return;
    card.classList.toggle("ready",!!(p&&p.ready));
    const strong=card.querySelector("strong"),span=card.querySelector("span");
    if(strong)strong.textContent=p?p.nick:"AGUARDANDO...";
    if(span)span.textContent=p?(p.ready?"READY":label):label;
  }
  playerCard("pvpMatchHostCard",host,"HOST");playerCard("pvpMatchGuestCard",guest,"CHALLENGER");
  const invite=document.getElementById("pvpMatchInviteLink");
  if(invite){
    try{const u=new URL(window.location.href);u.searchParams.set("room",state.roomId||"");invite.value=u.toString()}catch(erro){invite.value=state.roomId||""}
  }
  const msg=document.getElementById("pvpMatchWaitingMessage");
  if(msg)msg.textContent=!guest?"Aguardando oponente...":(host.ready&&guest.ready?"Iniciando Draft...":"Os dois jogadores precisam marcar READY.");
  const me=state.players&&state.players[pvpMatchLocalMode?pvpMatchLocalRole:pvpMatchRole];
  const btn=document.getElementById("pvpMatchReadyBtn");
  if(btn){btn.disabled=!guest;btn.textContent=me&&me.ready?"✓ READY":"READY";btn.classList.toggle("done",!!(me&&me.ready))}
}

function pvpMatchCopiarConvite(){
  const input=document.getElementById("pvpMatchInviteLink");if(!input)return;
  if(navigator.clipboard&&window.isSecureContext)navigator.clipboard.writeText(input.value).then(function(){alert("Link da Challenge Room copiado!")});
  else{input.select();document.execCommand("copy");alert("Link da Challenge Room copiado!")}
}

function pvpMatchToggleReady(){pvpMatchSend("ready",{})}

function pvpMatchSairSala(silencioso){
  if(pvpMatchSocket){try{pvpMatchSocket.close()}catch(erro){}pvpMatchSocket=null}
  if(pvpBattleAutoTimer){clearInterval(pvpBattleAutoTimer);pvpBattleAutoTimer=null}
  pvpBattleAutoBusy=false;pvpBattleIntentByUnit=Object.create(null);pvpBattleSelectedTarget=null;pvpBattlePendingAction=null;pvpBattleSubMode="manual";
  pvpMatchRoomState=null;pvpMatchRole=null;pvpMatchToken="";pvpMatchRoomId="";pvpMatchLocalMode=false;pvpMatchLocalRole="host";
  pvpMatchSetConnection("offline");
  if(!silencioso){pvpMatchTela("pvpMatchLobby");pvpMatchAtualizarTeamCheck()}
  try{const u=new URL(window.location.href);u.searchParams.delete("room");history.replaceState({},"",u.toString())}catch(erro){}
}

function pvpMatchSlotsDoTeam(team){
  return (team&&Array.isArray(team.slots)?team.slots:[]).filter(function(s){return s&&s.did&&s.build&&s.build.complete});
}

function pvpMatchSlotByDid(team,did){return pvpMatchSlotsDoTeam(team).find(function(s){return Number(s.did)===Number(did)})||null}
function pvpMatchDigi(did){return pvpDatabase.find(function(d){return Number(d.did)===Number(did)})||null}

function pvpMatchFinalStats(slot){
  const digi=slot?pvpMatchDigi(slot.did):null;
  const build=slot&&slot.build?slot.build:null;
  if(!digi||!build)return null;
  const out={};
  PVP_BUILD_STATS.forEach(function(stat){
    const base=Number(pvpGetBaseStat(digi,stat))||0;
    const pvpHp=stat==="HP"?Math.floor(base*.5):0;
    const babyPct=Number(build.baby&&build.baby[stat]||0);
    const tetrisPct=Number(build.tetris&&build.tetris[stat]||0)*3;
    const baby=babyPct>0?Math.ceil(base*babyPct/100):0;
    const tetris=tetrisPct>0?Math.ceil(base*tetrisPct/100):0;
    const deck=Number(build.buff&&build.buff[stat]||0);
    out[stat]=base+pvpHp+baby+tetris+deck;
  });
  return out;
}

function pvpMatchHoverCard(slot){
  const digi=pvpMatchDigi(slot.did);const stats=pvpMatchFinalStats(slot);if(!digi||!stats)return "";
  const skills=(digi.skills||[]).slice(0,3).map(function(skill){
    const scope=String(skill.scope||"").toUpperCase();
    const tags=[];if(scope.includes("RANGED"))tags.push("RANGED");if(scope.includes("MELEE"))tags.push("MELEE");if(skill.cc==="YES")tags.push("CC");if(skill.dot==="YES")tags.push("DOT");if(skill.defBreak==="YES")tags.push("DEF BREAK");
    return '<div class="pvp-draft-hover-skill">'+(skill.icon?'<img src="'+skill.icon+'" alt="">':'<span></span>')+'<div><strong>'+pvpEscapeHtml(skill.name)+'</strong><small>'+pvpEscapeHtml(skill.attribute||"-")+' · '+pvpEscapeHtml(skill.scope||"-")+'</small></div><em>'+pvpEscapeHtml(tags.join(" · ")||"SKILL")+'</em></div>';
  }).join("");
  return '<div class="pvp-draft-hover"><div class="pvp-draft-hover-head"><img src="'+digi.icon+'" alt=""><div><strong>'+pvpEscapeHtml(digi.name)+'</strong><small>'+pvpEscapeHtml(digi.stage.toUpperCase())+' · LV. '+digi.level+' · '+pvpEscapeHtml(digi.attribute)+'</small></div></div><div class="pvp-draft-hover-stats">'+["HP","SP","STR","INT","DEF","RES","SPD"].map(function(k){return '<div>'+k+'<b>'+formatarStatusSimulator(stats[k])+'</b></div>'}).join('')+'</div><div class="pvp-draft-hover-skills">'+skills+'</div></div>';
}

function pvpMatchPickBoxes(role){
  const state=pvpMatchRoomState;const picks=state.draft&&state.draft.picks&&state.draft.picks[role]||[];
  const current=pvpMatchDraftCurrentRole();
  const nextOpenIndex=picks.length;
  let html="";
  for(let i=0;i<4;i++){
    const did=picks[i],d=pvpMatchDigi(did);
    const activeSlot=!d&&role===current&&i===nextOpenIndex;
    html+='<div class="pvp-draft-pick '+(!d?'empty ':'')+(activeSlot?'active-pick-slot':'')+'">'+(d?'<img src="'+d.icon+'" alt=""><b>'+pvpEscapeHtml(d.name)+'</b>':'')+'</div>';
  }
  return html;
}

function pvpMatchDraftCurrentRole(){
  const d=pvpMatchRoomState&&pvpMatchRoomState.draft;if(!d)return null;
  const block=PVP_MATCH_DRAFT_BLOCKS[Number(d.blockIndex)||0];return block?block.role:null;
}

function pvpMatchRenderDraft(){
  const state=pvpMatchRoomState;const draft=state.draft||{};
  const host=state.players.host,guest=state.players.guest;
  document.getElementById("pvpDraftHostName").textContent=host.nick;
  document.getElementById("pvpDraftGuestName").textContent=guest.nick;
  document.getElementById("pvpDraftHostPicks").innerHTML=pvpMatchPickBoxes("host");
  document.getElementById("pvpDraftGuestPicks").innerHTML=pvpMatchPickBoxes("guest");
  document.getElementById("pvpDraftStage").textContent=String(state.stage).toUpperCase();
  const current=pvpMatchDraftCurrentRole();
  const currentPlayer=state.players[current];
  const remaining=Number(draft.blockRemaining||0);
  const instruction=document.getElementById("pvpDraftInstruction");
  if(instruction)instruction.textContent=currentPlayer?currentPlayer.nick+" escolhe "+remaining+" Digimon"+(remaining!==1?"s":"")+".":"Finalizando picks...";

  const ownRole=pvpMatchLocalMode?pvpMatchLocalRole:pvpMatchRole;
  const own=state.players[ownRole];const grid=document.getElementById("pvpDraftRosterGrid");if(!own||!grid)return;
  const ownPicks=new Set((draft.picks&&draft.picks[ownRole]||[]).map(Number));
  const canPick=pvpMatchLocalMode||current===ownRole;
  grid.innerHTML=pvpMatchSlotsDoTeam(own.team).map(function(slot){
    const d=pvpMatchDigi(slot.did),used=ownPicks.has(Number(slot.did));
    if(!d)return "";
    return '<button type="button" class="pvp-draft-digi" '+((!canPick||used)?'disabled':'')+' onclick="pvpMatchEscolherPick('+Number(slot.did)+')"><img src="'+d.icon+'" alt=""><strong>'+pvpEscapeHtml(d.name)+'</strong><small>'+pvpEscapeHtml(d.stage.toUpperCase())+' · LV. '+d.level+'</small>'+pvpMatchHoverCard(slot)+'</button>';
  }).join("");
}

function pvpMatchEscolherPick(did){pvpMatchSend("pick",{did:Number(did)})}

function pvpMatchRenderBan(){
  const state=pvpMatchRoomState;const ownRole=pvpMatchLocalMode?pvpMatchLocalRole:pvpMatchRole;const opp=pvpMatchOpponentRole(ownRole);
  const myBan=state.bans&&state.bans[ownRole];const oppPicks=state.draft.picks[opp]||[];
  const grid=document.getElementById("pvpBanTargetGrid");
  grid.innerHTML=oppPicks.map(function(did){const d=pvpMatchDigi(did);return d?'<button type="button" class="pvp-ban-card" '+(myBan?'disabled':'')+' onclick="pvpMatchBanir('+Number(did)+')"><img src="'+d.icon+'" alt=""><strong>'+pvpEscapeHtml(d.name)+'</strong><small>'+pvpEscapeHtml(d.stage.toUpperCase())+' · '+pvpEscapeHtml(d.attribute)+'</small></button>':''}).join("");
  const status=document.getElementById("pvpBanStatus");
  if(status)status.textContent=myBan?"Seu ban foi confirmado. Aguardando o adversário...":"Escolha 1 dos 4 picks do adversário.";
  if(pvpMatchLocalMode&&state.bans.host&&!state.bans.guest){pvpMatchLocalRole="guest";setTimeout(pvpMatchRenderBan,0)}
  else if(pvpMatchLocalMode&&state.bans.guest&&!state.bans.host){pvpMatchLocalRole="host";setTimeout(pvpMatchRenderBan,0)}
}
function pvpMatchBanir(did){pvpMatchSend("ban",{did:Number(did)})}

function pvpMatchSurvivors(role){
  const state=pvpMatchRoomState;const bannedByOpp=state.bans&&state.bans[pvpMatchOpponentRole(role)];
  return (state.draft.picks[role]||[]).filter(function(did){return Number(did)!==Number(bannedByOpp)});
}

function pvpMatchRenderFormation(){
  const state=pvpMatchRoomState;let role=pvpMatchLocalMode?pvpMatchLocalRole:pvpMatchRole;
  if(pvpMatchLocalMode&&state.formations&&state.formations[role])role=pvpMatchOpponentRole(role);
  pvpMatchLocalRole=role;
  const player=state.players[role];const survivors=pvpMatchSurvivors(role);
  if(!pvpMatchFormationDraft[role]){
    pvpMatchFormationDraft[role]={};
    survivors.forEach(function(did,index){pvpMatchFormationDraft[role][did]=index<2?"F":"B"});
  }
  const grid=document.getElementById("pvpFormationGrid");
  grid.innerHTML=survivors.map(function(did){const d=pvpMatchDigi(did),pos=pvpMatchFormationDraft[role][did]||"F";return '<article class="pvp-formation-card"><img src="'+d.icon+'" alt=""><strong>'+pvpEscapeHtml(d.name)+'</strong><div class="pvp-position-toggle"><button type="button" class="'+(pos==='F'?'ativo':'')+'" onclick="pvpMatchSetPosition('+did+',\'F\')">F · FRONT</button><button type="button" class="'+(pos==='B'?'ativo':'')+'" onclick="pvpMatchSetPosition('+did+',\'B\')">B · BACK</button></div></article>'}).join("");
  const head=document.querySelector("#pvpMatchFormation .pvp-formation-head span");if(head)head.textContent=player.nick+": defina a posição dos 3 Digimons.";
  const btn=document.getElementById("pvpFormationConfirmBtn");if(btn)btn.disabled=!!(state.formations&&state.formations[role]);
}
function pvpMatchSetPosition(did,pos){
  const role=pvpMatchLocalMode?pvpMatchLocalRole:pvpMatchRole;if(!pvpMatchFormationDraft[role])pvpMatchFormationDraft[role]={};
  pvpMatchFormationDraft[role][Number(did)]=pos==="B"?"B":"F";pvpMatchRenderFormation();
}
function pvpMatchConfirmarFormacao(){
  const role=pvpMatchLocalMode?pvpMatchLocalRole:pvpMatchRole;const map=pvpMatchFormationDraft[role]||{};
  if(!Object.values(map).includes("F")){alert("Mantenha pelo menos 1 Digimon na Front.");return}
  pvpMatchSend("formation",{positions:map});
}

function pvpMatchIniciarTesteLocal(){
  const nick=pvpMatchNickValido();if(!nick)return;
  const stage=document.getElementById("pvpMatchCreateStage")?.value||pvpStageAtual;
  const team=pvpMatchTeamAtual();
  if(!pvpMatchTeamValido(team,stage)){alert("Para o teste local, conclua os 8 builds da Stage selecionada.");return}
  const clone=JSON.parse(JSON.stringify(team));
  pvpMatchLocalMode=true;pvpMatchLocalRole="host";pvpMatchRole="host";pvpMatchRoomId="LOCAL01";
  pvpMatchRoomState={
    roomId:"LOCAL01",stage:stage,phase:"lobby",
    players:{host:{nick:nick,team:team,ready:false},guest:{nick:"Rival",team:clone,ready:false}},
    draft:{picks:{host:[],guest:[]},blockIndex:0,blockRemaining:1},bans:{host:null,guest:null},formations:{host:null,guest:null},battle:null
  };
  pvpMatchSetConnection("local");pvpMatchRenderByPhase();
}

function pvpMatchLocalAction(type,payload){
  const s=pvpMatchRoomState;if(!s)return;
  let role=pvpMatchLocalRole;
  if(type==="ready"){
    s.players[role].ready=!s.players[role].ready;
    if(role==="host"&&!s.players.guest.ready){pvpMatchLocalRole="guest";s.players.guest.ready=true;pvpMatchLocalRole="host"}
    if(s.players.host.ready&&s.players.guest.ready){s.phase="draft";s.draft={picks:{host:[],guest:[]},blockIndex:0,blockRemaining:1};pvpMatchLocalRole="host"}
  }else if(type==="pick"&&s.phase==="draft"){
    const current=pvpMatchDraftCurrentRole();role=current;
    const picks=s.draft.picks[role];const did=Number(payload.did);
    if(!pvpMatchSlotByDid(s.players[role].team,did)||picks.includes(did))return;
    picks.push(did);s.draft.blockRemaining--;
    if(s.draft.blockRemaining<=0){s.draft.blockIndex++;const b=PVP_MATCH_DRAFT_BLOCKS[s.draft.blockIndex];if(b){s.draft.blockRemaining=b.count;pvpMatchLocalRole=b.role}else{s.phase="ban";pvpMatchLocalRole="host"}}
  }else if(type==="ban"&&s.phase==="ban"){
    role=pvpMatchLocalRole;const opp=pvpMatchOpponentRole(role);const did=Number(payload.did);
    if(!s.draft.picks[opp].includes(did)||s.bans[role])return;
    s.bans[role]=did;
    if(s.bans.host&&s.bans.guest){s.phase="formation";pvpMatchLocalRole="host";pvpMatchFormationDraft={}}
    else pvpMatchLocalRole=pvpMatchOpponentRole(role);
  }else if(type==="formation"&&s.phase==="formation"){
    role=pvpMatchLocalRole;s.formations[role]=payload.positions||{};
    if(s.formations.host&&s.formations.guest){s.phase="battle";s.battle=null;pvpMatchLocalRole="host"}
    else pvpMatchLocalRole=pvpMatchOpponentRole(role);
  }else if(type==="substitute"&&s.phase==="battle"){
    if(s.battle)pvpBattleApplySubstitutionState(s.battle,role,String(payload.outId||""),String(payload.inId||""));
  }else if(type==="deploy_replacement"&&s.phase==="battle"){
    if(s.battle)pvpBattleApplyForcedReplacementState(s.battle,role,String(payload.inId||""));
  }else if(type==="battle_update"){
    s.battle=payload.battle;s.phase=payload.battle&&payload.battle.winner?"finished":"battle";
  }
  pvpMatchReceberEstado(s);
}

function pvpBattleCreateUnit(role,slot,position,active){
  const digi=pvpMatchDigi(slot.did),stats=pvpMatchFinalStats(slot),crit=pvpCalcularCriticosCalibrados(slot.build,digi)||{};
  return {
    id:role+":"+slot.did,role:role,did:Number(slot.did),name:digi.name,icon:digi.icon,
    position:position||"B",active:!!active,alive:true,controlIndex:null,
    hp:stats.HP,maxHp:stats.HP,sp:stats.SP,maxSp:stats.SP,stats:stats,burst:0,
    status:{cc:null,dot:null,defBreak:null},tempBuffs:{},crit:crit
  };
}

function pvpBattleNormalizeStatus(status){
  status=status&&typeof status==="object"?status:{};
  if(!("cc" in status)){
    const oldStun=Number(status.stun)||0;
    status.cc=oldStun>0?{type:"Stun",turns:oldStun,icon:"",description:"Unable to act."}:null;
  }
  if(typeof status.dot==="number")status.dot=status.dot>0?{type:"DOT",turns:status.dot,icon:"",description:"Damage over time."}:null;
  if(typeof status.defBreak==="number")status.defBreak=status.defBreak>0?{type:"DEF Break",turns:status.defBreak,icon:"",description:"Defense reduced."}:null;
  delete status.stun;
  return status;
}

function pvpBattleNormalizeBattle(b){
  if(!b)return b;
  b.gauge=b.gauge||{host:1,guest:1};
  ["host","guest"].forEach(function(role){
    let g=Number(b.gauge[role]);if(!Number.isFinite(g))g=1;if(g>5)g=g/100;
    b.gauge[role]=Math.max(0,Math.min(PVP_BATTLE_GAUGE_MAX,g));
    const units=b.units&&b.units[role]||[];
    units.forEach(function(u){u.status=pvpBattleNormalizeStatus(u.status)});
    const active=units.filter(function(u){return u.active&&u.alive}).sort(function(a,c){
      const ai=Number.isFinite(Number(a.controlIndex))?Number(a.controlIndex):99;
      const ci=Number.isFinite(Number(c.controlIndex))?Number(c.controlIndex):99;
      return ai-ci;
    });
    active.forEach(function(u,index){if(!Number.isFinite(Number(u.controlIndex)))u.controlIndex=index});
  });
  b.subs=b.subs||{host:3,guest:3};
  b.turnSerial=Number(b.turnSerial)||0;
  if(!("preparedTurnSerial" in b))b.preparedTurnSerial=-1;
  if(!("pendingReplacement" in b))b.pendingReplacement=null;
  return b;
}

function pvpBattleEnsureState(){
  const room=pvpMatchRoomState;if(!room||room.phase!=="battle"&&room.phase!=="finished")return;
  if(room.battle){pvpBattleNormalizeBattle(room.battle);return}
  if(!pvpMatchLocalMode&&pvpMatchRole!=="host")return;
  const battle={round:1,gauge:{host:1,guest:1},subs:{host:3,guest:3},units:{host:[],guest:[]},turnOrder:[],turnIndex:0,turnSerial:0,preparedTurnSerial:-1,pendingReplacement:null,log:[],winner:null};
  ["host","guest"].forEach(function(role){
    const survivors=pvpMatchSurvivors(role),positions=room.formations[role]||{},survivorSet=new Set(survivors.map(Number));
    pvpMatchSlotsDoTeam(room.players[role].team).forEach(function(slot){
      const did=Number(slot.did),active=survivorSet.has(did),pos=active?(positions[did]||"B"):"B";
      const banned=Number(room.bans[pvpMatchOpponentRole(role)])===did;
      if(!banned)battle.units[role].push(pvpBattleCreateUnit(role,slot,pos,active));
    });
    survivors.forEach(function(did,index){
      const u=battle.units[role].find(function(x){return Number(x.did)===Number(did)});
      if(u)u.controlIndex=index;
    });
  });
  pvpBattleRebuildOrder(battle,true);
  battle.log.push({kind:"system",text:"[SYSTEM] Battle started · "+room.players.host.nick+" VS "+room.players.guest.nick+" · COMMAND FLOW"});
  room.battle=battle;
  if(!pvpMatchLocalMode)pvpMatchSend("battle_update",{battle:battle});
}

function pvpBattleActiveUnits(battle){return ["host","guest"].flatMap(function(role){return battle.units[role].filter(function(u){return u.active&&u.alive})})}
function pvpBattleUnitById(battle,id){return ["host","guest"].flatMap(function(r){return battle.units[r]}).find(function(u){return u.id===id})||null}
function pvpBattleRebuildOrder(battle,reset){
  const current=!reset&&battle.turnOrder&&battle.turnOrder[battle.turnIndex];
  battle.turnOrder=pvpBattleActiveUnits(battle).sort(function(a,b){return (b.stats.SPD-a.stats.SPD)||a.id.localeCompare(b.id)}).map(function(u){return u.id});
  if(current&&battle.turnOrder.includes(current))battle.turnIndex=battle.turnOrder.indexOf(current);else battle.turnIndex=0;
}
function pvpBattleCurrentUnit(){const b=pvpMatchRoomState&&pvpMatchRoomState.battle;if(!b||!b.turnOrder.length)return null;return pvpBattleUnitById(b,b.turnOrder[b.turnIndex%b.turnOrder.length])}
function pvpBattleMyRole(){return pvpMatchLocalMode?pvpMatchLocalRole:pvpMatchRole}
function pvpBattleCanAct(){const u=pvpBattleCurrentUnit();return !!u&&(pvpMatchLocalMode||u.role===pvpMatchRole)}
function pvpBattleUnitsByControl(role){
  const b=pvpMatchRoomState&&pvpMatchRoomState.battle;if(!b||!b.units||!b.units[role])return [];
  return b.units[role].filter(function(u){return u.active&&u.alive}).sort(function(a,c){
    const ai=Number.isFinite(Number(a.controlIndex))?Number(a.controlIndex):99,ci=Number.isFinite(Number(c.controlIndex))?Number(c.controlIndex):99;
    return ai-ci||String(a.id).localeCompare(String(c.id));
  });
}
function pvpBattleCurrentOwnedByMe(){const actor=pvpBattleCurrentUnit();return !!actor&&actor.role===pvpBattleMyRole()}
function pvpBattleSkillNeedsTarget(skill){return !!skill&&String(skill.appliesTo||"").toLowerCase()!=="self"&&Number.isFinite(Number(skill.baseTotal))}
function pvpBattleTargetCandidates(actor){return actor?pvpBattleUnitsByControl(pvpMatchOpponentRole(actor.role)):[]}
function pvpBattleTargetNumberForUnit(u){
  const actor=pvpBattleCurrentUnit();if(!actor||!pvpBattlePendingAction||actor.role!==pvpBattleMyRole()||u.role===actor.role)return 0;
  const i=pvpBattleTargetCandidates(actor).findIndex(function(x){return x.id===u.id});return i>=0?i+1:0;
}
function pvpBattleElementBadge(label,value,effect){
  const raw=String(value||"").trim();
  const kind=String(label||"").toUpperCase()==="STRONG"?"strong":"weak";
  const relation=raw
    ? hgRelationTooltipHtml(raw,effect||"",kind,pvpElementIconHtml(raw))
    : '<b>-</b>';
  return '<span class="pvp-target-asset-badge pvp-target-asset-'+kind+'"><small>'+pvpEscapeHtml(label)+'</small>'+relation+'</span>';
}
function pvpBattleTypeBadge(type){return '<span class="pvp-target-asset-badge pvp-target-asset-type"><small>TYPE</small>'+pvpTypeIconHtml(type||"UNKNOWN")+'</span>'}
function pvpBattleActionHintText(){
  const b=pvpMatchRoomState&&pvpMatchRoomState.battle,actor=pvpBattleCurrentUnit();if(!b||!actor)return "";
  if(b.pendingReplacement){const p=pvpMatchPlayer(b.pendingReplacement.role);return "DEPLOY // "+(p?p.nick:"PLAYER")+" ESCOLHE QUEM ENTRA"}
  if(actor.role!==pvpBattleMyRole()){const p=pvpMatchPlayer(actor.role);return "AGUARDANDO // "+(p?p.nick:"OPONENTE")+" SELECIONAR O MOVIMENTO"}
  if(pvpBattlePendingAction){
    const d=pvpMatchDigi(actor.did),skill=d&&(d.skills||[]).find(function(s){return Number(s.slot)===Number(pvpBattlePendingAction.slot)});
    const nums=pvpBattleTargetCandidates(actor).map(function(t,i){return skill&&pvpBattleTargetValid(actor,t,skill)?String(i+1):""}).filter(Boolean);
    return nums.length?"SELECT TARGET // "+nums.join(" · "):"SEM ALVO VÁLIDO";
  }
  const idx=Number.isFinite(Number(actor.controlIndex))?Number(actor.controlIndex):0;return "SELECT SKILL // "+pvpBattleSkillKeys(idx).split("").join(" · ");
}


function pvpBattleCcType(raw){return String(raw||"").split(",")[0].trim()||"CC"}
function pvpBattleStatusTurns(v){return v&&typeof v==="object"?Math.max(0,Number(v.turns)||0):Math.max(0,Number(v)||0)}
function pvpBattleEffectSummary(raw,fallback){
  const lines=String(raw||"").split(/\r?\n/).map(function(x){return x.trim()}).filter(Boolean);
  const clean=lines.filter(function(line){return !/Lv\d+/i.test(line)&&!/Higher activation rate/i.test(line)}).slice(0,3);
  return clean.join(" ")||fallback||"Status effect.";
}
function pvpBattleStatusSlug(type){
  const t=String(type||"").toLowerCase();
  if(t.includes("charm"))return "charm";
  if(t.includes("confusion"))return "confusion";
  if(t.includes("freeze"))return "freeze";
  if(t.includes("stun")||t.includes("paral"))return "stun";
  if(t.includes("seal")||t.includes("pressure")||t.includes("vacuum")||t.includes("isolation")||t.includes("panic")||t.includes("sleep")||t.includes("metall")||t.includes("submer")||t.includes("sniper"))return "stun";
  if(t.includes("def"))return "defbreak";
  if(t.includes("dot")||t.includes("bleed")||t.includes("curse")||t.includes("lacer")||t.includes("suffoc"))return "dot";
  return "cc";
}
function pvpBattleCcChaosKind(u){
  const cc=u&&u.status&&u.status.cc;if(!cc||pvpBattleStatusTurns(cc)<=0)return "";
  const slug=pvpBattleStatusSlug(cc.type);return slug==="charm"?"charm":slug==="confusion"?"confusion":"";
}
function pvpBattleCcBlocksCommands(u){return !!(u&&u.status&&u.status.cc&&pvpBattleStatusTurns(u.status.cc)>0)}
function pvpBattleCcSkipsTurn(u){return pvpBattleCcBlocksCommands(u)&&!pvpBattleCcChaosKind(u)}

function pvpBattleTargetValid(actor,target,skill){
  if(!actor||!target||!skill||!target.alive||!target.active||target.role===actor.role)return false;
  const scope=String(skill.scope||"").toUpperCase();
  if(scope.includes("RANGED"))return true;
  if(scope.includes("MELEE")){
    const fronts=pvpMatchRoomState.battle.units[target.role].filter(function(u){return u.active&&u.alive&&u.position==="F"});
    return target.position==="F"||fronts.length===0;
  }
  return true;
}
function pvpBattleTargetValidChaos(actor,target,skill,ally){
  if(!actor||!target||!skill||!target.alive||!target.active)return false;
  if(ally&&target.role!==actor.role)return false;
  if(!ally&&target.role===actor.role)return false;
  if(target.id===actor.id&&ally)return false;
  return true;
}
function pvpBattleSelectTarget(id){
  const battle=pvpMatchRoomState&&pvpMatchRoomState.battle;if(!battle)return;
  const u=pvpBattleUnitById(battle,id),me=pvpBattleMyRole();if(!u||!u.alive||!u.active||u.role===me)return;
  if(pvpBattlePendingAction){
    const actor=pvpBattleCurrentUnit(),d=actor&&pvpMatchDigi(actor.did),skill=d&&(d.skills||[]).find(function(s){return Number(s.slot)===Number(pvpBattlePendingAction.slot)});
    if(actor&&skill&&pvpBattleTargetValid(actor,u,skill)){pvpBattleResolveSelectedAction(u.id);return}
  }
  pvpBattleSelectedTarget=id;pvpBattleRenderTarget();pvpBattleRenderFields();
}

function pvpBattleDotName(skill,element){
  const raw=String(skill&&skill.attributeEffects||"");
  const wanted=String(element||"").trim().toLowerCase();
  for(const part of raw.split(";")){
    const m=part.match(/^\s*([^→:]+)\s*(?:→|:)\s*(.+?)\s*$/);
    if(m&&String(m[1]).trim().toLowerCase()===wanted)return String(m[2]).trim();
  }
  return "DOT";
}
function pvpBattleStatusItems(u){
  const s=u&&u.status||{},out=[];
  if(s.cc&&pvpBattleStatusTurns(s.cc)>0)out.push(s.cc);
  if(s.dot&&pvpBattleStatusTurns(s.dot)>0)out.push(s.dot);
  if(s.defBreak&&pvpBattleStatusTurns(s.defBreak)>0)out.push(s.defBreak);
  return out;
}
function pvpBattleStatusesHtml(u){
  return pvpBattleStatusItems(u).map(function(st){
    const slug=pvpBattleStatusSlug(st.type),turns=pvpBattleStatusTurns(st),tip=pvpEscapeHtml((st.type||"STATUS")+" · "+turns+" turno"+(turns===1?"":"s")+" restante"+(turns===1?"":"s")+". "+(st.description||""));
    return '<span class="pvp-status-icon status-'+slug+'" tabindex="0">'+(st.icon?'<img src="'+st.icon+'" alt="">':'<span class="pvp-status-fallback">'+(slug==="freeze"?'❄':slug==="charm"?'♥':slug==="confusion"?'?':slug==="stun"?'⚡':slug==="defbreak"?'↓':'✦')+'</span>')+'<b>'+turns+'</b><span class="pvp-status-tooltip">'+tip+'</span></span>';
  }).join("");
}
function pvpBattleUnitStatusClasses(u){return pvpBattleStatusItems(u).map(function(st){return "has-"+pvpBattleStatusSlug(st.type)}).join(" ")}
function pvpBattleUnitTooltip(u){
  const d=pvpMatchDigi(u.did);if(!d)return "";
  const statuses=pvpBattleStatusItems(u).map(function(st){return '<span>'+pvpEscapeHtml(st.type)+' '+pvpBattleStatusTurns(st)+'</span>'}).join("")||'<span>SEM STATUS</span>';
  return '<div class="pvp-unit-tooltip"><div class="pvp-unit-tooltip-head"><img src="'+u.icon+'" alt=""><div><strong>'+pvpEscapeHtml(u.name)+'</strong><small>'+pvpEscapeHtml(String(d.attribute||"-").toUpperCase())+' · '+u.position+'</small></div></div><div class="pvp-unit-tooltip-meta"><span>STRONG <b>'+pvpEscapeHtml(String(d.strong||"-"))+'</b></span><span>WEAK <b>'+pvpEscapeHtml(String(d.weak||"-"))+'</b></span><span>HP <b>'+Math.round(u.hp).toLocaleString("pt-BR")+'</b></span><span>SP <b>'+Math.round(u.sp).toLocaleString("pt-BR")+'</b></span></div><div class="pvp-unit-tooltip-statuses">'+statuses+'</div></div>';
}
function pvpBattleUnitHtml(u,current,targeted){
  const hp=Math.max(0,Math.min(100,u.hp/u.maxHp*100)),sp=Math.max(0,Math.min(100,u.sp/u.maxSp*100)),num=pvpBattleTargetNumberForUnit(u);
  let validTarget=false;
  if(num&&pvpBattlePendingAction){
    const actor=pvpBattleCurrentUnit(),d=actor&&pvpMatchDigi(actor.did),skill=d&&(d.skills||[]).find(function(s){return Number(s.slot)===Number(pvpBattlePendingAction.slot)});
    validTarget=!!(actor&&skill&&pvpBattleTargetValid(actor,u,skill));
  }
  return '<div class="pvp-battle-unit '+(u.position==="F"?'front':'back')+' '+pvpBattleUnitStatusClasses(u)+(current?' current':'')+(targeted?' targeted':'')+'" onclick="pvpBattleSelectTarget(\''+u.id+'\')">'+
    (num&&validTarget?'<button type="button" class="pvp-target-number valid" onclick="event.stopPropagation();pvpBattleSelectTargetNumber('+num+')">'+num+'</button>':'')+
    '<div class="pvp-battle-unit-frame"><span class="pvp-battle-unit-pos">'+u.position+'</span><img src="'+u.icon+'" alt=""></div><strong class="pvp-battle-unit-name">'+pvpEscapeHtml(u.name)+'</strong>'+
    '<div class="pvp-battle-unit-hp"><i style="width:'+hp+'%"></i></div><div class="pvp-battle-unit-sp"><i style="width:'+sp+'%"></i></div><div class="pvp-battle-unit-status">'+pvpBattleStatusesHtml(u)+'</div></div>';
}

function pvpBattleRenderOpponentLabel(){
  const box=document.getElementById("pvpBattleOpponentLabel");
  if(!box||!pvpMatchRoomState||!pvpMatchRoomState.players)return;
  const me=pvpBattleMyRole(),enemy=pvpMatchOpponentRole(me),player=pvpMatchRoomState.players[enemy];
  box.innerHTML='<span>OPONENTE:</span><strong>'+pvpEscapeHtml(player&&player.nick?player.nick:"AGUARDANDO...")+'</strong>';
}
function pvpBattleRenderTarget(){
  const b=pvpMatchRoomState.battle,me=pvpBattleMyRole(),enemy=pvpMatchOpponentRole(me);
  let target=pvpBattleSelectedTarget?pvpBattleUnitById(b,pvpBattleSelectedTarget):null;
  if(!target||!target.active||!target.alive||target.role!==enemy)target=pvpBattleUnitsByControl(enemy)[0]||null;
  if(target)pvpBattleSelectedTarget=target.id;
  const box=document.getElementById("pvpBattleTarget");if(!box)return;if(!target){box.innerHTML="";return}
  const pct=Math.max(0,target.hp/target.maxHp*100),d=pvpMatchDigi(target.did)||{};
  box.innerHTML='<div class="pvp-target-top"><div class="pvp-target-copy"><div class="pvp-target-name-line">'+pvpTypeIconHtml(d.attribute||"UNKNOWN")+'<strong>'+pvpEscapeHtml(target.name)+'</strong></div><small>'+target.position+' · '+pvpEscapeHtml(pvpMatchRoomState.players[target.role].nick)+'</small></div></div>'+
    '<div class="pvp-target-meta pvp-target-meta-assets">'+pvpBattleElementBadge("STRONG",d.strong,d.strongEffect)+pvpBattleElementBadge("WEAK",d.weak,d.weakEffect)+'</div>'+
    '<div class="pvp-target-hpbar"><i style="width:'+pct+'%"></i></div><div class="pvp-target-hp-number">'+Math.max(0,Math.round(target.hp)).toLocaleString("pt-BR")+' / '+Math.round(target.maxHp).toLocaleString("pt-BR")+'</div><div class="pvp-target-debuffs">'+pvpBattleStatusesHtml(target)+'</div>';
}

function pvpBattleFieldRows(units,current){
  function row(pos){return '<div class="pvp-battle-row '+(pos==="F"?'front-row':'back-row')+'">'+units.filter(function(u){return u.position===pos}).map(function(u){return pvpBattleUnitHtml(u,current&&u.id===current.id,pvpBattleSelectedTarget===u.id)}).join("")+'</div>'}
  return row("F")+row("B");
}
function pvpBattleRenderFields(){
  const b=pvpMatchRoomState.battle,me=pvpBattleMyRole(),enemy=pvpMatchOpponentRole(me),current=pvpBattleCurrentUnit(),own=document.getElementById("pvpBattleOwnField"),opp=document.getElementById("pvpBattleEnemyField");
  if(own)own.innerHTML=pvpBattleFieldRows(pvpBattleUnitsByControl(me),current);
  if(opp)opp.innerHTML=pvpBattleFieldRows(pvpBattleUnitsByControl(enemy),current);
}

function pvpBattleQueuePreview(b,count){
  const active=b.turnOrder.filter(function(id){const u=pvpBattleUnitById(b,id);return u&&u.alive&&u.active});if(!active.length)return[];
  const out=[];for(let i=0;i<count;i++)out.push(active[(b.turnIndex+i)%active.length]);return out;
}
function pvpBattleRenderTurnQueue(){
  const b=pvpMatchRoomState.battle,me=pvpBattleMyRole(),box=document.getElementById("pvpTurnQueue");if(!box)return;
  box.innerHTML=pvpBattleQueuePreview(b,6).map(function(id,index){const u=pvpBattleUnitById(b,id);return '<div class="pvp-turn-item '+(u.role===me?'own':'enemy')+(index===0?' current-turn':'')+'"><img src="'+u.icon+'" alt=""><span>'+pvpEscapeHtml(u.name)+'</span></div>'}).join("");
}

function pvpBattleSkillKeys(index){return ["QWER","ASDF","ZXCV"][index]||"QWER"}
function pvpBattleSkillTooltip(skill,slot,isBurst){
  const element=pvpBattleElementForSkill(slot,skill),build=slot&&slot.build||{},boost=Number(build.attrBoost&&build.attrBoost[element]||0),dmg=pvpSkillDamage(skill,element,boost,isBurst?3:1),effects=[];
  if(skill.cc==="YES")effects.push(pvpBattleCcType(skill.ccType));if(skill.dot==="YES")effects.push("DOT");if(skill.defBreak==="YES")effects.push("DEF BREAK");
  const desc=pvpBattleEffectSummary(skill.effectRaw,skill.description||""),conversions=(Array.isArray(skill.conversions)?skill.conversions:[]).map(function(e){return '<span class="pvp-tooltip-element">'+pvpElementIconHtml(e)+'</span>'}).join("");
  const costHp=Number(skill.costHp)||0,costSp=Number(skill.costSp)||0,hits=Number(skill.hits)||1,damageLine=dmg&&dmg.available?calcFormatar(dmg.total)+"%":(skill.damageText||"-");
  return '<span class="pvp-skill-tooltip pvp-skill-tooltip-v4"><span class="pvp-skill-tooltip-title"><span><small>LV.10</small><strong>'+pvpEscapeHtml((isBurst?"BURST · ":"")+skill.name)+'</strong></span><b>'+pvpEscapeHtml(element)+'</b></span>'+
    '<span class="pvp-skill-tooltip-grid"><span><i>Consumed HP</i><b>'+costHp.toLocaleString("pt-BR")+'</b></span><span><i>Consumed SP</i><b>'+costSp.toLocaleString("pt-BR")+'</b></span><span><i>Skill Type</i><b>'+pvpEscapeHtml(skill.skillType||"Attack")+'</b></span><span><i>Number of Attacks</i><b>'+hits+'</b></span><span><i>Damage</i><b>'+pvpEscapeHtml(damageLine)+'</b></span><span><i>Applies To</i><b>'+pvpEscapeHtml(skill.appliesTo||"Enemy")+'</b></span><span class="wide"><i>Scope</i><b>'+pvpEscapeHtml(skill.scope||"-")+'</b></span></span>'+
    (effects.length?'<span class="pvp-skill-tooltip-effects">'+effects.map(function(x){return '<em>'+pvpEscapeHtml(x)+'</em>'}).join("")+'</span>':'')+'<p>'+pvpEscapeHtml(desc||skill.description||"")+'</p>'+
    (conversions?'<span class="pvp-skill-tooltip-conversions"><i>Convertible Attributes</i><span>'+conversions+'</span></span>':'')+'</span>';
}
function pvpBattleIntentForUnit(u,skills){
  let intent=pvpBattleIntentByUnit[u.id];
  if(!intent||!skills.some(function(s){return Number(s.slot)===Number(intent.slot)})){
    intent={slot:skills[0]?Number(skills[0].slot):1,burst:false};pvpBattleIntentByUnit[u.id]=intent;
  }
  return intent;
}
function pvpBattleSelectSkill(did,slotNo,isBurst){
  const b=pvpMatchRoomState&&pvpMatchRoomState.battle,me=pvpBattleMyRole(),actor=pvpBattleCurrentUnit();if(!b||!actor||b.pendingReplacement||actor.role!==me||Number(actor.did)!==Number(did)||pvpBattleCcBlocksCommands(actor))return;
  const d=pvpMatchDigi(actor.did),slot=pvpMatchSlotByDid(pvpMatchRoomState.players[me].team,actor.did),skill=(d.skills||[]).find(function(x){return Number(x.slot)===Number(slotNo)});if(!skill)return;
  if(isBurst&&actor.burst<5)return;if(actor.sp<(Number(skill.costSp)||0))return;
  pvpBattlePendingAction={unitId:actor.id,slot:Number(slotNo),burst:!!isBurst};pvpBattleSelectedTarget=null;
  if(!pvpBattleSkillNeedsTarget(skill)){pvpBattleResolveSelectedAction(null);return}
  pvpBattleRenderSkills();pvpBattleRenderFields();pvpBattleRenderControls();
}
function pvpBattleRenderSkills(){
  const b=pvpMatchRoomState.battle,me=pvpBattleMyRole(),actor=pvpBattleCurrentUnit(),box=document.getElementById("pvpBattleSkills");if(!box)return;
  const active=pvpBattleUnitsByControl(me);
  box.innerHTML=active.map(function(u,index){
    const slot=pvpMatchSlotByDid(pvpMatchRoomState.players[me].team,u.did),d=pvpMatchDigi(u.did),build=slot&&slot.build||{},keys=pvpBattleSkillKeys(Number.isFinite(Number(u.controlIndex))?Number(u.controlIndex):index),skills=(d.skills||[]).slice(0,3),burstSkill=skills.find(function(s){return Number(s.slot)===Number(build.burstSkill)})||skills[0];
    const isCurrent=!!actor&&actor.id===u.id&&actor.role===me&&!b.pendingReplacement,blocked=pvpBattleCcBlocksCommands(u),pending=pvpBattlePendingAction&&pvpBattlePendingAction.unitId===u.id?pvpBattlePendingAction:null;
    const buttons=skills.map(function(skill,i){const cost=Number(skill.costSp)||0,locked=!isCurrent||blocked||u.sp<cost,selected=!!pending&&!pending.burst&&Number(pending.slot)===Number(skill.slot);
      return '<button type="button" class="pvp-hud-skill '+(selected?'selected ':'')+(locked?'locked':'')+'" '+(locked?'disabled':'')+' onclick="pvpBattleSelectSkill('+u.did+','+skill.slot+',false)"><img src="'+(skill.icon||'')+'" alt=""><span class="pvp-hud-skill-key">'+keys[i]+'</span>'+pvpBattleSkillTooltip(skill,slot,false)+'</button>'}).join("");
    const burstCost=burstSkill?Number(burstSkill.costSp)||0:0,burstReady=u.burst>=5,burstLocked=!isCurrent||blocked||!burstReady||u.sp<burstCost,burstSelected=!!pending&&pending.burst&&Number(pending.slot)===Number(burstSkill&&burstSkill.slot);
    const burst='<button type="button" class="pvp-hud-skill burst '+(burstReady?'ready ':'')+(burstSelected?'selected ':'')+(burstLocked?'locked':'')+'" '+(burstLocked?'disabled':'')+' onclick="pvpBattleSelectSkill('+u.did+','+(burstSkill?burstSkill.slot:1)+',true)">'+(burstSkill&&burstSkill.icon?'<img src="'+burstSkill.icon+'" alt="">':'')+'<span class="pvp-hud-skill-key">'+keys[3]+'</span><span class="pvp-burst-charge">'+(burstReady?'READY':u.burst+'/5')+'</span>'+(burstSkill?pvpBattleSkillTooltip(burstSkill,slot,true):'')+'</button>';
    return '<article class="pvp-hud-digi '+(isCurrent?'current ':'')+(!isCurrent?'not-current ':'')+(blocked?'status-locked':'')+'"><div class="pvp-hud-digi-top"><img src="'+u.icon+'" alt=""><div><strong>'+pvpEscapeHtml(u.name)+'</strong><small>HP '+Math.max(0,Math.round(u.hp)).toLocaleString("pt-BR")+' · SP '+Math.max(0,Math.round(u.sp)).toLocaleString("pt-BR")+'</small></div><div class="pvp-hud-mini-status">'+pvpBattleStatusesHtml(u)+'</div></div><div class="pvp-hud-skill-row">'+buttons+burst+'</div></article>';
  }).join("");
}

function pvpBattleLogColorize(text){
  const b=pvpMatchRoomState&&pvpMatchRoomState.battle,me=pvpBattleMyRole();
  let raw=String(text||"");
  if(!b||!b.units)return pvpEscapeHtml(raw);
  const tokens=[];
  function mark(role,cls){
    (b.units[role]||[]).map(function(u){return String(u&&u.name||"").trim()}).filter(Boolean).sort(function(a,c){return c.length-a.length}).forEach(function(name){
      const token="@@HGLOG"+tokens.length+"@@";
      const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
      const re=new RegExp(escaped,"g");
      if(raw.indexOf(name)!==-1){
        raw=raw.replace(re,token);
        tokens.push({token:token,html:'<span class="'+cls+'">'+pvpEscapeHtml(name)+'</span>'});
      }
    });
  }
  mark(me,"ally-name");
  mark(pvpMatchOpponentRole(me),"enemy-name");
  let html=pvpEscapeHtml(raw);
  tokens.forEach(function(item){html=html.split(item.token).join(item.html)});
  return html;
}
function pvpBattleRenderLog(){
  const b=pvpMatchRoomState.battle,box=document.getElementById("pvpBattleLogLines");if(!box)return;
  box.innerHTML=(b.log||[]).slice(-80).map(function(line){return '<div class="pvp-log-line">'+pvpBattleLogColorize(line.text||"").replace(/\[(CRITICAL)\]/g,'<span class="crit">[$1]</span>').replace(/\[(SYSTEM)\]/g,'<span class="system">[$1]</span>')+'</div>'}).join("");
  box.scrollTop=box.scrollHeight;const round=document.getElementById("pvpBattleRoundLabel");if(round)round.textContent="ROUND "+(b.round||1);
}
function pvpBattleRenderGauge(gauge){
  const box=document.getElementById("pvpBattleGaugeSegments"),txt=document.getElementById("pvpBattleGaugeText");if(!box)return;
  const g=Math.max(0,Math.min(PVP_BATTLE_GAUGE_MAX,Number(gauge)||0));
  box.innerHTML=Array.from({length:5},function(_,i){
    const fill=Math.max(0,Math.min(1,g-i)),pct=Math.round(fill*100),state=fill>=1?"full":fill>0?"partial":"empty";
    return '<span class="pvp-gauge-segment '+state+'"><i style="--gauge-fill:'+pct+'%"></i></span>';
  }).join("");
  if(txt)txt.textContent=g.toFixed(2).replace('.',',')+' / 5';
}
function pvpBattleSurrender(){
  const room=pvpMatchRoomState,b=room&&room.battle;if(!room||!b||b.winner)return;
  const me=pvpBattleMyRole(),player=room.players&&room.players[me];
  if(!confirm((player&&player.nick?player.nick:"Você")+", deseja realmente desistir da partida? O oponente será declarado vencedor."))return;
  if(pvpMatchLocalMode){
    b.winner=pvpMatchOpponentRole(me);
    b.surrenderedBy=me;
    pvpBattleLog((player&&player.nick?player.nick:"Player")+" surrendered the match.");
    room.phase="finished";pvpBattleRender();return;
  }
  pvpMatchSend("surrender",{});
}

function pvpBattleRenderControls(){
  const b=pvpMatchRoomState.battle,me=pvpBattleMyRole(),gauge=Math.max(0,Number(b.gauge[me]||0));pvpBattleRenderGauge(gauge);
  const count=document.getElementById("pvpSubstitutionCount");if(count)count.textContent=b.subs[me]+"/3";
  const standby=(b.units[me]||[]).some(function(u){return !u.active&&u.alive}),sub=document.getElementById("pvpSubstitutionBtn");if(sub)sub.disabled=!!b.pendingReplacement||b.subs[me]<=0||gauge<1||!standby;
  const hint=document.getElementById("pvpBattleActionHint");if(hint)hint.textContent=pvpBattleActionHintText();
  const surrender=document.getElementById("pvpSurrenderBtn");if(surrender)surrender.disabled=!!b.winner;
  const hud=document.getElementById("pvpBattleHud");if(hud)hud.classList.toggle("waiting-turn",!pvpBattleCurrentOwnedByMe());
}
function pvpBattleRender(){
  const room=pvpMatchRoomState;if(!room||!room.battle)return;pvpBattleNormalizeBattle(room.battle);
  pvpBattleRenderOpponentLabel();pvpBattleRenderTarget();pvpBattleRenderFields();pvpBattleRenderTurnQueue();pvpBattleRenderSkills();pvpBattleRenderLog();pvpBattleRenderControls();
  if(room.battle.pendingReplacement&&room.battle.pendingReplacement.role===pvpBattleMyRole())pvpBattleAbrirReposicaoObrigatoria();
  if(room.battle.winner){const winner=room.players[room.battle.winner],target=document.getElementById("pvpBattleTarget");if(target)target.innerHTML='<div style="text-align:center;padding:8px"><strong style="font-size:18px;color:#ffd65b">'+pvpEscapeHtml(winner.nick)+' WINS!</strong><div style="font-size:9px;color:#8db0cf;margin-top:4px">CHALLENGE ROOM ALPHA V4</div></div>';return}
  setTimeout(pvpBattlePrepareCurrentTurn,0);
}

function pvpBattleSelectedTargetForSkill(actor,skill){
  const b=pvpMatchRoomState.battle;let target=pvpBattleSelectedTarget?pvpBattleUnitById(b,pvpBattleSelectedTarget):null;
  if(!pvpBattleTargetValid(actor,target,skill)){
    const candidates=b.units[pvpMatchOpponentRole(actor.role)].filter(function(u){return pvpBattleTargetValid(actor,u,skill)}).sort(function(a,b){return (a.position==="F"?-1:1)-(b.position==="F"?-1:1)});
    target=candidates[0]||null;
  }
  return target;
}
function pvpBattleRandom(min,max){return min+Math.random()*(max-min)}
function pvpBattleElementForSkill(slot,skill){return slot&&slot.build&&slot.build.skillElements&&slot.build.skillElements["F"+skill.slot]||skill.attribute||"PHYSICAL"}
function pvpBattleComputeDamage(actor,target,slot,skill,isBurst){
  const element=pvpBattleElementForSkill(slot,skill),boost=Number(slot.build.attrBoost&&slot.build.attrBoost[element]||0),dmgInfo=pvpSkillDamage(skill,element,boost,isBurst?3:1);
  if(!dmgInfo.available)return {damage:0,crit:false,element:element};
  const useStr=String(element).toUpperCase()==="PHYSICAL";let offense=useStr?actor.stats.STR:actor.stats.INT,defense=useStr?target.stats.DEF:target.stats.RES;
  Object.keys(actor.tempBuffs||{}).forEach(function(k){const bf=actor.tempBuffs[k];if(bf&&bf.turns>0&&k===(useStr?"STR":"INT"))offense*=1+Number(bf.pct||0)/100});
  if(pvpBattleStatusTurns(target.status.defBreak)>0)defense*=.80;
  Object.keys(target.tempBuffs||{}).forEach(function(k){const bf=target.tempBuffs[k];if(bf&&bf.turns>0&&k===(useStr?"DEF":"RES"))defense*=1+Number(bf.pct||0)/100});
  const raw=offense*(dmgInfo.total/100),mitigation=offense/(offense+Math.max(1,defense)*.72);let damage=raw*mitigation;
  const rangeMin=Number(actor.crit.damageRangeMin||95),rangeMax=Number(actor.crit.damageRangeMax||105);damage*=pvpBattleRandom(rangeMin,rangeMax)/100;
  const critChance=Math.max(3,Math.min(70,Number(actor.crit.critRate||0)-Number(target.crit.critDown||0))),crit=Math.random()*100<critChance;
  if(crit)damage*=Math.max(1,Number(actor.crit.critDmg||175)/100);
  const targetSlot=pvpMatchSlotByDid(pvpMatchRoomState.players[target.role].team,target.did),reduce=Number(targetSlot&&targetSlot.build&&targetSlot.build.attrReduce&&targetSlot.build.attrReduce[element]||0);damage*=Math.max(.15,1-reduce/100);
  let ratio=damage/target.maxHp;if(ratio>.45)ratio=.45+(ratio-.45)*.35;ratio=Math.min(.72,ratio);damage=Math.max(1,Math.round(target.maxHp*ratio));
  return {damage:damage,crit:crit,element:element};
}
function pvpBattleApplyEffects(actor,target,skill,element){
  if(!target)return;
  const resist=Math.max(0,Math.min(80,(Number(target.crit.abnormalResistMin||0)+Number(target.crit.abnormalResistMax||0))/2)),baseChance=Number(skill.effectChance)||65,chance=Math.max(5,baseChance*(1-resist/100));
  if(skill.cc==="YES"&&Math.random()*100<chance){
    const type=pvpBattleCcType(skill.ccType);target.status.cc={type:type,turns:2,icon:skill.icon||"",description:pvpBattleEffectSummary(skill.effectRaw,type+" active.")};
  }
  if(skill.dot==="YES"&&Math.random()*100<chance){const type=pvpBattleDotName(skill,element);target.status.dot={type:type,turns:3,icon:skill.icon||"",description:pvpBattleEffectSummary(skill.effectRaw,"Damage over time.")}}
  if(skill.defBreak==="YES"&&Math.random()*100<chance)target.status.defBreak={type:"DEF Break",turns:3,icon:skill.icon||"",description:pvpBattleEffectSummary(skill.effectRaw,"Defense reduced.")};
}
function pvpBattleApplySelfEffect(actor,skill){const text=String(skill.effectRaw||""),m=text.match(/Increases\s+(STR|INT|DEF|RES|SPD)\s+by\s+(\d+(?:\.\d+)?)%/i);if(m)actor.tempBuffs[m[1].toUpperCase()]={pct:Number(m[2]),turns:3}}
function pvpBattleLog(text){const b=pvpMatchRoomState.battle;b.log.push({text:text});if(b.log.length>120)b.log=b.log.slice(-120)}
function pvpBattleImpact(damage,crit){const layer=document.getElementById("pvpBattleImpactLayer");if(!layer)return;const el=document.createElement("div");el.className="pvp-impact-number"+(crit?" crit":"");el.textContent=(crit?"CRITICAL ":"")+"-"+Math.round(damage).toLocaleString("pt-BR");layer.appendChild(el);setTimeout(function(){el.remove()},800)}
function pvpBattleTickActorStart(actor){if(pvpBattleStatusTurns(actor.status.dot)>0&&actor.alive){const dot=Math.max(1,Math.round(actor.maxHp*.04));actor.hp=Math.max(0,actor.hp-dot);pvpBattleLog(actor.name+" suffers "+dot.toLocaleString("pt-BR")+" "+(actor.status.dot.type||"DOT")+" damage.");if(actor.hp<=0)pvpBattleHandleDeath(actor)}}
function pvpBattleTickStatus(obj){if(obj&&typeof obj==="object"){obj.turns=Math.max(0,(Number(obj.turns)||0)-1);return obj.turns>0?obj:null}return null}
function pvpBattleTickActorEnd(actor){actor.status.cc=pvpBattleTickStatus(actor.status.cc);actor.status.dot=pvpBattleTickStatus(actor.status.dot);actor.status.defBreak=pvpBattleTickStatus(actor.status.defBreak);Object.keys(actor.tempBuffs||{}).forEach(function(k){if(actor.tempBuffs[k].turns>0)actor.tempBuffs[k].turns--})}
function pvpBattleHandleDeath(unit){
  const b=pvpMatchRoomState.battle;unit.hp=0;unit.alive=false;unit.active=false;pvpBattleIntentByUnit[unit.id]=null;
  const idx=Number.isFinite(Number(unit.controlIndex))?Number(unit.controlIndex):0,pos=unit.position||"B";unit.controlIndex=null;pvpBattleLog(unit.name+" was defeated.");pvpBattleCheckWinner();
  if(!b.winner&&(b.units[unit.role]||[]).some(function(u){return u.alive&&!u.active}))b.pendingReplacement={role:unit.role,deadId:unit.id,position:pos,controlIndex:idx};
  pvpBattleRebuildOrder(b,false);
}
function pvpBattleCheckWinner(){const b=pvpMatchRoomState.battle;["host","guest"].forEach(function(role){if(!b.units[role].some(function(u){return u.alive}))b.winner=pvpMatchOpponentRole(role)})}
function pvpBattleAdvanceTurn(actor,chargeBurst){
  const b=pvpMatchRoomState.battle;if(chargeBurst&&actor&&actor.alive)actor.burst=Math.min(5,actor.burst+1);if(actor)pvpBattleTickActorEnd(actor);
  ["host","guest"].forEach(function(role){b.gauge[role]=Math.min(PVP_BATTLE_GAUGE_MAX,Number(b.gauge[role]||0)+PVP_BATTLE_GAUGE_GAIN_PER_GLOBAL_TURN)});
  pvpBattleRebuildOrder(b,false);if(!b.turnOrder.length)return;
  const currentId=actor&&actor.id;let idx=b.turnOrder.indexOf(currentId);if(idx<0)idx=Math.max(-1,Number(b.turnIndex)||0);b.turnIndex=(idx+1)%b.turnOrder.length;if(b.turnIndex===0)b.round++;
  b.turnSerial=(Number(b.turnSerial)||0)+1;b.preparedTurnSerial=-1;pvpBattlePendingAction=null;pvpBattleSelectedTarget=null;
}
function pvpBattleAffordableSkills(actor){
  const d=pvpMatchDigi(actor.did),slot=pvpMatchSlotByDid(pvpMatchRoomState.players[actor.role].team,actor.did),skills=(d&&d.skills||[]).slice(0,3);
  return {slot:slot,skills:skills.filter(function(skill){return actor.sp>=(Number(skill.costSp)||0)&&Number.isFinite(Number(skill.baseTotal))})};
}
function pvpBattlePickChaosTarget(actor,skill,ally){const b=pvpMatchRoomState.battle,candidates=b.units[ally?actor.role:pvpMatchOpponentRole(actor.role)].filter(function(u){return pvpBattleTargetValidChaos(actor,u,skill,ally)});return candidates.length?candidates[Math.floor(Math.random()*candidates.length)]:null}
function pvpBattleResolveSkill(actor,skill,isBurst,targetOverride){
  const slot=pvpMatchSlotByDid(pvpMatchRoomState.players[actor.role].team,actor.did);if(!slot||!skill)return false;
  if(isBurst&&actor.burst<5)return false;const cost=Number(skill.costSp)||0;if(actor.sp<cost)return false;actor.sp=Math.max(0,actor.sp-cost);
  const self=String(skill.appliesTo||"").toLowerCase()==="self"||!Number.isFinite(Number(skill.baseTotal));
  if(self){pvpBattleApplySelfEffect(actor,skill);pvpBattleLog(actor.name+" uses ["+skill.name+"] on itself.")}
  else{
    const target=targetOverride||pvpBattleSelectedTargetForSkill(actor,skill);if(!target){actor.sp+=cost;return false}
    const result=pvpBattleComputeDamage(actor,target,slot,skill,isBurst);target.hp=Math.max(0,target.hp-result.damage);pvpBattleApplyEffects(actor,target,skill,result.element);
    pvpBattleLog(actor.name+" uses ["+skill.name+"] on "+target.name+" · "+result.damage.toLocaleString("pt-BR")+" damage"+(result.crit?" [CRITICAL]":"")+".");pvpBattleImpact(result.damage,result.crit);if(target.hp<=0)pvpBattleHandleDeath(target);
  }
  if(isBurst)actor.burst=0;return true;
}
function pvpBattlePrepareCurrentTurn(){
  const b=pvpMatchRoomState&&pvpMatchRoomState.battle,actor=pvpBattleCurrentUnit();if(!b||!actor||b.winner||b.pendingReplacement)return;
  if(!pvpMatchLocalMode&&actor.role!==pvpMatchRole)return;if(Number(b.preparedTurnSerial)===Number(b.turnSerial))return;
  b.preparedTurnSerial=Number(b.turnSerial);pvpBattleTickActorStart(actor);
  if(!actor.alive){pvpBattleAdvanceTurn(actor,false);pvpBattleCommit();return}
  if(pvpBattleCcSkipsTurn(actor)){const type=actor.status.cc&&actor.status.cc.type||"CC";pvpBattleLog(actor.name+" is affected by "+type+" and loses the turn. Burst Charge remains "+actor.burst+"/5.");pvpBattleAdvanceTurn(actor,false);pvpBattleCommit();return}
  const chaos=pvpBattleCcChaosKind(actor);
  if(chaos){
    const pack=pvpBattleAffordableSkills(actor),skills=pack.skills;if(!skills.length){pvpBattleLog(actor.name+" has no usable skill and loses the action.");pvpBattleAdvanceTurn(actor,true);pvpBattleCommit();return}
    const skill=skills[Math.floor(Math.random()*skills.length)],ally=chaos==="charm"?true:Math.random()<.5;let target=pvpBattlePickChaosTarget(actor,skill,ally);if(!target)target=pvpBattlePickChaosTarget(actor,skill,!ally);
    pvpBattleLog(actor.name+" is under "+(actor.status.cc.type||chaos)+" · automatic action.");pvpBattleResolveSkill(actor,skill,false,target);pvpBattleAdvanceTurn(actor,true);pvpBattleCheckWinner();pvpBattleCommit();return;
  }
  pvpBattleCommit();
}
function pvpBattleEnsureAutoLoop(){return}
function pvpBattleAutoTick(){return}

function pvpBattleResolveSelectedAction(targetId){
  const b=pvpMatchRoomState&&pvpMatchRoomState.battle,actor=pvpBattleCurrentUnit(),me=pvpBattleMyRole();if(!b||!actor||b.winner||b.pendingReplacement||actor.role!==me||!pvpBattlePendingAction||pvpBattlePendingAction.unitId!==actor.id)return;
  const d=pvpMatchDigi(actor.did),skill=d&&(d.skills||[]).find(function(s){return Number(s.slot)===Number(pvpBattlePendingAction.slot)});if(!skill)return;
  const target=targetId?pvpBattleUnitById(b,targetId):null;if(pvpBattleSkillNeedsTarget(skill)&&!pvpBattleTargetValid(actor,target,skill))return;
  if(!pvpBattleResolveSkill(actor,skill,!!pvpBattlePendingAction.burst,target))return;
  pvpBattleAdvanceTurn(actor,true);pvpBattleCheckWinner();pvpBattleCommit();
}
function pvpBattleSelectTargetNumber(number){
  const actor=pvpBattleCurrentUnit();if(!actor||!pvpBattlePendingAction)return;
  const target=pvpBattleTargetCandidates(actor)[Math.max(0,Number(number)-1)];if(target)pvpBattleSelectTarget(target.id);
}
function pvpBattleCommit(){
  const b=pvpMatchRoomState.battle;if(pvpMatchLocalMode)pvpMatchLocalRole=pvpBattleCurrentUnit()?pvpBattleCurrentUnit().role:pvpMatchLocalRole;
  pvpMatchSend("battle_update",{battle:b});pvpBattleRender();
}

function pvpBattleAbrirSubstituicao(){
  const b=pvpMatchRoomState&&pvpMatchRoomState.battle,me=pvpBattleMyRole();if(!b||b.winner||b.pendingReplacement)return;
  if(b.subs[me]<=0){alert("Você não possui substituições restantes.");return}if(Number(b.gauge[me]||0)<1){alert("É necessário 1 Gauge para substituir.");return}
  if(!(b.units[me]||[]).some(function(u){return !u.active&&u.alive})){alert("Nenhum Standby vivo disponível.");return}
  pvpBattleSubMode="manual";pvpBattleSubOut=null;pvpBattleSubIn=null;const overlay=document.getElementById("pvpSubstitutionOverlay");overlay.classList.add("aberto");overlay.setAttribute("aria-hidden","false");pvpBattleRenderSubstitution();
}
function pvpBattleAbrirReposicaoObrigatoria(){
  const b=pvpMatchRoomState&&pvpMatchRoomState.battle,me=pvpBattleMyRole();if(!b||!b.pendingReplacement||b.pendingReplacement.role!==me)return;
  pvpBattleSubMode="death";pvpBattleSubOut=b.pendingReplacement.deadId;pvpBattleSubIn=null;const overlay=document.getElementById("pvpSubstitutionOverlay");if(!overlay)return;
  overlay.classList.add("aberto");overlay.setAttribute("aria-hidden","false");pvpBattleRenderSubstitution();
}
function pvpBattleFecharSubstituicao(){
  if(pvpBattleSubMode==="death")return;const o=document.getElementById("pvpSubstitutionOverlay");if(o){o.classList.remove("aberto");o.setAttribute("aria-hidden","true")}
  pvpBattleSubOut=null;pvpBattleSubIn=null;pvpBattleSubMode="manual";
}
function pvpBattleRenderSubstitution(){
  const b=pvpMatchRoomState.battle,me=pvpBattleMyRole(),deploy=document.getElementById("pvpSubDeployGrid"),standby=document.getElementById("pvpSubStandbyGrid");if(!b||!deploy||!standby)return;
  const forced=pvpBattleSubMode==="death"&&b.pendingReplacement&&b.pendingReplacement.role===me,deadId=forced?b.pendingReplacement.deadId:null;
  function card(u,kind){
    const selected=(kind==="out"?pvpBattleSubOut:pvpBattleSubIn)===u.id,dead=!u.alive,disabled=dead||forced&&kind==="out",hpPct=Math.max(0,Math.min(100,(u.hp/u.maxHp)*100)),spPct=Math.max(0,Math.min(100,(u.sp/u.maxSp)*100));
    return '<button type="button" class="pvp-sub-card '+(selected?'selecionado ':'')+(dead?'morto ':'')+'" '+(disabled?'disabled':'')+' onclick="pvpBattleSelectSub(\''+kind+'\',\''+u.id+'\')"><img src="'+u.icon+'" alt=""><strong>'+pvpEscapeHtml(u.name)+'</strong><small>'+u.position+' · BURST '+u.burst+'/5</small><span class="pvp-sub-hp"><i style="width:'+hpPct+'%"></i><b>'+Math.max(0,Math.round(u.hp)).toLocaleString("pt-BR")+' / '+Math.round(u.maxHp).toLocaleString("pt-BR")+'</b></span><span class="pvp-sub-sp"><i style="width:'+spPct+'%"></i><b>'+Math.max(0,Math.round(u.sp)).toLocaleString("pt-BR")+' / '+Math.round(u.maxSp).toLocaleString("pt-BR")+'</b></span></button>';
  }
  let deployUnits=(b.units[me]||[]).filter(function(u){return u.active&&u.alive});
  if(forced){const dead=(b.units[me]||[]).find(function(u){return u.id===deadId});if(dead)deployUnits=deployUnits.concat([dead]).sort(function(a,c){const ai=a.id===deadId?b.pendingReplacement.controlIndex:Number(a.controlIndex),ci=c.id===deadId?b.pendingReplacement.controlIndex:Number(c.controlIndex);return ai-ci})}
  else deployUnits=deployUnits.sort(function(a,c){return Number(a.controlIndex)-Number(c.controlIndex)});
  deploy.innerHTML=deployUnits.map(function(u){return card(u,"out")}).join("");
  standby.innerHTML=(b.units[me]||[]).filter(function(u){return !u.active&&u.id!==deadId}).map(function(u){return card(u,"in")}).join("")||'<div class="pvp-sub-empty">Nenhum Standby disponível.</div>';
  const ks=document.getElementById("pvpSubModeKicker"),tt=document.getElementById("pvpSubModeTitle"),close=document.getElementById("pvpSubCloseBtn");if(ks)ks.textContent=forced?"DEPLOY DIGIMON":"SUBSTITUTION";if(tt)tt.textContent=forced?"ESCOLHA QUEM VAI ENTRAR":"TROCAR DIGIMON";if(close)close.style.display=forced?"none":"";
  const c=document.getElementById("pvpSubModalCount");if(c)c.textContent=b.subs[me]+"/3";const foot=document.getElementById("pvpSubFootText");if(foot)foot.innerHTML=forced?'Reposição obrigatória · <b>não consome Gauge nem substituição</b>':'Remaining Substitution Count <b>'+b.subs[me]+'/3</b> · Cost 1 Gauge';
  const btn=document.getElementById("pvpSubConfirmBtn");if(btn){btn.textContent=forced?"DEPLOY":"SUBSTITUIR";btn.disabled=forced?!pvpBattleSubIn:(!pvpBattleSubOut||!pvpBattleSubIn)}
}
function pvpBattleSelectSub(kind,id){if(pvpBattleSubMode==="death"&&kind==="out")return;if(kind==="out")pvpBattleSubOut=id;else pvpBattleSubIn=id;pvpBattleRenderSubstitution()}
function pvpBattleApplySubstitutionState(b,role,outId,inId){
  pvpBattleNormalizeBattle(b);const out=pvpBattleUnitById(b,outId),incoming=pvpBattleUnitById(b,inId);if(!out||!incoming||out.role!==role||incoming.role!==role||!out.active||!out.alive||incoming.active||!incoming.alive||b.subs[role]<=0||Number(b.gauge[role]||0)<1)return false;
  const currentId=b.turnOrder&&b.turnOrder[b.turnIndex],wasCurrent=currentId===out.id,pos=out.position,control=Number(out.controlIndex);out.active=false;out.controlIndex=null;incoming.active=true;incoming.position=pos;incoming.controlIndex=Number.isFinite(control)?control:0;b.subs[role]--;b.gauge[role]=Math.max(0,Number(b.gauge[role])-1);
  pvpBattleLog(out.name+" was substituted by "+incoming.name+". HP/SP and Burst Charge are preserved for "+out.name+".");pvpBattleRebuildOrder(b,false);if(wasCurrent&&b.turnOrder.includes(incoming.id)){b.turnIndex=b.turnOrder.indexOf(incoming.id);b.preparedTurnSerial=-1;pvpBattlePendingAction=null}else if(currentId&&b.turnOrder.includes(currentId))b.turnIndex=b.turnOrder.indexOf(currentId);return true;
}
function pvpBattleApplyForcedReplacementState(b,role,inId){
  pvpBattleNormalizeBattle(b);const pending=b.pendingReplacement;if(!pending||pending.role!==role)return false;const incoming=pvpBattleUnitById(b,inId);if(!incoming||incoming.role!==role||incoming.active||!incoming.alive)return false;
  const currentId=b.turnOrder&&b.turnOrder[b.turnIndex];incoming.active=true;incoming.position=pending.position||"B";incoming.controlIndex=Number.isFinite(Number(pending.controlIndex))?Number(pending.controlIndex):0;incoming.burst=0;b.pendingReplacement=null;pvpBattleLog(incoming.name+" enters the battle. Burst Charge starts at 0/5.");pvpBattleRebuildOrder(b,false);if(currentId&&b.turnOrder.includes(currentId))b.turnIndex=b.turnOrder.indexOf(currentId);return true;
}
function pvpBattleConfirmarSubstituicao(){
  const b=pvpMatchRoomState&&pvpMatchRoomState.battle,me=pvpBattleMyRole();if(!b||!pvpBattleSubIn)return;
  if(pvpBattleSubMode==="death"){const inId=pvpBattleSubIn,o=document.getElementById("pvpSubstitutionOverlay");if(o){o.classList.remove("aberto");o.setAttribute("aria-hidden","true")}pvpBattleSubIn=null;pvpBattleSubOut=null;pvpBattleSubMode="manual";pvpMatchSend("deploy_replacement",{inId:inId});return}
  if(!pvpBattleSubOut||b.subs[me]<=0||Number(b.gauge[me]||0)<1)return;const outId=pvpBattleSubOut,inId=pvpBattleSubIn;pvpBattleFecharSubstituicao();pvpMatchSend("substitute",{outId:outId,inId:inId});
}

function pvpMatchKeyboard(event){
  if(!document.getElementById("pvpMatchBattle")?.classList.contains("ativa"))return;if(event.ctrlKey||event.altKey||event.metaKey)return;
  const tag=String(event.target&&event.target.tagName||"").toUpperCase();if(tag==="INPUT"||tag==="TEXTAREA"||tag==="SELECT")return;
  const b=pvpMatchRoomState&&pvpMatchRoomState.battle,me=pvpBattleMyRole(),actor=pvpBattleCurrentUnit();if(!b||!actor||b.pendingReplacement)return;
  const key=String(event.key||"").toUpperCase();if(pvpBattlePendingAction&&["1","2","3"].includes(key)){event.preventDefault();pvpBattleSelectTargetNumber(Number(key));return}
  if(actor.role!==me)return;const index=Number.isFinite(Number(actor.controlIndex))?Number(actor.controlIndex):0,keys=pvpBattleSkillKeys(index),idx=keys.indexOf(key);if(idx<0)return;
  event.preventDefault();const slot=pvpMatchSlotByDid(pvpMatchRoomState.players[me].team,actor.did),d=pvpMatchDigi(actor.did),skills=(d.skills||[]).slice(0,3);
  if(idx<3&&skills[idx])pvpBattleSelectSkill(actor.did,skills[idx].slot,false);
  if(idx===3){const burst=skills.find(function(x){return Number(x.slot)===Number(slot.build.burstSkill)})||skills[0];if(burst)pvpBattleSelectSkill(actor.did,burst.slot,true)}
}

document.addEventListener("keydown",pvpMatchKeyboard);
document.addEventListener("DOMContentLoaded",function(){
  const nick=document.getElementById("pvpMatchNick");if(nick)nick.value=localStorage.getItem(PVP_MATCH_NICK_KEY)||"";
  pvpMatchAtualizarServerHint();
});

/* =====================================================
   FREATURES — SORTEIO V1
   Manual + anti-duplicação + histórico local
===================================================== */

const HG_SORTEIO_STORAGE_KEY = "hgSorteioManualV1";
const HG_SORTEIO_HISTORY_KEY = "hgSorteioHistoryV1";
const HG_SORTEIO_LIVE_LOCAL_KEY = "hgSorteioLiveV1";
const HG_SORTEIO_LIVE_API = "https://evil-guardians-live.hiltongiuseppechiarelo.workers.dev";

let sorteioFonteAtiva = "manual";
let sorteioManualParticipantes = [];
let sorteioManualInscricoesAbertas = true;
let sorteioManualBloquearDuplicados = true;
let sorteioLiveSessionId = "";
let sorteioLiveSession = null;
let sorteioLivePollTimer = null;
let sorteioLivePollBusy = false;
let sorteioLiveRemovedIds = new Set();

let sorteioParticipantes = [];
let sorteioHistorico = [];
let sorteioInscricoesAbertas = true;
let sorteioGirando = false;
let sorteioRevelando = false;
let sorteioRotacao = 0;
let sorteioInicializado = false;
let sorteioWinnerTimer = null;
let sorteioVencedorAtualId = "";
let sorteioDigitamaRunId = 0;
let sorteioDigitamaCache = [];
let sorteioDigitamaReadyPromise = null;
let sorteioScrollLock = null;

const HG_SORTEIO_DIGITAMA_FRAMES = [
  "features_assets/sorteio/digitama/digitama_00.png",
  "features_assets/sorteio/digitama/digitama_01.png",
  "features_assets/sorteio/digitama/digitama_02.png",
  "features_assets/sorteio/digitama/digitama_03.png",
  "features_assets/sorteio/digitama/digitama_04.png"
];

const HG_SORTEIO_PALETA = [
  "#0b67b5",
  "#163f91",
  "#5f2ba8",
  "#08798f",
  "#8a6518",
  "#174f7f",
  "#44207f",
  "#0e5f69"
];

function sorteioOrigemLabel(origem){
  const valor=String(origem||"manual").toLowerCase();
  if(valor==="youtube")return "YOUTUBE";
  if(valor==="twitch")return "TWITCH";
  if(valor==="kick")return "KICK";
  return "MANUAL";
}

function sorteioCarregarLiveLocal(){
  try{
    const salvo=JSON.parse(localStorage.getItem(HG_SORTEIO_LIVE_LOCAL_KEY)||"null");
    if(!salvo)return;
    if(salvo.sessionId)sorteioLiveSessionId=String(salvo.sessionId);
    if(Array.isArray(salvo.removedIds))sorteioLiveRemovedIds=new Set(salvo.removedIds.map(String));
    if(salvo.source==="youtube")sorteioFonteAtiva="youtube";
    const url=document.getElementById("sorteioYoutubeUrl");
    const command=document.getElementById("sorteioLiveCommand");
    if(url&&salvo.youtubeUrl)url.value=salvo.youtubeUrl;
    if(command&&salvo.command)command.value=salvo.command;
  }catch(erro){}
}

function sorteioSalvarLiveLocal(){
  try{
    const url=document.getElementById("sorteioYoutubeUrl");
    const command=document.getElementById("sorteioLiveCommand");
    localStorage.setItem(HG_SORTEIO_LIVE_LOCAL_KEY,JSON.stringify({
      source:sorteioFonteAtiva,
      sessionId:sorteioLiveSessionId,
      youtubeUrl:url?url.value.trim():"",
      command:command?command.value.trim()||"!sorteio":"!sorteio",
      removedIds:Array.from(sorteioLiveRemovedIds)
    }));
  }catch(erro){}
}

async function sorteioLiveRequest(path,options){
  const opts=Object.assign({method:"GET",headers:{}},options||{});
  if(opts.body&&typeof opts.body!=="string"){
    opts.headers=Object.assign({},opts.headers,{"Content-Type":"application/json"});
    opts.body=JSON.stringify(opts.body);
  }
  const response=await fetch(HG_SORTEIO_LIVE_API+path,opts);
  let data=null;
  try{data=await response.json()}catch(erro){}
  if(!response.ok||!data||data.ok===false){
    throw new Error((data&&data.error)||("Evil Guardians respondeu HTTP "+response.status+"."));
  }
  return data;
}

async function sorteioLiveGarantirSessao(){
  if(sorteioLiveSessionId){
    try{
      const atual=await sorteioLiveRequest("/api/session/"+encodeURIComponent(sorteioLiveSessionId)+"/state");
      sorteioLiveSession=atual.session;
      return sorteioLiveSessionId;
    }catch(erro){
      sorteioLiveSessionId="";
      sorteioLiveSession=null;
    }
  }
  const criado=await sorteioLiveRequest("/api/session/create",{method:"POST"});
  sorteioLiveSession=criado.session;
  sorteioLiveSessionId=criado.session.id;
  sorteioLiveRemovedIds.clear();
  sorteioSalvarLiveLocal();
  return sorteioLiveSessionId;
}

function sorteioPararPollingLive(){
  if(sorteioLivePollTimer){
    clearTimeout(sorteioLivePollTimer);
    sorteioLivePollTimer=null;
  }
}

function sorteioAplicarSessaoLive(session,render){
  if(!session)return;
  sorteioLiveSession=session;
  sorteioLiveSessionId=session.id||sorteioLiveSessionId;
  if(sorteioFonteAtiva!=="youtube"){
    sorteioSalvarLiveLocal();
    return;
  }
  sorteioInscricoesAbertas=!!session.accepting;
  const removidos=sorteioLiveRemovedIds;
  sorteioParticipantes=(Array.isArray(session.participants)?session.participants:[])
    .filter(function(item){return item&&item.nome&&!removidos.has(String(item.id||""))})
    .map(function(item){
      return {
        id:String(item.id||sorteioGerarId()),
        nome:String(item.nome||"").trim().slice(0,80),
        origem:item.origem||item.platform||"youtube",
        platform:item.platform||"youtube",
        avatar:item.avatar||"",
        userId:item.userId||""
      };
    });
  sorteioSalvarLiveLocal();
  if(render!==false){
    sorteioRenderParticipantes();
    sorteioDesenhar();
    sorteioAtualizarEstadoInscricoes();
    sorteioAtualizarFonteUI();
  }
}

function sorteioYoutubeConectado(){
  return !!(sorteioLiveSession&&sorteioLiveSession.connections&&sorteioLiveSession.connections.youtube&&sorteioLiveSession.connections.youtube.connected);
}

function sorteioAtualizarFonteUI(){
  const manualBtn=document.querySelector("#sorteioPagina .sorteio-source-btn.manual");
  const youtubeBtn=document.querySelector("#sorteioPagina .sorteio-source-btn.youtube");
  const manualPanel=document.getElementById("sorteioManualPanel");
  const youtubePanel=document.getElementById("sorteioYoutubePanel");
  const kicker=document.getElementById("sorteioEntryKicker");
  const title=document.getElementById("sorteioEntryTitle");
  const duplicados=document.getElementById("sorteioBloquearDuplicados");
  const dupTitle=document.getElementById("sorteioDuplicateTitle");
  const dupDesc=document.getElementById("sorteioDuplicateDesc");
  const clearBtn=document.getElementById("sorteioClearBtn");
  const conectado=sorteioYoutubeConectado();

  if(manualBtn){
    manualBtn.classList.toggle("ativo",sorteioFonteAtiva==="manual");
    manualBtn.setAttribute("aria-pressed",sorteioFonteAtiva==="manual"?"true":"false");
  }
  if(youtubeBtn){
    youtubeBtn.classList.toggle("ativo",sorteioFonteAtiva==="youtube");
    youtubeBtn.setAttribute("aria-pressed",sorteioFonteAtiva==="youtube"?"true":"false");
  }
  if(manualPanel)manualPanel.hidden=sorteioFonteAtiva!=="manual";
  if(youtubePanel)youtubePanel.hidden=sorteioFonteAtiva!=="youtube";

  if(sorteioFonteAtiva==="youtube"){
    if(kicker)kicker.textContent="EVIL GUARDIANS LIVE";
    if(title)title.textContent="YOUTUBE";
    if(duplicados){duplicados.checked=true;duplicados.disabled=true;}
    if(dupTitle)dupTitle.textContent="UMA ENTRADA POR USUÁRIO";
    if(dupDesc)dupDesc.textContent="O Evil Guardians identifica a conta do YouTube e ignora tentativas repetidas.";
    if(clearBtn){clearBtn.disabled=true;clearBtn.title="Em live, reabra a rodada para zerar as inscrições.";}
  }else{
    if(kicker)kicker.textContent="ENTRADA MANUAL";
    if(title)title.textContent="PARTICIPANTES";
    if(duplicados){duplicados.disabled=false;duplicados.checked=sorteioManualBloquearDuplicados;}
    if(dupTitle)dupTitle.textContent="UMA ENTRADA POR NOME";
    if(dupDesc)dupDesc.textContent="Ignora duplicados mesmo com maiúsculas/minúsculas diferentes.";
    if(clearBtn){clearBtn.disabled=false;clearBtn.title="";}
  }

  const connectBtn=document.getElementById("sorteioYoutubeConnectBtn");
  const disconnectBtn=document.getElementById("sorteioYoutubeDisconnectBtn");
  const urlInput=document.getElementById("sorteioYoutubeUrl");
  const commandInput=document.getElementById("sorteioLiveCommand");
  const box=document.getElementById("sorteioLiveConnection");
  if(connectBtn)connectBtn.disabled=conectado||sorteioGirando||sorteioRevelando;
  if(disconnectBtn)disconnectBtn.disabled=!conectado||sorteioGirando||sorteioRevelando;
  if(urlInput)urlInput.disabled=conectado||sorteioGirando||sorteioRevelando;
  if(commandInput)commandInput.disabled=conectado||sorteioGirando||sorteioRevelando;
  if(box){
    const b=box.querySelector("b");
    const small=box.querySelector("small");
    box.classList.toggle("online",conectado);
    box.classList.toggle("offline",!conectado);
    if(conectado){
      const info=sorteioLiveSession.connections.youtube;
      if(b)b.textContent="EVIL GUARDIANS CONECTADO";
      if(small)small.textContent=(info.title||"YouTube Live")+" · ouvindo "+(sorteioLiveSession.command||"!sorteio");
    }else{
      if(b)b.textContent="EVIL GUARDIANS DESCONECTADO";
      if(small)small.textContent="Cole o link de uma live com chat ativo para começar.";
    }
  }
}

async function sorteioSelecionarFonte(fonte){
  if(sorteioGirando||sorteioRevelando)return;
  const nova=fonte==="youtube"?"youtube":"manual";
  if(nova===sorteioFonteAtiva){
    sorteioAtualizarFonteUI();
    return;
  }

  if(sorteioFonteAtiva==="manual"){
    sorteioManualParticipantes=sorteioParticipantes.map(function(item){return Object.assign({},item)});
    sorteioManualInscricoesAbertas=sorteioInscricoesAbertas;
    const duplicados=document.getElementById("sorteioBloquearDuplicados");
    if(duplicados)sorteioManualBloquearDuplicados=duplicados.checked;
  }

  sorteioPararPollingLive();
  sorteioFonteAtiva=nova;
  sorteioVencedorAtualId="";
  sorteioOcultarVencedor();
  sorteioOcultarDigitama(true);

  if(nova==="manual"){
    sorteioParticipantes=sorteioManualParticipantes.map(function(item){return Object.assign({},item)});
    sorteioInscricoesAbertas=sorteioManualInscricoesAbertas;
    sorteioAtualizarTudo();
    sorteioAtualizarFonteUI();
    sorteioDefinirFeedback("Modo manual ativado.","info");
    return;
  }

  sorteioParticipantes=[];
  sorteioInscricoesAbertas=false;
  sorteioAtualizarTudo();
  sorteioAtualizarFonteUI();
  sorteioDefinirFeedback("YouTube selecionado. Conecte o Evil Guardians à live.","info");

  if(sorteioLiveSessionId){
    try{
      const data=await sorteioLiveRequest("/api/session/"+encodeURIComponent(sorteioLiveSessionId)+"/state");
      sorteioAplicarSessaoLive(data.session,true);
      if(sorteioInscricoesAbertas&&sorteioYoutubeConectado())sorteioIniciarPollingYoutube(500);
    }catch(erro){
      sorteioLiveSessionId="";
      sorteioLiveSession=null;
      sorteioSalvarLiveLocal();
      sorteioAtualizarFonteUI();
    }
  }
}

async function sorteioYoutubeConectar(){
  if(sorteioGirando||sorteioRevelando)return;
  const urlInput=document.getElementById("sorteioYoutubeUrl");
  const commandInput=document.getElementById("sorteioLiveCommand");
  const url=urlInput?urlInput.value.trim():"";
  const command=(commandInput?commandInput.value.trim():"")||"!sorteio";
  if(!url){
    sorteioDefinirFeedback("Cole o link da live do YouTube antes de conectar.","warn");
    return;
  }

  const btn=document.getElementById("sorteioYoutubeConnectBtn");
  if(btn){btn.disabled=true;btn.textContent="CONECTANDO...";}
  sorteioDefinirFeedback("Evil Guardians está procurando o chat da live...","info");

  try{
    await sorteioLiveGarantirSessao();
    await sorteioLiveRequest("/api/session/"+encodeURIComponent(sorteioLiveSessionId)+"/config",{
      method:"POST",
      body:{command:command,platforms:{youtube:true}}
    });
    const data=await sorteioLiveRequest("/api/session/"+encodeURIComponent(sorteioLiveSessionId)+"/youtube/connect",{
      method:"POST",
      body:{url:url}
    });
    sorteioAplicarSessaoLive(data.session,true);
    sorteioInscricoesAbertas=!!data.session.accepting;
    sorteioSalvarLiveLocal();
    sorteioAtualizarEstadoInscricoes();
    sorteioAtualizarFonteUI();
    sorteioDefinirFeedback("Evil Guardians conectado ao YouTube. Abra as inscrições quando quiser.","ok");
  }catch(erro){
    sorteioDefinirFeedback(erro.message||"Não foi possível conectar à live.","warn");
  }finally{
    if(btn)btn.textContent="CONECTAR EVIL GUARDIANS";
    sorteioAtualizarFonteUI();
  }
}

async function sorteioYoutubeDesconectar(){
  if(!sorteioLiveSessionId||sorteioGirando||sorteioRevelando)return;
  sorteioPararPollingLive();
  try{
    if(sorteioInscricoesAbertas){
      await sorteioLiveRequest("/api/session/"+encodeURIComponent(sorteioLiveSessionId)+"/round/close",{method:"POST"});
    }
    const data=await sorteioLiveRequest("/api/session/"+encodeURIComponent(sorteioLiveSessionId)+"/youtube/disconnect",{method:"POST"});
    sorteioAplicarSessaoLive(data.session,true);
    sorteioParticipantes=[];
    sorteioInscricoesAbertas=false;
    sorteioAtualizarTudo();
    sorteioAtualizarFonteUI();
    sorteioDefinirFeedback("Evil Guardians desconectado do YouTube.","info");
  }catch(erro){
    sorteioDefinirFeedback(erro.message||"Falha ao desconectar.","warn");
  }
}

function sorteioAgendarYoutubePoll(ms){
  sorteioPararPollingLive();
  if(sorteioFonteAtiva!=="youtube"||!sorteioInscricoesAbertas||!sorteioYoutubeConectado())return;
  const atraso=Math.max(1000,Number(ms||2500));
  sorteioLivePollTimer=setTimeout(function(){sorteioYoutubePoll(false)},atraso);
}

async function sorteioYoutubePoll(somentePrime){
  if(sorteioLivePollBusy||sorteioFonteAtiva!=="youtube"||!sorteioLiveSessionId||!sorteioInscricoesAbertas||!sorteioYoutubeConectado())return;
  sorteioLivePollBusy=true;
  try{
    const antes=sorteioParticipantes.length;
    const data=await sorteioLiveRequest("/api/session/"+encodeURIComponent(sorteioLiveSessionId)+"/youtube/poll",{method:"POST"});
    sorteioAplicarSessaoLive(data.session,true);
    const novos=Math.max(0,sorteioParticipantes.length-antes);
    if(!somentePrime&&novos>0){
      sorteioDefinirFeedback(novos+" participante(s) entrou(aram) pelo YouTube.","ok");
    }
    sorteioAgendarYoutubePoll(data.pollingIntervalMillis||2500);
  }catch(erro){
    sorteioDefinirFeedback("YouTube: "+(erro.message||"falha ao ler o chat")+". Tentando novamente...","warn");
    sorteioAgendarYoutubePoll(5000);
  }finally{
    sorteioLivePollBusy=false;
  }
}

function sorteioIniciarPollingYoutube(ms){
  sorteioAgendarYoutubePoll(ms||250);
}

async function sorteioRestaurarLive(){
  sorteioCarregarLiveLocal();
  sorteioAtualizarFonteUI();
  if(sorteioFonteAtiva!=="youtube"||!sorteioLiveSessionId)return;
  try{
    const data=await sorteioLiveRequest("/api/session/"+encodeURIComponent(sorteioLiveSessionId)+"/state");
    sorteioAplicarSessaoLive(data.session,true);
    if(sorteioInscricoesAbertas&&sorteioYoutubeConectado())sorteioIniciarPollingYoutube(300);
  }catch(erro){
    sorteioLiveSessionId="";
    sorteioLiveSession=null;
    sorteioParticipantes=[];
    sorteioInscricoesAbertas=false;
    sorteioSalvarLiveLocal();
    sorteioAtualizarTudo();
    sorteioAtualizarFonteUI();
  }
}

function sorteioNormalizarNome(nome){
  return String(nome||"")
    .trim()
    .replace(/\s+/g," ")
    .toLocaleLowerCase("pt-BR");
}

function sorteioEscaparHtml(texto){
  return String(texto||"")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

function sorteioGerarId(){
  if(window.crypto&&crypto.getRandomValues){
    const buffer=new Uint32Array(2);
    crypto.getRandomValues(buffer);
    return "p_"+buffer[0].toString(36)+buffer[1].toString(36);
  }
  return "p_"+Date.now().toString(36)+Math.random().toString(36).slice(2);
}

function sorteioRandomIndex(max){
  if(max<=1)return 0;
  if(window.crypto&&crypto.getRandomValues){
    const limite=Math.floor(0x100000000/max)*max;
    const b=new Uint32Array(1);
    do{crypto.getRandomValues(b)}while(b[0]>=limite);
    return b[0]%max;
  }
  return Math.floor(Math.random()*max);
}

function sorteioCarregarEstado(){
  try{
    const salvo=JSON.parse(localStorage.getItem(HG_SORTEIO_STORAGE_KEY)||"null");
    if(salvo&&Array.isArray(salvo.participantes)){
      sorteioParticipantes=salvo.participantes
        .filter(function(item){return item&&item.nome})
        .map(function(item){
          return {
            id:item.id||sorteioGerarId(),
            nome:String(item.nome).trim(),
            origem:item.origem||"manual"
          };
        });
    }
    sorteioManualParticipantes=sorteioParticipantes.map(function(item){return Object.assign({},item)});
    const duplicados=document.getElementById("sorteioBloquearDuplicados");
    const remover=document.getElementById("sorteioRemoverVencedor");
    if(salvo&&typeof salvo.bloquearDuplicados==="boolean")sorteioManualBloquearDuplicados=salvo.bloquearDuplicados;
    if(duplicados)duplicados.checked=sorteioManualBloquearDuplicados;
    if(remover&&salvo&&typeof salvo.removerVencedor==="boolean")remover.checked=salvo.removerVencedor;
  }catch(erro){
    sorteioParticipantes=[];
    sorteioManualParticipantes=[];
  }

  try{
    const historico=JSON.parse(localStorage.getItem(HG_SORTEIO_HISTORY_KEY)||"[]");
    sorteioHistorico=Array.isArray(historico)?historico.slice(0,20):[];
  }catch(erro){
    sorteioHistorico=[];
  }
}

function sorteioSalvarEstado(){
  try{
    const duplicados=document.getElementById("sorteioBloquearDuplicados");
    const remover=document.getElementById("sorteioRemoverVencedor");
    if(sorteioFonteAtiva==="manual"){
      sorteioManualParticipantes=sorteioParticipantes.map(function(item){return Object.assign({},item)});
      sorteioManualInscricoesAbertas=sorteioInscricoesAbertas;
      if(duplicados)sorteioManualBloquearDuplicados=duplicados.checked;
    }
    localStorage.setItem(HG_SORTEIO_STORAGE_KEY,JSON.stringify({
      participantes:sorteioManualParticipantes,
      bloquearDuplicados:sorteioManualBloquearDuplicados,
      removerVencedor:remover?remover.checked:true
    }));
    localStorage.setItem(HG_SORTEIO_HISTORY_KEY,JSON.stringify(sorteioHistorico.slice(0,20)));
    sorteioSalvarLiveLocal();
  }catch(erro){
    /* A roleta continua funcionando mesmo com storage bloqueado. */
  }
}

function sorteioOcultarVencedor(){
  const winnerBox=document.getElementById("sorteioWinnerBox");
  if(sorteioWinnerTimer){
    clearTimeout(sorteioWinnerTimer);
    sorteioWinnerTimer=null;
  }
  if(winnerBox){
    winnerBox.classList.remove("reveal");
    winnerBox.classList.add("hide");
    winnerBox.setAttribute("aria-hidden","true");
  }
}

function sorteioEsperar(ms){
  return new Promise(function(resolve){setTimeout(resolve,ms)});
}

function sorteioPrecarregarDigitama(){
  if(sorteioDigitamaReadyPromise)return sorteioDigitamaReadyPromise;

  sorteioDigitamaCache=HG_SORTEIO_DIGITAMA_FRAMES.map(function(src){
    const img=new Image();
    img.decoding="async";
    img.src=src;
    return img;
  });

  sorteioDigitamaReadyPromise=Promise.all(sorteioDigitamaCache.map(function(img){
    if(typeof img.decode==="function"){
      return img.decode().catch(function(){
        return new Promise(function(resolve){
          if(img.complete){resolve();return;}
          img.addEventListener("load",resolve,{once:true});
          img.addEventListener("error",resolve,{once:true});
        });
      });
    }

    return new Promise(function(resolve){
      if(img.complete){resolve();return;}
      img.addEventListener("load",resolve,{once:true});
      img.addEventListener("error",resolve,{once:true});
    });
  })).then(function(){return sorteioDigitamaCache;});

  return sorteioDigitamaReadyPromise;
}

function sorteioTravarScroll(){
  if(sorteioScrollLock)return;

  const html=document.documentElement;
  const body=document.body;
  const x=window.scrollX||window.pageXOffset||0;
  const y=window.scrollY||window.pageYOffset||0;
  const htmlScrollBehavior=html.style.scrollBehavior;
  const bodyScrollBehavior=body?body.style.scrollBehavior:"";
  let corrigindo=false;

  html.style.scrollBehavior="auto";
  if(body)body.style.scrollBehavior="auto";

  function manterPosicao(){
    if(corrigindo)return;
    const atualX=window.scrollX||window.pageXOffset||0;
    const atualY=window.scrollY||window.pageYOffset||0;
    if(Math.abs(atualX-x)<1&&Math.abs(atualY-y)<1)return;
    corrigindo=true;
    window.scrollTo(x,y);
    requestAnimationFrame(function(){corrigindo=false;});
  }

  window.addEventListener("scroll",manterPosicao,{passive:true});
  sorteioScrollLock={
    x:x,
    y:y,
    html:html,
    body:body,
    htmlScrollBehavior:htmlScrollBehavior,
    bodyScrollBehavior:bodyScrollBehavior,
    manterPosicao:manterPosicao
  };

  requestAnimationFrame(manterPosicao);
}

function sorteioLiberarScroll(){
  const lock=sorteioScrollLock;
  if(!lock)return;

  window.removeEventListener("scroll",lock.manterPosicao);
  window.scrollTo(lock.x,lock.y);

  requestAnimationFrame(function(){
    lock.html.style.scrollBehavior=lock.htmlScrollBehavior;
    if(lock.body)lock.body.style.scrollBehavior=lock.bodyScrollBehavior;
  });

  sorteioScrollLock=null;
}

function sorteioAnimarCanvasGpu(canvas,graus,duracao){
  if(!canvas)return Promise.resolve();

  canvas.style.transform="rotate(0deg)";

  if(typeof canvas.animate==="function"){
    const animacao=canvas.animate(
      [
        {transform:"rotate(0deg)"},
        {transform:"rotate("+graus+"deg)"}
      ],
      {
        duration:duracao,
        easing:"cubic-bezier(.22,1,.36,1)",
        fill:"forwards"
      }
    );

    return animacao.finished.then(function(){
      return animacao;
    });
  }

  return new Promise(function(resolve){
    const inicioTempo=performance.now();
    function easeOutQuint(t){return 1-Math.pow(1-t,5);}
    function frame(agora){
      const t=Math.min(1,(agora-inicioTempo)/duracao);
      canvas.style.transform="rotate("+(graus*easeOutQuint(t))+"deg)";
      if(t<1){requestAnimationFrame(frame);return;}
      resolve(null);
    }
    requestAnimationFrame(frame);
  });
}

function sorteioOcultarDigitama(imediato){
  sorteioDigitamaRunId++;
  const overlay=document.getElementById("sorteioDigitamaReveal");
  const wheelStage=document.querySelector("#sorteioPagina .sorteio-wheel-stage");
  const nome=document.getElementById("sorteioDigitamaName");
  if(overlay){
    overlay.classList.remove("ativa","saindo","fase-0","fase-1","fase-2","fase-3","fase-4","nome-visivel");
    overlay.setAttribute("aria-hidden","true");
    if(imediato)overlay.style.transition="none";
    requestAnimationFrame(function(){if(overlay)overlay.style.transition=""});
  }
  if(nome){
    const strong=nome.querySelector("strong");
    if(strong)strong.textContent="";
  }
  if(wheelStage)wheelStage.classList.remove("digitama-ativo");
}

function sorteioDefinirFaseDigitama(numero){
  const overlay=document.getElementById("sorteioDigitamaReveal");
  const frame=document.getElementById("sorteioDigitamaFrame");
  if(!overlay||!frame)return;
  [0,1,2,3,4].forEach(function(n){overlay.classList.remove("fase-"+n)});
  frame.src=HG_SORTEIO_DIGITAMA_FRAMES[numero]||HG_SORTEIO_DIGITAMA_FRAMES[0];
  void overlay.offsetWidth;
  overlay.classList.add("fase-"+numero);
}

function sorteioCriarParticulasDigitama(){
  const area=document.getElementById("sorteioDigitamaSparks");
  if(!area)return;
  area.innerHTML="";
  for(let i=0;i<18;i++){
    const p=document.createElement("i");
    const angulo=(i/18)*360+(Math.random()*16-8);
    const distancia=85+Math.round(Math.random()*105);
    const atraso=Math.round(Math.random()*150);
    p.style.setProperty("--r",angulo+"deg");
    p.style.setProperty("--d",distancia+"px");
    p.style.setProperty("--delay",atraso+"ms");
    area.appendChild(p);
  }
}

async function sorteioAnimarDigitama(vencedor){
  const overlay=document.getElementById("sorteioDigitamaReveal");
  const frame=document.getElementById("sorteioDigitamaFrame");
  const nome=document.getElementById("sorteioDigitamaName");
  const wheelStage=document.querySelector("#sorteioPagina .sorteio-wheel-stage");
  if(!overlay||!frame||!nome||!wheelStage)return;

  const runId=++sorteioDigitamaRunId;
  const strong=nome.querySelector("strong");
  if(strong)strong.textContent=vencedor.nome;
  overlay.classList.remove("saindo","nome-visivel");
  overlay.setAttribute("aria-hidden","false");
  wheelStage.classList.add("digitama-ativo");
  sorteioCriarParticulasDigitama();
  sorteioDefinirFaseDigitama(0);
  void overlay.offsetWidth;
  overlay.classList.add("ativa");

  // ~5 segundos de suspense após a roda parar.
  await sorteioEsperar(650);
  if(runId!==sorteioDigitamaRunId)return;
  sorteioDefinirFeedback("O Digitama começou a rachar...","info");
  sorteioDefinirFaseDigitama(1);

  await sorteioEsperar(800);
  if(runId!==sorteioDigitamaRunId)return;
  sorteioDefinirFaseDigitama(2);

  await sorteioEsperar(850);
  if(runId!==sorteioDigitamaRunId)return;
  sorteioDefinirFeedback("Tem alguma coisa saindo daí...","info");
  sorteioDefinirFaseDigitama(3);

  await sorteioEsperar(900);
  if(runId!==sorteioDigitamaRunId)return;
  sorteioDefinirFaseDigitama(4);

  await sorteioEsperar(650);
  if(runId!==sorteioDigitamaRunId)return;
  overlay.classList.add("nome-visivel");

  await sorteioEsperar(850);
  if(runId!==sorteioDigitamaRunId)return;
  overlay.classList.add("saindo");

  await sorteioEsperar(300);
  if(runId!==sorteioDigitamaRunId)return;
  overlay.classList.remove("ativa","saindo","fase-0","fase-1","fase-2","fase-3","fase-4","nome-visivel");
  overlay.setAttribute("aria-hidden","true");
  wheelStage.classList.remove("digitama-ativo");
}

function sorteioDefinirFeedback(texto,tipo){
  const el=document.getElementById("sorteioFeedback");
  if(!el)return;
  el.textContent=texto||"";
  el.className="sorteio-feedback"+(tipo?" "+tipo:"");
  if(texto){
    clearTimeout(el._hgTimer);
    el._hgTimer=setTimeout(function(){
      if(!sorteioGirando&&!sorteioRevelando)el.textContent="";
    },3500);
  }
}

function sorteioAtualizarEstadoInscricoes(){
  const status=document.getElementById("sorteioStatusTopo");
  const dot=document.getElementById("sorteioStatusDot");
  const badge=document.getElementById("sorteioEntryState");
  const lock=document.getElementById("sorteioLockBtn");
  const spin=document.getElementById("sorteioSpinBtn");
  const liveSemConexao=sorteioFonteAtiva==="youtube"&&!sorteioYoutubeConectado();
  const controles=[
    document.getElementById("sorteioNomeInput"),
    document.getElementById("sorteioAddBtn"),
    document.getElementById("sorteioListaInput"),
    document.getElementById("sorteioAddListBtn"),
    document.getElementById("sorteioImportBtn")
  ];

  if(status){
    status.textContent=liveSemConexao?"AGUARDANDO YOUTUBE":(sorteioInscricoesAbertas?"INSCRIÇÕES ABERTAS":"INSCRIÇÕES ENCERRADAS");
  }
  if(dot)dot.className=sorteioInscricoesAbertas&&!liveSemConexao?"aberto":"fechado";
  if(badge){
    badge.textContent=liveSemConexao?"OFFLINE":(sorteioInscricoesAbertas?"ABERTO":"FECHADO");
    badge.className="sorteio-entry-badge "+(sorteioInscricoesAbertas&&!liveSemConexao?"aberto":"fechado");
  }
  if(lock){
    if(sorteioFonteAtiva==="youtube")lock.textContent=sorteioInscricoesAbertas?"FECHAR INSCRIÇÕES":"ABRIR INSCRIÇÕES";
    else lock.textContent=sorteioInscricoesAbertas?"FECHAR INSCRIÇÕES":"REABRIR INSCRIÇÕES";
    lock.disabled=sorteioGirando||sorteioRevelando||liveSemConexao;
  }

  controles.forEach(function(el){
    if(el)el.disabled=sorteioFonteAtiva!=="manual"||!sorteioInscricoesAbertas||sorteioGirando||sorteioRevelando;
  });

  if(spin)spin.disabled=sorteioGirando||sorteioRevelando||sorteioInscricoesAbertas||sorteioParticipantes.length<2;
  sorteioAtualizarFonteUI();
}

async function sorteioAlternarInscricoes(){
  if(sorteioGirando||sorteioRevelando)return;

  if(sorteioFonteAtiva==="youtube"){
    if(!sorteioYoutubeConectado()||!sorteioLiveSessionId){
      sorteioDefinirFeedback("Conecte o Evil Guardians à live antes de abrir as inscrições.","warn");
      return;
    }
    const lock=document.getElementById("sorteioLockBtn");
    if(lock)lock.disabled=true;
    try{
      if(sorteioInscricoesAbertas){
        sorteioPararPollingLive();
        const data=await sorteioLiveRequest("/api/session/"+encodeURIComponent(sorteioLiveSessionId)+"/round/close",{method:"POST"});
        sorteioAplicarSessaoLive(data.session,true);
        sorteioDefinirFeedback("Inscrições encerradas com "+sorteioParticipantes.length+" participante(s) do YouTube.","info");
      }else{
        sorteioVencedorAtualId="";
        sorteioOcultarVencedor();
        sorteioOcultarDigitama(true);
        sorteioLiveRemovedIds.clear();
        const commandInput=document.getElementById("sorteioLiveCommand");
        const command=(commandInput?commandInput.value.trim():"")||"!sorteio";
        await sorteioLiveRequest("/api/session/"+encodeURIComponent(sorteioLiveSessionId)+"/config",{
          method:"POST",body:{command:command,platforms:{youtube:true}}
        });
        const data=await sorteioLiveRequest("/api/session/"+encodeURIComponent(sorteioLiveSessionId)+"/round/open",{method:"POST"});
        sorteioAplicarSessaoLive(data.session,true);
        sorteioDefinirFeedback("Inscrições abertas · Evil Guardians ouvindo "+command+" no YouTube.","ok");
        // Primeira leitura apenas posiciona o cursor no fim do chat atual.
        await sorteioYoutubePoll(true);
      }
    }catch(erro){
      sorteioDefinirFeedback(erro.message||"Não foi possível alterar a rodada ao vivo.","warn");
    }finally{
      sorteioAtualizarEstadoInscricoes();
    }
    return;
  }

  const vaiReabrir=!sorteioInscricoesAbertas;
  sorteioInscricoesAbertas=!sorteioInscricoesAbertas;
  sorteioManualInscricoesAbertas=sorteioInscricoesAbertas;
  if(vaiReabrir){
    sorteioVencedorAtualId="";
    sorteioOcultarVencedor();
    sorteioOcultarDigitama(true);
    sorteioDesenhar();
  }
  sorteioAtualizarEstadoInscricoes();
  sorteioDefinirFeedback(
    sorteioInscricoesAbertas
      ?"Inscrições reabertas. Você pode adicionar ou remover participantes."
      :"Lista congelada com "+sorteioParticipantes.length+" participante(s).",
    sorteioInscricoesAbertas?"ok":"info"
  );
  sorteioSalvarEstado();
}

function sorteioAdicionarParticipante(nome,origem){
  if(sorteioFonteAtiva!=="manual")return {ok:false,motivo:"fonte"};
  const limpo=String(nome||"").trim().replace(/\s+/g," ");
  if(!limpo)return {ok:false,motivo:"vazio"};
  if(!sorteioInscricoesAbertas)return {ok:false,motivo:"fechado"};

  const bloquear=document.getElementById("sorteioBloquearDuplicados");
  if(!bloquear||bloquear.checked){
    const chave=sorteioNormalizarNome(limpo);
    const existe=sorteioParticipantes.some(function(item){
      return sorteioNormalizarNome(item.nome)===chave;
    });
    if(existe)return {ok:false,motivo:"duplicado"};
  }

  sorteioParticipantes.push({
    id:sorteioGerarId(),
    nome:limpo.slice(0,80),
    origem:origem||"manual"
  });
  return {ok:true};
}

function sorteioAdicionarNome(){
  const input=document.getElementById("sorteioNomeInput");
  if(!input)return;
  const resultado=sorteioAdicionarParticipante(input.value,"manual");

  if(resultado.ok){
    input.value="";
    sorteioAtualizarTudo();
    sorteioDefinirFeedback("Participante adicionado à roleta.","ok");
    input.focus();
  }else if(resultado.motivo==="duplicado"){
    sorteioDefinirFeedback("Esse nome já está participando. Entrada duplicada ignorada.","warn");
  }else if(resultado.motivo==="fechado"){
    sorteioDefinirFeedback("As inscrições estão encerradas. Reabra para adicionar nomes.","warn");
  }
}

function sorteioExtrairNomes(texto){
  return String(texto||"")
    .split(/[\n\r,;]+/)
    .map(function(nome){return nome.trim().replace(/\s+/g," ")})
    .filter(Boolean);
}

function sorteioAdicionarLista(){
  const input=document.getElementById("sorteioListaInput");
  if(!input)return;
  const nomes=sorteioExtrairNomes(input.value);
  if(!nomes.length){
    sorteioDefinirFeedback("Cole pelo menos um nome antes de adicionar a lista.","warn");
    return;
  }

  let adicionados=0;
  let duplicados=0;
  nomes.forEach(function(nome){
    const result=sorteioAdicionarParticipante(nome,"manual");
    if(result.ok)adicionados++;
    else if(result.motivo==="duplicado")duplicados++;
  });

  input.value="";
  sorteioAtualizarTudo();
  sorteioDefinirFeedback(
    adicionados+" participante(s) adicionado(s)"+(duplicados?" · "+duplicados+" duplicado(s) ignorado(s)":"")+".",
    "ok"
  );
}

async function sorteioImportarArquivo(file){
  if(!file)return;
  try{
    const texto=await file.text();
    const input=document.getElementById("sorteioListaInput");
    if(input)input.value=texto;
    sorteioAdicionarLista();
  }catch(erro){
    sorteioDefinirFeedback("Não foi possível ler esse arquivo.","warn");
  }finally{
    const fileInput=document.getElementById("sorteioImportFile");
    if(fileInput)fileInput.value="";
  }
}

function sorteioRemoverParticipante(id){
  if(!sorteioInscricoesAbertas||sorteioGirando||sorteioRevelando)return;
  if(sorteioFonteAtiva!=="manual")return;
  sorteioParticipantes=sorteioParticipantes.filter(function(item){return item.id!==id});
  sorteioAtualizarTudo();
}

function sorteioLimparParticipantes(){
  if(sorteioGirando||sorteioRevelando)return;
  if(sorteioFonteAtiva!=="manual"){
    sorteioDefinirFeedback("No modo Live, feche e abra uma nova rodada para zerar as inscrições.","warn");
    return;
  }
  if(!sorteioInscricoesAbertas){
    sorteioDefinirFeedback("Reabra as inscrições antes de alterar a lista.","warn");
    return;
  }
  sorteioParticipantes=[];
  sorteioAtualizarTudo();
  sorteioDefinirFeedback("Lista de participantes limpa.","info");
}

function sorteioRenderParticipantes(){
  const lista=document.getElementById("sorteioParticipants");
  const total=document.getElementById("sorteioTotal");
  if(total)total.textContent=String(sorteioParticipantes.length);
  if(!lista)return;

  if(!sorteioParticipantes.length){
    const texto=sorteioFonteAtiva==="youtube"
      ?(sorteioYoutubeConectado()?"Aguardando alguém mandar "+((sorteioLiveSession&&sorteioLiveSession.command)||"!sorteio")+" no chat.":"Conecte o Evil Guardians a uma live do YouTube.")
      :"Adicione nomes para montar a roleta.";
    lista.innerHTML='<div class="sorteio-empty-list"><b>NENHUM PARTICIPANTE</b><span>'+sorteioEscaparHtml(texto)+'</span></div>';
    return;
  }

  lista.innerHTML=sorteioParticipantes.map(function(item,index){
    const origem=sorteioOrigemLabel(item.origem||item.platform);
    const botao=sorteioFonteAtiva==="manual"
      ?'<button type="button" data-sorteio-remove="'+sorteioEscaparHtml(item.id)+'" aria-label="Remover '+sorteioEscaparHtml(item.nome)+'" '+(!sorteioInscricoesAbertas?'disabled':'')+'>×</button>'
      :'<span class="sorteio-live-user-mark" title="Entrada validada pelo Evil Guardians">✓</span>';
    return '<div class="sorteio-participant-row">'+
      '<span class="sorteio-participant-index">'+String(index+1).padStart(2,"0")+'</span>'+
      '<div><strong>'+sorteioEscaparHtml(item.nome)+'</strong><small>'+origem+'</small></div>'+botao+
    '</div>';
  }).join("");

  lista.querySelectorAll("[data-sorteio-remove]").forEach(function(btn){
    btn.addEventListener("click",function(){sorteioRemoverParticipante(btn.dataset.sorteioRemove)});
  });
}

function sorteioRenderHistorico(){
  const lista=document.getElementById("sorteioHistory");
  if(!lista)return;
  if(!sorteioHistorico.length){
    lista.innerHTML='<div class="sorteio-empty-history">Nenhum sorteio realizado nesta sessão.</div>';
    return;
  }
  lista.innerHTML=sorteioHistorico.slice(0,8).map(function(item,index){
    return '<div class="sorteio-history-row">'+
      '<span>#'+String(sorteioHistorico.length-index).padStart(2,"0")+'</span>'+
      '<div><strong>'+sorteioEscaparHtml(item.nome)+'</strong><small>'+sorteioEscaparHtml(item.hora||"")+' · '+sorteioOrigemLabel(item.origem)+'</small></div>'+
    '</div>';
  }).join("");
}

function sorteioLimparHistorico(){
  if(sorteioGirando||sorteioRevelando)return;
  sorteioHistorico=[];
  sorteioVencedorAtualId="";
  sorteioSalvarEstado();
  sorteioRenderHistorico();
  const winnerBox=document.getElementById("sorteioWinnerBox");
  const nome=document.getElementById("sorteioWinnerName");
  const meta=document.getElementById("sorteioWinnerMeta");
  if(nome)nome.textContent="";
  if(meta)meta.textContent="";
  if(winnerBox){
    winnerBox.classList.remove("reveal");
    winnerBox.classList.add("hide");
    winnerBox.setAttribute("aria-hidden","true");
  }
}

function sorteioAbreviarNome(nome,max){
  const texto=String(nome||"");
  if(texto.length<=max)return texto;
  return texto.slice(0,Math.max(1,max-1))+"…";
}

function sorteioDesenhar(){
  const canvas=document.getElementById("sorteioCanvas");
  if(!canvas)return;
  const ctx=canvas.getContext("2d");
  const w=canvas.width,h=canvas.height,cx=w/2,cy=h/2;
  const raio=Math.min(w,h)*0.445;

  ctx.clearRect(0,0,w,h);

  // Halo externo
  const halo=ctx.createRadialGradient(cx,cy,raio*.72,cx,cy,raio*1.13);
  halo.addColorStop(0,"rgba(30,185,255,0)");
  halo.addColorStop(.72,"rgba(38,171,255,.10)");
  halo.addColorStop(1,"rgba(142,83,255,0)");
  ctx.fillStyle=halo;
  ctx.beginPath();
  ctx.arc(cx,cy,raio*1.12,0,Math.PI*2);
  ctx.fill();

  if(!sorteioParticipantes.length){
    ctx.save();
    ctx.translate(cx,cy);
    const grad=ctx.createRadialGradient(0,0,40,0,0,raio);
    grad.addColorStop(0,"#0c2347");
    grad.addColorStop(1,"#061226");
    ctx.fillStyle=grad;
    ctx.strokeStyle="rgba(76,211,255,.55)";
    ctx.lineWidth=4;
    ctx.beginPath();
    ctx.arc(0,0,raio,0,Math.PI*2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle="#7edfff";
    ctx.font='700 28px "Oxanium", Arial, sans-serif';
    ctx.textAlign="center";
    ctx.fillText("ADICIONE PARTICIPANTES",0,-16);
    ctx.fillStyle="#789ab8";
    ctx.font='500 18px "Oxanium", Arial, sans-serif';
    ctx.fillText("para montar a roleta",0,22);
    ctx.restore();
    return;
  }

  const n=sorteioParticipantes.length;
  const angulo=Math.PI*2/n;
  const fontSize=n<=8?24:n<=16?19:n<=28?15:n<=50?12:10;
  const maxChars=n<=10?18:n<=24?13:n<=50?9:6;

  ctx.save();
  ctx.translate(cx,cy);

  sorteioParticipantes.forEach(function(item,i){
    const inicio=-Math.PI/2+sorteioRotacao+i*angulo;
    const fim=inicio+angulo;
    const vencedorAtivo=!sorteioGirando&&sorteioVencedorAtualId&&item.id===sorteioVencedorAtualId;

    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.arc(0,0,raio,inicio,fim);
    ctx.closePath();

    const cor=HG_SORTEIO_PALETA[i%HG_SORTEIO_PALETA.length];
    ctx.fillStyle=cor;
    ctx.fill();

    ctx.strokeStyle="rgba(150,229,255,.52)";
    ctx.lineWidth=n>80?0.8:1.7;
    ctx.stroke();

    if(vencedorAtivo){
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0,0);
      ctx.arc(0,0,raio,inicio,fim);
      ctx.closePath();
      ctx.fillStyle="rgba(255,205,72,.16)";
      ctx.shadowColor="rgba(255,191,36,.45)";
      ctx.shadowBlur=18;
      ctx.fill();
      ctx.strokeStyle="#ffd85a";
      ctx.lineWidth=Math.max(5,n>80?2.4:6);
      ctx.shadowColor="rgba(255,191,36,1)";
      ctx.shadowBlur=26;
      ctx.stroke();
      ctx.shadowBlur=0;
      ctx.restore();
    }

    // Texto só quando ainda existe espaço útil
    if(n<=120){
      ctx.save();
      ctx.rotate(inicio+angulo/2);
      ctx.textAlign="right";
      ctx.textBaseline="middle";
      ctx.fillStyle=vencedorAtivo?"#fff1a0":"#f4fbff";
      ctx.shadowColor=vencedorAtivo?"rgba(255,191,36,1)":"rgba(0,0,0,.9)";
      ctx.shadowBlur=vencedorAtivo?15:4;
      ctx.font='700 '+fontSize+'px "Oxanium", Arial, sans-serif';
      ctx.fillText(sorteioAbreviarNome(item.nome,maxChars),raio-28,0);
      if(vencedorAtivo){
        ctx.strokeStyle="rgba(255,223,129,.72)";
        ctx.lineWidth=1;
        ctx.strokeText(sorteioAbreviarNome(item.nome,maxChars),raio-28,0);
      }
      ctx.restore();
    }
  });

  ctx.beginPath();
  ctx.arc(0,0,raio,0,Math.PI*2);
  ctx.strokeStyle="rgba(107,224,255,.9)";
  ctx.lineWidth=5;
  ctx.shadowColor="rgba(50,194,255,.55)";
  ctx.shadowBlur=15;
  ctx.stroke();
  ctx.shadowBlur=0;

  // Anéis internos
  ctx.beginPath();
  ctx.arc(0,0,raio*.25,0,Math.PI*2);
  ctx.fillStyle="#06152d";
  ctx.fill();
  ctx.strokeStyle="rgba(78,171,230,.28)";
  ctx.lineWidth=2;
  ctx.stroke();

  ctx.restore();
}

function sorteioAtualizarTudo(){
  sorteioRenderParticipantes();
  sorteioRenderHistorico();
  sorteioDesenhar();
  sorteioAtualizarEstadoInscricoes();
  sorteioSalvarEstado();
}

function sorteioRegistrarVencedor(participante){
  sorteioVencedorAtualId=participante&&participante.id?participante.id:"";
  const agora=new Date();
  const hora=agora.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
  sorteioHistorico.unshift({
    nome:participante.nome,
    origem:participante.origem||participante.platform||"manual",
    hora:hora,
    at:agora.toISOString()
  });
  sorteioHistorico=sorteioHistorico.slice(0,20);

  const winnerBox=document.getElementById("sorteioWinnerBox");
  const nome=document.getElementById("sorteioWinnerName");
  const meta=document.getElementById("sorteioWinnerMeta");

  if(nome)nome.textContent=participante.nome;
  if(meta)meta.textContent=sorteioOrigemLabel(participante.origem||participante.platform)+" · "+hora;

  if(winnerBox){
    if(sorteioWinnerTimer){
      clearTimeout(sorteioWinnerTimer);
      sorteioWinnerTimer=null;
    }

    winnerBox.classList.remove("reveal","hide");
    winnerBox.setAttribute("aria-hidden","false");
    void winnerBox.offsetWidth;
    winnerBox.classList.add("reveal");

    /* A box permanece visível até um novo giro ou a reabertura das inscrições. */
  }
}

async function sorteioGirar(){
  if(sorteioGirando||sorteioRevelando)return;
  if(sorteioInscricoesAbertas){
    sorteioDefinirFeedback("Feche as inscrições antes de girar a roleta.","warn");
    return;
  }
  if(sorteioParticipantes.length<2){
    sorteioDefinirFeedback("Adicione pelo menos 2 participantes.","warn");
    return;
  }

  // A viewport fica exatamente onde o usuário iniciou o sorteio.
  sorteioTravarScroll();
  sorteioGirando=true;
  sorteioVencedorAtualId="";
  sorteioOcultarVencedor();
  sorteioOcultarDigitama(true);
  sorteioAtualizarEstadoInscricoes();
  sorteioDefinirFeedback("Preparando o sorteio...","info");

  // Garante que os cinco PNGs já estejam decodificados antes do giro terminar.
  try{await sorteioPrecarregarDigitama();}catch(erro){}

  const total=sorteioParticipantes.length;
  const vencedorIndex=sorteioRandomIndex(total);
  const vencedor=sorteioParticipantes[vencedorIndex];
  const angulo=Math.PI*2/total;
  const inicio=sorteioRotacao;
  // A ponta inferior-direita real da logo é o indicador (~60° no canvas).
  // Centro do setor vencedor: -PI/2 + rotacao + (index+.5)*angulo = anguloDoIndicador.
  const anguloDoIndicador=60*Math.PI/180;
  let alvo=anguloDoIndicador+Math.PI/2-(vencedorIndex+.5)*angulo;

  while(alvo<=inicio)alvo+=Math.PI*2;
  alvo+=Math.PI*2*7;

  const duracao=5600;
  const delta=alvo-inicio;
  const deltaGraus=delta*180/Math.PI;
  const wheelStage=document.querySelector("#sorteioPagina .sorteio-wheel-stage");
  const canvas=document.getElementById("sorteioCanvas");

  // Desenha UMA vez na posição inicial. Durante o giro, só a GPU transforma o canvas.
  sorteioDesenhar();

  if(wheelStage){
    wheelStage.classList.remove("resultado");
    wheelStage.classList.add("girando");
  }
  sorteioDefinirFeedback("Sorteando entre "+total+" participantes...","info");

  let animacaoGpu=null;

  try{
    animacaoGpu=await sorteioAnimarCanvasGpu(canvas,deltaGraus,duracao);
  }catch(erro){
    // Se a API de animação for interrompida, concluímos diretamente no alvo calculado.
  }

  sorteioRotacao=((alvo%(Math.PI*2))+Math.PI*2)%(Math.PI*2);
  sorteioGirando=false;
  sorteioRevelando=true;
  sorteioVencedorAtualId=vencedor.id;

  // Redesenha UMA vez no ângulo final e então remove a transformação temporária.
  sorteioDesenhar();
  if(animacaoGpu&&typeof animacaoGpu.cancel==="function")animacaoGpu.cancel();
  if(canvas)canvas.style.transform="";

  if(wheelStage){
    wheelStage.classList.remove("girando");
    wheelStage.classList.add("resultado");
    clearTimeout(wheelStage._hgResultadoTimer);
    wheelStage._hgResultadoTimer=setTimeout(function(){
      wheelStage.classList.remove("resultado");
    },900);
  }

  sorteioAtualizarEstadoInscricoes();
  sorteioDefinirFeedback("O Digitama está reagindo...","info");

  try{
    await sorteioAnimarDigitama(vencedor);
    sorteioRegistrarVencedor(vencedor);
    // Mantém o frame do vencedor congelado após a animação.
    sorteioDesenhar();

    const remover=document.getElementById("sorteioRemoverVencedor");
    if(remover&&remover.checked){
      if(sorteioFonteAtiva==="youtube")sorteioLiveRemovedIds.add(String(vencedor.id));
      sorteioParticipantes=sorteioParticipantes.filter(function(item){return item.id!==vencedor.id});
    }

    sorteioRevelando=false;
    sorteioSalvarEstado();
    sorteioRenderParticipantes();
    sorteioRenderHistorico();
    sorteioAtualizarEstadoInscricoes();
    sorteioDefinirFeedback("Vencedor definido: "+vencedor.nome+".","ok");
  }catch(erro){
    // Fallback: mesmo que algum efeito visual falhe, o sorteio sempre conclui.
    sorteioOcultarDigitama(true);
    sorteioRegistrarVencedor(vencedor);
    sorteioDesenhar();
    sorteioRevelando=false;
    sorteioSalvarEstado();
    sorteioRenderHistorico();
    sorteioAtualizarEstadoInscricoes();
    sorteioDefinirFeedback("Vencedor definido: "+vencedor.nome+".","ok");
  }finally{
    // Só libera depois que todas as mudanças de layout da rodada terminaram.
    sorteioLiberarScroll();
  }
}

function inicializarSorteio(){
  const pagina=document.getElementById("sorteioPagina");
  if(!pagina)return;

  if(!sorteioInicializado){
    sorteioCarregarEstado();
    sorteioPrecarregarDigitama();

    const nomeInput=document.getElementById("sorteioNomeInput");
    if(nomeInput){
      nomeInput.addEventListener("keydown",function(event){
        if(event.key==="Enter"){
          event.preventDefault();
          sorteioAdicionarNome();
        }
      });
    }

    const listaInput=document.getElementById("sorteioListaInput");
    if(listaInput){
      listaInput.addEventListener("keydown",function(event){
        if((event.ctrlKey||event.metaKey)&&event.key==="Enter"){
          event.preventDefault();
          sorteioAdicionarLista();
        }
      });
    }

    const youtubeUrl=document.getElementById("sorteioYoutubeUrl");
    if(youtubeUrl){
      youtubeUrl.addEventListener("keydown",function(event){
        if(event.key==="Enter"){
          event.preventDefault();
          sorteioYoutubeConectar();
        }
      });
      youtubeUrl.addEventListener("change",sorteioSalvarLiveLocal);
    }
    const liveCommand=document.getElementById("sorteioLiveCommand");
    if(liveCommand)liveCommand.addEventListener("change",sorteioSalvarLiveLocal);

    sorteioInicializado=true;
    sorteioCarregarLiveLocal();
  }

  if(sorteioFonteAtiva==="manual"){
    sorteioParticipantes=sorteioManualParticipantes.map(function(item){return Object.assign({},item)});
    sorteioInscricoesAbertas=sorteioManualInscricoesAbertas;
  }else{
    sorteioParticipantes=[];
    sorteioInscricoesAbertas=false;
  }
  sorteioAtualizarTudo();
  sorteioAtualizarFonteUI();
  if(sorteioFonteAtiva==="youtube")sorteioRestaurarLive();
}
