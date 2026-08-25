using System;
using Newtonsoft.Json;

public class CPHInline
{
    private const string StateKey = "x1.activeState";
    public bool Execute()
    {
        X1State state = Load();
        if (state == null || state.Status != "WAITING_ACCEPT")
        {
            CPH.SendMessage("Não existe um desafio aguardando resposta.", true, true);
            return false;
        }
        CPH.TryGetArg("userId", out string userId);
        CPH.TryGetArg("userName", out string userName);
        if (state.Target.Id != userId && !string.Equals(state.Target.Login, userName, StringComparison.OrdinalIgnoreCase))
        {
            CPH.SendMessage("Somente o usuário desafiado pode negar esse X1.", true, true);
            return false;
        }
        FulfillRedemption(state);
        CPH.UnsetGlobalVar(StateKey, false);
        CPH.SendMessage($"@{state.Target.DisplayName} recusou o X1 de @{state.Challenger.DisplayName}.", true, true);
        CPH.LogInfo($"[X1] Desafio recusado: {state.DuelId}");
        return true;
    }
    private void FulfillRedemption(X1State state)
    {
        if (!string.IsNullOrWhiteSpace(state.RewardId) && !string.IsNullOrWhiteSpace(state.RedemptionId))
            CPH.TwitchRedemptionFulfill(state.RewardId, state.RedemptionId);
    }
    private X1State Load() { string json = CPH.GetGlobalVar<string>(StateKey, false); return string.IsNullOrWhiteSpace(json) ? null : JsonConvert.DeserializeObject<X1State>(json); }
}
public class X1State { public string Status { get; set; } public string DuelId { get; set; } public X1User Challenger { get; set; } public X1User Target { get; set; } public string RewardId { get; set; } public string RedemptionId { get; set; } }
public class X1User { public string Id { get; set; } public string Login { get; set; } public string DisplayName { get; set; } }
