package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kicksneak/chat/internal/domain"
)

type ChatRepository struct {
	pool *pgxpool.Pool
}

func NewChatRepository(pool *pgxpool.Pool) *ChatRepository {
	return &ChatRepository{pool: pool}
}

func (r *ChatRepository) Migrate(ctx context.Context) error {
	query := `
		CREATE TABLE IF NOT EXISTS chat_sessions (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id VARCHAR(128) NOT NULL,
			title VARCHAR(500) NOT NULL DEFAULT 'New Chat',
			status VARCHAR(20) NOT NULL DEFAULT 'active',
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			closed_at TIMESTAMPTZ
		);

		ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS chat_type SMALLINT NOT NULL DEFAULT 0;

		CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id_type ON chat_sessions(user_id, chat_type);

		CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);

		CREATE TABLE IF NOT EXISTS chat_messages (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
			role VARCHAR(20) NOT NULL,
			content TEXT NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);

		CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
	`
	_, err := r.pool.Exec(ctx, query)
	return err
}

func (r *ChatRepository) CreateSession(ctx context.Context, userID string, chatType int) (*domain.ChatSession, error) {
	session := &domain.ChatSession{
		ID:        uuid.New(),
		UserID:    userID,
		ChatType:  chatType,
		Title:     "New Chat",
		Status:    "active",
		CreatedAt: time.Now().UTC(),
	}

	_, err := r.pool.Exec(ctx,
		`INSERT INTO chat_sessions (id, user_id, chat_type, title, status, created_at) VALUES ($1, $2, $3, $4, $5, $6)`,
		session.ID, session.UserID, session.ChatType, session.Title, session.Status, session.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("create session: %w", err)
	}

	return session, nil
}

func (r *ChatRepository) GetSession(ctx context.Context, sessionID uuid.UUID) (*domain.ChatSession, error) {
	var s domain.ChatSession
	err := r.pool.QueryRow(ctx,
		`SELECT id, user_id, title, status, created_at, closed_at, chat_type FROM chat_sessions WHERE id = $1`,
		sessionID,
	).Scan(&s.ID, &s.UserID, &s.Title, &s.Status, &s.CreatedAt, &s.ClosedAt, &s.ChatType)
	if err != nil {
		return nil, fmt.Errorf("get session: %w", err)
	}
	return &s, nil
}

func (r *ChatRepository) GetUserSessions(ctx context.Context, userID string, chatType int) ([]domain.ChatSession, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, user_id, chat_type, title, status, created_at, closed_at
		 FROM chat_sessions WHERE user_id = $1 AND chat_type = $2 ORDER BY created_at DESC LIMIT 50`,
		userID, chatType,
	)
	if err != nil {
		return nil, fmt.Errorf("get user sessions: %w", err)
	}
	defer rows.Close()

	var sessions []domain.ChatSession
	for rows.Next() {
		var s domain.ChatSession
		if err := rows.Scan(&s.ID, &s.UserID, &s.ChatType, &s.Title, &s.Status, &s.CreatedAt, &s.ClosedAt); err != nil {
			return nil, fmt.Errorf("scan session: %w", err)
		}
		sessions = append(sessions, s)
	}

	return sessions, nil
}

func (r *ChatRepository) CloseSession(ctx context.Context, sessionID uuid.UUID) error {
	now := time.Now().UTC()
	_, err := r.pool.Exec(ctx,
		`UPDATE chat_sessions SET status = 'closed', closed_at = $1 WHERE id = $2`,
		now, sessionID,
	)
	return err
}

func (r *ChatRepository) UpdateSessionTitle(ctx context.Context, sessionID uuid.UUID, title string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE chat_sessions SET title = $1 WHERE id = $2`,
		title, sessionID,
	)
	return err
}

func (r *ChatRepository) SaveMessage(ctx context.Context, msg *domain.ChatMessage) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO chat_messages (id, session_id, role, content, created_at) VALUES ($1, $2, $3, $4, $5)`,
		msg.ID, msg.SessionID, msg.Role, msg.Content, msg.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("save message: %w", err)
	}
	return nil
}

func (r *ChatRepository) GetSessionMessages(ctx context.Context, sessionID uuid.UUID) ([]domain.ChatMessage, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, session_id, role, content, created_at 
		 FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC`,
		sessionID,
	)
	if err != nil {
		return nil, fmt.Errorf("get messages: %w", err)
	}
	defer rows.Close()

	var messages []domain.ChatMessage
	for rows.Next() {
		var m domain.ChatMessage
		if err := rows.Scan(&m.ID, &m.SessionID, &m.Role, &m.Content, &m.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan message: %w", err)
		}
		messages = append(messages, m)
	}

	return messages, nil
}

