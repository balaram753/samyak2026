/**
 * SAMYAK 2026 — Dedicated Workshops Service
 * 
 * Manages custom workshops and separate workshop registrations.
 * Workshops have individual pricing completely decoupled from the unified fest fee.
 */

import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  increment,
  arrayUnion
} from 'firebase/firestore';
import { db } from './firebase';
import { FEST_FEE } from '../config/paymentConfig';

export const WORKSHOP_CATEGORIES = [
  'All',
  'AI & Machine Learning',
  'Cyber Security & Cloud',
  'Robotics & IoT',
  'Web3 & Blockchain',
  'Full-Stack & DevOps',
  'Game Dev & AR/VR'
];

export const DEFAULT_WORKSHOPS = [
  {
    id: 'ws-genai-llm-architecture',
    title: 'Generative AI & Multi-Agent Systems Engineering',
    category: 'AI & Machine Learning',
    price: 299,
    date: 'March 15, 2026',
    time: '10:00 AM - 04:00 PM',
    venue: 'SAC Computational Lab 1',
    instructor: 'Dr. Arvind Swaminathan',
    instructorRole: 'Principal AI Scientist & Research Fellow',
    instructorOrg: 'Cognitive Computing Labs',
    instructorAvatar: '/avatars/lead-1.jpg',
    capacity: 80,
    availableSeats: 26,
    registeredCount: 54,
    status: 'Fast Filling',
    featured: true,
    posterUrl: '/hero-bg.png',
    paymentQrUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi://pay?pa=klefsamyak2312@sbi%26pn=SAMYAK%20AI%20WORKSHOP%26am=299.00%26cu=INR',
    merchantUpiId: 'klefsamyak2312@sbi',
    shortDescription: 'Master modern large language models, fine-tuning with LoRA, LangChain multi-agent workflows, and production RAG architecture.',
    fullDescription: 'An intensive, hands-on masterclass taking participants from prompt engineering foundations to production-grade autonomous agent systems. Learn to deploy and fine-tune open-weights models locally with Ollama, construct vector indexing pipelines, and orchestrate cooperative multi-agent swarms.',
    topics: [
      'Foundations of Transformer Attention & Tokenization',
      'Local LLM Deployment & Quantization with Ollama / vLLM',
      'Retrieval-Augmented Generation (RAG) with ChromaDB',
      'Multi-Agent Coordination & Autonomous Tool Calling',
      'Parameter-Efficient Fine-Tuning (PEFT / LoRA) on custom datasets'
    ],
    prerequisites: 'Basic knowledge of Python and introductory programming fundamentals.',
    benefits: [
      'Official SAMYAK 2026 Hands-On Workshop Certificate',
      'Complete Code Repository & Starter Notebooks',
      'Cloud GPU credits access for live training during session',
      'Networking with Industry AI Architects'
    ],
    coordinators: [
      { name: 'Rahul Sharma', phone: '+91 98480 11223' },
      { name: 'Ananya Rao', phone: '+91 98480 44556' }
    ]
  },
  {
    id: 'ws-cyber-security-cloud-forensics',
    title: 'Red Team Cyber Warfare & Cloud Attack Simulations',
    category: 'Cyber Security & Cloud',
    price: 399,
    date: 'March 16, 2026',
    time: '09:30 AM - 03:30 PM',
    venue: 'Cyber Range Arena / Block C',
    instructor: 'Vikramaditya Roy',
    instructorRole: 'Lead Offensive Security Specialist & CEH Master',
    instructorOrg: 'Aegis Cyber Defense',
    instructorAvatar: '/avatars/lead-2.jpg',
    capacity: 65,
    availableSeats: 18,
    registeredCount: 47,
    status: 'Open',
    featured: true,
    posterUrl: '/hero-bg.png',
    paymentQrUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi://pay?pa=klefsamyak2312@sbi%26pn=SAMYAK%20CYBER%20WORKSHOP%26am=399.00%26cu=INR',
    merchantUpiId: 'klefsamyak2312@sbi',
    shortDescription: 'Live penetration testing, packet forensics with Wireshark, container escape techniques, and defending cloud infrastructures.',
    fullDescription: 'Enter the Cyber Range for a day of live tactical offensive and defensive security exercises. Understand how adversaries pivot through networks, execute memory injections, exploit API vulnerabilities, and how blue teams trace and mitigate active intrusions in real-time.',
    topics: [
      'Packet Analysis, Protocol Decoding & Wireshark Triage',
      'Modern Web Application & API Exploitation with Burp Suite',
      'Cloud IAM Privilege Escalation & Container Breakouts',
      'Active Defense, SIEM Logging & Incident Response Runbooks'
    ],
    prerequisites: 'Basic understanding of computer networks and Linux command line.',
    benefits: [
      'Live Cyber Range Simulation Access',
      'Verified Security Specialization Credential',
      'Curated Pentesting Cheat-sheets & Toolkits',
      'Opportunity to join SAMYAK CTF Elite Pool'
    ],
    coordinators: [
      { name: 'K. Sai Kiran', phone: '+91 97000 33445' }
    ]
  },
  {
    id: 'ws-autonomous-robotics-microros',
    title: 'Autonomous Robotics, micro-ROS & Computer Vision',
    category: 'Robotics & IoT',
    price: 349,
    date: 'March 16, 2026',
    time: '11:00 AM - 05:00 PM',
    venue: 'Mechatronics Pavilion / Robotics Lab',
    instructor: 'Pooja V. Sharma',
    instructorRole: 'Robotics Software Architect',
    instructorOrg: 'Nova Dynamics Robotics',
    instructorAvatar: '/avatars/lead-3.jpg',
    capacity: 50,
    availableSeats: 9,
    registeredCount: 41,
    status: 'Fast Filling',
    featured: false,
    posterUrl: '/hero-bg.png',
    paymentQrUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi://pay?pa=klefsamyak2312@sbi%26pn=SAMYAK%20ROBOTICS%26am=349.00%26cu=INR',
    merchantUpiId: 'klefsamyak2312@sbi',
    shortDescription: 'Build obstacle-avoiding mobile robots with ESP32 micro-ROS and real-time OpenCV object tracking.',
    fullDescription: 'Get hands-on with real hardware and sensor integration. Connect microcontrollers running micro-ROS to ROS2 navigation nodes, stream camera feeds through edge vision models, and compute closed-loop motor control kinematics.',
    topics: [
      'Introduction to ROS2 Architecture & Node Graphs',
      'micro-ROS Integration with ESP32 & FreeRTOS',
      'Computer Vision with OpenCV: Color & Contour Tracking',
      'PID Motor Control & LiDAR-assisted Obstacle Avoidance'
    ],
    prerequisites: 'Basic knowledge of C/C++ or Python.',
    benefits: [
      'Hardware Lab Hands-On Experience',
      'Hardware Kit Provided During the Session',
      'Certified Robotics Workshop Pass',
      'Project Code Templates & Simulation Files'
    ],
    coordinators: [
      { name: 'T. Vamsi Krishna', phone: '+91 96555 88990' }
    ]
  },
  {
    id: 'ws-web3-smart-contract-security',
    title: 'Web3 Architecture & Smart Contract Security Audit',
    category: 'Web3 & Blockchain',
    price: 249,
    date: 'March 17, 2026',
    time: '10:00 AM - 03:00 PM',
    venue: 'Seminar Hall 2 / Tech Block',
    instructor: 'Karan Mehta',
    instructorRole: 'Core Protocol Security Auditor',
    instructorOrg: 'ChainGuard Labs',
    instructorAvatar: '/avatars/lead-4.jpg',
    capacity: 70,
    availableSeats: 35,
    registeredCount: 35,
    status: 'Open',
    featured: false,
    posterUrl: '/hero-bg.png',
    paymentQrUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi://pay?pa=klefsamyak2312@sbi%26pn=SAMYAK%20WEB3%26am=249.00%26cu=INR',
    merchantUpiId: 'klefsamyak2312@sbi',
    shortDescription: 'Write robust Solidity smart contracts, analyze re-entrancy exploits, and build full-stack decentralized frontends.',
    fullDescription: 'Explore the internals of Ethereum EVM execution, master Solidity best practices, write tests with Foundry, simulate famous flash-loan and re-entrancy exploits, and connect frontend interfaces via Viem and Wagmi.',
    topics: [
      'EVM Architecture, Gas Optimization & Storage Layout',
      'Solidity Smart Contracts with Foundry Testing Suite',
      'Common Vulnerabilities: Re-entrancy, Overflow, Front-running',
      'Full-Stack DApp Integration with Wagmi & Viem'
    ],
    prerequisites: 'Familiarity with JavaScript / web fundamentals.',
    benefits: [
      'Official Web3 Security Certificate',
      'Hands-On Audit Case Studies',
      'Mentorship for Blockchain Hackathons'
    ],
    coordinators: [
      { name: 'M. Sravan', phone: '+91 98888 77665' }
    ]
  }
];

