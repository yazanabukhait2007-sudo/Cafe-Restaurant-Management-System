import React, { useState } from 'react';
import { X, Check, ShoppingCart, Plus, Minus } from 'lucide-react';
import { cn } from '@/utils/utils';
import { useTranslation } from 'react-i18next';
import { Product, ProductVariant, Modifier } from '@/store/pos';

interface ProductSelectionModalProps {
  product: Product;
  onClose: () => void;
  onConfirm: (selection: { 
    variant?: ProductVariant; 
    modifiers: Modifier[]; 
    quantity: number;
    notes?: string;
  }) => void;
}

export default function ProductSelectionModal({ product, onClose, onConfirm }: ProductSelectionModalProps) {
  const { t } = useTranslation();
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(
    product.variants && product.variants.length > 0 ? product.variants[0] : undefined
  );
  const [selectedModifiers, setSelectedModifiers] = useState<Modifier[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  const toggleModifier = (modifier: Modifier) => {
    setSelectedModifiers(prev => {
      if (prev.find(m => m.id === modifier.id)) {
        return prev.filter(m => m.id !== modifier.id);
      }
      return [...prev, modifier];
    });
  };

  const basePrice = selectedVariant ? selectedVariant.price : product.price;
  const modifiersPrice = selectedModifiers.reduce((acc, mod) => acc + mod.price, 0);
  const totalPrice = (basePrice + modifiersPrice) * quantity;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] border border-stone-200">
        <header className="h-16 flex items-center justify-between px-6 border-b border-stone-100 bg-stone-50/50">
          <div className="flex flex-col">
            <h2 className="text-base font-bold text-stone-900">{product.name}</h2>
            <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">{product.category}</p>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-stone-200/50 hover:bg-stone-200 text-stone-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Variants Selection */}
          {product.variants && product.variants.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest">{t('Select Size / Variant')}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {product.variants.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedVariant(variant)}
                    className={cn(
                      "h-14 px-4 rounded-2xl border-2 flex flex-col items-center justify-center transition-all",
                      selectedVariant?.id === variant.id 
                        ? "border-primary bg-primary/5 text-primary font-bold shadow-md" 
                        : "border-stone-100 bg-white text-stone-600 hover:bg-stone-50"
                    )}
                  >
                    <span className="text-xs leading-none">{variant.name}</span>
                    <span className="text-[10px] opacity-70 mt-1">${variant.price.toFixed(2)}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Modifier Groups */}
          {product.modifierGroups && product.modifierGroups.length > 0 && product.modifierGroups.map((group) => (
            <section key={group.id} className="space-y-3">
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest">{t(group.name)}</h3>
              <div className="grid grid-cols-2 gap-3">
                {group.modifiers.map((mod) => (
                  <button
                    key={mod.id}
                    onClick={() => toggleModifier(mod)}
                    className={cn(
                      "h-14 px-4 rounded-2xl border-2 flex items-center justify-between transition-all",
                      selectedModifiers.find(m => m.id === mod.id)
                        ? "border-primary bg-primary/5 text-primary font-bold shadow-md" 
                        : "border-stone-100 bg-white text-stone-600 hover:bg-stone-50"
                    )}
                  >
                    <div className="flex flex-col items-start">
                      <span className="text-xs">{mod.name}</span>
                      {mod.price > 0 && <span className="text-[10px] opacity-70">+${mod.price.toFixed(2)}</span>}
                    </div>
                    {selectedModifiers.find(m => m.id === mod.id) && (
                      <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </section>
          ))}

          {/* Notes */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest">{t('Notes for Kitchen')}</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('e.g. Extra hot, no sugar...')}
              className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all min-h-[80px]"
            />
          </section>

          {/* Quantity Selection */}
          <section className="flex items-center justify-between pt-4 border-t border-stone-100">
             <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest">{t('Quantity')}</h3>
             <div className="flex items-center space-x-6 bg-stone-100 rounded-2xl p-2 px-4">
                <button 
                  onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                  className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-stone-600 hover:text-primary transition-colors"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <span className="text-xl font-black min-w-[2ch] text-center">{quantity}</span>
                <button 
                  onClick={() => setQuantity(prev => prev + 1)}
                  className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-stone-600 hover:text-primary transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
             </div>
          </section>
        </div>

        <footer className="p-6 border-t border-stone-100 bg-stone-50 flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{t('Total Price')}</span>
            <span className="text-2xl font-black text-primary">${totalPrice.toFixed(2)}</span>
          </div>
          
          <button 
            onClick={() => onConfirm({ variant: selectedVariant, modifiers: selectedModifiers, quantity, notes })}
            className="h-14 px-8 bg-primary hover:bg-primary/95 text-primary-foreground rounded-2xl font-bold flex items-center gap-3 shadow-lg shadow-primary/20 transition-all active:scale-95"
          >
            <ShoppingCart className="w-5 h-5" />
            {t('Add to Order')}
          </button>
        </footer>
      </div>
    </div>
  );
}
