#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""Interfaz en español para el módulo ``user_scanner``."""

# ============================================================
# 1) CONFIGURACIÓN GLOBAL
# ============================================================

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import threading
import time

APP = "userscanner"
VERSION = "3.4"
MODULE = "user_scanner"
WIDTH = 72
CAT_ORDER = [
    "Social",
    "Dev",
    "Gaming",
    "Music",
    "Video",
    "Finance",
    "Learning",
    "Forum",
    "Otros",
]

ESC = "\033["
RED = WHITE = GRAY = DIM = GREEN = RESET = ""
UNICODE = True
ANIM = True

# ============================================================
# 2) UTILIDADES DE TERMINAL Y ANSI
# ============================================================


def _vt():
    if os.name != "nt":
        return
    try:
        os.system("")
        kernel = __import__("ctypes").windll.kernel32
        kernel.SetConsoleMode(kernel.GetStdHandle(-11), 7)
    except Exception:
        pass


def init_ansi():
    global RED, WHITE, GRAY, DIM, GREEN, RESET, UNICODE, ANIM
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stdin.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

    UNICODE = "utf" in (sys.stdout.encoding or "").lower()
    if not sys.stdout.isatty():
        ANIM = False
    if os.environ.get("NO_COLOR"):
        return

    _vt()
    if os.name == "nt":
        os.system("chcp 65001 >nul 2>nul")
        os.system("title userscanner")

    RED = ESC + "38;2;229;32;42m"
    WHITE = ESC + "38;2;236;236;236m"
    GRAY = ESC + "38;2;128;128;128m"
    DIM = ESC + "38;2;64;64;64m"
    GREEN = ESC + "38;2;0;210;90m"
    RESET = ESC + "0m"


def clear():
    os.system("cls" if os.name == "nt" else "clear")


def pad(text, width):
    return (text + " " * width)[:width]


def rule():
    width = min(WIDTH, max(40, shutil.get_terminal_size((72, 24)).columns - 10))
    print("   " + DIM + ("─" if UNICODE else "-") * width + RESET)


def row(key, command, description):
    print(
        "  "
        + RED
        + key
        + RESET
        + "  "
        + WHITE
        + pad(command, 14)
        + RESET
        + GRAY
        + description
        + RESET
    )


def head(tag, target):
    print()
    print("   " + RED + "▸ " + WHITE + tag + RESET + "   " + DIM + target + RESET)
    rule()


def read(prompt_text):
    try:
        return input(prompt_text).strip()
    except EOFError:
        return "3"


def _getch():
    if not sys.stdin.isatty():
        try:
            input()
        except EOFError:
            pass
        return

    if os.name == "nt":
        import msvcrt

        msvcrt.getch()
        return

    import termios
    import tty

    fd = sys.stdin.fileno()
    old = termios.tcgetattr(fd)
    try:
        tty.setraw(fd)
        sys.stdin.read(1)
    finally:
        termios.tcsetattr(fd, termios.TCSADRAIN, old)


def wait_key(message="Presiona cualquier tecla"):
    print()
    sys.stdout.write("   " + DIM + message + " ..." + RESET)
    sys.stdout.flush()
    _getch()

# ============================================================
# 3) INTERFAZ Y BANNER
# ============================================================

SPIN = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]


class Spinner(threading.Thread):
    def __init__(self, label):
        super().__init__(daemon=True)
        self.label = label
        self._stop_event = threading.Event()

    def run(self):
        frames = SPIN if UNICODE else ["|", "/", "-", "\\"]
        index = 0
        while not self._stop_event.is_set():
            sys.stdout.write(
                "\r   "
                + RED
                + frames[index % len(frames)]
                + RESET
                + " "
                + GRAY
                + self.label
                + " ..."
                + RESET
                + "   "
            )
            sys.stdout.flush()
            time.sleep(0.08)
            index += 1
        sys.stdout.write("\r" + " " * 78 + "\r")
        sys.stdout.flush()

    def stop(self):
        self._stop_event.set()
        self.join()


ART = [
    "██╗   ██╗███████╗███████╗██████╗   ███████╗ ██████╗ █████╗ ███╗   ██╗███╗   ██╗███████╗██████╗ ",
    "██║   ██║██╔════╝██╔════╝██╔══██╗  ██╔════╝██╔════╝██╔══██╗████╗  ██║████╗  ██║██╔════╝██╔══██╗",
    "██║   ██║███████╗█████╗  ██████╔╝  ███████╗██║     ███████║██╔██╗ ██║██╔██╗ ██║█████╗  ██████╔╝",
    "██║   ██║╚════██║██╔══╝  ██╔══██╗  ╚════██║██║     ██╔══██║██║╚██╗██║██║╚██╗██║██╔══╝  ██╔══██╗",
    "╚██████╔╝███████║███████╗██║  ██║  ███████║╚██████╗██║  ██║██║ ╚████║██║ ╚████║███████╗██║  ██║",
    " ╚═════╝ ╚══════╝╚══════╝╚═╝  ╚═╝  ╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝",
]


