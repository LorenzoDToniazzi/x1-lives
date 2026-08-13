using System;

public class CPHInline
{
    public bool Execute()
    {
        CPH.TryGetArg("input0", out string rawTarget);
        string targetLogin = (rawTarget ?? string.Empty).Trim().TrimStart('@').ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(targetLogin))
        {
            CPH.SendMessage("Use !x1 @usuario.", true, true);
            CPH.LogInfo("[X1] Comando sem usuário-alvo");
            return false;
        }

        CPH.SetArgument("x1TargetLogin", targetLogin);
        return true;
    }
}
