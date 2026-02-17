import re
import uuid
from datetime import datetime, timezone
from pathlib import Path

import bcrypt
from flask import Blueprint, jsonify, request, send_from_directory
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    get_jwt,
    get_jwt_identity,
    jwt_required,
)
from werkzeug.utils import secure_filename

from .extensions import db
from .models import User, VerificationLog, VerificationRequest
from .schemas import user_to_dict, verification_log_to_dict, verification_request_to_dict

api = Blueprint("api", __name__, url_prefix="/api")
EMAIL_PATTERN = re.compile(r"^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$")
UPLOAD_DIR = Path(__file__).resolve().parents[1] / "uploads"
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".pdf"}


def _json_error(message, status):
    return jsonify({"error": message}), status


def _require_operator():
    claims = get_jwt()
    if claims.get("role") not in {"operator", "admin"}:
        return _json_error("Недостаточно прав: требуется роль operator/admin", 403)
    return None


def _generate_request_number() -> str:
    return f"REQ-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"


def _write_log(request_id: int, action: str, actor_id: int | None = None, comment: str | None = None):
    entry = VerificationLog(request_id=request_id, action=action, actor_id=actor_id, comment=comment)
    db.session.add(entry)


@api.post("/auth/register")
def register_user():
    payload = request.get_json(silent=True) or {}
    username = (payload.get("username") or "").strip()
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""

    if not username or not email or len(password) < 8:
        return _json_error("Поля username, email и пароль (не менее 8 символов) обязательны", 400)
    if not EMAIL_PATTERN.fullmatch(email):
        return _json_error("Некорректный email", 400)

    if User.query.filter((User.username == username) | (User.email == email)).first():
        return _json_error("Пользователь с таким логином или email уже существует", 409)

    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    user = User(username=username, email=email, password_hash=password_hash, role="user")
    db.session.add(user)
    db.session.commit()

    return jsonify({"message": "Пользователь зарегистрирован", "user": user_to_dict(user)}), 201


@api.post("/auth/register-operator")
def register_operator():
    payload = request.get_json(silent=True) or {}
    username = (payload.get("username") or "").strip()
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""

    if not username or not email or len(password) < 8:
        return _json_error("Поля username, email и пароль (не менее 8 символов) обязательны", 400)
    if not EMAIL_PATTERN.fullmatch(email):
        return _json_error("Некорректный email", 400)

    if User.query.filter((User.username == username) | (User.email == email)).first():
        return _json_error("Пользователь с таким логином или email уже существует", 409)

    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    operator = User(username=username, email=email, password_hash=password_hash, role="operator")
    db.session.add(operator)
    db.session.commit()

    return jsonify({"message": "Оператор зарегистрирован", "user": user_to_dict(operator)}), 201


@api.post("/auth/login")
def login():
    payload = request.get_json(silent=True) or {}
    username = (payload.get("username") or "").strip()
    password = payload.get("password") or ""

    user = User.query.filter_by(username=username).first()
    if not user or not bcrypt.checkpw(password.encode("utf-8"), user.password_hash.encode("utf-8")):
        return _json_error("Неверный логин или пароль", 401)

    identity = str(user.id)
    access_token = create_access_token(identity=identity, additional_claims={"role": user.role})
    refresh_token = create_refresh_token(identity=identity)

    return jsonify({"access_token": access_token, "refresh_token": refresh_token, "user": user_to_dict(user)})


@api.post("/auth/refresh")
@jwt_required(refresh=True)
def refresh():
    identity = get_jwt_identity()
    user = User.query.get(int(identity))
    if not user:
        return _json_error("Пользователь не найден", 404)
    access_token = create_access_token(identity=identity, additional_claims={"role": user.role})
    return jsonify({"access_token": access_token}), 200


@api.get("/auth/me")
@jwt_required()
def me():
    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return _json_error("Пользователь не найден", 404)
    return jsonify({"user": user_to_dict(user)}), 200


