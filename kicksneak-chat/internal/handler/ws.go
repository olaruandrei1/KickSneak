package handler

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/kicksneak/chat/internal/domain"
	"github.com/kicksneak/chat/internal/middleware"
	"github.com/kicksneak/chat/internal/service"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type WSHandler struct {
	chatService *service.ChatService
}

func NewWSHandler(chatService *service.ChatService) *WSHandler {
	return &WSHandler{chatService: chatService}
}
func (h *WSHandler) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	userID := middleware.ExtractUserID(r)
	if userID == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[WS] upgrade error: %v", err)
		return
	}
	defer conn.Close()

	conn.SetReadDeadline(time.Time{})
	conn.SetPongHandler(func(string) error {
		return nil
	})

	var writeMu sync.Mutex

	writeJSON := func(msg domain.WSOutgoing) error {
		writeMu.Lock()
		defer writeMu.Unlock()
		conn.SetWriteDeadline(time.Now().Add(120 * time.Second))
		return conn.WriteJSON(msg)
	}

	go func() {
		ticker := time.NewTicker(15 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			writeMu.Lock()
			conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			err := conn.WriteMessage(websocket.PingMessage, nil)
			writeMu.Unlock()
			if err != nil {
				return
			}
		}
	}()

	session, isNew, err := h.chatService.GetOrCreateSession(r.Context(), userID, 0)

	if err != nil {
		log.Printf("[WS] session error: %v", err)
		return
	}

	_ = writeJSON(domain.WSOutgoing{
		Type:      "session_created",
		SessionID: session.ID.String(),
		Session:   session,
	})

	if !isNew {
		messages, err := h.chatService.GetHistory(r.Context(), session.ID, userID)
		if err == nil && len(messages) > 0 {
			_ = writeJSON(domain.WSOutgoing{
				Type:     "history",
				Messages: messages,
			})
		}
	}

	for {
		_, raw, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
				log.Printf("[WS] read error: %v", err)
			}
			break
		}

		var incoming domain.WSIncoming
		if err := json.Unmarshal(raw, &incoming); err != nil {
			_ = writeJSON(domain.WSOutgoing{Type: "error", Content: "invalid message format"})
			continue
		}

		switch incoming.Type {
		case "message":
			if incoming.Content == "" {
				_ = writeJSON(domain.WSOutgoing{Type: "error", Content: "empty message"})
				continue
			}

			sessionID := session.ID
			if incoming.SessionID != "" {
				if parsed, err := uuid.Parse(incoming.SessionID); err == nil {
					sessionID = parsed
				}
			}

			// Run in goroutine so read loop continues (keeps connection alive)
			go func() {
				_, err := h.chatService.SendMessage(context.Background(), sessionID, userID, incoming.Content, func(token string) error {
					return writeJSON(domain.WSOutgoing{
						Type:      "token",
						Content:   token,
						SessionID: sessionID.String(),
					})
				})

				if err != nil {
					log.Printf("[WS] send message error: %v", err)
					_ = writeJSON(domain.WSOutgoing{Type: "error", Content: "failed to get response"})
					return
				}

				_ = writeJSON(domain.WSOutgoing{
					Type:      "message_complete",
					SessionID: sessionID.String(),
				})
			}()

		case "close_session":
			if incoming.SessionID != "" {
				if parsed, err := uuid.Parse(incoming.SessionID); err == nil {
					_ = h.chatService.CloseSession(r.Context(), parsed, userID)
				}
			}

		case "get_history":
			if incoming.SessionID != "" {
				if parsed, err := uuid.Parse(incoming.SessionID); err == nil {
					messages, err := h.chatService.GetHistory(r.Context(), parsed, userID)
					if err == nil {
						_ = writeJSON(domain.WSOutgoing{
							Type:      "history",
							SessionID: incoming.SessionID,
							Messages:  messages,
						})
					}
				}
			}
		}
	}
}

func (h *WSHandler) HandleSellerWebSocket(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("uid")
	if userID == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[WS-SELLER] upgrade error: %v", err)
		return
	}
	defer conn.Close()

	conn.SetReadDeadline(time.Time{})
	conn.SetPongHandler(func(string) error {
		return nil
	})

	var writeMu sync.Mutex
	writeJSON := func(msg domain.WSOutgoing) error {
		writeMu.Lock()
		defer writeMu.Unlock()
		conn.SetWriteDeadline(time.Now().Add(120 * time.Second))
		return conn.WriteJSON(msg)
	}

	go func() {
		ticker := time.NewTicker(15 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			writeMu.Lock()
			conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			err := conn.WriteMessage(websocket.PingMessage, nil)
			writeMu.Unlock()
			if err != nil {
				return
			}
		}
	}()

	session, isNew, err := h.chatService.GetOrCreateSession(r.Context(), userID, 1)

	if err != nil {
		log.Printf("[WS-SELLER] session error: %v", err)
		return
	}

	_ = writeJSON(domain.WSOutgoing{
		Type:      "session_created",
		SessionID: session.ID.String(),
		Session:   session,
	})

	if !isNew {
		messages, err := h.chatService.GetHistory(r.Context(), session.ID, userID)
		if err == nil && len(messages) > 0 {
			_ = writeJSON(domain.WSOutgoing{
				Type:     "history",
				Messages: messages,
			})
		}
	}

	for {
		_, raw, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
				log.Printf("[WS-SELLER] read error: %v", err)
			}
			break
		}

		var incoming domain.WSIncoming
		if err := json.Unmarshal(raw, &incoming); err != nil {
			_ = writeJSON(domain.WSOutgoing{Type: "error", Content: "invalid message format"})
			continue
		}

		switch incoming.Type {
		case "message":
			if incoming.Content == "" {
				_ = writeJSON(domain.WSOutgoing{Type: "error", Content: "empty message"})
				continue
			}

			sessionID := session.ID
			if incoming.SessionID != "" {
				if parsed, err := uuid.Parse(incoming.SessionID); err == nil {
					sessionID = parsed
				}
			}

			go func() {
				_, err := h.chatService.SendSellerMessage(context.Background(), sessionID, userID, incoming.Content, func(token string) error {
					return writeJSON(domain.WSOutgoing{
						Type:      "token",
						Content:   token,
						SessionID: sessionID.String(),
					})
				})

				if err != nil {
					log.Printf("[WS-SELLER] send message error: %v", err)
					_ = writeJSON(domain.WSOutgoing{Type: "error", Content: "failed to get response"})
					return
				}

				_ = writeJSON(domain.WSOutgoing{
					Type:      "message_complete",
					SessionID: sessionID.String(),
				})
			}()

		case "close_session":
			if incoming.SessionID != "" {
				if parsed, err := uuid.Parse(incoming.SessionID); err == nil {
					_ = h.chatService.CloseSession(r.Context(), parsed, userID)
				}
			}

		case "get_history":
			if incoming.SessionID != "" {
				if parsed, err := uuid.Parse(incoming.SessionID); err == nil {
					messages, err := h.chatService.GetHistory(r.Context(), parsed, userID)
					if err == nil {
						_ = writeJSON(domain.WSOutgoing{
							Type:      "history",
							SessionID: incoming.SessionID,
							Messages:  messages,
						})
					}
				}
			}
		}
	}
}
