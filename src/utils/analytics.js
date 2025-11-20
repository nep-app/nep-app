// ===== UTILITY FUNCTIONS FOR ANALYTICS =====

// Calculate Pearson correlation coefficient
export const calculatePearsonCorrelation = (data, xKey, yKey) => {
    if (data.length < 2) return null;
    const n = data.length;
    const sumX = data.reduce((sum, d) => sum + d[xKey], 0);
    const sumY = data.reduce((sum, d) => sum + d[yKey], 0);
    const sumXY = data.reduce((sum, d) => sum + d[xKey] * d[yKey], 0);
    const sumX2 = data.reduce((sum, d) => sum + d[xKey] * d[xKey], 0);
    const sumY2 = data.reduce((sum, d) => sum + d[yKey] * d[yKey], 0);
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    return denominator === 0 ? null : numerator / denominator;
};

// Analyze sentiment in text using keyword matching
export const analyzeSentiment = (text) => {
    if (!text || text.trim().length === 0) return { score: 0, label: 'neutro' };

    const lowerText = text.toLowerCase();

    const positiveWords = ['bem', 'melhor', 'bom', 'boa', 'feliz', 'alegre', 'calmo', 'calma', 'paz', 'tranquilo', 'tranquila', 'consegui', 'vitória', 'sucesso', 'grato', 'grata', 'esperança', 'motivado', 'motivada', 'forte', 'resiliente', 'orgulho', 'orgulhoso', 'amor', 'amado', 'amada', 'confiante', 'positivo', 'positiva', 'otimista', 'satisfeito', 'satisfeita', 'equilibrado', 'equilibrada'];

    const negativeWords = ['mal', 'pior', 'triste', 'tristeza', 'ansioso', 'ansiosa', 'ansiedade', 'medo', 'preocupado', 'preocupada', 'stress', 'stressado', 'stressada', 'irritado', 'irritada', 'frustrado', 'frustrada', 'culpa', 'culpado', 'culpada', 'vergonha', 'sozinho', 'sozinha', 'solidão', 'deprimido', 'deprimida', 'desesperado', 'desesperada', 'fraco', 'fraca', 'cansado', 'cansada', 'exausto', 'exausta', 'difícil', 'dificuldade', 'problema'];

    let positiveCount = 0;
    let negativeCount = 0;

    positiveWords.forEach(word => {
        const regex = new RegExp('\\b' + word + '\\b', 'gi');
        const matches = lowerText.match(regex);
        if (matches) positiveCount += matches.length;
    });

    negativeWords.forEach(word => {
        const regex = new RegExp('\\b' + word + '\\b', 'gi');
        const matches = lowerText.match(regex);
        if (matches) negativeCount += matches.length;
    });

    const score = positiveCount - negativeCount;
    let label = 'neutro';
    if (score > 1) label = 'positivo';
    else if (score < -1) label = 'negativo';

    return { score, positiveCount, negativeCount, label };
};

// Temporal correlation analysis (optimized)
export const getTemporalCorrelations = (wellbeingLogs, consumptions) => {
    if (wellbeingLogs.length < 2 || consumptions.length < 2) return null;

    // Create daily data structure
    const dailyData = {};

    // Add wellbeing data
    wellbeingLogs.forEach(w => {
        if (!dailyData[w.date]) dailyData[w.date] = {};
        dailyData[w.date].sleep = w.sleep;
        dailyData[w.date].mood = w.mood;
        dailyData[w.date].energy = w.energy;
    });

    // Add consumption counts
    consumptions.forEach(c => {
        if (!dailyData[c.date]) dailyData[c.date] = {};
        dailyData[c.date].consumptions = (dailyData[c.date].consumptions || 0) + 1;
    });

    // Get sorted dates
    const dates = Object.keys(dailyData).sort();

    // Calculate lag-1 correlations (yesterday's value vs today's consumption)
    const sleepLag1Data = [];
    const moodLag1Data = [];

    for (let i = 1; i < dates.length; i++) {
        const yesterday = dailyData[dates[i - 1]];
        const today = dailyData[dates[i]];

        if (yesterday.sleep && today.consumptions) {
            sleepLag1Data.push({ yesterdaySleep: yesterday.sleep, todayConsumptions: today.consumptions });
        }

        if (yesterday.mood && today.consumptions) {
            moodLag1Data.push({ yesterdayMood: yesterday.mood, todayConsumptions: today.consumptions });
        }
    }

    return {
        sleepLag1: {
            correlation: calculatePearsonCorrelation(sleepLag1Data, 'yesterdaySleep', 'todayConsumptions'),
            dataPoints: sleepLag1Data.length
        },
        moodLag1: {
            correlation: calculatePearsonCorrelation(moodLag1Data, 'yesterdayMood', 'todayConsumptions'),
            dataPoints: moodLag1Data.length
        }
    };
};

