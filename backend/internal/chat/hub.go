package chat

import (
	"net/http"
	"net/url"
	"sync"
	"time"

	"social-network/internal/models"

	"github.com/gorilla/websocket"
)

const (
	socketWriteTimeout = 10 * time.Second
	socketReadLimit    = 8 * 1024
	socketPongWait     = 45 * time.Second
	socketPingInterval = 35 * time.Second
	maxPendingEvents   = 64
)

var websocketUpgrader = websocket.Upgrader{
	CheckOrigin: isAllowedWebSocketOrigin,
}

func isAllowedWebSocketOrigin(request *http.Request) bool {
	origin := request.Header.Get("Origin")
	if origin == "" {
		return true
	}

	originURL, err := url.Parse(origin)
	if err != nil || (originURL.Scheme != "http" && originURL.Scheme != "https") {
		return false
	}

	requestURL, err := url.Parse("http://" + request.Host)
	if err != nil {
		return false
	}

	return originURL.Hostname() == requestURL.Hostname()
}

// Hub remembers which users currently have an open WebSocket connection.
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

// add returns true when this is the user's first open tab.
func (h *Hub) add(userID string, client *socketClient) bool {
	h.mu.Lock()
	defer h.mu.Unlock()

	wasOffline := len(h.clients[userID]) == 0
	if h.clients[userID] == nil {
		h.clients[userID] = make(map[*socketClient]struct{})
	}
	h.clients[userID][client] = struct{}{}
	return wasOffline
}

// remove returns true when the user's final open tab was removed.
func (h *Hub) remove(userID string, client *socketClient) bool {
	h.mu.Lock()
	defer h.mu.Unlock()

	clients, found := h.clients[userID]
	if !found {
		return false
	}
	if _, found := clients[client]; !found {
		return false
	}

	delete(clients, client)
	close(client.send)
	if len(clients) == 0 {
		delete(h.clients, userID)
		return true
	}
	return false
}

// SendTo sends one event to every open tab for a user.
func (h *Hub) SendTo(userID string, event models.SocketEvent) {
	h.mu.RLock()
	for client := range h.clients[userID] {
		select {
		case client.send <- event:
		default:
			// A slow tab should not delay events for everyone else.
			_ = client.conn.Close()
		}
	}
	h.mu.RUnlock()
}

func (h *Hub) OnlineUserIDs() []string {
	h.mu.RLock()
	defer h.mu.RUnlock()

	userIDs := make([]string, 0, len(h.clients))
	for userID := range h.clients {
		userIDs = append(userIDs, userID)
	}
	return userIDs
}

// writePump is the sole writer for one WebSocket connection.
func (c *socketClient) writePump() {
	ticker := time.NewTicker(socketPingInterval)
	defer func() {
		ticker.Stop()
		_ = c.conn.Close()
	}()

	for {
		select {
		case event, ok := <-c.send:
			_ = c.conn.SetWriteDeadline(time.Now().Add(socketWriteTimeout))
			if !ok {
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteJSON(event); err != nil {
				return
			}
		case <-ticker.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(socketWriteTimeout))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
