# Sessão 12 — Auditoria Holística de Retomada (Pré-Fase 2.6)

> **Ciclo**: Exploração e auditoria completa do projeto antes de retomar o desenvolvimento.
> **Data/Hora**: 2026-09-10T12:30:00-03:00
> **Escopo**: 100% do repositório fora de `node_modules` (421 arquivos), com execução real de todos os gates.
> **Método**: verificação empírica primeiro, documentação depois. Nenhum achado abaixo foi inferido de documento — todos foram reproduzidos em disco ou em execução.

---

## 0. Sumário Executivo

O projeto está **materialmente melhor do que a documentação sugere em qualidade de código, e materialmente pior do que ela sugere em segurança operacional e em integração cliente↔servidor.**

Três frases que resumem o estado:

1. **O jogo é real e jogável.** Todos os gates declarados no `handoff.md` da Sessão 11 foram re-executados nesta auditoria e **passaram**. Não há teatro de teste: os testes clicam botões de verdade e medem estado de verdade.
2. **O trabalho inteiro está sem rede de proteção.** Não existe repositório Git. 421 arquivos e ~2 dias de construção intensa dependem de um único diretório em disco.
3. **A Fase 2.6 não é uma integração — é uma reconciliação.** Cliente e servidor evoluíram em paralelo por 4 sub-fases e divergiram em modelo de dados, em constantes econômicas e em modelo de física. O roadmap trata isso como uma sub-fase; o trabalho real tem escopo de fase inteira.

**Veredito de retomada**: não iniciar feature nova antes de fechar os itens `CRIT-01` e `CRIT-02` (custo estimado combinado: < 1h). Eles não são melhorias — são a remoção de risco irreversível e a restauração de um mecanismo de diagnóstico que hoje mente.

---

## 1. Inventário Verificado do Sistema

### 1.1 Topologia

```
game-rts/                        monorepo npm workspaces (private, UNLICENSED)
├── client/          6.338 LoC   Three.js 0.174 + Vite 6 · jogo completo client-side
├── server/          1.514 LoC   simulação autoritativa 20Hz + WebSocket · NÃO CONECTADO
├── tools/
│   ├── studio-gemini/  ~860 LoC pipeline de geração de assets (@google/genai 2.21.0)
│   └── visual-check/   ~715 LoC harness Playwright (FORA dos workspaces npm)
└── docs/                        journal (19 entradas) · specs (2) · knowledge (1)
```

**Observação estrutural**: `tools/visual-check` não é workspace npm — tem `package.json` e `node_modules` próprios e `"type": "commonjs"` (o resto do monorepo é ESM). Isso funciona, mas significa que `npm run build --workspaces` e `npm test --workspaces` **não enxergam o harness que valida o cliente**.

### 1.2 Distribuição de código (produção, sem testes)

| Arquivo | LoC | Papel |
| :--- | ---: | :--- |
| `client/src/main.ts` | 1.129 | orquestrador: cena, luz, câmera, economia, treino, nós, minimapa, loop |
| `client/src/ui/hud.ts` | 820 | controlador de HUD completo |
| `client/src/entities/unit.ts` | 579 | entidade Unit + FSM de coleta + física de locomoção |
| `server/src/simulation.ts` | 474 | loop autoritativo + comandos + snapshot |
| `client/src/engine/props.ts` | 464 | cenário procedural instanciado |
| `server/src/grid.ts` | 397 | grid espacial + A* |
| `client/src/engine/selection.ts` | 375 | raycast + box selection + ordens |
| `server/src/protocol.ts` | 292 | tipos e (de)serialização do protocolo |
| demais (14 arquivos) | < 280 cada | — |

---

## 2. Gates Re-executados Nesta Auditoria

Todos os comandos abaixo foram rodados nesta sessão, não copiados de registro anterior.

| # | Gate | Comando | Resultado |
| :-- | :--- | :--- | :--- |
| G1 | Typecheck client | `cd client && npx tsc --noEmit` | 🟢 exit 0 |
| G2 | Typecheck server | `cd server && npx tsc --noEmit` | 🟢 exit 0 |
| G3 | Typecheck studio | `cd tools/studio-gemini && npx tsc --noEmit` | 🟢 exit 0 |
| G4 | Suíte do servidor | `cd server && npm test` | 🟢 39 asserts PASS (smoke + protocol 7 + astar 7 + resources 7 + simulation 8 + worker 6) |
| G5 | Botões funcionais | `node tools/visual-check/test-buttons.mjs` | 🟢 10/10 PASS · 0 pageerrors |
| G6 | Coleta e2e | (embutido em G5) | 🟢 PASS · sucata → 560 |
| G7 | Prova de produção | `node tools/visual-check/dist-proof.mjs` | 🟢 11 entidades · 8 nós · 0 pageerrors |
| G8 | Vazamento de segredo | `grep -rlF "$GEMINI_API_KEY"` em client/server/tools/docs/raiz | 🟢 zero ocorrências fora de `.env` |
| G9 | Sincronia `public/` ↔ `dist/` | `diff -rq` | 🟢 idênticos (só o bundle JS/CSS a mais em `dist/`) |
| G10 | Paridade de coordenadas dos veios | comparação `main.ts:305-314` × `resources.ts:49-58` | 🟢 8/8 idênticas |
| G11 | Determinismo dos props | `grep Math.random client/src/engine/props.ts` | 🟢 nenhuma ocorrência (só comentário) |

**Conclusão dos gates**: o `handoff.md` da Sessão 11 é honesto. Nenhuma afirmação de gate foi encontrada falsa.

### 2.1 Alegação não verificável

