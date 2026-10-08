import { useState } from 'react';
import type { Schedules } from './parentChildren.type';
import { shiftWindow, windowForDay } from './parentChildren.helper';


export function useAllowedWindow(schedules: Schedules, onChange: (schedules: Schedules) => void) {
  const [day, setDay] = useState(new Date().getDay());
  const window = windowForDay(schedules, day);

  function shift(field: 'startMinutes' | 'endMinutes', deltaMinutes: number) {
    onChange(shiftWindow(schedules, day, field, deltaMinutes));
  }

  return { day, setDay, window, shift };
}
