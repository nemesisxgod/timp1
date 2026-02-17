import socket
import threading
from datetime import datetime


HOST = "0.0.0.0"
PORT = 5353
LOG_PATH = "server.log"

clients_lock = threading.Lock()
clients = set()


def now_str():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def log_line(text):
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(text + "\n")


def broadcast(message):
    dead = []
    with clients_lock:
        for c in clients:
            try:
                c.sendall(message.encode())
            except OSError:
                dead.append(c)
        for c in dead:
            clients.discard(c)


def handle_client(conn, addr):
    with conn:
        with clients_lock:
            clients.add(conn)
        connect_msg = f"{now_str()} CONNECT {addr[0]}:{addr[1]}"
        print(connect_msg)
        log_line(connect_msg)
        conn.sendall(b"CONNECTED. Send lines as 'zone|severity|note'. Type 'exit' to close.\n")
        buf = b""
        while True:
            data = conn.recv(4096)
            if not data:
                break
            buf += data
            while b"\n" in buf:
                line, buf = buf.split(b"\n", 1)
                text = line.decode(errors="replace").strip()
                if not text:
                    continue
                if text.lower() == "exit":
                    conn.sendall(b"BYE\n")
                    return
                stamp = now_str()
                entry = f"{stamp} {addr[0]}:{addr[1]} :: {text}"
                log_line(entry)
                broadcast(f"ACK {entry}\n")


def main():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        s.bind((HOST, PORT))
        s.listen()
        print(f"Server listening on {HOST}:{PORT}")
        while True:
            conn, addr = s.accept()
            t = threading.Thread(target=handle_client, args=(conn, addr), daemon=True)
            t.start()


if __name__ == "__main__":
    main()
