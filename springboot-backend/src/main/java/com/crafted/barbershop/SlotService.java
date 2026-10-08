package com.crafted.barbershop;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Date;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

// The one place that decides whether a time can be booked. The booking and reschedule routes use
// slotProblem(); the slots endpoint uses slots(). Both run the same check(), so a slot shown as
// free can always be booked.
@Service
public class SlotService {
    public static final ZoneId ZONE = ZoneId.of("Asia/Manila");   // one timezone for the whole system
    static final int STEP_MINUTES = 30;                           // a new slot starts every 30 minutes
    private static final DateTimeFormatter HHMM = DateTimeFormatter.ofPattern("HH:mm");

    // Why a time cannot be booked. The messages are what the booking routes return.
    enum Problem {
        PAST("Choose a time in the future."),
        MIDNIGHT("That service would run past midnight."),
        NOT_WORKING("The barber is not working at that time."),
        ON_LEAVE("The barber is on leave that day."),
        BOOKED("That time slot is already booked.");

        final String message;

        Problem(String message) {
            this.message = message;
        }
    }

    record Window(LocalTime start, LocalTime end) {}      // working hours for that weekday
    record Booking(LocalTime start, LocalTime end) {}     // an existing booking that blocks time
    record Day(List<Window> windows, boolean onLeave, List<Booking> bookings) {}

    public record Slot(String start, String end, boolean available, String reason) {}
    public record SlotList(String closedReason, List<Slot> slots) {}

    private final JdbcTemplate jdbc;

    public SlotService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // ---------- reading what the check needs ----------

    // lock = true is used inside the booking transaction. A locking read always sees the latest
    // committed bookings, so two customers cannot both pass the check for the same time.
    private Day load(int barberId, LocalDate date, long excludeId, boolean lock) {
        List<Window> windows = jdbc.query(
            "SELECT start_time, end_time FROM schedules " +
            "WHERE barber_id = ? AND day_of_week = ? AND is_active = TRUE ORDER BY start_time",
            (rs, i) -> new Window(rs.getTime("start_time").toLocalTime(), rs.getTime("end_time").toLocalTime()),
            barberId, date.getDayOfWeek().name());                  // MONDAY, TUESDAY, ...
        Integer leave = jdbc.queryForObject(
            "SELECT COUNT(*) FROM schedule_exceptions WHERE barber_id = ? AND status = 'APPROVED' " +
            "AND ? BETWEEN start_date AND end_date", Integer.class, barberId, Date.valueOf(date));
        List<Booking> bookings = jdbc.query(
            "SELECT start_time, end_time FROM appointments WHERE barber_id = ? AND appointment_date = ? " +
            "AND status NOT IN ('CANCELLED', 'DECLINED') AND appointment_id <> ?" + (lock ? " FOR UPDATE" : ""),
            (rs, i) -> new Booking(rs.getTime("start_time").toLocalTime(), rs.getTime("end_time").toLocalTime()),
            barberId, Date.valueOf(date), excludeId);
        return new Day(windows, leave != null && leave > 0, bookings);
    }

    // ---------- the rules (no database here) ----------

    // Returns the first rule the time breaks, or null when it is free. The order is part of the behavior.
    static Problem check(Day day, LocalDate date, LocalTime start, LocalTime end, LocalDateTime now) {
        if (LocalDateTime.of(date, start).isBefore(now)) return Problem.PAST;
        if (!end.isAfter(start)) return Problem.MIDNIGHT;
        boolean insideHours = day.windows().stream()
            .anyMatch(w -> !start.isBefore(w.start()) && !end.isAfter(w.end()));
        if (!insideHours) return Problem.NOT_WORKING;
        if (day.onLeave()) return Problem.ON_LEAVE;
        boolean overlaps = day.bookings().stream()
            .anyMatch(b -> b.start().isBefore(end) && b.end().isAfter(start));
        return overlaps ? Problem.BOOKED : null;
    }

    // Every start time the service fits into the working hours, each marked free or not.
    static SlotList build(Day day, LocalDate date, int durationMinutes, LocalDateTime now) {
        if (day.windows().isEmpty()) return new SlotList(Problem.NOT_WORKING.name(), List.of());
        if (day.onLeave()) return new SlotList(Problem.ON_LEAVE.name(), List.of());
        List<Slot> out = new ArrayList<>();
        for (Window w : day.windows()) {
            int closes = w.end().getHour() * 60 + w.end().getMinute();
            for (int m = w.start().getHour() * 60 + w.start().getMinute(); m + durationMinutes <= closes; m += STEP_MINUTES) {
                LocalTime start = LocalTime.of(m / 60, m % 60);
                LocalTime end = start.plusMinutes(durationMinutes);
                Problem p = check(day, date, start, end, now);
                out.add(new Slot(start.format(HHMM), end.format(HHMM), p == null, p == null ? null : p.name()));
            }
        }
        return new SlotList(null, out);
    }

    // ---------- used by the controllers ----------

    // For booking and reschedule: a message if the time cannot be booked, or null when it is free.
    // excludeId is the booking being moved (its own old slot does not count), or 0 for a new booking.
    // Call this inside the transaction, after locking the barber's row.
    public String slotProblem(int barberId, LocalDate date, LocalTime start, LocalTime end, long excludeId) {
        Problem p = check(load(barberId, date, excludeId, true), date, start, end, LocalDateTime.now(ZONE));
        return p == null ? null : p.message;
    }

    // For the slots endpoint: all slots for that barber, date and service length.
    public SlotList slots(int barberId, LocalDate date, int durationMinutes, long excludeId) {
        return build(load(barberId, date, excludeId, false), date, durationMinutes, LocalDateTime.now(ZONE));
    }
}
