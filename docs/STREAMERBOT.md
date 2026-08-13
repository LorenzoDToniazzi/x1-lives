# Configuração do Streamer.bot

Use os nomes das Actions exatamente como aparecem aqui. O overlay chama duas delas por nome através do HTTP Server.

## 1. Filas

Em `Actions & Queues > Queues`, crie:

| Fila | Blocking |
|---|---|
| `X1-State` | ativado |
| `X1-Timers` | desativado |

As Actions que alteram estado usam `X1-State`. Os delays usam `X1-Timers`, impedindo que um timer de 45 segundos bloqueie `!aceitar`.

## 2. Comandos

Crie estes comandos para Twitch:

| Nome | Comando | Modo | Permissão |
|---|---|---|---|
| X1 Desafiar | `!x1` | Starts With | Everyone |
| X1 Aceitar | `!aceitar` | Exact | Everyone |
| X1 Negar | `!negar` | Exact | Everyone |
| X1 Cancelar | `!x1cancel` | Exact | Moderator |

Não configure cooldown nos comandos. O núcleo controla o duelo ativo e o cooldown global de 60 segundos.

## 3. Action `X1 - Criar Desafio`

- Grupo: `X1 Live`
- Fila: `X1-State`
- Trigger: `Command Triggered` com `X1 Desafiar`
- Concurrent: desativado

Sub-actions, nesta ordem:

1. `Execute C# Code`: `01-normalizar-alvo.cs`.
2. `Twitch > User > Get User Info for Target`: User Login `%userName%`.
3. `Execute C# Code`: `02-capturar-desafiante.cs`.
4. `Twitch > User > Get User Info for Target`: User Login `%x1TargetLogin%`.
5. `Execute C# Code`: `03-criar-desafio.cs`.
6. `Core > Actions > Run Action`: `X1 - Expiracao`, com `Run Action Immediately` desativado.

Marque `Precompile on Application Start` nos Execute C# Code.

## 4. Action `X1 - Expiracao`

- Grupo: `X1 Live - Interno`
- Fila: `X1-Timers`
- Sem trigger

Sub-actions:

1. `Delay`: `45000` ms.
2. `Execute C# Code`: `08-expirar-desafio.cs`.

## 5. Action `X1 - Aceitar Desafio`

- Grupo: `X1 Live`
- Fila: `X1-State`
- Trigger: `Command Triggered` com `X1 Aceitar`

Sub-actions:

1. `Execute C# Code`: `04-aceitar-iniciar.cs`.
2. `Core > Actions > Run Action`: `X1 - Watchdog`, com `Run Action Immediately` desativado.

Se o C# rejeitar o aceite, ele retorna `false` e a Action para antes de agendar o watchdog.

## 6. Action `X1 - Watchdog`

- Grupo: `X1 Live - Interno`
- Fila: `X1-Timers`
- Sem trigger

Sub-actions:

1. `Delay`: `8000` ms.
2. `Execute C# Code`: `09-watchdog-inicio.cs`.
3. `Delay`: `47000` ms.
4. `Execute C# Code`: `10-watchdog-final.cs`.

Timers antigos são inofensivos: cada script compara o `duelId` agendado ao duelo ativo.

## 7. Action `X1 - Negar Desafio`

- Grupo: `X1 Live`
- Fila: `X1-State`
- Trigger: `Command Triggered` com `X1 Negar`

Sub-action única:

1. `Execute C# Code`: `05-negar.cs`.

## 8. Actions chamadas pelo overlay

Os nomes não podem ser alterados.

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

## 9. Action `X1 - Cancelar`

- Grupo: `X1 Live`
- Fila: `X1-State`
- Trigger: `Command Triggered` com `X1 Cancelar`
- Sub-action: `Execute C# Code` com `11-cancelar-admin.cs`.

## 10. Action `X1 - Testar Overlay`

- Grupo: `X1 Live`
- Fila: `X1-State`
- Sem trigger

Sub-actions:

1. `Execute C# Code`: `12-testar-overlay.cs`.
2. `Core > Actions > Run Action`: `X1 - Watchdog`, com `Run Action Immediately` desativado.

Execute essa Action pelo menu de contexto para testar a ida e volta completa sem depender do chat.

## 11. Exportação futura

Depois que todas as Actions compilarem e o teste real funcionar:

1. Selecione o grupo `X1 Live` e adicione-o ao Export.
2. Selecione `X1 Live - Interno` e adicione-o também.
3. Inclua os comandos e as filas.
4. Exporte para arquivo com versão `0.4.0`.
5. Salve o arquivo em `streamerbot/exports` no repositório.

O export só deve ser criado depois do primeiro teste na instalação real, porque é a própria aplicação que gera e valida o formato de importação.

