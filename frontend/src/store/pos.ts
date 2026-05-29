import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuthStore } from './auth';

export interface ProductVariant {
  id: string;
  name: string;
  price: number;
}

export interface Modifier {
  id: string;
  name: string;
  price: number;
}

export interface ModifierGroup {
  id: string;
  name: string;
  modifiers: Modifier[];
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image?: string;
  available?: boolean;
  variants?: ProductVariant[];
  modifierGroups?: ModifierGroup[];
}

export interface Category {
  id: string;
  name: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  variantId?: string;
  variantName?: string;
  modifiers?: {
    id: string;
    name: string;
    price: number;
  }[];
  notes?: string;
  completed?: boolean;
}

export interface TimelineStep {
  status: string;
  time: string;
  employee: string;
  notes?: string;
}

export interface Ticket {
  id: string;
  table: string;
  time: string;
  duration: string;
  server: string;
  status: 'DRAFT' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'SERVED' | 'PAID' | 'CLOSED' | 'CANCELLED' | 'pending' | 'preparing' | 'delayed';
  items: OrderItem[];
  createdAt?: string;
  prepStartedAt?: string;
  timeline?: TimelineStep[];
}

export interface Table {
  id: number;
  name: string;
  capacity: number;
  status: 'free' | 'occupied' | 'reserved' | 'cleaning';
  activeOrderTotal?: number;
  activeOrder?: OrderItem[];
  guests?: number;
  sessionToken?: string;
  needsWaiter?: boolean;
  billRequested?: boolean;
  billPaid?: boolean;
  reviewSubmitted?: boolean;
  paymentMethod?: 'cash' | 'card';
  checkInTime?: string;
}

export interface HistoryItem {
  id: string;
  tableName: string;
  guests: number;
  checkIn: string;
  checkOut: string;
  duration: string;
  items: OrderItem[];
  subtotal: number;
  total: number;
  tax: number;
  paymentMethod?: 'cash' | 'card';
}

export interface AuditLog {
  id: string;
  time: string;
  employee: string;
  operation: 'TRANSFER' | 'MERGE' | 'SPLIT' | 'VOID_ITEM' | 'MODIFY' | 'REOPEN';
  description: string;
  details?: any;
}

interface PosState {
  tickets: Ticket[];
  tables: Table[];
  history: HistoryItem[];
  products: Product[];
  categories: Category[];
  auditLogs?: AuditLog[];
  socketStatus: 'connected' | 'reconnecting' | 'offline';
  setSocketStatus: (status: 'connected' | 'reconnecting' | 'offline') => void;
  applyRemoteEvent: (eventCategory: string, payload: any) => void;
  addTicket: (ticket: Ticket) => void;
  addToExistingTicketByTable: (tableName: string, items: OrderItem[]) => void;
  updateTicketStatus: (id: string, status: Ticket['status']) => void;
  markTicketReady: (id: string) => void;
  toggleItemComplete: (ticketId: string, itemIdx: number) => void;
  updateTableStatus: (id: number, status: Table['status'], total?: number, guests?: number, sessionToken?: string) => void;
  updateTableOrder: (id: number, newItems: OrderItem[]) => void;
  setNeedsWaiter: (id: number, needsWaiter: boolean) => void;
  setBillRequested: (id: number, billRequested: boolean) => void;
  setBillPaid: (id: number, billPaid: boolean, method?: 'cash' | 'card') => void;
  setReviewSubmitted: (id: number, submitted: boolean) => void;
  updateTableCapacity: (id: number, capacity: number) => void;
  addTable: (capacity: number) => void;
  deleteTable: (id: number) => void;
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  addCategory: (name: string) => void;
  deleteCategory: (id: string) => void;
  addHistoryEntry: (entry: HistoryItem) => void;
  transferTable: (fromTableId: number, toTableId: number) => { success: boolean; error?: string };
  mergeTables: (fromTableId: number, toTableId: number) => { success: boolean; error?: string };
  splitBill: (tableId: number, splitItems: { itemId: string; quantity: number }[], paymentMethod: 'cash' | 'card') => { success: boolean; error?: string };
  voidItem: (ticketId: string, itemId: string, quantity: number, reason: string) => { success: boolean; error?: string };
  modifyOrder: (ticketId: string, updatedItems: OrderItem[]) => { success: boolean; error?: string };
  reopenOrder: (historyId: string) => { success: boolean; error?: string };
}

const initialTables: Table[] = [
  { id: 1, name: 'T-01', capacity: 2, status: 'free' },
  { id: 2, name: 'T-02', capacity: 2, status: 'occupied', activeOrderTotal: 34.50 },
  { id: 3, name: 'T-03', capacity: 4, status: 'free' },
  { id: 4, name: 'T-04', capacity: 4, status: 'free' },
  { id: 5, name: 'T-05', capacity: 6, status: 'reserved' },
  { id: 6, name: 'T-06', capacity: 2, status: 'free' },
  { id: 7, name: 'T-07', capacity: 2, status: 'occupied', activeOrderTotal: 12.00 },
  { id: 8, name: 'T-08', capacity: 4, status: 'free' },
  { id: 9, name: 'T-09', capacity: 4, status: 'free' },
  { id: 10, name: 'T-10', capacity: 8, status: 'free' },
];

const initialTickets: Ticket[] = [
  {
    id: 'TKT-104',
    table: 'T-02',
    time: '12:45 PM',
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 mins ago
    prepStartedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(), // 25 mins ago
    duration: '4m 30s',
    server: 'Sarah M.',
    status: 'PREPARING',
    items: [
      { id: '1', productId: '1', quantity: 2, name: 'Cappuccino', notes: 'Extra hot', price: 4.5, completed: true },
      { id: '2', productId: '2', quantity: 1, name: 'Croissant', price: 4.0, completed: false },
    ],
    timeline: [
      { status: 'CONFIRMED', time: '12:45 PM', employee: 'Sarah M.', notes: 'Order initiated' },
      { status: 'PREPARING', time: '12:50 PM', employee: 'Kitchen / المطبخ', notes: 'Preparation started' }
    ]
  }
];

