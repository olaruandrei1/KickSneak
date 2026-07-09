import logging
import sys
import os
from pathlib import Path

import torch
import torch.nn as nn
from torch.utils.data import DataLoader

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import Config
from app.data import db_client, FeatureBuilder, InteractionDataset
from app.models import Recommender, Reranker

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("train")

# ── Hyperparameters ──

EPOCHS_RECOMMENDER = 50
EPOCHS_RERANKER = 40
BATCH_SIZE = 64
LEARNING_RATE = 1e-3
NEGATIVE_RATIO = 4


def main():
    logger.info("Fetching data from PostgreSQL...")
    products = db_client.fetch_products()
    orders = db_client.fetch_orders()
    views = db_client.fetch_views()
    favorites = db_client.fetch_favorites()

    all_interactions = orders + favorites + [
        {"user_id": v["user_id"], "product_id": v["product_id"]}
        for v in views
    ]

    if not products:
        logger.error("No products in DB — seed data first")
        return

    if not all_interactions:
        logger.warning("No interactions found — models will train on empty data")

    logger.info(
        "Data: %d products, %d orders, %d views, %d favorites",
        len(products), len(orders), len(views), len(favorites),
    )

    # ── Feature builder ──

    feature_builder = FeatureBuilder()
    feature_builder.fit(products, all_interactions)

    logger.info(
        "Encoded: %d users, %d products, %d brands, %d categories",
        feature_builder.num_users,
        feature_builder.num_products,
        feature_builder.num_brands,
        feature_builder.num_categories,
    )

    # ── Dataset ──

    # ── Ensure output dir ──

    model_dir = Path(Config.MODEL_DIR)
    model_dir.mkdir(parents=True, exist_ok=True)

    if not all_interactions:
        logger.warning("No interaction data — saving untrained models for cold-start fallback")
        _save_untrained_models(feature_builder, model_dir)
        return

    # ── Dataset ──

    dataset = InteractionDataset(
        orders=orders,
        views=views,
        favorites=favorites,
        feature_builder=feature_builder,
        negative_ratio=NEGATIVE_RATIO,
    )

    loader = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=True)

    logger.info("Dataset: %d samples (pos + neg)", len(dataset))

    # ── Train Recommender ──

    train_recommender(feature_builder, loader, model_dir)

    # ── Train Reranker ──

    train_reranker(feature_builder, products, orders, views, favorites, model_dir)

    logger.info("Training complete — models saved to %s/", model_dir)


def _save_untrained_models(feature_builder: FeatureBuilder, model_dir: Path):
    recommender = Recommender(
        num_users=max(feature_builder.num_users, 1),
        num_products=feature_builder.num_products,
        embedding_dim=Config.EMBEDDING_DIM,
        hidden_dim=Config.HIDDEN_DIM,
    )
    torch.save(recommender.state_dict(), model_dir / "recommender.pt")
    torch.save({"feature_builder": feature_builder}, model_dir / "recommender.meta.pt")

    reranker = Reranker(
        user_profile_dim=feature_builder.user_profile_dim,
        num_brands=feature_builder.num_brands,
        num_categories=feature_builder.num_categories,
        num_genders=feature_builder.num_genders,
        embedding_dim=Config.EMBEDDING_DIM // 2,
        hidden_dim=Config.HIDDEN_DIM,
    )
    torch.save(reranker.state_dict(), model_dir / "reranker.pt")
    torch.save({"feature_builder": feature_builder}, model_dir / "reranker.meta.pt")

    logger.info("Untrained models saved to %s/", model_dir)


def train_recommender(
    feature_builder: FeatureBuilder,
    loader: DataLoader,
    model_dir: Path,
):
    logger.info("═" * 50)
    logger.info("Training Recommender (NCF)")
    logger.info("═" * 50)

    model = Recommender(
        num_users=feature_builder.num_users,
        num_products=feature_builder.num_products,
        embedding_dim=Config.EMBEDDING_DIM,
        hidden_dim=Config.HIDDEN_DIM,
    )

    optimizer = torch.optim.Adam(model.parameters(), lr=LEARNING_RATE, weight_decay=1e-5)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, mode="min", factor=0.5, patience=5,
    )
    criterion = nn.BCELoss(reduction="none")

    model.train()
    best_loss = float("inf")

    for epoch in range(EPOCHS_RECOMMENDER):
        total_loss = 0.0
        num_batches = 0

        for user_ids, product_ids, labels in loader:
            optimizer.zero_grad()

            predictions = model(user_ids, product_ids)

            # Weighted loss — positives matter more
            weights = torch.where(labels > 0, labels * 2.0, torch.ones_like(labels))
            binary_labels = (labels > 0).float()

            loss = (criterion(predictions, binary_labels) * weights).mean()
            loss.backward()

            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()

            total_loss += loss.item()
            num_batches += 1

        avg_loss = total_loss / max(num_batches, 1)
        scheduler.step(avg_loss)

        if avg_loss < best_loss:
            best_loss = avg_loss

        if (epoch + 1) % 10 == 0 or epoch == 0:
            lr = optimizer.param_groups[0]["lr"]
            logger.info(
                "  Epoch %3d/%d — loss: %.4f — lr: %.6f",
                epoch + 1, EPOCHS_RECOMMENDER, avg_loss, lr,
            )

    # Save model + metadata
    torch.save(model.state_dict(), model_dir / "recommender.pt")
    torch.save(
        {"feature_builder": feature_builder},
        model_dir / "recommender.meta.pt",
    )

    logger.info("Recommender saved — best loss: %.4f", best_loss)


