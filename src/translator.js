require("dotenv").config();
const Groq = require("groq-sdk");
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * Helper to split an array into chunks
 */
function chunkArray(array, chunkSize) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Helper to wait for a specified number of milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Translate subtitles in batches to avoid token limit errors
 */
async function translateSubtitles(subs, batchSize = 50) { // Reduced batch size for better control
  if (!Array.isArray(subs)) {
    throw new Error("subs must be an array of subtitle objects");
  }

  const chunks = chunkArray(subs, batchSize);
  const allTranslated = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`Translating batch ${i + 1}/${chunks.length} (${chunk.length} entries)`);

    // Create numbered input for better control
    const numberedLines = chunk.map((item, index) => `${index + 1}. ${item.text}`).join("\n");

    try {
      const response = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `STRICT TRANSLATION RULES - FOLLOW EXACTLY:

1. You are translating numbered English subtitle entries to Albanian
2. Each numbered entry (1., 2., 3., etc.) represents ONE complete subtitle that must stay together
3. MAINTAIN the exact same numbering in your response
4. DO NOT split any numbered entry into multiple parts
5. Keep each translation under 84 characters total (2 lines max of 42 chars each)
6. If a subtitle has multiple sentences, keep them in the SAME numbered entry
7. Return format: "1. [Albanian translation]" then newline "2. [Albanian translation]" etc.
8. NO explanations, NO extra text, NO introductions
9. Start immediately with "1. [translation]"
10. PRESERVE THE EXACT NUMBER OF ENTRIES

CRITICAL: If you receive 5 numbered entries, return exactly 5 numbered entries.
DO NOT CREATE EXTRA NUMBERS OR SPLIT ENTRIES.`,
          },
          {
            role: "user",
            content: numberedLines,
          },
        ],
        model: "openai/gpt-oss-120b",
        temperature: 0.1,
      });

      const translatedContent = response.choices[0].message.content.trim();
      const translatedLines = translatedContent.split("\n");

      // Parse the numbered responses and match them back to original subtitles
      chunk.forEach((item, index) => {
        const expectedNumber = index + 1;
        const translatedLine = translatedLines.find(line => 
          line.trim().startsWith(`${expectedNumber}.`)
        );
        
        if (translatedLine) {
          // Remove the number and period, keep the translation
          const translation = translatedLine.replace(/^\d+\.\s*/, "").trim();
          allTranslated.push({
            ...item,
            text: translation || item.text, // Fallback to original if translation fails
          });
        } else {
          // Fallback: keep original text if no matching numbered translation found
          console.warn(`Warning: No translation found for entry ${expectedNumber}, keeping original`);
          allTranslated.push({
            ...item,
            text: item.text,
          });
        }
      });

      // Wait 20 seconds before processing the next batch (except for the last batch)
      if (i < chunks.length - 1) {
        console.log("Waiting 20 seconds before next batch...");
        await sleep(20000);
      }

    } catch (error) {
      console.error(`Error translating batch ${i + 1}:`, error);
      // Fallback: add original subtitles if translation fails
      chunk.forEach(item => {
        allTranslated.push(item);
      });
    }
  }

  console.log(`Translation complete! Processed ${allTranslated.length} subtitle entries.`);
  return allTranslated;
}

module.exports = { translateSubtitles };