export class GameManager {
  constructor() {
    this.modes = new Map();
    this.activeMode = null;
  }

  register(name, implementation) {
    if (!name || typeof implementation?.start !== "function") {
      throw new TypeError("Um modo precisa de nome e start(payload).");
    }
    this.modes.set(name, implementation);
    return this;
  }

  start(name, payload) {
    const mode = this.modes.get(name);
    if (!mode) throw new Error(`Modo não registrado: ${name}`);
    if (this.activeMode) throw new Error("Já existe um modo em execução.");
    this.activeMode = name;
    try {
      return mode.start(payload);
    } catch (error) {
      this.activeMode = null;
      throw error;
    }
  }

  cancel() {
    if (!this.activeMode) return;
    this.modes.get(this.activeMode)?.cancel?.();
    this.activeMode = null;
  }

  finish() {
    this.activeMode = null;
  }

  getSnapshot() {
    if (!this.activeMode) return { state: "idle", mode: null };
    return {
      mode: this.activeMode,
      ...this.modes.get(this.activeMode)?.getSnapshot?.(),
    };
  }
}
