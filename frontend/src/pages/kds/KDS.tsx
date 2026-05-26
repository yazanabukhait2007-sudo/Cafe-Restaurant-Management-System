import React from 'react';
import { usePosStore, Ticket } from '@/store/pos';
import { CheckCircle2, Clock, Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getStatusBadgeStyles } from '../pos/OrderHistory';
import { toast } from 'sonner';

export default function KDSPage() {
  const tickets = usePosStore(state => state.tickets);
  const markTicketReady = usePosStore(state => state.markTicketReady);
  const toggleItemComplete = usePosStore(state => state.toggleItemComplete);
  const updateTicketStatus = usePosStore(state => state.updateTicketStatus);
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar' || document.documentElement.dir === 'rtl';

  // Filter the kitchen orders (Only show orders needing preparation/delivery)
  const activeKDSTickets = tickets.filter(ticket => 
    ['CONFIRMED', 'PREPARING', 'pending', 'preparing', 'delayed'].includes(ticket.status)
  );

  const getUrgencyColor = (status: string) => {
    const s = status.toUpperCase();
    if (s === 'PREPARING') return 'border-amber-400 bg-amber-500/5 hover:shadow-amber-500/5';
    if (s === 'CONFIRMED' || s === 'PENDING') return 'border-blue-300 bg-blue-500/5';
    return 'border-orange-200 bg-orange-100/10';
  };

  const handleStartPrep = (ticketId: string) => {
    updateTicketStatus(ticketId, 'PREPARING');
    toast.success(isAr ? 'بدأت عملية التحضير في الكافيه!' : 'Preparation started in cafe kitchen!');
  };

  const handleFinishPrep = (ticketId: string) => {
    markTicketReady(ticketId);
    toast.success(isAr ? 'تم تجهيز الطلب بالكامل وطلبه للتسليم!' : 'Ticket prepared & ready for delivery!');
  };

  return (
    <div className="h-full bg-[#FAF9F5] p-6 text-stone-900 leading-normal" id="kds-screen">
      <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <h1 className="text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2">
            👨‍🍳 {isAr ? 'شاشة عرض المطبخ والكافيه (KDS)' : 'Kitchen Display System (KDS)'}
          </h1>
          <p className="text-xs text-stone-400 font-medium uppercase tracking-widest mt-1">
            {isAr ? 'إدارة وتحضير الطلبات الحية والنشطة' : 'Manage and cook live orders in real-time'}
          </p>
        </div>
        <div className="bg-white px-4 py-2 rounded-xl text-xs font-bold border border-stone-200/80 shadow-sm flex items-center gap-2 text-stone-600">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          {isAr ? `إجمالي الطلبات النشطة: ${activeKDSTickets.length}` : `Live Tickets: ${activeKDSTickets.length}`}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-max">
        {activeKDSTickets.length === 0 ? (
          <div className="col-span-full h-80 flex flex-col items-center justify-center border-2 border-dashed border-stone-200 rounded-[2rem] bg-white p-6 shadow-sm">
             <span className="text-stone-300 font-mono text-5xl mb-4">🍽️</span>
             <h2 className="text-lg font-bold text-stone-800">{isAr ? 'لا توجد طلبات معلقة للمطبخ' : 'All caught up!'}</h2>
             <p className="text-xs text-stone-400 mt-1 max-w-xs text-center">{isAr ? 'الطلبات المرسلة من الكاشير أو الويتر ستظهر هنا للبدء بتحضيرها.' : 'Orders dispatched from the register or waiter tables will appear here.'}</p>
          </div>
        ) : activeKDSTickets.map(ticket => {
          const isPreparing = ticket.status.toUpperCase() === 'PREPARING';
          const isConfirmed = ticket.status.toUpperCase() === 'CONFIRMED' || ticket.status.toUpperCase() === 'PENDING';

          return (
            <div 
              key={ticket.id} 
              className={`rounded-[2rem] border-2 ${getUrgencyColor(ticket.status)} flex flex-col overflow-hidden bg-white shadow-md hover:shadow-lg transition-all duration-300`}
            >
              <div className={`px-5 py-4 border-b border-stone-100 flex justify-between items-center ${
                  isPreparing ? 'bg-amber-500/10 text-amber-900' : 
                  isConfirmed ? 'bg-blue-500/10 text-blue-900' : 
                  'bg-stone-100/50 text-stone-700'
              }`}>
                <div>
                  <div className="font-extrabold text-lg flex items-center gap-2">
                    {ticket.table}
                  </div>
                  <div className="text-[10px] font-mono opacity-80 uppercase tracking-widest mt-0.5">#{ticket.id} • {ticket.server}</div>
                </div>
                <div className="text-right rtl:text-left flex flex-col items-end">
                  <div className="font-mono text-sm font-bold flex items-center gap-1 text-stone-800 bg-white/80 px-2 py-0.5 rounded-lg border border-stone-200/50">
                     <Clock className="w-3.5 h-3.5 animate-spin duration-5000" />
                     <span>{ticket.duration}</span>
                  </div>
                  <div className="text-[10px] opacity-70 mt-1">{ticket.time}</div>
                </div>
              </div>
              
              <div className="flex-1 p-4 space-y-3 bg-stone-50/20 max-h-[300px] overflow-y-auto">
                {ticket.items.map((item, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => toggleItemComplete(ticket.id, idx)}
                    className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer active:scale-[0.98] transition-all w-full text-left rtl:text-right ${
                      item.completed 
                        ? 'border-emerald-500/20 bg-emerald-500/5 opacity-60' 
                        : 'border-stone-200 bg-white hover:border-stone-300 hover:shadow-sm'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center font-bold text-sm ${
                      item.completed ? 'bg-emerald-500/20 text-emerald-700' : 'bg-stone-150 text-stone-700'
                    }`}>
                      {item.quantity}
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                       <p className={`text-sm font-bold leading-none ${item.completed ? 'line-through text-stone-400' : 'text-stone-800'}`}>
                         {item.name}
                       </p>
                       {item.notes && (
                         <p className="text-amber-600 text-xs mt-1.5 font-bold italic">
                           * {item.notes}
                         </p>
                       )}
                    </div>
                  </div>
                ))}
              </div>

              {/* ACTION MODULE FOOTER */}
              <div className="p-3 bg-white border-t border-stone-100 mt-auto">
                {isConfirmed ? (
                  <button 
                    onClick={() => handleStartPrep(ticket.id)} 
                    className="w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs tracking-wider transition uppercase flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>{isAr ? 'بدء التحضير' : 'Start Preparing'}</span>
                  </button>
                ) : (
                  <button 
                    onClick={() => handleFinishPrep(ticket.id)} 
                    className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs tracking-wider transition uppercase flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/10"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isAr ? 'الطلب جاهز للتسليم' : 'Mark Ready'}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
