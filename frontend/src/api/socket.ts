import { io, Socket } from 'socket.io-client';

// Prepare connecting to the backend via socket.io
// When backend is implemented, dynamic URL can be used
const SOCKET_URL = import.meta.env.VITE_WEBSOCKET_URL || '';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false, // Don't auto connect until authenticated
      transports: ['websocket'],
    });
  }
  return socket;
};

export const connectSocket = (token: string) => {
  const s = getSocket();
  s.auth = { token };
  s.connect();
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
