# Top 8 Creator

Generador local de gráficos Top 8 (1920×1080) con artes remotos de Tournament Stream Helper ([StreamHelperAssets](https://github.com/joaorb64/StreamHelperAssets)).

## Setup

1. Instala dependencias: `npm install`
2. Opcional: en `.env`, pon `STARTGG_TOKEN` para importar standings de start.gg.
3. Arranca: `npm run dev`

Los personajes e iconos se leen de internet (jsDelivr / GitHub), igual que el downloader de TSH. No hace falta una instalación local de TSH.

## Tipografías

- Nombres: `public/fonts/DINPro-CondBlackIta.otf`
- Prefix: `public/fonts/DINPro-CondLight.otf`
- Placement 1st–7th: DFG Gothic SU. Si no está, se usa M PLUS 1p 900. Suelta `DFGGothic-SU.otf` en `public/fonts/` para usarla.
