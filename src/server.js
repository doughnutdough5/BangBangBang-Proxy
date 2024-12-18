import net from 'net';
import { GAME_HOST, GAME_PORT, LOBBY_HOST, LOBBY_PORT, PROXY_HOST, PROXY_PORT } from './constant/env.js';

// env에 넣기
const SERVERS = {
  lobby: { host: LOBBY_HOST, port: LOBBY_PORT },
  game: { host: GAME_HOST, port: GAME_PORT },
};

const proxyServer = net.createServer((clientSocket) => {
  console.log(`클라이언트가 연결됨: ${clientSocket.remoteAddress}`);
  
  let targetServer = null;
  let isFirstPacket = true;
  let buffer = Buffer.alloc(0);

  clientSocket.on('data', (data) => {
    buffer = Buffer.concat([buffer, data]);

    if (buffer.length < 6) {
      return;
    }

    const roomState = data.readUInt16BE(0);
    console.log(`roomState: ${roomState}`);
    const roomId = data.readUInt32BE(2);
    console.log(`roomId: ${roomId}`);

    if (roomState === 0) {
      targetServer = SERVERS.lobby;
    } else if (roomState !== 0) {
      targetServer = SERVERS.game;
    } else {
      clientSocket.end('Invalid header. Disconnect Socket');
      return;
    }

    // 로비서버만 테스트 해봄.
    // 연결이 끊기는지부터 봐야되고
    // 1. 만약 연결이 끊겨서 clientSocket 자체가 바뀌면 isFirstPacket이 다시 true가 되고 대상 서버에 연결
    // 2. 만약 안끊기고 패킷에 따라 알아서 간다 치면 아래의 if문에 조건 추가 필요함.
    if (!isFirstPacket) {
      return;
    }
    // 대상 서버에 연결
    console.log(`선택된 서버: ${targetServer.host}:${targetServer.port}`);
    const serverSocket = net.connect(targetServer.port, targetServer.host, () => {
      console.log('대상 서버에 연결되었습니다');
      isFirstPacket = false;
      // 데이터를 그대로 대상 서버에 전달
      serverSocket.write(data);

      clientSocket.pipe(serverSocket);
      serverSocket.pipe(clientSocket);
    });

    serverSocket.on('error', (err) => {
      console.error(`서버 연결 오류: ${err.message}`);
      clientSocket.end('대상 서버 연결 실패');
    });

    clientSocket.on('error', (err) => {
      console.error(`클라이언트 소켓 오류: ${err.message}`);
    });

    clientSocket.on('close', () => {
      console.log('클라이언트 연결 종료');
    });
  });
});

proxyServer.listen(PROXY_PORT, PROXY_HOST, () => {
  console.log(`TCP 프록시 서버가 포트 ${PROXY_PORT}에서 시작됨.`);
});
