# Diário de Bordo — 2026-09-09 16:55 — Sessão 8 (RECAP: de onde viemos, onde estamos, para onde vamos)

> **Ciclo**: Sessão 8 — recap profundo + auditoria dev/prod + sanitização, por diretiva expressa do usuário
> **Status**: Fase 1.10 fechada; repo normalizado e verificado 🟢
> **Lema da sessão**: *Organização é lindo. Antes, durante e depois, sempre.*

---

## 1. De onde viemos (o dia em 5 atos)

- **Sessão 2 (Antigravity)**: 9h de integração GLTF sem governança; deixou o "Hips fix" (falso), `+PI` global (meio-certo), tank errado e `dist/` apodrecendo.
- **Sessão 3 (eu, 20min)**: apliquei o handoff ao pé da letra — incluindo o Hips fix generalizado. **Erro meu**: executei sem medir; aprofundei um bug alheio achando que era correção.
- **Sessão 4**: harness visual nasceu; sweep de escala; buildings encolhidos por palpite (usuário: direção errada); Rover quebrou silenciosamente (Draco).
- **Sessão 5**: deleguei A1/A2/A3 — entregas boas, mas HUD ficou estrutural (stubs) e eu declarei vitória cedo demais.
- **Sessões 6–7**: playtests furiosos; cada um revelou causa raiz real (dist velho, Hips fix, facing por tipo, botões sem teste, coleta inexistente, brutalismo).

## 2. Falhas e erros (nominais, sem maquiagem)

1. **Hips fix (S2, agravado por mim em S3)**: subtrair altura do quadril enterrou o Soldier 1.47m. Pior: virou "doutrina" no knowledge 3.1. Retratado e revertido em S4/S8.
2. **`+PI` global (S2/S3)**: certo só para o Soldier; punha o Gama de costas. Corrigido com facing medido (S4).
3. **Encolher buildings por palpite (S4)**: usuário queria imponentes. Lição: direção estética é do usuário, não do agente.
4. **Rover sem checar Draco (S4)**: unidade invisível entregue como "teste". Lição: todo swap de asset exige boot com contagem de loads (hoje automatizável: LOADED_COUNT).
5. **Declarar HUD pronto sem clicar (S5/S6)**: screenshots não provam função. Corrigido com `test-buttons.mjs` (cliques reais) e `gather-e2e.mjs`.
6. **Dist velho servido ao usuário 2× (S6 e quase S7)**: processo agora exige rebuild+prova+stamp a cada turno de client/.
7. **Falhas operacionais minhas (S7/S8)**: workdir errado em preview/scripts, heredoc em path errado, timeline mal inferida na coleta. Checklist registrado no handoff.

## 3. Acertos (o que funcionou e fica)

1. **Harness visual**: de gambiarra a infraestrutura (check, test-buttons, gather-e2e, dist-proof, measure-facing, mobile probe). Toda afirmação visual agora é verificável.
2. **Medição antes da afirmação**: sweep de escala, facing por matrizes, Box3 de grounding — os 3 bugs "misteriosos" caíram para números.
3. **Orquestração A1/A2/A3**: escopos exclusivos, zero conflito, verificação independente — padrão a repetir.
4. **Determinismo no server**: RNG seedável, testes que pegaram bug real (carga evaporada).
5. **Transparência com o usuário**: admitir "fui eu", registrar assunções (cano=frente), build stamp como fonte de verdade compartilhada.

## 4. Auditoria dev/prod (Sessão 8) — achados e destinos

| Achado | Classe | Destino |
| :--- | :--- | :--- |
| `Tank.glb` (prop 60KB) | órfão | `docs/archived-assets/` + README |
| `Combat_Rover.glb` (Draco) | bloqueado | arquivado (reativável com DRACOLoader) |
| `Mech_Mike.glb` (2.9MB, sem refs) | órfão pesado | arquivado |
| 19 assets fora do kebab-case | desconectado do padrão | renomeados + 7 arquivos de código atualizados |
| knowledge 3.1 (doutrina falsa) | **errado institucionalizado** | retratação escrita + doutrina correta |
| `server/dist` (04:01) e `studio-gemini/dist` parcial | builds apodrecidos | rebuildados |
| `MANIFEST.md` com nomes velhos | desconectado | adendo de rename |
| shot `12-*` inexistente (run falho) | gap de evidência | documentado, nomes preservados (provas são imutáveis) |
| `server/tests/` + `server/src/__tests__/` | duplicidade aparente | OK: ambos no `npm test`, documentado aqui |
| `audio.ts` stub, modelos loaded-não-instanciados | dívida conhecida | mantidos, seguem no roadmap (2.6/Fase 5) |
| Processos/portas | limpo | só `:5173` dev + sistema; previews mortos confirmados |

## 5. Onde estamos (substrato real)

Jogo jogável em dev e produção: 9 modelos kebab-case carregando, coleta e2e, HUD reskin, sim server testada (39 asserts), pipeline auditado, repo sem órfãos servidos, builds renovados, knowledge corrigido. Verificações desta sessão: tsc 0 ×2, 39 asserts, boot 9/9, dist-proof 9ent/8nós/0erros.

## 6. Para onde vamos (próximos passos ordenados)

1. Playtest do usuário (stamp como referência).
2. Sub-fase 2.6: servidor assume economia/ordens (integração cliente).
3. Lotes de ativos 1.7.2–1.7.4 (retratos/TTS/música/vídeo).
4. Fase 3 (rede/broadcast) → Fase 4 (eras) → Fase 5 (combate/fações).

---
*Registro assinado por:*
- **Harness/Agente**: opencode
- **Modelo LLM**: Muse Spark (muse-spark)
- **Timestamp**: 2026-09-09T16:55:00-03:00
