import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.FAST2SMS_API_KEY;

async function test() {
  const url = `https://www.fast2sms.com/dev/bulkV2?authorization=${apiKey}&route=otp&variables_values=123456&flash=0&numbers=9876543210`;
  const res = await fetch(url, { headers: { 'cache-control': 'no-cache' } });
  const data = await res.json();
  console.log('Fast2SMS GET Response:', data);
}

test().catch(console.error);