O `estate.md` afirma **"60 FPS estáveis"** em dois pontos. Isso **não foi verificado e não é verificável pelo harness atual**: o Playwright roda com `--use-gl=swiftshader` (rasterização por software, ~3,4 FPS — o próprio registro da 1.7D reconhece que a janela de teste do mech precisou dobrar de 120s para 240s por causa disso). A afirmação de FPS só se sustenta em playtest com GPU real. Recomenda-se rebaixá-la a "não medido" no `estate.md` até haver medição instrumentada.

---

## 3. Achados

Classificação: **CRIT** (risco irreversível ou defeito que anula um mecanismo de segurança) · **ALTO** (bloqueia ou infla materialmente a próxima fase) · **MED** (dívida real, sem bloqueio imediato) · **BAIXO** (higiene).

---

### CRIT-01 — Ausência total de controle de versão

**Evidência**
```
$ git -C . rev-parse --is-inside-work-tree
fatal: not a git repository (or any of the parent directories): .git
```

**Análise**
Existe `.gitignore` completo e correto (24 regras, `.env` protegido, `dist/` ignorado). Existe `AGENTS.md` com protocolo de assinatura por alteração estrutural. Existem 19 entradas de journal descrevendo mudanças sessão a sessão. **Nada disso é versionado.** A metodologia de governança inteira está apoiada em arquivos markdown que descrevem mudanças que ninguém consegue reverter, comparar ou auditar linha a linha.

O paradoxo é agudo: a Sessão 10 executou uma normalização kebab-case que renomeou 19 assets e alterou 7 arquivos de código. Isso foi feito sem diff, sem stash, sem possibilidade de rollback. Deu certo — mas foi aposta, não engenharia.

**Impacto**
- Perda total em caso de falha de disco, `rm` acidental ou edição destrutiva de agente.
- Impossível bisseccionar uma regressão (ex.: o bug do "Hips fix" da Sessão 2, que levou **duas sessões** para ser diagnosticado, seria localizado por `git bisect` em minutos).
- Impossível revisar o que um agente autônomo alterou antes de aceitar.
- Contradiz frontalmente a diretiva de governança do próprio Rabelus Lab: *"Sem merge automático — sempre revisão manual"*. Não há o que revisar sem diff.

**Remediação**
```bash
git init
git add -A                      # .gitignore já protege .env e dist/
git commit -m "chore: baseline do Project Exodus na Sessão 12 (pós-Fase 1.7)"
git tag v0.1.0-fase-1.7
```
Custo: ~15 min. Verificar após o `add` que `git status --porcelain | grep -c '\.env'` retorna `0`.

**Nota sobre `dist/`**: o `.gitignore` ignora `dist/`. Isso é correto para código, mas `client/dist/assets/` contém 22 MB de assets gerados por API paga que **não são reprodutíveis deterministicamente** (geração por LLM). Esses assets vivem também em `client/public/assets/` (que É versionado) e em `tools/studio-gemini/masters/` (31 MB, também versionado). A cópia em `public/` é a fonte; `dist/` é derivado. A decisão está correta — mas os 31 MB de `masters/` merecem discussão explícita (ver MED-08).

---

### CRIT-02 — O carimbo de build é um placebo e nunca detectou cache

**Evidência**

`client/src/main.ts:566-572`
```ts
// Carimbo de build visível (fim da dúvida de cache: mostra a data do build)
{
  const tag = document.querySelector('.hud-tag');
  if (tag) {
    const d = new Date(document.lastModified);
    const stamp = `${...}`;
    tag.textContent = `MIL-SPEC 0.2.0 · BUILD ${stamp}`;
  }
}
```

Reprodução controlada nesta auditoria:
```
$ ls -la client/dist/index.html
-rw-r--r--  14976 Sep 10 12:09 client/dist/index.html     ← build congelado às 12:09

$ curl -sI http://localhost:4173/ | grep -i last-modified
(nenhuma saída — o Vite preview não emite o header)

$ date "+%H:%M"
12:30

$ node tools/visual-check/dist-proof.mjs
DIST {"n":11,"nodes":8,"stamp":"MIL-SPEC 0.2.0 · BUILD 10/09 12:30"}
                                                          ^^^^^ = a hora do teste, não do build
```

**Análise**
Por especificação do HTML, quando o servidor não envia o header `Last-Modified`, `document.lastModified` retorna **a data/hora corrente do cliente**. O Vite (dev e preview) não emite esse header para o `index.html` transformado. Logo o carimbo exibe sempre "agora", independentemente de qual bundle está sendo servido.

O agravante é histórico. Esse carimbo foi criado na **Sub-fase 1.9.4**, em resposta direta à causa-raiz nº 1 do playtest furioso da Sessão 6 — registrada no roadmap como: *"`client/dist/` com 9h de atraso — o usuário via o jogo velho"*. O mecanismo construído para garantir que aquilo nunca mais aconteceria **é incapaz, por construção, de detectar aquilo acontecendo**. Pior: ele produz falsa confiança, porque sempre exibe um horário plausível e recente.

Os registros de sessão que citam o carimbo como prova (`stamp 10/09 12:13`, `stamp 16:52`) estão, na verdade, registrando o horário em que o teste rodou.

**Remediação**
Injetar a constante em tempo de build no `client/vite.config.ts`:
```ts
export default defineConfig({
  define: {
    __BUILD_STAMP__: JSON.stringify(
      new Date().toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
      })
    ),
  },
  // ...
});
```
E em `main.ts`, trocar o bloco por `tag.textContent = \`MIL-SPEC 0.2.0 · BUILD ${__BUILD_STAMP__}\`;` com `declare const __BUILD_STAMP__: string;`.

**Gate de aceite proposto**: build, anotar o carimbo, esperar 2 min, recarregar a página — o carimbo **não pode** mudar. Esse teste negativo é o que faltou na 1.9.4.

