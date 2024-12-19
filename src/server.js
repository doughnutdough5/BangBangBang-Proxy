import {
  GAME_HOST,
  GAME_PORT,
  LOBBY_HOST,
  LOBBY_PORT,
  PROXY_HOST,
  PROXY_PORT,
} from './constant/env.js';
import TcpProxy from './class/TcpProxy.js';

const SERVERS = {
  lobby: { host: LOBBY_HOST, port: LOBBY_PORT },
  game: { host: GAME_HOST, port: GAME_PORT },
};

const proxy = new TcpProxy(
  PROXY_PORT,
  [SERVERS.lobby.host, SERVERS.game.host],
  [SERVERS.lobby.port, SERVERS.game.port],
  {
    hostname: PROXY_HOST,
    upstream: (context, data) => {
      // 헤더 기반으로 어떻게 포워딩 할지 결정하는 로직
      const header = data.readUInt16BE(0);
      console.log(`RoomState: ${header}`);
      if (header === 0) {
        console.log('Routing to lobby server');
        proxy.serviceHostIndex = 0; // Lobby
      } else if (header === 1) {
        console.log('Routing to game server');
        proxy.serviceHostIndex = 1; // Game
      }
      return data;
    },
  },
);

console.log(`Proxy server listening on ${PROXY_HOST}:${PROXY_PORT}`);
