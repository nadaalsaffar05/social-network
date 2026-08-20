package auth

import (
	"context"
	"database/sql"
	"net/http"
)

type contextKey string

const currentUserKey contextKey = "currentUser"

func Middleware(
	db *sql.DB,
	next http.Handler,
) http.Handler {

	return http.HandlerFunc(
		func(
			w http.ResponseWriter,
			r *http.Request,
		) {
			cookie, err :=
				r.Cookie(sessionCookieName)

			if err != nil {
				writeError(
					w,
					http.StatusUnauthorized,
					"authentication required",
				)
				return
			}

			user, err := getUserFromSession(
				db,
				cookie.Value,
			)

			if err != nil {
				writeError(
					w,
					http.StatusInternalServerError,
					"authentication error",
				)
				return
			}

			if user == nil {
				clearSessionCookie(w)

				writeError(
					w,
					http.StatusUnauthorized,
					"session expired or invalid",
				)
				return
			}

			ctx := context.WithValue(
				r.Context(),
				currentUserKey,
				user,
			)

			next.ServeHTTP(
				w,
				r.WithContext(ctx),
			)
		},
	)
}

func CurrentUser(
	r *http.Request,
) *User {

	user, ok := r.Context().
		Value(currentUserKey).(*User)

	if !ok {
		return nil
	}

	return user
}
