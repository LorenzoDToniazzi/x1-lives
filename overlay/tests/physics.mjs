import { createRequire } from "node:module";
import { SeededRng } from "../js/core/seeded-rng.js";
import { bodyStyle } from "../js/modes/race/module-utils.js";
import { TrackBuilder } from "../js/modes/race/track-builder.js";
import {
  INTERACTION_MODULE_IDS,
  MODULES_PER_RACE,
} from "../js/modes/race/modules/index.js";

const require = createRequire(import.meta.url);
const Matter = require("matter-js");
const FIXED_STEP = 1000 / 60;
const HARD_LIMIT = 96000;
const PARTICIPANTS = [
  { id: "blue", displayName: "Jogador Azul" },
  { id: "pink", displayName: "Jogador Rosa" },
];

function simulate(seed) {
  const rng = new SeededRng(seed);
  const engine = Matter.Engine.create({
    enableSleeping: false,
    positionIterations: 8,
    velocityIterations: 6,
  });
  engine.gravity.y = 0.46;
  engine.gravity.scale = 0.001;
  const track = new TrackBuilder(Matter).build({ engine, rng: rng.fork("track") });
  const slots = rng.fork("participants").bool() ? [390, 690] : [690, 390];
  const balls = PARTICIPANTS.map((participant, index) => {
    const body = Matter.Bodies.circle(slots[index], 205, 43, {
      restitution: 0.62,
      friction: 0.018,
      frictionStatic: 0.025,
      frictionAir: 0.0018,
      density: 0.0022,
      slop: 0.03,
      ...bodyStyle("ball", index === 0 ? "#48d8ff" : "#c56cff", {
        participantId: participant.id,
      }),
    });
    Matter.Composite.add(engine.world, body);
    return {
      participant,
      body,
      color: index === 0 ? "#48d8ff" : "#c56cff",
      image: null,
    };
  });

  let result = null;
  let ballBallCollisions = 0;
  const collisionHandler = (event) => {
    for (const pair of event.pairs) {
      if (
        pair.bodyA.plugin?.x1?.kind === "ball" &&
        pair.bodyB.plugin?.x1?.kind === "ball"
      ) {
        ballBallCollisions += 1;
      }
      for (const [candidateBall, other] of [
        [pair.bodyA, pair.bodyB],
        [pair.bodyB, pair.bodyA],
      ]) {
        if (candidateBall.plugin?.x1?.kind !== "ball") continue;
        if (other.plugin?.x1?.kind === "finish-sensor" && !result) {
          result = {
            winnerId: candidateBall.plugin.x1.participantId,
            resultReason: "finish_line",
          };
        }
        if (other.plugin?.x1?.kind === "spring") {
          other.plugin.x1.launchCounts ??= Object.create(null);
          const participantId = String(candidateBall.plugin.x1.participantId);
          const launchCount = other.plugin.x1.launchCounts[participantId] ?? 0;
          if (launchCount < 2) {
            other.plugin.x1.launchCounts[participantId] = launchCount + 1;
            Matter.Body.setVelocity(candidateBall, {
              x: candidateBall.velocity.x + (other.plugin.x1.impulseX ?? 0),
              y: Math.min(candidateBall.velocity.y, other.plugin.x1.impulseY ?? -10),
            });
          }
        }
        if (other.plugin?.x1?.kind === "bumper") {
          const dx = candidateBall.position.x - other.position.x;
          const dy = candidateBall.position.y - other.position.y;
          const length = Math.hypot(dx, dy) || 1;
          const impulse = other.plugin.x1.impulse ?? 5.4;
          Matter.Body.setVelocity(candidateBall, {
            x: candidateBall.velocity.x + (dx / length) * impulse,
            y: candidateBall.velocity.y + (dy / length) * impulse,
          });
        }
      }
    }
  };
  Matter.Events.on(engine, "collisionStart", collisionHandler);

  let elapsedMs = 0;
  while (!result && elapsedMs < HARD_LIMIT) {
    const elapsedSeconds = elapsedMs / 1000;
    track.actors.forEach((actor) => actor.update(elapsedSeconds, FIXED_STEP));
    Matter.Engine.update(engine, FIXED_STEP);
    elapsedMs += FIXED_STEP;

    balls.forEach(({ body }) => {
      const speed = Math.hypot(body.velocity.x, body.velocity.y);
      if (speed > 24) {
        Matter.Body.setVelocity(body, {
          x: (body.velocity.x / speed) * 24,
          y: (body.velocity.y / speed) * 24,
        });
      }
    });

  }

  if (!result) {
    const winner = balls.reduce((leading, candidate) =>
      candidate.body.position.y > leading.body.position.y ? candidate : leading,
    );
    result = { winnerId: winner.participant.id, resultReason: "time_limit_progress" };
  }

  Matter.Events.off(engine, "collisionStart", collisionHandler);
  return {
    seed,
    elapsedMs: Math.round(elapsedMs),
    moduleOrder: track.order,
    finalY: balls.map(({ body }) => Math.round(body.position.y)),
    finalVelocity: balls.map(({ body }) => ({
      x: Number(body.velocity.x.toFixed(2)),
      y: Number(body.velocity.y.toFixed(2)),
    })),
    stalledModules: balls.map(({ body }) =>
      track.sections.find(
        (section) => body.position.y >= section.top && body.position.y <= section.top + section.height,
      )?.id ?? "gap",
    ),
    ballBallCollisions,
    ...result,
  };
}

