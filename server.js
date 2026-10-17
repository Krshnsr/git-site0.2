const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const express = require('express');
const { rateLimit } = require('express-rate-limit');

const envFiles = ['.env', 'main.env'].filter((file) => fs.existsSync(path.join(__dirname, file)));
if (envFiles.length > 0) {
  dotenv.config({ path: envFiles });
}

const app = express();
const port = Number(process.env.PORT) || 3000;
const webRoot = __dirname;
const geminiModel = 'gemini-2.5-flash';
const openAiModel = 'gpt-4o-mini';

app.disable('x-powered-by');
app.use(express.json({ limit: '10kb' }));

const publicFiles = ['app.js', 'form.html', 'index.html', 'results.html', 'shopg.jpg', 'style.css'];
app.get('/', (_request, response) => response.sendFile(path.join(webRoot, 'index.html')));
app.get(publicFiles.map((file) => `/${file}`), (request, response) => {
  response.sendFile(path.join(webRoot, path.basename(request.path)));
});

const recommendationLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again in a few minutes.' }
});

app.post('/api/recommendations', recommendationLimit, async (request, response) => {
  const provider = request.body?.provider || 'gemini';
  const providerSettings = new Map([
    ['gemini', {
      apiKey: process.env.GEMINI_API_KEY,
      keyName: 'GEMINI_API_KEY',
      label: 'Gemini'
    }],
    ['openai', {
      apiKey: process.env.OPENAI_API_KEY,
      keyName: 'OPENAI_API_KEY',
      label: 'OpenAI'
    }]
  ]).get(provider);

  if (!providerSettings) {
    return response.status(400).json({ error: 'Choose a supported AI provider.' });
  }

  const { apiKey } = providerSettings;
  if (!apiKey) {
    return response.status(503).json({ error: `Configure ${providerSettings.keyName} on the server to use this provider.` });
  }

  const { occasion, relationship, interests, avoid, maxBudget } = request.body || {};
  const textFields = [occasion, relationship, interests, avoid];
  if (
    textFields.some((value) => typeof value !== 'string' || value.trim().length === 0 || value.length > 500) ||
    typeof maxBudget !== 'number' ||
    !Number.isFinite(maxBudget) ||
    maxBudget < 100 ||
    maxBudget > 1000000
  ) {
    return response.status(400).json({ error: 'Enter valid gift preferences and a budget between ₹100 and ₹10,00,000.' });
  }

  const prompt = [
    'Suggest exactly five distinct gift ideas for the recipient described below.',
    `Occasion: ${occasion.trim()}`,
    `Relationship: ${relationship.trim()}`,
    `Interests: ${interests.trim()}`,
    `Avoid: ${avoid.trim()}`,
    `Maximum budget: ₹${maxBudget}. Every idea must fit within this budget.`,
    'Include a useful mix of personalized, practical, experience, hobby, consumable, subscription, or DIY gifts.',
    'Give realistic estimated INR price ranges, not claims of live prices or availability.',
    `For each idea provide title, category, minPrice and maxPrice as whole INR amounts from 0 to ${maxBudget}, effortReason explaining why it suits this recipient, and searchQuery for finding it online.`,
    'Return only JSON matching the provided schema.'
  ].join('\n');

  try {
    const geminiSchema = {
      type: 'OBJECT',
      properties: {
        suggestions: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              title: { type: 'STRING' },
              category: { type: 'STRING' },
              minPrice: { type: 'INTEGER' },
              maxPrice: { type: 'INTEGER' },
              effortReason: { type: 'STRING' },
              searchQuery: { type: 'STRING' }
            },
            required: ['title', 'category', 'minPrice', 'maxPrice', 'effortReason', 'searchQuery']
          }
        }
      },
      required: ['suggestions']
    };
    const openAiSchema = {
      type: 'object',
      properties: {
        suggestions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              category: { type: 'string' },
              minPrice: { type: 'integer' },
              maxPrice: { type: 'integer' },
              effortReason: { type: 'string' },
              searchQuery: { type: 'string' }
            },
            required: ['title', 'category', 'minPrice', 'maxPrice', 'effortReason', 'searchQuery'],
            additionalProperties: false
          }
        }
      },
      required: ['suggestions'],
      additionalProperties: false
    };

    const apiResponse = await fetch(
      provider === 'gemini'
        ? `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`
        : 'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: provider === 'gemini'
          ? { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }
          : { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(provider === 'gemini'
          ? {
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: 'application/json', responseSchema: geminiSchema }
            }
          : {
              model: openAiModel,
              messages: [{ role: 'user', content: prompt }],
              response_format: {
                type: 'json_schema',
                json_schema: { name: 'gift_recommendations', strict: true, schema: openAiSchema }
              }
            })
      }
    );

    if (!apiResponse.ok) {
      console.error(`${providerSettings.label} API returned HTTP ${apiResponse.status}.`);
      return response.status(502).json({ error: 'The AI recommendation service is unavailable. Please try again.' });
    }

    const apiData = await apiResponse.json();
    const generatedText = provider === 'gemini'
      ? apiData.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('')
      : apiData.choices?.[0]?.message?.content;
    if (!generatedText) {
      console.error(`${providerSettings.label} API returned no recommendation content.`);
      return response.status(502).json({ error: 'The AI could not generate recommendations. Please try again.' });
    }

    const generated = JSON.parse(generatedText);
    if (!Array.isArray(generated.suggestions) || generated.suggestions.length !== 5) {
      console.error(`${providerSettings.label} API returned an invalid number of suggestions.`);
      return response.status(502).json({ error: 'The AI returned an incomplete set of ideas. Please try again.' });
    }

    const suggestions = generated.suggestions.map((item) => {
      const fields = ['title', 'category', 'effortReason', 'searchQuery'];
      if (
        !item ||
        typeof item !== 'object' ||
        fields.some((field) => typeof item[field] !== 'string' || !item[field].trim()) ||
        !Number.isInteger(item.minPrice) ||
        !Number.isInteger(item.maxPrice) ||
        item.minPrice < 0 ||
        item.minPrice > item.maxPrice ||
        item.maxPrice > maxBudget
      ) {
        throw new Error(`${providerSettings.label} returned an invalid or out-of-budget recommendation.`);
      }

      const searchQuery = item.searchQuery.trim().slice(0, 200);
      return {
        title: item.title.trim().slice(0, 160),
        category: item.category.trim().slice(0, 80),
        price: `₹${item.minPrice.toLocaleString('en-IN')}–₹${item.maxPrice.toLocaleString('en-IN')}`,
        effortReason: item.effortReason.trim().slice(0, 500),
        buyUrl: `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(searchQuery)}`,
        platform: 'Google Shopping',
        generatedBy: providerSettings.label
      };
    });

    return response.json({ suggestions });
  } catch (error) {
    console.error(`${providerSettings.label} recommendation request failed:`, error);
    return response.status(502).json({ error: 'Could not generate recommendations. Please try again.' });
  }
});

app.listen(port, () => {
  console.log(`ThoughtfulGifts server listening on port ${port}.`);
});
