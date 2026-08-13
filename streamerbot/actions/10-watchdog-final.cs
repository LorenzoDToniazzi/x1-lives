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
        if (state.Status != "STARTING" && state.Status != "ANIMATING") return true;
        BroadcastCancel(state.DuelId, "race_timeout");
        CPH.UnsetGlobalVar(StateKey, false);
        if (!state.IsTest) CPH.SendMessage("A corrida excedeu o limite e o X1 foi cancelado.", true, true);
        CPH.LogError($"[X1] Watchdog final cancelou: {state.DuelId}");
        return true;
    }
    private void BroadcastCancel(string duelId, string reason) { CPH.WebsocketBroadcastJson(JsonConvert.SerializeObject(new { contractVersion = 4, @event = "X1.Cancel", duelId, reason })); }
    private X1State Load() { string json = CPH.GetGlobalVar<string>(StateKey, false); return string.IsNullOrWhiteSpace(json) ? null : JsonConvert.DeserializeObject<X1State>(json); }
}
public class X1State { public string Status { get; set; } public string DuelId { get; set; } public bool IsTest { get; set; } }
