# Configuração do Streamer.bot - X1 Live v0.5

Este guia usa a recompensa da Twitch para criar o desafio, os comandos `!aceitarx1` e `!recusarx1` para responder e uma Prediction oficial de 30 segundos antes da corrida.

Use os nomes das Actions exatamente como aparecem aqui. O overlay chama `X1 - Confirmar Inicio` e `X1 - Finalizar Partida` por nome através do HTTP Server.

## 1. Recompensa

Crie a recompensa em `Platforms > Twitch > Channel Point Rewards` pelo próprio Streamer.bot:

| Campo | Valor de teste |
|---|---|
| Nome | `Chamar para o x1` |
| Enabled | desativado até concluir a configuração |
| Paused | ativado |
| Cost | `1` |
| User Input Required | ativado |
| Description / Prompt | `Informe o nome do usuário que deseja convidar. Exemplo: Fulano` |
| Redemption Skips Queue | desativado |
| Global Cooldown | `60` segundos |
| Grupo | `X1 Live` |

O bot mantém o resgate pendente. Falhas técnicas e entradas inválidas são reembolsadas; desafios válidos são concluídos ao terminar, expirar ou serem recusados.

## 2. Filas

Em `Actions & Queues > Queues`, crie:

| Fila | Blocking |
|---|---|
| `X1-State` | ativado |
| `X1-Timers` | desativado |

Os delays nunca ficam na fila bloqueante.

## 3. Comandos

| Nome | Comando | Modo | Permissão |
|---|---|---|---|
| X1 Aceitar | `!aceitarx1` | Exact | Everyone |
| X1 Recusar | `!recusarx1` | Exact | Everyone |
| X1 Cancelar | `!x1cancel` | Exact | Moderator |

Não configure cooldown nos comandos. O estado global do X1 controla concorrência e cooldown.

## 4. Action `X1 - Criar Desafio`

- Grupo: `X1 Live`
- Fila: `X1-State`
- Trigger: `Twitch > Channel Reward > Reward Redemption`, selecionando a recompensa `Chamar para o x1` que você criou
- Concurrent: desativado

Sub-actions, nesta ordem:

1. `Execute C# Code`: `01-normalizar-alvo.cs`.
2. `Twitch > User > Get User Info for Target`: User Login `%userName%`.
3. `Execute C# Code`: `02-capturar-desafiante.cs`.
4. `Twitch > User > Get User Info for Target`: User Login `%x1TargetLogin%`.
5. `Execute C# Code`: `03-criar-desafio.cs`.
6. `Core > Actions > Run Action`: `X1 - Expiracao`, com `Run Action Immediately` desativado.

Marque `Precompile on Application Start` em todos os `Execute C# Code`.

## 5. Action `X1 - Expiracao`

- Grupo: `X1 Live - Interno`
- Fila: `X1-Timers`
- Sem trigger

Sub-actions:

1. `Delay`: `45000` ms.
2. `Execute C# Code`: `08-expirar-desafio.cs`.

## 6. Action `X1 - Aceitar Desafio`

- Grupo: `X1 Live`
- Fila: `X1-State`
- Trigger: comando `X1 Aceitar`

Sub-actions, nesta ordem:

1. `Execute C# Code`: `04-preparar-prediction.cs`.
2. `Twitch > Predictions > Create Prediction`:
   - Title: `%x1PredictionTitle%`
   - First Option: `%x1ChallengerTitle%`
   - Second Option: `%x1TargetTitle%`
   - Duration: `30` segundos
3. `Execute C# Code`: `13-registrar-prediction.cs`.
4. `Twitch > Predictions > Get Active Prediction`.
5. `Execute C# Code`: `14-registrar-outcomes.cs`.
6. `Core > Actions > Run Action`: `X1 - Timer Prediction`, com `Run Action Immediately` desativado.

Se qualquer C# retornar `false`, a execução para antes da próxima sub-action.

## 7. Action `X1 - Timer Prediction`

- Grupo: `X1 Live - Interno`
- Fila: `X1-Timers`
- Sem trigger

Sub-actions:

1. `Delay`: `31000` ms.
2. `Core > Actions > Run Action`: `X1 - Iniciar Corrida`, com `Run Action Immediately` desativado.

## 8. Action `X1 - Iniciar Corrida`

- Grupo: `X1 Live - Interno`
- Fila: `X1-State`
- Sem trigger

Sub-actions:

1. `Execute C# Code`: `15-iniciar-corrida.cs`.
2. `Core > Actions > Run Action`: `X1 - Watchdog`, com `Run Action Immediately` desativado.

## 9. Action `X1 - Watchdog`

- Grupo: `X1 Live - Interno`
- Fila: `X1-Timers`
- Sem trigger

Sub-actions:

1. `Delay`: `8000` ms.
2. `Execute C# Code`: `09-watchdog-inicio.cs`.
3. `Delay`: `47000` ms.
4. `Execute C# Code`: `10-watchdog-final.cs`.

Timers antigos são inofensivos porque todos comparam o `duelId` agendado ao duelo ativo.

## 10. Action `X1 - Recusar Desafio`

- Grupo: `X1 Live`
- Fila: `X1-State`
- Trigger: comando `X1 Recusar`
- Sub-action: `Execute C# Code` com `05-negar.cs`.

## 11. Actions chamadas pelo overlay

### `X1 - Confirmar Inicio`

- Grupo: `X1 Live - Interno`
- Fila: `X1-State`
- Sem trigger
- Sub-action: `Execute C# Code` com `06-confirmar-inicio.cs`.

### `X1 - Finalizar Partida`

- Grupo: `X1 Live - Interno`
- Fila: `X1-State`
- Sem trigger
- Sub-action: `Execute C# Code` com `07-finalizar-partida.cs`.

O finalizador converte o `winnerId` retornado pela corrida no outcome correspondente e resolve a Prediction oficial.

## 12. Action `X1 - Cancelar`

- Grupo: `X1 Live`
- Fila: `X1-State`
- Trigger: comando `X1 Cancelar`
- Sub-action: `Execute C# Code` com `11-cancelar-admin.cs`.

O cancelamento administrativo também cancela a Prediction e reembolsa os apostadores.

## 13. Action `X1 - Testar Overlay`

- Grupo: `X1 Live`
- Fila: `X1-State`
- Sem trigger

Sub-actions:

1. `Execute C# Code`: `12-testar-overlay.cs`.
2. `Core > Actions > Run Action`: `X1 - Watchdog`, com `Run Action Immediately` desativado.

Esse teste não cria Prediction nem consome recompensa.

## 14. Ordem de teste

1. Execute manualmente `X1 - Testar Overlay`.
2. Confirme a ida e volta no log.
3. Ative e despause a recompensa mantendo custo `1`.
4. Resgate usando uma segunda conta e informe outro usuário válido.
5. Aceite com a conta desafiada.
6. Confirme que a Prediction abre por 30 segundos.
7. Confirme que a corrida aparece e a Prediction é resolvida.
8. Só depois aumente o custo de produção.

## 15. Exportação

Depois que todas as Actions compilarem e o teste real funcionar, exporte os grupos, comandos e filas pela própria instalação do Streamer.bot e salve o export em `streamerbot/exports`.
