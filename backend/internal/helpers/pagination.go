package helpers

import (
	"fmt"
	"strconv"
	"strings"
)

const MaxPageLimit = 50

// ParsePageLimit returns the requested page size or the endpoint's default.
func ParsePageLimit(value string, defaultLimit int) (int, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return defaultLimit, nil
	}

	limit, err := strconv.Atoi(value)
	if err != nil || limit < 1 || limit > MaxPageLimit {
		return 0, fmt.Errorf("page limit must be between 1 and %d", MaxPageLimit)
	}

	return limit, nil
}
