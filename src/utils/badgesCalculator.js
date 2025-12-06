// Badge calculation logic extracted for better organization and reusability

export function calculateBadges(data) {
    const { consumptions, reflections, wellbeingLogs, cycles, goals, getGoalProgress } = data;
    const badgesList = [];

    // Long intervals badge (5 days with >2h intervals)
    if (consumptions.length >= 2) {
        const sorted = [...consumptions].sort((a,b) => a.timestamp.localeCompare(b.timestamp));
        const intervalsByDate = {};
        for (let i = 1; i < sorted.length; i++) {
            const diff = (new Date(sorted[i].timestamp) - new Date(sorted[i-1].timestamp)) / (1000 * 60 * 60);
            if (diff >= 2) {
                intervalsByDate[sorted[i].date] = (intervalsByDate[sorted[i].date] || 0) + 1;
            }
        }
        const daysWithLongIntervals = Object.keys(intervalsByDate).length;
        if (daysWithLongIntervals >= 5) badgesList.push({ id: 'long_intervals_5', title: '5 Dias com Intervalos Saudáveis', description: daysWithLongIntervals + ' dias com intervalos >2h', icon: '⏱️', color: 'green' });
        if (daysWithLongIntervals >= 10) badgesList.push({ id: 'long_intervals_10', title: '10 Dias com Intervalos Saudáveis', description: daysWithLongIntervals + ' dias com intervalos >2h', icon: '🏆', color: 'green' });
    }

    // DBT reflections badge
    if (reflections.length >= 5) badgesList.push({ id: 'reflections_5', title: '5 Reflexões diárias', description: 'Completaste ' + reflections.length + ' reflexões', icon: '🧠', color: 'purple' });
    if (reflections.length >= 10) badgesList.push({ id: 'reflections_10', title: '10 Reflexões diárias', description: 'Completaste ' + reflections.length + ' reflexões', icon: '💜', color: 'purple' });
    if (reflections.length >= 20) badgesList.push({ id: 'reflections_20', title: '20 Reflexões diárias', description: 'Completaste ' + reflections.length + ' reflexões', icon: '🌟', color: 'purple' });

    // Wellbeing check-ins badge
    if (wellbeingLogs.length >= 7) badgesList.push({ id: 'wellbeing_7', title: 'Semana de Autocuidado', description: wellbeingLogs.length + ' check-ins de bem-estar', icon: '💚', color: 'blue' });
    if (wellbeingLogs.length >= 30) badgesList.push({ id: 'wellbeing_30', title: 'Mês de Autocuidado', description: wellbeingLogs.length + ' check-ins de bem-estar', icon: '💎', color: 'blue' });

    // Cycle tracking badge
    if (cycles.length >= 5) badgesList.push({ id: 'cycles_5', title: 'Rastreador Dedicado', description: cycles.length + ' ciclos marcados', icon: '🌙', color: 'indigo' });

    // Goal completion badge
    const completedGoals = goals.filter(g => getGoalProgress(g) >= 100);
    if (completedGoals.length >= 1) badgesList.push({ id: 'goal_1', title: 'Meta Atingida', description: completedGoals.length + ' meta(s) completa(s)', icon: '🎯', color: 'pink' });

    // Reduction badge (compare first week vs last week)
    if (consumptions.length > 0) {
        const dates = [...new Set(consumptions.map(c => c.date))].sort();
        if (dates.length >= 14) {
            const firstWeekDates = dates.slice(0, 7);
            const lastWeekDates = dates.slice(-7);
            const firstWeekCount = consumptions.filter(c => firstWeekDates.includes(c.date)).length;
            const lastWeekCount = consumptions.filter(c => lastWeekDates.includes(c.date)).length;
            if (lastWeekCount < firstWeekCount) {
                badgesList.push({ id: 'reduction', title: 'Redução de Consumo', description: 'Reduziste ' + (firstWeekCount - lastWeekCount) + ' consumos vs primeira semana', icon: '📉', color: 'green' });
            }
        }
    }

    // Consistency badge (tracked for 7 days in a row)
    if (consumptions.length > 0 || wellbeingLogs.length > 0) {
        const allDates = [...new Set([...consumptions.map(c => c.date), ...wellbeingLogs.map(w => w.date)])].sort();
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
        if (maxStreak >= 7) badgesList.push({ id: 'streak_7', title: '7 Dias Consecutivos', description: 'Maior sequência: ' + maxStreak + ' dias', icon: '🔥', color: 'orange' });
        if (maxStreak >= 14) badgesList.push({ id: 'streak_14', title: '14 Dias Consecutivos', description: 'Maior sequência: ' + maxStreak + ' dias', icon: '🔥', color: 'orange' });
        if (maxStreak >= 30) badgesList.push({ id: 'streak_30', title: '30 Dias Consecutivos', description: 'Maior sequência: ' + maxStreak + ' dias', icon: '💪', color: 'orange' });
    }

    // Self-care champion (checked all 4 items at least once)
    const hasAllSelfCare = wellbeingLogs.some(w => w.water && w.rest && w.social && w.food);
    if (hasAllSelfCare) badgesList.push({ id: 'selfcare_complete', title: 'Autocuidado Completo', description: 'Completaste todos os itens de autocuidado', icon: '✨', color: 'yellow' });

    return badgesList;
}
