# Mapa das Actions v0.6

Os nomes abaixo fazem parte do contrato entre Streamer.bot e overlay. Use exatamente a mesma grafia.

## Filas

| Fila | Blocking |
|---|---|
| `X1-State` | ativado |
| `X1-Timers` | desativado |

## Actions compartilhadas

| Action | Queue | Trigger | Responsabilidade |
|---|---|---|---|
| `X1 - Criar Desafio` | X1-State | recompensa atual da Corrida | criar estado do duelo; modo padrão `race` |
| `X1 - Aceitar Desafio` | X1-State | `!aceitarx1` | criar Prediction e agendar timer |
| `X1 - Recusar Desafio` | X1-State | `!recusarx1` | recusar e concluir reward |
| `X1 - Expiracao` | X1-Timers | chamada interna | expiração segura |
| `X1 - Timer Prediction` | X1-Timers | chamada interna | aguardar Prediction e chamar dispatcher |
| `X1 - Iniciar Partida` | X1-State | chamada interna | rotear `race` para Corrida e `arena` para Arena |
| `X1 - Confirmar Inicio` | X1-State | chamada pelo overlay via WebSocket `DoAction` | confirmar ACK de qualquer modo |
| `X1 - Watchdog` | X1-Timers | chamada interna | ACK compartilhado + timeout físico apenas da Corrida |
| `X1 - Cancelar` | X1-State | `!x1cancel` | cancelar duelo/Prediction |

## Corrida

| Action | Queue | Trigger | Responsabilidade |
|---|---|---|---|
| `X1 - Iniciar Corrida` | X1-State | dispatcher | gerar seed nova e enviar `X1.Start mode=race` |
| `X1 - Finalizar Partida` | X1-State | overlay via WebSocket `DoAction` | validar resultado da Corrida e resolver Prediction |
| `X1 - Testar Overlay` | X1-State | manual | teste da Corrida sem reward/Prediction |

## Arena

| Action | Queue | Trigger | Responsabilidade |
|---|---|---|---|
| `Arena - Criar Desafio` | X1-State | recompensa separada da Arena | definir `x1Mode=arena` e reutilizar `X1 - Criar Desafio` |
| `Arena - Iniciar` | X1-State | dispatcher | gerar seed e enviar contrato mínimo `X1.Start mode=arena` |
| `Arena - Watchdog` | X1-Timers | chamada interna | cancelar somente Arena travada |
| `Arena - Finalizar Partida` | X1-State | overlay via WebSocket `DoAction` | validar identidade/vencedor e resolver Prediction |

A física e o balanceamento da Arena pertencem exclusivamente a `overlay/js/modes/arena/`. As Actions não enviam dano, velocidade, armas, shrink ou limites de simulação para o jogo.

Consulte `docs/STREAMERBOT.md` para a ordem exata das sub-actions e o roteiro de migração.
