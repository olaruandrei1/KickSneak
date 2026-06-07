package config

import "os"

type Config struct {
	Port        string
	DatabaseURL string
	OllamaURL   string
	OllamaModel string
}

func Load() *Config {
	return &Config{
		Port:        getEnv("PORT", "8080"),
		DatabaseURL: getEnv("DATABASE_URL", "postgres://ks_chat_service:KsChat2026!@localhost:5432/kicksneak?sslmode=disable"),
		OllamaURL:   getEnv("OLLAMA_URL", "http://localhost:11435"),
		OllamaModel: getEnv("OLLAMA_MODEL", "llama3.1:8b"),
	}
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
