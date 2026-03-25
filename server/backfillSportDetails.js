require('dotenv').config();
const mongoose = require('mongoose');

const Sport = require('./models/Sport');
const Tournament = require('./models/Tournament');
const Match = require('./models/Match');

const makeSnapshot = (sportLike = {}) => ({
  name: sportLike?.name || '',
  icon: sportLike?.icon || '🏆',
  scoringType: sportLike?.scoringType || 'points',
  customSettings: {
    unit: sportLike?.customSettings?.unit || 'Points',
    pointsToWin: sportLike?.customSettings?.pointsToWin ?? 21,
    gamesPerMatch: sportLike?.customSettings?.gamesPerMatch ?? 1,
    minPointDelta: sportLike?.customSettings?.minPointDelta ?? 0,
    allowDraw: !!sportLike?.customSettings?.allowDraw,
    maxDurationMins: sportLike?.customSettings?.maxDurationMins ?? 0,
    extraRules: sportLike?.customSettings?.extraRules || ''
  }
});

async function findSportByName(name) {
  if (!name) return null;
  return Sport.findOne({ name: { $regex: `^${String(name).trim()}$`, $options: 'i' } });
}

async function backfillTournaments() {
  const tournaments = await Tournament.find();
  let updated = 0;

  for (const t of tournaments) {
    let sportDoc = null;

    if (t.sport) {
      sportDoc = await Sport.findById(t.sport);
    }

    if (!sportDoc && t.sportDetails?.name) {
      sportDoc = await findSportByName(t.sportDetails.name);
      if (sportDoc) t.sport = sportDoc._id;
    }

    if (sportDoc) {
      t.sportDetails = makeSnapshot(sportDoc);
      await t.save();
      updated += 1;
    }
  }

  return { total: tournaments.length, updated };
}

async function backfillMatches() {
  const matches = await Match.find();
  let updated = 0;

  for (const m of matches) {
    let sportDoc = null;

    if (m.tournamentId) {
      const tournament = await Tournament.findById(m.tournamentId);
      if (tournament?.sport) {
        sportDoc = await Sport.findById(tournament.sport);
      }
      if (!sportDoc && tournament?.sportDetails?.name) {
        sportDoc = await findSportByName(tournament.sportDetails.name);
      }
      if (!m.sportDetails?.name && tournament?.sportDetails?.name) {
        m.sportDetails = tournament.sportDetails;
      }
    }

    if (!sportDoc && m.sportRef) {
      sportDoc = await Sport.findById(m.sportRef);
    }

    if (!sportDoc && m.sport) {
      sportDoc = await findSportByName(m.sport);
    }

    if (sportDoc) {
      m.sportRef = sportDoc._id;
      m.sport = sportDoc.name;
      m.sportDetails = makeSnapshot(sportDoc);
      await m.save();
      updated += 1;
    } else if (!m.sportDetails?.name && m.sport) {
      m.sportDetails = makeSnapshot({ name: m.sport, scoringType: 'custom' });
      await m.save();
      updated += 1;
    }
  }

  return { total: matches.length, updated };
}

async function run() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is missing in environment');
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ MongoDB connected');

  const t = await backfillTournaments();
  const m = await backfillMatches();

  console.log(`✅ Tournaments updated: ${t.updated}/${t.total}`);
  console.log(`✅ Matches updated: ${m.updated}/${m.total}`);

  await mongoose.disconnect();
  console.log('✅ Done');
}

run().catch(async (err) => {
  console.error('❌ Backfill failed:', err.message);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});