Custo: ~15 min. Prioridade máxima depois do Git, porque restaura a única defesa contra o bug que mais custou tempo ao projeto.

---

### ALTO-03 — A Fase 2.6 é uma reconciliação, não uma integração

O roadmap descreve a Sub-fase 2.6 como *"Integração cliente (orquestrador): snapshot→HUD/entidades, ordens→comandos"* — uma linha, dentro de uma fase já 5/6 concluída. A auditoria mostra que cliente e servidor divergiram em **cinco eixos independentes** durante as Fases 1.7A–1.7E, e que nenhum deles é resolvido por "ligar o WebSocket".

#### 3.1 — O cliente não tem cliente de rede

```
$ grep -rn "WebSocket\|ws://\|8080" client/src client/index.html
(nenhuma ocorrência)
```
A simulação é 100% local. Isso está honestamente marcado no código com quatro comentários `TODO-2.6` (`main.ts:107`, `main.ts:303`, `main.ts:507`, `main.ts:961`, `unit.ts:63`) — crédito à disciplina. Mas significa que 2.6 inclui construir a camada de transporte do zero no cliente.

#### 3.2 — O servidor não transmite estado

`server/src/index.ts:76-79`
```ts
private tick(): void {
  this.sim.step();
  // Broadcast de snapshots entra na Fase 3 (rede). Por ora, sim puro.
}
```
O servidor aceita comandos e responde `CMD_ACK`, mas **nunca envia snapshot**. `Simulation` sabe serializar snapshot (testado, assert 7 da suíte `simulation`), mas ninguém chama isso no loop. Portanto 2.6 depende de trabalho que o roadmap alocou na **Fase 3**. As duas fases estão entrelaçadas e o roadmap não reflete isso.

#### 3.3 — Divergência de modelo de dados: 5 unidades × 3

| | Cliente (`unit.ts:8`) | Servidor (`protocol.ts:29`) |
| :--- | :--- | :--- |
| SCAVENGER_WORKER | ✅ | ✅ |
| RUST_RAIDER | ✅ | ✅ |
| SCRAP_BUGGY | ✅ | ✅ |
| MAINTENANCE_DRONE | ✅ (1.7C) | ❌ |
| BIPED_MECH | ✅ (1.7C) | ❌ |

As duas unidades adicionadas na Sub-fase 1.7C entraram apenas no cliente. O `protocol.ts` traz o comentário `/** Tipos de unidade (idem UnitType do cliente). */` — a afirmação de paridade envelheceu e virou falsa. **Não há nada no build que detecte isso**, porque o cliente não importa o `protocol.ts` (ver 3.6).

#### 3.4 — Divergência de constantes econômicas

| Constante | Cliente | Servidor | Razão |
| :--- | ---: | ---: | ---: |
| Treino SCAVENGER_WORKER | 8,0 s (`main.ts:134`) | 5,0 s (100 ticks) | 1,6× |
| Treino RUST_RAIDER | 12,0 s | 6,0 s (120 ticks) | 2,0× |
| Treino SCRAP_BUGGY | 18,0 s | 10,0 s (200 ticks) | 1,8× |
| Custo de treino | tabela de 4 recursos, com reembolso no cancelamento | **inexistente** — `TRAIN` não cobra nada | — |
| População máxima | `POP_MAX = 20` (`main.ts:109`) | **inexistente** | — |
| Capacidade de carga | 10 | 10 | 1,0× ✅ |

O servidor **não modela economia de custo**: `Simulation.issueCommand('TRAIN')` valida dono e fila, mas não debita recurso nenhum. Toda a camada de custo/reembolso/pop-cap existe só no cliente. Isso é a maior peça faltante da 2.6 e não está no roadmap.

#### 3.5 — Divergência de modelo de simulação (não só de números)

**Coleta.** São dois modelos economicamente diferentes, não duas calibragens:

- **Cliente** (`unit.ts:392`, `unit.ts:449`): timer único de `GATHER_TIME_SECONDS = 3`, e ao final `takeFromNode(nodeId, 10)` — extração **atômica** de 10 unidades em 3 s.
- **Servidor** (`worker.ts:16-24`): `GATHER_YIELD = 1` a cada `GATHER_INTERVAL_TICKS = 10` (0,5 s), até `WORKER_CARRY_CAPACITY = 10` — extração **incremental**, 10 unidades em 5 s, com carga parcial observável.

Consequências: taxa de coleta difere 1,67×; e o modelo incremental do servidor permite estados (carga parcial, nó esgotando no meio da colheita) que o cliente não sabe representar. O teste `worker.test.ts` assert 5 cobre exatamente o caso "nó esgotado com carga vazia" — um estado que não existe no cliente.

**Locomoção.** As velocidades base foram espelhadas com cuidado e **batem** (worker 6.0, raider 7.5, buggy 8.0 nos dois lados). Mas:
- O **cliente** tem física: aceleração, inércia, `rotationSpeed` por tipo (tank 2,2 rad/s), tração só quando alinhado (`unit.ts:517-528`), e penalidade de 10 % com carga.
- O **servidor** move em linha reta a velocidade constante sobre o caminho do A* (0,3 m/tick a 6 m/s, conforme assert 4 de `simulation.test.ts`).

Sob autoridade do servidor, ou a física de inércia migra para a simulação, ou ela vira pura cosmética de interpolação — e o "giro lento do blindado", calibrado e comemorado como gate da Fase 1.5, deixa de ter efeito tático. **Essa é uma decisão de design, não um bug**, e precisa ser tomada explicitamente antes de escrever código da 2.6.

#### 3.6 — Não existe módulo compartilhado

