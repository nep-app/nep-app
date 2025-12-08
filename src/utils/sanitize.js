/**
 * Funções de sanitização para prevenir XSS e injeções maliciosas
 */

// Whitelist de cores permitidas para badges
const ALLOWED_COLORS = [
  'green', 'blue', 'purple', 'indigo', 'pink', 'yellow', 'orange',
  'red', 'gray', 'teal', 'cyan', 'emerald', 'violet', 'fuchsia',
  'rose', 'amber', 'lime', 'sky', 'slate'
];

// Whitelist de emojis permitidos (apenas emojis seguros para badges)
const ALLOWED_EMOJIS = [
  // Natureza e símbolos
  '🌱', '💚', '🎯', '🌟', '💜', '🧠', '🔮', '🌙', '💎', '💙',
  '💫', '✨', '⭐', '🎭', '📋', '🔍', '🏆', '📖', '⚖️', '📉',
  '🥇', '🥈', '🥉', '💪', '🔥', '🎨', '🌈', '🎪', '🎬', '🎵',
  // Atividades e objetos
  '📚', '📝', '📊', '📈', '🎓', '🔬', '🔭', '🎸', '🎹', '🎤',
  '🎧', '🎮', '🎲', '🎯', '🎪', '🎭', '🎨', '🎬', '🎵', '🎶',
  // Comida e bebida
  '🍽️', '☕', '🍕', '🍔', '🍟', '🍗', '🍖', '🍱', '🍜', '🍝',
  // Saúde e bem-estar
  '💊', '💉', '🩺', '🌡️', '😴', '🛏️', '🏃', '🚴', '🏊', '🧘',
  '💧', '🥤', '🥗', '🥑', '🥦', '🥕', '🍎', '🍊', '🍋', '🍌',
  // Emoções e pessoas
  '😊', '😌', '😔', '😢', '😠', '😰', '😱', '😴', '😎', '🤗',
  '🤔', '😴', '😇', '🙂', '🙃', '😐', '😑', '😶', '🤐', '😮',
  // Outros úteis
  '👥', '👤', '👍', '👎', '✅', '❌', '⚠️', '🔔', '🔕', '📱',
  '💻', '⌚', '📅', '📆', '📌', '📍', '🔑', '🔒', '🔓', '🔐'
];

/**
 * Sanitiza uma cor de badge
 * @param {string} color - Cor a ser validada
 * @returns {string} - Cor segura ou cor padrão 'gray'
 */
export function sanitizeBadgeColor(color) {
  if (typeof color !== 'string') {
    console.warn('Badge color não é string:', color);
    return 'gray';
  }

  const cleanColor = color.toLowerCase().trim();

  if (!ALLOWED_COLORS.includes(cleanColor)) {
    console.warn(`Badge color não permitida: "${color}". Usando 'gray'.`);
    return 'gray';
  }

  return cleanColor;
}

/**
 * Sanitiza um ícone/emoji de badge
 * @param {string} icon - Emoji a ser validado
 * @returns {string} - Emoji seguro ou emoji padrão '⚠️'
 */
export function sanitizeBadgeIcon(icon) {
  if (typeof icon !== 'string') {
    console.warn('Badge icon não é string:', icon);
    return '⚠️';
  }

  const cleanIcon = icon.trim();

  // Verificar se é um emoji permitido
  if (!ALLOWED_EMOJIS.includes(cleanIcon)) {
    console.warn(`Badge icon não permitido: "${icon}". Usando '⚠️'.`);
    return '⚠️';
  }

  return cleanIcon;
}

/**
 * Sanitiza um objeto badge completo
 * @param {Object} badge - Badge a ser sanitizado
 * @returns {Object} - Badge sanitizado
 */
export function sanitizeBadge(badge) {
  if (!badge || typeof badge !== 'object') {
    console.error('Badge inválido:', badge);
    return {
      id: 'invalid',
      title: 'Badge Inválido',
      description: 'Erro ao processar badge',
      icon: '⚠️',
      color: 'gray'
    };
  }

  return {
    ...badge,
    icon: sanitizeBadgeIcon(badge.icon),
    color: sanitizeBadgeColor(badge.color)
  };
}

/**
 * Sanitiza uma lista de badges
 * @param {Array} badges - Lista de badges a serem sanitizados
 * @returns {Array} - Lista de badges sanitizados
 */
export function sanitizeBadgeList(badges) {
  if (!Array.isArray(badges)) {
    console.error('Badge list não é array:', badges);
    return [];
  }

  return badges.map(badge => sanitizeBadge(badge));
}
