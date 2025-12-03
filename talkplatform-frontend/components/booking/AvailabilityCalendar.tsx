"use client";

import { useState, useEffect, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, View, SlotInfo } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, parseISO } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { BookingSlot } from '@/api/booking.rest';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, DollarSign } from 'lucide-react';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }), // Monday
  getDay,
  locales,
});

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: BookingSlot;
}

interface AvailabilityCalendarProps {
  teacherId: string;
  slots: BookingSlot[];
  onSelectSlot?: (slot: BookingSlot) => void;
  onSelectDate?: (date: Date) => void;
  height?: number;
}

export function AvailabilityCalendar({
  teacherId,
  slots,
  onSelectSlot,
  onSelectDate,
  height = 600,
}: AvailabilityCalendarProps) {
  const [currentView, setCurrentView] = useState<View>('week');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Get user's local timezone
  const userTimeZone = useMemo(() => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }, []);

  // Convert slots to calendar events
  const events: CalendarEvent[] = useMemo(() => {
    return slots
      .filter(slot => !slot.is_booked)
      .map(slot => {
        // Parse date and time from slot
        // Backend returns date as ISO string and time as HH:mm
        const dateStr = slot.date; // ISO date string (YYYY-MM-DD)
        const startTimeStr = slot.start_time; // HH:mm format
        const endTimeStr = slot.end_time; // HH:mm format

        // Create UTC datetime strings
        const utcStartStr = `${dateStr}T${startTimeStr}:00Z`;
        const utcEndStr = `${dateStr}T${endTimeStr}:00Z`;

        // Parse as UTC - parseISO creates Date object representing UTC time
        // Calendar will automatically display in user's local timezone
        const start = parseISO(utcStartStr);
        const end = parseISO(utcEndStr);

        return {
          id: slot.id,
          title: `${slot.price_credits} credits`,
          start: start,
          end: end,
          resource: slot,
        };
      });
  }, [slots, userTimeZone]);

  const handleSelectEvent = (event: CalendarEvent) => {
    if (onSelectSlot) {
      onSelectSlot(event.resource);
    }
  };

  const handleSelectSlot = (slotInfo: SlotInfo) => {
    if (onSelectDate) {
      onSelectDate(slotInfo.start);
    }
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    return {
      style: {
        backgroundColor: '#4CAF50',
        borderRadius: '4px',
        border: 'none',
        color: 'white',
        padding: '2px 4px',
      },
    };
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Available Time Slots</CardTitle>
          <Badge variant="outline" className="text-xs">
            {userTimeZone}
          </Badge>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Times are shown in your local timezone
        </p>
      </CardHeader>
      <CardContent>
        <div className="calendar-wrapper">
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height }}
            view={currentView}
            onView={setCurrentView}
            date={currentDate}
            onNavigate={setCurrentDate}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            selectable
            eventPropGetter={eventStyleGetter}
            views={['month', 'week', 'day', 'agenda']}
            defaultView="week"
            step={30}
            timeslots={2}
            min={new Date(2024, 0, 1, 8, 0)} // 8 AM
            max={new Date(2024, 0, 1, 22, 0)} // 10 PM
            formats={{
              timeGutterFormat: 'HH:mm',
              eventTimeRangeFormat: ({ start, end }) =>
                `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`,
            }}
            messages={{
              next: 'Next',
              previous: 'Previous',
              today: 'Today',
              month: 'Month',
              week: 'Week',
              day: 'Day',
              agenda: 'Agenda',
              date: 'Date',
              time: 'Time',
              event: 'Event',
            }}
          />
        </div>

        {events.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No available slots at the moment</p>
            <p className="text-sm mt-2">Please check back later</p>
          </div>
        )}

        {/* Legend */}
        {events.length > 0 && (
          <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span>Available slot</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              <span>Price shown in credits</span>
            </div>
          </div>
        )}
      </CardContent>

      <style jsx global>{`
        .calendar-wrapper .rbc-calendar {
          font-family: 'Inter', sans-serif;
        }

        .calendar-wrapper .rbc-event {
          background-color: #4CAF50;
          border-radius: 4px;
          border: none;
          padding: 2px 4px;
        }

        .calendar-wrapper .rbc-event:hover {
          background-color: #45a049;
        }

        .calendar-wrapper .rbc-event-content {
          font-size: 12px;
          font-weight: 500;
        }

        .calendar-wrapper .rbc-time-slot {
          border-top: 1px solid #e5e7eb;
        }

        .calendar-wrapper .rbc-time-header-content {
          border-left: 1px solid #e5e7eb;
        }

        .calendar-wrapper .rbc-day-slot .rbc-time-slot {
          border-top: 1px solid #f3f4f6;
        }

        .calendar-wrapper .rbc-today {
          background-color: #f0f9ff;
        }

        .calendar-wrapper .rbc-off-range-bg {
          background-color: #f9fafb;
        }

        .calendar-wrapper .rbc-header {
          padding: 8px;
          font-weight: 600;
          border-bottom: 2px solid #e5e7eb;
        }

        .calendar-wrapper .rbc-toolbar {
          margin-bottom: 16px;
        }

        .calendar-wrapper .rbc-toolbar button {
          padding: 6px 12px;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
          background: white;
          color: #374151;
          font-weight: 500;
        }

        .calendar-wrapper .rbc-toolbar button:hover {
          background: #f9fafb;
        }

        .calendar-wrapper .rbc-toolbar button.rbc-active {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }
      `}</style>
    </Card>
  );
}

