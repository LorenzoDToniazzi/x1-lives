using System;

public class CPHInline
{
    public bool Execute()
    {
        CPH.SetArgument("x1Mode", "arena");
        bool started = CPH.RunAction("X1 - Criar Desafio", true);
        if (!started) CPH.LogError("[ARENA] Não foi possível encaminhar o resgate para X1 - Criar Desafio.");
        return started;
    }
}
