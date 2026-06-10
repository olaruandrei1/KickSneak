import logging
from pathlib import Path

import numpy as np
import torch

from app.config import Config
from app.data import db_client, FeatureBuilder
from app.models import Recommender

logger = logging.getLogger(__name__)


class RecommendService:
    def __init__(self):
        self._model: Recommender | None = None
        self._feature_builder: FeatureBuilder | None = None
        self._is_loaded = False

    def load(self):
        model_path = Path(Config.RECOMMENDER_PATH)
        meta_path = model_path.with_suffix(".meta.pt")

        if not model_path.exists() or not meta_path.exists():
            logger.warning("Recommender model not found at %s — predictions disabled", model_path)
            return

        meta = torch.load(meta_path, weights_only=False)
        self._feature_builder = meta["feature_builder"]

        self._model = Recommender(
            num_users=self._feature_builder.num_users,
            num_products=self._feature_builder.num_products,
            embedding_dim=Config.EMBEDDING_DIM,
            hidden_dim=Config.HIDDEN_DIM,
        )
        self._model.load_state_dict(torch.load(model_path, weights_only=True))
        self._model.eval()
        self._is_loaded = True

        logger.info(
            "Recommender loaded — %d users, %d products",
            self._feature_builder.num_users,
            self._feature_builder.num_products,
        )

    def recommend(self, user_id: str, limit: int = 10) -> list[dict]:
        if not self._is_loaded:
            return self._fallback_trending(limit)

        user_idx = self._feature_builder.encode_user(user_id)
        if user_idx is None:
            return self._cold_start(user_id, limit)

        all_product_ids = self._feature_builder.get_all_product_ids()
        num_products = len(all_product_ids)

        user_tensor = torch.full((num_products,), user_idx, dtype=torch.long)
        product_tensor = torch.arange(num_products, dtype=torch.long)

        with torch.no_grad():
            scores = self._model(user_tensor, product_tensor).numpy()

        # Exclude already interacted products
        interactions = db_client.fetch_user_interactions(user_id)
        interacted_ids = set(
            str(pid) for pid in
            interactions["purchased"] + interactions["favorited"]
            + [v["product_id"] for v in interactions["viewed"]]
        )

        scored_items = [
            {"id": pid, "score": float(score)}
            for pid, score in zip(all_product_ids, scores)
            if pid not in interacted_ids
        ]

        scored_items.sort(key=lambda x: x["score"], reverse=True)
        return scored_items[:limit]

    def _cold_start(self, user_id: str, limit: int) -> list[dict]:
        interactions = db_client.fetch_user_interactions(user_id)

        has_history = (
            interactions["purchased"]
            or interactions["favorited"]
            or interactions["viewed"]
        )

        if not has_history:
            return self._fallback_trending(limit)

        user_profile = self._feature_builder.build_user_profile(interactions)
        all_product_ids = self._feature_builder.get_all_product_ids()
        product_embeddings = self._model.get_product_embeddings().numpy()

        profile_weights = self._profile_to_product_scores(user_profile, product_embeddings)

        interacted_ids = set(
            str(pid) for pid in
            interactions["purchased"] + interactions["favorited"]
            + [v["product_id"] for v in interactions["viewed"]]
        )

        scored_items = [
            {"id": pid, "score": float(score)}
            for pid, score in zip(all_product_ids, profile_weights)
            if pid not in interacted_ids
        ]

        scored_items.sort(key=lambda x: x["score"], reverse=True)
        return scored_items[:limit]

    @staticmethod
    def _profile_to_product_scores(
        user_profile: np.ndarray,
        product_embeddings: np.ndarray,
    ) -> np.ndarray:
        profile_proj = user_profile[:product_embeddings.shape[1]]
        if len(profile_proj) < product_embeddings.shape[1]:
            profile_proj = np.pad(
                profile_proj,
                (0, product_embeddings.shape[1] - len(profile_proj)),
            )

        norms = np.linalg.norm(product_embeddings, axis=1, keepdims=True)
        norms = np.where(norms == 0, 1.0, norms)
        normalized = product_embeddings / norms

        profile_norm = np.linalg.norm(profile_proj)
        if profile_norm > 0:
            profile_proj = profile_proj / profile_norm

        scores = normalized @ profile_proj
        return (scores - scores.min()) / (scores.max() - scores.min() + 1e-8)

    @staticmethod
    def _fallback_trending(limit: int) -> list[dict]:
        products = db_client.fetch_products()
        orders = db_client.fetch_orders()

        purchase_count: dict[str, int] = {}
        for order in orders:
            pid = str(order["product_id"])
            purchase_count[pid] = purchase_count.get(pid, 0) + 1

        scored = [
            {"id": str(p["id"]), "score": float(purchase_count.get(str(p["id"]), 0))}
            for p in products
        ]
        scored.sort(key=lambda x: x["score"], reverse=True)

        max_score = scored[0]["score"] if scored and scored[0]["score"] > 0 else 1.0
        for item in scored:
            item["score"] = item["score"] / max_score

        return scored[:limit]


recommend_service = RecommendService()