import {
  CENTER_X,
  PLAY_LEFT,
  PLAY_RIGHT,
  addAll,
  bodyStyle,
  moduleDecoration,
  segmentBody,
} from "../module-utils.js";

export const meetingChamberModule = {
  id: "meeting_chamber",
  height: 1040,

  build(context) {
    const { Matter, world, top, rng } = context;
    const { Bodies, Body, Composite } = Matter;
    const color = "#54f0c0";
    const gateY = top + 735;
    const gateLeafWidth = 170;
    const leftClosedX = CENTER_X - gateLeafWidth / 2;
    const rightClosedX = CENTER_X + gateLeafWidth / 2;
    const leftGate = Bodies.rectangle(leftClosedX, gateY, gateLeafWidth, 38, {
      isStatic: true,
      chamfer: { radius: 15 },
      restitution: 0.32,
      friction: 0.035,
      ...bodyStyle("meeting-gate", "#ffe36b"),
    });
    const rightGate = Bodies.rectangle(rightClosedX, gateY, gateLeafWidth, 38, {
      isStatic: true,
      chamfer: { radius: 15 },
      restitution: 0.32,
      friction: 0.035,
      ...bodyStyle("meeting-gate", "#ffe36b"),
    });
    const bodies = [
      segmentBody(Matter, PLAY_LEFT + 24, top + 120, 300, top + 420, 38, {
        restitution: 0.36,
        friction: 0.02,
        ...bodyStyle("meeting-entry", color),
      }),
      segmentBody(Matter, PLAY_RIGHT - 24, top + 120, 780, top + 420, 38, {
        restitution: 0.36,
        friction: 0.02,
        ...bodyStyle("meeting-entry", color),
      }),
      segmentBody(Matter, 300, top + 420, CENTER_X - 170, gateY - 22, 38, {
        restitution: 0.32,
        friction: 0.025,
        ...bodyStyle("meeting-bowl", color),
      }),
      segmentBody(Matter, 780, top + 420, CENTER_X + 170, gateY - 22, 38, {
        restitution: 0.32,
        friction: 0.025,
        ...bodyStyle("meeting-bowl", color),
      }),
      segmentBody(Matter, PLAY_LEFT + 100, top + 845, 440, top + 965, 34, {
        restitution: 0.38,
        friction: 0.02,
        ...bodyStyle("meeting-exit", color),
      }),
      segmentBody(Matter, PLAY_RIGHT - 100, top + 845, 640, top + 965, 34, {
        restitution: 0.38,
        friction: 0.02,
        ...bodyStyle("meeting-exit", color),
      }),
      leftGate,
      rightGate,
    ];

    const maximumHoldSeconds = rng.range(1.8, 2.25);
    const togetherHoldSeconds = rng.range(0.55, 0.8);
    const openingDurationSeconds = 0.55;
    let firstEntryAt = null;
    let bothPresentAt = null;
    let openingAt = null;

    addAll(Matter, world, bodies);
    return {
      actors: [
        {
          update(elapsedSeconds) {
            const balls = Composite.allBodies(world).filter(
              (body) =>
                body.plugin?.x1?.kind === "ball" &&
                body.position.y >= top + 410 &&
                body.position.y <= gateY + 70,
            );
            if (balls.length > 0 && firstEntryAt === null) firstEntryAt = elapsedSeconds;
            if (balls.length >= 2 && bothPresentAt === null) bothPresentAt = elapsedSeconds;

            if (openingAt === null && firstEntryAt !== null) {
              const heldMaximum = elapsedSeconds - firstEntryAt >= maximumHoldSeconds;
              const heldTogether =
                bothPresentAt !== null && elapsedSeconds - bothPresentAt >= togetherHoldSeconds;
              if (heldMaximum || heldTogether) openingAt = elapsedSeconds;
            }

            if (openingAt === null) return;
            const progress = Math.min(1, (elapsedSeconds - openingAt) / openingDurationSeconds);
            const eased = 1 - (1 - progress) ** 3;
            Body.setPosition(leftGate, {
              x: leftClosedX - eased * 270,
              y: gateY,
            }, true);
            Body.setPosition(rightGate, {
              x: rightClosedX + eased * 270,
              y: gateY,
            }, true);
          },
        },
      ],
      decoration: moduleDecoration(this.id, top, this.height, color),
    };
  },
};
