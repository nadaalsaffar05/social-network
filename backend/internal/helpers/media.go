package helpers

import (
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path"
	"strings"

	"social-network/internal/enums"
)

var ErrEmptyMediaFile = errors.New("media file is empty")

func PublicMediaURL(path string) string {
	return "/" + strings.TrimLeft(path, "/")
}

func PublicMediaPath(path *string) *string {
	if path == nil {
		return nil
	}

	publicPath := PublicMediaURL(*path)
	return &publicPath
}

func MediaExtension(mimeType enums.MediaMIMEType) string {
	switch mimeType {
	case enums.MediaMIMETypePNG:
		return ".png"
	case enums.MediaMIMETypeGIF:
		return ".gif"
	default:
		return ".jpg"
	}
}

func DetectMediaMIMEType(file io.ReadSeeker) (enums.MediaMIMEType, error) {
	buffer := make([]byte, 512)
	n, err := file.Read(buffer)
	if err != nil && !errors.Is(err, io.EOF) {
		return "", err
	}

	mimeType := enums.MediaMIMEType(http.DetectContentType(buffer[:n]))
	switch mimeType {
	case enums.MediaMIMETypeJPEG, enums.MediaMIMETypePNG, enums.MediaMIMETypeGIF:
	default:
		return "", fmt.Errorf("unsupported media type")
	}

	if _, err := file.Seek(0, io.SeekStart); err != nil {
		return "", err
	}

	return mimeType, nil
}

func SaveMediaFile(file io.Reader, directory, mediaID string, mimeType enums.MediaMIMEType) (string, int64, error) {
	if err := os.MkdirAll(directory, 0o755); err != nil {
		return "", 0, err
	}

	relativePath := path.Join(directory, mediaID+MediaExtension(mimeType))
	destination, err := os.Create(relativePath)
	if err != nil {
		return "", 0, err
	}

	fileSize, copyErr := io.Copy(destination, file)
	closeErr := destination.Close()
	if copyErr != nil {
		_ = os.Remove(relativePath)
		return "", 0, copyErr
	}
	if closeErr != nil {
		_ = os.Remove(relativePath)
		return "", 0, closeErr
	}
	if fileSize == 0 {
		_ = os.Remove(relativePath)
		return "", 0, ErrEmptyMediaFile
	}

	return relativePath, fileSize, nil
}
