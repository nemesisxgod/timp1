import logging

import bcrypt
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from .config import Config
from .extensions import db, jwt, migrate
from .models import User
from .routes import api

logging.basicConfig(
    filename="error.log",
    level=logging.ERROR,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app, resources={r"/api/*": {"origins": "*"}})

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    _configure_logging(app)

    with app.app_context():
        db.create_all()
    _ensure_default_admin(app)

    app.register_blueprint(api)
    _register_error_handlers(app)
    _register_jwt_handlers(jwt)

    return app


def _ensure_default_admin(app):
    default_username = "admin"
    default_email = "admin@mail.ru"
    default_password = "admin123"

    with app.app_context():
        user = User.query.filter((User.username == default_username) | (User.email == default_email)).first()
        if user:
            if user.role != "admin":
                user.role = "admin"
                db.session.commit()
            return

        password_hash = bcrypt.hashpw(default_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        admin = User(
            username=default_username,
            email=default_email,
            password_hash=password_hash,
            role="admin",
        )
        db.session.add(admin)
        db.session.commit()


def _configure_logging(app):
    app.logger.setLevel(logging.INFO)
    file_handler = logging.FileHandler("error.log")
    file_handler.setLevel(logging.ERROR)
    file_handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s", "%Y-%m-%d %H:%M:%S"))
    app.logger.addHandler(file_handler)
    if not app.debug:
        handler = logging.StreamHandler()
        handler.setLevel(logging.INFO)
        app.logger.addHandler(handler)


def _register_error_handlers(app):
    @app.errorhandler(404)
    def not_found(_):
        return jsonify({"error": "Ресурс не найден"}), 404

    @app.errorhandler(400)
    def bad_request(_):
        return jsonify({"error": "Некорректный запрос"}), 400

    @app.errorhandler(500)
    def server_error(error):
        app.logger.exception("Unhandled error: %s", error)
        return jsonify({"error": "Внутренняя ошибка сервера"}), 500


def _register_jwt_handlers(jwt_manager: JWTManager):
    @jwt_manager.expired_token_loader
    def expired_token(jwt_header, jwt_payload):
        return jsonify({"error": "Срок действия токена истек"}), 401

    @jwt_manager.invalid_token_loader
    def invalid_token(_):
        return jsonify({"error": "Недействительный токен"}), 401

    @jwt_manager.unauthorized_loader
    def missing_token(_):
        return jsonify({"error": "Требуется авторизация"}), 401
