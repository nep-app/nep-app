// ==========================================
// CÓDIGO DE SENTIMENT ANALYSIS V3.0
// ==========================================
import i18n from '../i18n';

// Versão V3.0 - com emojis, frases coloquiais PT-PT, "tou", e deteção de contraste
function _calculateRawSentiment(text) {
  const normalize = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  // Extrair e pontuar emojis
  function extractEmojis(txt) {
    const emojiMap = {
      // Muito positivos
      '😊': 2, '😃': 2, '😄': 2, '😁': 2, '🎉': 2.5, '💪': 2.5, '✨': 2, '🌟': 2, '❤️': 2.5, '💕': 2, '🥰': 2.5, '😍': 2.5,
      '👍': 1.5, '✅': 1.5, '🙌': 2, '🔥': 2, '💯': 2, '👏': 2,
      // Ligeiramente positivos
      '🙂': 1, '😌': 1, '😇': 1.5, '🤗': 1.5,
      // Neutros
      '😐': 0, '😶': 0, '🤔': 0,
      // Ligeiramente negativos
      '😕': -1, '🤷': -0.5, '😬': -1, '🥴': -1.5,
      // Negativos
      '😢': -2, '😭': -2.5, '😞': -2, '😔': -2, '😟': -1.5, '😣': -2, '😖': -2, '😫': -2, '😩': -2.5,
      '😤': -2, '😠': -2.5, '😡': -3, '🤬': -3, '😰': -2.5, '😨': -2, '😱': -2.5, '😓': -2, '😥': -2,
      '🤢': -2, '🤮': -2.5, '💔': -2.5, '😵': -2, '🥺': -1.5
    };

    let emojiScore = 0;
    let emojiCount = 0;
    for (const [emoji, score] of Object.entries(emojiMap)) {
      const count = (txt.match(new RegExp(emoji, 'g')) || []).length;
      if (count > 0) {
        emojiScore += score * count;
        emojiCount += count;
      }
    }
    return { emojiScore, emojiCount };
  }

  function tokenize(t) {
    if (!t) return [];
    const cleaned = String(t).replace(/\r?\n|\r/g, ' ').replace(/["""()<>[\]{},;:!?@#€$%&*+=\/\\|~`]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    return cleaned.split(' ').map(w => normalize(w.trim())).filter(Boolean);
  }

  const POSITIVE_WORDS_RAW = {
    'excelente': 3, 'otimo': 3, 'fantastico': 3, 'incrivel': 3, 'maravilhoso': 3, 'perfeito': 3, 'espetacular': 3, 'magnifico': 3,
    'brutal': 3, 'lindo': 3, 'amei': 3, 'adoro': 3, 'adorei': 3, 'demais': 3, 'brilhante': 3, 'impecavel': 3, 'amazing': 3,
    'bom': 2, 'boa': 2, 'feliz': 2, 'alegre': 2, 'contente': 2, 'satisfeito': 2, 'satisfeita': 2, 'melhor': 2, 'positivo': 2, 'positiva': 2,
    'confiante': 2, 'motivado': 2, 'motivada': 2, 'orgulhoso': 2, 'orgulhosa': 2, 'orgulho': 2, 'grato': 2, 'grata': 2, 'fixe': 2, 'bacano': 2, 'top': 2, 'nice': 2, 'capaz': 2,
    'giro': 2, 'bestial': 2, 'calmo': 2, 'calma': 2, 'tranquilo': 2, 'tranquila': 2, 'relaxado': 2, 'relaxada': 2,
    'focado': 2, 'focada': 2, 'produtivo': 2, 'produtiva': 2, 'equilibrado': 2, 'equilibrada': 2, 'energico': 2, 'energica': 2,
    'forte': 2, 'ativo': 2, 'ativa': 2, 'descansado': 2, 'descansada': 2, 'confortavel': 2, 'agradavel': 2, 'leve': 2, 'aliviado': 2, 'aliviada': 2,
    'bem': 1.5, 'ok': 1.5, 'okay': 1.5, 'razoavel': 1.5, 'aceitavel': 1.5, 'normal': 1, 'esperancoso': 2, 'otimista': 2, 'consegui': 1.5, 'conseguir': 1.5, 'melhorar': 1.5,
    'progresso': 1.5, 'sobrevivi': 1.5, 'safe': 1.5, 'beca': 1, 'finalmente': 1.5, 'melhorzinho': 1.5, 'decente': 1.5, 'estavel': 1.5, 'vontade': 2,
    'sorte': 1.5, 'legal': 1.5, 'gostei': 2, 'gostar': 1.5, 'gosto': 1.5, 'divertido': 2, 'divertida': 2, 'interessante': 1.5,
    'limpo': 1.5, 'limpa': 1.5, 'saudavel': 2, 'controlado': 1.5, 'controlada': 1.5, 'lucido': 2, 'lucida': 2, 'claro': 1.5, 'clara': 1.5,
    'correu': 1.5, 'valeu': 1.5, 'pena': 1.5, 'aguentei': 2, 'consegues': 1.5,
    'melhorei': 2, 'melhorou': 2, 'superei': 2, 'supereisa': 2, 'passei': 1.5, 'sorri': 2, 'ri': 1, 'conseguimos': 1.5, 'coragem': 2,
    'ajudou': 1.5, 'ajudei': 1.5, 'libertado': 2, 'libertada': 2, 'alivio': 2, 'felizmente': 2, 'funcionou': 1.5, 'resultou': 1.5,
    'recuperar': 1.5, 'recuperei': 2, 'recuperado': 2, 'recuperada': 2, 'bonito': 1.5, 'bonita': 1.5,
    'acalmar': 1.5, 'acalmei': 2, 'resolver': 1.5, 'resolvi': 1.5, 'avancei': 1.5, 'avancamos': 1.5,
    'conseguimos': 1.5, 'resistir': 1.5, 'resisti': 2, 'naoconsumir': 2, 'parei': 2, 'abstive': 2
  };

  const NEGATIVE_WORDS_RAW = {
    'estupida': 3, 'estupido': 3, 'burra': 3, 'idiota': 3, 'imbecil': 3, 'atrasada': 3, 'atrasado': 3, 'retardada': 3, 'morrer': 3, 'morte': 3,
    'horrivel': 3, 'pessimo': 3, 'terrivel': 3, 'miseravel': 3, 'desgraçado': 3, 'desgraçada': 3,
    'mal': 2, 'triste': 2, 'ansioso': 2, 'ansiosa': 2, 'preocupado': 2, 'preocupada': 2, 'cansado': 2, 'cansada': 2, 'frustrado': 2, 'frustrada': 2,
    'stressado': 2, 'stressada': 2, 'estressado': 2, 'estressada': 2, 'inseguro': 2, 'insegura': 2, 'sozinho': 2, 'sozinha': 2, 'vazio': 2, 'vazia': 2,
    'dificil': 2, 'complicado': 2, 'complicada': 2, 'pior': 2, 'negativo': 2, 'negativa': 2, 'raiva': 2, 'fodido': 2, 'fodida': 2, 'lixado': 2, 'lixada': 2,
    'doi': 2, 'dor': 2, 'doer': 2, 'azia': 2, 'enjoo': 2, 'vomitar': 2, 'doente': 2, 'arrependido': 2, 'arrependida': 2, 'mania': 2,
    'nervoso': 2, 'nervosa': 2, 'irritado': 2, 'irritada': 2, 'zangado': 2, 'zangada': 2, 'infeliz': 2,
    'deprimido': 2, 'deprimida': 2, 'esgotado': 2, 'esgotada': 2, 'exausto': 2, 'exausta': 2, 'fraco': 2, 'fraca': 2,
    'pesado': 2, 'pesada': 2, 'lento': 1.5, 'lenta': 1.5, 'nausea': 2, 'nauseado': 2, 'tremores': 2, 'taquicardia': 2,
    'cansaco': 1.5, 'chato': 1.5, 'chata': 1.5, 'aborrecido': 1.5, 'aborrecida': 1.5, 'sono': 1.5, 'confuso': 1.5, 'confusa': 1.5, 'incerto': 1.5, 'incerta': 1.5,
    'duvida': 1.5, 'problema': 1.5, 'falhar': 1.5, 'falha': 1.5, 'falhei': 2, 'perdi': 1.5, 'perde': 1.5, 'perdido': 1.5, 'perdida': 1.5,
    'meh': 1.5, 'nhe': 1, 'down': 1.5, 'estranha': 1.5, 'estranho': 1.5, 'medo': 2, 'desconfortavel': 1.5, 'insuportavel': 2,
    'desconcentrado': 1.5, 'desconcentrada': 1.5, 'distraido': 1.5, 'distraida': 1.5, 'desanimado': 1.5, 'desanimada': 1.5, 'saudades': 1.5,
    'culpa': 2, 'culpado': 2, 'culpada': 2, 'vergonha': 2.5, 'envergonhado': 2, 'envergonhada': 2, 'panico': 2,
    'craving': 2, 'ressaca': 2, 'sintomas': 1.5, 'abstinencia': 2, 'withdrawal': 2, 'dependencia': 1.5,
    'entupidos': 1.5, 'entupido': 1.5,
    'pesadelo': 2.5, 'recaida': 2.5, 'piorou': 2, 'piora': 1.5, 'overdose': 3, 'viciada': 2, 'viciado': 2,
    'agoniado': 2, 'agoniada': 2, 'angustiado': 2, 'angustiada': 2, 'angustia': 2.5, 'desesperado': 2.5, 'desesperada': 2.5, 'desespero': 2.5,
    'nojento': 2, 'asqueroso': 2, 'sufocado': 2, 'sufocada': 2, 'esgotamento': 2, 'burnout': 2, 'trauma': 2, 'traumatizado': 2.5, 'traumatizada': 2.5,
    'humilhado': 2, 'humilhada': 2, 'desmotivado': 2, 'desmotivada': 2, 'descontrolado': 2, 'descontrolada': 2,
    'impotente': 2, 'inutil': 2, 'inadequado': 2, 'inadequada': 2, 'falhei': 2, 'falhamos': 2, 'recaiu': 2.5,
    'naoaguento': 2.5, 'crise': 2, 'colapso': 2.5, 'abandonado': 2, 'abandonada': 2, 'rejeitado': 2, 'rejeitada': 2
  };

  const SWEAR_WORDS = new Set(['merda', 'caralho', 'crl', 'fdss', 'fds', 'fodasse', 'foda-se', 'porra']);
  const NEGATIONS_RAW = ['nao', 'nunca', 'nem', 'jamais', 'nenhum', 'nenhuma', 'sem', 'tampouco', 'sequer', 'nada', 'naosei'];
  const INTENSIFIERS_RAW = { 'muito': 1.5, 'bastante': 1.4, 'super': 1.6, 'extremamente': 1.8, 'incrivelmente': 1.8, 'demasiado': 1.5, 'realmente': 1.3, 'profundamente': 1.5, 'completamente': 1.4, 'tao': 1.3, 'bue': 1.5, 'mega': 1.6, 'ganda': 1.5, 'tanto': 1.3, 'cheia': 1.4, 'cheio': 1.4, 'sempre': 1.4, 'mais': 1.3 };
  const REDUCERS_RAW = { 'pouco': 0.5, 'meio': 0.6, 'maisoumenos': 0.6, 'ligeiramente': 0.5, 'raramente': 0.4, 'assim': 0.8, 'lol': 0.5, 'ate': 0.8 };
  const SELF_EVAL_VERBS = new Set(['sou', 'estou', 'tou', 'to', 'sinto', 'ta', 'estava', 'fico', 'fiquei', 'senti']);
  const NEGATIVE_EXPRESSIONS = new Set(['que', 'uma', 'um', 'este', 'esta', 'isto', 'isso']);
  const RESIGNATION_WORDS = new Set(['enfim', 'pronto', 'ok', 'whatever']);

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

  // Emojis removidos - utilizador não usa emojis nas notas de texto
  // const emojiData = extractEmojis(text);

  const words = tokenize(text);
  const details = [];
  let totalScore = 0, positiveCount = 0, negativeCount = 0, neutralCount = 0;

  // Score dos emojis desativado
  // if (emojiData.emojiCount > 0) {
  //   totalScore += emojiData.emojiScore;
  //   if (emojiData.emojiScore > 0) positiveCount++;
  //   else if (emojiData.emojiScore < 0) negativeCount++;
  //   details.push({ word: `[${emojiData.emojiCount} emojis]`, score: emojiData.emojiScore, context: 'emoji analysis' });
  // }

  for (let i = 0; i < words.length; i++) {
    // Helper: verifica se a palavra anterior é uma negação
    const prevNeg = (idx) => { const p = words[idx - 1] || ''; return p === 'nao' || p === 'n' || p === 'nunca' || p === 'nem'; };

    // Frases positivas
    if (words[i] === 'consegui' && words[i+1] === 'nao' && words[i+2] === 'conseguir') {
      totalScore += 1.5; positiveCount++;
      details.push({ word: 'consegui nao conseguir', score: 1.5, context: words.slice(Math.max(0, i-3), i+3).join(' ') });
      i += 2; continue;
    }
    if (words[i] === 'correu' && words[i+1] === 'bem') {
      const neg = prevNeg(i);
      const sc = neg ? -2 : 2;
      totalScore += sc; if (sc > 0) positiveCount++; else negativeCount++;
      details.push({ word: neg ? 'nao correu bem' : 'correu bem', score: sc, context: words.slice(Math.max(0, i-2), i+3).join(' ') });
      i += 1; continue;
    }
    if (words[i] === 'valeu' && words[i+1] === 'a' && words[i+2] === 'pena') {
      const neg = prevNeg(i);
      const sc = neg ? -2 : 2;
      totalScore += sc; if (sc > 0) positiveCount++; else negativeCount++;
      details.push({ word: neg ? 'nao valeu a pena' : 'valeu a pena', score: sc, context: words.slice(Math.max(0, i-2), i+4).join(' ') });
      i += 2; continue;
    }
    if ((words[i] === 'tou' || words[i] === 'estou' || words[i] === 'to') && words[i+1] === 'fixe') {
      const neg = prevNeg(i);
      const sc = neg ? -2.5 : 2.5;
      totalScore += sc; if (sc > 0) positiveCount++; else negativeCount++;
      details.push({ word: neg ? 'nao tou fixe' : 'tou fixe', score: sc, context: words.slice(Math.max(0, i-2), i+3).join(' ') });
      i += 1; continue;
    }
    if ((words[i] === 'tou' || words[i] === 'estou' || words[i] === 'to') && words[i+1] === 'bem') {
      const neg = prevNeg(i);
      const sc = neg ? -2 : 2;
      totalScore += sc; if (sc > 0) positiveCount++; else negativeCount++;
      details.push({ word: neg ? 'nao tou bem' : 'tou bem', score: sc, context: words.slice(Math.max(0, i-2), i+3).join(' ') });
      i += 1; continue;
    }
    if (words[i] === 'tendo' && words[i+1] === 'em' && words[i+2] === 'conta') {
      totalScore += 1; positiveCount++;
      details.push({ word: 'tendo em conta', score: 1, context: words.slice(Math.max(0, i-2), i+4).join(' ') });
      i += 2; continue;
    }

    // Frases positivas adicionais
    if ((words[i] === 'nao' || words[i] === 'n') && (words[i+1] === 'consumi' || words[i+1] === 'usei' || words[i+1] === 'tomei')) {
      totalScore += 2.5; positiveCount++;
      details.push({ word: `nao ${words[i+1]}`, score: 2.5, context: words.slice(Math.max(0, i-2), i+3).join(' ') });
      i += 1; continue;
    }
    if ((words[i] === 'dia' || words[i] === 'semana') && (words[i+1] === 'limpo' || words[i+1] === 'limpa' || words[i+1] === 'clean' || words[i+1] === 'sem' && words[i+2] === 'consumo')) {
      totalScore += 2.5; positiveCount++;
      details.push({ word: `${words[i]} ${words[i+1]}`, score: 2.5, context: words.slice(Math.max(0, i-2), i+3).join(' ') });
      i += 1; continue;
    }

    // Frases negativas comuns
    if (words[i] === 'nao' && words[i+1] === 'aguento') {
      totalScore += -2.5; negativeCount++;
      details.push({ word: 'nao aguento', score: -2.5, context: words.slice(Math.max(0, i-2), i+3).join(' ') });
      i += 1; continue;
    }
    if (words[i] === 'nao' && words[i+1] === 'consigo' && (words[i+2] === 'parar' || words[i+2] === 'dormir' || words[i+2] === 'funcionar')) {
      totalScore += -2.5; negativeCount++;
      details.push({ word: `nao consigo ${words[i+2]}`, score: -2.5, context: words.slice(Math.max(0, i-2), i+4).join(' ') });
      i += 2; continue;
    }
    if ((words[i] === 'nao' && words[i+1] === 'consegui') || (words[i] === 'nao' && words[i+1] === 'conseguir')) {
      totalScore += -2; negativeCount++;
      details.push({ word: 'nao consegui', score: -2, context: words.slice(Math.max(0, i-2), i+3).join(' ') });
      i += 1; continue;
    }
    if (words[i] === 'nao' && (words[i+1] === 'deu' || words[i+1] === 'da')) {
      totalScore += -1.5; negativeCount++;
      details.push({ word: 'nao deu', score: -1.5, context: words.slice(Math.max(0, i-2), i+3).join(' ') });
      i += 1; continue;
    }
    if (words[i] === 'falta' && (words[i+1] === 'me' || words[i+1] === 'de')) {
      totalScore += -1.5; negativeCount++;
      details.push({ word: 'falta me', score: -1.5, context: words.slice(Math.max(0, i-2), i+3).join(' ') });
      i += 1; continue;
    }
    if ((words[i] === 'ta' || words[i] === 'tá') && words[i+1] === 'dificil') {
      totalScore += -2; negativeCount++;
      details.push({ word: 'ta dificil', score: -2, context: words.slice(Math.max(0, i-2), i+3).join(' ') });
      i += 1; continue;
    }
    if (words[i] === 'correu' && words[i+1] === 'mal') {
      totalScore += -2; negativeCount++;
      details.push({ word: 'correu mal', score: -2, context: words.slice(Math.max(0, i-2), i+3).join(' ') });
      i += 1; continue;
    }
    if ((words[i] === 'nao' || words[i] === 'n') && (words[i+1] === 'tou' || words[i+1] === 'to' || words[i+1] === 'estou') && words[i+2] === 'fixe') {
      totalScore += -2.5; negativeCount++;
      details.push({ word: 'n tou fixe', score: -2.5, context: words.slice(Math.max(0, i-2), i+4).join(' ') });
      i += 2; continue;
    }
    if (words[i] === 'nao' && (words[i+1] === 'existe' || words[i+1] === 'fala')) {
      totalScore += -2; negativeCount++;
      details.push({ word: `nao ${words[i+1]}`, score: -2, context: words.slice(Math.max(0, i-2), i+3).join(' ') });
      i += 1; continue;
    }
    if ((words[i] === 'tou' || words[i] === 'estou' || words[i] === 'to') && words[i+1] === 'meh') {
      totalScore += -1.5; negativeCount++;
      details.push({ word: 'tou meh', score: -1.5, context: words.slice(Math.max(0, i-2), i+3).join(' ') });
      i += 1; continue;
    }
    if (words[i] === 'cheia' && words[i+1] === 'de' && words[i+2] === 'sono') {
      totalScore += -2; negativeCount++;
      details.push({ word: 'cheia de sono', score: -2, context: words.slice(Math.max(0, i-2), i+4).join(' ') });
      i += 2; continue;
    }

    // Palavras de resignação/frustração
    if (RESIGNATION_WORDS.has(words[i])) {
      const prev = words[i-1] || '';
      const next = words[i+1] || '';
      // Se vem sozinho ou no fim = ligeiramente negativo
      if (!prev || !next || next.length < 2) {
        totalScore += -0.8; negativeCount++;
        details.push({ word: words[i], score: -0.8, context: words.slice(Math.max(0, i-2), i+2).join(' ') });
        continue;
      }
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
        // Palavrões soltos/frustração = ligeiramente negativo
        const val = -1;
        totalScore += val; negativeCount++;
        details.push({ word: words[i], score: val, context: words.slice(Math.max(0, i-3), i+1).join(' ') });
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
  if (totalScore > 1.0) classification = 'very_positive';
  else if (totalScore > 0.08) classification = 'positive';
  else if (totalScore < -1.0) classification = 'very_negative';
  else if (totalScore < -0.08) classification = 'negative';

  return { score: Number(totalScore.toFixed(3)), magnitude: Number(magnitude.toFixed(3)), classification, positiveCount, negativeCount, neutralCount, details };
}

// Exportar análise individual para debug
export function analyzeNote(text) {
  return _calculateRawSentiment(text);
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
  if (avgScore > 1.0) overall = 'very_positive';
  else if (avgScore > 0.08) overall = 'positive';
  else if (avgScore < -1.0) overall = 'very_negative';
  else if (avgScore < -0.08) overall = 'negative';

  let trend = 'stable';
  if (analyses.length >= 4) {
    const midpoint = Math.floor(analyses.length / 2);
    const firstHalfAvg = analyses.slice(0, midpoint).reduce((sum, a) => sum + a.score, 0) / midpoint;
    const secondHalfAvg = analyses.slice(midpoint).reduce((sum, a) => sum + a.score, 0) / (analyses.length - midpoint);
    const diff = secondHalfAvg - firstHalfAvg;
    if (diff > 0.3) trend = 'improving';
    else if (diff < -0.3) trend = 'worsening';
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
  const key = `sentiment.${classification}`;
  return i18n.t(key, { defaultValue: classification });
}

export function getTrendDescription(trend) {
  const key = `sentiment.${trend}`;
  return i18n.t(key, { defaultValue: trend });
}
