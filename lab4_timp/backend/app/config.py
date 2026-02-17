import os

class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://postgres:1234@localhost:5432/physical_security",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "FaxNt8ECbe_RQPLay1mqP9X6CiYX4F6XP-NefMKiapzr3_0jacjHCmLY2dkPPlJRM2tWWZyaFneaFVXPoz0CfA")
    JWT_ACCESS_TOKEN_EXPIRES = 900
    JWT_REFRESH_TOKEN_EXPIRES = 604800
