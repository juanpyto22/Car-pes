import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, Plus, Search, Filter, Star, MapPin, 
  Euro, Heart, Share2, MessageCircle, Camera, Tag,
  Package, Truck, Shield, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const MarketplacePage = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  const [products, setProducts] = useState([]);
  const [myProducts, setMyProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [priceRange, setPriceRange] = useState([0, 1000]);

  const productCategories = [
    { id: 'all', name: 'Todos', icon: '🏪' },
    { id: 'rods', name: 'Cañas', icon: '🎣' },
    { id: 'reels', name: 'Carretes', icon: '🎯' },
    { id: 'lures', name: 'Señuelos', icon: '🐟' },
    { id: 'tackle', name: 'Accesorios', icon: '🪝' },
    { id: 'electronics', name: 'Electrónicos', icon: '📱' },
    { id: 'clothing', name: 'Ropa', icon: '👕' },
    { id: 'boats', name: 'Embarcaciones', icon: '🚤' },
    { id: 'other', name: 'Otros', icon: '📦' }
  ];

  useEffect(() => {
    fetchProducts();
    fetchMyProducts();
  }, [user]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('marketplace_products')
        .select(`
          *,
          seller:users!seller_id(id, username, foto_perfil, created_at),
          images:product_images(*),
          avg_rating,
          review_count,
          is_favorite:product_favorites!left(user_id)
        `)
        .eq('status', 'available')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchMyProducts = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('marketplace_products')
        .select(`
          *,
          images:product_images(*),
          avg_rating,
          review_count
        `)
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMyProducts(data || []);
    } catch (error) {
      console.error('Error fetching my products:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (productId) => {
    if (!user?.id) return;

    try {
      const { data: existing } = await supabase
        .from('product_favorites')
        .select('id')
        .eq('product_id', productId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('product_favorites')
          .delete()
          .eq('id', existing.id);
      } else {
        await supabase
          .from('product_favorites')
          .insert({ product_id: productId, user_id: user.id });
      }

      fetchProducts(); // Refresh
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const ProductCard = ({ product, showSellerInfo = true, size = "default" }) => {
    const isSmall = size === "small";
    const isFavorited = product.is_favorite?.some(f => f.user_id === user?.id);

    return (
      <motion.div
        whileHover={{ y: -4 }}
        className="bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden shadow-lg hover:shadow-cyan-500/10 transition-all cursor-pointer"
        onClick={() => setSelectedProduct(product)}
      >
        {/* Product Image */}
        <div className={`relative ${isSmall ? 'h-40' : 'h-48'} overflow-hidden group`}>
          <img
            src={product.images?.[0]?.image_url || '/api/placeholder/400/300'}
            alt={product.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          
          {/* Overlay Actions */}
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="absolute top-2 right-2 flex gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="w-8 h-8 bg-black/50 hover:bg-black/70 text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(product.id);
                }}
              >
                <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current text-red-500' : ''}`} />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="w-8 h-8 bg-black/50 hover:bg-black/70 text-white"
              >
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Price Tag */}
          <div className="absolute bottom-2 left-2">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-3 py-1 rounded-full">
              <span className="text-white font-bold text-lg">
                {product.price}€
              </span>
            </div>
          </div>

          {/* Condition Badge */}
          <div className="absolute top-2 left-2">
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
              product.condition === 'new' 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : product.condition === 'like_new'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
            }`}>
              {product.condition === 'new' ? 'Nuevo' : 
               product.condition === 'like_new' ? 'Como nuevo' : 'Usado'}
            </div>
          </div>
        </div>

        {/* Product Info */}
        <div className={`p-${isSmall ? '4' : '6'} space-y-3`}>
          <div>
            <h3 className={`font-bold text-white mb-1 line-clamp-2 ${
              isSmall ? 'text-sm' : 'text-lg'
            }`}>
              {product.title}
            </h3>
            <p className="text-blue-300 text-sm capitalize">
              {productCategories.find(c => c.id === product.category)?.name || 'Otros'}
            </p>
          </div>

          {/* Rating */}
          {product.avg_rating && (
            <div className="flex items-center gap-2">
              <div className="flex text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`w-3 h-3 ${i < Math.floor(product.avg_rating) ? 'fill-current' : ''}`} 
                  />
                ))}
              </div>
              <span className="text-xs text-blue-400">
                ({product.review_count || 0})
              </span>
            </div>
          )}

          {/* Description */}
          <p className={`text-blue-200 leading-relaxed ${
            isSmall ? 'text-xs line-clamp-2' : 'text-sm line-clamp-3'
          }`}>
            {product.description}
          </p>

          {/* Seller Info */}
          {showSellerInfo && (
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <div className="flex items-center gap-2">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={product.seller?.foto_perfil} />
                  <AvatarFallback className="text-xs">
                    {product.seller?.username?.[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="text-blue-400 text-sm">
                  @{product.seller?.username}
                </span>
              </div>

              <div className="flex items-center gap-1 text-blue-300 text-xs">
                <Clock className="w-3 h-3" />
                {new Date(product.created_at).toLocaleDateString()}
              </div>
            </div>
          )}

          {/* Location */}
          {product.location && (
            <div className="flex items-center gap-1 text-blue-300 text-xs">
              <MapPin className="w-3 h-3" />
              {product.location}
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  const ProductDetailModal = ({ product, onClose }) => {
    if (!product) return null;

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="grid md:grid-cols-2 gap-0">
              {/* Images */}
              <div className="relative">
                <img
                  src={product.images?.[0]?.image_url || '/api/placeholder/600/400'}
                  alt={product.title}
                  className="w-full h-80 md:h-full object-cover"
                />
                {product.images?.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                    {product.images.slice(0, 4).map((img, idx) => (
                      <div key={idx} className="w-2 h-2 bg-white/50 rounded-full" />
                    ))}
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="p-8 space-y-6">
                {/* Header */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-3 py-1 bg-cyan-900/30 text-cyan-300 text-sm rounded-full">
                      {productCategories.find(c => c.id === product.category)?.name}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={onClose}
                      className="text-blue-400 hover:text-white"
                    >
                      ×
                    </Button>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">{product.title}</h2>
                  <div className="text-3xl font-bold text-green-400">
                    {product.price}€
                  </div>
                </div>

                {/* Seller */}
                <div className="flex items-center gap-4 p-4 bg-slate-800/30 rounded-xl">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={product.seller?.foto_perfil} />
                    <AvatarFallback>{product.seller?.username?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-white font-medium">@{product.seller?.username}</p>
                    <p className="text-blue-400 text-sm">
                      Vendedor desde {new Date(product.seller?.created_at).getFullYear()}
                    </p>
                  </div>
                  <Button size="sm" variant="outline">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Contactar
                  </Button>
                </div>

                {/* Description */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Descripción</h3>
                  <p className="text-blue-200 leading-relaxed">
                    {product.description}
                  </p>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800/30 rounded-xl p-4">
                    <h4 className="text-white font-medium mb-2">Estado</h4>
                    <p className="text-blue-300 text-sm capitalize">
                      {product.condition === 'new' ? 'Nuevo' : 
                       product.condition === 'like_new' ? 'Como nuevo' : 'Usado'}
                    </p>
                  </div>
                  
                  <div className="bg-slate-800/30 rounded-xl p-4">
                    <h4 className="text-white font-medium mb-2">Ubicación</h4>
                    <p className="text-blue-300 text-sm">
                      {product.location || 'No especificada'}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <Button className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-lg py-3">
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Comprar Ahora
                  </Button>
                  
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1">
                      <Heart className="w-4 h-4 mr-2" />
                      Favoritos
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Consultar
                    </Button>
                  </div>
                </div>

                {/* Trust Indicators */}
                <div className="flex items-center justify-around p-4 bg-slate-800/20 rounded-xl">
                  <div className="text-center">
                    <Shield className="w-6 h-6 text-green-400 mx-auto mb-1" />
                    <span className="text-xs text-blue-300">Pago Seguro</span>
                  </div>
                  <div className="text-center">
                    <Truck className="w-6 h-6 text-blue-400 mx-auto mb-1" />
                    <span className="text-xs text-blue-300">Envío Rápido</span>
                  </div>
                  <div className="text-center">
                    <Package className="w-6 h-6 text-purple-400 mx-auto mb-1" />
                    <span className="text-xs text-blue-300">Garantizado</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  };

  const CreateProductModal = ({ isOpen, onClose }) => {
    const [formData, setFormData] = useState({
      title: '',
      description: '',
      price: '',
      category: 'rods',
      condition: 'like_new',
      location: ''
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!user?.id) return;

      setSubmitting(true);
      try {
        const { error } = await supabase
          .from('marketplace_products')
          .insert({
            ...formData,
            price: parseFloat(formData.price),
            seller_id: user.id,
            status: 'available'
          });

        if (error) throw error;

        toast({ title: "¡Producto publicado exitosamente!" });
        onClose();
        fetchMyProducts();
        fetchProducts();
      } catch (error) {
        console.error('Error creating product:', error);
        toast({
          variant: "destructive",
          title: "Error al publicar producto"
        });
      } finally {
        setSubmitting(false);
      }
    };

    if (!isOpen) return null;

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <h2 className="text-xl font-bold text-white mb-4">Vender Producto</h2>

              <div>
                <label className="block text-sm font-medium text-blue-200 mb-2">
                  Título del Producto *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white"
                  placeholder="Ej: Caña de Carpfishing 3.6m"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-blue-200 mb-2">
                    Precio €*
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-200 mb-2">
                    Categoría
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white"
                  >
                    {productCategories.filter(c => c.id !== 'all').map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-200 mb-2">
                  Estado
                </label>
                <select
                  value={formData.condition}
                  onChange={(e) => setFormData({...formData, condition: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white"
                >
                  <option value="new">Nuevo</option>
                  <option value="like_new">Como nuevo</option>
                  <option value="used">Usado</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-200 mb-2">
                  Ubicación
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white"
                  placeholder="Ciudad, Provincia"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-200 mb-2">
                  Descripción *
                </label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white resize-none"
                  rows={4}
                  placeholder="Describe tu producto, estado, características..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={submitting}
                  className="flex-1 bg-green-600 hover:bg-green-500"
                >
                  {submitting ? 'Publicando...' : 'Publicar'}
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesPrice = product.price >= priceRange[0] && product.price <= priceRange[1];
    
    return matchesSearch && matchesCategory && matchesPrice;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-cyan-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Marketplace - Car-Pes</title>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 pb-20">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Marketplace</h1>
              <p className="text-blue-400">Compra y vende equipos de pesca</p>
            </div>
            
            <Button 
              onClick={() => setShowCreateProduct(true)}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Vender
            </Button>
          </div>

          {/* Search & Filters */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
            <div className="lg:col-span-2 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar productos..."
                className="w-full bg-slate-900/50 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-white placeholder-blue-400 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-900/50 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
            >
              {productCategories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>

            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filtros
            </Button>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="all">Todos ({filteredProducts.length})</TabsTrigger>
              <TabsTrigger value="my-products">Mis Ventas ({myProducts.length})</TabsTrigger>
              <TabsTrigger value="favorites">Favoritos</TabsTrigger>
            </TabsList>

            {/* All Products Tab */}
            <TabsContent value="all">
              {filteredProducts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredProducts.map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-slate-900/30 rounded-2xl border border-white/10">
                  <ShoppingCart className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">No se encontraron productos</h3>
                  <p className="text-blue-400">Ajusta tus filtros o crea una nueva búsqueda</p>
                </div>
              )}
            </TabsContent>

            {/* My Products Tab */}
            <TabsContent value="my-products">
              {myProducts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {myProducts.map(product => (
                    <ProductCard 
                      key={product.id} 
                      product={{...product, seller: { username: profile?.username, foto_perfil: profile?.foto_perfil }}} 
                      showSellerInfo={false}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-slate-900/30 rounded-2xl border border-white/10">
                  <Package className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">No has publicado productos</h3>
                  <p className="text-blue-400 mb-6">
                    Empieza a vender tus equipos de pesca
                  </p>
                  <Button 
                    onClick={() => setShowCreateProduct(true)}
                    className="bg-green-600 hover:bg-green-500"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Publicar Producto
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Favorites Tab */}
            <TabsContent value="favorites">
              <div className="text-center py-12 bg-slate-900/30 rounded-2xl border border-white/10">
                <Heart className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Sin favoritos</h3>
                <p className="text-blue-400">Los productos que marques como favoritos aparecerán aquí</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Product Detail Modal */}
        {selectedProduct && (
          <ProductDetailModal 
            product={selectedProduct} 
            onClose={() => setSelectedProduct(null)} 
          />
        )}

        {/* Create Product Modal */}
        <CreateProductModal 
          isOpen={showCreateProduct} 
          onClose={() => setShowCreateProduct(false)} 
        />
      </div>
    </>
  );
};

export default MarketplacePage;