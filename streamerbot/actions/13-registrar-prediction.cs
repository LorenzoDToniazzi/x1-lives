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

        state.Mode = NormalizeMode(state.Mode);
        if (success && !string.IsNullOrWhiteSpace(predictionId))
        {
            state.PredictionId = predictionId;
            CPH.LogInfo($"[X1] Create Prediction confirmou id: {predictionId}");
        }
        else
        {
            // O Streamer.bot pode devolver success=false/id vazio mesmo depois de
            // a Twitch ter criado a Prediction. O Get Active + passo 14 serão a
            // fonte de verdade e validarão id, horário, título e participantes.
            CPH.LogWarn(
                $"[X1] Create Prediction retornou success={success} id={predictionId ?? "vazio"}; " +
                "aguardando confirmação pelo Get Active Prediction.");
        }
        Save(state);

        // A criação e a consulta da Prediction usam chamadas separadas.
        // Sem uma pequena espera, a Twitch pode confirmar o Create antes de
        // disponibilizar os outcomes para o Get Active seguinte.
        CPH.LogInfo($"[X1] Prediction criada; aguardando sincronização dos outcomes: {predictionId}");
        CPH.Wait(2000);
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
