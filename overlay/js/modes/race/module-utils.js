export const PLAY_LEFT = 74;
export const PLAY_RIGHT = 1006;
export const PLAY_WIDTH = PLAY_RIGHT - PLAY_LEFT;
export const CENTER_X = 540;

export function bodyStyle(kind, color, extra = {}) {
  return {
    plugin: {
      x1: {
        kind,
        color,
        ...extra,
      },
    },
  };
}

export function segmentBody(Matter, x1, y1, x2, y2, thickness, options = {}) {
  const { Bodies } = Matter;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  return Bodies.rectangle((x1 + x2) / 2, (y1 + y2) / 2, length, thickness, {
    isStatic: true,
    angle: Math.atan2(dy, dx),
    chamfer: { radius: Math.min(thickness / 2, 18) },
    ...options,
  });
}

export function addAll(Matter, world, bodies) {
  Matter.Composite.add(world, bodies);
  return bodies;
}

export function moduleDecoration(id, top, height, accent) {
  return { id, top, height, accent };
}
