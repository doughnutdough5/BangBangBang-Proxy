import dotenv from 'dotenv';

dotenv.config();

export const PROXY_HOST = process.env.PROXY_HOST;
export const PROXY_PORT = process.env.PROXY_PORT;

export const LOBBY_HOST = process.env.LOBBY_HOST || '127.0.0.1';
export const LOBBY_PORT = process.env.LOBBY_PORT || '9001';

export const GAME_HOST = process.env.GAME_HOST || '127.0.0.1';
export const GAME_PORT = process.env.GAME_PORT || '9002';