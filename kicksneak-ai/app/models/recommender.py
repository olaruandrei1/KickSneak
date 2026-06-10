import torch
import torch.nn as nn


class Recommender(nn.Module):
    def __init__(
        self,
        num_users: int,
        num_products: int,
        embedding_dim: int = 64,
        hidden_dim: int = 128,
    ):
        super().__init__()

        self.user_embedding = nn.Embedding(num_users, embedding_dim)
        self.product_embedding = nn.Embedding(num_products, embedding_dim)

        self.mlp = nn.Sequential(
            nn.Linear(embedding_dim * 2, hidden_dim),
            nn.BatchNorm1d(hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.BatchNorm1d(hidden_dim // 2),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(hidden_dim // 2, 1),
            nn.Sigmoid(),
        )

        self._init_weights()

    def _init_weights(self):
        nn.init.xavier_uniform_(self.user_embedding.weight)
        nn.init.xavier_uniform_(self.product_embedding.weight)
        for module in self.mlp:
            if isinstance(module, nn.Linear):
                nn.init.kaiming_normal_(module.weight)
                nn.init.zeros_(module.bias)

    def forward(self, user_ids: torch.Tensor, product_ids: torch.Tensor) -> torch.Tensor:
        user_emb = self.user_embedding(user_ids)
        product_emb = self.product_embedding(product_ids)

        combined = torch.cat([user_emb, product_emb], dim=1)
        return self.mlp(combined).squeeze(-1)

    def get_product_embeddings(self) -> torch.Tensor:
        return self.product_embedding.weight.detach()

    def get_user_embedding(self, user_id: torch.Tensor) -> torch.Tensor:
        return self.user_embedding(user_id).detach()