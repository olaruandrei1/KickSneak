import logging
from pathlib import Path

import numpy as np
import torch
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.config import Config
from app.data import db_client, FeatureBuilder
from app.models import Reranker

logger = logging.getLogger(__name__)


class RerankService:
    def __init__(self):
        self._model: Reranker | None = None
        self._feature_builder: FeatureBuilder | None = None
        self._tfidf: TfidfVectorizer | None = None
        self._product_tfidf_matrix = None
        self._product_titles: dict[str, str] = {}
        self._is_loaded = False

    def load(self):
        model_path = Path(Config.RERANKER_PATH)
        meta_path = model_path.with_suffix(".meta.pt")

        if not model_path.exists() or not meta_path.exists():
            logger.warning("Reranker model not found at %s — passthrough mode", model_path)
            self._build_tfidf_only()
            return

        meta = torch.load(meta_path, weights_only=False)
        self._feature_builder = meta["feature_builder"]

        self._model = Reranker(
            user_profile_dim=self._feature_builder.user_profile_dim,
            num_brands=self._feature_builder.num_brands,
            num_categories=self._feature_builder.num_categories,
            num_genders=self._feature_builder.num_genders,
            embedding_dim=Config.EMBEDDING_DIM // 2,
            hidden_dim=Config.HIDDEN_DIM,
        )
        self._model.load_state_dict(torch.load(model_path, weights_only=True))
        self._model.eval()
        self._is_loaded = True

        self._build_tfidf()

        logger.info("Reranker loaded — %d products indexed", len(self._product_titles))

    def _build_tfidf(self):
        products = db_client.fetch_products()
        self._product_titles = {str(p["id"]): p["title"] or "" for p in products}

        titles = list(self._product_titles.values())
        if titles:
            self._tfidf = TfidfVectorizer(max_features=5000, stop_words="english")
            self._product_tfidf_matrix = self._tfidf.fit_transform(titles)

    def _build_tfidf_only(self):
        self._build_tfidf()

    def rerank(
        self,
        query: str,
        user_id: str | None,
        candidate_ids: list[str],
        limit: int = 10,
    ) -> list[dict]:
        if not candidate_ids:
            candidate_ids = list(self._product_titles.keys())

        text_scores = self._compute_text_similarity(query, candidate_ids)

        if not self._is_loaded or user_id is None:
            return self._text_only_ranking(candidate_ids, text_scores, limit)

        interactions = db_client.fetch_user_interactions(user_id)
        user_profile = self._feature_builder.build_user_profile(interactions)

        brand_indices = []
        category_indices = []
        gender_indices = []
        prices = []
        valid_ids = []
        valid_text_scores = []

        for pid in candidate_ids:
            features = self._feature_builder.get_product_features(pid)
            if features is None:
                continue

            brand_idx = features["brand_idx"]
            cat_idx = features["category_idx"]
            gender_idx = features["gender_idx"]

            if brand_idx is None or cat_idx is None or gender_idx is None:
                continue

            brand_indices.append(brand_idx)
            category_indices.append(cat_idx)
            gender_indices.append(gender_idx)
            prices.append(features["price_norm"])
            valid_ids.append(pid)
            valid_text_scores.append(text_scores.get(pid, 0.0))

        if not valid_ids:
            return self._text_only_ranking(candidate_ids, text_scores, limit)

        batch_size = len(valid_ids)
        user_profile_tensor = torch.tensor(
            np.tile(user_profile, (batch_size, 1)),
            dtype=torch.float32,
        )

        with torch.no_grad():
            scores = self._model(
                user_profile=user_profile_tensor,
                brand_ids=torch.tensor(brand_indices, dtype=torch.long),
                category_ids=torch.tensor(category_indices, dtype=torch.long),
                gender_ids=torch.tensor(gender_indices, dtype=torch.long),
                price_norm=torch.tensor(prices, dtype=torch.float32),
                text_similarity=torch.tensor(valid_text_scores, dtype=torch.float32),
            ).numpy()

        scored_items = [
            {"id": pid, "score": round(float(score), 4)}
            for pid, score in zip(valid_ids, scores)
        ]
        scored_items.sort(key=lambda x: x["score"], reverse=True)
        return scored_items[:limit]

    def _compute_text_similarity(self, query: str, candidate_ids: list[str]) -> dict[str, float]:
        if self._tfidf is None or self._product_tfidf_matrix is None:
            return {}

        all_ids = list(self._product_titles.keys())
        candidate_set = set(candidate_ids)

        query_vec = self._tfidf.transform([query])
        similarities = cosine_similarity(query_vec, self._product_tfidf_matrix).flatten()

        return {
            pid: float(sim)
            for pid, sim in zip(all_ids, similarities)
            if pid in candidate_set
        }

    @staticmethod
    def _text_only_ranking(
        candidate_ids: list[str],
        text_scores: dict[str, float],
        limit: int,
    ) -> list[dict]:
        scored = [
            {"id": pid, "score": round(text_scores.get(pid, 0.0), 4)}
            for pid in candidate_ids
        ]
        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored[:limit]


rerank_service = RerankService()