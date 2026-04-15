import { supabase } from '@/lib/customSupabaseClient';

const FISHING_KEYWORDS = [
  'pesca', 'pescando', 'pescador', 'carpa', 'carpas', 'carpfishing', 'carp fishing',
  'caña', 'anzuelo', 'cebo', 'embalse', 'lago', 'rio', 'río', 'pantano', 'boilie',
  'spod', 'bait', 'aparejo', 'captura', 'picada', 'siluros', 'barbo', 'lucio',
  'trucha', 'bass', 'black bass', 'siluro', 'orilla', 'montaje', 'carrete'
];

const OFF_TOPIC_KEYWORDS = [
  'casino', 'apuesta', 'apuestas', 'bitcoin', 'criptomoneda', 'crypto', 'nft',
  'forex', 'trading', 'adulto', 'xxx', 'porno', 'escort', 'droga', 'coca',
  'marihuana', 'arma', 'pistola', 'rifle', 'violencia extrema', 'hack', 'crack',
  'spam', 'multi nivel', 'mlm', 'politica', 'política partidista', 'campaña electoral',
  'futbol', 'fútbol', 'nba', 'ufc', 'moda', 'maquillaje', 'gossip', 'cotilleo'
];

const normalizeText = (value = '') =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const findMatches = (text, dictionary) => dictionary.filter((term) => text.includes(normalizeText(term)));

export const evaluateFishingOnlyContent = ({ text = '', category = '', tags = [] } = {}) => {
  const joined = [text, category, ...(Array.isArray(tags) ? tags : [])].filter(Boolean).join(' ');
  const normalized = normalizeText(joined);

  const fishingMatches = findMatches(normalized, FISHING_KEYWORDS);
  const offTopicMatches = findMatches(normalized, OFF_TOPIC_KEYWORDS);

  if (!normalized) {
    return {
      allowed: true,
      confidence: 0,
      reason: 'Sin texto para analizar',
      fishingMatches,
      offTopicMatches
    };
  }

  // Regla estricta: si hay señales fuertes off-topic y no hay contexto de pesca, bloquear.
  if (offTopicMatches.length > 0 && fishingMatches.length === 0) {
    return {
      allowed: false,
      confidence: 0.95,
      reason: 'Contenido detectado como no relacionado con pesca',
      fishingMatches,
      offTopicMatches
    };
  }

  // Si el contenido es largo y no aparece ninguna señal de pesca, se considera fuera de temática.
  if (normalized.length >= 25 && fishingMatches.length === 0) {
    return {
      allowed: false,
      confidence: 0.85,
      reason: 'No se detectaron referencias de pesca en el contenido',
      fishingMatches,
      offTopicMatches
    };
  }

  return {
    allowed: true,
    confidence: fishingMatches.length > 0 ? 0.9 : 0.6,
    reason: 'Contenido permitido en comunidad de pesca',
    fishingMatches,
    offTopicMatches
  };
};

export const enforceFishingOnlyPolicy = async ({
  userId,
  contentType,
  text,
  category,
  tags,
  imageUrl = null
}) => {
  const evaluation = evaluateFishingOnlyContent({ text, category, tags });

  if (evaluation.allowed) {
    return {
      allowed: true,
      blocked: false,
      evaluation
    };
  }

  const details = `Contenido fuera de temática de pesca (${contentType}). Motivo: ${evaluation.reason}.`;
  let banType = 'temporary_24h';

  try {
    const { data: infractionData, error: infractionError } = await supabase
      .rpc('create_user_infraction', {
        p_user_id: userId,
        p_violation_type: 'non_fishing_content',
        p_violation_details: details,
        p_image_url: imageUrl,
        p_detected_objects: [...evaluation.offTopicMatches, ...evaluation.fishingMatches],
        p_confidence: evaluation.confidence
      });

    if (infractionError) throw infractionError;

    if (Array.isArray(infractionData) && infractionData[0]?.ban_type) {
      banType = infractionData[0].ban_type;
    }
  } catch (error) {
    console.error('Error applying fishing-only infraction:', error);
  }

  // Registro best-effort para auditoria, aunque la tabla no exista en todos los entornos.
  try {
    await supabase.from('fishing_moderation_events').insert({
      user_id: userId,
      content_type: contentType,
      content_excerpt: (text || '').slice(0, 500),
      category,
      is_allowed: false,
      confidence: evaluation.confidence,
      reason: evaluation.reason,
      detected_keywords: [...evaluation.offTopicMatches, ...evaluation.fishingMatches]
    });
  } catch {
    // Silent on purpose.
  }

  return {
    allowed: false,
    blocked: true,
    banType,
    evaluation,
    message: 'Contenido bloqueado: esta comunidad es exclusivamente de pesca. Se aplico un baneo automatico segun normas.'
  };
};
