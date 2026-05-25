import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { usePosStore } from '@/store/pos';
import { useSettingsStore } from '@/store/settings';
import { CheckCircle2, ChevronDown, Utensils, Star, Heart, ChefHat, Bell, Receipt } from 'lucide-react';
import { cn } from '@/utils/utils';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

export default function CustomerView() {
  const { tableToken } = useParams<{ tableToken: string }>();
  const tables = usePosStore(state => state.tables);
  const { cafeName, taxRate } = useSettingsStore();
  const { t } = useTranslation();
  
  const [showReview, setShowReview] = useState(false);
  const [rating, setRating] = useState(0);

  const table = tables.find(t => t.sessionToken === tableToken || t.name === tableToken);
  const tickets = usePosStore(state => state.tickets).filter(t => t.table === table?.name);
  const setNeedsWaiter = usePosStore(state => state.setNeedsWaiter);
  const setBillRequested = usePosStore(state => state.setBillRequested);
  const setReviewSubmitted = usePosStore(state => state.setReviewSubmitted);
  const orderItems = table?.activeOrder || [];
  
  const subtotal = orderItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  const handleCallWaiter = () => {
    if (table) {
      setNeedsWaiter(table.id, true);
      toast.success(t('The waiter has been called to your table'));
    }
  };

  const handleRequestBill = () => {
    if (table) {
      setBillRequested(table.id, true);
      setReviewSubmitted(table.id, false); // Reset if they are requesting again for some reason
    }
    toast.success(t('The bill has been requested. The waiter is coming!'));
    setShowReview(true);
  };

  const submitReview = () => {
    if (table) {
      setReviewSubmitted(table.id, true);
    }
    toast.success(t('Thank you for your review!'));
    setShowReview(false);
  };

  if (!table || table.status !== 'occupied') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7] p-6 text-center">
        <div className="max-w-md w-full space-y-6">
          <ChefHat className="w-16 h-16 text-stone-300 mx-auto" />
          <h1 className="text-2xl font-bold text-stone-700">{cafeName || 'Lavant Cafe'}</h1>
          <div className="space-y-2">
            <p className="text-stone-700 font-bold">{t('No active session found for this table.')}</p>
            <p className="text-stone-500 text-sm">{t('Please scan the QR code to open a new session, or ask the waiter for assistance.')}</p>
          </div>
          <div className="text-xs text-left bg-orange-50 text-orange-800 p-4 rounded-xl border border-orange-100">
             <strong>{t('Testing Note')}:</strong> {t('Because this preview app uses local browser storage instead of a real database, data is not shared between devices.')}
             <br/><br/>
             {t('If you scanned the QR code with your phone, it will not see the tables from your computer. Please test by clicking the "Preview Customer View" button on the same device.')}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] pb-24 font-sans text-stone-800">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#FDFBF7]/80 backdrop-blur-xl border-b border-stone-200 p-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-stone-900">{cafeName || 'Lavant Cafe'}</h1>
            <p className="text-xs text-stone-500 font-medium">{t('Table')} {table.name}</p>
          </div>
          <button 
            onClick={handleCallWaiter}
            className="h-10 w-10 flex items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-all border border-primary/20"
          >
            <Bell className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto p-4 space-y-6 mt-4">
        
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg">{t('Order Status')}</h2>
              <p className="text-sm text-stone-500">{tickets.length} {t('Orders')}</p>
            </div>
          </div>
          <div className="space-y-4 mb-4">
            {tickets.length === 0 ? (
               <p className="text-sm text-stone-500 text-center">{t('No active orders.')}</p>
            ) : (
              tickets.map((ticket, idx) => (
                <div key={ticket.id} className="p-4 rounded-2xl bg-stone-50 border border-stone-100 space-y-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-stone-800">{t('Order')} #{ticket.id.slice(-4)}</span>
                    <span className={cn(
                      "text-xs px-2 py-1 rounded-full font-bold uppercase tracking-wider",
                      ticket.status === 'pending' ? "bg-stone-200 text-stone-600" :
                      ticket.status === 'preparing' ? "bg-amber-100 text-amber-600" :
                      ticket.status === 'delayed' ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                    )}>
                      {t(ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1))}
                    </span>
                  </div>
                  {ticket.items.map((item, idxx) => (
                    <div key={idxx} className="flex justify-between text-sm text-stone-600">
                      <span>{item.quantity}x {item.name}</span>
                      {item.completed && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Receipt / Order Summary */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg">{t('Your Order')}</h2>
              <p className="text-sm text-stone-500">{orderItems.length} {t('Items')}</p>
            </div>
          </div>

          <div className="space-y-4">
            {orderItems.length === 0 ? (
              <div className="py-8 text-center text-stone-400 flex flex-col items-center">
                <Utensils className="w-8 h-8 mb-2 opacity-50" />
                <p>{t('No items ordered yet.')}</p>
              </div>
            ) : (
              orderItems.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start pb-4 border-b border-stone-100 last:border-0 last:pb-0">
                  <div className="flex-1 pr-4">
                    <h3 className="font-semibold text-stone-800">{item.name}</h3>
                    {item.notes && <p className="text-xs text-stone-500 mt-1">{item.notes}</p>}
                    <p className="text-sm font-medium text-stone-500 mt-1">{item.quantity} x ${item.price.toFixed(2)}</p>
                  </div>
                  <span className="font-bold text-stone-800">${(item.quantity * item.price).toFixed(2)}</span>
                </div>
              ))
            )}
          </div>

          {orderItems.length > 0 && (
            <div className="mt-6 pt-6 border-t border-dashed border-stone-200 space-y-3">
              <div className="flex justify-between text-stone-500">
                <span>{t('Subtotal')}</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>{t('Tax')} ({taxRate}%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-stone-900 border-t border-stone-200 pt-3 mt-3">
                <span>{t('Total Due')}</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Floating Action / Review Form */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-stone-200 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-40">
        <div className="max-w-md mx-auto flex flex-col gap-3">
          {(showReview || (table.billRequested && !table.reviewSubmitted)) ? (
            <div className="animate-in slide-in-from-bottom-5 duration-300">
              <h3 className="font-bold text-center mb-4">{t('How was your experience?')}</h3>
              <div className="flex justify-center gap-2 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="p-2 transition-transform hover:scale-110 focus:outline-none"
                  >
                    <Star 
                      className={cn(
                        "w-10 h-10 transition-colors duration-200",
                        rating >= star ? "fill-amber-400 text-amber-500" : "text-stone-200"
                      )} 
                    />
                  </button>
                ))}
              </div>
              <button 
                onClick={submitReview}
                disabled={rating === 0}
                className="w-full bg-primary text-primary-foreground font-bold h-14 rounded-2xl shadow-lg shadow-primary/20 hover:brightness-110 disabled:opacity-50 disabled:shadow-none transition-all"
              >
                {t('Submit Review')}
              </button>
            </div>
          ) : table.billPaid ? (
            <div className="w-full bg-green-100 text-green-700 font-bold h-14 rounded-2xl flex items-center justify-center gap-2 border border-green-200">
              <CheckCircle2 className="w-5 h-5" />
              {t('Payment Complete')}
            </div>
          ) : (table.billRequested || table.reviewSubmitted) ? (
            <div className="w-full bg-amber-100 text-amber-700 font-bold h-14 rounded-2xl flex items-center justify-center gap-2 border border-amber-200 animate-pulse">
              <Receipt className="w-5 h-5" />
              {t('Pending Payment')}
            </div>
          ) : (
            <button 
              onClick={handleRequestBill}
              disabled={orderItems.length === 0}
              className="w-full bg-stone-900 text-white font-bold h-14 rounded-2xl shadow-lg hover:bg-stone-800 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
            >
              <Receipt className="w-5 h-5" />
              {t('Request Bill')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
