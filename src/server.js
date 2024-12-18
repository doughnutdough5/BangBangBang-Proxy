import net from 'net';
import { GAME_HOST, GAME_PORT, LOBBY_HOST, LOBBY_PORT, PROXY_HOST, PROXY_PORT } from './constant/env.js';

// env에 넣기
const SERVERS = {
  lobby: { host: LOBBY_HOST, port: LOBBY_PORT },
  game: { host: GAME_HOST, port: GAME_PORT },
};

const proxyServer = net.createServer((clientSocket) => {
  console.log(`클라이언트가 연결됨: ${clientSocket.remoteAddress}`);

  let targetServer = null;        // 현재 연결된 대상 서버
  let currentServerSocket = null; // 현재 대상 서버의 소켓
  let buffer = Buffer.alloc(0);

  clientSocket.on('data', (data) => {
    buffer = Buffer.concat([buffer, data]);

    // 최소 6바이트가 들어올 때까지 기다림
    if (buffer.length < 6) {
      return;
    }

    const roomState = buffer.readUInt16BE(0);
    // console.log(`roomState: ${roomState}`);
    const roomId = buffer.readUInt32BE(2);
    // console.log(`roomId: ${roomId}`);

    const newTargetServer = roomState === 0 ? SERVERS.lobby : SERVERS.game;

    if (!targetServer || newTargetServer !== targetServer) {
      targetServer = newTargetServer;

      // 기존 연결 종료
      if (currentServerSocket) {
        console.log('기존 서버와의 연결 종료');
        clientSocket.unpipe(currentServerSocket); // pipe 연결 해제
        currentServerSocket.end();
        currentServerSocket = null;
      }

      console.log(`선택된 서버: ${targetServer.host}:${targetServer.port}`);
      currentServerSocket = net.connect(targetServer.port, targetServer.host, () => {
        console.log('타겟 서버에 연결되었습니다');

        currentServerSocket.write(buffer);

        clientSocket.pipe(currentServerSocket);
        currentServerSocket.pipe(clientSocket);

        buffer = Buffer.alloc(0);
      });

      currentServerSocket.on('error', (err) => {
        console.error(`타겟 서버 연결 오류: ${err.message}`);
        clientSocket.end('타켓 서버 연결 실패');
      });

      currentServerSocket.on('close', () => {
        console.log('타겟 서버 소켓 종료');
        targetServer = null;
      });

      clientSocket.on('error', (err) => {
        console.error(`클라이언트 소켓 오류: ${err.message}`);
      });
    
      clientSocket.on('close', () => {
        console.log('클라이언트 연결 종료');
      });
    }
  });
});

proxyServer.listen(PROXY_PORT, PROXY_HOST, () => {
  console.log(`TCP 프록시 서버가 포트 ${PROXY_PORT}에서 시작됨.`);
});
