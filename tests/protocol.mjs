import assert from "node:assert/strict";
import {
  unwrapCustomEvent,
  validateAck,
  validateCancel,
  validateStart,
} from "../overlay/js/core/protocol.js";

const start = {
  contractVersion: 4,
  event: "X1.Start",
  duelId: "duel-1",
  mode: "race",
  seed: 42,
  challenger: { id: "1", displayName: "Azul" },
  target: { id: "2", displayName: "Rosa" },
};

assert.deepEqual(unwrapCustomEvent({ data: start }), start);
assert.deepEqual(unwrapCustomEvent(start), start);
assert.deepEqual(unwrapCustomEvent({ data: { data: JSON.stringify(start) } }), start);
assert.deepEqual(unwrapCustomEvent({ data: JSON.stringify({ data: JSON.stringify(start) }) }), start);
assert.equal(unwrapCustomEvent({ data: "não é JSON" }), null);

const validated = validateStart(start, 4);
assert.equal(validated.participants.length, 2);
assert.equal(validateStart({ ...start, contractVersion: 3 }, 4), null);
assert.equal(validateStart({ ...start, seed: 0 }, 4), null);
assert.equal(validateStart({ ...start, target: start.challenger }, 4), null);

assert.equal(validateCancel({ contractVersion: 4, event: "X1.Cancel", duelId: "duel-1" }, 4), true);
assert.equal(validateCancel({ contractVersion: 3, event: "X1.Cancel", duelId: "duel-1" }, 4), false);
assert.equal(validateAck({ contractVersion: 4, event: "X1.Ack", duelId: "duel-1" }, 4), true);

console.log("Protocolo X1 validado.");
