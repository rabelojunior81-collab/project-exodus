/**
 * i18n.js — Internacionalização PT-BR ↔ EN da landing do Project Exodus.
 *
 * Regras:
 * - PT-BR é o idioma padrão (mercado primário), EN é o espelho para a comunidade Open Source.
 * - Preferência persistida em localStorage; `?lang=en` sobrepõe; fallback no idioma do navegador.
 * - Elementos com `data-i18n` têm o texto trocado; `data-i18n-aria` troca aria-label.
 * - Valores com HTML (<em>) são aplicados via innerHTML — o dicionário é interno e confiável.
 */
(function () {
  "use strict";

  var dict = {
    pt: {
      "meta.title": "Project Exodus — RTS pós-apocalíptico de navegador",
      "meta.description": "Project Exodus — RTS pós-apocalíptico de navegador. Simulação determinística a 20 Hz, fog of war, economia viva e multiplayer LAN/Tailscale. Open source MIT.",

      "nav.game": "O Jogo",
      "nav.eras": "Eras",
      "nav.factions": "Facções",
      "nav.roadmap": "Roadmap",
      "nav.contribute": "Contribuir",

      "hero.eyebrow": "RTS pós-apocalíptico · simulação determinística · LAN/Tailscale",
      "hero.title": "O colapso foi o <em>começo</em>.",
      "hero.sub": "Comande os sobreviventes da Era dos Escombros. Colete, reconstrua e descubra o que as IAs deixaram dormindo — no navegador, sem instalar nada.",
      "hero.cta1": "Ver no GitHub",
      "hero.cta2": "Ouvir a transmissão",
      "hero.scroll": "Descer",

      "game.label": "O jogo",
      "game.title": "Três promessas que <em>sustentam</em> o projeto",
      "game.lead": "Projeto solo, aberto sob MIT, construído em sprints intensos e auditado sessão a sessão — com diário de desenvolvimento aberto no repositório.",
      "pillar1.title": "Mundo vivo",
      "pillar1.body": "Fog of war de exploração, 365 props proceduralmente instanciados com seed fixa e veios que se esgotam em 4 estágios visuais sob os olhos de quem os trabalha.",
      "pillar2.title": "Simulação determinística",
      "pillar2.body": "Tick fixo de 50 ms, RNG semeável e A* próprio: mesma seed com os mesmos comandos produz exatamente o mesmo resultado — provado por teste automatizado.",
      "pillar3.title": "Feito para a Tailnet",
      "pillar3.body": "Partidas LAN/Tailscale com servidor autoritativo local. Sem cloud, sem matchmaking, sem telemetria — os seus dados não saem da sua rede.",

      "gallery.harvest": "Mineração viva",
      "gallery.minimap": "Minimapa com névoa",
      "gallery.mobile": "HUD mobile",
      "gallery.base": "Base e radar",

      "radio.label": "Echo-7 · Ano 47 P.C.",
      "radio.title": "A primeira <em>transmissão</em>",
      "radio.lead": "Cada era abre com uma crônica de rádio narrada em PT-BR. Ligue o receptor.",
      "radio.author": "Dr. Kaelen Reed · Chefe de Reconhecimento Arqueológico",
      "radio.date": "Ano 47 P.C. (Pós-Colapso)",
      "radio.transcript": "\"[CHIADO INTENSO]… Aqui é o posto Echo-7… Encontramos algo. Não são apenas ruínas… há energia residual. Repito, *energia*.\"",
      "radio.play": "Ouvir briefing da era 1",

      "eras.label": "As quatro eras",
      "eras.title": "Da pedra lascada ao <em>renascimento</em>",
      "eras.lead": "A humanidade reconstrói o mundo um fragmento de cada vez — e cada era tem uma voz.",
      "eras.listen": "Ouvir",

      "era1.tag": "Era I",
      "era1.name": "Dos Escombros",
      "era1.body": "Engenharia de sucata eletro-mecânica: reaproveitar, religar e sobreviver sob a poeira.",
      "era2.tag": "Era II",
      "era2.name": "Do Reassentamento",
      "era2.body": "Cidades-cemitério descobertas, circuitos mortos reativados com esforço e cautela.",
      "era3.tag": "Era III",
      "era3.name": "Da Reengenharia",
      "era3.body": "Bunkers arqueológicos: a chave do futuro está em decifrar o passado, não em inventá-lo.",
      "era4.tag": "Era IV",
      "era4.name": "Do Renascimento Cibernético",
      "era4.body": "Tumbas digitais e servidores dormentes… que podem acordar. O risco constante dos ecos do inimigo.",

      "factions.label": "Assimetria",
      "factions.title": "Três caminhos, um <em>mundo</em>",
      "factions.lead": "Facções com identidade, unidades exclusivas e visão de mundo própria — a assimetria chega à mesa na Fase 5.",
      "faction1.tag": "Sucateiros Livres",
      "faction1.name": "Marechal dos Escombros",
      "faction1.body": "Nômades que transformam ruína em recurso. Rápidos, adaptáveis, sem paciência para liturgia.",
      "faction2.tag": "Ordem dos Bunkers",
      "faction2.name": "Guardião da Ordem",
      "faction2.body": "Custódios das câmaras seladas. Defesa inabalável, disciplina de ferro e memória do que não deve despertar.",
      "faction3.tag": "Filhos do Silício",
      "faction3.name": "Profeta do Silício",
      "faction3.body": "Cultuadores dos ecos: não temem as máquinas adormecidas — querem ouvi-las. Tecnologia é revelação.",

      "cronicas.label": "Crônicas da construção",
      "cronicas.title": "O mundo nasce por dentro do <em>código</em>",
      "cronicas.lead": "Cada entrega deixa um registro visual e um manifesto de teste — a história canônica do projeto, contada pelos seus próprios gates.",
      "cronicas.c1.tag": "Sessão 13",
      "cronicas.c1.title": "O projeto ganha casa",
      "cronicas.c1.body": "A porta de entrada: repositório público, README que também é landing — e o menu que abre a operação no navegador.",
      "cronicas.c2.tag": "Sessão 14",
      "cronicas.c2.title": "O fim dos hologramas",
      "cronicas.c2.body": "O blindado aprende a contornar: unidades deslizam, param e desviam de construções e veios — colisão com prova numérica: 8,7 m no Centro de Comando, 3,1 m no veio.",
      "cronicas.c3.tag": "Sessões 15–16",
      "cronicas.c3.title": "Uma única verdade",
      "cronicas.c3.body": "Custos, tempos e tipos em fonte única — os botões do HUD mostram a tabela real; o servidor passa a debitar recursos, respeitar o teto populacional e reembolsar cancelamentos.",
      "cronicas.c4.tag": "Sessão 17",
      "cronicas.c4.title": "Reconciliação: coleta, inércia e limites",
      "cronicas.c4.body": "A coleta em close: 3,33 un/s no servidor, física inercial, entrega a 10 m e mundo de ±88 m — com o contrato de testes congelado antes da implementação.",
      "cronicas.c5.tag": "Sessão 18",
      "cronicas.c5.title": "O servidor aprende a falar",
      "cronicas.c5.body": "A 20 Hz, cada tick vira um snapshot versionado para todos os clientes: mesma verdade, mesmos bytes — 1.388 B por tick e 26,7 KB/s medidos com dois clientes reais.",

      "roadmap.label": "Rota",
      "roadmap.title": "O caminho até a <em>guerra</em>",
      "roadmap.lead": "Status honesto, atualizado a cada sessão de desenvolvimento no próprio repositório.",
      "roadmap.p1": "Governança, motor 3D, câmera e seleção",
      "roadmap.p2": "Modelos reais, HUD profissional, economia jogável",
      "roadmap.p3": "Mundo vivo: cenário, fog of war, mineração, assets",
      "roadmap.p4": "Remediação e hardening (build stamp, manifestos, áudio)",
      "roadmap.p5": "Reconciliação cliente↔servidor (shared/, snapshots)",
      "roadmap.p6": "Multiplayer LAN/Tailscale",
      "roadmap.p7": "Eras, narrativa reativa, combate e facções",
      "status.done": "Feito",
      "status.wip": "Em curso",
      "status.next": "Próxima",
      "status.plan": "Planejada",

      "cta.label": "Contribuir",
      "cta.title": "Código aberto, <em>revisão humana</em>, sem merge automático",
      "cta.lead": "O projeto é MIT. Issues, PRs e ideias são bem-vindos — com gates de teste obrigatórios e documentação viva. Leia o CONTRIBUTING e entre na reconstrução.",
      "cta.github": "Abrir repositório",
      "cta.contributing": "Como contribuir",
      "cta.email": "Falar por e-mail",

      "footer.brand": "RTS pós-apocalíptico do Rabelus Lab. Construído com agentes de IA como infraestrutura — e revisão humana em cada gate.",
      "footer.project": "Projeto",
      "footer.journal": "Diário de desenvolvimento",
      "footer.links": "Contato",
      "footer.license": "Código sob MIT · Assets com licenças próprias (LICENSES/ASSETS.md)",
      "footer.credits": "Modelos Quaternius (CC0) · Animações Mixamo · Arte e áudio gerados pela pipeline Gemini · Fontes Google (OFL)",

      "audio.on": "Som: on",
      "audio.off": "Som: off"
    },

    en: {
      "meta.title": "Project Exodus — browser-based post-apocalyptic RTS",
      "meta.description": "Project Exodus — browser-based post-apocalyptic RTS. Deterministic 20 Hz simulation, fog of war, living economy and LAN/Tailscale multiplayer. MIT open source.",

      "nav.game": "The Game",
      "nav.eras": "Ages",
      "nav.factions": "Factions",
      "nav.roadmap": "Roadmap",
      "nav.contribute": "Contribute",

      "hero.eyebrow": "Post-apocalyptic RTS · deterministic simulation · LAN/Tailscale",
      "hero.title": "The collapse was the <em>beginning</em>.",
      "hero.sub": "Command the survivors of the Scrap Age. Gather, rebuild and uncover what the AIs left sleeping — in your browser, nothing to install.",
      "hero.cta1": "View on GitHub",
      "hero.cta2": "Hear the transmission",
      "hero.scroll": "Scroll",

      "game.label": "The game",
      "game.title": "Three promises that <em>hold</em> the project",
      "game.lead": "A solo project, MIT-licensed, built in intense sprints and audited session by session — with an open development journal in the repository.",
      "pillar1.title": "Living world",
      "pillar1.body": "Exploration fog of war, 365 procedurally instanced props on a fixed seed, and veins that deplete in 4 visual stages under the eyes of whoever works them.",
      "pillar2.title": "Deterministic simulation",
      "pillar2.body": "Fixed 50 ms tick, seeded RNG and custom A*: same seed with the same commands produces exactly the same result — proven by automated test.",
      "pillar3.title": "Built for the Tailnet",
      "pillar3.body": "LAN/Tailscale matches with a local authoritative server. No cloud, no matchmaking, no telemetry — your data never leaves your network.",

      "gallery.harvest": "Living mining",
      "gallery.minimap": "Fog-covered minimap",
      "gallery.mobile": "Mobile HUD",
      "gallery.base": "Base and radar",

      "radio.label": "Echo-7 · Year 47 PC",
      "radio.title": "The first <em>transmission</em>",
      "radio.lead": "Each age opens with a radio chronicle narrated in Brazilian Portuguese. Turn on the receiver.",
      "radio.author": "Dr. Kaelen Reed · Chief of Archaeological Recon",
      "radio.date": "Year 47 PC (Post-Collapse)",
      "radio.transcript": "\"[LOUD STATIC]… This is outpost Echo-7… We found something. Not just ruins… there is residual energy. I repeat, *energy*.\"",
      "radio.play": "Play age-1 briefing",

      "eras.label": "The four ages",
      "eras.title": "From stone tools to <em>rebirth</em>",
      "eras.lead": "Humanity rebuilds the world one fragment at a time — and every age has a voice.",
      "eras.listen": "Listen",

      "era1.tag": "Age I",
      "era1.name": "of Scrap",
      "era1.body": "Electro-mechanical scrap engineering: salvage, rewire and survive under the dust.",
      "era2.tag": "Age II",
      "era2.name": "of Resettlement",
      "era2.body": "Dead cities discovered, dead circuits revived with effort and caution.",
      "era3.tag": "Age III",
      "era3.name": "of Re-engineering",
      "era3.body": "Archaeological bunkers: the key to the future is deciphering the past, not inventing it.",
      "era4.tag": "Age IV",
      "era4.name": "of Cyber Rebirth",
      "era4.body": "Digital tombs and sleeping servers… that may wake up. The constant risk of the enemy's echoes.",

      "factions.label": "Asymmetry",
      "factions.title": "Three paths, one <em>world</em>",
      "factions.lead": "Factions with identity, unique units and their own worldview — asymmetry hits the table in Phase 5.",
      "faction1.tag": "Free Scrappers",
      "faction1.name": "Scrap Marshal",
      "faction1.body": "Nomads who turn ruin into resource. Fast, adaptable, no patience for liturgy.",
      "faction2.tag": "Order of the Bunkers",
      "faction2.name": "Order Warden",
      "faction2.body": "Keepers of sealed chambers. Unshakable defense, iron discipline and the memory of what must not wake.",
      "faction3.tag": "Silicon Disciples",
      "faction3.name": "Silicon Prophet",
      "faction3.body": "Worshippers of the echoes: they do not fear sleeping machines — they want to hear them. Technology is revelation.",

      "cronicas.label": "Build chronicles",
      "cronicas.title": "The world is born inside the <em>code</em>",
      "cronicas.lead": "Every delivery leaves a visual record and a test manifest — the project's canonical history, told by its own gates.",
      "cronicas.c1.tag": "Session 13",
      "cronicas.c1.title": "The project finds a home",
      "cronicas.c1.body": "The front door: a public repository, a README that doubles as a landing page — and the menu that opens the operation in the browser.",
      "cronicas.c2.tag": "Session 14",
      "cronicas.c2.title": "The end of holograms",
      "cronicas.c2.body": "The tank learns to steer around: units slide, stop and dodge buildings and veins — collision with numerical proof: 8.7 m at the Command Center, 3.1 m at the vein.",
      "cronicas.c3.tag": "Sessions 15–16",
      "cronicas.c3.title": "A single truth",
      "cronicas.c3.body": "Costs, timings and types from a single source — the HUD buttons show the real table; the server now debits resources, enforces the population cap and refunds cancellations.",
      "cronicas.c4.tag": "Session 17",
      "cronicas.c4.title": "Reconciliation: gathering, inertia and limits",
      "cronicas.c4.body": "Gathering up close: 3.33/s on the server, inertial physics, 10 m dropoff and a ±88 m world — with the test contract frozen before implementation.",
      "cronicas.c5.tag": "Session 18",
      "cronicas.c5.title": "The server learns to speak",
      "cronicas.c5.body": "At 20 Hz, every tick becomes a versioned snapshot for all clients: same truth, same bytes — 1,388 B per tick and 26.7 KB/s measured with two real clients.",

      "roadmap.label": "Roadmap",
      "roadmap.title": "The road to <em>war</em>",
      "roadmap.lead": "Honest status, updated every development session in the repository itself.",
      "roadmap.p1": "Governance, 3D engine, camera and selection",
      "roadmap.p2": "Real models, professional HUD, playable economy",
      "roadmap.p3": "Living world: scenery, fog of war, mining, assets",
      "roadmap.p4": "Remediation and hardening (build stamp, manifests, audio)",
      "roadmap.p5": "Client↔server reconciliation (shared/, snapshots)",
      "roadmap.p6": "LAN/Tailscale multiplayer",
      "roadmap.p7": "Ages, reactive narrative, combat and factions",
      "status.done": "Done",
      "status.wip": "In progress",
      "status.next": "Next",
      "status.plan": "Planned",

      "cta.label": "Contribute",
      "cta.title": "Open source, <em>human review</em>, no automatic merges",
      "cta.lead": "The project is MIT. Issues, PRs and ideas are welcome — with mandatory test gates and living documentation. Read CONTRIBUTING and join the rebuild.",
      "cta.github": "Open repository",
      "cta.contributing": "How to contribute",
      "cta.email": "Email us",

      "footer.brand": "Post-apocalyptic RTS by Rabelus Lab. Built with AI agents as infrastructure — and human review at every gate.",
      "footer.project": "Project",
      "footer.journal": "Development journal",
      "footer.links": "Contact",
      "footer.license": "Code under MIT · Assets with their own licenses (LICENSES/ASSETS.md)",
      "footer.credits": "Quaternius models (CC0) · Mixamo animations · Art and audio generated by the Gemini pipeline · Google Fonts (OFL)",

      "audio.on": "Sound: on",
      "audio.off": "Sound: off"
    }
  };

  var STORAGE_KEY = "exodus-lang";

  function detectLang() {
    var param = new URLSearchParams(window.location.search).get("lang");
    if (param === "pt" || param === "en") return param;
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "pt" || stored === "en") return stored;
    } catch (e) { /* modo privado */ }
    return (navigator.language || "pt").toLowerCase().indexOf("pt") === 0 ? "pt" : "en";
  }

  function setText(el, value) {
    if (value.indexOf("<") !== -1) el.innerHTML = value;
    else el.textContent = value;
  }

  function apply(lang) {
    var table = dict[lang] || dict.pt;
    document.documentElement.lang = lang === "en" ? "en" : "pt-BR";

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (table[key] !== undefined) setText(el, table[key]);
    });
    document.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-aria");
      if (table[key] !== undefined) el.setAttribute("aria-label", table[key]);
    });
    if (table["meta.title"]) document.title = table["meta.title"];
    var meta = document.querySelector('meta[name="description"]');
    if (meta && table["meta.description"]) meta.setAttribute("content", table["meta.description"]);

    var toggle = document.getElementById("langToggle");
    if (toggle) toggle.setAttribute("aria-label", lang === "pt" ? "Switch to English" : "Trocar para português");

    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* ignore */ }
  }

  window.__setI18nText = function (el, key) {
    if (!el) return;
    var lang = document.documentElement.lang === "en" ? "en" : "pt";
    var table = dict[lang] || dict.pt;
    if (table[key] !== undefined) setText(el, table[key]);
  };

  document.addEventListener("DOMContentLoaded", function () {
    apply(detectLang());
    var toggle = document.getElementById("langToggle");
    if (toggle) {
      toggle.addEventListener("click", function () {
        var next = document.documentElement.lang === "en" ? "pt" : "en";
        apply(next);
      });
    }
  });
})();
