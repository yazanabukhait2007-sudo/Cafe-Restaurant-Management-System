import React, { useState, useRef } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { FileText, Download, Plus, Trash2, X, Search, ChevronRight, ChevronLeft } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { withOklchPolyfill } from "@/utils/utils";
import { useAuthStore } from "@/store/auth";
import { useWorkersStore } from "@/store/workers";
import { usePayrollStore } from "@/store/payroll";
import { toast } from "sonner";

// Inline helper components for clean implementation
function MonthPicker({ value, onChange }: { value: string; onChange: (v: string) => void; align?: string }) {
  const date = value ? new Date(value + "-01") : new Date();
  
  const handlePrev = () => {
    const prev = new Date(date.getFullYear(), date.getMonth() - 1, 1);
    onChange(format(prev, 'yyyy-MM'));
  };
  
  const handleNext = () => {
    const next = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    onChange(format(next, 'yyyy-MM'));
  };

  return (
    <div className="flex items-center gap-2 bg-orange-50/50 p-1 rounded-xl border border-orange-200">
      <button
        type="button"
        onClick={handlePrev}
        className="p-1.5 hover:bg-orange-200/50 rounded-lg text-muted-foreground transition cursor-pointer"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
      <span className="w-32 text-center font-bold text-sm text-foreground">
        {format(date, 'MMMM yyyy', { locale: ar })}
      </span>
      <button
        type="button"
        onClick={handleNext}
        className="p-1.5 hover:bg-orange-200/50 rounded-lg text-muted-foreground transition cursor-pointer"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
    </div>
  );
}

function DatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none text-left font-mono"
      dir="ltr"
    />
  );
}

