import {
  PLAY_LEFT,
  PLAY_RIGHT,
  addAll,
  bodyStyle,
  moduleDecoration,
  segmentBody,
} from "../module-utils.js";

export const funnelModule = {
  id: "funnel",
  height: 700,

  build(context) {
    const { Matter, world, top } = context;
    const thickness = 38;
    const left = segmentBody(
      Matter,
      PLAY_LEFT + 22,
      top + 130,
      482,
      top + 570,
      thickness,
      {
        restitution: 0.3,
        friction: 0.025,
        ...bodyStyle("funnel", "#ffba5c"),
      },
    );
    const right = segmentBody(
      Matter,
      PLAY_RIGHT - 22,
      top + 130,
      598,
      top + 570,
      thickness,
      {
        restitution: 0.3,
        friction: 0.025,
        ...bodyStyle("funnel", "#ffba5c"),
      },
    );

    addAll(Matter, world, [left, right]);
    return {
      actors: [],
      decoration: moduleDecoration(this.id, top, this.height, "#ffad42"),
    };
  },
};
