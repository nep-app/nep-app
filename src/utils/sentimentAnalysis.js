// ==========================================
// CÓDIGO DE SENTIMENT ANALYSIS V2.0
// ==========================================

// Versão V2.0 - com normalização de acentos e tratamento inteligente de palavrões
function _calculateRawSentiment(text) {
  const normalize = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  function tokenize(t) {
    if (!t) return [];
    const cleaned = String(t).replace(/\r?\n|\r/g, ' ').replace(/["""()<>[\]{},;:!?@#€$%&*+=\/\\|~`]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    return cleaned.split(' ').map(w => normalize(w.trim())).filter(Boolean);
  }

  const POSITIVE_WORDS_RAW = {
    'excelente': 3, 'otimo': 3, 'fantastico': 3, 'incrivel': 3, 'maravilhoso': 3, 'perfeito': 3, 'espetacular': 3, 'magnifico': 3,
    'brutal': 3, 'lindo': 3, 'amei': 3, 'adoro': 3, 'adorei': 3, 'demais': 3, 'brilhante': 3, 'impecavel': 3,
    'bom': 2, 'boa': 2, 'feliz': 2, 'alegre': 2, 'contente': 2, 'satisfeito': 2, 'satisfeita': 2, 'melhor': 2, 'positivo': 2, 'positiva': 2,
    'confiante': 2, 'motivado': 2, 'motivada': 2, 'orgulhoso': 2, 'orgulhosa': 2, 'grato': 2, 'grata': 2, 'fixe': 2, 'bacano': 2, 'top': 2, 'nice': 2, 'capaz': 2,
    'giro': 2, 'bestial': 2, 'calmo': 2, 'calma': 2, 'tranquilo': 2, 'tranquila': 2, 'relaxado': 2, 'relaxada': 2,
    'focado': 2, 'focada': 2, 'produtivo': 2, 'produtiva': 2, 'equilibrado': 2, 'equilibrada': 2, 'energico': 2, 'energica': 2,
    'bem': 1, 'ok': 1, 'okay': 1, 'razoavel': 1, 'aceitavel': 1, 'normal': 1, 'esperancoso': 1, 'otimista': 1, 'consegui': 1, 'conseguir': 1, 'melhorar': 1,
    'progresso': 1, 'sobrevivi': 1, 'safe': 1, 'beca': 1, 'finalmente': 1, 'melhorzinho': 1, 'decente': 1, 'estavel': 1, 'vontade': 2
  };

  const NEGATIVE_WORDS_RAW = {
    'estupida': 3, 'estupido': 3, 'burra': 3, 'idiota': 3, 'imbecil': 3, 'atrasada': 3, 'atrasado': 3, 'retardada': 3, 'morrer': 3, 'morte': 3,
    'horrivel': 3, 'pessimo': 3, 'terrivel': 3,
    'mal': 2, 'triste': 2, 'ansioso': 2, 'ansiosa': 2, 'preocupado': 2, 'cansado': 2, 'cansada': 2, 'frustrado': 2, 'frustrada': 2,
    'stressado': 2, 'stressada': 2, 'estressado': 2, 'estressada': 2, 'inseguro': 2, 'insegura': 2, 'sozinho': 2, 'sozinha': 2, 'vazio': 2,
    'dificil': 2, 'complicado': 2, 'pior': 2, 'negativo': 2, 'raiva': 2, 'fodido': 2, 'fodida': 2, 'lixado': 2, 'lixada': 2,
    'doi': 2, 'dor': 2, 'doer': 2, 'azia': 2, 'enjoo': 2, 'vomitar': 2, 'doente': 2, 'arrependido': 2, 'arrependida': 2, 'mania': 2,
    'nervoso': 2, 'nervosa': 2, 'irritado': 2, 'irritada': 2, 'zangado': 2, 'zangada': 2, 'infeliz': 2,
    'deprimido': 2, 'deprimida': 2, 'esgotado': 2, 'esgotada': 2, 'exausto': 2, 'exausta': 2, 'fraco': 2, 'fraca': 2,
    'cansaco': 1, 'chato': 1, 'chata': 1, 'aborrecido': 1, 'sono': 1, 'confuso': 1, 'confusa': 1, 'incerto': 1, 'duvida': 1, 'problema': 1,
    'meh': 1, 'nhe': 1, 'down': 1, 'estranha': 1, 'estranho': 1, 'medo': 2, 'desconfortavel': 1,
    'desconcentrado': 1, 'desconcentrada': 1, 'distraido': 1, 'distraida': 1, 'desanimado': 1, 'desanimada': 1, 'saudades': 1
  };

  const SWEAR_WORDS = new Set(['merda', 'caralho', 'crl', 'fdss', 'fds', 'fodasse', 'foda-se', 'porra']);
  const NEGATIONS_RAW = ['nao', 'nunca', 'nem', 'jamais', 'nenhum', 'nenhuma', 'sem', 'tampouco', 'sequer', 'nada', 'naosei'];
  const INTENSIFIERS_RAW = { 'muito': 1.5, 'bastante': 1.4, 'super': 1.6, 'extremamente': 1.8, 'incrivelmente': 1.8, 'demasiado': 1.5, 'realmente': 1.3, 'profundamente': 1.5, 'completamente': 1.4, 'tao': 1.3, 'bue': 1.5, 'mega': 1.5, 'ganda': 1.5, 'tanto': 1.3, 'cheia': 1.3, 'cheio': 1.3, 'sempre': 1.4 };
  const REDUCERS_RAW = { 'pouco': 0.5, 'meio': 0.6, 'maisoumenos': 0.6, 'ligeiramente': 0.5, 'raramente': 0.4, 'assim': 0.8, 'lol': 0.5 };
  const SELF_EVAL_VERBS = new Set(['sou', 'estou', 'to', 'sinto', 'ta', 'estava']);
  const NEGATIVE_EXPRESSIONS = new Set(['que', 'uma', 'um', 'este', 'esta', 'isto', 'isso']);

  const POSITIVE_WORDS = {}, NEGATIVE_WORDS = {}, INTENSIFIERS = {}, REDUCERS = {};
  Object.entries(POSITIVE_WORDS_RAW).forEach(([k, v]) => POSITIVE_WORDS[normalize(k)] = v);
  Object.entries(NEGATIVE_WORDS_RAW).forEach(([k, v]) => NEGATIVE_WORDS[normalize(k)] = v);
  const NEGATIONS = new Set(NEGATIONS_RAW.map(normalize));
  Object.entries(INTENSIFIERS_RAW).forEach(([k, v]) => INTENSIFIERS[normalize(k)] = v);
  Object.entries(REDUCERS_RAW).forEach(([k, v]) => REDUCERS[normalize(k)] = v);

  function isSwear(token) { return SWEAR_WORDS.has(token); }

  function analyzeWordInContext(words, index, windowSize = 5) {
    const word = words[index];
    if (isSwear(word)) return 0;
    let baseScore = 0;
    if (POSITIVE_WORDS[word]) baseScore = POSITIVE_WORDS[word];
    else if (NEGATIVE_WORDS[word]) baseScore = -NEGATIVE_WORDS[word];
    else return 0;

    let multiplier = 1, hasNegation = false;
    const start = Math.max(0, index - windowSize);
    for (let i = index - 1; i >= start; i--) {
      const ctx = words[i];
      if (NEGATIONS.has(ctx)) {
        const next = words[i + 1] || '';
        if (!(next === 'sei' || next === 'se' || next === 'naosei')) hasNegation = !hasNegation;
      }
      if (INTENSIFIERS[ctx]) multiplier *= INTENSIFIERS[ctx];
      if (REDUCERS[ctx]) multiplier *= REDUCERS[ctx];
    }

    let score = baseScore * multiplier;
    if (hasNegation) score *= -1;
    const prev = words[index - 1] || '';
    if (SELF_EVAL_VERBS.has(prev) && score < 0) score = score * 1.8;
    return score;
  }

  if (!text || String(text).trim().length === 0) {
    return { score: 0, magnitude: 0, classification: 'neutral', positiveCount: 0, negativeCount: 0, neutralCount: 0, details: [] };
  }

  const words = tokenize(text);
  const details = [];
  let totalScore = 0, positiveCount = 0, negativeCount = 0, neutralCount = 0;

  for (let i = 0; i < words.length; i++) {
    if (words[i] === 'consegui' && words[i+1] === 'nao' && words[i+2] === 'conseguir') {
      totalScore += 1.5; positiveCount++;
      details.push({ word: 'consegui nao conseguir', score: 1.5, context: words.slice(Math.max(0, i-3), i+3).join(' ') });
      i += 2; continue;
    }

    if (isSwear(words[i])) {
      const prev = words[i-1] || '';
      if (SELF_EVAL_VERBS.has(prev)) {
        const val = -3 * 1.5;
        totalScore += val; negativeCount++;
        details.push({ word: words[i], score: val, context: words.slice(Math.max(0, i-3), i+1).join(' ') });
      } else if (NEGATIVE_EXPRESSIONS.has(prev)) {
        const val = -2;
        totalScore += val; negativeCount++;
        details.push({ word: words[i], score: val, context: words.slice(Math.max(0, i-3), i+1).join(' ') });
      } else {
        neutralCount++;
        details.push({ word: words[i], score: 0, context: words.slice(Math.max(0, i-3), i+1).join(' ') });
      }
      continue;
    }

    const scoreForWord = analyzeWordInContext(words, i);
    if (scoreForWord !== 0) {
      totalScore += scoreForWord;
      details.push({ word: words[i], score: scoreForWord, context: words.slice(Math.max(0, i-3), i+1).join(' ') });
      if (scoreForWord > 0) positiveCount++; else negativeCount++;
    } else {
      neutralCount++;
    }
  }

  const magnitude = details.reduce((sum, d) => sum + Math.abs(d.score), 0);
  let classification = 'neutral';
  if (totalScore > 1.5) classification = 'very_positive';
  else if (totalScore > 0.3) classification = 'positive';
  else if (totalScore < -1.5) classification = 'very_negative';
  else if (totalScore < -0.3) classification = 'negative';

  return { score: Number(totalScore.toFixed(3)), magnitude: Number(magnitude.toFixed(3)), classification, positiveCount, negativeCount, neutralCount, details };
}

// Esta é a função principal que o teu código já chama!
export function analyzeMultipleNotes(notes) {
  const validNotes = notes.filter(n => n && n.trim().length > 0);

  if (validNotes.length === 0) {
    return {
      overall: 'neutral', score: 0, magnitude: 0, trend: 'stable', noteCount: 0,
      distribution: { very_positive: 0, positive: 0, neutral: 0, negative: 0, very_negative: 0 }
    };
  }

  // Chama a função interna renomeada
  const analyses = validNotes.map(note => _calculateRawSentiment(note));

  const totalScore = analyses.reduce((sum, a) => sum + a.score, 0);
  const avgScore = totalScore / analyses.length;
  const totalMagnitude = analyses.reduce((sum, a) => sum + a.magnitude, 0);
  const avgMagnitude = totalMagnitude / analyses.length;

  const distribution = {
    very_positive: analyses.filter(a => a.classification === 'very_positive').length,
    positive: analyses.filter(a => a.classification === 'positive').length,
    neutral: analyses.filter(a => a.classification === 'neutral').length,
    negative: analyses.filter(a => a.classification === 'negative').length,
    very_negative: analyses.filter(a => a.classification === 'very_negative').length
  };

  let overall = 'neutral';
  if (avgScore > 1.5) overall = 'very_positive';
  else if (avgScore > 0.3) overall = 'positive';
  else if (avgScore < -1.5) overall = 'very_negative';
  else if (avgScore < -0.3) overall = 'negative';

  let trend = 'stable';
  if (analyses.length >= 4) {
    const midpoint = Math.floor(analyses.length / 2);
    const firstHalfAvg = analyses.slice(0, midpoint).reduce((sum, a) => sum + a.score, 0) / midpoint;
    const secondHalfAvg = analyses.slice(midpoint).reduce((sum, a) => sum + a.score, 0) / (analyses.length - midpoint);
    const diff = secondHalfAvg - firstHalfAvg;
    if (diff > 1) trend = 'improving';
    else if (diff < -1) trend = 'worsening';
  }

  return { overall, score: avgScore, magnitude: avgMagnitude, trend, noteCount: validNotes.length, distribution, analyses };
}

export function identifyThemes(notes) {
  const themes = {
    sleep: { keywords: ['dormir', 'sono', 'acordar', 'cama', 'insónia', 'insonia', 'sonolento'], count: 0 },
    stress: { keywords: ['stress', 'stressado', 'estresse', 'estressado', 'ansioso', 'preocupado', 'nervoso'], count: 0 },
    energy: { keywords: ['energia', 'cansado', 'cansaço', 'cansaco', 'fadiga', 'exausto', 'animado'], count: 0 },
    mood: { keywords: ['humor', 'triste', 'feliz', 'alegre', 'deprimido', 'irritado', 'zangado'], count: 0 },
    focus: { keywords: ['concentração', 'concentracao', 'foco', 'atenção', 'atencao', 'distração', 'distracao', 'confuso'], count: 0 },
    social: { keywords: ['amigos', 'família', 'familia', 'sozinho', 'isolado', 'pessoas', 'convívio', 'convivio'], count: 0 },
    health: { keywords: ['saúde', 'saude', 'dor', 'sintoma', 'corpo', 'físico', 'fisico', 'doente'], count: 0 }
  };

  const allText = notes.join(' ').toLowerCase();

  Object.keys(themes).forEach(theme => {
    themes[theme].keywords.forEach(keyword => {
      const regex = new RegExp('\\b' + keyword + '\\b', 'g');
      const matches = allText.match(regex);
      if (matches) {
        themes[theme].count += matches.length;
      }
    });
  });

  return themes;
}

export function getSentimentDescription(classification) {
  const descriptions = { very_positive: 'muito positivo', positive: 'positivo', neutral: 'neutro', negative: 'negativo', very_negative: 'muito negativo' };
  return descriptions[classification] || 'neutro';
}

export function getTrendDescription(trend) {
  const descriptions = { improving: 'a melhorar', stable: 'estável', worsening: 'a piorar' };
  return descriptions[trend] || 'estável';
}
