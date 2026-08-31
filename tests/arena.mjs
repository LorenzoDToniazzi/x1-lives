import assert from "node:assert/strict";
import { ArenaGame } from "../overlay/js/modes/arena/index.js";
import { ARENA_BALANCE } from "../overlay/js/modes/arena/balance-config.js";

if (!globalThis.requestAnimationFrame) globalThis.requestAnimationFrame = () => 1;
if (!globalThis.cancelAnimationFrame) globalThis.cancelAnimationFrame = () => {};

const noop = () => {};
const context = new Proxy({}, {
  get(target, property) {
    if (property in target) return target[property];
    return noop;
  },
  set(target, property, value) {
    target[property] = value;
    return true;
  },
});
const canvas = { width: 1080, height: 1080, getContext: () => context };
const participants = [
  { id: "a", login: "a", displayName: "A", avatarUrl: "" },
  { id: "b", login: "b", displayName: "B", avatarUrl: "" },
];

function simulate(seed) {
  let result = null;
  const game = new ArenaGame({
    canvas,
    config: { countdownMs: 0 },
    onStateChange: noop,
    onFinish: (value) => { result = value; },
  });
  game.start({ seed, participants, options: { simulationSpeed: 2 } });
  game.stopLoop();
  game.setState("running");
  for (let step = 0; step < 2300 && game.state === "running"; step += 1) {
    game.fixedUpdate(ARENA_BALANCE.fixedStepMs);
  }
  assert.ok(result, `seed ${seed} precisa terminar`);
  assert.ok(["a", "b"].includes(result.winnerId));
  assert.ok(["knockout", "tiebreak"].includes(result.resultReason));
  assert.ok(result.simulationTimeMs <= 36050);
  assert.notEqual(
    result.powers.a === "shield" && result.powers.b === "shield",
    true,
    "shield x shield deve ser rerolado",
  );
  assert.ok(result.stats.a.clonesCreated <= 31);
  assert.ok(result.stats.b.clonesCreated <= 31);
  return result;
}

const first = simulate(123456);
const repeated = simulate(123456);
assert.deepEqual(
  {
    winnerId: first.winnerId,
    simulationTimeMs: first.simulationTimeMs,
    resultReason: first.resultReason,
    powers: first.powers,
    stats: first.stats,
  },
  {
    winnerId: repeated.winnerId,
    simulationTimeMs: repeated.simulationTimeMs,
    resultReason: repeated.resultReason,
    powers: repeated.powers,
    stats: repeated.stats,
  },
  "a mesma seed precisa produzir a mesma luta",
);

for (let seed = 1; seed <= 40; seed += 1) simulate(seed * 7919);

console.log("Arena smoke tests: OK");
