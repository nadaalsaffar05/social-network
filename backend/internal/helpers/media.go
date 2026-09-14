package helpers

import "strings"

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
