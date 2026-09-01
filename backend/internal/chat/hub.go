package chat

import (
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"social-network/internal/auth"
	"social-network/internal/helpers"
	"social-network/internal/models"

	"github.com/gorilla/websocket"
)

const (
	maxPendingSocketEvents = 64
	writeWait              = 10 * time.Second
	pongWait               = 60 * time.Second
	pingInterval           = 54 * time.Second
)

var websocketUpgrader = websocket.Upgrader{
	CheckOrigin: isAllowedWebSocketOrigin,
}

// Hub keeps the active WebSocket connections grouped by authenticated user ID.
type Hub struct {
	mu      sync.RWMutex
	clients map[string]map[*socketClient]struct{}
}

type socketClient struct {
	conn *websocket.Conn
	send chan models.SocketEvent
}

func NewHub() *Hub {
	return &Hub{clients: make(map[string]map[*socketClient]struct{})}
}

func (h *Hub) add(userID string, client *socketClient) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if h.clients[userID] == nil {
		h.clients[userID] = make(map[*socketClient]struct{})
	}
	h.clients[userID][client] = struct{}{}
}

func (h *Hub) remove(userID string, client *socketClient) {
	h.mu.Lock()
	defer h.mu.Unlock()

	clients, exists := h.clients[userID]
	if !exists {
		return
	}
	if _, exists := clients[client]; !exists {
		return
	}

	delete(clients, client)
	close(client.send)
	if len(clients) == 0 {
		delete(h.clients, userID)
	}
}

// SendTo delivers an event to every open tab for a user.
func (h *Hub) SendTo(userID string, event models.SocketEvent) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	for client := range h.clients[userID] {
		select {
		case client.send <- event:
		default:
			// A slow connection must not hold up the rest of the application.
		}
	}
}

func (h *Hub) WebSocket(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		helpers.WriteError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	currentUser := auth.CurrentUser(r)
	if currentUser == nil {
		helpers.WriteError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	conn, err := websocketUpgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}

	client := &socketClient{
		conn: conn,
		send: make(chan models.SocketEvent, maxPendingSocketEvents),
	}
	h.add(currentUser.ID, client)

	defer func() {
		h.remove(currentUser.ID, client)
		_ = conn.Close()
	}()

	go client.writePump()
	client.readPump()
}

func (c *socketClient) readPump() {
	c.conn.SetReadLimit(8 * 1024)
	_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		return c.conn.SetReadDeadline(time.Now().Add(pongWait))
	})

	for {
		if _, _, err := c.conn.ReadMessage(); err != nil {
			return
		}
	}
}

func (c *socketClient) writePump() {
	ticker := time.NewTicker(pingInterval)
	defer ticker.Stop()

	for {
		select {
		case event, ok := <-c.send:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteJSON(event); err != nil {
				return
			}
		case <-ticker.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func isAllowedWebSocketOrigin(r *http.Request) bool {
	origin := r.Header.Get("Origin")
	if origin == "" {
		return true
	}

	originURL, err := url.Parse(origin)
	if err != nil {
		return false
	}

	return originURL.Host == r.Host || strings.EqualFold(originURL.Hostname(), "localhost") || originURL.Hostname() == "127.0.0.1"
}
