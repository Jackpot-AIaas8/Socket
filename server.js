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

// 경매 데이터를 받는 엔드포인트
app.post('/send-auction', (req, res) => {
  const auctionData = req.body;
 
  if(req.body.auctionStatus === 1){
    startAuctionTimer();
  }

  // 받은 데이터를 WebSocket을 통해 모든 클라이언트에 전달
  io.emit('auction update', auctionData);

  res.send('Auction data sent to WebSocket clients');
});

// 입찰 데이터를 받는 엔드포인트
app.post('/send-bid', (req, res) => {
  const bidData = req.body;  // 입찰 데이터를 받음
  console.log("bidDaga : " + bidData.auctionId);
  // WebSocket을 통해 모든 클라이언트에게 입찰 데이터를 전송
  io.emit('bid update', bidData);  // 'bid update' 이벤트로 입찰 데이터를 전송

  timeLeft = 30; // 타이머를 다시 240초로 설정
  if (auctionTimer) {
    clearInterval(auctionTimer); // 기존 타이머 종료
    isTimerRunning = false;
  }
  startAuctionTimer(bidData.auctionId); // 새로운 타이머 시작
  res.send('Bid data sent to WebSocket clients');
});

app.post('/end-auction', (req, res) => {
  const auctionId = req.body.auctionId;
  const auctionStatus = req.body.auctionStatus;
  console.log(`Received auctionId: ${auctionId} for auction end`);
  if (!auctionId || !auctionStatus) {
    console.log('auctionId or auctionStatus is missing.');
    res.status(400).send('auctionId or auctionStatus is missing.');
    return;
  }

  // 경매 종료 로직 실행
  endAuction(auctionId, auctionStatus);

  res.send('Auction end data received');
});

app.post('/last-bidder', (req, res) => {
  console.log(req.body);
  const winner = req.body.memberName;
  console.log(`경매 종료, 낙찰자: ${winner}`);

  // 모든 사용자에게 낙찰자 정보 전송
  io.emit('last bidder', { winner });

  res.send('Auction end data received');
});

const endAuction = (auctionId, auctionStatus) => {
  console.log("받은 id 값 : " + auctionId + "받은 status 값 : " + auctionStatus);
  if (auctionStatus === 2) {
    console.log(`경매 ${auctionId}는 이미 종료되었습니다.`);
    return;  // 경매가 이미 종료된 경우 더 이상 처리하지 않음
  }

  console.log(`경매 ${auctionId} 종료.`);
};

let auctionTimer; // 타이머 변수
let timeLeft = 30; // 4분 = 240초
let isTimerRunning = false; // 타이머 실행 여부

const startAuctionTimer = (auctionId) => {
  if (isTimerRunning) {
    console.log("타이머가 이미 실행 중입니다.");
    return; // 타이머가 이미 실행 중이면 새로 시작하지 않음
  }

  console.log("타이머 시작");
  isTimerRunning = true;

  auctionTimer = setInterval(() => {
    if (timeLeft > 0) {
      timeLeft--; // 1초씩 줄임
      console.log(timeLeft);
      io.emit('timer update', timeLeft); // 남은 시간 클라이언트에 전송
    } else {
      clearInterval(auctionTimer); // 시간이 다 되면 타이머 종료
      endAuction(auctionId); // 경매 종료 함수 호출
      isTimerRunning = false; // 타이머 종료
    }
  }, 1000); // 1초마다 실행
};

io.use((socket, next) => {
  const path = socket.handshake.query.path;

  if (path === '/auction/bid') {
    next(); // 경로가 /auction/bid이면 연결 허용
  } else {
    const err = new Error('Unauthorized');
    next(err); // 경로가 일치하지 않으면 연결 거부
  }
});

// WebSocket 연결 관리
io.on('connection', (socket) => {
  console.log('A user connected'); 
  
  socket.emit('timer update', timeLeft);

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// 서버 시작
server.listen(3001, () => {
  console.log('Listening on *:3001');
});
