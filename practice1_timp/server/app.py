from flask import Flask, jsonify, request
from waitress import serve
from threading import Thread
import time
import os
from .database import db
from typing import Dict, List, Optional, Tuple

app = Flask(__name__)
should_exit = False


def _json_error(message: str, status_code: int):
    return jsonify({"status": "error", "message": message}), status_code


def _parse_employee_payload() -> Tuple[Optional[Dict], Optional[Tuple]]:
    if not request.is_json:
        return None, _json_error("Ожидается JSON", 400)
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return None, _json_error("Некорректный JSON", 400)

    for key in ("id", "name", "allowed_checkpoints"):
        if key not in data:
            return None, _json_error(f"Поле '{key}' обязательно", 400)

    if not isinstance(data["id"], int):
        return None, _json_error("Поле 'id' должно быть целым числом", 400)
    if not isinstance(data["name"], str) or not data["name"].strip():
        return None, _json_error("Поле 'name' должно быть непустой строкой", 400)

    checkpoints = data["allowed_checkpoints"]
    if not isinstance(checkpoints, list) or not all(isinstance(cp, int) for cp in checkpoints):
        return None, _json_error(
            "Поле 'allowed_checkpoints' должно быть списком целых чисел",
            400,
        )

    return data, None


def _parse_checkpoints_payload() -> Tuple[Optional[List[int]], Optional[Tuple]]:
    if not request.is_json:
        return None, _json_error("Ожидается JSON", 400)
    data = request.get_json(silent=True)
    if not isinstance(data, dict) or "allowed_checkpoints" not in data:
        return None, _json_error("Поле 'allowed_checkpoints' обязательно", 400)
    checkpoints = data["allowed_checkpoints"]
    if not isinstance(checkpoints, list) or not all(isinstance(cp, int) for cp in checkpoints):
        return None, _json_error(
            "Поле 'allowed_checkpoints' должно быть списком целых чисел",
            400,
        )
    return checkpoints, None


@app.route("/api/access/<int:emp_id>/<int:cp_id>", methods=["GET"])
def check_access(emp_id: int, cp_id: int) -> Dict:
    employee = db.get_employee(emp_id)
    checkpoint = db.get_checkpoint(cp_id)

    if not employee or not checkpoint:
        return jsonify({"access": False, "message": "Данные не найдены"}), 404

    allowed = checkpoint.id in employee.allowed_checkpoints
    db.log_incident(emp_id, checkpoint.id, allowed)

    if not allowed:
        db.add_notification(f"Отказ в доступе! Сотр. {emp_id} на КПП-{checkpoint.id}")

    return jsonify(
        {
            "access": allowed,
            "message": "Доступ разрешен" if allowed else "Доступ запрещен",
        }
    )


@app.route("/api/incidents", methods=["GET"])
def get_incidents() -> List[Dict]:
    limit = request.args.get("limit", type=int)
    if limit is not None and limit <= 0:
        return _json_error("limit должен быть положительным числом", 400)

    incidents = db.get_incidents(limit)
    return jsonify(
        [
            {
                "employee_id": i.employee_id,
                "checkpoint_id": i.checkpoint_id,
                "access_granted": i.access_granted,
                "timestamp": i.timestamp,
            }
            for i in incidents
        ]
    )


@app.route("/api/checkpoints", methods=["GET"])
def get_checkpoints() -> List[Dict]:
    checkpoints = db.get_all_checkpoints()
    return jsonify(
        [{"id": c.id, "location": c.location} for c in checkpoints.values()]
    )


@app.route("/api/employees", methods=["GET", "POST"])
def manage_employees():
    if request.method == "GET":
        employees = db.get_all_employees()
        return jsonify(
            [
                {
                    "id": e.id,
                    "name": e.name,
                    "allowed_checkpoints": e.allowed_checkpoints,
                }
                for e in employees.values()
            ]
        )

    data, error = _parse_employee_payload()
    if error:
        return error

    if db.get_employee(data["id"]):
        return _json_error("Сотрудник уже существует", 409)

    result = db.add_employee(
        data["id"],
        data["name"],
        data["allowed_checkpoints"],
    )
    status_code = 201 if result["status"] == "success" else 400
    return jsonify(result), status_code


