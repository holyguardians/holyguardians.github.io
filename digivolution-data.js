/*
 * HOLY GUARDIANS — DIGIVOLUTION DATABASE
 * Fonte de referência: DSRWorldWiki / DSRWiki.
 * Mantida separada da DATABASE NOVA para preservar a Digidex.
 *
 * cubePercent informa o valor de cada bloco de potencial.
 * requirements.stats usa a porcentagem exigida exibida pela wiki.
 */
window.HG_DIGIVOLUTIONS = [
  {
    id: "wargreymon-agumon-kizuna",
    from: ["Wargreymon"],
    to: "Agumon_Kizuna",
    displayName: "Agumon Kizuna",
    stage: "MEGA",
    category: "SPECIAL",
    probability: "100%",
    cubePercent: 4,
    requirements: {
      level: 100,
      bond: null,
      stats: {
        STR: { value: 1285, percent: 22 },
        INT: { value: 912, percent: 20 },
        DEF: { value: 1170, percent: 17 },
        RES: { value: 1056, percent: 18 }
      },
      items: [
        { name: "Indomitable Courage", quantity: 1, icon: "" }
      ]
    },
    source: "https://dsrworldwiki.com/pt/digimon/wargreymon"
  },
  {
    id: "wargreymon-omegamon",
    from: ["Wargreymon"],
    to: "Omegamon",
    displayName: "Omegamon",
    stage: "MEGA",
    category: "JOGRESS",
    probability: "100%",
    cubePercent: 4,
    requirements: {
      level: 100,
      bond: 25,
      stats: {
        STR: { value: 1454, percent: 38 },
        DEF: { value: 1399, percent: 40 }
      },
      items: [
        { name: "Varodurumon's Feather", quantity: 1, icon: "" },
        { name: "Holy Ring", quantity: 10, icon: "" }
      ]
    },
    source: "https://dsrworldwiki.com/pt/digimon/wargreymon"
  },
  {
    id: "impmon-beelzebumon-bm",
    from: ["Beelzebumon"],
    to: "Beelzebumon BM",
    displayName: "Beelzebumon BM",
    stage: "MEGA",
    category: "BURST MODE",
    probability: "SPECIAL",
    cubePercent: 4,
    requirements: {
      level: 100,
      bond: 4.3,
      stats: {
        STR: { value: 1514, percent: null },
        SPD: { value: 666, percent: null }
      },
      items: [
        { name: "Makoto's Toy Gun", quantity: 1, icon: "" }
      ]
    },
    source: "https://digimonsr.wiki.gg/wiki/Beelzebumon_BM"
  }
];
