// server/changeStreams.js
// ─────────────────────────────────────────────────────────────────────────────
// MongoDB Change Streams → Socket.IO real-time bridge
//
// This watches the actual database collections. Any change (from ANY source —
// admin panel, REST API, seed script, direct DB edit) automatically broadcasts
// to all connected clients.
//
// ⚠️  REQUIREMENT: MongoDB must run as a Replica Set for change streams to work.
//     For local dev, see README for how to enable it (one-time setup).
// ─────────────────────────────────────────────────────────────────────────────

const mongoose = require('mongoose');

// We load models lazily so this file is safe to require before DB connects
let Match, Player, Standing, Team;

// ── Helper: retry a change stream if it dies (network hiccup, RS failover) ──
function watchWithRetry(getStream, onEvent, label, delayMs = 3000) {
  let stream;

  async function start() {
    try {
      stream = await getStream();
      console.log(`👁  Change stream watching: ${label}`);

      stream.on('change', onEvent);

      stream.on('error', (err) => {
        console.error(`⚠️  Change stream error [${label}]:`, err.message);
        stream.close();
        setTimeout(start, delayMs);
      });

      stream.on('close', () => {
        // Only restart if mongoose is still connected (not during shutdown)
        if (mongoose.connection.readyState === 1) {
          console.warn(`⚠️  Change stream closed [${label}], restarting…`);
          setTimeout(start, delayMs);
        }
      });
    } catch (err) {
      console.error(`❌ Failed to open change stream [${label}]:`, err.message);
      setTimeout(start, delayMs);
    }
  }

  start();

  // Return a cleanup fn
  return () => stream && stream.close();
}

// ── Main export ───────────────────────────────────────────────────────────────
module.exports = function initChangeStreams(io) {

  // Wait until mongoose is fully connected before opening streams
  if (mongoose.connection.readyState !== 1) {
    mongoose.connection.once('open', () => init(io));
  } else {
    init(io);
  }
};

