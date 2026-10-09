#!/usr/bin/env python3
"""Validate local href/src references in a static website."""

from __future__ import annotations

import argparse
import os
import sys
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit


IGNORED_DIRS = {".git", "__pycache__", "sites-app", "tests"}


@dataclass(frozen=True)
class Reference:
    source: Path
    line: int
    attribute: str
    value: str


@dataclass(frozen=True)
class Issue:
    kind: str
    source: Path
    line: int
    target: str
    detail: str


class LinkParser(HTMLParser):
    def __init__(self, source: Path) -> None:
        super().__init__(convert_charrefs=True)
        self.source = source
        self.references: list[Reference] = []
        self.anchors: set[str] = set()

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        line, _ = self.getpos()
        attributes = dict(attrs)
        for anchor_attribute in ("id", "name"):
            value = attributes.get(anchor_attribute)
            if value:
                self.anchors.add(value)
        for attribute in ("href", "src"):
            value = attributes.get(attribute)
            if value is not None:
                self.references.append(Reference(self.source, line, attribute, value.strip()))


def parse_html(path: Path) -> LinkParser:
    parser = LinkParser(path)
    parser.feed(path.read_text(encoding="utf-8", errors="replace"))
    parser.close()
    return parser


def iter_html_files(root: Path) -> list[Path]:
    files: list[Path] = []
    for directory, dirnames, filenames in os.walk(root):
        dirnames[:] = sorted(name for name in dirnames if name not in IGNORED_DIRS)
        base = Path(directory)
        files.extend(base / name for name in sorted(filenames) if name.lower().endswith(".html"))
    return files


def case_insensitive_match(root: Path, relative: Path) -> Path | None:
    current = root
    for part in relative.parts:
        if part in ("", "."):
            continue
        if part == "..":
            current = current.parent
            continue
        if not current.is_dir():
            return None
        matches = [child for child in current.iterdir() if child.name.casefold() == part.casefold()]
        if len(matches) != 1:
            return None
        current = matches[0]
    return current


def display(path: Path, root: Path) -> str:
    try:
        return path.relative_to(root).as_posix()
    except ValueError:
        return str(path)


def validate(root: Path) -> tuple[list[Issue], int, int]:
    root = root.resolve()
    html_files = iter_html_files(root)
    parsed = {path.resolve(): parse_html(path) for path in html_files}
    issues: list[Issue] = []
    checked = 0
    external = 0

    for source, document in parsed.items():
        for reference in document.references:
            raw = reference.value
            if not raw:
                continue
            split = urlsplit(raw)
            if raw.startswith("//") or bool(split.scheme):
                external += 1
                continue

            checked += 1
            decoded_path = unquote(split.path)
            fragment = unquote(split.fragment)

            if not decoded_path:
                if fragment and fragment not in document.anchors:
                    issues.append(Issue(
                        "MISSING_ANCHOR", reference.source, reference.line, raw,
                        f"sayfa içinde #{fragment} kimliği bulunamadı",
                    ))
                continue

            if decoded_path.startswith("/"):
                relative = Path(decoded_path.lstrip("/"))
            else:
                relative = Path(os.path.relpath(source.parent / decoded_path, root))

            normalized = Path(os.path.normpath(relative))
            if normalized.parts and normalized.parts[0] == "..":
                issues.append(Issue(
                    "OUTSIDE_ROOT", reference.source, reference.line, raw,
                    "hedef site kökünün dışına çıkıyor",
                ))
                continue

            target = (root / normalized).resolve()
            if target.is_dir():
                target = target / "index.html"
                normalized = normalized / "index.html"

            alternative = case_insensitive_match(root, normalized)
            if alternative is not None and alternative.exists():
                actual_relative = display(alternative, root)
                if actual_relative != normalized.as_posix():
                    issues.append(Issue(
                        "CASE_MISMATCH", reference.source, reference.line, raw,
                        f"gerçek yol: {actual_relative}",
                    ))
                    continue

            if not target.exists():
                if alternative is not None and alternative.exists():
                    issues.append(Issue(
                        "CASE_MISMATCH", reference.source, reference.line, raw,
                        f"gerçek yol: {display(alternative, root)}",
                    ))
                else:
                    issues.append(Issue(
                        "MISSING_FILE", reference.source, reference.line, raw,
                        f"çözümlenen yol: {normalized.as_posix()}",
                    ))
                continue

            if fragment and target.suffix.lower() == ".html":
                target_document = parsed.get(target.resolve())
                if target_document is None:
                    target_document = parse_html(target)
                    parsed[target.resolve()] = target_document
                if fragment not in target_document.anchors:
                    issues.append(Issue(
                        "MISSING_ANCHOR", reference.source, reference.line, raw,
                        f"{display(target, root)} içinde #{fragment} kimliği bulunamadı",
                    ))

    return issues, len(html_files), checked + external


def main(argv: list[str] | None = None) -> int:
    argument_parser = argparse.ArgumentParser(description=__doc__)
    argument_parser.add_argument(
        "root", nargs="?", type=Path, default=Path(__file__).resolve().parents[1],
        help="site kökü (varsayılan: betiğin üst proje dizini)",
    )
    args = argument_parser.parse_args(argv)
    root = args.root.resolve()
    if not root.is_dir():
        print(f"HATA: site kökü bulunamadı: {root}", file=sys.stderr)
        return 2

    issues, html_count, reference_count = validate(root)
    for issue in issues:
        print(
            f"{issue.kind}: {display(issue.source, root)}:{issue.line}: "
            f"{issue.target!r} — {issue.detail}"
        )
    print(
        f"Taranan HTML: {html_count}, bağlantı: {reference_count}, hata: {len(issues)}"
    )
    return 1 if issues else 0


if __name__ == "__main__":
    raise SystemExit(main())
