using System;

public class CPHInline
{
    public bool Execute()
    {
        CPH.TryGetArg("rawInput", out string rawTarget);
        if (string.IsNullOrWhiteSpace(rawTarget))
            CPH.TryGetArg("input0", out rawTarget);

        string targetLogin = (rawTarget ?? string.Empty).Trim().TrimStart('@').ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(targetLogin))
        {
            RefundRedemption();
            CPH.SendMessage("Informe o nome do usuário que deseja desafiar.", true, true);
            CPH.LogInfo("[X1] Resgate sem usuário-alvo");
            return false;
        }

        CPH.SetArgument("x1TargetLogin", targetLogin);
        return true;
    }

    private void RefundRedemption()
    {
        CPH.TryGetArg("rewardId", out string rewardId);
        CPH.TryGetArg("redemptionId", out string redemptionId);
        if (!string.IsNullOrWhiteSpace(rewardId) && !string.IsNullOrWhiteSpace(redemptionId))
            CPH.TwitchRedemptionCancel(rewardId, redemptionId);
    }
}
