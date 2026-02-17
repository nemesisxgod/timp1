from datetime import datetime

from sqlalchemy import func

from .extensions import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(100), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(32), nullable=False, default="operator")
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), nullable=False)

    incidents = db.relationship("Incident", back_populates="author", lazy=True)
    security_plans = db.relationship("SecurityPlan", back_populates="author", lazy=True)


class Facility(db.Model):
    __tablename__ = "facilities"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False, unique=True, index=True)
    address = db.Column(db.String(255), nullable=False)
    security_level = db.Column(db.String(20), nullable=False, default="medium")
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), nullable=False)

    checkpoints = db.relationship("Checkpoint", back_populates="facility", cascade="all, delete-orphan")
    incidents = db.relationship("Incident", back_populates="facility", cascade="all, delete-orphan")
    security_plans = db.relationship("SecurityPlan", back_populates="facility", cascade="all, delete-orphan")


class Checkpoint(db.Model):
    __tablename__ = "checkpoints"

    id = db.Column(db.Integer, primary_key=True)
    facility_id = db.Column(db.Integer, db.ForeignKey("facilities.id", ondelete="CASCADE"), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    status = db.Column(db.String(20), nullable=False, default="active")
    zone = db.Column(db.String(50), nullable=False)
    last_check_at = db.Column(db.DateTime(timezone=True), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), nullable=False)

    facility = db.relationship("Facility", back_populates="checkpoints")


class Incident(db.Model):
    __tablename__ = "incidents"

    id = db.Column(db.Integer, primary_key=True)
    facility_id = db.Column(db.Integer, db.ForeignKey("facilities.id", ondelete="CASCADE"), nullable=False)
    author_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    severity = db.Column(db.String(20), nullable=False, default="low")
    status = db.Column(db.String(20), nullable=False, default="open")
    happened_at = db.Column(db.DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), nullable=False)

    facility = db.relationship("Facility", back_populates="incidents")
    author = db.relationship("User", back_populates="incidents")


class SecurityPlan(db.Model):
    __tablename__ = "security_plans"

    id = db.Column(db.Integer, primary_key=True)
    facility_id = db.Column(db.Integer, db.ForeignKey("facilities.id", ondelete="CASCADE"), nullable=False)
    author_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    effective_from = db.Column(db.Date, nullable=False)
    effective_to = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(20), nullable=False, default="draft")
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), nullable=False)

    facility = db.relationship("Facility", back_populates="security_plans")
    author = db.relationship("User", back_populates="security_plans")
