import {
  CENTER_X,
  addAll,
  bodyStyle,
  moduleDecoration,
} from "../module-utils.js";

export const giantXModule = {
  id: "giant_x",
  height: 860,

  build(context) {
    const { Matter, world, top, rng } = context;
    const { Bodies, Body } = Matter;
    const centerY = top + this.height / 2;
    const armLength = 970;
    const armThickness = 42;
    const armA = Bodies.rectangle(CENTER_X, centerY, armLength, armThickness, {
      chamfer: { radius: 20 },
    });
    const armB = Bodies.rectangle(CENTER_X, centerY, armLength, armThickness, {
      chamfer: { radius: 20 },
    });
    Body.setAngle(armA, Math.PI / 4);
    Body.setAngle(armB, -Math.PI / 4);

    const spinner = Body.create({
      parts: [armA, armB],
      isStatic: true,
      restitution: 0.58,
      friction: 0.04,
      ...bodyStyle("giant-x", "#9c78ff"),
    });

    const phase = rng.range(0, Math.PI * 2);
    const direction = rng.bool() ? 1 : -1;
    const angularSpeed = rng.range(0.28, 0.4) * direction;

    addAll(Matter, world, [spinner]);
    return {
      actors: [
        {
          update(elapsedSeconds) {
            Body.setAngle(spinner, phase + elapsedSeconds * angularSpeed, true);
          },
        },
      ],
      decoration: moduleDecoration(this.id, top, this.height, "#8e68ff"),
    };
  },
};
