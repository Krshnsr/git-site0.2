/**
 * Generates an alphanumeric reference code (e.g. GIFT-84920)
 */
function generateReferenceCode() {
  const num = Math.floor(10000 + Math.random() * 90000);
  return `GIFT-${num}`;
}
const form = document.querySelector('#giftForm');
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby0hGx4xxNdSy5dYkOBRi2LACbQAR8TOMa5WY3Wtz2VUg-_pigl6dzzgH_zr2EMFezb/execL';

if (form) form.addEventListener('submit', function (e) {
  e.preventDefault(); // पेज को तुरंत रीलोड होने से रोकें

  const payload = {
    name: document.getElementById('name').value,
    email: document.getElementById('email').value,
    budget: document.getElementById('budget').value,
    occasion: document.getElementById('occasion').value,
    interests: document.getElementById('interests').value
  };

  // Google Apps Script को डेटा भेजने के लिए:
  fetch(SCRIPT_URL, {
    method: 'POST',
    mode: 'no-cors', // CORS ब्लॉक से बचने के लिए जरूरी
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
  .then(() => {
    alert('डेटा सफलतापूर्वक सेव हो गया!');
    form.reset();
  })
  .catch(error => {
    console.error('Error submitting form:', error);
  });
});

/**
 * Handles Form Submission on form.html
 */
async function handleFormSubmission(event) {
  event.preventDefault();

  const statusEl = document.getElementById('submission-status');
  const submitButton = event.currentTarget.querySelector('button[type="submit"]');

  const code = generateReferenceCode();
  const interests = document.getElementById('interests').value.trim();
  const occasion = document.getElementById('occasion').value;
  const relationship = document.getElementById('relationship').value;
  const recipientName = document.getElementById('recipient-name').value.trim();
  const maxBudget = parseFloat(document.getElementById('max-budget').value) || 5000;
  const avoid = document.getElementById('avoid').value.trim();
  const userName = document.getElementById('user-name').value.trim();
  const userContact = document.getElementById('user-contact').value.trim();

  // Curate 3 thoughtful suggestions matching inputs
  const suggestions = generateUniqueSuggestions(interests, occasion, relationship, maxBudget, avoid);

  const submissionData = {
    code: code,
    date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    recipientName: recipientName,
    relationship: relationship,
    occasion: occasion,
    interests: interests,
    avoid: avoid,
    maxBudget: maxBudget,
    userName: userName,
    userContact: userContact,
    suggestions: suggestions
  };

  // 1. Save to localStorage (Aapke local backup ke liye)
  localStorage.setItem(code, JSON.stringify(submissionData));

  // 2. Google Sheet par data bhejne ke liye Web App URL
  const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycby0hGx4xxNdSy5dYkOBRi2LACbQAR8TOMa5WY3Wtz2VUg-_pigl6dzzgH_zr2EMFezb/exec';

  // 3. Fetch API ke zariye Google Sheet Database mein POST request bhejna
  statusEl.textContent = 'Submitting your form...';
  statusEl.dataset.state = 'pending';
  submitButton.disabled = true;

  try {
    const response = await fetch(WEB_APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(submissionData)
    });
    const responseText = await response.text();
    let responseData;

    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = null;
    }

    if (!response.ok || responseData?.success === false || responseData?.status === 'error' || responseData?.error) {
      throw new Error(responseData?.message || responseData?.error || `Request failed (${response.status})`);
    }

    statusEl.textContent = 'Form successfully sent. Opening your results...';
    statusEl.dataset.state = 'success';
    window.location.href = `results.html?code=${code}&sheet=success`;
  } catch (error) {
    console.error('Sheet Error:', error);
    statusEl.textContent = `Could not send your form: ${error.message}. Please try again.`;
    statusEl.dataset.state = 'error';
    submitButton.disabled = false;
  }
}

/**
 * Handles Lookup on index.html
 */
function lookupCode(event) {
  event.preventDefault();
  const inputEl = document.getElementById('home-code-input');
  const code = inputEl.value.trim().toUpperCase();

  if (!code) {
    alert('Please enter a valid Form Reference Code.');
    return;
  }

  const existing = localStorage.getItem(code);
  if (existing) {
    window.location.href = `results.html?code=${code}`;
  } else {
    alert(`Code "${code}" was not found. Please verify the code or start a new gift search.`);
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
      title: "Hand-Bound Memory & Milestone Journal",
      category: "Personalized Keepsake",
      price: `₹${Math.round(maxBudget * 0.35)} - ₹${halfBudget}`,
      effortReason: `Customized with their name and pre-written notes about key shared memories. Avoids cliché store-bought frames and demonstrates hours of intentional preparation.`,
      buyUrl: "https://www.etsy.com/in-en/search?q=custom+leather+anniversary+journal",
      platform: "Etsy Artisanal Makers"
    },
    {
      title: "Exclusive Masterclass / Workshop Experience Pass",
      category: "Experiential Gift",
      price: `₹${halfBudget} - ₹${fullBudget}`,
      effortReason: `Tailored to their genuine interest in "${interests.slice(0, 35)}". Experiential gifts create lasting memories without accumulating physical clutter or unwanted items.`,
      buyUrl: `https://www.google.com/search?q=${encodeURIComponent(interests)}+workshop+experience+classes`,
      platform: "Local Craft Studios & Online Masterclasses"
    },
    {
      title: "Small-Batch Single-Estate Craft Discovery Crate",
      category: "Artisanal Consumable",
      price: `₹${Math.round(maxBudget * 0.3)} - ₹${Math.round(maxBudget * 0.6)}`,
      effortReason: `Hand-selected specialty gourmet or craft goods from regional independent makers. Consumable gifts are deeply enjoyed and avoid repeating items they already own (${avoid.slice(0, 30)}).`,
      buyUrl: "https://www.amazon.in/s?k=gourmet+artisan+gift+hamper",
      platform: "Curated Direct-to-Consumer Brands"
    }
  ];
}

/**
 * Initializes Results Page (results.html)
 */
function initResultsPage() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');

  if (!code) {
    document.getElementById('result-code').textContent = "NO CODE PROVIDED";
    document.getElementById('result-meta').textContent = "Please return to the home page or submit a new form.";
    return;
  }

  const storedData = localStorage.getItem(code);
  if (!storedData) {
    document.getElementById('result-code').textContent = code;
    document.getElementById('result-meta').textContent = "No data found for this code. It may have been cleared from this device.";
    return;
  }

  const data = JSON.parse(storedData);
  document.getElementById('result-code').textContent = data.code;
  document.getElementById('result-meta').textContent = 
    `Occasion: ${data.occasion} | For: ${data.recipientName} (${data.relationship}) | Budget Cap: ₹${data.maxBudget} \vert{} Saved:${data.date}`;

  if (params.get('sheet') === 'success') {
    const statusEl = document.getElementById('sheet-status');
    statusEl.textContent = 'Successfully sent to Google Sheets.';
    statusEl.dataset.state = 'success';
  }

  const container = document.getElementById('cards-container');
  container.innerHTML = '';

  data.suggestions.forEach(item => {
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
}

// Auto-run if on results.html
if (window.location.pathname.includes('results.html')) {
  window.addEventListener('DOMContentLoaded', initResultsPage);
}