`server/src/protocol.ts` é descrito como "tipos de protocolo compartilhados", mas:
- `client/tsconfig.json` tem `"include": ["src"]` — o cliente não consegue nem enxergar o diretório do servidor.
- Nenhum arquivo do cliente importa nada do servidor.
- As 8 coordenadas de veio estão **duplicadas manualmente** em `main.ts:305-314` e `resources.ts:49-58`. Hoje batem (verificado, G10). Nada além de disciplina humana garante que continuem batendo.
- `resources.ts:31-36` declara `INITIAL_SPAWNS` com o comentário *"Spawns/buildings iniciais do cliente (client/src/main.ts)"* — um acoplamento documentado em prosa, não em tipo.

**Recomendação estrutural**: criar workspace `shared/` (`@project-exodus/shared`) contendo tipos de protocolo, enum de unidades/construções, tabela de custos, constantes de economia e o layout de nós. Cliente e servidor passam a importar. Isso transforma toda a classe de divergências acima em **erro de compilação**, que é onde ela deveria ter sido pega.

**Reestimativa**: a 2.6 como está descrita é meia sessão. A 2.6 real — `shared/`, paridade de unidades, custos no servidor, reconciliação do modelo de coleta, decisão de física, snapshot broadcast, cliente WS, interpolação — é **uma fase**, com spec própria (mandatória pelo `AGENTS.md` §2.B, hoje inexistente).

---

### ALTO-04 — `MANIFEST.md` e `ATTRIBUTION.md` contradizem o disco

**Evidência**

`client/public/assets/MANIFEST.md:79-81`
> ### 2.5 `music/` e `video/` — Piloto Lote 3
> Nenhum arquivo gerado. Modelos `lyria-002` e `veo-3.1-generate-preview` retornaram **404** na API `v1beta`...

`client/public/assets/ATTRIBUTION.md:28`
> **Música / vídeo**: Lote 3 não gerado porque `lyria-002` e `veo-3.1-generate-preview` retornaram 404...

No disco:
```
$ ls -la client/public/assets/music/
ambient-bunker-drone-loop.mp3     1.511.982 B   Sep 10 03:31
ambient-wasteland-wind-loop.mp3   1.471.857 B   Sep 10 03:31
combat-percussion-stinger.mp3     1.409.791 B   Sep 10 03:31

$ cat ambient-wasteland-wind-loop.mp3.meta.json
{ "model": "lyria-3.5", "date": "2026-09-10T06:31:05.042Z", ... }
```

Os arquivos existem, são MP3 válidos (`MPEG ADTS layer III, 192 kbps, 44.1 kHz, JntStereo`), foram gerados por `lyria-3.5` e estão publicados em produção. O `estate.md` registra corretamente o "Lote 2b" como entregue — são os manifestos que ficaram para trás.

**Contadores também divergem**

| Métrica | MANIFEST.md | Disco (medido) | Δ |
| :--- | ---: | ---: | ---: |
| Arquivos publicados | 75 | 78 | +3 |
| Peso total | 18.898.420 B (18,02 MB) | 23.292.050 B (22,21 MB) | +4,19 MB |
| Pasta `music/` | "nenhum arquivo" | 3 arquivos, 4,19 MB | — |

**Impacto**
O `MANIFEST.md` é o gate declarado da Fase 1.7 (*"Manifesto com inventário, pesos e licenças/origem"*). Um manifesto que nega a existência de assets publicados não cumpre a função de licenciamento/proveniência — que é justamente o que o `ATTRIBUTION.md` existe para garantir. Como o projeto é `UNLICENSED` e privado, não há exposição jurídica hoje; mas o mecanismo de rastreabilidade está quebrado.

**Remediação**: regenerar as seções 1, 2.5 e o total do `MANIFEST.md` a partir de leitura de disco, e corrigir o parágrafo de música do `ATTRIBUTION.md` com o modelo real (`lyria-3.5`), data e prompts (que estão preservados nos sidecars `.meta.json` — a disciplina de sidecar funcionou e salvou a proveniência).

---

### ALTO-05 — 4,19 MB de música em produção, nunca tocada, e o "stinger" tem 58 segundos

**Evidência**

`client/src/engine/audio.ts` declara o barramento de música — e nunca o usa:
```ts
type AudioBus = 'sfx' | 'voice' | 'music';                                  // l.1
private static buses: Record<AudioBus, GainNode|null> = { ..., music: null };// l.13
private static busVolumes: Record<AudioBus, number> = { ..., music: 0.45 }; // l.14
```
A classe expõe `playSelect`, `playCommand`, `playEffect`, `playBriefing`, `unlock`, `debugState`. **Não existe `playMusic`.** O `GainNode` do bus `music` é criado em `setupBuses()` e permanece órfão pelo tempo de vida da aplicação. Nenhuma string `/assets/music/` aparece em `client/src`.

Resultado: os 3 MP3 são copiados para `client/dist/assets/music/` a cada build, servidos ao navegador do usuário e nunca decodificados. São **19 % do payload de assets** em peso morto.

**Achado adicional — descasamento de conteúdo**

| Arquivo | Duração pedida no prompt | Duração real |
| :--- | ---: | ---: |
| `ambient-wasteland-wind-loop.mp3` | 60 s | 61,07 s ✅ |
| `ambient-bunker-drone-loop.mp3` | 60 s | 62,75 s ✅ |
| `combat-percussion-stinger.mp3` | **10 s** | **58,49 s** ❌ |

O Lyria devolveu ~60 s para os três, ignorando o pedido de 10 s. Um "stinger de combate" de 58 segundos **não é um stinger** — é uma faixa. Ligá-lo como stinger produziria sobreposição contínua em combate. Precisa ser cortado (ffmpeg já está disponível: `ffmpeg-static` é devDependency do `studio-gemini`) ou re-gerado.

