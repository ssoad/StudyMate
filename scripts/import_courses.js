import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import http from 'http';

const BASE_DIR = '/Volumes/Ext/Complexity_IT_AD_ICT';
const TARGET_API = process.env.STUDYMATE_API || 'http://10.0.0.206:5173';
const ANON_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoid2ViX2Fub24iLCJpc3MiOiJzdHVkeW1hdGUtbG9jYWwiLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MjUwMDAwMDAwMH0.local';

// Definition of Modules/Sections inside the Complexity_IT_AD_ICT course
const MODULE_CONFIGS = [
  {
    folder: 'C programming',
    sectionTitle: 'Module 1: C Programming',
    orderIndex: 0,
    lessonTitles: {
      'C-01': 'Lecture 01: C Fundamentals, Data Types & Syntax',
      'C-02': 'Lecture 02: Control Structures, Loops & Arrays',
      'C-03': 'Lecture 03: Functions & Pointers in C',
      'C-04': 'Lecture 04: Structures, Unions & Dynamic Memory Allocation',
      'C-05': 'Lecture 05: Output Tracing & Problem Solving Masterclass',
    },
  },
  {
    folder: 'Data Structure',
    sectionTitle: 'Module 2: Data Structures & Algorithms',
    orderIndex: 1,
    lessonTitles: {
      'DS-01': 'Lecture 01: Complexity Analysis & Asymptotic Big-O Notation',
      'DS-02': 'Lecture 02: Dynamic Arrays & Singly Linked Lists',
      'DS-03': 'Lecture 03: Doubly & Circular Linked Lists Implementation',
      'DS-04': 'Lecture 04: Stacks, Queues & Practical Applications',
      'DS-05': 'Lecture 05: Recursion, Recursion Trees & Backtracking',
      'DS-06': 'Lecture 06: Binary Trees & Tree Traversals (In/Pre/Post)',
      'DS-07': 'Lecture 07: Binary Search Trees (BST) & AVL Balancing',
      'DS-08': 'Lecture 08: Priority Queues, Binary Heaps & Heap Sort',
      'DS-09': 'Lecture 09: Graph Representations, BFS & DFS Algorithms',
      'DS-10': 'Lecture 10: Shortest Paths (Dijkstra) & Minimum Spanning Trees',
      'DS-11': 'Lecture 11: Sorting, Searching & Hash Tables Collision Resolution',
    },
  },
  {
    folder: 'Database',
    sectionTitle: 'Module 3: Database Management Systems (DBMS)',
    orderIndex: 2,
    lessonTitles: {
      'DBMS-01': 'Lecture 01: Relational Model, Keys & ER Diagrams',
      'DBMS-02': 'Lecture 02: Relational Algebra & Tuple Relational Calculus',
      'DBMS-03': 'Lecture 03: Candidate Keys & Functional Dependencies',
      'DBMS-04': 'Lecture 04: Normalization (1NF, 2NF, 3NF & BCNF)',
      'DBMS-05': 'Lecture 05: Advanced SQL Queries, Joins & Subqueries',
      'DBMS-06': 'Lecture 06: Stored Procedures, Functions & Database Triggers',
      'DBMS-07': 'Lecture 07: Transactions, ACID Properties & Concurrency Control',
    },
  },
  {
    folder: 'DLD',
    sectionTitle: 'Module 4: Digital Logic Design (DLD)',
    orderIndex: 3,
    lessonTitles: {
      'DLD-01': 'Lecture 01: Number Systems, Base Conversions & Boolean Algebra',
      'DLD-02': 'Lecture 02: Logic Gates & Karnaugh Maps (K-Maps) Minimization',
      'DLD-03': 'Lecture 03: Combinational Circuits: Adders, Subtractors & Multiplexers',
      'DLD-04': 'Lecture 04: Decoders, Encoders & Programmable Logic Families',
      'DLD-05': 'Lecture 05: Sequential Logic: Latches & Flip-Flops (SR, JK, D, T)',
      'DLD-06': 'Lecture 06: Counters, Shift Registers & Finite State Machines',
    },
  },
  {
    folder: 'Networking',
    sectionTitle: 'Module 5: Computer Networking',
    orderIndex: 4,
    lessonTitles: {
      'Networking-01': 'Lecture 01: Network Architectures: OSI 7-Layer & TCP/IP Models',
      'Networking-02': 'Lecture 02: Physical & Data Link Layer Protocols (Framing, ARQ)',
      'Networking-03': 'Lecture 03: IP Addressing, CIDR & Subnetting Math',
      'Networking-04': 'Lecture 04: Routing Algorithms & Protocols (RIP, OSPF, BGP)',
      'Networking-05': 'Lecture 05: Transport Layer: TCP Flow & Congestion Control, UDP',
      'Networking-06': 'Lecture 06: Application Layer Protocols: DNS, HTTP/S, DHCP, SMTP',
      'Networking-07': 'Lecture 07: Network Security, Firewalls, NAT & Cryptography',
    },
  },
  {
    folder: 'Operating System & Memory Management',
    sectionTitle: 'Module 6: Operating System & Memory Management',
    orderIndex: 5,
    lessonTitles: {
      'OSMM-01': 'Lecture 01: OS Architecture, Dual-Mode Operation & System Calls',
      'OSMM-02': 'Lecture 02: Process Management, Threads & Process Control Block (PCB)',
      'OSMM-03': 'Lecture 03: CPU Scheduling Algorithms (FCFS, SJF, Round Robin, Priority)',
      'OSMM-04': 'Lecture 04: Process Synchronization, Critical Section & Semaphores',
      'OSMM-05': 'Lecture 05: Deadlocks: Conditions, Prevention, Avoidance (Banker\'s)',
      'OSMM-06': 'Lecture 06: Main Memory Allocation & Memory Fragmentation',
      'OSMM-07': 'Lecture 07: Paging, Segmentation, Multi-level Paging & TLB',
      'OSMM-08': 'Lecture 08: Virtual Memory & Page Replacement Algorithms (FIFO, LRU)',
      'OSMM-09': 'Lecture 09: File Systems, Disk Scheduling (SSTF, SCAN) & Linux Commands',
    },
  },
];

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function cleanTitle(rawName) {
  return rawName
    .replace(/\.[^/.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function naturalSort(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

async function postJson(endpoint, data) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, TARGET_API);
    const bodyStr = JSON.stringify(data);

    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port || 80,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyStr),
          'Prefer': 'return=representation',
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          try {
            resolve({ status: res.statusCode, data: JSON.parse(raw) });
          } catch {
            resolve({ status: res.statusCode, data: raw });
          }
        });
      }
    );

    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

