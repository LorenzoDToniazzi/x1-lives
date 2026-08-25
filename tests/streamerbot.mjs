import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (name) => readFile(new URL(`../streamerbot/actions/${name}`, import.meta.url), "utf8");

const normalize = await read("01-normalizar-alvo.cs");
assert.match(normalize, /TryGetArg\("rawInput"/);
assert.match(normalize, /TwitchRedemptionCancel/);

const challenge = await read("03-criar-desafio.cs");
for (const field of ["RewardId", "RedemptionId", "AvatarUrl", "WAITING_ACCEPT"]) {
  assert.match(challenge, new RegExp(field));
}

const prepare = await read("04-preparar-prediction.cs");
assert.match(prepare, /PREDICTION_CREATING/);
assert.match(prepare, /x1ChallengerTitle/);
assert.match(prepare, /x1TargetTitle/);

const outcomes = await read("14-registrar-outcomes.cs");
assert.match(outcomes, /prediction\.outcome0\.id/);
assert.match(outcomes, /prediction\.outcome1\.id/);
assert.match(outcomes, /PREDICTION_OPEN/);

const start = await read("15-iniciar-corrida.cs");
assert.match(start, /X1\.Start/);
assert.match(start, /avatarUrl/i);

const finish = await read("07-finalizar-partida.cs");
assert.match(finish, /TwitchPredictionResolve/);
assert.match(finish, /ChallengerOutcomeId/);
assert.match(finish, /TargetOutcomeId/);

for (const script of [
  "04-preparar-prediction.cs",
  "06-confirmar-inicio.cs",
  "07-finalizar-partida.cs",
  "13-registrar-prediction.cs",
  "14-registrar-outcomes.cs",
  "15-iniciar-corrida.cs",
]) {
  const source = await read(script);
  for (const field of [
    "ContractVersion",
    "Challenger",
    "Target",
    "RewardId",
    "PredictionId",
    "Seed",
    "IsTest",
  ]) {
    assert.match(source, new RegExp(field), `${script} deve preservar ${field}`);
  }
}

console.log("Scripts do Streamer.bot validados estaticamente.");