def art(animated=False):
    clear()
    print()
    for line in ART:
        if animated and ANIM:
            for index in range(1, len(line) + 1):
                sys.stdout.write("\r   " + RED + line[:index] + RESET)
                sys.stdout.flush()
                time.sleep(0.0022)
            print()
        else:
            print("   " + RED + line + RESET)
    print()


def row(key, command, description):
    print(
        "  "
        + RED
        + key
        + RESET
        + "  "
        + WHITE
        + pad(command, 14)
        + RESET
        + GRAY
        + description
        + RESET
    )


def head(tag, target):
    print()
    print("   " + RED + "▸ " + WHITE + tag + RESET + "   " + DIM + target + RESET)
    rule()


def menu_block():
    rule()
    row("[1]", "usuario", "escanear nombre")
    row("[2]", "correo", "escanear email")
    row("[3]", "salir", "")
    rule()


def banner():
    art(False)
    menu_block()


def prompt():
    return "   " + RED + APP + GRAY + ":~$ " + RESET


def intro():
    art(True)
    for label in ("cargando módulos osint", "detectando interfaz de red", "listo"):
        if ANIM:
            frames = SPIN if UNICODE else ["|", "/", "-", "\\"]
            for frame in frames:
                sys.stdout.write("\r   " + RED + frame + RESET + " " + GRAY + label + RESET)
                sys.stdout.flush()
                time.sleep(0.05)
        print("\r   " + GREEN + ("✓" if UNICODE else "+") + RESET + " " + WHITE + label + RESET + "   ")
    print()
    menu_block()

# ============================================================
# 4) EXPRESIONES REGULARES Y PARSER DE SALIDA
# ============================================================

ANSI = re.compile(r"\x1b\[[0-?]*[ -/]*[@-~]")
CAT_RE = re.compile(r"^\s*=+\s*(.+?)\s*=+\s*$")
FOUND_RE = re.compile(r"\b(found|registered|exists|success)\b", re.IGNORECASE)
NOT_FOUND_RE = re.compile(
    r"\b(not\s+found|not\s+registered|unregistered|does(?:n't| not)\s+exist|"
    r"error|failed|timeout|invalid)\b",
    re.IGNORECASE,
)


def parse(text):
    entries = []
    category = "Otros"
    current = None
    for raw in text.splitlines():
        line = ANSI.sub("", raw).rstrip()
        match = CAT_RE.match(line)
        if match and "CHECK" not in match.group(1).upper():
            category = match.group(1).replace("SITES", "").replace("MODULES", "").strip().title()
            continue

        marker = re.match(
            r"^\s*(?:\[(?:✔|✓|\+|FOUND|OK)\]|(?:✔|✓|\+))\s*(.+)$",
            line,
            re.IGNORECASE,
        )
        if marker or FOUND_RE.search(line) or re.search(r"https?://[^\s\]]+", line):
            if NOT_FOUND_RE.search(line):
                current = None
                continue
            rest = marker.group(1).strip() if marker else line.strip()
            if re.search(r"\b(checking|searching|scanning|results?)\b", rest, re.I):
                current = None
                continue
            url_match = re.search(r"https?://[^\s\]]+", rest)
            url = url_match.group(0) if url_match else ""
            rest = re.sub(r"\s*\[?https?://[^\s\]]+\]?", "", rest).strip()
            rest = re.sub(
                r"[\s:|-]*\b(Found|Registered|Exists|Success)\b[\s.!]*$",
                "",
                rest,
                flags=re.IGNORECASE,
            ).strip()
            rest = re.sub(
                r"^\s*\b(Found|Registered|Exists|Success)\b[\s:|-]*",
                "",
                rest,
                flags=re.IGNORECASE,
            ).strip()
            rest = re.sub(r"\s*\([^()]*\)\s*$", "", rest).strip().rstrip(" :-")
            if ":" in rest:
                name, detail = rest.split(":", 1)
                if not detail.strip() or FOUND_RE.search(detail):
                    rest = name.strip()
            if not rest:
                current = None
                continue
            current = {"site_name": rest, "url": url, "category": category, "extra": {}}
            entries.append(current)
            continue

        if current is not None and ("├──" in line or "└──" in line):
            part = line.split("──", 1)[-1].strip()
            if ":" in part:
                key, value = part.split(":", 1)
                current["extra"][key.strip()] = value.strip()
    return entries

