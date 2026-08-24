window.X1_LIVE_CONFIG = Object.freeze({
  appVersion: "0.5.0",
  contractVersion: 4,
  websocket: Object.freeze({
    host: "127.0.0.1",
    port: 8080,
    endpoint: "/",
    reconnectMinMs: 1000,
    reconnectMaxMs: 15000,
  }),
  actions: Object.freeze({
    confirmStart: "X1 - Confirmar Inicio",
    finishGame: "X1 - Finalizar Partida",
  }),
  callbacks: Object.freeze({
    attempts: 4,
    retryDelayMs: 750,
    ackTimeoutMs: 4500,
  }),
  logicalSize: 1080,
  fixedStepMs: 1000 / 60,
  countdownMs: 2400,
  hardLimitMs: 96000,
  cameraLeaderScreenY: 330,
  cameraResponsiveness: 5.8,
  gravity: 0.46,
  debugModuleLabels: false,
  defaultSpeed: 2,
});

window.X1_PILOT_CONFIG = window.X1_LIVE_CONFIG;
