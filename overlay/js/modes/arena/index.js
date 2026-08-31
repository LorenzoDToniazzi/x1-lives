import { SeededRng, normalizeSeed } from "../../core/seeded-rng.js";
import { ARENA_BALANCE, ARENA_POWER_IDS } from "./balance-config.js";

const TAU = Math.PI * 2;
const PLAYER_COLORS = ["#48d8ff", "#c56cff"];
const EPSILON = 0.0001;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function normalizeVector(x, y) {
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}

function segmentCircleHit(ax, ay, bx, by, circle) {
  const abx = bx - ax;
  const aby = by - ay;
  const denominator = abx * abx + aby * aby || 1;
  const t = clamp(((circle.x - ax) * abx + (circle.y - ay) * aby) / denominator, 0, 1);
  const x = ax + abx * t;
  const y = ay + aby * t;
  return {
    hit: Math.hypot(circle.x - x, circle.y - y) <= circle.radius,
    t,
    x,
    y,
  };
}

function loadImage(url) {
  if (!url) return null;
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src = url;
  return image;
}

function powerLabel(id) {
  return ARENA_BALANCE.powers[id]?.label ?? id;
}

function scaledPower(state) {
  const base = ARENA_BALANCE.powers[state.powerId];
  const hits = state.hits;
  switch (state.powerId) {
    case "sword":
      return { ...base, damage: base.damage + hits * base.damagePerHit };
    case "dagger":
      return { ...base, angularSpeed: Math.min(base.maxAngularSpeed, base.angularSpeed * (base.angularGrowth ** hits)) };
    case "spear":
      return {
        ...base,
        damage: base.damage + hits * base.damagePerHit,
        range: Math.min(base.maxRange, base.range + hits * base.rangePerHit),
      };
    case "bow":
      return {
        ...base,
        cooldownMs: Math.max(210, base.cooldownMs * (base.cooldownGrowth ** hits)),
        count: Math.min(base.maxArrows, 1 + Math.floor(hits / 4)),
      };
    case "slingshot":
      return { ...base, count: Math.min(base.maxStones, 1 + hits) };
    case "shield":
      return { ...base, length: Math.min(base.maxLength, base.length + state.blocks * base.lengthPerBlock) };
    case "hook":
      return {
        ...base,
        damage: base.damage + hits * base.damagePerHit,
        range: base.range + hits * base.rangePerHit,
        cooldownMs: Math.max(320, base.cooldownMs * (base.cooldownGrowth ** hits)),
      };
    case "boomerang":
      return {
        ...base,
        damage: base.damage + hits * base.damagePerHit,
        radius: base.radius + hits * base.radiusPerHit,
        speed: base.speed + hits * base.speedPerHit,
        distance: base.distance + hits * base.distancePerHit,
      };
    case "scythe":
      return {
        ...base,
        damage: base.damage + hits * base.damagePerHit,
        healPercent: Math.min(base.maxHealPercent, base.healPercent + hits * base.healPercentPerHit),
      };
    default:
      return base;
  }
}

