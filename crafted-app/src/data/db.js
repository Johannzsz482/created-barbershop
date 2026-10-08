// Dummy data copied from BarbershopDB.sql (same table and column names).
// Extras NOT in your schema: users.created_at, barbers.user_id, and the admin/barber login accounts.
export const users = [
  { users_id: 1, first_name: 'Angela', last_name: 'Ken', email: 'angela.ken@gmail.com', username: 'angelaken', phone: '09181234567', password: 'angel123', role: 'Customer', created_at: '2026-01-02' },
  { users_id: 2, first_name: 'Geneva', last_name: 'Abo-Abo', email: 'geneva.aboabo@gmail.com', username: 'genevaaboabo', phone: '09191234567', password: 'genie46', role: 'Customer', created_at: '2026-01-05' },
  { users_id: 3, first_name: 'Jhanina Avrile', last_name: 'Senar', email: 'jhanina.senar@yahoo.com', username: 'jhaninasenar', phone: '09201234567', password: 'javrile12', role: 'Customer', created_at: '2026-02-11' },
  { users_id: 4, first_name: 'Shelah', last_name: 'Garin', email: 'ellagarin@yahoo.com', username: 'shelahgarin', phone: '09211234567', password: 'ellaforever44', role: 'Customer', created_at: '2026-02-20' },
  { users_id: 5, first_name: 'Julia', last_name: 'Barreto', email: 'juliabarreto@gmail.com', username: 'juliabarreto', phone: '09221234567', password: 'joshuaGarcia', role: 'Customer', created_at: '2026-03-03' },
  { users_id: 6, first_name: 'Kathryn', last_name: 'Bernado', email: 'bernadokathryn@yahoo.com', username: 'kathrynbernado', phone: '09231234567', password: 'DanielP467', role: 'Customer', created_at: '2026-03-18' },
  { users_id: 7, first_name: 'Kelly', last_name: 'Cruz', email: 'kelly.cruz@yahoo.com', username: 'kellycruz', phone: '09241234567', password: 'PeanutButter11', role: 'Customer', created_at: '2026-04-09' },
  { users_id: 8, first_name: 'Kersten Liane', last_name: 'Quilapio', email: 'kersten.quilapio@yahoo.com', username: 'kerstenquilapio', phone: '09251234567', password: 'kilapao89', role: 'Customer', created_at: '2026-05-01' },
  { users_id: 9, first_name: 'Liza', last_name: 'Soberano', email: 'liza.soberano@gmail.com', username: 'lizsoberano', phone: '09261234567', password: 'lalisamaylisa5', role: 'Customer', created_at: '2026-05-22' },
  { users_id: 10, first_name: 'Nadine', last_name: 'Lustre', email: 'nadine.lustre@yahoo.com', username: 'nadinelustre', phone: '09271234567', password: 'nadinemunyu99', role: 'Customer', created_at: '2026-06-14' },
  // Demo-only accounts (your SQL has none for barbers/admin)
  { users_id: 11, first_name: 'Crafted', last_name: 'Admin', email: 'admin@craftedbarbershop.com', username: 'admin', phone: '09170000000', password: 'admin123', role: 'Admin', created_at: '2026-01-01' },
  { users_id: 12, first_name: 'Johann Sebastian', last_name: 'Perada', email: 'johann@craftedbarbershop.com', username: 'johann', phone: '09171111111', password: 'barber123', role: 'Barber', created_at: '2026-10-01' },
  { users_id: 13, first_name: 'John Loyd', last_name: 'Cruz', email: 'loyd@craftedbarbershop.com', username: 'loyd', phone: '09172222222', password: 'barber123', role: 'Barber', created_at: '2026-10-01' },
  { users_id: 14, first_name: 'Joshua', last_name: 'Garcia', email: 'joshua@craftedbarbershop.com', username: 'joshua', phone: '09173333333', password: 'barber123', role: 'Barber', created_at: '2026-10-01' },
  { users_id: 15, first_name: 'King Justine Dave', last_name: 'Odeste', email: 'king@craftedbarbershop.com', username: 'king', phone: '09174444444', password: 'barber123', role: 'Barber', created_at: '2026-10-01' },
  { users_id: 16, first_name: 'Nel', last_name: 'Giron', email: 'nel@craftedbarbershop.com', username: 'nel', phone: '09175555555', password: 'barber123', role: 'Barber', created_at: '2026-10-01' },
]

export const barbers = [
  { barber_id: 1, user_id: 12, first_name: 'Johann Sebastian', last_name: 'Perada', bio: 'Experienced in clean modern cuts with detailed finishing and balanced styling.', specialty: 'Modern Haircuts', is_active: true },
  { barber_id: 2, user_id: 13, first_name: 'John Loyd', last_name: 'Cruz', bio: 'Specializes in sharp fades, precise tapers, and clean neckline detailing.', specialty: 'Fades and Tapers', is_active: false },
  { barber_id: 3, user_id: 14, first_name: 'Joshua', last_name: 'Garcia', bio: 'Known for textured hairstyles and customized cuts suited to different hair types.', specialty: 'Textured Haircuts', is_active: true },
  { barber_id: 4, user_id: 15, first_name: 'King Justine Dave', last_name: 'Odeste', bio: 'Focuses on contemporary styles, creative cuts, and polished everyday looks.', specialty: 'Creative Haircuts', is_active: true },
  { barber_id: 5, user_id: 16, first_name: 'Nel', last_name: 'Giron', bio: 'Provides classic and modern barbering services with attention to clean details.', specialty: 'Classic and Modern Cuts', is_active: true },
]

