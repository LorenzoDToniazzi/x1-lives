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
            CPH.LogError(
                $"[X1] Falha ao registrar outcomes: duelo={duelId ?? "vazio"} " +
                $"estado={(state == null ? "nulo" : state.Status)} active={active} " +
                $"predictionRecebida={predictionId ?? "vazia"} " +
                $"predictionEsperada={state?.PredictionId ?? "vazia"} " +
                $"outcome0={!string.IsNullOrWhiteSpace(challengerOutcomeId)} " +
                $"outcome1={!string.IsNullOrWhiteSpace(targetOutcomeId)}");

            if (state == null)
            {
                if (!string.IsNullOrWhiteSpace(predictionId)) TryCancelPrediction(predictionId);
                return false;
            }

            string idToCancel = !string.IsNullOrWhiteSpace(state.PredictionId)
                ? state.PredictionId
                : predictionId;
            bool cancelled = TryCancelPrediction(idToCancel);

            // Se a Twitch recusar o cancelamento, preservamos o estado. Assim um
            // novo resgate fica bloqueado e não tenta criar uma segunda Prediction.
            if (!cancelled)
            {
                state.Status = "PREDICTION_CANCEL_FAILED";
                Save(state);
                CPH.SendMessage(
                    "A Twitch manteve a Prediction aberta. O X1 foi bloqueado para impedir outra Prediction; cancele a atual e use !x1cancel.",
                    true,
                    true);
                return false;
            }

            RefundRedemption(state);
            CPH.UnsetGlobalVar(StateKey, false);
            CPH.SendMessage("Não foi possível preparar as opções da Prediction. Ela foi cancelada e o desafio foi devolvido.", true, true);
            return false;
        }

        state.Mode = NormalizeMode(state.Mode);
        state.ChallengerOutcomeId = challengerOutcomeId;
        state.TargetOutcomeId = targetOutcomeId;
        state.Status = "PREDICTION_OPEN";
        state.PredictionOpenedAtUtc = DateTime.UtcNow;
        Save(state);
        CPH.SetArgument("x1DuelId", state.DuelId);
        string label = state.Mode == "arena" ? "Arena X1" : "X1";
        CPH.SendMessage($"🎯 Prediction aberta para {label}: {state.Challenger.DisplayName} vs {state.Target.DisplayName}! Apostem seus Channel Points.", true, true);
        CPH.LogInfo($"[X1] Prediction aberta: {state.PredictionId} | duelo {state.DuelId} | modo {state.Mode}");
        return true;
    }

    private static string NormalizeMode(string mode) { return string.Equals(mode, "arena", StringComparison.OrdinalIgnoreCase) ? "arena" : "race"; }
    private bool TryCancelPrediction(string predictionId)
    {
        if (string.IsNullOrWhiteSpace(predictionId)) return false;
        try
        {
            CPH.TwitchPredictionCancel(predictionId);
            CPH.LogInfo($"[X1] Prediction incompleta cancelada: {predictionId}");
            return true;
        }
        catch (Exception error)
        {
            CPH.LogError($"[X1] Erro cancelando Prediction incompleta: {error.Message}");
            return false;
        }
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
    public int ContractVersion { get; set; } public string Mode { get; set; } public string Status { get; set; } public string DuelId { get; set; }
    public X1User Challenger { get; set; } public X1User Target { get; set; }
    public DateTime CreatedAtUtc { get; set; } public DateTime ExpiresAtUtc { get; set; }
    public DateTime? PredictionOpenedAtUtc { get; set; } public DateTime? StartedAtUtc { get; set; } public DateTime? OverlayConfirmedAtUtc { get; set; }
    public string RewardId { get; set; } public string RedemptionId { get; set; }
    public string PredictionId { get; set; } public string ChallengerOutcomeId { get; set; } public string TargetOutcomeId { get; set; }
    public int Seed { get; set; } public bool ResultAnnounced { get; set; } public bool IsTest { get; set; }
}
public class X1User { public string Id { get; set; } public string Login { get; set; } public string DisplayName { get; set; } public string AvatarUrl { get; set; } }
