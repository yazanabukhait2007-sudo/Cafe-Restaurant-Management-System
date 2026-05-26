import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, ChevronLeft, Minus, Plus, CreditCard, Banknote, Trash2, Users, ShoppingCart, X, Printer, CheckCircle2, Utensils, Receipt } from 'lucide-react';
import { cn } from '@/utils/utils';
import { toast } from 'sonner';
import { usePosStore } from '@/store/pos';
import { useAuthStore } from '@/store/auth';
import { useSettingsStore } from '@/store/settings';
import { useTranslation } from 'react-i18next';

export default function POSPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const tableData = location.state as { tableName?: string; guests?: number; existingOrder?: boolean, showCheckout?: boolean } | null;
  const [activeCategory, setActiveCategory] = useState('All');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPOSCheckoutModal, setShowPOSCheckoutModal] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'cash' | 'card' | null>(null);

  const { t } = useTranslation();

  const products = usePosStore(state => state.products);
  const rawCategories = usePosStore(state => state.categories);
  const categories = useMemo(() => ['All', ...rawCategories.map(c => c.name)], [rawCategories]);
  
  // Virtual Water Product ID
  const WATER_PRODUCT_ID = 9999;

  const addTicket = usePosStore(state => state.addTicket);
  const addToExistingTicketByTable = usePosStore(state => state.addToExistingTicketByTable);
  const updateTableStatus = usePosStore(state => state.updateTableStatus);
  const updateTableOrder = usePosStore(state => state.updateTableOrder);
  const addHistoryEntry = usePosStore(state => state.addHistoryEntry);
  const setBillPaid = usePosStore(state => state.setBillPaid);
  const tables = usePosStore(state => state.tables);
  const tickets = usePosStore(state => state.tickets);
  const { user } = useAuthStore();
  const { waterPricePerGuest, taxRate, cafeName } = useSettingsStore();

  const [currentOrder, setCurrentOrder] = useState<any[]>(() => {
    // Check if table already has an active order or is occupied
    const targetTable = usePosStore.getState().tables.find(t => t.name === tableData?.tableName);
    const isActuallyExistingOrder = tableData?.existingOrder || (targetTable && (targetTable.status === 'occupied' || (targetTable.activeOrder && targetTable.activeOrder.length > 0)));

    // Add water charge automatically if new table and water price is configured
    if (tableData?.guests && !isActuallyExistingOrder && waterPricePerGuest > 0) {
      return [{
        id: `new_${Date.now()}_water`,
        productId: WATER_PRODUCT_ID,
        name: t('Water'),
        price: waterPricePerGuest,
        quantity: tableData.guests
      }];
    }
    return [];
  });

  const tableEntity = useMemo(() => tables.find(t => t.name === tableData?.tableName), [tables, tableData?.tableName]);
  const existingOrderItems = tableEntity?.activeOrder || [];
  
  // Create a combined order list for display and calculation
  const allOrderItems = useMemo(() => {
    const combined = [...existingOrderItems];
    for (const currItem of currentOrder) {
      const idx = combined.findIndex(i => i.productId === currItem.productId && i.notes === currItem.notes);
      if (idx >= 0) {
         combined[idx] = { ...combined[idx], quantity: combined[idx].quantity + currItem.quantity };
      } else {
         combined.push(currItem);
      }
    }
    return combined;
  }, [existingOrderItems, currentOrder]);

  const existingOrderTotal = tableEntity?.activeOrderTotal || 0; // Keeping for reference if needed

  const addToCart = (product: any) => {
    setCurrentOrder(curr => {
      const existing = curr.find(item => item.productId === product.id);
      if (existing) {
        return curr.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...curr, { id: `new_${Date.now()}_${product.id}`, productId: product.id, name: product.name, price: product.price, quantity: 1 }];
    });
    toast.success(t('Product added successfully'));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCurrentOrder(curr => curr.map(item => {
      if (item.id === id) {
        const newQ = item.quantity + delta;
        return { ...item, quantity: Math.max(0, newQ) };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };
  
  const removeItem = (id: string) => {
    setCurrentOrder(curr => curr.filter(item => item.id !== id));
  };

  const startCheckout = () => {
    if (allOrderItems.length === 0) {
       toast.error(t("Order is empty!") || "Order is empty!");
       return;
    }
    setSelectedMethod(null);
    setShowPOSCheckoutModal(true);
  };

  const handleSendToKitchen = (skipRedirect = false) => {
    if (currentOrder.length === 0) {
       return;
    }
    
    const items = currentOrder.map(item => ({ ...item, completed: false }));
    
    if (tableData?.existingOrder && tableData.tableName) {
      // Add to existing order
      addToExistingTicketByTable(tableData.tableName, items);
      if (tableEntity) {
        updateTableOrder(tableEntity.id, items);
        updateTableStatus(tableEntity.id, 'occupied', subtotal);
      }
    } else {
      // New order
      addTicket({
        id: `TKT-${Math.floor(Math.random() * 1000)}`,
        table: tableData?.tableName || t('Takeaway'),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        duration: '0m',
        server: user?.name || t('Staff'),
        status: 'pending',
        items: items
      });

      if (tableEntity) {
        updateTableOrder(tableEntity.id, items);
        updateTableStatus(tableEntity.id, 'occupied', subtotal);
      }
    }

    toast.success(t('Order sent to kitchen!') || 'Order sent to kitchen!');
    setCurrentOrder([]);
    if (!skipRedirect && tableData?.tableName) {
      navigate('/pos/tables');
    }
  };

  const handleFinalPOSCheckout = () => {
    if (!selectedMethod) return;

    // Send any unsent current order items to the kitchen first
    if (currentOrder.length > 0) {
      handleSendToKitchen(true);
    }

    // Now, let's process payment
    if (tableEntity) {
      // Physical table
      setBillPaid(tableEntity.id, true, selectedMethod);
      toast.success(t('Paid') || 'Payment confirmed!');
      setShowPOSCheckoutModal(false);
      navigate('/pos/tables');
    } else {
      // Takeaway order. Record directly to history
      const durationStr = '5m';
      const finalSubtotal = subtotal;
      const finalTax = subtotal * (taxRate / 100);
      const finalTotal = subtotal + finalTax;
      
      addHistoryEntry({
        id: `HIST-${Date.now()}`,
        tableName: t('Takeaway'),
        guests: 1,
        checkIn: new Date().toISOString(),
        checkOut: new Date().toISOString(),
        duration: durationStr,
        items: allOrderItems.map(item => ({ ...item })),
        subtotal: finalSubtotal,
        tax: finalTax,
        total: finalTotal,
        paymentMethod: selectedMethod
      });

      // Send takeaway ticket to kitchen (KDS) if not already sent (e.g. if we are paying directly)
      addTicket({
        id: `TKT-${Math.floor(Math.random() * 1000)}`,
        table: t('Takeaway'),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        duration: '0m',
        server: user?.name || t('Staff'),
        status: 'pending',
        items: allOrderItems.map(item => ({ ...item, completed: false }))
      });

      toast.success(t('Paid') || 'Payment confirmed!');
      setShowPOSCheckoutModal(false);
      setCurrentOrder([]);
      navigate('/pos/tables');
    }
  };

  const handlePrint = () => {
    const style = document.createElement('style');
    style.id = 'print-style';
    style.innerHTML = `
      @media print {
        body * {
          visibility: hidden !important;
        }
        #thermal-receipt-container, #thermal-receipt-container * {
          visibility: visible !important;
        }
        #thermal-receipt-container {
          position: fixed !important;
          left: 0 !important;
          top: 0 !important;
          width: 80mm !important;
          margin: 0 !important;
          padding: 10px !important;
          box-shadow: none !important;
          border: none !important;
          background: white !important;
          font-family: monospace !important;
          font-size: 12px !important;
          line-height: 1.4 !important;
          direction: ${document.documentElement.dir || 'ltr'} !important;
        }
      }
    `;
    document.head.appendChild(style);
    window.print();
    setTimeout(() => {
      style.remove();
    }, 500);
    toast.success(t('Receipt sent to printer!') || 'Printing receipt...');
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
       const matchesAvailability = p.available !== false;
       const matchesCat = activeCategory === 'All' || p.category === activeCategory;
       const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
       return matchesAvailability && matchesCat && matchesSearch;
    });
  }, [products, activeCategory, searchQuery]);

  const subtotal = allOrderItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  return (
    <div className="h-full flex text-foreground rtl:flex-row-reverse">
      {/* Main Order Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        <header className="h-16 border-b border-amber-900/10 flex items-center justify-between px-4 sm:px-6 shrink-0 gap-4 rtl:space-x-reverse space-x-4">
          <button 
            onClick={() => navigate('/pos/tables')}
            className="flex items-center space-x-2 text-stone-500 hover:text-stone-900 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
            <span className="hidden sm:inline font-medium">{t('Tables')}</span>
          </button>

          <div className="flex-1 flex items-center space-x-4 rtl:space-x-reverse w-full max-w-sm">
             <div className="relative w-full">
               <Search className="w-4 h-4 absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
               <input 
                 type="text" 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 placeholder={t('Search menu...')} 
                 className="w-full bg-orange-100/50 border border-orange-300 rounded-lg ltr:pl-10 rtl:pr-10 ltr:pr-4 rtl:pl-4 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
               />
             </div>
          </div>
          
          <div className="flex-1" />

          <button 
            className="lg:hidden relative flex items-center justify-center p-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 shrink-0 transition"
            onClick={() => setIsCartOpen(true)}
          >
            <ShoppingCart className="w-5 h-5" />
            {currentOrder.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {currentOrder.reduce((acc, item) => acc + item.quantity, 0)}
              </span>
            )}
          </button>
        </header>

        {/* Categories Bar */}
        <div className="bg-[#FAF8F5]/80 backdrop-blur-md border-b border-amber-900/10 px-6 py-3.5 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
          {categories.map((cat) => (
            <button 
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-6 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 shadow-sm border",
                activeCategory === cat 
                  ? "bg-primary text-primary-foreground border-primary shadow-md"
                  : "bg-white text-stone-400 border-stone-200/60 hover:text-stone-600 hover:bg-stone-50"
              )}
            >
              {cat === 'All' ? t('All Items') : cat}
            </button>
          ))}
        </div>
        
        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredProducts.map(product => (
              <button 
                key={product.id}
                onClick={() => addToCart(product)}
                className="aspect-[5/6] bg-white border border-stone-200 rounded-3xl flex flex-col hover:border-primary hover:shadow-xl hover:shadow-primary/5 transition-all relative group active:scale-95 overflow-hidden shadow-sm"
              >
                {/* Image Area */}
                <div className="h-[45%] w-full overflow-hidden shrink-0 bg-stone-50 border-b border-stone-100 relative p-3">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-full object-contain transition-transform group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-100">
                      <Utensils className="w-6 h-6" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-white/90 backdrop-blur-md rounded-lg text-[8px] font-bold text-stone-500 uppercase tracking-tighter shadow-sm border border-white/50">
                    {product.category}
                  </div>
                </div>
                
                {/* Info Area */}
                <div className="flex-1 p-3 flex flex-col text-left rtl:text-right">
                   <h3 className="font-bold text-xs leading-tight text-stone-800 line-clamp-2 h-8 mb-1">{product.name}</h3>
                   <div className="mt-auto flex items-center justify-between">
                     <span className="text-primary font-black text-sm">${product.price.toFixed(2)}</span>
                     <div className="w-7 h-7 rounded-xl bg-orange-100 text-primary flex items-center justify-center shadow-sm group-hover:bg-primary group-hover:text-white transition-colors">
                        <Plus className="w-4 h-4" />
                     </div>
                   </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Overlay for mobile cart */}
      {isCartOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-sm"
          onClick={() => setIsCartOpen(false)}
        />
      )}

      {/* Cart Sidebar */}
      <div 
        className={cn(
          "w-full max-w-sm sm:w-96 bg-card border-l rtl:border-l-0 rtl:border-r border-amber-900/10 flex flex-col shrink-0 shadow-2xl fixed inset-y-0 right-0 lg:static lg:transform-none transition-transform duration-300 ease-in-out z-40 lg:z-10",
          isCartOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        )}
      >
        <header className="h-16 border-b border-amber-900/10 px-6 flex items-center justify-between shrink-0">
          <div className="flex flex-col">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <span className="font-semibold text-lg">{tableData?.tableName || t('Takeaway')}</span>
              {tableData?.guests && (
                <span className="px-2 py-0.5 bg-stone-100 text-stone-500 text-[10px] font-bold rounded uppercase flex items-center gap-1">
                  <Users className="w-2.5 h-2.5" /> {tableData.guests}
                </span>
              )}
            </div>
            {tableData?.existingOrder && (
              <p className="text-[10px] text-primary uppercase font-bold tracking-widest">{t('Adding to order')}</p>
            )}
          </div>
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <button onClick={() => navigate('/pos/tables')} className="p-2 text-muted-foreground hover:bg-orange-100/50 rounded-lg hover:text-foreground transition">
              <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
            </button>
            <button 
              className="p-2 text-muted-foreground hover:bg-orange-100/50 hover:text-destructive rounded-lg transition lg:hidden"
              onClick={() => setIsCartOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {existingOrderItems.map((item, idx) => (
            <div key={`existing_${idx}`} className="bg-stone-50 rounded-lg border border-stone-200 p-3 flex flex-col space-y-1 relative overflow-hidden opacity-70">
               <div className="flex justify-between items-start">
                 <div>
                   <h4 className="font-medium pr-6 rtl:pr-0 rtl:pl-6 text-stone-600">{item.name}</h4>
                   <p className="text-xs text-stone-500 mt-0.5">{item.quantity}x • ${item.price.toFixed(2)}</p>
                   {item.notes && <p className="text-xs text-stone-400 mt-0.5">{item.notes}</p>}
                 </div>
                 <span className="font-medium text-stone-600">${(item.price * item.quantity).toFixed(2)}</span>
               </div>
            </div>
          ))}

          {currentOrder.map(item => (
            <div key={item.id} className="bg-background rounded-lg border border-amber-900/10 p-3 flex flex-col space-y-3 relative overflow-hidden group">
               <div className="flex justify-between items-start">
                 <div>
                   <h4 className="font-medium pr-6 rtl:pr-0 rtl:pl-6">{item.name}</h4>
                   {item.notes && <p className="text-xs text-muted-foreground mt-0.5">{item.notes}</p>}
                 </div>
                 <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
               </div>
               <div className="flex items-center justify-between">
                 <div className="flex items-center space-x-3 rtl:space-x-reverse bg-orange-100/50 rounded-full px-2 py-1">
                   <button onClick={() => updateQuantity(item.id, -1)} className="w-6 h-6 rounded-full bg-orange-200/50 flex items-center justify-center text-muted-foreground hover:text-white">
                     <Minus className="w-3 h-3" />
                   </button>
                   <span className="text-sm font-mono w-4 text-center">{item.quantity}</span>
                   <button onClick={() => updateQuantity(item.id, 1)} className="w-6 h-6 rounded-full bg-orange-200/50 flex items-center justify-center text-muted-foreground hover:text-white">
                     <Plus className="w-3 h-3" />
                   </button>
                 </div>
                 <button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-destructive">
                   <Trash2 className="w-4 h-4" />
                 </button>
               </div>
            </div>
          ))}
          {allOrderItems.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4 opacity-50 py-12">
              <ShoppingCart className="w-12 h-12" />
              <p>{t('Select items to order')}</p>
            </div>
          )}
          {existingOrderItems.length > 0 && currentOrder.length > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-stone-50 border border-stone-200 text-xs text-stone-500 italic text-center">
               {t('Existing items on table are currently being prepared.')}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-amber-900/10 bg-orange-50/50 space-y-4 shrink-0">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>{t('Total Items Cost')}</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>{t('Tax')} ({taxRate}%)</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xl font-light text-foreground pt-2 border-t border-orange-300">
              <span>{t('Total Bill')}</span>
              <span className="text-primary font-medium">${total.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4">
            <button 
              onClick={() => handleSendToKitchen()} 
              className="h-14 bg-stone-900 text-stone-50 hover:bg-stone-800 rounded-xl flex items-center justify-center space-x-2 rtl:space-x-reverse font-medium shadow transition"
            >
              <ShoppingCart className="w-5 h-5" />
              <span>{t('Send to Kitchen')}</span>
            </button>
            <button 
              onClick={startCheckout} 
              className="h-14 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl flex items-center justify-center space-x-2 rtl:space-x-reverse font-medium shadow-lg shadow-primary/20 transition"
            >
              <CreditCard className="w-5 h-5" />
              <span>{t('Pay')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* POS Direct Checkout Modal */}
      {showPOSCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-stone-900 leading-normal">
          <div className="bg-stone-50 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] border border-stone-200">
            <header className="h-16 flex items-center justify-between px-6 border-b border-amber-900/10 bg-orange-50/50 flex-shrink-0">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary" />
                {t('Settle Bill') || 'Settle Bill'}
              </h2>
              <button 
                onClick={() => setShowPOSCheckoutModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-stone-200/50 hover:bg-stone-200 text-stone-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-6 md:p-8">
              {/* Receipt Template Container */}
              <div 
                id="thermal-receipt-container" 
                className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200 relative mb-6 font-mono text-stone-800 text-xs leading-normal"
              >
                <div className="text-center mb-6">
                   <h3 className="text-xl font-bold tracking-tight uppercase mb-1">{cafeName || 'Lavant Cafe'}</h3>
                   <p className="text-stone-500 text-xs uppercase tracking-widest">{tableData?.tableName ? `${t('Table')} ${tableData.tableName}` : t('Takeaway')}</p>
                   
                   <div className="mt-4 border-t border-dashed border-stone-200 pt-4 text-[10px] space-y-1 text-stone-600">
                      <div className="flex justify-between">
                        <span>{new Date().toLocaleDateString(undefined, { weekday: 'long' })}</span>
                        <span>{new Date().toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('Time') || 'Time'}</span>
                        <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('Type') || 'Type'}</span>
                        <span className="font-bold">{tableData?.tableName ? t('In Dine') || 'Dine In' : t('Takeaway')}</span>
                      </div>
                   </div>
                   <div className="mt-4 border-b border-dashed border-stone-200 w-full" />
                </div>

                <div className="space-y-3 mb-6 font-mono">
                  {allOrderItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start text-xs text-stone-800">
                      <div className="flex flex-col flex-1 pr-4 text-left rtl:text-right">
                        <span className="font-bold flex justify-between">
                          <span>{item.name}</span>
                          <span>${(item.price * item.quantity).toFixed(2)}</span>
                        </span>
                        <span className="text-[10px] text-stone-400 font-bold">{item.quantity} x ${item.price.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-dashed border-stone-200 pt-4 space-y-2 text-xs text-stone-600 font-mono">
                  <div className="flex justify-between">
                    <span>{t('Subtotal')}</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('Tax')} ({taxRate || 10}%)</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base pt-3 border-t border-stone-100 text-stone-900">
                    <span>{t('Total')}</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="text-center mt-8 text-[10px] uppercase tracking-widest text-stone-400">
                  <p>*** {t('Thank you') || 'Thank you'} ***</p>
                  <p className="mt-1">{new Date().getFullYear()} {cafeName || 'Lavant Cafe'}</p>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-3">
                 <label className="text-xs font-bold text-stone-400 uppercase tracking-widest block font-sans">{t('Payment Method')}</label>
                 <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setSelectedMethod('cash')}
                      className={cn(
                        "h-14 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all font-sans",
                        selectedMethod === 'cash' 
                        ? "border-primary bg-primary/10 text-primary font-bold shadow-md" 
                        : "border-stone-200 bg-white hover:bg-stone-50 text-stone-600"
                      )}
                    >
                      <Banknote className="w-5 h-5" />
                      <span className="text-xs font-semibold">{t('Cash')}</span>
                    </button>
                    <button 
                      onClick={() => setSelectedMethod('card')}
                      className={cn(
                        "h-14 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all font-sans",
                        selectedMethod === 'card' 
                        ? "border-primary bg-primary/10 text-primary font-bold shadow-md" 
                        : "border-stone-200 bg-white hover:bg-stone-50 text-stone-600"
                      )}
                    >
                      <CreditCard className="w-5 h-5" />
                      <span className="text-xs font-semibold">{t('Card')}</span>
                    </button>
                 </div>
              </div>
            </div>

            <div className="p-6 border-t border-amber-900/10 bg-orange-50/50 flex flex-col gap-3 flex-shrink-0">
              <button 
                onClick={handlePrint}
                className="w-full h-11 bg-stone-200 text-stone-700 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-stone-300 transition-all text-xs border border-stone-300"
              >
                <Printer className="w-4 h-4" />
                {t('Print Receipt') || 'Print Receipt'}
              </button>
              
              <button 
                disabled={!selectedMethod}
                onClick={handleFinalPOSCheckout}
                className={cn(
                  "w-full h-14 rounded-2xl font-bold flex items-center justify-center gap-2 transition shadow-lg text-sm",
                  selectedMethod 
                  ? "bg-primary text-primary-foreground hover:bg-primary/95 shadow-primary/20" 
                  : "bg-stone-200 text-stone-400 cursor-not-allowed shadow-none"
                )}
              >
                <CheckCircle2 className="w-5 h-5" />
                {t('Confirm Payment') || 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
