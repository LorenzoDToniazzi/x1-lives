using System;
using Newtonsoft.Json;

public class CPHInline
{
    private const string StateKey = "x1.activeState";

    public bool Execute()
    {
        CPH.TryGetArg("success", out bool success);
        CPH.TryGetArg("prediction.Id", out string predictionId);
        CPH.TryGetArg("x1DuelId", out string duelId);
        X1State state = Load();

        if (state == null || state.Status != "PREDICTION_CREATING" || state.DuelId != duelId)
        {
            if (!string.IsNullOrWhiteSpace(predictionId))
            {
                try { CPH.TwitchPredictionCancel(predictionId); }
                catch (Exception error) { CPH.LogError($"[X1] Falha cancelando Prediction órfã: {error.Message}"); }
            }
            CPH.LogError("[X1] Estado inválido depois de criar a Prediction");
            return false;
        }

        if (!success || string.IsNullOrWhiteSpace(predictionId))
        {
            RefundRedemption(state);
            CPH.UnsetGlobalVar(StateKey, false);
            CPH.SendMessage("Não foi possível abrir a Prediction e o desafio foi cancelado.", true, true);
            CPH.LogError($"[X1] Falha ao criar Prediction: {state.DuelId}");
            return false;
        }

        state.Mode = NormalizeMode(state.Mode);
        state.PredictionId = predictionId;
        Save(state);
        return true;
    }

    private static string NormalizeMode(string mode) { return string.Equals(mode, "arena", StringComparison.OrdinalIgnoreCase) ? "arena" : "race"; }
    private void RefundRedemption(X1State state)
    {
        if (!string.IsNullOrWhiteSpace(state.RewardId) && !string.IsNullOrWhiteSpace(state.RedemptionId))
            CPH.TwitchRedemptionCancel(state.RewardId, state.RedemptionId);
    }

    private X1State Load() { string json = CPH.GetGlobalVar<string>(StateKey, false); return string.IsNullOrWhiteSpace(json) ? null : JsonConvert.DeserializeObject<X1State>(json); }
    private void Save(X1State state) { CPH.SetGlobalVar(StateKey, JsonConvert.SerializeObject(state), false); }
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