**Achado adicional — desbalanço de bitrate**

| Categoria | Codificação | Peso |
| :--- | :--- | ---: |
| SFX / vozes (16 arquivos) | MP3 64 kbps **mono** 22,05 kHz | 780 KB total |
| Música (3 arquivos) | MP3 **192 kbps stereo** 44,1 kHz | 4.190 KB total |

Três faixas de música pesam **5,4× mais** que todas as 16 vozes somadas. Para ambiente em loop num RTS web, 96 kbps mono (ou 128 kbps stereo) é largamente suficiente e cortaria ~2,5 MB. Isso deve ser decidido junto com a mixagem, não depois.

**Remediação sugerida (fecha a 1.7E de áudio de verdade)**
1. Cortar `combat-percussion-stinger.mp3` para 8–10 s via ffmpeg, ou re-gerar.
2. Re-encodar as 3 faixas para 96 kbps mono; atualizar sidecars e MANIFEST.
3. Implementar em `audio.ts`:
   - `playMusic(track, { loop, fadeIn })` usando o bus `music` já existente;
   - `crossfadeTo(track, seconds)` com rampa no `GainNode` (a infra de rampa já existe em `playOscillator`);
   - `stopMusic(fadeOut)`.
4. Fiação de gatilhos: menu principal → `ambient-wasteland-wind-loop`; início de partida → mesma faixa; proximidade de combate → `combat-percussion-stinger` (após corte). O `ambient-bunker-drone-loop` não tem contexto de gameplay ainda (interior/bunker não existe) — **registrar como reserva de Fase 4, não forçar uso**.
5. Respeitar a diretiva do `handoff.md` §5: *"Áudio e vídeo lazy-load; nunca no boot"*. `loadClip()` já é sob demanda com cache — manter.

---

### ALTO-04b — `estate.md` §4 estava duas fases atrasado

Achado durante a própria redação desta auditoria, ao tentar usar o `estate.md` como fonte de inventário.

A seção "4. Assets e Recursos" do `estate.md` descrevia o disco **anterior à Sub-fase 1.10.3** (normalização kebab-case) e **anterior ao Lote 1 da 1.7E**. Especificamente:

| Problema | Detalhe |
| :--- | :--- |
| Nomenclatura obsoleta | Listava `Soldier.glb`, `Building1_Large.glb`, `Turret_GunDouble.glb`, `terrain_diffuse.jpg`, `era_1_lore.json` — todos renomeados para kebab-case na S10 e **inexistentes** com esses nomes |
| Arquivos arquivados listados como ativos | `Tank.glb`, `Combat_Rover.glb` e `Mech_Mike.glb` apareciam na tabela de `public/assets/models/`; foram movidos para `docs/archived-assets/` na Sub-fase 1.10.2 |
| Linhas duplicadas | `Building1_Large.glb`, `Building2_Large.glb` e `Building4.glb` apareciam **duas vezes** cada, com dados diferentes |
| Retratos desatualizados | Descrevia apenas os 4 JPG de ~880 KB "gerados via IA"; o Lote 1 entregou 17 WebP + 12 thumbs, e os JPG viraram apenas `fallback` |
| Música e ícones ausentes | Nenhuma menção às pastas `music/` (4,19 MB) e `icons/` |

**Por que isso importa mais do que parece**: o `AGENTS.md` §2.A define o `estate.md` como *"o estado do projeto no momento presente"*. Um agente que retomasse o trabalho lendo essa seção tentaria carregar `Tank.glb` e quebraria o boot. A Sub-fase 1.10.3 atualizou o **código** (7 arquivos) e o **disco** (19 renames), mas não o documento que descreve ambos.

**Remediação**: executada nesta sessão. A §4 do `estate.md` foi reconstruída inteiramente por leitura de disco, agora com 7 subseções (modelos, texturas, retratos, áudio, música, ícones/lore, masters), tamanhos medidos, chaves de `models.ts` e marcação explícita de **em uso × reserva de Fase N** (o que também resolve MED-08.3 na parte de retratos).

**Achado incidental**: existem 3 arquivos `.ogg` residuais em `assets/audio/` (`unit-move-raider.ogg`, `unit-move-scavenger.ogg`, `unit-select-buggy.ogg`) que **não são referenciados** — `audio.ts:resolveVoiceLine` monta a URL sempre com extensão `.mp3`. Sobras de um teste de formato. Peso irrelevante; devem sair do disco e do MANIFEST.

**Achado incidental 2**: os 4 JPG legados de retrato pesam 3,4 MB — **90 % da pasta `portraits/`** — e existem apenas como `fallback` de `<img>` para WebP de ~20 KB. Assim que o WebP for considerado estável em todos os alvos, removê-los corta 3,4 MB (15 % do payload total de assets).

---

### MED-06 — Superfície de debug e de trapaça exposta no bundle de produção

`client/src/main.ts:1028` exporta `window.__rts` incondicionalmente — inclusive no build de produção. O objeto expõe `scene`, `cameraController`, `selectionManager`, `fogOfWar`, `audio`, e dois métodos que **alteram estado de jogo**:

```ts
debugAddResources: (amounts) => { ... resources[key] += amounts[key]; refreshTopbar(); }
debugSetNodeAmount: (id, amount) => { ... }
```

Hoje o jogo é single-player local, então o risco prático é nulo. Mas na Fase 3 (multiplayer LAN/Tailscale) isso vira um vetor trivial de trapaça se qualquer lógica permanecer client-side, e um canal de dessincronização mesmo com servidor autoritativo.

