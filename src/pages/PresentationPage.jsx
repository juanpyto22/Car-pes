import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Lock, Fish, Sparkles } from 'lucide-react';
import '../styles/presentation.css';

const PASSWORD = '1234';

const slides = [
  {
    id: 1,
    type: 'cover',
    title: 'Car-Pes',
    subtitle: 'La Comunidad de Pesca Digital',
    description: 'Conectando pescadores, compartiendo historias y creando una comunidad viva alrededor del mar, los pantanos y los ríos.',
  },
  {
    id: 2,
    type: 'index',
    title: 'Índice de Presentación',
    items: [
      'Problema detectado',
      'Objetivo del proyecto',
      'Solución propuesta',
      'Funcionalidades principales',
      'Mapas interactivos',
      'Gamificación y progreso',
      'Moderación y seguridad',
      'Tecnología utilizada',
      'Impacto del proyecto',
      'Cierre y conclusiones',
    ],
  },
  {
    id: 3,
    type: 'problem',
    title: 'El problema que resuelve Car-Pes',
    points: [
      'Las redes sociales generales no están pensadas para la cultura de la pesca.',
      'No existe una referencia clara para compartir capturas, spots y experiencias.',
      'La comunidad necesita herramientas específicas y seguras para organizarse.',
      'Faltan espacios donde información, comunidad y utilidad vayan de la mano.',
    ],
  },
  {
    id: 4,
    type: 'vision',
    title: 'Misión y visión',
    mission: 'Construir una plataforma especializada donde cualquier pescador pueda compartir conocimiento, mostrar sus capturas y relacionarse con una comunidad activa.',
    vision: 'Convertir Car-Pes en el punto de encuentro de referencia para la pesca en el entorno digital.',
  },
  {
    id: 5,
    type: 'solution',
    title: 'La solución',
    features: [
      'Red social vertical para pescadores.',
      'Feed visual centrado en capturas, historias y actividad real.',
      'Mapa de spots con información útil y filtrable.',
      'Sistema de mensajes, comentarios y seguimiento social.',
      'Interfaz preparada para móvil, comunidad y uso diario.',
    ],
  },
  {
    id: 6,
    type: 'features',
    title: 'Funciones principales',
    categories: [
      { icon: '📸', title: 'Publicaciones', desc: 'Capturas, fotos y vídeos con contexto real.' },
      { icon: '🧭', title: 'Exploración', desc: 'Búsqueda de usuarios, contenidos y ubicaciones.' },
      { icon: '💬', title: 'Interacción', desc: 'Comentarios, likes, guardados y seguimiento.' },
      { icon: '📱', title: 'Uso móvil', desc: 'Navegación cómoda pensada para salir al campo.' },
    ],
  },
  {
    id: 7,
    type: 'maps',
    title: 'Mapas interactivos',
    description: 'El mapa es una pieza clave del proyecto porque permite organizar la información por localización real.',
    features: [
      'Guardar y consultar spots de pesca.',
      'Ver zonas activas y referencias útiles.',
      'Filtrar por tipo de pesca y actividad.',
      'Compartir información con otros pescadores.',
      'Unificar experiencia social y utilidad práctica.',
    ],
  },
  {
    id: 8,
    type: 'gamification',
    title: 'Gamificación y progreso',
    elements: [
      { title: 'Logros', desc: 'Insignias por actividad y capturas destacadas.' },
      { title: 'Niveles', desc: 'Progresión visible dentro de la comunidad.' },
      { title: 'Recompensas', desc: 'Incentivos para participar más y mejor.' },
      { title: 'Retos', desc: 'Dinámicas para mantener el interés del usuario.' },
    ],
  },
  {
    id: 9,
    type: 'safety',
    title: 'Moderación y seguridad',
    points: [
      'Panel de administración con herramientas de control.',
      'Sistema de reportes para contenido no apropiado.',
      'Normas orientadas a pesca responsable y comunidad sana.',
      'Perfiles y contenidos con criterios de confianza.',
      'Protección de la experiencia de usuario y de la plataforma.',
    ],
  },
  {
    id: 10,
    type: 'tech',
    title: 'Tecnología utilizada',
    frontend: ['React + Vite', 'Tailwind CSS', 'Framer Motion', 'Lucide Icons'],
    backend: ['Supabase', 'PostgreSQL', 'Funciones Edge'],
    hosting: ['Vercel', 'Supabase Cloud'],
  },
  {
    id: 11,
    type: 'impact',
    title: 'Impacto y cierre',
    metrics: [
      { label: 'Comunidad', value: 'Global', desc: 'Enfocada en pescadores de todos los niveles.' },
      { label: 'Valor', value: 'Útil', desc: 'Combina red social, mapa y comunidad.' },
      { label: 'Visión', value: 'Escalable', desc: 'Pensada para crecer y evolucionar.' },
      { label: 'Resultado', value: 'Diferencial', desc: 'Una propuesta especializada y coherente.' },
    ],
  },
];

