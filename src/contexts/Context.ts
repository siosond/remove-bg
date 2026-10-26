import { createContext } from 'react';
import { baseLocale } from '../paraglide/runtime';
import type { Language } from '../App';

export const LanguageContext = createContext<Language>(baseLocale);
