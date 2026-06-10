import logging

from flask import Blueprint, request, jsonify
from pydantic import ValidationError

from app.schemas.requests import RerankRequest, RerankResponse, RerankItem
from app.services import rerank_service

logger = logging.getLogger(__name__)

rerank_bp = Blueprint("rerank", __name__)


@rerank_bp.route("/api/rerank", methods=["POST"])
def rerank():
    try:
        body = RerankRequest.model_validate(request.get_json(silent=True) or {})
    except ValidationError as e:
        return jsonify({"error": e.errors()}), 400

    items = rerank_service.rerank(
        query=body.query,
        user_id=body.user_id,
        candidate_ids=body.candidate_ids,
        limit=body.limit,
    )

    response = RerankResponse(
        items=[RerankItem(id=i["id"], score=i["score"]) for i in items]
    )

    return jsonify(response.model_dump())