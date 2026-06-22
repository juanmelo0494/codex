# AI Radar

AI Radar es el proyecto del curso avanzado de Codex.

El objetivo del producto es organizar noticias, herramientas, papers, repos y lanzamientos de IA para convertirlos en senales accionables para builders: que paso, por que importa, que tan confiable es y que vale la pena probar.

Estado actual: definicion de producto, contrato local de senales, scripts de subagentes, una API minima para persistir runs y senales en Supabase y un dashboard visual inicial. El dashboard puede leer datos reales server-side desde Supabase cuando el entorno esta configurado; si faltan credenciales, cae al fixture declarado en `fixtures/dashboard.json`.

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
- `app/api/` con endpoints Next.js protegidos
- `app/page.js` con dashboard visual basado en API server-side o fixture declarado
- `lib/` con validacion y acceso server-side a Supabase
- `supabase/migrations/` con el esquema core
- `tests/` con pruebas `node:test`

El dashboard visual existe en modo operacional inicial. Aun no hay ranking persistido con scores propios; cuando usa Supabase, la capa visual adapta `signals` y `sources` al contrato de UI y declara ese mapeo en los datos entregados a la pagina.

## Desarrollo Local

```powershell
npm install
npm test
npm run build
npm run dev
npm run sources:refresh
npm run supabase:check
```

Configura `.env.local` a partir de `.env.example`. No guardes claves reales en git.

## Fuentes Notion

La tabla de fuentes vive en Notion como `AI radar Sources`. Para refrescar el cache local ignorado por git:

```powershell
npm run sources:refresh
```

El script usa la API publica de Notion y evita depender de consultas SQL del conector Notion. Configura `NOTION_API_KEY` y preferentemente `NOTION_DATA_SOURCE_ID`; `NOTION_DATABASE_ID` queda como fallback legacy. El cache resultante se escribe en `config/sources.json`, agrupado por subagente y solo con filas `Status = activa`.

## API Supabase

Los endpoints requieren `Authorization: Bearer $AI_RADAR_API_TOKEN`:

- `POST /api/runs`: guarda un run completo con senales normalizadas.
- `GET /api/runs/:id`: consulta un run y sus senales.
- `GET /api/signals?fecha=&source_type=&limit=`: lista senales persistidas.
- `POST /api/sources/sync`: sincroniza fuentes activas desde el cache de Notion.

Supabase se usa solo server-side con `SUPABASE_SERVICE_ROLE_KEY`. La migracion local habilita RLS y no crea politicas publicas.

Para validar que el entorno apunta al proyecto correcto y que existen las tablas esperadas:

```powershell
npm run supabase:check
```

El diagnostico no imprime secretos. Si faltan variables o el proyecto no tiene `public.sources`, `public.runs` y `public.signals`, reporta el problema antes de intentar sincronizar fuentes o persistir snapshots.

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

