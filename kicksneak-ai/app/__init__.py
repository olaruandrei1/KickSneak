import logging

from flask import Flask
from flask_cors import CORS

from app.routes import recommend_bp, rerank_bp, train_bp
from app.services import recommend_service, rerank_service


def create_app() -> Flask:
    _configure_logging()

    app = Flask(__name__)
    CORS(app)  # allow browser calls from the frontend (rerank/recommend)

    app.register_blueprint(recommend_bp)
    app.register_blueprint(rerank_bp)
    app.register_blueprint(train_bp)

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