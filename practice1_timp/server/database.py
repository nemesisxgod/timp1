from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional


@dataclass
class Employee:
    id: int
    name: str
    allowed_checkpoints: List[int]


@dataclass
class Checkpoint:
    id: int
    location: str


@dataclass
class Incident:
    employee_id: int
    checkpoint_id: int
    access_granted: bool
    timestamp: str


@dataclass
class Notification:
    message: str
    timestamp: str
    viewed: bool


_employees: Dict[int, Employee] = {
    100: Employee(100, "Иван Иванов", [1, 2]),
    101: Employee(101, "Петр Петров", [1, 3]),
    102: Employee(102, "Сидор Сидоров", [2]),
}

_checkpoints: Dict[int, Checkpoint] = {
    1: Checkpoint(1, "Главный вход"),
    2: Checkpoint(2, "Запасной вход"),
    3: Checkpoint(3, "Складская зона"),
}

_incidents: List[Incident] = []
_notifications: List[Notification] = []


def _now_str() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


class Database:
    def get_employee(self, employee_id: int) -> Optional[Employee]:
        return _employees.get(employee_id)

    def get_checkpoint(self, checkpoint_id: int) -> Optional[Checkpoint]:
        return _checkpoints.get(checkpoint_id)

    def get_all_employees(self) -> Dict[int, Employee]:
        return _employees.copy()

    def get_all_checkpoints(self) -> Dict[int, Checkpoint]:
        return _checkpoints.copy()

    def log_incident(self, employee_id: int, checkpoint_id: int, access_granted: bool) -> Incident:
        incident = Incident(
            employee_id=employee_id,
            checkpoint_id=checkpoint_id,
            access_granted=access_granted,
            timestamp=_now_str(),
        )
        _incidents.append(incident)
        return incident

    def get_incidents(self, limit: Optional[int] = None) -> List[Incident]:
        return _incidents[-limit:] if limit else _incidents.copy()

    def add_employee(self, emp_id: int, name: str, allowed_checkpoints: List[int]) -> Dict[str, str]:
        invalid_pp = [pp for pp in allowed_checkpoints if pp not in _checkpoints]
        if invalid_pp:
            return {
                "status": "error",
                "message": (
                    "Несуществующие КПП: "
                    f"{invalid_pp}. Доступные КПП: {list(_checkpoints.keys())}"
                ),
            }

        if emp_id in _employees:
            return {"status": "error", "message": "Сотрудник уже существует"}

        _employees[emp_id] = Employee(emp_id, name, allowed_checkpoints)
        return {"status": "success", "message": "Сотрудник успешно добавлен"}

    def update_employee(self, emp_id: int, new_checkpoints: List[int]) -> Dict[str, str]:
        if emp_id not in _employees:
            return {"status": "error", "message": "Сотрудник не найден"}
        invalid_pp = [pp for pp in new_checkpoints if pp not in _checkpoints]
        if invalid_pp:
            return {
                "status": "error",
                "message": (
                    "Несуществующие КПП: "
                    f"{invalid_pp}. Доступные КПП: {list(_checkpoints.keys())}"
                ),
            }
        _employees[emp_id].allowed_checkpoints = new_checkpoints
        return {"status": "success", "message": "Права доступа обновлены"}

    def delete_employee(self, emp_id: int) -> Dict[str, str]:
        if emp_id not in _employees:
            return {"status": "error", "message": "Сотрудник не найден"}
        del _employees[emp_id]
        return {"status": "success", "message": "Сотрудник удален"}

    def add_notification(self, message: str) -> Notification:
        notification = Notification(
            message=message,
            timestamp=_now_str(),
            viewed=False,
        )
        _notifications.append(notification)
        return notification

    def get_unread_notifications(self) -> List[Notification]:
        unread = [n for n in _notifications if not n.viewed]
        for n in unread:
            n.viewed = True
        return unread

    def get_all_notifications(self) -> List[Notification]:
        return _notifications.copy()


db = Database()
