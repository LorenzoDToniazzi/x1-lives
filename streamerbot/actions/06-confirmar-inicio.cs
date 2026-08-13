using System;
using Newtonsoft.Json;

public class CPHInline
{
    private const string StateKey = "x1.activeState";
    public bool Execute()
    {
        CPH.TryGetArg("duelId", out string duelId);
        CPH.TryGetArg("contractVersion", out int contractVersion);
        X1State state = Load();
        if (state == null || state.Status != "STARTING" || state.DuelId != duelId || contractVersion != 4)
        {
            CPH.LogInfo("[X1] Confirmação de início ignorada");
            return false;
        }
        state.Status = "ANIMATING";
        state.OverlayConfirmedAtUtc = DateTime.UtcNow;
        CPH.SetGlobalVar(StateKey, JsonConvert.SerializeObject(state), false);
        CPH.WebsocketBroadcastJson(JsonConvert.SerializeObject(new
        {
            contractVersion = 4,
            @event = "X1.Ack",
            duelId = state.DuelId
        }));
        CPH.LogInfo($"[X1] Overlay confirmou início: {duelId}");
        return true;
    }
    private X1State Load() { string json = CPH.GetGlobalVar<string>(StateKey, false); return string.IsNullOrWhiteSpace(json) ? null : JsonConvert.DeserializeObject<X1State>(json); }
}
public class X1State { public string Status { get; set; } public string DuelId { get; set; } public DateTime? OverlayConfirmedAtUtc { get; set; } }
