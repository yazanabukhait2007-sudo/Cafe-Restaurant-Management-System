import React from 'react';
import { usePosStore, HistoryItem } from '@/store/pos';
import { useSettingsStore } from '@/store/settings';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Calendar, 
  Clock, 
  Users, 
  Receipt, 
  DollarSign, 
  Search, 
  Filter, 
  ArrowRight, 
  ExternalLink, 
  ChevronDown, 
  LayoutGrid, 
  List, 
  Settings2, 
  Check, 
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/utils/utils';

export default function OrderHistory() {
  const history = usePosStore(state => state.history);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { cafeName, taxRate } = useSettingsStore();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [viewType, setViewType] = React.useState<'grid' | 'list'>('list');
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [showFilters, setShowFilters] = React.useState(false);
  const [receiptOrder, setReceiptOrder] = React.useState<HistoryItem | null>(null);
  
  // Filter states
  const [minGuests, setMinGuests] = React.useState<number>(0);
  const [maxGuests, setMaxGuests] = React.useState<number>(20);
  const [startDate, setStartDate] = React.useState<string>('');
  const [endDate, setEndDate] = React.useState<string>('');

  const filteredHistory = history.filter(item => {
    const matchesSearch = item.tableName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const guestCount = item.guests || 0;
    const matchesGuests = guestCount >= minGuests && guestCount <= maxGuests;
    
    const itemDate = new Date(item.checkIn).getTime();
    const matchesStart = startDate ? itemDate >= new Date(startDate).getTime() : true;
    const matchesEnd = endDate ? itemDate <= new Date(endDate).getTime() + 86400000 : true; // +1 day to include the end date
    
    return matchesSearch && matchesGuests && matchesStart && matchesEnd;
  });

  const resetFilters = () => {
    setMinGuests(0);
    setMaxGuests(20);
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
  };

  const activeFiltersCount = [
    minGuests > 0 || maxGuests < 20,
    startDate !== '',
    endDate !== ''
  ].filter(Boolean).length;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString(undefined, { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#FDFBF7] text-stone-900">
      {/* Header */}
      <header className="h-20 bg-white border-b border-amber-900/10 px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/pos/tables')}
            className="w-10 h-10 rounded-full bg-stone-50 border border-stone-200 flex items-center justify-center hover:bg-stone-100 transition shadow-sm"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{t('Order History')}</h1>
            <p className="text-xs text-stone-400 font-medium uppercase tracking-widest">{t('Detailed Records')}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
           <div className="bg-stone-100 p-1 rounded-xl flex gap-1 border border-stone-200">
             <button 
               onClick={() => setViewType('grid')}
               className={cn(
                 "p-2 rounded-lg transition-all",
                 viewType === 'grid' ? "bg-white shadow-sm text-primary" : "text-stone-400 hover:text-stone-600"
               )}
             >
               <LayoutGrid className="w-4 h-4" />
             </button>
             <button 
                onClick={() => setViewType('list')}
                className={cn(
                  "p-2 rounded-lg transition-all",
                  viewType === 'list' ? "bg-white shadow-sm text-primary" : "text-stone-400 hover:text-stone-600"
                )}
             >
               <List className="w-4 h-4" />
             </button>
           </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 pb-24">
        {/* Search & Filters */}
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col gap-4 mb-8">
            <div className="flex flex-col md:flex-row gap-4">
               <div className="relative flex-1 group">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 group-focus-within:text-primary transition-colors" />
                 <input 
                   type="text"
                   placeholder={t('Search by table or order ID...')}
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   className="w-full h-14 pl-12 pr-6 bg-white border border-stone-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
                 />
               </div>
               <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(
                    "h-14 px-6 rounded-2xl flex items-center gap-2 transition-all shadow-sm font-medium border relative",
                    showFilters || activeFiltersCount > 0 
                    ? "bg-primary text-primary-foreground border-primary" 
                    : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
                  )}
               >
                 <Filter className="w-5 h-5" />
                 {t('Filter')}
                 {activeFiltersCount > 0 && (
                   <span className="absolute -top-2 -right-2 w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white">
                     {activeFiltersCount}
                   </span>
                 )}
               </button>
            </div>

            <AnimatePresence>
              {showFilters && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-white border border-stone-200 rounded-3xl p-8 shadow-xl">
                    <div className="flex items-center justify-between mb-8 pb-4 border-b border-stone-100">
                      <h3 className="font-bold text-lg flex items-center gap-2">
                         <Settings2 className="w-5 h-5 text-primary" />
                         {t('Filter Orders')}
                      </h3>
                      <button 
                        onClick={resetFilters}
                        className="text-xs font-bold text-stone-400 hover:text-stone-600 transition uppercase tracking-widest"
                      >
                        {t('Reset Filters')}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                      {/* Guest Count Filter */}
                      <div className="space-y-4">
                         <label className="text-xs font-bold text-stone-400 uppercase tracking-widest block">{t('Guest Count')}</label>
                         <div className="flex items-center gap-6">
                           <div className="flex-1 space-y-2">
                             <span className="text-[10px] text-stone-400 font-bold">{t('Min')}: <span className="text-stone-900">{minGuests}</span></span>
                             <input 
                               type="range" 
                               min="0" 
                               max="20" 
                               value={minGuests}
                               onChange={(e) => setMinGuests(parseInt(e.target.value))}
                               className="w-full accent-primary"
                             />
                           </div>
                           <div className="flex-1 space-y-2">
                             <span className="text-[10px] text-stone-400 font-bold">{t('Max')}: <span className="text-stone-900">{maxGuests}</span></span>
                             <input 
                               type="range" 
                               min="0" 
                               max="20" 
                               value={maxGuests}
                               onChange={(e) => setMaxGuests(parseInt(e.target.value))}
                               className="w-full accent-primary"
                             />
                           </div>
                         </div>
                      </div>

                      {/* Date Range Filter */}
                      <div className="space-y-4">
                         <label className="text-xs font-bold text-stone-400 uppercase tracking-widest block">{t('Date Range')}</label>
                         <div className="flex flex-col sm:flex-row items-center gap-4">
                           <div className="relative w-full">
                             <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300" />
                             <input 
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full h-10 pl-10 pr-3 bg-stone-50 border border-stone-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                             />
                           </div>
                           <ArrowRight className="w-4 h-4 text-stone-300 hidden sm:block" />
                           <div className="relative w-full">
                             <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300" />
                             <input 
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full h-10 pl-10 pr-3 bg-stone-50 border border-stone-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                             />
                           </div>
                         </div>
                      </div>

                      <div className="flex items-end">
                         <button 
                           onClick={() => setShowFilters(false)}
                           className="w-full h-12 bg-primary text-primary-foreground rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition shadow-lg"
                         >
                           <Check className="w-5 h-5" />
                           {t('Apply Filters')}
                         </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white border-2 border-dashed border-stone-200 rounded-[2.5rem]">
              <div className="w-20 h-20 bg-stone-50 rounded-3xl flex items-center justify-center mb-6 border border-stone-100">
                <Receipt className="w-10 h-10 text-stone-300" />
              </div>
              <h2 className="text-xl font-bold text-stone-800 mb-2">{t('No history records found')}</h2>
              <p className="text-stone-400 max-w-xs text-center">{t('Previous orders will appear here once sessions are ended.')}</p>
            </div>
          ) : viewType === 'list' ? (
            <div className="space-y-4">
              {filteredHistory.map((item) => (
                <HistoryListItem 
                  key={item.id} 
                  item={item} 
                  t={t} 
                  isExpanded={expandedId === item.id}
                  onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  formatDate={formatDate}
                  formatTime={formatTime}
                  onViewReceipt={setReceiptOrder}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredHistory.map((item) => (
                <HistoryGridCard 
                  key={item.id} 
                  item={item} 
                  t={t}
                  formatDate={formatDate}
                  formatTime={formatTime}
                  onViewReceipt={setReceiptOrder}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Original Receipt Modal */}
      <AnimatePresence>
        {receiptOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 text-stone-900 leading-normal">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-stone-50 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] border border-stone-200"
            >
              <header className="h-16 flex items-center justify-between px-6 border-b border-amber-900/10 bg-orange-50/50 flex-shrink-0">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-primary" />
                  {t('View Original Receipt')}
                </h2>
                <button 
                  onClick={() => setReceiptOrder(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-stone-200/50 hover:bg-stone-200 text-stone-600 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </header>

              <div className="flex-1 overflow-y-auto p-6 md:p-8">
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200 relative mb-4 font-mono text-stone-800 text-sm">
                  <div className="text-center mb-6">
                     <h3 className="text-xl font-bold tracking-tight uppercase mb-1">{cafeName || 'Lavant Cafe'}</h3>
                     <p className="text-stone-500 text-xs uppercase tracking-widest">{t('Table')} {receiptOrder.tableName}</p>
                     
                     <div className="mt-4 border-t-2 border-dashed border-stone-200 pt-4 text-[11px] space-y-1 text-stone-600">
                        <div className="flex justify-between">
                          <span>{new Date(receiptOrder.checkIn).toLocaleDateString(undefined, { weekday: 'long' })}</span>
                          <span>{formatDate(receiptOrder.checkIn)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t('Time')}</span>
                          <span>{formatTime(receiptOrder.checkIn)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{t('Order')}</span>
                          <span>#{receiptOrder.id.split('-')[1]}</span>
                        </div>
                     </div>
                     <div className="mt-4 border-b-2 border-dashed border-stone-200 w-full" />
                  </div>

                  <div className="space-y-3 mb-6">
                    {receiptOrder.items.map((item: any, idx: number) => (
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

                  <div className="border-t-2 border-dashed border-stone-200 pt-4 space-y-2 text-xs text-stone-600">
                    <div className="flex justify-between">
                      <span>{t('Subtotal')}</span>
                      <span>${receiptOrder.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('Tax')} ({taxRate || 10}%)</span>
                      <span>${receiptOrder.tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-base pt-3 border-t border-stone-100 text-stone-900">
                      <span>{t('Total')}</span>
                      <span>${receiptOrder.total.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  {receiptOrder.paymentMethod && (
                    <div className="mt-4 pt-4 border-t-2 border-dashed border-stone-200 text-[10px] uppercase font-bold tracking-widest flex justify-between text-stone-500">
                      <span>{t('Paid via')}</span>
                      <span>{t(receiptOrder.paymentMethod === 'cash' ? 'Cash' : 'Card')}</span>
                    </div>
                  )}

                  <div className="text-center mt-8 text-[10px] uppercase tracking-widest text-stone-400">
                    <p>*** {t('Thank you')} ***</p>
                    <p className="mt-1">{new Date(receiptOrder.checkIn).getFullYear()} {cafeName || 'Lavant Cafe'}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 pt-0 flex-shrink-0">
                <button 
                  onClick={() => setReceiptOrder(null)}
                  className="w-full h-12 bg-stone-900 text-stone-50 font-bold tracking-wide rounded-2xl flex items-center justify-center gap-2 hover:bg-stone-800 transition shadow-lg text-sm"
                >
                  {t('Close')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function HistoryListItem({ item, t, isExpanded, onToggle, formatDate, formatTime, onViewReceipt }: any) {
  return (
    <div 
      className={cn(
        "bg-white rounded-[2rem] border border-stone-200 shadow-sm overflow-hidden transition-all duration-300",
        isExpanded ? "ring-4 ring-primary/5 border-primary/20 shadow-md" : "hover:border-stone-300"
      )}
    >
      <div 
        onClick={onToggle}
        className="p-6 cursor-pointer flex flex-wrap items-center justify-between gap-6"
      >
        <div className="flex items-center gap-5">
           <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground font-bold shadow-lg shadow-primary/20">
             {item.tableName}
           </div>
           <div className="flex flex-col">
             <span className="font-bold text-lg">{t('Order')} #{item.id.split('-')[1]}</span>
             <div className="flex items-center gap-3 text-stone-400 text-xs font-medium uppercase tracking-widest mt-1">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(item.checkIn)}</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatTime(item.checkIn)}</span>
             </div>
           </div>
        </div>

        <div className="flex items-center gap-8">
           <div className="hidden sm:flex flex-col items-center">
             <span className="text-[10px] text-stone-400 uppercase tracking-widest font-bold mb-1">{t('Guests')}</span>
             <div className="flex items-center gap-1.5 font-bold">
               <Users className="w-4 h-4 text-stone-400" />
               {item.guests}
             </div>
           </div>
           
           <div className="hidden sm:flex flex-col items-center">
             <span className="text-[10px] text-stone-400 uppercase tracking-widest font-bold mb-1">{t('Duration')}</span>
             <div className="flex items-center gap-1.5 font-bold">
               <Clock className="w-4 h-4 text-stone-400" />
               {item.duration}
             </div>
           </div>

           <div className="flex flex-col items-end">
             <span className="text-[10px] text-stone-400 uppercase tracking-widest font-bold mb-1">{t('Total Amount')}</span>
             <div className="text-xl font-bold text-primary">
               ${item.total.toFixed(2)}
             </div>
           </div>

           <div className={cn(
             "w-10 h-10 rounded-full bg-stone-50 flex items-center justify-center text-stone-400 transition-transform duration-300",
             isExpanded && "rotate-180 bg-primary/10 text-primary"
           )}>
             <ChevronDown className="w-5 h-5" />
           </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-stone-50/50 border-t border-stone-100"
          >
            <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="lg:col-span-2">
                <h4 className="text-[10px] text-stone-400 uppercase tracking-widest font-bold mb-4 flex items-center gap-2">
                  <List className="w-3 h-3" />
                  {t('Order Details')}
                </h4>
                <div className="space-y-3 bg-white rounded-2xl p-6 border border-stone-200">
                  {item.items.map((orderItem: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-stone-100 flex items-center justify-center text-[10px] font-bold text-stone-500">{orderItem.quantity}x</span>
                        <span className="font-medium">{orderItem.name}</span>
                      </div>
                      <span className="font-mono text-stone-500">${(orderItem.price * orderItem.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-[10px] text-stone-400 uppercase tracking-widest font-bold mb-4 flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    {t('Timeline')}
                  </h4>
                  <div className="bg-white rounded-2xl p-6 border border-stone-200 space-y-4">
                     <div className="flex items-center gap-4">
                       <div className="w-2 h-2 rounded-full bg-stone-300" />
                       <div className="flex flex-col">
                         <span className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">{t('Check-in')}</span>
                         <span className="text-sm font-bold">{formatTime(item.checkIn)}</span>
                       </div>
                     </div>
                     <div className="w-1 h-8 bg-stone-100 ml-0.5 rounded-full" />
                     <div className="flex items-center gap-4">
                       <div className="w-2 h-2 rounded-full bg-primary" />
                       <div className="flex flex-col">
                         <span className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">{t('Check-out')}</span>
                         <span className="text-sm font-bold">{formatTime(item.checkOut)}</span>
                       </div>
                     </div>
                  </div>
                </div>

                <div>
                   <h4 className="text-[10px] text-stone-400 uppercase tracking-widest font-bold mb-4 flex items-center gap-2">
                    <Receipt className="w-3 h-3" />
                    {t('Financial Summary')}
                  </h4>
                  <div className="bg-white rounded-2xl p-6 border border-stone-200 space-y-3">
                     <div className="flex justify-between text-sm">
                       <span className="text-stone-400">{t('Subtotal')}</span>
                       <span className="font-bold">${item.subtotal.toFixed(2)}</span>
                     </div>
                     <div className="flex justify-between text-sm">
                       <span className="text-stone-400">{t('Tax')}</span>
                       <span className="font-bold">${item.tax.toFixed(2)}</span>
                     </div>
                     <div className="pt-3 border-t border-stone-100 flex justify-between">
                       <span className="font-bold text-lg">{t('Total')}</span>
                       <span className="font-bold text-lg text-primary">${item.total.toFixed(2)}</span>
                     </div>
                     {item.paymentMethod && (
                       <div className="mt-2 pt-2 border-t border-stone-50 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-stone-400">
                         <span>{t('Payment Method')}</span>
                         <span className="px-2 py-0.5 bg-stone-100 rounded text-stone-600">{item.paymentMethod}</span>
                       </div>
                     )}
                  </div>
                  <button 
                    onClick={() => onViewReceipt && onViewReceipt(item)}
                    className="w-full mt-4 h-11 bg-primary text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-primary/95 hover:shadow-lg transition-all shadow-sm text-xs"
                  >
                    <Receipt className="w-4 h-4" />
                    {t('View Original Receipt')}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function HistoryGridCard({ item, t, formatDate, formatTime, onViewReceipt }: any) {
  return (
    <div className="bg-white rounded-[2rem] border border-stone-200 p-8 shadow-sm flex flex-col relative overflow-hidden group hover:border-primary/20 transition-all hover:shadow-xl hover:shadow-primary/5">
       <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
       
       <div className="flex justify-between items-start relative z-10 mb-8">
          <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground font-bold shadow-lg shadow-primary/20">
            {item.tableName}
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-stone-400 uppercase tracking-widest font-bold mb-1">{t('Order Total')}</span>
            <span className="text-2xl font-black text-primary tracking-tighter">${item.total.toFixed(2)}</span>
          </div>
       </div>

       <div className="space-y-5 relative z-10">
          <div className="grid grid-cols-2 gap-4">
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-stone-50 border border-stone-100 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-stone-400" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] text-stone-400 uppercase tracking-widest font-bold">{t('Date')}</span>
                  <span className="text-xs font-bold">{formatDate(item.checkIn)}</span>
                </div>
             </div>
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-stone-50 border border-stone-100 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-stone-400" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] text-stone-400 uppercase tracking-widest font-bold">{t('Check-in')}</span>
                  <span className="text-xs font-bold">{formatTime(item.checkIn)}</span>
                </div>
             </div>
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-stone-50 border border-stone-100 flex items-center justify-center">
                  <Users className="w-4 h-4 text-stone-400" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] text-stone-400 uppercase tracking-widest font-bold">{t('Guests')}</span>
                  <span className="text-xs font-bold">{item.guests} {t('People')}</span>
                </div>
             </div>
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-stone-50 border border-stone-100 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-stone-400" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] text-stone-400 uppercase tracking-widest font-bold">{t('Time Spent')}</span>
                  <span className="text-xs font-bold">{item.duration}</span>
                </div>
             </div>
          </div>

          <div className="pt-6 border-t border-stone-100 flex justify-between items-center">
             <div className="flex flex-col">
                <span className="text-[8px] text-stone-400 uppercase tracking-widest font-bold">{t('Order ID')}</span>
                <span className="text-[10px] font-mono text-stone-600">{item.id}</span>
             </div>
             <div className="flex gap-1">
                {item.items.slice(0, 3).map((oi: any, i: number) => (
                  <div key={i} className="w-6 h-6 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center text-[10px] font-bold text-stone-400">
                    {oi.name[0]}
                  </div>
                ))}
                {item.items.length > 3 && (
                   <div className="w-6 h-6 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                    +{item.items.length - 3}
                  </div>
                )}
             </div>
          </div>
          <div className="pt-4 border-t border-stone-100">
             <button 
               onClick={() => onViewReceipt && onViewReceipt(item)}
               className="w-full h-10 bg-primary/10 text-primary font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-primary hover:text-white transition-all text-xs focus:ring-2 focus:ring-primary/20"
             >
               <Receipt className="w-3.5 h-3.5" />
               {t('View Original Receipt')}
             </button>
          </div>
       </div>
    </div>
  );
}
