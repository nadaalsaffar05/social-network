package feed

import (
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"strconv"

	"social-network/internal/enums"
)

func feedLimit(value string) (int, error) {
	if value == "" {
		return 10, nil
	}

	limit, err := strconv.Atoi(value)
	if err != nil || limit < 1 || limit > 50 {
		return 0, fmt.Errorf("invalid limit")
	}

	return limit, nil
}

func mediaExtension(mimeType enums.MediaMIMEType) string {
	switch mimeType {
	case enums.MediaMIMETypePNG:
		return ".png"
	case enums.MediaMIMETypeGIF:
		return ".gif"
	default:
		return ".jpg"
	}
}

func detectMediaMIMEType(file multipart.File) (enums.MediaMIMEType, error) {
	buffer := make([]byte, 512)
	n, err := file.Read(buffer)
	if err != nil && err != io.EOF {
		return "", err
	}

	mimeType := enums.MediaMIMEType(http.DetectContentType(buffer[:n]))
	if mimeType != enums.MediaMIMETypeJPEG &&
		mimeType != enums.MediaMIMETypePNG &&
		mimeType != enums.MediaMIMETypeGIF {
		return "", fmt.Errorf("unsupported media type")
	}

	if _, err := file.Seek(0, io.SeekStart); err != nil {
		return "", err
	}

	return mimeType, nil
}

func isValidPrivacy(privacy enums.PostPrivacy) bool {
	switch privacy {
	case enums.PostPrivacyPublic, enums.PostPrivacyFollowers, enums.PostPrivacySelected:
		return true
	default:
		return false
	}
}
