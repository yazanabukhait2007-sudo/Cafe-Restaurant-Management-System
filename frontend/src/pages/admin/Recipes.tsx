import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Scale, 
  Clock,
  AlertCircle,
  X,
  PlusCircle,
  Trash2,
  Save,
  CheckCircle2,
  ListRestart
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/utils';
import apiClient from '@/api/client';
import { usePosStore } from '@/store/pos';
import { toast } from 'sonner';

export default function RecipesPage() {
  const { t } = useTranslation();
  const localProducts = usePosStore(state => state.products);
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [ingredientsList, setIngredientsList] = useState<any[]>([]);
  
  // Recipe editor modal state
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [recipeIngredients, setRecipeIngredients] = useState<any[]>([]);
  const [newIngredientId, setNewIngredientId] = useState('');
  const [newIngredientQty, setNewIngredientQty] = useState<number>(1);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    syncAndFetchData();
  }, [localProducts]);

  const syncAndFetchData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch available ingredients for the editor
      const ingRes = await apiClient.get('/inventory/ingredients');
      setIngredientsList(ingRes.data);

      // 2. Fetch products and active recipes from backend database
      const prodRes = await apiClient.get('/inventory/recipes');
      const dbProducts = prodRes.data;

      // 3. Identify products in the local POS store that are missing in backend Prisma database
      const missingProducts = localProducts.filter(lp => {
        return !dbProducts.some((dp: any) => dp.name.toLowerCase() === lp.name.toLowerCase());
      });

      // 4. Create missing products in the database so they are in sync
      if (missingProducts.length > 0) {
        for (const mp of missingProducts) {
          try {
            await apiClient.post('/menu/products', {
              name: mp.name,
              price: mp.price,
              categoryName: mp.category,
              image: mp.image || null,
              variants: mp.variants ? mp.variants.map((v: any) => ({ name: v.name, price: v.price })) : []
            });
          } catch (err) {
            console.error(`Failed to sync product ${mp.name}:`, err);
          }
        }
        
        // Refetch fully synchronized products list
        const refreshedRes = await apiClient.get('/inventory/recipes');
        setProducts(refreshedRes.data);
      } else {
        setProducts(dbProducts);
      }
    } catch (err) {
      toast.error(t('Failed to load menu products'));
    } finally {
      setLoading(false);
    }
  };

  // Flatten products and variants for displaying them on screen
  const items = products.flatMap(product => {
    const list: any[] = [];
    
    // Add product itself
    list.push({
      id: product.id,
      productId: product.id,
      variantId: null,
      productName: product.name,
      displayName: product.name,
      isVariant: false,
      recipe: product.activeRecipe,
      ingredients: product.recipeItems || []
    });

    if (product.variants && product.variants.length > 0) {
      product.variants.forEach((v: any) => {
        list.push({
          id: v.id,
          productId: product.id,
          variantId: v.id,
          productName: product.name,
          displayName: `${product.name} (${v.name})`,
          isVariant: true,
          recipe: v.activeRecipe,
          ingredients: v.recipeItems || []
        });
      });
    }
    return list;
  }).filter(item => 
    item.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Open recipe editor
  const handleOpenEditor = (item: any) => {
    setSelectedItem(item);
    
    // Load current ingredients list
    const mapped = item.ingredients.map((ri: any) => ({
      ingredientId: ri.ingredientId,
      name: ri.ingredient?.name || t('Unknown Ingredient'),
      quantity: ri.quantity,
      unit: ri.ingredient?.unit || 'unit'
    }));
    setRecipeIngredients(mapped);
    
    setNewIngredientId('');
    setNewIngredientQty(1);
  };

  // Add ingredient in draft form state
  const handleAddIngredientDraft = () => {
    if (!newIngredientId) {
      toast.error(t('Please select an ingredient'));
      return;
    }
    if (newIngredientQty <= 0) {
      toast.error(t('Quantity must be greater than zero'));
      return;
    }

    const selectedIng = ingredientsList.find(i => i.id === newIngredientId);
    if (!selectedIng) return;

    // Check if duplicate
    const index = recipeIngredients.findIndex(ri => ri.ingredientId === newIngredientId);
    if (index >= 0) {
      // Update quantity
      const updated = [...recipeIngredients];
      updated[index].quantity += newIngredientQty;
      setRecipeIngredients(updated);
    } else {
      setRecipeIngredients([
        ...recipeIngredients,
        {
          ingredientId: selectedIng.id,
          name: selectedIng.name,
          quantity: newIngredientQty,
          unit: selectedIng.unit
        }
      ]);
    }
    
    setNewIngredientId('');
    setNewIngredientQty(1);
  };

  // Remove ingredient in draft list
  const handleRemoveIngredientDraft = (id: string) => {
    setRecipeIngredients(recipeIngredients.filter(ri => ri.ingredientId !== id));
  };

  // Save recipe to backend SQLite
  const handleSaveRecipe = async () => {
    if (!selectedItem) return;
    try {
      setIsSaving(true);
      
      const cleanRecipe = recipeIngredients.map(ri => ({
        ingredientId: ri.ingredientId,
        quantity: parseFloat(ri.quantity.toString())
      }));

      await apiClient.post('/inventory/recipes', {
        productId: selectedItem.productId,
        productVariantId: selectedItem.variantId,
        ingredients: cleanRecipe
      });

      toast.success(t('Recipe saved successfully'));
      setSelectedItem(null);
      
      // Refresh list to pull updated recipe items
      syncAndFetchData();
    } catch (err) {
      toast.error(t('Failed to save recipe'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-stone-900 tracking-tight">{t('إدارة الوصفات والإنتاج')}</h1>
          <p className="text-stone-500 font-medium">{t('وصفات ومكونات التحضير للأصناف التابعة لقائمة الطعام')}</p>
        </div>
        <button 
          onClick={syncAndFetchData}
          className="flex items-center gap-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-xl transition text-sm font-bold text-stone-700"
        >
          <ListRestart className="w-4 h-4" />
          <span>{t('تحديث ومزامنة الأصناف')}</span>
        </button>
      </header>

      {/* Search Input */}
      <div className="relative group max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 group-focus-within:text-primary transition-colors" />
        <input 
          type="text"
          placeholder={t('البحث عن صنف...')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full h-12 pl-12 pr-6 bg-white border border-stone-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-sm font-medium"
        />
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-4 opacity-50">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-stone-200">
            <p className="text-stone-500 font-medium">{t('لا توجد اصناف مطابقة للبحث أو مسجلة حالياً')}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const hasRecipe = item.ingredients && item.ingredients.length > 0;
            return (
              <div 
                key={item.id}
                className="bg-white border border-stone-150 p-6 rounded-3xl flex flex-col justify-between hover:border-primary hover:shadow-lg transition-all shadow-sm space-y-4"
              >
                <div>
                  <h3 className="font-extrabold text-stone-800 text-lg leading-snug">{item.displayName}</h3>
                  <p className="text-stone-400 text-xs font-semibold uppercase tracking-widest mt-1">
                    {item.isVariant ? t('variant') : t('product')}
                  </p>
                  
                  <div className="mt-4 p-3 bg-stone-50 rounded-2xl border border-stone-100 min-h-[60px] flex items-center">
                    {hasRecipe ? (
                      <div className="w-full">
                        <span className="text-xs font-bold text-stone-400 block mb-1">{t('المكونات المستخدمة')}:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {item.ingredients.map((ri: any) => (
                            <span 
                              key={ri.id} 
                              className="text-xs font-bold text-stone-700 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg"
                            >
                              {ri.ingredient?.name}: {ri.quantity}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-stone-400 text-sm italic flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 shrink-0 text-stone-400" />
                        {t('لا توجد مكونات محددة لهذه الوصفة')}
                      </p>
                    )}
                  </div>
                </div>

                <button 
                  onClick={() => handleOpenEditor(item)}
                  className={cn(
                    "w-full py-3 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 border shadow-sm",
                    hasRecipe 
                      ? "bg-amber-600 hover:bg-amber-700 text-white border-amber-700 shadow-amber-200" 
                      : "bg-white text-stone-700 border-stone-200 hover:bg-stone-50"
                  )}
                >
                  <Scale className="w-4 h-4" />
                  <span>{hasRecipe ? t('تعديل الوصفة والمكونات') : t('إعداد وتفصيل الوصفة')}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Recipe Editor Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            onClick={() => setSelectedItem(null)}
            className="absolute inset-0 bg-stone-900/40 backdrop-blur-md"
          />
          <div className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-8 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
               <div>
                 <span className="text-xs font-bold text-primary tracking-widest uppercase block mb-1">{t('تعديل وصفة الصنف')}</span>
                 <h2 className="text-2xl font-black text-stone-800 tracking-tight">{selectedItem.displayName}</h2>
               </div>
               <button 
                 onClick={() => setSelectedItem(null)}
                 className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 hover:text-stone-600 transition"
               >
                 <X className="w-5 h-5" />
               </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar py-6 space-y-6">
              {/* Current drafted recipe ingredients */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider">{t('المكونات الحالية')}</h3>
                
                {recipeIngredients.length === 0 ? (
                  <div className="p-8 text-center bg-stone-50 border border-stone-200 border-dashed rounded-3xl">
                     <AlertCircle className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                     <p className="text-stone-500 font-medium text-sm">{t('لا توجد مكونات مسجلة لهذه الوصفة حالياً')}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recipeIngredients.map((ri) => (
                      <div 
                        key={ri.ingredientId}
                        className="flex items-center justify-between p-4 bg-stone-50 border border-stone-100 rounded-2xl hover:border-red-100 hover:bg-red-50/10 transition-all group"
                      >
                        <div>
                          <span className="font-extrabold text-stone-800 block text-sm">{ri.name}</span>
                          <span className="text-xs font-bold text-stone-500">{ri.quantity} {ri.unit}</span>
                        </div>
                        <button 
                          onClick={() => handleRemoveIngredientDraft(ri.ingredientId)}
                          className="w-8 h-8 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 transition flex items-center justify-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add ingredient to draft */}
              <div className="p-5 bg-amber-500/5 rounded-3xl border border-amber-500/10 space-y-4">
                <span className="text-xs font-bold text-amber-800 uppercase tracking-widest block">{t('إضافة مكون جديد')}</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-stone-500 block mb-1">{t('اختر المكون')}</label>
                    <select
                      value={newIngredientId}
                      onChange={(e) => setNewIngredientId(e.target.value)}
                      className="w-full h-11 bg-white border border-stone-200 rounded-xl px-3 text-sm font-semibold focus:outline-none"
                    >
                      <option value="">{t('-- اختر المكون --')}</option>
                      {ingredientsList.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name} ({i.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-stone-500 block mb-1">{t('الكمية المستهلكة')}</label>
                    <div className="flex gap-2">
                      <input 
                        type="number"
                        step="any"
                        min="0.001"
                        value={newIngredientQty}
                        onChange={(e) => setNewIngredientQty(parseFloat(e.target.value || '0'))}
                        className="w-full h-11 bg-white border border-stone-200 rounded-xl px-4 text-sm font-bold focus:outline-none"
                      />
                      <button 
                        type="button"
                        onClick={handleAddIngredientDraft}
                        className="px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold flex items-center justify-center transition"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal actions */}
            <div className="pt-4 border-t border-stone-100 flex gap-3">
              <button 
                onClick={() => setSelectedItem(null)}
                className="flex-1 h-12 bg-stone-100 text-stone-600 rounded-2xl font-bold hover:bg-stone-200 transition"
              >
                {t('إلغاء')}
              </button>
              <button 
                onClick={handleSaveRecipe}
                disabled={isSaving}
                className="flex-1 h-12 bg-primary text-primary-foreground rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-primary/95 transition shadow-lg shadow-primary/20"
              >
                <Save className="w-5 h-5" />
                <span>{isSaving ? t('جاري الحفظ...') : t('حفظ الوصفة')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