**Remediação**: envolver o bloco em `if (import.meta.env.DEV || import.meta.env.VITE_HARNESS === '1')`. O harness passa a rodar contra um build com a flag (o `dist-proof.mjs` depende de `__rts`, então precisa da variante instrumentada). Registrar a decisão no spec de build.

---

### MED-07 — `tsconfig.base.json` é documento morto; os três workspaces divergem em rigor

`tsconfig.base.json` existe na raiz e **nenhum workspace o estende** (`grep -L extends` nos três tsconfigs: nenhum tem `extends`). Consequências:

| Opção | base | client | server | studio |
| :--- | :--- | :--- | :--- | :--- |
| `strict` | ✅ | ✅ | ✅ | ✅ |
| `noUnusedLocals` | — | ✅ | ❌ | ❌ |
| `noUnusedParameters` | — | ✅ | ❌ | ❌ |
| `noFallthroughCasesInSwitch` | — | ✅ | ❌ | ❌ |
| `declaration` / `composite` | ✅ | ❌ | ❌ | ❌ |
| `module` | NodeNext | ESNext | NodeNext | (herda base? não) |

O cliente é o mais rigoroso; o servidor — que é o código **determinístico e autoritativo**, onde variável não usada é sintoma de lógica incompleta — é o menos rigoroso. Está invertido.

Além disso, `declaration`/`composite`/`declarationMap` do base não são usados por ninguém: se um workspace `shared/` for criado (ALTO-03), essas opções passam a ser necessárias e o base finalmente ganha propósito.

**Remediação**: fazer os três `extends: "../tsconfig.base.json"`, subir `noUnusedLocals` + `noUnusedParameters` + `noFallthroughCasesInSwitch` para o base, e manter no local só o que é específico (bundler/noEmit no client, outDir/rootDir no server).

---

### MED-08 — Higiene de build e de artefatos

**8.1 — `tools/studio-gemini/dist/` tem duas árvores de build sobrepostas**
```
dist/client.js              Sep 10 01:24   ← build antigo (rootDir = src/)
dist/generators/            Sep 10 01:24   ← build antigo
dist/index.js               Sep 10 01:24   ← build antigo
dist/src/client.js          Sep 10 12:09   ← build atual (rootDir = pacote)
dist/src/generators/        Sep 10 12:09   ← build atual
```
O `rootDir` efetivo mudou entre builds (provavelmente ao incluir `tests/` no `include`) e o build antigo nunca foi limpo. `npm start`/`node dist/index.js` executa o **código de 01:24**, não o atual. O script `test:build` do `package.json` aponta para `dist/tests/gemini_connectivity.test.js` — que só existe na árvore antiga.
**Remediação**: `rm -rf tools/studio-gemini/dist && npm run build --workspace=tools/studio-gemini`, e adicionar `"prebuild": "rm -rf dist"` ao pacote.

**8.2 — `server/tests/` fora do typecheck**
`server/tsconfig.json` tem `"include": ["src/**/*"]`. O arquivo `server/tests/server_smoke.test.ts` está **fora** desse escopo: roda via `ts-node` no `npm test`, mas `npx tsc --noEmit` nunca o valida. Um erro de tipo ali só aparece em runtime. (Os outros 5 testes estão em `src/__tests__/` e são cobertos.)
**Remediação**: mover para `src/__tests__/smoke.test.ts` (consistente com os demais) ou incluir `tests/**/*` no tsconfig.

**8.3 — Assets órfãos**
- `client/public/assets/icons/*.svg` (4 arquivos): **não referenciados**. `client/src/ui/icons.ts` inlina os SVGs como strings — os arquivos em disco são duplicata morta. Peso irrisório (1,2 KB), mas confundem o inventário e o MANIFEST os conta como entregáveis do Lote 1.
- Retratos gerados e não usados: `hero-orden-warden`, `hero-scrapper-marshal`, `hero-silicio-prophet`, `pilot-hero-scrapper-marshal`, `era-2-settler`, `era-3-engineer`, `era-4-cyber-adept` (+ thumbs). São claramente reserva para as Fases 4 (eras) e 5 (facções/heróis) — **decisão correta**, mas não está documentada como reserva em lugar nenhum. Um auditor futuro os classificaria como órfãos e os apagaria.
**Remediação**: marcar no MANIFEST uma coluna "Status: em uso / reserva Fase N"; remover os 4 SVG ou passar a usá-los via `<img>` (a segunda opção reduz o tamanho do bundle JS).

**8.4 — 31 MB de masters**
`tools/studio-gemini/masters/` guarda os originais (PCM não comprimido do TTS, JPG dos retratos, MP3 da música) — 31 MB, maior que o resto do projeto somado. Isso é **boa prática** (permite re-encodar sem re-gastar API), mas precisa de decisão explícita ao entrar no Git: versionar (repositório fica pesado desde o commit 1) ou isolar via `.gitignore` + backup externo. Recomendo **versionar**: 31 MB é aceitável e a reprodutibilidade da geração por LLM é nula.

**8.5 — Processos órfãos de longa duração**
```
PID 97994  vite (dev, :5173)      rodando há 1 dia e 10 horas
PID 92630  vite preview (:4173)   rodando há 15 horas
```
Ambos servem o projeto. O de 5173 sobreviveu a múltiplas sessões de agente. Risco: um `vite dev` antigo pode servir um grafo de módulos em cache que não reflete o disco — exatamente a classe de bug da Sessão 6. **Não foram encerrados nesta auditoria** (decisão do usuário). Recomenda-se derrubá-los e padronizar o start/stop dos servidores num script do harness.

---

### MED-09 — Dívida de SDD: a metodologia mandatória não está sendo cumprida

