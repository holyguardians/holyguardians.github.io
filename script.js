
/* =====================================================
   GITHUB PAGES → HOLY GUARDIANS API
===================================================== */

const HG_API_URL = "https://script.google.com/macros/s/AKfycbwaO0AV0MDLAnnyCzFfeX4TEgXBoSUr36UytHnOTp-TfVXshy5KyZNBqugGovIxdnPJ/exec";

function chamarApiJsonp(api) {
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

    script.src =
      HG_API_URL +
      "?api=" +
      encodeURIComponent(api) +
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

  return `
    <tr>
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

      <td>${renderizarIconeElemento(d.strong)}</td>
      <td>${renderizarIconeElemento(d.weak)}</td>
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

  document.querySelectorAll(".type-filter-btn").forEach(function(botao, indice) {
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
  return database.find(function(d) {
    return String(d.digimon || "").trim().toLowerCase() === alvo;
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


/* =====================================================
   NAVEGAÇÃO
===================================================== */

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

  const rota =
    String(
      window.location.hash || "#home"
    )
      .replace(/^#/, "")
      .trim()
      .toLowerCase();


  const mapa = {
    home: {
      pagina: "homePagina",
      botao: "btnHome"
    },
    digidex: {
      pagina: "databasePagina",
      botao: "btnDatabase"
    },
    digivolution: {
      pagina: "digivolutionPagina",
      botao: "btnDigivolution"
    },
    comparacao: {
      pagina: "comparacaoPagina",
      botao: "btnComparacao"
    },
    "team-builder": {
      pagina: "builderPagina",
      botao: "btnBuilder"
    },
    "status-simulator": {
      pagina: "statusSimulatorPagina",
      botao: "btnStatusSimulator"
    },
    elementos: {
      pagina: "elementosPagina",
      botao: "btnElementos"
    },
    pvp: {
      pagina: "pvpPagina",
      botao: "btnPvp"
    },
    calculadora: {
      pagina: "calculadoraPagina",
      botao: "btnCalculadora"
    },
    "raid-boss": {
      pagina: "raidBossPagina",
      botao: "btnRaidBoss"
    },
    "dekyu-treasure": {
      pagina: "dekyuTreasurePagina",
      botao: "btnDekyuTreasure"
    },
    social: {
      pagina: "socialPagina",
      botao: "btnSocial"
    },
    comunidade: {
      pagina: "socialPagina",
      botao: "btnSocial"
    }
  };


  const destino =
    mapa[rota] || mapa.home;


  mostrarPagina(
    destino.pagina,
    document.getElementById(
      destino.botao
    ),
    false
  );

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

  const elemento =
    normalizarElemento(
      codigo
    )
      .toLowerCase();

  if (!elemento) {
    return "";
  }

  const candidatos = [
    elemento,
    elemento + ".png",
    "elemento_" + elemento,
    "element_" + elemento,
    "icone_" + elemento,
    "icon_" + elemento
  ];

  for (let i = 0; i < candidatos.length; i++) {

    const candidato =
      candidatos[i];

    const srcDireto =
      pegarImagem(
        candidato
      );

    if (srcDireto) {
      return srcDireto;
    }

    /*
     * Segurança extra:
     * procura também diretamente nas chaves retornadas pelo Drive,
     * caso o Code.gs tenha mantido ".png" no nome.
     */
    const chaveEncontrada =
      Object.keys(
        imagensSite || {}
      )
        .find(function(chave) {

          const limpa =
            String(chave || "")
              .trim()
              .toLowerCase()
              .replace(/\.png$/i, "");

          return limpa === elemento;

        });

    if (chaveEncontrada) {
      return imagensSite[chaveEncontrada] || "";
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


  const imagem =
    d.icon
      ?
      `

        <div class="card-image">

          <img
            src="${d.icon}"
            alt="${d.digimon}"
            loading="lazy"
          >

        </div>

      `
      :
      `

        <div class="card-image">
          ⚔️
        </div>

      `;


  return `

    <div class="card">

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
            ${renderizarIconeElemento(d.strong)}
          </div>

        </div>

        <div class="stat weak element-stat">

          <div class="label">
            WEAK
          </div>

          <div class="value">
            ${renderizarIconeElemento(d.weak)}
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


        const nomeOk =
          nome.includes(texto);


        const tipoOk =
          !tipoSelecionado ||
          tipo === tipoSelecionado;


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

          return String(
            d.digimon ||
            ""
          )
            .toLowerCase()
            .includes(
              busca
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
      "Nenhum Digimon encontrado.";


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
        ${renderizarIconeElemento(d.strong)}
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
        ${renderizarIconeElemento(d.weak)}
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
              ${renderizarIconeElemento(d.strong)}
            </div>
          </div>

          <div class="comparacao-extra-box">
            <div class="label">WEAK</div>
            <div class="value">
              ${renderizarIconeElemento(d.weak)}
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

  const calculo = String(skill.calculo || "").trim();

  const match = calculo.match(
    /(\d+)\s*[x×]\s*([\d.,]+)\s*%\s*(?:=\s*([\d.,]+)\s*%)?/i
  );

  let hits = 0;
  let perHit = 0;
  let baseTotal = 0;

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
      perHit =
        Number(String(percentual[1]).replace(",", ".")) || 0;
      baseTotal = perHit;
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


function calcDadosDoDigimon(d) {
  if (!d) return null;

  return {
    name: String(d.digimon || "").trim(),
    icon: d.icon || "",
    skills: [
      calcInterpretarCoeficienteSkill(d.skill1),
      calcInterpretarCoeficienteSkill(d.skill2),
      calcInterpretarCoeficienteSkill(d.skill3)
    ]
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
   * a Skill 1/2/3 escolhida mantém hits e elementos,
   * mas triplica o coeficiente base por hit e o bônus elemental.
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


            return `
              <article class="calc-skill-card nao-aplica">

                <div class="calc-skill-top">

                  <div>
                    <div class="calc-skill-title">
                      SKILL ${numeroSkill}
                    </div>

                    <div class="calc-skill-lv">
                      LEVEL 10
                    </div>
                  </div>

                  <span class="calc-status nao">
                    SEM COEFICIENTE
                  </span>

                </div>

                <div class="calc-breakdown">
                  Esta skill não possui coeficiente de ataque utilizável na base atual.
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

                <div>
                  <div class="calc-skill-title">
                    SKILL ${numeroSkill}
                  </div>

                  <div class="calc-skill-lv">
                    LEVEL 10
                  </div>
                </div>

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
                = ${calcFormatar(skill.baseTotal)}%

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

                      <strong>
                        ${skill.hits} hits ×
                        (${calcFormatar(skill.perHit)}% + ${calcFormatar(bonusPorHit)}%)
                      </strong>
                      =
                      <strong>
                        ${calcFormatar(totalFinal)}%
                      </strong>
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
      .map(
        function(skill, index) {
          return {
            skill: skill,
            index: index
          };
        }
      )
      .filter(
        function(item) {
          return (
            item.skill &&
            item.skill.available &&
            Number.isFinite(
              item.skill.baseTotal
            ) &&
            Number.isFinite(
              item.skill.perHit
            ) &&
            Number.isFinite(
              item.skill.hits
            )
          );
        }
      );


  if (
    !skillsDisponiveis.some(
      function(item) {
        return item.index === calcBurstSkillSelecionada;
      }
    )
  ) {
    calcBurstSkillSelecionada =
      skillsDisponiveis.length
        ? skillsDisponiveis[0].index
        : 0;
  }


  const opcoesBurst =
    digi.skills
      .map(
        function(skill, index) {

          const disponivel =
            skill &&
            skill.available &&
            Number.isFinite(
              skill.baseTotal
            ) &&
            Number.isFinite(
              skill.perHit
            ) &&
            Number.isFinite(
              skill.hits
            );

          return `
            <option
              value="${index}"
              ${
                index === calcBurstSkillSelecionada
                  ? "selected"
                  : ""
              }
              ${
                disponivel
                  ? ""
                  : "disabled"
              }
            >
              Skill ${index + 1}${disponivel ? "" : " — indisponível"}
            </option>
          `;

        }
      )
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
            MULTIPLICADOR ×3
          </div>
        </div>
      </div>

      <div class="calc-burst-selector-row">
        <label for="calcBurstSkillSelect">
          Usar como base
        </label>
        <select
          id="calcBurstSkillSelect"
          class="calc-select calc-burst-select"
          onchange="calcSelecionarBurstSkill(this.value)"
        >
          ${opcoesBurst}
        </select>
      </div>

      <div class="calc-breakdown">
        Nenhuma Skill com coeficiente utilizável está disponível para a Burst.
      </div>
    </article>
  `;


  if (
    skillBurst &&
    skillBurst.available &&
    Number.isFinite(
      skillBurst.baseTotal
    ) &&
    Number.isFinite(
      skillBurst.perHit
    ) &&
    Number.isFinite(
      skillBurst.hits
    )
  ) {

    const aplicaBurst =
      Array.isArray(
        skillBurst.elements
      )
      &&
      skillBurst.elements.includes(
        elemento
      );


    const perHitBurst =
      skillBurst.perHit * 3;

    const baseTotalBurst =
      skillBurst.baseTotal * 3;

    const bonusNormalPorHit =
      aplicaBurst
        ? (
            skillBurst.perHit *
            fatorElemento
          )
        : 0;

    const bonusBurstPorHit =
      bonusNormalPorHit * 3;

    const bonusBurstTotal =
      bonusBurstPorHit *
      skillBurst.hits;

    const totalBurst =
      baseTotalBurst +
      bonusBurstTotal;

    const numeroSkillBurst =
      calcBurstSkillSelecionada + 1;

    const tagsBurst =
      (
        skillBurst.elements ||
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


    cardBurst = `
      <article
        class="calc-skill-card calc-burst-card ${
          aplicaBurst
            ? "aplica"
            : "nao-aplica"
        }"
      >

        <div class="calc-skill-top">
          <div>
            <div class="calc-skill-title calc-burst-title">
              BURST SKILL
            </div>
            <div class="calc-skill-lv">
              SKILL ${numeroSkillBurst} • LEVEL 10 • MULTIPLICADOR ×3
            </div>
          </div>

          <span
            class="calc-status ${
              aplicaBurst
                ? "sim"
                : "nao"
            }"
          >
            ${
              aplicaBurst
                ? elemento + " APLICADO"
                : "SEM BÔNUS"
            }
          </span>
        </div>


        <div class="calc-burst-selector-row">
          <label for="calcBurstSkillSelect">
            Burst baseada em
          </label>
          <select
            id="calcBurstSkillSelect"
            class="calc-select calc-burst-select"
            onchange="calcSelecionarBurstSkill(this.value)"
          >
            ${opcoesBurst}
          </select>
        </div>


        <div class="calc-formula-row calc-burst-formula">

          <div>
            <div class="calc-number-label">
              Base Burst total
            </div>
            <div class="calc-number">
              ${calcFormatar(baseTotalBurst)}%
            </div>
          </div>

          <div class="calc-arrow">
            →
          </div>

          <div>
            <div class="calc-number-label">
              Dano Burst total
            </div>
            <div class="calc-number final calc-burst-final">
              ${calcFormatar(totalBurst)}%
            </div>
          </div>

        </div>


        <div class="calc-breakdown calc-burst-breakdown">
          Skill ${numeroSkillBurst} original:
          <strong>
            ${skillBurst.hits} hits × ${calcFormatar(skillBurst.perHit)}%
          </strong>
          = ${calcFormatar(skillBurst.baseTotal)}%

          <br>

          Burst ×3:
          <strong>
            ${skillBurst.hits} hits × ${calcFormatar(perHitBurst)}%
          </strong>
          = ${calcFormatar(baseTotalBurst)}%

          <br>

          ${
            aplicaBurst
              ? `
                Bônus elemental normal por hit:
                <strong>
                  +${calcFormatar(bonusNormalPorHit)}%
                </strong>

                <br>

                Bônus elemental Burst por hit:
                <strong class="calc-number bonus" style="font-size:13px;">
                  +${calcFormatar(bonusBurstPorHit)}%
                </strong>
                (${calcFormatar(bonusNormalPorHit)} × 3)

                <br>

                Bônus elemental Burst total:
                <strong>
                  +${calcFormatar(bonusBurstTotal)}%
                </strong>

                <br>

                <strong>
                  ${skillBurst.hits} hits ×
                  (${calcFormatar(perHitBurst)}% + ${calcFormatar(bonusBurstPorHit)}%)
                </strong>
                =
                <strong>
                  ${calcFormatar(totalBurst)}%
                </strong>
              `
              : `
                O elemento ${elemento} não entra na Skill ${numeroSkillBurst};
                portanto a Burst mantém apenas o dano base ×3.
              `
          }
        </div>


        <div class="calc-elements">
          ${tagsBurst}
        </div>

      </article>
    `;
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

    atualizarBotoesViewDigidex();
    montarFiltrosAvancadosDigidex();
    inicializarFechamentoFiltrosDigidex();
    inicializarDigivolution();
    inicializarStatusSimulator();
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
    ? normalizarElemento(element)
    : String(element||"").trim().toUpperCase());

  if(!e)return "";

  const iconKey=e==="STEEL"?"IRON":e;

  const src=(typeof pegarImagemElemento==="function"
    ? pegarImagemElemento(iconKey)
    : "") || `ELEMENTOS ICONS/${encodeURIComponent(iconKey)}.png`;

  return `<span class="pvp-mini-icon-tag pvp-element-icon-tag" title="${pvpEscapeHtml(e)}">
    <img src="${src}" alt="${pvpEscapeHtml(e)}"><b>${pvpEscapeHtml(e)}</b>
  </span>`;
}

function pvpMetaIconsHtml(digi){
  if(!digi)return "";
  const fields=String(digi.fields||"").split(/[,/|]+/).map(function(x){return x.trim()}).filter(Boolean);
  const elements=Array.isArray(digi.elements)?digi.elements:[];
  return `<div class="pvp-meta-icons">
    <div class="pvp-meta-icon-group"><small>TYPE</small>${pvpTypeIconHtml(digi.attribute)}</div>
    ${elements.length ? `<div class="pvp-meta-icon-group"><small>ELEMENT</small><div class="pvp-meta-icon-list">${elements.map(pvpElementIconHtml).join("")}</div></div>` : ""}
    ${fields.length ? `<div class="pvp-meta-icon-group"><small>FIELD</small><div class="pvp-meta-icon-list">${fields.map(pvpFieldIconHtml).join("")}</div></div>` : ""}
  </div>`;
}


function fecharPvpNavMenu(){const d=document.getElementById("pvpNavDropdown");if(d)d.classList.remove("aberto")}
function togglePvpNavMenu(event){if(event){event.preventDefault();event.stopPropagation()}const d=document.getElementById("pvpNavDropdown");if(d)d.classList.toggle("aberto")}
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
  const id=nome==="match"?"pvpMatchView":nome==="individual"?"pvpIndividualView":nome==="import"?"pvpImportView":"pvpBuildView";
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
    return{slot:index+1,did:slot.dataset.did?Number(slot.dataset.did):null,digimon:slot.dataset.digimon||null,build:slot._hgPvpBuild||null}
  });
  return{format:"holy-guardians-pvp-team",version:2,stage:pvpStageAtual,level:PVP_STAGE_LEVEL[pvpStageAtual]||100,slots:slots}
}

function pvpAplicarEstado(pacote){
  if(!pacote||pacote.format!=="holy-guardians-pvp-team"||!Array.isArray(pacote.slots))throw new Error("Este arquivo não é um time PvP exportado pela Holy Guardians.");
  pvpCriarSlots();
  const stagesValidas=["Rookie","Champion","Ultimate","Mega"],stage=stagesValidas.includes(pacote.stage)?pacote.stage:"Mega";
  pvpSelecionarStage(stage,PVP_STAGE_LEVEL[stage]);
  document.querySelectorAll("#pvpSlots .pvp-slot").forEach(function(slot,index){
    const salvo=pacote.slots.find(function(item){return Number(item.slot)===index+1})||pacote.slots[index]||null;
    slot.dataset.did=salvo&&salvo.did?String(salvo.did):"";slot.dataset.digimon=salvo&&salvo.digimon?String(salvo.digimon):"";
    slot._hgPvpBuild=salvo&&salvo.build?salvo.build:null
  });
  pvpAtualizarTodosSlots();pvpSalvarEstadoLocal()
}

function pvpSalvarEstadoLocal(){try{localStorage.setItem(PVP_STORAGE_KEY,JSON.stringify(pvpLerEstado()))}catch(erro){}}

function pvpRestaurarEstadoLocal(){
  try{
    const salvo=localStorage.getItem(PVP_STORAGE_KEY);
    if(!salvo){pvpSelecionarStage("Mega",100);return}
    const pacote=JSON.parse(salvo);
    if(pacote&&pacote.stage&&PVP_STAGE_LEVEL[pacote.stage]){
      pvpStageAtual=pacote.stage;const label=document.getElementById("pvpStageLabel");if(label)label.textContent=pvpStageTexto(pvpStageAtual)
    }
    if(pacote&&Array.isArray(pacote.slots)){
      document.querySelectorAll("#pvpSlots .pvp-slot").forEach(function(slot,index){
        const s=pacote.slots.find(function(item){return Number(item.slot)===index+1})||pacote.slots[index];
        if(!s)return;slot.dataset.did=s.did?String(s.did):"";slot.dataset.digimon=s.digimon||"";slot._hgPvpBuild=s.build||null
      })
    }
    pvpAtualizarTodosSlots()
  }catch(erro){pvpSelecionarStage("Mega",100)}
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
      pvpBuildIndex=0;
      pvpMostrarView("individual");
      pvpRenderBuildTabs();
      pvpRenderBuildAtual();
    }else{
      pvpMostrarView("build");
      pvpAtualizarBotaoEtapa2();
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
  const stage=document.getElementById("pvpStageSelect");if(stage&&!stage.contains(event.target))pvpFecharStageMenu();
  const overlay=document.getElementById("pvpPickerOverlay");if(overlay&&event.target===overlay)pvpFecharPicker()
});
document.addEventListener("keydown",function(event){if(event.key==="Escape"){fecharPvpNavMenu();pvpFecharStageMenu();pvpFecharPicker()}});
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
    slot._hgPvpBuild={
      baby:{HP:0,SP:0,STR:0,INT:0,DEF:0,RES:0,SPD:0},
      tetris:{HP:0,SP:0,STR:0,INT:0,DEF:0,RES:0,SPD:0},
      buff:{HP:0,SP:0,STR:0,INT:0,DEF:0,RES:0,SPD:0},
      complete:false
    };
  }
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
  const progress=document.getElementById("pvpBuildProgress");
  if(img&&digi){img.src=digi.icon;img.alt=digi.name}
  if(name)name.textContent=digi?digi.name:"DIGIMON";
  if(meta&&digi)meta.innerHTML=`<span class="pvp-current-stage">${digi.stage.toUpperCase()} · LV. ${digi.level}</span>${pvpMetaIconsHtml(digi)}`;
  if(sl)sl.textContent="SLOT "+String(pvpBuildIndex+1).padStart(2,"0");
  if(progress)progress.textContent=(pvpBuildIndex+1)+" / 8";

  pvpRenderBabyGrid(build);
  pvpRenderTetrisGrid(build);
  pvpRenderBuffGrid(build);
  pvpRenderSummary(build,digi);
  pvpAtualizarFinalActions();
}

