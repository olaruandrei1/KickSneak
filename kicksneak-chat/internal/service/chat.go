package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/kicksneak/chat/internal/domain"
	"github.com/kicksneak/chat/internal/repository"
)

type ChatService struct {
	repo   *repository.ChatRepository
	ollama *OllamaService
}

func NewChatService(repo *repository.ChatRepository, ollama *OllamaService) *ChatService {
	return &ChatService{repo: repo, ollama: ollama}
}

func (s *ChatService) GetOrCreateSession(ctx context.Context, userID string, chatType int) (*domain.ChatSession, bool, error) {
	session, err := s.repo.GetActiveSession(ctx, userID, chatType)
	if err == nil && session != nil {
		return session, false, nil
	}

	session, err = s.repo.CreateSession(ctx, userID, chatType)
	if err != nil {
		return nil, false, fmt.Errorf("create session: %w", err)
	}

	return session, true, nil
}
func (s *ChatService) SendMessage(ctx context.Context, sessionID uuid.UUID, userID, content string, onToken func(string) error) (*domain.ChatMessage, error) {
	session, err := s.repo.GetSession(ctx, sessionID)
	if err != nil {
		return nil, fmt.Errorf("get session: %w", err)
	}
	if session.UserID != userID {
		return nil, fmt.Errorf("unauthorized")
	}
	if session.Status != "active" {
		return nil, fmt.Errorf("session closed")
	}

	// Save user message
	userMsg := &domain.ChatMessage{
		ID:        uuid.New(),
		SessionID: sessionID,
		Role:      "user",
		Content:   content,
		CreatedAt: time.Now().UTC(),
	}
	if err := s.repo.SaveMessage(ctx, userMsg); err != nil {
		return nil, fmt.Errorf("save user message: %w", err)
	}

	if session.Title == "New Chat" {
		title := content
		if len(title) > 60 {
			title = title[:60] + "..."
		}
		_ = s.repo.UpdateSessionTitle(ctx, sessionID, title)
	}

	// Get history FIRST (needed for intent analysis)
	history, err := s.repo.GetSessionMessages(ctx, sessionID)
	if err != nil {
		return nil, fmt.Errorf("get history: %w", err)
	}

	// Step 1: Analyze intent with full conversation context
	intent, err := s.ollama.AnalyzeIntent(ctx, history, content)
	if err != nil {
		intent = &domain.IntentResponse{Intent: "direct_answer"}
	}

	log.Printf("[Chat] Intent: %s, Tables: %v", intent.Intent, intent.Tables)

	// Step 2: Handle escalation
	if intent.Intent == "escalate" {
		escalateMsg := "I understand you'd like to speak with a human agent. Let me connect you to our support team."
		for _, ch := range escalateMsg {
			if err := onToken(string(ch)); err != nil {
				break
			}
		}

		assistantMsg := &domain.ChatMessage{
			ID:        uuid.New(),
			SessionID: sessionID,
			Role:      "assistant",
			Content:   escalateMsg,
			CreatedAt: time.Now().UTC(),
		}
		_ = s.repo.SaveMessage(ctx, assistantMsg)
		_ = onToken("\n__ESCALATE__")

		return assistantMsg, nil
	}

	// Step 3: Fetch data if needed
	var dataContext *domain.UserDataContext
	if intent.Intent == "data_needed" && len(intent.Tables) > 0 {
		dataContext = &domain.UserDataContext{}

		for _, table := range intent.Tables {
			switch table {
			case "orders":
				data, err := s.repo.GetUserOrders(ctx, userID, intent.Limit)
				if err == nil {
					dataContext.Orders = data
				}
			case "returns":
				data, err := s.repo.GetUserReturns(ctx, userID, intent.Limit)
				if err == nil {
					dataContext.Returns = data
				}
			case "auctions":
				data, err := s.repo.GetUserAuctions(ctx, userID, intent.Limit)
				if err == nil {
					dataContext.Auctions = data
				}
			case "profile":
				data, err := s.repo.GetUserProfile(ctx, userID)
				if err == nil {
					dataContext.Profile = data
				}
			}
		}
	}

	if dataContext != nil {
		dataJSON, _ := json.Marshal(dataContext)
		log.Printf("[Chat] Data fetched: %s", string(dataJSON))
	}

	// Step 4: Inject data context if we have it
	if dataContext != nil {
		dataJSON, _ := json.Marshal(dataContext)
		contextMsg := domain.ChatMessage{
			ID:        uuid.New(),
			SessionID: sessionID,
			Role:      "system",
			Content:   fmt.Sprintf("Here is the user's real data from the KickSneak database. Use ONLY this data to answer. If the data is empty or null, tell the user you couldn't find any records.\n\n%s", string(dataJSON)),
			CreatedAt: time.Now().UTC(),
		}
		history = append(history, contextMsg)
	}

	// Step 5: Stream response with appropriate prompt
	var prompt string
	if dataContext != nil {
		prompt = s.ollama.DataAnswerPrompt()
	} else {
		prompt = s.ollama.DirectAnswerPrompt()
	}

	fullResponse, err := s.ollama.StreamChat(ctx, history, prompt, onToken)
	if err != nil {
		return nil, fmt.Errorf("ollama stream: %w", err)
	}

	assistantMsg := &domain.ChatMessage{
		ID:        uuid.New(),
		SessionID: sessionID,
		Role:      "assistant",
		Content:   fullResponse,
		CreatedAt: time.Now().UTC(),
	}
	if err := s.repo.SaveMessage(ctx, assistantMsg); err != nil {
		return nil, fmt.Errorf("save assistant message: %w", err)
	}

	return assistantMsg, nil
}

