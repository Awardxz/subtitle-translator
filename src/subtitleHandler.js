const fs = require('fs').promises;
const srtParser = require('srt-parser-2'); // goated - subtitles package wasn't working
const parser = new srtParser.default();

async function readSubtitles(path) {
    console.log("Reading Subtitle:", path);
    try {
        let content = await fs.readFile(path, 'utf-8');
        content = content.replace(/^\uFEFF/, ''); // remove BOM
        const subs = parser.fromSrt(content); // returns array
        console.log("Parsed subtitle lines:", subs.length);
        return subs;
    } catch (err) {
        console.error("Error reading subtitles:", err);
        throw err;
    }
}

async function writeSubtitles(path, subs) {
    const content = parser.toSrt(subs);
    await fs.writeFile(path, content, 'utf-8');
}

module.exports = { readSubtitles, writeSubtitles };
