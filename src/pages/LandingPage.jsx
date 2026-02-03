import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Fish, Users, Camera, TrendingUp, Heart, Star, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';

const LandingPage = () => {
  const features = [
    { icon: Camera, title: 'Comparte tus Capturas', description: 'Publica fotos y videos de tus mejores momentos de pesca en alta calidad.' },
    { icon: Users, title: 'Conecta con Pescadores', description: 'Sigue a otros entusiastas, forma grupos y expande tu red de pesca.' },
    { icon: TrendingUp, title: 'Registra tu Progreso', description: 'Mantén un historial detallado de especies, pesos y ubicaciones.' },
    { icon: Map, title: 'Descubre Lugares', description: 'Encuentra nuevos spots de pesca compartidos por la comunidad.' },
  ];

  return (
    <>
      <Helmet>
        <title>FishHub - La Comunidad de Pesca Definitiva</title>
        <meta name="description" content="Únete a FishHub, la plataforma social número uno para pescadores. Comparte, conecta y descubre." />
      </Helmet>

      <div className="min-h-screen bg-slate-950 font-sans">
        {/* Hero Section */}
        <section className="relative overflow-hidden min-h-screen flex items-center">
          {/* Background Gradient & Image Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-slate-900 to-cyan-950 z-0" />
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1544551763-46a013bb70d5')] bg-cover bg-center opacity-20 mix-blend-overlay z-0" />
          
          <div className="relative z-10 max-w-7xl mx-auto px-4 w-full pt-20">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
                <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                >
                <div className="inline-block px-4 py-2 bg-blue-500/10 rounded-full border border-blue-500/20 mb-6">
                    <span className="text-cyan-400 font-bold text-sm tracking-wider uppercase">🎣 La red social para pescadores</span>
                </div>
                <h1 className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight">
                    Tu pasión por la <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Pesca</span>, conectada.
                </h1>
                <p className="text-xl text-blue-200 mb-8 leading-relaxed max-w-lg">
                    FishHub es el lugar donde tus historias de pesca cobran vida. Únete a miles de pescadores que ya están compartiendo sus aventuras.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4">
                    <Link to="/signup">
                    <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-8 py-7 text-lg rounded-2xl font-bold shadow-xl shadow-cyan-900/30 transition-all hover:scale-105">
                        Empezar Ahora
                    </Button>
                    </Link>
                    <Link to="/login">
                    <Button size="lg" variant="outline" className="w-full sm:w-auto border-2 border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-cyan-400 px-8 py-7 text-lg rounded-2xl font-bold backdrop-blur-sm transition-all">
                        Iniciar Sesión
                    </Button>
                    </Link>
                </div>

                <div className="mt-10 flex items-center gap-4 text-sm text-blue-300 font-medium">
                    <div className="flex -space-x-2">
                        {[1,2,3,4].map(i => (
                            <div key={i} className="w-8 h-8 rounded-full bg-blue-800 border-2 border-slate-900" />
                        ))}
                    </div>
                    <p>+2,000 Pescadores se unieron este mes</p>
                </div>
                </motion.div>

                <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="relative hidden lg:block"
                >
                    <div className="relative z-10 bg-slate-900 rounded-3xl p-4 border border-white/10 shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500">
                         <img 
                            src="https://images.unsplash.com/photo-1506929562872-bb421503ef21?q=80&w=1368&auto=format&fit=crop" 
                            className="rounded-2xl w-full object-cover aspect-[4/5]"
                            alt="App Preview"
                         />
                         <div className="absolute bottom-8 left-8 right-8 bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20">
                             <div className="flex items-center gap-3 mb-2">
                                 <div className="w-10 h-10 rounded-full bg-cyan-500"></div>
                                 <div>
                                     <div className="h-2 w-24 bg-white rounded mb-1"></div>
                                     <div className="h-2 w-16 bg-white/50 rounded"></div>
                                 </div>
                             </div>
                             <div className="h-2 w-full bg-white/30 rounded"></div>
                         </div>
                    </div>
                    {/* Decorative blobs */}
                    <div className="absolute -top-10 -right-10 w-72 h-72 bg-cyan-500/30 rounded-full blur-3xl -z-10"></div>
                    <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-blue-600/30 rounded-full blur-3xl -z-10"></div>
                </motion.div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-slate-900 relative">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-16 max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Todo lo que necesitas para tu <span className="text-cyan-400">pesca</span></h2>
              <p className="text-xl text-blue-200">Diseñado por pescadores, para pescadores. FishHub combina las mejores herramientas sociales con utilidades específicas.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-slate-800/50 p-8 rounded-3xl border border-white/5 hover:border-cyan-500/30 hover:bg-slate-800 transition-all group"
                >
                  <div className="w-14 h-14 bg-blue-900/50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-cyan-500/20 transition-colors">
                    <feature.icon className="w-7 h-7 text-cyan-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                  <p className="text-blue-300 leading-relaxed">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-900 to-cyan-900"></div>
            <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
                <h2 className="text-4xl md:text-5xl font-black text-white mb-8">¿Listo para lanzar el anzuelo?</h2>
                <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">Únete hoy y forma parte de la comunidad de pesca de más rápido crecimiento en el mundo.</p>
                <Link to="/signup">
                    <Button size="lg" className="bg-white text-blue-900 hover:bg-blue-50 px-10 py-8 text-xl rounded-2xl font-bold shadow-2xl hover:scale-105 transition-transform">
                        Crear Cuenta Gratis
                    </Button>
                </Link>
                <p className="mt-6 text-sm text-blue-200 font-medium">No se requiere tarjeta de crédito</p>
            </div>
        </section>

        <footer className="bg-slate-950 py-12 border-t border-white/5">
            <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="text-2xl font-black text-white flex items-center gap-2">
                    <span className="text-3xl">🎣</span> FishHub
                </div>
                <div className="text-blue-400 text-sm">
                    © 2024 FishHub Inc. Todos los derechos reservados.
                </div>
                <div className="flex gap-6">
                    <a href="#" className="text-blue-400 hover:text-white transition-colors">Términos</a>
                    <a href="#" className="text-blue-400 hover:text-white transition-colors">Privacidad</a>
                    <a href="#" className="text-blue-400 hover:text-white transition-colors">Contacto</a>
                </div>
            </div>
        </footer>
      </div>
    </>
  );
};

export default LandingPage;