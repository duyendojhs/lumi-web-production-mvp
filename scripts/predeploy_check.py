from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "frontend" / "web_app"

REQUIRED_FILES = [
    ROOT / ".gitignore",
    WEB / ".gitignore",
    WEB / "package.json",
    WEB / ".env.example",
    WEB / "next.config.mjs",
    WEB / "db" / "schema.sql",
    ROOT / "docs" / "DEPLOYMENT.md",
    ROOT / "docs" / "DEPLOYABLE_ARCHITECTURE.md",
    ROOT / "docs" / "DATABASE_SCHEMA.md",
    ROOT / "docs" / "AUTH_DEPLOYMENT.md",
    ROOT / "docs" / "JOBS_AND_WORKERS.md",
    ROOT / "docs" / "RAG_DEPLOYMENT.md",
    ROOT / "docs" / "PRODUCTION_ENV_CHECKLIST.md",
    ROOT / "docs" / "SUPABASE_SETUP.md",
    ROOT / "docs" / "VERCEL_DEPLOYMENT.md",
    ROOT / "docs" / "DATA_DEPLOY_STRATEGY.md",
]

GITIGNORE_PATTERNS = [
    ".env.local",
    ".env.*.local",
    "node_modules/",
    ".next/",
    ".vercel/",
    "data/raw/",
    "data/processed/",
    "data/features/",
    "data/reports/",
    "*.zip",
]

SKIP_DIRS = {
    ".git",
    "node_modules",
    ".next",
    ".vercel",
    ".turbo",
    "dist",
    "build",
    "coverage",
    "raw",
    "processed",
    "features",
    "reports",
    "metadata",
}

DANGEROUS_PATTERNS = [
    ("google_api_key_literal", re.compile(r"AIza[0-9A-Za-z_\-]{20,}")),
    ("gemini_api_key_value", re.compile(r"^[ \t]*GEMINI_API_KEY[ \t]*=[ \t]*\S+", re.MULTILINE)),
    ("supabase_service_role_value", re.compile(r"^[ \t]*SUPABASE_SERVICE_ROLE_KEY[ \t]*=[ \t]*\S+", re.MULTILINE)),
    ("database_url_value", re.compile(r"^[ \t]*DATABASE_URL[ \t]*=[ \t]*(postgres|postgresql)://", re.MULTILINE)),
    ("windows_local_path_runtime", re.compile(r"D:\\\\DM|D:/DM|D:\\DM")),
]

TEXT_EXTENSIONS = {
    ".ts",
    ".tsx",
    ".js",
    ".mjs",
    ".json",
    ".md",
    ".sql",
    ".py",
    ".example",
    ".yml",
    ".yaml",
    ".css",
}


def main() -> int:
    checks: list[tuple[str, bool, str]] = []

    for file_path in REQUIRED_FILES:
        checks.append((f"required file: {relative(file_path)}", file_path.exists(), "missing"))

    checks.extend(check_gitignore())
    checks.extend(check_package())
    checks.extend(check_secret_patterns())
    checks.extend(check_large_local_dirs())
    checks.extend(check_git_tracked_dangerous_files())

    failed = [item for item in checks if not item[1]]

    print("Lumi predeploy check")
    print(f"Project root: {ROOT}")
    print("")
    for name, ok, message in checks:
        mark = "PASS" if ok else "FAIL"
        suffix = "" if ok else f" - {message}"
        print(f"[{mark}] {name}{suffix}")

    print("")
    if failed:
        print(f"Result: FAIL ({len(failed)} issue(s))")
        return 1

    print("Result: PASS")
    print("Vercel root directory: frontend/web_app")
    return 0


def check_gitignore() -> list[tuple[str, bool, str]]:
    root_ignore = read_text(ROOT / ".gitignore")
    web_ignore = read_text(WEB / ".gitignore")
    checks = []
    for pattern in GITIGNORE_PATTERNS:
        ok = pattern in root_ignore or pattern in web_ignore
        checks.append((f"gitignore pattern: {pattern}", ok, "pattern not found"))
    return checks


