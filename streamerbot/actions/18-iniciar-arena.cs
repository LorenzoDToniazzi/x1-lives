using System;
using System.Security.Cryptography;
using Newtonsoft.Json;

public class CPHInline
{
    private const string StateKey = "x1.activeState";
    private const string LastArenaSeedKey = "x1.lastArenaSeed";

    public bool Execute()
    {
        CPH.TryGetArg("x1DuelId", out string scheduledDuelId);
        X1State state = Load();
        if (state == null || state.Status != "PREDICTION_OPEN" || state.DuelId != scheduledDuelId)
        {
            CPH.LogInfo($"[ARENA] Início antigo/invalidado ignorado: {scheduledDuelId}");
            return false;
        }
        if (!string.Equals(state.Mode, "arena", StringComparison.OrdinalIgnoreCase))
        {
            CPH.LogError($"[ARENA] Arena - Iniciar recebeu modo {state.Mode ?? "vazio"}; execução recusada.");
            return false;
        }
        if (string.IsNullOrWhiteSpace(state.PredictionId)
            || string.IsNullOrWhiteSpace(state.ChallengerOutcomeId)
            || string.IsNullOrWhiteSpace(state.TargetOutcomeId))
        {
            CancelAndRefund(state, "prediction_data_missing");
            CPH.SendMessage("A Prediction ficou incompleta e a Arena X1 foi cancelada.", true, true);
            return false;
        }

        state.Mode = "arena";
        state.Status = "STARTING";
        state.StartedAtUtc = DateTime.UtcNow;
        state.Seed = CreateFreshArenaSeed();
        Save(state);
        CPH.SetGlobalVar(LastArenaSeedKey, state.Seed, false);
        CPH.SetArgument("x1DuelId", state.DuelId);

        CPH.WebsocketBroadcastJson(JsonConvert.SerializeObject(new
        {
            contractVersion = 4,
            @event = "X1.Start",
            duelId = state.DuelId,
            mode = "arena",
            challenger = state.Challenger,
            target = state.Target,
            seed = state.Seed,
            arena = new { simulationSpeed = 2, simulationHardLimitMs = 36000, wallClockHardLimitMs = 22000 },
            isTest = state.IsTest
        }));

        // O watchdog compartilhado continua útil para o ACK de início.
        // A etapa final dele possui guarda de Mode e nunca cancela a Arena.
        CPH.RunAction("X1 - Watchdog", false);
        CPH.RunAction("Arena - Watchdog", false);
        CPH.SendMessage($"⚔️ Apostas encerradas. {state.Challenger.DisplayName} vs {state.Target.DisplayName}: Arena X1!", true, true);
        CPH.LogInfo($"[ARENA] Arena enviada: {state.DuelId} | seed {state.Seed}");
        return true;
    }

    private int CreateFreshArenaSeed()
    {
        int previous = 0;
        try { previous = CPH.GetGlobalVar<int>(LastArenaSeedKey, false); } catch { }
        int seed;
        do { seed = CreateSeed(); } while (seed == previous);
        return seed;
    }

    private void CancelAndRefund(X1State state, string reason)
    {
        try { if (!string.IsNullOrWhiteSpace(state.PredictionId)) CPH.TwitchPredictionCancel(state.PredictionId); }
        catch (Exception error) { CPH.LogError($"[ARENA] Falha cancelando Prediction: {error.Message}"); }
        if (!string.IsNullOrWhiteSpace(state.RewardId) && !string.IsNullOrWhiteSpace(state.RedemptionId))
            CPH.TwitchRedemptionCancel(state.RewardId, state.RedemptionId);
        CPH.UnsetGlobalVar(StateKey, false);
        CPH.LogError($"[ARENA] Duelo cancelado: {state.DuelId} | {reason}");
    }

    private static int CreateSeed() { byte[] bytes = new byte[4]; using (RandomNumberGenerator rng = RandomNumberGenerator.Create()) rng.GetBytes(bytes); return (int)(BitConverter.ToUInt32(bytes, 0) % 2147483646U) + 1; }
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
