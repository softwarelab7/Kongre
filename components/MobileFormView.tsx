import React, { useState } from 'react';
import { AppState, MonthData, TemplateType, WeekData } from '../types';
import { TRANSLATIONS, getMonthName } from '../constants';
import { ChevronDown, Trash2, Plus, CalendarDays, BookOpen } from 'lucide-react';
import { Select } from './Select';
import { useNameHistory } from '../hooks/useNameHistory';
import { populateWatchtowerThemesForMonth, populateWatchtowerThemesForAllMonths } from '../services/watchtowerService';

interface Props {
    state: AppState;
    updateState: (newState: Partial<AppState>) => void;
}

export const MobileFormView: React.FC<Props> = ({ state, updateState }) => {
    const t = TRANSLATIONS[state.language];
    const { names: nameHistory, addName } = useNameHistory();
    const [openMonths, setOpenMonths] = useState<Record<string, boolean>>({});

    const monthColors = [
        'bg-blue-500', 'bg-indigo-500', 'bg-violet-500',
        'bg-rose-500', 'bg-orange-500', 'bg-amber-500',
        'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500',
        'bg-sky-500', 'bg-purple-500', 'bg-pink-500'
    ];

    const monthBorderColors = [
        'border-l-blue-500', 'border-l-indigo-500', 'border-l-violet-500',
        'border-l-rose-500', 'border-l-orange-500', 'border-l-amber-500',
        'border-l-emerald-500', 'border-l-teal-500', 'border-l-cyan-500',
        'border-l-sky-500', 'border-l-purple-500', 'border-l-pink-500'
    ];

    // Open the first month by default if none are open
    React.useEffect(() => {
        if (state.months.length > 0 && Object.keys(openMonths).length === 0) {
            setOpenMonths({ [state.months[0].id]: true });
        }
    }, [state.months]);

    const toggleMonth = (id: string) => {
        setOpenMonths(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleAddMonth = async () => {
        const currentBanner = state.banners?.[state.template] || { image: null, zoom: 1, x: 0, y: 0, showBanner: true };
        const maxMonths = currentBanner.showBanner === false ? 4 : 3;
        if ((state.template === 'acomodadores' || state.template === 'fin-de-semana') && state.months.length >= maxMonths) return;

        let nextYear = new Date().getFullYear();
        let nextMonthIndex = new Date().getMonth();

        if (state.months.length > 0) {
            const lastMonth = state.months[state.months.length - 1];
            nextMonthIndex = lastMonth.monthIndex + 1;
            nextYear = lastMonth.year;
            if (nextMonthIndex > 11) {
                nextMonthIndex = 0;
                nextYear++;
            }
        }

        let newMonth: MonthData = {
            id: crypto.randomUUID(),
            year: nextYear,
            monthIndex: nextMonthIndex,
            selectedDays: [],
            weeks: Array.from({ length: 5 }).map(() => ({
                id: crypto.randomUUID(),
                door: '', auditorium: '', mic1: '', mic2: '', group: '',
                president: '', speaker: '', wtTheme: '', reader: ''
            }))
        };

        if (state.template === 'fin-de-semana') {
            newMonth = await populateWatchtowerThemesForMonth(newMonth, state.language, true);
        }

        updateState({ months: [...state.months, newMonth] });
        setOpenMonths(prev => ({ ...prev, [newMonth.id]: true }));
    };

    const removeMonth = (id: string) => updateState({ months: state.months.filter(m => m.id !== id) });
    const updateMonth = async (id: string, updates: Partial<MonthData>) => {
        let newMonths = state.months.map(m => m.id === id ? { ...m, ...updates } : m);
        if (state.template === 'fin-de-semana' && (updates.monthIndex !== undefined || updates.year !== undefined || updates.selectedDays !== undefined)) {
            const targetMonth = newMonths.find(m => m.id === id);
            if (targetMonth) {
                const populated = await populateWatchtowerThemesForMonth(targetMonth, state.language, true);
                newMonths = newMonths.map(m => m.id === id ? populated : m);
            }
        }
        updateState({ months: newMonths });
    };

    const toggleDay = (monthId: string, dayIndex: number) => {
        const month = state.months.find(m => m.id === monthId);
        if (!month) return;
        const newSelectedDays = month.selectedDays.includes(dayIndex)
            ? month.selectedDays.filter(d => d !== dayIndex)
            : [...month.selectedDays, dayIndex].sort();
        updateMonth(monthId, { selectedDays: newSelectedDays });
    };

    const addWeek = (monthId: string) => {
        const month = state.months.find(m => m.id === monthId);
        if (!month) return;
        updateMonth(monthId, {
            weeks: [...month.weeks, { id: crypto.randomUUID(), door: '', auditorium: '', mic1: '', mic2: '', group: '', president: '', speaker: '', wtTheme: '', reader: '' }]
        });
    };

    const removeWeek = (monthId: string, weekId: string) => {
        const month = state.months.find(m => m.id === monthId);
        if (!month) return;
        updateMonth(monthId, { weeks: month.weeks.filter(w => w.id !== weekId) });
    };

    const toggleAssembly = (monthId: string, weekId: string) => {
        const month = state.months.find(m => m.id === monthId);
        if (!month) return;
        updateMonth(monthId, { weeks: month.weeks.map(w => w.id === weekId ? { ...w, isAssembly: !w.isAssembly } : w) });
    };

    const updateWeekField = (monthId: string, weekId: string, field: keyof WeekData, value: string) => {
        const month = state.months.find(m => m.id === monthId);
        if (!month) return;
        const newWeeks = month.weeks.map(w => w.id === weekId ? { ...w, [field]: value } : w);
        updateMonth(monthId, { weeks: newWeeks });
    };

    return (
        <div className="space-y-4 pb-32 w-full max-w-full overflow-hidden">

            {/* Title Settings */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-white/5 p-4 mb-6">
                <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Título del PDF</label>
                    <input
                        type="text"
                        value={state.styles.documentTitle ?? (state.template === 'acomodadores' ? t.previewTitleUshers : state.template === 'aseo' ? t.previewTitleCleaning : t.previewTitleWeekend)}
                        onChange={(e) => updateState({ styles: { ...state.styles, documentTitle: e.target.value } })}
                        className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 text-base text-zinc-900 dark:text-zinc-100"
                        placeholder="Programa de..."
                    />
                </div>
            </div>

            {/* Months Data Entry */}
            {state.months.map((month, index) => (
                <div key={month.id} className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-2xl shadow-sm overflow-hidden w-full max-w-full border-l-4 ${monthBorderColors[month.monthIndex % 12]}`}>

                    {/* Month Header Toggle */}
                    <button
                        onClick={() => toggleMonth(month.id)}
                        className={`w-full p-4 flex items-center justify-between transition-colors ${openMonths[month.id] ? 'bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-100 dark:border-zinc-700' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm text-white shadow-sm ${monthColors[month.monthIndex % 12]}`}>
                                {index + 1}
                            </div>
                            <h3 className="font-bold text-lg text-zinc-800 dark:text-zinc-100 uppercase">
                                {getMonthName(month.monthIndex, state.language)} {month.year}
                            </h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <div
                                onClick={(e) => { e.stopPropagation(); removeMonth(month.id); }}
                                className="p-2 text-zinc-400 hover:text-red-500 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                                <Trash2 size={18} />
                            </div>
                            <ChevronDown size={20} className={`text-zinc-400 transition-transform ${openMonths[month.id] ? 'rotate-180' : ''}`} />
                        </div>
                    </button>

                    {/* Month Form Content */}
                    {openMonths[month.id] && (
                        <div className="p-4 space-y-6">

                            {/* Structural Settings */}
                            <div className="bg-zinc-50 dark:bg-zinc-800/30 rounded-xl p-4 border border-zinc-100 dark:border-white/5 space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1.5">{t.year}</label>
                                        <Select
                                            options={Array.from({ length: 5 }, (_, i) => {
                                                const year = new Date().getFullYear() - 1 + i;
                                                return { value: year, label: String(year) };
                                            })}
                                            value={month.year}
                                            onChange={(value) => updateMonth(month.id, { year: parseInt(value) })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1.5">{t.month}</label>
                                        <Select
                                            options={Array.from({ length: 12 }, (_, i) => ({ value: i, label: getMonthName(i, state.language) }))}
                                            value={month.monthIndex}
                                            onChange={(value) => updateMonth(month.id, { monthIndex: parseInt(value) })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-2">{t.meetingDay}</label>
                                    <div className="flex justify-between gap-1">
                                        {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map((day, i) => (
                                            <button
                                                key={i}
                                                onClick={() => toggleDay(month.id, i)}
                                                className={`w-9 h-9 rounded-lg text-sm font-bold transition-colors ${month.selectedDays.includes(i) ? 'bg-primary text-white shadow-md' : 'bg-white dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700'}`}
                                            >
                                                {day}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Assignments List */}
                            <div className="space-y-4 pt-2">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide text-sm">Asignaciones por Semana</h4>
                                    <div className="flex items-center gap-2">
                                        {state.template === 'fin-de-semana' && (
                                            <button
                                                onClick={async () => {
                                                    const populated = await populateWatchtowerThemesForMonth(month, state.language, true);
                                                    updateMonth(month.id, populated);
                                                }}
                                                className="text-xs font-bold flex items-center gap-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 px-2.5 py-1.5 rounded-lg active:scale-95 transition-all"
                                                title={t.loadWatchtowerThemes}
                                            >
                                                <BookOpen size={13} />
                                                <span>Temas</span>
                                            </button>
                                        )}
                                        <button onClick={() => addWeek(month.id)} className="text-primary font-bold text-xs flex items-center bg-primary/10 px-3 py-1.5 rounded-lg active:bg-primary/20">
                                            <Plus size={14} className="mr-1" /> Añadir Semana
                                        </button>
                                    </div>
                                </div>

                                {month.weeks.length === 0 ? (
                                    <div className="text-center p-6 bg-zinc-50 dark:bg-zinc-800/20 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700">
                                        <p className="text-zinc-500 text-sm">No hay semanas añadidas.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {month.weeks.map((week, wIndex) => (
                                            <div key={week.id} className="relative pl-3 border-l-2 border-primary/20">
                                                <div className="flex items-center justify-between mb-3 border-b border-zinc-100 dark:border-white/5 pb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-zinc-800 dark:text-zinc-200">Semana {wIndex + 1}</span>
                                                        <button
                                                            onClick={() => toggleAssembly(month.id, week.id)}
                                                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors ${week.isAssembly ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'}`}
                                                            title="Alternar Asamblea"
                                                        >
                                                            {week.isAssembly ? '⭐ ASAMBLEA' : 'MARCAR ASAMBLEA'}
                                                        </button>
                                                    </div>
                                                    <button onClick={() => removeWeek(month.id, week.id)} className="text-red-400 hover:text-red-500 p-1">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>

                                                <div className="space-y-3">
                                                    {week.isAssembly ? (
                                                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-lg p-5 flex flex-col items-center justify-center text-center">
                                                            <span className="text-xl mb-2">🌟</span>
                                                            <h5 className="font-bold text-amber-700 dark:text-amber-500 uppercase tracking-widest">{t.assembly || 'ASAMBLEA'}</h5>
                                                        </div>
                                                    ) : state.template === 'acomodadores' ? (
                                                        <>
                                                            <div className="flex flex-col">
                                                                <label className="text-[10px] font-bold text-zinc-500 uppercase mb-1">{t.door}</label>
                                                                <input
                                                                    type="text" list="name-suggestions" value={week.door}
                                                                    onChange={(e) => updateWeekField(month.id, week.id, 'door', e.target.value)}
                                                                    onBlur={(e) => addName(e.target.value)}
                                                                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 text-base text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Nombre..."
                                                                />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <label className="text-[10px] font-bold text-zinc-500 uppercase mb-1">{t.auditorium}</label>
                                                                <input
                                                                    type="text" list="name-suggestions" value={week.auditorium}
                                                                    onChange={(e) => updateWeekField(month.id, week.id, 'auditorium', e.target.value)}
                                                                    onBlur={(e) => addName(e.target.value)}
                                                                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 text-base text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Nombre..."
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <div className="flex flex-col">
                                                                    <label className="text-[10px] font-bold text-zinc-500 uppercase mb-1">{t.mic1}</label>
                                                                    <input
                                                                        type="text" list="name-suggestions" value={week.mic1}
                                                                        onChange={(e) => updateWeekField(month.id, week.id, 'mic1', e.target.value)}
                                                                        onBlur={(e) => addName(e.target.value)}
                                                                        className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 text-base text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Nombre..."
                                                                    />
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <label className="text-[10px] font-bold text-zinc-500 uppercase mb-1">{t.mic2}</label>
                                                                    <input
                                                                        type="text" list="name-suggestions" value={week.mic2}
                                                                        onChange={(e) => updateWeekField(month.id, week.id, 'mic2', e.target.value)}
                                                                        onBlur={(e) => addName(e.target.value)}
                                                                        className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 text-base text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Nombre..."
                                                                    />
                                                                </div>
                                                            </div>
                                                        </>
                                                    ) : state.template === 'aseo' ? (
                                                        <div className="flex flex-col">
                                                            <label className="text-[10px] font-bold text-zinc-500 uppercase mb-1">{t.assignedGroup}</label>
                                                            <input
                                                                type="text" list="name-suggestions" value={week.group}
                                                                onChange={(e) => updateWeekField(month.id, week.id, 'group', e.target.value)}
                                                                onBlur={(e) => addName(e.target.value)}
                                                                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 text-base text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Grupo..."
                                                            />
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="flex flex-col">
                                                                <label className="text-[10px] font-bold text-zinc-500 uppercase mb-1">{t.president}</label>
                                                                <input
                                                                    type="text" list="name-suggestions" value={week.president || ''}
                                                                    onChange={(e) => updateWeekField(month.id, week.id, 'president', e.target.value)}
                                                                    onBlur={(e) => addName(e.target.value)}
                                                                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 text-base text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Nombre..."
                                                                />
                                                             </div>
                                                            <div className="flex flex-col">
                                                                <label className="text-[10px] font-bold text-zinc-500 uppercase mb-1">{t.wtTheme}</label>
                                                                <textarea
                                                                    rows={2}
                                                                    value={week.wtTheme || ''}
                                                                    onChange={(e) => updateWeekField(month.id, week.id, 'wtTheme', e.target.value)}
                                                                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 text-base text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-2 focus:ring-primary/20 outline-none resize-none leading-snug"
                                                                    placeholder="Tema..."
                                                                />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <label className="text-[10px] font-bold text-zinc-500 uppercase mb-1">{t.reader}</label>
                                                                <input
                                                                    type="text" list="name-suggestions" value={week.reader || ''}
                                                                    onChange={(e) => updateWeekField(month.id, week.id, 'reader', e.target.value)}
                                                                    onBlur={(e) => addName(e.target.value)}
                                                                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 text-base text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Nombre..."
                                                                />
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            ))}

            {/* Add Month Button */}
            <button
                onClick={handleAddMonth}
                disabled={(state.template === 'acomodadores' || state.template === 'fin-de-semana') && state.months.length >= ((state.banners?.[state.template]?.showBanner === false) ? 4 : 3)}
                className="w-full py-4 rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 font-bold flex items-center justify-center gap-2 disabled:opacity-50 active:bg-zinc-50 dark:active:bg-zinc-800"
            >
                <Plus size={20} />
                {t.addMonth}
            </button>

            {/* Datalist for names history auto-complete */}
            <datalist id="name-suggestions">
                {nameHistory.map((name, i) => (
                    <option key={i} value={name} />
                ))}
            </datalist>

        </div>
    );
};