// Bidirectional analysis (optimized)
export const getBidirectionalAnalysis = (wellbeingLogs, consumptions) => {
    if (wellbeingLogs.length < 2 || consumptions.length < 2) return null;

    // Create daily data structure
    const dailyData = {};

    // Add wellbeing data
    wellbeingLogs.forEach(w => {
        if (!dailyData[w.date]) dailyData[w.date] = {};
        const sleep = parseFloat(w.sleep);
        const mood = parseInt(w.mood);
        const energy = parseInt(w.energy);
        if (!isNaN(sleep) && sleep > 0) dailyData[w.date].sleep = sleep;
        if (!isNaN(mood) && mood > 0) dailyData[w.date].mood = mood;
        if (!isNaN(energy) && energy > 0) dailyData[w.date].energy = energy;
    });

    // Add consumption counts
    consumptions.forEach(c => {
        if (!dailyData[c.date]) dailyData[c.date] = {};
        dailyData[c.date].consumptions = (dailyData[c.date].consumptions || 0) + 1;
    });

    // Get sorted dates
    const dates = Object.keys(dailyData).sort();

    // Same Day Impact: Today's consumption → Tonight's sleep
    const consumptionToSleepSameDay = [];
    dates.forEach(date => {
        const day = dailyData[date];
        if (day.consumptions && day.sleep) {
            consumptionToSleepSameDay.push({ consumptions: day.consumptions, sleep: day.sleep });
        }
    });

    // Same Day Impact: Morning consumption → Evening mood
    const consumptionToMoodSameDay = [];
    dates.forEach(date => {
        const day = dailyData[date];
        if (day.consumptions && day.mood) {
            consumptionToMoodSameDay.push({ consumptions: day.consumptions, mood: day.mood });
        }
    });

    // Same Day Impact: Consumption → Energy
    const consumptionToEnergySameDay = [];
    dates.forEach(date => {
        const day = dailyData[date];
        if (day.consumptions && day.energy) {
            consumptionToEnergySameDay.push({ consumptions: day.consumptions, energy: day.energy });
        }
    });

    // Next Day Impact: Today's consumption → Tomorrow's sleep
    const consumptionToSleepNextDay = [];
    for (let i = 0; i < dates.length - 1; i++) {
        const today = dailyData[dates[i]];
        const tomorrow = dailyData[dates[i + 1]];

        if (today.consumptions && tomorrow.sleep) {
            consumptionToSleepNextDay.push({ consumptions: today.consumptions, sleep: tomorrow.sleep });
        }
    }

    // Next Day Impact: Today's consumption → Tomorrow's mood
    const consumptionToMoodNextDay = [];
    for (let i = 0; i < dates.length - 1; i++) {
        const today = dailyData[dates[i]];
        const tomorrow = dailyData[dates[i + 1]];

        if (today.consumptions && tomorrow.mood) {
            consumptionToMoodNextDay.push({ consumptions: today.consumptions, mood: tomorrow.mood });
        }
    }

    // Next Day Impact: Today's consumption → Tomorrow's energy
    const consumptionToEnergyNextDay = [];
    for (let i = 0; i < dates.length - 1; i++) {
        const today = dailyData[dates[i]];
        const tomorrow = dailyData[dates[i + 1]];

        if (today.consumptions && tomorrow.energy) {
            consumptionToEnergyNextDay.push({ consumptions: today.consumptions, energy: tomorrow.energy });
        }
    }

    // NEW: Sleep → Mood correlations
    // Same Day: Tonight's sleep → Mood (registered later or next morning)
    const sleepToMoodSameDay = [];
    dates.forEach(date => {
        const day = dailyData[date];
        if (day.sleep && day.mood) {
            sleepToMoodSameDay.push({ sleep: day.sleep, mood: day.mood });
        }
    });

    // Next Day: Tonight's sleep → Tomorrow's mood
    const sleepToMoodNextDay = [];
    for (let i = 0; i < dates.length - 1; i++) {
        const today = dailyData[dates[i]];
        const tomorrow = dailyData[dates[i + 1]];

        if (today.sleep && tomorrow.mood) {
            sleepToMoodNextDay.push({ sleep: today.sleep, mood: tomorrow.mood });
        }
    }

    return {
        sameDay: {
            sleep: {
                correlation: calculatePearsonCorrelation(consumptionToSleepSameDay, 'consumptions', 'sleep'),
                dataPoints: consumptionToSleepSameDay.length
            },
            mood: {
                correlation: calculatePearsonCorrelation(consumptionToMoodSameDay, 'consumptions', 'mood'),
                dataPoints: consumptionToMoodSameDay.length
            },
            energy: {
                correlation: calculatePearsonCorrelation(consumptionToEnergySameDay, 'consumptions', 'energy'),
                dataPoints: consumptionToEnergySameDay.length
            }
        },
        nextDay: {
            sleep: {
                correlation: calculatePearsonCorrelation(consumptionToSleepNextDay, 'consumptions', 'sleep'),
                dataPoints: consumptionToSleepNextDay.length
            },
            mood: {
                correlation: calculatePearsonCorrelation(consumptionToMoodNextDay, 'consumptions', 'mood'),
                dataPoints: consumptionToMoodNextDay.length
            },
            energy: {
                correlation: calculatePearsonCorrelation(consumptionToEnergyNextDay, 'consumptions', 'energy'),
                dataPoints: consumptionToEnergyNextDay.length
            }
        },
        sleepToMood: {
            sameDay: {
                correlation: calculatePearsonCorrelation(sleepToMoodSameDay, 'sleep', 'mood'),
                dataPoints: sleepToMoodSameDay.length
            },
            nextDay: {
                correlation: calculatePearsonCorrelation(sleepToMoodNextDay, 'sleep', 'mood'),
                dataPoints: sleepToMoodNextDay.length
            }
        }
    };
};

