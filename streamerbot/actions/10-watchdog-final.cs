using System;
using Newtonsoft.Json;

public class CPHInline
{
    private const string StateKey = "x1.activeState";
    public bool Execute()
    {
        CPH.TryGetArg("x1DuelId", out string scheduledDuelId);
        X1State state = Load();
        if (state == null || state.DuelId != scheduledDuelId) return true;
        if (string.Equals(state.Mode, "arena", StringComparison.OrdinalIgnoreCase))
        {
            CPH.LogInfo($"[X1] Watchdog final da Corrida ignorou Arena: {state.DuelId}");
            return true;
        }
        if (state.Status != "STARTING" && state.Status != "ANIMATING") return true;
        BroadcastCancel(state.DuelId, "race_timeout");
        CancelPredictionAndRefund(state);
        CPH.UnsetGlobalVar(StateKey, false);
        if (!state.IsTest) CPH.SendMessage("A corrida excedeu o limite e o X1 foi cancelado.", true, true);
        CPH.LogError($"[X1] Watchdog final cancelou: {state.DuelId}");
        return true;
    }
    private void CancelPredictionAndRefund(X1State state)
    {
        try { if (!string.IsNullOrWhiteSpace(state.PredictionId)) CPH.TwitchPredictionCancel(state.PredictionId); }
        catch (Exception error) { CPH.LogError($"[X1] Falha cancelando Prediction: {error.Message}"); }
        if (!string.IsNullOrWhiteSpace(state.RewardId) && !string.IsNullOrWhiteSpace(state.RedemptionId))
            CPH.TwitchRedemptionCancel(state.RewardId, state.RedemptionId);
    }
    private void BroadcastCancel(string duelId, string reason) { CPH.WebsocketBroadcastJson(JsonConvert.SerializeObject(new { contractVersion = 4, @event = "X1.Cancel", duelId, reason })); }
    private X1State Load() { string json = CPH.GetGlobalVar<string>(StateKey, false); return string.IsNullOrWhiteSpace(json) ? null : JsonConvert.DeserializeObject<X1State>(json); }
}
public class X1State { public string Mode { get; set; } public string Status { get; set; } public string DuelId { get; set; } public bool IsTest { get; set; } public string PredictionId { get; set; } public string RewardId { get; set; } public string RedemptionId { get; set; } }
