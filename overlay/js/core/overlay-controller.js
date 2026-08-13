import { validateAck, validateCancel, validateStart } from "./protocol.js";

export class OverlayController {
  constructor({ config, games, bridge }) {
    this.config = config;
    this.games = games;
    this.bridge = bridge;
    this.activeDuel = null;
    this.recentDuels = new Map();
    this.pendingAcks = new Map();
  }

  start() {
    this.bridge.addEventListener("x1-event", (event) => this.handleEvent(event.detail));
    window.addEventListener("x1-game-finish", (event) => this.handleFinish(event.detail));
    this.bridge.connect();
  }

  async handleEvent(payload) {
    if (validateAck(payload, this.config.contractVersion)) {
      this.pendingAcks.get(payload.duelId)?.resolve();
      return;
    }
    const start = validateStart(payload, this.config.contractVersion);
    if (start) {
      await this.handleStart(start);
      return;
    }
    if (validateCancel(payload, this.config.contractVersion)) this.handleCancel(payload);
  }

  async handleStart(payload) {
    this.pruneRecentDuels();
    if (this.activeDuel || this.recentDuels.has(payload.duelId)) return;
    this.activeDuel = payload;

    try {
      const ack = this.waitForAck(payload.duelId);
      await this.bridge.doAction(this.config.actions.confirmStart, {
        duelId: payload.duelId,
        contractVersion: this.config.contractVersion,
      });
      await ack;
      document.body.classList.remove("x1-idle");
      this.games.start(payload.mode, {
        seed: payload.seed,
        participants: payload.participants,
      });
    } catch (error) {
      console.error("[X1] Não foi possível confirmar o início", error);
      this.activeDuel = null;
      this.clearPendingAck(payload.duelId);
      this.games.cancel();
      document.body.classList.add("x1-idle");
    }
  }

  handleCancel(payload) {
    if (!this.activeDuel || payload.duelId !== this.activeDuel.duelId) return;
    console.warn("[X1] Duelo cancelado", payload.reason ?? "sem motivo");
    this.games.cancel();
    this.clearPendingAck(payload.duelId, new Error("Duelo cancelado antes do ACK."));
    this.activeDuel = null;
    document.body.classList.add("x1-idle");
  }

  async handleFinish(result) {
    if (!this.activeDuel) return;
    const duel = this.activeDuel;
    try {
      await this.bridge.doAction(this.config.actions.finishGame, {
        duelId: duel.duelId,
        winnerId: result.winnerId,
        seed: result.seed,
        finishTimeMs: result.finishTimeMs,
        simulationTimeMs: result.simulationTimeMs,
        resultReason: result.resultReason,
        contractVersion: this.config.contractVersion,
      });
      this.recentDuels.set(duel.duelId, Date.now());
    } catch (error) {
      console.error("[X1] Callback final falhou; o watchdog fará a limpeza", error);
    } finally {
      this.activeDuel = null;
      this.games.finish();
      setTimeout(() => document.body.classList.add("x1-idle"), 3000);
    }
  }

  pruneRecentDuels() {
    const cutoff = Date.now() - 120000;
    for (const [duelId, finishedAt] of this.recentDuels) {
      if (finishedAt < cutoff) this.recentDuels.delete(duelId);
    }
  }

  waitForAck(duelId) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingAcks.delete(duelId);
        reject(new Error("Timeout aguardando X1.Ack."));
      }, this.config.callbacks.ackTimeoutMs);
      this.pendingAcks.set(duelId, {
        resolve: () => {
          clearTimeout(timer);
          this.pendingAcks.delete(duelId);
          resolve();
        },
        reject,
        timer,
      });
    });
  }

  clearPendingAck(duelId, error = null) {
    const pending = this.pendingAcks.get(duelId);
    if (!pending) return;
    clearTimeout(pending.timer);
    this.pendingAcks.delete(duelId);
    if (error) pending.reject(error);
    else pending.resolve();
  }
}
