# Instalação do X1 Live

Este guia considera Streamer.bot 1.0.7 ou uma versão estável mais recente e OBS Studio 28 ou superior.

## 1. Baixar os programas

1. Baixe o Streamer.bot em <https://streamer.bot/downloads>.
2. Extraia o ZIP para uma pasta local, por exemplo `C:\Streamer.bot`.
3. Não coloque a pasta no OneDrive, Google Drive ou outro diretório sincronizado.
4. Abra `Streamer.bot.exe` normalmente, sem executar como administrador.
5. Mantenha o OBS atualizado.

## 2. Baixar o X1 Live

Você pode clonar o repositório ou baixar `Code > Download ZIP`. Extraia em uma pasta permanente, por exemplo:

```text
C:\X1-Live
```

Não mova essa pasta depois de configurar o mapeamento HTTP.

## 3. Conectar a Twitch

1. No Streamer.bot, abra `Platforms > Twitch`.
2. Conecte sua conta principal como `Broadcaster`.
3. A conta separada de bot é opcional. Sem ela, as mensagens são enviadas pela conta principal.
4. Confirme que a conta e o EventSub estão conectados. As versões 1.0.5+ não usam mais o antigo Twitch IRC.

## 4. Ativar os servidores locais

### WebSocket

Em `Servers/Clients > WebSocket Server`:

- Host: `127.0.0.1`
- Porta: `8080`
- Endpoint: `/`
- Authentication: desativada
- Auto Start: ativado
- Status: iniciado

### HTTP

Em `Servers/Clients > HTTP Server`:

- Host: `127.0.0.1`
- Porta: `7474`
- Auto Start: ativado
- Mapping Path: `/`
- Mapping Folder: `C:\X1-Live\overlay`

Inicie o servidor e abra `http://127.0.0.1:7474/?controls=1&autostart=1`. A corrida de demonstração deve aparecer.

Se o mapeamento `/` não for aceito pela interface, use o campo vazio como raiz. Não use `/x1`, porque os callbacks HTTP do overlay usam `/DoAction` no mesmo servidor.

## 5. Criar as Actions

Siga [STREAMERBOT.md](STREAMERBOT.md) exatamente. Os arquivos C# ficam em `streamerbot/actions`.

## 6. Configurar o OBS

1. Em sua cena, adicione `Fonte > Navegador`.
2. Nome: `X1 Live - Corrida`.
3. URL: `http://127.0.0.1:7474/?controls=0&autostart=0`.
4. Largura: `1080`.
5. Altura: `1080`.
6. FPS: `60`.
7. Desative `Desligar fonte quando não estiver visível`.
8. Desative `Atualizar navegador quando a cena se tornar ativa`.
9. Redimensione pelo transform do OBS, mantendo a resolução interna.

Não é necessário conectar o Streamer.bot ao WebSocket do OBS para a primeira versão. O overlay e a Browser Source funcionam de forma independente dessa integração.

## 7. Testar sem live

1. Deixe Streamer.bot, HTTP Server, WebSocket Server e OBS abertos.
2. Execute manualmente a Action `X1 - Testar Overlay`.
3. Verifique se a corrida aparece e termina.
4. No log do Streamer.bot, procure:

```text
[X1 TESTE] Evento enviado
[X1] Overlay confirmou início
[X1] Finalizado
```

Depois, teste o fluxo oficial com uma recompensa de custo `1`:

```text
Resgate Chamar para o x1 -> informe Fulano -> Fulano usa !aceitarx1
```

## 8. Uso normal

- a recompensa `Chamar para o x1` cria um desafio;
- `!aceitarx1`: somente o alvo aceita;
- `!recusarx1`: somente o alvo recusa;
- `!x1cancel`: streamer ou moderador cancela um duelo travado.

Viewer contra viewer, viewer contra streamer e streamer contra viewer são permitidos. Auto-desafio e desafio contra uma conta separada de bot são bloqueados.
