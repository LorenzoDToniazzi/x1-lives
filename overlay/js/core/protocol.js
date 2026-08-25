export const X1_EVENTS = Object.freeze({
  start: "X1.Start",
  ack: "X1.Ack",
  cancel: "X1.Cancel",
});

export function unwrapCustomEvent(message) {
  if (!message || typeof message !== "object") return null;
  if (typeof message.event === "string" && message.event.startsWith("X1.")) return message;
  let value = message.data;
  for (let depth = 0; depth < 4; depth += 1) {
    if (typeof value === "string") {
      try {
        value = JSON.parse(value);
      } catch {
        return null;
      }
      continue;
    }
    if (value && typeof value === "object" && !value.event && "data" in value) {
      value = value.data;
      continue;
    }
    break;
  }
  return value && typeof value === "object" ? value : null;
}

export function validateStart(payload, contractVersion) {
  if (!payload || payload.event !== X1_EVENTS.start) return null;
  if (payload.contractVersion !== contractVersion || payload.mode !== "race") return null;
  if (typeof payload.duelId !== "string" || !payload.duelId) return null;
  if (!Number.isInteger(payload.seed) || payload.seed < 1 || payload.seed > 2147483646) return null;

  const participants = [payload.challenger, payload.target];
  if (participants.some((participant) =>
    !participant || typeof participant.id !== "string" || !participant.id
    || typeof participant.displayName !== "string" || !participant.displayName
  )) return null;
  if (participants[0].id === participants[1].id) return null;
  return { ...payload, participants };
}

export function validateCancel(payload, contractVersion) {
  return Boolean(
    payload
    && payload.event === X1_EVENTS.cancel
    && payload.contractVersion === contractVersion
    && typeof payload.duelId === "string"
    && payload.duelId,
  );
}

export function validateAck(payload, contractVersion) {
  return Boolean(
    payload
    && payload.event === X1_EVENTS.ack
    && payload.contractVersion === contractVersion
    && typeof payload.duelId === "string"
    && payload.duelId,
  );
}
