# Landing — Project Exodus

Página única de apresentação do jogo, no estilo editorial do `modernity-sandbox`:
vídeo de fundo fixo (com fallback Ken Burns), vidro, âmbar/ciano, tipografia militar
e players de áudio reais do jogo.

## Rodar localmente

O `file://` funciona para o básico, mas o fetch de checagem do vídeo e o `localStorage`
de idioma pedem HTTP:

```bash
python3 -m http.server 8080 --directory landing
# abra http://localhost:8080
```

## Estrutura

```
landing/
├── index.html      # página completa (CSS inline)
├── i18n.js         # dicionário PT-BR/EN + toggle persistente (?lang=en)
├── robots.txt      # indexável de propósito (SEO do projeto)
├── sitemap.xml
└── assets/
    ├── mark-exodus.svg / banner-exodus.svg
    ├── hero.mp4    # OPCIONAL — quando existir, o Ken Burns sai de cena sozinho
    ├── shots/      # screenshots do harness (curados)
    ├── portraits/  # retratos das eras e facções (WebP)
    ├── audio/      # briefings narrados era 1–4 (MP3)
    └── music/      # trilha ambiente (loop)
```

## Deploy

GitHub Pages via Actions (`.github/workflows/pages.yml`): publica a pasta `landing/`
como artefato a cada push em `main` que toque `landing/**`.

Se o domínio mudar (ex.: `exodus.rabelus.com`), atualize `CNAME` (criar na pasta),
`canonical`, `og:image` no `index.html` e as URLs do `sitemap.xml`.

## Vídeo do herói

O elemento `<video>` já existe e aponta para `assets/hero.mp4`. Enquanto o arquivo não
existir, o palco usa crossfade Ken Burns de três screenshots — sem custo e sem quebrar.
Quando o vídeo do Lote 3 for gerado (pipeline Gemini), basta colocá-lo aqui com pôster
`assets/shots/01-overview.png`.

## Otimização pendente

As imagens em `assets/shots/` são PNGs do harness (1–2,3 MB). Antes de divulgar a URL
publicamente, converter para WebP (~-70 %) com a ferramenta de assets do monorepo.
Screenshots leves (`07-mobile-game.png`, `fog-c-minimap.png`) já estão no pacote.

---

*Rabelus Lab · 2026*
