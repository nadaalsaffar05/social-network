package helpers

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"time"
	"unicode"
)

func WriteJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func WriteError(w http.ResponseWriter, status int, message string) {
	WriteJSON(w, status, map[string]string{"error": normalizeErrorMessage(message)})
}

func ParseJSON(body io.Reader, data any) error {
	return json.NewDecoder(body).Decode(data)
}

func ParseDateOnly(value string) error {
	_, err := time.Parse(time.DateOnly, value)
	return err
}

func normalizeErrorMessage(message string) string {
	message = strings.TrimSpace(message)
	if message == "" {
		return "request failed"
	}
	runes := []rune(message)
	runes[0] = unicode.ToLower(runes[0])
	return strings.ReplaceAll(string(runes), "could not ", "failed to ")
}