# ============================================================
# 5) EJECUCIÓN DEL ESCANEO
# ============================================================


def child_env():
    environment = os.environ.copy()
    environment["PYTHONIOENCODING"] = "utf-8"
    environment["PYTHONUTF8"] = "1"
    return environment


def _run(command, label):
    spinner = Spinner(label)
    spinner.start()
    try:
        return subprocess.run(
            command,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            env=child_env(),
        )
    finally:
        spinner.stop()


def _python_commands():
    commands = []
    python = shutil.which("python")
    if python:
        commands.append(python)
    if sys.executable not in commands:
        commands.append(sys.executable)
    return commands


def run_scan(kind, value):
    flag = "-u" if kind == "user" else "-e"
    errors = []
    for python in _python_commands():
        try:
            process = _run([python, "-m", MODULE, flag, value], f"escaneando {value}")
        except FileNotFoundError:
            continue
        output = "\n".join(part for part in (process.stdout, process.stderr) if part)
        if process.returncode == 0:
            return output
        if output:
            errors.append(output)
    return "\n".join(errors) if errors else None


def run_user_scan(value):
    report_fd, report_path = tempfile.mkstemp(prefix="userscanner_", suffix=".json")
    os.close(report_fd)
    errors = []
    try:
        for python in _python_commands():
            command = [
                python,
                "-m",
                MODULE,
                "-u",
                value,
                "-f",
                "json",
                "-o",
                report_path,
            ]
            try:
                os.unlink(report_path)
            except FileNotFoundError:
                pass
            try:
                process = _run(command, f"escaneando {value}")
            except FileNotFoundError:
                continue
            output = "\n".join(part for part in (process.stdout, process.stderr) if part)
            if process.returncode == 0:
                results = _read_user_report(report_path)
                if results is not None:
                    return results
                return output
            if output:
                errors.append(output)
    finally:
        try:
            os.unlink(report_path)
        except FileNotFoundError:
            pass

    if errors:
        clean_error = ANSI.sub("", errors[-1]).strip().splitlines()
        detail = clean_error[-1] if clean_error else "error desconocido"
        print(
            "   "
            + RED
            + "[!]"
            + GRAY
            + " user_scanner no pudo completar la búsqueda: "
            + detail
            + RESET
        )
    else:
        print("   " + RED + "[!]" + GRAY + " no se encontró un intérprete de Python disponible." + RESET)
    return None

# ============================================================
# 6) PARSING DE REPORTES JSON Y FORMATOS DE SALIDA
# ============================================================

RESULT_FIELDS = {
    "site_name",
    "site",
    "name",
    "url",
    "profile_url",
    "category",
    "status",
    "found",
    "exists",
    "extra",
    "media",
    "details",
}


def _is_found(item):
    status = str(item.get("status", "")).strip().lower()
    if status:
        return status in {"found", "registered", "exists", "success", "true"}
    for key in ("found", "exists"):
        value = item.get(key)
        if isinstance(value, bool):
            return value
        if str(value).strip().lower() in {"true", "yes", "1"}:
            return True
    return bool(item.get("url") or item.get("profile_url"))


def _flatten_details(value, prefix="", output=None):
    """Convierte metadatos anidados en pares imprimibles sin perder campos."""
    if output is None:
        output = {}
    if isinstance(value, dict):
        for key, child in value.items():
            name = f"{prefix}.{key}" if prefix else str(key)
            _flatten_details(child, name, output)
    elif isinstance(value, (list, tuple, set)):
        if value:
            output[prefix] = ", ".join(
                json.dumps(item, ensure_ascii=False) if isinstance(item, (dict, list)) else str(item)
                for item in value
            )
    elif value not in (None, "") and prefix:
        output[prefix] = value
    return output


