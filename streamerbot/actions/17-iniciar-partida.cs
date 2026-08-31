using System;
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
            CPH.LogInfo($"[X1] Timer/dispatcher antigo ignorado: {scheduledDuelId}");
            return false;
        }

        string mode = NormalizeMode(state.Mode);
        CPH.SetArgument("x1DuelId", state.DuelId);
        CPH.LogInfo($"[X1] Despachando duelo {state.DuelId} para {mode}");
        return CPH.RunAction(mode == "arena" ? "Arena - Iniciar" : "X1 - Iniciar Corrida", true);
    }

    private static string NormalizeMode(string mode) { return string.Equals(mode, "arena", StringComparison.OrdinalIgnoreCase) ? "arena" : "race"; }
    private X1State Load() { string json = CPH.GetGlobalVar<string>(StateKey, false); return string.IsNullOrWhiteSpace(json) ? null : JsonConvert.DeserializeObject<X1State>(json); }
}

public class X1State
{
    public string Mode { get; set; }
    public string Status { get; set; }
    public string DuelId { get; set; }
}
