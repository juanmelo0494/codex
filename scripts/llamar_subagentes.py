#!/usr/bin/env python3
"""Genera llamadas de subagentes para busquedas de AI Radar."""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any


DEFAULT_AGENT_ORDER = (
    "fuentes-oficiales.yaml",
    "repo-tecnico.yaml",
    "comunidad.yaml",
    "medios-secundarios.yaml",
)

REQUIRED_TOP_LEVEL_FIELDS = (
    "id",
    "display_name",
    "agent_type",
    "reasoning_effort",
    "source_type",
    "scope",
    "instructions",
    "output",
)

VALID_REASONING_EFFORTS = {"low", "medium", "high", "xhigh"}


class AgentConfigError(Exception):
    """Error esperado al leer una configuracion de subagente."""


@dataclass(frozen=True)
class AgentConfig:
    path: Path
    id: str
    display_name: str
    agent_type: str
    reasoning_effort: str
    source_type: str
    include: list[str]
    exclude: list[str]
    instructions: str
    language: str
    fields: list[str]


@dataclass(frozen=True)
class SourcesCache:
    path: Path
    status: str
    fallback_reason: str | None
    generated_at: str | None
    notion_database_url: str | None
    groups: dict[str, list[dict[str, str]]]


def repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def non_negative_int(raw_value: str) -> int:
    try:
        value = int(raw_value)
    except ValueError as exc:
        raise argparse.ArgumentTypeError("debe ser un entero") from exc

    if value < 0:
        raise argparse.ArgumentTypeError("debe ser mayor o igual a 0")
    return value


