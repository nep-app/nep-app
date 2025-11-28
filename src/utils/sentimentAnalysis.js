/**
 * Advanced Sentiment Analysis System
 * Handles negations, intensifiers, weighted words, and contextual analysis
 */

// Palavras positivas com pesos (1 = fraco, 2 = médio, 3 = forte)
const POSITIVE_WORDS = {
  // Força 3 (muito positivo)
  'excelente': 3, 'ótimo': 3, 'óptimo': 3, 'fantástico': 3, 'incrível': 3,
  'maravilhoso': 3, 'perfeito': 3, 'espetacular': 3, 'magnífico': 3,
  'excepcional': 3, 'incrivel': 3, 'fantastico': 3, 'espetacular': 3,

  // Força 2 (positivo)
  'bom': 2, 'boa': 2, 'feliz': 2, 'alegre': 2, 'contente': 2,
  'satisfeito': 2, 'satisfeita': 2, 'melhor': 2, 'positivo': 2, 'positiva': 2,
  'agradável': 2, 'agradavel': 2, 'tranquilo': 2, 'tranquila': 2,
  'calmo': 2, 'calma': 2, 'confiante': 2, 'motivado': 2, 'motivada': 2,
  'orgulhoso': 2, 'orgulhosa': 2, 'grato': 2, 'grata': 2,

  // Força 1 (levemente positivo)
  'bem': 1, 'ok': 1, 'okay': 1, 'razoável': 1, 'razoavel': 1,
  'aceitável': 1, 'aceitavel': 1, 'normal': 1, 'esperançoso': 1, 'esperancoso': 1,
  'otimista': 1, 'consegui': 1, 'conseguir': 1, 'melhorar': 1, 'progresso': 1
};

// Palavras negativas com pesos (1 = fraco, 2 = médio, 3 = forte)
const NEGATIVE_WORDS = {
  // Força 3 (muito negativo)
  'horrível': 3, 'horrivel': 3, 'péssimo': 3, 'pessimo': 3, 'terrível': 3,
  'terrivel': 3, 'deprimido': 3, 'deprimida': 3, 'desesperado': 3, 'desesperada': 3,
  'miserável': 3, 'miseravel': 3, 'impossível': 3, 'impossivel': 3,

  // Força 2 (negativo)
  'mal': 2, 'triste': 2, 'ansioso': 2, 'ansiosa': 2, 'preocupado': 2,
  'preocupada': 2, 'cansado': 2, 'cansada': 2, 'frustrado': 2, 'frustrada': 2,
  'stressado': 2, 'stressada': 2, 'estressado': 2, 'estressada': 2,
  'inseguro': 2, 'insegura': 2, 'sozinho': 2, 'sozinha': 2, 'vazio': 2, 'vazia': 2,
  'difícil': 2, 'dificil': 2, 'complicado': 2, 'complicada': 2,
  'pior': 2, 'negativo': 2, 'negativa': 2,

  // Força 1 (levemente negativo)
  'cansaço': 1, 'cansaco': 1, 'chato': 1, 'chata': 1, 'aborrecido': 1,
  'aborrecida': 1, 'confuso': 1, 'confusa': 1, 'incerto': 1, 'incerta': 1,
  'dúvida': 1, 'duvida': 1, 'problema': 1, 'falhar': 1, 'falhei': 1
};

// Negações que invertem o sentimento
const NEGATIONS = [
  'não', 'nao', 'nunca', 'nem', 'jamais', 'nenhum', 'nenhuma',
  'sem', 'tampouco', 'sequer'
];

// Intensificadores que multiplicam o peso
const INTENSIFIERS = {
  'muito': 1.5,
  'bastante': 1.4,
  'super': 1.6,
  'extremamente': 1.8,
  'incrivelmente': 1.8,
  'inacreditavelmente': 1.8,
  'demasiado': 1.5,
  'realmente': 1.3,
  'verdadeiramente': 1.3,
  'profundamente': 1.5,
  'completamente': 1.4,
  'totalmente': 1.4
};

// Redutores que diminuem o peso
const REDUCERS = {
  'pouco': 0.5,
  'meio': 0.6,
  'mais ou menos': 0.6,
  'um pouco': 0.7,
  'ligeiramente': 0.5,
  'raramente': 0.4,
  'às vezes': 0.6,
  'as vezes': 0.6
};

/**
 * Tokeniza texto em palavras, removendo pontuação
 */
function tokenize(text) {
  return text.toLowerCase()
    .replace(/[.,;!?:]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0);
}

/**
 * Analisa sentimento de uma janela de palavras (contexto)
 * @param {string[]} words - Array de palavras
 * @param {number} index - Índice da palavra atual
 * @param {number} windowSize - Tamanho da janela de contexto
 * @returns {number} Score de sentimento
 */
function analyzeWordInContext(words, index, windowSize = 3) {
  const word = words[index];
  let score = 0;
  let multiplier = 1;
  let hasNegation = false;

  // Verificar se é palavra de sentimento
  if (POSITIVE_WORDS[word]) {
    score = POSITIVE_WORDS[word];
  } else if (NEGATIVE_WORDS[word]) {
    score = -NEGATIVE_WORDS[word];
  } else {
    return 0; // Palavra neutra
  }

  // Analisar contexto ANTES da palavra (negações e intensificadores)
  const contextBefore = words.slice(Math.max(0, index - windowSize), index);

  for (let i = contextBefore.length - 1; i >= 0; i--) {
    const contextWord = contextBefore[i];

    // Verificar negação
    if (NEGATIONS.includes(contextWord)) {
      hasNegation = !hasNegation; // Dupla negação = positivo
    }

    // Verificar intensificador
    if (INTENSIFIERS[contextWord]) {
      multiplier *= INTENSIFIERS[contextWord];
    }

    // Verificar redutor
    if (REDUCERS[contextWord]) {
      multiplier *= REDUCERS[contextWord];
    }
  }

  // Aplicar multiplicador
  score *= multiplier;

  // Aplicar negação (inverte o sinal)
  if (hasNegation) {
    score *= -1;
  }

  return score;
}

