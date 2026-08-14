
/* =====================================================
   GITHUB PAGES → HOLY GUARDIANS API
===================================================== */

const HG_API_URL = "https://script.google.com/macros/s/AKfycbzp08aXLQCFeNGRiWHmRKRLZ3qO11_RvBGCnogF79DsMwiYX3_HgTkkZMwTgTNGEwvX/exec";

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
      comparacaoPagina: "comparacao",
      builderPagina: "team-builder",
      elementosPagina: "elementos",
      calculadoraPagina: "calculadora",
      raidBossPagina: "raid-boss",
      socialPagina: "social"
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
    comparacao: {
      pagina: "comparacaoPagina",
      botao: "btnComparacao"
    },
    "team-builder": {
      pagina: "builderPagina",
      botao: "btnBuilder"
    },
    elementos: {
      pagina: "elementosPagina",
      botao: "btnElementos"
    },
    calculadora: {
      pagina: "calculadoraPagina",
      botao: "btnCalculadora"
    },
    "raid-boss": {
      pagina: "raidBossPagina",
      botao: "btnRaidBoss"
    },
    social: {
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

      info.innerHTML =
        "";

    }


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
    atualizarEfeito
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


  info.innerHTML =
    "";


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
        montarCenaElementosHakase();

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
  { name: "Gotsumon", gameName: "MUTATIONGOTSUMON", level: 91, attribute: "DATA", hp: 2271328, gameLocation: "Shibuya", icon: "golemon.webp", map: "Shibuya", mapFile: "shibuya.webp", type: "daily", time: "21:30", spots: [{ x: 27.66, y: 87.516 }, { x: 63.016, y: 79.328 }, { x: 68.484, y: 8.48 }, { x: 89.244, y: 70.004 }, { x: 33.156, y: 10.22 }] },
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
      iconPath: "raid_assets/icons/" + raid.icon,
      mapPath: raid.mapFile ? "raid_assets/maps/" + raid.mapFile : ""
    });
  });

  eventos.push({
    name: raidConfigAtual.name || "Boss de Rotação",
    map: raidConfigAtual.map || "-",
    nextTime: proximoBossRotativo(agora),
    iconPath: "raid_assets/icons/" + (raidConfigAtual.iconFile || "rotation_boss.webp"),
    mapPath: "raid_assets/maps/" + (raidConfigAtual.mapFile || "rotation_boss_map.png"),
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
    mapFile: campo("mapFile", "MAP FILE", "map_file") || "rotation_boss_map.png",
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
        map: raid.map || raid.location || "-",
        mapFile: raid.mapFile || "",
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
        criarSlots();
        criarElementos();
        renderizarComparacao();
        inicializarCalculadora();

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
    abrirPaginaPelaUrl();

    carregarImagensSite();

    inicializarCalculadora();

    carregarDatabase();

    inicializarRaidBoss();

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
