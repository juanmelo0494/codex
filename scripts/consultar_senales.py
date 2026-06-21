#!/usr/bin/env python3
"""Consulta senales desde snapshots diarios de AI Radar."""

from __future__ import annotations

import argparse
import json
import sys
from datetime import date
from pathlib import Path
from typing import Any, Callable


ORDER_CHOICES = (
    "archivo",
    "archivo_desc",
    "publicado_asc",
    "publicado_desc",
    "titulo_asc",
    "titulo_desc",
    "estado_asc",
    "estado_desc",
    "id_asc",
    "id_desc",
)


class QueryError(Exception):
    """Error esperado al consultar snapshots locales."""


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


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Devuelve N senales JSON desde un snapshot diario de AI Radar.",
    )
    parser.add_argument(
        "--dia",
        "--day",
        dest="dia",
        metavar="YYYY-MM-DD",
        help="Dia del snapshot. Si se omite, usa el snapshot mas reciente en data/daily.",
    )
    parser.add_argument(
        "-n",
        "--cantidad",
        "--count",
        dest="cantidad",
        type=non_negative_int,
        default=5,
        help="Cantidad maxima de senales a devolver. Default: 5.",
    )
    parser.add_argument(
        "--orden",
        "--order",
        dest="orden",
        choices=ORDER_CHOICES,
        default="archivo",
        help="Orden de salida. Default: archivo.",
    )
    parser.add_argument(
        "--data-dir",
        type=Path,
        default=repo_root() / "data" / "daily",
        help="Directorio de snapshots diarios. Default: data/daily.",
    )
    parser.add_argument(
        "--indent",
        type=non_negative_int,
        default=2,
        help="Espacios de indentacion para el JSON. Usa 0 para salida compacta.",
    )
    return parser.parse_args(argv)


def parse_day(raw_day: str) -> date:
    try:
        return date.fromisoformat(raw_day)
    except ValueError as exc:
        raise QueryError(f"dia invalido: {raw_day!r}; usa YYYY-MM-DD") from exc


def available_days(data_dir: Path) -> list[date]:
    if not data_dir.exists():
        raise QueryError(f"no existe el directorio de snapshots: {data_dir}")

    days: list[date] = []
    for path in data_dir.glob("*.json"):
        try:
            days.append(parse_day(path.stem))
        except QueryError:
            continue
    return sorted(days)


def resolve_snapshot_path(data_dir: Path, raw_day: str | None) -> Path:
    if raw_day:
        selected_day = parse_day(raw_day)
    else:
        days = available_days(data_dir)
        if not days:
            raise QueryError(f"no hay snapshots diarios en {data_dir}")
        selected_day = days[-1]

    snapshot_path = data_dir / f"{selected_day.isoformat()}.json"
    if not snapshot_path.exists():
        raise QueryError(f"no existe snapshot para {selected_day.isoformat()}: {snapshot_path}")
    return snapshot_path


def load_signals(snapshot_path: Path) -> list[dict[str, Any]]:
    try:
        with snapshot_path.open("r", encoding="utf-8") as file:
            payload = json.load(file)
    except json.JSONDecodeError as exc:
        raise QueryError(f"JSON invalido en {snapshot_path}: {exc}") from exc

    if not isinstance(payload, dict):
        raise QueryError(f"snapshot invalido en {snapshot_path}: la raiz debe ser un objeto")

    signals = payload.get("senales")
    if not isinstance(signals, list):
        raise QueryError(f"snapshot invalido en {snapshot_path}: falta lista 'senales'")

    normalized: list[dict[str, Any]] = []
    for index, signal in enumerate(signals, start=1):
        if not isinstance(signal, dict):
            raise QueryError(f"senal #{index} en {snapshot_path} no es un objeto")
        normalized.append(signal)
    return normalized


def nested_string(signal: dict[str, Any], *keys: str) -> str:
    value: Any = signal
    for key in keys:
        if not isinstance(value, dict):
            return ""
        value = value.get(key)
    return value if isinstance(value, str) else ""


def sort_signals(signals: list[dict[str, Any]], order: str) -> list[dict[str, Any]]:
    if order == "archivo":
        return list(signals)
    if order == "archivo_desc":
        return list(reversed(signals))

    key_name, direction = order.rsplit("_", 1)
    key_functions: dict[str, Callable[[dict[str, Any]], str]] = {
        "publicado": lambda signal: nested_string(signal, "fuente", "publicado"),
        "titulo": lambda signal: nested_string(signal, "titulo").casefold(),
        "estado": lambda signal: nested_string(signal, "estado").casefold(),
        "id": lambda signal: nested_string(signal, "id").casefold(),
    }

    key_function = key_functions[key_name]
    ordered = sorted(
        enumerate(signals),
        key=lambda item: (key_function(item[1]), item[0]),
    )
    if direction == "desc":
        ordered.reverse()
    return [signal for _, signal in ordered]


def dump_json(signals: list[dict[str, Any]], indent: int) -> None:
    json_indent: int | None = indent if indent > 0 else None
    json.dump(signals, sys.stdout, ensure_ascii=False, indent=json_indent)
    sys.stdout.write("\n")


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)

    try:
        snapshot_path = resolve_snapshot_path(args.data_dir, args.dia)
        signals = load_signals(snapshot_path)
        ordered_signals = sort_signals(signals, args.orden)
        dump_json(ordered_signals[: args.cantidad], args.indent)
    except QueryError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