func (r *ChatRepository) GetActiveSession(ctx context.Context, userID string, chatType int) (*domain.ChatSession, error) {
	var s domain.ChatSession
	err := r.pool.QueryRow(ctx,
		`SELECT id, user_id, chat_type, title, status, created_at, closed_at 
		 FROM chat_sessions WHERE user_id = $1 AND chat_type = $2 AND status = 'active' 
		 ORDER BY created_at DESC LIMIT 1`,
		userID, chatType,
	).Scan(&s.ID, &s.UserID, &s.ChatType, &s.Title, &s.Status, &s.CreatedAt, &s.ClosedAt)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *ChatRepository) GetUserOrders(ctx context.Context, firebaseUID string, limit int) ([]map[string]any, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT o."Id", o."Status", o."TotalPrice", o."TrackingNumber", o."CreatedAt",
		       COALESCE(p."Title", '') as product_name,
		       COALESCE(s2."SizeLabel", '') as size
		FROM orders o
		JOIN users u ON o."BuyerId" = u."Id"
		LEFT JOIN stock_items si ON o."StockItemId" = si."Id"
		LEFT JOIN used_items ui ON o."UsedItemId" = ui."Id"
		LEFT JOIN products p ON COALESCE(si."ProductId", ui."ProductId") = p."Id"
		LEFT JOIN sizes s2 ON COALESCE(si."SizeId", ui."SizeId") = s2."Id"
		WHERE u."FirebaseUid" = $1 AND NOT o."IsDeleted"
		ORDER BY o."CreatedAt" DESC LIMIT $2
	`, firebaseUID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanMaps(rows)
}

func (r *ChatRepository) GetUserReturns(ctx context.Context, firebaseUID string, limit int) ([]map[string]any, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT ret."Id", ret."Status", ret."Reason", ret."Description", ret."CreatedAt",
		       o."TotalPrice",
		       COALESCE(p."Title", '') as product_name
		FROM returns ret
		JOIN orders o ON ret."OrderId" = o."Id"
		JOIN users u ON ret."UserId" = u."Id"
		LEFT JOIN stock_items si ON o."StockItemId" = si."Id"
		LEFT JOIN used_items ui ON o."UsedItemId" = ui."Id"
		LEFT JOIN products p ON COALESCE(si."ProductId", ui."ProductId") = p."Id"
		WHERE u."FirebaseUid" = $1 AND NOT ret."IsDeleted"
		ORDER BY ret."CreatedAt" DESC LIMIT $2
	`, firebaseUID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanMaps(rows)
}

func (r *ChatRepository) GetUserAuctions(ctx context.Context, firebaseUID string, limit int) ([]map[string]any, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT a."Id", a."Status", a."CurrentPrice", a."BidCount", a."EndsAt", a."StartPrice",
		       COALESCE(p."Title", '') as product_name
		FROM bids b
		JOIN users u ON b."BidderId" = u."Id"
		JOIN auctions a ON b."AuctionId" = a."Id"
		LEFT JOIN stock_items si ON a."StockItemId" = si."Id"
		LEFT JOIN products p ON si."ProductId" = p."Id"
		WHERE u."FirebaseUid" = $1 AND NOT a."IsDeleted"
		GROUP BY a."Id", p."Title"
		ORDER BY MAX(b."PlacedAt") DESC LIMIT $2
	`, firebaseUID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanMaps(rows)
}

func (r *ChatRepository) GetUserProfile(ctx context.Context, firebaseUID string) (map[string]any, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT u."FirstName", u."LastName", u."FirebaseUid", u."CreatedAt",
		       COALESCE(uc."EmailAddress", '') as email,
		       CASE WHEN s."Id" IS NOT NULL THEN true ELSE false END as is_seller,
		       COALESCE(sel."StoreName", '') as store_name
		FROM users u
		LEFT JOIN user_contacts uc ON uc."UserId" = u."Id" AND uc."IsPrincipal" = true
		LEFT JOIN sellers sel ON sel."UserId" = u."Id"
		LEFT JOIN sellers s ON s."UserId" = u."Id"
		WHERE u."FirebaseUid" = $1 AND NOT u."IsDeleted"
		LIMIT 1
	`, firebaseUID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	results, err := scanMaps(rows)
	if err != nil || len(results) == 0 {
		return nil, err
	}
	return results[0], nil
}

