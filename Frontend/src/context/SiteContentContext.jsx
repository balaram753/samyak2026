import { createContext, useContext, useState, useEffect } from 'react';
// Site content lives in Cloudflare D1 (via the SAMYAK Worker), not Firestore.
import {
  subscribeContent,
  setContentDoc,
  deleteContentDoc,
} from '../services/contentStore';
import { cascadeDeleteEventMedia } from '../services/mediaService';
import { EVENTS_DATA } from '../data/events';
import { SCHEDULE_DAYS } from '../data/schedule';

export const DEFAULT_DEPARTMENTS = [
  {
    id: 'cse',
    code: 'CSE',
    name: 'Computer Science & Engineering',
    clubs: [
      'RPA Club',
      'Cyber Security & Ethical Hacking Club',
      'Web & Mobile Dev Club',
      'Cloud & DevOps Club',
      'AI & Machine Learning Club',
      'Broadband Networks Club',
      'Competitive Coding Club',
    ],
  },
  {
    id: 'ece',
    code: 'ECE',
    name: 'Electronics & Communication Engineering',
    clubs: [
      'Pulse',
      'Robotics & Embedded Systems Club',
      'VLSI & Chip Design Club',
      'IoT & Smart Automation Club',
      'Drone & Aerial Systems Club',
    ],
  },
  {
    id: 'aids',
    code: 'AIDS',
    name: 'Artificial Intelligence & Data Science',
    clubs: [
      'Deep Learning & Generative AI Club',
      'Data Analytics & Big Data Club',
      'Computer Vision & NLP Club',
    ],
  },
  {
    id: 'mech',
    code: 'Mechanical',
    name: 'Mechanical Engineering',
    clubs: [
      'Automotive & Formula Racing Club',
      'CAD/CAM & 3D Printing Club',
      'Mechatronics Club',
      'Aeromodelling & Rocketry Club',
    ],
  },
  {
    id: 'civil',
    code: 'Civil',
    name: 'Civil Engineering',
    clubs: [
      'Structural Design & Smart Cities Club',
      'Surveying & Geo-Informatics Club',
      'Green Building & Sustainability Club',
    ],
  },
  {
    id: 'mba',
    code: 'MBA',
    name: 'School of Business Management',
    clubs: [
      'FinTech & Trading Club',
      'Startup & Entrepreneurship Cell',
      'Marketing & Branding Guild',
      'Business Analytics Club',
    ],
  },
  {
    id: 'bca',
    code: 'BCA',
    name: 'Computer Applications & Software',
    clubs: [
      'Full-Stack Software Club',
      'Gaming & Animation Club',
      'UI/UX Design Studio',
    ],
  },
  {
    id: 'biotech',
    code: 'Biotech',
    name: 'Bio-Technology Engineering',
    clubs: [
      'Bio-Informatics & Genomics Club',
      'Pharma Innovations Club',
    ],
  },
  {
    id: 'cultural',
    code: 'Cultural',
    name: 'Cultural, Music & Arts',
    clubs: [
      'Dance & Choreography Guild',
      'Music & Concerts Committee',
      'Dramatics & Theatre Club',
      'Fashion & Runway Society',
      'Fine Arts & Photography Club',
    ],
  },
];

/**
 * Merge Firestore custom events on top of default curated events.
 * Guarantees that default events are NEVER erased when an admin creates a custom event.
 */
export function mergeEvents(firestoreEvents, defaultEvents = EVENTS_DATA) {
  const isTeaserMedia = (ev) => {
    if (!ev) return true;
    if (ev.id === 'poster-samyak-the-technical-odyssey') return true;
    const title = (ev.title || '').toLowerCase();
    if (title.includes('the technical odyssey')) return true;
    const vid = (ev.video || '').toLowerCase();
    if (vid.includes('tech-vid.mp4')) return true;
    const img = (ev.image || '').toLowerCase();
    if (img.includes('tech-vid.mp4')) return true;
    return false;
  };

  const cleanDefaults = defaultEvents.filter((ev) => !isTeaserMedia(ev));

  if (!firestoreEvents || !Array.isArray(firestoreEvents) || firestoreEvents.length === 0) {
    return cleanDefaults;
  }

  const map = new Map();
  // 1. Seed with default events
  cleanDefaults.forEach((ev) => {
    map.set(ev.id, { ...ev });
  });

  // 2. Layer Firestore events on top
  firestoreEvents.forEach((item) => {
    if (!item || !item.id || isTeaserMedia(item)) return;
    if (item.isDeleted || item.status === 'deleted' || item.status === 'archived') {
      map.delete(item.id);
    } else {
      const existing = map.get(item.id) || {};
      map.set(item.id, {
        ...existing,
        ...item,
        id: item.id,
      });
    }
  });

  return Array.from(map.values()).filter((ev) => !isTeaserMedia(ev));
}

