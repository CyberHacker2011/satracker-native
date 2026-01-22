/**
 * Returns today's date in YYYY-MM-DD format based on local time.
 */
export const getLocalDateString = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Returns Month and Year from a YYYY-MM-DD string.
 */
export const getMonthYearString = (dateStr: string): string => {
  const [year, month] = dateStr.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
};

/**
 * Returns current time in HH:MM format based on local time.
 */
export const getLocalTimeString = (date: Date = new Date()): string => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};
