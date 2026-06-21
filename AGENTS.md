# Guia del Repositorio

## Estructura del Proyecto y Organizacion

Este workspace contiene AI Radar en `platzi-codex-clase-02-agents-md/`. El proyecto sigue siendo pequeno: `README.md` define la direccion del producto, `AGENTS.md` define reglas para agentes y `.gitignore` excluye caches locales, secretos, datos generados y salidas de build. La implementacion actual agrega un runtime minimo Next.js solo para API routes, helpers server-side en `lib/`, migraciones en `supabase/migrations/`, pruebas en `tests/` y scripts locales en `scripts/`. No existe dashboard visual todavia.

## Comandos de Build, Prueba y Desarrollo

Usa estos comandos mientras trabajas:

```powershell
cd platzi-codex-clase-02-agents-md
git status --short
git log --oneline -5
npm test
npm run build
```

Para desarrollo local de la API usa `npm run dev`. No ejecutes ni documentes comandos nuevos hasta que existan en `package.json`.

## Estilo de Codigo y Convenciones de Nombres

Manten encabezados claros, parrafos breves y nombres descriptivos para archivos nuevos, por ejemplo `fixtures/signals.json` o `scripts/normalize-sources.js`. La API actual usa JavaScript ESM, validacion con esquemas y funciones pequenas en `lib/`. No incluyas en control de versiones salidas generadas, snapshots temporales, grabaciones, credenciales ni bases de datos locales.

## Guia de Pruebas

Las pruebas usan `node:test` y viven en `tests/`. Mantén pruebas enfocadas en validacion de contratos, normalizacion y endpoints. Cuando exista una interfaz visual, agrega verificaciones con Playwright para flujos de usuario.

## Guia de Commits y Pull Requests

El historial existente usa prefijos convencionales cortos como `docs:` y `chore:`. Manten ese estilo, por ejemplo `docs: aclarar objetivos de AI Radar` o `chore: actualizar reglas de ignore`. Los pull requests deben describir que cambio, como se verifico y que queda intencionalmente pendiente. Incluye capturas solo cuando exista una interfaz.

## Instrucciones Especificas para Agentes

Inspecciona el repositorio antes de editar. Trata el README como direccion de producto, no como prueba de funcionalidades implementadas. Manten los cambios acotados a la leccion actual y evita inventar servicios, scripts, bases de datos o automatizaciones que no esten presentes.

La integracion Supabase actual es server-side: los endpoints requieren `Authorization: Bearer $AI_RADAR_API_TOKEN` y usan `SUPABASE_SERVICE_ROLE_KEY` solo en el servidor. No uses secretos con prefijo `NEXT_PUBLIC_`. No apliques migraciones DDL ni crees proyectos Supabase remotos sin aprobacion explicita.

Cuando una tarea requiera buscar senales recientes de IA con subagentes, usa las configuraciones en `.agents/` y genera el plan de llamadas con:

```powershell
python scripts\llamar_subagentes.py "senales recientes de IA"
```

Antes de generar el plan, consulta Notion primero usando la tabla `AI radar Sources`. Refresca `config/sources.json` como cache local con las fuentes activas agrupadas por subagente. Ese archivo esta ignorado por git y no debe tratarse como artefacto versionado salvo instruccion explicita.

Ese script valida los YAML, lee `config/sources.json` si existe y produce payloads para `multi_agent_v1.spawn_agent`; ejecuta esos payloads en paralelo desde Codex, deduplica resultados y normaliza las senales antes de responder o guardar snapshots.

Si Notion no responde, la tabla no esta indexada, una fuente falla o un subagente no devuelve resultado, continua con el fallback indicado por el script y reporta el motivo en la respuesta final.

Trata frases naturales como "busca las noticias de esta semana", "busca noticias recientes de IA" o "dame las senales de IA de la semana" como solicitudes para activar ese flujo. Para "esta semana", calcula la ventana de los ultimos 7 dias con fechas exactas y pasala al script con `--desde` y `--hasta`.
