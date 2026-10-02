import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AppState, StyleConfig } from '../types';
import { TRANSLATIONS, FONTS } from '../constants';
import { Download, Palette, Upload, Trash2, Check, ChevronDown, Bold, Italic, Underline, CaseUpper, Plus, Minus, LayoutTemplate, Image as ImageIcon, Settings, BookOpen } from 'lucide-react';
import { populateWatchtowerThemesForMonth, populateWatchtowerThemesForAllMonths } from '../services/watchtowerService';

interface Props {
    state: AppState;
    updateState: (updates: Partial<AppState>) => void;
    updateStyle: (section: keyof AppState['styles'], config: StyleConfig) => void;
    onDownload: () => void;
    isGeneratingPDF: boolean;
}

const Sep = () => <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-700 mx-1 shrink-0" />;

const MONTH_THEMES = [
    { base: 'text-blue-700 dark:text-blue-400',  bgActive: 'bg-blue-600 border-blue-700',  bgInactive: 'bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:border-blue-900' },
    { base: 'text-violet-700 dark:text-violet-400', bgActive: 'bg-violet-600 border-violet-700', bgInactive: 'bg-violet-50 border-violet-200 dark:bg-violet-950/40 dark:border-violet-900' },
    { base: 'text-fuchsia-700 dark:text-fuchsia-400', bgActive: 'bg-fuchsia-600 border-fuchsia-700', bgInactive: 'bg-fuchsia-50 border-fuchsia-200 dark:bg-fuchsia-950/40 dark:border-fuchsia-900' },
    { base: 'text-rose-700 dark:text-rose-400',  bgActive: 'bg-rose-600 border-rose-700',  bgInactive: 'bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-900' },
    { base: 'text-orange-700 dark:text-orange-400', bgActive: 'bg-orange-600 border-orange-700', bgInactive: 'bg-orange-50 border-orange-200 dark:bg-orange-950/40 dark:border-orange-900' },
    { base: 'text-amber-700 dark:text-amber-400',  bgActive: 'bg-amber-600 border-amber-700',  bgInactive: 'bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-900' },
    { base: 'text-emerald-700 dark:text-emerald-400', bgActive: 'bg-emerald-600 border-emerald-700', bgInactive: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900' },
    { base: 'text-teal-700 dark:text-teal-400',  bgActive: 'bg-teal-600 border-teal-700',  bgInactive: 'bg-teal-50 border-teal-200 dark:bg-teal-950/40 dark:border-teal-900' },
    { base: 'text-cyan-700 dark:text-cyan-400',  bgActive: 'bg-cyan-600 border-cyan-700',  bgInactive: 'bg-cyan-50 border-cyan-200 dark:bg-cyan-950/40 dark:border-cyan-900' },
    { base: 'text-sky-700 dark:text-sky-400', bgActive: 'bg-sky-600 border-sky-700', bgInactive: 'bg-sky-50 border-sky-200 dark:bg-sky-950/40 dark:border-sky-900' },
    { base: 'text-indigo-700 dark:text-indigo-400', bgActive: 'bg-indigo-600 border-indigo-700', bgInactive: 'bg-indigo-50 border-indigo-200 dark:bg-indigo-950/40 dark:border-indigo-900' },
    { base: 'text-pink-700 dark:text-pink-400',  bgActive: 'bg-pink-600 border-pink-700',  bgInactive: 'bg-pink-50 border-pink-200 dark:bg-pink-950/40 dark:border-pink-900' },
];

export const TopToolbar: React.FC<Props> = ({ state, updateState, updateStyle, onDownload, isGeneratingPDF }) => {
    const t = TRANSLATIONS[state.language];
    const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false);
    const [isFontMenuOpen, setIsFontMenuOpen] = useState(false);
    const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
    const [activeStyleTab, setActiveStyleTab] = useState<'title' | 'header' | 'cell' | 'footer'>('title');
    const templateBtnRef = useRef<HTMLButtonElement>(null);
    const templateMenuRef = useRef<HTMLDivElement>(null);
    const fontBtnRef = useRef<HTMLButtonElement>(null);
    const fontMenuRef = useRef<HTMLDivElement>(null);

    const [activeMonthSettings, setActiveMonthSettings] = useState<string | null>(null);
    const [monthSettingsMenuPos, setMonthSettingsMenuPos] = useState({ top: 0, left: 0 });
    const monthSettingsMenuRef = useRef<HTMLDivElement>(null);
    const [isMonthSelectOpen, setIsMonthSelectOpen] = useState(false);
    const [isYearSelectOpen, setIsYearSelectOpen] = useState(false);
    const monthSelectRef = useRef<HTMLDivElement>(null);
    const yearSelectRef = useRef<HTMLDivElement>(null);

    const getMonthName = (index: number, language: AppState['language']) => {
        const date = new Date(2025, index, 1);
        const name = date.toLocaleString(language === 'es' ? 'es-ES' : 'en-US', { month: 'long' });
        return name.charAt(0).toUpperCase() + name.slice(1);
    };

    const [isLoadingThemes, setIsLoadingThemes] = useState(false);

    const handleSyncWatchtowerThemes = async () => {
        setIsLoadingThemes(true);
        try {
            const updated = await populateWatchtowerThemesForAllMonths(state.months, state.language, true);
            updateState({ months: updated });
        } catch (e) {
            console.error("Error populating Watchtower themes:", e);
        } finally {
            setIsLoadingThemes(false);
        }
    };

    const removeMonth = (id: string) => updateState({ months: state.months.filter(m => m.id !== id) });
    const updateMonth = async (id: string, updates: any) => {
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
        updateMonth(monthId, { weeks: [...month.weeks, { id: crypto.randomUUID(), door: '', auditorium: '', mic1: '', mic2: '', group: '', president: '', speaker: '', wtTheme: '', reader: '' }] });
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

    const openTemplateMenu = () => {
        if (templateBtnRef.current) {
            const rect = templateBtnRef.current.getBoundingClientRect();
            setMenuPos({ top: rect.bottom + 4, left: rect.left });
        }
        setIsTemplateMenuOpen(v => !v);
    };

    const openFontMenu = () => {
        if (fontBtnRef.current) {
            const rect = fontBtnRef.current.getBoundingClientRect();
            setMenuPos({ top: rect.bottom + 4, left: rect.left });
        }
        setIsFontMenuOpen(v => !v);
        setIsTemplateMenuOpen(false);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const t = event.target as Node;
            if (isTemplateMenuOpen && !templateBtnRef.current?.contains(t) && !templateMenuRef.current?.contains(t)) {
                setIsTemplateMenuOpen(false);
            }
            if (isFontMenuOpen && !fontBtnRef.current?.contains(t) && !fontMenuRef.current?.contains(t)) {
                setIsFontMenuOpen(false);
            }
            if (isMonthSelectOpen && !monthSelectRef.current?.contains(t)) {
                setIsMonthSelectOpen(false);
            }
            if (isYearSelectOpen && !yearSelectRef.current?.contains(t)) {
                setIsYearSelectOpen(false);
            }
            if (activeMonthSettings && !monthSettingsMenuRef.current?.contains(t) && !(t as Element).closest('.month-settings-toggle')) {
                setActiveMonthSettings(null);
                setIsMonthSelectOpen(false);
                setIsYearSelectOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isTemplateMenuOpen, isFontMenuOpen, activeMonthSettings, isMonthSelectOpen, isYearSelectOpen]);

    const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const currentBanner = state.banners?.[state.template] || { image: null, zoom: 1, x: 0, y: 0, showBanner: true };
            const reader = new FileReader();
            reader.onload = (ev) => updateState({ 
                banner: { ...currentBanner, image: ev.target?.result as string, showBanner: true, zoom: 1, x: 0, y: 0 } 
            });
            reader.readAsDataURL(file);
        }
    };

    const handleAddMonth = async () => {
        const currentBanner = state.banners?.[state.template] || { image: null, zoom: 1, x: 0, y: 0, showBanner: true };
        const maxMonths = currentBanner.showBanner === false ? 4 : 3;
        if ((state.template === 'acomodadores' || state.template === 'fin-de-semana') && state.months.length >= maxMonths) {
            alert(t.maxMonthsAcomodadoresLimit || "Límite alcanzado");
            return;
        }

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

        let newMonth = {
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
    };

    const currentConfig = state.styles[activeStyleTab];
    const handleChangeStyle = (key: keyof StyleConfig, value: any) =>
        updateStyle(activeStyleTab, { ...currentConfig, [key]: value });

    const iconBtn = (active: boolean) =>
        `w-8 h-8 flex items-center justify-center rounded-md transition-all duration-150 cursor-pointer ${active
            ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
            : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80 hover:text-zinc-800 dark:hover:text-zinc-100'}`;

    const STYLE_TABS = [
        { id: 'title',  label: t.mainTitle },
        { id: 'header', label: t.tableHeaders },
        { id: 'cell',   label: t.cellContent },
        { id: 'footer', label: t.footer },
    ] as const;

    return (
        <div className="sticky top-0 z-40 w-full print:hidden bg-white dark:bg-[#18181b] border-b border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors">

            {/* ── COMPACT TOOLBAR ROW (SINGLE LINE, FIT ALL) ── */}
            <div className="flex items-center h-12 px-1 md:px-2 gap-0.5 w-full bg-white dark:bg-[#18181b] overflow-hidden whitespace-nowrap">

                {/* 1. Template Selector */}
                <button
                    ref={templateBtnRef}
                    onClick={openTemplateMenu}
                    className="flex items-center gap-1 pl-2 pr-1.5 h-8 rounded-md text-[12px] font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors shrink-0"
                >
                    <LayoutTemplate size={14} className="text-zinc-400 shrink-0" />
                    <span className="hidden lg:block max-w-[80px] xl:max-w-[100px] truncate text-[11px] xl:text-[12px]">
                        {state.template === 'acomodadores' ? t.templateUshers : state.template === 'aseo' ? t.templateCleaning : t.templateWeekend}
                    </span>
                    <ChevronDown size={12} className={`text-zinc-400 transition-transform duration-200 ${isTemplateMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                <Sep />

                {/* 2. Banner Controls */}
                {(() => {
                    const currentBanner = state.banners?.[state.template] || { image: null, zoom: 1, x: 0, y: 0, showBanner: true };
                    return (
                        <div className="flex items-center gap-1 shrink-0">
                            <div className="flex items-center h-8 rounded-md border border-zinc-200 dark:border-zinc-700 overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                                <button
                                    onClick={() => updateState({ banner: { ...currentBanner, showBanner: true } })}
                                    className={`px-3 h-full text-[12px] font-medium border-r border-zinc-200 dark:border-zinc-700 transition-all ${currentBanner.showBanner !== false ? 'bg-primary text-white' : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
                                >
                                    Sí
                                </button>
                                <button
                                    onClick={() => updateState({ banner: { ...currentBanner, showBanner: false } })}
                                    className={`px-3 h-full text-[12px] font-medium transition-all ${currentBanner.showBanner === false ? 'bg-primary text-white' : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
                                >
                                    No
                                </button>
                            </div>

                            {currentBanner.showBanner !== false && (
                                <>
                                    <input type="file" accept="image/*" className="hidden" id="banner-upload-compact" onChange={handleBannerUpload} />
                                    <label
                                        htmlFor="banner-upload-compact"
                                        title={currentBanner.image ? "Cambiar imagen" : "Subir imagen"}
                                        className={`flex items-center gap-1.5 h-8 px-2.5 rounded-md text-[12px] font-medium cursor-pointer transition-all border ${currentBanner.image ? 'bg-primary/10 hover:bg-primary/20 text-primary border-primary/30 dark:border-primary/20' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
                                    >
                                        {currentBanner.image ? <ImageIcon size={13} /> : <Upload size={13} />}
                                        <span className="hidden lg:block text-[11px] xl:text-[12px]">{currentBanner.image ? 'Cambiar' : 'Subir'}</span>
                                    </label>
                                    {currentBanner.image && (
                                        <button
                                            onClick={(e) => { e.preventDefault(); updateState({ banner: { ...currentBanner, image: null } }); }}
                                            className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors"
                                            title="Quitar imagen"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    );
                })()}

                <Sep />

                {/* 3. Section Tab Selector (segmented) */}
                <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-md shrink-0">
                    {STYLE_TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveStyleTab(tab.id)}
                            className={`px-1.5 py-1 xl:px-2.5 xl:py-1.5 text-[10.5px] xl:text-[12px] font-medium rounded whitespace-nowrap transition-all duration-150 ${
                                activeStyleTab === tab.id
                                    ? 'bg-white dark:bg-zinc-700 text-primary shadow-sm'
                                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <Sep />

                {/* 4. Font Family */}
                <div className="relative flex items-center shrink-0">
                    <button
                        ref={fontBtnRef}
                        onClick={openFontMenu}
                        className="flex items-center justify-between h-8 w-[85px] pl-1.5 pr-1.5 text-[12px] text-zinc-800 dark:text-zinc-200 bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md outline-none cursor-pointer transition-colors border border-transparent hover:border-zinc-300 dark:hover:border-zinc-600"
                    >
                        <span className="truncate" style={{ fontFamily: currentConfig.fontFamily }}>
                            {currentConfig.fontFamily.split(',')[0].replace(/['"]/g, '')}
                        </span>
                        <ChevronDown size={11} className={`text-zinc-400 pointer-events-none shrink-0 transition-transform duration-200 ${isFontMenuOpen ? 'rotate-180' : ''}`} />
                    </button>
                </div>

                {/* 5. Font Size */}
                <div className="flex items-center shrink-0">
                    <button onClick={() => handleChangeStyle('fontSize', Math.max(8, currentConfig.fontSize - 1))} className={iconBtn(false)}><Minus size={13} /></button>
                    <input
                        type="number"
                        value={currentConfig.fontSize}
                        onChange={(e) => handleChangeStyle('fontSize', Math.max(8, Math.min(100, parseInt(e.target.value) || 12)))}
                        className="w-8 xl:w-11 h-8 text-center text-[12px] xl:text-[13px] font-medium bg-transparent outline-none text-zinc-800 dark:text-zinc-200 border border-transparent hover:border-zinc-300 dark:hover:border-zinc-600 rounded-md appearance-none transition-colors"
                    />
                    <button onClick={() => handleChangeStyle('fontSize', Math.min(100, currentConfig.fontSize + 1))} className={iconBtn(false)}><Plus size={13} /></button>
                </div>

                <Sep />

                {/* 6. Text Styling */}
                <div className="flex items-center shrink-0">
                    <button onClick={() => handleChangeStyle('fontWeight', currentConfig.fontWeight === 'bold' ? 'normal' : 'bold')} className={iconBtn(currentConfig.fontWeight === 'bold')} title="Negrita"><Bold size={15} strokeWidth={currentConfig.fontWeight === 'bold' ? 2.5 : 2} /></button>
                    <button onClick={() => handleChangeStyle('fontStyle', currentConfig.fontStyle === 'italic' ? 'normal' : 'italic')} className={iconBtn(currentConfig.fontStyle === 'italic')} title="Cursiva"><Italic size={15} /></button>
                    <button onClick={() => handleChangeStyle('textDecoration', currentConfig.textDecoration === 'underline' ? 'none' : 'underline')} className={iconBtn(currentConfig.textDecoration === 'underline')} title="Subrayado"><Underline size={15} /></button>
                    <button onClick={() => handleChangeStyle('textTransform', currentConfig.textTransform === 'uppercase' ? 'none' : 'uppercase')} className={iconBtn(currentConfig.textTransform === 'uppercase')} title="Mayúsculas"><CaseUpper size={16} /></button>
                </div>

                <Sep />

                {/* 7. Colors */}
                <div className="flex items-center gap-0.5 shrink-0">
                    <div className="relative" title="Color de texto">
                        <div className={`${iconBtn(false)} flex-col !h-8 pt-1 cursor-pointer`}>
                            <span className="text-[15px] leading-none font-bold text-zinc-700 dark:text-zinc-200">A</span>
                            <div className="w-5 h-[3px] rounded-full mt-0.5" style={{ backgroundColor: currentConfig.color }} />
                        </div>
                        <input type="color" value={currentConfig.color} onChange={(e) => handleChangeStyle('color', e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    </div>

                    {activeStyleTab === 'header' && (
                        <div className="relative" title="Color de fondo">
                            <div className={`${iconBtn(false)} flex-col !h-8 pt-1 cursor-pointer`}>
                                <Palette size={14} className="text-zinc-500 dark:text-zinc-400" />
                                <div className="w-5 h-[3px] rounded-full mt-0.5 border border-zinc-300 dark:border-zinc-600" style={{ backgroundColor: currentConfig.backgroundColor || '#ffffff' }} />
                            </div>
                            <input type="color" value={currentConfig.backgroundColor || '#ffffff'} onChange={(e) => handleChangeStyle('backgroundColor', e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                        </div>
                    )}
                </div>
            </div>

            {/* ── SECONDARY ROW: MESES ── */}
            {/* ── SECONDARY ROW: MESES ── */}
            <div className="flex items-center h-10 px-2 md:px-4 gap-2 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#18181b]/80 w-full overflow-x-auto">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mr-2 shrink-0">
                    {state.language === 'en' ? 'Table Settings:' : 'Configurar Tablas:'}
                </span>
                
                {state.months.map((month) => {
                    const theme = MONTH_THEMES[month.monthIndex % 12];
                    return (
                        <button
                            key={month.id}
                            className={`month-settings-toggle flex items-center gap-1.5 h-7 px-2.5 rounded border transition-colors text-[11px] font-bold whitespace-nowrap shrink-0 ${
                                activeMonthSettings === month.id 
                                    ? `${theme.bgActive} text-white shadow-sm` 
                                    : `${theme.bgInactive} ${theme.base} hover:brightness-95 dark:hover:brightness-125 shadow-sm`
                            }`}
                            onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setMonthSettingsMenuPos({ top: rect.bottom + 8, left: rect.left });
                                setActiveMonthSettings(activeMonthSettings === month.id ? null : month.id);
                            }}
                        >
                            <span>{getMonthName(month.monthIndex, state.language)} {month.year}</span>
                            <Settings size={12} className={activeMonthSettings === month.id ? 'text-white' : 'opacity-60'} />
                        </button>
                    );
                })}

                <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-700 mx-1 shrink-0" />

                {/* Add Month Button natively within the segmented control */}
                <button
                    onClick={handleAddMonth}
                    disabled={state.template === 'acomodadores' && state.months.length >= ((state.banners?.[state.template]?.showBanner === false) ? 4 : 3)}
                    className="flex items-center gap-1 h-7 px-2.5 bg-zinc-200/60 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 font-bold text-[10px] uppercase rounded border border-dashed border-zinc-300 dark:border-zinc-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0 shadow-sm"
                    title={t.createNewMonth || "Añadir Mes"}
                >
                    <Plus size={13} strokeWidth={2.5} />
                    <span className="hidden sm:inline-block">{t.createNewMonth || "AÑADIR MES"}</span>
                </button>

                {state.template === 'fin-de-semana' && (
                    <>
                        <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-700 mx-1 shrink-0" />
                        <button
                            onClick={handleSyncWatchtowerThemes}
                            disabled={isLoadingThemes}
                            className="flex items-center gap-1.5 h-7 px-2.5 rounded bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-all font-bold text-[10px] uppercase shrink-0 shadow-sm disabled:opacity-50"
                            title={t.loadWatchtowerThemes}
                        >
                            <BookOpen size={12} className={isLoadingThemes ? "animate-spin" : ""} />
                            <span>{isLoadingThemes ? t.loadingThemes : t.loadWatchtowerThemes}</span>
                        </button>
                    </>
                )}
            </div>

            {/* Template dropdown portal */}
            {isTemplateMenuOpen && typeof document !== 'undefined' && createPortal(
                <div
                    style={{ top: menuPos.top, left: menuPos.left }}
                        ref={templateMenuRef}
                    className="fixed w-48 bg-white dark:bg-[#202124] rounded-lg shadow-[0_8px_30px_-4px_rgba(0,0,0,0.2)] border border-zinc-200 dark:border-zinc-700 overflow-hidden py-1 z-[200] animate-in fade-in zoom-in-95 duration-150"
                >
                    {[
                        { id: 'acomodadores', label: t.templateUshers },
                        { id: 'aseo', label: t.templateCleaning },
                        { id: 'fin-de-semana', label: t.templateWeekend },
                    ].map(item => (
                        <button
                            key={item.id}
                            onClick={async () => {
                                if (item.id === 'fin-de-semana') {
                                    const populated = await populateWatchtowerThemesForAllMonths(state.months, state.language, false);
                                    updateState({ template: item.id as any, months: populated });
                                } else {
                                    updateState({ template: item.id as any });
                                }
                                setIsTemplateMenuOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-[13px] flex items-center justify-between gap-2 transition-colors ${state.template === item.id ? 'bg-primary/5 text-primary font-medium' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                        >
                            <span>{item.label}</span>
                            {state.template === item.id && <Check size={13} />}
                        </button>
                    ))}
                </div>,
                document.body
            )}

            {/* Font dropdown portal */}
            {isFontMenuOpen && typeof document !== 'undefined' && createPortal(
                <div
                    style={{ top: menuPos.top, left: menuPos.left }}
                    ref={fontMenuRef}
                    className="fixed w-44 bg-white dark:bg-[#202124] rounded-lg shadow-[0_8px_30px_-4px_rgba(0,0,0,0.2)] border border-zinc-200 dark:border-zinc-700 overflow-y-auto max-h-64 py-1 z-[200] animate-in fade-in zoom-in-95 duration-150"
                >
                    {FONTS.map(f => (
                        <button
                            key={f}
                            onClick={() => { handleChangeStyle('fontFamily', f); setIsFontMenuOpen(false); }}
                            className={`w-full text-left px-4 py-2 text-[13px] flex items-center justify-between gap-2 transition-colors ${currentConfig.fontFamily === f ? 'bg-primary/5 text-primary font-medium' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                        >
                            <span style={{ fontFamily: f }}>{f.split(',')[0].replace(/['"]/g, '')}</span>
                            {currentConfig.fontFamily === f && <Check size={13} />}
                        </button>
                    ))}
                </div>,
                document.body
            )}

            {/* Month Settings dropdown portal */}
            {activeMonthSettings && typeof document !== 'undefined' && createPortal(
                <div
                    style={{ top: monthSettingsMenuPos.top, left: monthSettingsMenuPos.left }}
                    ref={monthSettingsMenuRef}
                    className="fixed w-max max-w-[calc(100vw-2rem)] bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-[0_12px_40px_-8px_rgba(0,0,0,0.25)] p-2 z-[200] animate-in fade-in zoom-in-95 duration-150 month-settings-popover flex flex-col md:flex-row items-center gap-2"
                >
                    {(() => {
                        const month = state.months.find(m => m.id === activeMonthSettings);
                        if (!month) return null;
                        const theme = MONTH_THEMES[month.monthIndex % 12];
                        const dotColor = theme.bgActive.split(' ')[0];

                        return (
                            <>
                                {/* Block 1: Date */}
                                <div className="flex items-center bg-zinc-50 dark:bg-zinc-800/60 p-1.5 rounded-[12px] border border-zinc-100 dark:border-zinc-800/80">
                                    <div className={`w-2 h-2 rounded-full mx-2 ${dotColor}`} title={getMonthName(month.monthIndex, state.language)} />
                                    <div className="relative" ref={monthSelectRef}>
                                        <button 
                                            onClick={() => { setIsMonthSelectOpen(!isMonthSelectOpen); setIsYearSelectOpen(false); }}
                                            className="flex items-center gap-1.5 text-[12px] font-bold h-7 pl-1.5 pr-2 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700/50 rounded transition-colors outline-none"
                                        >
                                            {getMonthName(month.monthIndex, state.language)}
                                            <ChevronDown size={12} className={`text-zinc-400 transition-transform ${isMonthSelectOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                        
                                        {isMonthSelectOpen && (
                                            <div className="absolute top-full left-0 mt-1.5 max-h-48 overflow-y-auto bg-white dark:bg-[#202124] rounded-lg shadow-[0_8px_30px_-4px_rgba(0,0,0,0.2)] border border-zinc-200 dark:border-zinc-700 py-1 z-[210] min-w-[120px] animate-in fade-in zoom-in-95 duration-100 scrollbar-thin">
                                                {Array.from({ length: 12 }).map((_, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => { updateMonth(month.id, { monthIndex: i }); setIsMonthSelectOpen(false); }}
                                                        className={`w-full text-left px-3 py-1.5 text-[12px] transition-colors flex items-center justify-between ${month.monthIndex === i ? 'bg-primary/10 text-primary font-bold' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                                                    >
                                                        {getMonthName(i, state.language)}
                                                        {month.monthIndex === i && <Check size={12} />}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-0.5" />
                                    <div className="relative" ref={yearSelectRef}>
                                        <button 
                                            onClick={() => { setIsYearSelectOpen(!isYearSelectOpen); setIsMonthSelectOpen(false); }}
                                            className="flex items-center gap-1.5 text-[12px] font-bold h-7 pl-1.5 pr-2 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700/50 rounded transition-colors outline-none"
                                        >
                                            {month.year}
                                            <ChevronDown size={12} className={`text-zinc-400 transition-transform ${isYearSelectOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                        
                                        {isYearSelectOpen && (
                                            <div className="absolute top-full left-0 mt-1.5 max-h-48 overflow-y-auto bg-white dark:bg-[#202124] rounded-lg shadow-[0_8px_30px_-4px_rgba(0,0,0,0.2)] border border-zinc-200 dark:border-zinc-700 py-1 z-[210] min-w-[80px] animate-in fade-in zoom-in-95 duration-100 scrollbar-thin">
                                                {Array.from({ length: 10 }).map((_, i) => {
                                                    const yr = new Date().getFullYear() - 2 + i;
                                                    return (
                                                        <button
                                                            key={yr}
                                                            onClick={() => { updateMonth(month.id, { year: yr }); setIsYearSelectOpen(false); }}
                                                            className={`w-full text-left px-3 py-1.5 text-[12px] transition-colors flex items-center justify-between ${month.year === yr ? 'bg-primary/10 text-primary font-bold' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                                                        >
                                                            {yr}
                                                            {month.year === yr && <Check size={12} />}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Block 2: Days */}
                                <div className="flex items-center gap-1 bg-zinc-50 dark:bg-zinc-800/60 p-1.5 rounded-[12px] border border-zinc-100 dark:border-zinc-800/80">
                                    {month.selectedDays.length < 2 && (
                                        <span className="text-[9px] font-extrabold text-zinc-400 px-1 tracking-widest uppercase animate-in fade-in slide-in-from-left-1 duration-200 w-full overflow-hidden whitespace-nowrap hidden sm:inline-flex">
                                            {state.language === 'en' ? 'Select meeting days' : 'Seleccione Días de Reunión'}
                                        </span>
                                    )}
                                    {(state.language === 'en' ? ['S', 'M', 'T', 'W', 'T', 'F', 'S'] : ['D', 'L', 'M', 'X', 'J', 'V', 'S']).map((day, i) => {
                                        const isSel = month.selectedDays.includes(i);
                                        return (
                                            <button
                                                key={i}
                                                onClick={() => toggleDay(month.id, i)}
                                                className={`w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-[11px] font-bold transition-all ${
                                                    isSel 
                                                        ? `${dotColor} text-white shadow-sm`
                                                        : 'hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 bg-white dark:bg-zinc-800 border border-zinc-200/50 dark:border-zinc-700/50'
                                                }`}
                                            >
                                                {day}
                                            </button>
                                        )
                                    })}
                                </div>

                                {/* Block 3: Weeks */}
                                <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-800/60 p-1.5 rounded-[12px] border border-zinc-100 dark:border-zinc-800/80">
                                    <span className="text-[9px] font-extrabold text-zinc-400 px-1 tracking-widest uppercase">
                                        {state.language === 'en' ? 'Weeks' : 'Semanas'}
                                    </span>
                                    {month.weeks.map((week, idx) => (
                                        <div key={week.id} className="flex bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-[8px] overflow-hidden shadow-sm h-7 group/wkp">
                                            <button 
                                                onClick={() => toggleAssembly(month.id, week.id)}
                                                className={`w-7 flex items-center justify-center text-[12px] font-bold transition-all duration-300 ${week.isAssembly ? 'bg-amber-400 text-amber-950 dark:bg-amber-500 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]' : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'}`}
                                                title={week.isAssembly ? "Semana de Asamblea (clic para cancelar)" : "Marcar como Asamblea"}
                                            >
                                                {week.isAssembly ? '⭐' : idx + 1}
                                            </button>
                                            <button 
                                                onClick={() => removeWeek(month.id, week.id)}
                                                className="w-0 overflow-hidden group-hover/wkp:w-6 flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/40 transition-all duration-300 ease-out border-l border-transparent group-hover/wkp:border-zinc-200 dark:group-hover/wkp:border-zinc-700"
                                                title="Eliminar semana"
                                            >
                                                <Trash2 size={11} strokeWidth={2.5} className="shrink-0" />
                                            </button>
                                        </div>
                                    ))}
                                    <button onClick={() => addWeek(month.id)} className={`w-7 h-7 rounded-[8px] flex items-center justify-center transition-colors hover:opacity-80 ${theme.base} bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200 dark:border-zinc-700`} title="Añadir Semana">
                                        <Plus size={13} strokeWidth={3} />
                                    </button>
                                </div>

                                {/* Block 4: Delete */}
                                <div className="pl-1 border-l border-zinc-100 dark:border-zinc-800">
                                    <button onClick={() => { removeMonth(month.id); setActiveMonthSettings(null); }} className="w-8 h-8 flex items-center justify-center rounded-[10px] text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors" title="Eliminar Mes">
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </>
                        );
                    })()}
                </div>,
                document.body
            )}

        </div>
    );
};
