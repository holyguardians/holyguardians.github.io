
/* =====================================================
   GITHUB PAGES → HOLY GUARDIANS API
===================================================== */

const HG_API_URL = "https://script.google.com/macros/s/AKfycbxVM3E369Cofmp6SOcB3IISDFPnVebwVUzKp9Vcnf8JmSFXsnQJWzV1OQsWzuUSqKYG/exec";

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


/* =====================================================
   NAVEGAÇÃO
===================================================== */

function mostrarPagina(
  id,
  botao
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


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

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
          TYPE:
          ${tipo || "-"}
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


  const filtroTipo =
    document.getElementById(
      "filtroTipo"
    );


  const ordenacao =
    document.getElementById(
      "ordenacao"
    );


  const texto =
    campo
      ?
      campo.value
        .toLowerCase()
        .trim()
      :
      "";


  const tipoSelecionado =
    filtroTipo
      ?
      normalizarType(
        filtroTipo.value
      )
      :
      "";


  const ordem =
    ordenacao
      ?
      ordenacao.value
      :
      "";


  let filtrados =
    database.filter(
      function(d) {

        const nome =
          String(
            d.digimon ||
            ""
          )
            .toLowerCase();


        const tipo =
          normalizarType(
            d.type
          );


        return (
          nome.includes(
            texto
          )
          &&
          (
            !tipoSelecionado
            ||
            tipo ===
            tipoSelecionado
          )
        );

      }
    );


  if (!ordem) {

    filtrados.sort(
      function(a,b) {

        return String(
          a.digimon ||
          ""
        ).localeCompare(
          String(
            b.digimon ||
            ""
          )
        );

      }
    );

  } else {

    let campoOrdenacao =
      ordem;


    let crescente =
      false;


    if (
      ordem.endsWith(
        "_ASC"
      )
    ) {

      crescente =
        true;


      campoOrdenacao =
        ordem.replace(
          "_ASC",
          ""
        );

    }


    filtrados.sort(
      function(a,b) {

        const valorA =
          Number(
            a[
              campoOrdenacao
                .toLowerCase()
            ]
          ) || 0;


        const valorB =
          Number(
            b[
              campoOrdenacao
                .toLowerCase()
            ]
          ) || 0;


        return crescente
          ?
          valorA - valorB
          :
          valorB - valorA;

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


  lista.innerHTML =
    "";


  if (
    filtrados.length ===
    0
  ) {

    lista.innerHTML = `

      <div class="erro">
        Nenhum Digimon encontrado.
      </div>

    `;

    return;

  }


  filtrados.forEach(
    function(d) {

      lista.innerHTML +=
        criarCard(
          d
        );

    }
  );

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


  typeBox.textContent =
    "TYPE: "
    +
    (
      tipo ||
      "-"
    );


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

        if (
          headerLogo &&
          logo
        ) {
          headerLogo.src =
            logo;
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

const comparacaoSelecionados = {
  A: null,
  B: null
};


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


function classeStatCard(
  valorAtual,
  valorOutro
) {
  const atual =
    numeroComparacao(
      valorAtual
    );

  const outro =
    numeroComparacao(
      valorOutro
    );

  if (
    atual === null ||
    outro === null
  ) {
    return "";
  }

  if (atual === outro) {
    return "empate";
  }

  return atual > outro
    ? "maior"
    : "menor";
}


function setaStatCard(
  valorAtual,
  valorOutro
) {
  const classe =
    classeStatCard(
      valorAtual,
      valorOutro
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


function statCardComparacao(
  label,
  valorAtual,
  valorOutro
) {
  const classe =
    classeStatCard(
      valorAtual,
      valorOutro
    );

  return `
    <div class="comparacao-stat ${classe}">

      <div class="comparacao-stat-label">
        ${label}
      </div>

      <div class="comparacao-stat-value ${classe}">
        ${setaStatCard(valorAtual, valorOutro)}
        <span>
          ${valorSeguroComparacao(valorAtual)}
        </span>
      </div>

    </div>
  `;
}


function cardComparacao(
  d,
  outro
) {
  const tipo =
    normalizarType(
      d.type
    );

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
          ${escaparHtml(tipo || "-")}
        </div>
      </div>

      <div class="comparacao-stats">

        ${statCardComparacao("HP", d.hp, outro.hp)}
        ${statCardComparacao("SP", d.sp, outro.sp)}
        ${statCardComparacao("STR", d.str, outro.str)}
        ${statCardComparacao("INT", d.int, outro.int)}
        ${statCardComparacao("DEF", d.def, outro.def)}
        ${statCardComparacao("RES", d.res, outro.res)}
        ${statCardComparacao("SPD", d.spd, outro.spd)}

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

  const a =
    comparacaoSelecionados.A;

  const b =
    comparacaoSelecionados.B;

  if (!a || !b) {
    resultado.innerHTML = `
      <div class="comparacao-empty">
        Escolha dois Digimons para iniciar a comparação.
      </div>
    `;
    return;
  }

  resultado.innerHTML = `
    <div class="comparacao-grid">

      ${cardComparacao(a, b)}

      ${cardComparacao(b, a)}

    </div>
  `;
}


document.addEventListener(
  "click",
  function(evento) {

    ["A", "B"].forEach(
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

const skillCalcDatabase = [{"name":"Agumon_Kizuna","skills":[{"available":true,"hits":1,"perHit":95.0,"baseTotal":95.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","FIRE","WIND","STEEL"]},{"available":true,"hits":4,"perHit":43.0,"baseTotal":172.0,"baseElement":"FIRE","elements":["FIRE","WIND","LIGHT"]},{"available":true,"hits":6,"perHit":23.0,"baseTotal":138.0,"baseElement":"FIRE","elements":["FIRE","WIND","EARTH","STEEL"]}]},{"name":"Apocalymon","skills":[{"available":true,"hits":2,"perHit":48.0,"baseTotal":96.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","THUNDER","STEEL"]},{"available":true,"hits":3,"perHit":48.0,"baseTotal":144.0,"baseElement":"DARKNESS","elements":["FIRE","STEEL","DARKNESS"]},{"available":true,"hits":6,"perHit":21.0,"baseTotal":126.0,"baseElement":"DARKNESS","elements":["PHYSICAL","EARTH","STEEL","DARKNESS"]}]},{"name":"Armageddemon","skills":[{"available":true,"hits":1,"perHit":95.0,"baseTotal":95.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","FIRE"]},{"available":true,"hits":8,"perHit":17.0,"baseTotal":136.0,"baseElement":"STEEL","elements":["PHYSICAL","FIRE","STEEL"]},{"available":true,"hits":3,"perHit":48.0,"baseTotal":144.0,"baseElement":"FIRE","elements":["PHYSICAL","FIRE","STEEL"]}]},{"name":"Azulongmon","skills":[{"available":true,"hits":2,"perHit":48.0,"baseTotal":96.0,"baseElement":"THUNDER","elements":["THUNDER","ICE","WATER"]},{"available":true,"hits":7,"perHit":20.0,"baseTotal":140.0,"baseElement":"THUNDER","elements":["THUNDER","WIND","WATER","LIGHT"]},{"available":true,"hits":3,"perHit":44.0,"baseTotal":132.0,"baseElement":"THUNDER","elements":["PHYSICAL","THUNDER","WATER","LIGHT"]}]},{"name":"Babamon","skills":[{"available":true,"hits":7,"perHit":14.0,"baseTotal":98.0,"baseElement":"PHYSICAL","elements":["PHYSICAL"]},{"available":false,"hits":1,"perHit":null,"baseTotal":null,"baseElement":"EARTH","elements":["EARTH"]},{"available":true,"hits":4,"perHit":36.0,"baseTotal":144.0,"baseElement":"LIGHT","elements":["LIGHT"]}]},{"name":"Baihumon","skills":[{"available":true,"hits":3,"perHit":32.0,"baseTotal":96.0,"baseElement":"STEEL","elements":["PHYSICAL","EARTH","STEEL"]},{"available":true,"hits":1,"perHit":145.0,"baseTotal":145.0,"baseElement":"THUNDER","elements":["FIRE","THUNDER","EARTH","LIGHT"]},{"available":true,"hits":3,"perHit":41.0,"baseTotal":123.0,"baseElement":"STEEL","elements":["THUNDER","WIND","STEEL"]}]},{"name":"Bancholeomon","skills":[{"available":true,"hits":1,"perHit":95.0,"baseTotal":95.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","THUNDER","EARTH"]},{"available":true,"hits":4,"perHit":32.0,"baseTotal":128.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","WIND","STEEL","DARKNESS"]},{"available":true,"hits":1,"perHit":145.0,"baseTotal":145.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","THUNDER","WIND","EARTH"]}]},{"name":"Bancholeomon:Burstmode","skills":[{"available":true,"hits":5,"perHit":19.0,"baseTotal":95.0,"baseElement":"FIRE","elements":["PHYSICAL","FIRE","EARTH"]},{"available":true,"hits":10,"perHit":14.0,"baseTotal":140.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","WIND","WATER","STEEL"]},{"available":true,"hits":5,"perHit":26.0,"baseTotal":130.0,"baseElement":"FIRE","elements":["PHYSICAL","FIRE","THUNDER","EARTH"]}]},{"name":"Banchomamemon","skills":[{"available":true,"hits":7,"perHit":14.0,"baseTotal":98.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","THUNDER","WIND","STEEL"]},{"available":true,"hits":9,"perHit":14.0,"baseTotal":126.0,"baseElement":"FIRE","elements":["PHYSICAL","FIRE","THUNDER"]},{"available":true,"hits":1,"perHit":145.0,"baseTotal":145.0,"baseElement":"WIND","elements":["PHYSICAL","FIRE","WIND","STEEL"]}]},{"name":"Beelzemon","skills":[{"available":true,"hits":5,"perHit":19.0,"baseTotal":95.0,"baseElement":"DARKNESS","elements":["DARKNESS"]},{"available":true,"hits":7,"perHit":24.0,"baseTotal":168.0,"baseElement":"PHYSICAL","elements":["PHYSICAL"]},{"available":true,"hits":2,"perHit":72.0,"baseTotal":144.0,"baseElement":"PHYSICAL","elements":["PHYSICAL"]}]},{"name":"Beelzemon-Xwars","skills":[{"available":true,"hits":6,"perHit":16.0,"baseTotal":96.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","FIRE","THUNDER","STEEL"]},{"available":true,"hits":1,"perHit":128.0,"baseTotal":128.0,"baseElement":"DARKNESS","elements":["PHYSICAL","THUNDER","STEEL","DARKNESS"]},{"available":true,"hits":1,"perHit":145.0,"baseTotal":145.0,"baseElement":"DARKNESS","elements":["THUNDER","WIND","LIGHT","DARKNESS"]}]},{"name":"Beelzemon:Blastmode","skills":[{"available":true,"hits":3,"perHit":32.0,"baseTotal":96.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","FIRE","STEEL","DARKNESS"]},{"available":true,"hits":4,"perHit":42.0,"baseTotal":168.0,"baseElement":"DARKNESS","elements":["FIRE","WIND","DARKNESS"]},{"available":true,"hits":4,"perHit":36.0,"baseTotal":144.0,"baseElement":"DARKNESS","elements":["FIRE","THUNDER","DARKNESS"]}]},{"name":"Belphemon:Ragemode","skills":[{"available":true,"hits":3,"perHit":32.0,"baseTotal":96.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","STEEL","DARKNESS"]},{"available":true,"hits":3,"perHit":48.0,"baseTotal":144.0,"baseElement":"DARKNESS","elements":["PHYSICAL","FIRE","STEEL","DARKNESS"]},{"available":true,"hits":5,"perHit":19.0,"baseTotal":95.0,"baseElement":"STEEL","elements":["FIRE","STEEL","DARKNESS"]}]},{"name":"Belphemon:Sleepmode","skills":[{"available":true,"hits":4,"perHit":24.0,"baseTotal":96.0,"baseElement":"STEEL","elements":["PHYSICAL","STEEL","DARKNESS"]},{"available":true,"hits":5,"perHit":29.0,"baseTotal":145.0,"baseElement":"FIRE","elements":["FIRE","THUNDER","STEEL","DARKNESS"]},{"available":true,"hits":5,"perHit":26.0,"baseTotal":130.0,"baseElement":"DARKNESS","elements":["PHYSICAL","THUNDER","WIND","DARKNESS"]}]},{"name":"Blackseraphimon","skills":[{"available":true,"hits":2,"perHit":48.0,"baseTotal":96.0,"baseElement":"DARKNESS","elements":["PHYSICAL","WIND","DARKNESS"]},{"available":true,"hits":7,"perHit":21.0,"baseTotal":147.0,"baseElement":"DARKNESS","elements":["FIRE","THUNDER","DARKNESS"]},{"available":true,"hits":4,"perHit":46.0,"baseTotal":184.0,"baseElement":"FIRE","elements":["FIRE","WIND","EARTH","DARKNESS"]}]},{"name":"Blackwargreymon","skills":[{"available":true,"hits":2,"perHit":48.0,"baseTotal":96.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","THUNDER","STEEL"]},{"available":true,"hits":5,"perHit":29.0,"baseTotal":145.0,"baseElement":"STEEL","elements":["WIND","STEEL","DARKNESS"]},{"available":true,"hits":1,"perHit":128.0,"baseTotal":128.0,"baseElement":"DARKNESS","elements":["FIRE","EARTH","DARKNESS"]}]},{"name":"Blastmon","skills":[{"available":true,"hits":1,"perHit":95.0,"baseTotal":95.0,"baseElement":"EARTH","elements":["PHYSICAL","EARTH","STEEL","DARKNESS"]},{"available":true,"hits":8,"perHit":16.0,"baseTotal":128.0,"baseElement":"FIRE","elements":["FIRE","THUNDER","STEEL","LIGHT"]},{"available":true,"hits":7,"perHit":21.0,"baseTotal":147.0,"baseElement":"EARTH","elements":["ICE","EARTH","STEEL","LIGHT"]}]},{"name":"Blitzgreymon","skills":[{"available":true,"hits":3,"perHit":32.0,"baseTotal":96.0,"baseElement":"THUNDER","elements":["FIRE","THUNDER","STEEL","DARKNESS"]},{"available":true,"hits":5,"perHit":29.0,"baseTotal":145.0,"baseElement":"THUNDER","elements":["THUNDER","WATER","STEEL","LIGHT","DARKNESS"]},{"available":false,"hits":1,"perHit":null,"baseTotal":null,"baseElement":"THUNDER","elements":["THUNDER","WATER","STEEL","LIGHT"]}]},{"name":"Bloomlordmon","skills":[{"available":true,"hits":6,"perHit":16.0,"baseTotal":96.0,"baseElement":"WOOD","elements":["WOOD"]},{"available":true,"hits":4,"perHit":36.0,"baseTotal":144.0,"baseElement":"PHYSICAL","elements":["PHYSICAL"]},{"available":true,"hits":5,"perHit":33.0,"baseTotal":165.0,"baseElement":"LIGHT","elements":["LIGHT"]}]},{"name":"Breakdramon","skills":[{"available":true,"hits":6,"perHit":16.0,"baseTotal":96.0,"baseElement":"PHYSICAL","elements":["PHYSICAL"]},{"available":true,"hits":6,"perHit":24.0,"baseTotal":144.0,"baseElement":"STEEL","elements":["STEEL"]},{"available":true,"hits":4,"perHit":35.0,"baseTotal":140.0,"baseElement":"DARKNESS","elements":["DARKNESS"]}]},{"name":"Cherubimon(Black)","skills":[{"available":true,"hits":1,"perHit":95.0,"baseTotal":95.0,"baseElement":"DARKNESS","elements":["THUNDER","EARTH","LIGHT","DARKNESS"]},{"available":true,"hits":8,"perHit":18.0,"baseTotal":144.0,"baseElement":"DARKNESS","elements":["FIRE","THUNDER","EARTH","DARKNESS"]},{"available":true,"hits":5,"perHit":28.0,"baseTotal":140.0,"baseElement":"THUNDER","elements":["FIRE","THUNDER","DARKNESS"]}]},{"name":"Cherubimon(Good)","skills":[{"available":true,"hits":1,"perHit":95.0,"baseTotal":95.0,"baseElement":"LIGHT","elements":["PHYSICAL","THUNDER","EARTH","LIGHT"]},{"available":true,"hits":5,"perHit":29.0,"baseTotal":145.0,"baseElement":"LIGHT","elements":["THUNDER","WIND","STEEL","LIGHT"]},{"available":true,"hits":6,"perHit":21.0,"baseTotal":126.0,"baseElement":"THUNDER","elements":["THUNDER","EARTH","STEEL","LIGHT"]}]},{"name":"Clavisangemon","skills":[{"available":true,"hits":1,"perHit":95.0,"baseTotal":95.0,"baseElement":"LIGHT","elements":["PHYSICAL","WIND","STEEL","LIGHT"]},{"available":true,"hits":2,"perHit":64.0,"baseTotal":128.0,"baseElement":"STEEL","elements":["ICE","EARTH","STEEL"]},{"available":true,"hits":4,"perHit":36.0,"baseTotal":144.0,"baseElement":"DARKNESS","elements":["FIRE","THUNDER","STEEL","DARKNESS"]}]},{"name":"Craniamon","skills":[{"available":true,"hits":3,"perHit":32.0,"baseTotal":96.0,"baseElement":"LIGHT","elements":["FIRE","THUNDER","STEEL","LIGHT"]},{"available":true,"hits":4,"perHit":36.0,"baseTotal":144.0,"baseElement":"STEEL","elements":["THUNDER","WIND","STEEL"]},{"available":false,"hits":1,"perHit":null,"baseTotal":null,"baseElement":"STEEL","elements":["PHYSICAL","THUNDER","STEEL","LIGHT"]}]},{"name":"Creepymon","skills":[{"available":true,"hits":2,"perHit":48.0,"baseTotal":96.0,"baseElement":"DARKNESS","elements":["DARKNESS"]},{"available":true,"hits":1,"perHit":145.0,"baseTotal":145.0,"baseElement":"FIRE","elements":["FIRE"]},{"available":true,"hits":1,"perHit":188.0,"baseTotal":188.0,"baseElement":"FIRE","elements":["FIRE"]}]},{"name":"Cresgarurumon","skills":[{"available":true,"hits":4,"perHit":24.0,"baseTotal":96.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","WIND","ICE","STEEL"]},{"available":true,"hits":3,"perHit":48.0,"baseTotal":144.0,"baseElement":"STEEL","elements":["WIND","ICE","STEEL"]},{"available":true,"hits":5,"perHit":26.0,"baseTotal":130.0,"baseElement":"ICE","elements":["WIND","ICE","WATER","STEEL","LIGHT","DARKNESS"]}]},{"name":"Diaboromon","skills":[{"available":true,"hits":2,"perHit":48.0,"baseTotal":96.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","FIRE","EARTH","STEEL"]},{"available":true,"hits":5,"perHit":26.0,"baseTotal":130.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","FIRE","WIND","STEEL"]},{"available":true,"hits":5,"perHit":29.0,"baseTotal":145.0,"baseElement":"DARKNESS","elements":["FIRE","THUNDER","DARKNESS"]}]},{"name":"Donedevimon","skills":[{"available":true,"hits":2,"perHit":48.0,"baseTotal":96.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","FIRE","STEEL","DARKNESS"]},{"available":true,"hits":5,"perHit":26.0,"baseTotal":130.0,"baseElement":"DARKNESS","elements":["PHYSICAL","WIND","DARKNESS"]},{"available":true,"hits":5,"perHit":29.0,"baseTotal":145.0,"baseElement":"DARKNESS","elements":["FIRE","WIND","DARKNESS"]}]},{"name":"Dynasmon","skills":[{"available":true,"hits":1,"perHit":95.0,"baseTotal":95.0,"baseElement":"LIGHT","elements":["FIRE","THUNDER","WIND","WATER","LIGHT"]},{"available":true,"hits":6,"perHit":24.0,"baseTotal":144.0,"baseElement":"FIRE","elements":["PHYSICAL","FIRE","THUNDER","WIND"]},{"available":true,"hits":1,"perHit":139.0,"baseTotal":139.0,"baseElement":"LIGHT","elements":["PHYSICAL","THUNDER","WIND","ICE","LIGHT"]}]},{"name":"Eaglemon","skills":[{"available":true,"hits":4,"perHit":24.0,"baseTotal":96.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","FIRE","THUNDER","STEEL"]},{"available":true,"hits":3,"perHit":43.0,"baseTotal":129.0,"baseElement":"THUNDER","elements":["FIRE","THUNDER","WIND","LIGHT"]},{"available":true,"hits":1,"perHit":145.0,"baseTotal":145.0,"baseElement":"STEEL","elements":["PHYSICAL","WIND","STEEL"]}]},{"name":"Ebemon","skills":[{"available":true,"hits":4,"perHit":24.0,"baseTotal":96.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","FIRE","STEEL"]},{"available":true,"hits":5,"perHit":29.0,"baseTotal":145.0,"baseElement":"DARKNESS","elements":["THUNDER","STEEL","DARKNESS"]},{"available":true,"hits":5,"perHit":26.0,"baseTotal":130.0,"baseElement":"THUNDER","elements":["THUNDER","EARTH","STEEL","LIGHT"]}]},{"name":"Ebonwumon","skills":[{"available":true,"hits":2,"perHit":48.0,"baseTotal":96.0,"baseElement":"LIGHT","elements":["THUNDER","WOOD","LIGHT"]},{"available":true,"hits":4,"perHit":32.0,"baseTotal":128.0,"baseElement":"DARKNESS","elements":["WATER","EARTH","WOOD","DARKNESS"]},{"available":true,"hits":5,"perHit":29.0,"baseTotal":145.0,"baseElement":"WOOD","elements":["PHYSICAL","EARTH","WOOD","STEEL","DARKNESS"]}]},{"name":"Examon","skills":[{"available":true,"hits":7,"perHit":14.0,"baseTotal":98.0,"baseElement":"FIRE","elements":["PHYSICAL","FIRE","STEEL"]},{"available":true,"hits":4,"perHit":36.0,"baseTotal":144.0,"baseElement":"LIGHT","elements":["FIRE","THUNDER","LIGHT"]},{"available":true,"hits":1,"perHit":128.0,"baseTotal":128.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","FIRE","THUNDER","WIND","EARTH"]}]},{"name":"Fanglongmon","skills":[{"available":true,"hits":1,"perHit":95.0,"baseTotal":95.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","EARTH","STEEL","DARKNESS"]},{"available":true,"hits":5,"perHit":19.0,"baseTotal":95.0,"baseElement":"LIGHT","elements":["PHYSICAL","FIRE","THUNDER","WIND","ICE","WATER","EARTH","WOOD","STEEL","LIGHT","DARKNESS"]},{"available":true,"hits":4,"perHit":36.0,"baseTotal":144.0,"baseElement":"EARTH","elements":["THUNDER","WIND","EARTH"]}]},{"name":"Gabumon_Kizuna","skills":[{"available":true,"hits":4,"perHit":24.0,"baseTotal":96.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","THUNDER","STEEL","LIGHT"]},{"available":true,"hits":3,"perHit":48.0,"baseTotal":144.0,"baseElement":"LIGHT","elements":["FIRE","STEEL","LIGHT"]},{"available":true,"hits":5,"perHit":28.0,"baseTotal":140.0,"baseElement":"STEEL","elements":["ICE","STEEL","LIGHT"]}]},{"name":"Gaiomon","skills":[{"available":true,"hits":2,"perHit":48.0,"baseTotal":96.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","WIND","STEEL"]},{"available":true,"hits":1,"perHit":128.0,"baseTotal":128.0,"baseElement":"LIGHT","elements":["FIRE","THUNDER","WIND","LIGHT"]},{"available":true,"hits":1,"perHit":145.0,"baseTotal":145.0,"baseElement":"LIGHT","elements":["EARTH","STEEL","LIGHT","DARKNESS"]}]},{"name":"Gallantmon","skills":[{"available":true,"hits":3,"perHit":32.0,"baseTotal":96.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","WIND","EARTH","STEEL"]},{"available":true,"hits":4,"perHit":32.0,"baseTotal":128.0,"baseElement":"LIGHT","elements":["THUNDER","WIND","WATER","LIGHT"]},{"available":true,"hits":4,"perHit":36.0,"baseTotal":144.0,"baseElement":"LIGHT","elements":["FIRE","THUNDER","EARTH","LIGHT"]}]},{"name":"Gallantmon:Crimsonmode","skills":[{"available":true,"hits":3,"perHit":32.0,"baseTotal":96.0,"baseElement":"LIGHT","elements":["PHYSICAL","WIND","STEEL","LIGHT"]},{"available":true,"hits":5,"perHit":33.0,"baseTotal":165.0,"baseElement":"LIGHT","elements":["FIRE","THUNDER","LIGHT"]},{"available":true,"hits":4,"perHit":36.0,"baseTotal":144.0,"baseElement":"WIND","elements":["THUNDER","WIND","STEEL","LIGHT"]}]},{"name":"Ghoulmon","skills":[{"available":true,"hits":2,"perHit":48.0,"baseTotal":96.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","FIRE","STEEL","DARKNESS"]},{"available":true,"hits":2,"perHit":72.0,"baseTotal":144.0,"baseElement":"DARKNESS","elements":["FIRE","THUNDER","DARKNESS"]},{"available":true,"hits":4,"perHit":46.0,"baseTotal":184.0,"baseElement":"DARKNESS","elements":["FIRE","THUNDER","WIND","DARKNESS"]}]},{"name":"Goldramon","skills":[{"available":true,"hits":1,"perHit":95.0,"baseTotal":95.0,"baseElement":"FIRE","elements":["PHYSICAL","FIRE","THUNDER","EARTH"]},{"available":true,"hits":5,"perHit":35.0,"baseTotal":175.0,"baseElement":"LIGHT","elements":["FIRE","THUNDER","EARTH","LIGHT"]},{"available":true,"hits":2,"perHit":72.0,"baseTotal":144.0,"baseElement":"LIGHT","elements":["FIRE","WATER","EARTH","LIGHT"]}]},{"name":"Grandiskuwagamon","skills":[{"available":true,"hits":1,"perHit":95.0,"baseTotal":95.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","STEEL","DARKNESS"]},{"available":true,"hits":2,"perHit":64.0,"baseTotal":128.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","WIND","EARTH","STEEL"]},{"available":true,"hits":5,"perHit":29.0,"baseTotal":145.0,"baseElement":"EARTH","elements":["THUNDER","EARTH","WOOD","LIGHT"]}]},{"name":"Grankuwagamon","skills":[{"available":true,"hits":5,"perHit":19.0,"baseTotal":95.0,"baseElement":"EARTH","elements":["PHYSICAL","THUNDER","WIND","EARTH"]},{"available":true,"hits":6,"perHit":21.0,"baseTotal":126.0,"baseElement":"DARKNESS","elements":["WIND","EARTH","DARKNESS"]},{"available":true,"hits":1,"perHit":145.0,"baseTotal":145.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","STEEL","DARKNESS"]}]},{"name":"Gryphonmon","skills":[{"available":true,"hits":2,"perHit":48.0,"baseTotal":96.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","WIND","EARTH","STEEL"]},{"available":true,"hits":3,"perHit":43.0,"baseTotal":129.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","THUNDER","WIND","STEEL"]},{"available":true,"hits":6,"perHit":24.0,"baseTotal":144.0,"baseElement":"WIND","elements":["WIND","STEEL","LIGHT"]}]},{"name":"Gulfmon","skills":[{"available":true,"hits":4,"perHit":24.0,"baseTotal":96.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","THUNDER","EARTH"]},{"available":true,"hits":1,"perHit":128.0,"baseTotal":128.0,"baseElement":"DARKNESS","elements":["FIRE","EARTH","DARKNESS"]},{"available":true,"hits":5,"perHit":29.0,"baseTotal":145.0,"baseElement":"DARKNESS","elements":["PHYSICAL","WIND","DARKNESS"]}]},{"name":"Herculeskabuterimon","skills":[{"available":true,"hits":1,"perHit":95.0,"baseTotal":95.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","THUNDER","EARTH"]},{"available":true,"hits":2,"perHit":72.0,"baseTotal":144.0,"baseElement":"THUNDER","elements":["PHYSICAL","THUNDER","WIND","EARTH","LIGHT"]},{"available":true,"hits":5,"perHit":26.0,"baseTotal":130.0,"baseElement":"THUNDER","elements":["THUNDER","EARTH","LIGHT","DARKNESS"]}]},{"name":"Himachinedramon","skills":[{"available":true,"hits":5,"perHit":19.0,"baseTotal":95.0,"baseElement":"STEEL","elements":["STEEL"]},{"available":true,"hits":3,"perHit":48.0,"baseTotal":144.0,"baseElement":"LIGHT","elements":["LIGHT"]},{"available":true,"hits":3,"perHit":58.0,"baseTotal":174.0,"baseElement":"STEEL","elements":["STEEL"]}]},{"name":"Imperialdramon:Dragonmode","skills":[{"available":true,"hits":1,"perHit":95.0,"baseTotal":95.0,"baseElement":"PHYSICAL","elements":["PHYSICAL"]},{"available":true,"hits":5,"perHit":29.0,"baseTotal":145.0,"baseElement":"LIGHT","elements":["LIGHT"]},{"available":true,"hits":1,"perHit":139.0,"baseTotal":139.0,"baseElement":"DARKNESS","elements":["DARKNESS"]}]},{"name":"Imperialdramon:Fightermode","skills":[{"available":true,"hits":2,"perHit":48.0,"baseTotal":96.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","THUNDER","STEEL"]},{"available":true,"hits":3,"perHit":46.0,"baseTotal":138.0,"baseElement":"DARKNESS","elements":["THUNDER","WIND","DARKNESS"]},{"available":true,"hits":5,"perHit":29.0,"baseTotal":145.0,"baseElement":"LIGHT","elements":["THUNDER","STEEL","LIGHT"]}]},{"name":"Imperialdramon:Paladinmode","skills":[{"available":true,"hits":5,"perHit":19.0,"baseTotal":95.0,"baseElement":"LIGHT","elements":["PHYSICAL","WIND","ICE","STEEL","LIGHT"]},{"available":true,"hits":2,"perHit":84.0,"baseTotal":168.0,"baseElement":"LIGHT","elements":["PHYSICAL","WIND","STEEL","LIGHT"]},{"available":true,"hits":5,"perHit":29.0,"baseTotal":145.0,"baseElement":"WIND","elements":["THUNDER","WIND","STEEL","LIGHT"]}]},{"name":"Justimon_Accelarm","skills":[{"available":true,"hits":1,"perHit":95.0,"baseTotal":95.0,"baseElement":"STEEL","elements":["PHYSICAL","WIND","STEEL"]},{"available":true,"hits":1,"perHit":145.0,"baseTotal":145.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","THUNDER","STEEL","LIGHT"]},{"available":true,"hits":5,"perHit":26.0,"baseTotal":130.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","EARTH","STEEL"]}]},{"name":"Justimon_Blitzarm","skills":[{"available":true,"hits":4,"perHit":24.0,"baseTotal":96.0,"baseElement":"THUNDER","elements":["THUNDER","STEEL","LIGHT"]},{"available":true,"hits":1,"perHit":145.0,"baseTotal":145.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","THUNDER","STEEL","LIGHT"]},{"available":true,"hits":6,"perHit":21.0,"baseTotal":126.0,"baseElement":"THUNDER","elements":["PHYSICAL","THUNDER","STEEL"]}]},{"name":"Justimon_Criticalarm","skills":[{"available":true,"hits":1,"perHit":95.0,"baseTotal":95.0,"baseElement":"STEEL","elements":["STEEL"]},{"available":true,"hits":1,"perHit":145.0,"baseTotal":145.0,"baseElement":"PHYSICAL","elements":["PHYSICAL"]},{"available":true,"hits":1,"perHit":128.0,"baseTotal":128.0,"baseElement":"STEEL","elements":["STEEL"]}]},{"name":"Kentaurosmon","skills":[{"available":true,"hits":2,"perHit":48.0,"baseTotal":96.0,"baseElement":"STEEL","elements":["PHYSICAL","WIND","STEEL"]},{"available":true,"hits":1,"perHit":145.0,"baseTotal":145.0,"baseElement":"LIGHT","elements":["WIND","STEEL","LIGHT"]},{"available":true,"hits":7,"perHit":18.0,"baseTotal":126.0,"baseElement":"ICE","elements":["WIND","ICE","LIGHT"]}]},{"name":"Kingwhamon","skills":[{"available":true,"hits":4,"perHit":24.0,"baseTotal":96.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","THUNDER","WIND","STEEL"]},{"available":true,"hits":3,"perHit":48.0,"baseTotal":144.0,"baseElement":"WATER","elements":["THUNDER","WIND","ICE","WATER"]},{"available":true,"hits":1,"perHit":128.0,"baseTotal":128.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","WATER","EARTH","WOOD"]}]},{"name":"Kuzuhamon","skills":[{"available":true,"hits":2,"perHit":48.0,"baseTotal":96.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","THUNDER","ICE"]},{"available":true,"hits":1,"perHit":145.0,"baseTotal":145.0,"baseElement":"DARKNESS","elements":["FIRE","WOOD","LIGHT","DARKNESS"]},{"available":false,"hits":1,"perHit":null,"baseTotal":null,"baseElement":"LIGHT","elements":["THUNDER","EARTH","WOOD","LIGHT"]}]},{"name":"Kuzuhamon:Maidmode","skills":[{"available":true,"hits":5,"perHit":19.0,"baseTotal":95.0,"baseElement":"LIGHT","elements":["ICE","WATER","LIGHT"]},{"available":true,"hits":1,"perHit":145.0,"baseTotal":145.0,"baseElement":"DARKNESS","elements":["FIRE","WIND","DARKNESS"]},{"available":false,"hits":1,"perHit":null,"baseTotal":null,"baseElement":"LIGHT","elements":["EARTH","LIGHT","DARKNESS"]}]},{"name":"Leopardmon","skills":[{"available":true,"hits":4,"perHit":24.0,"baseTotal":96.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","WIND","EARTH","STEEL"]},{"available":true,"hits":1,"perHit":171.0,"baseTotal":171.0,"baseElement":"LIGHT","elements":["THUNDER","WIND","LIGHT"]},{"available":true,"hits":4,"perHit":36.0,"baseTotal":144.0,"baseElement":"DARKNESS","elements":["FIRE","STEEL","DARKNESS"]}]},{"name":"Leviamon","skills":[{"available":true,"hits":2,"perHit":48.0,"baseTotal":96.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","WIND","WATER"]},{"available":true,"hits":3,"perHit":48.0,"baseTotal":144.0,"baseElement":"WATER","elements":["PHYSICAL","WIND","WATER","DARKNESS"]},{"available":true,"hits":6,"perHit":28.0,"baseTotal":168.0,"baseElement":"DARKNESS","elements":["WIND","WATER","DARKNESS"]}]},{"name":"Lilithmon","skills":[{"available":true,"hits":2,"perHit":48.0,"baseTotal":96.0,"baseElement":"DARKNESS","elements":["WOOD","STEEL","DARKNESS"]},{"available":false,"hits":1,"perHit":null,"baseTotal":null,"baseElement":"DARKNESS","elements":["PHYSICAL","FIRE","WIND","DARKNESS"]},{"available":true,"hits":5,"perHit":29.0,"baseTotal":145.0,"baseElement":"DARKNESS","elements":["FIRE","WIND","DARKNESS"]}]},{"name":"Lordknightmon","skills":[{"available":true,"hits":5,"perHit":19.0,"baseTotal":95.0,"baseElement":"STEEL","elements":["PHYSICAL","WOOD","STEEL"]},{"available":true,"hits":6,"perHit":21.0,"baseTotal":126.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","THUNDER","WIND","WOOD"]},{"available":true,"hits":1,"perHit":145.0,"baseTotal":145.0,"baseElement":"STEEL","elements":["PHYSICAL","FIRE","STEEL"]}]},{"name":"Machinedramon","skills":[{"available":true,"hits":2,"perHit":48.0,"baseTotal":96.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","THUNDER","DARKNESS"]},{"available":true,"hits":4,"perHit":36.0,"baseTotal":144.0,"baseElement":"STEEL","elements":["PHYSICAL","STEEL","DARKNESS"]},{"available":true,"hits":4,"perHit":46.0,"baseTotal":184.0,"baseElement":"STEEL","elements":["FIRE","THUNDER","STEEL"]}]},{"name":"Machinedramonkai","skills":[{"available":true,"hits":3,"perHit":32.0,"baseTotal":96.0,"baseElement":"STEEL","elements":["STEEL"]},{"available":true,"hits":3,"perHit":48.0,"baseTotal":144.0,"baseElement":"STEEL","elements":["STEEL"]},{"available":true,"hits":1,"perHit":139.0,"baseTotal":139.0,"baseElement":"THUNDER","elements":["THUNDER"]}]},{"name":"Magnadramon","skills":[{"available":true,"hits":3,"perHit":32.0,"baseTotal":96.0,"baseElement":"WIND","elements":["WIND","ICE","WATER","EARTH","DARKNESS"]},{"available":true,"hits":5,"perHit":29.0,"baseTotal":145.0,"baseElement":"LIGHT","elements":["FIRE","ICE","WATER","LIGHT"]},{"available":true,"hits":5,"perHit":26.0,"baseTotal":130.0,"baseElement":"LIGHT","elements":["FIRE","WIND","LIGHT"]}]},{"name":"Malomyotismon","skills":[{"available":true,"hits":3,"perHit":32.0,"baseTotal":96.0,"baseElement":"DARKNESS","elements":["FIRE","WIND","WOOD","DARKNESS"]},{"available":true,"hits":4,"perHit":36.0,"baseTotal":144.0,"baseElement":"FIRE","elements":["FIRE","THUNDER","WATER","DARKNESS"]},{"available":true,"hits":1,"perHit":128.0,"baseTotal":128.0,"baseElement":"DARKNESS","elements":["PHYSICAL","LIGHT","DARKNESS"]}]},{"name":"Marineangemon","skills":[{"available":true,"hits":1,"perHit":95.0,"baseTotal":95.0,"baseElement":"LIGHT","elements":["PHYSICAL","FIRE","STEEL","LIGHT"]},{"available":false,"hits":1,"perHit":null,"baseTotal":null,"baseElement":"LIGHT","elements":["FIRE","WIND","LIGHT"]},{"available":true,"hits":7,"perHit":21.0,"baseTotal":147.0,"baseElement":"WATER","elements":["WIND","ICE","WATER","LIGHT"]}]},{"name":"Marsmon","skills":[{"available":true,"hits":4,"perHit":24.0,"baseTotal":96.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","THUNDER","WIND"]},{"available":true,"hits":1,"perHit":128.0,"baseTotal":128.0,"baseElement":"FIRE","elements":["FIRE","LIGHT","DARKNESS"]},{"available":true,"hits":7,"perHit":21.0,"baseTotal":147.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","STEEL","DARKNESS"]}]},{"name":"Mastemon","skills":[{"available":true,"hits":1,"perHit":95.0,"baseTotal":95.0,"baseElement":"DARKNESS","elements":["PHYSICAL","WIND","DARKNESS"]},{"available":true,"hits":5,"perHit":26.0,"baseTotal":130.0,"baseElement":"LIGHT","elements":["FIRE","THUNDER","WIND","LIGHT"]},{"available":true,"hits":4,"perHit":36.0,"baseTotal":144.0,"baseElement":"LIGHT","elements":["EARTH","LIGHT","DARKNESS"]}]},{"name":"Megagargomon","skills":[{"available":true,"hits":3,"perHit":32.0,"baseTotal":96.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","WIND","DARKNESS"]},{"available":true,"hits":8,"perHit":18.0,"baseTotal":144.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","FIRE","THUNDER","STEEL"]},{"available":true,"hits":2,"perHit":64.0,"baseTotal":128.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","FIRE","THUNDER","STEEL"]}]},{"name":"Megidramon","skills":[{"available":true,"hits":2,"perHit":48.0,"baseTotal":96.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","FIRE","STEEL"]},{"available":true,"hits":4,"perHit":35.0,"baseTotal":140.0,"baseElement":"WIND","elements":["PHYSICAL","FIRE","THUNDER","WIND","EARTH","DARKNESS"]},{"available":true,"hits":6,"perHit":24.0,"baseTotal":144.0,"baseElement":"FIRE","elements":["FIRE","WIND","EARTH","DARKNESS"]}]},{"name":"Metaletemon","skills":[{"available":true,"hits":1,"perHit":95.0,"baseTotal":95.0,"baseElement":"STEEL","elements":["PHYSICAL","THUNDER","STEEL"]},{"available":true,"hits":2,"perHit":72.0,"baseTotal":144.0,"baseElement":"DARKNESS","elements":["PHYSICAL","THUNDER","WOOD","DARKNESS"]},{"available":true,"hits":4,"perHit":32.0,"baseTotal":128.0,"baseElement":"THUNDER","elements":["THUNDER","STEEL","DARKNESS"]}]},{"name":"Metalgarurumon","skills":[{"available":true,"hits":1,"perHit":95.0,"baseTotal":95.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","ICE","STEEL"]},{"available":true,"hits":1,"perHit":145.0,"baseTotal":145.0,"baseElement":"FIRE","elements":["FIRE","THUNDER","ICE","STEEL"]},{"available":true,"hits":5,"perHit":26.0,"baseTotal":130.0,"baseElement":"ICE","elements":["ICE","WATER","LIGHT"]}]},{"name":"Metalseadramon","skills":[{"available":true,"hits":1,"perHit":95.0,"baseTotal":95.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","EARTH","STEEL"]},{"available":true,"hits":1,"perHit":145.0,"baseTotal":145.0,"baseElement":"WATER","elements":["THUNDER","WIND","ICE","WATER"]},{"available":true,"hits":3,"perHit":43.0,"baseTotal":129.0,"baseElement":"WATER","elements":["THUNDER","ICE","WATER","STEEL","LIGHT"]}]},{"name":"Millenniumon","skills":[{"available":true,"hits":4,"perHit":23.75,"baseTotal":95.0,"baseElement":"STEEL","elements":["FIRE","THUNDER","STEEL","DARKNESS"]},{"available":true,"hits":3,"perHit":42.75,"baseTotal":128.25,"baseElement":"DARKNESS","elements":["PHYSICAL","ICE","LIGHT","DARKNESS"]},{"available":true,"hits":4,"perHit":36.25,"baseTotal":145.0,"baseElement":"DARKNESS","elements":["FIRE","THUNDER","DARKNESS"]}]},{"name":"Miragegaogamon","skills":[{"available":true,"hits":6,"perHit":16.0,"baseTotal":96.0,"baseElement":"LIGHT","elements":["LIGHT"]},{"available":true,"hits":2,"perHit":64.0,"baseTotal":128.0,"baseElement":"PHYSICAL","elements":["PHYSICAL"]},{"available":true,"hits":5,"perHit":29.0,"baseTotal":145.0,"baseElement":"LIGHT","elements":["LIGHT"]}]},{"name":"Miragegaogamon:Burstmode","skills":[{"available":true,"hits":5,"perHit":19.0,"baseTotal":95.0,"baseElement":"THUNDER","elements":["PHYSICAL","THUNDER","WIND","STEEL"]},{"available":true,"hits":1,"perHit":145.0,"baseTotal":145.0,"baseElement":"STEEL","elements":["PHYSICAL","THUNDER","STEEL","LIGHT"]},{"available":true,"hits":5,"perHit":34.0,"baseTotal":170.0,"baseElement":"LIGHT","elements":["THUNDER","WIND","STEEL","LIGHT"]}]},{"name":"Moonmillenniumon","skills":[{"available":true,"hits":4,"perHit":24.0,"baseTotal":96.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","THUNDER","ICE","STEEL"]},{"available":true,"hits":2,"perHit":64.0,"baseTotal":128.0,"baseElement":"LIGHT","elements":["EARTH","LIGHT","DARKNESS"]},{"available":true,"hits":2,"perHit":72.0,"baseTotal":144.0,"baseElement":"DARKNESS","elements":["ICE","STEEL","DARKNESS"]}]},{"name":"Neomyotismon","skills":[{"available":true,"hits":2,"perHit":48.0,"baseTotal":96.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","THUNDER","EARTH","STEEL"]},{"available":true,"hits":6,"perHit":23.0,"baseTotal":138.0,"baseElement":"DARKNESS","elements":["PHYSICAL","WIND","DARKNESS"]},{"available":true,"hits":3,"perHit":48.0,"baseTotal":144.0,"baseElement":"DARKNESS","elements":["FIRE","THUNDER","STEEL","DARKNESS"]}]},{"name":"Neptunemon","skills":[{"available":true,"hits":3,"perHit":32.0,"baseTotal":96.0,"baseElement":"WATER","elements":["THUNDER","WIND","WATER"]},{"available":true,"hits":4,"perHit":35.0,"baseTotal":140.0,"baseElement":"WATER","elements":["WIND","ICE","WATER"]},{"available":true,"hits":1,"perHit":145.0,"baseTotal":145.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","ICE","WATER","STEEL"]}]},{"name":"Omnimon","skills":[{"available":true,"hits":3,"perHit":32.0,"baseTotal":96.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","WIND","STEEL","LIGHT"]},{"available":true,"hits":7,"perHit":25.0,"baseTotal":175.0,"baseElement":"FIRE","elements":["PHYSICAL","FIRE","WIND","STEEL"]},{"available":true,"hits":5,"perHit":29.0,"baseTotal":145.0,"baseElement":"ICE","elements":["WIND","ICE","WATER","LIGHT"]}]},{"name":"Omnimon:Mercifulmode","skills":[{"available":true,"hits":1,"perHit":95.0,"baseTotal":95.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","THUNDER","LIGHT"]},{"available":true,"hits":3,"perHit":58.0,"baseTotal":174.0,"baseElement":"LIGHT","elements":["PHYSICAL","FIRE","THUNDER","LIGHT"]},{"available":true,"hits":4,"perHit":35.0,"baseTotal":140.0,"baseElement":"ICE","elements":["THUNDER","ICE","STEEL","LIGHT"]}]},{"name":"Omnimon_Alter-S","skills":[{"available":true,"hits":5,"perHit":19.0,"baseTotal":95.0,"baseElement":"STEEL","elements":["FIRE","THUNDER","ICE","STEEL"]},{"available":true,"hits":4,"perHit":36.0,"baseTotal":144.0,"baseElement":"THUNDER","elements":["FIRE","THUNDER","STEEL","LIGHT","DARKNESS"]},{"available":true,"hits":1,"perHit":175.0,"baseTotal":175.0,"baseElement":"ICE","elements":["WIND","ICE","WATER","STEEL"]}]},{"name":"Ophanimon","skills":[{"available":true,"hits":3,"perHit":32.0,"baseTotal":96.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","EARTH","STEEL","LIGHT"]},{"available":true,"hits":4,"perHit":36.0,"baseTotal":144.0,"baseElement":"LIGHT","elements":["FIRE","WOOD","STEEL","LIGHT"]},{"available":true,"hits":5,"perHit":26.0,"baseTotal":130.0,"baseElement":"LIGHT","elements":["FIRE","THUNDER","STEEL","LIGHT"]}]},{"name":"Ophanimon:Falldownmode","skills":[{"available":true,"hits":3,"perHit":32.0,"baseTotal":96.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","FIRE","STEEL","DARKNESS"]},{"available":true,"hits":5,"perHit":26.0,"baseTotal":130.0,"baseElement":"FIRE","elements":["FIRE","STEEL","DARKNESS"]},{"available":true,"hits":5,"perHit":29.0,"baseTotal":145.0,"baseElement":"DARKNESS","elements":["FIRE","THUNDER","DARKNESS"]}]},{"name":"Parasimon","skills":[{"available":true,"hits":1,"perHit":95.0,"baseTotal":95.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","WIND","WOOD","DARKNESS"]},{"available":true,"hits":6,"perHit":24.0,"baseTotal":144.0,"baseElement":"THUNDER","elements":["THUNDER","WATER","WOOD","DARKNESS"]},{"available":false,"hits":1,"perHit":null,"baseTotal":null,"baseElement":"DARKNESS","elements":["WIND","WATER","WOOD","DARKNESS"]}]},{"name":"Pharaohmon","skills":[{"available":true,"hits":3,"perHit":32.0,"baseTotal":96.0,"baseElement":"DARKNESS","elements":["FIRE","THUNDER","DARKNESS"]},{"available":false,"hits":4,"perHit":null,"baseTotal":null,"baseElement":"WIND","elements":["WIND","EARTH","DARKNESS"]},{"available":true,"hits":6,"perHit":24.0,"baseTotal":144.0,"baseElement":"DARKNESS","elements":["FIRE","EARTH","STEEL","DARKNESS"]}]},{"name":"Phoenixmon","skills":[{"available":true,"hits":1,"perHit":95.0,"baseTotal":95.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","THUNDER","EARTH","LIGHT"]},{"available":true,"hits":1,"perHit":128.0,"baseTotal":128.0,"baseElement":"FIRE","elements":["FIRE","THUNDER","EARTH","LIGHT"]},{"available":true,"hits":5,"perHit":29.0,"baseTotal":145.0,"baseElement":"FIRE","elements":["FIRE","THUNDER","WIND","LIGHT"]}]},{"name":"Piedmon","skills":[{"available":true,"hits":1,"perHit":95.0,"baseTotal":95.0,"baseElement":"WIND","elements":["PHYSICAL","WIND","DARKNESS"]},{"available":true,"hits":1,"perHit":145.0,"baseTotal":145.0,"baseElement":"DARKNESS","elements":["THUNDER","WIND","STEEL","DARKNESS"]},{"available":true,"hits":4,"perHit":32.0,"baseTotal":128.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","WIND","STEEL"]}]},{"name":"Plesiomon","skills":[{"available":true,"hits":2,"perHit":48.0,"baseTotal":96.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","THUNDER","EARTH","LIGHT"]},{"available":true,"hits":4,"perHit":32.0,"baseTotal":128.0,"baseElement":"WIND","elements":["PHYSICAL","WIND","WATER","DARKNESS"]},{"available":true,"hits":4,"perHit":36.0,"baseTotal":144.0,"baseElement":"WIND","elements":["PHYSICAL","WIND","ICE","WATER","DARKNESS"]}]},{"name":"Pukumon","skills":[{"available":true,"hits":1,"perHit":95.0,"baseTotal":95.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","WATER","STEEL"]},{"available":true,"hits":5,"perHit":28.0,"baseTotal":140.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","WIND","WATER","STEEL"]},{"available":true,"hits":9,"perHit":16.0,"baseTotal":144.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","FIRE","THUNDER","STEEL"]}]},{"name":"Puppetmon","skills":[{"available":true,"hits":1,"perHit":95.0,"baseTotal":95.0,"baseElement":"STEEL","elements":["PHYSICAL","THUNDER","STEEL"]},{"available":true,"hits":1,"perHit":145.0,"baseTotal":145.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","FIRE","EARTH","STEEL"]},{"available":false,"hits":1,"perHit":null,"baseTotal":null,"baseElement":"DARKNESS","elements":["PHYSICAL","WIND","WOOD","DARKNESS"]}]},{"name":"Ravemon","skills":[{"available":true,"hits":3,"perHit":32.0,"baseTotal":96.0,"baseElement":"WIND","elements":["PHYSICAL","WIND","STEEL","DARKNESS"]},{"available":true,"hits":6,"perHit":21.0,"baseTotal":126.0,"baseElement":"THUNDER","elements":["THUNDER","WIND","STEEL","LIGHT"]},{"available":true,"hits":2,"perHit":72.0,"baseTotal":144.0,"baseElement":"THUNDER","elements":["THUNDER","STEEL","DARKNESS"]}]},{"name":"Ravemon:Burstmode","skills":[{"available":true,"hits":1,"perHit":95.0,"baseTotal":95.0,"baseElement":"DARKNESS","elements":["PHYSICAL","WIND","WOOD","STEEL","DARKNESS"]},{"available":true,"hits":4,"perHit":32.0,"baseTotal":128.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","WIND","STEEL","DARKNESS"]},{"available":true,"hits":3,"perHit":48.0,"baseTotal":144.0,"baseElement":"WIND","elements":["THUNDER","WIND","DARKNESS"]}]},{"name":"Reapermon","skills":[{"available":true,"hits":3,"perHit":32.0,"baseTotal":96.0,"baseElement":"FIRE","elements":["FIRE","WIND","DARKNESS"]},{"available":true,"hits":5,"perHit":26.0,"baseTotal":130.0,"baseElement":"FIRE","elements":["FIRE","WIND","EARTH"]},{"available":true,"hits":1,"perHit":145.0,"baseTotal":145.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","STEEL","DARKNESS"]}]},{"name":"Rosemon","skills":[{"available":true,"hits":5,"perHit":19.0,"baseTotal":95.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","FIRE","EARTH","WOOD"]},{"available":true,"hits":5,"perHit":29.0,"baseTotal":145.0,"baseElement":"WOOD","elements":["PHYSICAL","EARTH","WOOD","DARKNESS"]},{"available":true,"hits":2,"perHit":70.0,"baseTotal":140.0,"baseElement":"WOOD","elements":["FIRE","WOOD","LIGHT"]}]},{"name":"Rosemon:Burstmode","skills":[{"available":true,"hits":6,"perHit":16.0,"baseTotal":96.0,"baseElement":"LIGHT","elements":["EARTH","WOOD","LIGHT"]},{"available":true,"hits":4,"perHit":46.0,"baseTotal":184.0,"baseElement":"LIGHT","elements":["WIND","EARTH","WOOD","LIGHT"]},{"available":true,"hits":7,"perHit":21.0,"baseTotal":147.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","EARTH","WOOD","LIGHT"]}]},{"name":"Saberleomon","skills":[{"available":true,"hits":2,"perHit":48.0,"baseTotal":96.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","WIND","EARTH","STEEL"]},{"available":true,"hits":6,"perHit":21.0,"baseTotal":126.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","THUNDER","WIND","STEEL"]},{"available":true,"hits":1,"perHit":145.0,"baseTotal":145.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","FIRE","EARTH","STEEL"]}]},{"name":"Sakuyamon","skills":[{"available":true,"hits":1,"perHit":95.0,"baseTotal":95.0,"baseElement":"FIRE","elements":["FIRE","WIND","ICE"]},{"available":true,"hits":4,"perHit":36.0,"baseTotal":144.0,"baseElement":"DARKNESS","elements":["FIRE","WATER","EARTH","WOOD","DARKNESS"]},{"available":false,"hits":1,"perHit":null,"baseTotal":null,"baseElement":"LIGHT","elements":["WIND","EARTH","WOOD","LIGHT"]}]},{"name":"Seraphimon","skills":[{"available":true,"hits":2,"perHit":48.0,"baseTotal":96.0,"baseElement":"LIGHT","elements":["THUNDER","ICE","WATER","STEEL","LIGHT"]},{"available":true,"hits":3,"perHit":43.0,"baseTotal":129.0,"baseElement":"THUNDER","elements":["THUNDER","ICE","STEEL","LIGHT"]},{"available":true,"hits":7,"perHit":21.0,"baseTotal":147.0,"baseElement":"LIGHT","elements":["FIRE","THUNDER","LIGHT"]}]},{"name":"Shinegreymon","skills":[{"available":true,"hits":6,"perHit":16.0,"baseTotal":96.0,"baseElement":"EARTH","elements":["PHYSICAL","WIND","EARTH","STEEL"]},{"available":true,"hits":1,"perHit":128.0,"baseTotal":128.0,"baseElement":"FIRE","elements":["FIRE","THUNDER","EARTH","LIGHT","DARKNESS"]},{"available":true,"hits":7,"perHit":21.0,"baseTotal":147.0,"baseElement":"LIGHT","elements":["PHYSICAL","WIND","ICE","LIGHT"]}]},{"name":"Shinegreymon:Burstmode","skills":[{"available":true,"hits":3,"perHit":32.0,"baseTotal":96.0,"baseElement":"FIRE","elements":["PHYSICAL","FIRE","WIND","LIGHT"]},{"available":true,"hits":5,"perHit":37.0,"baseTotal":185.0,"baseElement":"FIRE","elements":["FIRE","WIND","EARTH","LIGHT"]},{"available":true,"hits":1,"perHit":145.0,"baseTotal":145.0,"baseElement":"LIGHT","elements":["FIRE","EARTH","LIGHT"]}]},{"name":"Shinegreymon:Ruinmode","skills":[{"available":true,"hits":3,"perHit":32.0,"baseTotal":96.0,"baseElement":"DARKNESS","elements":["PHYSICAL","FIRE","DARKNESS"]},{"available":true,"hits":1,"perHit":184.0,"baseTotal":184.0,"baseElement":"DARKNESS","elements":["FIRE","WIND","DARKNESS"]},{"available":true,"hits":7,"perHit":21.0,"baseTotal":147.0,"baseElement":"FIRE","elements":["FIRE","THUNDER","WIND","DARKNESS"]}]},{"name":"Skullmammothmon","skills":[{"available":true,"hits":1,"perHit":95.0,"baseTotal":95.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","THUNDER","EARTH","STEEL"]},{"available":true,"hits":3,"perHit":48.0,"baseTotal":144.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","THUNDER","WIND","EARTH","DARKNESS"]},{"available":true,"hits":1,"perHit":128.0,"baseTotal":128.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","THUNDER","WIND","EARTH","DARKNESS"]}]},{"name":"Slashangemon","skills":[{"available":true,"hits":2,"perHit":48.0,"baseTotal":96.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","WIND","ICE","STEEL"]},{"available":true,"hits":5,"perHit":26.0,"baseTotal":130.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","WIND","STEEL"]},{"available":true,"hits":1,"perHit":145.0,"baseTotal":145.0,"baseElement":"LIGHT","elements":["PHYSICAL","ICE","STEEL","LIGHT"]}]},{"name":"Tigervespamon","skills":[{"available":true,"hits":3,"perHit":32.0,"baseTotal":96.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","WIND","STEEL","LIGHT"]},{"available":true,"hits":5,"perHit":26.0,"baseTotal":130.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","WIND","EARTH","STEEL"]},{"available":true,"hits":1,"perHit":145.0,"baseTotal":145.0,"baseElement":"LIGHT","elements":["PHYSICAL","THUNDER","STEEL","LIGHT"]}]},{"name":"Titamon","skills":[{"available":true,"hits":1,"perHit":95.0,"baseTotal":95.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","FIRE","WIND","STEEL","DARKNESS"]},{"available":true,"hits":5,"perHit":29.0,"baseTotal":145.0,"baseElement":"DARKNESS","elements":["FIRE","WIND","ICE","STEEL","DARKNESS"]},{"available":true,"hits":2,"perHit":64.0,"baseTotal":128.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","THUNDER","STEEL","DARKNESS"]}]},{"name":"Ulforceveedramon","skills":[{"available":true,"hits":1,"perHit":95.0,"baseTotal":95.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","FIRE","THUNDER","STEEL"]},{"available":true,"hits":4,"perHit":35.0,"baseTotal":140.0,"baseElement":"LIGHT","elements":["THUNDER","WIND","EARTH","LIGHT"]},{"available":true,"hits":6,"perHit":24.0,"baseTotal":144.0,"baseElement":"WIND","elements":["PHYSICAL","WIND","ICE","STEEL"]}]},{"name":"Valkyrimon","skills":[{"available":true,"hits":5,"perHit":19.0,"baseTotal":95.0,"baseElement":"WIND","elements":["PHYSICAL","WIND","WOOD"]},{"available":true,"hits":3,"perHit":43.0,"baseTotal":129.0,"baseElement":"ICE","elements":["PHYSICAL","WIND","ICE","STEEL"]},{"available":true,"hits":10,"perHit":14.0,"baseTotal":140.0,"baseElement":"WIND","elements":["PHYSICAL","WIND","WOOD","STEEL"]}]},{"name":"Varodurumon","skills":[{"available":true,"hits":6,"perHit":16.0,"baseTotal":96.0,"baseElement":"WIND","elements":["PHYSICAL","WIND","ICE"]},{"available":false,"hits":1,"perHit":null,"baseTotal":null,"baseElement":"LIGHT","elements":["FIRE","WIND","LIGHT"]},{"available":true,"hits":5,"perHit":29.0,"baseTotal":145.0,"baseElement":"LIGHT","elements":["FIRE","THUNDER","ICE","LIGHT"]}]},{"name":"Venommyotismon","skills":[{"available":true,"hits":1,"perHit":95.0,"baseTotal":95.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","THUNDER","DARKNESS"]},{"available":true,"hits":4,"perHit":36.0,"baseTotal":144.0,"baseElement":"FIRE","elements":["FIRE","WIND","DARKNESS"]},{"available":true,"hits":4,"perHit":32.0,"baseTotal":128.0,"baseElement":"DARKNESS","elements":["FIRE","THUNDER","WIND","DARKNESS"]}]},{"name":"Vikemon","skills":[{"available":true,"hits":1,"perHit":95.0,"baseTotal":95.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","THUNDER","ICE","WATER"]},{"available":true,"hits":6,"perHit":24.0,"baseTotal":144.0,"baseElement":"ICE","elements":["WIND","ICE","WATER","DARKNESS"]},{"available":false,"hits":1,"perHit":null,"baseTotal":null,"baseElement":"THUNDER","elements":["THUNDER","ICE","WATER"]}]},{"name":"Wargreymon","skills":[{"available":true,"hits":2,"perHit":48.0,"baseTotal":96.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","FIRE","STEEL","DARKNESS"]},{"available":true,"hits":1,"perHit":145.0,"baseTotal":145.0,"baseElement":"FIRE","elements":["FIRE","THUNDER","EARTH","LIGHT"]},{"available":false,"hits":1,"perHit":null,"baseTotal":null,"baseElement":"STEEL","elements":["FIRE","EARTH","STEEL","LIGHT"]}]},{"name":"Zanbamon","skills":[{"available":true,"hits":2,"perHit":48.0,"baseTotal":96.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","FIRE","WIND","STEEL","DARKNESS"]},{"available":true,"hits":2,"perHit":64.0,"baseTotal":128.0,"baseElement":"PHYSICAL","elements":["PHYSICAL","STEEL","DARKNESS"]},{"available":true,"hits":1,"perHit":145.0,"baseTotal":145.0,"baseElement":"WIND","elements":["FIRE","WIND","DARKNESS"]}]},{"name":"Zeedmillenniumon","skills":[{"available":true,"hits":3,"perHit":32.0,"baseTotal":96.0,"baseElement":"DARKNESS","elements":["PHYSICAL","LIGHT","DARKNESS"]},{"available":true,"hits":6,"perHit":29.0,"baseTotal":174.0,"baseElement":"DARKNESS","elements":["THUNDER","WIND","LIGHT","DARKNESS"]},{"available":true,"hits":4,"perHit":35.0,"baseTotal":140.0,"baseElement":"DARKNESS","elements":["THUNDER","LIGHT","DARKNESS"]}]},{"name":"Zhuqiaomon","skills":[{"available":true,"hits":4,"perHit":24.0,"baseTotal":96.0,"baseElement":"FIRE","elements":["FIRE","WIND","EARTH"]},{"available":true,"hits":6,"perHit":29.0,"baseTotal":174.0,"baseElement":"FIRE","elements":["FIRE","WIND","LIGHT"]},{"available":true,"hits":5,"perHit":29.0,"baseTotal":145.0,"baseElement":"FIRE","elements":["PHYSICAL","FIRE","EARTH"]}]}];

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

  return skillCalcDatabase.find(function(item) {
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
      Array.isArray(
        skillCalcDatabase
      )
        ? skillCalcDatabase
        : []
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

document.addEventListener(
  "DOMContentLoaded",
  function() {

    carregarImagensSite();

    inicializarCalculadora();

    carregarDatabase();

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