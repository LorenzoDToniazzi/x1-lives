using System;
using Newtonsoft.Json;

public class CPHInline
{
    private const string StateKey = "x1.activeState";

    public bool Execute()
    {
        CPH.TryGetArg("active", out bool active);
        CPH.TryGetArg("prediction.Id", out string predictionId);
        CPH.TryGetArg("prediction.outcome0.id", out string challengerOutcomeId);
        CPH.TryGetArg("prediction.outcome1.id", out string targetOutcomeId);
        CPH.TryGetArg("prediction.Title", out string predictionTitle);
        string outcome0Title = ReadStringArg("prediction.outcome0.title", "prediction.outcome0.Title");
        string outcome1Title = ReadStringArg("prediction.outcome1.title", "prediction.outcome1.Title");
        bool createdAtFound = CPH.TryGetArg("prediction.CreatedAt", out DateTime predictionCreatedAt);
        CPH.TryGetArg("x1DuelId", out string duelId);
        X1State state = Load();

        string expectedPredictionTitle = state == null
            ? string.Empty
            : (NormalizeMode(state.Mode) == "arena" ? "QUEM VENCE A ARENA X1?" : "QUEM VENCE O X1?");
        string expectedChallengerTitle = state == null ? string.Empty : LimitOutcomeTitle(state.Challenger?.DisplayName);
        string expectedTargetTitle = state == null ? string.Empty : LimitOutcomeTitle(state.Target?.DisplayName);
        bool predictionTitleMatches = SameText(predictionTitle, expectedPredictionTitle);
        bool outcomeOrderNormal = SameText(outcome0Title, expectedChallengerTitle)
            && SameText(outcome1Title, expectedTargetTitle);
        bool outcomeOrderReversed = SameText(outcome0Title, expectedTargetTitle)
            && SameText(outcome1Title, expectedChallengerTitle);
        bool outcomeMappingKnown = outcomeOrderNormal || outcomeOrderReversed;
        string mappedChallengerOutcomeId = outcomeOrderReversed ? targetOutcomeId : challengerOutcomeId;
        string mappedTargetOutcomeId = outcomeOrderReversed ? challengerOutcomeId : targetOutcomeId;
        DateTime predictionCreatedUtc = createdAtFound ? predictionCreatedAt.ToUniversalTime() : DateTime.MinValue;
        bool predictionIsFresh = state != null
            && createdAtFound
            && predictionCreatedUtc >= state.CreatedAtUtc.AddSeconds(-5)
            && predictionCreatedUtc <= DateTime.UtcNow.AddSeconds(5);
        bool sameById = state != null
            && !string.IsNullOrWhiteSpace(state.PredictionId)
            && state.PredictionId == predictionId;
        bool recoverableByMetadata = state != null
            && string.IsNullOrWhiteSpace(state.PredictionId)
            && predictionIsFresh;

        bool valid = state != null
            && state.Status == "PREDICTION_CREATING"
            && state.DuelId == duelId
            && active
            && !string.IsNullOrWhiteSpace(predictionId)
            && (sameById || recoverableByMetadata)
            && outcomeMappingKnown
            && !string.IsNullOrWhiteSpace(mappedChallengerOutcomeId)
            && !string.IsNullOrWhiteSpace(mappedTargetOutcomeId);

        if (!valid)
        {
            CPH.LogError(
                $"[X1] Falha ao registrar outcomes: duelo={duelId ?? "vazio"} " +
                $"estado={(state == null ? "nulo" : state.Status)} active={active} " +
                $"predictionRecebida={predictionId ?? "vazia"} " +
                $"predictionEsperada={state?.PredictionId ?? "vazia"} " +
                $"predictionTitleMatch={predictionTitleMatches} fresh={predictionIsFresh} " +
                $"outcome0Title={outcome0Title ?? "vazio"} outcome1Title={outcome1Title ?? "vazio"} " +
                $"orderNormal={outcomeOrderNormal} orderReversed={outcomeOrderReversed} " +
                $"outcome0Id={!string.IsNullOrWhiteSpace(challengerOutcomeId)} " +
                $"outcome1Id={!string.IsNullOrWhiteSpace(targetOutcomeId)}");

            if (state == null)
            {
                if (!string.IsNullOrWhiteSpace(predictionId)) TryCancelPrediction(predictionId);
                return false;
            }

            bool belongsToCurrentDuel = sameById || recoverableByMetadata;
            if (!belongsToCurrentDuel)
            {
                RefundRedemption(state);
                CPH.UnsetGlobalVar(StateKey, false);
                CPH.SendMessage(
                    "Já existe outra Prediction ativa na Twitch. O desafio foi devolvido; encerre a Prediction atual antes de tentar novamente.",
                    true,
                    true);
                return false;
            }

            string idToCancel = !string.IsNullOrWhiteSpace(state.PredictionId) ? state.PredictionId : predictionId;
            bool cancelled = TryCancelPrediction(idToCancel);

            // Se a Twitch recusar o cancelamento, preservamos o estado. Assim um
            // novo resgate fica bloqueado e não tenta criar uma segunda Prediction.
            if (!cancelled)
            {
                state.Status = "PREDICTION_CANCEL_FAILED";
                Save(state);
                CPH.SendMessage(
                    "A Twitch manteve a Prediction aberta. O X1 foi bloqueado para impedir outra Prediction; cancele a atual e use !x1cancel.",
                    true,
                    true);
                return false;
            }

            RefundRedemption(state);
            CPH.UnsetGlobalVar(StateKey, false);
            CPH.SendMessage("Não foi possível preparar as opções da Prediction. Ela foi cancelada e o desafio foi devolvido.", true, true);
            return false;
        }

        state.Mode = NormalizeMode(state.Mode);
        state.PredictionId = predictionId;
        state.ChallengerOutcomeId = mappedChallengerOutcomeId;
        state.TargetOutcomeId = mappedTargetOutcomeId;
        state.Status = "PREDICTION_OPEN";
        state.PredictionOpenedAtUtc = DateTime.UtcNow;
        Save(state);
        CPH.SetArgument("x1DuelId", state.DuelId);
        string label = state.Mode == "arena" ? "Arena X1" : "X1";
        CPH.SendMessage($"🎯 Prediction aberta para {label}: {state.Challenger.DisplayName} vs {state.Target.DisplayName}! Apostem seus Channel Points.", true, true);
        CPH.LogInfo(
            $"[X1] Prediction aberta: {state.PredictionId} | duelo {state.DuelId} | modo {state.Mode} | " +
            $"ordem outcomes={(outcomeOrderReversed ? "invertida" : "normal")}");
        return true;
    }

