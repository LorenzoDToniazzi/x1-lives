import {
  PLAY_LEFT,
  PLAY_RIGHT,
  addAll,
  bodyStyle,
  moduleDecoration,
  segmentBody,
} from "../module-utils.js";

export const alternatingGatesModule = {
  id: "alternating_gates",
  height: 1060,

  build(context) {
    const { Matter, world, top, rng } = context;
    const { Body } = Matter;
    const color = "#ff9d58";
    const specs = [
      { y: 230, fromLeft: true },
      { y: 505, fromLeft: false },
      { y: 780, fromLeft: true },
    ];
    if (rng.bool()) specs.forEach((spec) => { spec.fromLeft = !spec.fromLeft; });
    const bodies = [];
    const actors = [];

    specs.forEach((spec, index) => {
      const leftX = spec.fromLeft ? PLAY_LEFT + 20 : PLAY_RIGHT - 700;
      const rightX = spec.fromLeft ? PLAY_LEFT + 700 : PLAY_RIGHT - 20;
      const drop = spec.fromLeft ? 82 : -82;
      const gate = segmentBody(
        Matter,
        leftX,
        top + spec.y - drop,
        rightX,
        top + spec.y + drop,
        42,
        {
          restitution: 0.4,
          friction: 0.018,
          ...bodyStyle("alternating-gate", color),
        },
      );
      const baseX = gate.position.x;
      const phase = rng.range(0, Math.PI * 2) + index;
      const speed = rng.range(0.55, 0.78);
      bodies.push(gate);
      actors.push({
        update(elapsedSeconds) {
          const shift = Math.sin(elapsedSeconds * speed + phase) * 38;
          Body.setPosition(gate, { x: baseX + shift, y: gate.position.y }, true);
        },
      });
    });

    addAll(Matter, world, bodies);
    return {
      actors,
      decoration: moduleDecoration(this.id, top, this.height, color),
    };
  },
};
