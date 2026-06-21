# AI Radar

AI Radar es el proyecto del curso avanzado de Codex.

El objetivo del producto es organizar noticias, herramientas, papers, repos y lanzamientos de IA para convertirlos en senales accionables para builders: que paso, por que importa, que tan confiable es y que vale la pena probar.

Estado actual: definicion de producto, contrato local de senales, scripts de subagentes y una API minima para persistir runs y senales en Supabase. La implementacion se construye por capas durante el curso con Codex.

## Problema

El ritmo de la inteligencia artificial genera demasiado ruido:

- lanzamientos repetidos en varias fuentes,
- repos que parecen importantes pero no tienen adopcion,
- demos sin documentacion suficiente,
- papers sin ejemplo practico,
- herramientas con impacto real mezcladas con marketing.

AI Radar debe ayudar a separar ruido de senales utiles.

## Producto Objetivo

Al final del curso, AI Radar debe poder:

- recopilar novedades de IA desde fuentes seleccionadas,
- normalizar noticias, repos, papers y productos,
- detectar duplicados y noticias parecidas,
- agrupar senales por tema,
- rankear por novedad, impacto, evidencia y accionabilidad,
- generar guias practicas para decidir que probar,
- exponer resultados en un dashboard,
- guardar trazas de decisiones y validaciones,
- desplegarse con infraestructura controlada.

## Estado Actual

El repo contiene:

- `README.md`
- `.gitignore`
- `AGENTS.md`
- `.agents/` con configuraciones de subagentes
- `contracts/ai-radar-daily-signals.schema.json`
- `data/daily/` con snapshots diarios
- `scripts/` con utilidades locales
- `app/api/` con endpoints Next.js API-only
- `lib/` con validacion y acceso server-side a Supabase
- `supabase/migrations/` con el esquema core
- `tests/` con pruebas `node:test`

No existe dashboard visual todavia.

## Desarrollo Local

```powershell
npm install
npm test
npm run build
npm run dev
```

Configura `.env.local` a partir de `.env.example`. No guardes claves reales en git.

## API Supabase

Los endpoints requieren `Authorization: Bearer $AI_RADAR_API_TOKEN`:

- `POST /api/runs`: guarda un run completo con senales normalizadas.
- `GET /api/runs/:id`: consulta un run y sus senales.
- `GET /api/signals?fecha=&source_type=&limit=`: lista senales persistidas.
- `POST /api/sources/sync`: sincroniza fuentes activas desde el cache de Notion.

Supabase se usa solo server-side con `SUPABASE_SERVICE_ROLE_KEY`. La migracion local habilita RLS y no crea politicas publicas.

## Stack Objetivo

El stack debe mantenerse simple para que el foco del curso sea Codex, no el framework.

- Frontend: HTML, CSS y JavaScript.
- Dominio: modulos JavaScript reutilizables.
- CLI: `airadar` para comandos internos del proyecto.
- Automatizacion local: scripts Node.js.
- Proyecto agent-friendly: Dekk cuando existan comandos que deban usar humanos y agentes.
- API: Vercel Functions cuando hagan falta endpoints.
- Datos locales: fixtures y snapshots antes de conectar servicios externos.
- Base de datos: Supabase cuando el contrato local ya funcione.
- QA: `node:test` para dominio y Playwright cuando exista interfaz visual.
- Demo final: video programatico con la evidencia del proyecto.

## Reglas Iniciales Para Codex

Antes de implementar, Codex debe distinguir:

- vision del producto,
- estado actual del repositorio,
- decisiones tecnicas tomadas,
- decisiones pendientes,
- limites de seguridad.

Codex no debe inventar archivos, comandos, servicios ni integraciones como si ya existieran.

