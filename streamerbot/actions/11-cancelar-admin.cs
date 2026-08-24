using System;
using Newtonsoft.Json;

public class CPHInline
{
    private const string StateKey = "x1.activeState";
    public bool Execute()
    {
        CPH.TryGetArg("userId", out string userId);
        CPH.TryGetArg("isBroadcaster", out bool isBroadcaster);
        CPH.TryGetArg("isModerator", out bool isModerator);
        if (!string.IsNullOrWhiteSpace(userId) && !isBroadcaster && !isModerator)
        {
            CPH.SendMessage("Somente o streamer ou um moderador pode cancelar o X1.", true, true);
            return false;
        }

        X1State state = Load();
        if (state == null)
        {
            CPH.LogInfo("[X1] Cancelamento pedido sem duelo ativo");
            return false;
        }

        CPH.WebsocketBroadcastJson(JsonConvert.SerializeObject(new
        {
            contractVersion = 4,
            @event = "X1.Cancel",
            duelId = state.DuelId,
            reason = "admin_cancel"
        }));
        CancelPredictionAndRefund(state);
        CPH.UnsetGlobalVar(StateKey, false);
        if (!state.IsTest) CPH.SendMessage("O X1 atual foi cancelado pela moderação.", true, true);
        CPH.LogInfo($"[X1] Cancelamento administrativo: {state.DuelId}");
        return true;
    }
    private void CancelPredictionAndRefund(X1State state)
    {
        try { if (!string.IsNullOrWhiteSpace(state.PredictionId)) CPH.TwitchPredictionCancel(state.PredictionId); }
        catch (Exception error) { CPH.LogError($"[X1] Falha cancelando Prediction: {error.Message}"); }
        if (!string.IsNullOrWhiteSpace(state.RewardId) && !string.IsNullOrWhiteSpace(state.RedemptionId))
            CPH.TwitchRedemptionCancel(state.RewardId, state.RedemptionId);
    }
    private X1State Load() { string json = CPH.GetGlobalVar<string>(StateKey, false); return string.IsNullOrWhiteSpace(json) ? null : JsonConvert.DeserializeObject<X1State>(json); }
}
public class X1State { public string DuelId { get; set; } public bool IsTest { get; set; } public string PredictionId { get; set; } public string RewardId { get; set; } public string RedemptionId { get; set; } }