func scanMaps(rows pgx.Rows) ([]map[string]any, error) {
	descs := rows.FieldDescriptions()
	var results []map[string]any

	for rows.Next() {
		values, err := rows.Values()
		if err != nil {
			return nil, err
		}

		row := make(map[string]any, len(descs))
		for i, desc := range descs {
			row[string(desc.Name)] = values[i]
		}
		results = append(results, row)
	}

	return results, rows.Err()
}

func (r *ChatRepository) GetSellerSales(ctx context.Context, firebaseUID string, limit int) ([]map[string]any, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT o."Id", o."Status", o."TotalPrice", o."CreatedAt",
			   COALESCE(p."Title", '') as product_name,
			   COALESCE(sz."SizeLabel", '') as size
		FROM orders o
		LEFT JOIN stock_items si ON o."StockItemId" = si."Id"
		LEFT JOIN used_items ui ON o."UsedItemId" = ui."Id"
		JOIN sellers s ON COALESCE(si."SellerId", ui."SellerId") = s."Id"
		JOIN users su ON s."UserId" = su."Id"
		LEFT JOIN products p ON COALESCE(si."ProductId", ui."ProductId") = p."Id"
		LEFT JOIN sizes sz ON COALESCE(si."SizeId", ui."SizeId") = sz."Id"
		WHERE su."FirebaseUid" = $1 AND NOT o."IsDeleted"
		ORDER BY o."CreatedAt" DESC LIMIT $2
	`, firebaseUID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanMaps(rows)
}

func (r *ChatRepository) GetSellerListings(ctx context.Context, firebaseUID string, limit int) ([]map[string]any, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT item."Id", item."Price", item."Condition", item."CreatedAt", 
		       COALESCE(p."Title", '') as product_name, 
			   COALESCE(sz."SizeLabel", '') as size
		FROM (
			SELECT "Id", "Price", 'New' as "Condition", "CreatedAt", "ProductId", "SizeId", "SellerId", "IsDeleted" FROM stock_items
			UNION ALL
			SELECT "Id", "Price", 'Used' as "Condition", "CreatedAt", "ProductId", "SizeId", "SellerId", "IsDeleted" FROM used_items
		) item
		JOIN sellers s ON item."SellerId" = s."Id"
		JOIN users su ON s."UserId" = su."Id"
		LEFT JOIN products p ON item."ProductId" = p."Id"
		LEFT JOIN sizes sz ON item."SizeId" = sz."Id"
		WHERE su."FirebaseUid" = $1 AND NOT item."IsDeleted"
		ORDER BY item."CreatedAt" DESC LIMIT $2
	`, firebaseUID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanMaps(rows)
}

func (r *ChatRepository) GetSellerReturns(ctx context.Context, firebaseUID string, limit int) ([]map[string]any, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT ret."Id", ret."Status", ret."Reason", ret."CreatedAt",
			   o."TotalPrice",
			   COALESCE(p."Title", '') as product_name
		FROM returns ret
		JOIN orders o ON ret."OrderId" = o."Id"
		LEFT JOIN stock_items si ON o."StockItemId" = si."Id"
		LEFT JOIN used_items ui ON o."UsedItemId" = ui."Id"
		JOIN sellers s ON COALESCE(si."SellerId", ui."SellerId") = s."Id"
		JOIN users su ON s."UserId" = su."Id"
		LEFT JOIN products p ON COALESCE(si."ProductId", ui."ProductId") = p."Id"
		WHERE su."FirebaseUid" = $1 AND NOT ret."IsDeleted"
		ORDER BY ret."CreatedAt" DESC LIMIT $2
	`, firebaseUID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanMaps(rows)
}
