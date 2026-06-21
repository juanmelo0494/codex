# Guia del Repositorio

## Estructura del Proyecto y Organizacion

Este workspace contiene el starter clonado de AI Radar en `platzi-codex-clase-02-agents-md/`. Ese proyecto es intencionalmente pequeno: `README.md` define la direccion del producto, `AGENTS.md` define reglas para agentes y `.gitignore` excluye caches locales, secretos, datos generados y salidas de build. Todavia no existen `src/`, `tests/`, `assets/`, manifiesto de paquete ni runtime de aplicacion. Agrega nuevos directorios solo cuando el objetivo de la clase lo requiera.

## Comandos de Build, Prueba y Desarrollo

Todavia no existen comandos de build o pruebas porque no hay implementacion de aplicacion ni `package.json`. Usa comandos de inspeccion mientras trabajas:

```powershell
cd platzi-codex-clase-02-agents-md
git status --short
git log --oneline -5
```

No documentes comandos como `npm test` o `npm run build` hasta que realmente existan.

## Estilo de Codigo y Convenciones de Nombres

El contenido actual es solo Markdown. Manten encabezados claros, parrafos breves y nombres descriptivos para futuros archivos, por ejemplo `fixtures/signals.json` o `scripts/normalize-sources.js`. No incluyas en control de versiones salidas generadas, snapshots, grabaciones, credenciales ni bases de datos locales.

## Guia de Pruebas

No hay un framework de pruebas configurado todavia. Cuando se introduzcan modulos JavaScript, prefiere `node:test` para la logica de dominio. Cuando exista una interfaz visual, agrega verificaciones con Playwright para flujos de usuario. Los archivos de prueba deben vivir junto al comportamiento que verifican o dentro de un directorio `tests/` claro cuando la estructura este definida.

## Guia de Commits y Pull Requests

El historial existente usa prefijos convencionales cortos como `docs:` y `chore:`. Manten ese estilo, por ejemplo `docs: aclarar objetivos de AI Radar` o `chore: actualizar reglas de ignore`. Los pull requests deben describir que cambio, como se verifico y que queda intencionalmente pendiente. Incluye capturas solo cuando exista una interfaz.

## Instrucciones Especificas para Agentes

Inspecciona el repositorio antes de editar. Trata el README como direccion de producto, no como prueba de funcionalidades implementadas. Manten los cambios acotados a la leccion actual y evita inventar servicios, scripts, bases de datos o automatizaciones que no esten presentes.
