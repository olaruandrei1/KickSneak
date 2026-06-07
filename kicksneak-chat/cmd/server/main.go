package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kicksneak/chat/internal/config"
	"github.com/kicksneak/chat/internal/handler"
	"github.com/kicksneak/chat/internal/middleware"
	"github.com/kicksneak/chat/internal/repository"
	"github.com/kicksneak/chat/internal/service"
)

func main() {
	cfg := config.Load()

	pool, err := pgxpool.New(context.Background(), cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer pool.Close()

	if err := pool.Ping(context.Background()); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}
	log.Println("[DB] Connected to PostgreSQL")

	repo := repository.NewChatRepository(pool)
	if err := repo.Migrate(context.Background()); err != nil {
		log.Fatalf("Failed to migrate: %v", err)
	}
	log.Println("[DB] Migration complete")

	ollamaSvc := service.NewOllamaService(cfg.OllamaURL, cfg.OllamaModel)
	chatSvc := service.NewChatService(repo, ollamaSvc)

	wsHandler := handler.NewWSHandler(chatSvc)
	restHandler := handler.NewRESTHandler(chatSvc)

	mux := http.NewServeMux()

	mux.HandleFunc("GET /ws/chat", wsHandler.HandleWebSocket)
	mux.HandleFunc("GET /api/chat/sessions", restHandler.GetSessions)
	mux.HandleFunc("GET /api/chat/sessions/{sessionId}/messages", restHandler.GetHistory)
	mux.HandleFunc("DELETE /api/chat/sessions/{sessionId}", restHandler.CloseSession)

	mux.HandleFunc("GET /ws/seller-chat", wsHandler.HandleSellerWebSocket)
	mux.HandleFunc("GET /api/chat/seller/sessions", restHandler.GetSellerSessions)
	mux.HandleFunc("GET /api/chat/seller/sessions/{sessionId}/messages", restHandler.GetSellerHistory)
	mux.HandleFunc("DELETE /api/chat/seller/sessions/{sessionId}", restHandler.CloseSellerSession)

	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		fmt.Fprintln(w, "ok")
	})

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      middleware.CORS(mux),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 120 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Printf("[Server] Starting on :%s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("[Server] Shutting down...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced shutdown: %v", err)
	}

	log.Println("[Server] Stopped")
}