function init(io) {
  Match    = mongoose.model('Match');
  Player   = mongoose.model('Player');
  Standing = mongoose.model('Standing');
  Team     = mongoose.model('Team');

  // ── 1. MATCHES ──────────────────────────────────────────────────────────────
  watchWithRetry(
    () => Match.watch([], { fullDocument: 'updateLookup' }),
    async (change) => {
      try {
        const { operationType, fullDocument, documentKey } = change;

        if (operationType === 'delete') {
          io.emit('db:match:deleted', { matchId: String(documentKey._id) });
          return;
        }

        if (!fullDocument) return;

        // Populate team refs for clients
        const doc = await Match.findById(fullDocument._id)
          .populate('team1Id', 'name color abbreviation department')
          .populate('team2Id', 'name color abbreviation department')
          .populate('winnerId', 'name color abbreviation')
          .lean();

        if (!doc) return;

        const payload = {
          matchId:     String(doc._id),
          match:       doc,
          team1Score:  doc.team1Score,
          team2Score:  doc.team2Score,
          status:      doc.status,
          cricketLive: doc.cricketLive  || null,
          footballLive:doc.footballLive || null,
          pointsLive:  doc.pointsLive   || null,
          scoreEvents: (doc.scoreEvents || []).slice(-20), // last 20 events
          sport:       doc.sport,
        };

        // Granular events so existing listeners still work
        io.emit('match:score', {
          matchId:    payload.matchId,
          team1Score: payload.team1Score,
          team2Score: payload.team2Score,
          status:     payload.status,
        });

        // Broadcast full match update to the match room
        io.to(`match:${payload.matchId}`).emit('db:match:updated', payload);

        // Also emit sport-specific update events (backwards compat)
        if (doc.sport === 'cricket' && doc.cricketLive) {
          const lastEvent = (doc.scoreEvents || []).slice(-1)[0] || null;
          io.to(`match:${payload.matchId}`).emit('cricket:update', {
            matchId:     payload.matchId,
            cricketLive: doc.cricketLive,
            team1Score:  doc.team1Score,
            team2Score:  doc.team2Score,
            event:       lastEvent,
          });
        }

        if (doc.sport === 'football' && doc.footballLive) {
          const lastEvent = (doc.scoreEvents || []).slice(-1)[0] || null;
          io.to(`match:${payload.matchId}`).emit('football:update', {
            matchId:      payload.matchId,
            footballLive: doc.footballLive,
            team1Score:   doc.team1Score,
            team2Score:   doc.team2Score,
            event:        lastEvent,
          });
        }

        if (['badminton','table_tennis','carrom'].includes(doc.sport) && doc.pointsLive) {
          io.to(`match:${payload.matchId}`).emit('points:update', {
            matchId:     payload.matchId,
            pointsLive:  doc.pointsLive,
            team1Score:  doc.team1Score,
            team2Score:  doc.team2Score,
          });
        }

        // Status change broadcast
        if (change.updateDescription?.updatedFields?.status) {
          io.emit('match:statusChange', {
            matchId: payload.matchId,
            status:  doc.status,
            match:   doc,
          });
          if (doc.status === 'completed') {
            io.emit('standings:update', { sport: doc.sport });
          }
        }

        // New match inserted
        if (operationType === 'insert') {
          io.emit('db:match:new', payload);
        }

      } catch (err) {
        console.error('Change stream [matches] handler error:', err.message);
      }
    },
    'matches'
  );

  // ── 2. PLAYERS ──────────────────────────────────────────────────────────────
  watchWithRetry(
    () => Player.watch([], { fullDocument: 'updateLookup' }),
    async (change) => {
      try {
        const { operationType, fullDocument, documentKey } = change;

        if (operationType === 'delete') {
          io.emit('db:player:deleted', { playerId: String(documentKey._id) });
          return;
        }

        if (!fullDocument) return;

        const doc = await Player.findById(fullDocument._id)
          .populate('teamId', 'name color abbreviation')
          .lean();

        if (!doc) return;

        const payload = { player: doc, playerId: String(doc._id) };

        if (operationType === 'insert') {
          io.emit('db:player:new', payload);
        } else {
          io.emit('db:player:updated', payload);

          // If a player just got sold, re-emit auction:sold for backwards compat
          const updatedFields = change.updateDescription?.updatedFields || {};
          if (updatedFields.status === 'sold' && doc.teamId) {
            io.emit('auction:sold', {
              player: doc,
              team:   doc.teamId,
              price:  doc.bidPrice,
            });
          }
        }

        // Always broadcast a full players snapshot so any page can refresh its list
        io.emit('db:players:changed', { playerId: String(doc._id), status: doc.status });

      } catch (err) {
        console.error('Change stream [players] handler error:', err.message);
      }
    },
    'players'
  );

  // ── 3. STANDINGS ────────────────────────────────────────────────────────────
  watchWithRetry(
    () => Standing.watch([], { fullDocument: 'updateLookup' }),
    async (change) => {
      try {
        if (!change.fullDocument) return;

        const doc = await Standing.findById(change.fullDocument._id)
          .populate('teamId', 'name color abbreviation department')
          .lean();

        if (!doc) return;

        // Tell clients which sport's table changed so they re-fetch
        io.emit('standings:update', { sport: doc.sport });
        io.emit('db:standing:updated', { standing: doc, sport: doc.sport });

      } catch (err) {
        console.error('Change stream [standings] handler error:', err.message);
      }
    },
    'standings'
  );

  // ── 4. TEAMS (budget changes during auction) ─────────────────────────────
  watchWithRetry(
    () => Team.watch([], { fullDocument: 'updateLookup' }),
    async (change) => {
      try {
        const { operationType, fullDocument, documentKey } = change;

        if (operationType === 'delete') {
          io.emit('db:team:deleted', { teamId: String(documentKey._id) });
          return;
        }

        if (!fullDocument) return;

        io.emit('db:team:updated', { team: fullDocument, teamId: String(fullDocument._id) });

        // Broadcast a lightweight budget update
        if (change.updateDescription?.updatedFields?.spent !== undefined) {
          io.emit('team:budget', {
            teamId: String(fullDocument._id),
            spent:  fullDocument.spent,
            budget: fullDocument.budget,
          });
        }

      } catch (err) {
        console.error('Change stream [teams] handler error:', err.message);
      }
    },
    'teams'
  );

  console.log('✅ MongoDB Change Streams initialised — all DB changes will broadcast to clients');
}
