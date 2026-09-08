// Create wordbooks collection in CloudBase
const cloudbase = require('@cloudbase/js-sdk');

async function main() {
  const app = cloudbase.init({ env: 'ferrari-d8gusxzk6b74a91a3' });
  const auth = app.auth({ persistence: 'local' });

  console.log('Signing in anonymously...');
  await auth.signInAnonymously();
  console.log('Signed in');

  const db = app.database();
  const coll = db.collection('wordbooks');

  // Create collection by adding a test doc
  console.log('Creating wordbooks collection...');
  try {
    const result = await coll.add({
      uid: '_init',
      words: [],
      updateTime: new Date()
    });
    console.log('Collection created! Doc ID:', result.id);
  } catch(e) {
    console.log('Error:', e.message || e);
  }
}

main().catch(e => console.error(e));
