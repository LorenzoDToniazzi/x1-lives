import {
  INTERACTION_MODULE_IDS,
  MODULES_PER_RACE,
  PILOT_MODULE_IDS,
  RACE_MODULES,
  registerRaceModule,
} from "./modules/index.js";
import {
  CENTER_X,
  PLAY_LEFT,
  PLAY_RIGHT,
  bodyStyle,
} from "./module-utils.js";

const START_HEIGHT = 430;
const MODULE_GAP = 150;
const FINISH_HEIGHT = 470;

function createModuleSafetyActor({ Matter, world, top, height, seed }) {
  const records = new Map();
  return {
    update(_elapsedSeconds, stepMs = 1000 / 60) {
      const balls = Matter.Composite.allBodies(world).filter(
        (body) =>
          body.plugin?.x1?.kind === "ball" &&
          body.position.y >= top - 70 &&
          body.position.y <= top + height + 70,
      );
      balls.forEach((ball) => {
        const id = String(ball.plugin.x1.participantId);
        const record = records.get(id) ?? {
          bestY: ball.position.y,
          stalledMs: 0,
          nudges: 0,
        };
        if (ball.position.y >= record.bestY + 22) {
          record.bestY = ball.position.y;
          record.stalledMs = 0;
          records.set(id, record);
          return;
        }

        record.stalledMs += stepMs;
        if (record.stalledMs >= 3600) {
          record.nudges += 1;
          const characterSum = [...id].reduce(
            (total, character) => total + character.charCodeAt(0),
            0,
          );
          const direction = (characterSum + seed + record.nudges) % 2 === 0 ? 1 : -1;
          Matter.Body.setPosition(ball, {
            x: Math.max(PLAY_LEFT + 55, Math.min(PLAY_RIGHT - 55, ball.position.x + direction * 7)),
            y: ball.position.y + 3,
          }, true);
          Matter.Body.setVelocity(ball, {
            x: direction * 3.4,
            y: 6.8,
          });
          record.bestY = ball.position.y;
          record.stalledMs = 0;
        }
        records.set(id, record);
      });
    },
  };
}

export class TrackBuilder {
  constructor(Matter) {
    this.Matter = Matter;
    this.registry = new Map();
    Object.values(RACE_MODULES).forEach((module) => {
      registerRaceModule(this.registry, module);
    });
  }

  register(moduleDescriptor) {
    registerRaceModule(this.registry, moduleDescriptor);
    return this;
  }

  build({ engine, rng }) {
    const { Bodies, Composite } = this.Matter;
    const world = engine.world;
    const requiredInteraction = rng.shuffle(INTERACTION_MODULE_IDS).slice(0, 2);
    const remainingPool = PILOT_MODULE_IDS.filter(
      (moduleId) => !requiredInteraction.includes(moduleId),
    );
    const remaining = rng
      .shuffle(remainingPool)
      .slice(0, MODULES_PER_RACE - requiredInteraction.length);
    const order = rng.shuffle([...requiredInteraction, ...remaining]);
    const actors = [];
    const sections = [];
    let cursorY = START_HEIGHT;

    order.forEach((moduleId, index) => {
      const module = this.registry.get(moduleId);
      if (!module) throw new Error(`Módulo não registrado: ${moduleId}`);
      const moduleRng = rng.fork(`${moduleId}:${index}`);
      const result = module.build({
        Matter: this.Matter,
        world,
        top: cursorY,
        rng: moduleRng,
      });
      actors.push(...(result.actors ?? []));
      actors.push(createModuleSafetyActor({
        Matter: this.Matter,
        world,
        top: cursorY,
        height: module.height,
        seed: moduleRng.seed,
      }));
      sections.push(result.decoration ?? {
        id: module.id,
        top: cursorY,
        height: module.height,
        accent: "#ffffff",
      });
      cursorY += module.height + MODULE_GAP;
    });

    const finishTop = cursorY;
    const finishY = finishTop + 290;
    const finishLeft = Bodies.rectangle(275, finishTop + 175, 430, 34, {
      isStatic: true,
      angle: 0.28,
      chamfer: { radius: 16 },
      ...bodyStyle("finish-funnel", "#f4f7ff"),
    });
    const finishRight = Bodies.rectangle(805, finishTop + 175, 430, 34, {
      isStatic: true,
      angle: -0.28,
      chamfer: { radius: 16 },
      ...bodyStyle("finish-funnel", "#f4f7ff"),
    });
    const finishSensor = Bodies.rectangle(CENTER_X, finishY, 180, 26, {
      isStatic: true,
      isSensor: true,
      ...bodyStyle("finish-sensor", "#ffffff"),
    });
    const worldHeight = finishTop + FINISH_HEIGHT;
    const wallThickness = 70;
    const leftWall = Bodies.rectangle(
      PLAY_LEFT - wallThickness / 2,
      worldHeight / 2,
      wallThickness,
      worldHeight + 200,
      {
        isStatic: true,
        restitution: 0.44,
        friction: 0.02,
        ...bodyStyle("boundary", "#24304d"),
      },
    );
    const rightWall = Bodies.rectangle(
      PLAY_RIGHT + wallThickness / 2,
      worldHeight / 2,
      wallThickness,
      worldHeight + 200,
      {
        isStatic: true,
        restitution: 0.44,
        friction: 0.02,
        ...bodyStyle("boundary", "#24304d"),
      },
    );

    Composite.add(world, [finishLeft, finishRight, finishSensor, leftWall, rightWall]);
    sections.push({
      id: "finish",
      top: finishTop,
      height: FINISH_HEIGHT,
      accent: "#f4f7ff",
    });

    return {
      actors,
      sections,
      order,
      finishSensor,
      finishY,
      worldHeight,
    };
  }
}
