const mongoose = require('mongoose');

const GameSchema = new mongoose.Schema({
  gameName: { type: String, required: true, unique: true },
  player1Name: { type: String, required: true },
  player2Name: { type: String },
  player1Number: { type: String },
  player2Number: { type: String },
  guesses: [
    {
      player: String,
      guess: String,
      result: String
    }
  ],
  status: { type: String, enum: ['Waiting', 'Playing', 'Finished'], default: 'Waiting' }
});

module.exports = mongoose.model('Game', GameSchema);
