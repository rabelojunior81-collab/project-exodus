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

O `<video>` aponta para `assets/hero.mp4` — **presente desde a Sessão 13** (Lote 3 recuperado
da Files API do Gemini: 1280×720, 8 s, mudo na página). O pôster é `assets/hero-poster.jpg`.
Se o vídeo faltar, o palco cai de volta no crossfade Ken Burns dos shots WebP — sem quebrar.

## Otimização

Screenshots já convertidos para **WebP** (~10 MB → ~750 KB). O vídeo tem 2,07 MB (1920→1280
não necessário: fonte é 720p). Re-encode do MP4 para ~1 MB e do áudio da página (MP3 192 →
96 kbps) são candidatos da fase 1.11.4.

---

*Rabelus Lab · 2026*