function ConfirmModal({ isOpen, title, message, confirmText, onConfirm, onCancel }: {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-background border border-border rounded-3xl w-full max-w-md shadow-2xl p-6" dir="rtl">
        <h3 className="text-xl font-bold text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2.5 bg-background border border-border text-foreground rounded-xl text-sm font-bold hover:bg-muted cursor-pointer"
          >
            إلغاء
          </button>
          <button
            onClick={() => {
              onConfirm();
              onCancel();
            }}
            className="px-4 py-2.5 bg-destructive text-destructive-foreground rounded-xl text-sm font-bold hover:bg-destructive/90 cursor-pointer"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function Logo() {
  return (
    <div className="flex flex-col items-end">
      <div className="text-2xl font-black text-[#15803d] tracking-tight">لافانت</div>
      <div className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Lavant Co</div>
    </div>
  );
}

export default function AccountStatement() {
  const { user } = useAuthStore();
  const { workers } = useWorkersStore();
  const { transactions, addTransaction, deleteTransaction } = usePayrollStore();

  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedWorker, setSelectedWorker] = useState<any | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, id: number | null}>({
    isOpen: false,
    id: null
  });

  const [newTransaction, setNewTransaction] = useState({
    type: 'bonus',
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    description: ''
  });

  const statementRef = useRef<HTMLDivElement>(null);

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorker || !newTransaction.amount) return;

    try {
      addTransaction({
        workerId: selectedWorker.id,
        type: newTransaction.type as any,
        amount: parseFloat(newTransaction.amount),
        date: newTransaction.date,
        description: newTransaction.description || (newTransaction.type === 'payment' ? 'دفعة نقدية / سلفة' : newTransaction.type === 'deduction' ? 'خصم مالي' : 'مكافأة')
      });
      
      setIsAddModalOpen(false);
      setNewTransaction({
        type: 'bonus',
        amount: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        description: ''
      });
      toast.success("تم إضافة الحركة بنجاح");
    } catch (error) {
      console.error("Error adding transaction:", error);
      toast.error("حدث خطأ أثناء إضافة الحركة");
    }
  };

  const confirmDelete = (id: number) => {
    setDeleteModal({ isOpen: true, id });
  };

  const executeDelete = () => {
    if (!deleteModal.id) return;

    try {
      deleteTransaction(deleteModal.id);
      toast.success("تم حذف الحركة بنجاح");
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast.error("حدث خطأ أثناء حذف الحركة");
    }
  };

  const calculateNetBalance = (workerId: number) => {
    const worker = workers.find(w => w.id === workerId);
    let balance = worker?.salary || 0;
    
    const workerTransactions = transactions.filter(t => t.workerId === workerId && t.date.startsWith(selectedMonth));
    
    workerTransactions.forEach(t => {
      if ((t.type as string) === 'salary' || t.type === 'bonus') {
        balance += t.amount;
      } else if (t.type === 'deduction' || t.type === 'payment') {
        balance -= t.amount;
      }
    });
    
    return balance;
  };

  const handleExportPDF = async () => {
    if (!statementRef.current) return;

    try {
      const canvas = await withOklchPolyfill(async () => {
        return await html2canvas(statementRef.current!, {
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
      pdf.save(`كشف_حساب_${selectedWorker?.name}_${selectedMonth}.pdf`);
      toast.success("تم تصدير ملف PDF بنجاح");
    } catch (error) {
      console.error("PDF Export Error:", error);
      toast.error("حدث خطأ أثناء تصدير الملف");
    }
  };

  const filteredWorkers = workers.filter(w => 
    w.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'salary': return 'راتب';
      case 'bonus': return 'علاوة';
      case 'deduction': return 'خصم';
      case 'payment': return 'دفعة';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'salary': return 'bg-[#dbeafe] text-[#1e40af]';
      case 'bonus': return 'bg-[#dcfce7] text-[#166534]';
      case 'deduction': return 'bg-[#fee2e2] text-[#991b1b]';
      case 'payment': return 'bg-[#ffedd5] text-[#9a3412]';
      default: return 'bg-[#f3f4f6] text-[#1f2937]';
    }
  };

  const canAddTransaction = user?.role === 'admin' || user?.role === 'manager';
  const canDeleteTransaction = user?.role === 'admin' || user?.role === 'manager';
  const canExportPdf = user?.role === 'admin' || user?.role === 'manager';

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">كشف الحساب</h1>
          <p className="text-gray-500 mt-1">إدارة رواتب وحسابات العمال</p>
        </div>
        <div className="w-full sm:w-auto">
          <MonthPicker value={selectedMonth} onChange={setSelectedMonth} align="left" />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="relative max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="ابحث عن عامل..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-right"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600">اسم العامل</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600">الرصيد الصافي</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredWorkers.map((worker) => {
                const netBalance = calculateNetBalance(worker.id);
                return (
                  <tr key={worker.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{worker.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`font-bold ${netBalance >= 0 ? 'text-green-600 ' : 'text-red-600 '}`} dir="ltr">
                        {netBalance.toFixed(2)} د.أ
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        {canAddTransaction && (
                          <button
                            onClick={() => {
                              setSelectedWorker(worker);
                              setIsAddModalOpen(true);
                            }}
                            className="p-2 text-[#006838] hover:bg-[#006838]/10 rounded-lg transition-colors cursor-pointer"
                            title="إضافة حركة"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedWorker(worker);
                            setIsDetailsModalOpen(true);
                          }}
                          className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium cursor-pointer"
                        >
                          <FileText className="w-4 h-4" />
                          تفاصيل
                        </button>
                        {canExportPdf && (
                          <button
                            onClick={async () => {
                              setSelectedWorker(worker);
                              setIsDetailsModalOpen(true);
                              setTimeout(() => {
                                handleExportPDF();
                              }, 100);
                            }}
                            className="p-2 text-[#006838] hover:bg-[#006838]/10 rounded-lg transition-colors cursor-pointer"
                            title="تحميل PDF"
                          >
                            <Download className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredWorkers.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                    لا يوجد عمال مطابقين للبحث
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {isDetailsModalOpen && selectedWorker && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setIsDetailsModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-orange-50/10">
              <h2 className="text-xl font-bold text-gray-900">كشف حساب: {selectedWorker.name}</h2>
              <div className="flex gap-2">
                {canExportPdf && (
                  <button
                    onClick={handleExportPDF}
                    className="flex items-center gap-2 px-4 py-2 bg-[#006838] text-white rounded-lg hover:bg-[#006838]/90 transition-colors cursor-pointer font-bold"
                  >
                    <Download className="w-4 h-4" />
                    تحميل PDF
                  </button>
                )}
                <button
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {/* Isolated hidden PDF rendering context */}
              <div style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "210mm", minHeight: "297mm" }}>
                <div ref={statementRef} className="bg-[#ffffff] p-8 w-full print-area" dir="rtl">
                  <div className="flex justify-between items-center mb-8 border-b-2 border-[#006838] pb-4">
                    <div>
                      <h1 className="text-2xl font-bold text-[#006838] mb-2">كشف حساب عامل</h1>
                      <p className="text-[#4b5563]">
                        {format(new Date(`${selectedMonth}-01`), 'MMMM yyyy', { locale: ar })}
                      </p>
                    </div>
                    <div className="scale-100 origin-left">
                      <Logo />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-[#f9fafb] p-4 rounded-lg border border-[#f3f4f6]">
                      <div className="text-sm text-[#6b7280] mb-1">اسم العامل</div>
                      <div className="font-bold text-[#111827]">{selectedWorker.name}</div>
                    </div>
                    <div className="bg-[#f9fafb] p-4 rounded-lg border border-[#f3f4f6]">
                      <div className="text-sm text-[#6b7280] mb-1">الرصيد الصافي</div>
                      <div className={`font-bold ${calculateNetBalance(selectedWorker.id) >= 0 ? 'text-[#16a34a]' : 'text-[#dc2626]'}`} dir="ltr">
                        {calculateNetBalance(selectedWorker.id).toFixed(2)} د.أ
                      </div>
                    </div>
                  </div>

                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="bg-[#f3f4f6]">
                        <th className="border border-[#e5e7eb] px-4 py-2 font-semibold text-[#374151]">التاريخ</th>
                        <th className="border border-[#e5e7eb] px-4 py-2 font-semibold text-[#374151]">النوع</th>
                        <th className="border border-[#e5e7eb] px-4 py-2 font-semibold text-[#374151]">البيان</th>
                        <th className="border border-[#e5e7eb] px-4 py-2 font-semibold text-[#374151]">المبلغ</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-orange-50/10">
                        <td className="border border-[#e5e7eb] px-4 py-2 text-[#111827]">{format(new Date(`${selectedMonth}-01`), 'yyyy-MM-01')}</td>
                        <td className="border border-[#e5e7eb] px-4 py-2">
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-[#dbeafe] text-[#1e40af]">
                            راتب
                          </span>
                        </td>
                        <td className="border border-[#e5e7eb] px-4 py-2 text-[#111827]">الراتب الأساسي لشهر {format(new Date(`${selectedMonth}-01`), 'MM/yyyy')}</td>
                        <td className="border border-[#e5e7eb] px-4 py-2 font-medium text-[#111827]" dir="ltr">
                          +{selectedWorker.salary.toFixed(2)}
                        </td>
                      </tr>
                      {transactions.filter(t => t.workerId === selectedWorker.id && t.date.startsWith(selectedMonth)).map((t) => (
                        <tr key={t.id}>
                          <td className="border border-[#e5e7eb] px-4 py-2 text-[#111827]">{t.date}</td>
                          <td className="border border-[#e5e7eb] px-4 py-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${ (t.type as string) === 'salary' ? 'bg-[#dbeafe] text-[#1e40af]' : t.type === 'bonus' ? 'bg-[#dcfce7] text-[#166534]' : t.type === 'deduction' ? 'bg-[#fee2e2] text-[#991b1b]' : 'bg-[#ffedd5] text-[#9a3412]' }`}>
                              {getTypeLabel(t.type)}
                            </span>
                          </td>
                          <td className="border border-[#e5e7eb] px-4 py-2 text-[#111827]">{t.description || '-'}</td>
                          <td className="border border-[#e5e7eb] px-4 py-2 font-medium text-[#111827]" dir="ltr">
                            {(t.type === 'deduction' || t.type === 'payment') ? '-' : '+'}{t.amount.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-[#f9fafb] font-bold">
                        <td colSpan={3} className="border border-[#e5e7eb] px-4 py-3 text-left text-[#111827]">الرصيد الصافي:</td>
                        <td className="border border-[#e5e7eb] px-4 py-3 text-[#111827]" dir="ltr">
                          {calculateNetBalance(selectedWorker.id).toFixed(2)} د.أ
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                  
                  <div className="mt-12 pt-4 border-t border-[#e5e7eb] text-center text-[#6b7280] text-sm font-bold">
                    تم إصدار هذا الكشف من شركة لافانت للمنتجات الغذائية
                  </div>
                </div>
              </div>
              
              {/* Visible UI for Modal */}
              <div className="bg-white p-0 sm:p-4 rounded-xl" dir="rtl">
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <div className="text-sm text-gray-500 mb-1">اسم العامل</div>
                    <div className="font-bold text-gray-900">{selectedWorker.name}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <div className="text-sm text-gray-500 mb-1">الرصيد الصافي</div>
                    <div className={`font-bold ${calculateNetBalance(selectedWorker.id) >= 0 ? 'text-green-600 ' : 'text-red-600 '}`} dir="ltr">
                      {calculateNetBalance(selectedWorker.id).toFixed(2)} د.أ
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-100 px-4 py-2 font-semibold text-gray-600">التاريخ</th>
                        <th className="border border-gray-100 px-4 py-2 font-semibold text-gray-600">النوع</th>
                        <th className="border border-gray-100 px-4 py-2 font-semibold text-gray-600">البيان</th>
                        <th className="border border-gray-100 px-4 py-2 font-semibold text-gray-600">المبلغ</th>
                        {canDeleteTransaction && (
                          <th className="border border-gray-100 px-4 py-2 font-semibold text-gray-600 text-center">حذف</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="hover:bg-gray-50">
                        <td className="border border-gray-100 px-4 py-2 text-gray-900">{format(new Date(`${selectedMonth}-01`), 'yyyy-MM-01')}</td>
                        <td className="border border-gray-100 px-4 py-2">
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-[#dbeafe] text-[#1e40af]">
                            راتب
                          </span>
                        </td>
                        <td className="border border-gray-100 px-4 py-2 text-gray-900">الراتب الأساسي لشهر {format(new Date(`${selectedMonth}-01`), 'MM/yyyy')}</td>
                        <td className="border border-gray-100 px-4 py-2 font-medium text-gray-900 text-left" dir="ltr">
                          +{selectedWorker.salary.toFixed(2)} د.أ
                        </td>
                        {canDeleteTransaction && (
                          <td className="border border-gray-100 px-4 py-2"></td>
                        )}
                      </tr>
                      {transactions.filter(t => t.workerId === selectedWorker.id && t.date.startsWith(selectedMonth)).map((t) => (
                        <tr key={t.id} className="hover:bg-gray-50">
                          <td className="border border-gray-100 px-4 py-2 text-gray-900">{t.date}</td>
                          <td className="border border-gray-100 px-4 py-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(t.type)}`}>
                              {getTypeLabel(t.type)}
                            </span>
                          </td>
                          <td className="border border-gray-100 px-4 py-2 text-gray-900">{t.description || '-'}</td>
                          <td className="border border-gray-100 px-4 py-2 font-medium text-gray-900" dir="ltr">
                            {(t.type === 'deduction' || t.type === 'payment') ? '-' : '+'}{t.amount.toFixed(2)} د.أ
                          </td>
                          {canDeleteTransaction && (
                            <td className="border border-gray-100 px-4 py-2 text-center">
                              <button
                                onClick={() => confirmDelete(t.id)}
                                className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 font-bold">
                        <td colSpan={3} className="border border-gray-100 px-4 py-3 text-left text-gray-900">الرصيد الصافي:</td>
                        <td className="border border-gray-100 px-4 py-3 text-gray-900" dir="ltr">
                          {calculateNetBalance(selectedWorker.id).toFixed(2)} د.أ
                        </td>
                        {canDeleteTransaction && (
                          <td className="border border-gray-100 px-4 py-3"></td>
                        )}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      {isAddModalOpen && selectedWorker && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-orange-50/10">
              <h2 className="text-xl font-bold text-gray-900">إضافة حركة لـ {selectedWorker.name}</h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddTransaction} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">نوع الحركة</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'bonus', label: 'علاوة', activeClass: 'bg-[#dcfce7] text-[#166534] border-[#166534]' },
                    { id: 'deduction', label: 'خصم', activeClass: 'bg-[#fee2e2] text-[#991b1b] border-[#991b1b]' },
                    { id: 'payment', label: 'دفعة', activeClass: 'bg-[#ffedd5] text-[#9a3412] border-[#9a3412]' }
                  ].map(type => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setNewTransaction({...newTransaction, type: type.id as any})}
                      className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all text-center cursor-pointer ${ newTransaction.type === type.id ? type.activeClass : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50' }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newTransaction.amount}
                  onChange={(e) => setNewTransaction({...newTransaction, amount: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ</label>
                <DatePicker
                  value={newTransaction.date}
                  onChange={(date) => setNewTransaction({...newTransaction, date})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">البيان (اختياري)</label>
                <input
                  type="text"
                  value={newTransaction.description}
                  onChange={(e) => setNewTransaction({...newTransaction, description: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-[#006838] text-white px-4 py-2.5 rounded-xl hover:bg-[#006838]/90 transition-all font-bold cursor-pointer"
                >
                  حفظ
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 bg-gray-100 text-gray-700 px-4 py-2.5 rounded-xl hover:bg-gray-200 transition-all font-bold cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="حذف حركة"
        message="هل أنت متأكد من حذف هذه الحركة؟ لا يمكن التراجع عن هذا الإجراء."
        confirmText="نعم، احذف الحركة"
        onConfirm={executeDelete}
        onCancel={() => setDeleteModal({ isOpen: false, id: null })}
      />
    </div>
  );
}
