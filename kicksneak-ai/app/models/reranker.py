import torch
import torch.nn as nn


class Reranker(nn.Module):
    def __init__(
        self,
        user_profile_dim: int,
        num_brands: int,
        num_categories: int,
        num_genders: int,
        embedding_dim: int = 32,
        hidden_dim: int = 128,
    ):
        super().__init__()

        self.brand_embedding = nn.Embedding(num_brands, embedding_dim)
        self.category_embedding = nn.Embedding(num_categories, embedding_dim)
        self.gender_embedding = nn.Embedding(num_genders, embedding_dim)

        product_feature_dim = embedding_dim * 3 + 1  # brand + category + gender + price_norm

        # input = user_profile + product_features + text_similarity_score
        input_dim = user_profile_dim + product_feature_dim + 1

        self.mlp = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.BatchNorm1d(hidden_dim),
            nn.LeakyReLU(0.1),
            nn.Dropout(0.3),
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.BatchNorm1d(hidden_dim // 2),
            nn.LeakyReLU(0.1),
            nn.Dropout(0.2),
            nn.Linear(hidden_dim // 2, hidden_dim // 4),
            nn.ReLU(),
            nn.Linear(hidden_dim // 4, 1),
            nn.Sigmoid(),
        )

        self._init_weights()

    def _init_weights(self):
        nn.init.xavier_uniform_(self.brand_embedding.weight)
        nn.init.xavier_uniform_(self.category_embedding.weight)
        nn.init.xavier_uniform_(self.gender_embedding.weight)
        for module in self.mlp:
            if isinstance(module, nn.Linear):
                nn.init.kaiming_normal_(module.weight)
                nn.init.zeros_(module.bias)

    def forward(
        self,
        user_profile: torch.Tensor,
        brand_ids: torch.Tensor,
        category_ids: torch.Tensor,
        gender_ids: torch.Tensor,
        price_norm: torch.Tensor,
        text_similarity: torch.Tensor,
    ) -> torch.Tensor:
        brand_emb = self.brand_embedding(brand_ids)
        category_emb = self.category_embedding(category_ids)
        gender_emb = self.gender_embedding(gender_ids)

        product_features = torch.cat([
            brand_emb,
            category_emb,
            gender_emb,
            price_norm.unsqueeze(-1),
        ], dim=1)

        combined = torch.cat([
            user_profile,
            product_features,
            text_similarity.unsqueeze(-1),
        ], dim=1)

        return self.mlp(combined).squeeze(-1)