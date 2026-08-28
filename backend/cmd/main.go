package main

import (
	"log"
	"os"
)

func main() {
	db, err := initDB()
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server running on http://localhost:%s\n", port)

	log.Fatal(newServer(db, port).ListenAndServe())
}
