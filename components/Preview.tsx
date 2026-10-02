import React, { useEffect, useState, useRef } from 'react';
import { AppState, MonthData, StyleConfig, WeekData, BannerState } from '../types';
import { TRANSLATIONS, getMonthName } from '../constants';
import { ZoomIn, ZoomOut, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Image as ImageIcon, CalendarDays, Settings, Trash2, Plus, GripVertical } from 'lucide-react';
import { useNameHistory } from '../hooks/useNameHistory';

interface Props {
    state: AppState;
    updateState: (updates: Partial<AppState>) => void;
    isGenerating: boolean;
}

const getStyleString = (config: StyleConfig) => {
    return {
        fontFamily: config.fontFamily,
        fontSize: `${config.fontSize}px`,
        color: config.color,
        backgroundColor: config.backgroundColor,
        fontWeight: config.fontWeight,
        fontStyle: config.fontStyle,
        textDecoration: config.textDecoration,
        textTransform: config.textTransform as any,
    };
};

export const Preview: React.FC<Props> = ({ state, updateState, isGenerating }) => {
    const t = TRANSLATIONS[state.language];
    const { names: nameHistory, addName } = useNameHistory();
    const bannerState = state.banners?.[state.template] || { image: null, zoom: 1, x: 0, y: 0, showBanner: true };
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const setBannerState = (b: BannerState) => {
        updateState({ banner: b });
    };

    // Logic to calculate dates for the table rows
    const getDatesForWeeks = (month: MonthData) => {
        if (month.selectedDays.length === 0) return [];

        const dates: string[] = [];
        const year = month.year;
        const monthIndex = month.monthIndex;

        const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
        let currentWeekDates: number[] = [];
        let currentWeekNumber = -1;

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, monthIndex, day);
            const dayOfWeek = date.getDay(); // 0 = Sun

            if (month.selectedDays.includes(dayOfWeek)) {
                const dist = (dayOfWeek + 6) % 7; // Mon=0, Sun=6
                const monday = new Date(date);
                monday.setDate(date.getDate() - dist);
                const weekNum = monday.getTime();

                if (weekNum !== currentWeekNumber) {
                    if (currentWeekDates.length > 0) {
                        dates.push(currentWeekDates.join(' y '));
                    }
                    currentWeekDates = [];
                    currentWeekNumber = weekNum;
                }
                currentWeekDates.push(day);
            }
        }
        if (currentWeekDates.length > 0) {
            dates.push(currentWeekDates.join(' y '));
        }
        return dates;
    };


    const [scale, setScale] = useState(1);

    const moveBanner = (dx: number, dy: number) => {
        if (!bannerState.image || isGenerating) return;
        setBannerState({
            ...bannerState,
            x: bannerState.x + dx,
            y: bannerState.y + dy
        });
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        if (!bannerState.image || isGenerating) return;
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging) return;
        const dx = (e.clientX - dragStart.x) / (scale * bannerState.zoom);
        const dy = (e.clientY - dragStart.y) / (scale * bannerState.zoom);
        
        setBannerState({
            ...bannerState,
            x: bannerState.x + dx,
            y: bannerState.y + dy
        });
        setDragStart({ x: e.clientX, y: e.clientY });
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        setIsDragging(false);
        try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch(err){}
    };

    const [adjustedTitleFontSize, setAdjustedTitleFontSize] = useState<number>(state.styles.title.fontSize);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const pdfDivRef = useRef<HTMLDivElement>(null);
    const [actualHeight, setActualHeight] = useState(1056);

    useEffect(() => {
        if (!pdfDivRef.current) return;
        const resizeObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                setActualHeight(entry.target.scrollHeight);
            }
        });
        resizeObserver.observe(pdfDivRef.current);
        return () => resizeObserver.disconnect();
    }, []);
    
    useEffect(() => {
        const handleResize = () => {
            const padding = window.innerWidth < 1050 ? 32 : 64;
            const availableWidth = window.innerWidth - padding;
            const newScale = Math.min(1, availableWidth / 816);
            setScale(newScale);
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (!titleRef.current) return;

        const adjustTitleSize = () => {
            const titleElement = titleRef.current;
            if (!titleElement) return;

            let currentSize = state.styles.title.fontSize;
            setAdjustedTitleFontSize(currentSize);
            titleElement.style.fontSize = `${currentSize}px`;

            const maxWidth = 816 - (1.5 * 16 * 2);
            let iterations = 0;
            while (titleElement.scrollWidth > maxWidth && currentSize > 12 && iterations < 50) {
                currentSize -= 1;
                titleElement.style.fontSize = `${currentSize}px`;
                setAdjustedTitleFontSize(currentSize);
                iterations++;
            }
        };

        const timeoutId = setTimeout(adjustTitleSize, 50);
        return () => clearTimeout(timeoutId);
    }, [state.styles.title.fontSize, state.template, state.language]);

    return (
        <div className="flex flex-col items-center justify-start w-full min-h-full">
            <div className="flex justify-center w-full relative" style={{ height: actualHeight * scale }}>
                <div
                    id="pdf-content"
                    ref={pdfDivRef}
                    className={`w-[816px] min-w-[816px] shrink-0 min-h-[1056px] bg-white text-black flex flex-col transition-all origin-top ${isGenerating ? '' : 'shadow-2xl'}`}
                    style={{ 
                        transform: isGenerating ? 'none' : `scale(${scale})`,
                        height: isGenerating ? 'auto' : undefined 
                    }}
                >
                    <div className="flex flex-col flex-grow relative pb-[20px]">
                        <div
                            className="w-full px-6 text-center z-20 pointer-events-none flex justify-center"
                            style={{ position: 'absolute', top: '1rem', left: 0 }}
                        >
                        {isGenerating ? (
                            <h2
                                ref={titleRef}
                                style={{
                                    ...getStyleString(state.styles.title),
                                    fontSize: `${adjustedTitleFontSize}px`,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    maxWidth: '100%'
                                }}
                                className="pointer-events-auto inline-block"
                            >
                                {state.styles.documentTitle || (state.template === 'acomodadores' ? t.previewTitleUshers : state.template === 'aseo' ? t.previewTitleCleaning : t.previewTitleWeekend)}
                            </h2>
                        ) : (
                            <input
                                ref={titleRef as any}
                                type="text"
                                style={{
                                    ...getStyleString(state.styles.title),
                                    fontSize: `${adjustedTitleFontSize}px`,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    maxWidth: '100%',
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    textAlign: 'center',
                                    width: '100%',
                                }}
                                className="pointer-events-auto inline-block hover:bg-black/5 dark:hover:bg-white/5 transition-colors focus:bg-black/5 dark:focus:bg-white/5 rounded px-2"
                                value={state.styles.documentTitle ?? (state.template === 'acomodadores' ? t.previewTitleUshers : state.template === 'aseo' ? t.previewTitleCleaning : t.previewTitleWeekend)}
                                onChange={(e) => updateState({ styles: { ...state.styles, documentTitle: e.target.value } })}
                            />
                        )}
                    </div>

                    {bannerState.showBanner !== false && (
                        <div
                            className="bg-zinc-100 rounded-lg overflow-hidden group border border-zinc-200 z-10 w-auto"
                            style={{ position: 'absolute', top: '5.5rem', left: '1.5rem', right: '1.5rem', height: '12rem' }}
                        >
                            {bannerState.image ? (
                                <div 
                                    className={`w-full h-full relative overflow-hidden ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} ${isGenerating ? 'pointer-events-none' : ''}`}
                                    onPointerDown={handlePointerDown}
                                    onPointerMove={handlePointerMove}
                                    onPointerUp={handlePointerUp}
                                    onPointerCancel={handlePointerUp}
                                >
                                    <img
                                        src={bannerState.image}
                                        alt="Banner"
                                        className="absolute pointer-events-none"
                                        style={{
                                            transform: `translate(-50%, -50%) scale(${bannerState.zoom}) translate(${bannerState.x}px, ${bannerState.y}px)`,
                                            left: '50%',
                                            top: '50%',
                                            transformOrigin: 'center center'
                                        }}
                                    />
                                </div>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400">
                                    <ImageIcon size={48} className="mb-2 opacity-50 pointer-events-none" />
                                    <p className="text-sm font-medium pointer-events-none">{t.previewPlaceholder}</p>
                                </div>
                            )}

                            {bannerState.image && !isGenerating && (
                                <div className="absolute bottom-3 md:bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 md:gap-2 bg-white dark:bg-zinc-900 px-3 py-1.5 md:px-4 md:py-2.5 rounded-full shadow-2xl border border-zinc-200 dark:border-zinc-800 print:hidden transition-all"
                                     onPointerDown={(e) => e.stopPropagation()}
                                >
                                    <div className="flex items-center gap-1 mr-1 pr-2 md:mr-2 md:pr-3 border-r border-zinc-200 dark:border-zinc-800">
                                        <button onClick={() => moveBanner(-10, 0)} className="p-1 md:p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-300 transition-colors" title="Mover izquierda"><ArrowLeft size={16} /></button>
                                        <button onClick={() => moveBanner(0, -10)} className="p-1 md:p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-300 transition-colors" title="Mover arriba"><ArrowUp size={16} /></button>
                                        <button onClick={() => moveBanner(0, 10)} className="p-1 md:p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-300 transition-colors" title="Mover abajo"><ArrowDown size={16} /></button>
                                        <button onClick={() => moveBanner(10, 0)} className="p-1 md:p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-300 transition-colors" title="Mover derecha"><ArrowRight size={16} /></button>
                                    </div>
                                    <button onClick={() => setBannerState({ ...bannerState, zoom: Math.max(0.5, Math.round((bannerState.zoom - 0.05) * 100) / 100) })} className="p-1 md:p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-600 dark:text-zinc-300 transition-colors shrink-0" title="Alejar">
                                        <ZoomOut size={16} />
                                    </button>
                                    <input
                                        type="range" min="0.5" max="3" step="0.05"
                                        value={bannerState.zoom}
                                        onChange={(e) => setBannerState({ ...bannerState, zoom: parseFloat(e.target.value) })}
                                        className="w-20 md:w-32 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-primary"
                                    />
                                    <button onClick={() => setBannerState({ ...bannerState, zoom: Math.min(3, Math.round((bannerState.zoom + 0.05) * 100) / 100) })} className="p-1 md:p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-600 dark:text-zinc-300 transition-colors shrink-0" title="Acercar">
                                        <ZoomIn size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    <div className={`flex-grow px-6 ${isGenerating ? 'space-y-3' : 'space-y-4'} mt-[295px]`}>
                        {state.months.map((month, mIndex) => {
                            const dates = getDatesForWeeks(month);

                            return (
                                <div key={month.id} className="relative shadow-sm group/month overflow-hidden" style={{ zIndex: 50 - mIndex, border: '1px solid #cbd5e1', borderRadius: '0.5rem', boxSizing: 'border-box', backgroundColor: '#ffffff', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                                    <div className="relative z-30">
                                        <table className="w-full" style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%' }}>
                                            <thead style={{ backgroundColor: '#f8fafc', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                                                <tr>
                                                    <th className="p-2 text-center w-[15%] text-xs font-semibold tracking-wider text-slate-700" style={{ ...getStyleString(state.styles.header), borderBottom: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', boxSizing: 'border-box', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                                                        {getMonthName(month.monthIndex, state.language).toUpperCase()}
                                                    </th>
                                                    {state.template === 'acomodadores' ? (
                                                        <>
                                                            <th className="p-2 text-center text-xs font-semibold tracking-wider text-slate-700" style={{ ...getStyleString(state.styles.header), borderBottom: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', boxSizing: 'border-box', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>{t.door}</th>
                                                            <th className="p-2 text-center text-xs font-semibold tracking-wider text-slate-700" style={{ ...getStyleString(state.styles.header), borderBottom: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', boxSizing: 'border-box', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>{t.auditorium}</th>
                                                            <th className="p-2 text-center text-xs font-semibold tracking-wider text-slate-700" style={{ ...getStyleString(state.styles.header), borderBottom: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', boxSizing: 'border-box', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>{t.mic1}</th>
                                                            <th className="p-2 text-center text-xs font-semibold tracking-wider text-slate-700" style={{ ...getStyleString(state.styles.header), borderBottom: '1px solid #cbd5e1', boxSizing: 'border-box', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>{t.mic2}</th>
                                                        </>
                                                    ) : state.template === 'aseo' ? (
                                                        <th className="p-2 text-center text-xs font-semibold tracking-wider text-slate-700" style={{ ...getStyleString(state.styles.header), borderBottom: '1px solid #cbd5e1', boxSizing: 'border-box', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>{t.assignedGroup}</th>
                                                    ) : (
                                                        <>
                                                            <th className="p-2 text-center text-xs font-semibold tracking-wider text-slate-700 w-[20%]" style={{ ...getStyleString(state.styles.header), borderBottom: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', boxSizing: 'border-box', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>{t.president}</th>
                                                            <th className="p-2 text-center text-xs font-semibold tracking-wider text-slate-700 w-[20%]" style={{ ...getStyleString(state.styles.header), borderBottom: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', boxSizing: 'border-box', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>{t.speaker}</th>
                                                            <th className="p-2 text-center text-xs font-semibold tracking-wider text-slate-700 w-[30%]" style={{ ...getStyleString(state.styles.header), borderBottom: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', boxSizing: 'border-box', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>{t.wtTheme}</th>
                                                            <th className="p-2 text-center text-xs font-semibold tracking-wider text-slate-700 w-[15%]" style={{ ...getStyleString(state.styles.header), borderBottom: '1px solid #cbd5e1', boxSizing: 'border-box', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>{t.reader}</th>
                                                        </>
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody style={getStyleString(state.styles.cell)}>
                                                {dates.length > 0 ? dates.map((dateStr, idx) => {
                                                    const weekData = month.weeks[idx] || { id: '', door: '', auditorium: '', mic1: '', mic2: '', group: '' };
                                                    const isLastRow = idx === dates.length - 1;
                                                    const rowBorder = isLastRow ? 'none' : '1px solid #cbd5e1';

                                                    return (
                                                        <tr key={idx} className={`transition-colors hover:bg-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`} style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                                                            <td className="p-2 text-center font-semibold text-slate-800" style={{ borderBottom: rowBorder, borderRight: '1px solid #cbd5e1', boxSizing: 'border-box' }}>{dateStr}</td>
                                                            {weekData.isAssembly ? (
                                                                <td colSpan={state.template === 'aseo' ? 1 : 4} className="p-0 text-center bg-amber-50/50" style={{ borderBottom: rowBorder, boxSizing: 'border-box', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                                                                    <div className="flex items-center justify-center w-full h-full p-2 text-sm font-bold text-amber-600 tracking-[0.2em] relative overflow-hidden" style={{ minHeight: '38px' }}>
                                                                        {/* Background pattern for visual flair in assembly rows */}
                                                                        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #d97706 10px, #d97706 20px)' }}></div>
                                                                        <span className="relative z-10 drop-shadow-sm">{t.assembly || 'ASAMBLEA'}</span>
                                                                    </div>
                                                                </td>
                                                            ) : state.template === 'acomodadores' ? (
                                                                <>
                                                                    <td className="p-0 text-center" style={{ borderBottom: rowBorder, borderRight: '1px solid #cbd5e1', boxSizing: 'border-box' }}>
                                                                        {isGenerating ? (
                                                                            <span style={{ display: 'block', padding: '0.5rem', color: 'inherit', font: 'inherit' }}>{weekData.door}</span>
                                                                        ) : (
                                                                            <input
                                                                                type="text"
                                                                                list="name-suggestions"
                                                                                value={weekData.door}
                                                                                onBlur={(e) => addName(e.target.value)}
                                                                                onChange={(e) => {
                                                                                    const newMonths = [...state.months];
                                                                                    const mIdx = newMonths.findIndex(m => m.id === month.id);
                                                                                    if (mIdx >= 0) {
                                                                                        const newWeeks = [...newMonths[mIdx].weeks];
                                                                                        const wIdx = newWeeks.findIndex(w => w.id === weekData.id);
                                                                                        if (wIdx >= 0) {
                                                                                            newWeeks[wIdx] = { ...newWeeks[wIdx], door: e.target.value };
                                                                                            newMonths[mIdx] = { ...newMonths[mIdx], weeks: newWeeks };
                                                                                            updateState({ months: newMonths });
                                                                                        }
                                                                                    }
                                                                                }}
                                                                                className="w-full h-full text-center bg-transparent border-none outline-none focus:ring-2 focus:ring-primary/20 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-text"
                                                                                style={{ padding: '0.5rem', color: 'inherit', font: 'inherit' }}
                                                                            />
                                                                        )}
                                                                    </td>
                                                                    <td className="p-0 text-center" style={{ borderBottom: rowBorder, borderRight: '1px solid #cbd5e1', boxSizing: 'border-box' }}>
                                                                        {isGenerating ? (
                                                                            <span style={{ display: 'block', padding: '0.5rem', color: 'inherit', font: 'inherit' }}>{weekData.auditorium}</span>
                                                                        ) : (
                                                                            <input
                                                                                type="text"
                                                                                list="name-suggestions"
                                                                                value={weekData.auditorium}
                                                                                onBlur={(e) => addName(e.target.value)}
                                                                                onChange={(e) => {
                                                                                    const newMonths = [...state.months];
                                                                                    const mIdx = newMonths.findIndex(m => m.id === month.id);
                                                                                    if (mIdx >= 0) {
                                                                                        const newWeeks = [...newMonths[mIdx].weeks];
                                                                                        const wIdx = newWeeks.findIndex(w => w.id === weekData.id);
                                                                                        if (wIdx >= 0) {
                                                                                            newWeeks[wIdx] = { ...newWeeks[wIdx], auditorium: e.target.value };
                                                                                            newMonths[mIdx] = { ...newMonths[mIdx], weeks: newWeeks };
                                                                                            updateState({ months: newMonths });
                                                                                        }
                                                                                    }
                                                                                }}
                                                                                className="w-full h-full text-center bg-transparent border-none outline-none focus:ring-2 focus:ring-primary/20 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-text"
                                                                                style={{ padding: '0.5rem', color: 'inherit', font: 'inherit' }}
                                                                            />
                                                                        )}
                                                                    </td>
                                                                    <td className="p-0 text-center" style={{ borderBottom: rowBorder, borderRight: '1px solid #cbd5e1', boxSizing: 'border-box' }}>
                                                                        {isGenerating ? (
                                                                            <span style={{ display: 'block', padding: '0.5rem', color: 'inherit', font: 'inherit' }}>{weekData.mic1}</span>
                                                                        ) : (
                                                                            <input
                                                                                type="text"
                                                                                list="name-suggestions"
                                                                                value={weekData.mic1}
                                                                                onBlur={(e) => addName(e.target.value)}
                                                                                onChange={(e) => {
                                                                                    const newMonths = [...state.months];
                                                                                    const mIdx = newMonths.findIndex(m => m.id === month.id);
                                                                                    if (mIdx >= 0) {
                                                                                        const newWeeks = [...newMonths[mIdx].weeks];
                                                                                        const wIdx = newWeeks.findIndex(w => w.id === weekData.id);
                                                                                        if (wIdx >= 0) {
                                                                                            newWeeks[wIdx] = { ...newWeeks[wIdx], mic1: e.target.value };
                                                                                            newMonths[mIdx] = { ...newMonths[mIdx], weeks: newWeeks };
                                                                                            updateState({ months: newMonths });
                                                                                        }
                                                                                    }
                                                                                }}
                                                                                className="w-full h-full text-center bg-transparent border-none outline-none focus:ring-2 focus:ring-primary/20 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-text"
                                                                                style={{ padding: '0.5rem', color: 'inherit', font: 'inherit' }}
                                                                            />
                                                                        )}
                                                                    </td>
                                                                    <td className="p-0 text-center" style={{ borderBottom: rowBorder, boxSizing: 'border-box' }}>
                                                                        {isGenerating ? (
                                                                            <span style={{ display: 'block', padding: '0.5rem', color: 'inherit', font: 'inherit' }}>{weekData.mic2}</span>
                                                                        ) : (
                                                                            <input
                                                                                type="text"
                                                                                list="name-suggestions"
                                                                                value={weekData.mic2}
                                                                                onBlur={(e) => addName(e.target.value)}
                                                                                onChange={(e) => {
                                                                                    const newMonths = [...state.months];
                                                                                    const mIdx = newMonths.findIndex(m => m.id === month.id);
                                                                                    if (mIdx >= 0) {
                                                                                        const newWeeks = [...newMonths[mIdx].weeks];
                                                                                        const wIdx = newWeeks.findIndex(w => w.id === weekData.id);
                                                                                        if (wIdx >= 0) {
                                                                                            newWeeks[wIdx] = { ...newWeeks[wIdx], mic2: e.target.value };
                                                                                            newMonths[mIdx] = { ...newMonths[mIdx], weeks: newWeeks };
                                                                                            updateState({ months: newMonths });
                                                                                        }
                                                                                    }
                                                                                }}
                                                                                className="w-full h-full text-center bg-transparent border-none outline-none focus:ring-2 focus:ring-primary/20 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-text"
                                                                                style={{ padding: '0.5rem', color: 'inherit', font: 'inherit' }}
                                                                            />
                                                                        )}
                                                                    </td>
                                                                </>
                                                            ) : state.template === 'aseo' ? (
                                                                <td className="p-0 text-center" style={{ borderBottom: rowBorder, boxSizing: 'border-box' }}>
                                                                    {isGenerating ? (
                                                                        <span style={{ display: 'block', padding: '0.5rem', color: 'inherit', font: 'inherit' }}>{weekData.group}</span>
                                                                    ) : (
                                                                        <input
                                                                            type="text"
                                                                            list="name-suggestions"
                                                                            value={weekData.group}
                                                                            onBlur={(e) => addName(e.target.value)}
                                                                            onChange={(e) => {
                                                                                const newMonths = [...state.months];
                                                                                const mIdx = newMonths.findIndex(m => m.id === month.id);
                                                                                if (mIdx >= 0) {
                                                                                    const newWeeks = [...newMonths[mIdx].weeks];
                                                                                    const wIdx = newWeeks.findIndex(w => w.id === weekData.id);
                                                                                    if (wIdx >= 0) {
                                                                                        newWeeks[wIdx] = { ...newWeeks[wIdx], group: e.target.value };
                                                                                        newMonths[mIdx] = { ...newMonths[mIdx], weeks: newWeeks };
                                                                                        updateState({ months: newMonths });
                                                                                    }
                                                                                }
                                                                            }}
                                                                            className="w-full h-full text-center bg-transparent border-none outline-none focus:ring-2 focus:ring-primary/20 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-text"
                                                                            style={{ padding: '0.5rem', color: 'inherit', font: 'inherit' }}
                                                                            placeholder="Grupo..."
                                                                        />
                                                                    )}
                                                                </td>
                                                            ) : (
                                                                <>
                                                                    <td className="p-0 text-center" style={{ borderBottom: rowBorder, borderRight: '1px solid #cbd5e1', boxSizing: 'border-box' }}>
                                                                        {isGenerating ? (
                                                                            <span style={{ display: 'block', padding: '0.5rem', color: 'inherit', font: 'inherit' }}>{weekData.president}</span>
                                                                        ) : (
                                                                            <input
                                                                                type="text"
                                                                                list="name-suggestions"
                                                                                value={weekData.president || ''}
                                                                                onBlur={(e) => addName(e.target.value)}
                                                                                onChange={(e) => {
                                                                                    const newMonths = [...state.months];
                                                                                    const mIdx = newMonths.findIndex(m => m.id === month.id);
                                                                                    if (mIdx >= 0) {
                                                                                        const newWeeks = [...newMonths[mIdx].weeks];
                                                                                        const wIdx = newWeeks.findIndex(w => w.id === weekData.id);
                                                                                        if (wIdx >= 0) {
                                                                                            newWeeks[wIdx] = { ...newWeeks[wIdx], president: e.target.value };
                                                                                            newMonths[mIdx] = { ...newMonths[mIdx], weeks: newWeeks };
                                                                                            updateState({ months: newMonths });
                                                                                        }
                                                                                    }
                                                                                }}
                                                                                className="w-full h-full text-center bg-transparent border-none outline-none focus:ring-2 focus:ring-primary/20 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-text"
                                                                                style={{ padding: '0.5rem', color: 'inherit', font: 'inherit' }}
                                                                            />
                                                                        )}
                                                                    </td>
                                                                    <td className="p-0 text-center" style={{ borderBottom: rowBorder, borderRight: '1px solid #cbd5e1', boxSizing: 'border-box' }}>
                                                                        {isGenerating ? (
                                                                            <span style={{ display: 'block', padding: '0.5rem', color: 'inherit', font: 'inherit' }}>{weekData.speaker}</span>
                                                                        ) : (
                                                                            <input
                                                                                type="text"
                                                                                list="name-suggestions"
                                                                                value={weekData.speaker || ''}
                                                                                onBlur={(e) => addName(e.target.value)}
                                                                                onChange={(e) => {
                                                                                    const newMonths = [...state.months];
                                                                                    const mIdx = newMonths.findIndex(m => m.id === month.id);
                                                                                    if (mIdx >= 0) {
                                                                                        const newWeeks = [...newMonths[mIdx].weeks];
                                                                                        const wIdx = newWeeks.findIndex(w => w.id === weekData.id);
                                                                                        if (wIdx >= 0) {
                                                                                            newWeeks[wIdx] = { ...newWeeks[wIdx], speaker: e.target.value };
                                                                                            newMonths[mIdx] = { ...newMonths[mIdx], weeks: newWeeks };
                                                                                            updateState({ months: newMonths });
                                                                                        }
                                                                                    }
                                                                                }}
                                                                                className="w-full h-full text-center bg-transparent border-none outline-none focus:ring-2 focus:ring-primary/20 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-text"
                                                                                style={{ padding: '0.5rem', color: 'inherit', font: 'inherit' }}
                                                                            />
                                                                        )}
                                                                    </td>
                                                                    <td className="p-0 text-center" style={{ borderBottom: rowBorder, borderRight: '1px solid #cbd5e1', boxSizing: 'border-box' }}>
                                                                        {isGenerating ? (
                                                                            <span style={{ display: 'block', padding: '0.5rem', color: 'inherit', font: 'inherit' }}>{weekData.wtTheme}</span>
                                                                        ) : (
                                                                            <input
                                                                                type="text"
                                                                                value={weekData.wtTheme || ''}
                                                                                onChange={(e) => {
                                                                                    const newMonths = [...state.months];
                                                                                    const mIdx = newMonths.findIndex(m => m.id === month.id);
                                                                                    if (mIdx >= 0) {
                                                                                        const newWeeks = [...newMonths[mIdx].weeks];
                                                                                        const wIdx = newWeeks.findIndex(w => w.id === weekData.id);
                                                                                        if (wIdx >= 0) {
                                                                                            newWeeks[wIdx] = { ...newWeeks[wIdx], wtTheme: e.target.value };
                                                                                            newMonths[mIdx] = { ...newMonths[mIdx], weeks: newWeeks };
                                                                                            updateState({ months: newMonths });
                                                                                        }
                                                                                    }
                                                                                }}
                                                                                className="w-full h-full text-center bg-transparent border-none outline-none focus:ring-2 focus:ring-primary/20 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-text"
                                                                                style={{ padding: '0.5rem', color: 'inherit', font: 'inherit' }}
                                                                            />
                                                                        )}
                                                                    </td>
                                                                    <td className="p-0 text-center" style={{ borderBottom: rowBorder, boxSizing: 'border-box' }}>
                                                                        {isGenerating ? (
                                                                            <span style={{ display: 'block', padding: '0.5rem', color: 'inherit', font: 'inherit' }}>{weekData.reader}</span>
                                                                        ) : (
                                                                            <input
                                                                                type="text"
                                                                                list="name-suggestions"
                                                                                value={weekData.reader || ''}
                                                                                onBlur={(e) => addName(e.target.value)}
                                                                                onChange={(e) => {
                                                                                    const newMonths = [...state.months];
                                                                                    const mIdx = newMonths.findIndex(m => m.id === month.id);
                                                                                    if (mIdx >= 0) {
                                                                                        const newWeeks = [...newMonths[mIdx].weeks];
                                                                                        const wIdx = newWeeks.findIndex(w => w.id === weekData.id);
                                                                                        if (wIdx >= 0) {
                                                                                            newWeeks[wIdx] = { ...newWeeks[wIdx], reader: e.target.value };
                                                                                            newMonths[mIdx] = { ...newMonths[mIdx], weeks: newWeeks };
                                                                                            updateState({ months: newMonths });
                                                                                        }
                                                                                    }
                                                                                }}
                                                                                className="w-full h-full text-center bg-transparent border-none outline-none focus:ring-2 focus:ring-primary/20 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-text"
                                                                                style={{ padding: '0.5rem', color: 'inherit', font: 'inherit' }}
                                                                            />
                                                                        )}
                                                                    </td>
                                                                </>
                                                            )}
                                                        </tr>
                                                    );
                                                }) : (
                                                    <tr>
                                                        <td colSpan={state.template === 'aseo' ? 2 : 5} className="p-6 text-center" style={{ borderTop: '1px solid #cbd5e1', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                                                            <div className="flex flex-col items-center justify-center gap-2">
                                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mb-1">
                                                                    <CalendarDays size={18} className="text-slate-500" />
                                                                </div>
                                                                <p className="font-semibold text-slate-700 text-sm">{t.noDatesTitle}</p>
                                                                <p className="text-[10px] text-slate-500">{t.noDatesDesc}</p>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className={`mt-auto px-6 pt-5 ${isGenerating ? 'pb-2' : 'pb-3'} border-t border-zinc-200 text-center bg-white z-20`}>
                        {isGenerating ? (
                            <div
                                style={getStyleString(state.styles.footer)}
                                dangerouslySetInnerHTML={{ __html: state.styles.footerText }}
                            />
                        ) : (
                            <textarea
                                className="w-full bg-transparent border-none outline-none resize-none overflow-hidden text-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors focus:bg-black/5 dark:focus:bg-white/5 rounded px-2"
                                style={{
                                    ...getStyleString(state.styles.footer),
                                    minHeight: '40px'
                                }}
                                value={state.styles.footerText.replace(/<br\s*\/?>/gi, '\n')}
                                onChange={(e) => {
                                    // Convert line breaks back to <br> for HTML rendering compatibility
                                    const htmlText = e.target.value.replace(/\n/g, '<br/>');
                                    updateState({ styles: { ...state.styles, footerText: htmlText } });
                                    // Auto-resize
                                    e.target.style.height = 'auto';
                                    e.target.style.height = (e.target.scrollHeight) + 'px';
                                }}
                                onInput={(e) => {
                                    const target = e.target as HTMLTextAreaElement;
                                    target.style.height = 'auto';
                                    target.style.height = target.scrollHeight + 'px';
                                }}
                            />
                        )}
                    </div>
                </div>

                {/* Datalist for names history auto-complete */}
                <datalist id="name-suggestions">
                    {nameHistory.map((name, i) => (
                        <option key={i} value={name} />
                    ))}
                </datalist>
            </div>
            </div>
            
            {/* Bloque físico que garantiza el margen visual bajo la hoja sin depender de un margin-bottom colapsable 👇 */}
            <div className="w-full shrink-0 h-[100px] md:h-[140px] pointer-events-none opacity-0"></div>
        </div>
    );
};