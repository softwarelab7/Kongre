import React, { useState } from 'react';
import { AppState, MonthData, TemplateType, WeekData } from '../types';
import { TRANSLATIONS, getMonthName } from '../constants';
import { PlusCircle, Trash2, ChevronDown, ChevronUp, Upload, Plus, Check } from 'lucide-react';
import { Select } from './Select';
import { populateWatchtowerThemesForMonth } from '../services/watchtowerService';

interface Props {
  state: AppState;
  updateState: (newState: Partial<AppState>) => void;
}

export const ContentControl: React.FC<Props> = ({ state, updateState }) => {
  const t = TRANSLATIONS[state.language];
  const [openMonths, setOpenMonths] = useState<Record<string, boolean>>({});
  const [openWeeks, setOpenWeeks] = useState<Record<string, boolean>>({});

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

  const toggleMonth = (id: string) => {
    setOpenMonths(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleWeek = (id: string) => {
    setOpenWeeks(prev => {
      const isOpen = prev[id] === undefined ? true : prev[id];
      return { ...prev, [id]: !isOpen };
    });
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const currentBanner = state.banners?.[state.template] || { image: null, zoom: 1, x: 0, y: 0, showBanner: true };
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          updateState({
            banner: {
              ...currentBanner,
              image: event.target.result as string,
              x: 0,
              y: 0,
              zoom: 1
            }
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddMonth = () => {
    const currentBanner = state.banners?.[state.template] || { image: null, zoom: 1, x: 0, y: 0, showBanner: true };
    const maxMonths = currentBanner.showBanner === false ? 4 : 3;
    if ((state.template === 'acomodadores' || state.template === 'fin-de-semana' || state.template === 'audio-video') && state.months.length >= maxMonths) {
      return;
    }

    // Determine the next month based on the last month in the list
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
        door: '',
        auditorium: '',
        mic1: '',
        mic2: '',
        group: '',
        president: '',
        speaker: '',
        wtTheme: '',
        reader: '',
        audioVideo: ''
      }))
    };

    if (state.template === 'fin-de-semana') {
      newMonth = await populateWatchtowerThemesForMonth(newMonth, state.language, true);
    }

    updateState({ months: [...state.months, newMonth] });
  };

  const removeMonth = (id: string) => {
    updateState({ months: state.months.filter(m => m.id !== id) });
  };

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
      : [...month.selectedDays, dayIndex].sort(); // Sort for consistent order

    updateMonth(monthId, { selectedDays: newSelectedDays });
  };

  const updateWeek = (monthId: string, weekId: string, field: keyof WeekData, value: string) => {
    const month = state.months.find(m => m.id === monthId);
    if (!month) return;

    const newWeeks = month.weeks.map(w => w.id === weekId ? { ...w, [field]: value } : w);
    updateMonth(monthId, { weeks: newWeeks });
  };

  const addWeek = (monthId: string) => {
    const month = state.months.find(m => m.id === monthId);
    if (!month) return;
    const newWeek = {
      id: crypto.randomUUID(),
      door: '',
      auditorium: '',
      mic1: '',
      mic2: '',
      group: '',
      president: '',
      speaker: '',
      wtTheme: '',
      reader: '',
      audioVideo: ''
    };
    updateMonth(monthId, { weeks: [...month.weeks, newWeek] });
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



  return (
    <div className="space-y-8 pb-10">

      {/* Section: Configuration */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider px-1">Configuración</h3>

        {/* Template Selector */}
        <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-4">
          {/* Template Selector */}
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">
              {t.selectTemplate}
            </label>
            <Select
              options={[
                { value: 'acomodadores', label: t.templateUshers },
                { value: 'aseo', label: t.templateCleaning },
                { value: 'fin-de-semana', label: t.templateWeekend },
                { value: 'audio-video', label: t.templateAudioVideo }
              ]}
              value={state.template}
              onChange={(value) => updateState({ template: value as TemplateType })}
            />
          </div>

          <div className="h-px bg-zinc-200 dark:bg-white/5 w-full" />

          {/* Banner Upload */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                {t.banner}
              </label>
              {(() => {
                const currentBanner = state.banners?.[state.template] || { image: null, zoom: 1, x: 0, y: 0, showBanner: true };
                return (
                  <div className="flex bg-zinc-100 dark:bg-zinc-900/50 rounded-md overflow-hidden">
                    <button
                      onClick={() => updateState({ banner: { ...currentBanner, showBanner: true } })}
                      className={`px-2 py-1 text-[10px] font-bold transition-all ${currentBanner.showBanner !== false ? 'bg-white dark:bg-zinc-700 text-primary shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                    >
                      Mostrar
                    </button>
                    <button
                      onClick={() => updateState({ banner: { ...currentBanner, showBanner: false } })}
                      className={`px-2 py-1 text-[10px] font-bold transition-all ${currentBanner.showBanner === false ? 'bg-white dark:bg-zinc-700 text-primary shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                    >
                      Ocultar
                    </button>
                  </div>
                );
              })()}
            </div>

            {(() => {
              const currentBanner = state.banners?.[state.template] || { image: null, zoom: 1, x: 0, y: 0, showBanner: true };
              if (currentBanner.showBanner === false) return null;
              
              return (
                <div className="relative group mt-2">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="banner-upload"
                    onChange={handleBannerUpload}
                  />
                  <label
                    htmlFor="banner-upload"
                    className={`flex items-center justify-center gap-2 w-full p-2.5 rounded-lg border border-dashed cursor-pointer transition-all ${currentBanner.image
                      ? 'border-green-300 dark:border-green-800/50 hover:border-green-500 bg-green-50/50 dark:bg-green-900/10 hover:bg-green-50 dark:hover:bg-green-900/20'
                      : 'border-zinc-300 dark:border-zinc-700 hover:border-primary bg-white dark:bg-zinc-900/50 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                      }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform ${currentBanner.image
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                      }`}>
                      {currentBanner.image ? <Check size={14} /> : <Upload size={14} />}
                    </div>
                    <span className={`text-xs font-medium ${currentBanner.image ? 'text-green-700 dark:text-green-300' : 'text-zinc-600 dark:text-zinc-400'}`}>
                      {currentBanner.image ? 'Banner Activo' : t.uploadBanner}
                    </span>
                  </label>
                  {currentBanner.image && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        updateState({ banner: { ...currentBanner, image: null } });
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors z-10 opacity-0 group-hover:opacity-100"
                      title="Eliminar Banner"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Section: Content */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Programación</h3>
          <span className="text-xs font-medium text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">{state.months.length} Meses</span>
        </div>

        <div className="space-y-5">
          {state.months.map((month, index) => (
            <div key={month.id} className={`group border border-zinc-200 dark:border-white/5 rounded-xl bg-white dark:bg-zinc-800/40 shadow-sm hover:shadow-md transition-shadow border-l-4 ${monthBorderColors[month.monthIndex % 12]}`}>

              {/* Month Header */}
              <div
                className={`flex items-center justify-between p-3 cursor-pointer select-none transition-colors rounded-tr-xl ${openMonths[month.id] ? 'bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-100 dark:border-zinc-700' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
                onClick={() => toggleMonth(month.id)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold text-white shadow-sm ${monthColors[month.monthIndex % 12]}`}>
                    {index + 1}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <h4 className="font-display font-semibold text-sm text-zinc-900 dark:text-zinc-100 tracking-tight">
                      {getMonthName(month.monthIndex, state.language)} {month.year}
                    </h4>
                    <span className="text-[10px] text-zinc-400 font-medium bg-zinc-100 dark:bg-white/5 px-1.5 py-0.5 rounded-full">{month.weeks.length} Semanas</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); removeMonth(month.id); }}
                    className="w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                    title={t.remove}
                  >
                    <Trash2 size={14} />
                  </button>
                  <div className={`transition-transform duration-200 ${openMonths[month.id] ? 'rotate-180' : ''}`}>
                    <ChevronDown size={16} className="text-zinc-400" />
                  </div>
                </div>
              </div>

              {openMonths[month.id] && (
                <div className="p-4 space-y-5 animate-in slide-in-from-top-2 duration-200">
                  {/* Visual Connector Line */}

                  {/* Year/Month Selectors */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-zinc-400">{t.year}</span>
                      <Select
                        options={Array.from({ length: 7 }, (_, i) => {
                          const year = new Date().getFullYear() - 1 + i;
                          return { value: year, label: String(year) };
                        })}
                        value={month.year}
                        onChange={(value) => updateMonth(month.id, { year: parseInt(value) })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-zinc-400">{t.month}</span>
                      <div className="relative">
                        <Select
                          options={Array.from({ length: 12 }, (_, i) => ({
                            value: i,
                            label: getMonthName(i, state.language)
                          }))}
                          value={month.monthIndex}
                          onChange={(value) => updateMonth(month.id, { monthIndex: parseInt(value) })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Day Selector */}
                  <div className="bg-zinc-50 dark:bg-black/20 p-2.5 rounded-xl border border-dashed border-zinc-200 dark:border-white/10">
                    <span className="text-[10px] uppercase font-bold text-zinc-400 mb-1.5 block text-center">{t.meetingDay}</span>
                    <div className="flex justify-between gap-1">
                      {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map((day, i) => (
                        <button
                          key={i}
                          onClick={() => toggleDay(month.id, i)}
                          className={`w-7 h-7 rounded-md text-xs font-bold flex items-center justify-center transition-all ${month.selectedDays.includes(i)
                            ? 'bg-primary text-white shadow-md scale-105'
                            : 'bg-white dark:bg-zinc-800 text-zinc-400 hover:text-primary hover:bg-primary/5 dark:hover:bg-zinc-700'
                            }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Weeks Data */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between px-1 mb-1">
                      <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Semanas</span>
                      <button
                        onClick={() => addWeek(month.id)}
                        className="text-[10px] font-bold text-primary hover:bg-primary/10 px-2 py-0.5 rounded transition-colors flex items-center gap-1"
                      >
                        <Plus size={10} strokeWidth={3} /> {t.addWeek}
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {month.weeks.map((week, idx) => (
                        <div key={week.id} className="flex bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md overflow-hidden shadow-sm h-7 group/wkp">
                          <button
                            onClick={() => toggleAssembly(month.id, week.id)}
                            className={`px-2 flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${week.isAssembly ? 'bg-amber-400 text-amber-950 dark:bg-amber-500 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]' : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'}`}
                            title={week.isAssembly ? "Semana de Asamblea (clic para cancelar)" : "Marcar como Asamblea"}
                          >
                            {week.isAssembly ? '⭐ ASAMBLEA' : `SEMANA ${idx + 1}`}
                          </button>
                          <button
                            onClick={() => removeWeek(month.id, week.id)}
                            className="w-0 overflow-hidden group-hover/wkp:w-7 flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/40 transition-all duration-300 ease-out border-l border-transparent group-hover/wkp:border-zinc-200 dark:group-hover/wkp:border-zinc-700"
                            title={t.remove}
                          >
                            <Trash2 size={12} strokeWidth={2.5} className="shrink-0" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          <div className="space-y-2">
            {(() => {
              const currentBanner = state.banners?.[state.template] || { image: null, zoom: 1, x: 0, y: 0, showBanner: true };
              const maxMonths = currentBanner.showBanner === false ? 4 : 3;
              const isLimitReached = (state.template === 'acomodadores' || state.template === 'fin-de-semana' || state.template === 'audio-video') && state.months.length >= maxMonths;
              
              return (
                <>
                  <button
                    onClick={handleAddMonth}
                    disabled={isLimitReached}
                    className={`w-full py-3 rounded-lg border-2 border-dashed font-bold flex items-center justify-center gap-2 transition-all group ${isLimitReached
                      ? 'border-zinc-200 dark:border-zinc-800 text-zinc-300 dark:text-zinc-600 cursor-not-allowed'
                      : 'border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:text-primary hover:border-primary hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                      }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors shadow-sm ${isLimitReached
                      ? 'bg-zinc-50 dark:bg-zinc-900 text-zinc-300 dark:text-zinc-700'
                      : 'bg-zinc-100 dark:bg-zinc-800 group-hover:bg-primary group-hover:text-white'
                      }`}>
                      <Plus size={14} />
                    </div>
                    <span className="text-xs uppercase tracking-wide">{t.createNewMonth}</span>
                  </button>

                  {isLimitReached && (
                    <p className="text-[10px] text-center text-amber-600 dark:text-amber-500 font-medium px-2">
                      Límite de {maxMonths} meses alcanzado para esta plantilla.
                    </p>
                  )}
                </>
              );
            })()}
          </div>
        </div>

      </div>
    </div >
  );
};