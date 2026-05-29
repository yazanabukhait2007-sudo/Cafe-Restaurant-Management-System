import React, { useState, useEffect, useMemo, useRef } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, parseISO } from "date-fns";
import { ar } from "date-fns/locale";
import { Clock, Plus, X, Save, Calendar, User, FileText, Search, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { toast } from "sonner";
import { useWorkersStore } from "@/store/workers";
import { useAttendanceStore, AttendanceRecord } from "@/store/attendance";
import { useSettingsStore } from "@/store/settings";
import { useTranslation } from "react-i18next";
import i18n from '@/utils/i18n';
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { withOklchPolyfill } from "@/utils/utils";

export default function AttendancePage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { workers } = useWorkersStore();
  const { records, upsertRecords } = useAttendanceStore();
  const { cafeName, workStartTime, workEndTime, breakDurationMinutes } = useSettingsStore();
  
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly'>('daily');
  
  // Monthly Attendance Sheet State
  const [monthlyDate, setMonthlyDate] = useState(new Date());
  const [selectedWorker, setSelectedWorker] = useState<any | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const reportRef = useRef<HTMLDivElement>(null);

  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  
  // Attendance State
  const [savingAttendance, setSavingAttendance] = useState(false);

  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [bulkAttendance, setBulkAttendance] = useState<Record<number, {
    status: 'present' | 'absent' | 'vacation' | 'sick';
    check_in: string;
    check_out: string;
    notes: string;
  }>>({});
  
  const attendanceRecords = useMemo(() => {
    return records.filter(r => r.date === selectedDate);
  }, [records, selectedDate]);

  useEffect(() => {
    if (showAttendanceModal && workers.length > 0) {
      const initial: Record<number, any> = {};
      workers.forEach(w => {
        const existing = records.find(r => r.worker_id === w.id && r.date === selectedDate);
        initial[w.id] = {
          status: existing?.status || 'present',
          check_in: existing?.check_in || workStartTime || format(new Date(), "HH:mm"),
          check_out: existing?.check_out || '',
          notes: existing?.notes || ''
        };
      });
      setBulkAttendance(initial);
    }
  }, [showAttendanceModal, workers, selectedDate, records, workStartTime]);


  const canManage = user?.role === 'admin' || user?.role === 'manager';

  const handleBulkChange = (workerId: number, field: string, value: any) => {
    setBulkAttendance(prev => {
      const workerData = {
        ...prev[workerId],
        [field]: value
      };

      if (field === 'check_in' && workStartTime && value) {
        const [h1, m1] = value.split(':').map(Number);
        const [h2, m2] = workStartTime.split(':').map(Number);
        
        const checkInMins = h1 * 60 + m1;
        const officialStartMins = h2 * 60 + m2;
        const diff = checkInMins - officialStartMins;

        if (diff > 0) {
          const hours = Math.floor(diff / 60);
          const mins = diff % 60;
          
          let parts = [];
          if (hours === 1) parts.push("ساعة");
          else if (hours === 2) parts.push("ساعتين");
          else if (hours > 2 && hours <= 10) parts.push(`${hours} ساعات`);
          else if (hours > 10) parts.push(`${hours} ساعة`);
          
          if (mins > 0) {
            parts.push(`${mins} دقيقة`);
          }
          
          const lateNote = `تأخير صباحي ${parts.join(" و ")}`;
          
          if (!workerData.notes.includes("تأخير صباحي")) {
             workerData.notes = workerData.notes ? `${workerData.notes} - ${lateNote}` : lateNote;
          } else {
             workerData.notes = workerData.notes.replace(/تأخير صباحي.*?(?=\s-|$)/, lateNote);
          }
        } else {
          if (workerData.notes.includes("تأخير صباحي")) {
             workerData.notes = workerData.notes
               .replace(/ - تأخير صباحي.*?(?=\s-|$)/, "")
               .replace(/^تأخير صباحي.*?(?=\s-|$)\s*-?\s*/, "")
               .trim();
          }
        }
      }

      if (field === 'check_out' && workEndTime && value) {
        const [h1, m1] = value.split(':').map(Number);
        const [h2, m2] = workEndTime.split(':').map(Number);
        
        const checkOutMins = h1 * 60 + m1;
        const officialEndMins = h2 * 60 + m2;
        const diff = officialEndMins - checkOutMins;

        if (diff > 0) {
          const hours = Math.floor(diff / 60);
          const mins = diff % 60;
          
          let parts = [];
          if (hours === 1) parts.push("ساعة");
          else if (hours === 2) parts.push("ساعتين");
          else if (hours > 2 && hours <= 10) parts.push(`${hours} ساعات`);
          else if (hours > 10) parts.push(`${hours} ساعة`);
          
          if (mins > 0) {
            parts.push(`${mins} دقيقة`);
          }
          
          const earlyNote = `خروج مبكر ${parts.join(" و ")}`;
          
          if (!workerData.notes.includes("خروج مبكر")) {
             workerData.notes = workerData.notes ? `${workerData.notes} - ${earlyNote}` : earlyNote;
          } else {
             workerData.notes = workerData.notes.replace(/خروج مبكر.*$/, earlyNote);
          }
        } else {
          if (workerData.notes.includes("خروج مبكر")) {
             workerData.notes = workerData.notes
               .replace(/ - خروج مبكر.*$/, "")
               .replace(/^خروج مبكر.*$/, "")
               .trim();
          }
        }

        // Handle Overtime calculation if checkout is later than workEndTime + break duration (if we want to add overtime notes)
        if (diff < 0) {
           const overtimeDiff = (-diff); // minutes
           // Check if it's more than minimum overtime (e.g. 15 mins)
           if (overtimeDiff > 15) {
               const oHours = Math.floor(overtimeDiff / 60);
               const oMins = overtimeDiff % 60;
               let oParts = [];
               if (oHours === 1) oParts.push("ساعة");
               else if (oHours === 2) oParts.push("ساعتين");
               else if (oHours > 2 && oHours <= 10) oParts.push(`${oHours} ساعات`);
               else if (oHours > 10) oParts.push(`${oHours} ساعة`);
               
               if (oMins > 0) {
                 oParts.push(`${oMins} دقيقة`);
               }
               const overtimeNote = `عمل إضافي ${oParts.join(" و ")}`;
               
               if (!workerData.notes.includes("عمل إضافي")) {
                 workerData.notes = workerData.notes ? `${workerData.notes} - ${overtimeNote}` : overtimeNote;
               } else {
                 workerData.notes = workerData.notes.replace(/عمل إضافي.*$/, overtimeNote);
               }
           }
        } else {
           if (workerData.notes.includes("عمل إضافي")) {
             workerData.notes = workerData.notes
               .replace(/ - عمل إضافي.*$/, "")
               .replace(/^عمل إضافي.*$/, "")
               .trim();
           }
        }
      }

      return {
        ...prev,
        [workerId]: workerData
      };
    });
  };

  const handleAddAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAttendance(true);

    try {
      const newRecords = Object.entries(bulkAttendance).map(([workerId, data]) => {
        const recordData = data as any;
        const worker = workers.find(w => w.id === parseInt(workerId));
        return {
          worker_id: parseInt(workerId),
          worker_name: worker?.name || '',
          date: selectedDate,
          status: recordData.status,
          check_in: recordData.status === 'present' ? recordData.check_in : '',
          check_out: recordData.status === 'present' ? recordData.check_out : '',
          notes: recordData.notes
        };
      });

      upsertRecords(newRecords);
      toast.success("تم حفظ سجل الحضور بنجاح");
      setShowAttendanceModal(false);
    } catch (error) {
      console.error("Failed to save attendance", error);
      toast.error("فشل حفظ السجل");
    } finally {
      setSavingAttendance(false);
    }
  };

  const startOfSelectedMonth = startOfMonth(monthlyDate);
  const endOfSelectedMonth = endOfMonth(monthlyDate);

  const getWorkerStats = (workerId: number) => {
    const workerRecords = records.filter(r => {
      if (r.worker_id !== workerId) return false;
      try {
        const recordDate = parseISO(r.date);
        return recordDate >= startOfSelectedMonth && recordDate <= endOfSelectedMonth;
      } catch(e) {
        return false;
      }
    });
    
    const present = workerRecords.filter(r => r.status === 'present').length;
    const absent = workerRecords.filter(r => r.status === 'absent').length;
    const vacation = workerRecords.filter(r => r.status === 'vacation').length;
    const sick = workerRecords.filter(r => r.status === 'sick').length;
    return { present, absent, vacation, sick };
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;

    try {
      const canvas = await withOklchPolyfill(async () => {
        return await html2canvas(reportRef.current!, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`كشف_حضور_${selectedWorker?.name}_${format(monthlyDate, "yyyy-MM")}.pdf`);
      toast.success("تم تصدير ملف PDF بنجاح");
    } catch (error) {
      console.error("PDF Export Error:", error);
      toast.error("حدث خطأ أثناء تحميل ملف PDF");
    }
  };

  const filteredWorkers = workers.filter(w => 
    w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (w.current_job && w.current_job.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-in fade-in transition-all">
      {/* Title Header with tab selectors */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-4">
        <div>
          <h2 className="text-3xl font-light tracking-tight flex items-center gap-3">
            {t('Attendance Management')}
          </h2>
          <p className="text-muted-foreground mt-1">{t('Daily Attendance Logging & Reporting')}</p>
        </div>

        {/* Tab Selector Buttons */}
        <div className="flex bg-orange-50/50 p-1 rounded-xl border border-orange-200 shadow-sm">
          <button
            onClick={() => setActiveTab('daily')}
            className={`px-5 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'daily' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-orange-100/50'}`}
          >
            {t('Daily Attendance')}
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            className={`px-5 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'monthly' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-orange-100/50'}`}
          >
            {t('Monthly Detailed Sheet')}
          </button>
        </div>
      </div>

      {activeTab === 'daily' ? (
        <>
          {/* Daily Date Selector Header */}
          <div className="flex justify-between items-center bg-orange-50/30 p-4 rounded-2xl border border-orange-200/60">
            <span className="font-bold text-foreground text-sm">{t('Pick daily attendance date')}</span>
            <div className="w-full md:w-64">
               <input 
                  type="date" 
                  value={selectedDate} 
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-4 py-2 bg-background border border-orange-200 rounded-xl focus:ring-2 focus:ring-primary outline-none text-left font-mono"
                  dir="ltr"
               />
            </div>
          </div>

          <div className="bg-card rounded-2xl shadow-sm border border-amber-900/10 overflow-hidden min-h-[400px]">
              <div className="p-6">
                {canManage && (
                  <div className="mb-6 flex justify-end">
                    <button
                      onClick={() => setShowAttendanceModal(true)}
                      className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl hover:bg-primary/90 transition-all font-bold flex items-center gap-2 shadow-sm active:scale-[0.98] tracking-tight"
                    >
                      <Plus className="w-5 h-5" />
                      {t('Clock In / Out')}
                    </button>
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-right whitespace-nowrap">
                    <thead className="bg-orange-50/50 border-b border-orange-200">
                    <tr>
                      <th className="px-6 py-4 text-sm font-bold text-foreground w-1/4">{t('Worker')}</th>
                      <th className="px-6 py-4 text-sm font-bold text-foreground w-1/4">{t('Status')}</th>
                      <th className="px-6 py-4 text-sm font-bold text-foreground w-1/6">{t('Check-in Time')}</th>
                      <th className="px-6 py-4 text-sm font-bold text-foreground w-1/6">{t('Check-out Time')}</th>
                      <th className="px-6 py-4 text-sm font-bold text-foreground">{t('Notes')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-900/5">
                    {attendanceRecords.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground font-medium">{t('No attendance recorded for this day')}</td>
                        </tr>
                    ) : attendanceRecords.map((record) => (
                      <tr key={record.worker_id} className="hover:bg-orange-50/30 transition-colors group">
                        <td className="px-6 py-4 text-sm font-bold text-foreground">
                          {record.worker_name}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            {[
                              { value: 'present', label: t('Present'), color: 'bg-emerald-500/10 text-emerald-600' },
                              { value: 'absent', label: t('Absent'), color: 'bg-destructive/10 text-destructive' },
                              { value: 'vacation', label: t('Vacation'), color: 'bg-blue-500/10 text-blue-600' },
                              { value: 'sick', label: t('Sick'), color: 'bg-amber-500/10 text-amber-600' },
                            ].filter(option => option.value === record.status).map((option) => (
                              <div
                                key={option.value}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-tight transition-all cursor-default ${option.color}`}
                              >
                                {option.label}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-mono text-muted-foreground font-bold">
                            {record.check_in || '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-mono text-muted-foreground font-bold">
                            {record.check_out || '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          <span className="text-sm text-foreground font-medium block whitespace-pre-wrap">
                            {record.notes || '-'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Monthly Attendance Sheet Tab View */
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-orange-50/30 p-4 rounded-2xl border border-orange-200/60">
            <span className="font-bold text-foreground text-sm">{t('Select month and control monthly report:')}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMonthlyDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-750 font-bold rounded-lg transition"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              
              <span className="text-lg font-black px-4 text-foreground font-sans min-w-[120px] text-center">
                {format(monthlyDate, 'MMMM yyyy', { locale: i18n.language === 'ar' ? ar : undefined })}
              </span>

              <button
                onClick={() => setMonthlyDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-750 font-bold rounded-lg transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="bg-card rounded-2xl shadow-sm border border-amber-900/10 overflow-hidden">
            <div className="p-6 border-b border-amber-900/10 flex flex-col sm:flex-row gap-4 justify-between items-center bg-orange-50/10">
              <h3 className="font-bold text-lg text-foreground">{t('Monthly Employee Roster Record')}</h3>
              <div className="relative w-full sm:w-64">
                <Search className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={t('Search Staff')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full ltr:pl-9 rtl:pr-9 ltr:pr-4 rtl:pl-4 py-2 bg-orange-50/40 border border-orange-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none text-right"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right whitespace-nowrap">
                <thead className="bg-orange-50/50 border-b border-orange-200">
                  <tr>
                    <th className="px-6 py-4 text-sm font-semibold text-foreground">{t('Worker')}</th>
                    <th className="px-6 py-4 text-sm font-semibold text-foreground">{t('Job Title')}</th>
                    <th className="px-6 py-4 text-sm font-semibold text-foreground text-center">{t('Check-in Days')}</th>
                    <th className="px-6 py-4 text-sm font-semibold text-foreground text-center">{t('Absence Days')}</th>
                    <th className="px-6 py-4 text-sm font-semibold text-foreground"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-900/5">
                  {filteredWorkers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                        {t('No matching employees found')}
                      </td>
                    </tr>
                  ) : (
                    filteredWorkers.map((worker) => {
                      const stats = getWorkerStats(worker.id);
                      return (
                        <tr key={worker.id} className="hover:bg-orange-50/30 transition-colors">
                          <td className="px-6 py-4 font-bold text-foreground flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-orange-100 text-primary flex items-center justify-center font-bold text-xs">
                              {worker.name.charAt(0)}
                            </div>
                            {worker.name}
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">{worker.current_job || '-'}</td>
                          <td className="px-6 py-4 text-center animate-in fade-in transition">
                            <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                              {stats.present} {t('days')}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center animate-in fade-in transition">
                            <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold bg-destructive/10 text-destructive border border-destructive/20">
                              {stats.absent} {t('days')}
                            </span>
                          </td>
                          <td className="px-6 py-4 ltr:text-right rtl:text-left">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setSelectedWorker(worker);
                                  setShowDetailsModal(true);
                                }}
                                className="text-primary hover:text-primary-foreground hover:bg-primary/10 px-3 py-1.5 rounded-lg font-bold text-sm tracking-tight transition flex items-center gap-1.5"
                              >
                                <FileText className="w-4 h-4" />
                                {t('View Details and Report')}
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedWorker(worker);
                                  setShowDetailsModal(true);
                                  setTimeout(() => {
                                    handleExportPDF();
                                  }, 150);
                                }}
                                className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                title={t('Export PDF')}
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Details and Printable PDF Modal */}
      {showDetailsModal && selectedWorker && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-background border border-border rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-border flex justify-between items-center bg-orange-50/50">
              <div>
                <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  {selectedWorker.name}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('Employee Attendance Details')} {format(monthlyDate, "MMMM yyyy", { locale: i18n.language === 'ar' ? ar : undefined })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors text-sm font-bold shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  {t('Export PDF')}
                </button>
                <button 
                  onClick={() => setShowDetailsModal(false)}
                  className="text-muted-foreground hover:text-foreground hover:bg-orange-200/50 p-2 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* Printable PDF Content (Isolated Off-screen layout specifically designed for PDF) */}
              <div style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "210mm", minHeight: "297mm" }}>
                <div ref={reportRef} className="bg-[#ffffff] p-8 w-full text-right text-stone-900" dir={i18n.dir()}>
                  <div className="flex items-center justify-between mb-8 border-b-2 border-[#15803d] pb-4">
                    <div>
                      <h1 className="text-2xl font-bold text-[#15803d] mb-2">{t('Detailed Employee Attendance Report')}</h1>
                      <p className="text-lg text-gray-600">{t('Month')}: {format(monthlyDate, "MMMM yyyy", { locale: i18n.language === 'ar' ? ar : undefined })}</p>
                      <p className="text-md font-bold text-stone-900 mt-2">{t('Worker')}: {selectedWorker.name}</p>
                    </div>
                    {/* Custom Brand Header Logo Replacement */}
                    <div className="flex flex-col items-end">
                      <div className="text-2xl font-black text-[#15803d] tracking-tight">{cafeName || 'Lavant'}</div>
                      <div className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">{cafeName || 'Lavant'} Co</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-[#f0fdf4] p-4 rounded-lg border border-[#bcf0da]">
                      <div className="text-sm text-emerald-700 mb-1 font-bold">{t('Check-in Days')}</div>
                      <div className="text-xl font-bold text-emerald-800">
                        {records.filter(r => r.worker_id === selectedWorker.id && r.status === 'present' && format(parseISO(r.date), "yyyy-MM") === format(monthlyDate, "yyyy-MM")).length} {t('days')}
                      </div>
                    </div>
                    <div className="bg-[#fef2f2] p-4 rounded-lg border border-[#fecaca]">
                      <div className="text-sm text-red-700 mb-1 font-bold">{t('Absence Days')}</div>
                      <div className="text-xl font-bold text-red-800">
                        {records.filter(r => r.worker_id === selectedWorker.id && r.status === 'absent' && format(parseISO(r.date), "yyyy-MM") === format(monthlyDate, "yyyy-MM")).length} {t('days')}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    {/* Column 1: Days 1-16 */}
                    <div className="flex-1">
                      <table className="w-full ltr:text-left rtl:text-right border-collapse text-[9px]">
                        <thead>
                          <tr className="bg-[#15803d] text-[#ffffff]">
                            <th className="border border-[#15803d] px-1 py-1 font-bold text-center">{t('Date')}</th>
                            <th className="border border-[#15803d] px-1 py-1 font-bold text-center">{t('Day')}</th>
                            <th className="border border-[#15803d] px-1 py-1 font-bold text-center">{t('Status')}</th>
                            <th className="border border-[#15803d] px-1 py-1 font-bold text-center">{t('In')}</th>
                            <th className="border border-[#15803d] px-1 py-1 font-bold text-center">{t('Out')}</th>
                            <th className="border border-[#15803d] px-1 py-1 font-bold text-center">{t('Notes')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {eachDayOfInterval({
                            start: startOfSelectedMonth,
                            end: endOfSelectedMonth
                          }).slice(0, 16).map((day, index) => {
                            const dateStr = format(day, "yyyy-MM-dd");
                            const record = records.find(r => r.worker_id === selectedWorker.id && r.date === dateStr);
                            const dayName = format(day, "EEEE", { locale: i18n.language === 'ar' ? ar : undefined });
                            return (
                              <tr key={dateStr} className={index % 2 === 0 ? "bg-[#f9fafb]" : "bg-[#ffffff]"}>
                                <td className="border border-[#e5e7eb] px-1 py-1 whitespace-nowrap text-center text-xs font-mono">{format(day, "dd/MM")}</td>
                                <td className="border border-[#e5e7eb] px-1 py-1 whitespace-nowrap text-center">{dayName}</td>
                                <td className="border border-[#e5e7eb] px-1 py-1 font-bold text-center">
                                  {record?.status === 'present' ? t('Present') : record?.status === 'absent' ? t('Absent') : '-'}
                                </td>
                                <td className="border border-[#e5e7eb] px-1 py-1 text-center font-mono">{(record?.status === 'present' && record?.check_in) || '-'}</td>
                                <td className="border border-[#e5e7eb] px-1 py-1 text-center font-mono">{(record?.status === 'present' && record?.check_out) || '-'}</td>
                                <td className="border border-[#e5e7eb] px-1 py-1 text-[8px] break-words max-w-[70px] ltr:text-left rtl:text-right">{record?.notes || '-'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Column 2: Days 17-31 */}
                    <div className="flex-1">
                      <table className="w-full ltr:text-left rtl:text-right border-collapse text-[9px]">
                        <thead>
                          <tr className="bg-[#15803d] text-[#ffffff]">
                            <th className="border border-[#15803d] px-1 py-1 font-bold text-center">{t('Date')}</th>
                            <th className="border border-[#15803d] px-1 py-1 font-bold text-center">{t('Day')}</th>
                            <th className="border border-[#15803d] px-1 py-1 font-bold text-center">{t('Status')}</th>
                            <th className="border border-[#15803d] px-1 py-1 font-bold text-center">{t('In')}</th>
                            <th className="border border-[#15803d] px-1 py-1 font-bold text-center">{t('Out')}</th>
                            <th className="border border-[#15803d] px-1 py-1 font-bold text-center">{t('Notes')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {eachDayOfInterval({
                            start: startOfSelectedMonth,
                            end: endOfSelectedMonth
                          }).slice(16).map((day, index) => {
                            const dateStr = format(day, "yyyy-MM-dd");
                            const record = records.find(r => r.worker_id === selectedWorker.id && r.date === dateStr);
                            const dayName = format(day, "EEEE", { locale: i18n.language === 'ar' ? ar : undefined });
                            return (
                              <tr key={dateStr} className={index % 2 === 0 ? "bg-[#f9fafb]" : "bg-[#ffffff]"}>
                                <td className="border border-[#e5e7eb] px-1 py-1 whitespace-nowrap text-center text-xs font-mono">{format(day, "dd/MM")}</td>
                                <td className="border border-[#e5e7eb] px-1 py-1 whitespace-nowrap text-center">{dayName}</td>
                                <td className="border border-[#e5e7eb] px-1 py-1 font-bold text-center">
                                  {record?.status === 'present' ? t('Present') : record?.status === 'absent' ? t('Absent') : '-'}
                                </td>
                                <td className="border border-[#e5e7eb] px-1 py-1 text-center font-mono">{(record?.status === 'present' && record?.check_in) || '-'}</td>
                                <td className="border border-[#e5e7eb] px-1 py-1 text-center font-mono">{(record?.status === 'present' && record?.check_out) || '-'}</td>
                                <td className="border border-[#e5e7eb] px-1 py-1 text-[8px] break-words max-w-[70px] ltr:text-left rtl:text-right">{record?.notes || '-'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  <div className="mt-12 pt-4 border-t border-[#e5e7eb] text-center text-[#6b7280] text-xs font-bold">
                    {t('System generated report')}
                  </div>
                </div>
              </div>

              {/* In-app UI Representation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20">
                  <span className="text-emerald-700 text-sm font-bold block mb-1">{t('Check-in Days')} {format(monthlyDate, "MM yyyy")}</span>
                  <span className="text-2xl font-black text-emerald-800">
                    {records.filter(r => r.worker_id === selectedWorker.id && r.status === 'present' && format(parseISO(r.date), "yyyy-MM") === format(monthlyDate, "yyyy-MM")).length} {t('days')}
                  </span>
                </div>
                <div className="bg-destructive/10 p-4 rounded-xl border border-destructive/20">
                  <span className="text-destructive text-sm font-bold block mb-1">{t('Absence Days')} {format(monthlyDate, "MM yyyy")}</span>
                  <span className="text-2xl font-black text-destructive">
                    {records.filter(r => r.worker_id === selectedWorker.id && r.status === 'absent' && format(parseISO(r.date), "yyyy-MM") === format(monthlyDate, "yyyy-MM")).length} {t('days')}
                  </span>
                </div>
              </div>

              <div className="border border-amber-900/10 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full ltr:text-left rtl:text-right text-sm">
                  <thead className="bg-[#fcf8f2] border-b border-orange-200">
                    <tr>
                      <th className="px-4 py-3 font-bold text-foreground">{t('Date')}</th>
                      <th className="px-4 py-3 font-bold text-foreground">{t('Day')}</th>
                      <th className="px-4 py-3 font-bold text-foreground">{t('Status')}</th>
                      <th className="px-4 py-3 font-bold text-foreground">{t('In')}</th>
                      <th className="px-4 py-3 font-bold text-foreground">{t('Out')}</th>
                      <th className="px-4 py-3 font-bold text-foreground">{t('Notes')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-900/5">
                    {eachDayOfInterval({
                      start: startOfSelectedMonth,
                      end: endOfSelectedMonth
                    }).map((day) => {
                      const dateStr = format(day, "yyyy-MM-dd");
                      const record = records.find(r => r.worker_id === selectedWorker.id && r.date === dateStr);
                      const dayName = format(day, "EEEE", { locale: i18n.language === 'ar' ? ar : undefined });
                      const isWeekend = getDay(day) === 5 || getDay(day) === 6; // Friday (5) or Saturday (6)

                      return (
                        <tr key={dateStr} className={`hover:bg-orange-50/20 ${isWeekend ? 'bg-orange-50/5' : ''}`}>
                          <td className="px-4 py-3 font-medium text-foreground">{format(day, "dd/MM/yyyy")}</td>
                          <td className="px-4 py-3 text-muted-foreground">{dayName}</td>
                          <td className="px-4 py-3">
                            {record ? (
                              <span className={`px-2 py-1 rounded text-xs font-bold ${ record.status === 'present' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : record.status === 'absent' ? 'bg-destructive/10 text-destructive border border-destructive/20' : 'bg-stone-100 text-stone-700' }`}>
                                {record.status === 'present' ? t('Present') :
                                 record.status === 'absent' ? t('Absent') : '-'}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs font-bold">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono text-muted-foreground">{(record?.status === 'present' && record?.check_in) || '-'}</td>
                          <td className="px-4 py-3 font-mono text-muted-foreground">{(record?.status === 'present' && record?.check_out) || '-'}</td>
                          <td className="px-4 py-3 text-foreground text-xs break-words max-w-[200px]" title={record?.notes}>
                            {record?.notes || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="p-4 border-t border-border bg-orange-50/20 flex justify-end gap-2">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-6 py-2 bg-background text-foreground rounded-xl border border-border hover:bg-[#fcf8f2] transition font-bold"
              >
                {t('Close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
