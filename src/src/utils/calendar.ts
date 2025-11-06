/**
 * Calendar utility functions for generating .ics files
 * Supports saving events to Google Calendar and Apple Calendar
 */

export interface CalendarEvent {
  title: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  description?: string;
  url?: string;
}

/**
 * Generate .ics file content for a calendar event
 */
export function generateICS(event: CalendarEvent): string {
  const formatDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const escapeText = (text: string): string => {
    return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  };

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Lavender Wedding//EN',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@lavender-wedding.com`,
    `DTSTAMP:${formatDate(new Date())}`,
    `DTSTART:${formatDate(event.startDate)}`,
    `DTEND:${formatDate(event.endDate)}`,
    `SUMMARY:${escapeText(event.title)}`,
    event.location ? `LOCATION:${escapeText(event.location)}` : '',
    event.description ? `DESCRIPTION:${escapeText(event.description)}` : '',
    event.url ? `URL:${escapeText(event.url)}` : '',
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(Boolean).join('\r\n');

  return icsContent;
}

/**
 * Download .ics file
 */
export function downloadICS(icsContent: string, filename: string): void {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL object
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Create Google Calendar URL
 */
export function createGoogleCalendarUrl(event: CalendarEvent): string {
  const formatDateForGoogle = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0];
  };

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatDateForGoogle(event.startDate)}/${formatDateForGoogle(event.endDate)}`,
    details: event.description || '',
    location: event.location || '',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Save wedding event to calendar
 */
export function saveWeddingToCalendar(
  title: string,
  date: Date,
  location?: string,
  description?: string
): void {
  // Create all-day event (9 AM to 6 PM)
  const startDate = new Date(date);
  startDate.setHours(9, 0, 0, 0);
  
  const endDate = new Date(date);
  endDate.setHours(18, 0, 0, 0);

  const event: CalendarEvent = {
    title,
    startDate,
    endDate,
    location,
    description: description || `Wedding celebration for ${title}`,
  };

  // Try to detect if it's a mobile device (iOS/Android)
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  if (isMobile) {
    // For mobile devices, prefer .ics file download
    const icsContent = generateICS(event);
    downloadICS(icsContent, 'wedding-save-the-date.ics');
  } else {
    // For desktop, try Google Calendar first, fallback to .ics
    try {
      const googleUrl = createGoogleCalendarUrl(event);
      window.open(googleUrl, '_blank');
    } catch (error) {
      // Fallback to .ics download
      const icsContent = generateICS(event);
      downloadICS(icsContent, 'wedding-save-the-date.ics');
    }
  }
}