import { getSocket } from './socket';
import { usePosStore, Ticket, Table, HistoryItem, OrderItem } from '@/store/pos';
import { toast } from 'sonner';

// Generate a unique client session ID to filter out self-emitted events
export const clientSessionId = Math.random().toString(36).substring(2, 15);

export const emitSocket = (eventName: string, data: any) => {
  try {
    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit(eventName, {
        ...data,
        senderId: clientSessionId
      });
    }
  } catch (error) {
    console.error(`Failed to emit socket event ${eventName}:`, error);
  }
};

let listenersAttached = false;

export const initRealtime = () => {
  const socket = getSocket();
  
  if (!socket.connected) {
    socket.connect();
  }

  // Update starting status
  const setSocketStatus = usePosStore.getState().setSocketStatus;
  setSocketStatus(socket.connected ? 'connected' : 'offline');

  if (listenersAttached) return;

  // Connection listeners
  socket.on('connect', () => {
    console.log('Realtime socket connected successfully. Session ID:', clientSessionId);
    setSocketStatus('connected');
  });

  socket.on('disconnect', () => {
    console.log('Realtime socket disconnected.');
    setSocketStatus('offline');
  });

  socket.on('connect_error', () => {
    setSocketStatus('reconnecting');
  });

  socket.on('reconnecting', () => {
    setSocketStatus('reconnecting');
  });

  socket.on('reconnect_attempt', () => {
    setSocketStatus('reconnecting');
  });

  // Business events
  socket.on('order.created', (data: { ticket: Ticket; senderId: string }) => {
    if (data.senderId === clientSessionId) return;
    console.log('[Socket] order.created received:', data);
    usePosStore.getState().applyRemoteEvent('order.created', data.ticket);
  });

  socket.on('order.updated', (data: { ticketId: string; update: Partial<Ticket>; senderId: string }) => {
    if (data.senderId === clientSessionId) return;
    console.log('[Socket] order.updated received:', data);
    usePosStore.getState().applyRemoteEvent('order.updated', { ticketId: data.ticketId, update: data.update });
  });

  socket.on('order.status_changed', (data: { ticketId: string; status: Ticket['status']; prepStartedAt?: string; timeline?: any[]; senderId: string }) => {
    if (data.senderId === clientSessionId) return;
    console.log('[Socket] order.status_changed received:', data);
    usePosStore.getState().applyRemoteEvent('order.status_changed', {
      ticketId: data.ticketId,
      status: data.status,
      prepStartedAt: data.prepStartedAt,
      timeline: data.timeline
    });
  });

  socket.on('table.updated', (data: { tableId: number; update: Partial<Table>; senderId: string }) => {
    if (data.senderId === clientSessionId) return;
    console.log('[Socket] table.updated received:', data);
    usePosStore.getState().applyRemoteEvent('table.updated', { tableId: data.tableId, update: data.update });
  });

  socket.on('payment.completed', (data: { entry: HistoryItem; senderId: string }) => {
    if (data.senderId === clientSessionId) return;
    console.log('[Socket] payment.completed received:', data);
    usePosStore.getState().applyRemoteEvent('payment.completed', data.entry);
  });

  socket.on('kitchen.updated', (data: { ticketId: string; itemIdx: number; completed: boolean; senderId: string }) => {
    if (data.senderId === clientSessionId) return;
    console.log('[Socket] kitchen.updated received:', data);
    usePosStore.getState().applyRemoteEvent('kitchen.updated', {
      ticketId: data.ticketId,
      itemIdx: data.itemIdx,
      completed: data.completed
    });
  });

  listenersAttached = true;
};

export const cleanupRealtime = () => {
  const socket = getSocket();
  socket.off('connect');
  socket.off('disconnect');
  socket.off('connect_error');
  socket.off('reconnecting');
  socket.off('reconnect_attempt');
  socket.off('order.created');
  socket.off('order.updated');
  socket.off('order.status_changed');
  socket.off('table.updated');
  socket.off('payment.completed');
  socket.off('kitchen.updated');
  listenersAttached = false;
};
