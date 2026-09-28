package config

import (
	"net/url"
	"os"
	"strings"
)

const (
	frontendOriginEnv   = "FRONTEND_ORIGIN"
	localFrontendOrigin = "http://localhost:5173"
)

// FrontendOrigin returns the configured browser origin, defaulting to local Vite.
func FrontendOrigin() string {
	origin := strings.TrimSpace(os.Getenv(frontendOriginEnv))
	if origin == "" {
		return localFrontendOrigin
	}
	return origin
}

// UsesSecureCookies reports whether the configured frontend is served over HTTPS.
func UsesSecureCookies() bool {
	origin, err := url.Parse(FrontendOrigin())
	return err == nil && origin.Scheme == "https"
}
