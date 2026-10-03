export const EVENT_CATEGORIES = [
  'All',
  'Technical',
  'Cultural',
  'Workshops',
  'Competitions',
  'Gaming',
  'Entertainment'
];

// Poster-backed default events (posters live in /public/events).
// Firestore/D1 events created via the admin editor are merged on top by id.
const POSTER_EVENTS = [
  ['circuit_detecitve.jpg', 'Circuit Detective', 'Competitions', 'ECE', 'Pulse'],
  ['photo_1_2026-09-28_17-54-19.jpg', 'Digital Circuit Relay', 'Competitions', 'ECE', 'Pulse'],
  ['photo_2_2026-09-28_17-54-19.jpg', 'Logic Lockdown', 'Competitions', 'ECE', 'Pulse'],
  ['photo_3_2026-09-28_17-54-19.jpg', 'Tech Heist', 'Competitions', 'ECE', 'Pulse'],
  ['23.jpg', 'AI Agents Unleashed: Chatbots to Autopilot', 'Competitions', 'CSE', 'FOCUS'],
  ['28.jpg', '3 Clues, 1 Gadget: Crack the Code', 'Competitions', 'CSE', 'FOCUS / Aprameya'],
  ['60-Second Al Engineer Sprint.jpg', '60-Second AI Engineer Sprint', 'Competitions', 'CSE', 'FOCUS'],
  ['Agentic Al & Smart Automation Workshop.jpg', 'Agentic AI & Smart Automation Workshop', 'Workshops', 'CSE', 'RPA Club'],
  ['Automated Driven CYBER SECURITY.jpg', 'Automation Driven Cyber Security', 'Technical', 'CSE', 'Cyber Security Club'],
  ['Automation ARENA.jpg', 'Automation Arena', 'Competitions', 'CSE', 'RPA Club'],
  ['Automation EDITION.jpg', 'Automation Edition', 'Competitions', 'CSE', 'RPA Club'],
  ['Automation Meets Intelligence.jpg', 'Automation Meets Intelligence', 'Technical', 'CSE', 'RPA Club'],
  ['Build your first workflow with n8n.jpg', 'Build Your First Workflow with n8n', 'Workshops', 'CSE', 'RPA Club'],
  ['Build Your Own Network Intrusion Detector.jpg', 'Build Your Own Network Intrusion Detector', 'Workshops', 'CSE', 'Cyber Security Club'],
  ['CineMystery.jpg', 'CineMystery', 'Entertainment', 'CSE', 'FOCUS'],
  ['Eyes of AI_ How Machines See the World.jpg', 'Eyes of AI: How Machines See the World', 'Technical', 'AI & DS', 'FOCUS'],
  ['Fact or Myth_ The Tech Truth Showdown.jpg', 'Fact or Myth: The Tech Truth Showdown', 'Entertainment', 'CSE', 'FOCUS'],
  ['FIREBASE FRENZY RUIL D & DEPLOY LIVE.jpg', 'Firebase Frenzy: Build & Deploy Live', 'Workshops', 'CSE', 'Web Dev Club'],
  ['Fundamentals of Automation & Ui PATH.jpg', 'Fundamentals of Automation & UiPath', 'Workshops', 'CSE', 'RPA Club'],
  ['Gaming Event.jpg', 'Gaming Event', 'Gaming', 'SAC', 'Gaming Club'],
  ['Human or Al_ The Ultimate Turing Test.jpg', 'Human or AI: The Ultimate Turing Test', 'Competitions', 'AI & DS', 'FOCUS'],
  ['Inside the Mind of AI_ LLMs Unlocked.jpg', 'Inside the Mind of AI: LLMs Unlocked', 'Technical', 'AI & DS', 'FOCUS'],
  ['Instant Emotion Change.jpg', 'Instant Emotion Change', 'Cultural', 'SAC', 'Dramatics Club'],
  ['Network Forensics with Wireshark.jpg', 'Network Forensics with Wireshark', 'Workshops', 'CSE', 'Cyber Security Club'],
  ['Prompt Wars_ The Engineering Arena.jpg', 'Prompt Wars: The Engineering Arena', 'Competitions', 'CSE', 'FOCUS'],
  ['Tech Pictionary.jpg', 'Tech Pictionary', 'Entertainment', 'CSE', 'FOCUS'],
  ['The Future of Network Switches_ Programmable Data Planes.jpg', 'The Future of Network Switches: Programmable Data Planes', 'Technical', 'CSE', 'Broadband Networks Club'],
  ['The Internet Is Learning_ AI-Based Congestion Control.jpg', 'The Internet Is Learning: AI-Based Congestion Control', 'Technical', 'CSE', 'Broadband Networks Club'],
  ['Tiny Devices, Big Intelligence_ AI at the Edge.jpg', 'Tiny Devices, Big Intelligence: AI at the Edge', 'Technical', 'ECE / IoT', 'IoT Club'],
  ['Word Wars THE ULTIMATE LITERARY CHALLENGE.jpg', 'Word Wars: The Ultimate Literary Challenge', 'Cultural', 'SAC', 'Vachas Literary Club'],
  ['Zoom & Guess_ The Tech Close-Up Challenge.jpg', 'Zoom & Guess: The Tech Close-Up Challenge', 'Entertainment', 'CSE', 'FOCUS'],
];

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const EVENTS_DATA = POSTER_EVENTS.map(([file, title, category, department = '', club = '']) => {
  const poster = `/events/${encodeURIComponent(file)}`;
  return {
    id: `poster-${slugify(title)}`,
    title,
    category,
    department,
    club,
    featured: false,
    date: 'TBA',
    time: 'TBA',
    venue: 'TBA',
    prize: '',
    fee: 'Free',
    registrationStatus: 'Open',
    image: poster,
    video: null,
    banner_url: poster,
    gallery: [],
    shortDescription: `${title} at SAMYAK 2026.`,
    fullDescription: '',
    eligibility: 'Open to all undergraduate and postgraduate students from recognized colleges.',
    rules: [],
    coordinators: [],
    tags: department ? [category, department] : [category],
    displayOrder: 0,
    isCancelled: false,
    cancellationReason: '',
  };
});

