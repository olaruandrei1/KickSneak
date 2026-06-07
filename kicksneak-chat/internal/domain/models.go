package domain

import (
	"time"

	"github.com/google/uuid"
)

type ChatSession struct {
	ID        uuid.UUID  `json:"id"`
	UserID    string     `json:"userId"`
	ChatType  int        `json:"chatType"` // 0 = buyer, 1 = seller
	Title     string     `json:"title"`
	Status    string     `json:"status"`
	CreatedAt time.Time  `json:"createdAt"`
	ClosedAt  *time.Time `json:"closedAt,omitempty"`
}

type ChatMessage struct {
	ID        uuid.UUID `json:"id"`
	SessionID uuid.UUID `json:"sessionId"`
	Role      string    `json:"role"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"createdAt"`
}

type OllamaMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type OllamaRequest struct {
	Model    string          `json:"model"`
	Messages []OllamaMessage `json:"messages"`
	Stream   bool            `json:"stream"`
}

type OllamaStreamChunk struct {
	Message struct {
		Role    string `json:"role"`
		Content string `json:"content"`
	} `json:"message"`
	Done bool `json:"done"`
}

type WSIncoming struct {
	Type      string `json:"type"`
	Content   string `json:"content,omitempty"`
	SessionID string `json:"sessionId,omitempty"`
}

type WSOutgoing struct {
	Type      string        `json:"type"`
	Content   string        `json:"content,omitempty"`
	SessionID string        `json:"sessionId,omitempty"`
	Message   *ChatMessage  `json:"message,omitempty"`
	Messages  []ChatMessage `json:"messages,omitempty"`
	Session   *ChatSession  `json:"session,omitempty"`
}

type IntentResponse struct {
	Intent string   `json:"intent"` // data_needed, escalate, direct_answer
	Tables []string `json:"tables"` // orders, returns, auctions, profile
	Limit  int      `json:"limit"`
}

type UserDataContext struct {
	Orders         []map[string]any `json:"orders,omitempty"`
	Returns        []map[string]any `json:"returns,omitempty"`
	Auctions       []map[string]any `json:"auctions,omitempty"`
	Profile        map[string]any   `json:"profile,omitempty"`
	SellerSales    any              `json:"seller_sales,omitempty"`
	SellerListings any              `json:"seller_listings,omitempty"`
	SellerReturns  any              `json:"seller_returns,omitempty"`
}
