// Badge calculation logic extracted for better organization and reusability
// NOTA: Cada tipo de conquista só mostra o maior nível atingido para evitar redundância

export function calculateBadges(data) {
    const { consumptions, reflections, wellbeingLogs, cycles, goals, getGoalProgress } = data;
    const badgesList = [];

    // ===== MARCOS INICIAIS (Primeiras vezes) =====

    // First reflection
    if (reflections.length >= 1) {
        badgesList.push({ id: 'first_reflection', title: 'Primeira Reflexão', description: 'Começaste a jornada de autoconhecimento', icon: '🌱', color: 'green' });
    }

    // First wellbeing check
    if (wellbeingLogs.length >= 1) {
        badgesList.push({ id: 'first_wellbeing', title: 'Primeiro Check-in', description: 'Começaste a monitorizar o teu bem-estar', icon: '💚', color: 'blue' });
    }

    // First cycle tracked
    if (cycles.length >= 1) {
        badgesList.push({ id: 'first_cycle', title: 'Primeiro Ciclo', description: 'Registaste o teu primeiro ciclo', icon: '🎯', color: 'indigo' });
    }

    // ===== REFLEXÕES DBT (apenas o maior nível) =====

    const reflectionCount = reflections.length;
    if (reflectionCount >= 20) {
        badgesList.push({ id: 'reflections_20', title: 'Mestre da Reflexão', description: `${reflectionCount} reflexões completadas`, icon: '🌟', color: 'purple' });
    } else if (reflectionCount >= 10) {
        badgesList.push({ id: 'reflections_10', title: '10 Reflexões DBT', description: `${reflectionCount} reflexões completadas`, icon: '💜', color: 'purple' });
    } else if (reflectionCount >= 5) {
        badgesList.push({ id: 'reflections_5', title: '5 Reflexões DBT', description: `${reflectionCount} reflexões completadas`, icon: '🧠', color: 'purple' });
    }

    // Reflexões em dias consecutivos
    if (reflections.length > 0) {
        const reflectionDates = [...new Set(reflections.map(r => r.date))].sort();
        let streak = 1;
        let maxStreak = 1;
        for (let i = 1; i < reflectionDates.length; i++) {
            const prev = new Date(reflectionDates[i-1]);
            const curr = new Date(reflectionDates[i]);
            const diffDays = (curr - prev) / (1000 * 60 * 60 * 24);
            if (diffDays === 1) {
                streak++;
                maxStreak = Math.max(maxStreak, streak);
            } else {
                streak = 1;
            }
        }
        if (maxStreak >= 7) {
            badgesList.push({ id: 'reflection_streak_7', title: 'Reflexão Semanal Consistente', description: `${maxStreak} dias seguidos de reflexão`, icon: '🔮', color: 'purple' });
        }
        if (maxStreak >= 14) {
            badgesList.push({ id: 'reflection_streak_14', title: 'Reflexão Quinzenal Consistente', description: `${maxStreak} dias seguidos de reflexão`, icon: '🌙', color: 'purple' });
        }
    }

    // ===== BEM-ESTAR (apenas o maior nível) =====

    const wellbeingCount = wellbeingLogs.length;
    if (wellbeingCount >= 30) {
        badgesList.push({ id: 'wellbeing_30', title: 'Mês de Autocuidado', description: `${wellbeingCount} check-ins de bem-estar`, icon: '💎', color: 'blue' });
    } else if (wellbeingCount >= 14) {
        badgesList.push({ id: 'wellbeing_14', title: '2 Semanas de Autocuidado', description: `${wellbeingCount} check-ins de bem-estar`, icon: '💙', color: 'blue' });
    } else if (wellbeingCount >= 7) {
        badgesList.push({ id: 'wellbeing_7', title: 'Semana de Autocuidado', description: `${wellbeingCount} check-ins de bem-estar`, icon: '💚', color: 'blue' });
    }

    // Bem-estar em dias consecutivos
    if (wellbeingLogs.length > 0) {
        const wellbeingDates = [...new Set(wellbeingLogs.map(w => w.date))].sort();
        let streak = 1;
        let maxStreak = 1;
        for (let i = 1; i < wellbeingDates.length; i++) {
            const prev = new Date(wellbeingDates[i-1]);
            const curr = new Date(wellbeingDates[i]);
            const diffDays = (curr - prev) / (1000 * 60 * 60 * 24);
            if (diffDays === 1) {
                streak++;
                maxStreak = Math.max(maxStreak, streak);
            } else {
                streak = 1;
            }
        }
        if (maxStreak >= 7) {
            badgesList.push({ id: 'wellbeing_streak_7', title: 'Check-in Diário Consistente', description: `${maxStreak} dias seguidos de bem-estar`, icon: '💫', color: 'blue' });
        }
        if (maxStreak >= 14) {
            badgesList.push({ id: 'wellbeing_streak_14', title: 'Autocuidado Quinzenal', description: `${maxStreak} dias seguidos de bem-estar`, icon: '✨', color: 'blue' });
        }
    }

    // Self-care champion (checked all 4 items at least once)
    const hasAllSelfCare = wellbeingLogs.some(w => w.water && w.rest && w.social && w.food);
    if (hasAllSelfCare) {
        badgesList.push({ id: 'selfcare_complete', title: 'Autocuidado Completo', description: 'Completaste todos os itens de autocuidado', icon: '⭐', color: 'yellow' });
    }

    // Explorador de Emoções (10+ emoções diferentes registadas)
    const uniqueEmotions = new Set();
    wellbeingLogs.forEach(w => {
        if (w.emotions) w.emotions.forEach(e => uniqueEmotions.add(e));
    });
    if (uniqueEmotions.size >= 10) {
        badgesList.push({ id: 'emotion_explorer', title: 'Explorador de Emoções', description: `Registaste ${uniqueEmotions.size} emoções diferentes`, icon: '🎭', color: 'blue' });
    }

    // ===== CICLOS (apenas o maior nível) =====

    const cycleCount = cycles.length;
    if (cycleCount >= 20) {
        badgesList.push({ id: 'cycles_20', title: 'Rastreador Experiente', description: `${cycleCount} ciclos rastreados`, icon: '🌟', color: 'indigo' });
    } else if (cycleCount >= 10) {
        badgesList.push({ id: 'cycles_10', title: 'Rastreador Avançado', description: `${cycleCount} ciclos rastreados`, icon: '🌙', color: 'indigo' });
    } else if (cycleCount >= 5) {
        badgesList.push({ id: 'cycles_5', title: 'Rastreador Dedicado', description: `${cycleCount} ciclos rastreados`, icon: '🎯', color: 'indigo' });
    }

    // Ciclos completos (com todos os campos preenchidos)
    const completeCycles = cycles.filter(c =>
        c.bedtime && c.sleep && c.triggers && c.triggers.length > 0 && c.mg && c.notes
    );
    if (completeCycles.length >= 5) {
        badgesList.push({ id: 'complete_cycles_5', title: 'Registo Detalhado', description: `${completeCycles.length} ciclos totalmente preenchidos`, icon: '📋', color: 'indigo' });
    }

    // Variedade de gatilhos identificados
    if (cycles.length > 0) {
        const allTriggers = new Set();
        cycles.forEach(c => {
            if (c.triggers) c.triggers.forEach(t => allTriggers.add(t));
        });
        if (allTriggers.size >= 5) {
            badgesList.push({ id: 'trigger_variety', title: 'Autoconhecimento Profundo', description: `Identificaste ${allTriggers.size} tipos de gatilhos`, icon: '🔍', color: 'indigo' });
        }
    }

    // Madrugador Saudável (ciclos com bedtime antes das 23h)
    const earlyBedtimeCycles = cycles.filter(c => {
        if (!c.bedtime) return false;
        const [hours] = c.bedtime.split(':').map(Number);
        return hours < 23;
    });
    if (earlyBedtimeCycles.length >= 5) {
        badgesList.push({ id: 'early_sleeper', title: 'Madrugador Saudável', description: `${earlyBedtimeCycles.length} ciclos com hora de deitar antes das 23h`, icon: '🌙', color: 'indigo' });
    }

    // ===== METAS =====

    // Goal completion badge
    const completedGoals = goals.filter(g => getGoalProgress(g) >= 100);
    if (completedGoals.length >= 3) {
        badgesList.push({ id: 'goal_3', title: 'Campeão de Metas', description: `${completedGoals.length} metas atingidas`, icon: '🏆', color: 'pink' });
    } else if (completedGoals.length >= 1) {
        badgesList.push({ id: 'goal_1', title: 'Meta Atingida', description: `${completedGoals.length} meta(s) completa(s)`, icon: '🎯', color: 'pink' });
    }

    // ===== COMBINAÇÕES E PADRÕES =====

    // Diário Completo (reflexão + bem-estar + ciclo no mesmo dia)
    const reflectionDates = new Set(reflections.map(r => r.date));
    const wellbeingDates = new Set(wellbeingLogs.map(w => w.date));
    const cycleDates = new Set(cycles.map(c => c.date));

    const completeDiaryDays = [...reflectionDates].filter(date =>
        wellbeingDates.has(date) && cycleDates.has(date)
    );

    if (completeDiaryDays.length >= 1) {
        badgesList.push({ id: 'complete_diary', title: 'Diário Completo', description: `${completeDiaryDays.length} dia(s) com reflexão + bem-estar + ciclo`, icon: '📖', color: 'yellow' });
    }

    // Semana Equilibrada (atingir todas as metas pelo menos uma vez numa semana)
    if (goals.length > 0) {
        // Agrupar progresso de metas por semana
        const now = new Date();
        const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

        const goalsAchievedThisWeek = goals.filter(g => {
            const progress = getGoalProgress(g);
            return progress >= 100;
        });

        // Se todas as metas foram atingidas esta semana
        if (goalsAchievedThisWeek.length === goals.length && goals.length >= 2) {
            badgesList.push({ id: 'balanced_week', title: 'Semana Equilibrada', description: 'Atingiste todas as metas esta semana', icon: '⚖️', color: 'pink' });
        }
    }

    // ===== REDUÇÃO E PROGRESSO =====

    // Reduction badge (compare first week vs last week)
    if (consumptions.length > 0) {
        const dates = [...new Set(consumptions.map(c => c.date))].sort();
        if (dates.length >= 14) {
            const firstWeekDates = dates.slice(0, 7);
            const lastWeekDates = dates.slice(-7);
            const firstWeekCount = consumptions.filter(c => firstWeekDates.includes(c.date)).length;
            const lastWeekCount = consumptions.filter(c => lastWeekDates.includes(c.date)).length;
            const reduction = firstWeekCount - lastWeekCount;
            if (reduction > 0) {
                badgesList.push({ id: 'reduction', title: 'Redução de Consumo', description: `Reduziste ${reduction} consumos vs primeira semana`, icon: '📉', color: 'green' });
            }
        }
    }

    // Redução Significativa (50%+ comparando primeiro mês vs último mês)
    if (consumptions.length > 0) {
        const dates = [...new Set(consumptions.map(c => c.date))].sort();
        if (dates.length >= 60) { // Pelo menos 60 dias de dados
            const firstMonthDates = dates.slice(0, 30);
            const lastMonthDates = dates.slice(-30);
            const firstMonthCount = consumptions.filter(c => firstMonthDates.includes(c.date)).length;
            const lastMonthCount = consumptions.filter(c => lastMonthDates.includes(c.date)).length;

            if (firstMonthCount > 0) {
                const reductionPercent = ((firstMonthCount - lastMonthCount) / firstMonthCount) * 100;
                if (reductionPercent >= 50) {
                    badgesList.push({ id: 'significant_reduction', title: 'Redução Significativa', description: `Reduziste ${Math.round(reductionPercent)}% do consumo (primeiro mês vs último)`, icon: '🎯', color: 'green' });
                }
            }
        }
    }

    // Consistency badge (tracked for 7+ days in a row - REMOVIDA a versão com consumptions)
    // Apenas consideramos wellbeing e reflections para não duplicar metas
    if (reflections.length > 0 || wellbeingLogs.length > 0) {
        const allDates = [...new Set([...reflections.map(r => r.date), ...wellbeingLogs.map(w => w.date)])].sort();
        let streak = 1;
        let maxStreak = 1;
        for (let i = 1; i < allDates.length; i++) {
            const prev = new Date(allDates[i-1]);
            const curr = new Date(allDates[i]);
            const diffDays = (curr - prev) / (1000 * 60 * 60 * 24);
            if (diffDays === 1) {
                streak++;
                maxStreak = Math.max(maxStreak, streak);
            } else {
                streak = 1;
            }
        }
        if (maxStreak >= 30) {
            badgesList.push({ id: 'tracking_streak_30', title: 'Rastreio Mensal Perfeito', description: `${maxStreak} dias seguidos de rastreio`, icon: '💪', color: 'orange' });
        } else if (maxStreak >= 14) {
            badgesList.push({ id: 'tracking_streak_14', title: 'Rastreio Quinzenal', description: `${maxStreak} dias seguidos de rastreio`, icon: '🔥', color: 'orange' });
        } else if (maxStreak >= 7) {
            badgesList.push({ id: 'tracking_streak_7', title: 'Rastreio Semanal', description: `${maxStreak} dias seguidos de rastreio`, icon: '🔥', color: 'orange' });
        }
    }

    return badgesList;
}