const initialProducts: Product[] = [
  { id: '1', name: 'Espresso', price: 3.50, category: 'Coffee' },
  { id: '2', name: 'Cappuccino', price: 4.50, category: 'Coffee' },
  { id: '3', name: 'Latte', price: 5.00, category: 'Coffee' },
  { id: '4', name: 'Americano', price: 3.80, category: 'Coffee' },
  { id: '5', name: 'Croissant', price: 4.00, category: 'Pastries' },
  { id: '6', name: 'Pain au Chocolat', price: 4.50, category: 'Pastries' },
  { id: '7', name: 'Green Tea', price: 3.00, category: 'Tea' },
  { id: '8', name: 'Earl Grey', price: 3.00, category: 'Tea' },
  { id: '9', name: 'Turkey Sandwich', price: 8.50, category: 'Sandwiches' },
  { id: '10', name: 'Iced Coffee', price: 4.50, category: 'Cold Drinks' },
];

const initialCategories: Category[] = [
  { id: 'Coffee', name: 'Coffee' },
  { id: 'Tea', name: 'Tea' },
  { id: 'Pastries', name: 'Pastries' },
  { id: 'Sandwiches', name: 'Sandwiches' },
  { id: 'Cold Drinks', name: 'Cold Drinks' },
];

const lazyEmitSocket = (event: string, data: any) => {
  import('@/api/socketService').then(m => m.emitSocket(event, data)).catch(err => {
    console.error('Failed to emit socket event asynchronously:', err);
  });
};

