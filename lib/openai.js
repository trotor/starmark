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
        reason: result.reason || ''
      };

    } catch (error) {
      console.error('[Starmark] OpenAI API error:', error);
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
