/**
 * Interfaces & Types
 */
interface GiftSuggestion {
  title: string;
  category: string;
  price: string;
  effortReason: string;
  buyUrl: string;
  platform: string;
}

interface SubmissionData {
  code: string;
  date: string;
  recipientName: string;
  relationship: string;
  occasion: string;
  interests: string;
  avoid: string;
  maxBudget: number;
  userName: string;
  userContact: string;
  suggestions: GiftSuggestion[];
}

interface SheetResponse {
  status?: string;
  message?: string;
  code?: string;
  date?: string;
  recipientName?: string;
  relationship?: string;
  occasion?: string;
  maxBudget?: number;
  suggestions?: GiftSuggestion[] | string;
  [key: string]: unknown;
}

/**
 * Generates an alphanumeric reference code (e.g. GIFT-84920)
 */
function generateReferenceCode(): string {
  const num: number = Math.floor(10000 + Math.random() * 90000);
  return `GIFT-${num}`;
}

/**
 * Google Apps Script Web App URL
 */
const SHEET_WEB_APP_URL: string =
  'https://script.google.com/macros/s/AKfycbwJNzbWDL8m7og0RPTSFaBwqGCh9MFs2JaakLyhdYWWospnst8k7rs-Iod6qtdobNLe/exec';

/**
 * Form Submission Handler
 */
async function handleFormSubmission(event: SubmitEvent): Promise<void> {
  event.preventDefault();

  const code: string = generateReferenceCode();
  const interests: string = (document.getElementById('interests') as HTMLInputElement | null)?.value.trim() || '';
  const occasion: string = (document.getElementById('occasion') as HTMLSelectElement | HTMLInputElement | null)?.value || '';
  const relationship: string = (document.getElementById('relationship') as HTMLSelectElement | HTMLInputElement | null)?.value || '';
  const recipientName: string = (document.getElementById('recipient-name') as HTMLInputElement | null)?.value.trim() || '';
  const maxBudgetValue: string = (document.getElementById('max-budget') as HTMLInputElement | null)?.value || '';
  const maxBudget: number = parseFloat(maxBudgetValue) || 5000;
  const avoid: string = (document.getElementById('avoid') as HTMLInputElement | null)?.value.trim() || '';
  const userName: string = (document.getElementById('user-name') as HTMLInputElement | null)?.value.trim() || '';
  const userContact: string = (document.getElementById('user-contact') as HTMLInputElement | null)?.value.trim() || '';

  const suggestions: GiftSuggestion[] = generateUniqueSuggestions(interests, occasion, relationship, maxBudget, avoid);

  const submissionData: SubmissionData = {
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
    const response: Response = await fetch(SHEET_WEB_APP_URL, {
      method: 'POST',
      mode: 'cors',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8' // CORS preflight issue bypass karne ke liye
      },
      body: JSON.stringify({
        action: 'save',
        data: submissionData
      })
    });

    const result: SheetResponse = await response.json();

    if (!response.ok || (result.status && result.status !== 'success')) {
      throw new Error(result.message || 'Could not save');
    }

    window.location.href = `results.html?code=${code}`;
  } catch (error: unknown) {
    console.error('Save error:', error);
    alert('There was an error saving your gift data.');
  }
}

/**
 * Handles Lookup on index.html
 */
async function lookupCode(event: SubmitEvent): Promise<void> {
  event.preventDefault();

  const inputEl = document.getElementById('home-code-input') as HTMLInputElement | null;
  const code: string = inputEl?.value.trim().toUpperCase() || '';

  if (!code) {
    alert('Please enter a valid Form Reference Code.');
    return;
  }

  try {
    const response: Response = await fetch(`${SHEET_WEB_APP_URL}?code=${encodeURIComponent(code)}`, {
      method: 'GET',
      mode: 'cors',
      redirect: 'follow'
    });

    const data: SheetResponse = await response.json();

    if (data && data.code) {
      window.location.href = `results.html?code=${code}`;
    } else {
      alert(`Code "${code}" was not found. Please verify the code or start a new gift search.`);
    }
  } catch (error: unknown) {
    console.error('Sheet Lookup Error:', error);
    alert('Could not fetch data from Google Sheets.');
  }
}

/**
 * Intelligent Suggestion Rule Engine
 */
function generateUniqueSuggestions(
  interests: string,
  occasion: string,
  relationship: string,
  maxBudget: number,
  avoid: string
): GiftSuggestion[] {
  const halfBudget: number = Math.round(maxBudget * 0.5);
  const fullBudget: number = Math.round(maxBudget * 0.95);

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
async function initResultsPage(): Promise<void> {
  const params: URLSearchParams = new URLSearchParams(window.location.search);
  const code: string | null = params.get('code');

  const resultCodeEl = document.getElementById('result-code') as HTMLElement | null;
  const resultMetaEl = document.getElementById('result-meta') as HTMLElement | null;

  if (!code) {
    if (resultCodeEl) resultCodeEl.textContent = 'NO CODE PROVIDED';
    if (resultMetaEl) resultMetaEl.textContent = 'Please return to the home page or submit a new form.';
    return;
  }

  try {
    const response: Response = await fetch(`${SHEET_WEB_APP_URL}?code=${encodeURIComponent(code)}`, {
      method: 'GET',
      mode: 'cors',
      redirect: 'follow'
    });

    const data: SheetResponse = await response.json();

    if (!data || !data.code) {
      if (resultCodeEl) resultCodeEl.textContent = code;
      if (resultMetaEl) resultMetaEl.textContent = 'No data found for this code in Google Sheets.';
      return;
    }

    if (resultCodeEl) resultCodeEl.textContent = data.code;
    if (resultMetaEl) {
      resultMetaEl.textContent = `Occasion: ${data.occasion || ''} | For: ${data.recipientName || ''} (${data.relationship || ''}) | Budget Cap: ₹${data.maxBudget || ''} | Saved: ${data.date || ''}`;
    }

    const container = document.getElementById('cards-container') as HTMLElement | null;
    if (!container) return;

    container.innerHTML = '';

    let suggestions: GiftSuggestion[] = [];
    if (Array.isArray(data.suggestions)) {
      suggestions = data.suggestions as GiftSuggestion[];
    } else if (typeof data.suggestions === 'string') {
      try {
        suggestions = JSON.parse(data.suggestions) as GiftSuggestion[];
      } catch {
        suggestions = [];
      }
    }

    suggestions.forEach((item: GiftSuggestion) => {
      const card: HTMLDivElement = document.createElement('div');
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
  } catch (error: unknown) {
    console.error('Results Load Error:', error);
    if (resultCodeEl) resultCodeEl.textContent = code;
    if (resultMetaEl) resultMetaEl.textContent = 'Unable to load data from Google Sheets.';
  }
}

/**
 * Initialize event listeners
 */
document.addEventListener('DOMContentLoaded', (): void => {
  const form = document.getElementById('gift-search-form') as HTMLFormElement | null;
  if (form) {
    form.addEventListener('submit', (e: Event) => handleFormSubmission(e as SubmitEvent));
  }

  const lookupForm = document.getElementById('lookup-form') as HTMLFormElement | null;
  if (lookupForm) {
    lookupForm.addEventListener('submit', (e: Event) => lookupCode(e as SubmitEvent));
  }

  if (window.location.pathname.includes('results.html')) {
    initResultsPage();
  }
});