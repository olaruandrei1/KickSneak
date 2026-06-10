import random

import numpy as np
import torch
from torch.utils.data import Dataset


class InteractionDataset(Dataset):
    WEIGHT_PURCHASE = 1.0
    WEIGHT_FAVORITE = 0.7
    WEIGHT_VIEW = 0.3

    def __init__(
        self,
        orders: list[dict],
        views: list[dict],
        favorites: list[dict],
        feature_builder,
        negative_ratio: int = 4,
    ):
        self._feature_builder = feature_builder
        self._all_product_indices = set(range(feature_builder.num_products))

        self._positives: list[tuple[int, int, float]] = []
        self._user_positive_products: dict[int, set[int]] = {}

        self._build_positives(orders, views, favorites)
        self._negative_ratio = negative_ratio
        self._samples = self._build_samples()

    def _build_positives(
        self,
        orders: list[dict],
        views: list[dict],
        favorites: list[dict],
    ):
        for order in orders:
            u = self._feature_builder.encode_user(str(order["user_id"]))
            p = self._feature_builder.encode_product(str(order["product_id"]))
            if u is not None and p is not None:
                self._positives.append((u, p, self.WEIGHT_PURCHASE))
                self._user_positive_products.setdefault(u, set()).add(p)

        for fav in favorites:
            u = self._feature_builder.encode_user(str(fav["user_id"]))
            p = self._feature_builder.encode_product(str(fav["product_id"]))
            if u is not None and p is not None:
                self._positives.append((u, p, self.WEIGHT_FAVORITE))
                self._user_positive_products.setdefault(u, set()).add(p)

        for view in views:
            u = self._feature_builder.encode_user(str(view["user_id"]))
            p = self._feature_builder.encode_product(str(view["product_id"]))
            if u is not None and p is not None:
                weight = min(int(view.get("view_count", 1)), 10) / 10.0 * self.WEIGHT_VIEW
                self._positives.append((u, p, max(weight, 0.1)))
                self._user_positive_products.setdefault(u, set()).add(p)

    def _build_samples(self) -> list[tuple[int, int, float]]:
        samples = [(u, p, w) for u, p, w in self._positives]

        for user_idx, product_idx, _ in self._positives:
            user_positives = self._user_positive_products.get(user_idx, set())
            negatives_pool = list(self._all_product_indices - user_positives)

            if not negatives_pool:
                continue

            num_neg = min(self._negative_ratio, len(negatives_pool))
            for neg_p in random.sample(negatives_pool, num_neg):
                samples.append((user_idx, neg_p, 0.0))

        random.shuffle(samples)
        return samples

    def __len__(self) -> int:
        return len(self._samples)

    def __getitem__(self, idx: int) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        user_idx, product_idx, label = self._samples[idx]
        return (
            torch.tensor(user_idx, dtype=torch.long),
            torch.tensor(product_idx, dtype=torch.long),
            torch.tensor(label, dtype=torch.float32),
        )