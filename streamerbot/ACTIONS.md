# Mapa das Actions

Os nomes abaixo são parte do contrato. Use exatamente a mesma grafia.

| Action | Queue | Trigger | Sub-actions |
|---|---|---|---|
| X1 - Criar Desafio | X1-State | comando `!x1` | normalizar, buscar desafiante, capturar, buscar alvo, criar, agendar expiração |
| X1 - Aceitar Desafio | X1-State | comando `!aceitar` | aceitar/iniciar, agendar watchdog |
| X1 - Negar Desafio | X1-State | comando `!negar` | negar |
| X1 - Confirmar Inicio | X1-State | HTTP, sem trigger | confirmar início |
| X1 - Finalizar Partida | X1-State | HTTP, sem trigger | finalizar partida |
| X1 - Cancelar | X1-State | comando `!x1cancel` | cancelar admin |
| X1 - Testar Overlay | X1-State | sem trigger | testar overlay, agendar watchdog |
| X1 - Expiracao | X1-Timers | chamada interna | delay 45s, expirar |
| X1 - Watchdog | X1-Timers | chamada interna | delay 8s, watchdog início, delay 47s, watchdog final |

`X1-State` deve ser bloqueante. `X1-Timers` deve ser não bloqueante.
