using System;
using Newtonsoft.Json;

public class CPHInline
{
    private const string StateKey = "x1.activeState";
    private const string CooldownKey = "x1.cooldownUntilUtc";

    public bool Execute()
    {
        CPH.TryGetArg("duelId", out string duelId);
        CPH.TryGetArg("winnerId", out string winnerId);
        CPH.TryGetArg("seed", out long seed);
        CPH.TryGetArg("finishTimeMs", out long finishTimeMs);
        CPH.TryGetArg("simulationTimeMs", out long simulationTimeMs);
        CPH.TryGetArg("resultReason", out string resultReason);
        CPH.TryGetArg("contractVersion", out int contractVersion);

        X1State state = Load();
        if (state == null) { CPH.LogInfo("[X1] Callback sem duelo ativo"); return false; }

        bool reasonValid = string.Equals(resultReason, "finish_line", StringComparison.OrdinalIgnoreCase)
            || string.Equals(resultReason, "time_limit_progress", StringComparison.OrdinalIgnoreCase)
            || string.Equals(resultReason, "time_limit_tiebreak", StringComparison.OrdinalIgnoreCase);
        bool winnerValid = winnerId == state.Challenger.Id || winnerId == state.Target.Id;
        long expectedSimulation = finishTimeMs * 2;
        long timingTolerance = Math.Max(2500, (long)(expectedSimulation * 0.35));
        bool timingCompatible = Math.Abs(simulationTimeMs - expectedSimulation) <= timingTolerance;
        bool valid = state.Status == "ANIMATING"
            && state.DuelId == duelId
            && contractVersion == 4
            && seed == state.Seed
            && winnerValid
            && finishTimeMs >= 0 && finishTimeMs <= 48000
            && simulationTimeMs >= 0 && simulationTimeMs <= 96000
            && timingCompatible
            && reasonValid
            && !state.ResultAnnounced;

        if (!valid)
        {
            CPH.LogError($"[X1] Callback inválido ou duplicado: {duelId}");
            return false;
        }

        X1User winner = winnerId == state.Challenger.Id ? state.Challenger : state.Target;
        X1User loser = winnerId == state.Challenger.Id ? state.Target : state.Challenger;
        string winningOutcomeId = winnerId == state.Challenger.Id ? state.ChallengerOutcomeId : state.TargetOutcomeId;
        if (!state.IsTest && (string.IsNullOrWhiteSpace(state.PredictionId) || string.IsNullOrWhiteSpace(winningOutcomeId)))
        {
            CPH.LogError($"[X1] Resultado válido, mas dados da Prediction estão incompletos: {duelId}");
            return false;
        }

        state.Status = "FINALIZING";
        state.ResultAnnounced = true;
        CPH.SetGlobalVar(StateKey, JsonConvert.SerializeObject(state), false);

        if (!state.IsTest)
        {
            try
            {
                CPH.TwitchPredictionResolve(state.PredictionId, winningOutcomeId);
            }
            catch (Exception error)
            {
                CPH.LogError($"[X1] Falha resolvendo Prediction {state.PredictionId}: {error.Message}");
                CPH.SendMessage("A corrida terminou, mas a Prediction precisa ser resolvida manualmente pelo streamer.", true, true);
                return false;
            }
            FulfillRedemption(state);
            CPH.SendMessage($"@{winner.DisplayName} venceu @{loser.DisplayName} no X1!", true, true);
            CPH.SetGlobalVar(CooldownKey, DateTime.UtcNow.AddSeconds(60).ToString("o"), false);
        }
        CPH.LogInfo($"[X1] Finalizado: {duelId} | vencedor {winner.Login} | seed {state.Seed}");
        CPH.UnsetGlobalVar(StateKey, false);
        return true;
    }

    private void FulfillRedemption(X1State state)
    {
        if (!string.IsNullOrWhiteSpace(state.RewardId) && !string.IsNullOrWhiteSpace(state.RedemptionId))
            CPH.TwitchRedemptionFulfill(state.RewardId, state.RedemptionId);
    }

    private X1State Load() { string json = CPH.GetGlobalVar<string>(StateKey, false); return string.IsNullOrWhiteSpace(json) ? null : JsonConvert.DeserializeObject<X1State>(json); }
}
public class X1State
{
    public string Status { get; set; } public string DuelId { get; set; } public X1User Challenger { get; set; } public X1User Target { get; set; }
    public int Seed { get; set; } public bool ResultAnnounced { get; set; } public bool IsTest { get; set; }
    public string RewardId { get; set; } public string RedemptionId { get; set; }
    public string PredictionId { get; set; } public string ChallengerOutcomeId { get; set; } public string TargetOutcomeId { get; set; }
}
public class X1User { public string Id { get; set; } public string Login { get; set; } public string DisplayName { get; set; } }
