import { createContext, useContext, useState, useEffect } from 'react';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../services/firebase';
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
  if (!firestoreEvents || !Array.isArray(firestoreEvents) || firestoreEvents.length === 0) {
    return defaultEvents;
  }

  const map = new Map();
  // 1. Seed with default events
  defaultEvents.forEach((ev) => {
    map.set(ev.id, { ...ev });
  });

  // 2. Layer Firestore events on top
  firestoreEvents.forEach((item) => {
    if (!item || !item.id) return;
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

  return Array.from(map.values());
}

const DEFAULT_ABOUT = {
  badge: 'The National Phenomenon',
  logoUrl: '/samyak-logo-white.png',
  title: 'ABOUT SAMYAK 2026',
  subtitle: 'SAMYAK is the premier annual National Level Techno-Management Fest of Koneru Lakshmaiah Education Foundation (KL University). Born as a beacon of student-driven ambition, it unites visionary engineers, artists, strategists, and gamers in a 3-day immersive odyssey.',
  stats: [
    { label: 'Expected Participants', value: '25,000+' },
    { label: 'Total Prize Pool', value: '₹15,00,000+' },
    { label: 'Colleges & Universities', value: '150+' },
    { label: 'Flagship Events', value: '45+' },
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
};

const SiteContentContext = createContext(null);

export function SiteContentProvider({ children }) {
  const [aboutContent, setAboutContent] = useState(() => {
    const saved = localStorage.getItem('samyak_content_about');
    return saved ? JSON.parse(saved) : DEFAULT_ABOUT;
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

  const [loadingContent, setLoadingContent] = useState(true);

  // 1. Listen to 'events' collection in Firestore
  useEffect(() => {
    try {
      const eventsColRef = collection(db, 'events');
      const unsubscribe = onSnapshot(eventsColRef, (snapshot) => {
        if (!snapshot.empty) {
          const list = [];
          snapshot.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...docSnap.data() });
          });
          const merged = mergeEvents(list, EVENTS_DATA);
          setEvents(merged);
          localStorage.setItem('samyak_content_events', JSON.stringify(list));
        } else {
          setEvents(EVENTS_DATA);
          localStorage.removeItem('samyak_content_events');
        }
        setLoadingContent(false);
      }, (err) => {
        console.warn('Firestore events listener note:', err.message);
        setLoadingContent(false);
      });

      return () => unsubscribe();
    } catch (e) {
      console.warn('Events listener setup note:', e);
      setLoadingContent(false);
    }
  }, []);

  // 2. Listen to 'site_content/department_filters' in Firestore
  useEffect(() => {
    try {
      const deptDocRef = doc(db, 'site_content', 'department_filters');
      const unsubscribe = onSnapshot(deptDocRef, (snap) => {
        if (snap.exists() && snap.data()?.departments) {
          const cloudDepts = snap.data().departments;
          setDepartments(cloudDepts);
          localStorage.setItem('samyak_content_departments', JSON.stringify(cloudDepts));
        }
      }, (err) => {
        console.warn('Department filters listener note:', err);
      });

      return () => unsubscribe();
    } catch (e) {
      console.warn('Dept filters listener note:', e);
    }
  }, []);

  // 3. Listen to other site content docs
  useEffect(() => {
    try {
      const aboutDocRef = doc(db, 'site_content', 'about');
      const unsubAbout = onSnapshot(aboutDocRef, (snap) => {
        if (snap.exists()) {
          setAboutContent(snap.data());
          localStorage.setItem('samyak_content_about', JSON.stringify(snap.data()));
        }
      });

      const scheduleDocRef = doc(db, 'site_content', 'schedule');
      const unsubSched = onSnapshot(scheduleDocRef, (snap) => {
        if (snap.exists() && snap.data().days) {
          setScheduleDays(snap.data().days);
          localStorage.setItem('samyak_content_schedule', JSON.stringify(snap.data().days));
        }
      });

      const contactDocRef = doc(db, 'site_content', 'contact');
      const unsubContact = onSnapshot(contactDocRef, (snap) => {
        if (snap.exists()) {
          setContactContent(snap.data());
          localStorage.setItem('samyak_content_contact', JSON.stringify(snap.data()));
        }
      });

      return () => {
        unsubAbout();
        unsubSched();
        unsubContact();
      };
    } catch (e) {
      console.warn('Site content listener note:', e);
    }
  }, []);

  // Save Departments & Clubs to Firestore
  const updateDepartments = async (newDepartments) => {
    setDepartments(newDepartments);
    localStorage.setItem('samyak_content_departments', JSON.stringify(newDepartments));
    try {
      const ref = doc(db, 'site_content', 'department_filters');
      await setDoc(ref, { 
        departments: newDepartments, 
        updatedAt: serverTimestamp() 
      }, { merge: true });
    } catch (err) {
      console.error('Failed to sync departments to Firestore:', err);
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
      const ref = doc(db, 'site_content', 'about');
      await setDoc(ref, { ...newAbout, updatedAt: serverTimestamp() }, { merge: true });
    } catch (err) {
      console.error('Failed to save about content to Firestore:', err);
      throw err;
    }
  };

  const updateScheduleContent = async (newDays) => {
    setScheduleDays(newDays);
    localStorage.setItem('samyak_content_schedule', JSON.stringify(newDays));
    try {
      const ref = doc(db, 'site_content', 'schedule');
      await setDoc(ref, { days: newDays, updatedAt: serverTimestamp() }, { merge: true });
    } catch (err) {
      console.error('Failed to save schedule content to Firestore:', err);
      throw err;
    }
  };

  const updateContactContent = async (newContact) => {
    setContactContent(newContact);
    localStorage.setItem('samyak_content_contact', JSON.stringify(newContact));
    try {
      const ref = doc(db, 'site_content', 'contact');
      await setDoc(ref, { ...newContact, updatedAt: serverTimestamp() }, { merge: true });
    } catch (err) {
      console.error('Failed to save contact content to Firestore:', err);
      throw err;
    }
  };

  const addEvent = async (eventData) => {
    const slugId = eventData.id || eventData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const fullEvent = {
      ...eventData,
      id: slugId,
      banner_url: eventData.banner_url || eventData.image || '',
      image: eventData.image || eventData.banner_url || '',
      gallery: Array.isArray(eventData.gallery) ? eventData.gallery : [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      const ref = doc(db, 'events', slugId);
      await setDoc(ref, fullEvent);
      setEvents((prev) => [fullEvent, ...prev.filter((e) => e.id !== slugId)]);
    } catch (err) {
      console.error('Failed to add event to Firestore:', err);
      setEvents((prev) => [fullEvent, ...prev.filter((e) => e.id !== slugId)]);
    }
  };

  const updateEvent = async (eventId, eventData) => {
    const updated = { 
      ...eventData, 
      banner_url: eventData.banner_url || eventData.image || '',
      image: eventData.image || eventData.banner_url || '',
      gallery: Array.isArray(eventData.gallery) ? eventData.gallery : (eventData.gallery ? [eventData.gallery] : []),
      updatedAt: serverTimestamp() 
    };
    try {
      const ref = doc(db, 'events', eventId);
      await setDoc(ref, updated, { merge: true });
      setEvents((prev) => prev.map((e) => (e.id === eventId ? { ...e, ...updated } : e)));
    } catch (err) {
      console.error('Failed to update event in Firestore:', err);
      setEvents((prev) => prev.map((e) => (e.id === eventId ? { ...e, ...updated } : e)));
    }
  };

  const deleteEvent = async (eventId) => {
    const updated = events.filter((e) => e.id !== eventId);
    setEvents(updated);
    localStorage.setItem('samyak_content_events', JSON.stringify(updated));

    try {
      const ref = doc(db, 'events', eventId);
      await deleteDoc(ref);
    } catch (err) {
      console.error('Failed to delete event from Firestore:', err);
    }

    // Cascade delete associated folders, files, and gallery items
    await cascadeDeleteEventMedia(eventId);
  };

  const seedDefaultEvents = async () => {
    try {
      for (const ev of EVENTS_DATA) {
        const ref = doc(db, 'events', ev.id);
        await setDoc(ref, ev, { merge: true });
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
