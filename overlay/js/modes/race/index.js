import { SeededRng, normalizeSeed } from "../../core/seeded-rng.js";
import { bodyStyle } from "./module-utils.js";
import { RaceRenderer } from "./renderer.js";
import { TrackBuilder } from "./track-builder.js";

const BALL_COLORS = ["#48d8ff", "#c56cff"];
const BALL_RADIUS = 43;

function loadImage(url) {
  if (!url) return null;
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src = url;
  return image;
}

export class RaceGame {
  constructor({ canvas, config, onStateChange, onFinish }) {
    if (!window.Matter) throw new Error("Matter.js não foi carregado.");
    this.Matter = window.Matter;
    this.canvas = canvas;
    this.config = config;
    this.onStateChange = onStateChange;
    this.onFinish = onFinish;
    this.renderer = new RaceRenderer(canvas, config);
    this.trackBuilder = new TrackBuilder(this.Matter);
    this.animationFrame = 0;
    this.lastFrameAt = 0;
    this.accumulator = 0;
    this.speed = config.defaultSpeed ?? 1;
    this.resetRuntime();
  }

  resetRuntime() {
    this.state = "idle";
    this.engine = null;
    this.track = null;
    this.balls = [];
    this.actors = [];
    this.elapsedMs = 0;
    this.realElapsedMs = 0;
    this.countdownElapsedMs = 0;
    this.cameraY = 0;
    this.result = null;
    this.seed = 1;
    this.resultTieRng = null;
  }

  setSpeed(multiplier) {
    const value = Number(multiplier);
    this.speed = [1, 2, 4, 8].includes(value) ? value : 1;
  }

  start({ seed, participants }) {
    this.stopLoop();
    this.disposeEngine();
    this.resetRuntime();
    this.seed = normalizeSeed(seed);
    const rng = new SeededRng(this.seed);
    this.resultTieRng = rng.fork("result-tie");
    this.engine = this.Matter.Engine.create({
      enableSleeping: false,
      positionIterations: 8,
      velocityIterations: 6,
      constraintIterations: 2,
    });
    this.engine.gravity.x = 0;
    this.engine.gravity.y = this.config.gravity;
    this.engine.gravity.scale = 0.001;

    this.track = this.trackBuilder.build({ engine: this.engine, rng: rng.fork("track") });
    this.actors = this.track.actors;
    this.createBalls(participants, rng.fork("participants"));
    this.bindCollisions();
    this.setState("countdown");
    this.lastFrameAt = performance.now();
    this.animationFrame = requestAnimationFrame((time) => this.frame(time));
    return this.getSnapshot();
  }

  createBalls(participants, rng) {
    if (!Array.isArray(participants) || participants.length !== 2) {
      throw new TypeError("A corrida piloto exige exatamente dois participantes.");
    }
    const slots = rng.bool() ? [390, 690] : [690, 390];
    this.balls = participants.map((participant, index) => {
      const body = this.Matter.Bodies.circle(slots[index], 205, BALL_RADIUS, {
        label: `x1-ball-${participant.id}`,
        restitution: 0.62,
        friction: 0.018,
        frictionStatic: 0.025,
        frictionAir: 0.0018,
        density: 0.0022,
        slop: 0.03,
        ...bodyStyle("ball", BALL_COLORS[index], {
          participantId: participant.id,
        }),
      });
      this.Matter.Composite.add(this.engine.world, body);
      return {
        participant,
        body,
        color: BALL_COLORS[index],
        image: loadImage(participant.avatarUrl),
      };
    });
  }

  bindCollisions() {
    this.collisionHandler = (event) => {
      event.pairs.forEach((pair) => {
        this.handlePair(pair.bodyA, pair.bodyB);
        this.handlePair(pair.bodyB, pair.bodyA);
      });
    };
    this.Matter.Events.on(this.engine, "collisionStart", this.collisionHandler);
  }

  handlePair(candidateBall, other) {
    if (candidateBall.plugin?.x1?.kind !== "ball") return;
    if (other.plugin?.x1?.kind === "finish-sensor" && this.state === "running") {
      this.finish(candidateBall.plugin.x1.participantId, "finish_line");
      return;
    }
    const obstacle = other.plugin?.x1;
    if (!obstacle || this.state !== "running") return;

    if (obstacle.kind === "spring") {
      obstacle.launchCounts ??= Object.create(null);
      const participantId = String(candidateBall.plugin.x1.participantId);
      const launchCount = obstacle.launchCounts[participantId] ?? 0;
      if (launchCount >= 2) return;
      obstacle.launchCounts[participantId] = launchCount + 1;
      this.Matter.Body.setVelocity(candidateBall, {
        x: candidateBall.velocity.x + (obstacle.impulseX ?? 0),
        y: Math.min(candidateBall.velocity.y, obstacle.impulseY ?? -10),
      });
      obstacle.flashUntil = performance.now() + 180;
      return;
    }

    if (obstacle.kind !== "bumper") return;

    const dx = candidateBall.position.x - other.position.x;
    const dy = candidateBall.position.y - other.position.y;
    const length = Math.hypot(dx, dy) || 1;
    const impulse = obstacle.impulse ?? 5.4;
    this.Matter.Body.setVelocity(candidateBall, {
      x: candidateBall.velocity.x + (dx / length) * impulse,
      y: candidateBall.velocity.y + (dy / length) * impulse,
    });
    obstacle.flashUntil = performance.now() + 150;
  }

