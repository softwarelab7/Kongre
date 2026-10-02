import { MonthData, Language, WeekData } from '../types';
import { WATCHTOWER_THEMES } from '../data/watchtowerThemes';

/**
 * Maps app languages to Watchtower Online Library (WOL) library paths.
 */
const WOL_LANG_CONFIG: Record<string, { path: string; rsconf: string; lib: string }> = {
  es: { path: 'es', rsconf: 'r4', lib: 'lp-s' },
  en: { path: 'en', rsconf: 'r1', lib: 'lp-e' },
  pt: { path: 'pt', rsconf: 'r5', lib: 'lp-t' },
  fr: { path: 'fr', rsconf: 'r30', lib: 'lp-f' },
  it: { path: 'it', rsconf: 'r6', lib: 'lp-i' },
  ru: { path: 'ru', rsconf: 'r2', lib: 'lp-u' },
  pl: { path: 'pl', rsconf: 'r12', lib: 'lp-p' },
};

/**
 * Returns Watchtower study title from the bundled offline dataset if available.
 */
export function getWatchtowerThemeForSunday(year: number, month: number, day: number): string | null {
  const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return WATCHTOWER_THEMES[key]?.title || null;
}

/**
 * Fallback online fetcher using CORS proxies when date or language is not in bundled data.
 */
export async function fetchOnlineWatchtowerTheme(
  year: number,
  month: number,
  day: number,
  lang: string = 'es'
): Promise<string | null> {
  const cfg = WOL_LANG_CONFIG[lang] || WOL_LANG_CONFIG.es;
  const targetUrl = `https://wol.jw.org/${cfg.path}/wol/dt/${cfg.rsconf}/${cfg.lib}/${year}/${month}/${day}`;

  const proxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
    `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`,
  ];

  for (const proxyUrl of proxies) {
    try {
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        const html = await res.text();
        const match = html.match(/groupTOC[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>[\s\S]*?<a[^>]*><strong>([\s\S]*?)<\/strong><\/a>/i);
        if (match) {
          return match[2].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
        }
      }
    } catch {
      // Continue to next proxy
    }
  }
  return null;
}

/**
 * Retrieves all Sundays in a given month (0-indexed month).
 */
export function getAllSundaysInMonth(year: number, monthIndex: number): number[] {
  const sundays: number[] = [];
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, monthIndex, d);
    if (dt.getDay() === 0) {
      sundays.push(d);
    }
  }
  return sundays;
}

/**
 * Automatically populates or refreshes Watchtower Study titles for a single MonthData object.
 */
export async function populateWatchtowerThemesForMonth(
  month: MonthData,
  language: Language = 'es',
  overwriteExisting: boolean = true
): Promise<MonthData> {
  const year = month.year;
  const monthIndex = month.monthIndex; // 0-based
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const allSundays = getAllSundaysInMonth(year, monthIndex);

  // Calculate matching Sunday for each week based on selected meeting days
  const weekSundays: (number | null)[] = [];
  if (month.selectedDays && month.selectedDays.length > 0) {
    let currentWeekDates: number[] = [];
    let currentWeekNumber = -1;

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, monthIndex, day);
      const dayOfWeek = date.getDay();

      if (month.selectedDays.includes(dayOfWeek)) {
        const dist = (dayOfWeek + 6) % 7;
        const monday = new Date(date);
        monday.setDate(date.getDate() - dist);
        const weekNum = monday.getTime();

        if (weekNum !== currentWeekNumber) {
          if (currentWeekDates.length > 0) {
            const firstD = currentWeekDates[0];
            const dObj = new Date(year, monthIndex, firstD);
            const dow = dObj.getDay();
            const sunD = dow === 0 ? firstD : firstD + (7 - dow);
            weekSundays.push(sunD);
          }
          currentWeekDates = [];
          currentWeekNumber = weekNum;
        }
        currentWeekDates.push(day);
      }
    }
    if (currentWeekDates.length > 0) {
      const firstD = currentWeekDates[0];
      const dObj = new Date(year, monthIndex, firstD);
      const dow = dObj.getDay();
      const sunD = dow === 0 ? firstD : firstD + (7 - dow);
      weekSundays.push(sunD);
    }
  }

  const targetCount = Math.max(month.weeks.length, allSundays.length, weekSundays.length, 5);
  const baseWeeks: WeekData[] = [...month.weeks];
  while (baseWeeks.length < targetCount) {
    baseWeeks.push({
      id: crypto.randomUUID(),
      door: '', auditorium: '', mic1: '', mic2: '', group: '',
      president: '', speaker: '', wtTheme: '', reader: ''
    });
  }

  const updatedWeeks: WeekData[] = await Promise.all(
    baseWeeks.map(async (week, idx) => {
      // Do not overwrite assembly weeks or existing themes if overwriteExisting is false
      if (week.isAssembly) return week;
      if (!overwriteExisting && week.wtTheme && week.wtTheme.trim() !== '') return week;

      let sunDay = weekSundays[idx] ?? allSundays[idx];
      let targetYear = year;
      let targetMonth = monthIndex + 1;

      if (sunDay && sunDay > daysInMonth) {
        const nextMonthDate = new Date(year, monthIndex, sunDay);
        targetYear = nextMonthDate.getFullYear();
        targetMonth = nextMonthDate.getMonth() + 1;
        sunDay = nextMonthDate.getDate();
      }

      if (!sunDay) return week;

      // 1. Check local dataset (fast, 0ms, works offline)
      let theme = getWatchtowerThemeForSunday(targetYear, targetMonth, sunDay);

      // 2. If not found, try live query
      if (!theme) {
        theme = await fetchOnlineWatchtowerTheme(targetYear, targetMonth, sunDay, language);
      }

      if (theme) {
        return { ...week, wtTheme: theme };
      }
      return week;
    })
  );

  return { ...month, weeks: updatedWeeks };
}

/**
 * Automatically populates or refreshes Watchtower Study titles for all months.
 */
export async function populateWatchtowerThemesForAllMonths(
  months: MonthData[],
  language: Language = 'es',
  overwriteExisting: boolean = true
): Promise<MonthData[]> {
  return Promise.all(months.map(m => populateWatchtowerThemesForMonth(m, language, overwriteExisting)));
}