const PresentationPage = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [accessGranted, setAccessGranted] = useState(false);
  const [slideScale, setSlideScale] = useState(1);
  const [showFishTransition, setShowFishTransition] = useState(false);
  const [fishTransitionKey, setFishTransitionKey] = useState(0);
  const [fishDirection, setFishDirection] = useState('forward');
  const [fishTransition, setFishTransition] = useState(null);
  const stageRef = useRef(null);
  const slideRef = useRef(null);
  const previousSlideRef = useRef(0);
  const prevButtonRef = useRef(null);
  const nextButtonRef = useRef(null);

  useEffect(() => {
    if (!accessGranted) {
      return;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'ArrowRight') {
        launchFishTransition('forward');
        setCurrentSlide((prev) => (prev + 1) % slides.length);
      }

      if (event.key === 'ArrowLeft') {
        launchFishTransition('backward');
        setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [accessGranted]);

  useEffect(() => {
    if (!accessGranted) {
      return;
    }

    const calculateScale = () => {
      if (!stageRef.current || !slideRef.current) {
        return;
      }

      const stageWidth = stageRef.current.clientWidth - 8;
      const stageHeight = stageRef.current.clientHeight - 8;
      const contentWidth = slideRef.current.scrollWidth;
      const contentHeight = slideRef.current.scrollHeight;

      const widthScale = stageWidth / contentWidth;
      const heightScale = stageHeight / contentHeight;
      const nextScale = Math.min(1, widthScale, heightScale);

      if (Number.isFinite(nextScale) && nextScale > 0) {
        setSlideScale(nextScale);
      }
    };

    const rafId = window.requestAnimationFrame(calculateScale);
    const timeoutId = window.setTimeout(calculateScale, 120);

    window.addEventListener('resize', calculateScale);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
      window.removeEventListener('resize', calculateScale);
    };
  }, [accessGranted, currentSlide]);

  useEffect(() => {
    if (!accessGranted) {
      previousSlideRef.current = currentSlide;
      setShowFishTransition(false);
      setFishTransition(null);
      return;
    }

    if (previousSlideRef.current === currentSlide) {
      return;
    }

    setFishTransitionKey((prev) => prev + 1);
    setShowFishTransition(true);
    previousSlideRef.current = currentSlide;

    const timeoutId = window.setTimeout(() => {
      setShowFishTransition(false);
    }, 900);

    return () => window.clearTimeout(timeoutId);
  }, [accessGranted, currentSlide]);

  const launchFishTransition = (direction) => {
    const sourceButton = direction === 'forward' ? prevButtonRef.current : nextButtonRef.current;
    const targetButton = direction === 'forward' ? nextButtonRef.current : prevButtonRef.current;

    setFishDirection(direction);

    if (!sourceButton || !targetButton) {
      setFishTransition(null);
      return;
    }

    const sourceRect = sourceButton.getBoundingClientRect();
    const targetRect = targetButton.getBoundingClientRect();
    const startX = sourceRect.left + sourceRect.width / 2;
    const startY = sourceRect.top + sourceRect.height / 2;
    const endX = targetRect.left + targetRect.width / 2;
    const endY = targetRect.top + targetRect.height / 2;
    const distanceX = Math.abs(endX - startX);
    const lift = Math.min(180, Math.max(90, distanceX * 0.22));
    const midX = (startX + endX) / 2;
    const controlY = Math.min(startY, endY) - lift;
    const path = `M ${startX} ${startY} C ${startX + (direction === 'forward' ? 40 : -40)} ${controlY}, ${midX} ${controlY}, ${endX} ${endY}`;

    setFishTransition({
      startX,
      startY,
      endX,
      endY,
      apexX: midX + (direction === 'forward' ? 24 : -24),
      apexY: Math.min(startY, endY) - lift,
      path,
    });
  };

  const handlePasswordSubmit = (event) => {
    event.preventDefault();

    if (password.trim() === PASSWORD) {
      setAccessGranted(true);
      setPassword('');
      setPasswordError('');
      return;
    }

    setPasswordError('Contraseña incorrecta. Prueba de nuevo.');
  };

  const nextSlide = () => {
    launchFishTransition('forward');
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    launchFishTransition('backward');
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToSlide = (index) => {
    if (index === currentSlide) {
      return;
    }

    launchFishTransition(index > currentSlide ? 'forward' : 'backward');
    setCurrentSlide(index);
  };

  const currentSlideData = slides[currentSlide];

  return (
    <div className="presentation-container">
      <div className="presentation-background">
        <div className="bg-glow bg-glow-left" />
        <div className="bg-glow bg-glow-right" />
        <div className="wave wave-a" />
        <div className="wave wave-b" />
        <div className="fish fish-a">🐟</div>
        <div className="fish fish-b">🐠</div>
        <div className="bubble bubble-a" />
        <div className="bubble bubble-b" />
        <div className="bubble bubble-c" />
      </div>

      {!accessGranted ? (
        <div className="gate-screen">
          <div className="gate-card">
            <div className="gate-badge">
              <Lock size={22} />
            </div>
            <h1>Acceso a la presentación</h1>
            <p>Introduce la contraseña para ver la presentación dinámica de Car-Pes.</p>
            <form className="gate-form" onSubmit={handlePasswordSubmit}>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Contraseña"
                autoComplete="off"
                autoFocus
              />
              {passwordError ? <span className="gate-error">{passwordError}</span> : null}
              <button type="submit">Entrar</button>
            </form>
          </div>
        </div>
      ) : (
        <div className="presentation-shell">
          <header className="presentation-topbar">
            <div className="brand-lockup">
              <div className="brand-icon">
                <Fish size={22} />
              </div>
              <div>
                <h2>Car-Pes</h2>
                <p>Presentación del proyecto</p>
              </div>
            </div>
            <div className="topbar-meta">
              <Sparkles size={16} />
              <span>Diapositiva {currentSlide + 1} de {slides.length}</span>
            </div>
          </header>

          <main className="presentation-stage" ref={stageRef}>
            <div className="slide-fit-frame">
              <div
                className="slide-fit"
                ref={slideRef}
                style={{ transform: `translate(-50%, -50%) scale(${slideScale})` }}
              >
                {currentSlideData.type === 'cover' && (
                  <section className="slide-card slide-cover">
                    <div className="cover-hero">
                      <div className="cover-logo">
                        <span>🎣</span>
                      </div>
                      <div className="cover-copy">
                        <span className="cover-kicker">TFG · Proyecto web</span>
                        <h1>{currentSlideData.title}</h1>
                        <h2>{currentSlideData.subtitle}</h2>
                        <p>{currentSlideData.description}</p>
                      </div>
                    </div>
                    <div className="cover-pills">
                      <span>Red social</span>
                      <span>Pesca</span>
                      <span>Mapa</span>
                      <span>Comunidad</span>
                    </div>
                  </section>
                )}

                {currentSlideData.type === 'index' && (
                  <section className="slide-card slide-index">
                    <div className="slide-heading-block">
                      <span className="slide-kicker">Ruta de la presentación</span>
                      <h2>{currentSlideData.title}</h2>
                      <p>Todo el recorrido de la exposición, organizado para avanzar con claridad.</p>
                    </div>
                    <div className="index-grid">
                      {currentSlideData.items.map((item, idx) => (
                        <button key={item} className="index-item" onClick={() => goToSlide(Math.min(idx + 2, slides.length - 1))} type="button">
                          <span className="index-number">{String(idx + 1).padStart(2, '0')}</span>
                          <span className="index-text">{item}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {currentSlideData.type === 'problem' && (
                  <section className="slide-card">
                    <div className="slide-heading-block">
                      <span className="slide-kicker">Contexto</span>
                      <h2>{currentSlideData.title}</h2>
                    </div>
                    <div className="bullet-panel problem-panel compact-panel">
                      {currentSlideData.points.map((point) => (
                        <div key={point} className="bullet-item compact-bullet">
                          <span className="bullet-mark">•</span>
                          <p>{point}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {currentSlideData.type === 'vision' && (
                  <section className="slide-card">
                    <div className="slide-heading-block">
                      <span className="slide-kicker">Dirección</span>
                      <h2>{currentSlideData.title}</h2>
                    </div>
                    <div className="vision-grid compact-grid">
                      <article className="info-panel mission-panel compact-panel">
                        <h3>🎯 Misión</h3>
                        <p>{currentSlideData.mission}</p>
                      </article>
                      <article className="info-panel vision-panel compact-panel">
                        <h3>🌟 Visión</h3>
                        <p>{currentSlideData.vision}</p>
                      </article>
                    </div>
                  </section>
                )}

                {currentSlideData.type === 'solution' && (
                  <section className="slide-card">
                    <div className="slide-heading-block">
                      <span className="slide-kicker">Propuesta</span>
                      <h2>{currentSlideData.title}</h2>
                    </div>
                    <div className="feature-list compact-list">
                      {currentSlideData.features.map((feature) => (
                        <div key={feature} className="feature-row compact-row">
                          <span className="feature-icon">✓</span>
                          <p>{feature}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {currentSlideData.type === 'features' && (
                  <section className="slide-card">
                    <div className="slide-heading-block">
                      <span className="slide-kicker">Uso diario</span>
                      <h2>{currentSlideData.title}</h2>
                    </div>
                    <div className="feature-grid compact-feature-grid">
                      {currentSlideData.categories.map((category) => (
                        <article key={category.title} className="feature-card compact-card">
                          <div className="feature-card-icon">{category.icon}</div>
                          <h3>{category.title}</h3>
                          <p>{category.desc}</p>
                        </article>
                      ))}
                    </div>
                  </section>
                )}

                {currentSlideData.type === 'maps' && (
                  <section className="slide-card">
                    <div className="slide-heading-block">
                      <span className="slide-kicker">Ubicación</span>
                      <h2>{currentSlideData.title}</h2>
                      <p>{currentSlideData.description}</p>
                    </div>
                    <div className="map-panel compact-panel-grid">
                      {currentSlideData.features.map((feature, idx) => (
                        <div key={feature} className="map-row compact-row">
                          <span className="map-number">{idx + 1}</span>
                          <p>{feature}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {currentSlideData.type === 'gamification' && (
                  <section className="slide-card">
                    <div className="slide-heading-block">
                      <span className="slide-kicker">Progreso</span>
                      <h2>{currentSlideData.title}</h2>
                    </div>
                    <div className="gamification-grid compact-feature-grid">
                      {currentSlideData.elements.map((element) => (
                        <article key={element.title} className="gamification-card compact-card">
                          <h3>{element.title}</h3>
                          <p>{element.desc}</p>
                        </article>
                      ))}
                    </div>
                  </section>
                )}

                {currentSlideData.type === 'safety' && (
                  <section className="slide-card">
                    <div className="slide-heading-block">
                      <span className="slide-kicker">Control</span>
                      <h2>{currentSlideData.title}</h2>
                    </div>
                    <div className="bullet-panel safety-panel compact-panel">
                      {currentSlideData.points.map((point) => (
                        <div key={point} className="bullet-item compact-bullet">
                          <span className="bullet-mark bullet-shield">🛡</span>
                          <p>{point}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {currentSlideData.type === 'tech' && (
                  <section className="slide-card">
                    <div className="slide-heading-block">
                      <span className="slide-kicker">Stack</span>
                      <h2>{currentSlideData.title}</h2>
                    </div>
                    <div className="tech-grid compact-tech-grid">
                      <article className="tech-panel compact-panel">
                        <h3>Frontend</h3>
                        <div className="tech-list">
                          {currentSlideData.frontend.map((tech) => (
                            <span key={tech} className="tech-chip">{tech}</span>
                          ))}
                        </div>
                      </article>
                      <article className="tech-panel compact-panel">
                        <h3>Backend</h3>
                        <div className="tech-list">
                          {currentSlideData.backend.map((tech) => (
                            <span key={tech} className="tech-chip">{tech}</span>
                          ))}
                        </div>
                      </article>
                      <article className="tech-panel compact-panel">
                        <h3>Hosting</h3>
                        <div className="tech-list">
                          {currentSlideData.hosting.map((tech) => (
                            <span key={tech} className="tech-chip">{tech}</span>
                          ))}
                        </div>
                      </article>
                    </div>
                  </section>
                )}

                {currentSlideData.type === 'impact' && (
                  <section className="slide-card">
                    <div className="slide-heading-block">
                      <span className="slide-kicker">Resultado</span>
                      <h2>{currentSlideData.title}</h2>
                    </div>
                    <div className="impact-grid compact-feature-grid">
                      {currentSlideData.metrics.map((metric) => (
                        <article key={metric.label} className="metric-card compact-card">
                          <strong>{metric.value}</strong>
                          <h3>{metric.label}</h3>
                          <p>{metric.desc}</p>
                        </article>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </div>
            {showFishTransition && fishTransition ? (
              <div
                key={fishTransitionKey}
                className={`slide-transition-fish ${fishDirection === 'backward' ? 'backward' : 'forward'}`}
                aria-hidden="true"
                style={{
                  '--start-x': `${fishTransition.startX}px`,
                  '--start-y': `${fishTransition.startY}px`,
                  '--end-x': `${fishTransition.endX}px`,
                  '--end-y': `${fishTransition.endY}px`,
                  '--apex-x': `${fishTransition.apexX}px`,
                  '--apex-y': `${fishTransition.apexY}px`,
                  '--fish-path': `path('${fishTransition.path}')`,
                  '--fish-flip': fishDirection === 'backward' ? -1 : 1,
                }}
              >
                <span className="jump-fish">🐟</span>
                <span className="jump-splash splash-left" />
                <span className="jump-splash splash-center" />
                <span className="jump-splash splash-right" />
                <span className="jump-ripple" />
              </div>
            ) : null}
          </main>

          <footer className="presentation-footer">
            <button ref={prevButtonRef} className="nav-btn" onClick={prevSlide} type="button" aria-label="Diapositiva anterior">
              <ChevronLeft size={22} />
              <span>Anterior</span>
            </button>

            <div className="slide-dots" aria-label="Navegación de diapositivas">
              {slides.map((slide, idx) => (
                <button
                  key={slide.id}
                  type="button"
                  className={`dot ${idx === currentSlide ? 'active' : ''}`}
                  onClick={() => goToSlide(idx)}
                  aria-label={`Ir a la diapositiva ${idx + 1}`}
                />
              ))}
            </div>

            <button ref={nextButtonRef} className="nav-btn" onClick={nextSlide} type="button" aria-label="Siguiente diapositiva">
              <span>Siguiente</span>
              <ChevronRight size={22} />
            </button>
          </footer>
        </div>
      )}
    </div>
  );
};

export default PresentationPage;
