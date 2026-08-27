package helpers

import "strings"

// UniqueIDs trims, removes empty values, and preserves the first occurrence
// of every ID.
func UniqueIDs(ids []string) []string {
	seen := make(map[string]bool)
	result := make([]string, 0, len(ids))

	for _, id := range ids {
		id = strings.TrimSpace(id)
		if id == "" || seen[id] {
			continue
		}

		seen[id] = true
		result = append(result, id)
	}

	return result
}