func (s *ChatService) GetHistory(ctx context.Context, sessionID uuid.UUID, userID string) ([]domain.ChatMessage, error) {
	session, err := s.repo.GetSession(ctx, sessionID)
	if err != nil {
		return nil, fmt.Errorf("get session: %w", err)
	}
	if session.UserID != userID {
		return nil, fmt.Errorf("unauthorized")
	}

	return s.repo.GetSessionMessages(ctx, sessionID)
}

func (s *ChatService) GetSessions(ctx context.Context, userID string, chatType int) ([]domain.ChatSession, error) {
	return s.repo.GetUserSessions(ctx, userID, chatType)
}

func (s *ChatService) CloseSession(ctx context.Context, sessionID uuid.UUID, userID string) error {
	session, err := s.repo.GetSession(ctx, sessionID)
	if err != nil {
		return fmt.Errorf("get session: %w", err)
	}
	if session.UserID != userID {
		return fmt.Errorf("unauthorized")
	}

	return s.repo.CloseSession(ctx, sessionID)
}

func (s *ChatService) SendSellerMessage(ctx context.Context, sessionID uuid.UUID, userID, content string, onToken func(string) error) (*domain.ChatMessage, error) {
	session, err := s.repo.GetSession(ctx, sessionID)
	if err != nil {
		return nil, fmt.Errorf("get session: %w", err)
	}
	if session.UserID != userID {
		return nil, fmt.Errorf("unauthorized")
	}
	if session.Status != "active" {
		return nil, fmt.Errorf("session closed")
	}

	userMsg := &domain.ChatMessage{
		ID:        uuid.New(),
		SessionID: sessionID,
		Role:      "user",
		Content:   content,
		CreatedAt: time.Now().UTC(),
	}
	if err := s.repo.SaveMessage(ctx, userMsg); err != nil {
		return nil, fmt.Errorf("save user message: %w", err)
	}

	if session.Title == "New Chat" {
		title := content
		if len(title) > 60 {
			title = title[:60] + "..."
		}
		_ = s.repo.UpdateSessionTitle(ctx, sessionID, title)
	}

	history, err := s.repo.GetSessionMessages(ctx, sessionID)
	if err != nil {
		return nil, fmt.Errorf("get history: %w", err)
	}

	intent, err := s.ollama.AnalyzeIntent(ctx, history, content)
	if err != nil {
		intent = &domain.IntentResponse{Intent: "direct_answer"}
	}

	log.Printf("[SellerChat] Intent: %s, Tables: %v", intent.Intent, intent.Tables)

	if intent.Intent == "escalate" {
		escalateMsg := "I understand you'd like to speak with a human agent. Let me connect you to our Seller Support team."
		for _, ch := range escalateMsg {
			if err := onToken(string(ch)); err != nil {
				break
			}
		}

		assistantMsg := &domain.ChatMessage{
			ID:        uuid.New(),
			SessionID: sessionID,
			Role:      "assistant",
			Content:   escalateMsg,
			CreatedAt: time.Now().UTC(),
		}
		_ = s.repo.SaveMessage(ctx, assistantMsg)
		_ = onToken("\n__ESCALATE__")

		return assistantMsg, nil
	}

	var dataContext *domain.UserDataContext
	if intent.Intent == "data_needed" && len(intent.Tables) > 0 {
		dataContext = &domain.UserDataContext{}

		for _, table := range intent.Tables {
			switch table {
			case "seller_sales":
				data, err := s.repo.GetSellerSales(ctx, userID, intent.Limit)
				if err == nil {
					dataContext.SellerSales = data
				}
			case "seller_listings":
				data, err := s.repo.GetSellerListings(ctx, userID, intent.Limit)
				if err == nil {
					dataContext.SellerListings = data
				}
			case "seller_returns":
				data, err := s.repo.GetSellerReturns(ctx, userID, intent.Limit)
				if err == nil {
					dataContext.SellerReturns = data
				}
			case "profile":
				data, err := s.repo.GetUserProfile(ctx, userID)
				if err == nil {
					dataContext.Profile = data
				}
			}
		}
	}

	if dataContext != nil {
		dataJSON, _ := json.Marshal(dataContext)
		contextMsg := domain.ChatMessage{
			ID:        uuid.New(),
			SessionID: sessionID,
			Role:      "system",
			Content:   fmt.Sprintf("Here is the seller's real data from the KickSneak database. Use ONLY this data to answer. If the data is empty or null, tell the seller you couldn't find any records.\n\n%s", string(dataJSON)),
			CreatedAt: time.Now().UTC(),
		}
		history = append(history, contextMsg)
	}

	var prompt string
	if dataContext != nil {
		prompt = s.ollama.DataAnswerPrompt()
	} else {
		prompt = s.ollama.DirectAnswerPrompt()
	}

	fullResponse, err := s.ollama.StreamChat(ctx, history, prompt, onToken)
	if err != nil {
		return nil, fmt.Errorf("ollama stream: %w", err)
	}

	assistantMsg := &domain.ChatMessage{
		ID:        uuid.New(),
		SessionID: sessionID,
		Role:      "assistant",
		Content:   fullResponse,
		CreatedAt: time.Now().UTC(),
	}
	if err := s.repo.SaveMessage(ctx, assistantMsg); err != nil {
		return nil, fmt.Errorf("save assistant message: %w", err)
	}

	return assistantMsg, nil
}