def check_package() -> list[tuple[str, bool, str]]:
    package_path = WEB / "package.json"
    try:
        package = json.loads(package_path.read_text(encoding="utf-8"))
    except Exception as exc:
        return [("package.json parse", False, str(exc))]
    scripts = package.get("scripts", {})
    return [
        ("package script: dev", "dev" in scripts, "missing npm run dev"),
        ("package script: build", "build" in scripts, "missing npm run build"),
        ("package script: lint", "lint" in scripts, "missing npm run lint"),
        ("deploy root is frontend/web_app", package_path.parent == WEB, "unexpected web root"),
    ]


def check_secret_patterns() -> list[tuple[str, bool, str]]:
    hits: list[str] = []
    for file_path in iter_text_files(ROOT):
        text = read_text(file_path)
        if not text:
            continue
        for name, pattern in DANGEROUS_PATTERNS:
            if pattern.search(text):
                if file_path == Path(__file__).resolve() and name == "windows_local_path_runtime":
                    continue
                if file_path.name == ".env.example" and name in {"gemini_api_key_value", "supabase_service_role_value", "database_url_value"}:
                    continue
                hits.append(f"{relative(file_path)}:{name}")
    return [("dangerous secret/local-path scan", not hits, "matches: " + ", ".join(hits[:12]))]


def check_large_local_dirs() -> list[tuple[str, bool, str]]:
    checks = []
    for path in [WEB / "node_modules", WEB / ".next", ROOT / "data" / "raw"]:
      ignored = is_ignored_by_gitignore(path)
      if path.exists():
          checks.append((f"local dir ignored: {relative(path)}", ignored, "directory exists and ignore pattern was not detected"))
      else:
          checks.append((f"local dir absent or ignored: {relative(path)}", True, ""))
    return checks


def check_git_tracked_dangerous_files() -> list[tuple[str, bool, str]]:
    if not (ROOT / ".git").exists():
        return [("git tracked dangerous files", True, "not a git repository yet")]
    try:
        result = subprocess.run(["git", "ls-files"], cwd=ROOT, text=True, capture_output=True, check=True)
    except Exception as exc:
        return [("git tracked dangerous files", False, f"git ls-files failed: {exc}")]
    tracked = result.stdout.splitlines()
    dangerous = [
        item
        for item in tracked
        if item.endswith(".env.local")
        or item == ".env"
        or item.startswith("node_modules/")
        or item.startswith("frontend/web_app/.next/")
        or item.startswith("data/raw/")
        or item.endswith(".zip")
    ]
    return [("git tracked dangerous files", not dangerous, "tracked: " + ", ".join(dangerous[:12]))]


def iter_text_files(root: Path):
    for current_root, dirs, files in os.walk(root):
        current = Path(current_root)
        dirs[:] = [name for name in dirs if name not in SKIP_DIRS and not name.endswith("_backup")]
        for name in files:
            path = current / name
            if path.name in {".env", ".env.local"} or path.name.endswith(".local"):
                continue
            if path.suffix.lower() in TEXT_EXTENSIONS or path.name.endswith(".example"):
                yield path


def is_ignored_by_gitignore(path: Path) -> bool:
    root_ignore = read_text(ROOT / ".gitignore")
    rel = relative(path).replace("\\", "/")
    if rel.startswith("frontend/web_app/node_modules") and "node_modules/" in root_ignore:
        return True
    if rel.startswith("frontend/web_app/.next") and ".next/" in root_ignore:
        return True
    if rel.startswith("data/raw") and "data/raw/" in root_ignore:
        return True
    return False


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return ""


def relative(path: Path) -> str:
    try:
        return str(path.relative_to(ROOT))
    except ValueError:
        return str(path)


if __name__ == "__main__":
    sys.exit(main())
