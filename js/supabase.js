/**
 * Diwali Surprise - Supabase Database Client & Repository
 * Handles persistent storage for Greetings and User Feedback
 * Author: Jaswant Yadav (@jaswant_0707)
 */

(function () {
  'use strict';

  // UUID generator helper with fallback
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

  // Local storage failover helpers
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

  function getLocalFeedback() {
    try {
      const raw = localStorage.getItem(CONFIG.LOCAL_CACHE_KEY_FEEDBACK);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function addLocalFeedback(record) {
    try {
      const list = getLocalFeedback();
      list.push(record);
      localStorage.setItem(CONFIG.LOCAL_CACHE_KEY_FEEDBACK, JSON.stringify(list));
    } catch (e) {
      console.warn('LocalStorage feedback write error:', e);
    }
  }

  // Initialize Supabase client
  let supabaseClient = null;
  const isConfigured = CONFIG.SUPABASE_URL && 
                       !CONFIG.SUPABASE_URL.includes('your-project') &&
                       CONFIG.SUPABASE_ANON_KEY && 
                       !CONFIG.SUPABASE_ANON_KEY.includes('placeholder');

  if (typeof window.supabase !== 'undefined' && isConfigured) {
    try {
      supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
      console.log('✨ Supabase client initialized successfully.');
    } catch (err) {
      console.warn('Could not initialize Supabase client:', err);
    }
  } else {
    console.info('ℹ️ Supabase not yet configured or running in local offline demo mode.');
  }

  const SupabaseDB = {
    isLive() {
      return !!supabaseClient;
    },

    /**
     * Create and store a personalized greeting
     * @param {string} recipientName 
     * @param {string} personalMessage 
     * @returns {Promise<{id: string, recipientName: string, personalMessage: string, error?: string}>}
     */
    async saveGreeting(recipientName, personalMessage) {
      const cleanName = (recipientName || '').trim();
      const cleanMsg = (personalMessage || '').trim();

      if (!cleanName) {
        throw new Error('Recipient name is required.');
      }
      if (cleanName.length > 100) {
        throw new Error('Recipient name must be 100 characters or fewer.');
      }
      if (cleanMsg.length > 500) {
        throw new Error('Personal message must be 500 characters or fewer.');
      }

      const id = generateUUID();
      const record = {
        id,
        recipient_name: cleanName,
        personal_message: cleanMsg || null,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true
      };

      // Always save to local cache for instant failover resilience
      setLocalGreeting(id, record);

      // Save to Supabase if configured
      if (supabaseClient) {
        try {
          const { data, error } = await supabaseClient
            .from('greetings')
            .insert([record])
            .select()
            .single();

          if (error) {
            console.warn('Supabase insert warning, saved locally:', error.message);
          } else if (data) {
            return {
              id: data.id,
              recipientName: data.recipient_name,
              personalMessage: data.personal_message,
              createdAt: data.created_at
            };
          }
        } catch (dbErr) {
          console.warn('Network error during Supabase insert, using local record:', dbErr);
        }
      }

      return {
        id: record.id,
        recipientName: record.recipient_name,
        personalMessage: record.personal_message,
        createdAt: record.created_at
      };
    },

    /**
     * Retrieve a greeting by ID
     * @param {string} id UUID of greeting
     * @returns {Promise<{id: string, recipientName: string, personalMessage: string} | null>}
     */
    async getGreeting(id) {
      if (!id) return null;

      // 1. Try Supabase if available
      if (supabaseClient) {
        try {
          const { data, error } = await supabaseClient
            .from('greetings')
            .select('id, recipient_name, personal_message, is_active, expires_at')
            .eq('id', id)
            .eq('is_active', true)
            .maybeSingle();

          if (!error && data) {
            // Check expiration
            if (data.expires_at && new Date(data.expires_at) < new Date()) {
              console.warn('Greeting has expired.');
              return null;
            }
            return {
              id: data.id,
              recipientName: data.recipient_name,
              personalMessage: data.personal_message || ''
            };
          }
        } catch (dbErr) {
          console.warn('Supabase query failed, checking local backup:', dbErr);
        }
      }

      // 2. Check local backup
      const localStore = getLocalGreetings();
      const localRecord = localStore[id];
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
     * Submit feedback and rating to Supabase
     * @param {object} feedbackData { fullName, email, phone, rating, message }
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

      const record = {
        id: generateUUID(),
        full_name: cleanName,
        email: cleanEmail,
        phone: cleanPhone || null,
        rating: numRating,
        message: cleanMsg,
        created_at: new Date().toISOString()
      };

      addLocalFeedback(record);

      if (supabaseClient) {
        try {
          const { data, error } = await supabaseClient
            .from('feedback')
            .insert([record]);

          if (error) {
            console.warn('Supabase feedback insert error, stored locally:', error.message);
          }
        } catch (err) {
          console.warn('Feedback network error, stored locally:', err);
        }
      }

      return { success: true };
    }
  };

  window.SupabaseDB = SupabaseDB;
})();
