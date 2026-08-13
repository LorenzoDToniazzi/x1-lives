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
        CPH.UnsetGlobalVar(StateKey, false);
        if (!state.IsTest) CPH.SendMessage("O X1 atual foi cancelado pela moderação.", true, true);
        CPH.LogInfo($"[X1] Cancelamento administrativo: {state.DuelId}");
        return true;
    }
    private X1State Load() { string json = CPH.GetGlobalVar<string>(StateKey, false); return string.IsNullOrWhiteSpace(json) ? null : JsonConvert.DeserializeObject<X1State>(json); }
}
public class X1State { public string DuelId { get; set; } public bool IsTest { get; set; } }
