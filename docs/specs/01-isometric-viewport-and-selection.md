# Spec 01 — Motor Gráfico Three.js, Câmera Isométrica PBR & Sistema de Seleção RTS

> **Status**: Em Implementação  
> **Autor**: Rabelus Lab & Antigravity  
> **Data**: 2026-09-09T02:22:00-03:00  

---

## 1. Visão Geral
Esta especificação define a arquitetura gráfica 3D no cliente Three.js, os controles táteis de navegação por câmera tática RTS (estilo *Age of Empires II*), a iluminação PBR com sombras dinâmicas de alta fidelidade e o sistema de seleção de unidades por clique único e seleção em área arrastável (box selection).

---

## 2. Arquitetura da Câmera Tática Isométrica

### 2.1 Projeção e Orientação
- **Tipo**: `THREE.OrthographicCamera` para preservar a proporção geométrica e perspectiva clássica isométrica de RTS (sem distorção de escala em profundidade).
- **Ângulo Padrão**: Pitch de $35.264^\circ$ ($\arctan(1/\sqrt{2})$) e Yaw inicial de $45^\circ$, proporcionando a vista isométrica clássica.
- **Pivô da Câmera**: Um vetor `target` $(x, y, z)$ no plano do solo para onde a câmera aponta. A posição física da câmera é calculada através de um offset vetorial em relação a este alvo.

### 2.2 Controles e Interações de Câmera
- **Edge Panning (Movimento por bordas)**: Quando o ponteiro do mouse se aproxima a menos de 25px das bordas da janela, o `target` da câmera se desloca na direção correspondente.
- **Teclado (WASD / Setas)**: Deslocamento suave com aceleração e amortecimento (damping linear).
- **Zoom Suave (Scroll da Roda do Mouse)**: Modifica o `frustumSize` entre um mínimo (zoom in tático próximo) e um máximo (zoom out panorâmico), com interpolação suave via `lerp`.
- **Rotação Isométrica (Teclas Q e E)**: Rotação em incrementos de $45^\circ$ ou $90^\circ$ ao redor do eixo vertical (Y) preservando a elevação isométrica.
- **Limites de Mapa (Bounds Clamping)**: O `target` da câmera é estritamente limitado às dimensões do mapa (ex: $-60 \le x \le 60$, $-60 \le z \le 60$).

---

## 3. Pipeline de Renderização PBR & Iluminação

### 3.1 Configuração do Renderizador
- `toneMapping = THREE.ACESFilmicToneMapping` para reprodução tonal realista de luzes intensas e sombras profundas.
- `toneMappingExposure = 1.15`.
- `shadowMap.enabled = true`, `shadowMap.type = THREE.PCFSoftShadowMap` com bias otimizado para eliminar artefatos de "shadow acne".

### 3.2 Esquema de Iluminação Atmosférica Pós-Apocalíptica
1. **Luz Direcional Primária (Sol Árido/Poeirento)**:
   - Cor: `#ffe8d6`, Intensidade: 2.8.
   - Posição elevada com projeção ortográfica de sombras (`shadow.mapSize = 2048x2048`).
2. **Luz Ambiente Difusa (Céu Desolado)**:
   - Cor: `#384556`, Intensidade: 1.0.
3. **Luz de Rebatimento do Solo (Óxido e Ferrugem)**:
   - Direcional secundária de preenchimento (`#92400e`, Intensidade: 0.5) simulando luz rebatida de terra ferrosa e carcaças de aço.

---

## 4. Terreno & Escombros PBR

- **Superfície do Solo**: Terreno com variação procedural de relevo e shaders/materiais PBR com mapas de rugosidade (`roughnessMap`) e relevo (`bumpMap`) gerados com ruído Perlin/Simplex procedural de alta frequência.
- **Estruturas de Ruína & Bunkers**: Malhas 3D modulares com materiais metálicos desgastados (`MeshStandardMaterial` com `metalness = 0.75`, `roughness = 0.45` e detalhes emissivos).

---

## 5. Sistema de Seleção RTS (Picking & Marquee)

### 5.1 Seleção Única (Single Click Raycasting)
- Ao clicar com o botão esquerdo (MouseButton 0) sem arrastar, um `THREE.Raycaster` calcula a interseção do raio da câmera com a camada de entidades selecionáveis.
- Se uma entidade for interceptada, ela é ativada como selecionada. Se o raio colidir com o solo, a seleção anterior é limpa.

### 5.2 Seleção em Área (Frustum Marquee Box Selection)
- Ao pressionar e arrastar com o botão esquerdo do mouse:
  1. A div `#selection-marquee` exibe a caixa de seleção com borda verde militar semi-transparente.
  2. Ao soltar o mouse (pointerup), as coordenadas de tela da caixa são projetadas no espaço normalizado do viewport Three.js.
  3. Todas as entidades cujas posições projetadas em tela residam dentro da caixa delimitadora são selecionadas simultaneamente.
  4. Prioridade: Se houver unidades militares/trabalhadores na caixa, apenas unidades são selecionadas (evitando selecionar estruturas fixas por engano, como em AoE2).

### 5.3 Indicador Visual de Seleção (3D Selection Ring)
- Cada entidade possui um anel circular no chão (`THREE.RingGeometry`) com material emissivo brilhante (`#00d2d3` para aliados / `#e58e26` para trabalhadores).
- O anel é ativado e pulsa suavemente quando a entidade está no conjunto selecionado.

### 5.4 Sincronização em Tempo Real com o HUD
- O painel `#hud-selection-panel` exibe:
  - Nome da unidade e facção.
  - Barra de integridade / vida (HP).
  - Ações contextuais no `#hud-commands-panel` (Mover, Parar, Atacar, Construir).

---
*Registro assinado por:*
- **Harness/Agente**: Antigravity IDE
- **Modelo LLM**: Gemini 3.8 Flash
- **Timestamp**: 2026-09-09T02:22:00-03:00
