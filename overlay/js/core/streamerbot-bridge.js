import { unwrapCustomEvent } from "./protocol.js";

export class StreamerbotBridge extends EventTarget {
  constructor(config) {
    super();
    this.config = config;
    this.socket = null;
    this.closed = false;
    this.reconnectDelay = config.websocket.reconnectMinMs;
    this.pendingRequests = new Map();
    this.requestSequence = 0;
  }

  connect() {
    this.closed = false;
    this.openSocket();
  }

  disconnect() {
    this.closed = true;
    this.rejectPendingRequests(new Error("WebSocket do Streamer.bot desconectado."));
    this.socket?.close();
    this.socket = null;
  }

  openSocket() {
    if (this.closed || this.socket?.readyState === WebSocket.OPEN || this.socket?.readyState === WebSocket.CONNECTING) return;
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

      if (this.resolveRequest(message)) return;

      const detail = unwrapCustomEvent(message);
      if (detail) this.dispatchEvent(new CustomEvent("x1-event", { detail }));
    });

    this.socket.addEventListener("close", () => {
      this.rejectPendingRequests(new Error("WebSocket do Streamer.bot fechou durante a requisição."));
      this.socket = null;
      this.scheduleReconnect();
    });
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
        await this.waitUntilOpen();
        return await this.sendRequest({
          request: "DoAction",
          action: { name: actionName },
          args,
        });
      } catch (error) {
        lastError = error;
        if (attempt < attempts) {
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs * attempt));
        }
      }
    }
    throw lastError;
  }

  waitUntilOpen(timeoutMs = 3500) {
    if (this.socket?.readyState === WebSocket.OPEN) return Promise.resolve();
    if (this.closed) return Promise.reject(new Error("Bridge do Streamer.bot está encerrado."));
    if (!this.socket || this.socket.readyState === WebSocket.CLOSED) this.openSocket();

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error("Timeout aguardando WebSocket do Streamer.bot."));
      }, timeoutMs);
      const onConnected = () => {
        cleanup();
        resolve();
      };
      const cleanup = () => {
        clearTimeout(timer);
        this.removeEventListener("connected", onConnected);
      };
      this.addEventListener("connected", onConnected, { once: true });
    });
  }

  sendRequest(payload, timeoutMs = 4000) {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error("WebSocket do Streamer.bot não está aberto."));
    }

    const id = `x1-request-${Date.now()}-${++this.requestSequence}`;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Timeout aguardando resposta do Streamer.bot para ${payload.request}.`));
      }, timeoutMs);
      this.pendingRequests.set(id, { resolve, reject, timer });
      try {
        this.socket.send(JSON.stringify({ ...payload, id }));
      } catch (error) {
        clearTimeout(timer);
        this.pendingRequests.delete(id);
        reject(error);
      }
    });
  }

  resolveRequest(message) {
    if (!message || typeof message.id !== "string") return false;
    const pending = this.pendingRequests.get(message.id);
    if (!pending) return false;
    clearTimeout(pending.timer);
    this.pendingRequests.delete(message.id);
    if (message.status === "ok") pending.resolve(message);
    else pending.reject(new Error(message.message || message.error || `Streamer.bot retornou ${message.status || "erro"}.`));
    return true;
  }

  rejectPendingRequests(error) {
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timer);
      pending.reject(error);
      this.pendingRequests.delete(id);
    }
  }
}