function buildCourseData() {
  const courseId = '33333333-3333-3333-3333-333333333333';

  const course = {
    id: courseId,
    title: 'Complexity IT - AD (ICT) Complete Master Course',
    slug: 'complexity-it-ad-ict',
    description:
      'The comprehensive all-in-one preparation program for Assistant Director (AD) & ICT professional exams. Includes complete video lectures, notes, assignments, and solved question sets across C Programming, Data Structures, DBMS, Digital Logic Design, Computer Networks, and Operating Systems.',
    instructor_name: 'Complexity IT Team',
    instructor_title: 'Lead ICT Mentors & Engineers',
    instructor_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    thumbnail_url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=80',
    category: 'Computer Science & ICT',
    level: 'all_levels',
    duration: '60 hours',
    rating: 4.95,
    enrolled_count: 340,
    is_published: true,
  };

  const sections = [];
  const lessons = [];
  const resources = [];

  for (const mod of MODULE_CONFIGS) {
    const sectionId = crypto.randomUUID();
    const sectionPath = path.join(BASE_DIR, mod.folder);

    sections.push({
      id: sectionId,
      course_id: courseId,
      title: mod.sectionTitle,
      order_index: mod.orderIndex,
    });

    if (!fs.existsSync(sectionPath)) {
      console.warn(`Folder not found: ${sectionPath}`);
      continue;
    }

    // Recursively collect all files for this section
    const modLessons = [];
    const modResources = [];

    function walk(dir) {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        if (item.startsWith('.') || item.endsWith('.zip')) continue;
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          walk(fullPath);
        } else {
          const relPath = path.relative(BASE_DIR, fullPath);
          const ext = path.extname(item).toLowerCase();
          const serverFileUrl = `/api/storage/files/courses/Complexity_IT_AD_ICT/${relPath.split(path.sep).join('/')}`;

          if (ext === '.mp4') {
            // Find lesson key (e.g. C-01, DS-04, DBMS-02)
            let lessonKey = '';
            for (const key of Object.keys(mod.lessonTitles)) {
              if (item.includes(key)) {
                lessonKey = key;
                break;
              }
            }
            const lessonTitle = lessonKey ? mod.lessonTitles[lessonKey] : cleanTitle(item);

            modLessons.push({
              id: crypto.randomUUID(),
              section_id: sectionId,
              course_id: courseId,
              title: lessonTitle,
              description: `Lecture video for ${lessonTitle}. Hosted locally in high-definition.`,
              video_url: serverFileUrl,
              duration_seconds: 2400,
              order_index: 0,
              is_preview: mod.orderIndex === 0 && modLessons.length === 0,
              itemSort: item,
            });
          } else if (ext === '.pdf' || ext === '.png' || ext === '.jpg') {
            modResources.push({
              id: crypto.randomUUID(),
              course_id: courseId,
              title: cleanTitle(item),
              description: `Reference material & lecture document: ${item}`,
              resource_type: ext === '.pdf' ? 'pdf' : 'document',
              file_url: serverFileUrl,
              file_size: formatSize(stat.size),
              itemSort: item,
            });
          }
        }
      }
    }

    walk(sectionPath);

    // Sort lessons naturally
    modLessons.sort((a, b) => naturalSort(a.itemSort, b.itemSort));
    modLessons.forEach((l, idx) => {
      l.order_index = idx;
      lessons.push(l);
    });

    // Sort resources
    modResources.sort((a, b) => naturalSort(a.itemSort, b.itemSort));
    modResources.forEach((r) => resources.push(r));
  }

  return { course, sections, lessons, resources };
}

