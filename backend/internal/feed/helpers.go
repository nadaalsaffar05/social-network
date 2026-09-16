package feed

import (
	"errors"
	"fmt"
	"strconv"
	"strings"

	"social-network/internal/enums"
)

const maxPostContentLength = 10000

func FeedLimit(value string) (int, error) {
	if value == "" {
		return 10, nil
	}

	limit, err := strconv.Atoi(value)
	if err != nil || limit < 1 || limit > 50 {
		return 0, fmt.Errorf("invalid limit")
	}

	return limit, nil
}

func NormalizePostContent(content string) (string, error) {
	content = strings.TrimSpace(content)
	if content == "" {
		return "", errors.New("content is required")
	}
	if len([]rune(content)) > maxPostContentLength {
		return "", fmt.Errorf("content must be at most %d characters", maxPostContentLength)
	}
	return content, nil
}

func NormalizePostCommentReaction(reactionType string) (string, error) {
	reactionType = strings.ToUpper(strings.TrimSpace(reactionType))
	if reactionType != string(enums.PostCommentReactionTypeLike) && reactionType != string(enums.PostCommentReactionTypeDislike) {
		return "", errors.New("reaction_type must be LIKE or DISLIKE")
	}
	return reactionType, nil
}

func isValidPrivacy(privacy enums.PostPrivacy) bool {
	switch privacy {
	case enums.PostPrivacyPublic, enums.PostPrivacyFollowers, enums.PostPrivacySelected:
		return true
	default:
		return false
	}
}