def parse_day(raw_value: str) -> str:
    try:
        return date.fromisoformat(raw_value).isoformat()
    except ValueError as exc:
        raise argparse.ArgumentTypeError("usa YYYY-MM-DD") from exc


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Lee .agents/*.yaml y genera payloads para llamar subagentes "
            "de AI Radar con multi_agent_v1.spawn_agent."
        ),
    )
    parser.add_argument(
        "consulta",
        nargs="?",
        default="senales recientes de IA",
        help="Consulta o objetivo de busqueda. Default: senales recientes de IA.",
    )
    parser.add_argument(
        "--agents-dir",
        type=Path,
        default=repo_root() / ".agents",
        help="Directorio con configuraciones YAML. Default: .agents.",
    )
    parser.add_argument(
        "--sources-cache",
        type=Path,
        default=repo_root() / "config" / "sources.json",
        help="Cache JSON de fuentes activas consultadas desde Notion. Default: config/sources.json.",
    )
    parser.add_argument(
        "--desde",
        type=parse_day,
        help="Inicio de ventana de busqueda en formato YYYY-MM-DD.",
    )
    parser.add_argument(
        "--hasta",
        type=parse_day,
        help="Fin de ventana de busqueda en formato YYYY-MM-DD.",
    )
    parser.add_argument(
        "-n",
        "--cantidad",
        type=non_negative_int,
        default=5,
        help="Candidatos a pedir por subagente. Default: 5.",
    )
    parser.add_argument(
        "--solo",
        action="append",
        default=[],
        metavar="ID_O_ARCHIVO",
        help="Filtra subagentes por id, nombre de archivo o stem. Puede repetirse.",
    )
    parser.add_argument(
        "--formato",
        choices=("json", "markdown"),
        default="json",
        help="Formato de salida. Default: json.",
    )
    parser.add_argument(
        "--indent",
        type=non_negative_int,
        default=2,
        help="Espacios de indentacion para JSON. Usa 0 para salida compacta.",
    )
    return parser.parse_args(argv)


def scalar(raw_value: str) -> str:
    value = raw_value.strip()
    if len(value) >= 2 and value[0] == '"' and value[-1] == '"':
        return value[1:-1]
    return value


def indentation(line: str) -> int:
    return len(line) - len(line.lstrip(" "))


def fold_block(lines: list[str], start_index: int) -> tuple[str, int]:
    block_lines: list[str] = []
    index = start_index

    while index < len(lines):
        line = lines[index]
        if line.strip() and indentation(line) == 0:
            break
        if line.strip():
            block_lines.append(line.strip())
        index += 1

    return " ".join(block_lines), index


def parse_nested_block(lines: list[str], start_index: int) -> tuple[dict[str, Any], int]:
    result: dict[str, Any] = {}
    current_list: str | None = None
    index = start_index

    while index < len(lines):
        line = lines[index]
        stripped = line.strip()
        if not stripped:
            index += 1
            continue

        indent = indentation(line)
        if indent == 0:
            break

        if indent == 2 and stripped.endswith(":"):
            key = stripped[:-1]
            result[key] = []
            current_list = key
        elif indent == 2 and ":" in stripped:
            key, raw_value = stripped.split(":", 1)
            result[key] = scalar(raw_value)
            current_list = None
        elif indent == 4 and stripped.startswith("- "):
            if current_list is None:
                raise AgentConfigError(f"lista sin clave en linea {index + 1}")
            result[current_list].append(scalar(stripped[2:]))
        else:
            raise AgentConfigError(f"YAML no soportado en linea {index + 1}: {line}")

        index += 1

    return result, index


def parse_agent_yaml(path: Path) -> dict[str, Any]:
    lines = path.read_text(encoding="utf-8").splitlines()
    data: dict[str, Any] = {}
    index = 0

    while index < len(lines):
        line = lines[index]
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            index += 1
            continue

        if indentation(line) != 0 or ":" not in stripped:
            raise AgentConfigError(f"YAML no soportado en {path}: linea {index + 1}")

        key, raw_value = stripped.split(":", 1)
        value = raw_value.strip()
        index += 1

        if value == ">-":
            data[key], index = fold_block(lines, index)
        elif value == "":
            data[key], index = parse_nested_block(lines, index)
        else:
            data[key] = scalar(value)

    return data


def require_string(data: dict[str, Any], key: str, path: Path) -> str:
    value = data.get(key)
    if not isinstance(value, str) or not value.strip():
        raise AgentConfigError(f"{path}: falta string requerido '{key}'")
    return value


def require_list(data: dict[str, Any], key: str, path: Path) -> list[str]:
    value = data.get(key)
    if not isinstance(value, list) or not all(isinstance(item, str) for item in value):
        raise AgentConfigError(f"{path}: falta lista requerida '{key}'")
    return value


def load_agent(path: Path) -> AgentConfig:
    raw = parse_agent_yaml(path)
    missing = [key for key in REQUIRED_TOP_LEVEL_FIELDS if key not in raw]
    if missing:
        raise AgentConfigError(f"{path}: faltan campos requeridos: {', '.join(missing)}")

    scope = raw["scope"]
    output = raw["output"]
    if not isinstance(scope, dict):
        raise AgentConfigError(f"{path}: 'scope' debe ser un objeto")
    if not isinstance(output, dict):
        raise AgentConfigError(f"{path}: 'output' debe ser un objeto")

    reasoning_effort = require_string(raw, "reasoning_effort", path)
    if reasoning_effort not in VALID_REASONING_EFFORTS:
        valid = ", ".join(sorted(VALID_REASONING_EFFORTS))
        raise AgentConfigError(f"{path}: reasoning_effort invalido {reasoning_effort!r}; usa {valid}")

    return AgentConfig(
        path=path,
        id=require_string(raw, "id", path),
        display_name=require_string(raw, "display_name", path),
        agent_type=require_string(raw, "agent_type", path),
        reasoning_effort=reasoning_effort,
        source_type=require_string(raw, "source_type", path),
        include=require_list(scope, "include", path),
        exclude=require_list(scope, "exclude", path),
        instructions=require_string(raw, "instructions", path),
        language=require_string(output, "language", path),
        fields=require_list(output, "fields", path),
    )


def discover_agent_paths(agents_dir: Path) -> list[Path]:
    if not agents_dir.exists():
        raise AgentConfigError(f"no existe el directorio de subagentes: {agents_dir}")

    paths = list(agents_dir.glob("*.yaml"))
    if not paths:
        raise AgentConfigError(f"no hay configuraciones *.yaml en {agents_dir}")

    order = {name: index for index, name in enumerate(DEFAULT_AGENT_ORDER)}
    return sorted(paths, key=lambda path: (order.get(path.name, len(order)), path.name))


def selected(agent: AgentConfig, filters: list[str]) -> bool:
    if not filters:
        return True

    aliases = {
        agent.id.casefold(),
        agent.path.name.casefold(),
        agent.path.stem.casefold(),
        agent.display_name.casefold(),
    }
    return any(item.casefold() in aliases for item in filters)


def relative_to_repo(path: Path) -> str:
    try:
        return str(path.relative_to(repo_root()))
    except ValueError:
        return str(path)


def as_string(value: Any) -> str:
    return value if isinstance(value, str) else ""


def source_item(raw: dict[str, Any]) -> dict[str, str] | None:
    name = as_string(raw.get("name")).strip()
    url = as_string(raw.get("url")).strip()
    if not name or not url:
        return None

    source: dict[str, str] = {"name": name, "url": url}
    for key in ("type", "status", "priority", "cadence", "notes", "notion_page_url"):
        value = as_string(raw.get(key)).strip()
        if value:
            source[key] = value
    return source


def load_sources_cache(path: Path) -> SourcesCache:
    if not path.exists():
        return SourcesCache(
            path=path,
            status="missing",
            fallback_reason=f"no existe {relative_to_repo(path)}; usar scope YAML por subagente",
            generated_at=None,
            notion_database_url=None,
            groups={},
        )

    try:
        with path.open("r", encoding="utf-8") as file:
            payload = json.load(file)
    except OSError as exc:
        return SourcesCache(
            path=path,
            status="unreadable",
            fallback_reason=f"no se pudo leer el cache: {exc}",
            generated_at=None,
            notion_database_url=None,
            groups={},
        )
    except json.JSONDecodeError as exc:
        return SourcesCache(
            path=path,
            status="invalid_json",
            fallback_reason=f"JSON invalido en cache: {exc}",
            generated_at=None,
            notion_database_url=None,
            groups={},
        )

    if not isinstance(payload, dict):
        return SourcesCache(
            path=path,
            status="invalid_shape",
            fallback_reason="la raiz del cache debe ser un objeto",
            generated_at=None,
            notion_database_url=None,
            groups={},
        )

    raw_groups = payload.get("fuentes_por_subagente")
    if not isinstance(raw_groups, dict):
        return SourcesCache(
            path=path,
            status="invalid_shape",
            fallback_reason="falta objeto fuentes_por_subagente",
            generated_at=as_string(payload.get("generado_en")) or None,
            notion_database_url=as_string(payload.get("notion_database_url")) or None,
            groups={},
        )

    groups: dict[str, list[dict[str, str]]] = {}
    for agent_id, raw_sources in raw_groups.items():
        if not isinstance(agent_id, str) or not isinstance(raw_sources, list):
            continue

        active_sources: list[dict[str, str]] = []
        for raw_source in raw_sources:
            if not isinstance(raw_source, dict):
                continue
            status = as_string(raw_source.get("status")).strip().casefold()
            if status and status != "activa":
                continue
            source = source_item(raw_source)
            if source:
                active_sources.append(source)

        groups[agent_id] = active_sources

    return SourcesCache(
        path=path,
        status="loaded",
        fallback_reason=None,
        generated_at=as_string(payload.get("generado_en")) or None,
        notion_database_url=as_string(payload.get("notion_database_url")) or None,
        groups=groups,
    )


def search_window(args: argparse.Namespace) -> str:
    if args.desde and args.hasta:
        return f"desde {args.desde} hasta {args.hasta}"
    if args.desde:
        return f"desde {args.desde}"
    if args.hasta:
        return f"hasta {args.hasta}"
    return "reciente"


def format_sources(sources: list[dict[str, str]]) -> str:
    if not sources:
        return (
            "- No hay fuentes activas configuradas para este subagente en "
            "config/sources.json. Usa el scope YAML como fallback y reportalo."
        )

    lines = []
    for source in sources:
        details = [source["url"]]
        if source.get("priority"):
            details.append(f"prioridad={source['priority']}")
        if source.get("cadence"):
            details.append(f"cadencia={source['cadence']}")
        if source.get("notes"):
            details.append(f"notas={source['notes']}")
        lines.append(f"- {source['name']}: " + "; ".join(details))
    return "\n".join(lines)


def build_agent_message(
    agent: AgentConfig,
    args: argparse.Namespace,
    sources: list[dict[str, str]],
    sources_cache: SourcesCache,
) -> str:
    include = "\n".join(f"- {item}" for item in agent.include)
    exclude = "\n".join(f"- {item}" for item in agent.exclude)
    fields = ", ".join(agent.fields)
    today = date.today().isoformat()
    source_block = format_sources(sources)
    cache_status = sources_cache.status

    return (
        f"Eres el subagente de {agent.display_name} para AI Radar.\n"
        f"Fecha actual: {today}.\n"
        f"Consulta: {args.consulta}.\n"
        f"Ventana de busqueda: {search_window(args)}.\n"
        f"Candidatos esperados: {args.cantidad}.\n"
        f"Tipo de fuente: {agent.source_type}.\n\n"
        "Fuentes activas asignadas desde cache local:\n"
        f"{source_block}\n"
        f"Estado del cache de fuentes: {cache_status}.\n\n"
        "Incluye:\n"
        f"{include}\n\n"
        "Excluye:\n"
        f"{exclude}\n\n"
        "Instrucciones:\n"
        f"{agent.instructions}\n\n"
        "Fallback obligatorio:\n"
        "- Si una fuente asignada no responde, no tiene contenido reciente o no se puede verificar, "
        "continua con fuentes equivalentes dentro del scope del subagente.\n"
        "- Reporta cada fallback con fuente_original, motivo y fuente_usada.\n"
        "- Si el cache no esta disponible o no trae fuentes para este subagente, indicalo "
        "explicitamente y usa el scope YAML como fallback.\n\n"
        f"Devuelve la respuesta en {agent.language}. "
        f"Cada candidato debe incluir estos campos: {fields}. "
        "Usa fechas exactas, URLs verificables y marca claramente incertidumbre, "
        "rumor o evidencia secundaria."
    )


def fallback_plan(sources: list[dict[str, str]], sources_cache: SourcesCache) -> dict[str, Any]:
    if sources:
        reason = "reportar solo si una fuente asignada no responde"
    else:
        reason = sources_cache.fallback_reason or "sin fuentes activas para este subagente"

    return {
        "reportar_si_no_responde": True,
        "motivo": reason,
        "fallback": "usar fuentes equivalentes dentro del scope YAML del subagente",
    }


def build_spawn_plan(agent: AgentConfig, args: argparse.Namespace, sources_cache: SourcesCache) -> dict[str, Any]:
    sources = sources_cache.groups.get(agent.id, [])
    message = build_agent_message(agent, args, sources, sources_cache)
    return {
        "id": agent.id,
        "display_name": agent.display_name,
        "config_path": relative_to_repo(agent.path),
        "source_type": agent.source_type,
        "reasoning_effort": agent.reasoning_effort,
        "fuentes_configuradas": sources,
        "fallback": fallback_plan(sources, sources_cache),
        "spawn_agent": {
            "tool": "multi_agent_v1.spawn_agent",
            "parameters": {
                "agent_type": agent.agent_type,
                "reasoning_effort": agent.reasoning_effort,
                "fork_context": False,
                "message": message,
            },
        },
    }


def build_plan(agents: list[AgentConfig], args: argparse.Namespace, sources_cache: SourcesCache) -> dict[str, Any]:
    now = datetime.now(UTC).isoformat(timespec="seconds").replace("+00:00", "Z")
    return {
        "contrato": "ai-radar.subagents.spawn-plan.v1",
        "generado_en": now,
        "consulta": args.consulta,
        "ventana": {
            "desde": args.desde,
            "hasta": args.hasta,
            "descripcion": search_window(args),
        },
        "cantidad_por_subagente": args.cantidad,
        "agents_dir": relative_to_repo(args.agents_dir),
        "sources_cache": {
            "path": relative_to_repo(sources_cache.path),
            "status": sources_cache.status,
            "generated_at": sources_cache.generated_at,
            "notion_database_url": sources_cache.notion_database_url,
            "fallback_reason": sources_cache.fallback_reason,
        },
        "subagentes": [build_spawn_plan(agent, args, sources_cache) for agent in agents],
        "siguiente_paso": (
            "Ejecuta cada objeto subagentes[].spawn_agent como una llamada "
            "multi_agent_v1.spawn_agent en paralelo, espera resultados, "
            "deduplica y normaliza las senales. Si un subagente no responde "
            "o reporta fallback, incluyelo en el resumen final."
        ),
    }


def dump_json(plan: dict[str, Any], indent: int) -> None:
    json_indent: int | None = indent if indent > 0 else None
    json.dump(plan, sys.stdout, ensure_ascii=False, indent=json_indent)
    sys.stdout.write("\n")


def dump_markdown(plan: dict[str, Any]) -> None:
    print(f"# Plan de subagentes: {plan['consulta']}")
    print()
    print(f"- Ventana: {plan['ventana']['descripcion']}")
    print(f"- Candidatos por subagente: {plan['cantidad_por_subagente']}")
    print(f"- Cache de fuentes: `{plan['sources_cache']['path']}` ({plan['sources_cache']['status']})")
    print()

    for agent in plan["subagentes"]:
        parameters = agent["spawn_agent"]["parameters"]
        print(f"## {agent['display_name']}")
        print()
        print(f"- Config: `{agent['config_path']}`")
        print(f"- Reasoning: `{agent['reasoning_effort']}`")
        print(f"- Tipo de fuente: `{agent['source_type']}`")
        print(f"- Fuentes configuradas: {len(agent['fuentes_configuradas'])}")
        print(f"- Fallback: {agent['fallback']['motivo']}")
        print()
        print("```text")
        print(parameters["message"])
        print("```")
        print()

    print("Siguiente paso: llamar `multi_agent_v1.spawn_agent` con cada payload.")


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)

    try:
        paths = discover_agent_paths(args.agents_dir)
        agents = [load_agent(path) for path in paths]
        filtered_agents = [agent for agent in agents if selected(agent, args.solo)]
        if not filtered_agents:
            filters = ", ".join(args.solo)
            raise AgentConfigError(f"ningun subagente coincide con: {filters}")

        sources_cache = load_sources_cache(args.sources_cache)
        plan = build_plan(filtered_agents, args, sources_cache)
    except AgentConfigError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    if args.formato == "markdown":
        dump_markdown(plan)
    else:
        dump_json(plan, args.indent)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
