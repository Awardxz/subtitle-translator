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
 * Translate subtitles in batches with improved alignment
 * Compatible with srt-parser-2 format
 */
async function translateSubtitles(subs, batchSize = 25) {
  if (!Array.isArray(subs)) {
    throw new Error("subs must be an array of subtitle objects");
  }

  console.log(`Starting translation of ${subs.length} subtitles...`);
  const chunks = chunkArray(subs, batchSize);
  const allTranslated = [];

  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const chunk = chunks[chunkIndex];
    console.log(`\n📝 Translating batch ${chunkIndex + 1}/${chunks.length} (${chunk.length} entries)`);
    console.log(`   Range: ${chunk[0].id} - ${chunk[chunk.length - 1].id}`);

    // Create input with position markers for perfect alignment
    const inputTexts = chunk.map((item, index) => 
      `[${index}]${item.text}`
    ).join('\n|||SEPARATOR|||\n');

    let retryCount = 0;
    const maxRetries = 3;
    let success = false;

    while (!success && retryCount < maxRetries) {
      try {
        const response = await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: `You are a professional subtitle translator specializing in English to Albanian translation.

CRITICAL ALIGNMENT RULES - FOLLOW EXACTLY:
1. Input format: [0]text|||SEPARATOR|||[1]text|||SEPARATOR|||[2]text
2. Output format: [0]translation|||SEPARATOR|||[1]translation|||SEPARATOR|||[2]translation
3. Translate ONLY the text after each [number] marker
4. Keep the EXACT same [number] markers and |||SEPARATOR||| structure
5. Each translation must be under 84 characters (2 lines max, 42 chars per line)
6. Maintain natural Albanian flow and grammar
7. DO NOT add, remove, or reorder any entries
8. If input has 5 entries [0] through [4], output must have exactly 5 entries [0] through [4]

TRANSLATION QUALITY:
- Use natural Albanian expressions
- Maintain the tone and context of the original
- Keep proper punctuation and capitalization
- For names and places, use Albanian conventions when appropriate

RETURN ONLY THE TRANSLATED TEXT WITH MARKERS AND SEPARATORS. NO EXPLANATIONS.`,
            },
            {
              role: "user",
              content: inputTexts,
            },
          ],
          model: "openai/gpt-oss-120b",
          temperature: 0.1,
          max_tokens: 4000,
        });

        const translatedContent = response.choices[0].message.content.trim();
        const translatedSections = translatedContent.split('|||SEPARATOR|||').map(s => s.trim());

        // Validate we got the right number of translations
        if (translatedSections.length !== chunk.length) {
          throw new Error(`Alignment error: Expected ${chunk.length} translations, got ${translatedSections.length}`);
        }

        // Process translations by exact index position
        for (let i = 0; i < chunk.length; i++) {
          const originalItem = chunk[i];
          let translation = translatedSections[i];

          // Extract translation text (remove bracket marker)
          const bracketMatch = translation.match(/^\[\d+\](.+)$/s);
          if (bracketMatch) {
            translation = bracketMatch[1].trim();
          } else {
            // If no bracket found, use the whole string but log warning
            console.warn(`⚠️  No bracket marker found for item ${i}, using raw translation`);
            translation = translation.trim();
          }

          // Validate translation exists and isn't empty
          if (!translation || translation.length === 0) {
            console.warn(`⚠️  Empty translation for subtitle ${originalItem.id}, keeping original`);
            translation = originalItem.text;
          }

          // Validate character limit with truncation
          if (translation.length > 84) {
            console.warn(`⚠️  Translation too long for subtitle ${originalItem.id} (${translation.length} chars), truncating`);
            // Smart truncation - try to break at word boundary
            if (translation.length > 81) {
              const truncated = translation.substring(0, 81);
              const lastSpace = truncated.lastIndexOf(' ');
              translation = (lastSpace > 60) ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
            }
          }

          // Create translated subtitle object maintaining srt-parser-2 format
          allTranslated.push({
            id: originalItem.id,
            startTime: originalItem.startTime,
            startSeconds: originalItem.startSeconds,
            endTime: originalItem.endTime,
            endSeconds: originalItem.endSeconds,
            text: translation
          });
        }

        success = true;
        console.log(`✅ Batch ${chunkIndex + 1} completed successfully`);

      } catch (error) {
        retryCount++;
        console.error(`❌ Error translating batch ${chunkIndex + 1} (attempt ${retryCount}):`, error.message);
        
        if (retryCount >= maxRetries) {
          console.warn(`🔄 Failed to translate batch ${chunkIndex + 1} after ${maxRetries} attempts, keeping original text`);
          // Fallback: keep original subtitles with proper format
          chunk.forEach(item => {
            allTranslated.push({
              id: item.id,
              startTime: item.startTime,
              startSeconds: item.startSeconds,
              endTime: item.endTime,
              endSeconds: item.endSeconds,
              text: item.text
            });
          });
          success = true;
        } else {
          console.log(`🔄 Retrying batch ${chunkIndex + 1} in 5 seconds...`);
          await sleep(5000);
        }
      }
    }

    // Progress update
    const progressPercent = Math.round(((chunkIndex + 1) / chunks.length) * 100);
    console.log(`📊 Progress: ${progressPercent}% (${allTranslated.length}/${subs.length} subtitles)`);

    // Wait between batches (except for the last batch)
    if (chunkIndex < chunks.length - 1) {
      console.log("⏳ Waiting 12 seconds before next batch...");
      await sleep(12000);
    }
  }

  // Final validation and sorting
  console.log(`\n🎯 Translation Summary:`);
  console.log(`   Original subtitles: ${subs.length}`);
  console.log(`   Translated subtitles: ${allTranslated.length}`);
  
  if (allTranslated.length !== subs.length) {
    console.error(`🚨 CRITICAL ERROR: Subtitle count mismatch!`);
    console.error(`   Expected: ${subs.length}, Got: ${allTranslated.length}`);
    throw new Error("Subtitle alignment failed - count mismatch detected");
  }

  // Sort by ID to ensure proper chronological order
  allTranslated.sort((a, b) => parseInt(a.id) - parseInt(b.id));

  // Verify sequential IDs
  for (let i = 0; i < allTranslated.length; i++) {
    if (parseInt(allTranslated[i].id) !== i + 1) {
      console.error(`🚨 ID sequence error at position ${i}: expected ${i + 1}, got ${allTranslated[i].id}`);
    }
  }

  console.log(`✅ Translation completed successfully!`);
  return allTranslated;
}

module.exports = { translateSubtitles };