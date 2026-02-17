import logging
import re
from datetime import datetime

import bcrypt
from flask import Blueprint, jsonify, request
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    get_jwt,
    get_jwt_identity,
    jwt_required,
)

from .extensions import db
from .models import Checkpoint, Facility, Incident, SecurityPlan, User
from .schemas import checkpoint_to_dict, facility_to_dict, incident_to_dict, security_plan_to_dict, user_to_dict

api = Blueprint("api", __name__, url_prefix="/api")
logger = logging.getLogger(__name__)
EMAIL_PATTERN = re.compile(r"^[a-z0-9]+@[a-z0-9]+\.[a-z0-9]{2,}$")


def _json_error(message, status):
    return jsonify({"error": message}), status


def _require_admin():
    claims = get_jwt()
    if claims.get("role") != "admin":
        return _json_error("Недостаточно прав: требуется роль admin", 403)
    return None


@api.post("/auth/register")
def register():
    payload = request.get_json(silent=True) or {}
    username = (payload.get("username") or "").strip()
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""

    if not username or not email or len(password) < 8:
        return _json_error("Поля username, email и пароль (не менее 8 символов) обязательны", 400)
    if not EMAIL_PATTERN.fullmatch(email):
        return _json_error("Email должен быть в формате name@domain.tld и содержать только латинские буквы и цифры", 400)

    if User.query.filter((User.username == username) | (User.email == email)).first():
        return _json_error("Пользователь с таким логином или email уже существует", 409)

    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    user = User(username=username, email=email, password_hash=password_hash)
    db.session.add(user)
    db.session.commit()

    return jsonify({"message": "Пользователь зарегистрирован", "user": user_to_dict(user)}), 201


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

    return jsonify(
        {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": user_to_dict(user),
        }
    )


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
    identity = int(get_jwt_identity())
    user = User.query.get(identity)
    if not user:
        return _json_error("Пользователь не найден", 404)
    return jsonify({"user": user_to_dict(user)}), 200


@api.get("/facilities")
@jwt_required()
def list_facilities():
    query = Facility.query
    security_level = request.args.get("security_level")
    if security_level:
        query = query.filter_by(security_level=security_level)

    page = max(int(request.args.get("page", 1)), 1)
    per_page = min(max(int(request.args.get("per_page", 10)), 1), 100)
    pagination = query.order_by(Facility.id.desc()).paginate(page=page, per_page=per_page, error_out=False)
    return (
        jsonify(
            {
                "items": [facility_to_dict(item) for item in pagination.items],
                "page": page,
                "per_page": per_page,
                "total": pagination.total,
            }
        ),
        200,
    )


@api.post("/facilities")
@jwt_required()
def create_facility():
    payload = request.get_json(silent=True) or {}
    name = (payload.get("name") or "").strip()
    address = (payload.get("address") or "").strip()
    security_level = (payload.get("security_level") or "medium").strip().lower()

    if not name or not address:
        return _json_error("Поля name и address обязательны", 400)

    if Facility.query.filter_by(name=name).first():
        return _json_error("Объект с таким названием уже существует", 409)

    facility = Facility(name=name, address=address, security_level=security_level)
    db.session.add(facility)
    db.session.commit()
    return jsonify({"item": facility_to_dict(facility)}), 201


@api.get("/facilities/<int:facility_id>")
@jwt_required()
def get_facility(facility_id):
    facility = Facility.query.get_or_404(facility_id)
    return jsonify({"item": facility_to_dict(facility)}), 200


@api.put("/facilities/<int:facility_id>")
@jwt_required()
def update_facility(facility_id):
    facility = Facility.query.get_or_404(facility_id)
    payload = request.get_json(silent=True) or {}

    if "name" in payload:
        facility.name = payload["name"].strip()
    if "address" in payload:
        facility.address = payload["address"].strip()
    if "security_level" in payload:
        facility.security_level = payload["security_level"].strip().lower()

    db.session.commit()
    return jsonify({"item": facility_to_dict(facility)}), 200


@api.delete("/facilities/<int:facility_id>")
@jwt_required()
def delete_facility(facility_id):
    admin_error = _require_admin()
    if admin_error:
        return admin_error
    facility = Facility.query.get_or_404(facility_id)
    db.session.delete(facility)
    db.session.commit()
    return "", 204


