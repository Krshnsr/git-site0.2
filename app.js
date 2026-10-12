/**
 * Generates an alphanumeric reference code (e.g. GIFT-84920)
 */
function generateReferenceCode() {
  const num = Math.floor(10000 + Math.random() * 90000);
  return `GIFT-${num}`;
}

/**
 * Google Apps Script Web App URL
 * Replace this with your deployed Apps Script URL
 */
const SHEET_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwJNzbWDL8m7og0RPTSFaBwqGCh9MFs2JaakLyhdYWWospnst8k7rs-Iod6qtdobNLe/exec';

async function handleFormSubmission(event) {
  event.preventDefault();

  const code = generateReferenceCode();
  const interests = document.getElementById('interests')?.value.trim() || '';
  const occasion = document.getElementById('occasion')?.value || '';
  const relationship = document.getElementById('relationship')?.value || '';
  const recipientName = document.getElementById('recipient-name')?.value.trim() || '';
  const maxBudget = parseFloat(document.getElementById('max-budget')?.value) || 5000;
  const avoid = document.getElementById('avoid')?.value.trim() || '';
  const userName = document.getElementById('user-name')?.value.trim() || '';
  const userContact = document.getElementById('user-contact')?.value.trim() || '';

  const suggestions = generateUniqueSuggestions(interests, occasion, relationship, maxBudget, avoid);

  const submissionData = {
    code,
    date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    recipientName,
    relationship,
    occasion,
    interests,
    avoid,
    maxBudget,
    userName,
    userContact,
    suggestions
  };

  try {
    const response = await fetch(SHEET_WEB_APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'save',
        data: submissionData
      })
    });

    const result = await response.json();

    if (!response.ok || result.status !== 'success') {
      throw new Error(result.message || 'Could not save');
    }

    window.location.href = `results.html?code=${code}`;
  } catch (error) {
    console.error('Save error:', error);
    alert('There was an error saving your gift data.');
  }
}

/**
 * Handles Lookup on index.html
 */

async function lookupCode(event) {
  event.preventDefault();

  const inputEl = document.getElementById('home-code-input');
  const code = inputEl?.value.trim().toUpperCase() || '';

  if (!code) {
    alert('Please enter a valid Form Reference Code.');
    return;
  }

  try {
    const response = await fetch(`${SHEET_WEB_APP_URL}?code=${encodeURIComponent(code)}`);
    const data = await response.json();

    if (data && data.code) {
      window.location.href = `results.html?code=${code}`;
    } else {
      alert(`Code "${code}" was not found. Please verify the code or start a new gift search.`);
    }
  } catch (error) {
    console.error('Sheet Lookup Error:', error);
    alert('Could not fetch data from Google Sheets.');
  }
}

/**
 * Intelligent Suggestion Rule Engine
 */
function generateUniqueSuggestions(interests, occasion, relationship, maxBudget, avoid) {
  const halfBudget = Math.round(maxBudget * 0.5);
  const fullBudget = Math.round(maxBudget * 0.95);

  return [
    {
      title: 'Hand-Bound Memory & Milestone Journal',
      category: 'Personalized Keepsake',
      price: `₹${Math.round(maxBudget * 0.35)} - ₹${halfBudget}`,
      effortReason: `Customized with their name and key memories connected to ${occasion.toLowerCase()}. It avoids generic store-bought items and feels thoughtful and personal.`,
      buyUrl: 'https://www.etsy.com/in-en/search?q=custom+leather+anniversary+journal',
      platform: 'Etsy Artisanal Makers'
    },
    {
      title: 'Exclusive Masterclass / Workshop Experience Pass',
      category: 'Experiential Gift',
      price: `₹${halfBudget} - ₹${fullBudget}`,
      effortReason: `Tailored to their genuine interest in "${interests.slice(0, 35)}". Experiential gifts create lasting memories without adding more clutter.`,
      buyUrl: `https://www.google.com/search?q=${encodeURIComponent(interests)}+workshop+experience+classes`,
      platform: 'Local Craft Studios & Online Masterclasses'
    },
    {
      title: 'Small-Batch Single-Estate Craft Discovery Crate',
      category: 'Artisanal Consumable',
      price: `₹${Math.round(maxBudget * 0.3)} - ₹${Math.round(maxBudget * 0.6)}`,
      effortReason: `Hand-selected specialty gourmet or craft goods from independent makers. It avoids common items they already own and feels considered rather than random (${avoid.slice(0, 30)}).`,
      buyUrl: 'https://www.amazon.in/s?k=gourmet+artisan+gift+hamper',
      platform: 'Curated Direct-to-Consumer Brands'
    }
  ];
}

/**
 * Initializes Results Page (results.html)
 */
async function initResultsPage() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');

  if (!code) {
    document.getElementById('result-code').textContent = 'NO CODE PROVIDED';
    document.getElementById('result-meta').textContent = 'Please return to the home page or submit a new form.';
    return;
  }

  try {
    const response = await fetch(`${WEB_APP_URL}?code=${encodeURIComponent(code)}`);
    const data = await response.json();

    if (!data || !data.code) {
      document.getElementById('result-code').textContent = code;
      document.getElementById('result-meta').textContent = 'No data found for this code in Google Sheets.';
      return;
    }

    document.getElementById('result-code').textContent = data.code;
    document.getElementById('result-meta').textContent =
      `Occasion: ${data.occasion} | For: ${data.recipientName} (${data.relationship}) | Budget Cap: ₹${data.maxBudget} | Saved: ${data.date}`;

    const container = document.getElementById('cards-container');
    if (!container) return;

    container.innerHTML = '';

    const suggestions = Array.isArray(data.suggestions)
      ? data.suggestions
      : JSON.parse(data.suggestions || '[]');

    suggestions.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'gift-card';

      card.innerHTML = `
        <div class="gift-header">
          <div>
            <span class="gift-category">${item.category}</span>
            <div class="gift-title">${item.title}</div>
          </div>
          <div class="gift-price">${item.price}</div>
        </div>
        <div class="thoughtful-highlight">
          <strong>Why it shows extra effort:</strong> ${item.effortReason}
        </div>
        <div class="buy-action">
          <a href="${item.buyUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-outline" style="font-size: 0.85rem; padding: 0.5rem 1rem;">
            View & Buy on ${item.platform} &rarr;
          </a>
        </div>
      `;

      container.appendChild(card);
    });

  } catch (error) {
    console.error('Results Load Error:', error);
    document.getElementById('result-code').textContent = code;
    document.getElementById('result-meta').textContent = 'Unable to load data from Google Sheets.';
  }
}

/**
 * Initialize event listeners
 */
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('gift-search-form');
  if (form) {
    form.addEventListener('submit', handleFormSubmission);
  }

  const lookupForm = document.getElementById('lookup-form');
  if (lookupForm) {
    lookupForm.addEventListener('submit', lookupCode);
  }

  if (window.location.pathname.includes('results.html')) {
    initResultsPage();
  }
});