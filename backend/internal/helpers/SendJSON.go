package helpers

import (
	"encoding/json"
	"net/http"
)

func SendJSON(w http.ResponseWriter, status int, message any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	if m, ok := message.(map[string]any); ok {
		if _, exists := m["status"]; !exists {
			m["status"] = status
		}
		json.NewEncoder(w).Encode(m)
		return
	}

	json.NewEncoder(w).Encode(map[string]any{"message": message, "status": status})
}
