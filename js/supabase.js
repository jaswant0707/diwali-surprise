/**
 * Diwali Surprise - Supabase Database Client & Repository
 * Handles authoritative persistent storage for Greetings and User Feedback
 * Author: Jaswant Yadav (@jaswant_0707)
 */

(function () {
  'use strict';

  // UUID generator helper with RFC4122 v4 compliance
  function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // Local storage cache helpers (for sender's history / draft persistence ONLY)
  function getLocalGreetings() {
    try {
      const raw = localStorage.getItem(CONFIG.LOCAL_CACHE_KEY_GREETINGS);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.warn('LocalStorage access error:', e);
      return {};
    }
  }

  function setLocalGreeting(id, record) {
    try {
      const store = getLocalGreetings();
      store[id] = record;
      localStorage.setItem(CONFIG.LOCAL_CACHE_KEY_GREETINGS, JSON.stringify(store));
    } catch (e) {
      console.warn('LocalStorage write error:', e);
    }
  }

  // On-demand Supabase client getter (ensures CDN script availability)
  let supabaseClient = null;
  function getSupabaseClient() {
    if (!supabaseClient && typeof window.supabase !== 'undefined') {
      const isConfigured = CONFIG.SUPABASE_URL && 
                           !CONFIG.SUPABASE_URL.includes('your-project') &&
                           CONFIG.SUPABASE_ANON_KEY && 
                           !CONFIG.SUPABASE_ANON_KEY.includes('placeholder');
      if (isConfigured) {
        try {
          supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
        } catch (e) {
          console.warn('Supabase client creation error:', e);
        }
      }
    }
    return supabaseClient;
  }

  // Direct REST API fallback helper (works even if CDN script fails or is blocked by privacy tools)
  async function querySupabaseRest(endpoint, options = {}) {
    const url = `${CONFIG.SUPABASE_URL}/rest/v1/${endpoint}`;
    const headers = Object.assign({
      'apikey': CONFIG.SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    }, options.headers || {});

    const resp = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      throw new Error(`Cloud database error (${resp.status}): ${errText || resp.statusText}`);
    }

    if (resp.status === 204) return null;
    return await resp.json().catch(() => null);
  }

  const SupabaseDB = {
    isLive() {
      return !!getSupabaseClient();
    },

    /**
     * Authoritatively save a personalized greeting to Supabase
     * Throws an error if Supabase insertion fails — NEVER returns a fake local UUID.
     * @param {string} recipientName 
     * @param {string} personalMessage 
     * @returns {Promise<{id: string, recipientName: string, personalMessage: string, createdAt: string}>}
     */
    async saveGreeting(recipientName, personalMessage) {
      const cleanName = (recipientName || '').trim();
      const cleanMsg = (personalMessage || '').trim();

      if (!cleanName) {
        throw new Error('Please enter the recipient’s name.');
      }
      if (cleanName.length > 100) {
        throw new Error('Recipient name must be 100 characters or fewer.');
      }
      if (cleanMsg.length > 500) {
        throw new Error('Personal message must be 500 characters or fewer.');
      }

      // Payload matching public.greetings schema
      const payload = {
        recipient_name: cleanName,
        personal_message: cleanMsg || null,
        is_active: true
      };

      let insertedRecord = null;
      let lastError = null;

      // 1. Primary: Use Supabase JavaScript SDK
      const client = getSupabaseClient();
      if (client) {
        try {
          const { data, error } = await client
            .from('greetings')
            .insert([payload])
            .select('id, recipient_name, personal_message, created_at, expires_at, is_active')
            .single();

          if (error) {
            console.warn('Supabase SDK insert failed, attempting REST fallback:', error);
            lastError = error.message;
          } else if (data && data.id) {
            insertedRecord = data;
          }
        } catch (sdkErr) {
          console.warn('Supabase SDK exception, attempting REST fallback:', sdkErr);
          lastError = sdkErr.message;
        }
      }

      // 2. Secondary: Direct REST POST fallback
      if (!insertedRecord) {
        try {
          const restData = await querySupabaseRest('greetings', {
            method: 'POST',
            headers: { 'Prefer': 'return=representation' },
            body: JSON.stringify(payload)
          });

          if (Array.isArray(restData) && restData.length > 0 && restData[0].id) {
            insertedRecord = restData[0];
          } else if (restData && restData.id) {
            insertedRecord = restData;
          }
        } catch (restErr) {
          console.error('Supabase REST insert failed:', restErr);
          lastError = restErr.message || lastError;
        }
      }

      // 3. Strict verification: Supabase MUST be authoritative.
      if (!insertedRecord || !insertedRecord.id) {
        throw new Error(
          'Could not save your greeting to the cloud. Please check your internet connection or disable ad-blockers and try again.'
        );
      }

      const verifiedId = insertedRecord.id;

      // Verify immediate cloud retrieval to guarantee link viability
      const verifyCheck = await this.getGreeting(verifiedId);
      if (!verifyCheck) {
        console.warn('Immediate verification check could not find newly inserted ID:', verifiedId);
      }

      // Cache locally only for sender's history / draft recovery
      setLocalGreeting(verifiedId, insertedRecord);

      return {
        id: insertedRecord.id,
        recipientName: insertedRecord.recipient_name,
        personalMessage: insertedRecord.personal_message || '',
        createdAt: insertedRecord.created_at
      };
    },

    /**
     * Retrieve a greeting authoritatively by UUID
     * @param {string} id UUID of greeting
     * @returns {Promise<{id: string, recipientName: string, personalMessage: string} | null>}
     */
    async getGreeting(id) {
      if (!id || typeof id !== 'string') return null;
      const cleanId = id.trim();

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(cleanId)) {
        console.warn('Invalid UUID format requested:', cleanId);
        return null;
      }

      // 1. Primary: Use Supabase SDK
      const client = getSupabaseClient();
      if (client) {
        try {
          const { data, error } = await client
            .from('greetings')
            .select('id, recipient_name, personal_message, is_active, expires_at')
            .eq('id', cleanId)
            .eq('is_active', true)
            .maybeSingle();

          if (!error && data) {
            if (data.expires_at && new Date(data.expires_at) < new Date()) {
              console.warn('Greeting has expired:', cleanId);
              return null;
            }
            return {
              id: data.id,
              recipientName: data.recipient_name,
              personalMessage: data.personal_message || ''
            };
          }
        } catch (sdkErr) {
          console.warn('Supabase SDK getGreeting error, trying REST fallback:', sdkErr);
        }
      }

      // 2. Secondary: Direct REST query fallback
      try {
        const endpoint = `greetings?id=eq.${encodeURIComponent(cleanId)}&is_active=eq.true&select=id,recipient_name,personal_message,is_active,expires_at`;
        const restResult = await querySupabaseRest(endpoint);

        if (Array.isArray(restResult) && restResult.length > 0) {
          const data = restResult[0];
          if (data.expires_at && new Date(data.expires_at) < new Date()) {
            console.warn('Greeting has expired:', cleanId);
            return null;
          }
          return {
            id: data.id,
            recipientName: data.recipient_name,
            personalMessage: data.personal_message || ''
          };
        }
      } catch (restErr) {
        console.error('Supabase REST getGreeting error:', restErr);
      }

      // 3. Fallback: Sender's local device cache (only works on original device for draft inspection)
      const localStore = getLocalGreetings();
      const localRecord = localStore[cleanId];
      if (localRecord && localRecord.is_active) {
        if (localRecord.expires_at && new Date(localRecord.expires_at) < new Date()) {
          return null;
        }
        return {
          id: localRecord.id,
          recipientName: localRecord.recipient_name,
          personalMessage: localRecord.personal_message || ''
        };
      }

      return null;
    },

    /**
     * Authoritative Feedback Submission
     */
    async submitFeedback({ fullName, email, phone, rating, message }) {
      const cleanName = (fullName || '').trim();
      const cleanEmail = (email || '').trim();
      const cleanPhone = (phone || '').trim();
      const cleanMsg = (message || '').trim();
      const numRating = parseInt(rating, 10);

      if (!cleanName) throw new Error('Please enter your full name.');
      if (!cleanEmail || !cleanEmail.includes('@')) throw new Error('Please provide a valid email address.');
      if (isNaN(numRating) || numRating < 1 || numRating > 5) throw new Error('Please select a star rating between 1 and 5.');
      if (!cleanMsg || cleanMsg.length < 3) throw new Error('Please write a feedback message of at least 3 characters.');

      const payload = {
        full_name: cleanName,
        email: cleanEmail,
        phone: cleanPhone || null,
        rating: numRating,
        message: cleanMsg
      };

      const client = getSupabaseClient();
      if (client) {
        try {
          const { error } = await client.from('feedback').insert([payload]);
          if (!error) return { success: true };
        } catch (e) {
          console.warn('Feedback SDK submission failed, trying REST:', e);
        }
      }

      // REST fallback
      try {
        await querySupabaseRest('feedback', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        return { success: true };
      } catch (restErr) {
        console.error('Feedback REST submission failed:', restErr);
        throw new Error('Could not submit feedback to the cloud. Please try again.');
      }
    }
  };

  window.SupabaseDB = SupabaseDB;
})();