/**
 * Parses time string (e.g. "10:00 AM IST", "02:30 PM", "11:00 AM") into minutes from midnight.
 */
export function parseEventTimeValue(timeStr) {
  if (!timeStr || typeof timeStr !== 'string' || timeStr.trim().toUpperCase() === 'TBA') {
    return 9999;
  }
  const match = timeStr.match(/(\d+):?(\d*)\s*(AM|PM)?/i);
  if (!match) return 9999;
  let hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const period = match[3] ? match[3].toUpperCase() : null;
  if (period === 'PM' && hours < 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

/**
 * Primary comparison function: sorts events by displayOrder, then date/time, then featured.
 */
export function compareEventsByOrderAndTime(a, b) {
  // 1. Explicit displayOrder priority (positive numbers 1, 2, 3...)
  const orderA = Number(a.displayOrder ?? a.order ?? 0);
  const orderB = Number(b.displayOrder ?? b.order ?? 0);
  if (orderA > 0 && orderB > 0 && orderA !== orderB) {
    return orderA - orderB;
  }
  if (orderA > 0 && orderB <= 0) return -1;
  if (orderB > 0 && orderA <= 0) return 1;

  // 2. Date comparison
  const dateA = a.date && a.date !== 'TBA' ? new Date(a.date).getTime() : 9999999999999;
  const dateB = b.date && b.date !== 'TBA' ? new Date(b.date).getTime() : 9999999999999;
  if (!isNaN(dateA) && !isNaN(dateB) && dateA !== dateB) {
    return dateA - dateB;
  }

  // 3. Time comparison (earlier time first)
  const timeA = parseEventTimeValue(a.time);
  const timeB = parseEventTimeValue(b.time);
  if (timeA !== timeB) {
    return timeA - timeB;
  }

  // 4. Featured flag
  if (b.featured !== a.featured) {
    return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
  }

  return (a.title || '').localeCompare(b.title || '');
}
