import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock } from 'lucide-react';
import type { TimeSlot, DayOfWeek, AvailabilitySchedule } from '../../lib/mentorship';
import { DAYS_OF_WEEK, AVAILABILITY_TIME_SLOTS } from '../../lib/mentorship';

interface AvailabilitySchedulePickerProps {
  mentorAvailability: AvailabilitySchedule;
  onSelect: (day: DayOfWeek, timeSlot: TimeSlot) => void;
  selectedDay?: DayOfWeek;
  selectedTimeSlot?: TimeSlot;
}

const dayLabels: Record<DayOfWeek, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

const timeSlotLabels: Record<TimeSlot, string> = {
  morning: '🌅 Morning',
  afternoon: '☀️ Afternoon',
  evening: '🌙 Evening',
  late_night: '🌃 Late Night',
};

export default function AvailabilitySchedulePicker({
  mentorAvailability,
  onSelect,
  selectedDay,
  selectedTimeSlot,
}: AvailabilitySchedulePickerProps) {
  const [hoveredDay, setHoveredDay] = useState<DayOfWeek | null>(null);

  const availableDays = DAYS_OF_WEEK.filter((day) => (mentorAvailability[day] || []).length > 0);

  if (availableDays.length === 0) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-center">
        <p className="text-sm font-medium text-yellow-900">No available time slots for this mentor</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="h-5 w-5 text-blue-600" />
        <h3 className="font-semibold text-gray-900">Select Available Time Slot</h3>
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {DAYS_OF_WEEK.map((day) => {
          const availableSlots = mentorAvailability[day] || [];
          const isAvailable = availableSlots.length > 0;
          const isSelected = selectedDay === day;

          return (
            <motion.button
              key={day}
              whileHover={isAvailable ? { scale: 1.05 } : {}}
              whileTap={isAvailable ? { scale: 0.95 } : {}}
              onMouseEnter={() => isAvailable && setHoveredDay(day)}
              onMouseLeave={() => setHoveredDay(null)}
              disabled={!isAvailable}
              onClick={() => {
                // Keep the day selected but reset time slot to let user pick
                if (availableSlots.length > 0) {
                  onSelect(day, availableSlots[0]);
                }
              }}
              className={`rounded-lg px-3 py-2 text-center font-medium transition-all ${
                isSelected
                  ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                  : isAvailable && hoveredDay === day
                    ? 'bg-blue-100 text-blue-900'
                    : isAvailable
                      ? 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                      : 'cursor-not-allowed bg-gray-50 text-gray-400'
              }`}
            >
              <div className="text-xs">{dayLabels[day]}</div>
              <div className="text-xs text-opacity-75">{availableSlots.length} slots</div>
            </motion.button>
          );
        })}
      </div>

      {/* Time Slots for Selected Day */}
      {selectedDay && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-gray-200 bg-gray-50 p-4"
        >
          <div className="mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-600" />
            <h4 className="font-semibold text-gray-900">
              Available slots on {dayLabels[selectedDay]}
            </h4>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {AVAILABILITY_TIME_SLOTS.map((slot) => {
              const isAvailable = (mentorAvailability[selectedDay] || []).includes(slot);
              const isSelected = selectedTimeSlot === slot;

              return (
                <motion.button
                  key={slot}
                  whileHover={isAvailable ? { scale: 1.05 } : {}}
                  whileTap={isAvailable ? { scale: 0.95 } : {}}
                  disabled={!isAvailable}
                  onClick={() => isAvailable && onSelect(selectedDay, slot)}
                  className={`rounded-lg px-3 py-2 text-center font-medium transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                      : isAvailable
                        ? 'bg-white text-gray-900 border border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                        : 'cursor-not-allowed bg-gray-100 text-gray-400'
                  }`}
                >
                  {timeSlotLabels[slot]}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
