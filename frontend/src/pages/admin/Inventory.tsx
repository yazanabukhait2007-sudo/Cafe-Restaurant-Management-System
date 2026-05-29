import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import apiClient from '@/api/client';
import { 
  Package, 
  ClipboardList, 
  RefreshCw, 
  AlertTriangle, 
  DollarSign, 
  Plus, 
  Edit2, 
  Trash2, 
  User, 
  Search, 
  CheckCircle, 
  Trash, 
  Activity, 
  SlidersHorizontal,
  ChevronDown
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

interface ProductIngredient {
  id: string;
  productId: string;
  productVariantId?: string;
  ingredientId: string;
  quantity: number;
  ingredient: Ingredient;
}

interface ProductVariant {
  id: string;
  name: string;
  price: number;
  recipeItems: ProductIngredient[];
}

interface ProductWithRecipe {
  id: string;
  name: string;
  price: number;
  category: { name: string };
  recipeItems: ProductIngredient[];
  variants: ProductVariant[];
}

interface InventoryTransaction {
  id: string;
  ingredientId?: string;
  ingredient?: Ingredient;
  type: string;
  quantity: number;
  beforeQty: number;
  afterQty: number;
  note?: string;
  userId?: string;
  user?: { name: string; email: string };
  createdAt: string;
}

export default function InventoryPage() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar' || document.documentElement.dir === 'rtl';
  const isRtl = isAr;

  const [activeTab, setActiveTab] = useState<'ingredients' | 'recipes' | 'transactions'>('ingredients');
  const [loading, setLoading] = useState(true);
  
  // Data State
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<ProductWithRecipe[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  
  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states & controllers
  const [isAddIngredientOpen, setIsAddIngredientOpen] = useState(false);
  const [isEditStockOpen, setIsEditStockOpen] = useState(false);
  const [isEditRecipeOpen, setIsEditRecipeOpen] = useState(false);
  const [isRecordWasteOpen, setIsRecordWasteOpen] = useState(false);

  // Selected entities for editing
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithRecipe | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);

  // Form Fields
  const [ingredientForm, setIngredientForm] = useState({
    name: '',
    unit: 'gram',
    currentStock: 0,
    lowStockLevel: 5,
    cost: 0,
    supplier: ''
  });

  const [stockForm, setStockForm] = useState({
    quantity: 0,
    type: 'Purchase', // Purchase (Restock), Adjustment
    note: ''
  });

  const [recipeForm, setRecipeForm] = useState<{ ingredientId: string; quantity: string }[]>([]);
  const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null);
  const [dropdownSearch, setDropdownSearch] = useState('');
  const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState(false);

  const [wasteForm, setWasteForm] = useState({
    ingredientId: '',
    qty: 0,
    note: ''
  });

  // Fetch all requirements
  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'ingredients') {
        const res = await apiClient.get('/inventory/ingredients');
        setIngredients(res.data);
      } else if (activeTab === 'recipes') {
        const [resRec, resIng] = await Promise.all([
          apiClient.get('/inventory/recipes'),
          apiClient.get('/inventory/ingredients')
        ]);
        setRecipes(resRec.data);
        setIngredients(resIng.data);
      } else if (activeTab === 'transactions') {
        const res = await apiClient.get('/inventory/transactions');
        setTransactions(res.data);
      }
    } catch (err: any) {
      toast.error(isAr ? 'فشل تحميل بيانات المخزون' : 'Failed to load inventory data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  // Handle Save Ingredient
  const handleSaveIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!ingredientForm.name || !ingredientForm.unit) {
        toast.warning(isAr ? 'يرجى ملء الحقول المطلوبة' : 'Please fill out all required fields');
        return;
      }

      if (selectedIngredient) {
        // Edit flow
        await apiClient.put(`/inventory/ingredients/${selectedIngredient.id}`, {
          ...ingredientForm,
          currentStock: undefined // Stock adjustments are handled separately under stockForm
        });
        toast.success(isAr ? 'تم تعديل المكون بنجاح' : 'Successfully updated ingredient');
      } else {
        // Create flow
        await apiClient.post('/inventory/ingredients', ingredientForm);
        toast.success(isAr ? 'تم إضافة المكون الجديد للمستودع بنجاح' : 'Successfully created ingredient');
      }

      setIsAddIngredientOpen(false);
      setSelectedIngredient(null);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || (isAr ? 'فشلت العملية' : 'Operation failed'));
    }
  };

  // Handle Stock Adjust/Restock
  const handleSaveStockAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIngredient) return;

    try {
      const q = parseFloat(String(stockForm.quantity));
      if (isNaN(q) || q === 0) {
        toast.warning(isAr ? 'يرجى إدخال كمية صحيحة' : 'Please specify a non-zero quantity');
        return;
      }

      const finalQty = stockForm.type === 'Wastage' ? -Math.abs(q) : q; // Deduct if waste

      await apiClient.post('/inventory/adjust', {
        ingredientId: selectedIngredient.id,
        quantity: finalQty,
        type: stockForm.type,
        note: stockForm.note || (stockForm.type === 'Purchase' ? 'Restocking' : 'Manual Adjustment')
      });

      toast.success(isAr ? 'تم تعديل كميات المخزن بنجاح' : 'Stock level updated successfully');
      setIsEditStockOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || (isAr ? 'فشلت العملية' : 'Operation failed'));
    }
  };

  // Handle Recording custom wastage
  const handleRecordWaste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wasteForm.ingredientId || wasteForm.qty <= 0) {
      toast.warning(isAr ? 'يرجى إدخال كافة التفاصيل' : 'Please fill all options');
      return;
    }

    try {
      await apiClient.post('/inventory/adjust', {
        ingredientId: wasteForm.ingredientId,
        quantity: -Math.abs(wasteForm.qty),
        type: 'Wastage',
        note: wasteForm.note || (isAr ? 'تالف هدر' : 'Wastage spill')
      });

      toast.success(isAr ? 'تم تسجيل بند الخسارة والهدر بنجاح' : 'Waste event recorded!');
      setIsRecordWasteOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || (isAr ? 'فشلت العملية' : 'Operation failed'));
    }
  };

  // Open Recipe Editor for Product & Optional Variant
  const handleOpenRecipeEditor = (product: ProductWithRecipe, variant?: ProductVariant) => {
    setSelectedProduct(product);
    setSelectedVariant(variant || null);

    // Initial fill from existing recipes
    const activeRecipes = variant ? variant.recipeItems : product.recipeItems;
    const initialConfig = activeRecipes.map(it => ({
      ingredientId: it.ingredientId,
      quantity: String(it.quantity)
    }));

    setRecipeForm(initialConfig.length > 0 ? initialConfig : [{ ingredientId: '', quantity: '' }]);
    setIsEditRecipeOpen(true);
  };

  // Save the recipe
  const handleSaveRecipe = async () => {
    if (!selectedProduct) return;

    try {
      // Filter out empty links and parse decimal quantity safely
      const cleanRecipe = recipeForm
        .filter(it => {
          const qty = parseFloat(it.quantity);
          return it.ingredientId && !isNaN(qty) && qty > 0;
        })
        .map(it => ({
          ingredientId: it.ingredientId,
          quantity: parseFloat(it.quantity)
        }));

      await apiClient.post('/inventory/recipes', {
        productId: selectedProduct.id,
        productVariantId: selectedVariant?.id || null,
        ingredients: cleanRecipe
      });

      toast.success(isAr ? 'تم حفظ مخطط تحضير صنف الكافيه بنجاح' : 'Recipe configuration saved!');
      setIsEditRecipeOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || (isAr ? 'فشلت العملية' : 'Operation failed'));
    }
  };

  // Remove Ingredient Handler
  const handleDeleteIngredient = async (id: string) => {
    if (!confirm(isAr ? 'هل أنت متأكد من رغبتك في حذف هذا المكون؟' : 'Are you sure you want to delete this ingredient?')) return;
    try {
      await apiClient.delete(`/inventory/ingredients/${id}`);
      toast.success(isAr ? 'تم حذف المكون' : 'Ingredient deleted');
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || (isAr ? 'فشل الحذف' : 'Failed to delete'));
    }
  };

  const filteredIngredients = ingredients.filter(i => 
    i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (i.supplier && i.supplier.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredRecipes = recipes.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <h2 className="text-3xl font-light tracking-tight text-foreground flex items-center gap-2">
            <Package className="h-8 w-8 text-amber-600" />
            <span>{isAr ? 'محرك المخزون' : 'Inventory Engine'}</span>
          </h2>
          <p className="text-muted-foreground mt-1">
            {isAr 
              ? 'مراقبة المكونات في الوقت الفعلي، وتكوين المقادير والوصفات، ومراجعة وتدقيق حركات المخزون.' 
              : 'Monitor ingredients real-time, configure recipes, and audit stock updates.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'ingredients' && (
            <button
              onClick={() => {
                setSelectedIngredient(null);
                setIngredientForm({
                  name: '',
                  unit: 'gram',
                  currentStock: 0,
                  lowStockLevel: 5,
                  cost: 0,
                  supplier: ''
                });
                setIsUnitDropdownOpen(false);
                setIsAddIngredientOpen(true);
              }}
              className="bg-amber-700 hover:bg-amber-800 text-white rounded-xl px-4 py-2 text-sm font-medium flex items-center gap-2 transition shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>{isAr ? 'إضافة مكون جديد' : 'Add Ingredient'}</span>
            </button>
          )}

          <button
            onClick={() => {
              setWasteForm({ ingredientId: '', qty: 0, note: '' });
              setIsRecordWasteOpen(true);
            }}
            className="border border-destructive/20 hover:bg-destructive/5 text-destructive rounded-xl px-4 py-2 text-sm font-medium flex items-center gap-2 transition"
          >
            <Trash className="h-4 w-4" />
            <span>{isAr ? 'تسجيل هدر' : 'File Wastage'}</span>
          </button>
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="flex border-b border-border/40 gap-1 pb-1">
        <button
          onClick={() => { setActiveTab('ingredients'); setSearchQuery(''); }}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition relative ${
            activeTab === 'ingredients' 
              ? 'border-amber-600 text-amber-700 font-semibold' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {isAr ? 'المخزن والمستودع' : 'Ingredients Stock'}
        </button>

        <button
          onClick={() => { setActiveTab('recipes'); setSearchQuery(''); }}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition relative ${
            activeTab === 'recipes' 
              ? 'border-amber-600 text-amber-700 font-semibold' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {isAr ? 'وصفات التحضير' : 'Recipes Setup'}
        </button>

        <button
          onClick={() => { setActiveTab('transactions'); setSearchQuery(''); }}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition relative ${
            activeTab === 'transactions' 
              ? 'border-amber-600 text-amber-700 font-semibold' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {isAr ? 'كشف الحركات' : 'Audit Trail Logs'}
        </button>
      </div>

      {/* Search Input Bar */}
      {activeTab !== 'transactions' && (
        <div className="relative">
          <Search className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4`} />
          <input
            type="text"
            placeholder={activeTab === 'ingredients' ? (isAr ? 'البحث عن المكونات، المورد...' : 'Search ingredients, supplier...') : (isAr ? 'البحث عن المنتجات أو الفئات...' : 'Search products or categories...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full bg-card ring-1 ring-border/50 focus:ring-amber-500/50 rounded-xl ${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2 text-sm text-foreground outline-none transition`}
          />
        </div>
      )}

      {/* MAIN CONTAINER */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card rounded-2xl border border-border/40">
          <RefreshCw className="h-10 w-10 text-amber-600 animate-spin mb-4" />
          <p className="text-muted-foreground text-sm">{isAr ? 'جاري جلب أرصدة المخازن...' : 'Fetching real-time stock balances...'}</p>
        </div>
      ) : (
        <>
          {/* TAB 1: INGREDIENTS LIST */}
          {activeTab === 'ingredients' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredIngredients.length === 0 ? (
                <div className="col-span-full py-16 text-center bg-card rounded-2xl border border-border/40">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-60" />
                  <p className="text-muted-foreground">{isAr ? 'لم يتم العثور على مكونات. أضف مكوناً للبدء!' : 'No ingredients found. Add a component to get started!'}</p>
                </div>
              ) : (
                filteredIngredients.map((ing) => {
                  const isLowStock = ing.currentStock <= ing.lowStockLevel;
                  const isOut = ing.currentStock <= 0;

                  return (
                    <Card key={ing.id} className={`bg-card transition hover:shadow-md border border-border/40-hover overflow-hidden relative ${
                      isOut ? 'ring-1 ring-red-500/20 border-red-500/30' : isLowStock ? 'ring-1 ring-amber-500/20 border-amber-500/30' : ''
                    }`}>
                      <div className="p-5 flex flex-col justify-between h-full space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-lg text-foreground">{ing.name}</h3>
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md inline-block mt-1">
                              {isAr ? (ing.unit === 'gram' ? 'جرام' : ing.unit === 'kilogram' ? 'كيلوجرام' : ing.unit === 'ml' ? 'مل البار' : ing.unit === 'liter' ? 'لتر' : ing.unit === 'piece' ? 'حبة' : ing.unit) : ing.unit}
                            </span>
                          </div>
                          
                          {/* Alert Badge */}
                          {isOut ? (
                            <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-bold px-2 py-1 rounded-lg">
                              {isAr ? 'نفد بالكامل' : 'Out of Stock'}
                            </span>
                          ) : isLowStock ? (
                            <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-bold px-2 py-1 rounded-lg">
                              {isAr ? 'مخزون منخفض' : 'Low Stock'}
                            </span>
                          ) : (
                            <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-bold px-2 py-1 rounded-lg">
                              {isAr ? 'متوفر' : 'Healthy'}
                            </span>
                          )}
                        </div>

                        {/* Inventory Stats */}
                        <div className="grid grid-cols-2 gap-2 text-sm bg-muted/30 p-3 rounded-xl">
                          <div>
                            <span className="text-xs text-muted-foreground block">{isAr ? 'الرصيد المتوفر' : 'On Hand stock'}</span>
                            <span className={`font-bold text-base ${isOut ? 'text-red-600' : isLowStock ? 'text-amber-600' : 'text-foreground'}`}>
                              {ing.currentStock.toFixed(1)} {isAr ? (ing.unit === 'gram' ? 'جرام' : ing.unit === 'kilogram' ? 'كيلوجرام' : ing.unit === 'ml' ? 'مل' : ing.unit === 'liter' ? 'لتر' : ing.unit === 'piece' ? 'حبة' : ing.unit) : ing.unit}
                            </span>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground block">{isAr ? 'حد الأمان' : 'Safety Margin'}</span>
                            <span className="font-medium text-foreground">
                              {ing.lowStockLevel.toFixed(1)} {isAr ? (ing.unit === 'gram' ? 'جرام' : ing.unit === 'kilogram' ? 'كيلوجرام' : ing.unit === 'ml' ? 'مل' : ing.unit === 'liter' ? 'لتر' : ing.unit === 'piece' ? 'حبة' : ing.unit) : ing.unit}
                            </span>
                          </div>
                          <div className="border-t border-border/20 pt-2 col-span-2 grid grid-cols-2">
                            <div>
                               <span className="text-xs text-muted-foreground block">{isAr ? 'تكلفة الوحدة' : 'Unit Cost'}</span>
                              <span className="font-semibold text-foreground flex items-center text-xs">
                                <DollarSign className="h-3 w-3 text-muted-foreground inline" />
                                <span>{ing.cost.toFixed(2)}</span>
                              </span>
                            </div>
                            <div>
                              <span className="text-xs text-muted-foreground block">{isAr ? 'الشركة الموردة' : 'Supplier'}</span>
                              <span className="font-medium text-foreground text-xs truncate max-w-[100px] block" title={ing.supplier || "—"}>
                                {ing.supplier || "—"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2 pt-2 border-t border-border/20">
                          <button
                            onClick={() => {
                              setSelectedIngredient(ing);
                              setStockForm({ quantity: 0, type: 'Purchase', note: '' });
                              setIsEditStockOpen(true);
                            }}
                            className="bg-amber-600/10 text-amber-700 hover:bg-amber-600 hover:text-white transition rounded-xl px-3 py-1.5 text-xs font-semibold flex-1"
                          >
                            {isAr ? 'جرد وتعديل الكميات' : 'Stock Adjustment'}
                          </button>

                          <button
                            onClick={() => {
                              setSelectedIngredient(ing);
                              setIngredientForm({
                                name: ing.name,
                                unit: ing.unit,
                                currentStock: ing.currentStock,
                                lowStockLevel: ing.lowStockLevel,
                                cost: ing.cost,
                                supplier: ing.supplier || ''
                              });
                              setIsUnitDropdownOpen(false);
                              setIsAddIngredientOpen(true);
                            }}
                            className="text-muted-foreground hover:bg-muted p-1.5 rounded-xl transition"
                            title={isAr ? 'تعديل الإعدادات' : 'Edit configs'}
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteIngredient(ing.id)}
                            className="text-destructive hover:bg-destructive/10 p-1.5 rounded-xl transition"
                            title={isAr ? 'حذف' : 'Delete'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: RECIPES SETUP */}
          {activeTab === 'recipes' && (
            <div className="space-y-4">
              {filteredRecipes.length === 0 ? (
                <div className="py-16 text-center bg-card rounded-2xl border border-border/40">
                  <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-60" />
                  <p className="text-muted-foreground">{isAr ? 'لم يتم العثور على منتجات تطابق معايير البحث.' : 'No products found matching the search criteria.'}</p>
                </div>
              ) : (
                filteredRecipes.map((product) => (
                  <Card key={product.id} className="bg-card border-border/40 overflow-hidden">
                    {/* Header product info */}
                    <div className="p-5 flex flex-col md:flex-row justify-between md:items-center gap-4 bg-muted/10 border-b border-border/20">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold uppercase tracking-wider bg-amber-100 dark:bg-amber-950/40 text-amber-750 dark:text-amber-400 px-2 py-0.5 rounded-md">
                            {product.category.name}
                          </span>
                        </div>
                        <h3 className="text-xl font-bold mt-1 text-foreground">{product.name}</h3>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right rtl:text-left">
                          <span className="text-xs text-muted-foreground block">{isAr ? 'السعر الأساسي' : 'Base Price'}</span>
                          <span className="font-bold text-lg text-foreground">${product.price.toFixed(2)}</span>
                        </div>
                        
                        {product.variants.length === 0 && (
                          <button
                            onClick={() => handleOpenRecipeEditor(product)}
                            className="bg-amber-700/10 hover:bg-amber-700 text-amber-750 hover:text-white rounded-xl px-4 py-2 font-semibold text-sm transition"
                          >
                            {product.recipeItems.length > 0 
                              ? (isAr ? 'تعديل مخطط الوصفة' : 'Edit Recipe') 
                              : (isAr ? 'إنشاء مخطط الوصفة' : 'Create Recipe')}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Content: Ingredients list / variants list */}
                    <CardContent className="p-5">
                      {product.variants.length > 0 ? (
                        <div className="space-y-4">
                          <span className="text-xs font-semibold text-muted-foreground block border-b border-border/20 pb-1">
                            {isAr ? 'أحجام وخيارات الصنف (المتغيرات)' : 'Variants'}
                          </span>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {product.variants.map((v) => (
                              <div key={v.id} className="border border-border/30 rounded-xl p-4 flex flex-col justify-between space-y-3 bg-muted/5">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <span className="font-semibold text-foreground">{v.name}</span>
                                    <span className="text-xs text-muted-foreground block">${v.price.toFixed(2)}</span>
                                  </div>
                                  <button
                                    onClick={() => handleOpenRecipeEditor(product, v)}
                                    className="bg-amber-700/5 hover:bg-amber-700 text-amber-700 hover:text-white text-xs font-bold px-3 py-1.5 rounded-lg transition"
                                  >
                                    {v.recipeItems.length > 0 
                                      ? (isAr ? 'تعديل الوصفة' : 'Edit Recipe') 
                                      : (isAr ? 'إجراء الإعداد' : 'Create Recipe')}
                                  </button>
                                </div>

                                {/* Active recipe status for variant */}
                                {v.recipeItems.length > 0 ? (
                                  <div className="flex flex-wrap gap-1.5 text-xs pt-2">
                                    {v.recipeItems.map((r) => (
                                      <span key={r.id} className="bg-muted px-2 py-1 rounded-md text-muted-foreground flex items-center gap-1 border border-border/20" title={r.ingredient.name}>
                                        <span className="font-medium text-foreground">{r.ingredient.name}:</span>
                                        <span className="font-semibold text-amber-700">
                                          {r.quantity} {isAr ? (r.ingredient.unit === 'gram' ? 'جرام' : r.ingredient.unit === 'kilogram' ? 'كيلوجرام' : r.ingredient.unit === 'ml' ? 'مل' : r.ingredient.unit === 'liter' ? 'لتر' : r.ingredient.unit === 'piece' ? 'حبة' : r.ingredient.unit) : r.ingredient.unit}
                                        </span>
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground italic">{isAr ? 'لم يتم ضبط وصفة مخصصة لهذا الحجم.' : 'No custom recipe configured.'}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {product.recipeItems.length > 0 ? (
                            <div>
                              <span className="text-xs font-semibold text-muted-foreground block mb-2">{isAr ? 'المكونات والمقادير الداخلة في التحضير' : 'Constituent Ingredients'}</span>
                              <div className="flex flex-wrap gap-2 text-sm">
                                {product.recipeItems.map((r) => (
                                  <span key={r.id} className="bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 px-3 py-1.5 rounded-xl flex items-center gap-1 font-medium border border-amber-200/40">
                                    <span className="text-muted-foreground">{r.ingredient.name}:</span>
                                    <span className="font-bold">
                                      {r.quantity} {isAr ? (r.ingredient.unit === 'gram' ? 'جرام' : r.ingredient.unit === 'kilogram' ? 'كيلوجرام' : r.ingredient.unit === 'ml' ? 'مل' : r.ingredient.unit === 'liter' ? 'لتر' : r.ingredient.unit === 'piece' ? 'حبة' : r.ingredient.unit) : r.ingredient.unit}
                                    </span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="py-4 text-center border-2 border-dashed border-border/40 rounded-xl">
                              <span className="text-sm text-muted-foreground italic">{isAr ? 'لا يوجد وصفة تحضير مضافة لهذا الصنف. سيتم بيعه مباشرة بدون خصم من مستودع المواد الغذائية.' : 'No recipe mapped. This item can be sold instantly with zero depletion.'}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* TAB 3: TRANSACTION LOGS */}
          {activeTab === 'transactions' && (
            <Card className="bg-card border-border/40 overflow-hidden">
              <div className="p-5 flex justify-between items-center border-b border-border/20 bg-muted/10">
                <CardTitle className="text-lg flex items-center gap-2 font-bold">
                  <Activity className="h-5 w-5 text-amber-600 animate-pulse" />
                  <span>{isAr ? 'سجل الحركات التفصيلي لحركات المستودع' : 'Inventory Audit History'}</span>
                </CardTitle>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left rtl:text-right border-collapse">
                  <thead className="bg-muted/30 text-muted-foreground text-xs uppercase border-b border-border/20">
                    <tr>
                      <th className="p-4">{t('Timestamp')}</th>
                      <th className="p-4">{isAr ? 'المكون' : 'Ingredient'}</th>
                      <th className="p-4">{t('Type')}</th>
                      <th className="p-4">{t('Stock Delta')}</th>
                      <th className="p-4">{t('Snapshot')}</th>
                      <th className="p-4">{t('Actor')}</th>
                      <th className="p-4">{t('Notes')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-10 text-center text-muted-foreground">
                          {isAr ? 'لا يوجد حركات مسجلة بالمخزن لغاية الآن.' : 'No inventory movements logged yet.'}
                        </td>
                      </tr>
                    ) : (
                      transactions.map((tx) => {
                        const isPositive = tx.quantity > 0;
                        const dateStr = new Date(tx.createdAt).toLocaleString(i18n.language === 'ar' ? 'ar-JO' : 'en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        });

                        return (
                          <tr key={tx.id} className="hover:bg-muted/10 transition">
                            <td className="p-4 font-mono text-xs text-muted-foreground">
                              {dateStr}
                            </td>
                            <td className="p-4 font-semibold text-foreground">
                              {tx.ingredient?.name || (isAr ? 'مكون محذوف' : 'Deleted Ingredient')}
                            </td>
                            <td className="p-4">
                              <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                                tx.type === 'Consumption' 
                                  ? 'bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400' 
                                  : tx.type === 'Wastage' 
                                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                    : tx.type === 'Refund' 
                                      ? 'bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400'
                                      : 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                              }`}>
                                {tx.type === 'Consumption' 
                                  ? (isAr ? 'استهلاك مبيعات' : 'Sales depletion') 
                                  : tx.type === 'Refund' 
                                    ? (isAr ? 'مرتجع سلع' : 'Refund/Return') 
                                    : tx.type === 'Wastage' 
                                      ? (isAr ? 'تالف هدر' : 'Wastage') 
                                      : tx.type === 'Purchase' 
                                        ? (isAr ? 'توريد شراء' : 'Purchase') 
                                        : (isAr ? 'تعديل يدوي' : tx.type)}
                              </span>
                            </td>
                            <td className={`p-4 font-bold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                              {isPositive ? '+' : ''}{tx.quantity.toFixed(1)} {isAr ? (tx.ingredient?.unit === 'gram' ? 'جرام' : tx.ingredient?.unit === 'kilogram' ? 'كيلوجرام' : tx.ingredient?.unit === 'ml' ? 'مل' : tx.ingredient?.unit === 'liter' ? 'لتر' : tx.ingredient?.unit === 'piece' ? 'حبة' : tx.ingredient?.unit) : tx.ingredient?.unit}
                            </td>
                            <td className="p-4 font-mono text-xs">
                              {tx.beforeQty.toFixed(1)} &rarr; <span className="font-bold">{tx.afterQty.toFixed(1)}</span>
                            </td>
                            <td className="p-4 flex items-center gap-2 text-xs text-muted-foreground">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <span>{tx.user?.name || (isAr ? 'محرك النظام' : 'System Engine')}</span>
                            </td>
                            <td className="p-4 max-w-[200px] truncate text-xs text-muted-foreground" title={tx.note || ''}>
                              {tx.note || "—"}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* MODAL 1: ADD / EDIT INGREDIENT */}
      {isAddIngredientOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in transition-all">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl p-6 overflow-hidden max-h-[90vh] overflow-y-auto space-y-4">
            <h3 className="text-xl font-bold border-b border-border/20 pb-2">
              {selectedIngredient ? (isAr ? 'تعديل بيانات المادة والمكون' : 'Edit Ingredient Configs') : (isAr ? 'إضافة مكون للمخزن' : 'Add Ingredient')}
            </h3>

            <form onSubmit={handleSaveIngredient} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-muted-foreground block mb-1">{t('Ingredient Name')}</label>
                <input
                  type="text"
                  required
                  value={ingredientForm.name}
                  onChange={(e) => setIngredientForm({ ...ingredientForm, name: e.target.value })}
                  placeholder={isAr ? 'مثال: حليب كامل الدسم، بن الاسبريسو' : 'e.g. Milk, Espresso Beans'}
                  className="w-full bg-muted/40 text-foreground ring-1 ring-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-amber-500/50 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-muted-foreground block mb-1">{isAr ? 'وحدة القياس' : 'Measurement Unit'}</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsUnitDropdownOpen(!isUnitDropdownOpen)}
                      className="w-full flex items-center justify-between bg-muted/40 text-stone-800 dark:text-stone-100 ring-1 ring-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-amber-500/50 hover:bg-muted/10 transition text-right font-medium"
                    >
                      <span>
                        {ingredientForm.unit === 'gram' && (isAr ? 'جرام' : 'Gram')}
                        {ingredientForm.unit === 'kilogram' && (isAr ? 'كيلوجرام' : 'Kilogram')}
                        {ingredientForm.unit === 'ml' && (isAr ? 'مل' : 'ML')}
                        {ingredientForm.unit === 'liter' && (isAr ? 'لتر' : 'Liter')}
                        {ingredientForm.unit === 'piece' && (isAr ? 'حبة' : 'Piece')}
                      </span>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0 ${isUnitDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isUnitDropdownOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setIsUnitDropdownOpen(false)}
                        />
                        <div className="absolute left-0 right-0 mt-1.5 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1.5 duration-150 flex flex-col text-right">
                          {[
                            { value: 'gram', labelAr: 'جرام', labelEn: 'Gram' },
                            { value: 'kilogram', labelAr: 'كيلوجرام', labelEn: 'Kilogram' },
                            { value: 'ml', labelAr: 'مل', labelEn: 'ML' },
                            { value: 'liter', labelAr: 'لتر', labelEn: 'Liter' },
                            { value: 'piece', labelAr: 'حبة', labelEn: 'Piece' },
                          ].map((opt) => {
                            const isCurrent = ingredientForm.unit === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                  setIngredientForm({ ...ingredientForm, unit: opt.value });
                                  setIsUnitDropdownOpen(false);
                                }}
                                className={`w-full text-right px-4 py-2.5 text-xs transition-colors ${
                                  isCurrent 
                                    ? 'bg-amber-500/10 text-amber-800 dark:text-amber-300 font-semibold' 
                                    : 'hover:bg-muted/45 text-foreground'
                              }`}
                            >
                              {isAr ? opt.labelAr : opt.labelEn}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-muted-foreground block mb-1">{isAr ? 'حد التنبيه الرصيد الحرج' : 'Safety Alert Level'}</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={ingredientForm.lowStockLevel}
                    onChange={(e) => setIngredientForm({ ...ingredientForm, lowStockLevel: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-muted/40 text-foreground ring-1 ring-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-amber-500/50 transition"
                  />
                </div>
              </div>

              {!selectedIngredient && (
                <div>
                  <label className="text-sm font-semibold text-muted-foreground block mb-1">{isAr ? 'الرصيد الابتدائي المتوفر' : 'Initial Stock'}</label>
                  <input
                    type="number"
                    step="any"
                    value={ingredientForm.currentStock}
                    onChange={(e) => setIngredientForm({ ...ingredientForm, currentStock: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-muted/40 text-foreground ring-1 ring-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-amber-500/50 transition"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-muted-foreground block mb-1">{isAr ? 'كلفة الشراء للوحدة ($)' : 'Cost Per Unit ($)'}</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={ingredientForm.cost}
                    onChange={(e) => setIngredientForm({ ...ingredientForm, cost: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-muted/40 text-foreground ring-1 ring-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-amber-500/50 transition"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-muted-foreground block mb-1">{isAr ? 'المورد الأساسي' : 'Primary Supplier'}</label>
                  <input
                    type="text"
                    value={ingredientForm.supplier}
                    onChange={(e) => setIngredientForm({ ...ingredientForm, supplier: e.target.value })}
                    className="w-full bg-muted/40 text-foreground ring-1 ring-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-amber-500/50 transition"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-border/20 justify-end">
                <button
                  type="button"
                  onClick={() => setIsAddIngredientOpen(false)}
                  className="bg-muted hover:bg-muted/80 rounded-xl px-4 py-2.5 text-sm font-medium transition"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="bg-amber-700 hover:bg-amber-800 text-white rounded-xl px-5 py-2.5 text-sm font-medium transition"
                >
                  {isAr ? 'حفظ البيانات' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT STOCK / ADJUSTMENT / RESTOCK */}
      {isEditStockOpen && selectedIngredient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in transition-all">
          <div className="bg-card w-full max-w-sm rounded-2xl border border-border shadow-2xl p-6 overflow-hidden max-h-[90vh] overflow-y-auto space-y-4">
            <h3 className="text-xl font-bold border-b border-border/20 pb-2">
              {isAr ? 'تحديث وتوريد يدوي للمخزون' : 'Manual Restocking & Reorder'}
            </h3>

            <div className="bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-400 p-4 rounded-xl text-sm border border-amber-200/20">
              <span className="font-semibold block">{selectedIngredient.name}</span>
              <span className="text-xs text-muted-foreground">{isAr ? 'الرصيد الحالي في المخزن' : 'On hand current balance'}: {selectedIngredient.currentStock.toFixed(1)} {isAr ? (selectedIngredient.unit === 'gram' ? 'جرام' : selectedIngredient.unit === 'kilogram' ? 'كيلوجرام' : selectedIngredient.unit === 'ml' ? 'مل' : selectedIngredient.unit === 'liter' ? 'لتر' : selectedIngredient.unit === 'piece' ? 'حبة' : selectedIngredient.unit) : selectedIngredient.unit}</span>
            </div>

            <form onSubmit={handleSaveStockAdjust} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-muted-foreground block mb-1">{isAr ? 'صفة وطبيعة الحركة' : 'Transaction nature'}</label>
                <select
                  value={stockForm.type}
                  onChange={(e) => setStockForm({ ...stockForm, type: e.target.value })}
                  className="w-full bg-muted/40 text-foreground ring-1 ring-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-amber-500/50 transition"
                >
                  <option value="Purchase">{isAr ? 'شراء وتوريد' : 'Purchase restock'}</option>
                  <option value="Adjustment">{isAr ? 'تسوية جرد دوري' : 'Manual adjustment'}</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-muted-foreground block mb-1">
                  {stockForm.type === 'Purchase' 
                    ? (isAr ? 'كمية الشراء المضافة' : 'Added stock amount') 
                    : (isAr ? 'مقدار التعديل (سالب أو موجب)' : 'Adjustment quantity (+ or -)')}
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder={stockForm.type === 'Purchase' ? "e.g. 5.5" : "e.g. -2 or +2"}
                  value={stockForm.quantity === 0 ? '' : stockForm.quantity}
                  onChange={(e) => setStockForm({ ...stockForm, quantity: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-muted/40 text-foreground ring-1 ring-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-amber-500/50 transition font-mono"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-muted-foreground block mb-1">{t('Reason / Audit Notes')}</label>
                <textarea
                  placeholder={t('Inventory Reason Placeholder')}
                  value={stockForm.note}
                  onChange={(e) => setStockForm({ ...stockForm, note: e.target.value })}
                  className="w-full bg-muted/40 text-foreground ring-1 ring-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-amber-500/50 transition h-20 outline-none text-xs"
                />
              </div>

              <div className="flex gap-2 pt-4 border-t border-border/20 justify-end">
                <button
                  type="button"
                  onClick={() => setIsEditStockOpen(false)}
                  className="bg-muted hover:bg-muted/80 rounded-xl px-4 py-2.5 text-sm font-medium transition"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="bg-amber-700 hover:bg-amber-800 text-white rounded-xl px-5 py-2.5 text-sm font-medium transition"
                >
                  {isAr ? 'تطبيق وإيداع' : 'Apply'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: RECIPE EDITOR */}
      {isEditRecipeOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in transition-all">
          <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl p-6 overflow-hidden max-h-[90vh] overflow-y-auto space-y-4">
            <h3 className="text-xl font-bold border-b border-border/20 pb-2">
              {t('Recipe Builder')}
            </h3>

            <div className="text-sm font-medium text-foreground bg-muted/40 p-3 rounded-xl">
              <span>{selectedProduct.name}</span>
              {selectedVariant && <span className="text-amber-700 mx-2 font-bold">&raquo; {selectedVariant.name}</span>}
            </div>

            <div className="space-y-3">
              <span className="text-xs text-muted-foreground font-semibold block uppercase">
                {t('Required ingredients & ratios')}
              </span>

              {recipeForm.map((item, index) => {
                const selectedIng = ingredients.find(ing => ing.id === item.ingredientId);
                return (
                  <div key={index} className="flex flex-col gap-2 p-3 rounded-xl border border-border/60 bg-muted/20 hover:border-amber-500/20 transition-all duration-200">
                    <div className="flex gap-2 items-center w-full">
                      {/* Custom dropdown triggered from a button */}
                      <div className="relative flex-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (openDropdownIndex === index) {
                              setOpenDropdownIndex(null);
                            } else {
                              setOpenDropdownIndex(index);
                              setDropdownSearch('');
                            }
                          }}
                          className="w-full flex items-center justify-between bg-background text-stone-800 dark:text-stone-100 ring-1 ring-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-amber-500/50 hover:bg-muted/10 transition text-right font-medium"
                        >
                          <span className="truncate">
                            {selectedIng 
                              ? `${selectedIng.name} (${isAr ? (selectedIng.unit === 'gram' ? 'جرام' : selectedIng.unit === 'kilogram' ? 'كيلوجرام' : selectedIng.unit === 'ml' ? 'مل' : selectedIng.unit === 'liter' ? 'لتر' : selectedIng.unit === 'piece' ? 'حبة' : selectedIng.unit) : selectedIng.unit})`
                              : `-- ${t('Select ingredient')} --`}
                          </span>
                          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0 ${openDropdownIndex === index ? 'rotate-180' : ''}`} />
                        </button>

                        {openDropdownIndex === index && (
                          <>
                            {/* Backdrop/Overlay for closing the dropdown when clicking outside */}
                            <div 
                              className="fixed inset-0 z-40" 
                              onClick={() => setOpenDropdownIndex(null)}
                            />

                            {/* Dropdown Menu - absolutely positioned directly below the button */}
                            <div className="absolute left-0 right-0 mt-1.5 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1.5 duration-150 max-h-56 flex flex-col text-right">
                              {/* Search bar inside dropdown */}
                              <div className="p-2 border-b border-border/40 bg-muted/20 flex items-center gap-1.5 focus-within:ring-1 focus-within:ring-amber-500/50 rounded-t-xl">
                                <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <input
                                  type="text"
                                  autoFocus
                                  value={dropdownSearch}
                                  onChange={(e) => setDropdownSearch(e.target.value)}
                                  placeholder={isAr ? 'ابحث عن مكون...' : 'Search ingredient...'}
                                  className="w-full bg-transparent text-xs text-foreground outline-none border-none py-1 h-6 placeholder:text-muted-foreground/60 text-right"
                                />
                              </div>

                              {/* Ingredients list */}
                              <div className="overflow-y-auto divide-y divide-border/20 max-h-44 custom-scrollbar">
                                {ingredients.filter(ing => 
                                  ing.name.toLowerCase().includes(dropdownSearch.toLowerCase())
                                ).length === 0 ? (
                                  <div className="p-3 text-xs text-muted-foreground text-center">
                                    {isAr ? 'لا توجد نتائج' : 'No results found'}
                                  </div>
                                ) : (
                                  ingredients
                                    .filter(ing => ing.name.toLowerCase().includes(dropdownSearch.toLowerCase()))
                                    .map(ing => {
                                      const isCurrent = item.ingredientId === ing.id;
                                      return (
                                        <button
                                          key={ing.id}
                                          type="button"
                                          onClick={() => {
                                            const updated = [...recipeForm];
                                            updated[index].ingredientId = ing.id;
                                            setRecipeForm(updated);
                                            setOpenDropdownIndex(null);
                                          }}
                                          className={`w-full text-right px-3 py-2.5 text-xs flex items-center justify-between transition-colors ${
                                            isCurrent 
                                              ? 'bg-amber-500/10 text-amber-800 dark:text-amber-300 font-semibold' 
                                              : 'hover:bg-muted/45 text-foreground'
                                          }`}
                                        >
                                          <span>{ing.name}</span>
                                          <span className="text-[10px] text-stone-500 bg-muted hover:bg-muted/80 px-1.5 py-0.5 rounded-md font-mono border border-border/30 shrink-0">
                                            {isAr ? (ing.unit === 'gram' ? 'جرام' : ing.unit === 'kilogram' ? 'كيلوجرام' : ing.unit === 'ml' ? 'مل' : ing.unit === 'liter' ? 'لتر' : ing.unit === 'piece' ? 'حبة' : ing.unit) : ing.unit}
                                          </span>
                                        </button>
                                      );
                                    })
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      <input
                        type="number"
                        step="any"
                        placeholder={isAr ? 'الكمية' : 'Qty'}
                        value={item.quantity}
                        onChange={(e) => {
                          const updated = [...recipeForm];
                          updated[index].quantity = e.target.value;
                          setRecipeForm(updated);
                        }}
                        className="w-24 bg-background text-foreground ring-1 ring-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-amber-500/50 transition font-mono"
                      />

                      <button
                        type="button"
                        onClick={() => {
                          const updated = recipeForm.filter((_, idx) => idx !== index);
                          setRecipeForm(updated.length > 0 ? updated : [{ ingredientId: '', quantity: '' }]);
                        }}
                        className="text-destructive hover:bg-destructive/10 p-2 rounded-xl transition-colors shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {selectedIng && (
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs px-1 border-t border-border/10 pt-2 text-muted-foreground animate-in slide-in-from-top-1 duration-200">
                        {/* Stock Balance Badge */}
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold ${
                          selectedIng.currentStock <= selectedIng.lowStockLevel
                            ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
                            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                        }`}>
                          <Package className="h-3.5 w-3.5" />
                          <span>{isAr ? 'المخزون الحالي:' : 'Current Stock:'}</span>
                          <span className="font-mono font-bold">{selectedIng.currentStock}</span>
                          <span>{isAr ? (selectedIng.unit === 'gram' ? 'جرام' : selectedIng.unit === 'kilogram' ? 'كيلوجرام' : selectedIng.unit === 'ml' ? 'مل' : selectedIng.unit === 'liter' ? 'لتر' : selectedIng.unit === 'piece' ? 'حبة' : selectedIng.unit) : selectedIng.unit}</span>
                          {selectedIng.currentStock <= selectedIng.lowStockLevel && (
                            <span className="flex items-center gap-0.5 text-rose-600 font-bold text-[10px] uppercase">
                              <AlertTriangle className="h-3 w-3 animate-pulse" />
                              ({isAr ? 'رصيد منخفض!' : 'Low!'})
                            </span>
                          )}
                        </div>

                        {/* Unit Cost Badge */}
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary border border-border/30 text-stone-700 dark:text-stone-300 text-[11px] font-semibold">
                          <DollarSign className="h-3.5 w-3.5" />
                          <span>{isAr ? 'تكلفة الوحدة:' : 'Unit Cost:'}</span>
                          <span className="font-mono">${selectedIng.cost.toFixed(2)}</span>
                        </div>

                        {/* Supplier if available */}
                        {selectedIng.supplier && (
                          <div className="text-[11px] text-muted-foreground ml-auto mr-1 truncate max-w-[150px]">
                            {isAr ? 'المورد:' : 'Supplier:'} <span className="font-medium text-foreground">{selectedIng.supplier}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => setRecipeForm([...recipeForm, { ingredientId: '', quantity: '' }])}
                className="text-amber-750 hover:bg-amber-600/5 rounded-xl px-3 py-1.5 text-xs font-bold transition flex items-center gap-1 border border-amber-600/20"
              >
                <Plus className="h-4.5 w-4.5" />
                <span>{t('Add Component row')}</span>
              </button>
            </div>

            <div className="flex gap-2 pt-4 border-t border-border/20 justify-end">
              <button
                type="button"
                onClick={() => setIsEditRecipeOpen(false)}
                className="bg-muted hover:bg-muted/80 rounded-xl px-4 py-2.5 text-sm font-medium transition"
              >
                {t('Cancel')}
              </button>
              <button
                type="button"
                onClick={handleSaveRecipe}
                className="bg-amber-700 hover:bg-amber-800 text-white rounded-xl px-5 py-2.5 text-sm font-medium transition"
              >
                {t('Save Configuration')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: RECORD GENERAL WASTE */}
      {isRecordWasteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in transition-all">
          <div className="bg-card w-full max-w-sm rounded-2xl border border-border shadow-2xl p-6 overflow-hidden max-h-[90vh] overflow-y-auto space-y-4">
            <h3 className="text-xl font-bold border-b border-border/20 pb-2 flex items-center gap-2 text-destructive">
              <Trash className="h-5 w-5" />
              <span>{t('Record Loss')}</span>
            </h3>

            <p className="text-xs text-muted-foreground">
              {t('Deducts stock immediately and audits as Wastage with manual justifications.')}
            </p>

            <form onSubmit={handleRecordWaste} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-muted-foreground block mb-1">{t('Select wasted ingredient')}</label>
                <select
                  required
                  value={wasteForm.ingredientId}
                  onChange={(e) => setWasteForm({ ...wasteForm, ingredientId: e.target.value })}
                  className="w-full bg-muted/40 text-foreground ring-1 ring-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-amber-500/50 transition"
                >
                  <option value="">-- {t('Select')} --</option>
                  {ingredients.map(ing => (
                    <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-muted-foreground block mb-1">{t('Quantity destroyed')}</label>
                <input
                  type="number"
                  step="any"
                  required
                  min="0"
                  placeholder="e.g. 50"
                  value={wasteForm.qty === 0 ? '' : wasteForm.qty}
                  onChange={(e) => setWasteForm({ ...wasteForm, qty: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-muted/40 text-foreground ring-1 ring-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-amber-500/50 transition font-mono"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-muted-foreground block mb-1">{t('Wastage reason details')}</label>
                <textarea
                  required
                  placeholder="e.g. Milk spill on kitchen floor, expired beans"
                  value={wasteForm.note}
                  onChange={(e) => setWasteForm({ ...wasteForm, note: e.target.value })}
                  className="w-full bg-muted/40 text-foreground ring-1 ring-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-amber-500/50 transition h-20 text-xs"
                />
              </div>

              <div className="flex gap-2 pt-4 border-t border-border/20 justify-end">
                <button
                  type="button"
                  onClick={() => setIsRecordWasteOpen(false)}
                  className="bg-muted hover:bg-muted/80 rounded-xl px-4 py-2.5 text-sm font-medium transition"
                >
                  {t('Cancel')}
                </button>
                <button
                  type="submit"
                  className="bg-destructive hover:bg-destructive/90 text-white rounded-xl px-5 py-2.5 text-sm font-medium transition"
                >
                  {t('File Record')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
