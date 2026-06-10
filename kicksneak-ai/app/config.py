import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = int(os.getenv("DB_PORT", 5432))
    DB_NAME = os.getenv("DB_NAME", "kicksneak")
    DB_USER = os.getenv("DB_USER", "postgres")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")

    MODEL_DIR = os.getenv("MODEL_DIR", "trained_models")

    RERANKER_PATH = os.path.join(MODEL_DIR, "reranker.pt")
    RECOMMENDER_PATH = os.path.join(MODEL_DIR, "recommender.pt")

    EMBEDDING_DIM = 64
    HIDDEN_DIM = 128

    FLASK_PORT = int(os.getenv("FLASK_PORT", 5050))
    FLASK_DEBUG = os.getenv("FLASK_DEBUG", "false").lower() == "true"

    @classmethod
    def db_connection_string(cls) -> str:
        return (
            f"host={cls.DB_HOST} port={cls.DB_PORT} "
            f"dbname={cls.DB_NAME} user={cls.DB_USER} "
            f"password={cls.DB_PASSWORD}"
        )