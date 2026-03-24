// server/socket/index.js
const Match = require('../models/Match');
const jwt   = require('jsonwebtoken');
const User  = require('../models/User');

module.exports = (io) => {

  // Authenticate socket connection
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = await User.findById(decoded.id).select('-password');
      }
    } catch (_) {}
    next();
  });

  io.on('connection', (socket) => {
    const role = socket.user?.role || 'viewer';

    // ── Join match room ─────────────────────────────────────────
    socket.on('match:join', (matchId) => {
      socket.join(`match:${matchId}`);
    });

    socket.on('match:leave', (matchId) => {
      socket.leave(`match:${matchId}`);
    });

    // ── CRICKET: Add ball ──────────────────────────────────────
    // Payload: { matchId, runs, extra, batter, bowler, description }
    socket.on('cricket:ball', async (data) => {
      if (!['admin','team_owner'].includes(role)) return;

      try {
        const match = await Match.findById(data.matchId);
        if (!match || match.sport !== 'cricket') return;

        const live   = match.cricketLive || {};
        const runs   = Number(data.runs) || 0;
        const isWide = data.extra === 'wide' || data.extra === 'noball';
        const isWkt  = data.extra === 'wicket';

        // Update totals
        live.runs    = (live.runs || 0) + runs + (isWide ? 1 : 0);
        if (!isWide) {
          live.balls   = (live.balls || 0) + 1;
          live.wickets = (live.wickets || 0) + (isWkt ? 1 : 0);
        }

        // Calculate overs
        const totalBalls = live.balls || 0;
        live.overs = `${Math.floor(totalBalls / 6)}.${totalBalls % 6}`;

        // CRR
        const oversDecimal = Math.floor(totalBalls/6) + (totalBalls%6)/6;
        live.crr = oversDecimal > 0 ? (live.runs / oversDecimal).toFixed(2) : '0.00';

        // RRR (2nd innings)
        if (live.innings === 2 && live.target > 0) {
          const remaining     = (match.overs || 20) - oversDecimal;
          const runsNeeded    = live.target - live.runs;
          live.rrr = remaining > 0 && runsNeeded > 0 ? (runsNeeded / remaining).toFixed(2) : '-';
        }

        // Current over balls
        if (!live.currentOver) live.currentOver = [];
        if (!isWide) {
          live.currentOver.push(isWkt ? -1 : runs);
          if (live.currentOver.length >= 6) live.currentOver = []; // new over
        }

        // Score display — update batting team's score
        const scoreStr = `${live.runs}/${live.wickets} (${live.overs})`;
        if (live.innings === 2) {
          match.team2Score = scoreStr;
        } else {
          match.team1Score = scoreStr;
        }
        match.cricketLive = live;

        // Save event
        const event = {
          type: isWkt ? 'wicket' : isWide ? data.extra : 'ball',
          playerName: data.batter || '',
          value: runs,
          extra: data.extra || '',
          description: data.description || ballDescription(runs, data.extra, data.batter, data.bowler),
        };
        match.scoreEvents.push(event);

        await match.save();

        // Broadcast to all in match room
        const payload = {
          matchId: data.matchId,
          cricketLive: live,
          team1Score: match.team1Score,
          team2Score: match.team2Score,
          event,
        };
        io.to(`match:${data.matchId}`).emit('cricket:update', payload);
        io.emit('match:score', { matchId: data.matchId, team1Score: match.team1Score, team2Score: match.team2Score, status: match.status });

      } catch (e) {
        socket.emit('error', { message: e.message });
      }
    });

    // ── CRICKET: Start innings 2 ───────────────────────────────
    socket.on('cricket:innings2', async (data) => {
      if (role !== 'admin') return;
      const match = await Match.findById(data.matchId);
      if (!match) return;

      // Innings 1 total belongs to team1 — preserve it as team1Score
      // Team2 now bats in innings 2
      const innings1Score = match.team1Score; // e.g. "145/6 (20.0)"
      const target = (match.cricketLive?.runs || 0) + 1;

      match.team2Score = 'Yet to bat'; // team2 hasn't started yet
      match.cricketLive = {
        runs: 0, wickets: 0, overs: '0.0', balls: 0,
        target, innings: 2, crr: '0.00', rrr: '-',
        currentOver: [], battingTeam: match.team2Id,
      };
      // team1Score stays as is (innings 1 final score)
      await match.save();

      io.to(`match:${data.matchId}`).emit('cricket:update', {
        matchId: data.matchId,
        cricketLive: match.cricketLive,
        team1Score: match.team1Score,
        team2Score: match.team2Score,
      });
    });

    // ── FOOTBALL: Add goal ─────────────────────────────────────
    socket.on('football:goal', async (data) => {
      if (!['admin','team_owner'].includes(role)) return;
      try {
        const match = await Match.findById(data.matchId);
        if (!match || match.sport !== 'football') return;

        if (!match.footballLive) match.footballLive = { team1Goals:0, team2Goals:0, minute:0, events:[] };

        const isTeam1 = data.teamId.toString() === match.team1Id.toString();
        if (isTeam1) match.footballLive.team1Goals++;
        else         match.footballLive.team2Goals++;

        match.footballLive.minute = data.minute || match.footballLive.minute;
        match.footballLive.events.push({ minute: data.minute, teamId: data.teamId, player: data.player, type: data.type || 'goal' });

        match.team1Score = String(match.footballLive.team1Goals);
        match.team2Score = String(match.footballLive.team2Goals);

        const event = { type:'goal', playerName: data.player, description:`GOAL! ${data.player} (${data.minute}')` };
        match.scoreEvents.push(event);
        await match.save();

        io.to(`match:${data.matchId}`).emit('football:update', { matchId: data.matchId, footballLive: match.footballLive, team1Score: match.team1Score, team2Score: match.team2Score, event });
        io.emit('match:score', { matchId: data.matchId, team1Score: match.team1Score, team2Score: match.team2Score, status: 'live' });
      } catch (e) { socket.emit('error', { message: e.message }); }
    });

    // ── BADMINTON / TT / CARROM: Add point ────────────────────
    socket.on('points:add', async (data) => {
      if (!['admin','team_owner'].includes(role)) return;
      try {
        const match = await Match.findById(data.matchId);
        if (!match) return;

        const maxPts = match.sport === 'table_tennis' ? 11 : match.sport === 'carrom' ? 29 : 21;
        const maxSets = 3;

        if (!match.pointsLive) {
          match.pointsLive = { team1Sets:0, team2Sets:0, team1Points:0, team2Points:0, currentSet:1, sets:[], maxPoints: maxPts, maxSets };
        }

        const pl = match.pointsLive;
        const isTeam1 = data.teamId.toString() === match.team1Id.toString();
        if (isTeam1) pl.team1Points++; else pl.team2Points++;

        // Check if set won (need 2-point lead after maxPts)
        const t1 = pl.team1Points, t2 = pl.team2Points;
        const setWon = (t1 >= maxPts || t2 >= maxPts) && Math.abs(t1 - t2) >= 2;

        if (setWon) {
          const setWinner = t1 > t2 ? 1 : 2;
          pl.sets.push({ t1, t2, done: true });
          if (setWinner === 1) pl.team1Sets++; else pl.team2Sets++;
          pl.team1Points = 0; pl.team2Points = 0;
          pl.currentSet++;

          // Check match won
          const setsToWin = Math.ceil(maxSets / 2); // 2 out of 3
          if (pl.team1Sets >= setsToWin || pl.team2Sets >= setsToWin) {
            match.status = 'completed';
            match.winnerId = pl.team1Sets > pl.team2Sets ? match.team1Id : match.team2Id;
          }
        }

        // Update display score
        const setsStr = `${pl.team1Sets}–${pl.team2Sets}`;
        const ptsStr  = `(${pl.team1Points}–${pl.team2Points})`;
        match.team1Score = `${pl.team1Sets} sets`;
        match.team2Score = `${pl.team2Sets} sets`;

        await match.save();

        io.to(`match:${data.matchId}`).emit('points:update', { matchId: data.matchId, pointsLive: pl, team1Score: match.team1Score, team2Score: match.team2Score, setsStr, ptsStr });
        io.emit('match:score', { matchId: data.matchId, team1Score: setsStr, team2Score: '', status: match.status });
      } catch (e) { socket.emit('error', { message: e.message }); }
    });

    // ── Match status change (start/end) ────────────────────────
    socket.on('match:setStatus', async (data) => {
      if (role !== 'admin') return;
      try {
        const match = await Match.findByIdAndUpdate(
          data.matchId,
          { status: data.status, winnerId: data.winnerId || null },
          { new: true }
        )
          .populate('team1Id', 'name color abbreviation')
          .populate('team2Id', 'name color abbreviation');
        io.emit('match:statusChange', { matchId: data.matchId, status: data.status, match });
        // Notify clients standings may have changed
        if (data.status === 'completed') {
          io.emit('standings:update', { sport: match.sport });
        }
      } catch (e) { socket.emit('error', e.message); }
    });

    socket.on('disconnect', () => {});
  });
};

function ballDescription(runs, extra, batter, bowler) {
  if (extra === 'wicket') return `WICKET! ${batter} dismissed`;
  if (extra === 'wide')   return `Wide ball — 1 extra`;
  if (extra === 'noball') return `No ball — ${runs} off the bat`;
  if (runs === 6) return `SIX! ${batter} hits over the boundary!`;
  if (runs === 4) return `FOUR! ${batter} finds the gap!`;
  if (runs === 0) return `Dot ball. Defended by ${batter}`;
  return `${runs} run${runs>1?'s':''} — ${batter} off ${bowler}`;
}
