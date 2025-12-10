# Starmark

AI-powered Chrome extension that automatically categorizes your bookmarks using OpenAI.

## Features

- **Auto-classify**: Automatically categorize new bookmarks as you save them
- **Bulk review**: Review and classify existing bookmarks one by one
- **Smart suggestions**: AI analyzes page content to suggest the best folder
- **Undo support**: Session-based undo for all classification actions
- **Customizable categories**: Use presets or define your own folder structure

## Installation

1. Clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the `starmark` folder
5. Click the extension icon and go to Settings to add your OpenAI API key

## Configuration

### API Key
You need an OpenAI API key to use this extension. Get one at https://platform.openai.com/api-keys

### Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Auto-classify new bookmarks | Off | Automatically classify when you add a bookmark |
| Multi-category handling | Best match | What to do when multiple folders match |
| Uncertain classification | Leave in place | What to do when AI isn't confident |

## Usage

### Classify Current Page
1. Navigate to any page
2. Click the Starmark icon
3. Click "Classify This Page" to get a folder suggestion

### Bulk Review
1. Click the Starmark icon
2. Click "Review All Bookmarks"
3. For each bookmark:
   - Press **Enter** to accept the suggestion
   - Use **dropdown** to change folder
   - Press **S** to skip
   - Press **Esc** to stop

### Undo
- Click "Undo Last" to revert the most recent classification
- Click "Undo All" to revert all classifications from this session

## Development

This is a Chrome Manifest V3 extension.

```
starmark/
├── manifest.json          # Extension manifest
├── popup/                 # Popup UI
├── options/               # Settings page
├── background/            # Service worker
├── content/               # Content script
├── lib/                   # Shared utilities
└── icons/                 # Extension icons
```

## License

MIT
