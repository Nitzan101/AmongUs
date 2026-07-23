import type { WordPair } from './types'

/**
 * Hebrew word bank — authored for Hebrew (not translated), including a few
 * Israeli-flavoured pairs. Same principle: related enough to bluff, different
 * enough to expose. Grouped by theme for review.
 */
export const HE_PAIRS: WordPair[] = [
  // אוכל ושתייה
  { main: 'פיצה', confusing: 'המבורגר' },
  { main: 'קפה', confusing: 'תה' },
  { main: 'פלאפל', confusing: 'חומוס' },
  { main: 'שקשוקה', confusing: 'חביתה' },
  { main: 'סושי', confusing: 'סלט' },
  { main: 'עוגה', confusing: 'עוגייה' },
  { main: 'גלידה', confusing: 'מילקשייק' },
  { main: 'לחם', confusing: 'אורז' },
  { main: 'תפוח', confusing: 'תפוז' },
  { main: 'שוקולד', confusing: 'סוכרייה' },
  { main: 'מרק', confusing: 'תבשיל' },
  { main: 'יין', confusing: 'בירה' },

  // חיות
  { main: 'אריה', confusing: 'נמר' },
  { main: 'כלב', confusing: 'חתול' },
  { main: 'כריש', confusing: 'לווייתן' },
  { main: 'נשר', confusing: 'ינשוף' },
  { main: 'ארנב', confusing: 'סנאי' },
  { main: 'דבורה', confusing: 'פרפר' },
  { main: 'סוס', confusing: 'חמור' },
  { main: 'צפרדע', confusing: 'לטאה' },
  { main: 'דולפין', confusing: 'כלב ים' },
  { main: 'נחש', confusing: 'תולעת' },
  { main: 'דוב', confusing: 'זאב' },
  { main: 'פיל', confusing: 'קרנף' },

  // מקומות
  { main: 'ים', confusing: 'בריכה' },
  { main: 'הר', confusing: 'גבעה' },
  { main: 'יער', confusing: "ג'ונגל" },
  { main: 'עיר', confusing: 'כפר' },
  { main: 'בית חולים', confusing: 'מרפאה' },
  { main: 'בית ספר', confusing: 'אוניברסיטה' },
  { main: 'ספרייה', confusing: 'חנות ספרים' },
  { main: 'שדה תעופה', confusing: 'תחנת רכבת' },
  { main: 'מסעדה', confusing: 'בית קפה' },
  { main: 'מדבר', confusing: 'סוואנה' },

  // ספורט ופעילויות
  { main: 'כדורגל', confusing: 'כדורסל' },
  { main: 'טניס', confusing: 'פינג פונג' },
  { main: 'שחייה', confusing: 'צלילה' },
  { main: 'ריצה', confusing: 'רכיבה על אופניים' },
  { main: 'אגרוף', confusing: 'היאבקות' },
  { main: 'סקי', confusing: 'החלקה על הקרח' },
  { main: 'שחמט', confusing: 'דמקה' },
  { main: 'יוגה', confusing: 'פילאטיס' },
  { main: 'גולף', confusing: 'באולינג' },

  // חפצים
  { main: 'גיטרה', confusing: 'כינור' },
  { main: 'פסנתר', confusing: 'תופים' },
  { main: 'טלפון', confusing: 'טאבלט' },
  { main: 'שעון קיר', confusing: 'שעון יד' },
  { main: 'מטרייה', confusing: 'מעיל גשם' },
  { main: 'עיפרון', confusing: 'עט' },
  { main: 'כיסא', confusing: 'ספה' },
  { main: 'סכין', confusing: 'מזלג' },
  { main: 'מצלמה', confusing: 'משקפת' },
  { main: 'נר', confusing: 'מנורה' },

  // טבע ומזג אוויר
  { main: 'גשם', confusing: 'שלג' },
  { main: 'שמש', confusing: 'ירח' },
  { main: 'נהר', confusing: 'אגם' },
  { main: 'כוכב', confusing: 'כוכב לכת' },
  { main: 'רוח', confusing: 'סערה' },
  { main: 'ורד', confusing: 'צבעוני' },
  { main: 'אלון', confusing: 'אורן' },
  { main: 'אש', confusing: 'עשן' },
  { main: 'ענן', confusing: 'ערפל' },
  { main: 'הר געש', confusing: 'רעידת אדמה' },

  // תחבורה
  { main: 'מטוס', confusing: 'רכבת' },
  { main: 'מכונית', confusing: 'אוטובוס' },
  { main: 'אופניים', confusing: 'אופנוע' },
  { main: 'אונייה', confusing: 'סירה' },
  { main: 'מסוק', confusing: 'טיל' },
  { main: 'משאית', confusing: 'טנדר' },

  // אנשים ומקצועות
  { main: 'רופא', confusing: 'אחות' },
  { main: 'מורה', confusing: 'מרצה' },
  { main: 'שוטר', confusing: 'כבאי' },
  { main: 'שף', confusing: 'מלצר' },
  { main: 'טייס', confusing: 'מלח' },
  { main: 'צייר', confusing: 'מוזיקאי' },
  { main: 'מלך', confusing: 'נסיך' },

  // זמנים ואירועים
  { main: 'חורף', confusing: 'סתיו' },
  { main: 'קיץ', confusing: 'אביב' },
  { main: 'יום הולדת', confusing: 'חתונה' },
  { main: 'סרט', confusing: 'הצגה' },
  { main: 'ספר', confusing: 'מגזין' },
]