@api.get("/checkpoints")
@jwt_required()
def list_checkpoints():
    query = Checkpoint.query
    facility_id = request.args.get("facility_id", type=int)
    status = request.args.get("status")
    if facility_id:
        query = query.filter_by(facility_id=facility_id)
    if status:
        query = query.filter_by(status=status)

    page = max(int(request.args.get("page", 1)), 1)
    per_page = min(max(int(request.args.get("per_page", 10)), 1), 100)
    pagination = query.order_by(Checkpoint.id.desc()).paginate(page=page, per_page=per_page, error_out=False)
    return (
        jsonify(
            {
                "items": [checkpoint_to_dict(item) for item in pagination.items],
                "page": page,
                "per_page": per_page,
                "total": pagination.total,
            }
        ),
        200,
    )


@api.post("/checkpoints")
@jwt_required()
def create_checkpoint():
    payload = request.get_json(silent=True) or {}
    required = ["facility_id", "name", "zone"]
    if any(not payload.get(field) for field in required):
        return _json_error("Поля facility_id, name и zone обязательны", 400)

    if not Facility.query.get(payload["facility_id"]):
        return _json_error("Объект не найден", 404)

    checkpoint = Checkpoint(
        facility_id=payload["facility_id"],
        name=payload["name"].strip(),
        zone=payload["zone"].strip(),
        status=(payload.get("status") or "active").strip().lower(),
    )
    db.session.add(checkpoint)
    db.session.commit()
    return jsonify({"item": checkpoint_to_dict(checkpoint)}), 201


@api.put("/checkpoints/<int:checkpoint_id>")
@jwt_required()
def update_checkpoint(checkpoint_id):
    checkpoint = Checkpoint.query.get_or_404(checkpoint_id)
    payload = request.get_json(silent=True) or {}

    if "name" in payload:
        checkpoint.name = payload["name"].strip()
    if "status" in payload:
        checkpoint.status = payload["status"].strip().lower()
    if "zone" in payload:
        checkpoint.zone = payload["zone"].strip()
    if "last_check_at" in payload:
        checkpoint.last_check_at = datetime.fromisoformat(payload["last_check_at"])

    db.session.commit()
    return jsonify({"item": checkpoint_to_dict(checkpoint)}), 200


@api.delete("/checkpoints/<int:checkpoint_id>")
@jwt_required()
def delete_checkpoint(checkpoint_id):
    admin_error = _require_admin()
    if admin_error:
        return admin_error
    checkpoint = Checkpoint.query.get_or_404(checkpoint_id)
    db.session.delete(checkpoint)
    db.session.commit()
    return "", 204


