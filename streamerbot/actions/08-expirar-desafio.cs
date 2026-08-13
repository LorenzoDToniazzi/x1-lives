using System;
using Newtonsoft.Json;

public class CPHInline
{
    private const string StateKey = "x1.activeState";
    public bool Execute()
    {
        CPH.TryGetArg("x1DuelId", out string scheduledDuelId);
        X1State state = Load();
        if (state == null || state.DuelId != scheduledDuelId || state.Status != "WAITING_ACCEPT") return true;
        if (DateTime.UtcNow < state.ExpiresAtUtc.AddMilliseconds(-250)) return true;
        CPH.UnsetGlobalVar(StateKey, false);
        CPH.SendMessage($"O desafio entre @{state.Challenger.DisplayName} e @{state.Target.DisplayName} expirou.", true, true);
        CPH.LogInfo($"[X1] Desafio expirado: {state.DuelId}");
        return true;
    }
    private X1State Load() { string json = CPH.GetGlobalVar<string>(StateKey, false); return string.IsNullOrWhiteSpace(json) ? null : JsonConvert.DeserializeObject<X1State>(json); }
}
public class X1State { public string Status { get; set; } public string DuelId { get; set; } public DateTime ExpiresAtUtc { get; set; } public X1User Challenger { get; set; } public X1User Target { get; set; } }
public class X1User { public string DisplayName { get; set; } }
