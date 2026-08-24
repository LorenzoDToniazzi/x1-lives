# X1 Live

Overlay local para duelos interativos na Twitch. O primeiro modo é uma corrida física de duas bolinhas, com nomes e avatares reais, seed reproduzível e vencedor definido pela simulação.

## Estado do projeto

Esta versão contém a V1 integrada da corrida:

- recompensa oficial de Channel Points com texto obrigatório;
- `!aceitarx1` e `!recusarx1`;
- Prediction oficial de 30 segundos, resolvida pelo vencedor da corrida;
- viewer contra viewer, viewer contra streamer e streamer contra viewer;
- desafio com expiração em 45 segundos;
- somente um duelo ativo;
- cooldown global de 60 segundos após uma corrida concluída;
- overlay transparente no OBS quando está ocioso;
- comunicação local com o Streamer.bot por HTTP e WebSocket;
- confirmação de início, callback do vencedor, cancelamento e watchdogs;
- 11 módulos de obstáculos, com 6 escolhidos por seed;
- testes de protocolo e física.

A arena não faz parte desta versão. O núcleo do overlay já registra modos separadamente para que ela seja adicionada depois sem reescrever a integração.

## Instalação

Siga [docs/INSTALACAO.md](docs/INSTALACAO.md). A configuração detalhada das Actions está em [docs/STREAMERBOT.md](docs/STREAMERBOT.md).

## Desenvolvimento

Requer Node.js 20 ou superior apenas para testes e desenvolvimento. O uso normal na live não requer Node.js.

```bash
npm install
npm test
npm run serve
```

Abra `http://127.0.0.1:7474/?controls=1&autostart=1` para testar somente a corrida. Na instalação real, os arquivos são servidos pelo próprio Streamer.bot.

## Segurança

O projeto não inclui tokens, senhas ou credenciais da Twitch. O HTTP e o WebSocket devem permanecer ligados apenas a `127.0.0.1`.