@api.get("/incidents")
@jwt_required()
def list_incidents():
    query = Incident.query
    status = request.args.get("status")
    severity = request.args.get("severity")
    facility_id = request.args.get("facility_id", type=int)
    if status:
        query = query.filter_by(status=status)
    if severity:
        query = query.filter_by(severity=severity)
    if facility_id:
        query = query.filter_by(facility_id=facility_id)

    page = max(int(request.args.get("page", 1)), 1)
    per_page = min(max(int(request.args.get("per_page", 10)), 1), 100)
    pagination = query.order_by(Incident.happened_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    return (
        jsonify(
            {
                "items": [incident_to_dict(item) for item in pagination.items],
                "page": page,
                "per_page": per_page,
                "total": pagination.total,
            }
        ),
        200,
    )


@api.post("/incidents")
@jwt_required()
def create_incident():
    payload = request.get_json(silent=True) or {}
    required = ["facility_id", "title", "description", "severity"]
    if any(not payload.get(field) for field in required):
        return _json_error("Поля facility_id, title, description и severity обязательны", 400)

    if not Facility.query.get(payload["facility_id"]):
        return _json_error("Объект не найден", 404)

    incident = Incident(
        facility_id=payload["facility_id"],
        author_id=int(get_jwt_identity()),
        title=payload["title"].strip(),
        description=payload["description"].strip(),
        severity=payload["severity"].strip().lower(),
        status=(payload.get("status") or "open").strip().lower(),
    )
    db.session.add(incident)
    db.session.commit()
    return jsonify({"item": incident_to_dict(incident)}), 201


@api.get("/incidents/<int:incident_id>")
@jwt_required()
def get_incident(incident_id):
    incident = Incident.query.get_or_404(incident_id)
    return jsonify({"item": incident_to_dict(incident)}), 200


@api.put("/incidents/<int:incident_id>")
@jwt_required()
def update_incident(incident_id):
    incident = Incident.query.get_or_404(incident_id)
    payload = request.get_json(silent=True) or {}

    for field in ["title", "description", "severity", "status"]:
        if field in payload and payload[field]:
            setattr(incident, field, payload[field].strip().lower() if field in {"severity", "status"} else payload[field].strip())

    db.session.commit()
    return jsonify({"item": incident_to_dict(incident)}), 200


@api.delete("/incidents/<int:incident_id>")
@jwt_required()
def delete_incident(incident_id):
    admin_error = _require_admin()
    if admin_error:
        return admin_error
    incident = Incident.query.get_or_404(incident_id)
    db.session.delete(incident)
    db.session.commit()
    return "", 204


@api.get("/security-plans")
@jwt_required()
def list_security_plans():
    query = SecurityPlan.query
    status = request.args.get("status")
    facility_id = request.args.get("facility_id", type=int)
    if status:
        query = query.filter_by(status=status)
    if facility_id:
        query = query.filter_by(facility_id=facility_id)

    page = max(int(request.args.get("page", 1)), 1)
    per_page = min(max(int(request.args.get("per_page", 10)), 1), 100)
    pagination = query.order_by(SecurityPlan.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    return (
        jsonify(
            {
                "items": [security_plan_to_dict(item) for item in pagination.items],
                "page": page,
                "per_page": per_page,
                "total": pagination.total,
            }
        ),
        200,
    )


@api.post("/security-plans")
@jwt_required()
def create_security_plan():
    payload = request.get_json(silent=True) or {}
    required = ["facility_id", "title", "description", "effective_from", "effective_to"]
    if any(not payload.get(field) for field in required):
        return _json_error("Поля facility_id, title, description, effective_from и effective_to обязательны", 400)

    if not Facility.query.get(payload["facility_id"]):
        return _json_error("Объект не найден", 404)

    try:
        effective_from = datetime.fromisoformat(payload["effective_from"]).date()
        effective_to = datetime.fromisoformat(payload["effective_to"]).date()
    except ValueError:
        return _json_error("Даты должны быть в формате YYYY-MM-DD", 400)

    if effective_from > effective_to:
        return _json_error("effective_from не может быть позже effective_to", 400)

    plan = SecurityPlan(
        facility_id=payload["facility_id"],
        author_id=int(get_jwt_identity()),
        title=payload["title"].strip(),
        description=payload["description"].strip(),
        effective_from=effective_from,
        effective_to=effective_to,
        status=(payload.get("status") or "draft").strip().lower(),
    )
    db.session.add(plan)
    db.session.commit()
    return jsonify({"item": security_plan_to_dict(plan)}), 201


@api.put("/security-plans/<int:plan_id>")
@jwt_required()
def update_security_plan(plan_id):
    plan = SecurityPlan.query.get_or_404(plan_id)
    payload = request.get_json(silent=True) or {}

    if "title" in payload and payload["title"]:
        plan.title = payload["title"].strip()
    if "description" in payload and payload["description"]:
        plan.description = payload["description"].strip()
    if "status" in payload and payload["status"]:
        plan.status = payload["status"].strip().lower()
    if "effective_from" in payload and payload["effective_from"]:
        try:
            plan.effective_from = datetime.fromisoformat(payload["effective_from"]).date()
        except ValueError:
            return _json_error("effective_from должен быть в формате YYYY-MM-DD", 400)
    if "effective_to" in payload and payload["effective_to"]:
        try:
            plan.effective_to = datetime.fromisoformat(payload["effective_to"]).date()
        except ValueError:
            return _json_error("effective_to должен быть в формате YYYY-MM-DD", 400)

    if plan.effective_from and plan.effective_to and plan.effective_from > plan.effective_to:
        return _json_error("effective_from не может быть позже effective_to", 400)

    db.session.commit()
    return jsonify({"item": security_plan_to_dict(plan)}), 200


@api.delete("/security-plans/<int:plan_id>")
@jwt_required()
def delete_security_plan(plan_id):
    admin_error = _require_admin()
    if admin_error:
        return admin_error
    plan = SecurityPlan.query.get_or_404(plan_id)
    db.session.delete(plan)
    db.session.commit()
    return "", 204


@api.get("/health")
def health():
    return jsonify({"status": "ok"}), 200
