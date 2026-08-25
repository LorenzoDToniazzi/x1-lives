using System;

public class CPHInline
{
    public bool Execute()
    {
        CPH.TryGetArg("addTargetResult", out bool found);
        if (!found)
        {
            CPH.LogError("[X1] Não foi possível carregar os dados do desafiante");
            return false;
        }

        Copy("targetUserId", "x1ChallengerId");
        Copy("targetUserName", "x1ChallengerLogin");
        Copy("targetUser", "x1ChallengerDisplayName");
        Copy("targetUserProfileImageUrl", "x1ChallengerAvatarUrl");
        return true;
    }

    private void Copy(string source, string destination)
    {
        CPH.TryGetArg(source, out string value);
        CPH.SetArgument(destination, value ?? string.Empty);
    }
}
