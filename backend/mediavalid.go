buffer := make([]byte, 512)
n, err := file.Read(buffer)
if err != nil && err != io.EOF {
	helpers.WriteError(w, http.StatusBadRequest, "could not read uploaded file")
	return
}

mimeType := enums.MediaMIMEType(http.DetectContentType(buffer[:n]))

if mimeType != enums.MediaMIMETypeJPEG &&
	mimeType != enums.MediaMIMETypePNG &&
	mimeType != enums.MediaMIMETypeGIF {
	helpers.WriteError(w, http.StatusBadRequest, "only JPEG, PNG, and GIF are allowed")
	return
}

if _, err := file.Seek(0, io.SeekStart); err != nil {
	helpers.WriteError(w, http.StatusInternalServerError, "could not reset uploaded file")
	return
}