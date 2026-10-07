/** Rótulos curtos de dia da semana, índice = Date.getDay() (0 = domingo) */
export const WEEKDAY_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const
export const WEEKDAY_LONG = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'] as const

/**
 * Dia da semana (0–6) de uma data `YYYY-MM-DD` sem depender do fuso do servidor.
 * `new Date('2026-10-07')` é meia-noite UTC e vira dia 06 em fusos negativos;
 * fixar meio-dia UTC e usar getUTCDay evita esse deslocamento.
 */
export function weekdayIndex(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay()
}

export function weekdayShort(date: string): string {
  return WEEKDAY_SHORT[weekdayIndex(date)]
}
