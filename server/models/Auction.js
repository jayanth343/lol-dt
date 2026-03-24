// server/models/Auction.js
const mongoose = require('mongoose');

const BidSchema = new mongoose.Schema({
  teamId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  bidderId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  teamName:  String,
  teamColor: String,
  bidderName:String,
  amount:    { type: Number, required: true },
  time:      { type: Date, default: Date.now },
});

const AuctionSchema = new mongoose.Schema({
  currentPlayer: { type: Object, default: null },
  currentBid:    { type: Number, default: 0 },
  leadingTeam:   { type: Object, default: null },
  status:        { type: String, enum: ['waiting','active','sold','paused','closed'], default: 'waiting' },
  bids:          [BidSchema],
}, { timestamps: true });

module.exports = mongoose.model('Auction', AuctionSchema);