const DEFAULT_ABOUT = {
  badge: 'The National Phenomenon',
  logoUrl: '/samyak-logo-white.png',
  title: 'ABOUT SAMYAK 2026',
  subtitle: 'SAMYAK is the premier annual National Level Techno-Management Fest of Koneru Lakshmaiah Education Foundation (KL University). Born as a beacon of student-driven ambition, it unites visionary engineers, artists, strategists, and gamers in a 3-day immersive odyssey.',
  stats: [
    { label: 'Footfall', value: '30K+', highlight: true },
    { label: 'Prize Pool', value: '₹25 Lakhs+', highlight: true },
    { label: 'Events', value: '750+', highlight: true },
  ],
  pillars: [
    {
      title: 'Technological Transcendence',
      desc: 'From autonomous AI agent hackathons and quantum computing labs to battle-hardened RoboWars arenas, SAMYAK provides high-octane engineering challenges.',
    },
    {
      title: 'Electrifying Cultural Convergence',
      desc: 'India’s most celebrated collegiate dance crews, high-voltage rock and metal bands, and runway fashion odyssey take over the massive open-air amphitheaters.',
    },
    {
      title: 'Leadership & Industry Synthesis',
      desc: 'Keynotes from world-class venture architects, deep-tech research directors, and startup incubators mentoring the next generation of founders.',
    },
  ],
};

const DEFAULT_CONTACT = {
  heading: 'CONTACT SAMYAK 2026',
  subtitle: 'Have questions about registration, hotel accommodation, sponsorship, or event rules? Our student central committee is here 24/7.',
  phone: '+91 98480 12345',
  email: 'samyak@kluniversity.in',
  address: 'KL University Green Fields, Vaddeswaram, Guntur Dist, Andhra Pradesh - 522502',
  facultyLead: { name: 'Dr. R. K. Varma', role: 'Chief Faculty Convener', phone: '+91 98480 12345' },
  studentLead: { name: 'Aarav Sharma', role: 'Student President', phone: '+91 91234 56789' },
  socials: {
    instagram: 'https://www.instagram.com/kluniversity/',
    youtube: 'https://www.youtube.com/@kl.samyak',
    linkedin: 'https://www.linkedin.com/school/kluniversity/',
    twitter: 'https://x.com/KLUniversity',
    facebook: 'https://www.facebook.com/KLUniversity',
  },
};

export const DEFAULT_SPONSORS = [
  {
    id: 'sponsor-1',
    name: 'NEXUS CLOUD',
    subtitle: 'Decentralized High-Performance GPU Compute',
    tier: 'Title Partner',
    logoUrl: '/samyak-emblem.png',
    websiteUrl: 'https://kluniversity.in',
    order: 1,
  },
  {
    id: 'sponsor-2',
    name: 'CYBERDYNE LABS',
    subtitle: 'Autonomous Robotics & Hardware Systems',
    tier: 'Robotics Partner',
    logoUrl: '/samyak-emblem.png',
    websiteUrl: 'https://kluniversity.in',
    order: 2,
  },
  {
    id: 'sponsor-3',
    name: 'QUANTUM VECTOR',
    subtitle: 'Quantum Computing & Cryptographic Infrastructure',
    tier: 'Hackathon Partner',
    logoUrl: '/samyak-emblem.png',
    websiteUrl: 'https://kluniversity.in',
    order: 3,
  },
  {
    id: 'sponsor-4',
    name: 'HYPERION AUDIO',
    subtitle: 'Concert Grade Acoustic Production & Sound',
    tier: 'Entertainment Partner',
    logoUrl: '/samyak-emblem.png',
    websiteUrl: 'https://kluniversity.in',
    order: 4,
  },
  {
    id: 'sponsor-5',
    name: 'AERO DYNAMICS',
    subtitle: 'Autonomous UAV Systems & Drone Arenas',
    tier: 'Drone Arena Partner',
    logoUrl: '/samyak-emblem.png',
    websiteUrl: 'https://kluniversity.in',
    order: 5,
  },
  {
    id: 'sponsor-6',
    name: 'TITAN DEFENSE',
    subtitle: 'Next-Gen Cyber Threat Intelligence',
    tier: 'Cybersecurity Partner',
    logoUrl: '/samyak-emblem.png',
    websiteUrl: 'https://kluniversity.in',
    order: 6,
  },
];

