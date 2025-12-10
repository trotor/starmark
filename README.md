# Starmark

**AI-powered bookmark organizer for Chrome**

Starmark uses OpenAI to automatically categorize and organize your bookmarks. Stop manually sorting through hundreds of bookmarks - let AI do the heavy lifting while you stay in control.

---

## Why Starmark?

We all have that bookmark folder. The one with 500+ unsorted links from years of "I'll organize this later." Starmark helps you:

- **Classify new bookmarks automatically** as you save them
- **Review existing bookmarks** one by one with AI suggestions
- **Use your existing folder structure** - no need to change how you organize
- **Stay in control** - every suggestion requires your approval
- **Undo mistakes** - session-based undo for all changes

---

## Features

### Two Review Modes

| Mode | Speed | Accuracy | Best For |
|------|-------|----------|----------|
| **Quick Review** | Fast | Good | Known sites, bulk processing |
| **Deep Review** | Slower | Better | Unfamiliar pages, accuracy matters |

- **Quick Review**: Analyzes only URL and title. Fast and cheap.
- **Deep Review**: Fetches page content for better context. More accurate but slower.

### Smart Classification

- Uses your **existing bookmark folders** as categories
- Supports **custom categories** and **presets** (Developer, Researcher, Designer)
- Shows **confidence level** for each suggestion
- Provides **reasoning** for why a category was chosen

### Full Control

- **Review mode**: Approve each classification with Enter, skip with S
- **Undo support**: Revert individual changes or entire session
- **Token tracking**: See exactly how many API tokens you're using

---

## Installation (Developer Mode)

Since Starmark requires your own OpenAI API key, it's designed to run in developer mode:

### Step 1: Clone the Repository

```bash
git clone https://github.com/trotor/starmark.git
cd starmark
```

### Step 2: Load in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `starmark` folder you just cloned

### Step 3: Configure API Key

1. Click the Starmark icon in your toolbar
2. Click the **Settings** (gear icon) button
3. Enter your OpenAI API key
4. Choose your preferred model (GPT-4o Mini recommended for cost efficiency)

### Getting an OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Click **Create new secret key**
4. Copy the key and paste it into Starmark settings

---

## Usage

### Classify Current Page

1. Navigate to any webpage
2. Click the Starmark icon
3. Click **Classify Current Page**
4. Review the suggestion and folder
5. Click **Save to Folder** or **Cancel**

### Quick Review (Bulk Processing)

Best for processing many bookmarks quickly:

1. Click **Quick Review**
2. For each bookmark:
   - Press **Enter** to accept the suggestion
   - Press **S** to skip
   - Use the dropdown to change the folder
   - Press **Esc** to stop

### Deep Review (Full Analysis)

Best for accurate classification:

1. Click **Deep Review**
2. Starmark will fetch each page for better context
3. Review and approve as with Quick Review

### Keyboard Shortcuts (Review Mode)

| Key | Action |
|-----|--------|
| `Enter` | Accept suggestion |
| `S` | Skip bookmark |
| `Esc` | Stop review |

### Undo Changes

- **Undo Last**: Reverts the most recent change
- **Undo All**: Reverts all changes from this session
- Undo history clears when you close the browser

---

## Settings

### API Configuration

| Setting | Description |
|---------|-------------|
| **API Key** | Your OpenAI API key (required) |
| **Model** | GPT-4o Mini (fast, cheap) or GPT-4o (more accurate) |

### Classification Behavior

| Setting | Options | Default |
|---------|---------|---------|
| **Auto-classify** | On/Off | Off |
| **Multiple matches** | Best match / Ask / All folders | Best match |
| **Uncertain** | Leave in place / Uncategorized / Ask | Leave in place |
| **Confidence threshold** | 0-100% | 70% |

### Category Presets

- **Custom**: Uses your existing bookmark folders
- **Developer**: Documentation, Tools, APIs, GitHub, etc.
- **Researcher**: Papers, Data Sources, References, etc.
- **Designer**: Inspiration, UI Kits, Typography, etc.

---

## Cost Estimation

Starmark uses the OpenAI API, which charges per token. Here's a rough estimate:

| Mode | Tokens per Bookmark | Cost (GPT-4o Mini) |
|------|--------------------|--------------------|
| Quick Review | ~150-300 | ~$0.00015 |
| Deep Review | ~500-1500 | ~$0.0005 |

*Processing 1000 bookmarks with Quick Review costs approximately $0.15-0.30*

The token counter in the bottom-right corner shows your session usage.

---

## Privacy & Security

- **Your API key stays local**: Stored only in Chrome's local storage
- **No data collection**: Starmark doesn't send data anywhere except OpenAI
- **Open source**: Audit the code yourself
- **Page content**: Deep Review sends page excerpts to OpenAI for classification

---

## Project Structure

```
starmark/
├── manifest.json           # Chrome extension manifest (v3)
├── background/
│   └── service-worker.js   # API calls, bookmark operations
├── content/
│   └── content.js          # Page content extraction
├── lib/
│   └── openai.js           # OpenAI API wrapper with token tracking
├── options/
│   ├── options.html        # Settings page
│   ├── options.css
│   └── options.js
├── popup/
│   ├── popup.html          # Main popup UI
│   ├── popup.css
│   └── popup.js
└── icons/                  # Extension icons
```

---

## Roadmap

- [ ] Support for other LLM providers (Anthropic, local models)
- [ ] Firefox support
- [ ] Bookmark deduplication
- [ ] Batch export/import of categorization rules
- [ ] Better icons and visual design

---

## Contributing

Contributions are welcome! Feel free to:

- Report bugs or suggest features via [Issues](https://github.com/trotor/starmark/issues)
- Submit pull requests
- Share your feedback

---

## Contact

**Tero Rönkkö**
Email: tero.ronkko@gmail.com

Have questions, ideas, or suggestions? I'd love to hear from you!

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

*Built with the help of Claude Code*
