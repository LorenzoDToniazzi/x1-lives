import {
  CENTER_X,
  PLAY_LEFT,
  PLAY_RIGHT,
  addAll,
  bodyStyle,
  moduleDecoration,
  segmentBody,
} from "../module-utils.js";

export const convergenceModule = {
  id: "convergence",
  height: 940,

  build(context) {
    const { Matter, world, top } = context;
    const color = "#5de2ff";
    const thickness = 38;
    const corridorHalfWidth = 195 / 2;
    const bodies = [
      segmentBody(Matter, PLAY_LEFT + 24, top + 120, CENTER_X - corridorHalfWidth, top + 430, thickness, {
        restitution: 0.38,
        friction: 0.02,
        ...bodyStyle("convergence", color),
      }),
      segmentBody(Matter, PLAY_RIGHT - 24, top + 120, CENTER_X + corridorHalfWidth, top + 430, thickness, {
        restitution: 0.38,
        friction: 0.02,
        ...bodyStyle("convergence", color),
      }),
      segmentBody(Matter, CENTER_X - corridorHalfWidth, top + 430, CENTER_X - corridorHalfWidth, top + 635, 30, {
        restitution: 0.34,
        friction: 0.015,
        ...bodyStyle("convergence", color),
      }),
      segmentBody(Matter, CENTER_X + corridorHalfWidth, top + 430, CENTER_X + corridorHalfWidth, top + 635, 30, {
        restitution: 0.34,
        friction: 0.015,
        ...bodyStyle("convergence", color),
      }),
      segmentBody(Matter, CENTER_X - corridorHalfWidth, top + 635, PLAY_LEFT + 150, top + 855, thickness, {
        restitution: 0.4,
        friction: 0.02,
        ...bodyStyle("convergence-exit", color),
      }),
      segmentBody(Matter, CENTER_X + corridorHalfWidth, top + 635, PLAY_RIGHT - 150, top + 855, thickness, {
        restitution: 0.4,
        friction: 0.02,
        ...bodyStyle("convergence-exit", color),
      }),
    ];

    addAll(Matter, world, bodies);
    return {
      actors: [],
      decoration: moduleDecoration(this.id, top, this.height, color),
    };
  },
};
