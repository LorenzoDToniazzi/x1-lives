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
            CPH.SendMessage("Não existe um desafio aguardando aceite.", true, true);
            return false;
        }
        if (state.ExpiresAtUtc <= DateTime.UtcNow)
        {
            FulfillRedemption(state);
            CPH.UnsetGlobalVar(StateKey, false);
            CPH.SendMessage("Esse desafio já expirou.", true, true);
            return false;
        }

        CPH.TryGetArg("userId", out string userId);
        CPH.TryGetArg("userName", out string userName);
        if (state.Target.Id != userId && !string.Equals(state.Target.Login, userName, StringComparison.OrdinalIgnoreCase))
        {
            CPH.SendMessage("Somente o usuário desafiado pode aceitar esse X1.", true, true);
            return false;
        }

        state.Status = "PREDICTION_CREATING";
        Save(state);
        CPH.SetArgument("x1DuelId", state.DuelId);
        CPH.SetArgument("x1PredictionTitle", "QUEM VENCE O X1?");
        CPH.SetArgument("x1ChallengerTitle", LimitOutcomeTitle(state.Challenger.DisplayName));
        CPH.SetArgument("x1TargetTitle", LimitOutcomeTitle(state.Target.DisplayName));
        return true;
    }

    private static string LimitOutcomeTitle(string value)
    {
        string text = string.IsNullOrWhiteSpace(value) ? "Jogador" : value.Trim();
        return text.Length <= 25 ? text : text.Substring(0, 25);
    }

    private void FulfillRedemption(X1State state)
    {
        if (!string.IsNullOrWhiteSpace(state.RewardId) && !string.IsNullOrWhiteSpace(state.RedemptionId))
            CPH.TwitchRedemptionFulfill(state.RewardId, state.RedemptionId);
    }

    private X1State Load() { string json = CPH.GetGlobalVar<string>(StateKey, false); return string.IsNullOrWhiteSpace(json) ? null : JsonConvert.DeserializeObject<X1State>(json); }
    private void Save(X1State state) { CPH.SetGlobalVar(StateKey, JsonConvert.SerializeObject(state), false); }
}

public class X1State
{
    public int ContractVersion { get; set; }
    public string Status { get; set; }
    public string DuelId { get; set; }
    public X1User Challenger { get; set; }
    public X1User Target { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime ExpiresAtUtc { get; set; }
    public DateTime? PredictionOpenedAtUtc { get; set; }
    public DateTime? StartedAtUtc { get; set; }
    public DateTime? OverlayConfirmedAtUtc { get; set; }
    public string RewardId { get; set; }
    public string RedemptionId { get; set; }
    public string PredictionId { get; set; }
    public string ChallengerOutcomeId { get; set; }
    public string TargetOutcomeId { get; set; }
    public int Seed { get; set; }
    public bool ResultAnnounced { get; set; }
    public bool IsTest { get; set; }
}
public class X1User { public string Id { get; set; } public string Login { get; set; } public string DisplayName { get; set; } public string AvatarUrl { get; set; } }
