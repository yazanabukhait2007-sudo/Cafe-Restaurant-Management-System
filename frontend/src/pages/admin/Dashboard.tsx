import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/utils/utils';
import { Activity, DollarSign, Users, ShoppingBag, TrendingUp, AlertCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { usePosStore } from '@/store/pos';
import { useTranslation } from 'react-i18next';

export default function DashboardPage() {
  const tickets = usePosStore(state => state.tickets);
  const { t } = useTranslation();
  
  const stats = [
    { title: t("Total Revenue"), value: "$4,231.89", trend: "+20% from last month", icon: DollarSign, color: "text-amber-500" },
    { title: t("Active Orders"), value: tickets.length.toString(), trend: `${tickets.length} pending in KDS`, icon: Activity, color: "text-emerald-500" },
    { title: t("Avg Ticket Size"), value: "$34.50", trend: "+5% from last week", icon: ShoppingBag, color: "text-blue-500" },
    { title: t("Total Customers"), value: "142", trend: "Peak hours active", icon: Users, color: "text-purple-500" }
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-light tracking-tight">{t('Dashboard Overview')}</h2>
          <p className="text-muted-foreground mt-1 text-sm">{t('Review your daily cafe performance and open orders.') || 'Review your daily cafe performance and open orders.'}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className="bg-card border-amber-900/10/50 shadow-sm hover:border-amber-900/10 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <Icon className={cn("w-4 h-4", stat.color)} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-light">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.trend}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 bg-card border-amber-900/10/50">
          <CardHeader>
            <CardTitle className="font-medium text-lg">{t('Revenue Overview')}</CardTitle>
          </CardHeader>
          <CardContent className="h-80 flex flex-col items-center justify-center border-t border-amber-900/10/50">
            {/* Chart placeholder */}
            <div className="flex flex-col items-center justify-center text-muted-foreground space-y-4">
              <div className="w-64 h-32 rounded-xl bg-gradient-to-t from-primary/20 to-transparent flex items-end relative overflow-hidden">
                <div className="w-full border-t border-primary/50 relative">
                   <div className="absolute -top-1.5 left-1/2 w-3 h-3 rounded-full bg-primary animate-pulse"></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 bg-card border-amber-900/10/50">
          <CardHeader>
            <CardTitle className="font-medium text-lg">{t('Recent Activities')}</CardTitle>
          </CardHeader>
          <CardContent className="border-t border-amber-900/10/50 pt-4">
            <div className="space-y-6">
               {[
                 { action: "Order #4023", details: "Paid via Credit Card", amount: "$45.00", time: "2 min ago" },
                 { action: "Table 4 Assigned", details: "Waiter: Sarah M.", amount: "-", time: "15 min ago" },
                 { action: "Low Stock Alert", details: "Coffee Beans Espresso Roast", amount: "2kg left", time: "1 hr ago" },
                 { action: "Shift Started", details: "Morning shift opened", amount: "-", time: "4 hrs ago" },
               ].map((act, i) => (
                 <div key={i} className="flex items-center justify-between">
                   <div className="flex items-start space-x-3 rtl:space-x-reverse">
                     <div className="w-2 h-2 rounded-full bg-primary mt-1.5"></div>
                     <div>
                       <p className="text-sm font-medium">{act.action}</p>
                       <p className="text-xs text-muted-foreground">{act.details}</p>
                     </div>
                   </div>
                   <div className="text-right">
                     <p className="text-sm font-medium">{act.amount}</p>
                     <p className="text-xs text-muted-foreground">{act.time}</p>
                   </div>
                 </div>
               ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-white border-stone-200 overflow-hidden rounded-[2rem] shadow-sm">
           <CardHeader className="bg-stone-50/50 border-b border-stone-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-stone-900">{t('Product Profitability')}</CardTitle>
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-1">{t('High Margin Items')}</p>
              </div>
              <ArrowUpRight className="w-5 h-5 text-emerald-500" />
           </CardHeader>
           <CardContent className="p-0">
              <div className="divide-y divide-stone-100">
                {[
                  { name: t('V60 Special Edition'), margin: '84%', profit: '$8.50', count: 142 },
                  { name: t('Iced Latte'), margin: '78%', profit: '$4.20', count: 521 },
                  { name: t('Americano'), margin: '75%', profit: '$3.50', count: 890 },
                  { name: t('Flat White'), margin: '72%', profit: '$3.80', count: 412 },
                ].map((item, i) => (
                  <div key={i} className="p-4 flex items-center justify-between hover:bg-stone-50 transition-colors">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-stone-800">{item.name}</span>
                      <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">{item.count} {t('Sold')}</span>
                    </div>
                    <div className="text-right">
                       <div className="flex items-center gap-1 text-emerald-600 font-bold justify-end">
                         <TrendingUp className="w-3 h-3" />
                         <span className="text-sm">{item.margin}</span>
                       </div>
                       <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">{item.profit} {t('Profit/Unit')}</p>
                    </div>
                  </div>
                ))}
              </div>
           </CardContent>
        </Card>

        <Card className="bg-white border-stone-200 overflow-hidden rounded-[2rem] shadow-sm">
           <CardHeader className="bg-stone-50/50 border-b border-stone-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-stone-900">{t('Cost Analysis Alert')}</CardTitle>
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-1">{t('Low Margin / High Cost')}</p>
              </div>
              <AlertCircle className="w-5 h-5 text-rose-500" />
           </CardHeader>
           <CardContent className="p-0">
              <div className="divide-y divide-stone-100">
                {[
                  { name: t('Turkey Toastie'), margin: '22%', cost: '$8.50', trend: t('trend_cost_up') },
                  { name: t('Avocado Sandwich'), margin: '28%', cost: '$9.20', trend: t('trend_cost_up_small') },
                  { name: t('Pistachio Croissant'), margin: '31%', cost: '$4.10', trend: t('Stable') },
                  { name: t('Grilled Cheese'), margin: '34%', cost: '$3.80', trend: t('Rising') },
                ].map((item, i) => (
                  <div key={i} className="p-4 flex items-center justify-between hover:bg-stone-50 transition-colors">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-stone-800">{item.name}</span>
                      <span className="text-[10px] text-rose-500 font-bold uppercase tracking-widest">{item.trend}</span>
                    </div>
                    <div className="text-right">
                       <div className="flex items-center gap-1 text-rose-600 font-bold justify-end">
                         <ArrowDownRight className="w-3 h-3" />
                         <span className="text-sm">{item.margin}</span>
                       </div>
                       <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">${item.cost} {t('Unit Cost')}</p>
                    </div>
                  </div>
                ))}
              </div>
           </CardContent>
        </Card>
      </div>
    </div>
  );
}
