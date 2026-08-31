using System;
using Newtonsoft.Json;

public class CPHInline
{
    private const string StateKey = "x1.activeState";
    private const string CooldownKey = "x1.cooldownUntilUtc";

    public bool Execute()
    {
        CPH.TryGetArg("addTargetResult", out bool targetFound);
        if (!targetFound)
        {
            RefundCurrentRedemption();
            CPH.SendMessage("Não encontrei esse usuário na Twitch.", true, true);
            return false;
        }

        if (TryGetCooldown(out DateTime cooldownUntil) && cooldownUntil > DateTime.UtcNow)
        {
            int seconds = Math.Max(1, (int)Math.Ceiling((cooldownUntil - DateTime.UtcNow).TotalSeconds));
            RefundCurrentRedemption();
            CPH.SendMessage($"O X1 estará disponível novamente em {seconds}s.", true, true);
            return false;
        }
        CPH.UnsetGlobalVar(CooldownKey, false);

        X1State existing = Load();
        if (existing != null)
        {
            if (existing.Status == "WAITING_ACCEPT" && existing.ExpiresAtUtc <= DateTime.UtcNow)
            {
                FulfillStoredRedemption(existing);
                CPH.UnsetGlobalVar(StateKey, false);
            }
            else
            {
                RefundCurrentRedemption();
                CPH.SendMessage("Já existe um desafio X1 em andamento.", true, true);
                return false;
            }
        }

        X1User challenger = new X1User
        {
            Id = Arg("x1ChallengerId"),
            Login = Arg("x1ChallengerLogin").ToLowerInvariant(),
            DisplayName = Arg("x1ChallengerDisplayName"),
            AvatarUrl = Arg("x1ChallengerAvatarUrl")
        };
        X1User target = new X1User
        {
            Id = Arg("targetUserId"),
            Login = Arg("targetUserName").ToLowerInvariant(),
            DisplayName = Arg("targetUser"),
            AvatarUrl = Arg("targetUserProfileImageUrl")
        };

        if (string.IsNullOrWhiteSpace(challenger.Id) || string.IsNullOrWhiteSpace(target.Id))
        {
            RefundCurrentRedemption();
            CPH.LogError("[X1] Dados de participante incompletos");
            return false;
        }
        if (challenger.Id == target.Id)
        {
            RefundCurrentRedemption();
            CPH.SendMessage("Você não pode desafiar a si mesmo.", true, true);
            return false;
        }

        string broadcasterLogin = Arg("broadcastUserName");
        string botLogin = Arg("botUserName");
        bool targetIsBot = SameLogin(target.Login, botLogin);
        bool botIsBroadcaster = SameLogin(botLogin, broadcasterLogin);
        if (targetIsBot && !botIsBroadcaster)
        {
            RefundCurrentRedemption();
            CPH.SendMessage("A conta do bot não pode participar do X1.", true, true);
            return false;
        }

        DateTime now = DateTime.UtcNow;
        X1State state = new X1State
        {
            ContractVersion = 4,
            Mode = NormalizeMode(Arg("x1Mode")),
            Status = "WAITING_ACCEPT",
            DuelId = Guid.NewGuid().ToString("N"),
            Challenger = challenger,
            Target = target,
            CreatedAtUtc = now,
            ExpiresAtUtc = now.AddSeconds(45),
            RewardId = Arg("rewardId"),
            RedemptionId = Arg("redemptionId"),
            ResultAnnounced = false,
            IsTest = false
        };

        Save(state);
        CPH.SetArgument("x1DuelId", state.DuelId);
        string modeLabel = state.Mode == "arena" ? "Arena X1" : "X1";
        CPH.SendMessage($"🥊 @{target.DisplayName}, @{challenger.DisplayName} te desafiou para {modeLabel}. Use !aceitarx1 ou !recusarx1 em 45 segundos.", true, true);
        CPH.LogInfo($"[X1] Desafio criado: {state.DuelId} | modo {state.Mode} | {challenger.Login} vs {target.Login}");
        return true;
    }

    private string Arg(string name) { CPH.TryGetArg(name, out string value); return value ?? string.Empty; }
    private static string NormalizeMode(string mode) { return string.Equals(mode, "arena", StringComparison.OrdinalIgnoreCase) ? "arena" : "race"; }
    private X1State Load() { string json = CPH.GetGlobalVar<string>(StateKey, false); return string.IsNullOrWhiteSpace(json) ? null : JsonConvert.DeserializeObject<X1State>(json); }
    private void Save(X1State state) { CPH.SetGlobalVar(StateKey, JsonConvert.SerializeObject(state), false); }
    private bool TryGetCooldown(out DateTime value) { string raw = CPH.GetGlobalVar<string>(CooldownKey, false); return DateTime.TryParse(raw, null, System.Globalization.DateTimeStyles.RoundtripKind, out value); }
    private static bool SameLogin(string a, string b) { return !string.IsNullOrWhiteSpace(a) && !string.IsNullOrWhiteSpace(b) && string.Equals(a.TrimStart('@'), b.TrimStart('@'), StringComparison.OrdinalIgnoreCase); }
    private void RefundCurrentRedemption()
    {
        string rewardId = Arg("rewardId");
        string redemptionId = Arg("redemptionId");
        if (!string.IsNullOrWhiteSpace(rewardId) && !string.IsNullOrWhiteSpace(redemptionId))
            CPH.TwitchRedemptionCancel(rewardId, redemptionId);
    }
    private void FulfillStoredRedemption(X1State state)
    {
        if (!string.IsNullOrWhiteSpace(state.RewardId) && !string.IsNullOrWhiteSpace(state.RedemptionId))
            CPH.TwitchRedemptionFulfill(state.RewardId, state.RedemptionId);
    }
}

public class X1State
{
    public int ContractVersion { get; set; }
    public string Mode { get; set; }
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
