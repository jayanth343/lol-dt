// server/routes/auction.js
const router   = require('express').Router();
const Player   = require('../models/Player');
const Team     = require('../models/Team');
const { auth, requireAdmin } = require('../middleware/auth');

// In-memory state — persists while server is running
let auctionState = {
  status: 'waiting',
  currentPlayer: null,
  currentBid: 0,
  leadingTeam: null,
  bids: [],
};

// GET current state
router.get('/state', (req, res) => res.json(auctionState));

// GET available players
router.get('/available', async (req, res) => {
  try {
    const players = await Player.find({ status: 'available' }).sort('name');
    res.json(players);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /start — admin picks a player and opens bidding
router.post('/start', auth, requireAdmin, async (req, res) => {
  try {
    const player = await Player.findById(req.body.playerId);
    if (!player) return res.status(404).json({ error: 'Player not found' });

    auctionState = {
      status: 'active',
      currentPlayer: player.toObject(),
      currentBid: player.basePrice,
      leadingTeam: null,
      bids: [],
    };

    req.io.emit('auction:update', auctionState);
    res.json(auctionState);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /bid — any authenticated user (team owner or admin) places a bid
router.post('/bid', auth, async (req, res) => {
  try {
    const { teamId, amount } = req.body;

    if (auctionState.status !== 'active')
      return res.status(400).json({ error: 'Auction is not active right now' });
    if (!amount || amount <= auctionState.currentBid)
      return res.status(400).json({ error: `Bid must be higher than current bid (${auctionState.currentBid} pts)` });

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ error: 'Team not found' });

    const remaining = team.budget - team.spent;
    if (remaining < amount)
      return res.status(400).json({ error: `Insufficient budget. Your team has ${remaining} pts remaining.` });

    const bid = {
      teamId:    team._id,
      teamName:  team.name,
      teamColor: team.color,
      amount:    Number(amount),
      bidderName:req.user.name,
      time:      new Date(),
    };

    auctionState.bids.unshift(bid);
    auctionState.currentBid  = Number(amount);
    auctionState.leadingTeam = {
      id:           team._id,
      name:         team.name,
      color:        team.color,
      abbreviation: team.abbreviation,
    };

    req.io.emit('auction:update', auctionState);
    res.json(auctionState);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /sold — admin finalises the sale to leading team
router.post('/sold', auth, requireAdmin, async (req, res) => {
  try {
    if (!auctionState.currentPlayer)
      return res.status(400).json({ error: 'No active player to sell' });
    if (!auctionState.leadingTeam)
      return res.status(400).json({ error: 'No bids placed yet' });

    const { currentPlayer, currentBid, leadingTeam } = auctionState;

    await Player.findByIdAndUpdate(currentPlayer._id, {
      teamId:   leadingTeam.id,
      bidPrice: currentBid,
      status:   'sold',
    });

    await Team.findByIdAndUpdate(leadingTeam.id, { $inc: { spent: currentBid } });

    // Emit sold event first, then reset to waiting
    req.io.emit('auction:sold', {
      player: currentPlayer,
      team:   leadingTeam,
      price:  currentBid,
    });

    // FIX: reset to 'waiting' (not 'sold') so admin can start next player
    auctionState = {
      status:        'waiting',
      currentPlayer: null,
      currentBid:    0,
      leadingTeam:   null,
      bids:          [],
    };

    req.io.emit('auction:update', auctionState);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /unsold — admin skips player, marks unsold
router.post('/unsold', auth, requireAdmin, async (req, res) => {
  try {
    if (auctionState.currentPlayer) {
      await Player.findByIdAndUpdate(auctionState.currentPlayer._id, { status: 'unsold' });
    }
    auctionState = { status: 'waiting', currentPlayer: null, currentBid: 0, leadingTeam: null, bids: [] };
    req.io.emit('auction:update', auctionState);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /pause — toggle pause/resume
router.post('/pause', auth, requireAdmin, (req, res) => {
  auctionState.status = auctionState.status === 'paused' ? 'active' : 'paused';
  req.io.emit('auction:update', auctionState);
  res.json(auctionState);
});

// POST /close — end auction session
router.post('/close', auth, requireAdmin, (req, res) => {
  auctionState = { status: 'closed', currentPlayer: null, currentBid: 0, leadingTeam: null, bids: [] };
  req.io.emit('auction:update', auctionState);
  res.json({ success: true });
});

module.exports = router;
