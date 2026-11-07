/**
 * Comprehensive Automated End-to-End Test Suite for Diwali Surprise
 * Tests Live Supabase Integration, RLS Policies, Greeting Persistence, and Social Sharing
 */

const { createClient } = require('@supabase/supabase-js');

// Mock browser globals for Node test environment
global.window = global;
global.window.supabase = { createClient };
global.localStorage = {
  _store: {},
  getItem(k) { return this._store[k] || null; },
  setItem(k, v) { this._store[k] = String(v); },
  removeItem(k) { delete this._store[k]; },
  clear() { this._store = {}; }
};
global.sessionStorage = {
  _store: {},
  getItem(k) { return this._store[k] || null; },
  setItem(k, v) { this._store[k] = String(v); }
};
global.location = {
  origin: 'https://diwalisurprise.app',
  pathname: '/index.html'
};

// Load modular files
require('./js/config.js');
require('./js/supabase.js');
require('./js/sharing.js');

async function runTestSuite() {
  console.log('🧪 Starting Diwali Surprise Live Supabase E2E Test Suite...\n');
  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
    }
  }

  // TEST GROUP 1: Configuration & Metadata
  console.log('--- TEST GROUP 1: Configuration & Metadata ---');
  assert(CONFIG.APP_NAME.includes('Diwali Surprise'), 'App name is configured');
  assert(CONFIG.CREATOR_NAME === 'Jaswant Yadav', 'Creator name is Jaswant Yadav');
  assert(CONFIG.CREATOR_HANDLE === '@jaswant_0707', 'Creator Instagram handle is @jaswant_0707');
  assert(CONFIG.SUPABASE_URL === 'https://scaooeaaeavqpeljhejd.supabase.co', 'Live Supabase URL is configured');
  assert(CONFIG.SUPABASE_ANON_KEY === 'sb_publishable_zKK-dDF2fzMdpM7FXDOwIw_q---6TlB', 'Live publishable key is configured');
  assert(SupabaseDB.isLive() === true, 'Supabase client initialized in LIVE mode');

  // TEST GROUP 2: Live Greeting Insertion & Retrieval
  console.log('\n--- TEST GROUP 2: Live Supabase Greeting Operations ---');
  const recipientName = 'Ananya Sen';
  const personalMsg = 'Wishing you a luminous Diwali sparkling with joy, love, and prosperity! 🪔✨';

  const created = await SupabaseDB.saveGreeting(recipientName, personalMsg);
  assert(created && created.id, `Greeting saved with UUID: ${created ? created.id : 'none'}`);
  assert(created.recipientName === recipientName, 'Saved recipient name matches input');
  assert(created.personalMessage === personalMsg, 'Saved personal message matches input');

  // Retrieve by ID from Live Supabase
  const retrieved = await SupabaseDB.getGreeting(created.id);
  assert(retrieved !== null, 'Greeting successfully retrieved from live Supabase by UUID');
  assert(retrieved.id === created.id, 'Retrieved ID matches saved UUID');
  assert(retrieved.recipientName === recipientName, 'Retrieved recipient name is exact');
  assert(retrieved.personalMessage === personalMsg, 'Retrieved personal message is exact');

  // Verify Surprise URL generation
  const surpriseUrl = CONFIG.getSurpriseUrl(created.id);
  assert(surpriseUrl.includes(`surprise.html?id=${encodeURIComponent(created.id)}`), 'Shareable surprise URL is properly formatted');

  // TEST GROUP 3: Validation & Edge Cases
  console.log('\n--- TEST GROUP 3: Validation & Error Handling ---');
  let emptyNameRejected = false;
  try {
    await SupabaseDB.saveGreeting('', 'Hello');
  } catch (e) {
    emptyNameRejected = true;
  }
  assert(emptyNameRejected, 'Empty recipient name correctly rejected');

  let longMsgRejected = false;
  try {
    const tooLong = 'x'.repeat(501);
    await SupabaseDB.saveGreeting('Friend', tooLong);
  } catch (e) {
    longMsgRejected = true;
  }
  assert(longMsgRejected, 'Message exceeding 500 characters correctly rejected');

  const missingGreeting = await SupabaseDB.getGreeting('00000000-0000-0000-0000-000000000000');
  assert(missingGreeting === null, 'Non-existent UUID returns null gracefully without crash');

  // TEST GROUP 4: Social Sharing Engine
  console.log('\n--- TEST GROUP 4: Multi-Channel Social Sharing ---');
  const shareData = ShareEngine.getShareData(surpriseUrl, recipientName);
  assert(shareData.title.includes(recipientName), 'Share title contains recipient name');
  assert(shareData.text.includes(recipientName), 'Share prefilled text contains recipient name');
  assert(shareData.url === surpriseUrl, 'Share data contains generated surprise URL');

  // TEST GROUP 5: Live Feedback Submission
  console.log('\n--- TEST GROUP 5: Live Feedback Submission ---');
  const feedbackResult = await SupabaseDB.submitFeedback({
    fullName: 'Pooja Kashyap',
    email: 'pooja.kashyap@example.com',
    phone: '+91 98111 22233',
    rating: 5,
    message: 'The magical gift opening and fireworks brought tears of happiness to our family celebration!'
  });
  assert(feedbackResult && feedbackResult.success === true, 'Feedback successfully saved to live Supabase');

  let invalidRatingRejected = false;
  try {
    await SupabaseDB.submitFeedback({
      fullName: 'Tester',
      email: 'test@example.com',
      rating: 6,
      message: 'Invalid rating test'
    });
  } catch (e) {
    invalidRatingRejected = true;
  }
  assert(invalidRatingRejected, 'Out-of-range rating (6) correctly rejected');

  // TEST GROUP 6: Row Level Security (RLS) Policy Verification
  console.log('\n--- TEST GROUP 6: Row Level Security (RLS) Verification ---');
  const liveClient = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

  // RLS Test 1: Public user attempts to UPDATE a greeting (should be blocked by RLS)
  const { data: updateData, error: updateError } = await liveClient
    .from('greetings')
    .update({ recipient_name: 'Hacked Name' })
    .eq('id', created.id)
    .select();

  // If RLS denies update, either updateError is present or 0 rows are updated
  const updateBlocked = updateError !== null || (updateData && updateData.length === 0);
  assert(updateBlocked, 'RLS correctly prevents unauthorized UPDATE on greetings');

  // RLS Test 2: Public user attempts to DELETE a greeting (should be blocked by RLS)
  const { data: deleteData, error: deleteError } = await liveClient
    .from('greetings')
    .delete()
    .eq('id', created.id)
    .select();

  const deleteBlocked = deleteError !== null || (deleteData && deleteData.length === 0);
  assert(deleteBlocked, 'RLS correctly prevents unauthorized DELETE on greetings');

  // RLS Test 3: Public user attempts to SELECT all feedback (privacy protection)
  const { data: fbListData, error: fbListError } = await liveClient
    .from('feedback')
    .select('*');

  // Should either return an error or an empty array (RLS denies row visibility)
  const feedbackProtected = fbListError !== null || (fbListData && fbListData.length === 0);
  assert(feedbackProtected, 'RLS correctly protects user feedback & contact info from public reading');

  console.log(`\n======================================================`);
  console.log(`ALL TESTS COMPLETED: ${passed}/${total} PASSED`);
  console.log(`======================================================\n`);

  if (passed !== total) process.exit(1);
}

runTestSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