const LOCAL_WORKSHOPS_KEY = 'samyak_custom_workshops_v1';
const DEFAULT_WORKSHOP_IDS = new Set(DEFAULT_WORKSHOPS.map((w) => w.id));

// Read-only cache of the last Firestore snapshot, used for instant first paint.
// It never stands in for a failed save: Firestore is the only source of truth.
function getLocalCustomWorkshops() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_WORKSHOPS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function replaceLocalWorkshopCache(list) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_WORKSHOPS_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('LocalStorage workshop cache notice:', err);
  }
}

function toMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? 0 : t;
}

// Firestore Timestamps don't survive JSON; store them as ISO strings in the cache.
function cacheable(w) {
  const out = { ...w };
  for (const key of ['created_at', 'updated_at']) {
    if (out[key] && typeof out[key].toMillis === 'function') out[key] = new Date(out[key].toMillis()).toISOString();
  }
  return out;
}

/** Defaults overlaid with stored workshops; deleted ones (tombstones) are dropped. */
function mergeWorkshops(stored) {
  const map = new Map();
  DEFAULT_WORKSHOPS.forEach((w) => map.set(w.id, { ...w }));
  stored.forEach((w) => {
    if (!w?.id) return;
    if (w.isDeleted) map.delete(w.id);
    else map.set(w.id, { ...(map.get(w.id) || {}), ...w });
  });
  const list = Array.from(map.values());
  list.sort((a, b) => {
    const timeA = toMillis(a.created_at) || a.timestamp || 0;
    const timeB = toMillis(b.created_at) || b.timestamp || 0;
    if (timeA && timeB) return timeB - timeA;
    return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
  });
  return list;
}

