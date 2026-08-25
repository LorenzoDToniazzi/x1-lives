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
public class X1State
{
    public int ContractVersion { get; set; } public string Status { get; set; } public string DuelId { get; set; }
    public X1User Challenger { get; set; } public X1User Target { get; set; }
    public DateTime CreatedAtUtc { get; set; } public DateTime ExpiresAtUtc { get; set; }
    public DateTime? PredictionOpenedAtUtc { get; set; } public DateTime? StartedAtUtc { get; set; } public DateTime? OverlayConfirmedAtUtc { get; set; }
    public string RewardId { get; set; } public string RedemptionId { get; set; }
    public string PredictionId { get; set; } public string ChallengerOutcomeId { get; set; } public string TargetOutcomeId { get; set; }
    public int Seed { get; set; } public bool ResultAnnounced { get; set; } public bool IsTest { get; set; }
}
public class X1User { public string Id { get; set; } public string Login { get; set; } public string DisplayName { get; set; } public string AvatarUrl { get; set; } }
