import numpy as np
from sklearn.preprocessing import LabelEncoder


class FeatureBuilder:
    def __init__(self):
        self._user_encoder = LabelEncoder()
        self._product_encoder = LabelEncoder()
        self._brand_encoder = LabelEncoder()
        self._category_encoder = LabelEncoder()
        self._gender_encoder = LabelEncoder()

        self._is_fitted = False

    @property
    def num_users(self) -> int:
        return len(self._user_encoder.classes_)

    @property
    def num_products(self) -> int:
        return len(self._product_encoder.classes_)

    @property
    def num_brands(self) -> int:
        return len(self._brand_encoder.classes_)

    @property
    def num_categories(self) -> int:
        return len(self._category_encoder.classes_)

    @property
    def num_genders(self) -> int:
        return len(self._gender_encoder.classes_)

    def fit(self, products: list[dict], interactions: list[dict]) -> "FeatureBuilder":
        user_ids = list({i["user_id"] for i in interactions})
        product_ids = [str(p["id"]) for p in products]
        brand_ids = [str(p["brand_id"] or "unknown") for p in products]
        category_ids = [str(p["category_id"] or "unknown") for p in products]
        gender_ids = [str(p["gender_id"] or "unknown") for p in products]

        self._user_encoder.fit(user_ids if user_ids else ["__placeholder__"])
        self._product_encoder.fit(product_ids)
        self._brand_encoder.fit(brand_ids)
        self._category_encoder.fit(category_ids)
        self._gender_encoder.fit(gender_ids)

        self._product_features = {}
        for p in products:
            pid = str(p["id"])
            self._product_features[pid] = {
                "brand_idx": self._safe_encode(self._brand_encoder, str(p["brand_id"] or "unknown")),
                "category_idx": self._safe_encode(self._category_encoder, str(p["category_id"] or "unknown")),
                "gender_idx": self._safe_encode(self._gender_encoder, str(p["gender_id"] or "unknown")),
                "price_norm": self._normalize_price(p.get("retail_price") or 0),
            }

        self._is_fitted = True
        return self

    def encode_user(self, user_id: str) -> int | None:
        return self._safe_encode(self._user_encoder, user_id)

    def encode_product(self, product_id: str) -> int | None:
        return self._safe_encode(self._product_encoder, product_id)

    def get_product_features(self, product_id: str) -> dict | None:
        return self._product_features.get(product_id)

    def get_all_product_ids(self) -> list[str]:
        return list(self._product_encoder.classes_)

    def build_user_profile(self, interactions: dict) -> np.ndarray:
        brand_counts = np.zeros(self.num_brands, dtype=np.float32)
        category_counts = np.zeros(self.num_categories, dtype=np.float32)
        gender_counts = np.zeros(self.num_genders, dtype=np.float32)
        price_sum = 0.0
        price_count = 0

        weighted_items = []

        for pid in interactions.get("purchased", []):
            weighted_items.append((str(pid), 3.0))

        for pid in interactions.get("favorited", []):
            weighted_items.append((str(pid), 2.0))

        for view in interactions.get("viewed", []):
            weight = min(float(view.get("view_count", 1)), 10.0) * 0.5
            weighted_items.append((str(view["product_id"]), weight))

        for pid, weight in weighted_items:
            features = self.get_product_features(pid)
            if features is None:
                continue

            brand_counts[features["brand_idx"]] += weight
            category_counts[features["category_idx"]] += weight
            gender_counts[features["gender_idx"]] += weight
            price_sum += features["price_norm"] * weight
            price_count += weight

        if price_count > 0:
            brand_counts /= brand_counts.sum() or 1.0
            category_counts /= category_counts.sum() or 1.0
            gender_counts /= gender_counts.sum() or 1.0
            avg_price = price_sum / price_count
        else:
            avg_price = 0.5

        return np.concatenate([brand_counts, category_counts, gender_counts, [avg_price]])

    @property
    def user_profile_dim(self) -> int:
        return self.num_brands + self.num_categories + self.num_genders + 1

    @staticmethod
    def _normalize_price(price: float, max_price: float = 2000.0) -> float:
        return min(price / max_price, 1.0)

    @staticmethod
    def _safe_encode(encoder: LabelEncoder, value: str) -> int | None:
        try:
            return int(encoder.transform([value])[0])
        except ValueError:
            return None