const { readSubtitles, writeSubtitles } = require("./subtitleHandler");
const { getGroqChatCompletion, translateSubtitles } = require("./translator");
const path = require('path')

// Awardxz 

async function main() {

    
    const engPath = path.join(__dirname, 'subtitles', 'missionENG.srt')
    console.log(`English subtitles path: ${engPath}`)
    const outputPath = path.join(__dirname, 'subtitles', 'output', 'missionALB.srt')

    console.log("Reading English Subtitles...")
    const subs = await readSubtitles(engPath)
 
    console.log("Translating Subtitles...")
    const translatedSubs = await translateSubtitles(subs)

    console.log('Writing Translated .srt file...');
    await writeSubtitles(outputPath, translatedSubs);

    console.log('Done! Review The Translated Subtitle in Subtitles - > Output');


}

main()