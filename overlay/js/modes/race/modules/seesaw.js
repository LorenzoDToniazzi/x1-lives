import {
  CENTER_X,
  PLAY_LEFT,
  PLAY_RIGHT,
  addAll,
  bodyStyle,
  moduleDecoration,
  segmentBody,
} from "../module-utils.js";

export const seesawModule = {
  id: "seesaw",
  height: 920,

  build(context) {
    const { Matter, world, top, rng } = context;
    const { Bodies, Body, Constraint } = Matter;
    const color = "#ffd45c";
    const platformY = top + 455;
    const platform = Bodies.rectangle(CENTER_X, platformY, 650, 40, {
      chamfer: { radius: 18 },
      restitution: 0.48,
      friction: 0.025,
      density: 0.006,
      ...bodyStyle("seesaw", color),
    });
    Body.setAngle(platform, rng.range(-0.08, 0.08));
    const pivot = Constraint.create({
      pointA: { x: CENTER_X, y: platformY },
      bodyB: platform,
      pointB: { x: 0, y: 0 },
      length: 0,
      stiffness: 1,
      damping: 0.16,
    });
    const pivotMarker = Bodies.circle(CENTER_X, platformY, 31, {
      isStatic: true,
      isSensor: true,
      ...bodyStyle("seesaw-pivot", "#fff3b0", { radius: 31 }),
    });
    const rails = [
      segmentBody(Matter, PLAY_LEFT + 80, top + 705, 420, top + 835, 34, {
        restitution: 0.38,
        friction: 0.02,
        ...bodyStyle("seesaw-exit", color),
      }),
      segmentBody(Matter, PLAY_RIGHT - 80, top + 705, 660, top + 835, 34, {
        restitution: 0.38,
        friction: 0.02,
        ...bodyStyle("seesaw-exit", color),
      }),
    ];

    addAll(Matter, world, [platform, pivot, pivotMarker, ...rails]);
    return {
      actors: [
        {
          update() {
            const limit = 0.54;
            if (platform.angle > limit) {
              Body.setAngle(platform, limit);
              Body.setAngularVelocity(platform, Math.min(0, platform.angularVelocity) * 0.35);
            } else if (platform.angle < -limit) {
              Body.setAngle(platform, -limit);
              Body.setAngularVelocity(platform, Math.max(0, platform.angularVelocity) * 0.35);
            } else {
              Body.setAngularVelocity(platform, platform.angularVelocity * 0.992);
            }
          },
        },
      ],
      decoration: moduleDecoration(this.id, top, this.height, color),
    };
  },
};
