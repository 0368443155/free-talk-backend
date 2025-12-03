# CALENDAR UI - GIAO DIỆN LỊCH CHUYÊN NGHIỆP

**Ngày tạo:** 03/12/2025  
**File:** 05_Calendar_UI.md  
**Thời gian:** 2 ngày

---

## 🎯 MỤC TIÊU

Tạo giao diện calendar chuyên nghiệp để teacher tạo slots và students đặt lịch dễ dàng.

---

## 📦 DEPENDENCIES

```bash
npm install react-big-calendar date-fns
npm install @types/react-big-calendar -D
```

---

## 💻 IMPLEMENTATION

### 1. Calendar Component

```tsx
// File: components/booking/AvailabilityCalendar.tsx

import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { 'en-US': require('date-fns/locale/en-US') };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

export function AvailabilityCalendar({ teacherId, onSelectSlot }) {
  const [slots, setSlots] = useState([]);
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone; // Get user's local timezone
  
  useEffect(() => {
    fetchSlots();
  }, [teacherId]);

  const fetchSlots = async () => {
    const res = await api.get(`/teachers/slots/available?teacher_id=${teacherId}`);
    
    // Convert UTC slots from DB to User's Local Time
    const events = res.data.map(slot => {
      const utcStart = new Date(`${slot.date}T${slot.start_time}Z`); // Assume API returns UTC ISO string
      const utcEnd = new Date(`${slot.date}T${slot.end_time}Z`);
      
      return {
        id: slot.id,
        title: `${slot.price_credits} credits`,
        start: utcToZonedTime(utcStart, userTimeZone),
        end: utcToZonedTime(utcEnd, userTimeZone),
        resource: slot
      };
    });
    setSlots(events);
  };

  return (
    <div>
      <div className="mb-4 text-sm text-gray-500">
        Times are shown in your local timezone: <strong>{userTimeZone}</strong>
      </div>
      <Calendar
        localizer={localizer}
        events={slots}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 600 }}
        onSelectEvent={(event) => onSelectSlot(event.resource)}
        views={['month', 'week', 'day']}
        defaultView="week"
      />
    </div>
  );
}
```

### 2. Time Slot Picker

```tsx
// File: components/booking/TimeSlotPicker.tsx

export function TimeSlotPicker({ date, onSelect }) {
  const timeSlots = useMemo(() => {
    return generateTimeSlots('08:00', '22:00', 60);
  }, []);

  return (
    <div className="grid grid-cols-4 gap-2">
      {timeSlots.map(slot => (
        <Button
          key={slot.start}
          variant="outline"
          onClick={() => onSelect(slot)}
          className="hover:bg-blue-50"
        >
          {slot.start} - {slot.end}
        </Button>
      ))}
    </div>
  );
}

function generateTimeSlots(startTime: string, endTime: string, intervalMinutes: number) {
  const slots = [];
  let current = parse(startTime, 'HH:mm', new Date());
  const end = parse(endTime, 'HH:mm', new Date());

  while (current < end) {
    const next = new Date(current.getTime() + intervalMinutes * 60 * 1000);
    slots.push({
      start: format(current, 'HH:mm'),
      end: format(next, 'HH:mm'),
    });
    current = next;
  }

  return slots;
}
```

---

## 🎨 STYLING

```css
/* Custom calendar styles */
.rbc-calendar {
  font-family: 'Inter', sans-serif;
}

.rbc-event {
  background-color: #4CAF50;
  border-radius: 4px;
}

.rbc-event:hover {
  background-color: #45a049;
}
```

---

**Next:** `06_Check_In_Middleware.md`
