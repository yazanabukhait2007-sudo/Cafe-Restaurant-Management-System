import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  image?: string;
  available?: boolean;
}

export interface Category {
  id: string;
  name: string;
}

export interface OrderItem {
  id: string;
  productId: number;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  completed?: boolean;
}

export interface Ticket {
  id: string;
  table: string;
  time: string;
  duration: string;
  server: string;
  status: 'pending' | 'preparing' | 'delayed';
  items: OrderItem[];
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

interface PosState {
  tickets: Ticket[];
  tables: Table[];
  history: HistoryItem[];
  products: Product[];
  categories: Category[];
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
  updateProduct: (id: number, product: Partial<Product>) => void;
  deleteProduct: (id: number) => void;
  addCategory: (name: string) => void;
  deleteCategory: (id: string) => void;
  addHistoryEntry: (entry: HistoryItem) => void;
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
    duration: '4m 30s',
    server: 'Sarah M.',
    status: 'preparing',
    items: [
      { id: '1', productId: 1, quantity: 2, name: 'Cappuccino', notes: 'Extra hot', price: 4.5, completed: true },
      { id: '2', productId: 2, quantity: 1, name: 'Croissant', price: 4.0, completed: false },
    ]
  }
];

const initialProducts: Product[] = [
  { id: 1, name: 'Espresso', price: 3.50, category: 'Coffee' },
  { id: 2, name: 'Cappuccino', price: 4.50, category: 'Coffee' },
  { id: 3, name: 'Latte', price: 5.00, category: 'Coffee' },
  { id: 4, name: 'Americano', price: 3.80, category: 'Coffee' },
  { id: 5, name: 'Croissant', price: 4.00, category: 'Pastries' },
  { id: 6, name: 'Pain au Chocolat', price: 4.50, category: 'Pastries' },
  { id: 7, name: 'Green Tea', price: 3.00, category: 'Tea' },
  { id: 8, name: 'Earl Grey', price: 3.00, category: 'Tea' },
  { id: 9, name: 'Turkey Sandwich', price: 8.50, category: 'Sandwiches' },
  { id: 10, name: 'Iced Coffee', price: 4.50, category: 'Cold Drinks' },
];

const initialCategories: Category[] = [
  { id: 'Coffee', name: 'Coffee' },
  { id: 'Tea', name: 'Tea' },
  { id: 'Pastries', name: 'Pastries' },
  { id: 'Sandwiches', name: 'Sandwiches' },
  { id: 'Cold Drinks', name: 'Cold Drinks' },
];

export const usePosStore = create<PosState>()(
  persist(
    (set) => ({
      tickets: initialTickets,
      tables: initialTables,
      history: [],
      products: initialProducts,
      categories: initialCategories,
  addTicket: (ticket) => set((state) => ({ tickets: [ticket, ...state.tickets] })),
  addToExistingTicketByTable: (tableName, items) => set((state) => {
    const existingTicketIndex = state.tickets.findIndex(t => t.table === tableName && (t.status === 'pending' || t.status === 'preparing'));
    if (existingTicketIndex >= 0) {
      const newTickets = [...state.tickets];
      newTickets[existingTicketIndex] = {
        ...newTickets[existingTicketIndex],
        items: [...newTickets[existingTicketIndex].items, ...items]
      };
      return { tickets: newTickets };
    } else {
      const newTicket: Ticket = {
        id: `TKT-${Math.floor(Math.random() * 1000)}`,
        table: tableName,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        duration: '0m',
        server: 'Staff',
        status: 'pending',
        items: items
      };
      return { tickets: [newTicket, ...state.tickets] };
    }
  }),
  addHistoryEntry: (entry) => set((state) => ({
    history: [entry, ...state.history]
  })),
  updateTicketStatus: (id, status) => set((state) => ({
    tickets: state.tickets.map(t => t.id === id ? { ...t, status } : t)
  })),
  markTicketReady: (id) => set((state) => ({
    tickets: state.tickets.filter(t => t.id !== id)
  })),
  toggleItemComplete: (ticketId, itemIdx) => set((state) => ({
    tickets: state.tickets.map(t => {
      if (t.id === ticketId) {
        const newItems = [...t.items];
        newItems[itemIdx] = { ...newItems[itemIdx], completed: !newItems[itemIdx].completed };
        return { ...t, items: newItems };
      }
      return t;
    })
  })),
  updateTableStatus: (id, status, total, guests, sessionToken) => set((state) => {
    const table = state.tables.find(t => t.id === id);
    if (!table) return state;

    // If session is ending (cleaning or free), add to history
    let newHistory = state.history;
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

      const historyEntry: HistoryItem = {
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

    return {
      history: newHistory,
      tables: state.tables.map(t => {
        if (t.id !== id) return t;
        
        const isNowOccupied = status === 'occupied' || status === 'reserved';
        const wasPreviouslyFree = t.status === 'free' || t.status === 'cleaning';

        return { 
          ...t, 
          status, 
          activeOrderTotal: total ?? t.activeOrderTotal, 
          activeOrder: (status === 'free' || status === 'cleaning') ? [] : t.activeOrder,
          guests: guests ?? t.guests,
          sessionToken: sessionToken || (status === 'free' || status === 'cleaning' ? undefined : t.sessionToken),
          needsWaiter: (status === 'free' || status === 'cleaning') ? false : t.needsWaiter,
          billRequested: (status === 'free' || status === 'cleaning') ? false : t.billRequested,
          billPaid: (status === 'free' || status === 'cleaning') ? false : t.billPaid,
          reviewSubmitted: (status === 'free' || status === 'cleaning') ? false : t.reviewSubmitted,
          paymentMethod: (status === 'free' || status === 'cleaning') ? undefined : t.paymentMethod,
          checkInTime: (isNowOccupied && wasPreviouslyFree) ? new Date().toISOString() : ((status === 'free' || status === 'cleaning') ? undefined : t.checkInTime)
        };
      })
    };
  }),
  setNeedsWaiter: (id, needsWaiter) => set((state) => ({
    tables: state.tables.map(t => t.id === id ? { ...t, needsWaiter } : t)
  })),
  setBillRequested: (id, billRequested) => set((state) => ({
    tables: state.tables.map(t => t.id === id ? { ...t, billRequested } : t)
  })),
  setBillPaid: (id, billPaid, method) => set((state) => ({
    tables: state.tables.map(t => t.id === id ? { ...t, billPaid, paymentMethod: method } : t)
  })),
  setReviewSubmitted: (id, reviewSubmitted) => set((state) => ({
    tables: state.tables.map(t => t.id === id ? { ...t, reviewSubmitted } : t)
  })),
  updateTableOrder: (id, newItems) => set((state) => ({
    tables: state.tables.map(t => {
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
      
      return {
        ...t,
        activeOrder: combinedItems,
        activeOrderTotal: newTotal,
      };
    })
  })),
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
    products: [...state.products, { ...product, id: Date.now() }]
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
}), { name: 'pos-storage' }));