@api.post("/verification-requests")
def create_verification_request():
    full_name = (request.form.get("full_name") or "").strip()
    about_info = (request.form.get("about_info") or "").strip()
    document = request.files.get("document")

    if not full_name or not about_info:
        return _json_error("Поля full_name и about_info обязательны", 400)
    if not document or not document.filename:
        return _json_error("Файл документа обязателен", 400)

    ext = Path(document.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        return _json_error("Допустимые форматы: JPG, PNG, PDF", 400)

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    safe_name = secure_filename(document.filename)
    unique_name = f"{uuid.uuid4().hex}_{safe_name}"
    save_path = UPLOAD_DIR / unique_name
    document.save(save_path)

    item = VerificationRequest(
        request_number=_generate_request_number(),
        full_name=full_name,
        about_info=about_info,
        document_path=str(save_path.name),
        status="pending",
    )
    db.session.add(item)
    db.session.flush()
    _write_log(item.id, "submitted", None, "Заявка отправлена пользователем")
    db.session.commit()

    return (
        jsonify(
            {
                "message": "Заявка принята. На проверке",
                "request_number": item.request_number,
                "status": item.status,
            }
        ),
        201,
    )


@api.get("/verification-requests/status/<string:request_number>")
def get_request_status(request_number):
    item = VerificationRequest.query.filter_by(request_number=request_number).first()
    if not item:
        return _json_error("Заявка не найдена", 404)

    response = {
        "request_number": item.request_number,
        "status": item.status,
        "message": "На проверке",
    }
    if item.status == "approved":
        response["message"] = "Одобрено. Вход разрешен"
    elif item.status == "rejected":
        response["message"] = "Отклонено. Загрузите документ заново"
        response["reason"] = item.operator_comment or "Требуется повторная проверка"

    return jsonify(response), 200


@api.get("/operator/requests")
@jwt_required()
def operator_list_requests():
    operator_error = _require_operator()
    if operator_error:
        return operator_error

    status = (request.args.get("status") or "pending").strip().lower()
    query = VerificationRequest.query
    if status:
        query = query.filter_by(status=status)

    items = query.order_by(VerificationRequest.created_at.asc()).all()
    return jsonify({"items": [verification_request_to_dict(i) for i in items]}), 200


@api.get("/operator/requests/<string:request_number>/document")
@jwt_required()
def operator_download_document(request_number):
    operator_error = _require_operator()
    if operator_error:
        return operator_error

    item = VerificationRequest.query.filter_by(request_number=request_number).first()
    if not item:
        return _json_error("Заявка не найдена", 404)

    file_path = UPLOAD_DIR / item.document_path
    if not file_path.exists():
        return _json_error("Файл документа не найден", 404)

    return send_from_directory(
        directory=UPLOAD_DIR,
        path=item.document_path,
        as_attachment=True,
        download_name=item.document_path.split("_", 1)[-1],
    )


@api.post("/operator/requests/<string:request_number>/decision")
@jwt_required()
def operator_decision(request_number):
    operator_error = _require_operator()
    if operator_error:
        return operator_error

    payload = request.get_json(silent=True) or {}
    decision = (payload.get("decision") or "").strip().lower()
    comment = (payload.get("comment") or "").strip()

    if decision not in {"approved", "rejected"}:
        return _json_error("Решение должно быть approved или rejected", 400)
    if not comment:
        return _json_error("Комментарий обязателен", 400)

    item = VerificationRequest.query.filter_by(request_number=request_number).first()
    if not item:
        return _json_error("Заявка не найдена", 404)

    item.status = decision
    item.operator_comment = comment
    item.operator_id = int(get_jwt_identity())

    _write_log(item.id, "decision_set", item.operator_id, f"{decision}: {comment}")
    db.session.commit()

    return jsonify({"item": verification_request_to_dict(item)}), 200


@api.get("/operator/logs")
@jwt_required()
def operator_logs():
    operator_error = _require_operator()
    if operator_error:
        return operator_error

    logs = VerificationLog.query.order_by(VerificationLog.created_at.desc()).limit(200).all()
    return jsonify({"items": [verification_log_to_dict(l) for l in logs]}), 200


@api.get("/health")
def health():
    return jsonify({"status": "ok"}), 200