    private static string NormalizeMode(string mode) { return string.Equals(mode, "arena", StringComparison.OrdinalIgnoreCase) ? "arena" : "race"; }
    private static bool SameText(string a, string b)
    {
        return !string.IsNullOrWhiteSpace(a)
            && !string.IsNullOrWhiteSpace(b)
            && string.Equals(a.Trim(), b.Trim(), StringComparison.OrdinalIgnoreCase);
    }
    private static string LimitOutcomeTitle(string value)
    {
        string text = string.IsNullOrWhiteSpace(value) ? "Jogador" : value.Trim();
        return text.Length <= 25 ? text : text.Substring(0, 25);
    }
    private string ReadStringArg(params string[] names)
    {
        foreach (string name in names)
        {
            if (CPH.TryGetArg(name, out string value) && !string.IsNullOrWhiteSpace(value))
                return value;
        }
        return string.Empty;
    }
    private bool TryCancelPrediction(string predictionId)
    {
        if (string.IsNullOrWhiteSpace(predictionId)) return false;
        try
        {
            CPH.TwitchPredictionCancel(predictionId);
            CPH.LogInfo($"[X1] Prediction incompleta cancelada: {predictionId}");
            return true;
        }
        catch (Exception error)
        {
            CPH.LogError($"[X1] Erro cancelando Prediction incompleta: {error.Message}");
            return false;
        }
    }

    private void RefundRedemption(X1State state)
    {
        if (!string.IsNullOrWhiteSpace(state.RewardId) && !string.IsNullOrWhiteSpace(state.RedemptionId))
            CPH.TwitchRedemptionCancel(state.RewardId, state.RedemptionId);
    }

    private X1State Load() { string json = CPH.GetGlobalVar<string>(StateKey, false); return string.IsNullOrWhiteSpace(json) ? null : JsonConvert.DeserializeObject<X1State>(json); }
    private void Save(X1State state) { CPH.SetGlobalVar(StateKey, JsonConvert.SerializeObject(state), false); }
}

public class X1State
{
    public int ContractVersion { get; set; } public string Mode { get; set; } public string Status { get; set; } public string DuelId { get; set; }
    public X1User Challenger { get; set; } public X1User Target { get; set; }
    public DateTime CreatedAtUtc { get; set; } public DateTime ExpiresAtUtc { get; set; }
    public DateTime? PredictionOpenedAtUtc { get; set; } public DateTime? StartedAtUtc { get; set; } public DateTime? OverlayConfirmedAtUtc { get; set; }
    public string RewardId { get; set; } public string RedemptionId { get; set; }
    public string PredictionId { get; set; } public string ChallengerOutcomeId { get; set; } public string TargetOutcomeId { get; set; }
    public int Seed { get; set; } public bool ResultAnnounced { get; set; } public bool IsTest { get; set; }
}
public class X1User { public string Id { get; set; } public string Login { get; set; } public string DisplayName { get; set; } public string AvatarUrl { get; set; } }
