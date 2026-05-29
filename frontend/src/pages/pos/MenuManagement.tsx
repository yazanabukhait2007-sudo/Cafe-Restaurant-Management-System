import React, { useState } from 'react';
import { usePosStore, Product, Category } from '@/store/pos';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Search, 
  ChevronLeft, 
  Utensils, 
  Tag, 
  DollarSign,
  Layers,
  Save,
  X,
  PlusCircle,
  Filter,
  Settings2,
  Image as ImageIcon,
  Camera,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/utils/utils';
import { toast } from 'sonner';

export default function MenuManagement() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const products = usePosStore(state => state.products);
  const categories = usePosStore(state => state.categories);
  const addProduct = usePosStore(state => state.addProduct);
  const updateProduct = usePosStore(state => state.updateProduct);
  const deleteProduct = usePosStore(state => state.deleteProduct);
  const addCategory = usePosStore(state => state.addCategory);
  const deleteCategory = usePosStore(state => state.deleteCategory);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string | number, type: 'product' | 'category', name: string } | null>(null);

  // New Product Form State
  const [newProduct, setNewProduct] = useState<Omit<Product, 'id'>>({
    name: '',
    price: 0,
    category: categories[0]?.name || '',
    image: ''
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        if (isEdit && editingProduct) {
          setEditingProduct({ ...editingProduct, image: base64String });
        } else {
          setNewProduct({ ...newProduct, image: base64String });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || newProduct.price <= 0 || !newProduct.category) {
      toast.error(t('Please fill all fields correctly'));
      return;
    }
    addProduct(newProduct);
    setIsAddingProduct(false);
    setNewProduct({ name: '', price: 0, category: categories[0]?.name || '', image: '' });
    toast.success(t('Product added successfully'));
  };

  const handleUpdateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    updateProduct(editingProduct.id, editingProduct);
    setEditingProduct(null);
    toast.success(t('Product updated successfully'));
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    addCategory(newCategoryName.trim());
    setNewCategoryName('');
    setIsAddingCategory(false);
    toast.success(t('Category added successfully'));
  };

  return (
    <div className="flex flex-col h-full bg-[#FDFBF7] text-stone-900">
      <header className="h-20 bg-white border-b border-amber-900/10 px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/pos/tables')}
            className="w-10 h-10 rounded-full bg-stone-50 border border-stone-200 flex items-center justify-center hover:bg-stone-100 transition shadow-sm"
          >
            <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{t('Menu Management')}</h1>
            <p className="text-xs text-stone-400 font-medium uppercase tracking-widest">{t('Manage Categories & Items')}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsEditMode(!isEditMode)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl transition text-sm font-bold border shadow-sm",
              isEditMode 
              ? "bg-amber-500 text-white border-amber-600 shadow-amber-200" 
              : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
            )}
          >
            <Settings2 className={cn("w-4 h-4", isEditMode && "animate-spin-slow")} />
            <span>{isEditMode ? t('Finish Editing') : t('Customize')}</span>
          </button>
          <div className="h-8 w-[1px] bg-stone-200 mx-1" />
          <button 
            onClick={() => setIsAddingCategory(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/10 hover:bg-primary/20 hover:border-primary/20 rounded-xl transition text-sm font-bold"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">{t('New Category')}</span>
          </button>
          <button 
            onClick={() => setIsAddingProduct(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition text-sm font-bold shadow-lg shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            <span>{t('Add Product')}</span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Categories Bar */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
            <button 
              onClick={() => setActiveCategory('All')}
              className={cn(
                "px-6 py-2.5 rounded-2xl text-sm font-bold transition-all shrink-0",
                activeCategory === 'All' 
                ? "bg-primary text-primary-foreground shadow-lg" 
                : "bg-white text-stone-400 border border-stone-100 hover:bg-stone-50"
              )}
            >
              {t('All Items')}
            </button>
            {categories.map((cat) => (
              <div key={cat.id} className="relative group shrink-0">
                <button 
                  onClick={isEditMode ? (e) => {
                    e.stopPropagation();
                    setDeleteConfirm({ id: cat.id, type: 'category', name: cat.name });
                  } : () => setActiveCategory(cat.name)}
                  className={cn(
                    "px-6 py-2.5 rounded-2xl text-sm font-bold transition-all flex items-center gap-2",
                    activeCategory === cat.name 
                    ? "bg-primary text-primary-foreground shadow-lg" 
                    : "bg-white text-stone-400 border border-stone-100 hover:bg-stone-50"
                  )}
                >
                  {cat.name}
                </button>
                {isEditMode && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirm({ id: cat.id, type: 'category', name: cat.name });
                    }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center transition-all border-2 border-white shadow-md hover:scale-110 active:scale-90 z-20"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="relative group max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 group-focus-within:text-primary transition-colors" />
            <input 
              type="text"
              placeholder={t('Search products...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 pl-12 pr-6 bg-white border border-stone-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
            />
          </div>

          {/* Products List */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredProducts.map((product) => (
              <motion.div 
                layout
                key={product.id}
                className={cn(
                  "aspect-[5/6] bg-white border border-stone-200 rounded-3xl flex flex-col hover:border-primary hover:shadow-xl hover:shadow-primary/5 transition-all relative group overflow-hidden shadow-sm",
                  product.available === false && "opacity-60 grayscale-[30%] bg-stone-50/50"
                )}
              >
                {/* Image Area */}
                <div className="h-[45%] w-full overflow-hidden shrink-0 bg-stone-50 border-b border-stone-100 relative p-3">
                  {product.image ? (
                    <img 
                      src={product.image} 
                      alt={product.name}
                      className="w-full h-full object-contain transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-200">
                      <Utensils className="w-6 h-6" />
                    </div>
                  )}
                  
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-white/90 backdrop-blur-md rounded-lg text-[8px] font-bold text-stone-500 uppercase tracking-tighter shadow-sm border border-white/50">
                    {product.category}
                  </div>

                  {isEditMode && (
                    <div className="absolute top-2 right-2 flex gap-1 z-10">
                      <button 
                        onClick={() => setEditingProduct(product)}
                        className="w-7 h-7 rounded-lg bg-white/90 backdrop-blur-md border border-stone-100 text-stone-600 flex items-center justify-center hover:bg-primary hover:text-white transition shadow-sm"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm({ id: product.id, type: 'product', name: product.name });
                        }}
                        className="w-7 h-7 rounded-lg bg-white/90 backdrop-blur-md border border-stone-100 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition shadow-sm"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Content Section */}
                <div className="flex-1 p-3 flex flex-col text-left rtl:text-right">
                   <h3 className="font-bold text-xs leading-tight text-stone-800 line-clamp-2 h-8 mb-1">{product.name}</h3>
                   <div className="mt-auto flex items-center justify-between">
                     <span className={cn("font-black text-xs sm:text-sm", product.available === false ? "text-stone-400" : "text-primary")}>
                       ${product.price.toFixed(2)}
                     </span>
                     
                     {/* Toggle Switch */}
                     <span className="flex items-center gap-1 shrink-0 select-none">
                       <span className="text-[9px] font-bold text-stone-400">
                         {product.available !== false ? t('Active') : t('Inactive')}
                       </span>
                       <button
                         type="button"
                         onClick={(e) => {
                           e.stopPropagation();
                           const isCurrentlyAvailable = product.available !== false;
                           updateProduct(product.id, { available: !isCurrentlyAvailable });
                           toast.success(isCurrentlyAvailable ? t('Product deactivated') : t('Product activated'));
                         }}
                         className={cn(
                           "relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-primary/20",
                           product.available !== false ? "bg-primary" : "bg-stone-300"
                         )}
                         style={{ direction: 'ltr' }}
                       >
                         <span
                           className={cn(
                             "pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
                             product.available !== false ? "translate-x-3.5" : "translate-x-0"
                           )}
                         />
                       </button>
                     </span>
                   </div>
                </div>
              </motion.div>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 bg-white border-2 border-dashed border-stone-200 rounded-[2.5rem]">
               <div className="w-16 h-16 bg-stone-50 rounded-2xl flex items-center justify-center mb-4">
                 <Search className="w-8 h-8 text-stone-300" />
               </div>
               <h3 className="font-bold text-stone-800">{t('No products found')}</h3>
               <p className="text-sm text-stone-400">{t('Try a different search or category')}</p>
            </div>
          )}
        </div>
      </main>

      {/* Add Product Modal */}
      <AnimatePresence>
        {(isAddingProduct || editingProduct) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsAddingProduct(false);
                setEditingProduct(null);
              }}
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 max-h-[90vh] overflow-y-auto no-scrollbar">
                <div className="flex items-center justify-between mb-8">
                   <h2 className="text-2xl font-bold tracking-tight">
                     {editingProduct ? t('Edit Product') : t('Add New Product')}
                   </h2>
                   <button 
                     onClick={() => {
                       setIsAddingProduct(false);
                       setEditingProduct(null);
                     }}
                     className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 hover:text-stone-600 transition"
                   >
                     <X className="w-5 h-5" />
                   </button>
                </div>

                <form onSubmit={editingProduct ? handleUpdateProduct : handleAddProduct} className="space-y-6">
                   {/* Image Picker */}
                   <div className="space-y-2">
                     <label className="text-xs font-bold text-stone-400 uppercase tracking-widest px-1 block">{t('Product Image')}</label>
                     <div className="flex gap-4">
                        <div className="relative w-32 h-32 rounded-3xl bg-stone-50 border-2 border-dashed border-stone-200 overflow-hidden flex flex-col items-center justify-center group">
                          {(editingProduct?.image || newProduct.image) ? (
                            <>
                              <img 
                                src={editingProduct ? editingProduct.image : newProduct.image} 
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-stone-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button 
                                  type="button"
                                  onClick={() => editingProduct 
                                    ? setEditingProduct({ ...editingProduct, image: '' })
                                    : setNewProduct({ ...newProduct, image: '' })
                                  }
                                  className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center"
                                >
                                  <X className="w-5 h-5" />
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              <ImageIcon className="w-10 h-10 text-stone-300" />
                              <span className="text-[10px] font-bold text-stone-400">{t('No image')}</span>
                            </>
                          )}
                        </div>
                        <div className="flex-1 flex flex-col justify-center gap-2">
                          <label className="h-12 w-full bg-stone-100 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold text-stone-600 cursor-pointer hover:bg-stone-200 transition">
                            <Upload className="w-4 h-4" />
                            {t('Upload File')}
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden"
                              onChange={(e) => handleImageChange(e, !!editingProduct)}
                            />
                          </label>
                          <p className="text-[10px] text-stone-400 font-medium leading-relaxed">
                            {t('Recommended: Square image, max 2MB')}
                          </p>
                        </div>
                     </div>
                   </div>

                   <div className="space-y-2">
                     <label className="text-xs font-bold text-stone-400 uppercase tracking-widest px-1">{t('Product Name')}</label>
                     <input 
                       type="text"
                       required
                       value={editingProduct ? editingProduct.name : newProduct.name}
                       onChange={(e) => editingProduct 
                         ? setEditingProduct({ ...editingProduct, name: e.target.value })
                         : setNewProduct({ ...newProduct, name: e.target.value })
                       }
                       className="w-full h-14 bg-stone-50 border border-stone-200 rounded-2xl px-6 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium"
                       placeholder="e.g. Mocha Latte"
                     />
                   </div>

                   <div className="space-y-4">
                     <label className="text-xs font-bold text-stone-400 uppercase tracking-widest px-1 block">{t('Category')}</label>
                     <div className="grid grid-cols-2 gap-2">
                        {categories.map((cat) => (
                           <button
                             key={cat.id}
                             type="button"
                             onClick={() => editingProduct 
                              ? setEditingProduct({ ...editingProduct, category: cat.name })
                              : setNewProduct({ ...newProduct, category: cat.name })
                             }
                             className={cn(
                               "px-4 py-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-2",
                               (editingProduct ? editingProduct.category : newProduct.category) === cat.name
                               ? "bg-primary text-primary-foreground border-primary shadow-md"
                               : "bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100"
                             )}
                           >
                             <Tag className="w-3 h-3" />
                             {cat.name}
                           </button>
                        ))}
                     </div>
                   </div>

                   <div className="space-y-2">
                     <label className="text-xs font-bold text-stone-400 uppercase tracking-widest px-1">{t('Price')}</label>
                     <div className="relative">
                       <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                       <input 
                         type="number"
                         step="0.01"
                         required
                         value={editingProduct ? editingProduct.price : newProduct.price}
                         onChange={(e) => editingProduct 
                           ? setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) })
                           : setNewProduct({ ...newProduct, price: parseFloat(e.target.value) })
                         }
                         className="w-full h-14 bg-stone-50 border border-stone-200 rounded-2xl pl-12 pr-6 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-mono font-bold text-lg"
                       />
                     </div>
                   </div>

                   <button 
                     type="submit"
                     className="w-full h-14 bg-primary text-primary-foreground rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] transition active:scale-95"
                   >
                     <Save className="w-5 h-5" />
                     {editingProduct ? t('Save Changes') : t('Create Product')}
                   </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Category Modal */}
      <AnimatePresence>
        {isAddingCategory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingCategory(false)}
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                 <div className="flex items-center justify-between mb-8">
                   <h2 className="text-2xl font-bold tracking-tight">{t('New Category')}</h2>
                   <button 
                     onClick={() => setIsAddingCategory(false)}
                     className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 hover:text-stone-600 transition"
                   >
                     <X className="w-5 h-5" />
                   </button>
                 </div>

                 <form onSubmit={handleAddCategory} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-400 uppercase tracking-widest px-1">{t('Category Name')}</label>
                      <input 
                        type="text"
                        required
                        autoFocus
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="w-full h-14 bg-stone-50 border border-stone-200 rounded-2xl px-6 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium"
                        placeholder="e.g. Desserts"
                      />
                    </div>
                    <button 
                      type="submit"
                      className="w-full h-14 bg-primary text-primary-foreground rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary/95 transition active:scale-[0.98]"
                    >
                      <Plus className="w-5 h-5" />
                      {t('Add Category')}
                    </button>
                 </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirm(null)}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-8"
            >
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mb-6 mx-auto">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-center mb-2">{t('Are you sure?')}</h3>
              <p className="text-sm text-stone-500 text-center mb-8 px-4">
                {t('This will permanently delete')} <span className="font-bold text-stone-900">"{deleteConfirm.name}"</span>. {t('This action cannot be undone.')}
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 h-14 bg-stone-100 text-stone-600 rounded-2xl font-bold hover:bg-stone-200 transition"
                >
                  {t('Cancel')}
                </button>
                <button 
                  onClick={() => {
                    if (deleteConfirm.type === 'product') {
                      deleteProduct(deleteConfirm.id as string);
                      toast.success(t('Product deleted'));
                    } else {
                      deleteCategory(deleteConfirm.id as string);
                      if (activeCategory === deleteConfirm.name) setActiveCategory('All');
                      toast.success(t('Category deleted'));
                    }
                    setDeleteConfirm(null);
                  }}
                  className="flex-1 h-14 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 transition shadow-lg shadow-red-200"
                >
                  {t('Confirm')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
