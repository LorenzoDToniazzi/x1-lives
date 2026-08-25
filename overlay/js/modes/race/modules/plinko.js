import {
  CENTER_X,
  PLAY_LEFT,
  PLAY_RIGHT,
  addAll,
  bodyStyle,
  moduleDecoration,
} from "../module-utils.js";

export const plinkoModule = {
  id: "plinko",
  height: 790,

  build(context) {
    const { Matter, world, top, rng } = context;
    const { Bodies } = Matter;
    const bodies = [];
    const rows = 5;
    const spacingX = 190;
    const spacingY = 140;
    const radius = 13;
    const offsetDirection = rng.bool() ? 1 : -1;
    const gridOffset = rng.range(-34, 34);

    for (let row = 0; row < rows; row += 1) {
      const shifted = (row + (offsetDirection > 0 ? 0 : 1)) % 2 === 1;
      const count = shifted ? 4 : 5;
      const rowWidth = (count - 1) * spacingX;
      const startX = CENTER_X - rowWidth / 2 + gridOffset;
      const y = top + 125 + row * spacingY;

      for (let column = 0; column < count; column += 1) {
        const x = startX + column * spacingX;
        if (x < PLAY_LEFT + 36 || x > PLAY_RIGHT - 36) continue;
        bodies.push(
          Bodies.polygon(x, y, 4, radius + 5, {
            isStatic: true,
            angle: Math.PI / 4 + ((row + column) % 2 === 0 ? 0.13 : -0.13),
            restitution: 0.72,
            friction: 0,
            ...bodyStyle("plinko-pin", "#62d7ff"),
          }),
        );
      }
    }

    addAll(Matter, world, bodies);
    const stalledFor = new Map();
    const lastProgressY = new Map();
    const nudgeCount = new Map();
    return {
      actors: [
        {
          update(_elapsedSeconds, stepMs = 1000 / 60) {
            const balls = Matter.Composite.allBodies(world).filter(
              (body) =>
                body.plugin?.x1?.kind === "ball" &&
                body.position.y >= top &&
                body.position.y <= top + plinkoModule.height,
            );

            balls.forEach((ball) => {
              const participantId = String(ball.plugin.x1.participantId);
              const previousY = lastProgressY.get(participantId) ?? ball.position.y;
              if (ball.position.y >= previousY + 10) {
                lastProgressY.set(participantId, ball.position.y);
                stalledFor.set(participantId, 0);
                return;
              }

              const duration = (stalledFor.get(participantId) ?? 0) + stepMs;
              stalledFor.set(participantId, duration);
              if (duration < 1400) return;

              const count = (nudgeCount.get(participantId) ?? 0) + 1;
              nudgeCount.set(participantId, count);
              const characterSum = [...participantId].reduce(
                (total, character) => total + character.charCodeAt(0),
                0,
              );
              const direction = (characterSum + count + rng.seed) % 2 === 0 ? 1 : -1;
              const lateralSpeed = Math.min(6.2, 3.2 + count * 0.45);
              Matter.Body.setPosition(ball, {
                x: Math.max(
                  PLAY_LEFT + 55,
                  Math.min(PLAY_RIGHT - 55, ball.position.x + direction * Math.min(15, 6 + count * 2)),
                ),
                y: ball.position.y + 3,
              }, true);
              Matter.Body.setVelocity(ball, {
                x: direction * lateralSpeed,
                y: Math.max(5.2, ball.velocity.y),
              });
              lastProgressY.set(participantId, ball.position.y);
              stalledFor.set(participantId, 0);
            });
          },
        },
      ],
      decoration: moduleDecoration(this.id, top, this.height, "#42c8ff"),
    };
  },
};
