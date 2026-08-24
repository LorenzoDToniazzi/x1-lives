using System;
using System.Security.Cryptography;
using Newtonsoft.Json;

public class CPHInline
{
    private const string StateKey = "x1.activeState";

    public bool Execute()
    {
        CPH.TryGetArg("x1DuelId", out string scheduledDuelId);
        X1State state = Load();
        if (state == null || state.Status != "PREDICTION_OPEN" || state.DuelId != scheduledDuelId)
        {
            CPH.LogInfo($"[X1] Timer de Prediction antigo ignorado: {scheduledDuelId}");
            return false;
        }
        if (string.IsNullOrWhiteSpace(state.PredictionId)
            || string.IsNullOrWhiteSpace(state.ChallengerOutcomeId)
            || string.IsNullOrWhiteSpace(state.TargetOutcomeId))
        {
            CancelAndRefund(state, "prediction_data_missing");
            CPH.SendMessage("A Prediction ficou incompleta e o X1 foi cancelado.", true, true);
            return false;
        }

        state.Status = "STARTING";
        state.StartedAtUtc = DateTime.UtcNow;
        state.Seed = CreateSeed();
        Save(state);
        CPH.SetArgument("x1DuelId", state.DuelId);
        BroadcastStart(state);
        CPH.SendMessage($"🏁 Apostas encerradas. {state.Challenger.DisplayName} vs {state.Target.DisplayName} vai começar!", true, true);
        CPH.LogInfo($"[X1] Corrida enviada: {state.DuelId} | seed {state.Seed}");
        return true;
    }

    private void BroadcastStart(X1State state)
    {
        CPH.WebsocketBroadcastJson(JsonConvert.SerializeObject(new
        {
            contractVersion = 4,
            @event = "X1.Start",
            duelId = state.DuelId,
            mode = "race",
            challenger = state.Challenger,
            target = state.Target,
            seed = state.Seed,
            race = new { simulationSpeed = 2, simulationHardLimitMs = 96000, wallClockHardLimitMs = 48000 },
            isTest = state.IsTest
        }));
    }

    private void CancelAndRefund(X1State state, string reason)
    {
        try { if (!string.IsNullOrWhiteSpace(state.PredictionId)) CPH.TwitchPredictionCancel(state.PredictionId); }
        catch (Exception error) { CPH.LogError($"[X1] Falha cancelando Prediction: {error.Message}"); }
        if (!string.IsNullOrWhiteSpace(state.RewardId) && !string.IsNullOrWhiteSpace(state.RedemptionId))
            CPH.TwitchRedemptionCancel(state.RewardId, state.RedemptionId);
        CPH.UnsetGlobalVar(StateKey, false);
        CPH.LogError($"[X1] Duelo cancelado: {state.DuelId} | {reason}");
    }

    private static int CreateSeed() { byte[] bytes = new byte[4]; using (RandomNumberGenerator rng = RandomNumberGenerator.Create()) rng.GetBytes(bytes); return (int)(BitConverter.ToUInt32(bytes, 0) % 2147483646U) + 1; }
    private X1State Load() { string json = CPH.GetGlobalVar<string>(StateKey, false); return string.IsNullOrWhiteSpace(json) ? null : JsonConvert.DeserializeObject<X1State>(json); }
    private void Save(X1State state) { CPH.SetGlobalVar(StateKey, JsonConvert.SerializeObject(state), false); }
}

public class X1State
{
    public string Status { get; set; }
    public string DuelId { get; set; }
    public X1User Challenger { get; set; }
    public X1User Target { get; set; }
    public DateTime? StartedAtUtc { get; set; }
    public int Seed { get; set; }
    public bool IsTest { get; set; }
    public string RewardId { get; set; }
    public string RedemptionId { get; set; }
    public string PredictionId { get; set; }
    public string ChallengerOutcomeId { get; set; }
    public string TargetOutcomeId { get; set; }
}
public class X1User { public string Id { get; set; } public string Login { get; set; } public string DisplayName { get; set; } public string AvatarUrl { get; set; } }
