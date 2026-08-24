# Mapa das Actions v0.5

Os nomes abaixo são parte do contrato. Use exatamente a mesma grafia.

| Action | Queue | Trigger | Responsabilidade |
|---|---|---|---|
| X1 - Criar Desafio | X1-State | reward `Chamar para o x1` | normalizar, buscar usuários, validar e agendar expiração |
| X1 - Aceitar Desafio | X1-State | `!aceitarx1` | criar Prediction, registrar outcomes e agendar timer |
| X1 - Recusar Desafio | X1-State | `!recusarx1` | recusar e concluir o reward |
| X1 - Iniciar Corrida | X1-State | chamada interna | gerar seed e enviar `X1.Start` |
| X1 - Confirmar Inicio | X1-State | HTTP, sem trigger | validar overlay e enviar `X1.Ack` |
| X1 - Finalizar Partida | X1-State | HTTP, sem trigger | validar vencedor e resolver Prediction |
| X1 - Cancelar | X1-State | `!x1cancel` | cancelar overlay/Prediction e reembolsar |
| X1 - Testar Overlay | X1-State | sem trigger | teste sem reward e sem Prediction |
| X1 - Expiracao | X1-Timers | chamada interna | delay 45s e expiração segura |
| X1 - Timer Prediction | X1-Timers | chamada interna | aguardar 31s e iniciar corrida |
| X1 - Watchdog | X1-Timers | chamada interna | watchdog de início e conclusão |

`X1-State` deve ser bloqueante. `X1-Timers` deve ser não bloqueante.

Consulte `docs/STREAMERBOT.md` para a ordem exata das sub-actions.
