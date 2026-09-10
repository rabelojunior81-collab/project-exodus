# Ativos Arquivados (fora do jogo)

> Estes arquivos foram removidos de `client/public/assets/` na auditoria da Sessão 8 (recap) por serem órfãos, quebrados ou bloqueados — **não são referenciados por nenhum código** e não entram no build. Mantidos aqui por histórico/rastreabilidade, não apagar sem registrar no journal.

| Arquivo | Tamanho | Motivo do arquivamento | Data |
| :--- | :--- | :--- | :--- |
| `Tank.glb` | ~60 KB | Prop estático confundido com veículo; chave `'tank'` aponta para `combat-tank.glb` desde a Sessão 3 | 2026-09-09 |
| `Combat_Rover.glb` | ~29 KB | Compressão Draco sem `DRACOLoader` no projeto → falha silenciosa, unidade invisível (Sessão 4) | 2026-09-09 |
| `Mech_Mike.glb` | ~2.9 MB | Nunca referenciado em código; maior arquivo do repo sem uso | 2026-09-09 |
| `Mech_Stan.glb` | 470 B | **Deletado** (não arquivado): download truncado/corrompido, irrecuperável — Sessão 3 | 2026-09-09 |
| `ogg-orphans/unit-move-raider.ogg` (+ .meta) | ~12 KB | Formato OGG nunca referenciado — `audio.ts` monta URL sempre com `.mp3` (ALTO-04b) | 2026-09-10 |
| `ogg-orphans/unit-move-scavenger.ogg` (+ .meta) | ~11 KB | Idem | 2026-09-10 |
| `ogg-orphans/unit-select-buggy.ogg` (+ .meta) | ~12 KB | Idem | 2026-09-10 |

Reativação: mover de volta para `client/public/assets/models/` **em kebab-case** (ver regra de nomenclatura) e registrar a referência no `estate.md`. Para os OGG arquivados na Sessão 13, a reativação exigiria também mudar `resolveVoiceLine` em `audio.ts` — decisão da Fase 1.11.4.
