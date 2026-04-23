import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Volume2, VolumeX, Play, Pause } from 'lucide-react';
import '/styles/presentation.css';

const PresentationPage = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [volumeOn, setVolumeOn] = useState(false);

  const slides = [
    {
      id: 1,
      type: 'cover',
      title: 'Car-Pes',
      subtitle: 'La Comunidad de Pesca Digital',
      description: 'Conectando pescadores, compartiendo historias, viviendo la pasión',
    },
    {
      id: 2,
      type: 'index',
      title: 'Índice de Presentación',
      items: [
        'Problema Identificado',
        'Visión y Misión',
        'Solución Principal',
        'Características Principales',
        'Mapas Interactivos',
        'Sistemas de Gamificación',
        'Moderación y Seguridad',
        'Funcionalidades Avanzadas',
        'Tecnología Utilizada',
        'Impacto y Proyecciones',
      ],
    },
    {
      id: 3,
      type: 'problem',
      title: 'El Problema',
      points: [
        'Las redes sociales generales no entienden las necesidades de los pescadores',
        'No existen espacios dedicados para compartir spots de pesca',
        'Falta de herramientas para organizarse por intereses comunes',
        'Contenido no moderado específicamente para la comunidad de pesca',
        'Experiencias aisladas sin comunidad real',
      ],
    },
    {
      id: 4,
      type: 'vision',
      title: 'Misión y Visión',
      mission: 'Crear una plataforma especializada que conecte pescadores de todo nivel para compartir conocimiento, experiencias y fomentar una comunidad segura y responsable.',
      vision: 'Ser la red social referente mundial para la comunidad de pesca, con herramientas prácticas y una comunidad vibrante.',
    },
    {
      id: 5,
      type: 'solution',
      title: 'Nuestra Solución',
      features: [
        'Red social especializada en pesca con feed personalizado',
        'Sistema de mapas interactivos para compartir spots de pesca',
        'Perfil integral del pescador con historial de capturas',
        'Mensajería privada y grupos de pesca temáticos',
        'Sistema de notificaciones inteligentes',
      ],
    },
    {
      id: 6,
      type: 'features',
      title: 'Características Principales',
      categories: [
        { icon: '🐟', title: 'Publicaciones', desc: 'Compartir capturas con foto, video y descripción' },
        { icon: '🗺️', title: 'Mapas', desc: 'Geolocalización de spots de pesca' },
        { icon: '❤️', title: 'Interacción', desc: 'Likes, comentarios y salvados' },
        { icon: '💬', title: 'Mensajería', desc: 'Comunicación directa con otros pescadores' },
      ],
    },
    {
      id: 7,
      type: 'maps',
      title: 'Mapas Interactivos',
      description: 'Sistema de mapas en tiempo real donde los pescadores pueden:',
      features: [
        'Marcar spots de pesca con coordenadas exactas',
        'Compartir información sobre tipos de peces disponibles',
        'Ver actividad reciente de otros usuarios en la zona',
        'Cargar históricos de capturas y condiciones',
        'Filtrar por tipo de pesca (caña, mosca, etc)',
      ],
    },
    {
      id: 8,
      type: 'gamification',
      title: 'Sistema de Gamificación',
      elements: [
        { title: 'Logros', desc: 'Desbloquea insignias por tus capturas épicas' },
        { title: 'Batalla Pase', desc: 'Progresa y gana recompensas mensuales' },
        { title: 'Niveles', desc: 'Sube de nivel conforme ganas experiencia' },
        { title: 'Competiciones', desc: 'Participa en torneos y desafíos comunitarios' },
        { title: 'Marketplace', desc: 'Compra y vende equipo con otros usuarios' },
      ],
    },
    {
      id: 9,
      type: 'safety',
      title: 'Moderación y Seguridad',
      points: [
        '✓ Panel administrativo avanzado con herramientas de moderación',
        '✓ Sistema automático de detección de contenido dañino',
        '✓ Reportes de usuarios y contenido inapropiado',
        '✓ Políticas claras específicas para pesca responsable',
        '✓ Perfiles verificados con sistema de reputación',
        '✓ Privacidad controlada por el usuario',
      ],
    },
    {
      id: 10,
      type: 'tech',
      title: 'Tecnología Utilizada',
      frontend: ['React + Vite', 'Tailwind CSS', 'Framer Motion', 'Lucide Icons'],
      backend: ['Supabase (BaaS)', 'PostgreSQL', 'Funciones Edge'],
      hosting: ['Vercel (Frontend)', 'Supabase Cloud'],
    },
    {
      id: 11,
      type: 'impact',
      title: 'Impacto y Proyecciones',
      metrics: [
        { label: 'Comunidad Potencial', value: '50M+', desc: 'Pescadores amateurs en el mundo' },
        { label: 'Mercado Objetivo', value: '$15B', desc: 'Industria de equipos de pesca' },
        { label: 'Enganche Esperado', value: '30%+', desc: 'De usuarios activos mensuales' },
        { label: 'Modelo Revenue', value: 'Freemium', desc: 'Premium features + marketplace' },
      ],
    },
  ];

  useEffect(() => {
    if (!autoPlay) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [autoPlay, slides.length]);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  const goToSlide = (index) => setCurrentSlide(index);

  const currentSlideData = slides[currentSlide];

  return (
    <div className="presentation-container">
      {/* Animated Background */}
      <div className="presentation-background">
        <div className="wave wave1"></div>
        <div className="wave wave2"></div>
        <div className="wave wave3"></div>
        <div className="fish fish1">🐟</div>
        <div className="fish fish2">🐠</div>
        <div className="fish fish3">🐟</div>
        <div className="bubble bubble1"></div>
        <div className="bubble bubble2"></div>
        <div className="bubble bubble3"></div>
      </div>

      {/* Slide Container */}
      <div className="presentation-content">
        {currentSlideData.type === 'cover' && (
          <div className="slide slide-cover">
            <div className="cover-content">
              <div className="cover-logo">
                <span className="logo-emoji">🎣</span>
              </div>
              <h1 className="cover-title">{currentSlideData.title}</h1>
              <p className="cover-subtitle">{currentSlideData.subtitle}</p>
              <p className="cover-description">{currentSlideData.description}</p>
              <div className="slide-counter">Diapositiva 1 de {slides.length}</div>
            </div>
          </div>
        )}

        {currentSlideData.type === 'index' && (
          <div className="slide slide-index">
            <h2 className="slide-title">{currentSlideData.title}</h2>
            <div className="index-grid">
              {currentSlideData.items.map((item, idx) => (
                <div key={idx} className="index-item" style={{ animationDelay: `${idx * 0.1}s` }}>
                  <span className="index-number">{idx + 1}</span>
                  <span className="index-text">{item}</span>
                </div>
              ))}
            </div>
            <div className="slide-counter">Diapositiva {currentSlide + 1} de {slides.length}</div>
          </div>
        )}

        {currentSlideData.type === 'problem' && (
          <div className="slide slide-problem">
            <h2 className="slide-title">{currentSlideData.title}</h2>
            <div className="points-container">
              {currentSlideData.points.map((point, idx) => (
                <div key={idx} className="point-item" style={{ animationDelay: `${idx * 0.15}s` }}>
                  <div className="point-icon">⚠️</div>
                  <p>{point}</p>
                </div>
              ))}
            </div>
            <div className="slide-counter">Diapositiva {currentSlide + 1} de {slides.length}</div>
          </div>
        )}

        {currentSlideData.type === 'vision' && (
          <div className="slide slide-vision">
            <h2 className="slide-title">{currentSlideData.title}</h2>
            <div className="vision-boxes">
              <div className="vision-box mission-box">
                <h3>🎯 Misión</h3>
                <p>{currentSlideData.mission}</p>
              </div>
              <div className="vision-box vision-box-main">
                <h3>🌟 Visión</h3>
                <p>{currentSlideData.vision}</p>
              </div>
            </div>
            <div className="slide-counter">Diapositiva {currentSlide + 1} de {slides.length}</div>
          </div>
        )}

        {currentSlideData.type === 'solution' && (
          <div className="slide slide-solution">
            <h2 className="slide-title">{currentSlideData.title}</h2>
            <div className="features-list">
              {currentSlideData.features.map((feature, idx) => (
                <div key={idx} className="feature-item" style={{ animationDelay: `${idx * 0.1}s` }}>
                  <div className="feature-check">✓</div>
                  <p>{feature}</p>
                </div>
              ))}
            </div>
            <div className="slide-counter">Diapositiva {currentSlide + 1} de {slides.length}</div>
          </div>
        )}

        {currentSlideData.type === 'features' && (
          <div className="slide slide-features">
            <h2 className="slide-title">{currentSlideData.title}</h2>
            <div className="features-grid">
              {currentSlideData.categories.map((cat, idx) => (
                <div key={idx} className="feature-card" style={{ animationDelay: `${idx * 0.1}s` }}>
                  <div className="feature-icon">{cat.icon}</div>
                  <h3>{cat.title}</h3>
                  <p>{cat.desc}</p>
                </div>
              ))}
            </div>
            <div className="slide-counter">Diapositiva {currentSlide + 1} de {slides.length}</div>
          </div>
        )}

        {currentSlideData.type === 'maps' && (
          <div className="slide slide-maps">
            <h2 className="slide-title">{currentSlideData.title}</h2>
            <p className="slide-description">{currentSlideData.description}</p>
            <div className="maps-features">
              {currentSlideData.features.map((feature, idx) => (
                <div key={idx} className="map-feature" style={{ animationDelay: `${idx * 0.1}s` }}>
                  <span className="map-icon">📍</span>
                  <span>{feature}</span>
                </div>
              ))}
            </div>
            <div className="slide-counter">Diapositiva {currentSlide + 1} de {slides.length}</div>
          </div>
        )}

        {currentSlideData.type === 'gamification' && (
          <div className="slide slide-gamification">
            <h2 className="slide-title">{currentSlideData.title}</h2>
            <div className="gamification-grid">
              {currentSlideData.elements.map((element, idx) => (
                <div key={idx} className="gamification-card" style={{ animationDelay: `${idx * 0.1}s` }}>
                  <h3>{element.title}</h3>
                  <p>{element.desc}</p>
                </div>
              ))}
            </div>
            <div className="slide-counter">Diapositiva {currentSlide + 1} de {slides.length}</div>
          </div>
        )}

        {currentSlideData.type === 'safety' && (
          <div className="slide slide-safety">
            <h2 className="slide-title">{currentSlideData.title}</h2>
            <div className="safety-list">
              {currentSlideData.points.map((point, idx) => (
                <div key={idx} className="safety-point" style={{ animationDelay: `${idx * 0.1}s` }}>
                  <span className="safety-check">🛡️</span>
                  <p>{point}</p>
                </div>
              ))}
            </div>
            <div className="slide-counter">Diapositiva {currentSlide + 1} de {slides.length}</div>
          </div>
        )}

        {currentSlideData.type === 'tech' && (
          <div className="slide slide-tech">
            <h2 className="slide-title">{currentSlideData.title}</h2>
            <div className="tech-grid">
              <div className="tech-section">
                <h3>Frontend</h3>
                <div className="tech-list">
                  {currentSlideData.frontend.map((tech, idx) => (
                    <div key={idx} className="tech-item">
                      {tech}
                    </div>
                  ))}
                </div>
              </div>
              <div className="tech-section">
                <h3>Backend</h3>
                <div className="tech-list">
                  {currentSlideData.backend.map((tech, idx) => (
                    <div key={idx} className="tech-item">
                      {tech}
                    </div>
                  ))}
                </div>
              </div>
              <div className="tech-section">
                <h3>Hosting</h3>
                <div className="tech-list">
                  {currentSlideData.hosting.map((tech, idx) => (
                    <div key={idx} className="tech-item">
                      {tech}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="slide-counter">Diapositiva {currentSlide + 1} de {slides.length}</div>
          </div>
        )}

        {currentSlideData.type === 'impact' && (
          <div className="slide slide-impact">
            <h2 className="slide-title">{currentSlideData.title}</h2>
            <div className="impact-metrics">
              {currentSlideData.metrics.map((metric, idx) => (
                <div key={idx} className="metric-card" style={{ animationDelay: `${idx * 0.15}s` }}>
                  <div className="metric-value">{metric.value}</div>
                  <div className="metric-label">{metric.label}</div>
                  <div className="metric-desc">{metric.desc}</div>
                </div>
              ))}
            </div>
            <div className="slide-counter">Diapositiva {currentSlide + 1} de {slides.length}</div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="presentation-controls">
        <button className="control-btn prev-btn" onClick={prevSlide} title="Diapositiva anterior">
          <ChevronLeft size={24} />
        </button>

        <div className="slide-dots">
          {slides.map((_, idx) => (
            <button
              key={idx}
              className={`dot ${idx === currentSlide ? 'active' : ''}`}
              onClick={() => goToSlide(idx)}
              title={`Ir a diapositiva ${idx + 1}`}
            />
          ))}
        </div>

        <button className="control-btn next-btn" onClick={nextSlide} title="Siguiente diapositiva">
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Top Controls */}
      <div className="presentation-top-controls">
        <button
          className={`top-control-btn ${autoPlay ? 'active' : ''}`}
          onClick={() => setAutoPlay(!autoPlay)}
          title={autoPlay ? 'Pausar presentación' : 'Reproducir presentación'}
        >
          {autoPlay ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <button
          className={`top-control-btn ${volumeOn ? 'active' : ''}`}
          onClick={() => setVolumeOn(!volumeOn)}
          title={volumeOn ? 'Silenciar' : 'Activar sonido'}
        >
          {volumeOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
      </div>

      {/* Keyboard hint */}
      <div className="keyboard-hint">
        Usa ← → o haz clic en los puntos para navegar
      </div>
    </div>
  );
};

export default PresentationPage;
