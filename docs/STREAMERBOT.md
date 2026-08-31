# Configuração do Streamer.bot - X1 Live v0.6

Este guia parte de uma instalação antiga funcional da Corrida e mostra exatamente o que manter, substituir e criar para adicionar o modo Arena sem reconstruir o X1.

O overlay chama as Actions internas através do WebSocket do Streamer.bot (`DoAction`). Não configure HTTP `/DoAction` para este projeto.

## 1. Filas existentes

Mantenha:

| Fila | Blocking |
|---|---|
| `X1-State` | ativado |
| `X1-Timers` | desativado |

## 2. Actions/códigos que permanecem sem alteração

Não troque estes C#:

- `01-normalizar-alvo.cs`
- `02-capturar-desafiante.cs`
- `05-negar.cs`
- `08-expirar-desafio.cs`
- `09-watchdog-inicio.cs`
- `11-cancelar-admin.cs`

## 3. Actions existentes em que somente o Execute C# Code deve ser substituído

Mantenha a Action, fila, trigger e demais sub-actions. Troque somente o conteúdo do `Execute C# Code` pelo arquivo indicado:

| Action existente | Novo arquivo |
|---|---|
| `X1 - Criar Desafio` | `03-criar-desafio.cs` |
| `X1 - Aceitar Desafio` - primeiro C# | `04-preparar-prediction.cs` |
| `X1 - Confirmar Inicio` | `06-confirmar-inicio.cs` |
| `X1 - Finalizar Partida` | `07-finalizar-partida.cs` |
| `X1 - Watchdog` - C# final | `10-watchdog-final.cs` |
| `X1 - Testar Overlay` | `12-testar-overlay.cs` |
| `X1 - Aceitar Desafio` - C# após Create Prediction | `13-registrar-prediction.cs` |
| `X1 - Aceitar Desafio` - C# após Get Active Prediction | `14-registrar-outcomes.cs` |
| `X1 - Iniciar Corrida` | `15-iniciar-corrida.cs` |

Marque `Precompile on Application Start` em todos os `Execute C# Code`.

## 4. Estrutura das Actions antigas após a troca

### `X1 - Criar Desafio`

Mantenha a estrutura já existente:

1. `Execute C# Code` -> `01-normalizar-alvo.cs`
2. `Twitch > User > Get User Info for Target` -> `%userName%`
3. `Execute C# Code` -> `02-capturar-desafiante.cs`
4. `Twitch > User > Get User Info for Target` -> `%x1TargetLogin%`
5. `Execute C# Code` -> **novo `03-criar-desafio.cs`**
6. `Run Action` -> `X1 - Expiracao`, `Run Action Immediately` desativado

A recompensa atual da Corrida continua ligada diretamente a esta Action. Não renomeie nem recrie essa recompensa apenas por causa da Arena.

### `X1 - Aceitar Desafio`

Mantenha:

1. `Execute C# Code` -> **novo `04-preparar-prediction.cs`**
2. `Create Prediction` - duração `30` segundos
3. `Execute C# Code` -> **novo `13-registrar-prediction.cs`**
4. `Get Active Prediction`
5. `Execute C# Code` -> **novo `14-registrar-outcomes.cs`**
6. `Run Action` -> `X1 - Timer Prediction`, `Run Action Immediately` desativado

### `X1 - Expiracao`

Sem alteração:

1. `Delay` -> `45000` ms
2. `Execute C# Code` -> `08-expirar-desafio.cs`

### `X1 - Iniciar Corrida`

Mantenha a Action e sua estrutura:

1. `Execute C# Code` -> **novo `15-iniciar-corrida.cs`**
2. `Run Action` -> `X1 - Watchdog`, `Run Action Immediately` desativado

O novo `15` gera automaticamente uma seed criptográfica e impede repetir imediatamente a seed da Corrida anterior.

### `X1 - Watchdog`

Mantenha:

1. `Delay` -> `8000` ms
2. `Execute C# Code` -> `09-watchdog-inicio.cs` sem alteração
3. `Delay` -> `47000` ms
4. `Execute C# Code` -> **novo `10-watchdog-final.cs`**

O C# final agora ignora Arena e só pode encerrar uma Corrida.

### `X1 - Confirmar Inicio`

- fila: `X1-State`
- sem trigger
- `Execute C# Code` -> **novo `06-confirmar-inicio.cs`**

É compartilhada por Corrida e Arena. O overlay a chama via WebSocket.

### `X1 - Finalizar Partida`

- fila: `X1-State`
- sem trigger
- `Execute C# Code` -> **novo `07-finalizar-partida.cs`**

É exclusiva da Corrida. Callback de Arena é recusado.

### `X1 - Testar Overlay`

Mantenha:

1. `Execute C# Code` -> **novo `12-testar-overlay.cs`**
2. `Run Action` -> `X1 - Watchdog`, `Run Action Immediately` desativado

Continua sendo teste da Corrida.

## 5. Única mudança estrutural numa Action existente

### `X1 - Timer Prediction`

Antes:

1. `Delay` -> `31000` ms
2. `Run Action` -> `X1 - Iniciar Corrida`

