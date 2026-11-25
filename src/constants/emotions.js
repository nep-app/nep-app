export const EMOTIONS_LIST = [
  '😊 Feliz', '😢 Triste', '😰 Ansioso/a', '😌 Calmo/a',
  '😤 Irritado/a', '💪 Motivado/a', '😴 Cansado/a', '🙏 Grato/a',
  '😫 Frustrado/a', '🌟 Produtiva/o', '😐 Ambivalente', '😓 Stressado/a',
  '💯 Confiante', '😔 Inseguro/a', '🥺 Solitário/a', '🥰 Amado/a',
  '🎉 Entusiasmado/a', '😕 Confuso/a', '🌱 Orgulhoso/a', '😖 Culpado/a',
  '😞 Apático/a', '🤗 Vulnerável', '⚡ Okay', '😣 Arrependido/a',
  '😊 Divertido/a', '🔌 Desconectado/a', '🔥 Com craving', '✨ Resiliente',
  '🌈 Otimista', '😩 Overwhelmed', '🤝 Apoiado/a', '🧘 Em paz',
  // v8.9.0 (25-11-2026): palavras que faltavam
  '🙂 Contente', '🫂 Ligado/a às pessoas', '🛋️ Relaxado/a', '😮‍💨 Aliviado/a', '🛡️ Seguro/a', '🎯 Focado/a', '🎨 Criativo/a', '🤩 Eufórico/a', '😥 Desanimado/a', '🕳️ Vazio/a', '💔 Magoado/a', '🫣 Com vergonha', '😟 Preocupado/a', '😬 Nervoso/a', '😨 Com medo', '🌀 Agitado/a', '👀 Paranoico/a', '😠 Zangado/a', '⏳ Impaciente', '😒 Ressentido/a', '🪫 Exausto/a', '😪 Sonolento/a', '🫥 Entorpecido/a', '🥱 Aborrecido/a', '😶 Indiferente', '🔥 Vontade forte', '🕯️ Vontade leve'
];

