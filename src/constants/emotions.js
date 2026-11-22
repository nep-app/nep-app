export const EMOTIONS_LIST = [
  '😊 Feliz', '😢 Triste', '😰 Ansioso/a', '😌 Calmo/a',
  '😤 Irritado/a', '💪 Motivado/a', '😴 Cansado/a', '🙏 Grato/a',
  '😫 Frustrado/a', '🌟 Produtiva/o', '😐 Ambivalente', '😓 Stressado/a',
  '💯 Confiante', '😔 Inseguro/a', '🥺 Solitário/a', '🥰 Amado/a',
  '🎉 Entusiasmado/a', '😕 Confuso/a', '🌱 Orgulhoso/a', '😖 Culpado/a',
  '😞 Apático/a', '🤗 Vulnerável', '⚡ Okay', '😣 Arrependido/a',
  '😊 Divertido/a', '🔌 Desconectado/a', '🔥 Com craving', '✨ Resiliente',
  '🌈 Otimista', '😩 Overwhelmed', '🤝 Apoiado/a', '🧘 Em paz'
];

// Categorização de emoções para análise de bem-estar emocional
export const EMOTION_CATEGORIES = {
  positive: [
    '😊 Feliz', '😌 Calmo/a', '💪 Motivado/a', '🙏 Grato/a',
    '🌟 Produtiva/o', '💯 Confiante', '🥰 Amado/a', '🎉 Entusiasmado/a',
    '🌱 Orgulhoso/a', '😊 Divertido/a', '✨ Resiliente', '🌈 Otimista',
    '🤝 Apoiado/a', '🧘 Em paz', '⚡ Okay', '😐 Ambivalente',
    // famílias (v8.8.0)
    '😊 Bem', '⚡ Com energia'
  ],
  negative: [
    '😢 Triste', '😰 Ansioso/a', '😤 Irritado/a', '😫 Frustrado/a',
    '😓 Stressado/a', '😔 Inseguro/a', '🥺 Solitário/a', '😕 Confuso/a',
    '😖 Culpado/a', '😞 Apático/a', '😣 Arrependido/a', '🔌 Desconectado/a',
    '🔥 Com craving', '😩 Overwhelmed', '😴 Cansado/a', '🤗 Vulnerável',
    // famílias (v8.8.0)
    '😢 Em baixo', '🔌 Desligada/o'
  ],
  neutral: []
};

export const EMOTION_EN = {
  '😊 Feliz': '😊 Happy',
  '😢 Triste': '😢 Sad',
  '😰 Ansioso/a': '😰 Anxious',
  '😌 Calmo/a': '😌 Calm',
  '😤 Irritado/a': '😤 Irritable',
  '💪 Motivado/a': '💪 Motivated',
  '😴 Cansado/a': '😴 Tired',
  '🙏 Grato/a': '🙏 Grateful',
  '😫 Frustrado/a': '😫 Frustrated',
  '🌟 Produtiva/o': '🌟 Productive',
  '😐 Ambivalente': '😐 Ambivalent',
  '😓 Stressado/a': '😓 Stressed',
  '💯 Confiante': '💯 Confident',
  '😔 Inseguro/a': '😔 Insecure',
  '🥺 Solitário/a': '🥺 Lonely',
  '🥰 Amado/a': '🥰 Loved',
  '🎉 Entusiasmado/a': '🎉 Enthusiastic',
  '😕 Confuso/a': '😕 Confused',
  '🌱 Orgulhoso/a': '🌱 Proud',
  '😖 Culpado/a': '😖 Guilty',
  '😞 Apático/a': '😞 Apathetic',
  '🤗 Vulnerável': '🤗 Vulnerable',
  '⚡ Okay': '⚡ Okay',
  '😣 Arrependido/a': '😣 Remorseful',
  '😊 Divertido/a': '😊 Playful',
  '🔌 Desconectado/a': '🔌 Disconnected',
  '🔥 Com craving': '🔥 Craving',
  '✨ Resiliente': '✨ Resilient',
  '🌈 Otimista': '🌈 Optimistic',
  '😩 Overwhelmed': '😩 Overwhelmed',
  '🤝 Apoiado/a': '🤝 Supported',
  '🧘 Em paz': '🧘 At peace',
  // famílias (v8.8.0)
  '😊 Bem': '😊 Good',
  '⚡ Com energia': '⚡ Energetic',
  '😢 Em baixo': '😢 Low',
  '🔌 Desligada/o': '🔌 Switched off',
};

export const getEmotionCategory = (emotion) => {
  if (EMOTION_CATEGORIES.positive.includes(emotion)) return 'positive';
  if (EMOTION_CATEGORIES.negative.includes(emotion)) return 'negative';
  return 'neutral';
};