function pvpRenderBabyGrid(build){
  const grid=document.getElementById("pvpBabyGrid");
  if(!grid)return;
  grid.innerHTML="";
  PVP_BUILD_STATS.forEach(function(stat){
    const row=document.createElement("label");
    row.className="pvp-stat-input";
    row.innerHTML='<span>'+stat+'</span><input type="number" min="0" max="14" step="1" value="'+(build.baby[stat]||0)+'"><em>%</em>';
    const input=row.querySelector("input");
    input.oninput=function(){
      let v=Math.max(0,Math.min(14,Number(input.value)||0));
      const others=PVP_BUILD_STATS.reduce(function(sum,s){return sum+(s===stat?0:(Number(build.baby[s])||0))},0);
      if(others+v>28)v=Math.max(0,28-others);
      input.value=v;
      build.baby[stat]=v;
      build.complete=false;
      pvpAtualizarBuildCalculado()
    };
    grid.appendChild(row)
  });
  pvpAtualizarBabyTotal(build)
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
  grid.innerHTML="";
  PVP_BUILD_STATS.forEach(function(stat){
    const row=document.createElement("label");
    row.className="pvp-stat-input";
    row.innerHTML='<span>'+stat+'</span><input type="number" min="0" step="1" value="'+(build.buff[stat]||0)+'"><em>+</em>';
    const input=row.querySelector("input");
    input.oninput=function(){
      build.buff[stat]=Math.max(0,Number(input.value)||0);
      build.complete=false;
      pvpAtualizarBuildCalculado()
    };
    grid.appendChild(row)
  })
}

