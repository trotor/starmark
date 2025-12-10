// OpenAI API wrapper

export class OpenAIClient {
  constructor(apiKey, model = 'gpt-4o-mini') {
    this.apiKey = apiKey;
    this.model = model;
    this.baseUrl = 'https://api.openai.com/v1';
  }

  setApiKey(apiKey) {
    this.apiKey = apiKey;
  }

  setModel(model) {
    this.model = model;
  }

  // Get current session token usage from storage
  async getTokenUsage() {
    try {
      const result = await chrome.storage.session.get('tokenUsage');
      return result.tokenUsage || { prompt: 0, completion: 0, total: 0 };
    } catch (error) {
      console.error('[Starmark] Failed to get token usage:', error);
      return { prompt: 0, completion: 0, total: 0 };
    }
  }

  // Reset session token counter
  async resetTokenUsage() {
    try {
      await chrome.storage.session.set({ tokenUsage: { prompt: 0, completion: 0, total: 0 } });
    } catch (error) {
      console.error('[Starmark] Failed to reset token usage:', error);
    }
  }

  // Add tokens to session total (stored in chrome.storage.session)
  async _addTokens(usage) {
    if (!usage) return;

    try {
      const current = await this.getTokenUsage();
      const updated = {
        prompt: current.prompt + (usage.prompt_tokens || 0),
        completion: current.completion + (usage.completion_tokens || 0),
        total: current.total + (usage.total_tokens || 0)
      };
      await chrome.storage.session.set({ tokenUsage: updated });
      console.log('[Starmark] Token usage updated:', updated);
    } catch (error) {
      console.error('[Starmark] Failed to update token usage:', error);
    }
  }

  async classifyBookmark(pageContent, categories) {
    if (!this.apiKey) {
      throw new Error('API key not configured');
    }

    const systemPrompt = `You are a bookmark classifier. Your job is to analyze web page content and suggest the most appropriate category/folder for the bookmark.

Available categories:
${categories.map(c => `- ${c}`).join('\n')}

Respond with a JSON object containing:
- "category": the best matching category from the list (must be exact match)
- "confidence": a number from 0 to 100 indicating how confident you are
- "reason": a brief explanation (max 50 words)

If none of the categories fit well, use the category that's closest and indicate low confidence.`;

    const userPrompt = `Classify this web page:

Title: ${pageContent.title}
URL: ${pageContent.url}
Description: ${pageContent.description || 'N/A'}
Keywords: ${pageContent.keywords || 'N/A'}
Headings: ${pageContent.headings?.join(', ') || 'N/A'}

Main content (excerpt):
${pageContent.mainContent || 'N/A'}

Respond with JSON only.`;

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.3,
          max_tokens: 200,
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      // Track token usage
      await this._addTokens(data.usage);

      if (!content) {
        throw new Error('Empty response from API');
      }

      const result = JSON.parse(content);

      // Validate response
      if (!result.category || typeof result.confidence !== 'number') {
        throw new Error('Invalid response format');
      }

      // Ensure category is from the list
      if (!categories.includes(result.category)) {
        // Find closest match
        const lowerCategory = result.category.toLowerCase();
        const match = categories.find(c =>
          c.toLowerCase() === lowerCategory ||
          c.toLowerCase().includes(lowerCategory) ||
          lowerCategory.includes(c.toLowerCase())
        );
        result.category = match || categories[0];
        result.confidence = Math.min(result.confidence, 50);
      }

      return {
        category: result.category,
        confidence: Math.min(100, Math.max(0, result.confidence)),
        reason: result.reason || '',
        tokens: data.usage
      };

    } catch (error) {
      console.error('[Starmark] OpenAI API error:', error);
      throw error;
    }
  }

  // Quick classify - URL and title only (faster, cheaper)
  async quickClassifyBookmark(pageContent, categories) {
    if (!this.apiKey) {
      throw new Error('API key not configured');
    }

    const systemPrompt = `You are a bookmark classifier. Classify bookmarks based ONLY on their URL and title.

Available categories:
${categories.map(c => `- ${c}`).join('\n')}

Respond with JSON: {"category": "exact category name", "confidence": 0-100, "reason": "brief reason"}

Tips for URL-based classification:
- Domain names often indicate category (github.com = code, docs.* = documentation)
- Path segments give hints (/blog/, /api/, /learn/)
- Be more conservative with confidence since you only have URL+title`;

    const userPrompt = `URL: ${pageContent.url}
Title: ${pageContent.title}

Classify this bookmark. JSON only.`;

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.2,
          max_tokens: 100,
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      // Track token usage
      await this._addTokens(data.usage);

      if (!content) {
        throw new Error('Empty response from API');
      }

      const result = JSON.parse(content);

      // Validate response
      if (!result.category || typeof result.confidence !== 'number') {
        throw new Error('Invalid response format');
      }

      // Ensure category is from the list
      if (!categories.includes(result.category)) {
        const lowerCategory = result.category.toLowerCase();
        const match = categories.find(c =>
          c.toLowerCase() === lowerCategory ||
          c.toLowerCase().includes(lowerCategory) ||
          lowerCategory.includes(c.toLowerCase())
        );
        result.category = match || categories[0];
        result.confidence = Math.min(result.confidence, 40);
      }

      return {
        category: result.category,
        confidence: Math.min(100, Math.max(0, result.confidence)),
        reason: result.reason || '',
        tokens: data.usage
      };

    } catch (error) {
      console.error('[Starmark] OpenAI Quick API error:', error);
      throw error;
    }
  }

  // Test API connection
  async testConnection() {
    if (!this.apiKey) {
      return { success: false, error: 'API key not configured' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (response.ok) {
        return { success: true };
      } else {
        const error = await response.json();
        return { success: false, error: error.error?.message || 'Connection failed' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
