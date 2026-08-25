import {
  CENTER_X,
  PLAY_WIDTH,
  addAll,
  bodyStyle,
  moduleDecoration,
} from "../module-utils.js";

export const fanDropModule = {
  id: "fan_drop",
  height: 1220,

  build(context) {
    const { Matter, world, top, rng } = context;
    const { Bodies, Body, Composite } = Matter;
    const color = "#77e8ff";
    const fanWidth = Math.round(PLAY_WIDTH / 4);
    const fanY = top + 1060;
    const windTop = top + 95;
    const windBottom = fanY + 10;
    const windHeight = windBottom - windTop;
    const windY = (windTop + windBottom) / 2;
    const fan = Bodies.rectangle(CENTER_X, fanY, fanWidth, 82, {
      isStatic: true,
      isSensor: true,
      ...bodyStyle("fan", color, { width: fanWidth, height: 82 }),
    });
    const windZone = Bodies.rectangle(CENTER_X, windY, fanWidth, windHeight, {
      isStatic: true,
      isSensor: true,
      ...bodyStyle("wind-zone", color, { width: fanWidth, height: windHeight }),
    });
    const phase = rng.range(0, Math.PI * 2);
    const speed = rng.range(0.98, 1.18);
    const amplitude = (PLAY_WIDTH - fanWidth) / 2 - 42;

    addAll(Matter, world, [windZone, fan]);
    return {
      actors: [
        {
          update(elapsedSeconds) {
            const angle = elapsedSeconds * speed + phase;
            const x = CENTER_X + Math.sin(angle) * amplitude;
            const horizontalVelocity = Math.cos(angle) * amplitude * speed;
            Body.setPosition(fan, { x, y: fanY }, true);
            Body.setPosition(windZone, { x, y: windY }, true);

            const balls = Composite.allBodies(world).filter(
              (body) => body.plugin?.x1?.kind === "ball",
            );
            balls.forEach((ball) => {
              const insideX = Math.abs(ball.position.x - x) <= fanWidth / 2;
              const insideY = ball.position.y >= top + 90 && ball.position.y <= fanY + 10;
              if (!insideX || !insideY) return;
              Body.setVelocity(ball, {
                x: ball.velocity.x + horizontalVelocity * 0.0007,
                y: Math.max(-10.5, ball.velocity.y - 0.39),
              });
              windZone.plugin.x1.activeUntil = performance.now() + 90;
            });
          },
        },
      ],
      decoration: moduleDecoration(this.id, top, this.height, color),
    };
  },
};
