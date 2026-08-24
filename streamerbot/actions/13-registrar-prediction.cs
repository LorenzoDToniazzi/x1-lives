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

        state.PredictionId = predictionId;
        Save(state);
        return true;
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
    public string RewardId { get; set; }
    public string RedemptionId { get; set; }
    public string PredictionId { get; set; }
}
