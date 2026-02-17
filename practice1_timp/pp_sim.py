import random
import time
import requests
from threading import Thread
from dataclasses import dataclass


@dataclass
class Checkpoint:
    id: int
    location: str


class PPSimulator:
    def __init__(self, server_url="http://localhost:5000"):
        self.checkpoints = [
            Checkpoint(1, "Главный вход"),
            Checkpoint(2, "Запасной вход"),
            Checkpoint(3, "Складская зона"),
        ]
        self.server_url = server_url
        self.running = False
        self.session = requests.Session()
        self.session.trust_env = False

    def simulate_worker(self):
        time.sleep(2)
        while self.running:
            cp = random.choice(self.checkpoints)
            emp_id = random.choice([100, 101, 102])

            print(f"[КПП-{cp.id}] Сотрудник {emp_id} пытается пройти")

            try:
                response = self.session.get(
                    f"{self.server_url}/api/access/{emp_id}/{cp.id}",
                    timeout=3,
                )
                content_type = response.headers.get("Content-Type", "")
                if "application/json" not in content_type:
                    print(
                        f"[КПП-{cp.id}] Ошибка: неверный ответ сервера "
                        f"({response.status_code})"
                    )
                    text = response.text.strip()
                    if text:
                        print(f"[КПП-{cp.id}] Ответ: {text[:200]}")
                    continue

                try:
                    data = response.json()
                except ValueError:
                    print(
                        f"[КПП-{cp.id}] Ошибка: JSON не распарсился "
                        f"({response.status_code})"
                    )
                    text = response.text.strip()
                    if text:
                        print(f"[КПП-{cp.id}] Ответ: {text[:200]}")
                    continue

                if data["access"]:
                    print(f"[КПП-{cp.id}] Доступ разрешен")
                else:
                    print(f"[КПП-{cp.id}] !!!ДОСТУП ЗАПРЕЩЕН!!! {emp_id}")

            except Exception as exc:
                print(f"[КПП-{cp.id}] Ошибка: {str(exc)}")

            time.sleep(random.uniform(3, 6))

    def start(self):
        self.running = True
        Thread(target=self.simulate_worker, daemon=True).start()
        print("Симулятор запущен. Нажмите Ctrl+C для остановки.")

    def stop(self):
        self.running = False


if __name__ == "__main__":
    simulator = PPSimulator()
    simulator.start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        simulator.stop()
        print("\nСимулятор остановлен")
