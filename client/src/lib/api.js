// client/src/lib/api.js
import { io } from 'socket.io-client';

const BASE = '/api';

// ── HTTP helpers ──────────────────────────────────────────────────
const headers = () => {
  const token = localStorage.getItem('token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

const get  = (url) => fetch(BASE + url, { headers: headers() }).then(r => r.json());
const post = (url, body) => fetch(BASE + url, { method:'POST', headers: headers(), body: JSON.stringify(body) }).then(r => r.json());
const put  = (url, body) => fetch(BASE + url, { method:'PUT',  headers: headers(), body: JSON.stringify(body) }).then(r => r.json());
const del  = (url) => fetch(BASE + url, { method:'DELETE', headers: headers() }).then(r => r.json());

// ── Auth ──────────────────────────────────────────────────────────
export const apiLogin    = (email, password) => post('/auth/login', { email, password });
export const apiRegister = (data)            => post('/auth/register', data);
export const apiMe       = ()                => get('/auth/me');

// ── Teams ─────────────────────────────────────────────────────────
export const apiTeams    = ()     => get('/teams');
export const apiTeam     = (id)   => get(`/teams/${id}`);
export const apiAddTeam  = (data) => post('/teams', data);
export const apiManageTeam = (id, data) => put(`/teams/${id}/manage`, data);
export const apiTeamSubTeams = (id) => get(`/teams/${id}/subteams`);
export const apiCreateSubTeam = (teamId, data) => post(`/teams/${teamId}/subteams`, data);
export const apiUpdateSubTeam = (teamId, subTeamId, data) => put(`/teams/${teamId}/subteams/${subTeamId}`, data);
export const apiDeleteSubTeam = (teamId, subTeamId) => del(`/teams/${teamId}/subteams/${subTeamId}`);

// ── Players ───────────────────────────────────────────────────────
export const apiPlayers         = (params = {}) => get('/players?' + new URLSearchParams(params));
export const apiRegisterPlayer  = (data)        => post('/players/register', data);
export const apiUpdatePlayer    = (id, data)    => put(`/players/${id}`, data);
// ── Tournaments ──────────────────────────────────────────────────
export const apiTournaments = () => get('/tournaments');
export const apiTournament = (id) => get(`/tournaments/${id}`);
export const apiTournamentMatches = (id) => get(`/tournaments/${id}/matches`);
export const apiCreateTournament = (data) => post('/tournaments', data);
export const apiUpdateTournament = (id, data) => put(`/tournaments/${id}`, data);
export const apiUpdateTournamentTeams = (id, teamIds, minTeams, maxTeams) => put(`/tournaments/${id}/teams`, { teamIds, minTeams, maxTeams });
export const apiTournamentLeagueStandings = (id) => get(`/tournaments/${id}/standings`);
export const apiGenerateLeagueMatches = (id, data) => post(`/tournaments/${id}/generate-league`, data);
export const apiGenerateKnockoutMatches = (id, data) => post(`/tournaments/${id}/generate-knockout`, data);
export const apiUpdateTournamentSchedule = (id, schedules) => put(`/tournaments/${id}/matches/schedule`, { schedules });
export const apiSports = () => get('/sports');
export const apiCreateSport = (data) => post('/sports', data);
// ── Matches ───────────────────────────────────────────────────────
export const apiMatches    = (params = {}) => get('/matches?' + new URLSearchParams(params));
export const apiFantasyMatches = ()        => get('/matches/fantasy');
export const apiMatch      = (id)          => get(`/matches/${id}`);
export const apiAddMatch   = (data)        => post('/matches', data);
export const apiUpdateMatch= (id, data)    => put(`/matches/${id}`, data);
export const apiDeleteMatch= (id)          => del(`/matches/${id}`);

// ── Standings ─────────────────────────────────────────────────────
export const apiStandings  = (sport) => get(`/standings?sport=${sport}`);

// ── Auction ───────────────────────────────────────────────────────
export const apiAuctionState     = ()     => get('/auction/state');
export const apiAuctionAvailable = ()     => get('/auction/available');
export const apiAuctionStart     = (data) => post('/auction/start', data);
export const apiAuctionBid       = (data) => post('/auction/bid', data);
export const apiAuctionSold      = ()     => post('/auction/sold', {});
export const apiAuctionUnsold    = ()     => post('/auction/unsold', {});
export const apiAuctionPause     = ()     => post('/auction/pause', {});

// ── Socket.io ─────────────────────────────────────────────────────
let socket = null;

export const getSocket = () => {
  if (!socket) {
    const token = localStorage.getItem('token');
    socket = io('/', {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
    });
    socket.on('connect', () => console.log('🔌 Socket connected'));
    socket.on('disconnect', () => console.log('🔌 Socket disconnected'));
  }
  return socket;
};

export const resetSocket = () => {
  if (socket) { socket.disconnect(); socket = null; }
};
