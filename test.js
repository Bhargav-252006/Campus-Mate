const OpenAI = require('openai');

const MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const API_KEY = process.env.GROQ_API_KEY;

if (!API_KEY) {
  console.error('Missing GROQ_API_KEY. Set it before running this script.');
  console.error('PowerShell example: $env:GROQ_API_KEY="your_key_here"');
  process.exit(1);
}

const client = new OpenAI({
  apiKey: API_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
});

// Project-fit prompt: focuses on your Campus Mate microservices architecture.
const ARCHITECTURE_PROMPT = `You are reviewing the Campus Mate project architecture.
Provide a concise technical assessment with these sections:
1) Strengths in current microservices design
2) Top 5 risks or bottlenecks
3) Concrete fixes with implementation priority (P0/P1/P2)
4) Suggested model-routing policy for fast vs heavy requests
5) Recommended endpoint-level timeout strategy for gateway and chat service

Keep it practical and production-oriented.`;

async function main() {
  try {
    const requestStartedAt = Date.now();
    let firstTokenAt = null;

    const stream = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a senior AI systems architect and Node.js backend reviewer.'
        },
        {
          role: 'user',
          content: ARCHITECTURE_PROMPT
        }
      ],
      temperature: 0.3,
      top_p: 0.9,
      max_tokens: 2500,
      stream: true
    });

    for await (const chunk of stream) {
      if (!firstTokenAt) {
        firstTokenAt = Date.now();
      }

      const text = chunk.choices?.[0]?.delta?.content;

      if (text) process.stdout.write(text);
    }

    process.stdout.write('\n');

    const completedAt = Date.now();
    const firstTokenMs = firstTokenAt ? firstTokenAt - requestStartedAt : null;
    const totalMs = completedAt - requestStartedAt;

    console.log('--- Timing ---');
    if (firstTokenMs !== null) {
      console.log(`Time to first token: ${firstTokenMs} ms`);
    } else {
      console.log('Time to first token: n/a');
    }
    console.log(`Total response time: ${totalMs} ms`);
  } catch (error) {
    const status = error?.status || error?.response?.status;
    const message = error?.message || 'Unknown error';
    console.error(`Groq request failed (${status || 'n/a'}): ${message}`);
    process.exit(1);
  }
}

main();