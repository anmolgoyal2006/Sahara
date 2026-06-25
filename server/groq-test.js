require('dotenv').config();
const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function test() {
  try {
    const request = "I want nurse.";
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 500,
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content: `You are a booking assistant for an elderly care platform in India called Sahara. Extract structured booking information from natural language requests in Hindi or English.

Return ONLY a valid JSON object with exactly these fields:
{
  "service_type": "maid" | "nurse" | "driver" | "cook" | "physiotherapist" | "repair",
  "date": "today" | "tomorrow" | "YYYY-MM-DD",
  "time": "morning" | "afternoon" | "evening" | "HH:MM",
  "duration_hours": number between 1 and 8,
  "special_requirements": string or null,
  "language_preference": "Hindi" | "English" | "Punjabi" | null,
  "urgency": "normal" | "urgent",
  "confidence": number between 0 and 1
}

Rules:
- service_type is required. Map these Hindi words:
  khaana/cook/chef → cook
  nurse/nursing → nurse
  driver/car/hospital → driver
  maid/safaai/cleaning → maid
  physiotherapy/exercise → physiotherapist
  repair/electrician/plumber → repair
- If date not mentioned, assume tomorrow
- If time not mentioned, assume morning
- If duration not mentioned, assume 2 hours
- confidence: how certain you are about service_type
- Never add explanation, only return the JSON object`
        },
        {
          role: 'user',
          content: request
        }
      ]
    });
    console.log("Success response:", completion.choices[0]?.message?.content);
  } catch (err) {
    console.error("Groq Call Failed. Details:", err);
  }
}

test();