const baselineSeeds = [
  1, 2, 3, 5, 8, 13, 21, 42, 99, 1234,
  13579, 65537, 99991, 20260716, 31415926, 123456789,
  987654321, 1073741823, 2000000000, 2147483646,
];
const seedSet = new Set(baselineSeeds);
let generatedSeed = 8675309;
while (seedSet.size < 120) {
  generatedSeed = (Math.imul(generatedSeed, 48271) >>> 0) % 2147483646 + 1;
  seedSet.add(generatedSeed);
}
const seeds = [...seedSet];
const results = seeds.map((seed) => simulate(seed));
const uniqueOrders = new Set(results.map((result) => result.moduleOrder.join(",")));

if (results.some((result) => new Set(result.moduleOrder).size !== MODULES_PER_RACE)) {
  throw new Error("Uma pista foi gerada sem os seis módulos únicos.");
}
if (results.some((result) =>
  result.moduleOrder.filter((id) => INTERACTION_MODULE_IDS.includes(id)).length < 2
)) {
  throw new Error("Uma pista foi gerada sem dois módulos de interação.");
}
if (uniqueOrders.size < 4) {
  throw new Error("As seeds não produziram variedade suficiente de ordens.");
}
if (results.some((result) => result.elapsedMs > HARD_LIMIT + FIXED_STEP + 1)) {
  throw new Error("Uma simulação ultrapassou o limite rígido.");
}
const unfinished = results.filter((result) => result.resultReason !== "finish_line");
if (unfinished.length) {
  throw new Error(`Seeds sem chegada: ${JSON.stringify(unfinished)}`);
}
if (results.reduce((total, result) => total + result.ballBallCollisions, 0) === 0) {
  throw new Error("Nenhuma colisão entre as bolinhas foi observada.");
}

const realTimes = results.map((result) => result.elapsedMs / 2).sort((a, b) => a - b);
const percentile = (ratio) => realTimes[Math.min(realTimes.length - 1, Math.floor(realTimes.length * ratio))];
process.stdout.write(`${JSON.stringify({
  simulations: results.length,
  finishes: results.filter((result) => result.resultReason === "finish_line").length,
  uniqueOrders: uniqueOrders.size,
  wallClockMs: {
    min: Math.round(realTimes[0]),
    median: Math.round(percentile(0.5)),
    p90: Math.round(percentile(0.9)),
    max: Math.round(realTimes.at(-1)),
  },
}, null, 2)}\n`);