/**
 * Analisa sentimento de um texto completo
 * @param {string} text - Texto para analisar
 * @returns {Object} Resultado da análise
 */
export function analyzeSentiment(text) {
  if (!text || text.trim().length === 0) {
    return {
      score: 0,
      magnitude: 0,
      classification: 'neutral',
      positiveCount: 0,
      negativeCount: 0,
      neutralCount: 0,
      details: []
    };
  }

  const words = tokenize(text);
  const details = [];
  let totalScore = 0;
  let positiveCount = 0;
  let negativeCount = 0;
  let neutralCount = 0;

  // Analisar cada palavra no contexto
  for (let i = 0; i < words.length; i++) {
    const wordScore = analyzeWordInContext(words, i);

    if (wordScore !== 0) {
      totalScore += wordScore;
      details.push({
        word: words[i],
        score: wordScore,
        context: words.slice(Math.max(0, i - 3), i + 1).join(' ')
      });

      if (wordScore > 0) {
        positiveCount++;
      } else {
        negativeCount++;
      }
    } else {
      neutralCount++;
    }
  }

  // Calcular magnitude (intensidade total do sentimento)
  const magnitude = details.reduce((sum, d) => sum + Math.abs(d.score), 0);

  // Classificar sentimento
  let classification = 'neutral';
  if (totalScore > 2) {
    classification = 'very_positive';
  } else if (totalScore > 0.5) {
    classification = 'positive';
  } else if (totalScore < -2) {
    classification = 'very_negative';
  } else if (totalScore < -0.5) {
    classification = 'negative';
  }

  return {
    score: totalScore,
    magnitude,
    classification,
    positiveCount,
    negativeCount,
    neutralCount,
    details
  };
}

/**
 * Analisa sentimento de múltiplas notas e retorna análise agregada
 * @param {string[]} notes - Array de notas/textos
 * @returns {Object} Análise agregada
 */
export function analyzeMultipleNotes(notes) {
  const validNotes = notes.filter(n => n && n.trim().length > 0);

  if (validNotes.length === 0) {
    return {
      overall: 'neutral',
      score: 0,
      magnitude: 0,
      trend: 'stable',
      noteCount: 0,
      distribution: {
        very_positive: 0,
        positive: 0,
        neutral: 0,
        negative: 0,
        very_negative: 0
      }
    };
  }

  const analyses = validNotes.map(note => analyzeSentiment(note));

  const totalScore = analyses.reduce((sum, a) => sum + a.score, 0);
  const avgScore = totalScore / analyses.length;
  const totalMagnitude = analyses.reduce((sum, a) => sum + a.magnitude, 0);
  const avgMagnitude = totalMagnitude / analyses.length;

  // Distribuição de classificações
  const distribution = {
    very_positive: analyses.filter(a => a.classification === 'very_positive').length,
    positive: analyses.filter(a => a.classification === 'positive').length,
    neutral: analyses.filter(a => a.classification === 'neutral').length,
    negative: analyses.filter(a => a.classification === 'negative').length,
    very_negative: analyses.filter(a => a.classification === 'very_negative').length
  };

  // Classificação geral
  let overall = 'neutral';
  if (avgScore > 2) {
    overall = 'very_positive';
  } else if (avgScore > 0.5) {
    overall = 'positive';
  } else if (avgScore < -2) {
    overall = 'very_negative';
  } else if (avgScore < -0.5) {
    overall = 'negative';
  }

  // Tendência temporal (comparar primeira metade vs segunda metade)
  let trend = 'stable';
  if (analyses.length >= 4) {
    const midpoint = Math.floor(analyses.length / 2);
    const firstHalfAvg = analyses.slice(0, midpoint).reduce((sum, a) => sum + a.score, 0) / midpoint;
    const secondHalfAvg = analyses.slice(midpoint).reduce((sum, a) => sum + a.score, 0) / (analyses.length - midpoint);
    const diff = secondHalfAvg - firstHalfAvg;

    if (diff > 1) {
      trend = 'improving';
    } else if (diff < -1) {
      trend = 'worsening';
    }
  }

  return {
    overall,
    score: avgScore,
    magnitude: avgMagnitude,
    trend,
    noteCount: validNotes.length,
    distribution,
    analyses
  };
}

/**
 * Identifica temas principais nas notas
 * @param {string[]} notes - Array de notas
 * @returns {Object} Temas identificados com contagens
 */
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

/**
 * Gera descrição legível do sentimento
 * @param {string} classification - Classificação do sentimento
 * @returns {string} Descrição legível
 */
export function getSentimentDescription(classification) {
  const descriptions = {
    very_positive: 'muito positivo',
    positive: 'positivo',
    neutral: 'neutro',
    negative: 'negativo',
    very_negative: 'muito negativo'
  };

  return descriptions[classification] || 'neutro';
}

/**
 * Gera descrição legível da tendência
 * @param {string} trend - Tendência identificada
 * @returns {string} Descrição legível
 */
export function getTrendDescription(trend) {
  const descriptions = {
    improving: 'a melhorar',
    stable: 'estável',
    worsening: 'a piorar'
  };

  return descriptions[trend] || 'estável';
}
