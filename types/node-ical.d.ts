declare module 'node-ical' {
  export interface VEvent {
    type: 'VEVENT';
    uid: string;
    start: Date;
    end: Date;
    summary?: string;
    description?: string;
    location?: string;
    status?: string;
  }

  export interface VCalendar {
    type: 'VCALENDAR';
    prodid?: string;
    version?: string;
  }

  export type CalendarComponent = VEvent | VCalendar | { type: string };

  export interface CalendarResponse {
    [key: string]: CalendarComponent;
  }

  export const async: {
    fromURL(url: string): Promise<CalendarResponse>;
    parseFile(file: string): Promise<CalendarResponse>;
    parseICS(data: string): Promise<CalendarResponse>;
  };

  export function fromURL(
    url: string,
    options: object,
    callback: (err: Error | null, data: CalendarResponse) => void
  ): void;

  export function parseFile(
    file: string,
    callback: (err: Error | null, data: CalendarResponse) => void
  ): void;

  export function parseICS(data: string): CalendarResponse;
}
