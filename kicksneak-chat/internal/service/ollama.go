package service

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/kicksneak/chat/internal/domain"
)

type OllamaService struct {
	baseURL string
	model   string
	client  *http.Client
}

func NewOllamaService(baseURL, model string) *OllamaService {
	return &OllamaService{
		baseURL: baseURL,
		model:   model,
		client:  &http.Client{Timeout: 120 * time.Second},
	}
}

func (s *OllamaService) StreamChat(ctx context.Context, messages []domain.ChatMessage, systemPrompt string, onToken func(string) error) (string, error) {
	ollamaMessages := []domain.OllamaMessage{
		{Role: "system", Content: systemPrompt},
	}

	for _, m := range messages {
		if m.Role == "system" {
			// Inject system messages as-is (data context)
			ollamaMessages = append(ollamaMessages, domain.OllamaMessage{
				Role:    "system",
				Content: m.Content,
			})
			continue
		}
		ollamaMessages = append(ollamaMessages, domain.OllamaMessage{
			Role:    m.Role,
			Content: m.Content,
		})
	}

	reqBody := domain.OllamaRequest{
		Model:    s.model,
		Messages: ollamaMessages,
		Stream:   true,
	}

	body, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", s.baseURL+"/api/chat", bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("ollama request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("ollama returned status %d", resp.StatusCode)
	}

	var fullResponse string
	scanner := bufio.NewScanner(resp.Body)

	for scanner.Scan() {
		var chunk domain.OllamaStreamChunk
		if err := json.Unmarshal(scanner.Bytes(), &chunk); err != nil {
			continue
		}

		if chunk.Message.Content != "" {
			token := chunk.Message.Content
			if fullResponse == "" {
				token = strings.TrimPrefix(token, "assistant")
				token = strings.TrimLeft(token, " ")
				if token == "" {
					continue
				}
			}
			fullResponse += token
			if err := onToken(token); err != nil {
				return fullResponse, fmt.Errorf("token callback: %w", err)
			}
		}

		if chunk.Done {
			break
		}
	}

	return fullResponse, scanner.Err()
}

const intentPrompt = `Classify the user's support chat message. Return ONLY a JSON object.

Tables: orders, returns, auctions, profile, seller_sales, seller_listings, seller_returns

{"intent":"data_needed","tables":["orders"],"limit":5} — buyer orders, shipping
{"intent":"data_needed","tables":["returns"],"limit":5} — buyer returns
{"intent":"data_needed","tables":["auctions"],"limit":5} — buyer auctions, bids
{"intent":"data_needed","tables":["seller_sales"],"limit":5} — seller asking about their recent sales, revenue, sold items
{"intent":"data_needed","tables":["seller_listings"],"limit":5} — seller asking about their active stock, inventory, listed items
{"intent":"data_needed","tables":["seller_returns"],"limit":5} — seller asking about items returned to them, approval pending
{"intent":"data_needed","tables":["profile"],"limit":1} — account, profile
{"intent":"escalate","tables":[],"limit":0} — wants human agent, live support
{"intent":"direct_answer","tables":[],"limit":0} — general questions, greetings, fees explanation

If user confirms ("yes", "sure") after assistant offered to look up data → data_needed with relevant table.
When in doubt → data_needed.
ONLY JSON. No text.`

const directAnswerPrompt = `You are KickSneak's support assistant. KickSneak is a sneaker marketplace (like StockX).
Reply in the SAME language as the user. Be concise (2-3 sentences max).
Help with: sizing, how auctions work, shipping policies, platform questions, seller fees (usually 8%).
Never make up data. If you don't know, say so.`

const dataAnswerPrompt = `You are KickSneak's support assistant. You just received REAL data from the database about this user/seller.

RULES:
1. Reply in the SAME language as the user.
2. Use the provided data to answer. Format it clearly (e.g., lists or * Key: Value).
3. NEVER say "check your account" or "contact support" — YOU have the data, present it.
4. If data is empty or null, say "I couldn't find any records."
5. Be concise but include all relevant details.
6. Format statuses: 0=Pending, 1=Confirmed, 2=Shipped, 3=Delivered, 4=Completed, 5=Cancelled. For returns: Pending Approval, Approved, Rejected.`

func (s *OllamaService) AnalyzeIntent(ctx context.Context, messages []domain.ChatMessage, latestMessage string) (*domain.IntentResponse, error) {
	ollamaMessages := []domain.OllamaMessage{
		{Role: "system", Content: intentPrompt},
	}

	// Include recent conversation for context (last 6 messages max)
	start := 0
	if len(messages) > 6 {
		start = len(messages) - 6
	}
	for _, m := range messages[start:] {
		if m.Role == "system" {
			continue
		}
		ollamaMessages = append(ollamaMessages, domain.OllamaMessage{
			Role:    m.Role,
			Content: m.Content,
		})
	}

	// Add explicit instruction with latest message
	ollamaMessages = append(ollamaMessages, domain.OllamaMessage{
		Role:    "user",
		Content: fmt.Sprintf("Classify this latest message: \"%s\"", latestMessage),
	})

	reqBody := domain.OllamaRequest{
		Model:    s.model,
		Messages: ollamaMessages,
		Stream:   false,
	}

	body, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("marshal: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", s.baseURL+"/api/chat", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("ollama request: %w", err)
	}
	defer resp.Body.Close()

	var fullResp struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&fullResp); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}

	content := strings.TrimSpace(fullResp.Message.Content)
	content = strings.TrimPrefix(content, "```json")
	content = strings.TrimPrefix(content, "```")
	content = strings.TrimSuffix(content, "```")
	content = strings.TrimSpace(content)

	var intent domain.IntentResponse
	if err := json.Unmarshal([]byte(content), &intent); err != nil {
		return &domain.IntentResponse{Intent: "direct_answer"}, nil
	}

	if intent.Limit == 0 && intent.Intent == "data_needed" {
		intent.Limit = 5
	}

	return &intent, nil
}

func (s *OllamaService) DirectAnswerPrompt() string { return directAnswerPrompt }
func (s *OllamaService) DataAnswerPrompt() string   { return dataAnswerPrompt }
