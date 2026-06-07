package handler

import (
	"encoding/json"
	"net/http"

	"github.com/google/uuid"
	"github.com/kicksneak/chat/internal/domain"
	"github.com/kicksneak/chat/internal/middleware"
	"github.com/kicksneak/chat/internal/service"
)

type RESTHandler struct {
	chatService *service.ChatService
}

func NewRESTHandler(chatService *service.ChatService) *RESTHandler {
	return &RESTHandler{chatService: chatService}
}

func (h *RESTHandler) GetSessions(w http.ResponseWriter, r *http.Request) {
	userID := middleware.ExtractUserID(r)

	if userID == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	sessions, err := h.chatService.GetSessions(r.Context(), userID, 0)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if sessions == nil {
		sessions = []domain.ChatSession{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"sessions": sessions})
}

func (h *RESTHandler) GetHistory(w http.ResponseWriter, r *http.Request) {
	userID := middleware.ExtractUserID(r)
	if userID == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	sessionIDStr := r.PathValue("sessionId")
	sessionID, err := uuid.Parse(sessionIDStr)
	if err != nil {
		http.Error(w, "invalid session id", http.StatusBadRequest)
		return
	}

	messages, err := h.chatService.GetHistory(r.Context(), sessionID, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"messages": messages})
}

func (h *RESTHandler) CloseSession(w http.ResponseWriter, r *http.Request) {
	userID := middleware.ExtractUserID(r)
	if userID == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	sessionIDStr := r.PathValue("sessionId")
	sessionID, err := uuid.Parse(sessionIDStr)
	if err != nil {
		http.Error(w, "invalid session id", http.StatusBadRequest)
		return
	}

	if err := h.chatService.CloseSession(r.Context(), sessionID, userID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

func (h *RESTHandler) GetSellerSessions(w http.ResponseWriter, r *http.Request) {
	userID := middleware.ExtractUserID(r)

	if userID == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	sessions, err := h.chatService.GetSessions(r.Context(), userID, 1)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if sessions == nil {
		sessions = []domain.ChatSession{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"sessions": sessions})
}

func (h *RESTHandler) GetSellerHistory(w http.ResponseWriter, r *http.Request) {
	h.GetHistory(w, r)
}

func (h *RESTHandler) CloseSellerSession(w http.ResponseWriter, r *http.Request) {
	h.CloseSession(w, r)
}
