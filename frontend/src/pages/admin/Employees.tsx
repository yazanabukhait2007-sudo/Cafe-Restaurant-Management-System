import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Search, Edit, X, Eye, UserPlus, EyeOff } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { toast } from 'sonner';
import { Worker, useWorkersStore } from '@/store/workers';

const ConfirmModal = ({ isOpen, title, message, confirmText, onConfirm, onCancel }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-border" dir="rtl">
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-muted-foreground mb-6 whitespace-pre-wrap">{message}</p>
        <div className="flex gap-3 justify-end text-sm">
          <button onClick={onCancel} className="px-4 py-2 text-foreground hover:bg-muted border border-border rounded-xl transition-colors font-medium tracking-tight">إلغاء</button>
          <button onClick={onConfirm} className="px-5 py-2 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl hover:bg-destructive hover:text-destructive-foreground transition-colors font-bold tracking-tight">{confirmText}</button>
        </div>
      </div>
    </div>
  );
};

const ValidationTooltip = ({ message }: { message: string }) => (
  <div className="absolute right-0 -top-10 bg-destructive text-destructive-foreground text-xs px-2 py-1.5 rounded shadow z-10 w-max font-medium tracking-tight">
    {message}
    <div className="absolute bottom-[-4px] right-4 w-2 h-2 bg-destructive transform rotate-45"></div>
  </div>
);

