import {
  CENTER_X,
  PLAY_LEFT,
  PLAY_RIGHT,
  addAll,
  bodyStyle,
  moduleDecoration,
  segmentBody,
} from "../module-utils.js";

export const miniPinballModule = {
  id: "mini_pinball",
  height: 1260,

  build(context) {
    const { Matter, world, top, rng } = context;
    const { Bodies, Body } = Matter;
    const bodies = [];
    const actors = [];
    const color = "#ff5b8b";

    bodies.push(
      segmentBody(Matter, PLAY_LEFT + 24, top + 110, 355, top + 285, 36, {
        restitution: 0.46,
        friction: 0.02,
        ...bodyStyle("pinball-wall", color),
      }),
      segmentBody(Matter, PLAY_RIGHT - 24, top + 110, 725, top + 285, 36, {
        restitution: 0.46,
        friction: 0.02,
        ...bodyStyle("pinball-wall", color),
      }),
    );

    const variants = [
      [
        [300, 310], [715, 355], [500, 500],
        [760, 650], [350, 690], [555, 815],
      ],
      [
        [760, 310], [350, 360], [590, 500],
        [300, 650], [720, 705], [500, 820],
      ],
      [
        [330, 300], [700, 300], [515, 470],
        [290, 620], [760, 650], [535, 800],
      ],
    ];
    rng.pick(variants).forEach(([x, localY], index) => {
      const radius = index === 2 || index === 5 ? 66 : 58;
      bodies.push(
        Bodies.circle(x, top + localY, radius, {
          isStatic: true,
          restitution: 0.98,
          friction: 0,
          ...bodyStyle("bumper", color, {
            radius,
            impulse: index === 5 ? 6.2 : 5.7,
            flashUntil: 0,
          }),
        }),
      );
    });

    const springSpecs = [
      { x: 300, pushX: 2.5 },
      { x: 780, pushX: -2.5 },
    ];
    springSpecs.forEach((spec) => {
      bodies.push(
        Bodies.rectangle(spec.x, top + 975, 250, 38, {
          isStatic: true,
          angle: spec.pushX > 0 ? 0.18 : -0.18,
          chamfer: { radius: 15 },
          restitution: 0.52,
          friction: 0,
          ...bodyStyle("spring", "#ffe45e", {
            impulseY: -8.5,
            impulseX: spec.pushX * 2,
            flashUntil: 0,
          }),
        }),
      );
    });

    const leftGate = Bodies.rectangle(450, top + 900, 34, 100, {
      isStatic: true,
      chamfer: { radius: 16 },
      restitution: 0.5,
      friction: 0,
      ...bodyStyle("gate", "#ffd75e"),
    });
    const rightGate = Bodies.rectangle(630, top + 900, 34, 100, {
      isStatic: true,
      chamfer: { radius: 16 },
      restitution: 0.5,
      friction: 0,
      ...bodyStyle("gate", "#ffd75e"),
    });
    bodies.push(leftGate, rightGate);

    const phase = rng.range(0, Math.PI * 2);
    const gateSpeed = rng.range(1.05, 1.3);
    actors.push({
      update(elapsedSeconds) {
        const shift = Math.sin(elapsedSeconds * gateSpeed + phase) * 46;
        Body.setPosition(leftGate, { x: 450 + shift, y: top + 900 }, true);
        Body.setPosition(rightGate, { x: 630 - shift, y: top + 900 }, true);
      },
    });

    bodies.push(
      segmentBody(Matter, PLAY_LEFT + 20, top + 1125, 440, top + 1215, 34, {
        restitution: 0.34,
        friction: 0.02,
        ...bodyStyle("pinball-exit", color),
      }),
      segmentBody(Matter, PLAY_RIGHT - 20, top + 1125, 640, top + 1215, 34, {
        restitution: 0.34,
        friction: 0.02,
        ...bodyStyle("pinball-exit", color),
      }),
      Bodies.circle(CENTER_X, top + 1035, 14, {
        isStatic: true,
        isSensor: true,
        ...bodyStyle("pinball-marker", "transparent", { radius: 14 }),
      }),
    );

    addAll(Matter, world, bodies);
    return {
      actors,
      decoration: moduleDecoration(this.id, top, this.height, color),
    };
  },
};
