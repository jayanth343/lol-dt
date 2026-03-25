// server/seed.js  — run: node server/seed.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const User     = require('./models/User');
const Team     = require('./models/Team');
const Player   = require('./models/Player');
const Match    = require('./models/Match');
const Standing = require('./models/Standing');
const Sport    = require('./models/Sport');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Clear all
  await Promise.all([User, Team, Player, Match, Standing, Sport].map(M => M.deleteMany({})));
  console.log('Cleared existing data');

  // ── Teams ──────────────────────────────────────────────────────
    const sportsData = [
    { name: 'cricket', icon: '??', customSettings: { unit: 'Runs', pointsToWin: 1, gamesPerMatch: 1, minPointDelta: 0, allowDraw: true, maxDurationMins: 180, extraRules: 'Overs limit' } },
    { name: 'football', icon: '?', customSettings: { unit: 'Goals', pointsToWin: 1, gamesPerMatch: 1, minPointDelta: 0, allowDraw: true, maxDurationMins: 90, extraRules: '' } },
    { name: 'badminton', icon: '??', customSettings: { unit: 'Points', pointsToWin: 21, gamesPerMatch: 3, minPointDelta: 2, allowDraw: false, maxDurationMins: 60, extraRules: 'Best of 3 games' } },
    { name: 'table_tennis', icon: '??', customSettings: { unit: 'Points', pointsToWin: 11, gamesPerMatch: 5, minPointDelta: 2, allowDraw: false, maxDurationMins: 45, extraRules: 'Best of 5 games' } },
    { name: 'carrom', icon: '??', customSettings: { unit: 'Points', pointsToWin: 25, gamesPerMatch: 1, minPointDelta: 0, allowDraw: false, maxDurationMins: 60, extraRules: '' } },
  ];
  const sports = await Sport.insertMany(sportsData);
  console.log('? Sports seeded:', sports.length);


  const teams = await Team.insertMany([
    { name:'Thunder XI',    department:'Digital Products',       color:'#e74c3c', abbreviation:'THX', budget:500 },
    { name:'Blue Hawks',    department:'Infrastructure & Cloud', color:'#3498db', abbreviation:'BLH', budget:500 },
    { name:'Green Force',   department:'Data & Analytics',       color:'#27ae60', abbreviation:'GRF', budget:500 },
    { name:'Purple Storm',  department:'Security',               color:'#9b59b6', abbreviation:'PRS', budget:500 },
    { name:'Gold Eagles',   department:'Architecture',           color:'#f39c12', abbreviation:'GDE', budget:500 },
    { name:'Iron Wolves',   department:'Delivery & Ops',         color:'#7f8c8d', abbreviation:'IRW', budget:500 },
    { name:'Crimson Surge', department:'Mobile Dev',             color:'#c0392b', abbreviation:'CRS', budget:500 },
    { name:'Teal Titans',   department:'Platform Engineering',   color:'#16a085', abbreviation:'TTT', budget:500 },
  ]);
  const [thx,blh,grf,prs,gde,irw,crs,ttt] = teams;
  console.log('✅ Teams seeded:', teams.length);

  // ── Users ──────────────────────────────────────────────────────
  const users = await User.insertMany([
    { name:'Super Admin',       email:'admin@lol.com',    password: await bcrypt.hash('admin123',10),  role:'admin' },
    { name:'Thunder XI Owner',  email:'owner1@lol.com',   password: await bcrypt.hash('owner123',10),  role:'team_owner', teamId: thx._id },
    { name:'Blue Hawks Owner',  email:'owner2@lol.com',   password: await bcrypt.hash('owner123',10),  role:'team_owner', teamId: blh._id },
    { name:'Green Force Owner', email:'owner3@lol.com',   password: await bcrypt.hash('owner123',10),  role:'team_owner', teamId: grf._id },
    { name:'Gold Eagles Owner', email:'owner4@lol.com',   password: await bcrypt.hash('owner123',10),  role:'team_owner', teamId: gde._id },
    { name:'League Viewer',     email:'viewer@lol.com',   password: await bcrypt.hash('viewer123',10), role:'viewer' },
  ]);
  console.log('✅ Users seeded:', users.length);

  // ── Players ────────────────────────────────────────────────────
  const players = await Player.insertMany([
    { name:'Rahul Sharma',  department:'Digital Products',       sports:['cricket','football'],       skillLevel:'Advanced',     teamId:thx._id, status:'sold', bidPrice:120, basePrice:60 },
    { name:'Ankit Kumar',   department:'Infrastructure & Cloud', sports:['football','table_tennis'],  skillLevel:'Advanced',     teamId:blh._id, status:'sold', bidPrice:100, basePrice:60 },
    { name:'Priya Mehta',   department:'Data & Analytics',       sports:['badminton','carrom'],       skillLevel:'Intermediate', teamId:grf._id, status:'sold', bidPrice:140, basePrice:50 },
    { name:'Vijay Rao',     department:'Security',               sports:['table_tennis','cricket'],   skillLevel:'Advanced',     teamId:prs._id, status:'sold', bidPrice:90,  basePrice:60 },
    { name:'Sneha Patil',   department:'Architecture',           sports:['badminton','football'],     skillLevel:'Intermediate', teamId:gde._id, status:'sold', bidPrice:160, basePrice:50 },
    { name:'Mohit Singh',   department:'Delivery & Ops',         sports:['cricket','carrom'],         skillLevel:'Beginner',     teamId:irw._id, status:'sold', bidPrice:60,  basePrice:40 },
    { name:'Kavya Reddy',   department:'Mobile Dev',             sports:['badminton','table_tennis'], skillLevel:'Advanced',     teamId:crs._id, status:'sold', bidPrice:130, basePrice:60 },
    { name:'Arjun Nair',    department:'Platform Engineering',   sports:['football','cricket'],       skillLevel:'Intermediate', teamId:ttt._id, status:'sold', bidPrice:80,  basePrice:50 },
    { name:'Deepa Iyer',    department:'Digital Products',       sports:['cricket','badminton'],      skillLevel:'Intermediate', status:'available', basePrice:50 },
    { name:'Ravi Pillai',   department:'Infrastructure & Cloud', sports:['football','carrom'],        skillLevel:'Beginner',     status:'available', basePrice:40 },
    { name:'Sakshi Joshi',  department:'Data & Analytics',       sports:['table_tennis','badminton'], skillLevel:'Advanced',     status:'available', basePrice:60 },
    { name:'Aditya Verma',  department:'Security',               sports:['cricket','football'],       skillLevel:'Intermediate', status:'available', basePrice:50 },
    { name:'Meera Shah',    department:'Architecture',           sports:['carrom','table_tennis'],    skillLevel:'Beginner',     status:'available', basePrice:40 },
    { name:'Siddharth Rao', department:'Delivery & Ops',         sports:['cricket','badminton'],      skillLevel:'Advanced',     status:'available', basePrice:60 },
  ]);
  console.log('✅ Players seeded:', players.length);

  // Update teams spent
  await Team.findByIdAndUpdate(thx._id, { spent:120 });
  await Team.findByIdAndUpdate(blh._id, { spent:100 });
  await Team.findByIdAndUpdate(grf._id, { spent:140 });
  await Team.findByIdAndUpdate(prs._id, { spent:90  });
  await Team.findByIdAndUpdate(gde._id, { spent:160 });
  await Team.findByIdAndUpdate(irw._id, { spent:60  });
  await Team.findByIdAndUpdate(crs._id, { spent:130 });
  await Team.findByIdAndUpdate(ttt._id, { spent:80  });

  // ── Matches ────────────────────────────────────────────────────
  const matches = await Match.insertMany([
    // Completed
    { sport:'cricket',   team1Id:thx._id, team2Id:blh._id, team1Score:'148/6 (20)', team2Score:'102 (18.2)', winnerId:thx._id, status:'completed', venue:'Ground A', matchDate:new Date('2026-03-20'), matchTime:'10:00', round:'Group A', overs:20,
      scoreEvents:[
        { type:'ball', playerName:'Rahul', value:6, extra:'six', description:'SIX! Rahul launches over long-on!' },
        { type:'wicket', playerName:'Ankit', value:0, description:'WICKET! Ankit c Priya b Mohit 22' },
      ]
    },
    { sport:'football',  team1Id:grf._id, team2Id:prs._id, team1Score:'3', team2Score:'1', winnerId:grf._id, status:'completed', venue:'Court 1', matchDate:new Date('2026-03-20'), matchTime:'14:00', round:'Group B',
      footballLive:{ team1Goals:3, team2Goals:1, minute:90, events:[{ minute:12,teamId:grf._id,player:'Ankit',type:'goal' },{ minute:34,teamId:grf._id,player:'Priya',type:'goal' },{ minute:55,teamId:prs._id,player:'Vijay',type:'goal' },{ minute:67,teamId:grf._id,player:'Ankit',type:'goal' }] }
    },
    // Live
    { sport:'cricket',   team1Id:gde._id, team2Id:irw._id, team1Score:'112/4 (14.3)', team2Score:'Yet to bat', status:'live', venue:'Ground A', matchDate:new Date('2026-03-22'), matchTime:'11:00', round:'Group A', overs:20,
      cricketLive:{ runs:112, wickets:4, overs:'14.3', balls:87, target:0, crr:'7.68', rrr:'-', innings:1, inningsOver:false, batsmen:[{ name:'Sneha', runs:58, balls:38, fours:4, sixes:2, onStrike:true },{ name:'Deepa', runs:22, balls:18, fours:2, sixes:0, onStrike:false }], bowler:{ name:'Ravi', overs:'3.3', runs:28, wickets:1 }, currentOver:[1,4,0,6,0,4], lastWicket:'Mohit c Ravi b Aditya 14' }
    },
    { sport:'badminton', team1Id:crs._id, team2Id:ttt._id, team1Score:'1 set', team2Score:'1 set', status:'live', venue:'Badminton Hall', matchDate:new Date('2026-03-22'), matchTime:'12:00', round:'Group B',
      pointsLive:{ team1Sets:1, team2Sets:1, team1Points:15, team2Points:12, currentSet:3, sets:[{ t1:21,t2:18,done:true },{ t1:18,t2:21,done:true }], maxPoints:21, maxSets:3 }
    },
    // Upcoming
    { sport:'table_tennis', team1Id:thx._id, team2Id:grf._id, status:'upcoming', venue:'TT Room',        matchDate:new Date('2026-03-23'), matchTime:'10:00', round:'Group A' },
    { sport:'cricket',      team1Id:blh._id, team2Id:prs._id, status:'upcoming', venue:'Ground B',       matchDate:new Date('2026-03-23'), matchTime:'13:00', round:'Group B', overs:20 },
    { sport:'football',     team1Id:irw._id, team2Id:ttt._id, status:'upcoming', venue:'Court 2',        matchDate:new Date('2026-03-24'), matchTime:'11:00', round:'Group B' },
    { sport:'carrom',       team1Id:crs._id, team2Id:gde._id, status:'upcoming', venue:'Indoor Zone',    matchDate:new Date('2026-03-24'), matchTime:'15:00', round:'Group A' },
    { sport:'badminton',    team1Id:thx._id, team2Id:irw._id, status:'upcoming', venue:'Badminton Hall', matchDate:new Date('2026-03-25'), matchTime:'10:00', round:'Group A' },
  ]);
  console.log('✅ Matches seeded:', matches.length);

  // ── Standings ──────────────────────────────────────────────────
  const standingRows = [];
  const sportData = {
    cricket:      [[thx,4,3,1,6,'+0.84'],[gde,3,2,1,4,'+0.42'],[blh,4,2,2,4,'+0.12'],[grf,3,1,2,2,'-0.22'],[prs,3,1,2,2,'-0.31'],[crs,2,0,2,0,'-0.77'],[irw,2,0,2,0,'-0.88'],[ttt,1,0,1,0,'-0.20']],
    football:     [[grf,3,3,0,9,'+2.10'],[thx,3,2,1,6,'+0.90'],[gde,2,1,1,3,'+0.30'],[irw,2,1,1,3,'+0.20'],[blh,2,1,1,3,'+0.10'],[prs,3,1,2,3,'-0.50'],[crs,2,0,2,0,'-0.60'],[ttt,3,0,3,0,'-2.50']],
    badminton:    [[crs,4,4,0,8,'+5.00'],[ttt,4,3,1,6,'+2.00'],[blh,3,2,1,4,'+1.00'],[gde,2,1,1,2,'+0.00'],[thx,2,1,1,2,'+0.50'],[prs,3,1,2,2,'-1.00'],[grf,2,0,2,0,'-2.00'],[irw,2,0,2,0,'-3.00']],
    table_tennis: [[prs,5,5,0,10,'+8.00'],[ttt,5,4,1,8,'+5.00'],[thx,4,3,1,6,'+3.00'],[gde,4,2,2,4,'+1.00'],[grf,4,2,2,4,'-1.00'],[blh,4,1,3,2,'-3.00'],[crs,3,1,2,2,'-4.00'],[irw,3,0,3,0,'-9.00']],
    carrom:       [[gde,3,3,0,6,'+6.00'],[irw,3,2,1,4,'+2.00'],[thx,2,1,1,2,'+1.00'],[blh,2,1,1,2,'+0.00'],[grf,2,1,1,2,'-1.00'],[ttt,3,1,2,2,'-1.00'],[prs,2,0,2,0,'-0.00'],[crs,3,0,3,0,'-7.00']],
  };
  for (const [sport, rows] of Object.entries(sportData)) {
    for (const [team, played, won, lost, points, nrrStr] of rows) {
      const form = [];
      for (let i=0;i<won;i++) form.push('W');
      for (let i=0;i<lost;i++) form.push('L');
      standingRows.push({ teamId:team._id, sport, played, won, lost, points, nrr: parseFloat(nrrStr), form: form.slice(0,played) });
    }
  }
  await Standing.insertMany(standingRows);
  console.log('✅ Standings seeded');

  console.log('\n🎉 Seed complete!\n');
  console.log('─────────────────────────────────────');
  console.log('LOGIN CREDENTIALS:');
  console.log('  Admin:       admin@lol.com   / admin123');
  console.log('  Team Owner1: owner1@lol.com  / owner123  (Thunder XI)');
  console.log('  Team Owner2: owner2@lol.com  / owner123  (Blue Hawks)');
  console.log('  Team Owner3: owner3@lol.com  / owner123  (Green Force)');
  console.log('  Viewer:      viewer@lol.com  / viewer123');
  console.log('─────────────────────────────────────\n');

  await mongoose.disconnect();
}

seed().catch(e => { console.error(e); process.exit(1); });



