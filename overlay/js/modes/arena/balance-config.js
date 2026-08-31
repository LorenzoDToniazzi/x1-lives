export const ARENA_BALANCE = Object.freeze({
  logicalSize: 500,
  playerHp: 70,
  playerRadius: 34,
  baseSpeed: 235,
  fixedStepMs: 1000 / 60,
  suddenDeathAtMs: 16000,
  shrinkDurationMs: 12000,
  minimumArenaScale: 0.35,
  hardLimitMs: 36000,
  defaultSimulationSpeed: 2,
  cloneIntervalMs: 1200,
  maxClonesPerPlayer: 32,
  maxProjectiles: 80,
  powers: Object.freeze({
    sword: Object.freeze({ label: "Espada", kind: "melee", damage: 5, range: 72, damagePerHit: 0.28, angularSpeed: 5.2, hitCooldownMs: 360 }),
    dagger: Object.freeze({ label: "Adaga", kind: "melee", damage: 3.5, range: 58, angularSpeed: 8.5, angularGrowth: 1.065, maxAngularSpeed: 17.5, hitCooldownMs: 240 }),
    spear: Object.freeze({ label: "Lança", kind: "melee", damage: 6, range: 106, damagePerHit: 0.27, rangePerHit: 3.5, maxRange: 205, angularSpeed: 4.4, hitCooldownMs: 430 }),
    bow: Object.freeze({ label: "Arco", kind: "ranged", damage: 6.4, cooldownMs: 720, cooldownGrowth: 0.965, projectileSpeed: 365, projectileRadius: 7, arrowsPerFourHits: 1, maxArrows: 5 }),
    slingshot: Object.freeze({ label: "Estilingue", kind: "ranged", damage: 1.45, cooldownMs: 850, projectileSpeed: 315, projectileRadius: 6, maxStones: 16 }),
    clone: Object.freeze({ label: "Clone", kind: "clone", cloneHp: 12, contactDamage: 1, cloneRadius: 18, contactCooldownMs: 330 }),
    shield: Object.freeze({ label: "Escudo", kind: "shield", length: 140, lengthPerBlock: 9, maxLength: 360, meleeReflection: 0.5, angularSpeed: 3.8 }),
    hook: Object.freeze({ label: "Gancho", kind: "hook", damage: 10, range: 250, damagePerHit: 0.34, rangePerHit: 8, cooldownMs: 920, cooldownGrowth: 0.98, projectileSpeed: 470 }),
    boomerang: Object.freeze({ label: "Bumerangue", kind: "boomerang", damage: 10.5, radius: 19, cooldownMs: 980, speed: 285, distance: 205, damagePerHit: 0.22, radiusPerHit: 0.28, speedPerHit: 2.4, distancePerHit: 2.8 }),
    scythe: Object.freeze({ label: "Foice", kind: "melee", damage: 4.4, range: 82, damagePerHit: 0.1, healPercent: 0.16, healPercentPerHit: 0.014, maxHealPercent: 0.58, angularSpeed: 5.0, hitCooldownMs: 370 }),
  }),
});

export const ARENA_POWER_IDS = Object.freeze(Object.keys(ARENA_BALANCE.powers));
