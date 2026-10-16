#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fsociety bridge — expone por WebSocket las herramientas reales del repo.
Ejecuta Trafic.exe y User Scanner.py con stdin/stdout en vivo.

    python bridge/server.py            -> ws://127.0.0.1:8787

Protocolo (JSON):
  cliente -> {type:'hello'} | {type:'adapters'} | {type:'run',tool:'trafic'|'user',argv:[]}
             {type:'input',data:'d\\n'} | {type:'sigint'} | {type:'kill'}
  servidor-> {type:'hello',caps:{...}} | {type:'adapters',list:[...]}
             {type:'out',text:'...'} | {type:'exit',code:0}
"""
import base64, hashlib, json, os, re, signal, socket, struct, subprocess, sys, threading

HOST, PORT = '127.0.0.1', 8787
ROOT = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.dirname(ROOT)
TRAFIC = os.path.join(BASE, 'Trafic.exe')
USERSCANNER = os.path.join(BASE, 'User Scanner.py')
GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'
IS_WIN = sys.platform.startswith('win')


# ----------------------------------------------------------------- frames ---
def handshake(c):
    data = b''
    while b'\r\n\r\n' not in data:
        ch = c.recv(4096)
        if not ch:
            return False
        data += ch
    key = ''
    for line in data.split(b'\r\n\r\n')[0].decode('latin1').split('\r\n'):
        if line.lower().startswith('sec-websocket-key:'):
            key = line.split(':', 1)[1].strip()
    acc = base64.b64encode(hashlib.sha1((key + GUID).encode()).digest()).decode()
    c.send(('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\n'
            'Connection: Upgrade\r\nSec-WebSocket-Accept: ' + acc + '\r\n\r\n').encode())
    return True


def recv_frame(c):
    hdr = c.recv(2)
    if len(hdr) < 2:
        return None, None
    op, masked, ln = hdr[0] & 0x0F, hdr[1] & 0x80, hdr[1] & 0x7F
    if ln == 126:
        ln = struct.unpack('>H', c.recv(2))[0]
    elif ln == 127:
        ln = struct.unpack('>Q', c.recv(8))[0]
    mask = c.recv(4) if masked else b'\x00\x00\x00\x00'
    buf = b''
    while len(buf) < ln:
        ch = c.recv(ln - len(buf))
        if not ch:
            break
        buf += ch
    if masked:
        buf = bytes(b ^ mask[i % 4] for i, b in enumerate(buf))
    return op, buf


def send_frame(c, text):
    data = text.encode('utf-8')
    n = len(data)
    hdr = b'\x81'
    if n < 126:
        hdr += bytes([n])
    elif n < 65536:
        hdr += bytes([126]) + struct.pack('>H', n)
    else:
        hdr += bytes([127]) + struct.pack('>Q', n)
    try:
        c.sendall(hdr + data)
    except Exception:
        pass


# ------------------------------------------------------------- adaptadores ---
def adapters():
    """Enumera adaptadores reales a partir de ipconfig."""
    try:
        out = subprocess.run(['ipconfig'], capture_output=True, text=True,
                             errors='ignore', timeout=6).stdout
    except Exception:
        return []
    res, cur, wifi = [], None, False
    for line in out.splitlines():
        if re.match(r'^(Adaptador|Ethernet adapter|Wireless LAN adapter)', line, re.I):
            cur = {'n': line.split(':', 1)[-1].strip(), 'wifi': bool(re.search(r'wi-?fi|inal', line, re.I))}
        m = re.search(r'(?:IPv4|Direcci[oó]n IPv4)[^:]*:\s*([0-9.]+)', line, re.I)
        if m and cur and not cur.get('ip'):
            cur['ip'] = m.group(1)
        g = re.search(r'(?:Puerta de enlace|Default Gateway)[^:]*:\s*([0-9.]+)', line, re.I)
        if g and cur and not cur.get('gw'):
            cur['gw'] = g.group(1)
        if cur and cur.get('ip') and cur.get('gw'):
            res.append(cur)
            cur = None
    return res


# ------------------------------------------------------------------ runner ---
class Runner:
    def __init__(self, conn):
        self.c = conn
        self.p = None
        self.lock = threading.Lock()

    def send(self, obj):
        send_frame(self.c, json.dumps(obj))

    def stop(self):
        with self.lock:
            if self.p and self.p.poll() is None:
                try:
                    self.p.kill()
                except Exception:
                    pass
            self.p = None

    def start(self, tool, argv):
        self.stop()
        if tool == 'trafic':
            cmd = [TRAFIC]
        elif tool == 'user':
            cmd = [sys.executable, USERSCANNER] + (argv or [])
        else:
            return
        flags = 0
        if IS_WIN:
            flags = 0x08000000 | 0x00000200      # NO_WINDOW | NEW_PROCESS_GROUP
        try:
            self.p = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                      stderr=subprocess.STDOUT, cwd=BASE, bufsize=0,
                                      creationflags=flags)
        except FileNotFoundError:
            self.send({'type': 'out', 'text': '[!] no encontrado: %s\n' % cmd[0]})
            self.send({'type': 'exit', 'code': 127})
            return
        threading.Thread(target=self._reader, args=(self.p,), daemon=True).start()

    def _reader(self, p):
        while True:
            try:
                chunk = os.read(p.stdout.fileno(), 2048)
            except Exception:
                break
            if not chunk:
                break
            self.send({'type': 'out', 'text': chunk.decode('utf-8', 'replace')})
        code = p.wait()
        self.send({'type': 'exit', 'code': code})

    def write(self, data):
        with self.lock:
            if self.p and self.p.stdin:
                try:
                    self.p.stdin.write(data.encode('utf-8'))
                    self.p.stdin.flush()
                except Exception:
                    pass

    def sigint(self):
        if not self.p:
            return
        try:
            if IS_WIN:
                self.p.send_signal(signal.CTRL_BREAK_EVENT)
            else:
                self.p.send_signal(signal.SIGINT)
        except Exception:
            self.stop()


# ------------------------------------------------------------------ cliente ---
def client(conn, addr):
    if not handshake(conn):
        return
    runner = Runner(conn)
    print('  + cliente %s:%s' % addr)
    try:
        while True:
            op, payload = recv_frame(conn)
            if op is None:
                break
            if op == 0x8:
                break
            if op not in (0x1, 0x2):
                continue
            try:
                msg = json.loads(payload.decode('utf-8'))
            except Exception:
                continue
            kind = msg.get('type')
            if kind == 'hello':
                runner.send({'type': 'hello', 'caps': {
                    'trafic': os.path.exists(TRAFIC),
                    'user': os.path.exists(USERSCANNER),
                    'platform': sys.platform}})
            elif kind == 'adapters':
                runner.send({'type': 'adapters', 'list': adapters()})
            elif kind == 'run':
                runner.start(msg.get('tool'), msg.get('argv'))
            elif kind == 'input':
                runner.write(msg.get('data', ''))
            elif kind == 'sigint':
                runner.sigint()
            elif kind == 'kill':
                runner.stop()
    except Exception as e:
        print('  ! %s' % e)
    finally:
        runner.stop()
        try:
            conn.close()
        except Exception:
            pass
        print('  - cliente %s:%s' % addr)


def main():
    srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    srv.bind((HOST, PORT))
    srv.listen(4)
    print('fsociety bridge  ->  ws://%s:%d' % (HOST, PORT))
    print('  Trafic.exe      : %s' % ('OK' if os.path.exists(TRAFIC) else 'no encontrado'))
    print('  User Scanner.py : %s' % ('OK' if os.path.exists(USERSCANNER) else 'no encontrado'))
    while True:
        try:
            conn, addr = srv.accept()
            threading.Thread(target=client, args=(conn, addr), daemon=True).start()
        except KeyboardInterrupt:
            break


if __name__ == '__main__':
    main()