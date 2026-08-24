using System;
using Newtonsoft.Json;

public class CPHInline
{
    private const string StateKey = "x1.activeState";

    public bool Execute()
    {
        CPH.TryGetArg("active", out bool active);
        CPH.TryGetArg("prediction.Id", out string predictionId);
        CPH.TryGetArg("prediction.outcome0.id", out string challengerOutcomeId);
        CPH.TryGetArg("prediction.outcome1.id", out string targetOutcomeId);
        CPH.TryGetArg("x1DuelId", out string duelId);
        X1State state = Load();

        bool valid = state != null
            && state.Status == "PREDICTION_CREATING"
            && state.DuelId == duelId
            && active
            && state.PredictionId == predictionId
            && !string.IsNullOrWhiteSpace(challengerOutcomeId)
            && !string.IsNullOrWhiteSpace(targetOutcomeId);

        if (!valid)
        {
            if (!string.IsNullOrWhiteSpace(state?.PredictionId))
                TryCancelPrediction(state.PredictionId);
            if (state != null) RefundRedemption(state);
            CPH.UnsetGlobalVar(StateKey, false);
            CPH.SendMessage("Não foi possível preparar as opções da Prediction. O desafio foi cancelado.", true, true);
            CPH.LogError($"[X1] Falha ao registrar outcomes: {duelId}");
            return false;
        }

        state.ChallengerOutcomeId = challengerOutcomeId;
        state.TargetOutcomeId = targetOutcomeId;
        state.Status = "PREDICTION_OPEN";
        state.PredictionOpenedAtUtc = DateTime.UtcNow;
        Save(state);
        CPH.SetArgument("x1DuelId", state.DuelId);
        CPH.SendMessage($"🎯 Prediction aberta: {state.Challenger.DisplayName} vs {state.Target.DisplayName}! Apostem seus Channel Points.", true, true);
        CPH.LogInfo($"[X1] Prediction aberta: {state.PredictionId} | duelo {state.DuelId}");
        return true;
    }

    private void TryCancelPrediction(string predictionId)
    {
        try { CPH.TwitchPredictionCancel(predictionId); }
        catch (Exception error) { CPH.LogError($"[X1] Erro cancelando Prediction incompleta: {error.Message}"); }
    }

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
    public string Status { get; set; }
    public string DuelId { get; set; }
    public X1User Challenger { get; set; }
    public X1User Target { get; set; }
    public string RewardId { get; set; }
    public string RedemptionId { get; set; }
    public string PredictionId { get; set; }
    public string ChallengerOutcomeId { get; set; }
    public string TargetOutcomeId { get; set; }
    public DateTime? PredictionOpenedAtUtc { get; set; }
}
public class X1User { public string DisplayName { get; set; } }