`AGENTS.md` §2.B é inequívoco: *"Antes de codificar qualquer subsistema, crie ou atualize o documento de especificação correspondente em `docs/specs/`."*

Estado real:
```
docs/specs/00-governance-and-architecture.md    124 linhas
docs/specs/01-isometric-viewport-and-selection.md 82 linhas
                                          total: 206 linhas
```
Duas specs para ~16 módulos de produção. **Sem spec**: fog of war, props procedurais, mineração/depleção, áudio, HUD, protocolo de rede, simulação autoritativa, A*/grid, pipeline de assets, modelo econômico.

Isso não é acidente de pressa — é o padrão desde a Fase 1.5. As Fases 1.5→1.10 foram executadas em modo reativo (playtest furioso → correção), o que é legítimo e produziu resultado, mas rompeu o contrato de SDD sem que isso fosse registrado como decisão.

**Duas saídas honestas, e a escolha é sua:**
- **(a)** Retomar o SDD de verdade a partir da 2.6 — que é justamente onde o custo de errar é mais alto (protocolo, autoridade, determinismo). Escrever `docs/specs/02-integracao-cliente-servidor.md` **antes** de qualquer linha de código.
- **(b)** Emendar o `AGENTS.md` para refletir a prática real ("spec obrigatória para subsistemas de rede, protocolo e simulação; opcional para camada visual"), e parar de carregar uma dívida declarada que não se pretende pagar.

Manter o texto atual sem cumpri-lo é o pior dos três caminhos: corrói a autoridade do documento de governança inteiro.

**Nesta sessão adotei a saída (a)** e criei o esqueleto de `docs/specs/02-integracao-cliente-servidor.md` — ver §5.

---

### BAIXO-10 — Achados de higiene

| # | Achado | Evidência | Ação |
| :-- | :--- | :--- | :--- |
| 10.1 | `Math.random()` no spawn de treino afeta estado de jogo | `main.ts:207` — offset de rally ±1,5 m | Migrar para o PRNG seedado (`rng.ts` do servidor já existe) na 2.6; hoje é cosmético |
| 10.2 | `Math.random()` em FX e fumaça (12 ocorrências) | `particles.ts`, `building.ts` | **Aceitável** — puramente visual, não entra em snapshot |
| 10.3 | `client` sem teste unitário | `client/package.json`: `"test": "node --version"` | Adicionar vitest para lógica pura: `terrainHeight`, grade do fog, tabela de custos, `resolveVoiceLine` |
| 10.4 | `tools/visual-check` invisível ao monorepo | não é workspace; `"type":"commonjs"` | Promover a workspace ou documentar explicitamente por que está fora |
| 10.5 | Ordem `gather` chama `setPendingOrder('gather')` duas vezes | `main.ts:233` e `main.ts:235` | Remover a duplicata (idempotente hoje, ruído amanhã) |
| 10.6 | `playEffect('gather'\|'deposit')` cai sempre no oscilador | `audio.ts:resolveEffect` retorna `null` para ambos | Gerar os 2 SFX no próximo lote, ou remover o `TODO 1.7E` de `unit.ts:394` e assumir o oscilador como definitivo |
| 10.7 | `video-omni-pilot.ts` fora do `package.json` | não há script `generate:video-omni` | Registrar o script ou mover o arquivo para `docs/` como experimento |

---

### Nota técnica — Lote 3 (vídeo): o diagnóstico do handoff está incompleto

O `handoff.md` §3.1 define a pendência como *"Corrigir download no `video-omni-pilot.ts` para usar `?key=` ou `Authorization: Bearer`"*. A auditoria do SDK mostra que o problema provavelmente **não é o download**:

```
$ grep -c "interactions" node_modules/@google/genai/dist/genai.d.ts
56
$ grep -n "output_video" node_modules/@google/genai/dist/genai.d.ts
8268:    output_video?: VideoContent | undefined;
```

A API `interactions` **existe** no `@google/genai` 2.21.0, e `output_video` também — então a abordagem é plausível, ao contrário do que os 404 de `lyria-002`/`veo-3.1` sugeriam. Porém:

1. `video-omni-pilot.ts:32` faz `await (ai as any).interactions.create(...)` — o cast `as any` indica que o **client instanciado não expõe** esse caminho no tipo. O SDK tem duas superfícies (`GeminiNextGenInteractions` e `Interactions_2`, ambas visíveis no `.d.ts`), e `new GoogleGenAI({apiKey})` provavelmente não é a que expõe `interactions`. O `as any` mascarou isso e transformou um erro de compilação em falha de runtime.
2. O payload `response_format: { type: 'video', delivery: 'uri' }` não foi validado contra o tipo `ResponseFormat_2` do SDK.
3. O script nunca completou uma execução bem-sucedida, então **nenhuma linha após a chamada** (incluindo o download) foi jamais exercitada. Não há evidência de que o download seja o ponto de falha.

**Recomendação**: antes de mexer no download, remover o `as any` e deixar o `tsc` mostrar qual é o client correto e qual é o shape real de `response_format`. É trabalho de 20 min que pode economizar horas de tentativa e erro contra a API.

---

## 4. Matriz de Remediação Priorizada

