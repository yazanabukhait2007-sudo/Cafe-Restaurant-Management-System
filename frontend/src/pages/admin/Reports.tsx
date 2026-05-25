import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function ReportsPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6 animate-in fade-in transition-all">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-light tracking-tight">{t('Reports & Analytics')}</h2>
          <p className="text-muted-foreground mt-1">{t('Detailed breakdown of sales and performance.')}</p>
        </div>
        <button onClick={() => toast.success(t('Report downloaded to device.'))} className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg font-medium flex items-center justify-center space-x-2 rtl:space-x-reverse transition">
          <Download className="w-4 h-4" />
          <span>{t('Export CSV')}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card border-amber-900/10">
          <CardHeader><CardTitle>{t('Sales by Category')}</CardTitle></CardHeader>
          <CardContent className="h-64 flex items-center justify-center text-muted-foreground border-t border-amber-900/10">
            Chart integration pending...
          </CardContent>
        </Card>
        <Card className="bg-card border-amber-900/10">
          <CardHeader><CardTitle>{t('Hourly Traffic')}</CardTitle></CardHeader>
          <CardContent className="h-64 flex items-center justify-center text-muted-foreground border-t border-amber-900/10">
             Chart integration pending...
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