export default function EmployeesPage() {
  const { user } = useAuthStore();
  const { workers, addWorker, updateWorker, deleteWorker } = useWorkersStore();
  const [searchTerm, setSearchTerm] = useState("");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [viewOnly, setViewOnly] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Worker>>({
    name: "", phone: "", alt_phone: "", address: "", national_id: "", age: undefined, notes: "", last_workplace: "", current_job: "", salary: 0, has_social_security: 0, social_security_amount: 0
  });
  
  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, id: number | null, name: string}>({
    isOpen: false, id: null, name: ""
  });
  
  const [createAccountModal, setCreateAccountModal] = useState<{isOpen: boolean, workerId: number | null, workerName: string, isEdit: boolean, lastPasswordUpdate?: string}>({
    isOpen: false, workerId: null, workerName: "", isEdit: false, lastPasswordUpdate: undefined
  });
  
  const [accountForm, setAccountForm] = useState({ username: "", password: "", email: "" });
  const [showPassword, setShowPassword] = useState(false);

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createAccountModal.workerId || !accountForm.username || !accountForm.email) return;
    if (!createAccountModal.isEdit && !accountForm.password) return; 

    // Mock API success
    toast.success(createAccountModal.isEdit ? "تم تحديث حساب العامل بنجاح" : "تم إنشاء حساب للعامل بنجاح");
    setCreateAccountModal({ isOpen: false, workerId: null, workerName: "", isEdit: false });
    setAccountForm({ username: "", password: "", email: "" });
  };

  const openAccountModal = (workerId: number, workerName: string) => {
    // Mock - always open create mode for now
    setAccountForm({ username: workerName.split(' ')[0] + workerId, email: "", password: "" });
    setCreateAccountModal({ isOpen: true, workerId, workerName, isEdit: false, lastPasswordUpdate: undefined });
    setShowPassword(true);
  };

  const filteredWorkers = useMemo(() => {
    return workers.filter((w: Worker) => 
      w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (w.phone && w.phone.includes(searchTerm)) ||
      (w.current_job && w.current_job.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [workers, searchTerm]);

  const handleOpenModal = (worker?: Worker, isViewOnly: boolean = false) => {
    setViewOnly(isViewOnly);
    setShowErrors(false);
    if (worker) {
      setEditingWorker(worker);
      setFormData({ ...worker });
    } else {
      setEditingWorker(null);
      setFormData({
        name: "", phone: "", alt_phone: "", address: "", national_id: "", age: undefined, notes: "", last_workplace: "", current_job: "", salary: 0, has_social_security: 0, social_security_amount: 0
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingWorker(null);
    setViewOnly(false);
    setShowErrors(false);
  };

  const handleSaveWorker = (e: React.FormEvent) => {
    e.preventDefault();
    setShowErrors(true);
    
    if (!formData.name?.trim()) return;

    if (editingWorker) {
      updateWorker(editingWorker.id, formData);
      toast.success("تم تحديث بيانات العامل بنجاح");
    } else {
      addWorker(formData as Omit<Worker, 'id'>);
      toast.success("تم إضافة العامل بنجاح");
    }
    handleCloseModal();
  };

  const confirmDelete = (id: number, name: string) => {
    setDeleteModal({ isOpen: true, id, name });
  };

  const executeDelete = () => {
    if (!deleteModal.id) return;
    deleteWorker(deleteModal.id);
    toast.success("تم حذف العامل بنجاح");
    if (editingWorker?.id === deleteModal.id) {
      handleCloseModal();
    }
    setDeleteModal({ isOpen: false, id: null, name: "" });
  };

  const canAdd = user?.role === 'admin' || user?.role === 'manager';
  const canEdit = user?.role === 'admin' || user?.role === 'manager';
  const canDelete = user?.role === 'admin';
  const canViewDetails = user?.role === 'admin' || user?.role === 'manager';

  return (
    <div dir="rtl" className="animate-in fade-in transition-all">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-light tracking-tight">إدارة العمال (السيرة الذاتية)</h2>
          <p className="text-muted-foreground mt-1">تفاصيل وسجلات موظفي الشركة</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-amber-900/10 p-6 mb-8 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-96">
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-muted-foreground" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث باسم العامل، الهاتف، أو العمل الحالي..."
            className="w-full pr-10 pl-4 py-2 bg-orange-50/50 border border-orange-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none text-right placeholder:text-muted-foreground/70 transition-all font-medium"
          />
        </div>
        {canAdd && (
          <button
            onClick={() => handleOpenModal()}
            className="w-full sm:w-auto bg-primary text-primary-foreground px-6 py-2 rounded-xl hover:bg-primary/90 flex items-center justify-center gap-2 transition-all font-bold tracking-tight active:scale-[0.98]"
          >
            <Plus className="w-5 h-5" />
            إضافة عامل جديد
          </button>
        )}
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-amber-900/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right whitespace-nowrap">
            <thead className="bg-orange-50/50 border-b border-orange-200">
              <tr>
                <th className="px-6 py-4 text-sm font-bold text-foreground">الاسم</th>
                <th className="px-6 py-4 text-sm font-bold text-foreground">رقم الهاتف</th>
                <th className="px-6 py-4 text-sm font-bold text-foreground">العمل الحالي</th>
                <th className="px-6 py-4 text-sm font-bold text-foreground">الراتب</th>
                <th className="px-6 py-4 text-sm font-bold text-foreground">الضمان</th>
                {(canEdit || canDelete || canViewDetails) && (
                  <th className="px-6 py-4 text-sm font-bold text-foreground w-32 text-center">إجراءات</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-900/5">
              {filteredWorkers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground font-medium">لا يوجد عمال مطابقين للبحث</td>
                </tr>
              ) : (
                filteredWorkers.map((worker: Worker) => (
                  <tr key={worker.id} className="hover:bg-orange-50/30 transition-colors">
                    <td className="px-6 py-4 text-sm text-foreground font-medium">{worker.name}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground font-mono" dir="ltr">{worker.phone || '-'}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{worker.current_job || '-'}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground font-mono bg-orange-50/20">{worker.salary ? `${worker.salary} دينار` : '-'}</td>
                    <td className="px-6 py-4 text-sm">
                      {worker.has_social_security ? (
                        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 rounded-full text-xs font-bold tracking-tight">مشمول</span>
                      ) : (
                        <span className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-xs font-medium tracking-tight">غير مشمول</span>
                      )}
                    </td>
                    {(canEdit || canDelete || canViewDetails) && (
                      <td className="px-6 py-4 flex justify-center gap-2">
                        {canViewDetails && (
                          <button
                            onClick={() => handleOpenModal(worker, true)}
                            className="text-stone-500 hover:text-primary p-2 rounded-lg hover:bg-orange-200/50 transition-colors"
                            title="عرض التفاصيل"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                        )}
                        {canEdit && (
                          <button
                            onClick={() => handleOpenModal(worker)}
                            className="text-stone-500 hover:text-blue-600 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                            title="تعديل / عرض التفاصيل"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={handleCloseModal}
        >
          <div 
            className="bg-background rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col border border-border"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div className="flex justify-between items-center p-6 border-b border-border bg-orange-50/50">
              <h2 className="text-xl font-bold text-foreground">
                {viewOnly ? "تفاصيل العامل" : (editingWorker ? "تعديل بيانات العامل" : "إضافة عامل جديد")}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-muted-foreground hover:text-foreground p-2 rounded-full hover:bg-orange-200/50 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto no-scrollbar">
              <form id="worker-form" onSubmit={handleSaveWorker} className="grid grid-cols-1 md:grid-cols-2 gap-6" noValidate>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-1.5">الاسم الرباعي *</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={formData.name || ""}
                      disabled={viewOnly}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className={`w-full px-4 py-2.5 bg-orange-50/30 border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors ${ viewOnly ? 'opacity-70 cursor-not-allowed' : '' } ${ showErrors && !formData.name?.trim() ? "border-destructive focus:ring-destructive/50" : "border-orange-200" }`}
                    />
                    {showErrors && !formData.name?.trim() && (
                      <ValidationTooltip message="يجب إدخال الاسم الرباعي" />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">رقم الهاتف</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={formData.phone || ""}
                    disabled={viewOnly}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className={`w-full px-4 py-2.5 bg-orange-50/30 border border-orange-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none text-right font-mono ${viewOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">رقم هاتف بديل</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={formData.alt_phone || ""}
                    disabled={viewOnly}
                    onChange={(e) => setFormData({...formData, alt_phone: e.target.value})}
                    className={`w-full px-4 py-2.5 bg-orange-50/30 border border-orange-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none text-right font-mono ${viewOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-1.5">مكان السكن</label>
                  <input
                    type="text"
                    value={formData.address || ""}
                    disabled={viewOnly}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className={`w-full px-4 py-2.5 bg-orange-50/30 border border-orange-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none ${viewOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">الرقم الوطني</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={formData.national_id || ""}
                    disabled={viewOnly}
                    onChange={(e) => setFormData({...formData, national_id: e.target.value})}
                    className={`w-full px-4 py-2.5 bg-orange-50/30 border border-orange-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none text-right font-mono ${viewOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">العمر</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.age ?? ""}
                    disabled={viewOnly}
                    onChange={(e) => setFormData({...formData, age: parseInt(e.target.value) || undefined})}
                    className={`w-full px-4 py-2.5 bg-orange-50/30 border border-orange-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none font-mono text-right ${viewOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-1.5">آخر مكان عمل</label>
                  <input
                    type="text"
                    value={formData.last_workplace || ""}
                    disabled={viewOnly}
                    onChange={(e) => setFormData({...formData, last_workplace: e.target.value})}
                    className={`w-full px-4 py-2.5 bg-orange-50/30 border border-orange-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none ${viewOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">عمله الحالي</label>
                  <input
                    type="text"
                    value={formData.current_job || ""}
                    disabled={viewOnly}
                    onChange={(e) => setFormData({...formData, current_job: e.target.value})}
                    className={`w-full px-4 py-2.5 bg-orange-50/30 border border-orange-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none ${viewOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">الراتب (دينار)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.salary ?? ""}
                    disabled={viewOnly}
                    onChange={(e) => setFormData({...formData, salary: parseFloat(e.target.value) || 0})}
                    className={`w-full px-4 py-2.5 bg-orange-50/30 border border-orange-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none font-mono text-right ${viewOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
                  />
                </div>

                <div className="md:col-span-2 flex flex-col gap-4 p-5 bg-orange-50/50 rounded-2xl border border-orange-200/50">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="social_security"
                      checked={!!formData.has_social_security}
                      disabled={viewOnly}
                      onChange={(e) => setFormData({...formData, has_social_security: e.target.checked ? 1 : 0})}
                      className={`w-5 h-5 accent-primary border-orange-300 rounded cursor-pointer ${viewOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
                    />
                    <label htmlFor="social_security" className={`text-sm font-bold text-foreground ${viewOnly ? '' : 'cursor-pointer'}`}>
                      مشمول في الضمان الاجتماعي
                    </label>
                  </div>
                  
                  {!!formData.has_social_security && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300 pl-8 pt-2">
                      <label className="block text-sm font-medium text-foreground mb-2">قيمة اقتطاع الضمان الشهري (دينار)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.social_security_amount ?? ""}
                        disabled={viewOnly}
                        onChange={(e) => setFormData({...formData, social_security_amount: parseFloat(e.target.value) || 0})}
                        className={`w-full sm:w-64 px-4 py-2.5 bg-white border border-orange-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none font-mono text-right ${viewOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
                        placeholder="أدخل المبلغ..."
                      />
                      <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-primary/60 inline-block"></span>
                        سيتم خصم هذا المبلغ تلقائياً في بداية كل شهر.
                      </p>
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-1.5">ملاحظات</label>
                  <textarea
                    rows={3}
                    value={formData.notes || ""}
                    disabled={viewOnly}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className={`w-full px-4 py-2.5 bg-orange-50/30 border border-orange-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none resize-none ${viewOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
                    placeholder="أدخل أي ملاحظات إضافية عن العامل..."
                  />
                </div>

              </form>
            </div>
            
            <div className="p-6 border-t border-border bg-orange-50/50 flex justify-between items-center flex-wrap gap-4">
              <div className="flex gap-2">
                {editingWorker && canDelete && !viewOnly && (
                  <button
                    type="button"
                    onClick={() => confirmDelete(editingWorker.id, editingWorker.name)}
                    className="px-4 py-2.5 text-destructive bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground rounded-xl transition-colors flex items-center gap-2 font-bold tracking-tight"
                  >
                    <Trash2 className="w-4 h-4" />
                    حذف
                  </button>
                )}
                {editingWorker && canEdit && !viewOnly && (
                  <button
                    type="button"
                    onClick={() => openAccountModal(editingWorker.id, editingWorker.name)}
                    className="px-4 py-2.5 text-blue-600 bg-blue-500/10 hover:bg-blue-600 hover:text-white rounded-xl transition-colors flex items-center gap-2 font-bold tracking-tight"
                  >
                    <UserPlus className="w-4 h-4" />
                    حساب دخول
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-2.5 border border-border text-foreground bg-background rounded-xl hover:bg-muted transition-colors font-bold tracking-tight"
                >
                  {viewOnly ? "إغلاق" : "إلغاء"}
                </button>
                {!viewOnly && (
                  <button
                    type="submit"
                    form="worker-form"
                    className="px-8 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all font-bold shadow-md active:scale-[0.98] tracking-tight"
                  >
                    حفظ البيانات
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {createAccountModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setCreateAccountModal({ ...createAccountModal, isOpen: false })}>
          <div className="bg-background rounded-3xl shadow-2xl w-full max-w-md p-6 border border-border" onClick={e => e.stopPropagation()} dir="rtl">
            <h3 className="text-xl font-bold mb-4 text-foreground border-b border-border pb-3">
              {createAccountModal.isEdit ? "تعديل حساب العامل" : "إنشاء حساب دخول"}
            </h3>
            <p className="mb-6 text-muted-foreground text-sm leading-relaxed">
              {createAccountModal.isEdit 
                ? `تعديل بيانات الدخول للموظف "${createAccountModal.workerName}".`
                : `سيتم إنشاء حساب للموظف "${createAccountModal.workerName}" بصلاحية "عامل" فقط.`
              }
            </p>
            
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">اسم المستخدم</label>
                <input
                  type="text"
                  required
                  value={accountForm.username}
                  onChange={e => setAccountForm({...accountForm, username: e.target.value})}
                  className="w-full px-4 py-2.5 bg-orange-50/30 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">البريد الإلكتروني</label>
                <input
                  type="email"
                  required
                  value={accountForm.email}
                  onChange={e => setAccountForm({...accountForm, email: e.target.value})}
                  className="w-full px-4 py-2.5 bg-orange-50/30 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  كلمة المرور {createAccountModal.isEdit && <span className="text-xs text-muted-foreground font-normal opacity-70">(اتركها فارغة للإبقاء على الحالية)</span>}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required={!createAccountModal.isEdit}
                    value={accountForm.password}
                    onChange={e => setAccountForm({...accountForm, password: e.target.value})}
                    className="w-full px-4 py-2.5 bg-orange-50/30 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none"
                    placeholder={createAccountModal.isEdit ? "••••••••" : ""}
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 bg-transparent"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              
              <div className="flex gap-3 mt-8 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setCreateAccountModal({ ...createAccountModal, isOpen: false })}
                  className="flex-1 py-2.5 text-foreground border border-border hover:bg-muted rounded-xl transition-colors font-bold tracking-tight"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-bold tracking-tight shadow-md"
                >
                  {createAccountModal.isEdit ? "تحديث الحساب" : "إنشاء الحساب"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="حذف عامل"
        message={`⚠️ تحذير خطير ⚠️\n\nهل أنت متأكد من حذف العامل "${deleteModal.name}"؟\n\nسيؤدي هذا الإجراء إلى حذف العامل وجميع البيانات السابقة المرتبطة به نهائياً، ولن تتمكن من استرجاعها.`}
        confirmText="نعم، احذف"
        onConfirm={executeDelete}
        onCancel={() => setDeleteModal({ isOpen: false, id: null, name: "" })}
      />
    </div>
  );
}