Depois:

1. `Delay` -> `31000` ms
2. `Run Action` -> **`X1 - Iniciar Partida`**, `Run Action Immediately` desativado

Não chame mais `X1 - Iniciar Corrida` diretamente pelo Timer.

## 6. Criar Action `X1 - Iniciar Partida`

- grupo sugerido: `X1 Live - Interno`
- fila: `X1-State`
- sem trigger
- Concurrent: desativado

Sub-action única:

1. `Execute C# Code` -> `17-iniciar-partida.cs`

Esta Action é o dispatcher:

- `race` -> `X1 - Iniciar Corrida`
- `arena` -> `Arena - Iniciar`

## 7. Criar Action `Arena - Criar Desafio`

- grupo sugerido: `X1 Live`
- fila: `X1-State`
- trigger: `Twitch > Channel Reward > Reward Redemption` da recompensa separada da Arena
- Concurrent: desativado

Sub-action única:

1. `Execute C# Code` -> `16-criar-desafio-arena.cs`

O C# define `x1Mode=arena` e reaproveita integralmente `X1 - Criar Desafio`.

## 8. Criar Action `Arena - Iniciar`

- grupo sugerido: `X1 Live - Interno`
- fila: `X1-State`
- sem trigger
- Concurrent: desativado

Sub-action única:

1. `Execute C# Code` -> `18-iniciar-arena.cs`

Esta Action gera a seed e envia ao overlay somente o contrato de infraestrutura: duelId, jogadores, modo e seed. Balanceamento, física, armas e tempos da Arena ficam no código do overlay.

O próprio C# chama `X1 - Watchdog` para o ACK e `Arena - Watchdog` para travamento físico. Não adicione Run Action extras aqui.

## 9. Criar Action `Arena - Watchdog`

- grupo sugerido: `X1 Live - Interno`
- fila: `X1-Timers`
- sem trigger

Sub-actions:

1. `Delay` -> `120000` ms
2. `Execute C# Code` -> `19-watchdog-arena.cs`

Esse limite de 2 minutos é deliberadamente técnico e folgado para deixar o balanceamento/física da Arena independentes. Só precisa ser revisto se um futuro design passar a permitir partidas normais acima de 2 minutos.

## 10. Criar Action `Arena - Finalizar Partida`

- grupo sugerido: `X1 Live - Interno`
- fila: `X1-State`
- sem trigger
- Concurrent: desativado

Sub-action única:

1. `Execute C# Code` -> `20-finalizar-arena.cs`

O finalizador valida contrato, duelId, modo, seed e vencedor. Ele não valida dano, arma, motivo físico ou relação entre tempo simulado e tempo real; portanto ajustes normais na Arena não exigem editar esta Action.

## 11. Recompensas

### Corrida

Mantenha a recompensa atual ligada a:

`X1 - Criar Desafio`

Sem wrapper e sem mudança de trigger.

### Arena

Crie/use uma recompensa separada, por exemplo `Desafiar Arena X1`, exigindo o nome do oponente como input.

Ligue o Reward Redemption somente a:

`Arena - Criar Desafio`

Aceitar, recusar, expiração, Prediction e cancelamento continuam compartilhados.

## 12. WebSocket do Streamer.bot

O overlay v0.6 usa WebSocket para receber eventos e para executar callbacks `DoAction`.

Confirme que o WebSocket Server do Streamer.bot está habilitado na porta configurada pelo overlay, normalmente `127.0.0.1:8080`.

Não crie trigger HTTP em `X1 - Confirmar Inicio`, `X1 - Finalizar Partida` ou `Arena - Finalizar Partida`.

## 13. Overlay

Use a pasta `overlay/` inteira desta mesma versão/branch. Não misture `streamerbot/actions` v0.6 com overlay v0.5.

Há uma única Browser Source do OBS. O GameManager escolhe internamente:

- `mode=race` -> `overlay/js/modes/race/`
- `mode=arena` -> `overlay/js/modes/arena/`

A Corrida continua isolada no módulo `race`; a Arena pode ser alterada posteriormente dentro do módulo `arena` sem mudar as Actions, desde que preserve o contrato `X1.Start` e o callback final com `duelId`, `winnerId`, `seed` e `contractVersion`.

## 14. Ordem obrigatória de teste

1. Com recompensa de produção ainda pausada, execute `X1 - Testar Overlay` manualmente.
2. Confirme que a Corrida abre e `X1 - Confirmar Inicio` é executada sem erro de HTTP.
3. Execute o teste de Corrida mais de uma vez e confirme seeds/mapas diferentes.
4. Faça um X1 real de Corrida com recompensa de custo baixo e confirme Prediction -> Corrida -> resolução.
5. Só então habilite a recompensa da Arena.
6. Faça um Arena X1 real e confirme Prediction -> dispatcher -> Arena -> finalizador da Arena.
7. Confirme no log que `X1 - Finalizar Partida` não foi usado pela Arena e que `Arena - Finalizar Partida` não foi usado pela Corrida.
8. Depois dos testes, exporte grupos/actions/filas pelo Streamer.bot e salve o backup.
