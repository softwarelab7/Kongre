export type Language = 'es' | 'en' | 'pt' | 'fr' | 'it' | 'ru' | 'pl';

export type TemplateType = 'acomodadores' | 'aseo' | 'fin-de-semana' | 'audio-video'; // Extendable

export interface StyleConfig {
  fontFamily: string;
  fontSize: number;
  color: string;
  backgroundColor?: string; // For headers
  fontWeight: string;
  fontStyle: string;
  textDecoration: string;
  textTransform: string;
}

export interface StylesState {
  title: StyleConfig;
  header: StyleConfig;
  cell: StyleConfig;
  footer: StyleConfig;
  footerText: string;
  documentTitle?: string;
}

export interface WeekData {
  id: string;
  door: string;
  auditorium: string;
  mic1: string;
  mic2: string;
  group: string; // For cleaning
  // For weekend meeting
  president?: string;
  speaker?: string;
  wtTheme?: string;
  reader?: string;
  isAssembly?: boolean; // True if this week is reserved for an assembly
  // For audio and video
  audioVideo?: string;
}

export interface MonthData {
  id: string;
  year: number;
  monthIndex: number;
  selectedDays: number[]; // 0=Sun, 1=Mon, etc.
  weeks: WeekData[];
}

export interface BannerState {
  image: string | null;
  zoom: number;
  x: number;
  y: number;
  showBanner?: boolean;
}

export interface AppState {
  template: TemplateType;
  months: MonthData[];
  styles: StylesState;
  banners: Record<TemplateType, BannerState>;
  language: Language;
  theme: 'light' | 'dark';
  colorTheme: string;
}

export interface ThemeColor {
  id: string;
  label: string;
  color: string; // Hex for UI display
  rgb: string;   // RGB values for Tailwind variable (e.g. "59 130 246")
}

declare global {
  interface Window {
    html2pdf: any;
  }
}
