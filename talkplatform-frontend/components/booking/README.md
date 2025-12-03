# Booking Calendar Components

## Installation

Before using the calendar components, you need to install the required dependencies:

```bash
npm install react-big-calendar
npm install @types/react-big-calendar -D
```

Note: `date-fns` is already installed in the project.

## Components

### AvailabilityCalendar

A full-featured calendar component for displaying and selecting booking slots.

**Props:**
- `teacherId: string` - Teacher ID (optional for teacher's own slots)
- `slots: BookingSlot[]` - Array of booking slots
- `onSelectSlot?: (slot: BookingSlot) => void` - Callback when slot is clicked
- `onSelectDate?: (date: Date) => void` - Callback when empty time is clicked
- `height?: number` - Calendar height (default: 600)

**Usage:**
```tsx
import { AvailabilityCalendar } from '@/components/booking/AvailabilityCalendar';

<AvailabilityCalendar
  teacherId="teacher-id"
  slots={availableSlots}
  onSelectSlot={(slot) => handleSelectSlot(slot)}
  height={700}
/>
```

### TimeSlotPicker

A time slot picker component for selecting time ranges.

**Props:**
- `date?: Date | string` - Selected date
- `startTime?: string` - Start time (default: '08:00')
- `endTime?: string` - End time (default: '22:00')
- `intervalMinutes?: number` - Interval in minutes (default: 60)
- `selectedSlot?: string` - Selected slot value
- `onSelect: (slot: TimeSlot) => void` - Callback when slot is selected
- `disabledSlots?: string[]` - Array of disabled slot values

**Usage:**
```tsx
import { TimeSlotPicker } from '@/components/booking/TimeSlotPicker';

<TimeSlotPicker
  date={selectedDate}
  onSelect={(slot) => setSelectedTimeSlot(slot)}
/>
```

## Timezone Handling

All times are stored in UTC in the database. The calendar components automatically convert UTC times to the user's local timezone for display.

**Important:**
- Backend stores times in UTC
- Frontend displays times in user's local timezone
- No manual conversion needed - handled automatically by JavaScript Date objects

## Pages

### Student Booking
- `/teachers/[id]/book` - List view (existing)
- `/teachers/[id]/book-calendar` - Calendar view (new)

### Teacher Availability
- `/teacher/availability` - List view (existing)
- `/teacher/availability-calendar` - Calendar view (new)

