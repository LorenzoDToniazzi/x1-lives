import { GameManager } from "./core/game-manager.js";
import { OverlayController } from "./core/overlay-controller.js";
import { StreamerbotBridge } from "./core/streamerbot-bridge.js";
import { normalizeSeed } from "./core/seeded-rng.js";
import { RaceGame } from "./modes/race/index.js";

const config = window.X1_LIVE_CONFIG;
const canvas = document.querySelector("#race-canvas");
const seedInput = document.querySelector("#seed-input");
const speedInput = document.querySelector("#speed-input");
const restartButton = document.querySelector("#restart-button");
const randomButton = document.querySelector("#random-button");
const status = document.querySelector("#status");
const params = new URLSearchParams(window.location.search);

const demoParticipants = [
  {
    id: "pilot-blue",
    login: "jogadorazul",
    displayName: "Jogador Azul",
    avatarUrl: "./assets/images/avatar-blue.svg",
  },
  {
    id: "pilot-pink",
    login: "jogadorrosa",
    displayName: "Jogador Rosa",
    avatarUrl: "./assets/images/avatar-pink.svg",
  },
];

function randomSeed() {
  if (globalThis.crypto?.getRandomValues) {
    const data = new Uint32Array(1);
    globalThis.crypto.getRandomValues(data);
    return (data[0] % 2147483646) + 1;
  }
  return Math.floor(Math.random() * 2147483646) + 1;
}

function updateStatus(snapshot) {
  const labels = {
    finished: "Corrida concluída",
    running: "Corrida em andamento",
    countdown: "Preparando corrida",
    idle: "Aguardando X1",
  };
  status.textContent = labels[snapshot.state] ?? "Preparando corrida";
}

const race = new RaceGame({
  canvas,
  config,
  onStateChange: updateStatus,
  onFinish(result) {
    window.dispatchEvent(new CustomEvent("x1-game-finish", { detail: result }));
  },
});

const games = new GameManager();
games.register("race", {
  start({ seed, participants }) {
    race.setSpeed(config.defaultSpeed);
    return race.start({ seed, participants });
  },
  cancel() {
    race.destroy();
  },
  getSnapshot() {
    return race.getSnapshot();
  },
});

const bridge = new StreamerbotBridge(config);
const controller = new OverlayController({ config, games, bridge });
controller.start();

function startDemo(seed = randomSeed(), participants = demoParticipants) {
  const normalized = normalizeSeed(seed);
  seedInput.value = String(normalized);
  race.setSpeed(Number(speedInput.value));
  document.body.classList.remove("x1-idle");
  return race.start({ seed: normalized, participants });
}

restartButton.addEventListener("click", () => startDemo(seedInput.value));
randomButton.addEventListener("click", () => startDemo(randomSeed()));
speedInput.addEventListener("change", () => race.setSpeed(Number(speedInput.value)));

const initialSeed = normalizeSeed(params.get("seed") ?? randomSeed());
const initialSpeed = Number(params.get("speed") ?? config.defaultSpeed);
speedInput.value = [1, 2, 4, 8].includes(initialSpeed) ? String(initialSpeed) : "2";
if (params.get("controls") === "0") document.body.classList.add("hide-controls");

window.__X1_LIVE__ = Object.freeze({
  controller,
  bridge,
  games,
  startDemo,
  getState: () => games.getSnapshot(),
});

if (params.get("autostart") === "1") {
  startDemo(initialSeed);
} else {
  document.body.classList.add("x1-idle");
  updateStatus({ state: "idle" });
}
