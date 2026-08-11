package main

import (
	"errors"
	"fmt"
	"net/http"
	"os"
)

func main() {
	err := http.ListenAndServe(":8080", nil)
	fmt.Println("server is running in port :8080")
	if errors.Is(err, http.ErrServerClosed) {
		fmt.Printf("server closed\n")
	} else if err != nil {
		fmt.Printf("error starting server: %s\n", err)
		os.Exit(1)
	}
}
