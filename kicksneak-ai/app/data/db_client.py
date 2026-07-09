from contextlib import contextmanager
from typing import Generator

import psycopg2
from psycopg2.extras import RealDictCursor

from app.config import Config


class DbClient:
    def __init__(self):
        self._conn_str = Config.db_connection_string()

    @contextmanager
    def connection(self) -> Generator:
        conn = psycopg2.connect(self._conn_str)
        try:
            yield conn
        finally:
            conn.close()

    @contextmanager
    def cursor(self) -> Generator:
        with self.connection() as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            try:
                yield cur
            finally:
                cur.close()

    def fetch_products(self) -> list[dict]:
        with self.cursor() as cur:
            cur.execute("""
                SELECT p."Id" AS id,
                       p."Title" AS title,
                       p."RetailPrice" AS retail_price,
                       p."BrandId" AS brand_id,
                       p."CategoryId" AS category_id,
                       p."GenderId" AS gender_id,
                       p."ReleaseDate" AS release_date
                FROM products p
                WHERE p."IsDeleted" = false
            """)
            return cur.fetchall()

    def fetch_orders(self) -> list[dict]:
        with self.cursor() as cur:
            cur.execute("""
                SELECT o."BuyerId" AS user_id,
                       si."ProductId" AS product_id
                FROM orders o
                JOIN stock_items si ON o."StockItemId" = si."Id"
                WHERE o."IsDeleted" = false
                  AND o."Status" != 4
            """)
            return cur.fetchall()

    def fetch_views(self) -> list[dict]:
        with self.cursor() as cur:
            cur.execute("""
                SELECT pv."UserId" AS user_id,
                       pv."ProductId" AS product_id,
                       pv."ViewCount" AS view_count
                FROM product_viewed pv
            """)
            return cur.fetchall()

    def fetch_favorites(self) -> list[dict]:
        with self.cursor() as cur:
            cur.execute("""
                SELECT f."UserId" AS user_id,
                       f."ProductId" AS product_id
                FROM user_favorites f
                WHERE f."IsDeleted" = false
            """)
            return cur.fetchall()

    def resolve_user_id(self, user_id: str) -> str | None:
        """Frontend sends the Firebase UID; interaction tables are keyed by the DB Guid.
        Pass through if it's already a UUID, else look up the Guid by FirebaseUid."""
        import uuid as _uuid
        if not user_id:
            return None
        try:
            _uuid.UUID(str(user_id))
            return str(user_id)
        except (ValueError, TypeError):
            pass
        with self.cursor() as cur:
            cur.execute(
                'SELECT "Id" AS id FROM users WHERE "FirebaseUid" = %s AND NOT "IsDeleted"',
                (user_id,),
            )
            row = cur.fetchone()
            return str(row["id"]) if row else None

    def fetch_user_interactions(self, user_id: str) -> dict:
        user_id = self.resolve_user_id(user_id)
        if user_id is None:
            return {"purchased": [], "viewed": [], "favorited": []}
        with self.cursor() as cur:
            cur.execute("""
                SELECT si."ProductId" AS product_id
                FROM orders o
                JOIN stock_items si ON o."StockItemId" = si."Id"
                WHERE o."BuyerId" = %s AND o."IsDeleted" = false
            """, (user_id,))
            purchased = [r["product_id"] for r in cur.fetchall()]

            cur.execute("""
                SELECT "ProductId" AS product_id, "ViewCount" AS view_count
                FROM product_viewed
                WHERE "UserId" = %s
            """, (user_id,))
            viewed = cur.fetchall()

            cur.execute("""
                SELECT "ProductId" AS product_id
                FROM user_favorites
                WHERE "UserId" = %s AND "IsDeleted" = false
            """, (user_id,))
            favorited = [r["product_id"] for r in cur.fetchall()]

            return {
                "purchased": purchased,
                "viewed": viewed,
                "favorited": favorited,
            }


db_client = DbClient()