function pvpGetBaseStat(digi,stat){
  if(!digi)return 0;
  const key="base"+stat;
  return Number(digi[key]||0)
}


function pvpCalcularCriticosComFormulaDoSimulator(build,digi){
  if(typeof calcularCritRateStatusSimulator!=="function")return null;

  const snapshot={
    digimon:statusSimulatorDigimon,
    baby:statusSimulatorBaby,
    cubes:statusSimulatorCubes,
    accessories:statusSimulatorAccessories,
    clothing:statusSimulatorClothing,
    deck:statusSimulatorDeck
  };

  try{
    // Mantém o INT BASE real do Digimon.
    statusSimulatorDigimon={
      digimon:digi.name||"",
      stage:digi.stage||"",
      type:digi.attribute||"UNKNOWN",
      hp:pvpGetBaseStat(digi,"HP"),
      sp:pvpGetBaseStat(digi,"SP"),
      str:pvpGetBaseStat(digi,"STR"),
      int:pvpGetBaseStat(digi,"INT"),
      def:pvpGetBaseStat(digi,"DEF"),
      res:pvpGetBaseStat(digi,"RES"),
      spd:pvpGetBaseStat(digi,"SPD")
    };

    statusSimulatorBaby={HP:0,SP:0,STR:0,INT:0,DEF:0,RES:0,SPD:0};
    PVP_BUILD_STATS.forEach(function(stat){
      statusSimulatorBaby[stat]=Number(build.baby[stat]||0);
    });

    // O PvP usa somente cubos de 3%.
    statusSimulatorCubes=[];
    PVP_TETRIS_STATS.forEach(function(stat){
      const qtd=Math.max(0,Number(build.tetris[stat]||0));
      for(let i=0;i<qtd;i++){
        statusSimulatorCubes.push({stat:stat,percent:3,mega:false});
      }
    });

    statusSimulatorAccessories={HP:0,SP:0,STR:0,INT:0,DEF:0,RES:0,SPD:0};
    statusSimulatorClothing={HP:0,SP:0,STR:0,INT:0,DEF:0,RES:0,SPD:0};
    statusSimulatorDeck={HP:0,SP:0,STR:0,INT:0,DEF:0,RES:0,SPD:0};
    PVP_BUILD_STATS.forEach(function(stat){
      statusSimulatorDeck[stat]=Number(build.buff[stat]||0);
    });

    return calcularCritRateStatusSimulator();
  }catch(erro){
    console.error("[PvP] Erro ao calcular críticos:",erro);
    return null;
  }finally{
    statusSimulatorDigimon=snapshot.digimon;
    statusSimulatorBaby=snapshot.baby;
    statusSimulatorCubes=snapshot.cubes;
    statusSimulatorAccessories=snapshot.accessories;
    statusSimulatorClothing=snapshot.clothing;
    statusSimulatorDeck=snapshot.deck;
  }
}

