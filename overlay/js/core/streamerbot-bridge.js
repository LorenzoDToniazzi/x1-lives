import { unwrapCustomEvent } from "./protocol.js";

export class StreamerbotBridge extends EventTarget {
  constructor(config) {
    super();
    this.config = config;
    this.socket = null;
    this.closed = false;
    this.reconnectDelay = config.websocket.reconnectMinMs;
  }

  connect() {
    this.closed = false;
    this.openSocket();
  }

  disconnect() {
    this.closed = true;
    this.socket?.close();
    this.socket = null;
  }

  openSocket() {
    if (this.closed || this.socket?.readyState === WebSocket.OPEN) return;
    const { host, port, endpoint } = this.config.websocket;
    this.socket = new WebSocket(`ws://${host}:${port}${endpoint}`);

    this.socket.addEventListener("open", () => {
      this.reconnectDelay = this.config.websocket.reconnectMinMs;
      this.socket.send(JSON.stringify({
        request: "Subscribe",
        id: `x1-subscribe-${Date.now()}`,
        events: { General: ["Custom"] },
      }));
      this.dispatchEvent(new Event("connected"));
      console.info("[X1] WebSocket conectado");
    });

    this.socket.addEventListener("message", (event) => {
      let message;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }
      const detail = unwrapCustomEvent(message);
      if (detail) this.dispatchEvent(new CustomEvent("x1-event", { detail }));
    });

    this.socket.addEventListener("close", () => this.scheduleReconnect());
    this.socket.addEventListener("error", () => this.socket?.close());
  }

  scheduleReconnect() {
    if (this.closed) return;
    const delay = this.reconnectDelay;
    this.reconnectDelay = Math.min(
      this.config.websocket.reconnectMaxMs,
      Math.round(this.reconnectDelay * 1.8),
    );
    setTimeout(() => this.openSocket(), delay);
  }

  async doAction(actionName, args) {
    const { attempts, retryDelayMs } = this.config.callbacks;
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const response = await fetch("/DoAction", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: { name: actionName }, args }),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return;
      } catch (error) {
        lastError = error;
        if (attempt < attempts) {
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs * attempt));
        }
      }
    }
    throw lastError;
  }
}