  frame(now) {
    const frameDelta = Math.min(100, Math.max(0, now - this.lastFrameAt));
    this.lastFrameAt = now;

    if (this.state === "countdown") {
      this.countdownElapsedMs += frameDelta * this.speed;
      if (this.countdownElapsedMs >= this.config.countdownMs) {
        this.setState("running");
      }
    } else if (this.state === "running") {
      this.realElapsedMs += frameDelta;
      this.accumulator += frameDelta * this.speed;
      let steps = 0;
      while (this.accumulator >= this.config.fixedStepMs && steps < 16) {
        this.fixedUpdate(this.config.fixedStepMs);
        this.accumulator -= this.config.fixedStepMs;
        steps += 1;
      }
      if (steps === 16) this.accumulator = 0;
    }

    this.updateCamera(frameDelta / 1000);
    this.renderer.render(this);

    if (["countdown", "running"].includes(this.state)) {
      this.animationFrame = requestAnimationFrame((time) => this.frame(time));
    }
  }

  fixedUpdate(stepMs) {
    this.elapsedMs += stepMs;
    const elapsedSeconds = this.elapsedMs / 1000;
    this.actors.forEach((actor) => actor.update(elapsedSeconds, stepMs));
    this.Matter.Engine.update(this.engine, stepMs);
    this.capBallVelocity();

    if (this.elapsedMs >= this.config.hardLimitMs) {
      const [first, second] = this.balls;
      let winner = first;
      let reason = "time_limit_progress";
      const difference = first.body.position.y - second.body.position.y;
      if (Math.abs(difference) < 0.5) {
        winner = this.resultTieRng.bool() ? first : second;
        reason = "time_limit_tiebreak";
      } else if (difference < 0) {
        winner = second;
      }
      this.finish(winner.participant.id, reason);
    }
  }

  capBallVelocity() {
    this.balls.forEach(({ body }) => {
      const speed = Math.hypot(body.velocity.x, body.velocity.y);
      const maximum = 24;
      if (speed <= maximum) return;
      this.Matter.Body.setVelocity(body, {
        x: (body.velocity.x / speed) * maximum,
        y: (body.velocity.y / speed) * maximum,
      });
    });
  }

  updateCamera(realDeltaSeconds) {
    if (!this.track || this.balls.length === 0) return;
    const leaderY = Math.max(...this.balls.map((entry) => entry.body.position.y));
    const maximum = Math.max(0, this.track.worldHeight - this.config.logicalSize);
    const desired = Math.max(
      this.cameraY,
      Math.min(maximum, leaderY - this.config.cameraLeaderScreenY),
    );
    const amount = 1 - Math.exp(-this.config.cameraResponsiveness * realDeltaSeconds);
    this.cameraY += (desired - this.cameraY) * amount;
  }

  finish(winnerId, resultReason) {
    if (this.state !== "running") return;
    this.result = {
      winnerId,
      seed: this.seed,
      finishTimeMs: Math.round(this.realElapsedMs),
      simulationTimeMs: Math.round(this.elapsedMs),
      resultReason,
      moduleOrder: [...this.track.order],
    };
    this.setState("finished");
    this.renderer.render(this);
    this.onFinish?.(this.result);
  }

  setState(state) {
    this.state = state;
    this.onStateChange?.(this.getSnapshot());
  }

  getSnapshot() {
    return {
      state: this.state,
      seed: this.seed,
      elapsedMs: Math.round(this.elapsedMs),
      moduleOrder: this.track ? [...this.track.order] : [],
      result: this.result ? { ...this.result } : null,
    };
  }

  stopLoop() {
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    this.animationFrame = 0;
  }

  disposeEngine() {
    if (!this.engine) return;
    if (this.collisionHandler) {
      this.Matter.Events.off(this.engine, "collisionStart", this.collisionHandler);
    }
    this.Matter.Composite.clear(this.engine.world, false, true);
    this.Matter.Engine.clear(this.engine);
  }

  destroy() {
    this.stopLoop();
    this.disposeEngine();
    this.resetRuntime();
  }
}
