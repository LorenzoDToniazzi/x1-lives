using System;
using System.Security.Cryptography;
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
            CPH.SendMessage("Esse desafio já expirou.", true, true);
            CPH.UnsetGlobalVar(StateKey, false);
            return false;
        }

        CPH.TryGetArg("userId", out string userId);
        CPH.TryGetArg("userName", out string userName);
        if (state.Target.Id != userId && !string.Equals(state.Target.Login, userName, StringComparison.OrdinalIgnoreCase))
        {
            CPH.SendMessage("Somente o usuário desafiado pode aceitar esse X1.", true, true);
            return false;
        }

        state.Status = "STARTING";
        state.StartedAtUtc = DateTime.UtcNow;
        state.Seed = CreateSeed();
        Save(state);
        CPH.SetArgument("x1DuelId", state.DuelId);

        BroadcastStart(state);
        CPH.SendMessage($"X1 aceito: {state.Challenger.DisplayName} vs {state.Target.DisplayName}.", true, true);
        CPH.LogInfo($"[X1] Evento enviado: {state.DuelId} | seed {state.Seed}");
        return true;
    }

    private void BroadcastStart(X1State state)
    {
        object payload = new
        {
            contractVersion = 4,
            @event = "X1.Start",
            duelId = state.DuelId,
            mode = "race",
            challenger = state.Challenger,
            target = state.Target,
            seed = state.Seed,
            race = new { simulationSpeed = 2, simulationHardLimitMs = 96000, wallClockHardLimitMs = 48000 },
            isTest = state.IsTest
        };
        CPH.WebsocketBroadcastJson(JsonConvert.SerializeObject(payload));
    }

    private static int CreateSeed() { byte[] bytes = new byte[4]; using (RandomNumberGenerator rng = RandomNumberGenerator.Create()) rng.GetBytes(bytes); return (int)(BitConverter.ToUInt32(bytes, 0) % 2147483646U) + 1; }
    private X1State Load() { string json = CPH.GetGlobalVar<string>(StateKey, false); return string.IsNullOrWhiteSpace(json) ? null : JsonConvert.DeserializeObject<X1State>(json); }
    private void Save(X1State state) { CPH.SetGlobalVar(StateKey, JsonConvert.SerializeObject(state), false); }
}

public class X1State
{
    public int ContractVersion { get; set; } public string Status { get; set; } public string DuelId { get; set; }
    public X1User Challenger { get; set; } public X1User Target { get; set; }
    public DateTime CreatedAtUtc { get; set; } public DateTime ExpiresAtUtc { get; set; }
    public DateTime? StartedAtUtc { get; set; } public DateTime? OverlayConfirmedAtUtc { get; set; }
    public int Seed { get; set; } public bool ResultAnnounced { get; set; } public bool IsTest { get; set; }
}
public class X1User { public string Id { get; set; } public string Login { get; set; } public string DisplayName { get; set; } public string AvatarUrl { get; set; } }
