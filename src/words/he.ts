import type { WordEntry } from './types'

/**
 * Hebrew word bank — authored for Hebrew (not translated). Each entry: the real
 * word, a near-twin (easy), a same-category-but-distinct word (medium), and a
 * category for hard mode.
 */
export const HE_WORDS: WordEntry[] = [
  // אוכל ושתייה
  { main: 'פיצה', easy: 'המבורגר', medium: 'סושי', category: 'food' },
  { main: 'קפה', easy: 'תה', medium: 'בירה', category: 'food' },
  { main: 'עוגה', easy: 'עוגייה', medium: 'לחם', category: 'food' },
  { main: 'תפוח', easy: 'תפוז', medium: 'אבטיח', category: 'food' },
  { main: 'מרק', easy: 'תבשיל', medium: 'סלט', category: 'food' },
  { main: 'גלידה', easy: 'מילקשייק', medium: "צ'יפס", category: 'food' },

  // חיות
  { main: 'אריה', easy: 'נמר', medium: 'פיל', category: 'animal' },
  { main: 'כלב', easy: 'חתול', medium: 'דג', category: 'animal' },
  { main: 'כריש', easy: 'לווייתן', medium: 'סרטן', category: 'animal' },
  { main: 'נשר', easy: 'ינשוף', medium: 'פינגווין', category: 'animal' },
  { main: 'סוס', easy: 'חמור', medium: 'פרה', category: 'animal' },
  { main: 'נחש', easy: 'תולעת', medium: 'צפרדע', category: 'animal' },

  // מקומות
  { main: 'ים', easy: 'בריכה', medium: 'הר', category: 'place' },
  { main: 'יער', easy: "ג'ונגל", medium: 'מדבר', category: 'place' },
  { main: 'בית חולים', easy: 'מרפאה', medium: 'בית ספר', category: 'place' },
  { main: 'מסעדה', easy: 'בית קפה', medium: 'ספרייה', category: 'place' },
  { main: 'טירה', easy: 'ארמון', medium: 'מערה', category: 'place' },
  { main: 'מוזיאון', easy: 'גלריה', medium: 'אצטדיון', category: 'place' },

  // ספורט ומשחקים
  { main: 'כדורגל', easy: 'כדורסל', medium: 'שחייה', category: 'sport' },
  { main: 'טניס', easy: 'פינג פונג', medium: 'אגרוף', category: 'sport' },
  { main: 'סקי', easy: 'החלקה על הקרח', medium: 'גלישה', category: 'sport' },
  { main: 'ריצה', easy: 'רכיבה על אופניים', medium: 'הרמת משקולות', category: 'sport' },
  { main: 'גולף', easy: 'באולינג', medium: 'קשתות', category: 'sport' },
  { main: 'בייסבול', easy: 'קריקט', medium: 'כדורעף', category: 'sport' },

  // חפצים
  { main: 'גיטרה', easy: 'כינור', medium: 'תופים', category: 'object' },
  { main: 'טלפון', easy: 'טאבלט', medium: 'מצלמה', category: 'object' },
  { main: 'שעון', easy: 'שעון יד', medium: 'לוח שנה', category: 'object' },
  { main: 'מטרייה', easy: 'מעיל גשם', medium: 'משקפי שמש', category: 'object' },
  { main: 'כיסא', easy: 'ספה', medium: 'מיטה', category: 'object' },
  { main: 'סכין', easy: 'מזלג', medium: 'מספריים', category: 'object' },

  // טבע ומזג אוויר
  { main: 'גשם', easy: 'שלג', medium: 'רוח', category: 'nature' },
  { main: 'שמש', easy: 'ירח', medium: 'ענן', category: 'nature' },
  { main: 'נהר', easy: 'אגם', medium: 'אוקיינוס', category: 'nature' },
  { main: 'ורד', easy: 'צבעוני', medium: 'קקטוס', category: 'nature' },
  { main: 'אש', easy: 'עשן', medium: 'קרח', category: 'nature' },
  { main: 'כוכב', easy: 'כוכב לכת', medium: 'שביט', category: 'nature' },

  // תחבורה
  { main: 'מכונית', easy: 'אוטובוס', medium: 'מטוס', category: 'transport' },
  { main: 'אופניים', easy: 'אופנוע', medium: 'סקייטבורד', category: 'transport' },
  { main: 'אונייה', easy: 'סירה', medium: 'צוללת', category: 'transport' },
  { main: 'רכבת', easy: 'רכבת תחתית', medium: 'מסוק', category: 'transport' },
  { main: 'משאית', easy: 'טנדר', medium: 'טרקטור', category: 'transport' },
  { main: 'טיל', easy: 'חללית', medium: 'כדור פורח', category: 'transport' },

  // אנשים ומקצועות
  { main: 'רופא', easy: 'אחות', medium: 'שף', category: 'job' },
  { main: 'מורה', easy: 'מרצה', medium: 'שוטר', category: 'job' },
  { main: 'חקלאי', easy: 'גנן', medium: 'דייג', category: 'job' },
  { main: 'מלך', easy: 'נסיך', medium: 'קוסם', category: 'job' },
  { main: 'מלצר', easy: 'ברמן', medium: 'ספר', category: 'job' },
  { main: 'צייר', easy: 'פסל', medium: 'מוזיקאי', category: 'job' },
]