async function main() {
  console.log(`🚀 Building single course model for Complexity_IT_AD_ICT...`);
  const { course, sections, lessons, resources } = buildCourseData();

  console.log(`\n📚 Course: ${course.title}`);
  console.log(`   Sections: ${sections.length} modules`);
  console.log(`   Total Video Lectures: ${lessons.length} lessons`);
  console.log(`   Total PDF & Notes: ${resources.length} resources`);

  console.log(`\n➡️ Cleaning up existing course record if present...`);
  try {
    await fetch(`${TARGET_API}/rest/v1/courses?id=eq.${course.id}`, { method: 'DELETE' });
  } catch {}

  console.log(`➡️ Registering Course in PostgreSQL...`);
  const cRes = await postJson('/rest/v1/courses', course);
  if (cRes.status !== 201) {
    throw new Error(`Failed to insert course (${cRes.status}): ${JSON.stringify(cRes.data)}`);
  }

  console.log(`➡️ Registering ${sections.length} Course Sections...`);
  for (const sec of sections) {
    const sRes = await postJson('/rest/v1/course_sections', sec);
    if (sRes.status !== 201) {
      throw new Error(`Failed to insert section "${sec.title}" (${sRes.status}): ${JSON.stringify(sRes.data)}`);
    }
  }

  console.log(`➡️ Registering ${lessons.length} Course Lessons...`);
  for (const les of lessons) {
    const payload = {
      id: les.id,
      section_id: les.section_id,
      course_id: les.course_id,
      title: les.title,
      description: les.description,
      video_url: les.video_url,
      duration_seconds: les.duration_seconds,
      order_index: les.order_index,
      is_preview: les.is_preview,
    };
    const lRes = await postJson('/rest/v1/course_lessons', payload);
    if (lRes.status !== 201) {
      throw new Error(`Failed to insert lesson "${les.title}" (${lRes.status}): ${JSON.stringify(lRes.data)}`);
    }
  }

  console.log(`➡️ Registering ${resources.length} Course Resources...`);
  for (const res of resources) {
    const payload = {
      id: res.id,
      course_id: res.course_id,
      title: res.title,
      description: res.description,
      resource_type: res.resource_type,
      file_url: res.file_url,
      file_size: res.file_size,
    };
    const rRes = await postJson('/rest/v1/course_resources', payload);
    if (rRes.status !== 201) {
      throw new Error(`Failed to insert resource "${res.title}" (${rRes.status}): ${JSON.stringify(rRes.data)}`);
    }
  }

  console.log(`\n✨ Course "Complexity IT - AD (ICT)" successfully created with all 6 modules!`);
}

main().catch(console.error);
