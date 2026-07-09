import logging
import subprocess
import sys
import threading

from flask import Blueprint, jsonify

from app.services import recommend_service, rerank_service

logger = logging.getLogger(__name__)

train_bp = Blueprint("train", __name__)

_lock = threading.Lock()
_state = {"running": False, "last_result": None}


def _run_training():
    with _lock:
        if _state["running"]:
            return
        _state["running"] = True

    try:
        logger.info("Retrain started (reading latest interactions from DB)...")
        result = subprocess.run(
            [sys.executable, "scripts/train.py"],
            capture_output=True, text=True,
        )
        # Hot-reload the freshly trained models into the serving instance.
        recommend_service.load()
        rerank_service.load()
        _state["last_result"] = "ok" if result.returncode == 0 else "failed"
        logger.info("Retrain finished (%s) + models reloaded", _state["last_result"])
    except Exception:
        logger.exception("Retrain error")
        _state["last_result"] = "error"
    finally:
        _state["running"] = False


@train_bp.route("/api/train", methods=["POST"])
def train():
    """Global retrain over ALL users' latest DB interactions (hybrid: per-user
    personalization still happens at inference via cold-start profiles).
    Async: returns immediately, training runs in a background thread."""
    if _state["running"]:
        return jsonify({"status": "already_running"}), 202

    threading.Thread(target=_run_training, daemon=True).start()
    return jsonify({"status": "training_started"}), 202


@train_bp.route("/api/train/status", methods=["GET"])
def train_status():
    return jsonify(_state), 200
