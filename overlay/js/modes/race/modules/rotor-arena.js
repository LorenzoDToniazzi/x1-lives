import {
  CENTER_X,
  PLAY_LEFT,
  PLAY_RIGHT,
  addAll,
  bodyStyle,
  moduleDecoration,
  segmentBody,
} from "../module-utils.js";

export const rotorArenaModule = {
  id: "rotor_arena",
  height: 1080,

  build(context) {
    const { Matter, world, top, rng } = context;
    const { Bodies, Body } = Matter;
    const color = "#ff72c7";
    const centerY = top + 505;
    const armA = Bodies.rectangle(CENTER_X, centerY, 590, 38, {
      chamfer: { radius: 18 },
    });
    const armB = Bodies.rectangle(CENTER_X, centerY, 590, 38, {
      chamfer: { radius: 18 },
    });
    Body.setAngle(armB, Math.PI / 2);
    const rotor = Body.create({
      parts: [armA, armB],
      isStatic: true,
      restitution: 0.7,
      friction: 0.015,
      ...bodyStyle("arena-rotor", color),
    });
    const walls = [
      segmentBody(Matter, PLAY_LEFT + 22, top + 740, CENTER_X - 115, top + 930, 38, {
        restitution: 0.42,
        friction: 0.02,
        ...bodyStyle("arena-exit", color),
      }),
      segmentBody(Matter, PLAY_RIGHT - 22, top + 740, CENTER_X + 115, top + 930, 38, {
        restitution: 0.42,
        friction: 0.02,
        ...bodyStyle("arena-exit", color),
      }),
    ];
    const phase = rng.range(0, Math.PI * 2);
    const direction = rng.bool() ? 1 : -1;
    const speed = rng.range(0.58, 0.78) * direction;

    addAll(Matter, world, [rotor, ...walls]);
    return {
      actors: [
        {
          update(elapsedSeconds) {
            Body.setAngle(rotor, phase + elapsedSeconds * speed, true);
          },
        },
      ],
      decoration: moduleDecoration(this.id, top, this.height, color),
    };
  },
};