export const usePosStore = create<PosState>()(
  persist(
    (set) => ({
      tickets: initialTickets,
      tables: initialTables,
      history: [],
      products: initialProducts,
      categories: initialCategories,
      auditLogs: [],
      socketStatus: 'offline',
      setSocketStatus: (status) => set({ socketStatus: status }),
      applyRemoteEvent: (eventCategory, payload) => set((state) => {
        console.log('[Zustand] applyRemoteEvent:', eventCategory, payload);
        switch (eventCategory) {
          case 'order.created': {
            const ticketExists = state.tickets.some(t => t.id === payload.id);
            if (!ticketExists) {
              return { tickets: [payload, ...state.tickets] };
            }
            return state;
          }
          case 'order.updated': {
            return {
              tickets: state.tickets.map(t => t.id === payload.ticketId ? { ...t, ...payload.update } : t)
            };
          }
          case 'order.status_changed': {
            return {
              tickets: state.tickets.map(t => {
                if (t.id !== payload.ticketId) return t;
                return {
                  ...t,
                  status: payload.status,
                  prepStartedAt: payload.prepStartedAt !== undefined ? payload.prepStartedAt : t.prepStartedAt,
                  timeline: payload.timeline !== undefined ? payload.timeline : t.timeline
                };
              })
            };
          }
          case 'table.updated': {
            return {
              tables: state.tables.map(t => t.id === payload.tableId ? { ...t, ...payload.update } : t)
            };
          }
          case 'payment.completed': {
            const historyExists = state.history.some(h => h.id === payload.id);
            if (!historyExists) {
              return { history: [payload, ...state.history] };
            }
            return state;
          }
          case 'payment.removed': {
            return {
              history: state.history.filter(h => h.id !== payload.historyId)
            };
          }
          case 'audit_log.created': {
            const exists = (state.auditLogs || []).some(l => l.id === payload.log.id);
            if (!exists) {
              return {
                auditLogs: [payload.log, ...(state.auditLogs || [])]
              };
            }
            return state;
          }
          case 'kitchen.updated': {
            return {
              tickets: state.tickets.map(t => {
                if (t.id !== payload.ticketId) return t;
                const newItems = [...t.items];
                if (newItems[payload.itemIdx]) {
                  newItems[payload.itemIdx] = { ...newItems[payload.itemIdx], completed: payload.completed };
                }
                return { ...t, items: newItems };
              })
            };
          }
          default:
            return state;
        }
      }),
  addTicket: (ticket) => set((state) => {
    // Gracefully handle 'pending' or 'preparing' mapping to standard uppercase statuses
    let freshStatus: Ticket['status'] = 'CONFIRMED';
    if (ticket.status === 'pending') freshStatus = 'CONFIRMED';
    else if (ticket.status === 'preparing') freshStatus = 'PREPARING';
    else if (ticket.status) freshStatus = ticket.status as Ticket['status'];

    const employee = useAuthStore.getState().user?.name || ticket.server || 'Staff';
    const enrichedTicket: Ticket = {
      ...ticket,
      status: freshStatus,
      createdAt: ticket.createdAt || new Date().toISOString(),
      timeline: ticket.timeline || [
        {
          status: freshStatus,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          employee,
          notes: 'Order created'
        }
      ]
    };
    
    lazyEmitSocket('order.created', { ticket: enrichedTicket });

    return { tickets: [enrichedTicket, ...state.tickets] };
  }),
  addToExistingTicketByTable: (tableName, items) => set((state) => {
    const existingTicketIndex = state.tickets.findIndex(t => t.table === tableName && !['CLOSED', 'CANCELLED', 'PAID'].includes(t.status));
    const employee = useAuthStore.getState().user?.name || 'Staff';
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (existingTicketIndex >= 0) {
      const newTickets = [...state.tickets];
      const origTicket = newTickets[existingTicketIndex];
      const updatedTimeline = [...(origTicket.timeline || [])];
      
      updatedTimeline.push({
        status: 'CONFIRMED',
        time: timeNow,
        employee,
        notes: `Added ${items.length} item(s) to order. Resetting status to CONFIRMED for preparation.`
      });

      const updatedTicket: Ticket = {
        ...origTicket,
        status: 'CONFIRMED', // Reset status to CONFIRMED so it reappears on the KDS and resets to preparation stage
        items: [...origTicket.items, ...items],
        timeline: updatedTimeline
      };
      newTickets[existingTicketIndex] = updatedTicket;

      lazyEmitSocket('order.updated', { ticketId: origTicket.id, update: updatedTicket });

      return { tickets: newTickets };
    } else {
      const newTicket: Ticket = {
        id: `TKT-${Math.floor(Math.random() * 1000)}`,
        table: tableName,
        time: timeNow,
        createdAt: new Date().toISOString(),
        duration: '0m',
        server: employee,
        status: 'CONFIRMED',
        items: items,
        timeline: [
          {
            status: 'CONFIRMED',
            time: timeNow,
            employee,
            notes: 'Order created'
          }
        ]
      };

      lazyEmitSocket('order.created', { ticket: newTicket });

      return { tickets: [newTicket, ...state.tickets] };
    }
  }),
  addHistoryEntry: (entry) => set((state) => ({
    history: [entry, ...state.history]
  })),
  updateTicketStatus: (id, status) => set((state) => {
    const employee = useAuthStore.getState().user?.name || 'Staff';
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    let prepStartedAt: string | undefined;
    let timeline: any[] = [];

    const updatedTickets: Ticket[] = state.tickets.map(t => {
      if (t.id !== id) return t;
      const tline = [...(t.timeline || [])];
      tline.push({
        status,
        time: timeNow,
        employee,
        notes: `Status transitioned to ${status}`
      });
      prepStartedAt = status === 'PREPARING' ? new Date().toISOString() : t.prepStartedAt;
      timeline = tline;
      return {
        ...t,
        status: status as Ticket['status'],
        prepStartedAt,
        timeline: tline
      };
    });

    lazyEmitSocket('order.status_changed', { ticketId: id, status, prepStartedAt, timeline });

    return { tickets: updatedTickets };
  }),
  markTicketReady: (id) => set((state) => {
    const employee = useAuthStore.getState().user?.name || 'Kitchen / المطبخ';
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    let timeline: any[] = [];
    const updatedTickets: Ticket[] = state.tickets.map(t => {
      if (t.id !== id) return t;
      const tline = [...(t.timeline || [])];
      tline.push({
        status: 'READY',
        time: timeNow,
        employee,
        notes: 'Marked ready for delivery'
      });
      timeline = tline;
      return {
        ...t,
        status: 'READY' as Ticket['status'],
        timeline: tline
      };
    });

    lazyEmitSocket('order.status_changed', { ticketId: id, status: 'READY', timeline });

    return { tickets: updatedTickets };
  }),
  toggleItemComplete: (ticketId, itemIdx) => set((state) => {
    let completed = false;
    const updatedTickets: Ticket[] = state.tickets.map(t => {
      if (t.id === ticketId) {
        const newItems = [...t.items];
        if (newItems[itemIdx]) {
          completed = !newItems[itemIdx].completed;
          newItems[itemIdx] = { ...newItems[itemIdx], completed };
        }
        return { ...t, items: newItems };
      }
      return t;
    });

    lazyEmitSocket('kitchen.updated', { ticketId, itemIdx, completed });

    return { tickets: updatedTickets };
  }),
  updateTableStatus: (id, status, total, guests, sessionToken) => set((state) => {
    const table = state.tables.find(t => t.id === id);
    if (!table) return state;

    // If session is ending (cleaning or free), add to history
    let newHistory = state.history;
    let historyEntry: HistoryItem | null = null;

    if ((status === 'free' || status === 'cleaning') && (table.status === 'occupied' || table.status === 'reserved')) {
      const checkOut = new Date().toISOString();
      const checkIn = table.checkInTime || new Date().toISOString();
      
      const diffMs = new Date(checkOut).getTime() - new Date(checkIn).getTime();
      const diffMins = Math.max(1, Math.floor(diffMs / 60000));
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

      const subtotal = table.activeOrderTotal || 0;
      // Note: We'll assume default tax rate from settings store isn't here, 
      // so we just record what we have. Real values will come from components if needed
      // but for history consistency we'll use a snapshot.
      const taxRate = 16; // Static for history snapshot if store doesn't have it
      const taxAmount = subtotal * (taxRate / 100);
      const totalAmount = subtotal + taxAmount;

      historyEntry = {
        id: `HIST-${Date.now()}`,
        tableName: table.name,
        guests: table.guests || 1,
        checkIn: checkIn,
        checkOut: checkOut,
        duration: durationStr,
        items: table.activeOrder || [],
        subtotal: subtotal,
        tax: taxAmount,
        total: totalAmount,
        paymentMethod: table.paymentMethod
      };
      newHistory = [historyEntry, ...state.history];
    }

    const isNowOccupied = status === 'occupied' || status === 'reserved';
    const wasPreviouslyFree = table.status === 'free' || table.status === 'cleaning';

    const updatedTable = { 
      ...table, 
      status, 
      activeOrderTotal: total ?? table.activeOrderTotal, 
      activeOrder: (status === 'free' || status === 'cleaning') ? [] : table.activeOrder,
      guests: guests ?? table.guests,
      sessionToken: sessionToken || (status === 'free' || status === 'cleaning' ? undefined : table.sessionToken),
      needsWaiter: (status === 'free' || status === 'cleaning') ? false : table.needsWaiter,
      billRequested: (status === 'free' || status === 'cleaning') ? false : table.billRequested,
      billPaid: (status === 'free' || status === 'cleaning') ? false : table.billPaid,
      reviewSubmitted: (status === 'free' || status === 'cleaning') ? false : table.reviewSubmitted,
      paymentMethod: (status === 'free' || status === 'cleaning') ? undefined : table.paymentMethod,
      checkInTime: (isNowOccupied && wasPreviouslyFree) ? new Date().toISOString() : ((status === 'free' || status === 'cleaning') ? undefined : table.checkInTime)
    };

    lazyEmitSocket('table.updated', { tableId: id, update: updatedTable });
    if (historyEntry) {
      lazyEmitSocket('payment.completed', { entry: historyEntry });
    }

    return {
      history: newHistory,
      tables: state.tables.map(t => t.id === id ? updatedTable : t)
    };
  }),
  setNeedsWaiter: (id, needsWaiter) => set((state) => {
    lazyEmitSocket('table.updated', { tableId: id, update: { needsWaiter } });
    return {
      tables: state.tables.map(t => t.id === id ? { ...t, needsWaiter } : t)
    };
  }),
  setBillRequested: (id, billRequested) => set((state) => {
    lazyEmitSocket('table.updated', { tableId: id, update: { billRequested } });
    return {
      tables: state.tables.map(t => t.id === id ? { ...t, billRequested } : t)
    };
  }),
  setBillPaid: (id, billPaid, method) => set((state) => {
    lazyEmitSocket('table.updated', { tableId: id, update: { billPaid, paymentMethod: method } });
    return {
      tables: state.tables.map(t => t.id === id ? { ...t, billPaid, paymentMethod: method } : t)
    };
  }),
  setReviewSubmitted: (id, reviewSubmitted) => set((state) => {
    lazyEmitSocket('table.updated', { tableId: id, update: { reviewSubmitted } });
    return {
      tables: state.tables.map(t => t.id === id ? { ...t, reviewSubmitted } : t)
    };
  }),
  updateTableOrder: (id, newItems) => set((state) => {
    let updatedTable: Table | undefined;
    const updatedTables = state.tables.map(t => {
      if (t.id !== id) return t;
      const existingOrder = t.activeOrder || [];
      
      // Combine identical items
      const combinedItems = [...existingOrder];
      for (const newItem of newItems) {
        const existingItemIndex = combinedItems.findIndex(i => i.productId === newItem.productId && i.notes === newItem.notes);
        if (existingItemIndex >= 0) {
          combinedItems[existingItemIndex] = {
            ...combinedItems[existingItemIndex],
            quantity: combinedItems[existingItemIndex].quantity + newItem.quantity
          };
        } else {
          combinedItems.push(newItem);
        }
      }
      
      const newTotal = combinedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
      
      updatedTable = {
        ...t,
        activeOrder: combinedItems,
        activeOrderTotal: newTotal,
      };
      return updatedTable;
    });

    if (updatedTable) {
      lazyEmitSocket('table.updated', { tableId: id, update: updatedTable });
    }

    return { tables: updatedTables };
  }),
  updateTableCapacity: (id, capacity) => set((state) => ({
    tables: state.tables.map(t => t.id === id ? { ...t, capacity } : t)
  })),
  addTable: (capacity) => set((state) => {
    const nextIndex = state.tables.length + 1;
    const newTable: Table = {
      id: Date.now(), // Use a timestamp for unique internal ID
      name: `T-${nextIndex.toString().padStart(2, '0')}`,
      capacity,
      status: 'free'
    };
    return { tables: [...state.tables, newTable] };
  }),
  deleteTable: (id) => set((state) => {
    const filtered = state.tables.filter(t => t.id !== id);
    // Re-sequence names
    const resequenced = filtered.map((t, idx) => ({
      ...t,
      name: `T-${(idx + 1).toString().padStart(2, '0')}`
    }));
    return { tables: resequenced };
  }),
  addProduct: (product) => set((state) => ({
    products: [...state.products, { ...product, id: Math.random().toString(36).substr(2, 9) }]
  })),
  updateProduct: (id, updatedProduct) => set((state) => ({
    products: state.products.map(p => p.id === id ? { ...p, ...updatedProduct } : p)
  })),
  deleteProduct: (id) => set((state) => ({
    products: state.products.filter(p => p.id !== id)
  })),
  addCategory: (name) => set((state) => ({
    categories: [...state.categories, { id: name, name }]
  })),
  deleteCategory: (id) => set((state) => ({
    categories: state.categories.filter(c => c.id !== id)
  })),
  transferTable: (fromTableId, toTableId) => {
    let success = false;
    let error: string | undefined;

    set((state) => {
      const fromTable = state.tables.find(t => t.id === fromTableId);
      const toTable = state.tables.find(t => t.id === toTableId);

      if (!fromTable) {
        error = "Source table not found";
        return state;
      }
      if (!toTable) {
        error = "Destination table not found";
        return state;
      }
      if (fromTable.status === 'free' || !fromTable.activeOrder || fromTable.activeOrder.length === 0) {
        error = "Source table is empty / لا توجد طلبات على الطاولة الحالية";
        return state;
      }
      if (toTable.status !== 'free' && toTable.status !== 'cleaning') {
        error = "Destination table is occupied / الطاولة المستهدفة مشغولة حالياً";
        return state;
      }

      const employee = useAuthStore.getState().user?.name || 'Staff';
      const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Move orders
      const updatedToTable: Table = {
        ...toTable,
        status: 'occupied',
        activeOrder: fromTable.activeOrder,
        activeOrderTotal: fromTable.activeOrderTotal,
        guests: fromTable.guests || 2,
        sessionToken: fromTable.sessionToken,
        checkInTime: fromTable.checkInTime || new Date().toISOString(),
        needsWaiter: fromTable.needsWaiter,
        billRequested: fromTable.billRequested,
        billPaid: fromTable.billPaid,
        paymentMethod: fromTable.paymentMethod,
      };

      const updatedFromTable: Table = {
        ...fromTable,
        status: 'free',
        activeOrder: [],
        activeOrderTotal: 0,
        guests: undefined,
        sessionToken: undefined,
        checkInTime: undefined,
        needsWaiter: false,
        billRequested: false,
        billPaid: false,
        paymentMethod: undefined,
      };

      // Clear out running tickets and pointing to toTable
      const updatedTickets = state.tickets.map(ticket => {
        const isTicketActive = !['CLOSED', 'CANCELLED', 'PAID'].includes(ticket.status);
        if (ticket.table === fromTable.name && isTicketActive) {
          const updatedTimeline = [...(ticket.timeline || [])];
          updatedTimeline.push({
            status: ticket.status,
            time: timeNow,
            employee,
            notes: `Table transferred from ${fromTable.name} to ${toTable.name}`
          });

          const newTkt = {
            ...ticket,
            table: toTable.name,
            timeline: updatedTimeline
          };

          lazyEmitSocket('order.updated', { ticketId: ticket.id, update: newTkt });
          return newTkt;
        }
        return ticket;
      });

      // Register Audit Log
      const logId = `AUDIT-${Date.now()}`;
      const logEntry: AuditLog = {
        id: logId,
        time: new Date().toISOString(),
        employee,
        operation: 'TRANSFER',
        description: `Transferred outstanding order on table ${fromTable.name} over to table ${toTable.name}`,
        details: {
          before: { tableName: fromTable.name, total: fromTable.activeOrderTotal },
          after: { tableName: toTable.name, total: fromTable.activeOrderTotal }
        }
      };

      lazyEmitSocket('table.updated', { tableId: fromTableId, update: updatedFromTable });
      lazyEmitSocket('table.updated', { tableId: toTableId, update: updatedToTable });
      lazyEmitSocket('audit_log.created', { log: logEntry });

      success = true;
      return {
        tables: state.tables.map(t => {
          if (t.id === fromTableId) return updatedFromTable;
          if (t.id === toTableId) return updatedToTable;
          return t;
        }),
        tickets: updatedTickets,
        auditLogs: [logEntry, ...(state.auditLogs || [])]
      };
    });

    return { success, error };
  },

  mergeTables: (fromTableId, toTableId) => {
    let success = false;
    let error: string | undefined;

    set((state) => {
      const fromTable = state.tables.find(t => t.id === fromTableId);
      const toTable = state.tables.find(t => t.id === toTableId);

      if (!fromTable || !toTable) {
        error = "Tables not found";
        return state;
      }
      if (fromTable.status === 'free' || !fromTable.activeOrder || fromTable.activeOrder.length === 0) {
        error = "Source table is empty";
        return state;
      }
      if (toTable.status === 'free' || !toTable.activeOrder || toTable.activeOrder.length === 0) {
        error = "Destination table is empty";
        return state;
      }

      const employee = useAuthStore.getState().user?.name || 'Staff';
      const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Combine orders
      const combinedOrder = [...toTable.activeOrder];
      for (const newItem of fromTable.activeOrder) {
        const idx = combinedOrder.findIndex(i => i.productId === newItem.productId && i.notes === newItem.notes);
        if (idx >= 0) {
          combinedOrder[idx] = {
            ...combinedOrder[idx],
            quantity: combinedOrder[idx].quantity + newItem.quantity
          };
        } else {
          combinedOrder.push(newItem);
        }
      }

      const combinedTotal = combinedOrder.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      const updatedToTable: Table = {
        ...toTable,
        activeOrder: combinedOrder,
        activeOrderTotal: combinedTotal,
        guests: (toTable.guests || 2) + (fromTable.guests || 2)
      };

      const updatedFromTable: Table = {
        ...fromTable,
        status: 'free',
        activeOrder: [],
        activeOrderTotal: 0,
        guests: undefined,
        sessionToken: undefined,
        checkInTime: undefined,
        needsWaiter: false,
        billRequested: false,
        billPaid: false,
        paymentMethod: undefined,
      };

      // Consolidate tickets
      const fromTicket = state.tickets.find(t => t.table === fromTable.name && !['CLOSED', 'CANCELLED', 'PAID'].includes(t.status));
      const toTicket = state.tickets.find(t => t.table === toTable.name && !['CLOSED', 'CANCELLED', 'PAID'].includes(t.status));

      let updatedTickets = [...state.tickets];

      if (fromTicket) {
        if (toTicket) {
          const mergedItems = [...toTicket.items];
          for (const item of fromTicket.items) {
            const idx = mergedItems.findIndex(i => i.productId === item.productId && i.notes === item.notes);
            if (idx >= 0) {
              mergedItems[idx] = {
                ...mergedItems[idx],
                quantity: mergedItems[idx].quantity + item.quantity
              };
            } else {
              mergedItems.push(item);
            }
          }

          const updatedTimeline = [...(toTicket.timeline || [])];
          updatedTimeline.push({
            status: toTicket.status,
            time: timeNow,
            employee,
            notes: `Merged table ${fromTable.name}'s items into this ticket`
          });

          const mergedToTicket: Ticket = {
            ...toTicket,
            items: mergedItems,
            timeline: updatedTimeline,
            status: 'CONFIRMED'
          };

          updatedTickets = updatedTickets.map(t => {
            if (t.id === toTicket.id) return mergedToTicket;
            if (t.id === fromTicket.id) {
              return {
                ...t,
                status: 'CLOSED',
                timeline: [...(t.timeline || []), { status: 'CLOSED', time: timeNow, employee, notes: `Merged with table ${toTable.name}` }]
              };
            }
            return t;
          });

          lazyEmitSocket('order.updated', { ticketId: toTicket.id, update: mergedToTicket });
          lazyEmitSocket('order.updated', { ticketId: fromTicket.id, update: { status: 'CLOSED' } });
        } else {
          updatedTickets = updatedTickets.map(t => {
            if (t.id === fromTicket.id) {
              const updatedTimeline = [...(t.timeline || [])];
              updatedTimeline.push({
                status: t.status,
                time: timeNow,
                employee,
                notes: `Transferred ticket to table ${toTable.name} due to table merge`
              });
              const movedTkt = {
                ...t,
                table: toTable.name,
                timeline: updatedTimeline
              };
              lazyEmitSocket('order.updated', { ticketId: t.id, update: movedTkt });
              return movedTkt;
            }
            return t;
          });
        }
      }

      // Audit Log
      const logId = `AUDIT-${Date.now()}`;
      const logEntry: AuditLog = {
        id: logId,
        time: new Date().toISOString(),
        employee,
        operation: 'MERGE',
        description: `Merged table ${fromTable.name} items into table ${toTable.name} order list`,
        details: {
          before: { fromTable: fromTable.name, toTable: toTable.name },
          after: { combinedTotal }
        }
      };

      lazyEmitSocket('table.updated', { tableId: fromTableId, update: updatedFromTable });
      lazyEmitSocket('table.updated', { tableId: toTableId, update: updatedToTable });
      lazyEmitSocket('audit_log.created', { log: logEntry });

      success = true;
      return {
        tables: state.tables.map(t => {
          if (t.id === fromTableId) return updatedFromTable;
          if (t.id === toTableId) return updatedToTable;
          return t;
        }),
        tickets: updatedTickets,
        auditLogs: [logEntry, ...(state.auditLogs || [])]
      };
    });

    return { success, error };
  },

  splitBill: (tableId, splitItems, paymentMethod) => {
    let success = false;
    let error: string | undefined;

    set((state) => {
      const table = state.tables.find(t => t.id === tableId);
      if (!table) {
        error = "Table not found";
        return state;
      }
      if (table.status === 'free' || !table.activeOrder || table.activeOrder.length === 0) {
        error = "Table is not occupied";
        return state;
      }

      const activeOrder = [...table.activeOrder];
      const paidItems: OrderItem[] = [];

      for (const splitItem of splitItems) {
        const existingItem = activeOrder.find(item => item.id === splitItem.itemId);
        if (!existingItem) {
          error = `Item ${splitItem.itemId} not found in active order`;
          return state;
        }
        if (splitItem.quantity <= 0 || splitItem.quantity > existingItem.quantity) {
          error = `Invalid quantity (${splitItem.quantity}) for split item ${existingItem.name}`;
          return state;
        }
      }

      // Restructure order list
      const updatedActiveOrder: OrderItem[] = [];
      for (const item of activeOrder) {
        const splitTarget = splitItems.find(s => s.itemId === item.id);
        if (splitTarget) {
          const remainingQuantity = item.quantity - splitTarget.quantity;
          paidItems.push({
            ...item,
            quantity: splitTarget.quantity
          });
          if (remainingQuantity > 0) {
            updatedActiveOrder.push({
              ...item,
              quantity: remainingQuantity
            });
          }
        } else {
          updatedActiveOrder.push(item);
        }
      }

      const employee = useAuthStore.getState().user?.name || 'Staff';
      const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Financials
      const remainingTotal = updatedActiveOrder.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const splitSubtotal = paidItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const splitTax = splitSubtotal * 0.16; // Consistent 16% Tax
      const splitTotal = splitSubtotal + splitTax;

      const historyId = `HIST-${Date.now()}`;
      const newHistoryItem: HistoryItem = {
        id: historyId,
        tableName: `${table.name} (Split / مجزأ)`,
        guests: 1,
        checkIn: table.checkInTime || new Date().toISOString(),
        checkOut: new Date().toISOString(),
        duration: 'Split',
        items: paidItems,
        subtotal: splitSubtotal,
        tax: splitTax,
        total: splitTotal,
        paymentMethod
      };

      // Subtract split items from active tickets
      const activeTicket = state.tickets.find(t => t.table === table.name && !['CLOSED', 'CANCELLED', 'PAID'].includes(t.status));
      let updatedTickets = state.tickets;

      if (activeTicket) {
        const updatedTicketItems: OrderItem[] = [];
        for (const item of activeTicket.items) {
          const splitTarget = splitItems.find(s => s.itemId === item.id);
          if (splitTarget) {
            const remainingQuantity = item.quantity - splitTarget.quantity;
            if (remainingQuantity > 0) {
              updatedTicketItems.push({
                ...item,
                quantity: remainingQuantity
              });
            }
          } else {
            updatedTicketItems.push(item);
          }
        }

        if (updatedTicketItems.length > 0) {
          const updatedTimeline = [...(activeTicket.timeline || [])];
          updatedTimeline.push({
            status: activeTicket.status,
            time: timeNow,
            employee,
            notes: `Processed partial bill split: ${paidItems.length} items voided and settled.`
          });

          updatedTickets = state.tickets.map(t => {
            if (t.id === activeTicket.id) {
              return {
                ...t,
                items: updatedTicketItems,
                timeline: updatedTimeline
              };
            }
            return t;
          });
          lazyEmitSocket('order.updated', { ticketId: activeTicket.id, update: { items: updatedTicketItems, timeline: updatedTimeline } });
        } else {
          updatedTickets = state.tickets.map(t => {
            if (t.id === activeTicket.id) {
              return {
                ...t,
                status: 'CLOSED',
                timeline: [...(t.timeline || []), { status: 'CLOSED', time: timeNow, employee, notes: 'Split bill: fully paid and closed.' }]
              };
            }
            return t;
          });
          lazyEmitSocket('order.updated', { ticketId: activeTicket.id, update: { status: 'CLOSED' } });
        }
      }

      const isTableEmptyNow = updatedActiveOrder.length === 0;
      const updatedTable: Table = {
        ...table,
        status: isTableEmptyNow ? 'free' : table.status,
        activeOrder: updatedActiveOrder,
        activeOrderTotal: remainingTotal,
        guests: isTableEmptyNow ? undefined : table.guests,
        sessionToken: isTableEmptyNow ? undefined : table.sessionToken,
        checkInTime: isTableEmptyNow ? undefined : table.checkInTime,
        needsWaiter: isTableEmptyNow ? false : table.needsWaiter,
        billRequested: isTableEmptyNow ? false : table.billRequested,
        billPaid: isTableEmptyNow ? false : table.billPaid,
        paymentMethod: isTableEmptyNow ? undefined : table.paymentMethod
      };

      // Audit Log
      const logEntry: AuditLog = {
        id: `AUDIT-${Date.now()}`,
        time: new Date().toISOString(),
        employee,
        operation: 'SPLIT',
        description: `Split bill on table ${table.name}. Split total of $${splitTotal.toFixed(2)} finalized and closed.`,
        details: {
          remainingItems: updatedActiveOrder.length,
          settledItemsCount: paidItems.length
        }
      };

      lazyEmitSocket('table.updated', { tableId: tableId, update: updatedTable });
      lazyEmitSocket('payment.completed', { entry: newHistoryItem });
      lazyEmitSocket('audit_log.created', { log: logEntry });

      success = true;
      return {
        tables: state.tables.map(t => t.id === tableId ? updatedTable : t),
        tickets: updatedTickets,
        history: [newHistoryItem, ...state.history],
        auditLogs: [logEntry, ...(state.auditLogs || [])]
      };
    });

    return { success, error };
  },

  voidItem: (ticketId, itemId, quantity, reason) => {
    let success = false;
    let error: string | undefined;

    set((state) => {
      const ticket = state.tickets.find(t => t.id === ticketId);
      if (!ticket) {
        error = "Ticket not found";
        return state;
      }

      const itemIdx = ticket.items.findIndex(it => it.id === itemId);
      if (itemIdx < 0) {
        error = "Item not found in ticket";
        return state;
      }

      const originalItem = ticket.items[itemIdx];
      if (quantity <= 0 || quantity > originalItem.quantity) {
        error = "Invalid void quantity restriction";
        return state;
      }

      const employee = useAuthStore.getState().user?.name || 'Staff';
      const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const updatedTicketItems = [...ticket.items];
      const newQty = originalItem.quantity - quantity;

      if (newQty > 0) {
        updatedTicketItems[itemIdx] = {
          ...originalItem,
          quantity: newQty
        };
      } else {
        updatedTicketItems.splice(itemIdx, 1);
      }

      const updatedTimeline = [...(ticket.timeline || [])];
      updatedTimeline.push({
        status: ticket.status,
        time: timeNow,
        employee,
        notes: `Voided quantity of ${quantity}x ${originalItem.name}. Reason: ${reason}`
      });

      const refreshedTicket = {
        ...ticket,
        items: updatedTicketItems,
        timeline: updatedTimeline
      };

      // Synchronize Table order items
      const table = state.tables.find(t => t.name === ticket.table);
      let updatedTables = state.tables;

      if (table && table.activeOrder) {
        const updatedTableItems = [...table.activeOrder];
        const tableMatchIdx = updatedTableItems.findIndex(i => i.productId === originalItem.productId && i.notes === originalItem.notes);

        if (tableMatchIdx >= 0) {
          const tItem = updatedTableItems[tableMatchIdx];
          const calculatedTableQty = tItem.quantity - quantity;
          if (calculatedTableQty > 0) {
            updatedTableItems[tableMatchIdx] = {
              ...tItem,
              quantity: calculatedTableQty
            };
          } else {
            updatedTableItems.splice(tableMatchIdx, 1);
          }
        }

        const isTableNowEmpty = updatedTableItems.length === 0;
        const newTotal = updatedTableItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        const refreshedTable: Table = {
          ...table,
          status: isTableNowEmpty ? 'free' : table.status,
          activeOrder: updatedTableItems,
          activeOrderTotal: newTotal,
          guests: isTableNowEmpty ? undefined : table.guests,
          sessionToken: isTableNowEmpty ? undefined : table.sessionToken,
          checkInTime: isTableNowEmpty ? undefined : table.checkInTime,
          needsWaiter: isTableNowEmpty ? false : table.needsWaiter,
          billRequested: isTableNowEmpty ? false : table.billRequested,
          billPaid: isTableNowEmpty ? false : table.billPaid,
          paymentMethod: isTableNowEmpty ? undefined : table.paymentMethod
        };

        updatedTables = state.tables.map(t => t.id === table.id ? refreshedTable : t);
        lazyEmitSocket('table.updated', { tableId: table.id, update: refreshedTable });
      }

      const logEntry: AuditLog = {
        id: `AUDIT-${Date.now()}`,
        time: new Date().toISOString(),
        employee,
        operation: 'VOID_ITEM',
        description: `Voided ${quantity}x ${originalItem.name} from Order #${ticket.id}. Reason: ${reason}`,
        details: {
          ticketId,
          itemId,
          quantity,
          reason
        }
      };

      lazyEmitSocket('order.updated', { ticketId, update: refreshedTicket });
      lazyEmitSocket('audit_log.created', { log: logEntry });

      success = true;
      return {
        tickets: state.tickets.map(t => t.id === ticketId ? refreshedTicket : t),
        tables: updatedTables,
        auditLogs: [logEntry, ...(state.auditLogs || [])]
      };
    });

    return { success, error };
  },

  modifyOrder: (ticketId, updatedItems) => {
    let success = false;
    let error: string | undefined;

    set((state) => {
      const ticket = state.tickets.find(t => t.id === ticketId);
      if (!ticket) {
        error = "Ticket not found";
        return state;
      }

      const employee = useAuthStore.getState().user?.name || 'Staff';
      const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Identify added items for the kitchen update if applicable
      const updatedTimeline = [...(ticket.timeline || [])];
      updatedTimeline.push({
        status: 'CONFIRMED',
        time: timeNow,
        employee,
        notes: "Modified order items in kitchen system"
      });

      const refreshedTicket: Ticket = {
        ...ticket,
        items: updatedItems,
        status: 'CONFIRMED', // Put back to CONFIRMED for any cooking updates in KDS
        timeline: updatedTimeline
      };

      const table = state.tables.find(t => t.name === ticket.table);
      let updatedTables = state.tables;

      if (table) {
        const isTableNowEmpty = updatedItems.length === 0;
        const newTotal = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        const refreshedTable: Table = {
          ...table,
          status: isTableNowEmpty ? 'free' : table.status,
          activeOrder: updatedItems,
          activeOrderTotal: newTotal,
          guests: isTableNowEmpty ? undefined : table.guests,
          sessionToken: isTableNowEmpty ? undefined : table.sessionToken,
          checkInTime: isTableNowEmpty ? undefined : table.checkInTime,
          needsWaiter: isTableNowEmpty ? false : table.needsWaiter,
          billRequested: isTableNowEmpty ? false : table.billRequested,
          billPaid: isTableNowEmpty ? false : table.billPaid,
          paymentMethod: isTableNowEmpty ? undefined : table.paymentMethod
        };

        updatedTables = state.tables.map(t => t.id === table.id ? refreshedTable : t);
        lazyEmitSocket('table.updated', { tableId: table.id, update: refreshedTable });
      }

      const logEntry: AuditLog = {
        id: `AUDIT-${Date.now()}`,
        time: new Date().toISOString(),
        employee,
        operation: 'MODIFY',
        description: `Modified the active order structures of #${ticket.id}`,
        details: { before: ticket.items, after: updatedItems }
      };

      lazyEmitSocket('order.updated', { ticketId, update: refreshedTicket });
      lazyEmitSocket('audit_log.created', { log: logEntry });

      success = true;
      return {
        tickets: state.tickets.map(t => t.id === ticketId ? refreshedTicket : t),
        tables: updatedTables,
        auditLogs: [logEntry, ...(state.auditLogs || [])]
      };
    });

    return { success, error };
  },

  reopenOrder: (historyId) => {
    let success = false;
    let error: string | undefined;

    set((state) => {
      const closedOrder = state.history.find(h => h.id === historyId);
      if (!closedOrder) {
        error = "Closed order not found in history";
        return state;
      }

      const cleanedTableName = closedOrder.tableName.split(' (')[0];
      const table = state.tables.find(t => t.name === cleanedTableName);

      if (!table) {
        error = `Table ${cleanedTableName} not found`;
        return state;
      }
      if (table.status !== 'free' && table.status !== 'cleaning') {
        error = `Table ${cleanedTableName} is preoccupied, cancel or merge before reopening!`;
        return state;
      }

      const employee = useAuthStore.getState().user?.name || 'Staff';
      const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Restore table
      const updatedTable: Table = {
        ...table,
        status: 'occupied',
        activeOrder: closedOrder.items,
        activeOrderTotal: closedOrder.subtotal,
        guests: closedOrder.guests || 2,
        checkInTime: closedOrder.checkIn || new Date().toISOString(),
        billPaid: false,
        billRequested: false,
        needsWaiter: false,
        paymentMethod: undefined
      };

      const newTicketId = `TKT-${Math.floor(Math.random() * 900) + 100}`;
      const newTicket: Ticket = {
        id: newTicketId,
        table: cleanedTableName,
        time: timeNow,
        createdAt: new Date().toISOString(),
        duration: '0m',
        server: employee,
        status: 'CONFIRMED',
        items: closedOrder.items,
        timeline: [
          {
            status: 'CONFIRMED',
            time: timeNow,
            employee,
            notes: `Authorized reopen audit of completed receipt #${closedOrder.id.split('-')[1] || closedOrder.id}`
          }
        ]
      };

      const logEntry: AuditLog = {
        id: `AUDIT-${Date.now()}`,
        time: new Date().toISOString(),
        employee,
        operation: 'REOPEN',
        description: `Reopened payment completed order #${closedOrder.id.split('-')[1] || closedOrder.id} back to Table ${cleanedTableName}`,
        details: { historyId }
      };

      lazyEmitSocket('payment.removed', { historyId });
      lazyEmitSocket('table.updated', { tableId: table.id, update: updatedTable });
      lazyEmitSocket('order.created', { ticket: newTicket });
      lazyEmitSocket('audit_log.created', { log: logEntry });

      success = true;
      return {
        tables: state.tables.map(t => t.id === table.id ? updatedTable : t),
        tickets: [newTicket, ...state.tickets],
        history: state.history.filter(h => h.id !== historyId),
        auditLogs: [logEntry, ...(state.auditLogs || [])]
      };
    });

    return { success, error };
  },
}), { name: 'pos-storage' }));
