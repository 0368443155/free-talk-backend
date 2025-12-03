"use client";

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import { format, parse, addMinutes } from 'date-fns';

interface TimeSlot {
  start: string; // HH:mm
  end: string; // HH:mm
  value: string; // Combined value for form
}

interface TimeSlotPickerProps {
  date?: Date | string;
  startTime?: string; // Default: '08:00'
  endTime?: string; // Default: '22:00'
  intervalMinutes?: number; // Default: 60
  selectedSlot?: string; // Selected time slot value
  onSelect: (slot: TimeSlot) => void;
  disabledSlots?: string[]; // Array of disabled slot values
  className?: string;
}

export function TimeSlotPicker({
  date,
  startTime = '08:00',
  endTime = '22:00',
  intervalMinutes = 60,
  selectedSlot,
  onSelect,
  disabledSlots = [],
  className,
}: TimeSlotPickerProps) {
  const timeSlots = useMemo(() => {
    return generateTimeSlots(startTime, endTime, intervalMinutes);
  }, [startTime, endTime, intervalMinutes]);

  const isDisabled = (slot: TimeSlot) => {
    return disabledSlots.includes(slot.value);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Select Time Slot
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {timeSlots.map((slot) => {
            const disabled = isDisabled(slot);
            const selected = selectedSlot === slot.value;

            return (
              <Button
                key={slot.value}
                variant={selected ? 'default' : 'outline'}
                onClick={() => !disabled && onSelect(slot)}
                disabled={disabled}
                className={`h-auto py-3 flex flex-col items-center ${
                  disabled ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <span className="text-sm font-medium">
                  {slot.start} - {slot.end}
                </span>
                {disabled && (
                  <span className="text-xs text-gray-400 mt-1">Unavailable</span>
                )}
              </Button>
            );
          })}
        </div>

        {timeSlots.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No time slots available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Generate time slots between start and end time
 */
function generateTimeSlots(
  startTime: string,
  endTime: string,
  intervalMinutes: number,
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  
  // Parse start and end times
  const start = parse(startTime, 'HH:mm', new Date());
  const end = parse(endTime, 'HH:mm', new Date());

  let current = new Date(start);

  while (current < end) {
    const next = addMinutes(current, intervalMinutes);
    
    // Don't create slot if it goes past end time
    if (next > end) {
      break;
    }

    const startStr = format(current, 'HH:mm');
    const endStr = format(next, 'HH:mm');
    const value = `${startStr}-${endStr}`;

    slots.push({
      start: startStr,
      end: endStr,
      value,
    });

    current = next;
  }

  return slots;
}