function pvpRenderCriticos(build,digi){
  const crit=pvpCalcularCriticosComFormulaDoSimulator(build,digi);
  if(!crit)return "";

  return `<div class="pvp-crit-result">
    <div class="pvp-crit-grid">
      <div><strong>CRIT RATE</strong><b>${crit.critRate.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}%</b></div>
      <div><strong>CRIT DOWN</strong><b>${crit.critDown.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}%</b></div>
      <div class="pvp-crit-range"><strong>DAMAGE RANGE</strong><b>${crit.damageRangeMin.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}% ~ ${crit.damageRangeMax.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}%</b></div>
      <div><strong>CRITDMG</strong><b>${crit.critDmg.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}%</b></div>
    </div>
    <small>CURVA: INT BASE ${formatarStatusSimulator(crit.intBase)} · INT FINAL ${formatarStatusSimulator(crit.intFinal)} · BÔNUS DE INT +${formatarStatusSimulator(crit.bonusInt)}</small>
    <em>VALORES CRÍTICOS APROXIMADOS · A FÓRMULA SEGUE EM CALIBRAÇÃO</em>
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

    const babyBonus=Math.round(base*(babyPct/100));
    const tetrisBonus=Math.round(base*(tetrisPct/100));
    const totalBonus=babyBonus+tetrisBonus+deck;
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
  if(!confirm("Limpar Baby Correction, Tetris e Buff Deck deste Digimon?"))return;
  slot._hgPvpBuild=null;
  pvpRenderBuildTabs();pvpRenderBuildAtual();pvpSalvarEstadoLocal()
}

function pvpLimparTimeCompleto(){
  if(!confirm("Limpar todo o time PvP? Isso remove os 8 Digimons e todos os builds."))return;
  pvpBuildSlots().forEach(function(slot){pvpLimparSlot(slot);slot._hgPvpBuild=null});
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
  pvpSalvarEstadoLocal();
  alert("Time PvP salvo neste navegador.")
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

