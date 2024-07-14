const express = require('express');
const mongoose = require('mongoose');
const socketIo = require('socket.io');
const http = require('http');
const Game = require('./models/Game');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: 'http://172.20.10.5:4200',
    methods: ['GET', 'POST']
  }
});

app.use(express.json());
app.use(cors({
  origin: 'http://172.20.10.5:4200',
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['X-Requested-With', 'content-type'],
  credentials: true
}));

mongoose.connect('mongodb+srv://numberGuessingBackend:NumberGuessing4850@numberguessing.uvurya9.mongodb.net/?retryWrites=true&w=majority&appName=NumberGuessing', { useNewUrlParser: true, useUnifiedTopology: true });

const isValidNumber = (number) => {
  const regex = /^[1-9][0-9]{3}$/;
  return regex.test(number);
};

app.post('/api/games', async (req, res) => {
  const { gameName, player1Name, player1Number } = req.body;
  const game = new Game({ gameName, player1Name, player1Number, guesses: [], status: 'Waiting' });
  await game.save();
  res.status(201).json(game);
});

app.post('/api/games/join', async (req, res) => {
  const { gameName, player2Name, player2Number } = req.body;
  if (!isValidNumber(player2Number)) {
    return res.status(400).json({ message: 'Invalid number. It must be a 4-digit number without starting with 0.' });
  }

  const game = await Game.findOne({ gameName });
  if (!game) {
    return res.status(404).json({ message: 'Game not found' });
  }

  if (game.status !== 'Waiting') {
    return res.status(400).json({ message: 'Game is not available for joining' });
  }

  game.player2Name = player2Name;
  game.player2Number = player2Number;
  game.status = 'Playing';
  await game.save();

  io.to(gameName).emit('playerJoined', { game });

  res.status(200).json(game);
});

app.post('/api/games/:gameName/guesses', async (req, res) => {
  const { gameName } = req.params;
  const { player, guess } = req.body;
  if (!isValidNumber(guess)) {
    return res.status(400).json({ message: 'Invalid number. It must be a 4-digit number without starting with 0.' });
  }

  const game = await Game.findOne({ gameName });
  if (!game) {
    return res.status(404).json({ message: 'Game not found' });
  }

  if (game.status === 'Finished') {
    return res.status(400).json({ message: 'Game already finished' });
  }
  console.log(player);
  const playerNumber = player === game.player1Name ? game.player2Number : game.player1Number;
  const result = checkGuess(playerNumber, guess);
  game.guesses.push({ player, guess, result });

  if (result === playerNumber.length) {
    game.status = 'Finished';
    await game.save();

    io.to(gameName).emit('gameEnded', { winner: player });
  } else {
    await game.save();
  }

  io.to(gameName).emit('newGuess', { player, guess, result, game });

  res.status(200).json({ result });
});

const checkGuess = (playerNumber, guess) => {
  let correctDigits = 0;
  for (let i = 0; i < playerNumber.length; i++) {
    if (playerNumber[i] === guess[i]) {
      correctDigits++;
    }
  }
  return correctDigits;
};

app.post('/api/games/:gameName/end', async (req, res) => {
  const { gameName } = req.params;
  const { player } = req.body;

  const game = await Game.findOne({ gameName });
  if (!game) {
    return res.status(404).json({ message: 'Game not found' });
  }

  if (game.status === 'Finished') {
    return res.status(400).json({ message: 'Game already finished' });
  }

  game.status = 'Finished';
  await game.save();

  const winner = player === 'player1' ? game.player2Name : game.player1Name;
  io.to(gameName).emit('gameEnded', { winner });

  res.status(200).json({ message: 'Game ended', winner });
});

app.get('/api/games/:gameName', async (req, res) => {
  const { gameName } = req.params;
  const game = await Game.findOne({ gameName });
  if (!game) {
    return res.status(404).json({ message: 'Game not found' });
  }
  res.status(200).json(game);
});

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('joinGame', (gameName) => {
    socket.join(gameName);
    console.log(`User joined game: ${gameName}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '172.20.10.5', () => {
  console.log(`Server is running on port ${PORT}`);
});
