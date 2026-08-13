using System;
using Newtonsoft.Json;

public class CPHInline
{
    private const string StateKey = "x1.activeState";
    public bool Execute()
    {
        CPH.TryGetArg("x1DuelId", out string scheduledDuelId);
        X1State state = Load();
        if (state == null || state.DuelId != scheduledDuelId || state.Status != "STARTING") return true;
        BroadcastCancel(state.DuelId, "overlay_ack_timeout");
        CPH.UnsetGlobalVar(StateKey, false);
        if (!state.IsTest) CPH.SendMessage("O overlay do X1 não respondeu e o duelo foi cancelado.", true, true);
        CPH.LogError($"[X1] Timeout aguardando confirmação: {state.DuelId}");
        return true;
    }
    private void BroadcastCancel(string duelId, string reason) { CPH.WebsocketBroadcastJson(JsonConvert.SerializeObject(new { contractVersion = 4, @event = "X1.Cancel", duelId, reason })); }
    private X1State Load() { string json = CPH.GetGlobalVar<string>(StateKey, false); return string.IsNullOrWhiteSpace(json) ? null : JsonConvert.DeserializeObject<X1State>(json); }
}
public class X1State { public string Status { get; set; } public string DuelId { get; set; } public bool IsTest { get; set; } }