// Analyze intra-day variation
export const getIntraDayVariation = (wellbeingLogs) => {
    if (wellbeingLogs.length < 2) return null;

    // Group by date
    const logsByDate = {};
    wellbeingLogs.forEach(log => {
        if (!logsByDate[log.date]) logsByDate[log.date] = [];
        logsByDate[log.date].push(log);
    });

    // Filter days with multiple entries
    const daysWithMultipleEntries = Object.entries(logsByDate).filter(([_, logs]) => logs.length > 1);

    if (daysWithMultipleEntries.length === 0) return null;

    const variations = [];

    daysWithMultipleEntries.forEach(([date, logs]) => {
        // Sort by timestamp
        const sorted = logs.sort((a, b) => new Date(a.timestamp || a.date).getTime() - new Date(b.timestamp || b.date).getTime());

        const first = sorted[0];
        const last = sorted[sorted.length - 1];

        // Calculate variations
        const moodChange = last.mood && first.mood ? parseInt(last.mood) - parseInt(first.mood) : null;
        const energyChange = last.energy && first.energy ? parseInt(last.energy) - parseInt(first.energy) : null;
        const sleepTotal = sorted.reduce((sum, log) => sum + (parseFloat(log.sleep) || 0), 0);

        if (moodChange !== null || energyChange !== null) {
            variations.push({
                date,
                moodChange,
                energyChange,
                sleepTotal,
                entriesCount: sorted.length,
                firstMood: first.mood ? parseInt(first.mood) : null,
                lastMood: last.mood ? parseInt(last.mood) : null,
                firstEnergy: first.energy ? parseInt(first.energy) : null,
                lastEnergy: last.energy ? parseInt(last.energy) : null
            });
        }
    });

    if (variations.length === 0) return null;

    // Calculate averages
    const avgMoodChange = variations.filter(v => v.moodChange !== null).reduce((sum, v) => sum + v.moodChange, 0) / variations.filter(v => v.moodChange !== null).length;
    const avgEnergyChange = variations.filter(v => v.energyChange !== null).reduce((sum, v) => sum + v.energyChange, 0) / variations.filter(v => v.energyChange !== null).length;

    // Find patterns
    const improvingDays = variations.filter(v => (v.moodChange && v.moodChange > 1) || (v.energyChange && v.energyChange > 1)).length;
    const decliningDays = variations.filter(v => (v.moodChange && v.moodChange < -1) || (v.energyChange && v.energyChange < -1)).length;
    const stableDays = variations.length - improvingDays - decliningDays;

    return {
        variations,
        avgMoodChange: isNaN(avgMoodChange) ? null : avgMoodChange,
        avgEnergyChange: isNaN(avgEnergyChange) ? null : avgEnergyChange,
        improvingDays,
        decliningDays,
        stableDays,
        totalDays: variations.length
    };
};
