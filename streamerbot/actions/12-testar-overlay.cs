using System;
using System.Security.Cryptography;
using Newtonsoft.Json;

public class CPHInline
{
    private const string StateKey = "x1.activeState";
    public bool Execute()
    {
        string existing = CPH.GetGlobalVar<string>(StateKey, false);
        if (!string.IsNullOrWhiteSpace(existing))
        {
            CPH.LogInfo("[X1 TESTE] Já existe um duelo ativo");
            return false;
        }

        DateTime now = DateTime.UtcNow;
        X1State state = new X1State
        {
            ContractVersion = 4,
            Mode = "race",
            Status = "STARTING",
            DuelId = "teste" + Guid.NewGuid().ToString("N"),
            Challenger = new X1User { Id = "teste-azul", Login = "testeazul", DisplayName = "Teste Azul", AvatarUrl = string.Empty },
            Target = new X1User { Id = "teste-rosa", Login = "testerosa", DisplayName = "Teste Rosa", AvatarUrl = string.Empty },
            CreatedAtUtc = now,
            ExpiresAtUtc = now.AddMinutes(1),
            StartedAtUtc = now,
            Seed = CreateSeed(),
            IsTest = true
        };
        CPH.SetGlobalVar(StateKey, JsonConvert.SerializeObject(state), false);
        CPH.SetArgument("x1DuelId", state.DuelId);

        CPH.WebsocketBroadcastJson(JsonConvert.SerializeObject(new
        {
            contractVersion = 4,
            @event = "X1.Start",
            duelId = state.DuelId,
            mode = "race",
            challenger = state.Challenger,
            target = state.Target,
            seed = state.Seed,
            race = new { simulationSpeed = 2, simulationHardLimitMs = 96000, wallClockHardLimitMs = 48000 },
            isTest = true
        }));
        CPH.LogInfo($"[X1 TESTE] Evento enviado: {state.DuelId} | seed {state.Seed}");
        return true;
    }
    private static int CreateSeed() { byte[] bytes = new byte[4]; using (RandomNumberGenerator rng = RandomNumberGenerator.Create()) rng.GetBytes(bytes); return (int)(BitConverter.ToUInt32(bytes, 0) % 2147483646U) + 1; }
}
public class X1State
{
    public int ContractVersion { get; set; } public string Mode { get; set; } public string Status { get; set; } public string DuelId { get; set; }
    public X1User Challenger { get; set; } public X1User Target { get; set; }
    public DateTime CreatedAtUtc { get; set; } public DateTime ExpiresAtUtc { get; set; } public DateTime? StartedAtUtc { get; set; }
    public int Seed { get; set; } public bool ResultAnnounced { get; set; } public bool IsTest { get; set; }
}
public class X1User { public string Id { get; set; } public string Login { get; set; } public string DisplayName { get; set; } public string AvatarUrl { get; set; } }