| ID | Achado | Sev. | Esforço | Desbloqueia | Ordem |
| :-- | :--- | :--- | ---: | :--- | ---: |
| CRIT-01 | `git init` + baseline + tag | 🔴 | 15 min | tudo (revisão, rollback, bisect) | **1** |
| CRIT-02 | Build stamp via `define` do Vite + gate negativo | 🔴 | 15 min | confiança no ciclo de build | **2** |
| ALTO-04 | Reconciliar MANIFEST + ATTRIBUTION com o disco | 🟠 | 30 min | gate da Fase 1.7 | **3** |
| ALTO-04b | ~~Reconstruir `estate.md` §4 a partir do disco~~ | 🟠 | — | inventário confiável | ✅ **feito na S12** |
| ALTO-05 | Cortar stinger, re-encodar, `playMusic` + fiação | 🟠 | 2–3 h | fecha 1.7E (áudio) | **4** |
| MED-08.1 | Limpar `studio-gemini/dist` duplicado | 🟡 | 5 min | Lote 3 | 5 |
| — | Lote 3: remover `as any`, validar contrato do SDK | 🟡 | 1–2 h | fecha 1.7E (vídeo) | 6 |
| MED-09 | Spec `02-integracao-cliente-servidor.md` | 🟡 | 2–3 h | **Fase 2.6 inteira** | **7** |
| ALTO-03 | Workspace `shared/` + reconciliação | 🟠 | fase | Fases 2.6 e 3 | 8 |
| MED-07 | Unificar tsconfigs sob o base | 🟡 | 30 min | qualidade do server | 9 |
| MED-06 | `__rts` sob flag de ambiente | 🟡 | 30 min | Fase 3 | 10 |
| MED-08.2–8.5 | Higiene (tests no tsc, órfãos, masters, processos) | 🟡 | 1 h | inventário confiável | 11 |
| BAIXO-10.3 | Vitest para lógica pura do client | ⚪ | 2 h | velocidade de regressão | 12 |

**Caminho crítico até a Fase 2.6**: 1 → 2 → 7 → 8. Os itens 3–6 fecham a Fase 1.7 e podem correr em paralelo ou ser adiados conscientemente.

---

## 5. Decisões Tomadas Nesta Sessão

| # | Decisão | Justificativa |
| :-- | :--- | :--- |
| D-12.1 | Adotar a saída (a) do MED-09: retomar SDD a partir da 2.6 | O custo de errar em protocolo/autoridade/determinismo é o mais alto do projeto |
| D-12.2 | Reclassificar a Sub-fase 2.6 como fase própria (**Fase 2.6 Expandida**) | Cinco eixos de divergência + camada de rede que o roadmap alocou na Fase 3 |
| D-12.3 | Introduzir **Fase 1.11 — Remediação e Hardening** no roadmap | Os achados CRIT/ALTO precisam de gates próprios, não de execução informal |
| D-12.4 | Não encerrar os processos Vite órfãos | Decisão do usuário; podem estar em uso para playtest |
| D-12.5 | Rebaixar a alegação "60 FPS estáveis" para "não medido" no `estate.md` | Não verificável sob swiftshader; honestidade técnica > marketing interno |
| D-12.6 | `ambient-bunker-drone-loop.mp3` fica como reserva de Fase 4 | Não existe contexto de interior/bunker no gameplay atual; forçar uso seria slop |

---

## 6. O Que Está Comprovadamente Sólido

Registro explícito, para que a auditoria não seja lida como veredito negativo:

- **A disciplina de teste é real.** `test-buttons.mjs` dispara eventos de mouse verdadeiros em coordenadas de tela e verifica estado de jogo; `gather-e2e.mjs` roda o ciclo completo sem teleporte. Isso é raro e é o motivo de os gates serem confiáveis.
- **O servidor é genuinamente determinístico.** `simulation.test.ts` assert 8 prova que mesma seed + mesmos comandos = snapshots idênticos; `worker.test.ts` assert 6 prova pureza de `stepWorkers`. Essa é a fundação correta para multiplayer.
- **A proveniência dos assets sobreviveu.** Mesmo com o MANIFEST desatualizado, os sidecars `.meta.json` preservaram prompt, modelo, data e bytes de cada asset gerado. A reconciliação de ALTO-04 é mecânica justamente por causa disso.
- **A normalização kebab-case (Sessão 10) foi feita corretamente.** 19 assets renomeados, 7 arquivos de código atualizados, zero referência quebrada — verificado por cruzamento de `grep` de todas as strings `/assets/**` contra o disco.
- **Nenhum segredo vazou.** A `GEMINI_API_KEY` não aparece em código, bundle, docs, manifesto ou sidecar. O padrão de carregamento via `dotenv` com fallback de caminhos está consistente nos três geradores.
- **A retratação da doutrina falsa (Sessão 10.4) é exemplar.** Corrigir o `docs/knowledge/` depois de descobrir que o "Hips fix" era o bug — em vez de apagar o rastro — é exatamente o comportamento que torna a base de conhecimento confiável.

---

## 7. Artefatos Produzidos Nesta Sessão

| Arquivo | Ação |
| :--- | :--- |
| `docs/journal/2026-09-10_12-30_sessao-12-auditoria-holistica.md` | **criado** (este documento) |
| `docs/specs/02-integracao-cliente-servidor.md` | **criado** (esqueleto de spec da Fase 2.6 Expandida) |
| `estate.md` | atualizado — cabeçalho, §1 (parágrafo S12), §2 (status por subsistema), **§4 reconstruída do disco (ALTO-04b)**, §5 (dívidas reindexadas com IDs), §6/§7/§8 (novas) |
| `handoff.md` | atualizado — turno da Sessão 12 |
| `roadmap.md` | atualizado — Fase 1.11 criada; Fase 2.6 reclassificada |

Nenhum arquivo de código-fonte foi alterado nesta sessão. A auditoria é read-only por desenho: diagnóstico e remediação separados, para que a remediação possa ser revisada como um bloco coeso.

---

*Registro assinado por:*
- **Harness/Agente**: Claude Code CLI
- **Modelo LLM**: Claude Opus 5 (1M context)
- **Timestamp**: 2026-09-10T12:30:00-03:00
