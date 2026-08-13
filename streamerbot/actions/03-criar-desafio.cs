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
            CPH.SendMessage("Não encontrei esse usuário na Twitch.", true, true);
            return false;
        }

        if (TryGetCooldown(out DateTime cooldownUntil) && cooldownUntil > DateTime.UtcNow)
        {
            int seconds = Math.Max(1, (int)Math.Ceiling((cooldownUntil - DateTime.UtcNow).TotalSeconds));
            CPH.SendMessage($"O X1 estará disponível novamente em {seconds}s.", true, true);
            return false;
        }
        CPH.UnsetGlobalVar(CooldownKey, false);

        X1State existing = Load();
        if (existing != null)
        {
            if (existing.Status == "WAITING_ACCEPT" && existing.ExpiresAtUtc <= DateTime.UtcNow)
                CPH.UnsetGlobalVar(StateKey, false);
            else
            {
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
            CPH.LogError("[X1] Dados de participante incompletos");
            return false;
        }
        if (challenger.Id == target.Id)
        {
            CPH.SendMessage("Você não pode desafiar a si mesmo.", true, true);
            return false;
        }

        string broadcasterLogin = Arg("broadcastUserName");
        string botLogin = Arg("botUserName");
        bool targetIsBot = SameLogin(target.Login, botLogin);
        bool botIsBroadcaster = SameLogin(botLogin, broadcasterLogin);
        if (targetIsBot && !botIsBroadcaster)
        {
            CPH.SendMessage("A conta do bot não pode participar do X1.", true, true);
            return false;
        }

        DateTime now = DateTime.UtcNow;
        X1State state = new X1State
        {
            ContractVersion = 4,
            Status = "WAITING_ACCEPT",
            DuelId = Guid.NewGuid().ToString("N"),
            Challenger = challenger,
            Target = target,
            CreatedAtUtc = now,
            ExpiresAtUtc = now.AddSeconds(45),
            ResultAnnounced = false,
            IsTest = false
        };

        Save(state);
        CPH.SetArgument("x1DuelId", state.DuelId);
        CPH.SendMessage($"@{target.DisplayName}, @{challenger.DisplayName} te desafiou para um X1. Use !aceitar ou !negar em 45 segundos.", true, true);
        CPH.LogInfo($"[X1] Desafio criado: {state.DuelId} | {challenger.Login} vs {target.Login}");
        return true;
    }

    private string Arg(string name) { CPH.TryGetArg(name, out string value); return value ?? string.Empty; }
    private X1State Load() { string json = CPH.GetGlobalVar<string>(StateKey, false); return string.IsNullOrWhiteSpace(json) ? null : JsonConvert.DeserializeObject<X1State>(json); }
    private void Save(X1State state) { CPH.SetGlobalVar(StateKey, JsonConvert.SerializeObject(state), false); }
    private bool TryGetCooldown(out DateTime value) { string raw = CPH.GetGlobalVar<string>(CooldownKey, false); return DateTime.TryParse(raw, null, System.Globalization.DateTimeStyles.RoundtripKind, out value); }
    private static bool SameLogin(string a, string b) { return !string.IsNullOrWhiteSpace(a) && !string.IsNullOrWhiteSpace(b) && string.Equals(a.TrimStart('@'), b.TrimStart('@'), StringComparison.OrdinalIgnoreCase); }
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
    public DateTime? StartedAtUtc { get; set; }
    public DateTime? OverlayConfirmedAtUtc { get; set; }
    public int Seed { get; set; }
    public bool ResultAnnounced { get; set; }
    public bool IsTest { get; set; }
}
public class X1User { public string Id { get; set; } public string Login { get; set; } public string DisplayName { get; set; } public string AvatarUrl { get; set; } }
