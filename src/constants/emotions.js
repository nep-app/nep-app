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
    '🤝 Apoiado/a', '🧘 Em paz', '⚡ Okay'
  ],
  negative: [
    '😢 Triste', '😰 Ansioso/a', '😤 Irritado/a', '😫 Frustrado/a',
    '😓 Stressado/a', '😔 Inseguro/a', '🥺 Solitário/a', '😕 Confuso/a',
    '😖 Culpado/a', '😞 Apático/a', '😣 Arrependido/a', '🔌 Desconectado/a',
    '🔥 Com craving', '😩 Overwhelmed', '😴 Cansado/a', '🤗 Vulnerável'
  ],
  neutral: [
    '😐 Ambivalente'
  ]
};

export const getEmotionCategory = (emotion) => {
  if (EMOTION_CATEGORIES.positive.includes(emotion)) return 'positive';
  if (EMOTION_CATEGORIES.negative.includes(emotion)) return 'negative';
  return 'neutral';
};
