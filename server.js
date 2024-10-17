const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const cors = require('cors');  // CORS 패키지 추가

// CORS 미들웨어 추가
app.use(cors({
  origin: 'http://localhost:3000',  // React 앱에서 요청을 허용할 도메인
  methods: ['GET', 'POST'],
  credentials: false  // 인증 관련 설정(예: 쿠키)
}));

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',  // CORS 허용 도메인 설정
    methods: ['GET', 'POST'],
    credentials: true  // 인증 정보 허용 설정
  }
});

app.use(express.json());  // JSON 데이터를 파싱하기 위한 미들웨어 설정

// 클라이언트가 접속했을 때 HTML 파일 서빙
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Spring Boot에서 경매 데이터를 받는 엔드포인트
app.post('/send-auction', (req, res) => {
  const auctionData = req.body;
  console.log('Received auction data from Spring Boot:', auctionData);

  // 받은 데이터를 WebSocket을 통해 모든 클라이언트에 전달
  io.emit('auction update', auctionData);
  console.log('Auction data sent to clients via WebSocket:', auctionData);  // WebSocket으로 데이터를 보내기 전에 로그를 확인

  res.send('Auction data sent to WebSocket clients');
});

// WebSocket 연결 관리
io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('disconnect', () => {
      console.log('User disconnected');
    });
});

// 서버 시작
server.listen(3001, () => {
  console.log('Listening on *:3001');
});
