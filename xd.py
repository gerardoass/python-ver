import os

print("¿Cómo quieres jugar cuando seas grande: como Neymar o de otra forma?")

print(" ")

print("¿Neymar o no?")
print("")

respuesta = input("Neymar u otro: ").strip()

videos = {
    "neymar": "https://www.youtube.com/watch?v=JGwWNGJdvx8",
    "otro": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}

if respuesta.lower() == "neymar":
    print("")
    print("¡Qué pro! Aquí tienes un video de Neymar")
    os.startfile(videos["neymar"])

elif respuesta.lower() == "otro":
    print("")
    print("Entonces te dejo otro video")
    os.startfile(videos["otro"])

else:
    print("")
    print("No entendí la respuesta, pero aquí va otro video")
    os.startfile(videos["otro"])