// ===== FAMÍLIAS (v8.8.0) =====
// O seletor de emoções mostra 9 famílias; cada uma das 32 palavras de sempre
// pertence a UMA família. Tocar na família já conta: sem palavra fina, grava-se
// o `value` da família. Com uma palavra fina dessa família, grava-se SÓ a
// palavra fina — as mesmas strings de sempre, por isso os registos antigos e
// as Análises não mudam.
// Valor da família:
//  - quando já existe uma palavra com o mesmo sentido (calma, ansiosa,
//    irritada, cansada, craving), a família grava ESSA palavra ('😴 Cansado/a',
//    '🔥 Com craving'…). Assim não aparecem nas Análises duas linhas iguais
//    ("😴 Cansada" e "😴 Cansada") a contar a mesma coisa em separado, e as
//    análises de craving (Padrões, Exportar) continuam a vê-lo;
//  - quando não existe (bem, com energia, em baixo, desligada), grava uma
//    string nova, com categoria e tradução acima.
// As cores do seletor são neutras: nenhuma família é "boa" ou "má".
export const EMOTION_FAMILIES = [
  { id: 'bem', emoji: '😊', value: '😊 Bem', pt: 'bem', en: 'good',
    words: ['😊 Feliz', '😊 Divertido/a', '🥰 Amado/a', '🌈 Otimista', '⚡ Okay', '🌱 Orgulhoso/a'] },
  { id: 'calma', emoji: '😌', value: '😌 Calmo/a', pt: 'calma/o', en: 'calm',
    words: ['🧘 Em paz', '🙏 Grato/a', '🤝 Apoiado/a', '✨ Resiliente'] },
  { id: 'energia', emoji: '⚡', value: '⚡ Com energia', pt: 'com energia', en: 'energetic',
    words: ['💪 Motivado/a', '🌟 Produtiva/o', '🎉 Entusiasmado/a', '💯 Confiante'] },
  { id: 'embaixo', emoji: '😢', value: '😢 Em baixo', pt: 'em baixo', en: 'low',
    words: ['😢 Triste', '🥺 Solitário/a', '😖 Culpado/a', '😣 Arrependido/a', '🤗 Vulnerável'] },
  { id: 'ansiosa', emoji: '😰', value: '😰 Ansioso/a', pt: 'ansiosa/o', en: 'anxious',
    words: ['😓 Stressado/a', '😩 Overwhelmed', '😔 Inseguro/a'] },
  { id: 'irritada', emoji: '😤', value: '😤 Irritado/a', pt: 'irritada/o', en: 'irritated',
    words: ['😫 Frustrado/a'] },
  { id: 'cansada', emoji: '😴', value: '😴 Cansado/a', pt: 'cansada/o', en: 'tired',
    words: ['😞 Apático/a'] },
  { id: 'desligada', emoji: '🔌', value: '🔌 Desligada/o', pt: 'desligada/o', en: 'switched off',
    words: ['🔌 Desconectado/a', '😐 Ambivalente', '😕 Confuso/a'] },
  { id: 'craving', emoji: '🔥', value: '🔥 Com craving', pt: 'craving', en: 'craving',
    words: [] },
];

// string (palavra fina OU valor da família) → família
export const FAMILY_OF = (() => {
  const m = {};
  EMOTION_FAMILIES.forEach(f => {
    m[f.value] = f;
    f.words.forEach(w => { m[w] = f; });
  });
  return m;
})();

export const FAMILY_VALUES = EMOTION_FAMILIES.map(f => f.value);

// ===== GÉNERO DAS PALAVRAS (só visual) =====
// 'a' → cansada · 'o' → cansado · 'e' → cansade (neutro, pedido da Teresa
// 22-11-2026) · sem escolha → como está guardado ("cansada/o").
// Os dados gravam SEMPRE a string original; isto só muda o que se lê.
export const WORD_FORM_KEY = 'nep_word_form';
export const getWordForm = () => {
  try {
    const v = localStorage.getItem(WORD_FORM_KEY);
    return v === 'a' || v === 'o' || v === 'e' ? v : 'x';
  } catch { return 'x'; }
};
export const setWordForm = (v) => {
  try { localStorage.setItem(WORD_FORM_KEY, v); } catch { /* fica só nesta sessão */ }
  try { window.dispatchEvent(new Event('nep-word-form')); } catch { /* sem window */ }
};
// "Cansado/a" → "Cansada" (a) / "Cansado" (o) / "Cansade" (e); "Produtiva/o" idem.
export const applyWordForm = (text, form = getWordForm()) => {
  if (!text || (form !== 'a' && form !== 'o' && form !== 'e')) return text;
  return String(text).replace(/([A-Za-zÀ-ÿ]*)([oa])\/([oa])(?![A-Za-zÀ-ÿ])/g, (_, stem) => stem + form);
};

// Nome de uma emoção para mostrar: EN traduzido; PT no género escolhido.
export const emotionLabel = (emotion, lang = 'pt', form) => {
  if (lang === 'en') return EMOTION_EN[emotion] || emotion;
  return applyWordForm(emotion, form);
};
