import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import apiClient from '@/api/client';
import { 
  ClipboardCheck, 
  Search, 
  Plus, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  ChevronRight, 
  FileText, 
  Activity, 
  TrendingDown, 
  TrendingUp, 
  AlertTriangle, 
  RefreshCw, 
  Calendar, 
  User, 
  Archive, 
  PieChart, 
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  lowStockLevel: number;
  cost: number;
  supplier?: string;
}

interface InventoryCountItem {
  id: string;
  sessionId: string;
  ingredientId: string;
  ingredient?: Ingredient;
  expectedStock: number;
  actualStock: number | null;
  difference: number | null;
  differenceValue: number | null;
  reason: string | null;
  notes: string | null;
}

interface InventoryCountSnapshot {
  id: string;
  sessionId: string;
  ingredientId: string;
  ingredientName: string;
  unit: string;
  expectedStock: number;
  actualStock: number;
  cost: number;
  valueDifference: number;
}

interface InventoryCountSession {
  id: string;
  name: string;
  countDate: string;
  status: 'Draft' | 'InProgress' | 'Completed' | 'Cancelled';
  userId: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  items?: InventoryCountItem[];
  snapshots?: InventoryCountSnapshot[];
  _count?: {
    items: number;
  };
}

interface AnalyticsReports {
  totalSessionsCompleted: number;
  totalItemsAudited: number;
  netValueDifference: number;
  totalValueDifference: number;
  topLossIngredients: Array<{
    name: string;
    unit: string;
    lossQty: number;
    lossVal: number;
    cost: number;
  }>;
  topGainIngredients: Array<{
    name: string;
    unit: string;
    gainQty: number;
    gainVal: number;
    cost: number;
  }>;
  reasonStats: Array<{
    reason: string;
    count: number;
    value: number;
  }>;
}

