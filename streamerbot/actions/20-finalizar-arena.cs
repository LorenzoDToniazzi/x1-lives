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
        if (state == null) { CPH.LogInfo("[ARENA] Callback sem duelo ativo"); return false; }

        bool reasonValid = string.Equals(resultReason, "knockout", StringComparison.OrdinalIgnoreCase)
            || string.Equals(resultReason, "tiebreak", StringComparison.OrdinalIgnoreCase);
        bool winnerValid = winnerId == state.Challenger.Id || winnerId == state.Target.Id;
        long expectedSimulation = finishTimeMs * 2;
        long timingTolerance = Math.Max(3000, (long)(expectedSimulation * 0.45));
        bool timingCompatible = Math.Abs(simulationTimeMs - expectedSimulation) <= timingTolerance;
        bool valid = string.Equals(state.Mode, "arena", StringComparison.OrdinalIgnoreCase)
            && state.Status == "ANIMATING"
            && state.DuelId == duelId
            && contractVersion == 4
            && seed == state.Seed
            && winnerValid
            && finishTimeMs >= 0 && finishTimeMs <= 30000
            && simulationTimeMs >= 0 && simulationTimeMs <= 36050
            && timingCompatible
            && reasonValid
            && !state.ResultAnnounced;

        if (!valid)
        {
            CPH.LogError($"[ARENA] Callback inválido ou duplicado: {duelId}");
            return false;
        }

        X1User winner = winnerId == state.Challenger.Id ? state.Challenger : state.Target;
        X1User loser = winnerId == state.Challenger.Id ? state.Target : state.Challenger;
        string winningOutcomeId = winnerId == state.Challenger.Id ? state.ChallengerOutcomeId : state.TargetOutcomeId;
        if (!state.IsTest && (string.IsNullOrWhiteSpace(state.PredictionId) || string.IsNullOrWhiteSpace(winningOutcomeId)))
        {
            CPH.LogError($"[ARENA] Resultado válido, mas dados da Prediction estão incompletos: {duelId}");
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
                CPH.LogError($"[ARENA] Falha resolvendo Prediction {state.PredictionId}: {error.Message}");
                CPH.SendMessage("A Arena terminou, mas a Prediction precisa ser resolvida manualmente pelo streamer.", true, true);
                return false;
            }
            FulfillRedemption(state);
            CPH.SendMessage($"⚔️ @{winner.DisplayName} venceu @{loser.DisplayName} na Arena X1!", true, true);
            CPH.SetGlobalVar(CooldownKey, DateTime.UtcNow.AddSeconds(60).ToString("o"), false);
        }

        CPH.LogInfo($"[ARENA] Finalizada: {duelId} | vencedor {winner.Login} | seed {state.Seed}");
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
    public int ContractVersion { get; set; } public string Mode { get; set; } public string Status { get; set; } public string DuelId { get; set; }
    public X1User Challenger { get; set; } public X1User Target { get; set; }
    public DateTime CreatedAtUtc { get; set; } public DateTime ExpiresAtUtc { get; set; }
    public DateTime? PredictionOpenedAtUtc { get; set; } public DateTime? StartedAtUtc { get; set; } public DateTime? OverlayConfirmedAtUtc { get; set; }
    public string RewardId { get; set; } public string RedemptionId { get; set; }
    public string PredictionId { get; set; } public string ChallengerOutcomeId { get; set; } public string TargetOutcomeId { get; set; }
    public int Seed { get; set; } public bool ResultAnnounced { get; set; } public bool IsTest { get; set; }
}
public class X1User { public string Id { get; set; } public string Login { get; set; } public string DisplayName { get; set; } public string AvatarUrl { get; set; } }
