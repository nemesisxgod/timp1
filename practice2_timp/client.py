import socket
import threading


SERVER_HOST = "217.71.129.139"
SERVER_PORT = 6015
ALLOWED_SEVERITIES = {"low", "medium", "high"}


def recv_loop(sock):
    while True:
        data = sock.recv(4096)
        if not data:
            break
        text = data.decode(errors="replace").strip()
        if text:
            print(text)


def validate_input_line(line: str):
    parts = [part.strip() for part in line.split("|")]
    if len(parts) != 3:
        return False, "Неверный формат. Используйте: zone|severity|note"

    zone, severity, note = parts
    if not zone:
        return False, "Поле zone не должно быть пустым"
    if not severity:
        return False, "Поле severity не должно быть пустым"
    if severity.lower() not in ALLOWED_SEVERITIES:
        allowed = ", ".join(sorted(ALLOWED_SEVERITIES))
        return False, f"Поле severity должно быть одним из: {allowed}"
    if not note:
        return False, "Поле note не должно быть пустым"

    return True, ""


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
            if line.lower() == "exit":
                s.sendall((line + "\n").encode())
                break
            is_valid, error = validate_input_line(line)
            if not is_valid:
                print(f"Ошибка: {error}")
                continue
            s.sendall((line + "\n").encode())


if __name__ == "__main__":
    main()