export const services = [
  { service_id: 1, service_name: 'Taper Fade', description: 'A gradual taper around the sides and back while keeping the top length.', price: 180, duration_minutes: 40, is_active: true },
  { service_id: 2, service_name: 'Skin Fade', description: 'A close fade that blends the hair down to the skin for a sharp finish.', price: 220, duration_minutes: 45, is_active: true },
  { service_id: 3, service_name: 'Undercut Fade', description: 'A disconnected haircut with shorter faded sides.', price: 200, duration_minutes: 45, is_active: true },
  { service_id: 4, service_name: 'Buzz Cut', description: 'A short, uniform haircut using clippers with a clean finish.', price: 130, duration_minutes: 25, is_active: true },
  { service_id: 5, service_name: 'Slick Back', description: 'A classic hairstyle with the hair combed backward.', price: 180, duration_minutes: 35, is_active: true },
  { service_id: 6, service_name: 'Modern Mullet', description: 'Featuring shorter sides and front with added length at the back.', price: 250, duration_minutes: 50, is_active: true },
  { service_id: 7, service_name: 'Wolf Cut', description: 'A layered and textured haircut combining volume on top with softer layers.', price: 150, duration_minutes: 50, is_active: true },
  { service_id: 8, service_name: 'Blowout Taper', description: 'A voluminous hairstyle with a tapered finish on the sides and back.', price: 230, duration_minutes: 45, is_active: true },
  { service_id: 9, service_name: 'Crew Cut', description: 'A short haircut that gradually becomes shorter toward the sides and back.', price: 160, duration_minutes: 30, is_active: true },
  { service_id: 10, service_name: 'Low Drop Fade', description: 'A low fade that follows the natural shape of the head.', price: 220, duration_minutes: 45, is_active: true },
]

export const schedules = [
  { schedule_id: 1, barber_id: 1, day_of_week: 'Monday', start_time: '09:00', end_time: '18:00', is_active: true },
  { schedule_id: 2, barber_id: 2, day_of_week: 'Tuesday', start_time: '09:00', end_time: '18:00', is_active: true },
  { schedule_id: 3, barber_id: 3, day_of_week: 'Wednesday', start_time: '10:00', end_time: '19:00', is_active: true },
  { schedule_id: 4, barber_id: 4, day_of_week: 'Thursday', start_time: '09:00', end_time: '18:00', is_active: true },
  { schedule_id: 5, barber_id: 5, day_of_week: 'Friday', start_time: '10:00', end_time: '19:00', is_active: true },
  { schedule_id: 6, barber_id: 1, day_of_week: 'Saturday', start_time: '09:00', end_time: '17:00', is_active: true },
  { schedule_id: 7, barber_id: 2, day_of_week: 'Saturday', start_time: '09:00', end_time: '17:00', is_active: true },
]

export const barberServices = [
  [1, 1], [1, 2], [2, 1], [2, 2], [2, 4], [3, 3], [3, 5], [4, 1], [4, 4], [5, 1], [5, 3], [5, 5],
].map(([barber_id, service_id]) => ({ barber_id, service_id }))

export const appointments = [
  { appointment_id: 1, user_id: 1, barber_id: 1, service_id: 1, appointment_date: '2026-10-05', start_time: '10:00', end_time: '10:30', status: 'Confirmed', notes: 'Regular haircut' },
  { appointment_id: 2, user_id: 2, barber_id: 2, service_id: 2, appointment_date: '2026-10-05', start_time: '11:00', end_time: '11:45', status: 'Confirmed', notes: 'Requested low fade' },
  { appointment_id: 3, user_id: 3, barber_id: 3, service_id: 3, appointment_date: '2026-10-06', start_time: '13:00', end_time: '13:20', status: 'Completed', notes: 'Beard trim' },
  { appointment_id: 4, user_id: 4, barber_id: 4, service_id: 4, appointment_date: '2026-10-07', start_time: '14:00', end_time: '14:30', status: 'Pending', notes: 'Hair styling for event' },
  { appointment_id: 5, user_id: 5, barber_id: 5, service_id: 5, appointment_date: '2026-10-08', start_time: '15:00', end_time: '15:25', status: 'Cancelled', notes: 'Customer cancelled' },
  { appointment_id: 6, user_id: 1, barber_id: 2, service_id: 1, appointment_date: '2026-10-10', start_time: '09:00', end_time: '09:30', status: 'Confirmed', notes: 'Weekend appointment' },
]

export const appointmentLogs = [
  { log_id: 1, appointment_id: 1, old_status: 'Pending', new_status: 'Confirmed', changed_by: 1, changed_at: '2026-10-01 09:10' },
  { log_id: 2, appointment_id: 2, old_status: 'Pending', new_status: 'Confirmed', changed_by: 6, changed_at: '2026-10-01 10:20' },
  { log_id: 3, appointment_id: 3, old_status: 'Confirmed', new_status: 'Completed', changed_by: 5, changed_at: '2026-10-02 14:00' },
  { log_id: 4, appointment_id: 5, old_status: 'Pending', new_status: 'Cancelled', changed_by: 3, changed_at: '2026-10-03 08:45' },
  { log_id: 5, appointment_id: 6, old_status: 'Pending', new_status: 'Confirmed', changed_by: 2, changed_at: '2026-10-03 16:30' },
]
