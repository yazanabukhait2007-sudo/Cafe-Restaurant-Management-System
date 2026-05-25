import React from 'react';
import { usePosStore } from '@/store/pos';
import { CheckCircle2, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function KDSPage() {
  const tickets = usePosStore(state => state.tickets);
  const markTicketReady = usePosStore(state => state.markTicketReady);
  const toggleItemComplete = usePosStore(state => state.toggleItemComplete);
  const updateTicketStatus = usePosStore(state => state.updateTicketStatus);
  const { t } = useTranslation();

  const getUrgencyColor = (status: string) => {
    if (status === 'delayed') return 'border-destructive/50 bg-destructive/10 text-destructive';
    if (status === 'preparing') return 'border-amber-500/50 bg-amber-500/10 text-amber-500';
    return 'border-orange-300 bg-orange-100/50 text-stone-600';
  };

  return (
    <div className="h-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-max">
        {tickets.length === 0 ? (
          <div className="col-span-full h-64 flex items-center justify-center border-2 border-dashed border-orange-300 rounded-xl">
             <span className="text-stone-500 font-mono">{t('No active tickets') || 'No active tickets'}</span>
          </div>
        ) : tickets.map(ticket => (
          <div 
            key={ticket.id} 
            className={`rounded-xl border ${getUrgencyColor(ticket.status)} flex flex-col overflow-hidden`}
          >
            <div className={`px-4 py-3 border-b border-current/20 flex justify-between items-center ${
                ticket.status === 'delayed' ? 'bg-destructive/20 text-destructive-foreground' : 
                ticket.status === 'preparing' ? 'bg-amber-500/20 text-amber-500' : 
                'bg-orange-200/50 text-stone-700'
            }`}>
              <div>
                <div className="font-bold text-lg">{ticket.table}</div>
                <div className="text-xs opacity-80">{ticket.id} • {ticket.server}</div>
              </div>
              <div className="text-right rtl:text-left">
                <div className="font-mono text-xl font-bold flex items-center rtl:flex-row-reverse justify-end space-x-1 rtl:space-x-reverse">
                   <Clock className="w-4 h-4" />
                   <span>{ticket.duration}</span>
                </div>
                <div className="text-xs opacity-80">{ticket.time}</div>
              </div>
            </div>
            
            <div className="flex-1 p-2 bg-orange-50/50 space-y-2">
              {ticket.items.map((item, idx) => (
                <div 
                  key={idx} 
                  onClick={() => toggleItemComplete(ticket.id, idx)}
                  className={`flex items-start space-x-3 rtl:space-x-reverse p-3 rounded-lg border cursor-pointer active:scale-[0.98] transition-transform w-full text-left rtl:text-right ${item.completed ? 'border-emerald-500/30 bg-emerald-500/10 opacity-50' : 'border-orange-300 bg-orange-100/50 hover:bg-orange-200/50'}`}
                >
                  <div className={`w-8 h-8 rounded shrink-0 flex items-center justify-center font-bold text-lg ${item.completed ? 'bg-emerald-500/20 text-emerald-500' : 'bg-orange-200/50 text-stone-700'}`}>
                    {item.quantity}
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                     <p className={`text-lg font-medium leading-none ${item.completed ? 'line-through text-stone-500' : 'text-stone-800'}`}>
                       {item.name}
                     </p>
                     {item.notes && (
                       <p className="text-amber-500/80 text-sm mt-1 font-medium italic">
                         ** {item.notes}
                       </p>
                     )}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-2 bg-orange-50/50 mt-auto border-t border-orange-200">
               <button onClick={() => markTicketReady(ticket.id)} className="w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg tracking-wider transition uppercase flex items-center justify-center space-x-2 rtl:space-x-reverse">
                 <CheckCircle2 className="w-6 h-6" />
                 <span>{t('Mark Ready') || 'Mark Ready'}</span>
               </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
