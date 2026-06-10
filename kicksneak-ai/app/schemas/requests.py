from pydantic import BaseModel, Field


class RerankRequest(BaseModel):
    query: str = Field(min_length=1, max_length=200)
    user_id: str | None = None
    candidate_ids: list[str] = Field(default_factory=list)
    limit: int = Field(default=10, ge=1, le=50)


class RerankItem(BaseModel):
    id: str
    score: float


class RerankResponse(BaseModel):
    items: list[RerankItem]


class RecommendRequest(BaseModel):
    user_id: str
    limit: int = Field(default=10, ge=1, le=50)


class RecommendItem(BaseModel):
    id: str
    score: float


class RecommendResponse(BaseModel):
    items: list[RecommendItem]