// Categorização de emoções para análise de bem-estar emocional
export const EMOTION_CATEGORIES = {
  positive: [
    '😊 Feliz', '😌 Calmo/a', '💪 Motivado/a', '🙏 Grato/a',
    '🌟 Produtiva/o', '💯 Confiante', '🥰 Amado/a', '🎉 Entusiasmado/a',
    '🌱 Orgulhoso/a', '😊 Divertido/a', '✨ Resiliente', '🌈 Otimista',
    '🤝 Apoiado/a', '🧘 Em paz', '⚡ Okay', '😐 Ambivalente',
    // famílias (v8.8.0)
    '😊 Bem', '⚡ Com energia',
    // v8.9.0
    '🙂 Contente', '🫂 Ligado/a às pessoas', '🛋️ Relaxado/a', '😮‍💨 Aliviado/a', '🛡️ Seguro/a', '🎯 Focado/a', '🎨 Criativo/a', '🤩 Eufórico/a'
  ],
  negative: [
    '😢 Triste', '😰 Ansioso/a', '😤 Irritado/a', '😫 Frustrado/a',
    '😓 Stressado/a', '😔 Inseguro/a', '🥺 Solitário/a', '😕 Confuso/a',
    '😖 Culpado/a', '😞 Apático/a', '😣 Arrependido/a', '🔌 Desconectado/a',
    '🔥 Com craving', '😩 Overwhelmed', '😴 Cansado/a', '🤗 Vulnerável',
    // famílias (v8.8.0)
    '😢 Em baixo', '🔌 Desligada/o',
    // v8.9.0
    '😥 Desanimado/a', '🕳️ Vazio/a', '💔 Magoado/a', '🫣 Com vergonha', '😟 Preocupado/a', '😬 Nervoso/a', '😨 Com medo', '🌀 Agitado/a', '👀 Paranoico/a', '😠 Zangado/a', '⏳ Impaciente', '😒 Ressentido/a', '🪫 Exausto/a', '😪 Sonolento/a', '🫥 Entorpecido/a', '🥱 Aborrecido/a', '😶 Indiferente', '🔥 Vontade forte', '🕯️ Vontade leve'
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
  // v8.9.0
  '🙂 Contente': '🙂 Content',
  '🫂 Ligado/a às pessoas': '🫂 Connected to people',
  '🛋️ Relaxado/a': '🛋️ Relaxed',
  '😮‍💨 Aliviado/a': '😮‍💨 Relieved',
  '🛡️ Seguro/a': '🛡️ Safe',
  '🎯 Focado/a': '🎯 Focused',
  '🎨 Criativo/a': '🎨 Creative',
  '🤩 Eufórico/a': '🤩 Euphoric',
  '😥 Desanimado/a': '😥 Discouraged',
  '🕳️ Vazio/a': '🕳️ Empty',
  '💔 Magoado/a': '💔 Hurt',
  '🫣 Com vergonha': '🫣 Ashamed',
  '😟 Preocupado/a': '😟 Worried',
  '😬 Nervoso/a': '😬 Nervous',
  '😨 Com medo': '😨 Scared',
  '🌀 Agitado/a': '🌀 Agitated',
  '👀 Paranoico/a': '👀 Paranoid',
  '😠 Zangado/a': '😠 Angry',
  '⏳ Impaciente': '⏳ Impatient',
  '😒 Ressentido/a': '😒 Resentful',
  '🪫 Exausto/a': '🪫 Exhausted',
  '😪 Sonolento/a': '😪 Sleepy',
  '🫥 Entorpecido/a': '🫥 Numb',
  '🥱 Aborrecido/a': '🥱 Bored',
  '😶 Indiferente': '😶 Indifferent',
  '🔥 Vontade forte': '🔥 Strong urge',
  '🕯️ Vontade leve': '🕯️ Mild urge',
};

export const getEmotionCategory = (emotion) => {
  if (EMOTION_CATEGORIES.positive.includes(emotion)) return 'positive';
  if (EMOTION_CATEGORIES.negative.includes(emotion)) return 'negative';
  return 'neutral';
};

// ===== FAMÍLIAS (v8.8.0) =====
// O seletor de emoções mostra 9 famílias; cada uma das 32 palavras de sempre
// pertence a UMA família. Tocar na família já conta: grava-se o `value` da
// família. Desde a v8.9.0 (pedido da Teresa), família + palavra fina gravam-se
// AS DUAS (ex.: ansiosa + preocupada). As strings de sempre não mudam.
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
    words: ['😊 Feliz', '🙂 Contente', '😊 Divertido/a', '🌱 Orgulhoso/a', '🌈 Otimista', '🥰 Amado/a', '🫂 Ligado/a às pessoas', '⚡ Okay'] },
  { id: 'calma', emoji: '😌', value: '😌 Calmo/a', pt: 'calma/o', en: 'calm',
    words: ['🧘 Em paz', '🛋️ Relaxado/a', '😮‍💨 Aliviado/a', '🙏 Grato/a', '🤝 Apoiado/a', '🛡️ Seguro/a', '✨ Resiliente'] },
  { id: 'energia', emoji: '⚡', value: '⚡ Com energia', pt: 'com energia', en: 'energetic',
    words: ['💪 Motivado/a', '🎉 Entusiasmado/a', '🎯 Focado/a', '🌟 Produtiva/o', '💯 Confiante', '🎨 Criativo/a', '🤩 Eufórico/a'] },
  { id: 'embaixo', emoji: '😢', value: '😢 Em baixo', pt: 'em baixo', en: 'low',
    words: ['😢 Triste', '😥 Desanimado/a', '🥺 Solitário/a', '🕳️ Vazio/a', '💔 Magoado/a', '😖 Culpado/a', '😣 Arrependido/a', '🫣 Com vergonha', '🤗 Vulnerável'] },
  { id: 'ansiosa', emoji: '😰', value: '😰 Ansioso/a', pt: 'ansiosa/o', en: 'anxious',
    words: ['😟 Preocupado/a', '😬 Nervoso/a', '😓 Stressado/a', '😨 Com medo', '😔 Inseguro/a', '😩 Overwhelmed', '🌀 Agitado/a', '👀 Paranoico/a'] },
  { id: 'irritada', emoji: '😤', value: '😤 Irritado/a', pt: 'irritada/o', en: 'irritated',
    words: ['😫 Frustrado/a', '😠 Zangado/a', '⏳ Impaciente', '😒 Ressentido/a'] },
  { id: 'cansada', emoji: '😴', value: '😴 Cansado/a', pt: 'cansada/o', en: 'tired',
    words: ['🪫 Exausto/a', '😪 Sonolento/a', '😞 Apático/a'] },
  { id: 'desligada', emoji: '🔌', value: '🔌 Desligada/o', pt: 'desligada/o', en: 'switched off',
    words: ['🔌 Desconectado/a', '🫥 Entorpecido/a', '🥱 Aborrecido/a', '😶 Indiferente', '😕 Confuso/a', '😐 Ambivalente'] },
  { id: 'craving', emoji: '🔥', value: '🔥 Com craving', pt: 'craving', en: 'craving',
    words: ['🔥 Vontade forte', '🕯️ Vontade leve'] },
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
// Palavras guardadas em inglês que se mostram em PT (o dado fica igual).
const PT_DISPLAY = { '😩 Overwhelmed': '😩 Sobrecarregado/a' };
export const emotionLabel = (emotion, lang = 'pt', form) => {
  if (lang === 'en') return EMOTION_EN[emotion] || emotion;
  return applyWordForm(PT_DISPLAY[emotion] || emotion, form);
};