export class ArenaGame {
  constructor({ canvas, config, onStateChange, onFinish }) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.config = config;
    this.onStateChange = onStateChange;
    this.onFinish = onFinish;
    this.animationFrame = 0;
    this.resetRuntime();
  }

  resetRuntime() {
    this.state = "idle";
    this.seed = 1;
    this.rng = null;
    this.players = [];
    this.projectiles = [];
    this.elapsedMs = 0;
    this.realElapsedMs = 0;
    this.countdownElapsedMs = 0;
    this.accumulator = 0;
    this.lastFrameAt = 0;
    this.speed = ARENA_BALANCE.defaultSimulationSpeed;
    this.result = null;
    this.powers = [];
    this.arenaBounds = this.computeBounds(0);
  }

  start({ seed, participants, options = {} }) {
    if (!Array.isArray(participants) || participants.length !== 2) {
      throw new TypeError("A Arena exige exatamente dois participantes.");
    }
    this.stopLoop();
    this.resetRuntime();
    this.seed = normalizeSeed(seed);
    this.rng = new SeededRng(this.seed);
    this.speed = [1, 2, 4].includes(Number(options.simulationSpeed))
      ? Number(options.simulationSpeed)
      : ARENA_BALANCE.defaultSimulationSpeed;
    this.powers = this.rollPowers();
    this.players = participants.map((participant, index) => this.createPlayer(participant, index));
    this.setState("countdown");
    this.lastFrameAt = performance.now();
    this.animationFrame = requestAnimationFrame((time) => this.frame(time));
    return this.getSnapshot();
  }

  rollPowers() {
    const first = this.rng.pick(ARENA_POWER_IDS);
    let second = this.rng.pick(ARENA_POWER_IDS);
    while (first === "shield" && second === "shield") second = this.rng.pick(ARENA_POWER_IDS);
    return [first, second];
  }

  createPlayer(participant, index) {
    const x = index === 0 ? 135 : 365;
    const y = 250;
    const angle = index === 0
      ? this.rng.range(-0.65, 0.65)
      : Math.PI + this.rng.range(-0.65, 0.65);
    const powerAngle = this.rng.range(0, TAU);
    const player = {
      id: participant.id,
      participant,
      image: loadImage(participant.avatarUrl),
      color: PLAYER_COLORS[index],
      x,
      y,
      vx: Math.cos(angle) * ARENA_BALANCE.baseSpeed,
      vy: Math.sin(angle) * ARENA_BALANCE.baseSpeed,
      radius: ARENA_BALANCE.playerRadius,
      hp: ARENA_BALANCE.playerHp,
      maxHp: ARENA_BALANCE.playerHp,
      powerId: this.powers[index],
      powerAngle,
      powerDirection: this.rng.bool() ? 1 : -1,
      hits: 0,
      blocks: 0,
      shots: 0,
      lastAttackMs: -99999,
      lastMeleeHitByTarget: new Map(),
      lastContactByTarget: new Map(),
      clones: [],
      nextCloneAtMs: ARENA_BALANCE.cloneIntervalMs,
      ownerAlive: true,
      hook: null,
      boomerang: null,
    };
    if (player.powerId === "clone") this.ensureOwnerCloneMarker(player);
    return player;
  }

  ensureOwnerCloneMarker(player) {
    player.clones = [];
  }

  frame(now) {
    const frameDelta = Math.min(100, Math.max(0, now - this.lastFrameAt));
    this.lastFrameAt = now;

    if (this.state === "countdown") {
      this.countdownElapsedMs += frameDelta;
      if (this.countdownElapsedMs >= (this.config.countdownMs ?? 2400)) this.setState("running");
    } else if (this.state === "running") {
      this.realElapsedMs += frameDelta;
      this.accumulator += frameDelta * this.speed;
      let steps = 0;
      while (this.accumulator >= ARENA_BALANCE.fixedStepMs && steps < 16) {
        this.fixedUpdate(ARENA_BALANCE.fixedStepMs);
        this.accumulator -= ARENA_BALANCE.fixedStepMs;
        steps += 1;
      }
      if (steps === 16) this.accumulator = 0;
    }

    this.render();
    if (["countdown", "running"].includes(this.state)) {
      this.animationFrame = requestAnimationFrame((time) => this.frame(time));
    }
  }

  fixedUpdate(stepMs) {
    const dt = stepMs / 1000;
    this.elapsedMs += stepMs;
    this.arenaBounds = this.computeBounds(this.elapsedMs);

    for (const player of this.players) {
      if (!player.ownerAlive) continue;
      this.rotatePower(player, dt);
      this.moveBody(player, dt, player.radius);
      this.updateClones(player, dt);
      this.updatePower(player);
    }

    this.resolvePlayerCollision();
    this.resolveCloneCollisions();
    this.updateProjectiles(dt);
    this.resolveMeleeInteractions();
    this.resolveProjectileInteractions();
    this.resolveContactDamage();
    this.checkDeaths();

    if (this.state === "running" && this.elapsedMs >= ARENA_BALANCE.hardLimitMs) {
      this.finishByTiebreak();
    }
  }

  computeBounds(elapsedMs) {
    const half = ARENA_BALANCE.logicalSize / 2;
    let scale = 1;
    if (elapsedMs > ARENA_BALANCE.suddenDeathAtMs) {
      const progress = clamp(
        (elapsedMs - ARENA_BALANCE.suddenDeathAtMs) / ARENA_BALANCE.shrinkDurationMs,
        0,
        1,
      );
      scale = 1 - progress * (1 - ARENA_BALANCE.minimumArenaScale);
    }
    const size = ARENA_BALANCE.logicalSize * scale;
    const margin = (ARENA_BALANCE.logicalSize - size) / 2;
    return { left: margin, top: margin, right: ARENA_BALANCE.logicalSize - margin, bottom: ARENA_BALANCE.logicalSize - margin, size, half };
  }

  rotatePower(player, dt) {
    const power = scaledPower(player);
    const angularSpeed = power.angularSpeed ?? 4.2;
    player.powerAngle = (player.powerAngle + angularSpeed * player.powerDirection * dt + TAU) % TAU;
  }

  moveBody(body, dt, radius) {
    body.x += body.vx * dt;
    body.y += body.vy * dt;
    const b = this.arenaBounds;
    if (body.x - radius < b.left) {
      body.x = b.left + radius;
      body.vx = Math.abs(body.vx);
    } else if (body.x + radius > b.right) {
      body.x = b.right - radius;
      body.vx = -Math.abs(body.vx);
    }
    if (body.y - radius < b.top) {
      body.y = b.top + radius;
      body.vy = Math.abs(body.vy);
    } else if (body.y + radius > b.bottom) {
      body.y = b.bottom - radius;
      body.vy = -Math.abs(body.vy);
    }
  }

  resolvePlayerCollision() {
    const [a, b] = this.players;
    if (!a.ownerAlive || !b.ownerAlive) return;
    this.resolveCircleBounce(a, b, a.radius, b.radius);
  }

  resolveCircleBounce(a, b, radiusA, radiusB) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy) || EPSILON;
    const minimum = radiusA + radiusB;
    if (dist >= minimum) return false;
    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = minimum - dist;
    a.x -= nx * overlap * 0.5;
    a.y -= ny * overlap * 0.5;
    b.x += nx * overlap * 0.5;
    b.y += ny * overlap * 0.5;
    const avn = a.vx * nx + a.vy * ny;
    const bvn = b.vx * nx + b.vy * ny;
    const deltaA = bvn - avn;
    const deltaB = avn - bvn;
    a.vx += deltaA * nx;
    a.vy += deltaA * ny;
    b.vx += deltaB * nx;
    b.vy += deltaB * ny;
    return true;
  }

  updateClones(player, dt) {
    if (player.powerId !== "clone") return;
    if (this.elapsedMs + EPSILON >= player.nextCloneAtMs) {
      const currentBodies = 1 + player.clones.filter((clone) => clone.hp > 0).length;
      const targetBodies = Math.min(ARENA_BALANCE.maxClonesPerPlayer, currentBodies * 2);
      const toCreate = targetBodies - currentBodies;
      for (let index = 0; index < toCreate; index += 1) this.spawnClone(player, index);
      player.nextCloneAtMs += ARENA_BALANCE.cloneIntervalMs;
    }
    for (const clone of player.clones) {
      if (clone.hp <= 0) continue;
      this.moveBody(clone, dt, clone.radius);
    }
  }

  spawnClone(player, index) {
    if (1 + player.clones.length >= ARENA_BALANCE.maxClonesPerPlayer) return;
    const power = ARENA_BALANCE.powers.clone;
    const angle = this.rng.range(0, TAU) + index * 0.37;
    const spawnDistance = player.radius + power.cloneRadius + 4;
    const speedAngle = this.rng.range(0, TAU);
    player.clones.push({
      id: `${player.id}-clone-${player.clones.length + 1}`,
      ownerId: player.id,
      x: clamp(player.x + Math.cos(angle) * spawnDistance, this.arenaBounds.left + power.cloneRadius, this.arenaBounds.right - power.cloneRadius),
      y: clamp(player.y + Math.sin(angle) * spawnDistance, this.arenaBounds.top + power.cloneRadius, this.arenaBounds.bottom - power.cloneRadius),
      vx: Math.cos(speedAngle) * ARENA_BALANCE.baseSpeed * 0.92,
      vy: Math.sin(speedAngle) * ARENA_BALANCE.baseSpeed * 0.92,
      radius: power.cloneRadius,
      hp: power.cloneHp,
      maxHp: power.cloneHp,
      lastContactByTarget: new Map(),
    });
  }

  resolveCloneCollisions() {
    const bodies = [];
    for (const player of this.players) {
      if (!player.ownerAlive) continue;
      bodies.push({ body: player, owner: player, radius: player.radius, isOwner: true });
      for (const clone of player.clones) {
        if (clone.hp > 0) bodies.push({ body: clone, owner: player, radius: clone.radius, isOwner: false });
      }
    }
    for (let i = 0; i < bodies.length; i += 1) {
      for (let j = i + 1; j < bodies.length; j += 1) {
        const a = bodies[i];
        const b = bodies[j];
        if (a.owner.id === b.owner.id && !a.isOwner && !b.isOwner) continue;
        this.resolveCircleBounce(a.body, b.body, a.radius, b.radius);
      }
    }
  }

  updatePower(player) {
    const power = scaledPower(player);
    switch (player.powerId) {
      case "bow":
        if (this.elapsedMs - player.lastAttackMs >= power.cooldownMs) this.fireSpread(player, power, power.count, "arrow");
        break;
      case "slingshot":
        if (this.elapsedMs - player.lastAttackMs >= power.cooldownMs) this.fireSpread(player, power, power.count, "stone");
        break;
      case "hook":
        if (this.elapsedMs - player.lastAttackMs >= power.cooldownMs) this.fireHook(player, power);
        break;
      case "boomerang":
        this.updateBoomerang(player, power);
        break;
      default:
        break;
    }
  }

  fireSpread(player, power, count, kind) {
    player.lastAttackMs = this.elapsedMs;
    player.shots += count;
    const cappedCount = Math.max(1, count);
    const spread = kind === "arrow" ? 0.12 : 0.17;
    for (let index = 0; index < cappedCount; index += 1) {
      if (this.projectiles.length >= ARENA_BALANCE.maxProjectiles) break;
      const offset = (index - (cappedCount - 1) / 2) * spread;
      this.spawnProjectile({
        owner: player,
        kind,
        angle: player.powerAngle + offset,
        speed: power.projectileSpeed,
        radius: power.projectileRadius,
        damage: power.damage,
        ttlMs: 3600,
      });
    }
  }

  spawnProjectile({ owner, kind, angle, speed, radius, damage, ttlMs, returning = false, maxDistance = null }) {
    const originDistance = owner.radius + radius + 5;
    const projectile = {
      id: `${kind}-${owner.id}-${this.elapsedMs}-${this.projectiles.length}`,
      ownerId: owner.id,
      originalOwnerId: owner.id,
      kind,
      x: owner.x + Math.cos(angle) * originDistance,
      y: owner.y + Math.sin(angle) * originDistance,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius,
      damage,
      bornAtMs: this.elapsedMs,
      ttlMs,
      returning,
      maxDistance,
      originX: owner.x,
      originY: owner.y,
      active: true,
      hitTargets: new Set(),
    };
    this.projectiles.push(projectile);
    return projectile;
  }

  fireHook(player, power) {
    player.lastAttackMs = this.elapsedMs;
    const angle = player.powerAngle;
    player.hook = this.spawnProjectile({
      owner: player,
      kind: "hook",
      angle,
      speed: power.projectileSpeed,
      radius: 8,
      damage: power.damage,
      ttlMs: Math.max(260, (power.range / power.projectileSpeed) * 1000),
      maxDistance: power.range,
    });
  }

  updateBoomerang(player, power) {
    if (!player.boomerang?.active && this.elapsedMs - player.lastAttackMs >= power.cooldownMs) {
      player.lastAttackMs = this.elapsedMs;
      player.boomerang = this.spawnProjectile({
        owner: player,
        kind: "boomerang",
        angle: player.powerAngle,
        speed: power.speed,
        radius: power.radius,
        damage: power.damage,
        ttlMs: 2500,
        returning: false,
        maxDistance: power.distance,
      });
    }
  }

  updateProjectiles(dt) {
    for (const projectile of this.projectiles) {
      if (!projectile.active) continue;
      const age = this.elapsedMs - projectile.bornAtMs;
      if (age >= projectile.ttlMs) {
        projectile.active = false;
        continue;
      }

      if (projectile.kind === "boomerang") {
        const owner = this.players.find((player) => player.id === projectile.originalOwnerId);
        if (!owner?.ownerAlive) {
          projectile.active = false;
          continue;
        }
        const travelled = Math.hypot(projectile.x - projectile.originX, projectile.y - projectile.originY);
        if (!projectile.returning && travelled >= projectile.maxDistance) projectile.returning = true;
        if (projectile.returning) {
          const direction = normalizeVector(owner.x - projectile.x, owner.y - projectile.y);
          const speed = Math.hypot(projectile.vx, projectile.vy);
          projectile.vx = direction.x * speed;
          projectile.vy = direction.y * speed;
          if (distance(projectile, owner) <= owner.radius + projectile.radius + 3) {
            projectile.active = false;
            continue;
          }
        }
      }

      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;

      if (projectile.kind === "hook") {
        const owner = this.players.find((player) => player.id === projectile.originalOwnerId);
        if (owner && this.hookHitWall(projectile)) {
          const pull = normalizeVector(projectile.x - owner.x, projectile.y - owner.y);
          owner.vx += pull.x * 150;
          owner.vy += pull.y * 150;
          projectile.active = false;
          continue;
        }
      }

      const b = this.arenaBounds;
      if (projectile.x - projectile.radius < b.left || projectile.x + projectile.radius > b.right) {
        if (["arrow", "stone"].includes(projectile.kind)) projectile.active = false;
        else projectile.vx *= -1;
      }
      if (projectile.y - projectile.radius < b.top || projectile.y + projectile.radius > b.bottom) {
        if (["arrow", "stone"].includes(projectile.kind)) projectile.active = false;
        else projectile.vy *= -1;
      }
    }
    this.projectiles = this.projectiles.filter((projectile) => projectile.active);
  }

  hookHitWall(projectile) {
    const b = this.arenaBounds;
    return projectile.x - projectile.radius <= b.left
      || projectile.x + projectile.radius >= b.right
      || projectile.y - projectile.radius <= b.top
      || projectile.y + projectile.radius >= b.bottom;
  }

  resolveMeleeInteractions() {
    const meleePlayers = this.players.filter((player) => player.ownerAlive && ["sword", "dagger", "spear", "scythe"].includes(player.powerId));
    if (meleePlayers.length === 2 && this.meleeWeaponsTouch(meleePlayers[0], meleePlayers[1])) {
      meleePlayers[0].powerDirection *= -1;
      meleePlayers[1].powerDirection *= -1;
      meleePlayers[0].powerAngle += meleePlayers[0].powerDirection * 0.08;
      meleePlayers[1].powerAngle += meleePlayers[1].powerDirection * 0.08;
      return;
    }

    for (const attacker of meleePlayers) {
      const defender = this.players.find((player) => player.id !== attacker.id && player.ownerAlive);
      if (!defender) continue;
      const attack = this.weaponSegment(attacker);

      if (defender.powerId === "shield" && this.segmentHitsShield(attack, defender)) {
        const power = scaledPower(attacker);
        defender.blocks += 1;
        this.damagePlayer(attacker, power.damage * ARENA_BALANCE.powers.shield.meleeReflection, defender.id, false);
        attacker.powerDirection *= -1;
        continue;
      }

      const targetBodies = [
        { body: defender, isOwner: true },
        ...defender.clones.filter((clone) => clone.hp > 0).map((clone) => ({ body: clone, isOwner: false })),
      ]
        .map((entry) => ({ ...entry, hit: segmentCircleHit(attack.ax, attack.ay, attack.bx, attack.by, entry.body) }))
        .filter((entry) => entry.hit.hit)
        .sort((a, b) => a.hit.t - b.hit.t);

      const first = targetBodies[0];
      if (!first) continue;
      const targetId = first.body.id;
      const power = scaledPower(attacker);
      const lastHit = attacker.lastMeleeHitByTarget.get(targetId) ?? -99999;
      if (this.elapsedMs - lastHit < power.hitCooldownMs) continue;
      attacker.lastMeleeHitByTarget.set(targetId, this.elapsedMs);
      this.applyHit(attacker, defender, first.body, power.damage, first.isOwner, attacker.powerId);
      attacker.powerDirection *= -1;
    }
  }

  meleeWeaponsTouch(a, b) {
    const wa = this.weaponSegment(a);
    const wb = this.weaponSegment(b);
    const endpoints = [
      [{ x: wa.bx, y: wa.by }, { x: wb.bx, y: wb.by }],
      [{ x: wa.bx, y: wa.by }, { x: wb.ax, y: wb.ay }],
      [{ x: wa.ax, y: wa.ay }, { x: wb.bx, y: wb.by }],
    ];
    return endpoints.some(([p1, p2]) => distance(p1, p2) < 18);
  }

  weaponSegment(player) {
    const power = scaledPower(player);
    const range = power.range ?? 70;
    const inner = player.radius * 0.55;
    return {
      ax: player.x + Math.cos(player.powerAngle) * inner,
      ay: player.y + Math.sin(player.powerAngle) * inner,
      bx: player.x + Math.cos(player.powerAngle) * range,
      by: player.y + Math.sin(player.powerAngle) * range,
    };
  }

  shieldSegment(player) {
    const power = scaledPower(player);
    const distanceFromOwner = player.radius + 13;
    const cx = player.x + Math.cos(player.powerAngle) * distanceFromOwner;
    const cy = player.y + Math.sin(player.powerAngle) * distanceFromOwner;
    const perpendicular = player.powerAngle + Math.PI / 2;
    const half = power.length / 2;
    return {
      ax: cx + Math.cos(perpendicular) * half,
      ay: cy + Math.sin(perpendicular) * half,
      bx: cx - Math.cos(perpendicular) * half,
      by: cy - Math.sin(perpendicular) * half,
    };
  }

  segmentHitsShield(segment, shieldOwner) {
    const shield = this.shieldSegment(shieldOwner);
    const mid = { x: (segment.bx + segment.ax) / 2, y: (segment.by + segment.ay) / 2, radius: 10 };
    const shieldMid = { x: (shield.bx + shield.ax) / 2, y: (shield.by + shield.ay) / 2, radius: scaledPower(shieldOwner).length / 2 };
    if (distance(mid, shieldMid) > shieldMid.radius + 45) return false;
    const first = segmentCircleHit(shield.ax, shield.ay, shield.bx, shield.by, { x: segment.bx, y: segment.by, radius: 12 });
    return first.hit;
  }

  resolveProjectileInteractions() {
    this.resolveProjectileVsProjectile();
    for (const projectile of this.projectiles) {
      if (!projectile.active) continue;
      const owner = this.players.find((player) => player.id === projectile.ownerId);
      const defender = this.players.find((player) => player.id !== projectile.ownerId && player.ownerAlive);
      if (!defender) continue;

      if (defender.powerId === "shield" && this.projectileHitsShield(projectile, defender)) {
        defender.blocks += 1;
        projectile.ownerId = defender.id;
        projectile.vx *= -1;
        projectile.vy *= -1;
        projectile.x += projectile.vx * 0.02;
        projectile.y += projectile.vy * 0.02;
        projectile.hitTargets.clear();
        continue;
      }

      if (["sword", "dagger", "spear", "scythe"].includes(defender.powerId) && this.projectileHitsMelee(projectile, defender)) {
        const weapon = this.weaponSegment(defender);
        const direction = normalizeVector(projectile.x - weapon.bx, projectile.y - weapon.by);
        const speed = Math.hypot(projectile.vx, projectile.vy);
        projectile.vx = direction.x * speed;
        projectile.vy = direction.y * speed;
        projectile.ownerId = defender.id;
        projectile.hitTargets.clear();
        defender.powerDirection *= -1;
        continue;
      }

      const targets = [
        { body: defender, isOwner: true },
        ...defender.clones.filter((clone) => clone.hp > 0).map((clone) => ({ body: clone, isOwner: false })),
      ];
      for (const target of targets) {
        if (projectile.hitTargets.has(target.body.id)) continue;
        if (distance(projectile, target.body) > projectile.radius + target.body.radius) continue;
        projectile.hitTargets.add(target.body.id);
        this.applyHit(owner ?? this.players.find((player) => player.id === projectile.originalOwnerId), defender, target.body, projectile.damage, target.isOwner, projectile.kind);
        if (projectile.kind === "hook") {
          const hookOwner = this.players.find((player) => player.id === projectile.originalOwnerId);
          if (hookOwner) {
            const pull = normalizeVector(hookOwner.x - target.body.x, hookOwner.y - target.body.y);
            target.body.vx += pull.x * 180;
            target.body.vy += pull.y * 180;
          }
          projectile.active = false;
        } else if (["arrow", "stone"].includes(projectile.kind)) {
          projectile.active = false;
        }
        break;
      }
    }
    this.projectiles = this.projectiles.filter((projectile) => projectile.active);
  }

  resolveProjectileVsProjectile() {
    for (let i = 0; i < this.projectiles.length; i += 1) {
      const a = this.projectiles[i];
      if (!a.active) continue;
      for (let j = i + 1; j < this.projectiles.length; j += 1) {
        const b = this.projectiles[j];
        if (!b.active || a.ownerId === b.ownerId) continue;
        if (distance(a, b) > a.radius + b.radius) continue;
        const avx = a.vx;
        const avy = a.vy;
        a.vx = b.vx;
        a.vy = b.vy;
        b.vx = avx;
        b.vy = avy;
        a.hitTargets.clear();
        b.hitTargets.clear();
      }
    }
  }

  projectileHitsShield(projectile, defender) {
    const shield = this.shieldSegment(defender);
    return segmentCircleHit(shield.ax, shield.ay, shield.bx, shield.by, projectile).hit;
  }

  projectileHitsMelee(projectile, defender) {
    const weapon = this.weaponSegment(defender);
    return segmentCircleHit(weapon.ax, weapon.ay, weapon.bx, weapon.by, projectile).hit;
  }

  resolveContactDamage() {
    for (const owner of this.players) {
      if (!owner.ownerAlive || owner.powerId !== "clone") continue;
      const enemy = this.players.find((player) => player.id !== owner.id && player.ownerAlive);
      if (!enemy) continue;
      for (const clone of owner.clones) {
        if (clone.hp <= 0) continue;
        const targets = [
          { body: enemy, isOwner: true },
          ...enemy.clones.filter((entry) => entry.hp > 0).map((entry) => ({ body: entry, isOwner: false })),
        ];
        for (const target of targets) {
          if (distance(clone, target.body) > clone.radius + target.body.radius) continue;
          const last = clone.lastContactByTarget.get(target.body.id) ?? -99999;
          if (this.elapsedMs - last < ARENA_BALANCE.powers.clone.contactCooldownMs) continue;
          clone.lastContactByTarget.set(target.body.id, this.elapsedMs);
          this.applyHit(owner, enemy, target.body, ARENA_BALANCE.powers.clone.contactDamage, target.isOwner, "clone");
          break;
        }
      }
    }
  }

  applyHit(attacker, defenderOwner, targetBody, damage, targetIsOwner, attackKind) {
    if (!attacker || !defenderOwner?.ownerAlive || damage <= 0) return;
    if (targetIsOwner) {
      this.damagePlayer(defenderOwner, damage, attacker.id, true);
    } else {
      targetBody.hp = Math.max(0, targetBody.hp - damage);
    }

    if (attacker.powerId !== "clone") attacker.hits += 1;

    if (attacker.powerId === "scythe" && targetIsOwner) {
      const power = scaledPower(attacker);
      const heal = damage * power.healPercent;
      attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
    }

    if (attackKind === "hook" && !targetIsOwner && targetBody.hp <= 0) {
      targetBody.vx = 0;
      targetBody.vy = 0;
    }
  }

  damagePlayer(player, damage, _sourceId, _countsAsHit) {
    if (!player.ownerAlive) return;
    player.hp = Math.max(0, player.hp - damage);
  }

  checkDeaths() {
    const dead = this.players.filter((player) => player.ownerAlive && player.hp <= 0);
    if (dead.length === 0) return;
    for (const player of dead) {
      player.ownerAlive = false;
      player.clones.forEach((clone) => { clone.hp = 0; });
    }
    const alive = this.players.filter((player) => player.ownerAlive);
    if (alive.length === 1) this.finish(alive[0].id, "knockout");
    else this.finishByTiebreak();
  }

  finishByTiebreak() {
    if (this.state !== "running") return;
    const [a, b] = this.players;
    let winner;
    const hpDifference = a.hp - b.hp;
    if (Math.abs(hpDifference) > 0.01) winner = hpDifference > 0 ? a : b;
    else if (a.hits !== b.hits) winner = a.hits > b.hits ? a : b;
    else winner = this.rng.fork("arena-tiebreak").bool() ? a : b;
    this.finish(winner.id, "tiebreak");
  }

  finish(winnerId, resultReason) {
    if (this.state !== "running") return;
    this.result = {
      winnerId,
      seed: this.seed,
      finishTimeMs: Math.round(this.realElapsedMs),
      simulationTimeMs: Math.round(this.elapsedMs),
      resultReason,
      powers: Object.fromEntries(this.players.map((player) => [player.id, player.powerId])),
      stats: Object.fromEntries(this.players.map((player) => [player.id, {
        hp: Number(player.hp.toFixed(2)),
        hits: player.hits,
        blocks: player.blocks,
        shots: player.shots,
        clonesCreated: player.clones.length,
      }])),
    };
    this.setState("finished");
    this.render();
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
      powers: [...this.powers],
      result: this.result ? { ...this.result } : null,
    };
  }

  render() {
    const ctx = this.context;
    const width = this.canvas.width;
    const height = this.canvas.height;
    const scale = Math.min(width, height) / 620;
    const offsetX = width / 2 - (ARENA_BALANCE.logicalSize * scale) / 2;
    const offsetY = height / 2 - (ARENA_BALANCE.logicalSize * scale) / 2 + 24;
    const point = (x, y) => ({ x: offsetX + x * scale, y: offsetY + y * scale });

    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.fillStyle = "rgba(8, 12, 24, 0.96)";
    ctx.fillRect(0, 0, width, height);

    const b = this.arenaBounds;
    const arenaTopLeft = point(b.left, b.top);
    ctx.fillStyle = "rgba(21, 29, 49, 0.98)";
    ctx.strokeStyle = "rgba(244, 247, 255, 0.9)";
    ctx.lineWidth = 5;
    ctx.fillRect(arenaTopLeft.x, arenaTopLeft.y, b.size * scale, b.size * scale);
    ctx.strokeRect(arenaTopLeft.x, arenaTopLeft.y, b.size * scale, b.size * scale);

    if (this.elapsedMs >= ARENA_BALANCE.suddenDeathAtMs) {
      ctx.fillStyle = "rgba(255, 90, 90, 0.12)";
      ctx.fillRect(arenaTopLeft.x, arenaTopLeft.y, b.size * scale, b.size * scale);
    }

    for (const projectile of this.projectiles) this.renderProjectile(ctx, projectile, point, scale);
    for (const player of this.players) {
      for (const clone of player.clones) {
        if (clone.hp > 0) this.renderClone(ctx, clone, player.color, point, scale);
      }
    }
    for (const player of this.players) {
      if (player.ownerAlive) this.renderPower(ctx, player, point, scale);
      this.renderPlayer(ctx, player, point, scale);
    }

    this.renderHud(ctx, width, point, scale);
    ctx.restore();
  }

  renderPlayer(ctx, player, point, scale) {
    const p = point(player.x, player.y);
    const radius = player.radius * scale;
    ctx.save();
    ctx.globalAlpha = player.ownerAlive ? 1 : 0.35;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, TAU);
    ctx.fillStyle = player.color;
    ctx.fill();
    ctx.lineWidth = player.powerId === "clone" ? 7 : 4;
    ctx.strokeStyle = player.powerId === "clone" ? "#ffffff" : "rgba(255,255,255,0.75)";
    ctx.stroke();
    if (player.image?.complete && player.image.naturalWidth > 0) {
      ctx.clip();
      ctx.drawImage(player.image, p.x - radius, p.y - radius, radius * 2, radius * 2);
    }
    ctx.restore();
  }

  renderClone(ctx, clone, color, point, scale) {
    const p = point(clone.x, clone.y);
    ctx.beginPath();
    ctx.arc(p.x, p.y, clone.radius * scale, 0, TAU);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.62;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.stroke();
  }

  renderPower(ctx, player, point, scale) {
    if (["sword", "dagger", "spear", "scythe"].includes(player.powerId)) {
      const weapon = this.weaponSegment(player);
      const a = point(weapon.ax, weapon.ay);
      const b = point(weapon.bx, weapon.by);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = "#f4f7ff";
      ctx.lineWidth = player.powerId === "spear" ? 7 : 10;
      ctx.lineCap = "round";
      ctx.stroke();
      return;
    }
    if (player.powerId === "shield") {
      const shield = this.shieldSegment(player);
      const a = point(shield.ax, shield.ay);
      const b = point(shield.bx, shield.by);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = "#9ee7ff";
      ctx.lineWidth = 13;
      ctx.lineCap = "round";
      ctx.stroke();
      return;
    }
    if (["bow", "slingshot", "hook", "boomerang"].includes(player.powerId)) {
      const p = point(player.x + Math.cos(player.powerAngle) * (player.radius + 20), player.y + Math.sin(player.powerAngle) * (player.radius + 20));
      ctx.beginPath();
      ctx.arc(p.x, p.y, 9 * scale, 0, TAU);
      ctx.fillStyle = "#f4f7ff";
      ctx.fill();
    }
  }

  renderProjectile(ctx, projectile, point, scale) {
    const p = point(projectile.x, projectile.y);
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(3, projectile.radius * scale), 0, TAU);
    ctx.fillStyle = projectile.kind === "hook"
      ? "#d5dbe8"
      : projectile.kind === "boomerang"
        ? "#ffda74"
        : projectile.kind === "arrow"
          ? "#f4f7ff"
          : "#c7b3ff";
    ctx.fill();
  }

  renderHud(ctx, width, point, scale) {
    ctx.textAlign = "left";
    ctx.font = "700 30px system-ui, sans-serif";
    this.players.forEach((player, index) => {
      const x = index === 0 ? 54 : width - 474;
      const y = 54;
      ctx.fillStyle = "rgba(10, 14, 26, 0.9)";
      ctx.fillRect(x, y, 420, 112);
      ctx.fillStyle = player.color;
      ctx.fillText(player.participant.displayName, x + 18, y + 36);
      ctx.font = "600 23px system-ui, sans-serif";
      ctx.fillStyle = "#f4f7ff";
      ctx.fillText(`${powerLabel(player.powerId)}  •  ${Math.ceil(player.hp)}/${player.maxHp} HP`, x + 18, y + 69);
      const metric = player.powerId === "shield" ? `bloqueios ${player.blocks}` : player.powerId === "clone" ? `corpos ${1 + player.clones.filter((clone) => clone.hp > 0).length}` : `stacks ${player.hits}`;
      ctx.fillStyle = "#b8c4dc";
      ctx.fillText(metric, x + 18, y + 98);
      ctx.font = "700 30px system-ui, sans-serif";
    });

    ctx.textAlign = "center";
    ctx.font = "800 28px system-ui, sans-serif";
    ctx.fillStyle = "#f4f7ff";
    if (this.state === "countdown") {
      const remaining = Math.max(0, (this.config.countdownMs ?? 2400) - this.countdownElapsedMs);
      ctx.fillText(`ROLETAS: ${powerLabel(this.powers[0])} × ${powerLabel(this.powers[1])}  •  ${Math.max(1, Math.ceil(remaining / 1000))}`, width / 2, 210);
    } else if (this.state === "running") {
      const seconds = (this.elapsedMs / 1000).toFixed(1);
      ctx.fillText(`ARENA X1  •  ${seconds}s`, width / 2, 210);
    } else if (this.state === "finished" && this.result) {
      const winner = this.players.find((player) => player.id === this.result.winnerId);
      ctx.fillText(`${winner?.participant.displayName ?? "Vencedor"} VENCEU`, width / 2, 210);
    }
  }

  stopLoop() {
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    this.animationFrame = 0;
  }

  destroy() {
    this.stopLoop();
    this.resetRuntime();
    this.render();
  }
}