export default function InventoryAuditPage() {
  const isAr = document.documentElement.dir === 'rtl' || true;

  // Lists and Data
  const [sessions, setSessions] = useState<InventoryCountSession[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsReports | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  
  // Active state
  const [activeSession, setActiveSession] = useState<InventoryCountSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCommitModalOpen, setIsCommitModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  
  // Form variables for creating a new session
  const [newSessionName, setNewSessionName] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Filters and search inside components
  const [sessionSearch, setSessionSearch] = useState('');
  const [sessionStatusFilter, setSessionStatusFilter] = useState('ALL');
  const [itemSearch, setItemSearch] = useState('');
  
  // Local temporary edits during counting session
  // Maps item.id to its inputted actual stock value as string (to handle empty input cleanly)
  const [itemActualStocks, setItemActualStocks] = useState<Record<string, string>>({});
  const [itemReasons, setItemReasons] = useState<Record<string, string>>({});
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});

  // Active view: 'dashboard' | 'session' | 'report'
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'report'>('dashboard');

  const lossReasons = ["هدر", "تلف", "سرقة", "خطأ إدخال", "خطأ جرد", "أخرى"];

  const reasonIcons: Record<string, string> = {
    "هدر": "🗑️",
    "تلف": "💔",
    "سرقة": "🕵️",
    "خطأ إدخال": "⌨️",
    "خطأ جرد": "🔍",
    "أخرى": "💡"
  };

  // Load everything
  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [sessRes, analRes, ingRes] = await Promise.all([
        apiClient.get('/inventory-counts'),
        apiClient.get('/inventory-counts/analytics/reports'),
        apiClient.get('/inventory/ingredients')
      ]);
      setSessions(sessRes.data);
      setAnalytics(analRes.data);
      setIngredients(ingRes.data);
    } catch (error: any) {
      console.error(error);
      toast.error('فشل في تحميل بيانات الجرد الفعلي للمخازن');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Set default session title on component mount
  useEffect(() => {
    const today = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    setNewSessionName(`جرد مخفوضات دوري - ${today}`);
  }, [isCreateModalOpen]);

  // Handle start session
  const handleStartSession = async () => {
    if (!newSessionName.trim()) {
      toast.error('الرجاء إدخال اسم عملية الجرد الفعلي');
      return;
    }

    const unfinished = sessions.find(s => s.status === 'Draft' || s.status === 'InProgress');
    if (unfinished) {
      toast.error(`عذراً، لا يمكن بدء جلسة جرد جديدة لوجود جلسة نشطة حالياً باسم "${unfinished.name}". يرجى استكمال الجلسة الحالية أو إلغاؤها أولاً.`);
      setIsCreateModalOpen(false);
      handleOpenSession(unfinished.id);
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiClient.post('/inventory-counts', {
        name: newSessionName,
        countDate: new Date().toISOString()
      });
      toast.success('تم فتح جلسة الجرد الفعلي بنجاح!');
      setIsCreateModalOpen(false);
      
      // Open the session directly
      await handleOpenSession(res.data.id);
      await fetchAllData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'فشل فتح جلسة جرد مخازن جديدة');
    } finally {
      setIsLoading(false);
    }
  };

  // Open an existing session for view or edit
  const handleOpenSession = async (sessionId: string) => {
    setIsLoading(true);
    try {
      const res = await apiClient.get(`/inventory-counts/${sessionId}`);
      const sessionData: InventoryCountSession = res.data;
      setActiveSession(sessionData);
      
      // Populate local input states
      const initialStocks: Record<string, string> = {};
      const initialReasons: Record<string, string> = {};
      const initialNotes: Record<string, string> = {};

      sessionData.items?.forEach((item) => {
        initialStocks[item.id] = item.actualStock !== null ? String(item.actualStock) : '';
        initialReasons[item.id] = item.reason || 'أخرى';
        initialNotes[item.id] = item.notes || '';
      });

      setItemActualStocks(initialStocks);
      setItemReasons(initialReasons);
      setItemNotes(initialNotes);
      
    } catch (error: any) {
      toast.error('عذراً، فشل في تحميل تفاصيل جلسة الجرد');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle value inputs for ingredients in real-time
  const handleActualStockChange = (itemId: string, value: string) => {
    // Normalise Arabic/Persian digits to English ASCII digits (0-9 has ASCII offset 48)
    let normalized = value
      .replace(/[٠-٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1632 + 48))
      .replace(/[۰-۹]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1776 + 48));

    // Prevent negative inputs
    if (normalized.startsWith('-')) {
      toast.error('لا يمكن إدخال كميات جرد سالبة');
      return;
    }
    
    // Sanitize to only allow numbers and at most one decimal point
    const parts = normalized.split('.');
    if (parts.length > 2) {
      normalized = parts[0] + '.' + parts.slice(1).join('');
    }
    const sanitized = normalized.replace(/[^0-9.]/g, '');
    
    setItemActualStocks(prev => ({
      ...prev,
      [itemId]: sanitized
    }));
  };

  const handleReasonChange = (itemId: string, value: string) => {
    setItemReasons(prev => ({
      ...prev,
      [itemId]: value
    }));
  };

  const handleNotesChange = (itemId: string, value: string) => {
    setItemNotes(prev => ({
      ...prev,
      [itemId]: value
    }));
  };

  // Save current progress as Draft / InProgress
  const handleSaveProgress = async (silent = false) => {
    if (!activeSession) return;
    
    // Prepare items list
    const itemsPatch = Object.keys(itemActualStocks).map((itemId) => {
      const parsedVal = parseFloat(itemActualStocks[itemId]);
      return {
        itemId,
        actualStock: isNaN(parsedVal) ? null : parsedVal,
        reason: itemReasons[itemId] || 'أخرى',
        notes: itemNotes[itemId] || ''
      };
    });

    try {
      await apiClient.put(`/inventory-counts/${activeSession.id}`, {
        status: 'InProgress',
        items: itemsPatch
      });
      if (!silent) {
        toast.success('تم حفظ مسودة الجرد بنجاح!');
      }
      // Refresh session
      const sessRes = await apiClient.get(`/inventory-counts/${activeSession.id}`);
      setActiveSession(sessRes.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'فشل حفظ المسودة');
    }
  };

  // Final Approval Commit of the Audit Session
  const handleCommitAudit = async () => {
    if (!activeSession) return;
    setIsLoading(true);
    try {
      // First save current inputs
      const itemsPatch = Object.keys(itemActualStocks).map((itemId) => {
        const parsedVal = parseFloat(itemActualStocks[itemId]);
        return {
          itemId,
          actualStock: isNaN(parsedVal) ? null : parsedVal,
          reason: itemReasons[itemId] || 'أخرى',
          notes: itemNotes[itemId] || ''
        };
      });

      // Update as InProgress
      await apiClient.put(`/inventory-counts/${activeSession.id}`, {
        status: 'InProgress',
        items: itemsPatch
      });

      // Send active commit
      const commitRes = await apiClient.post(`/inventory-counts/${activeSession.id}/commit`);
      toast.success(commitRes.data.message || 'تم اعتماد الجرد الفعلي ومطابقة المستودع بنجاح!');
      setIsCommitModalOpen(false);
      setActiveSession(null);
      await fetchAllData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'فشل في اعتماد عملية الجرد الفعلي تواصل مع مدير النظام');
    } finally {
      setIsLoading(false);
    }
  };

  // Cancel counting session (called via our new beautiful custom modal)
  const handleCancelSession = async () => {
    if (!activeSession) return;
    
    setIsLoading(true);
    try {
      await apiClient.post(`/inventory-counts/${activeSession.id}/cancel`);
      toast.success('تم إلغاء عملية الجرد بنجاح');
      setActiveSession(null);
      setIsCancelModalOpen(false);
      await fetchAllData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'فشل إلغاء الجلسة');
    } finally {
      setIsLoading(false);
    }
  };

  // Pause counting session (Save draft and exit for later)
  const handlePauseSession = async () => {
    if (!activeSession) return;
    setIsLoading(true);
    try {
      // First save current inputs
      const itemsPatch = Object.keys(itemActualStocks).map((itemId) => {
        const parsedVal = parseFloat(itemActualStocks[itemId]);
        return {
          itemId,
          actualStock: isNaN(parsedVal) ? null : parsedVal,
          reason: itemReasons[itemId] || 'أخرى',
          notes: itemNotes[itemId] || ''
        };
      });

      await apiClient.put(`/inventory-counts/${activeSession.id}`, {
        status: 'InProgress',
        items: itemsPatch
      });
      
      toast.success(isAr ? 'تم حفظ مسودة الجرد بنجاح ويمكنك استكمالها في أي وقت لاحق!' : 'Inventory draft saved successfully! You can resume it anytime later.');
      setActiveSession(null);
      setIsCancelModalOpen(false);
      await fetchAllData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'فشل حفظ المسودة وجدولتها لاحقاً');
    } finally {
      setIsLoading(false);
    }
  };

  // Live calculations for current session (Arabic values)
  const getSessionLiveTotals = () => {
    if (!activeSession || !activeSession.items) return { audited: 0, losses: 0, gains: 0, netVal: 0 };
    
    let audited = 0;
    let losses = 0;
    let gains = 0;
    let netVal = 0;

    activeSession.items.forEach((item) => {
      const actStr = itemActualStocks[item.id];
      if (actStr === undefined || actStr === '') return;
      
      const actual = parseFloat(actStr);
      if (isNaN(actual)) return;

      audited++;
      const cost = item.ingredient?.cost || 0;
      const difference = actual - item.expectedStock;
      const diffVal = difference * cost;

      netVal += diffVal;
      if (difference < 0) {
        losses += Math.abs(diffVal);
      } else if (difference > 0) {
        gains += diffVal;
      }
    });

    return {
      audited,
      losses: parseFloat(losses.toFixed(2)),
      gains: parseFloat(gains.toFixed(2)),
      netVal: parseFloat(netVal.toFixed(2))
    };
  };

  const liveTotals = getSessionLiveTotals();

  // Filter sessions
  const filteredSessions = sessions.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(sessionSearch.toLowerCase()) || 
                          (s.user?.name || '').toLowerCase().includes(sessionSearch.toLowerCase());
    const matchesStatus = sessionStatusFilter === 'ALL' || s.status === sessionStatusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filter items in active session
  const filteredSessionItems = activeSession?.items?.filter((item) => {
    return (item.ingredient?.name || '').toLowerCase().includes(itemSearch.toLowerCase());
  }) || [];

  return (
    <div className="space-y-6 dir-rtl" style={{ direction: 'rtl' }}>
      
      {/* Header section with Arabesque accents */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-orange-500/10 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-tr from-amber-600 to-amber-500 rounded-lg text-white shadow-md">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-950 font-sans">نظام الجرد الفعلي الإحترافي</h1>
          </div>
          <p className="text-sm text-stone-500 mt-1">تتبع الفروقات والمخزون الفعلي، تحليل التوالف، ومعالجة العجوزات بديناميكية تامة.</p>
        </div>

        <div className="flex items-center gap-2 self-start lg:self-center">
          <button 
            onClick={fetchAllData}
            className="flex items-center justify-center gap-2 px-3 py-2 border border-stone-200 hover:border-amber-500/30 text-stone-700 bg-white hover:bg-stone-50 rounded-lg font-medium text-sm transition"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-600' : ''}`} />
            تحديث البيانات
          </button>
          
          <button
            onClick={() => {
              setCurrentTab(currentTab === 'dashboard' ? 'report' : 'dashboard');
              setActiveSession(null);
            }}
            className="flex items-center gap-2 px-4 py-2 border border-amber-600/20 text-amber-850 hover:bg-amber-500/5 bg-white font-medium text-sm rounded-lg transition"
          >
            <PieChart className="w-4 h-4" />
            {currentTab === 'dashboard' ? 'التحليلات والمؤشرات الفنية' : 'العودة لجلسات الجرد'}
          </button>

          {!activeSession && (
            <button
              onClick={() => {
                const unfinished = sessions.find(s => s.status === 'Draft' || s.status === 'InProgress');
                if (unfinished) {
                  toast.error(`عذراً، لا يمكن بدء جلسة جرد جديدة لوجود جلسة نشطة حالياً باسم "${unfinished.name}". يرجى استكمال الجلسة الحالية أو إلغاؤها أولاً.`);
                  handleOpenSession(unfinished.id);
                  return;
                }
                setIsCreateModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-700 hover:to-orange-600 text-white rounded-lg shadow-sm font-semibold text-sm transition-all duration-300"
            >
              <Plus className="w-5 h-5" />
              بدء جلسة جرد جديدة
            </button>
          )}
        </div>
      </div>

      {isLoading && !activeSession && (
        <div className="flex flex-col items-center justify-center py-20 space-y-3 bg-stone-50/50 rounded-2xl border border-stone-200 border-dashed">
          <RefreshCw className="w-10 h-10 animate-spin text-amber-600" />
          <p className="text-stone-500 font-medium">جاري معالجة ومزامنة مخزون الكافيه الفعلي...</p>
        </div>
      )}

      {/* RENDER ACTIVE COUNT SESSION (DRAFT OR IN PROGRESS) */}
      {activeSession && (
        <div className="space-y-6">
          {/* Active Session Card Container */}
          <div className="bg-white border border-amber-900/10 rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-stone-900 to-stone-800 p-6 text-white flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-1">
                {activeSession.status === 'Completed' ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold animate-pulse">
                    ✓ جلسة جرد معتمدة ومقفلة (للقراءة فقط)
                  </span>
                ) : activeSession.status === 'Cancelled' ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold line-through">
                    ✗ جلسة جرد ملغية
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold">
                    ● جاري جرد المستودع الآن
                  </span>
                )}
                <h2 className="text-lg font-bold">{activeSession.name}</h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-300 mt-1">
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-stone-400" /> التاريخ: {new Date(activeSession.countDate).toLocaleDateString('ar-EG')}</span>
                  <span className="flex items-center gap-1"><User className="w-3.5 h-3.5 text-stone-400" /> المسؤول: {activeSession.user?.name || 'المدير'}</span>
                </div>
              </div>

              {/* Action headers for the session */}
              <div className="flex items-center gap-2 self-end md:self-center">
                {activeSession.status !== 'Completed' && activeSession.status !== 'Cancelled' ? (
                  <>
                    <button
                      onClick={() => setIsCancelModalOpen(true)}
                      className="px-4 py-2 bg-stone-700 hover:bg-stone-600 text-stone-200 border border-stone-600 hover:border-stone-500 font-medium text-sm rounded-lg transition"
                    >
                      إلغاء وجدولته لاحقاً
                    </button>
                    <button
                      onClick={() => handleSaveProgress(false)}
                      className="px-4 py-2 bg-stone-700 hover:bg-stone-600 text-amber-400 border border-amber-500/25 font-semibold text-sm rounded-lg transition"
                    >
                      حفظ كمسودة مؤقتة
                    </button>
                    <button
                      onClick={() => {
                        // Check if everything is filled
                        const empty = activeSession.items?.some(it => {
                          const val = itemActualStocks[it.id];
                          return val === undefined || val === '';
                        });
                        if (empty) {
                          toast.error('الرجاء إدخال الكميات الفعلية لجميع المواد قبل الانتقال لخطوة الإعتماد');
                        } else {
                          setIsCommitModalOpen(true);
                        }
                      }}
                      className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white font-bold text-sm rounded-lg shadow transition"
                    >
                      اعتماد ومطابقة المخازن ✔
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setActiveSession(null)}
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-sm rounded-lg shadow transition"
                  >
                    العودة للقائمة الرئيسية ↩
                  </button>
                )}
              </div>
            </div>

            {/* Live Audit Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-stone-100 bg-stone-50 border-b border-stone-200/50">
              <div className="p-4 flex flex-col justify-center items-center text-center">
                <span className="text-xs text-stone-500 font-semibold uppercase">مجموع المواد المجرودة</span>
                <span className="text-xl font-bold text-stone-900 mt-1">{liveTotals.audited} / {activeSession.items?.length || 0}</span>
              </div>
              <div className="p-4 flex flex-col justify-center items-center text-center">
                <span className="text-xs text-stone-500 font-semibold uppercase">توالف وعجوزات مرصودة (قيمة)</span>
                <span className="text-xl font-bold text-rose-600 mt-1">{liveTotals.losses} {isAr ? 'د.أ' : 'JOD'}</span>
              </div>
              <div className="p-4 flex flex-col justify-center items-center text-center">
                <span className="text-xs text-stone-500 font-semibold uppercase">زيادات مرصودة (قيمة)</span>
                <span className="text-xl font-bold text-emerald-600 mt-1">+{liveTotals.gains} {isAr ? 'د.أ' : 'JOD'}</span>
              </div>
              <div className="p-4 flex flex-col justify-center items-center text-center">
                <span className="text-xs text-stone-500 font-semibold uppercase">صافي فروقات التعديل</span>
                <span className={`text-xl font-extrabold mt-1 ${liveTotals.netVal < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {liveTotals.netVal > 0 ? `+${liveTotals.netVal}` : liveTotals.netVal} {isAr ? 'د.أ' : 'JOD'}
                </span>
              </div>
            </div>

            {/* Audit Table Search & Items list */}
            <div className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div className="relative w-full md:w-96">
                  <Search className="absolute right-3 top-2.5 w-4.5 h-4.5 text-stone-400" />
                  <input
                    type="text"
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    placeholder="البحث عن مادة بفهرس الكافيه..."
                    className="w-full pl-3 pr-10 py-2 border border-stone-200/80 rounded-lg text-sm bg-stone-55/40 text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
                <div className="text-xs text-amber-800 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>تلميح: يتم حساب الفروقات وقيمتها المالية بشكل فوري بمجرد إدخال الكمية الفعلية.</span>
                </div>
              </div>

              {/* Counts entry table */}
              <div className="overflow-x-auto border border-stone-200/60 rounded-xl">
                <table className="min-w-full divide-y divide-stone-200 text-right">
                  <thead className="bg-stone-50">
                    <tr>
                      <th className="px-4 py-3 text-sm font-bold text-stone-700">المادة</th>
                      <th className="px-4 py-3 text-sm font-bold text-stone-700 text-center">تكلفة الوحدة</th>
                      <th className="px-4 py-3 text-sm font-bold text-stone-700 text-center">الكمية المسجلة</th>
                      <th className="px-4 py-3 text-sm font-bold text-stone-700 text-center w-72">الكمية الفعلية وتبرير الفارق</th>
                      <th className="px-4 py-3 text-sm font-bold text-stone-700 text-center">الفرق</th>
                      <th className="px-4 py-3 text-sm font-bold text-stone-700 text-center">قيمة الفارق</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 bg-white">
                    {filteredSessionItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-stone-400">لا توجد مواد تطابق البحث الحرج</td>
                      </tr>
                    ) : (
                      filteredSessionItems.map((item) => {
                        const cost = item.ingredient?.cost || 0;
                        const currentInput = itemActualStocks[item.id] || '';
                        const actual = currentInput !== '' ? parseFloat(currentInput) : null;
                        
                        const hasDiff = actual !== null && !isNaN(actual);
                        const diff = hasDiff ? actual! - item.expectedStock : 0;
                        const diffVal = hasDiff ? diff * cost : 0;

                        return (
                          <tr key={item.id} className="hover:bg-amber-500/5 transition duration-150">
                            <td className="px-4 py-3.5 align-top">
                              <span className="font-semibold text-stone-900">{item.ingredient?.name}</span>
                              <span className="text-xs text-stone-400 block">{item.ingredient?.supplier || 'بدون مورد مخصص'}</span>
                            </td>
                            <td className="px-4 py-3.5 text-center text-sm font-mono text-stone-600 align-top">
                              {cost.toFixed(2)} {isAr ? 'د.أ' : 'JOD'} / {item.ingredient?.unit}
                            </td>
                            <td className="px-4 py-3.5 text-center font-bold text-stone-800 align-top">
                              {item.expectedStock} {item.ingredient?.unit}
                            </td>
                            <td className="px-4 py-3.5 align-top min-w-[240px]">
                              <div className="flex items-center gap-1 justify-center">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  placeholder={activeSession.status === 'Completed' || activeSession.status === 'Cancelled' ? "لم يسجل" : "أدخل المجموع"}
                                  value={currentInput}
                                  disabled={activeSession.status === 'Completed' || activeSession.status === 'Cancelled'}
                                  onChange={(e) => handleActualStockChange(item.id, e.target.value)}
                                  className="w-full text-center py-1.5 bg-stone-50 border border-stone-200 focus:bg-white focus:border-amber-500 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:outline-none text-sm font-bold disabled:bg-stone-100 disabled:text-stone-500 disabled:cursor-not-allowed"
                                />
                                <span className="text-xs text-stone-400 shrink-0">{item.ingredient?.unit}</span>
                              </div>

                              {hasDiff && (
                                <div className="mt-2.5 p-2 bg-stone-50 border border-stone-200 rounded-xl space-y-2 text-right animate-in slide-in-from-top-1 duration-200">
                                  <div>
                                    <label className="text-[10px] font-bold text-stone-500 block mb-1.5 text-right">السبب الأساسي للفارق المكتشف:</label>
                                    <div className="flex flex-wrap gap-1.5 justify-start" dir="rtl">
                                      {lossReasons.map((reason) => {
                                        const icon = reasonIcons[reason] || "📝";
                                        const isSelected = (itemReasons[item.id] || 'أخرى') === reason;
                                        return (
                                          <button
                                            key={reason}
                                            type="button"
                                            disabled={activeSession.status === 'Completed' || activeSession.status === 'Cancelled'}
                                            onClick={() => handleReasonChange(item.id, reason)}
                                            className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer select-none border focus:outline-none ${
                                              isSelected
                                                ? 'bg-amber-600 text-white border-amber-500 shadow-sm font-bold'
                                                : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50 hover:text-stone-800'
                                            }`}
                                          >
                                            <span className="text-xs">{icon}</span>
                                            <span>{reason}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                  <div>
                                    <input
                                      type="text"
                                      disabled={!hasDiff}
                                      placeholder="ملاحظات توضيحية..."
                                      value={itemNotes[item.id] || ''}
                                      onChange={(e) => handleNotesChange(item.id, e.target.value)}
                                      className="w-full px-2 py-1.5 bg-white border border-stone-200 rounded-lg text-xs text-stone-700 disabled:opacity-50 focus:outline-none focus:border-amber-500"
                                    />
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-center align-top">
                              {hasDiff ? (
                                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold font-mono ${diff < 0 ? 'bg-rose-50 text-rose-700' : diff > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>
                                  {diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-stone-300 text-xs">متبقي...</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-center align-top">
                              {hasDiff ? (
                                <span className={`font-mono text-sm font-bold ${diffVal < 0 ? 'text-rose-600' : diffVal > 0 ? 'text-emerald-600' : 'text-stone-500'}`}>
                                  {diffVal > 0 ? `+${diffVal.toFixed(2)}` : diffVal.toFixed(2)} {isAr ? 'د.أ' : 'JOD'}
                                </span>
                              ) : (
                                <span className="text-stone-300 text-xs">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Bottom save bar */}
              {activeSession.status !== 'Completed' && activeSession.status !== 'Cancelled' && (
                <div className="mt-6 flex justify-between items-center bg-stone-50/50 p-4 rounded-xl border border-stone-100">
                  <span className="text-sm font-bold text-stone-700">تذكر حفظ المسودة دورياً تحسباً لضعف الإتصال الفجائي</span>
                  <button
                    onClick={() => handleSaveProgress(false)}
                    className="px-6 py-2 bg-stone-900 text-amber-500 hover:text-amber-400 font-bold text-sm rounded-lg hover:shadow transition"
                  >
                    حفظ المسودة الحالية 🗄️
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* DASHBOARD TAB: SESSIONS ARCHIVE AND CREATE MODALS */}
      {currentTab === 'dashboard' && !activeSession && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main List Section */}
          <div className="lg:col-span-2 space-y-6">

            {/* Guidance banner for entry */}
            <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-2xl shadow-sm flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-bold text-stone-900 text-sm">💡 أين يتم تسجيل الكمية الفعلية المتواجدة بالمخازن؟</h4>
                <p className="text-xs text-stone-700 leading-relaxed">
                  لتسجيل وتعديل الكميات الحقيقية لرفوف وثلاجات الكافيه، يرجى النقر على زر <strong className="text-amber-800 font-extrabold">"مواصلة الجرد الفعلي ⚡"</strong> للملفات النشطة غير المعتمدة بالأسفل، أو تأسيس جرد جديد كلياً بالنقر على <strong className="text-amber-800 font-extrabold pb-0.5">"+ بدء جلسة جرد جديدة"</strong> بالأعلى.
                </p>
                <div className="text-[11px] text-amber-800 mt-1">
                  * ملاحظة: عمليات الجرد التي تحمل علامة <strong className="text-emerald-700">"تم اعتماده بنجاح"</strong> هي عمليات جاردة مسبقة معتمدة للقراءة والأرشفة فقط ولا يقبل النظام التعديل عليها لحماية محاسبة المستودعات.
                </div>
              </div>
            </div>
            
            {/* Filters Header Dashboard */}
            <div className="bg-white p-6 rounded-2xl border border-amber-900/10 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative w-full md:w-80">
                <Search className="absolute right-3 top-2.5 w-4.5 h-4.5 text-stone-400" />
                <input
                  type="text"
                  placeholder="بحث عن موظف أو اسم جلسة..."
                  value={sessionSearch}
                  onChange={(e) => setSessionSearch(e.target.value)}
                  className="w-full pl-3 pr-10 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div className="flex items-center gap-2 self-start md:self-center">
                <span className="text-xs font-bold text-stone-500 shrink-0">فرز حسب الحالة:</span>
                <select
                  value={sessionStatusFilter}
                  onChange={(e) => setSessionStatusFilter(e.target.value)}
                  className="p-2 bg-white border border-stone-200 rounded-lg text-xs font-medium text-stone-700 focus:outline-none"
                >
                  <option value="ALL">جميع الحالات</option>
                  <option value="Draft">مسودة (Draft)</option>
                  <option value="InProgress">قيد الجرد (In Progress)</option>
                  <option value="Completed">مكتمل ومعتمد (Completed)</option>
                  <option value="Cancelled">ملغي (Cancelled)</option>
                </select>
              </div>
            </div>

            {/* Sessions Grid */}
            <div className="space-y-4">
              {filteredSessions.length === 0 ? (
                <div className="bg-white border rounded-2xl p-12 text-center text-stone-400 flex flex-col items-center justify-center space-y-3">
                  <Archive className="w-12 h-12 text-stone-300" />
                  <p className="font-medium text-stone-500">لا توجد سجلات جرد تخدم معيار التصفية</p>
                  <button 
                    onClick={() => {
                      const unfinished = sessions.find(s => s.status === 'Draft' || s.status === 'InProgress');
                      if (unfinished) {
                        toast.error(`عذراً، لا يمكن بدء جلسة جرد جديدة لوجود جلسة نشطة حالياً باسم "${unfinished.name}". يرجى استكمال الجلسة الحالية أو إلغاؤها أولاً.`);
                        handleOpenSession(unfinished.id);
                        return;
                      }
                      setIsCreateModalOpen(true);
                    }}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-stone-900 font-bold rounded-lg text-xs cursor-pointer"
                  >
                    فتح جلسة عاجلة الآن
                  </button>
                </div>
              ) : (
                filteredSessions.map((session) => (
                  <div 
                    key={session.id}
                    className="bg-white border hover:border-amber-500/20 duration-300 rounded-2xl shadow-sm p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex px-2.5 py-1 text-xs font-extrabold rounded-full ${
                          session.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' :
                          session.status === 'Cancelled' ? 'bg-stone-100 text-stone-500 line-through' :
                          session.status === 'InProgress' ? 'bg-amber-50 text-amber-700 font-pulse' :
                          'bg-stone-100 text-stone-700'
                        }`}>
                          {session.status === 'Completed' ? 'تم اعتماده بنجاح' :
                           session.status === 'Cancelled' ? 'ملغية' :
                           session.status === 'InProgress' ? 'قيد الجرد' : 'مسودة مؤقتة'}
                        </span>
                        <h3 className="text-base font-bold text-stone-900">{session.name}</h3>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1 mt-2 text-xs text-stone-500">
                        <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {new Date(session.countDate).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> الموظف: {session.user?.name || 'المدير'}</span>
                        <span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> {session._count?.items || session.items?.length || 0} من المواد المفرزة</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                      {session.status === 'Completed' && (
                        <div className="flex items-center gap-1 text-xs text-stone-400 font-semibold pl-2">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                          تم ترحيل وتعديل المخازن
                        </div>
                      )}

                      <button
                        onClick={() => handleOpenSession(session.id)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                          session.status === "Completed"
                            ? "bg-stone-100 hover:bg-stone-200 text-stone-700"
                            : "bg-amber-500 hover:bg-amber-600 text-stone-900"
                        }`}
                      >
                        {session.status === "Completed" ? (
                          <>
                            <FileText className="w-3.5 h-3.5" />
                            استعراض تقرير النشر والنسخة
                          </>
                        ) : (
                          <>
                            <ClipboardCheck className="w-3.5 h-3.5" />
                            مواصلة الجرد الفعلي ⚡
                          </>
                        )}
                        <ChevronRight className="w-3.5 h-3.5 block rotate-180" />
                      </button>
                    </div>

                  </div>
                ))
              )}
            </div>
          </div>

          {/* Side Analytics Column */}
          <div className="space-y-6">
            
            {/* Quick Helper guidelines dashboard */}
            <div className="bg-gradient-to-r from-amber-600 to-orange-500 p-6 rounded-2xl shadow-md text-white space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-200" />
                <h4 className="font-bold text-base">نشرة جرد المخازن الفورية</h4>
              </div>
              <p className="text-xs leading-relaxed text-amber-100">
                يقوم النظام بمقارنة الكيلوجرامات، الألتار، والعلب الفعلية المتواجدة في أدراج ورفوف الكافيه مع مخزون الحوسبة الذي يسجله النظام تلقائياً من فواتير البيع والمشتريات.
              </p>
              <div className="border-t border-white/20 pt-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span>1. فتح الجلسة</span>
                  <span className="font-bold text-amber-200">الكمية المقدرة</span>
                </div>
                <div className="flex justify-between">
                  <span>2. تدوين الفعلي</span>
                  <span className="font-bold text-amber-200">صيغة الميزانية</span>
                </div>
                <div className="flex justify-between">
                  <span>3. الاعتماد النهائي</span>
                  <span className="font-bold text-amber-200">التعديل الذاتي الكلي</span>
                </div>
              </div>
            </div>

            {/* Micro charts representing top issue logs */}
            {analytics && (
              <div className="bg-white p-6 rounded-2xl border border-amber-900/10 shadow-sm space-y-5">
                <h4 className="font-bold text-stone-950 text-sm border-b border-stone-100 pb-3 flex items-center gap-1.5">
                  <TrendingDown className="w-4.5 h-4.5 text-rose-500" />
                  أهم العجوزات المكتشفة بالتقرير الدوري
                </h4>

                {analytics.topLossIngredients.length === 0 ? (
                  <p className="text-xs text-stone-400 text-center py-4">لم يتم رصد هدر أو نقص حتى الآن</p>
                ) : (
                  <div className="space-y-3">
                    {analytics.topLossIngredients.map((ing, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-stone-800">{ing.name}</span>
                          <span className="text-rose-600">{ing.lossVal.toFixed(1)} {isAr ? 'د.أ' : 'JOD'} - ({ing.lossQty} {ing.unit})</span>
                        </div>
                        <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-rose-500 h-full rounded-full" 
                            style={{ width: `${Math.min(100, (ing.lossVal / (analytics.totalValueDifference || 1)) * 100)}%` }} 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      )}

      {/* REPORT AND ANALYTICS TAB DESIGN VIEW */}
      {currentTab === 'report' && analytics && (
        <div className="space-y-6">
          
          {/* Key Metric cards on top */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-2xl border border-amber-900/10 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs text-stone-500 font-semibold block text-right">إجمالي الجلسات المعتمدة</span>
                <span className="text-2xl font-black text-stone-900 block mt-1">{analytics.totalSessionsCompleted} جلسه</span>
              </div>
              <div className="p-3 bg-amber-100 text-amber-700 rounded-xl">
                <ClipboardCheck className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-amber-900/10 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs text-stone-500 font-semibold block text-right">إجمالي المواد والسلع المجرودة</span>
                <span className="text-2xl font-black text-stone-900 block mt-1">{analytics.totalItemsAudited} عينة</span>
              </div>
              <div className="p-3 bg-blue-100 text-blue-700 rounded-xl">
                <Layers className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-amber-900/10 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs text-stone-500 font-semibold block text-right">صافي الفروق المخزنية بالعملة</span>
                <span className={`text-2xl font-black block mt-1 ${analytics.netValueDifference < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {analytics.netValueDifference > 0 ? `+${analytics.netValueDifference}` : analytics.netValueDifference} {isAr ? 'د.أ' : 'JOD'}
                </span>
              </div>
              <div className={`p-3 rounded-xl ${analytics.netValueDifference < 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {analytics.netValueDifference < 0 ? <TrendingDown className="w-6 h-6" /> : <TrendingUp className="w-6 h-6" />}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-amber-900/10 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs text-stone-500 font-semibold block text-right">مجموع حركات الفروق المطلقة</span>
                <span className="text-2xl font-black text-stone-950 block mt-1">{analytics.totalValueDifference} {isAr ? 'د.أ' : 'JOD'}</span>
              </div>
              <div className="p-3 bg-orange-100 text-orange-700 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Deeper visual comparison logs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left side: Loss causes & reasons mapping */}
            <div className="bg-white p-6 rounded-2xl border border-amber-900/10 shadow-sm space-y-6">
              <div>
                <h3 className="font-extrabold text-stone-950 text-base">Waste & Variance Analytics</h3>
                <p className="text-xs text-stone-500 mt-1">توزيع تبرير الفروقات وقيمتها بالدينار الأردني لمستندات الجرد المكتملة.</p>
              </div>

              <div className="space-y-4">
                {analytics.reasonStats.length === 0 ? (
                  <p className="text-sm text-stone-400 text-center py-6">لا توجد حركات لتبويب الفروقات</p>
                ) : (
                  analytics.reasonStats.map((stat, i) => (
                    <div key={i} className="flex items-center justify-between border-b border-stone-50 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-amber-500" />
                        <div>
                          <span className="text-sm font-bold text-stone-850 block">{stat.reason}</span>
                          <span className="text-xs text-stone-500 block">{stat.count} تكرار في الجرد</span>
                        </div>
                      </div>
                      <span className="font-mono text-sm font-bold text-amber-900">{stat.value.toFixed(2)} {isAr ? 'د.أ' : 'JOD'}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right side: Top Increments (Gain Items) */}
            <div className="bg-white p-6 rounded-2xl border border-amber-900/10 shadow-sm space-y-6">
              <div>
                <h3 className="font-extrabold text-stone-950 text-base flex items-center gap-1.5">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                  أهم الفوائض والزيادات المسجلة
                </h3>
                <p className="text-xs text-stone-500 mt-1">المواد والمكونات التي تم العثور عليها بكمية فعلية تفوق تخمين النظام التلقائي.</p>
              </div>

              <div className="space-y-4">
                {analytics.topGainIngredients.length === 0 ? (
                  <p className="text-sm text-stone-400 text-center py-6">لا توجد زيادات جرد معتمدة</p>
                ) : (
                  analytics.topGainIngredients.map((ing, i) => (
                    <div key={i} className="flex justify-between items-center bg-stone-50/50 p-3 rounded-lg border border-stone-100">
                      <div>
                        <span className="font-bold text-stone-850 block text-sm">{ing.name}</span>
                        <span className="text-xs text-stone-400 block">الفارق الإيجابي: +{ing.gainQty} {ing.unit}</span>
                      </div>
                      <span className="text-emerald-700 font-bold font-mono text-sm">+{ing.gainVal.toFixed(2)} {isAr ? 'د.أ' : 'JOD'}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Quick instructions back bar */}
          <div className="bg-amber-50 p-6 rounded-2xl border border-amber-500/10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h4 className="font-bold text-amber-900 text-sm">تعديل المخزون التلقائي من المبيعات ذكي لكن يحتاج للجرد الفعلي</h4>
              <p className="text-xs text-amber-700 mt-0.5">مقارنة الرف بالفهرس الرقمي تحمي الكافيه من التلف الهارب والسرقات والطلب المكرر العبثي.</p>
            </div>
            <button
              onClick={() => setCurrentTab('dashboard')}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition"
            >
              مراجعة أرشيف جلسات الجرد الفعلي
            </button>
          </div>

        </div>
      )}

      {/* START NEW SESSION DRAWER MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-sm p-4">
          <div className="bg-white border rounded-2xl max-w-md w-full shadow-2xl p-6 relative overflow-hidden">
            {/* Arabic modal visual wrapper */}
            <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-amber-600 to-orange-500" />
            
            <h3 className="text-lg font-bold text-stone-950 mt-2">فتح جلسة جرد مخزني جديدة</h3>
            <p className="text-xs text-stone-500 mt-1">سيقوم النظام بتثبيت وحفظ أرشيف فوري لكل كميات الأبواب والبرادات لتبدأ جردها الفعلي بالتطابق.</p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">عنوان عملية الجرد المرجعية</label>
                <input
                  type="text"
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  placeholder="مثال: جرد نهاية شهر مايو للمطبخ"
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50 text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-semibold"
                />
              </div>

              <div className="p-3 bg-stone-50 rounded-lg text-xs leading-relaxed text-stone-600">
                ⚠️ بمجرد الضغط على زر <strong className="text-amber-800">تأسيس وبدء الجلسة</strong>، سيتم توليد بنية جدول الجرد الفعلي فوراً، ويصبح بإمكان طواقم المطبخ إدخال الأرقام مباشرة من هواتفهم أو أجهزة الآيباد.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-stone-200 hover:bg-stone-50 text-stone-700 font-bold text-xs rounded-lg transition"
                >
                  إلغاء الأمر
                </button>
                <button
                  type="button"
                  onClick={handleStartSession}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-stone-950 font-extrabold text-xs rounded-lg shadow-sm transition"
                >
                  تأسيس وبدء الجلسة ⚡
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM AND COMMIT PROCESS MODAL */}
      {isCommitModalOpen && activeSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-sm p-4">
          <div className="bg-white border rounded-2xl max-w-lg w-full shadow-2xl p-6 relative">
            <div className="absolute top-0 right-0 left-0 h-1.5 bg-emerald-500" />
            
            <h3 className="text-lg font-bold text-stone-950 mt-2">إعتماد عملية الجرد ومطابقة المستودع 🚨</h3>
            <p className="text-xs text-stone-500 mt-1">يرجى قراءة التنبيهات والأثر التالي بدقة قبل تأكيد المطابقة النهائية.</p>

            <div className="mt-5 space-y-4">
              
              <div className="space-y-2 bg-rose-50/50 border border-rose-100 p-4 rounded-xl">
                <h5 className="text-xs font-black text-rose-800 uppercase flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  تحذير وأثر عمليات التعديل الترحيلية:
                </h5>
                <ul className="text-xs text-rose-700 list-disc inline-block pr-4 space-y-1">
                  <li>سيقوم النظام تلقائياً بتغيير كمية المخازن بالنظام لتصبح مطابقة تماماً لمجموع الجرد الفعلي.</li>
                  <li>سيتم رصد وتسجيل العجوزات كتوالف (Wastage) وزيادات كتعديلات (Adjustment).</li>
                  <li>سيتم أرشفة نسخة لقطة البيانات (Inventory Count Snapshot) لحفظ سلامة ومصداقية الجرد الدوري.</li>
                  <li><strong>هذا الأجراء غير قابل للتراجع أو التعديل لاحقاً.</strong></li>
                </ul>
              </div>

              {/* Total discrepancies metrics on commit dialog */}
              <div className="grid grid-cols-2 divide-x divide-x-reverse divide-stone-100 bg-stone-50 p-3 rounded-lg text-center text-xs">
                <div>
                  <span className="text-stone-500 block">إجمالي قيم الهدر المقدرة</span>
                  <span className="text-sm font-bold text-rose-700 block mt-0.5">{liveTotals.losses} {isAr ? 'د.أ' : 'JOD'}</span>
                </div>
                <div>
                  <span className="text-stone-500 block">إجمالي قيم الفائض والزيادات</span>
                  <span className="text-sm font-bold text-emerald-700 block mt-0.5">+{liveTotals.gains} {isAr ? 'د.أ' : 'JOD'}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCommitModalOpen(false)}
                  className="px-4 py-2 border border-stone-200 hover:bg-stone-50 text-stone-700 font-bold text-xs rounded-lg transition"
                >
                  العودة للمراجعة والتعديل
                </button>
                <button
                  type="button"
                  onClick={handleCommitAudit}
                  className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white font-black text-xs rounded-lg shadow-md transition"
                >
                  إعتماد وترحيل المخزون بالكامل ✔
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* PAUSE AND CANCEL SESSION MODAL */}
      {isCancelModalOpen && activeSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white border rounded-2xl max-w-md w-full shadow-2xl p-6 relative text-right" dir="rtl">
            <div className="absolute top-0 right-0 left-0 h-1.5 bg-amber-500" />
            
            <h3 className="text-lg font-bold text-stone-950 mt-2 flex items-center gap-2">
              <span className="text-xl">⏸️</span>
              <span>خيارات الجرد الدوري الحالي</span>
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              يرجى اختيار الإجراء المراد اتخاذه على مسار عملية الجرد الحالية:
            </p>

            <div className="mt-5 space-y-3">
              <button
                type="button"
                onClick={handlePauseSession}
                className="w-full p-4 bg-amber-50 hover:bg-amber-100/80 border border-amber-200 text-amber-900 rounded-xl transition text-right duration-300 cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl mt-1">⏸️</span>
                  <div>
                    <span className="font-bold text-sm block text-amber-950">
                      حفظ ومجدولة لاحقاً (خروج مؤقت للعودة لاحقاً)
                    </span>
                    <span className="text-xs text-amber-700/80 block mt-1 leading-relaxed text-right">
                      سيقوم النظام بحفظ كافة كميات الجرد المدخلة والمسودات الحالية حتى لا يضيع تعبك، لتستكملها متى شئت.
                    </span>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={handleCancelSession}
                className="w-full p-4 bg-rose-50 hover:bg-rose-100/80 border border-rose-200 text-rose-950 rounded-xl transition text-right duration-300 cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl mt-1">🗑️</span>
                  <div>
                    <span className="font-bold text-sm block text-rose-800">
                      إلغاء عملية الجرد الحالية وحذفها نهائياً
                    </span>
                    <span className="text-xs text-rose-700/80 block mt-1 leading-relaxed text-right">
                      سيلغي كافة الكميات ويحذف الجلسة الحالية من النظام بلا ترحيل ولا رجعة (سيتم شطب العمل الحالي بالكامل).
                    </span>
                  </div>
                </div>
              </button>

              <div className="flex justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="w-full sm:w-auto px-5 py-2.5 border border-stone-200 hover:bg-stone-50 rounded-xl transition text-xs font-bold text-stone-600 cursor-pointer text-center"
                >
                  إغلاق وتراجع (مواصلة الجرد الحالي)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
