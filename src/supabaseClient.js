import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if credentials are placeholders, empty or unconfigured
const isMock = !SUPABASE_URL || 
               SUPABASE_URL.includes('your-project-ref') || 
               !SUPABASE_ANON_KEY || 
               SUPABASE_ANON_KEY.includes('your-anon-key');

let supabaseInstance;

if (isMock) {
  console.warn('NGO Operations CRM running in LOCAL SANDBOX MODE. Supabase keys are not set or default.');

  // Pre-seeded Mock Data
  const defaultDatabase = {
    users: [
      { id: 'admin-1', full_name: 'Sarah Jenkins', email: 'sarah@organization.org', role: 'admin', created_at: new Date(Date.now() - 86400000 * 30).toISOString() },
      { id: 'manager-1', full_name: 'David Ross', email: 'david@organization.org', role: 'manager', created_at: new Date(Date.now() - 86400000 * 25).toISOString() },
      { id: 'volunteer-1', full_name: 'James Carter', email: 'james@organization.org', role: 'volunteer', created_at: new Date(Date.now() - 86400000 * 15).toISOString() }
    ],
    campaigns: [
      { id: 'camp-1', title: 'Clean Water Wells Project', description: 'Digging 15 clean water wells in underserved villages.', category: 'Healthcare', target_amount: 40000, collected_amount: 31000, start_date: '2026-06-01', end_date: '2026-08-30', status: 'active', created_at: new Date(Date.now() - 86400000 * 30).toISOString() },
      { id: 'camp-2', title: 'Emergency Food Relief', description: 'Distributing food kits to families affected by seasonal flooding.', category: 'Disaster Relief', target_amount: 25000, collected_amount: 18000, start_date: '2026-06-15', end_date: '2026-07-25', status: 'active', created_at: new Date(Date.now() - 86400000 * 15).toISOString() },
      { id: 'camp-3', title: 'Rural Shelter Build', description: 'Constructing weather-proof modular shelters for displaced communities.', category: 'Community Development', target_amount: 50000, collected_amount: 42000, start_date: '2026-05-01', end_date: '2026-07-15', status: 'active', created_at: new Date(Date.now() - 86400000 * 45).toISOString() },
      { id: 'camp-4', title: 'Child Literacy & Books', description: 'Setting up 5 community libraries and donating educational textbooks.', category: 'Education', target_amount: 30000, collected_amount: 12000, start_date: '2026-06-20', end_date: '2026-09-10', status: 'active', created_at: new Date(Date.now() - 86400000 * 10).toISOString() }
    ],
    donors: [
      { id: 'donor-1', name: 'Jane Smith', email: 'jane.smith@gmail.com', phone: '555-0199', address: '123 Maple St, Seattle', occupation: 'Software Architect', notes: 'Interested in education-related campaigns.', total_donation: 4200, created_at: new Date(Date.now() - 86400000 * 20).toISOString() },
      { id: 'donor-2', name: 'Robert Johnson', email: 'robert.j@corp.com', phone: '555-0142', address: '456 Oak Ave, Boston', occupation: 'Financial Analyst', notes: 'Corporate donor matching participant.', total_donation: 12800, created_at: new Date(Date.now() - 86400000 * 40).toISOString() },
      { id: 'donor-3', name: 'Alice Williams', email: 'alice.w@yahoo.com', phone: '555-0187', address: '789 Pine Rd, Chicago', occupation: 'Retired Teacher', notes: 'Recurring monthly small donor.', total_donation: 950, created_at: new Date(Date.now() - 86400000 * 5).toISOString() }
    ],
    donations: [
      { id: 'don-1', donor_id: 'donor-1', campaign_id: 'camp-4', amount: 1200, payment_method: 'Card', payment_date: '2026-06-25T14:30:00Z', receipt_number: 'REC-20260625-X8B9', notes: 'Annual fund contribution.', created_at: '2026-06-25T14:30:00Z' },
      { id: 'don-2', donor_id: 'donor-2', campaign_id: 'camp-1', amount: 8000, payment_method: 'Bank Transfer', payment_date: '2026-06-28T10:15:00Z', receipt_number: 'REC-20260628-A4K1', notes: 'Corporate sponsor contribution.', created_at: '2026-06-28T10:15:00Z' },
      { id: 'don-3', donor_id: 'donor-3', campaign_id: 'camp-2', amount: 50, payment_method: 'UPI', payment_date: '2026-07-01T09:00:00Z', receipt_number: 'REC-20260701-C7Y8', notes: 'Monthly support.', created_at: '2026-07-01T09:00:00Z' }
    ],
    beneficiaries: [
      { id: 'ben-1', name: 'Mohammed Ali', age: 45, gender: 'Male', address: 'Camp Sector 3, Block B', family_members: 5, income_level: 220.00, assistance_received: 'Received 3 food packs, 1 hygiene kit', notes: 'Day laborer, works irregularly.', created_at: new Date(Date.now() - 86400000 * 22).toISOString() },
      { id: 'ben-2', name: 'Sara Khan', age: 32, gender: 'Female', address: 'Transit Station Shelter 12', family_members: 3, income_level: 550.00, assistance_received: 'Received winter blankets and medical support', notes: 'Widow, manages a small sewing stall.', created_at: new Date(Date.now() - 86400000 * 18).toISOString() },
      { id: 'ben-3', name: 'David Brown', age: 67, gender: 'Male', address: 'Suburban Relief Center', family_members: 2, income_level: 920.00, assistance_received: 'Received food security stipend', notes: 'Elderly beneficiary, lives with grandchild.', created_at: new Date(Date.now() - 86400000 * 12).toISOString() }
    ],
    volunteers: [
      { id: 'vol-1', name: 'Emily Davis', email: 'emily.davis@volunteer.org', phone: '555-0211', skills: ['First Aid', 'Social Media'], availability: 'Part-time', assigned_campaign_id: 'camp-1', created_at: new Date(Date.now() - 86400000 * 25).toISOString() },
      { id: 'vol-2', name: 'Michael Chang', email: 'michael.c@volunteer.org', phone: '555-0275', skills: ['Logistics', 'Translation'], availability: 'Weekends', assigned_campaign_id: 'camp-2', created_at: new Date(Date.now() - 86400000 * 20).toISOString() }
    ],
    tasks: [
      { id: 'task-1', title: 'Distribute flyer materials', description: 'Hand out flyers for clean water well project in downtown area.', assigned_to: 'volunteer-1', priority: 'High', due_date: '2026-07-05', status: 'Pending', campaign_id: 'camp-1', created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
      { id: 'task-2', title: 'Coordinate relief delivery', description: 'Set up logistics schedule for food kit handovers.', assigned_to: 'manager-1', priority: 'Medium', due_date: '2026-07-10', status: 'In Progress', campaign_id: 'camp-2', created_at: new Date(Date.now() - 86400000 * 1).toISOString() },
      { id: 'task-3', title: 'Verify bank statement receipts', description: 'Match bank receipts to donation entry ledger.', assigned_to: 'admin-1', priority: 'Low', due_date: '2026-06-30', status: 'Completed', campaign_id: null, created_at: new Date(Date.now() - 86400000 * 5).toISOString() }
    ],
    activity_logs: [
      { id: 'log-1', user_id: 'admin-1', activity: 'Sarah Jenkins matched transaction REC-20260628-A4K1', timestamp: '2026-06-28T11:00:00Z' },
      { id: 'log-2', user_id: 'manager-1', activity: 'David Ross assigned Task "Distribute flyer materials" to James Carter', timestamp: '2026-07-01T08:15:00Z' }
    ]
  };

  // Helper local storage getter/setter
  const getDB = () => {
    const raw = localStorage.getItem('ngo_crm_mock_db');
    if (!raw) {
      localStorage.setItem('ngo_crm_mock_db', JSON.stringify(defaultDatabase));
      return defaultDatabase;
    }
    return JSON.parse(raw);
  };

  const saveDB = (db) => {
    localStorage.setItem('ngo_crm_mock_db', JSON.stringify(db));
  };

  // Init local session state
  let currentSession = JSON.parse(localStorage.getItem('ngo_crm_session')) || null;
  let authListeners = [];

  // Mock implementation of Supabase client builder
  class MockQueryBuilder {
    constructor(tableName) {
      this.tableName = tableName;
      this.filters = [];
      this.orderCol = null;
      this.orderAsc = false;
      this.limitCount = null;
      this.singleRow = false;
    }

    select(columns, options = {}) {
      this.columns = columns;
      this.selectCount = options.count === 'exact';
      return this;
    }

    eq(column, value) {
      this.filters.push({ type: 'eq', column, value });
      return this;
    }

    gte(column, value) {
      this.filters.push({ type: 'gte', column, value });
      return this;
    }

    lte(column, value) {
      this.filters.push({ type: 'lte', column, value });
      return this;
    }

    ilike(column, pattern) {
      this.filters.push({ type: 'ilike', column, value: pattern.replace(/%/g, '') });
      return this;
    }

    order(column, options = {}) {
      this.orderCol = column;
      this.orderAsc = options.ascending ?? false;
      return this;
    }

    limit(n) {
      this.limitCount = n;
      return this;
    }

    single() {
      this.singleRow = true;
      return this;
    }

    // Resolves query results asynchronously
    async then(resolve) {
      const db = getDB();
      let rows = [...(db[this.tableName] || [])];

      // Apply Filters
      this.filters.forEach(filter => {
        if (filter.type === 'eq') {
          rows = rows.filter(r => r[filter.column] === filter.value);
        } else if (filter.type === 'gte') {
          rows = rows.filter(r => r[filter.column] >= filter.value);
        } else if (filter.type === 'lte') {
          rows = rows.filter(r => r[filter.column] <= filter.value);
        } else if (filter.type === 'ilike') {
          rows = rows.filter(r => String(r[filter.column]).toLowerCase().includes(filter.value.toLowerCase()));
        }
      });

      // Apply sorting
      if (this.orderCol) {
        rows.sort((a, b) => {
          let valA = a[this.orderCol];
          let valB = b[this.orderCol];
          if (typeof valA === 'string') {
            return this.orderAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
          }
          return this.orderAsc ? valA - valB : valB - valA;
        });
      }

      // Apply limit
      if (this.limitCount) {
        rows = rows.slice(0, this.limitCount);
      }

      // Expand Relations (Joins Mock)
      rows = rows.map(row => {
        const rowCopy = { ...row };
        
        // 1. Expand Donors
        if (rowCopy.donor_id) {
          rowCopy.donors = db.donors.find(d => d.id === rowCopy.donor_id) || null;
        }
        // 2. Expand Campaigns
        if (rowCopy.campaign_id) {
          rowCopy.campaigns = db.campaigns.find(c => c.id === rowCopy.campaign_id) || null;
        } else if (rowCopy.assigned_campaign_id) {
          rowCopy.campaigns = db.campaigns.find(c => c.id === rowCopy.assigned_campaign_id) || null;
        }
        // 3. Expand Assignee User
        if (rowCopy.assigned_to) {
          rowCopy.users = db.users.find(u => u.id === rowCopy.assigned_to) || null;
        }

        return rowCopy;
      });

      // Prepare response payload
      let result;
      if (this.singleRow) {
        result = { data: rows[0] || null, error: rows[0] ? null : { message: 'Row not found' }, count: rows.length };
      } else {
        result = { data: rows, error: null, count: rows.length };
      }

      resolve(result);
    }

    async insert(records) {
      const db = getDB();
      const recordsToInsert = Array.isArray(records) ? records : [records];
      
      const newRecords = recordsToInsert.map(record => {
        const newRecord = {
          id: record.id || Math.random().toString(36).substring(2, 9),
          created_at: new Date().toISOString(),
          ...record
        };

        // Aggregations Automation (Trigger emulator)
        if (this.tableName === 'donations') {
          // 1. Update Campaign collections
          if (newRecord.campaign_id) {
            db.campaigns = db.campaigns.map(c => 
              c.id === newRecord.campaign_id 
                ? { ...c, collected_amount: Number(c.collected_amount) + Number(newRecord.amount) } 
                : c
            );
          }
          // 2. Update Donor lifetime contributions
          db.donors = db.donors.map(d => 
            d.id === newRecord.donor_id 
              ? { ...d, total_donation: Number(d.total_donation) + Number(newRecord.amount) } 
              : d
          );
        }

        return newRecord;
      });

      db[this.tableName] = [...(db[this.tableName] || []), ...newRecords];
      saveDB(db);

      // Return chainable SELECT simulator
      return {
        data: Array.isArray(records) ? newRecords : newRecords[0],
        error: null,
        select: () => ({
          single: () => ({ data: newRecords[0], error: null })
        })
      };
    }

    async update(fields) {
      const db = getDB();
      let updatedRows = [];

      db[this.tableName] = db[this.tableName].map(row => {
        // Evaluate matching filters
        let isMatch = true;
        this.filters.forEach(filter => {
          if (filter.type === 'eq' && row[filter.column] !== filter.value) isMatch = false;
        });

        if (isMatch) {
          const updatedRow = { ...row, ...fields };
          updatedRows.push(updatedRow);
          return updatedRow;
        }
        return row;
      });

      saveDB(db);
      return { data: updatedRows, error: null };
    }

    async delete() {
      const db = getDB();
      let deletedRows = [];

      db[this.tableName] = db[this.tableName].filter(row => {
        let isMatch = true;
        this.filters.forEach(filter => {
          if (filter.type === 'eq' && row[filter.column] !== filter.value) isMatch = false;
        });

        if (isMatch) {
          deletedRows.push(row);
          return false; // delete row
        }
        return true;
      });

      saveDB(db);
      return { data: deletedRows, error: null };
    }
  }

  // Client Mock export shape
  supabaseInstance = {
    from: (tableName) => new MockQueryBuilder(tableName),
    
    // Auth services emulator
    auth: {
      getSession: async () => {
        return { data: { session: currentSession }, error: null };
      },
      
      signInWithPassword: async ({ email, password }) => {
        const db = getDB();
        const userRow = db.users.find(u => u.email === email);
        
        if (!userRow) {
          return { data: null, error: { message: 'Invalid credentials. User unlisted on Sandbox Roster.' } };
        }

        const session = {
          access_token: 'mock-jwt-token',
          user: {
            id: userRow.id,
            email: userRow.email,
            user_metadata: { full_name: userRow.full_name, role: userRow.role }
          }
        };

        currentSession = session;
        localStorage.setItem('ngo_crm_session', JSON.stringify(session));
        authListeners.forEach(listener => listener('SIGNED_IN', session));
        
        return { data: { session, user: session.user }, error: null };
      },

      signUp: async ({ email, password, options }) => {
        const db = getDB();
        const existing = db.users.find(u => u.email === email);
        if (existing) {
          return { data: null, error: { message: 'User account already registered.' } };
        }

        const newId = Math.random().toString(36).substring(2, 9);
        const newProfile = {
          id: newId,
          full_name: options?.data?.full_name || 'Staff Member',
          email: email,
          role: options?.data?.role || 'volunteer',
          created_at: new Date().toISOString()
        };

        // Add to users table
        db.users.push(newProfile);
        saveDB(db);

        // Pre-create user profile details
        return { data: { user: { id: newId, email, user_metadata: options?.data } }, error: null };
      },

      signOut: async () => {
        currentSession = null;
        localStorage.removeItem('ngo_crm_session');
        authListeners.forEach(listener => listener('SIGNED_OUT', null));
        return { error: null };
      },

      updateUser: async ({ password, data }) => {
        if (currentSession?.user) {
          if (data?.full_name) {
            currentSession.user.user_metadata.full_name = data.full_name;
            // sync database
            const db = getDB();
            db.users = db.users.map(u => 
              u.id === currentSession.user.id ? { ...u, full_name: data.full_name } : u
            );
            saveDB(db);
          }
          if (data?.avatar_url) {
            currentSession.user.user_metadata.avatar_url = data.avatar_url;
          }
          localStorage.setItem('ngo_crm_session', JSON.stringify(currentSession));
          authListeners.forEach(listener => listener('USER_UPDATED', currentSession));
        }
        return { data: { user: currentSession?.user }, error: null };
      },

      onAuthStateChange: (callback) => {
        authListeners.push(callback);
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                authListeners = authListeners.filter(l => l !== callback);
              }
            }
          }
        };
      }
    },

    // Storage bucket mock
    storage: {
      from: () => ({
        upload: async (path, file) => {
          return { data: { path }, error: null };
        },
        getPublicUrl: (path) => {
          // Returns a mock URL using raw base64 or custom static images
          const placeholders = [
            'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=600&q=80',
            'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=600&q=80',
            'https://images.unsplash.com/photo-1509099836639-18ba1795216d?auto=format&fit=crop&w=600&q=80',
            'https://images.unsplash.com/photo-1497561813398-8fcc7a37b585?auto=format&fit=crop&w=600&q=80'
          ];
          const randomUrl = placeholders[Math.floor(Math.random() * placeholders.length)];
          return { data: { publicUrl: randomUrl } };
        }
      })
    },

    // Realtime channel listener mock builder
    channel: () => ({
      on: function(event, filter, callback) {
        // mock subscription registry
        return this;
      },
      subscribe: () => ({
        unsubscribe: () => {}
      })
    }),
    removeChannel: () => {}
  };

} else {
  supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export const supabase = supabaseInstance;
export const isSandboxMode = isMock;
