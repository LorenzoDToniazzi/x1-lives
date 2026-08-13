import {
  addAll,
  bodyStyle,
  moduleDecoration,
} from "../module-utils.js";

export const paddlesModule = {
  id: "paddles",
  height: 790,

  build(context) {
    const { Matter, world, top, rng } = context;
    const { Bodies, Body } = Matter;
    const specs = [
      { x: 320, y: top + 150, base: 0.22 },
      { x: 760, y: top + 310, base: -0.22 },
      { x: 320, y: top + 475, base: -0.12 },
      { x: 760, y: top + 635, base: 0.12 },
    ];
    const actors = [];
    const bodies = [];

    specs.forEach((spec, index) => {
      const paddle = Bodies.rectangle(spec.x, spec.y, 330, 38, {
        isStatic: true,
        chamfer: { radius: 18 },
        restitution: 0.58,
        friction: 0.03,
        ...bodyStyle("paddle", "#62f0bd"),
      });
      const phase = rng.range(0, Math.PI * 2) + index * 0.7;
      const speed = rng.range(1.05, 1.35);
      const amplitude = rng.range(0.54, 0.72);
      bodies.push(paddle);
      actors.push({
        update(elapsedSeconds) {
          Body.setAngle(
            paddle,
            spec.base + Math.sin(elapsedSeconds * speed + phase) * amplitude,
            true,
          );
        },
      });
    });

    addAll(Matter, world, bodies);
    return {
      actors,
      decoration: moduleDecoration(this.id, top, this.height, "#4ce1aa"),
    };
  },
};
