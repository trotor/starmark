// OpenAI API wrapper

export class OpenAIClient {
  constructor(apiKey, model = 'gpt-4o-mini') {
    this.apiKey = apiKey;
    this.model = model;
    this.baseUrl = 'https://api.openai.com/v1';
    // Session token tracking
    this.sessionTokens = {
      prompt: 0,
      completion: 0,
      total: 0
    };
  }

  setApiKey(apiKey) {
    this.apiKey = apiKey;
  }

  setModel(model) {
    this.model = model;
  }

  // Get current session token usage
  getTokenUsage() {
    return { ...this.sessionTokens };
  }

  // Reset session token counter
  resetTokenUsage() {
    this.sessionTokens = { prompt: 0, completion: 0, total: 0 };
  }

  // Add tokens to session total
  _addTokens(usage) {
    if (usage) {
      this.sessionTokens.prompt += usage.prompt_tokens || 0;
      this.sessionTokens.completion += usage.completion_tokens || 0;
      this.sessionTokens.total += usage.total_tokens || 0;
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
      this._addTokens(data.usage);

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
      this._addTokens(data.usage);

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