@app.route("/api/employees/<int:emp_id>", methods=["PUT", "DELETE"])
def manage_employee(emp_id: int):
    if request.method == "PUT":
        checkpoints, error = _parse_checkpoints_payload()
        if error:
            return error
        if not db.get_employee(emp_id):
            return _json_error("Сотрудник не найден", 404)
        result = db.update_employee(emp_id, checkpoints)
        status_code = 200 if result["status"] == "success" else 400
        return jsonify(result), status_code

    if not db.get_employee(emp_id):
        return _json_error("Сотрудник не найден", 404)
    result = db.delete_employee(emp_id)
    return jsonify(result)


@app.route("/api/notifications", methods=["GET"])
def get_notifications() -> List[Dict]:
    notifications = db.get_unread_notifications()
    return jsonify(
        [{"message": n.message, "timestamp": n.timestamp} for n in notifications]
    )


def run_guard_interface():
    global should_exit
    while not should_exit:
        time.sleep(1)
        print("\n=== ПУЛЬТ ОХРАНЫ ===")
        print("1. Посмотреть инциденты")
        print("2. Список сотрудников")
        print("3. Добавить сотрудника")
        print("4. Изменить права доступа")
        print("5. Удалить сотрудника")
        print("6. Проверить уведомления")
        print("0. Выход")

        try:
            choice = input("Выберите действие: ")

            if choice == "1":
                incidents = db.get_incidents(10)
                print("\nПоследние инциденты:")
                for i in incidents:
                    status = "РАЗРЕШЕНО" if i.access_granted else "ОТКАЗ"
                    print(f"КПП-{i.checkpoint_id} | Сотр. {i.employee_id} | {status}")

            elif choice == "2":
                employees = db.get_all_employees()
                print("\nСотрудники:")
                for e in employees.values():
                    print(f"ID: {e.id} | {e.name} | Доступ: {e.allowed_checkpoints}")

            elif choice == "3":
                try:
                    emp_id = int(input("ID нового сотрудника: "))
                    name = input("ФИО: ")
                    checkpoints = list(
                        map(
                            int,
                            input("Доступные КПП (через пробел): ").split(),
                        )
                    )
                    result = db.add_employee(emp_id, name, checkpoints)
                    print(f"\n{result['message']}")
                except ValueError:
                    print("\nОшибка: неверный формат данных")

            elif choice == "4":
                try:
                    emp_id = int(input("ID сотрудника: "))
                    checkpoints = list(
                        map(
                            int,
                            input("Новые доступные КПП (через пробел): ").split(),
                        )
                    )
                    result = db.update_employee(emp_id, checkpoints)
                    print(f"\n{result['message']}")
                except ValueError:
                    print("\nОшибка: неверный формат данных")

            elif choice == "5":
                try:
                    emp_id = int(input("ID сотрудника для удаления: "))
                    result = db.delete_employee(emp_id)
                    print(f"\n{result['message']}")
                except ValueError:
                    print("\nОшибка: ID должен быть числом")

            elif choice == "6":
                notifications = db.get_unread_notifications()
                if notifications:
                    print("\nНОВЫЕ УВЕДОМЛЕНИЯ:")
                    for n in notifications:
                        print(f"! {n.message} ({n.timestamp})")
                else:
                    print("\nУведомлений нет")

            elif choice == "0":
                should_exit = True
                os._exit(0)

            time.sleep(1)

        except Exception as exc:
            print(f"\nПроизошла ошибка: {str(exc)}")
            time.sleep(2)


def run_server():
    Thread(target=run_guard_interface, daemon=True).start()
    serve(app, host="0.0.0.0", port=5000)


if __name__ == "__main__":
    run_server()
