import logging

from flask import Flask

from app.routes import recommend_bp, rerank_bp
from app.services import recommend_service, rerank_service


def create_app() -> Flask:
    _configure_logging()

    app = Flask(__name__)

    app.register_blueprint(recommend_bp)
    app.register_blueprint(rerank_bp)

    @app.route("/health", methods=["GET"])
    def health():
        return {"status": "ok"}, 200

    _load_models()

    return app


def _configure_logging():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
        datefmt="%H:%M:%S",
    )


def _load_models():
    logger = logging.getLogger(__name__)

    logger.info("Loading recommender model...")
    recommend_service.load()

    logger.info("Loading reranker model...")
    rerank_service.load()

    logger.info("All models loaded")