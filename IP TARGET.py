import subprocess
import os
import sys
import time
import socket  # Librería nativa para la resolución de URL a IP

# ============================================================
# 1) CONFIGURACIÓN GLOBAL Y ENTORNO WSL
# ============================================================
RUTA_WSL = "/home/gerardo/geo-recon"

# Códigos de color ANSI de Alta Fidelidad (Tema Cyberpunk/OSINT)
ESC = "\033["
RED = ESC + "38;2;229;32;42m"      # Rojo Neon del script original
GREEN = ESC + "38;2;0;210;90m"     # Verde éxito
WHITE = ESC + "38;2;236;236;236m"   # Blanco brillante
GRAY = ESC + "38;2;128;128;128m"    # Gris informativo
DIM = ESC + "38;2;64;64;64m"       # Gris oscuro para bordes
CYAN = ESC + "38;2;0;180;216m"     # Cyan para submenús
RESET = ESC + "0m"

def init_consola():
    """Habilita el procesamiento de secuencias ANSI en la terminal de Windows 11."""
    if os.name == 'nt':
        os.system("chcp 65001 >nul 2>nul")
        try:
            import ctypes
            kernel = ctypes.windll.kernel32
            kernel.SetConsoleMode(kernel.GetStdHandle(-11), 7)
        except Exception:
            pass

def limpiar_pantalla():
    os.system('cls' if os.name == 'nt' else 'clear')

# ============================================================
# 2) ARTE VISUAL Y DETALLES DEL SISTEMA
# ============================================================
BANNER_ART = [
    r"   ________   ____       ____  ______ ______ ____  _   __",
    r"  / ____/ /  / __ \     / __ \/ ____// ____// __ \/ | / /",
    r" / / __/ /  / / / /    / /_/ / /_   / /    / / / /  |/ / ",
    r"/ /_/ / /___/ /_/ /   / _, _/ __/  / /___ / /_/ / /|  /  ",
    r"\____/_____/\____/___/_/ |_/_/____/\____/ \____/_/ |_/   ",
    r"                /_____/                                  "
]

def mostrar_banner():
    print()
    for linea in BANNER_ART:
        print(RED + linea + RESET)
    
    # Caja de metadatos detallados del sistema puente
    print(DIM + " ┌" + "─" * 56 + "┐" + RESET)
    print(f" {DIM}│{RESET}  {WHITE}SUBSISTEMA EN LÍNEA:{RESET} {GREEN}WSL (Ubuntu/Kali Linux){RESET}   {DIM}│{RESET}")
    print(f" {DIM}│{RESET}  {WHITE}RUTA DEL ENTORNO:{RESET}    {GRAY}{RUTA_WSL:<26}{RESET}  {DIM}│{RESET}")
    print(f" {DIM}│{RESET}  {WHITE}MOTOR DE PROCESO:{RESET}    {CYAN}Python 3 (VirtualEnv){RESET}     {DIM}│{RESET}")
    print(DIM + " └" + "─" * 56 + "┘" + RESET)
    print()

def mostrar_menu_opciones():
    print(f"   {RED}▸{RESET} {WHITE}MENÚ DE OPERACIONES{RESET}")
    print(f"   {DIM}──────────────────────────────────────────{RESET}")
    print(f"  {RED}[1]{RESET} {WHITE}geo-recon{RESET}    {GRAY}· Localizar dirección IP o Dominio web{RESET}")
    print(f"  {RED}[2]{RESET} {WHITE}clear{RESET}        {GRAY}· Reconstruir interfaz de consola{RESET}")
    print(f"  {RED}[3]{RESET} {WHITE}exit{RESET}         {GRAY}· Terminar puentes y salir{RESET}")
    print(f"   {DIM}──────────────────────────────────────────{RESET}")
    print()

# ============================================================
# 3) MOTOR DE EJECUCIÓN CON SUBSISTEMA
# ============================================================
def ejecutar_geo_recon(objetivo):
    """Ejecuta el script de manera segura apuntando al entorno virtual dentro de WSL."""
    comando_wsl = f"cd {RUTA_WSL} && source venv/bin/activate && python3 geo-recon.py {objetivo}"
    
    print(f"   {DIM}┌──────────────────────────────────────────────────┐{RESET}")
    print(f"   {DIM}│{RESET} {CYAN}ESTADO:{RESET} Despachando consulta hacia subproceso...   {DIM}│{RESET}")
    print(f"   {DIM}└──────────────────────────────────────────────────┘{RESET}\n")
    
    subprocess.run(["wsl", "-e", "bash", "-c", comando_wsl])

# ============================================================
# 4) BUCLE PRINCIPAL INTERACTIVO
# ============================================================
def main():
    init_consola()
    limpiar_pantalla()
    
    while True:
        mostrar_banner()
        mostrar_menu_opciones()
        
        try:
            opcion = input(f"   {RED}osint-launcher{GRAY}:~$ {RESET}").strip()
            
            if opcion == '1':
                print(f"\n   {CYAN}🎯 ESPECIFIQUE EL TARGET{RESET}")
                target = input(f"   {GRAY}Introduce IP o Dominio (ej: instagram.com) > {RESET}").strip()
                
                if target:
                    # Limpieza automática por si se escribe http://, https:// o rutas por accidente
                    target_limpio = target.replace("https://", "").replace("http://", "").split("/")[0]
                    
                    # Sistema de resolución DNS automatizado
                    try:
                        print(f"   {GRAY}[*] Consultando DNS para: {target_limpio}...{RESET}")
                        ip_resuelta = socket.gethostbyname(target_limpio)
                        print(f"   {GREEN}[✓] Éxito: Dominio traducido a la IP {ip_resuelta}{RESET}")
                        target_final = ip_resuelta
                    except Exception:
                        # Si falla la traducción, significa que ya era una IP o no hay conexión DNS
                        target_final = target_limpio

                    print(f"\n   {RED}🚀 INICIANDO ESCANEO CONTRA:{RESET} {WHITE}{target_final}{RESET}")
                    print(f"   {DIM}═" * 58 + RESET)
                    
                    ejecutar_geo_recon(target_final)
                    
                    print(f"   {DIM}═" * 58 + RESET)
                    print(f"   {GREEN}[✔] Operación completada con éxito.{RESET}")
                else:
                    print(f"\n   {RED}[!] Error: No especificó una dirección válida.{RESET}")
                
                input(f"\n   {DIM}Presione Enter para regresar al menú principal...{RESET}")
                limpiar_pantalla()
                
            elif opcion == '2' or opcion.lower() == 'clear':
                limpiar_pantalla()
                
            elif opcion == '3' or opcion.lower() in ('exit', 'quit'):
                limpiar_pantalla()
                print(f"\n   {RED}[ Enlace del Lanzador Desconectado ]{RESET}\n")
                break
                
            elif opcion:
                print(f"\n   {RED}[!] '{opcion}' no es un comando reconocido por el entorno.{RESET}")
                time.sleep(1.2)
                limpiar_pantalla()
                
        except KeyboardInterrupt:
            limpiar_pantalla()
            print(f"\n   {RED}[ Interrupción forzada detectada - Cerrando ]{RESET}\n")
            break

if __name__ == "__main__":
    sys.exit(main())
