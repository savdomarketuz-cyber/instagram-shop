const fs = require('fs');

const harPath = "D:\\Desktop\\uzum.uz_Archive [26-09-06 11-30-52].har";
const harData = JSON.parse(fs.readFileSync(harPath, 'utf-8'));

const entries = harData.log.entries.filter(e => e.request.url.includes('graphql.uzum.uz') || e.request.url.includes('uzum.uz/api'));

console.log(`Found ${entries.length} requests to Uzum API/GraphQL.`);

entries.slice(0, 3).forEach((e, idx) => {
  console.log(`\n--- Entry ${idx} ---`);
  console.log('URL:', e.request.url);
  console.log('Method:', e.request.method);
  console.log('Headers:', e.request.headers);
  if (e.request.postData) {
    console.log('PostData:', e.request.postData.text?.slice(0, 300));
  }
});
