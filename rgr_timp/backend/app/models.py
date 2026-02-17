from datetime import datetime

from sqlalchemy import func

from .extensions import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(100), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(32), nullable=False, default="user")
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), nullable=False)


class VerificationRequest(db.Model):
    __tablename__ = "verification_requests"

    id = db.Column(db.Integer, primary_key=True)
    request_number = db.Column(db.String(40), unique=True, nullable=False, index=True)
    full_name = db.Column(db.String(255), nullable=False)
    about_info = db.Column(db.Text, nullable=False)
    document_path = db.Column(db.String(500), nullable=False)
    status = db.Column(db.String(32), nullable=False, default="pending", index=True)
    operator_comment = db.Column(db.Text, nullable=True)
    operator_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    operator = db.relationship("User", lazy=True)


class VerificationLog(db.Model):
    __tablename__ = "verification_logs"

    id = db.Column(db.Integer, primary_key=True)
    request_id = db.Column(db.Integer, db.ForeignKey("verification_requests.id"), nullable=False, index=True)
    actor_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    action = db.Column(db.String(64), nullable=False)
    comment = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), nullable=False)

    request_item = db.relationship("VerificationRequest", lazy=True)
    actor = db.relationship("User", lazy=True)
