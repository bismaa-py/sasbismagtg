package config

import (
	"os"
	"strconv"
)

type Config struct {
	ServerPort          string
	DBHost              string
	DBPort              string
	DBUser              string
	DBPassword          string
	DBName              string
	DBSSLMode           string
	JWTSecret           string
	JWTExpiryHours      int
	JWTRefreshExpiryHrs int
	UploadDir           string
	MaxUploadSize       int64
	WAApiURL            string
	WAApiToken          string
	ResendAPIKey        string
	ResendFromEmail     string
	ResendFromName      string
	SMTPHost            string
	SMTPPort            string
	SMTPEmail           string
	SMTPPassword        string
	SMTPFromName        string
	// Legacy SendGrid fields (unused, kept for compatibility)
	SendGridAPIKey      string
	SendGridFromEmail   string
	SendGridFromName    string
}

func Load() *Config {
	return &Config{
		ServerPort:          getEnv("SERVER_PORT", "8080"),
		DBHost:              getEnv("DB_HOST", "localhost"),
		DBPort:              getEnv("DB_PORT", "5432"),
		DBUser:              getEnv("DB_USER", "postgres"),
		DBPassword:          getEnv("DB_PASSWORD", "postgres"),
		DBName:              getEnv("DB_NAME", "disposisi_surat"),
		DBSSLMode:           getEnv("DB_SSLMODE", "disable"),
		JWTSecret:           getEnv("JWT_SECRET", "default-secret"),
		JWTExpiryHours:      getEnvInt("JWT_EXPIRY_HOURS", 24),
		JWTRefreshExpiryHrs: getEnvInt("JWT_REFRESH_EXPIRY_HOURS", 168),
		UploadDir:           getEnv("UPLOAD_DIR", "./uploads"),
		MaxUploadSize:       int64(getEnvInt("MAX_UPLOAD_SIZE", 10485760)),
		WAApiURL:            getEnv("WA_API_URL", ""),
		WAApiToken:          getEnv("WA_API_TOKEN", ""),
		ResendAPIKey:        getEnv("RESEND_API_KEY", ""),
		ResendFromEmail:     getEnv("RESEND_FROM_EMAIL", "onboarding@resend.dev"),
		ResendFromName:      getEnv("RESEND_FROM_NAME", "E-Disposisi SMKN 2 Singosari"),
		SMTPHost:            getEnv("SMTP_HOST", "smtp.gmail.com"),
		SMTPPort:            getEnv("SMTP_PORT", "587"),
		SMTPEmail:           getEnv("SMTP_EMAIL", ""),
		SMTPPassword:        getEnv("SMTP_PASSWORD", ""),
		SMTPFromName:        getEnv("SMTP_FROM_NAME", "E-Disposisi SMKN 2 Singosari"),
		SendGridAPIKey:      getEnv("SENDGRID_API_KEY", ""),
		SendGridFromEmail:   getEnv("SENDGRID_FROM_EMAIL", ""),
		SendGridFromName:    getEnv("SENDGRID_FROM_NAME", ""),
	}
}

func (c *Config) DSN() string {
	return "host=" + c.DBHost +
		" port=" + c.DBPort +
		" user=" + c.DBUser +
		" password=" + c.DBPassword +
		" dbname=" + c.DBName +
		" sslmode=" + c.DBSSLMode
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			return i
		}
	}
	return fallback
}
