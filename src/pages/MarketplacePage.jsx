import React, { useState, useEffect, useRef } from 'react';
import { ShoppingBag, Plus, X, Search, Camera, MapPin, Tag, Filter, Heart, MessageCircle, ChevronDown, Truck, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { useToast } from '@/components/ui/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const CATEGORIES = [
  { id: 'all', label: 'Todo', icon: '🎣' },
  { id: 'rods', label: 'Cañas', icon: '🎋' },
  { id: 'reels', label: 'Carretes', icon: '🔄' },
  { id: 'lures', label: 'Señuelos', icon: '🪱' },
  { id: 'tackle', label: 'Accesorios', icon: '🧰' },
  { id: 'clothing', label: 'Ropa', icon: '🧥' },
  { id: 'boats', label: 'Embarcaciones', icon: '🚤' },
  { id: 'electronics', label: 'Electrónica', icon: '📡' },
  { id: 'other', label: 'Otros', icon: '📦' },
];

const CONDITIONS = [
  { id: 'new', label: 'Nuevo', color: 'text-green-400 bg-green-500/10 border-green-500/30' },
  { id: 'like-new', label: 'Como nuevo', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' },
  { id: 'good', label: 'Buen estado', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  { id: 'fair', label: 'Aceptable', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' },
];

const MarketplacePage = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dbAvailable, setDbAvailable] = useState(true);
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    fetchProducts();
    const storedFavs = JSON.parse(localStorage.getItem('carpes_mp_favs') || '[]');
    setFavorites(storedFavs);
  }, [user]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('marketplace_products')
        .select(`*, seller:profiles!marketplace_products_seller_id_fkey(id, username, foto_perfil)`)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.warn('marketplace_products table not available:', err.message);
      setDbAvailable(false);
      const stored = localStorage.getItem('carpes_marketplace');
      if (stored) setProducts(JSON.parse(stored));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async (productData) => {
    try {
      if (dbAvailable) {
        let imageUrl = null;
        if (productData.imageFile) {
          const ext = productData.imageFile.name.split('.').pop();
          const filePath = `marketplace/${user.id}/${Date.now()}.${ext}`;
          const { error: upErr } = await supabase.storage.from('posts').upload(filePath, productData.imageFile);
          if (!upErr) {
            const { data: urlData } = supabase.storage.from('posts').getPublicUrl(filePath);
            imageUrl = urlData.publicUrl;
          }
        }

        const { data, error } = await supabase
          .from('marketplace_products')
          .insert({
            title: productData.title,
            description: productData.description,
            price: productData.price,
            category: productData.category,
            condition: productData.condition,
            location: productData.location,
            image_url: imageUrl,
            seller_id: user.id,
            status: 'active',
          })
          .select(`*, seller:profiles!marketplace_products_seller_id_fkey(id, username, foto_perfil)`)
          .single();

        if (error) throw error;
        setProducts(prev => [data, ...prev]);
      } else {
        const newProduct = {
          id: crypto.randomUUID(),
          ...productData,
          image_url: productData.imageFile ? URL.createObjectURL(productData.imageFile) : null,
          seller_id: user?.id,
          seller: { id: user?.id, username: profile?.username || 'Tú', foto_perfil: profile?.foto_perfil },
          status: 'active',
          created_at: new Date().toISOString(),
        };
        const updated = [newProduct, ...products];
        setProducts(updated);
        localStorage.setItem('carpes_marketplace', JSON.stringify(updated));
      }

      toast({ title: '¡Producto publicado!' });
      setShowCreate(false);
    } catch (err) {
      console.error('Error creating product:', err);
      toast({ variant: 'destructive', title: 'Error al publicar' });
    }
  };

  const toggleFavorite = (productId) => {
    setFavorites(prev => {
      const updated = prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId];
      localStorage.setItem('carpes_mp_favs', JSON.stringify(updated));
      return updated;
    });
  };

  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesSearch = !searchTerm || 
      p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-cyan-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <Helmet><title>Marketplace - Car-Pes</title></Helmet>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 pb-24">
        <div className="max-w-5xl mx-auto px-4 py-6 md:py-8">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Marketplace</h1>
              <p className="text-blue-400 text-sm">Compra y vende material de pesca</p>
            </div>
            <Button 
              onClick={() => setShowCreate(true)}
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl"
            >
              <Plus className="w-4 h-4 mr-2" /> Vender
            </Button>
          </motion.div>

          {!dbAvailable && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 mb-4 text-sm text-yellow-300">
              ⚠️ Base de datos no configurada. Los productos se guardan localmente. Ejecuta <span className="font-mono bg-black/20 px-1 rounded">setup-chat-groups.sql</span> para persistir datos.
            </motion.div>
          )}

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar productos..."
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-blue-500 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
            />
          </div>

          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide">
            {CATEGORIES.map(cat => (
              <motion.button
                key={cat.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all border ${
                  selectedCategory === cat.id
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : 'bg-slate-900/50 text-blue-400 border-white/10 hover:bg-white/5'
                }`}
              >
                <span>{cat.icon}</span> {cat.label}
              </motion.button>
            ))}
          </div>

          {/* Products Grid */}
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {filteredProducts.map((product, i) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={i}
                  isFav={favorites.includes(product.id)}
                  onToggleFav={() => toggleFavorite(product.id)}
                  isOwn={user && product.seller_id === user.id}
                />
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16 bg-slate-900/30 rounded-3xl border border-white/10"
            >
              <ShoppingBag className="w-16 h-16 text-cyan-500/30 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">
                {searchTerm || selectedCategory !== 'all' ? 'No se encontraron productos' : 'No hay productos aún'}
              </h3>
              <p className="text-blue-400 mb-6 text-sm max-w-xs mx-auto">
                {searchTerm || selectedCategory !== 'all' 
                  ? 'Prueba con otros filtros'
                  : '¡Sé el primero en publicar algo!'}
              </p>
              {!searchTerm && selectedCategory === 'all' && (
                <Button onClick={() => setShowCreate(true)} className="bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl">
                  <Plus className="w-4 h-4 mr-2" /> Publicar producto
                </Button>
              )}
            </motion.div>
          )}
        </div>

        {/* Create Modal */}
        <AnimatePresence>
          {showCreate && <CreateProductModal onClose={() => setShowCreate(false)} onCreate={handleCreateProduct} />}
        </AnimatePresence>
      </div>
    </>
  );
};

// ─── Product Card ──────────────────────────────────────────
const ProductCard = ({ product, index, isFav, onToggleFav, isOwn }) => {
  const condition = CONDITIONS.find(c => c.id === product.condition) || CONDITIONS[2];
  let timeAgo = '';
  try { timeAgo = formatDistanceToNow(new Date(product.created_at), { addSuffix: true, locale: es }); } catch {}

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="bg-slate-900/50 border border-white/10 rounded-2xl overflow-hidden hover:border-cyan-500/20 transition-all group"
    >
      {/* Image */}
      <div className="relative aspect-square bg-slate-800 overflow-hidden">
        {product.image_url ? (
          <img src={product.image_url} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag className="w-12 h-12 text-blue-700" />
          </div>
        )}

        {/* Fav button */}
        <motion.button
          whileTap={{ scale: 0.8 }}
          onClick={onToggleFav}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
        >
          <Heart className={`w-4 h-4 transition-colors ${isFav ? 'text-red-500 fill-red-500' : 'text-white'}`} />
        </motion.button>

        {/* Price badge */}
        <div className="absolute bottom-2 left-2 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg px-2.5 py-1 shadow-lg">
          <span className="text-white font-bold text-sm">{product.price}€</span>
        </div>

        {isOwn && (
          <div className="absolute top-2 left-2 bg-cyan-500/80 rounded-lg px-2 py-0.5 text-[10px] text-white font-semibold">
            Tu anuncio
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h4 className="text-white font-semibold text-sm truncate">{product.title}</h4>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${condition.color}`}>
            {condition.label}
          </span>
          {product.location && (
            <span className="flex items-center gap-0.5 text-[10px] text-blue-500">
              <MapPin className="w-2.5 h-2.5" /> {product.location}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Avatar className="w-5 h-5">
            <AvatarImage src={product.seller?.foto_perfil} className="object-cover" />
            <AvatarFallback className="text-[8px] bg-blue-900">{product.seller?.username?.[0]}</AvatarFallback>
          </Avatar>
          <span className="text-[11px] text-blue-400 truncate">{product.seller?.username}</span>
          <span className="text-[10px] text-blue-600 ml-auto">{timeAgo}</span>
        </div>
      </div>
    </motion.div>
  );
};

// ─── Create Product Modal ──────────────────────────────────
const CreateProductModal = ({ onClose, onCreate }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('other');
  const [condition, setCondition] = useState('good');
  const [location, setLocation] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [creating, setCreating] = useState(false);
  const fileRef = useRef(null);

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!title.trim() || !price) return;
    setCreating(true);
    await onCreate({ title, description, price: parseFloat(price), category, condition, location, imageFile });
    setCreating(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end md:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-slate-900 border border-white/10 rounded-t-3xl md:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Vender Producto</h2>
          <button onClick={onClose} className="text-blue-400"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Image Upload */}
          <div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => fileRef.current?.click()}
              className="w-full h-40 bg-slate-800 border-2 border-dashed border-slate-600 rounded-xl flex flex-col items-center justify-center overflow-hidden hover:border-cyan-500/50 transition-colors"
            >
              {imagePreview ? (
                <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
              ) : (
                <>
                  <Camera className="w-8 h-8 text-blue-500 mb-2" />
                  <span className="text-sm text-blue-400">Subir foto del producto</span>
                </>
              )}
            </motion.button>
          </div>

          <div>
            <label className="text-sm text-blue-200 mb-1 block">Título *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Caña Shimano..." maxLength={80}
              className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white placeholder-blue-500 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-sm text-blue-200 mb-1 block">Descripción</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Detalles..." rows={3} maxLength={500}
              className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white placeholder-blue-500 focus:ring-2 focus:ring-cyan-500 focus:outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-blue-200 mb-1 block">Precio *</label>
              <div className="relative">
                <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0" min={0} step={0.01}
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 pr-8 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 font-bold">€</span>
              </div>
            </div>
            <div>
              <label className="text-sm text-blue-200 mb-1 block">Ubicación</label>
              <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Madrid..."
                className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white placeholder-blue-500 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-blue-200 mb-2 block">Estado</label>
            <div className="flex flex-wrap gap-2">
              {CONDITIONS.map(c => (
                <button
                  key={c.id}
                  onClick={() => setCondition(c.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                    condition === c.id ? c.color : 'border-white/10 text-blue-400'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-blue-200 mb-2 block">Categoría</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                    category === cat.id
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : 'border-white/10 text-blue-400'
                  }`}
                >
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-white/10">
          <Button
            onClick={handleSubmit}
            disabled={creating || !title.trim() || !price}
            className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl h-12 font-semibold disabled:opacity-50"
          >
            {creating ? 'Publicando...' : '🛒 Publicar Producto'}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default MarketplacePage;
