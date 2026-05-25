import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useSettingsStore } from '@/store/settings';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export default function SettingsPage() {
  const { 
    cafeName, setCafeName, 
    workStartTime, workEndTime, breakDurationMinutes, overtimeRatePerHour, updateHRSettings,
    waterPricePerGuest, taxRate, updatePOSSettings
  } = useSettingsStore();
  
  const [localName, setLocalName] = useState(cafeName);
  const [localWaterPrice, setLocalWaterPrice] = useState(waterPricePerGuest);
  const [localTaxRate, setLocalTaxRate] = useState(taxRate);
  
  // HR Settings Local State
  const [hrSettings, setHrSettings] = useState({
    workStartTime,
    workEndTime,
    breakDurationMinutes,
    overtimeRatePerHour
  });

  const { t, i18n } = useTranslation();

  const handleSave = () => {
    setCafeName(localName);
    updateHRSettings(hrSettings);
    updatePOSSettings({ waterPricePerGuest: localWaterPrice, taxRate: localTaxRate });
    toast.success(t('Settings saved successfully') || 'تم حفظ الإعدادات بنجاح');
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="space-y-6 animate-in fade-in transition-all">
      <div>
        <h2 className="text-3xl font-light tracking-tight">{t('System Settings')}</h2>
        <p className="text-muted-foreground mt-1">{t('Configure cafe parameters and system defaults.') || 'Configure cafe parameters and system defaults.'}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 max-w-4xl">
        <Card className="bg-card border-amber-900/10">
          <CardHeader>
            <CardTitle>{t('Language')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 border-t border-amber-900/10 pt-6">
            <div className="flex space-x-4 space-x-reverse rtl:space-x-reverse">
              <button 
                onClick={() => changeLanguage('en')}
                className={`px-4 py-2 rounded-lg font-medium transition ${i18n.language === 'en' ? 'bg-primary text-primary-foreground' : 'bg-orange-100/50 text-stone-600'}`}
              >
                {t('English')}
              </button>
              <button 
                onClick={() => changeLanguage('ar')}
                className={`px-4 py-2 mx-2 rounded-lg font-medium transition ${i18n.language === 'ar' ? 'bg-primary text-primary-foreground' : 'bg-orange-100/50 text-stone-600'}`}
              >
                {t('Arabic')}
              </button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-amber-900/10">
          <CardHeader>
            <CardTitle>{t('Business Information')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 border-t border-amber-900/10 pt-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
               <div className="space-y-1">
                 <label className="text-muted-foreground block text-xs uppercase tracking-wider">{t('Business Name')}</label>
                 <input 
                   type="text" 
                   value={localName} 
                   onChange={(e) => setLocalName(e.target.value)}
                   className="w-full bg-orange-100/50 border border-orange-300 rounded-lg p-2 focus:border-primary outline-none transition" 
                 />
               </div>
               <div className="space-y-1">
                 <label className="text-muted-foreground block text-xs uppercase tracking-wider">{t('Tax Rate (%)')}</label>
                 <input 
                   type="number" 
                   value={localTaxRate} 
                   onChange={(e) => setLocalTaxRate(Number(e.target.value))}
                   className="w-full bg-orange-100/50 border border-orange-300 rounded-lg p-2 focus:border-primary outline-none transition" 
                 />
               </div>
               <div className="space-y-1">
                 <label className="text-muted-foreground block text-xs uppercase tracking-wider">{t('Water Price Per Guest')}</label>
                 <input 
                   type="number" 
                   step="0.01"
                   value={localWaterPrice} 
                   onChange={(e) => setLocalWaterPrice(Number(e.target.value))}
                   className="w-full bg-orange-100/50 border border-orange-300 rounded-lg p-2 focus:border-primary outline-none transition" 
                 />
               </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-amber-900/10">
          <CardHeader>
            <CardTitle>إعدادات الحضور والدوام (الموارد البشرية)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 border-t border-amber-900/10 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
               <div className="space-y-1">
                 <label className="text-muted-foreground block text-xs uppercase tracking-wider">وقت بدء الدوام</label>
                 <input 
                   type="time" 
                   value={hrSettings.workStartTime} 
                   onChange={(e) => setHrSettings({ ...hrSettings, workStartTime: e.target.value })}
                   className="w-full bg-orange-100/50 border border-orange-300 rounded-lg p-2 focus:border-primary outline-none transition font-mono" 
                 />
               </div>
               <div className="space-y-1">
                 <label className="text-muted-foreground block text-xs uppercase tracking-wider">وقت نهاية الدوام</label>
                 <input 
                   type="time" 
                   value={hrSettings.workEndTime} 
                   onChange={(e) => setHrSettings({ ...hrSettings, workEndTime: e.target.value })}
                   className="w-full bg-orange-100/50 border border-orange-300 rounded-lg p-2 focus:border-primary outline-none transition font-mono" 
                 />
               </div>
               <div className="space-y-1">
                 <label className="text-muted-foreground block text-xs uppercase tracking-wider">مدة الاستراحة (بالدقائق)</label>
                 <input 
                   type="number" 
                   value={hrSettings.breakDurationMinutes} 
                   onChange={(e) => setHrSettings({ ...hrSettings, breakDurationMinutes: Number(e.target.value) })}
                   className="w-full bg-orange-100/50 border border-orange-300 rounded-lg p-2 focus:border-primary outline-none transition font-mono" 
                 />
               </div>
               <div className="space-y-1">
                 <label className="text-muted-foreground block text-xs uppercase tracking-wider">أجرة الدوام الإضافي (للساعة الواحدة)</label>
                 <div className="relative">
                   <input 
                     type="number"
                     step="0.1" 
                     value={hrSettings.overtimeRatePerHour} 
                     onChange={(e) => setHrSettings({ ...hrSettings, overtimeRatePerHour: Number(e.target.value) })}
                     className="w-full bg-orange-100/50 border border-orange-300 rounded-lg p-2 ltr:pl-8 rtl:pr-8 focus:border-primary outline-none transition font-mono" 
                   />
                   <span className="absolute top-2.5 rtl:right-2.5 ltr:left-2.5 text-muted-foreground font-mono text-sm">د.أ</span>
                 </div>
               </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end mt-4">
          <button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-xl font-bold tracking-tight shadow-sm transition-all active:scale-[0.98]">
            {t('Save Settings')}
          </button>
        </div>
      </div>
    </div>
  );
}