const SiteContentContext = createContext(null);

export function SiteContentProvider({ children }) {
  const [aboutContent, setAboutContent] = useState(() => {
    try {
      const saved = localStorage.getItem('samyak_content_about');
      if (saved) {
        const parsed = JSON.parse(saved);
        const isOutdated = !parsed.stats || parsed.stats.length !== 3 || parsed.stats.some(s => s.label?.includes('Colleges') || s.value?.includes('25,000') || s.value?.includes('15,00,000') || s.value?.includes('700+'));
        if (isOutdated) {
          parsed.stats = DEFAULT_ABOUT.stats;
          localStorage.setItem('samyak_content_about', JSON.stringify(parsed));
        }
        return { ...DEFAULT_ABOUT, ...parsed };
      }
    } catch {}
    return DEFAULT_ABOUT;
  });

  const [scheduleDays, setScheduleDays] = useState(() => {
    const saved = localStorage.getItem('samyak_content_schedule');
    return saved ? JSON.parse(saved) : SCHEDULE_DAYS;
  });

  const [contactContent, setContactContent] = useState(() => {
    const saved = localStorage.getItem('samyak_content_contact');
    return saved ? JSON.parse(saved) : DEFAULT_CONTACT;
  });

  const [events, setEvents] = useState(() => {
    try {
      const saved = localStorage.getItem('samyak_content_events');
      if (saved) {
        const parsed = JSON.parse(saved);
        return mergeEvents(parsed, EVENTS_DATA);
      }
    } catch {}
    return EVENTS_DATA;
  });

  // Dynamic Department Filters & Sub-filter Clubs state
  const [departments, setDepartments] = useState(() => {
    const saved = localStorage.getItem('samyak_content_departments');
    return saved ? JSON.parse(saved) : DEFAULT_DEPARTMENTS;
  });

  // Dynamic Sponsors & Ecosystem Partners state
  const [sponsors, setSponsors] = useState(() => {
    try {
      const saved = localStorage.getItem('samyak_content_sponsors');
      return saved ? JSON.parse(saved) : DEFAULT_SPONSORS;
    } catch {
      return DEFAULT_SPONSORS;
    }
  });

  const [loadingContent, setLoadingContent] = useState(true);

  // 1. Events (Cloudflare D1: events/<id>)
  useEffect(() => subscribeContent(
    'events',
    { limit: 1000 },
    (list) => {
      if (list.length > 0) {
        setEvents(mergeEvents(list, EVENTS_DATA));
        localStorage.setItem('samyak_content_events', JSON.stringify(list));
      } else {
        setEvents(EVENTS_DATA);
        localStorage.removeItem('samyak_content_events');
      }
      setLoadingContent(false);
    },
    (err) => {
      console.warn('Events load note:', err.message);
      setLoadingContent(false);
    }
  ), []);

  // 2. Site content documents (Cloudflare D1: site_content/<id>), one request for all.
  // Saved documents are merged over the defaults so a partial document never
  // blanks out fields the pages rely on.
  useEffect(() => subscribeContent(
    'site_content',
    { limit: 50 },
    (docs) => {
      const byId = Object.fromEntries(docs.map(({ id, _createdAt, _updatedAt, ...data }) => [id, data]));
      const keep = (key, value) => localStorage.setItem(key, JSON.stringify(value));
      const dept = byId.department_filters;
      if (Array.isArray(dept?.departments)) { setDepartments(dept.departments); keep('samyak_content_departments', dept.departments); }
      if (byId.about) {
        const v = { ...DEFAULT_ABOUT, ...byId.about };
        if (!v.stats || v.stats.length !== 3 || v.stats.some(s => s.label?.includes('Colleges') || s.value?.includes('25,000') || s.value?.includes('15,00,000') || s.value?.includes('700+'))) {
          v.stats = DEFAULT_ABOUT.stats;
        }
        setAboutContent(v);
        keep('samyak_content_about', v);
      }
      if (Array.isArray(byId.schedule?.days)) { setScheduleDays(byId.schedule.days); keep('samyak_content_schedule', byId.schedule.days); }
      if (byId.contact) { const v = { ...DEFAULT_CONTACT, ...byId.contact }; setContactContent(v); keep('samyak_content_contact', v); }
      if (Array.isArray(byId.sponsors?.sponsors)) { setSponsors(byId.sponsors.sponsors); keep('samyak_content_sponsors', byId.sponsors.sponsors); }
    },
    (err) => console.warn('Site content load note:', err.message)
  ), []);

  // Save Departments & Clubs
  const updateDepartments = async (newDepartments) => {
    setDepartments(newDepartments);
    localStorage.setItem('samyak_content_departments', JSON.stringify(newDepartments));
    try {
      await setContentDoc('site_content', 'department_filters', { departments: newDepartments, updatedAt: Date.now() });
    } catch (err) {
      console.error('Failed to save departments:', err);
      throw err;
    }
  };

  // Add a new Department
  const addDepartment = async (code, name, initialClubs = []) => {
    const cleanCode = code.trim();
    const cleanName = name.trim() || cleanCode;
    const cleanId = cleanCode.toLowerCase().replace(/[^a-z0-9]/g, '');

    const newDept = {
      id: cleanId,
      code: cleanCode,
      name: cleanName,
      clubs: Array.isArray(initialClubs) ? initialClubs : [],
    };

    const updated = [...departments.filter((d) => d.code.toLowerCase() !== cleanCode.toLowerCase()), newDept];
    await updateDepartments(updated);
    return newDept;
  };

  // Delete Department
  const deleteDepartment = async (deptCodeOrId) => {
    const updated = departments.filter((d) => 
      d.id !== deptCodeOrId && d.code.toLowerCase() !== deptCodeOrId.toLowerCase()
    );
    await updateDepartments(updated);
  };

  // Add a Club / Sub-filter under a Department
  const addClubToDepartment = async (deptCode, clubName) => {
    const cleanClub = clubName.trim();
    if (!cleanClub) return;

    const updated = departments.map((dept) => {
      if (dept.code.toLowerCase() === deptCode.toLowerCase() || dept.id === deptCode) {
        const existingClubs = dept.clubs || [];
        if (!existingClubs.includes(cleanClub)) {
          return { ...dept, clubs: [...existingClubs, cleanClub] };
        }
      }
      return dept;
    });

    await updateDepartments(updated);
  };

  // Delete a Club / Sub-filter from a Department
  const deleteClubFromDepartment = async (deptCode, clubName) => {
    const updated = departments.map((dept) => {
      if (dept.code.toLowerCase() === deptCode.toLowerCase() || dept.id === deptCode) {
        return {
          ...dept,
          clubs: (dept.clubs || []).filter((c) => c.toLowerCase() !== clubName.toLowerCase())
        };
      }
      return dept;
    });

    await updateDepartments(updated);
  };

  // Reset to default departments
  const resetDefaultDepartments = async () => {
    await updateDepartments(DEFAULT_DEPARTMENTS);
  };

  const updateAboutContent = async (newAbout) => {
    setAboutContent(newAbout);
    localStorage.setItem('samyak_content_about', JSON.stringify(newAbout));
    try {
      await setContentDoc('site_content', 'about', { ...newAbout, updatedAt: Date.now() });
    } catch (err) {
      console.error('Failed to save about content:', err);
      throw err;
    }
  };

  const updateScheduleContent = async (newDays) => {
    setScheduleDays(newDays);
    localStorage.setItem('samyak_content_schedule', JSON.stringify(newDays));
    try {
      await setContentDoc('site_content', 'schedule', { days: newDays, updatedAt: Date.now() });
    } catch (err) {
      console.error('Failed to save schedule content:', err);
      throw err;
    }
  };

  const updateContactContent = async (newContact) => {
    setContactContent(newContact);
    localStorage.setItem('samyak_content_contact', JSON.stringify(newContact));
    try {
      await setContentDoc('site_content', 'contact', { ...newContact, updatedAt: Date.now() });
    } catch (err) {
      console.error('Failed to save contact content:', err);
      throw err;
    }
  };

  const addEvent = async (eventData) => {
    let slugId = eventData.id || eventData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 120);
    // Never overwrite another event that happens to share the title slug.
    if (!eventData.id && (!slugId || events.some((e) => e.id === slugId))) {
      slugId = `${slugId || 'event'}-${Date.now().toString(36)}`;
    }
    const fullEvent = {
      ...eventData,
      id: slugId,
      banner_url: eventData.banner_url || eventData.image || '',
      image: eventData.image || eventData.banner_url || '',
      gallery: Array.isArray(eventData.gallery) ? eventData.gallery : [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await setContentDoc('events', slugId, fullEvent, { merge: false });
    setEvents((prev) => [fullEvent, ...prev.filter((e) => e.id !== slugId)]);
  };

  const updateEvent = async (eventId, eventData) => {
    const updated = { 
      ...eventData, 
      banner_url: eventData.banner_url || eventData.image || '',
      image: eventData.image || eventData.banner_url || '',
      gallery: Array.isArray(eventData.gallery) ? eventData.gallery : (eventData.gallery ? [eventData.gallery] : []),
      updatedAt: Date.now()
    };
    await setContentDoc('events', eventId, updated);
    setEvents((prev) => prev.map((e) => (e.id === eventId ? { ...e, ...updated } : e)));
  };

  const deleteEvent = async (eventId) => {
    setEvents((prev) => prev.filter((e) => e.id !== eventId));

    // Built-in poster events would come straight back from EVENTS_DATA after a
    // plain delete, so they get a tombstone that mergeEvents() drops.
    if (EVENTS_DATA.some((e) => e.id === eventId)) {
      await setContentDoc('events', eventId, { isDeleted: true, updatedAt: Date.now() }, { merge: false });
    } else {
      await deleteContentDoc('events', eventId);
    }

    // Cascade delete associated folders, files, and gallery items
    await cascadeDeleteEventMedia(eventId);
  };

  // Sponsors & Ecosystem Partners CRUD operations
  const updateSponsors = async (newSponsorsList) => {
    setSponsors(newSponsorsList);
    localStorage.setItem('samyak_content_sponsors', JSON.stringify(newSponsorsList));
    try {
      await setContentDoc('site_content', 'sponsors', { sponsors: newSponsorsList, updated_at: Date.now() });
    } catch (err) {
      console.error('Failed to save sponsors:', err);
      throw err;
    }
  };

  const addSponsor = async (sponsor) => {
    const id = sponsor.id || `sponsor-${Date.now()}`;
    const newSponsor = { 
      ...sponsor, 
      id, 
      order: Number(sponsor.order) || (sponsors.length + 1) 
    };
    const updated = [...sponsors, newSponsor].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
    await updateSponsors(updated);
    return newSponsor;
  };

  const editSponsor = async (id, updatedFields) => {
    const updated = sponsors
      .map((s) => (s.id === id ? { ...s, ...updatedFields } : s))
      .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
    await updateSponsors(updated);
  };

  const deleteSponsor = async (id) => {
    const updated = sponsors.filter((s) => s.id !== id);
    await updateSponsors(updated);
  };

  const resetDefaultSponsors = async () => {
    await updateSponsors(DEFAULT_SPONSORS);
  };

  const seedDefaultEvents = async () => {
    try {
      for (const ev of EVENTS_DATA) {
        await setContentDoc('events', ev.id, ev);
      }
      return true;
    } catch (err) {
      console.error('Seed events error:', err);
      throw err;
    }
  };

  return (
    <SiteContentContext.Provider value={{
      aboutContent,
      scheduleDays,
      contactContent,
      events,
      departments,
      sponsors,
      loadingContent,
      updateAboutContent,
      updateScheduleContent,
      updateContactContent,
      updateDepartments,
      addDepartment,
      deleteDepartment,
      addClubToDepartment,
      deleteClubFromDepartment,
      resetDefaultDepartments,
      updateSponsors,
      addSponsor,
      editSponsor,
      deleteSponsor,
      resetDefaultSponsors,
      addEvent,
      updateEvent,
      deleteEvent,
      seedDefaultEvents,
    }}>
      {children}
    </SiteContentContext.Provider>
  );
}

export function useSiteContent() {
  const context = useContext(SiteContentContext);
  if (!context) {
    throw new Error('useSiteContent must be used within a SiteContentProvider');
  }
  return context;
}
