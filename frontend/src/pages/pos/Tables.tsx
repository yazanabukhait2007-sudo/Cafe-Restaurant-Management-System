import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/utils/utils';
import { usePosStore, Table } from '@/store/pos';
import { useSettingsStore } from '@/store/settings';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Trash2, Minus, Settings2, Check, QrCode, Bell, Receipt, X, CheckCircle2, ChevronRight, Printer } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';

type TableStatus = 'free' | 'occupied' | 'reserved' | 'cleaning';

interface TableEntity {
  id: string;
  name: string;
  seats: number;
  status: TableStatus;
  amount?: number;
  time?: string;
}

export default function TablesPage() {
  const navigate = useNavigate();
  const tables = usePosStore(state => state.tables);
  const addTable = usePosStore(state => state.addTable);
  const deleteTable = usePosStore(state => state.deleteTable);
  const updateTableCapacity = usePosStore(state => state.updateTableCapacity);
  const updateTableStatus = usePosStore(state => state.updateTableStatus);
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [selectedTable, setSelectedTable] = React.useState<Table | null>(null);
  const [guestCount, setGuestCount] = React.useState(1);
  const [sessionType, setSessionType] = React.useState<'occupied' | 'reserved'>('occupied');
  const [qrTable, setQrTable] = React.useState<Table | null>(null);
  const [showCheckoutModal, setShowCheckoutModal] = React.useState(false);
  const [checkoutTable, setCheckoutTable] = React.useState<Table | null>(null);
  const [selectedMethod, setSelectedMethod] = React.useState<'cash' | 'card' | null>(null);
  const { cafeName, taxRate } = useSettingsStore();
  const { t } = useTranslation();

  const handleViewInvoice = (table: Table) => {
    setCheckoutTable(table);
    setSelectedMethod(table.paymentMethod || null);
    setShowCheckoutModal(true);
  };

  const handleFinalCheckout = () => {
    if (!checkoutTable || !selectedMethod) return;
    
    toast.success(`Payment successful via ${t(selectedMethod === 'cash' ? 'Cash' : 'Card')}`);
    usePosStore.getState().setBillPaid(checkoutTable.id, true, selectedMethod);
    setShowCheckoutModal(false);
    setCheckoutTable(null);
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

  const handleTableClick = (table: Table) => {
    if (isEditMode) return;
    
    if (table.status === 'occupied') {
      navigate('/pos/order', { state: { tableName: table.name, existingOrder: true } });
    } else {
      setSelectedTable(table);
      setGuestCount(table.capacity);
      setSessionType('occupied');
    }
  };

  const confirmTableSetup = (status: 'occupied' | 'reserved') => {
    if (selectedTable) {
      if (status === 'occupied') {
        const token = Math.random().toString(36).substring(2, 12);
        updateTableStatus(selectedTable.id, status, undefined, guestCount, token);
        navigate('/pos/order', { state: { tableName: selectedTable.name, guests: guestCount } });
      } else {
        updateTableStatus(selectedTable.id, status, undefined, guestCount);
      }
      setSelectedTable(null);
    }
  };

  const getStatusColor = (table: Table) => {
    if (table.billPaid) return 'bg-green-500/20 border-green-500 text-green-700';
    if (table.billRequested) return 'bg-amber-100 border-amber-400 text-amber-800';
    switch (table.status) {
      case 'free': return 'bg-orange-100/50 border-orange-300 text-stone-700 hover:border-orange-400';
      case 'occupied': return 'bg-primary/20 border-primary text-primary';
      case 'reserved': return 'bg-blue-500/20 border-blue-500 text-blue-400';
      case 'cleaning': return 'bg-amber-500/20 border-amber-500 text-amber-400';
      default: return 'bg-orange-100/50 border-orange-300 text-stone-600';
    }
  };

  return (
    <div className="h-full flex flex-col">
      <header className="h-16 px-8 border-b border-amber-900/10 flex flex-col md:flex-row md:items-center justify-between bg-card shrink-0 gap-2 overflow-x-auto no-scrollbar py-2 md:py-0">
        <h1 className="text-xl font-medium tracking-tight whitespace-nowrap">{t('Main Dining')}</h1>

        <div className="flex items-center space-x-6 rtl:space-x-reverse text-sm whitespace-nowrap overflow-x-auto">
          <div className="flex items-center space-x-2 rtl:space-x-reverse"><div className="w-3 h-3 rounded-full bg-orange-300/50 shrink-0"></div><span className="text-muted-foreground">{t('Free')}</span></div>
          <div className="flex items-center space-x-2 rtl:space-x-reverse"><div className="w-3 h-3 rounded-full bg-primary shrink-0"></div><span className="text-muted-foreground">{t('Occupied')}</span></div>
          <div className="flex items-center space-x-2 rtl:space-x-reverse"><div className="w-3 h-3 rounded-full bg-blue-500 shrink-0"></div><span className="text-muted-foreground">{t('Reserved')}</span></div>
          <div className="flex items-center space-x-2 rtl:space-x-reverse"><div className="w-3 h-3 rounded-full bg-amber-500 shrink-0"></div><span className="text-muted-foreground">{t('Cleaning')}</span></div>
          
          <button 
            onClick={() => setIsEditMode(!isEditMode)}
            className={cn(
              "flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors shadow-sm ml-4 rtl:mr-4 rtl:ml-0",
              isEditMode ? "bg-stone-200 text-stone-900 border border-stone-300" : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
            )}
          >
            {isEditMode ? <Check className="w-4 h-4" /> : <Settings2 className="w-4 h-4" />}
            <span>{isEditMode ? t('Done') : t('Edit Tables')}</span>
          </button>

          <button 
            onClick={() => addTable(4)}
            className="flex items-center space-x-2 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{t('Add Table')}</span>
          </button>
        </div>
      </header>
      
      <div className="flex-1 overflow-auto p-4 md:p-8 relative isolate">
         <AnimatePresence>
           {selectedTable && (
             <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
               <motion.div 
                 initial={{ opacity: 0, scale: 0.9, y: 20 }}
                 animate={{ opacity: 1, scale: 1, y: 0 }}
                 exit={{ opacity: 0, scale: 0.95, y: 10 }}
                 className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-stone-200"
               >
                 <div className="p-10 text-center bg-stone-50/50">
                    <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                      <Users className="w-10 h-10 text-primary" />
                    </div>
                    <h3 className="text-3xl font-light tracking-tight text-stone-900">{t('Table')} {selectedTable.name}</h3>
                    <p className="text-stone-500 mt-2 text-lg">{t('Ready for guests?')}</p>
                 </div>

                 <div className="p-10 space-y-10">
                    <div className="space-y-6">
                      <label className="text-xs font-bold text-stone-400 uppercase tracking-[0.2em] block text-center">
                        {t('Number of Guests')}
                      </label>
                      <div className="flex items-center justify-center gap-10">
                        <button 
                          onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                          className="w-14 h-14 rounded-full border-2 border-stone-100 flex items-center justify-center hover:bg-stone-50 active:scale-90 transition-all text-stone-600"
                        >
                          <Minus className="w-6 h-6" />
                        </button>
                        <span className="text-5xl font-light text-stone-900 min-w-[3rem] text-center">{guestCount}</span>
                        <button 
                          onClick={() => setGuestCount(guestCount + 1)}
                          className="w-14 h-14 rounded-full border-2 border-stone-100 flex items-center justify-center hover:bg-stone-50 active:scale-90 transition-all text-stone-600"
                        >
                          <Plus className="w-6 h-6" />
                        </button>
                      </div>
                      {guestCount > selectedTable.capacity && (
                        <motion.p 
                          initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                          className="text-amber-600 text-sm text-center font-medium bg-amber-50 py-2 rounded-full"
                        >
                          {t('Note: More than normal capacity')} ({selectedTable.capacity})
                        </motion.p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => setSessionType('occupied')}
                        className={cn("rounded-2xl py-5 font-medium transition-all flex flex-col items-center gap-1 border-2", sessionType === 'occupied' ? "border-primary bg-primary/5 text-primary" : "bg-stone-50 text-stone-500 hover:bg-stone-100 border-transparent")}
                      >
                        <span className="text-lg">{t('Sit Now')}</span>
                        <span className={cn("text-[10px] uppercase tracking-widest", sessionType === 'occupied' ? "opacity-100 font-bold" : "opacity-50")}>{t('Start Order')}</span>
                      </button>
                      <button 
                        onClick={() => setSessionType('reserved')}
                        className={cn("rounded-2xl py-5 font-medium transition-all flex flex-col items-center gap-1 border-2", sessionType === 'reserved' ? "border-primary bg-primary/5 text-primary" : "bg-stone-50 text-stone-500 hover:bg-stone-100 border-transparent")}
                      >
                        <span className="text-lg">{t('Reserve')}</span>
                        <span className={cn("text-[10px] uppercase tracking-widest", sessionType === 'reserved' ? "opacity-100 font-bold" : "opacity-50")}>{t('Save for later')}</span>
                      </button>
                    </div>

                    <button 
                      onClick={() => confirmTableSetup(sessionType)}
                      className="w-full bg-primary text-primary-foreground rounded-2xl py-4 font-bold tracking-wide hover:brightness-110 transition-all shadow-lg shadow-primary/20 mt-4"
                    >
                      {t('Confirm')}
                    </button>
                    
                    <button 
                      onClick={() => setSelectedTable(null)}
                      className="w-full text-stone-400 text-sm font-medium py-2 hover:text-stone-900 transition-colors uppercase tracking-widest"
                    >
                      {t('Back to map')}
                    </button>
                 </div>
               </motion.div>
             </div>
           )}

           {qrTable && (
             <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setQrTable(null)}>
               <motion.div 
                 initial={{ opacity: 0, scale: 0.9, y: 20 }}
                 animate={{ opacity: 1, scale: 1, y: 0 }}
                 exit={{ opacity: 0, scale: 0.95, y: 10 }}
                 onClick={(e) => e.stopPropagation()}
                 className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden border border-stone-200"
               >
                 <div className="p-8 text-center bg-stone-50/50 border-b border-stone-100">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <QrCode className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-2xl font-bold tracking-tight text-stone-900">{t('Table')} {qrTable.name}</h3>
                    <p className="text-stone-500 mt-1 text-sm">{t('Scan to view menu & order status')}</p>
                 </div>

                 <div className="p-8 flex flex-col items-center">
                    <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-sm mb-6">
                      <QRCodeSVG 
                        value={`${window.location.origin}/customer/${qrTable.sessionToken || qrTable.name}`} 
                        size={200}
                        bgColor={"#ffffff"}
                        fgColor={"#1c1917"}
                        level={"Q"}
                        includeMargin={false}
                      />
                    </div>
                    
                    <button 
                      onClick={() => navigate(`/customer/${qrTable.sessionToken || qrTable.name}`)}
                      className="w-full bg-stone-100 text-stone-700 rounded-2xl py-3.5 font-bold hover:bg-stone-200 transition-all mb-3 text-sm"
                    >
                      {t('Preview Customer View')}
                    </button>

                    <button 
                      onClick={() => setQrTable(null)}
                      className="w-full text-stone-400 text-xs font-bold py-2 hover:text-stone-900 transition-colors uppercase tracking-widest"
                    >
                      {t('Close')}
                    </button>
                 </div>
               </motion.div>
             </div>
           )}
         </AnimatePresence>

          {/* Checkout Modal */}
          {showCheckoutModal && checkoutTable && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-stone-50 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border border-amber-900/10"
              >
                <header className="h-16 flex items-center justify-between px-6 border-b border-amber-900/10 bg-orange-50/50">
                  <h2 className="text-lg font-bold text-foreground">{t('Receipt')}</h2>
                  <button 
                    onClick={() => {
                      setShowCheckoutModal(false);
                      setCheckoutTable(null);
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-stone-200/50 hover:bg-stone-200 text-stone-600 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </header>

                <div className="flex-1 overflow-y-auto p-6 md:p-10">
                  <div id="thermal-receipt-container" className="bg-white rounded-3xl p-8 shadow-sm border border-stone-200 relative mb-4 font-mono text-stone-800">
                    <div className="text-center mb-8">
                       <h3 className="text-2xl font-bold tracking-tight uppercase mb-1">{cafeName || 'Lavant Cafe'}</h3>
                       <p className="text-stone-500 text-xs uppercase tracking-widest">{t('Table')} {checkoutTable.name}</p>
                       
                       <div className="mt-4 border-t-2 border-dashed border-stone-200 pt-4 text-[10px] space-y-1">
                          <div className="flex justify-between">
                            <span>{new Date().toLocaleDateString(undefined, { weekday: 'long' })}</span>
                            <span>{new Date().toLocaleDateString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>{t('Time')}</span>
                            <span>{new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>{t('Order')}</span>
                            <span>#{Math.floor(Math.random() * 100000)}</span>
                          </div>
                       </div>
                       <div className="mt-4 border-b-2 border-dashed border-stone-200 w-full" />
                    </div>

                    <div className="space-y-4 mb-8 text-xs">
                      {checkoutTable.activeOrder.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-start">
                          <div className="flex flex-col flex-1 pr-4">
                            <span className="font-bold flex justify-between">
                              <span>{item.name}</span>
                              <span>${(item.price * item.quantity).toFixed(2)}</span>
                            </span>
                            <span className="text-[10px] text-stone-400 font-bold">{item.quantity} x ${item.price.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t-2 border-dashed border-stone-200 pt-6 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span>{t('Subtotal')}</span>
                        <span>${(checkoutTable.activeOrderTotal || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('Tax')} ({taxRate}%)</span>
                        <span>${((checkoutTable.activeOrderTotal || 0) * (taxRate / 100)).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg pt-4 border-t border-stone-100">
                        <span>{t('Total')}</span>
                        <span>${((checkoutTable.activeOrderTotal || 0) * (1 + taxRate / 100)).toFixed(2)}</span>
                      </div>
                    </div>
                    
                    {(selectedMethod || checkoutTable.paymentMethod) && (
                      <div className="mt-6 pt-4 border-t-2 border-dashed border-stone-200 text-[10px] uppercase font-bold tracking-widest flex justify-between">
                        <span>{t('Paid via')}</span>
                        <span>{t((selectedMethod || checkoutTable.paymentMethod) === 'cash' ? 'Cash' : 'Card')}</span>
                      </div>
                    )}

                    <div className="text-center mt-10 text-[10px] uppercase tracking-widest text-stone-400">
                      <p>*** {t('Thank you')} ***</p>
                      <p className="mt-1">{new Date().getFullYear()} {cafeName || 'Lavant Cafe'}</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 md:p-10 pt-0 flex flex-col gap-3">
                  <button 
                    onClick={handlePrint}
                    className="w-full h-11 bg-stone-100 text-stone-700 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-stone-200 transition-all text-xs border border-stone-200"
                  >
                    <Printer className="w-4 h-4" />
                    {t('Print Receipt') || 'Print Receipt'}
                  </button>

                  {checkoutTable.billPaid ? (
                    <button 
                      onClick={() => {
                        setShowCheckoutModal(false);
                        setCheckoutTable(null);
                      }}
                      className="w-full h-14 bg-stone-900 text-stone-50 font-bold tracking-wide rounded-xl flex items-center justify-center gap-2 hover:bg-stone-800 transition shadow-lg"
                    >
                      {t('Close')}
                    </button>
                  ) : !selectedMethod ? (
                    <div className="flex gap-2 shrink-0">
                       <button 
                         onClick={() => setSelectedMethod('cash')}
                         className="flex-1 h-14 bg-white border-2 border-stone-200 text-stone-600 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-stone-50 hover:border-stone-300 transition"
                       >
                         {t('Cash')}
                       </button>
                       <button 
                          onClick={() => setSelectedMethod('card')}
                          className="flex-1 h-14 bg-white border-2 border-stone-200 text-stone-600 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-stone-50 hover:border-stone-300 transition"
                       >
                         {t('Card')}
                       </button>
                    </div>
                  ) : (
                    <button 
                      onClick={handleFinalCheckout}
                      className="w-full h-14 bg-primary text-primary-foreground font-bold tracking-wide rounded-xl flex items-center justify-center gap-2 hover:brightness-110 transition shadow-lg shadow-primary/20"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      {t('Confirm Payment')}
                    </button>
                  )}
                </div>
              </motion.div>
            </div>
          )}

         {/* Subtle background grid pattern */}
         <div className="absolute inset-0 -z-10 h-full w-full bg-[#FDFBF7] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>

         <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6 max-w-7xl mx-auto">
            {tables.map(table => (
              <div 
                key={table.id}
                className={cn(
                  "relative aspect-square rounded-2xl flex flex-col p-4 border text-left rtl:text-right transition-all duration-300 hover:shadow-lg group isolate",
                  getStatusColor(table)
                )}
              >
                {/* Background overlay for navigation */}
                <div 
                  className={cn("absolute inset-0 -z-10", !isEditMode && "cursor-pointer")}
                  onClick={() => handleTableClick(table)}
                />

                <div className="absolute -top-3 -right-3 z-30 flex flex-col gap-1 items-end pointer-events-none">
                  {table.billRequested && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        usePosStore.getState().setBillRequested(table.id, false);
                      }}
                      className="bg-emerald-500 text-white rounded-full p-2 shadow-lg hover:pr-4 group hover:bg-emerald-600 transition-all flex items-center gap-1 pointer-events-auto"
                    >
                      <Receipt className="w-5 h-5 animate-pulse" />
                      <span className="text-xs font-bold whitespace-nowrap opacity-0 max-w-0 group-hover:max-w-[100px] group-hover:opacity-100 transition-all overflow-hidden uppercase">{t('Dismiss')}</span>
                    </button>
                  )}
                  {table.needsWaiter && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        usePosStore.getState().setNeedsWaiter(table.id, false);
                      }}
                      className="bg-red-500 text-white rounded-full p-2 shadow-lg hover:pr-4 group hover:bg-red-600 transition-all flex items-center gap-1 pointer-events-auto"
                    >
                      <Bell className="w-5 h-5 animate-bounce" />
                      <span className="text-xs font-bold whitespace-nowrap opacity-0 max-w-0 group-hover:max-w-[100px] group-hover:opacity-100 transition-all overflow-hidden uppercase">{t('Dismiss')}</span>
                    </button>
                  )}
                </div>
                
                <div className="flex items-start justify-between w-full rtl:flex-row-reverse mb-2">
                  <div className="flex flex-col">
                    <span className="text-xl md:text-2xl font-light tracking-tighter">{table.name}</span>
                    {table.guests && table.status !== 'free' && (
                      <span className="text-[10px] uppercase tracking-widest opacity-60 font-bold">{table.guests} {t('Guests')}</span>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 relative z-10">
                    {isEditMode && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTable(table.id);
                        }}
                        className="p-1.5 rounded-full hover:bg-red-500/20 text-red-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <div className="flex items-center space-x-1 rtl:space-x-reverse opacity-60 bg-stone-100/50 px-1.5 py-0.5 rounded-md border border-stone-200">
                      <Users className="w-3 h-3" />
                      <span className="text-xs font-mono">{table.capacity}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-auto w-full flex flex-col">
                  {table.status === 'occupied' && (
                    <div className="flex flex-col space-y-2 relative z-10 w-full mt-auto">
                      <div className="flex justify-between items-end">
                        <div className="flex flex-col">
                          <span className="text-lg font-medium rtl:self-end">${((table.activeOrderTotal || 0) * (1 + taxRate / 100)).toFixed(2)}</span>
                          <span className={cn(
                            "text-xs opacity-70 rtl:self-end font-bold",
                            table.billPaid ? "text-green-700" : (table.billRequested ? "text-amber-700" : "")
                          )}>
                            {table.billPaid ? t('Paid') : (table.billRequested ? t('Pending Payment') : t('Occupied'))}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          {(table.billRequested || table.billPaid) && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewInvoice(table);
                              }}
                              className={cn(
                                "p-2 rounded-full transition shadow-sm",
                                table.billPaid ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-white/60 text-stone-800 hover:bg-white"
                              )}
                              title={t('View Invoice')}
                            >
                              <Receipt className="w-5 h-5" />
                            </button>
                          )}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setQrTable(table);
                            }}
                            className="p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition shadow-sm"
                          >
                            <QrCode className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      {table.billRequested && !table.billPaid && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewInvoice(table);
                          }}
                          className="w-full bg-amber-500 text-white text-xs font-bold py-2 rounded shadow hover:bg-amber-600 transition tracking-wider uppercase"
                        >
                          {t('Settle Bill')}
                        </button>
                      )}
                      {table.billPaid && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            updateTableStatus(table.id, 'cleaning', 0, 0);
                            usePosStore.getState().setBillPaid(table.id, false);
                            usePosStore.getState().setBillRequested(table.id, false);
                          }}
                          className="w-full bg-green-500 text-white text-xs font-bold py-2 rounded shadow hover:bg-green-600 transition tracking-wider uppercase"
                        >
                          {t('End Session')}
                        </button>
                      )}
                    </div>
                  )}
                  {table.status === 'cleaning' && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        updateTableStatus(table.id, 'free', 0, 0);
                      }}
                      className="w-full mt-2 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-600 rounded-lg text-xs font-bold transition-colors relative z-10 uppercase tracking-widest mt-auto mb-1"
                    >
                      {t('Finish Cleaning')}
                    </button>
                  )}
                  {isEditMode && (
                    <div className="flex flex-col gap-2 relative z-10">
                      <div className="flex items-center justify-center gap-2 bg-stone-200/50 p-1 rounded-lg border border-stone-300">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            updateTableCapacity(table.id, Math.max(1, table.capacity - 1));
                          }}
                          className="p-1 hover:bg-stone-300 rounded transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">{t('Seats')}</span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            updateTableCapacity(table.id, table.capacity + 1);
                          }}
                          className="p-1 hover:bg-stone-300 rounded transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                  {table.status === 'reserved' && (
                    <span className="text-sm font-medium">{t('Reserved')}</span>
                  )}
                </div>
              </div>
            ))}
         </div>
      </div>
    </div>
  );
}
