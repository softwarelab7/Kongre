import React, { useState, useEffect } from 'react';
import { LayoutGrid, Moon, Sun, Download, Printer, Settings, Palette, FileText, Languages, Check, RotateCcw, ChevronDown } from 'lucide-react';
import { AppState, StylesState, Language } from './types';
import { INITIAL_STYLES, TRANSLATIONS, THEME_COLORS } from './constants';
import { Preview } from './components/Preview';
import { useVersionCheck } from './hooks/useVersionCheck';
import { UpdatePopup } from './components/UpdatePopup';
import { TopToolbar } from './components/TopToolbar';
import { MobileBottomToolbar } from './components/MobileBottomToolbar';
import { MobileFormView } from './components/MobileFormView';
import { populateWatchtowerThemesForAllMonths, populateWatchtowerThemesForMonth } from './services/watchtowerService';

export default function App() {
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'form' | 'preview'>('form');

  const isUpdateAvailable = useVersionCheck();

  const [state, setState] = useState<AppState>(() => {
    const initialBanner = { image: null, zoom: 1, x: 0, y: 0, showBanner: true };
    const defaultBanners = { 
      acomodadores: { ...initialBanner }, 
      aseo: { ...initialBanner },
      'fin-de-semana': { ...initialBanner }
    };

    const saved = typeof window !== 'undefined' ? localStorage.getItem('HUB_TEOCRATICO_STATE_V1') : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        
        // Migration: single banner -> banners Record
        if (parsed.banner && !parsed.banners) {
          parsed.banners = { 
            acomodadores: { ...parsed.banner }, 
            aseo: { ...initialBanner },
            'fin-de-semana': { ...initialBanner }
          };
          delete parsed.banner;
        }

        return {
          template: 'acomodadores',
          months: [],
          styles: INITIAL_STYLES,
          language: 'es',
          theme: typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
          colorTheme: 'blue',
          ...parsed,
          banners: {
            ...defaultBanners,
            ...(parsed.banners || {})
          }
        };
      } catch (e) {
        console.error("Error loading state:", e);
      }
    }
    return {
      template: 'acomodadores',
      months: [],
      styles: INITIAL_STYLES,
      banners: defaultBanners,
      language: 'es',
      theme: typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
      colorTheme: 'blue'
    };
  });

  useEffect(() => {
    localStorage.setItem('HUB_TEOCRATICO_STATE_V1', JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (state.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.theme]);

  // Close menus on click outside
  useEffect(() => {
    const closeMenu = () => {
      setIsLangMenuOpen(false);
      setIsThemeMenuOpen(false);
      setIsExportMenuOpen(false);
    };
    if (isLangMenuOpen || isThemeMenuOpen || isExportMenuOpen) {
      window.addEventListener('click', closeMenu);
    }
    return () => window.removeEventListener('click', closeMenu);
  }, [isLangMenuOpen, isThemeMenuOpen, isExportMenuOpen]);

  useEffect(() => {
    const themeColor = THEME_COLORS.find(c => c.id === state.colorTheme) || THEME_COLORS[0];
    document.documentElement.style.setProperty('--color-primary', themeColor.rgb);
  }, [state.colorTheme]);

  useEffect(() => {
    if (state.months.length === 0) {
      const initialMonth = {
        id: crypto.randomUUID(),
        year: new Date().getFullYear(),
        monthIndex: new Date().getMonth(),
        selectedDays: [],
        weeks: Array.from({ length: 5 }).map(() => ({
          id: crypto.randomUUID(),
          door: '', auditorium: '', mic1: '', mic2: '', group: '',
          president: '', speaker: '', wtTheme: '', reader: ''
        }))
      };
      if (state.template === 'fin-de-semana') {
        populateWatchtowerThemesForMonth(initialMonth, state.language, false).then(m => {
          setState(prev => ({ ...prev, months: [m] }));
        });
      } else {
        setState(prev => ({ ...prev, months: [initialMonth] }));
      }
    }
  }, []);

  // Auto-populate Watchtower study themes when in 'fin-de-semana' template
  const isPopulatingThemesRef = React.useRef(false);
  useEffect(() => {
    if (state.template !== 'fin-de-semana' || isPopulatingThemesRef.current) return;

    const hasEmptyTheme = state.months.some(m =>
      m.weeks.some(w => !w.isAssembly && (!w.wtTheme || w.wtTheme.trim() === ''))
    );

    if (!hasEmptyTheme) return;

    isPopulatingThemesRef.current = true;
    let isCancelled = false;

    populateWatchtowerThemesForAllMonths(state.months, state.language, false)
      .then(newMonths => {
        if (isCancelled) return;
        let hasChanges = false;
        for (let i = 0; i < newMonths.length; i++) {
          const origMonth = state.months[i];
          if (!origMonth) continue;
          for (let j = 0; j < newMonths[i].weeks.length; j++) {
            if (newMonths[i].weeks[j].wtTheme !== origMonth.weeks[j]?.wtTheme) {
              hasChanges = true;
              break;
            }
          }
          if (hasChanges) break;
        }

        if (hasChanges) {
          setState(prev => ({ ...prev, months: newMonths }));
        }
      })
      .finally(() => {
        isPopulatingThemesRef.current = false;
      });

    return () => {
      isCancelled = true;
    };
  }, [state.template, state.months, state.language]);

  const t = TRANSLATIONS[state.language];

  const updateState = React.useCallback((updates: Partial<AppState>) => {
    setState(prev => {
      // Handle legacy 'banner' update by mapping it to the active template in 'banners'
      const finalUpdates = { ...updates };
      if ((updates as any).banner) {
        const activeTemplate = (updates.template as any) || prev.template;
        const currentBanners = prev.banners || { 
          acomodadores: { image: null, zoom: 1, x: 0, y: 0, showBanner: true }, 
          aseo: { image: null, zoom: 1, x: 0, y: 0, showBanner: true },
          'fin-de-semana': { image: null, zoom: 1, x: 0, y: 0, showBanner: true }
        };
        finalUpdates.banners = {
          ...currentBanners,
          [activeTemplate]: (updates as any).banner
        };
        delete (finalUpdates as any).banner;
      }

      const newState = { ...prev, ...finalUpdates };
      
      const currentBannerState = newState.banners?.[newState.template] || { image: null, zoom: 1, x: 0, y: 0, showBanner: true };
      const maxMonths = currentBannerState.showBanner === false ? 4 : 3;

      if ((newState.template === 'acomodadores' || newState.template === 'fin-de-semana') && newState.months.length > maxMonths) {
        newState.months = newState.months.slice(0, maxMonths);
      }
      return newState;
    });
  }, []);

  const updateStyle = React.useCallback((section: keyof StylesState, config: any) => {
    setState(prev => ({
      ...prev,
      styles: {
        ...prev.styles,
        [section]: config
      }
    }));
  }, []);

  const resetState = () => {
    const initialBanner = { image: null, zoom: 1, x: 0, y: 0, showBanner: true };
    const initialState: AppState = {
      template: 'acomodadores',
      months: [{
        id: crypto.randomUUID(),
        year: new Date().getFullYear(),
        monthIndex: new Date().getMonth(),
        selectedDays: [],
        weeks: Array.from({ length: 5 }).map(() => ({
          id: crypto.randomUUID(),
          door: '', auditorium: '', mic1: '', mic2: '', group: '',
          president: '', speaker: '', wtTheme: '', reader: ''
        }))
      }],
      styles: INITIAL_STYLES,
      banners: { 
        acomodadores: { ...initialBanner }, 
        aseo: { ...initialBanner },
        'fin-de-semana': { ...initialBanner }
      },
      language: 'es',
      theme: typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
      colorTheme: 'blue'
    };
    setState(initialState);
    localStorage.removeItem('HUB_TEOCRATICO_STATE_V1');
    setIsResetModalOpen(false);
  };

  const downloadPDF = async () => {
    setIsGeneratingPDF(true);
    const el = document.getElementById('pdf-content');

    if (el) {
      // 1. Temporarily freeze dimensions matching the physical paper size (816px width)
      const origWidth = el.style.width;
      const origPosition = el.style.position;
      const origZoom = el.style.zoom;
      
      el.style.transition = 'none';
      el.style.position = 'absolute';
      el.style.setProperty('width', '816px', 'important');
      el.style.zoom = '1';

      // Force synchronous reflow to get true printed height
      void el.offsetHeight;
      const contentHeight = el.scrollHeight;
      const pageHeight = 1056; 

      // 2. Apply scale if oversized
      if (contentHeight > pageHeight) {
         const ratio = pageHeight / contentHeight;
         // Apply inverse width so it spans the full horizontal space cleanly
         el.style.setProperty('width', `${(816 / ratio).toFixed(2)}px`, 'important');
         el.style.zoom = ratio.toString();
      }

      // Allow DOM to paint
      await new Promise(resolve => setTimeout(resolve, 300));
      window.print();

      // 3. Restore all original styles
      el.style.zoom = origZoom;
      el.style.width = origWidth;
      el.style.position = origPosition;
      el.style.transition = '';
    } else {
      window.print();
    }
    
    setIsGeneratingPDF(false);
  };


  const LANGUAGES: { code: Language; label: string }[] = [
    { code: 'es', label: 'Español' },
    { code: 'en', label: 'English' },
    { code: 'pt', label: 'Português' },
    { code: 'fr', label: 'Français' },
    { code: 'it', label: 'Italiano' },
    { code: 'ru', label: 'Русский' },
    { code: 'pl', label: 'Polski' }
  ];

  return (
    <div className="h-screen w-full overflow-hidden bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-200 font-sans flex flex-col print:h-auto print:overflow-visible">
      {/* Navbar */}
      <header className="h-16 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-white/5 flex items-center justify-between px-4 md:px-8 sticky top-0 z-50 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <LayoutGrid className="text-white" size={24} />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent">
              Hub Teocrático JW
            </h1>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-500 font-medium uppercase tracking-widest">Editor de Programaciones</p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {/* Export Button */}
          <button
              onClick={downloadPDF}
              disabled={isGeneratingPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 rounded-lg font-bold text-xs md:text-sm shadow-sm transition-all disabled:opacity-50 active:scale-95"
          >
              {isGeneratingPDF
                  ? <div className="w-4 h-4 border-[2px] border-white/30 border-t-white dark:border-zinc-900/30 dark:border-t-zinc-900 rounded-full animate-spin" />
                  : <Download size={16} />
              }
              <span className="hidden sm:inline">Exportar PDF</span>
          </button>

          <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 hidden sm:block" />

          {/* Theme & Extras */}
          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setIsLangMenuOpen(!isLangMenuOpen); }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors border border-zinc-200 dark:border-white/5"
              >
                <Languages size={18} className="text-zinc-500 dark:text-zinc-400" />
                <span className="text-sm font-medium uppercase">{state.language}</span>
              </button>

              {isLangMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-40 bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-zinc-200 dark:border-white/5 overflow-hidden py-1 z-50 animate-in fade-in zoom-in-95 duration-200">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => { updateState({ language: lang.code }); setIsLangMenuOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors ${state.language === lang.code ? 'text-primary font-bold bg-primary/5' : 'text-zinc-600 dark:text-zinc-300'}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase">{lang.code}</span>
                        <span>{lang.label}</span>
                      </div>
                      {state.language === lang.code && <Check size={16} className="text-primary" />}
                    </button>
                  ))}
                </div>
              )}
            </div>


            <button
              onClick={() => updateState({ theme: state.theme === 'light' ? 'dark' : 'light' })}
              className="p-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-all active:scale-95"
            >
              {state.theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>

            <button
              onClick={() => setIsResetModalOpen(true)}
              className="p-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-all active:scale-95"
              title="Restablecer App"
            >
              <RotateCcw size={20} />
            </button>

          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden relative scrollbar-thin print:h-auto print:overflow-visible">

        <TopToolbar
          state={state}
          updateState={updateState}
          updateStyle={updateStyle}
          onDownload={downloadPDF}
          isGeneratingPDF={isGeneratingPDF}
        />

        {/* Mobile Tabs Header */}
        <div className="md:hidden sticky top-0 z-40 bg-zinc-100 dark:bg-zinc-950 p-2 border-b border-zinc-200 dark:border-white/5 print:hidden">
          <div className="flex bg-zinc-200 dark:bg-zinc-900 rounded-xl p-1">
            <button
              onClick={() => setMobileTab('form')}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${mobileTab === 'form' ? 'bg-white dark:bg-zinc-800 text-primary shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
            >
              📝 Formulario
            </button>
            <button
              onClick={() => setMobileTab('preview')}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${mobileTab === 'preview' ? 'bg-white dark:bg-zinc-800 text-primary shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
            >
              📄 Vista Previa
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 bg-zinc-100 dark:bg-zinc-950 px-2 py-4 md:p-8 min-[1050px]:p-12 min-[1050px]:flex min-[1050px]:justify-center w-full max-w-full overflow-x-hidden print:p-0 print:bg-white print:overflow-visible">

          {/* Form View (Mobile Only) */}
          <div className={`md:hidden ${mobileTab === 'form' ? 'block' : 'hidden'} w-full max-w-full overflow-hidden mx-auto print:hidden`}>
            <MobileFormView state={state} updateState={updateState} />
          </div>

          {/* Preview View (Desktop + Mobile Tab 'preview') */}
          <div className={`${mobileTab === 'preview' ? 'block' : 'hidden'} md:block w-full max-w-[816px] origin-top transition-transform duration-500 pb-32 md:pb-0 mx-auto print:p-0 print:m-0 print:max-w-none print:w-auto print:block`}>
            <Preview state={state} updateState={updateState} isGenerating={isGeneratingPDF} />
          </div>
        </main>

        {
          isGeneratingPDF && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center">
              <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-2xl max-w-sm w-full mx-4 border border-zinc-200 dark:border-white/10 animate-in zoom-in-95 duration-300">
                <div className="flex flex-col items-center gap-6 text-center">
                  <div className="relative">
                    <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    <Download className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary" size={32} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Generando PDF</h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">Por favor espera un momento...</p>
                  </div>
                  <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-blue-400 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
          )
        }

        {
          isResetModalOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
              <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full animate-in zoom-in-95 duration-200">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-500 flex items-center justify-center shadow-inner">
                    <RotateCcw size={24} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Confirmar reinicio</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">¿Estás seguro de que quieres restablecer la app? No se puede deshacer.</p>
                  </div>
                  <div className="flex flex-col w-full gap-2 mt-2">
                    <button onClick={resetState} className="w-full py-3 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-red-500/20">Sí, restablecer todo</button>
                    <button onClick={() => setIsResetModalOpen(false)} className="w-full py-3 bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-bold rounded-xl transition-all">Cancelar</button>
                  </div>
                </div>
              </div>
            </div>
          )}

        <UpdatePopup isUpdateAvailable={isUpdateAvailable} />

        <MobileBottomToolbar state={state} updateStyle={updateStyle} />
      </div>
    </div>
  );
}
