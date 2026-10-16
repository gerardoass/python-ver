import os
import subprocess

def limpiar_pantalla():
    os.system('cls' if os.name == 'nt' else 'clear')

def mostrar_banner():
    limpiar_pantalla()
    print("=" * 60)
    print(r"  _  _ _  _ ____ _  _    ____ ____ ____ _  _ ____ ____ ")
    print(r"  |__| |__| [__  |_[X     [__  |    |__| |\ | |___ |__/ ")
    print(r"  |  | |  | ___] |  \_    ___] |___ |  | | \| |___ |  \ ")
    print("=" * 60)
    print("          HERRAMIENTA DE OSINT - MENÚ PERSONALIZADO")
    print("=" * 60)

def menu():
    while True:
        mostrar_banner()
        print("\n[1] Escanear nombre de usuario")
        print("[2] Escanear correo electrónico")
        print("[3] Salir")
        
        opcion = input("\nSelecciona una opción (1-3): ").strip()
        
        if opcion == "1":
            usuario = input("Ingresa el usuario a buscar: ").strip()
            subprocess.run(["python", "-m", "user_scanner", "-u", usuario])
            input("\nPresiona Enter para continuar...")
        elif opcion == "2":
            correo = input("Ingresa el correo a buscar: ").strip()
            subprocess.run(["python", "-m", "user_scanner", "-e", correo])
            input("\nPresiona Enter para continuar...")
        elif opcion == "3":
            print("Saliendo...")
            break
        else:
            input("Opción no válida. Presiona Enter para intentar de nuevo...")

if __name__ == "__main__":
    menu()