# Protocolo local X1 Live v4

## Transporte

- Streamer.bot para overlay: WebSocket `ws://127.0.0.1:8080/`, evento `General.Custom`.
- Overlay para Streamer.bot: `POST /DoAction` no HTTP Server local, porta 7474.
- Arquivos do overlay: HTTP Server local do Streamer.bot.

Nenhum dado do duelo é enviado a um backend próprio.

## Estados

```text
WAITING_ACCEPT -> PREDICTION_CREATING -> PREDICTION_OPEN -> STARTING -> ANIMATING -> FINALIZING -> IDLE
```

Expiração, negação, falha de ACK, watchdog ou cancelamento administrativo limpam o estado e retornam a `IDLE`.

## Eventos

### `X1.Start`

Enviado depois que o desafiado usa `!aceitarx1` e a janela da Prediction termina. Contém `duelId`, `seed`, modo e os dois participantes.

### `X1.Ack`

Enviado pelo Streamer.bot após validar o callback de confirmação. A corrida só começa depois desse ACK.

### `X1.Cancel`

Interrompe a corrida cujo `duelId` corresponde ao duelo ativo.

## Callbacks HTTP

- `X1 - Confirmar Inicio`
- `X1 - Finalizar Partida`

O resultado final inclui vencedor, seed, tempo real, tempo simulado e motivo. O Streamer.bot valida todos os campos, rejeita callbacks atrasados ou duplicados e resolve o outcome da Prediction associado ao `winnerId`.