def train_reranker(
    feature_builder: FeatureBuilder,
    products: list[dict],
    orders: list[dict],
    views: list[dict],
    favorites: list[dict],
    model_dir: Path,
):
    logger.info("═" * 50)
    logger.info("Training Reranker (Learning to Rank)")
    logger.info("═" * 50)

    # Build training data: user_profile + product_features + simulated_text_score → label
    training_samples = _build_reranker_samples(
        feature_builder, orders, views, favorites,
    )

    if not training_samples:
        logger.warning("No reranker training samples — skipping")
        return

    model = Reranker(
        user_profile_dim=feature_builder.user_profile_dim,
        num_brands=feature_builder.num_brands,
        num_categories=feature_builder.num_categories,
        num_genders=feature_builder.num_genders,
        embedding_dim=Config.EMBEDDING_DIM // 2,
        hidden_dim=Config.HIDDEN_DIM,
    )

    optimizer = torch.optim.Adam(model.parameters(), lr=LEARNING_RATE, weight_decay=1e-5)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, mode="min", factor=0.5, patience=5,
    )
    criterion = nn.BCELoss()

    model.train()
    best_loss = float("inf")

    for epoch in range(EPOCHS_RERANKER):
        total_loss = 0.0
        num_batches = 0

        # Mini-batch manually since data is pre-built
        for i in range(0, len(training_samples), BATCH_SIZE):
            batch = training_samples[i:i + BATCH_SIZE]

            user_profiles = torch.stack([s["user_profile"] for s in batch])
            brand_ids = torch.tensor([s["brand_idx"] for s in batch], dtype=torch.long)
            category_ids = torch.tensor([s["category_idx"] for s in batch], dtype=torch.long)
            gender_ids = torch.tensor([s["gender_idx"] for s in batch], dtype=torch.long)
            prices = torch.tensor([s["price_norm"] for s in batch], dtype=torch.float32)
            text_sims = torch.tensor([s["text_sim"] for s in batch], dtype=torch.float32)
            labels = torch.tensor([s["label"] for s in batch], dtype=torch.float32)

            optimizer.zero_grad()

            predictions = model(
                user_profile=user_profiles,
                brand_ids=brand_ids,
                category_ids=category_ids,
                gender_ids=gender_ids,
                price_norm=prices,
                text_similarity=text_sims,
            )

            loss = criterion(predictions, labels)
            loss.backward()

            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()

            total_loss += loss.item()
            num_batches += 1

        avg_loss = total_loss / max(num_batches, 1)
        scheduler.step(avg_loss)

        if avg_loss < best_loss:
            best_loss = avg_loss

        if (epoch + 1) % 10 == 0 or epoch == 0:
            lr = optimizer.param_groups[0]["lr"]
            logger.info(
                "  Epoch %3d/%d — loss: %.4f — lr: %.6f",
                epoch + 1, EPOCHS_RERANKER, avg_loss, lr,
            )

    torch.save(model.state_dict(), model_dir / "reranker.pt")
    torch.save(
        {"feature_builder": feature_builder},
        model_dir / "reranker.meta.pt",
    )

    logger.info("Reranker saved — best loss: %.4f", best_loss)


def _build_reranker_samples(
    feature_builder: FeatureBuilder,
    orders: list[dict],
    views: list[dict],
    favorites: list[dict],
) -> list[dict]:
    import random
    import numpy as np

    # Group interactions by user
    user_interactions: dict[str, dict] = {}

    for order in orders:
        uid = str(order["user_id"])
        user_interactions.setdefault(uid, {"purchased": [], "viewed": [], "favorited": []})
        user_interactions[uid]["purchased"].append(order["product_id"])

    for fav in favorites:
        uid = str(fav["user_id"])
        user_interactions.setdefault(uid, {"purchased": [], "viewed": [], "favorited": []})
        user_interactions[uid]["favorited"].append(fav["product_id"])

    for view in views:
        uid = str(view["user_id"])
        user_interactions.setdefault(uid, {"purchased": [], "viewed": [], "favorited": []})
        user_interactions[uid]["viewed"].append({
            "product_id": view["product_id"],
            "view_count": view.get("view_count", 1),
        })

    all_product_ids = feature_builder.get_all_product_ids()
    samples = []

    for uid, interactions in user_interactions.items():
        user_profile = feature_builder.build_user_profile(interactions)
        user_profile_tensor = torch.tensor(user_profile, dtype=torch.float32)

        # Positive products
        positive_ids = set(
            str(pid) for pid in
            interactions["purchased"] + interactions["favorited"]
            + [v["product_id"] for v in interactions["viewed"]]
        )

        for pid in positive_ids:
            features = feature_builder.get_product_features(str(pid))
            if features is None or features["brand_idx"] is None:
                continue

            samples.append({
                "user_profile": user_profile_tensor,
                "brand_idx": features["brand_idx"],
                "category_idx": features["category_idx"],
                "gender_idx": features["gender_idx"],
                "price_norm": features["price_norm"],
                "text_sim": random.uniform(0.3, 1.0),  # Simulated high text match
                "label": 1.0,
            })

        # Negative products
        negative_pool = [p for p in all_product_ids if p not in positive_ids]
        num_neg = min(len(positive_ids) * NEGATIVE_RATIO, len(negative_pool))

        for neg_pid in random.sample(negative_pool, max(num_neg, 0)):
            features = feature_builder.get_product_features(neg_pid)
            if features is None or features["brand_idx"] is None:
                continue

            samples.append({
                "user_profile": user_profile_tensor,
                "brand_idx": features["brand_idx"],
                "category_idx": features["category_idx"],
                "gender_idx": features["gender_idx"],
                "price_norm": features["price_norm"],
                "text_sim": random.uniform(0.0, 0.4),  # Simulated low text match
                "label": 0.0,
            })

    random.shuffle(samples)
    logger.info("Reranker training samples: %d (pos + neg)", len(samples))
    return samples


if __name__ == "__main__":
    main()