import socket
import threading


SERVER_HOST = "217.71.129.139"
SERVER_PORT = 6072


def recv_loop(sock):
    while True:
        data = sock.recv(4096)
        if not data:
            break
        text = data.decode(errors="replace").strip()
        if text:
            print(text)


def main():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.connect((SERVER_HOST, SERVER_PORT))
        greeting = s.recv(4096).decode(errors="replace")
        if greeting:
            print(greeting.strip())

        t = threading.Thread(target=recv_loop, args=(s,), daemon=True)
        t.start()

        print("Format: zone|severity|note  (type 'exit' to quit)")
        while True:
            line = input("> ").strip()
            if not line:
                continue
            s.sendall((line + "\n").encode())
            if line.lower() == "exit":
                break


if __name__ == "__main__":
    main()
