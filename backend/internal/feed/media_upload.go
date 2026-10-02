package feed

import (
	"errors"
	"net/http"
	"os"
	"strconv"

	"social-network/internal/enums"
	"social-network/internal/helpers"

	"github.com/google/uuid"
)

const mediaUploadMaxBytes = 10 << 20

type pendingMediaUpload struct {
	ID           string
	FileName     string
	RelativePath string
	MIMEType     enums.MediaMIMEType
	FileSize     int64
	Position     int
}

func (upload pendingMediaUpload) removeFile() {
	_ = os.Remove(upload.RelativePath)
}

func parseMediaUpload(w http.ResponseWriter, r *http.Request, directory string) (pendingMediaUpload, bool) {
	r.Body = http.MaxBytesReader(w, r.Body, mediaUploadMaxBytes)
	if err := r.ParseMultipartForm(mediaUploadMaxBytes); err != nil {
		helpers.WriteError(w, http.StatusBadRequest, "invalid or oversized upload")
		return pendingMediaUpload{}, false
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		helpers.WriteError(w, http.StatusBadRequest, "file is required")
		return pendingMediaUpload{}, false
	}
	defer file.Close()

	mimeType, err := helpers.DetectMediaMIMEType(file)
	if err != nil {
		helpers.WriteError(w, http.StatusBadRequest, "only JPEG, PNG, and GIF are allowed")
		return pendingMediaUpload{}, false
	}

	position, err := strconv.Atoi(r.FormValue("position"))
	if err != nil || position < 0 {
		helpers.WriteError(w, http.StatusBadRequest, "position must be a non-negative integer")
		return pendingMediaUpload{}, false
	}

	upload := pendingMediaUpload{
		ID:       uuid.New().String(),
		FileName: header.Filename,
		MIMEType: mimeType,
		Position: position,
	}
	upload.RelativePath, upload.FileSize, err = helpers.SaveMediaFile(file, directory, upload.ID, upload.MIMEType)
	if err != nil {
		if errors.Is(err, helpers.ErrEmptyMediaFile) {
			helpers.WriteError(w, http.StatusBadRequest, "file cannot be empty")
		} else {
			helpers.WriteError(w, http.StatusInternalServerError, "could not save media")
		}
		return pendingMediaUpload{}, false
	}

	return upload, true
}
