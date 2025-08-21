# Subtitle Translator

A Node.js tool that automatically translates subtitle files (.srt) using AI-powered translation via Groq API.

## Features

- 📁 Read and parse SRT subtitle files
- 🤖 AI-powered translation using Groq API
- 📝 Preserve subtitle timing and formatting
- 🌍 Translate between different languages
- 📂 Organized output structure
- ⚡ Smart batching system to avoid API rate limits
- 🔄 Efficient processing of large subtitle files

## Prerequisites

- Node.js (v14 or higher)
- Groq API key

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/subtitle-translator.git
cd subtitle-translator
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory and add your Groq API key:
```
GROQ_API_KEY=your_groq_api_key_here
```

## Usage

1. Place your English subtitle file (.srt) in the `src/subtitles/` directory
2. Update the file path in `src/index.js` if needed:
```javascript
const engPath = path.join(__dirname, 'subtitles', 'your-subtitle-file.srt')
```
3. Run the translator:
```bash
node src/index.js
```
4. Find your translated subtitle file in `src/subtitles/output/`

## Project Structure

```
subtitle-translator/
├── src/
│   ├── index.js              # Main application entry point
│   ├── subtitleHandler.js    # SRT file reading/writing functions
│   ├── translator.js         # AI translation logic with batching
│   └── subtitles/
│       ├── output/           # Translated subtitle files
│       └── *.srt            # Source subtitle files
├── .env                      # Environment variables (API keys)
├── .gitignore
└── README.md
```

## How It Works

1. **Read**: Parses the source SRT file and extracts subtitle entries
2. **Batch**: Groups subtitle entries into optimally-sized batches to respect API rate limits
3. **Translate**: Uses Groq's AI API to translate batched subtitle text while preserving timing
4. **Write**: Outputs the translated subtitles in proper SRT format

## Rate Limiting & Batching

The tool uses intelligent batching to handle API rate limits:
- Subtitles are processed in batches rather than individually
- Reduces API calls and improves translation consistency
- Handles large subtitle files efficiently without hitting rate limits
- Maintains subtitle timing and sequence integrity

## Configuration

You can modify the translation target language by updating the translation prompt in `src/translator.js`.

## Dependencies

- `groq-sdk` - For AI-powered translation
- `path` - For file path handling
- `fs` - For file system operations

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Groq](https://groq.com/) for providing the AI translation API
- OpenSubtitles community