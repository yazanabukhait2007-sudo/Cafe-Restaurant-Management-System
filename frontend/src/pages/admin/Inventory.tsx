import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export default function InventoryPage() {
  const { t } = useTranslation();
  const [inventory, setInventory] = useState([
    { id: 1, name: 'Espresso Roast Beans', qty: 2.5, unit: 'kg', min: 3 },
    { id: 2, name: 'Oat Milk', qty: 12, unit: 'cartons', min: 10 },
  ]);

  const handleAddStock = () => {
    toast.success(t('Restock order generated for low items.') || 'Restock order generated for low items.');
    setInventory(inventory.map(i => ({ ...i, qty: i.qty + 5 })));
  };

  return (
    <div className="space-y-6 animate-in fade-in transition-all">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-light tracking-tight">{t('Inventory')}</h2>
          <p className="text-muted-foreground mt-1">{t('Manage stock levels, ingredients, and purchase orders.')}</p>
        </div>
        <button onClick={handleAddStock} className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition">{t('Quick Restock')}</button>
      </div>

      <Card className="bg-card border-amber-900/10">
        <CardHeader>
          <CardTitle>{t('Low Stock Alerts')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {inventory.map(item => (
              <div key={item.id} className={`flex items-center justify-between p-4 rounded-xl border ${item.qty < item.min ? 'border-destructive/50 bg-destructive/10 text-destructive-foreground' : 'border-orange-300 bg-orange-100/50'}`}>
                <div>
                  <h3 className="font-medium">{item.name}</h3>
                  <p className="text-xs opacity-70">{t('Min requirement')}: {item.min} {item.unit}</p>
                </div>
                <div className="text-right rtl:text-left">
                  <div className="font-bold text-lg">{item.qty} {item.unit}</div>
                  {item.qty < item.min && <span className="text-xs font-bold uppercase tracking-wider text-destructive">{t('Low Stock Alerts')}</span>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
