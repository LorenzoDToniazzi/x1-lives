import { alternatingGatesModule } from "./alternating-gates.js";
import { convergenceModule } from "./convergence.js";
import { fanDropModule } from "./fan-drop.js";
import { funnelModule } from "./funnel.js";
import { giantXModule } from "./giant-x.js";
import { meetingChamberModule } from "./meeting-chamber.js";
import { miniPinballModule } from "./mini-pinball.js";
import { paddlesModule } from "./paddles.js";
import { plinkoModule } from "./plinko.js";
import { rotorArenaModule } from "./rotor-arena.js";
import { seesawModule } from "./seesaw.js";

export const RACE_MODULES = Object.freeze({
  [plinkoModule.id]: plinkoModule,
  [giantXModule.id]: giantXModule,
  [funnelModule.id]: funnelModule,
  [paddlesModule.id]: paddlesModule,
  [miniPinballModule.id]: miniPinballModule,
  [convergenceModule.id]: convergenceModule,
  [seesawModule.id]: seesawModule,
  [rotorArenaModule.id]: rotorArenaModule,
  [meetingChamberModule.id]: meetingChamberModule,
  [alternatingGatesModule.id]: alternatingGatesModule,
  [fanDropModule.id]: fanDropModule,
});

export const PILOT_MODULE_IDS = Object.freeze([
  "plinko",
  "giant_x",
  "funnel",
  "paddles",
  "mini_pinball",
  "convergence",
  "seesaw",
  "rotor_arena",
  "meeting_chamber",
  "alternating_gates",
  "fan_drop",
]);

export const INTERACTION_MODULE_IDS = Object.freeze([
  "mini_pinball",
  "funnel",
  "convergence",
  "seesaw",
  "alternating_gates",
  "meeting_chamber",
]);

export const MODULES_PER_RACE = 6;

export function registerRaceModule(registry, descriptor) {
  if (!descriptor?.id || typeof descriptor.build !== "function") {
    throw new TypeError("Um módulo precisa de id e build(context).");
  }
  if (!Number.isFinite(descriptor.height) || descriptor.height <= 0) {
    throw new TypeError(`Altura inválida no módulo ${descriptor.id}.`);
  }
  registry.set(descriptor.id, descriptor);
  return registry;
}