def _read_user_report(path):
    try:
        with open(path, "r", encoding="utf-8") as report:
            data = json.load(report)
    except (OSError, json.JSONDecodeError):
        return None

    if isinstance(data, dict):
        for key in ("results", "sites", "data"):
            if isinstance(data.get(key), list):
                data = data[key]
                break
        else:
            # Algunas versiones exportan un objeto indexado por nombre de sitio.
            data = [
                {"site_name": site_name, **item}
                for site_name, item in data.items()
                if isinstance(item, dict)
            ]
    if not isinstance(data, list):
        return None

    hits = []
    for item in data:
        if not isinstance(item, dict) or not _is_found(item):
            continue

        details = {}
        for section in ("extra", "media", "details"):
            _flatten_details(item.get(section), output=details)
        # Conserva también datos que el motor coloque en el nivel superior.
        for key, value in item.items():
            if key not in RESULT_FIELDS:
                _flatten_details(value, str(key), details)

        hits.append(
            {
                "site_name": str(item.get("site_name") or item.get("site") or item.get("name") or "Sitio"),
                "url": str(item.get("url") or item.get("profile_url") or ""),
                "category": str(item.get("category") or "Otros").title(),
                "extra": details,
            }
        )
    return hits


def _cat_key(category):
    return CAT_ORDER.index(category) if category in CAT_ORDER else len(CAT_ORDER)


def _format_value(value):
    if isinstance(value, bool):
        return "sí" if value else "no"
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False)
    return str(value)


def render(text, value):
    print()
    if text is None:
        print("   " + RED + "[!]" + GRAY + " no se pudo ejecutar el módulo." + RESET)
        return

    hits = text if isinstance(text, list) else parse(text)
    if not hits:
        print("   " + GRAY + "sin coincidencias para '" + value + "'" + RESET)
        return

    groups = {}
    for result in hits:
        groups.setdefault(result["category"], []).append(result)

    width = min(max((len(result["site_name"]) for result in hits), default=10), 22)
    for category in sorted(groups, key=_cat_key):
        items = sorted(groups[category], key=lambda item: item["site_name"].lower())
        print(
            "   "
            + RED
            + "▸ "
            + WHITE
            + category.upper()
            + RESET
            + "  "
            + DIM
            + "· "
            + str(len(items))
            + RESET
        )
        for result in items:
            print(
                "     "
                + GREEN
                + "✓"
                + RESET
                + " "
                + WHITE
                + pad(result["site_name"], width)
                + RESET
                + " "
                + GRAY
                + (result["url"] or "cuenta encontrada")
                + RESET
            )
            # Imprime cada dato disponible, no solo una selección de tres.
            for key, detail in result.get("extra", {}).items():
                if detail not in (None, "", {}, []):
                    print("       " + DIM + "├── " + str(key) + ": " + _format_value(detail) + RESET)
        print()

    rule()
    print("   " + GREEN + "[ ok ]" + GRAY + " " + str(len(hits)) + " coincidencias" + RESET)

# ============================================================
# 7) MENU DE INTERACCIÓN Y CLI
# ============================================================


def scan(kind, value):
    label = "usuario" if kind == "user" else "correo"
    head("ESCANEO · " + label, "TARGET: " + value)
    render(run_user_scan(value) if kind == "user" else run_scan(kind, value), value)
    wait_key()


def parse_args(argv):
    parser = argparse.ArgumentParser(prog=APP, description="OSINT · usuario / correo")
    parser.add_argument("-u", "--user", metavar="NOMBRE", help="escanear nombre de usuario")
    parser.add_argument("-e", "--email", metavar="CORREO", help="escanear correo")
    parser.add_argument("--no-intro", action="store_true", help="sin animación de arranque")
    parser.add_argument("--no-anim", action="store_true", help="sin animación")
    parser.add_argument("-v", "--version", action="version", version=f"{APP} {VERSION}")
    return parser.parse_args(argv)


def menu(first=False):
    while True:
        if first:
            first = False
        else:
            banner()
        option = read(prompt()).lower()
        if option == "1":
            value = read("   " + GRAY + "usuario> " + RESET)
            if value:
                scan("user", value)
        elif option == "2":
            value = read("   " + GRAY + "correo> " + RESET)
            if value:
                scan("email", value)
        elif option in ("3", "exit", "quit", "q"):
            clear()
            print("\n   " + RED + "[ conexión finalizada ]" + RESET + "\n")
            return
        elif option:
            print("\n   " + RED + "[!]" + GRAY + " '" + option + "' no es válido." + RESET)
            time.sleep(0.6)


def main(argv=None):
    global ANIM
    args = parse_args(argv)
    init_ansi()
    if args.no_anim:
        ANIM = False
    try:
        if args.user or args.email:
            if not args.no_intro:
                intro()
            if args.user:
                scan("user", args.user)
            if args.email:
                scan("email", args.email)
            return 0
        if args.no_intro:
            menu()
        else:
            intro()
            menu(first=True)
        return 0
    except KeyboardInterrupt:
        print("\n   " + RED + "[ interrumpido ]" + RESET)
        return 130


if __name__ == "__main__":
    sys.exit(main())
