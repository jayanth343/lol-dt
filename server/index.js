// server/index.js
require('dotenv').config();
const express   = require('express');
const http      = require('http');
const { Server }= require('socket.io');
const mongoose  = require('mongoose');
const cors      = require('cors');
const path      = require('path');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET','POST'],
    credentials: true,
  },
});

// ── Middleware ───────────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());

// Attach io to every request so routes can emit events
app.use((req, _, next) => { req.io = io; next(); });

// ── Routes ───────────────────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/teams',     require('./routes/teams'));
app.use('/api/players',   require('./routes/players'));
app.use('/api/matches',   require('./routes/matches'));
app.use('/api/standings', require('./routes/standings'));
app.use('/api/auction',   require('./routes/auction'));

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok', time: new Date() }));

// ── Serve React build in production ──────────────────────────────
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  app.get('*', (_, res) => res.sendFile(path.join(__dirname, '../client/build/index.html')));
}

// ── Socket.io ────────────────────────────────────────────────────
require('./socket')(io);

// ── MongoDB + Start ──────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    server.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    console.error('   Make sure MongoDB is running: mongod');
    process.exit(1);
  });
