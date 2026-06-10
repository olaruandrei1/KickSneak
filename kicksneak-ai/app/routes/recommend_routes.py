import logging

from flask import Blueprint, request, jsonify
from pydantic import ValidationError

from app.schemas.requests import RecommendRequest, RecommendResponse, RecommendItem
from app.services import recommend_service

logger = logging.getLogger(__name__)

recommend_bp = Blueprint("recommend", __name__)


@recommend_bp.route("/api/recommend", methods=["POST"])
def recommend():
    try:
        body = RecommendRequest.model_validate(request.get_json(silent=True) or {})
    except ValidationError as e:
        return jsonify({"error": e.errors()}), 400

    items = recommend_service.recommend(body.user_id, body.limit)

    response = RecommendResponse(
        items=[RecommendItem(id=i["id"], score=i["score"]) for i in items]
    )

    return jsonify(response.model_dump())