/**
 * Real-time listener for workshops (no composite index needed).
 */
export function subscribeWorkshops(onSuccess, onError) {
  // Instant paint from the last snapshot this browser saw.
  const cached = mergeWorkshops(getLocalCustomWorkshops());
  onSuccess(cached);

  try {
    // Note: Do NOT use orderBy to avoid requiring composite Firestore indexes
    return onSnapshot(collection(db, 'workshops'), (snapshot) => {
      const remoteList = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      replaceLocalWorkshopCache(remoteList.map(cacheable));
      onSuccess(mergeWorkshops(remoteList));
    }, (err) => {
      console.warn('Workshops Firestore subscription error:', err.message);
      if (onError) onError(err);
    });
  } catch (err) {
    console.warn('Workshops Firestore init error:', err);
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Fetch single workshop by ID: Firestore first, then cache / defaults.
 */
export async function getWorkshopById(workshopId) {
  if (!workshopId) return null;
  const clean = workshopId.toLowerCase();

  try {
    const snap = await getDoc(doc(db, 'workshops', workshopId));
    if (snap.exists()) {
      const data = { id: snap.id, ...snap.data() };
      if (data.isDeleted) return null;
      const base = DEFAULT_WORKSHOPS.find((w) => w.id === snap.id) || {};
      return { ...base, ...data };
    }
  } catch (err) {
    console.warn('Notice fetching workshop doc from Firestore:', err.message);
  }

  const match = mergeWorkshops(getLocalCustomWorkshops()).find(
    (w) => w.id === workshopId || w.id.toLowerCase() === clean ||
    (w.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-') === clean
  );
  return match || null;
}

// Firestore rejects `undefined` field values.
function withoutUndefined(data) {
  return Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
}

/**
 * Create or save a new workshop in Firestore (Admin only). Throws if the save fails.
 */
export async function createWorkshop(workshopData) {
  const titleSlug = (workshopData.title || 'custom')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 35);
  const cleanId = workshopData.id || `ws-${titleSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
  
  const payload = withoutUndefined({
    ...workshopData,
    id: cleanId,
    price: Number(workshopData.price) || 299,
    capacity: Number(workshopData.capacity) || 60,
    availableSeats: Number(workshopData.availableSeats ?? workshopData.capacity ?? 60),
    registeredCount: Number(workshopData.registeredCount || 0),
    posterUrl: workshopData.posterUrl || '/hero-bg.png',
    paymentQrUrl: workshopData.paymentQrUrl || '',
    merchantUpiId: workshopData.merchantUpiId || 'klefsamyak2312@sbi',
    status: workshopData.status || 'Open',
    isDeleted: false,
    timestamp: Date.now(),
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  await setDoc(doc(db, 'workshops', cleanId), payload, { merge: true });
  return { ...payload, id: cleanId, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
}

/**
 * Update an existing workshop in Firestore (Admin only). Throws if the save fails.
 */
export async function updateWorkshop(workshopId, workshopData) {
  if (!workshopId) throw new Error('Workshop ID is required.');
  
  const payload = withoutUndefined({
    ...workshopData,
    id: workshopId,
    timestamp: Date.now(),
    updated_at: serverTimestamp(),
  });
  if (workshopData.price !== undefined) payload.price = Number(workshopData.price) || 0;
  // Editing a built-in workshop stores the full record so it no longer depends on the defaults.
  const base = DEFAULT_WORKSHOPS.find((w) => w.id === workshopId);
  const record = base ? { ...base, ...payload } : payload;

  await setDoc(doc(db, 'workshops', workshopId), record, { merge: true });
  return { ...record, updated_at: new Date().toISOString() };
}

/**
 * Delete a workshop (Admin only). Built-in workshops get a tombstone,
 * otherwise they would come straight back from DEFAULT_WORKSHOPS.
 */
export async function deleteWorkshop(workshopId) {
  if (!workshopId) return;
  const docRef = doc(db, 'workshops', workshopId);
  if (DEFAULT_WORKSHOP_IDS.has(workshopId)) {
    await setDoc(docRef, { id: workshopId, isDeleted: true, updated_at: serverTimestamp() });
  } else {
    await deleteDoc(docRef);
  }
}

/**
 * Register a student for a specific workshop with their payment screenshot
 */
export async function registerForWorkshop(registrationData) {
  const {
    workshopId,
    workshopTitle,
    workshopFee,
    studentName,
    email,
    phone,
    collegeChoice,
    collegeName,
    universityId,
    utr,
    paymentScreenshotUrl,
    branch = '',
    year = '',
    uid = '',
    isGatePassVerified = false,
    gatePassToken = ''
  } = registrationData;

  if (!workshopId) throw new Error('Workshop ID is required.');
  if (!studentName?.trim()) throw new Error('Student name is required.');
  if (!email?.trim() || !email.includes('@')) throw new Error('Valid email address is required.');
  if (!phone || phone.replace(/[^0-9]/g, '').length < 10) throw new Error('Valid 10-digit mobile number is required.');

  // Determine if attendee belongs to KL University
  const isKlu = collegeChoice === 'kl_university' || 
    (collegeName || '').toLowerCase().includes('kl') ||
    email.toLowerCase().endsWith('@kluniversity.in');

  // Verify Gate Pass authenticity server-side before trusting isGatePassVerified
  // IMPORTANT: For workshops, KL University students also need to pay the workshop fee and cannot register for free!
  let hasValidGatePass = false;
  let resolvedGatePassToken = gatePassToken || '';

  if (isGatePassVerified && uid && !isKlu) {
    try {
      const userSnap = await getDoc(doc(db, 'users', uid));
      if (userSnap.exists()) {
        const u = userSnap.data();
        const userIsKlu = u.category === 'INTERNAL' || (u.university || u.college || '').toLowerCase().includes('kl') || u.collegeChoice === 'kl_university';
        if (!userIsKlu && u.paymentStatus === 'VERIFIED' && (u.gatePassStatus === 'ISSUED' || u.gatePassToken)) {
          hasValidGatePass = true;
          resolvedGatePassToken = u.gatePassToken || resolvedGatePassToken || 'VERIFIED';
        }
      }
    } catch (checkErr) {
      console.warn('Gate pass validation check notice:', checkErr.message);
    }
  }

  const effectiveIsGatePass = Boolean(isGatePassVerified && hasValidGatePass && !isKlu);
  const effectiveUtr = utr?.trim() || (effectiveIsGatePass ? `GP-${resolvedGatePassToken.slice(-10).toUpperCase()}` : '');
  const effectiveScreenshot = paymentScreenshotUrl || (effectiveIsGatePass ? 'GATE_PASS_VERIFIED' : '');

  if (isKlu && (!effectiveUtr || !effectiveScreenshot)) {
    throw new Error('KL University students must pay the workshop fee and provide the UPI Transaction / UTR ID and payment screenshot.');
  }

  if (!effectiveIsGatePass && isGatePassVerified && !hasValidGatePass) {
    throw new Error('Your Fest Gate Pass is not verified yet. Please upload your payment screenshot and UTR.');
  }

  if (!effectiveUtr) throw new Error('Please enter a valid Transaction / UTR ID or verify with your Gate Pass.');
  if (!effectiveScreenshot) throw new Error('Please upload your workshop payment confirmation screenshot.');

  // Prevent duplicate UTR submission for direct payments
  if (!effectiveIsGatePass && effectiveUtr) {
    try {
      const utrQ = query(collection(db, 'workshop_registrations'), where('utr', '==', effectiveUtr.toUpperCase()));
      const utrSnap = await getDocs(utrQ);
      if (!utrSnap.empty) {
        throw new Error('This Transaction / UTR ID has already been recorded for a workshop registration.');
      }
    } catch (dupErr) {
      if (dupErr.message && dupErr.message.includes('already been recorded')) throw dupErr;
      console.warn('Workshop UTR uniqueness check notice:', dupErr.message);
    }
  }

  const regCode = `WS-${Math.floor(100000 + Math.random() * 900000)}`;
  const regId = `ws-reg-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const regDocRef = doc(db, 'workshop_registrations', regId);

  const payload = {
    id: regId,
    regCode,
    workshop_id: workshopId,
    workshop_title: workshopTitle || 'Technical Workshop',
    workshop_fee: effectiveIsGatePass ? 0 : (Number(workshopFee) || 0),
    original_fee: Number(workshopFee) || 0,
    student_name: studentName.trim(),
    email: email.trim().toLowerCase(),
    phone: phone.trim(),
    college_choice: collegeChoice || 'kl_university',
    college_name: collegeChoice === 'kl_university' ? 'K L Deemed to be University' : (collegeName || 'Other College'),
    university_id: universityId || '',
    branch,
    year,
    utr: effectiveUtr.toUpperCase(),
    payment_screenshot_url: effectiveScreenshot,
    status: effectiveIsGatePass ? 'CONFIRMED' : 'PENDING_VERIFICATION',
    is_gate_pass_verified: effectiveIsGatePass,
    gate_pass_token: resolvedGatePassToken,
    fest_pass_fee: FEST_FEE,
    uid: uid || null,
    created_at: serverTimestamp()
  };

  await setDoc(regDocRef, payload);

  // Link workshop registration to user doc in Firestore
  if (uid) {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        registeredWorkshops: arrayUnion({
          workshopId,
          workshopTitle: workshopTitle || 'Technical Workshop',
          regCode,
          registrationId: regId,
          registeredAt: new Date().toISOString()
        })
      });
    } catch (err) {
      console.warn('Notice linking workshop registration to user doc:', err.message);
    }
  }

  // Safely decrement available seats
  try {
    const wsRef = doc(db, 'workshops', workshopId);
    await updateDoc(wsRef, {
      availableSeats: increment(-1),
      registeredCount: increment(1)
    });
  } catch (seatErr) {
    console.warn('Notice updating workshop seat counters:', seatErr.message);
  }

  return {
    success: true,
    registrationId: regId,
    ticketCode: regCode,
    ...payload
  };
}

/**
 * Subscribe to workshop registrations (Admin only)
 */
export function subscribeWorkshopRegistrations(workshopId, onSuccess, onError) {
  try {
    let q = query(collection(db, 'workshop_registrations'), orderBy('created_at', 'desc'));
    if (workshopId && workshopId !== 'ALL') {
      q = query(collection(db, 'workshop_registrations'), where('workshop_id', '==', workshopId));
    }
    return onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      onSuccess(list);
    }, (err) => {
      console.warn('Notice listening to workshop registrations:', err.message);
      if (onError) onError(err);
    });
  } catch (err) {
    console.warn('Error in subscribeWorkshopRegistrations:', err);
    return () => {};
  }
}

/**
 * Update verification status of a workshop registration (Admin only)
 */
export async function updateWorkshopRegistrationStatus(registrationId, status, rejectionReason = '') {
  if (!registrationId) return;
  const docRef = doc(db, 'workshop_registrations', registrationId);
  await updateDoc(docRef, {
    status,
    rejectionReason: rejectionReason || null,
    verified_at: serverTimestamp()
  });
}
