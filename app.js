"use strict";
/**
 * Generates an alphanumeric reference code (e.g. GIFT-84920)
 */
function generateReferenceCode() {
    const num = Math.floor(10000 + Math.random() * 90000);
    return `GIFT-${num}`;
}
/**
 * Google Apps Script Web App URL
 */
const SHEET_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwJNzbWDL8m7og0RPTSFaBwqGCh9MFs2JaakLyhdYWWospnst8k7rs-Iod6qtdobNLe/exec';
/**
 * Form Submission Handler (Double-Submit Protection के साथ)
 */
async function handleFormSubmission(event) {
    event.preventDefault();
    // सबमिट बटन को तुरंत लॉक करें ताकि डबल क्लिक से दो बार डेटा न जाए
    const formEl = event.target;
    const submitBtn = formEl?.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.innerText : 'Submit';
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = 'Saving... Please wait';
    }
    const code = generateReferenceCode();
    const interests = document.getElementById('interests')?.value.trim() || '';
    const occasion = document.getElementById('occasion')?.value || '';
    const relationship = document.getElementById('relationship')?.value || '';
    const recipientName = document.getElementById('recipient-name')?.value.trim() || '';
    const maxBudgetValue = document.getElementById('max-budget')?.value || '';
    const maxBudget = parseFloat(maxBudgetValue) || 5000;
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
            mode: 'cors',
            redirect: 'follow',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8'
            },
            body: JSON.stringify({
                action: 'save',
                data: submissionData
            })
        });
        const result = await response.json();
        if (!response.ok || (result.status && result.status !== 'success')) {
            throw new Error(result.message || 'Could not save');
        }
        window.location.href = `results.html?code=${code}`;
    }
    catch (error) {
        console.error('Save error:', error);
        alert('There was an error saving your gift data. Please try again.');
        // अगर कोई एरर आए तो बटन को वापस अनलॉक कर दें
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = originalBtnText;
        }
    }
}
/**
 * Handles Lookup on index.html (result.record सपोर्ट के साथ)
 */
async function lookupCode(event) {
    event.preventDefault();
    const inputEl = document.getElementById('home-code-input');
    const code = inputEl?.value.trim().toUpperCase() || '';
    if (!code) {
        alert('Please enter a valid Form Reference Code.');
        return;
    }
    const formEl = event.target;
    const submitBtn = formEl?.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.innerText : 'Search';
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = 'Searching...';
    }
    try {
        const response = await fetch(`${SHEET_WEB_APP_URL}?code=${encodeURIComponent(code)}`, {
            method: 'GET',
            mode: 'cors',
            redirect: 'follow'
        });
        const result = await response.json();
        const record = result.record || (result.code ? result : undefined);
        if (result.status === 'success' && record && record.code) {
            window.location.href = `results.html?code=${encodeURIComponent(record.code)}`;
        }
        else {
            alert(`Code "${code}" was not found. Please verify the code or start a new gift search.`);
        }
    }
    catch (error) {
        console.error('Sheet Lookup Error:', error);
        alert('Could not fetch data from Google Sheets.');
    }
    finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = originalBtnText;
        }
    }
}
/**
 * Intelligent Suggestion Rule Engine
 */
function generateUniqueSuggestions(interests, occasion, _relationship, maxBudget, avoid) {
    const halfBudget = Math.round(maxBudget * 0.5);
    const fullBudget = Math.round(maxBudget * 0.95);
    const cleanInterest = interests || 'creative arts';
    const cleanOccasion = occasion ? occasion.toLowerCase() : 'special occasion';
    const cleanAvoid = avoid ? avoid.slice(0, 30) : 'generic items';
    return [
        {
            title: 'Hand-Bound Memory & Milestone Journal',
            category: 'Personalized Keepsake',
            price: `₹${Math.round(maxBudget * 0.35)} - ₹${halfBudget}`,
            effortReason: `Customized with their name and key memories connected to ${cleanOccasion}. It avoids generic store-bought items and feels thoughtful and personal.`,
            buyUrl: 'https://www.etsy.com/in-en/search?q=custom+leather+anniversary+journal',
            platform: 'Etsy Artisanal Makers'
        },
        {
            title: 'Exclusive Masterclass / Workshop Experience Pass',
            category: 'Experiential Gift',
            price: `₹${halfBudget} - ₹${fullBudget}`,
            effortReason: `Tailored to their genuine interest in "${cleanInterest.slice(0, 35)}". Experiential gifts create lasting memories without adding more clutter.`,
            buyUrl: `https://www.google.com/search?q=${encodeURIComponent(cleanInterest)}+workshop+experience+classes`,
            platform: 'Local Craft Studios & Online Masterclasses'
        },
        {
            title: 'Small-Batch Single-Estate Craft Discovery Crate',
            category: 'Artisanal Consumable',
            price: `₹${Math.round(maxBudget * 0.3)} - ₹${Math.round(maxBudget * 0.6)}`,
            effortReason: `Hand-selected specialty gourmet or craft goods from independent makers. It avoids common items they already own and feels considered rather than random (strictly avoiding: ${cleanAvoid}).`,
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
    const resultCodeEl = document.getElementById('result-code');
    const resultMetaEl = document.getElementById('result-meta');
    if (!code) {
        if (resultCodeEl)
            resultCodeEl.textContent = 'NO CODE PROVIDED';
        if (resultMetaEl)
            resultMetaEl.textContent = 'Please return to the home page or submit a new form.';
        return;
    }
    if (resultCodeEl)
        resultCodeEl.textContent = code;
    if (resultMetaEl)
        resultMetaEl.textContent = 'Loading your personalized gift suggestions...';
    try {
        const response = await fetch(`${SHEET_WEB_APP_URL}?code=${encodeURIComponent(code)}`, {
            method: 'GET',
            mode: 'cors',
            redirect: 'follow'
        });
        const result = await response.json();
        // Google Sheet के doGet से डेटा result.record के अंदर आता है
        const record = result.record || (result.code ? result : undefined);
        if (result.status !== 'success' || !record || !record.code) {
            if (resultCodeEl)
                resultCodeEl.textContent = code;
            if (resultMetaEl)
                resultMetaEl.textContent = 'No data found for this code in Google Sheets.';
            return;
        }
        // यदि तारीख लंबी ISO स्ट्रिंग बन गई हो तो उसे साफ दिखाएं
        let displayDate = String(record.date || '');
        if (displayDate.includes('T')) {
            const parsedDate = new Date(displayDate);
            if (!isNaN(parsedDate.getTime())) {
                displayDate = parsedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
            }
        }
        if (resultCodeEl)
            resultCodeEl.textContent = String(record.code);
        if (resultMetaEl) {
            resultMetaEl.textContent = `Occasion: ${record.occasion || 'N/A'} | For: ${record.recipientName || 'Recipient'} (${record.relationship || 'Special'}) | Budget Cap: ₹${record.maxBudget || ''} | Saved: ${displayDate}`;
        }
        const container = document.getElementById('cards-container');
        if (!container)
            return;
        container.innerHTML = '';
        let suggestions = [];
        if (Array.isArray(record.suggestions)) {
            suggestions = record.suggestions;
        }
        else if (typeof record.suggestions === 'string') {
            try {
                suggestions = JSON.parse(record.suggestions);
            }
            catch {
                suggestions = [];
            }
        }
        if (suggestions.length === 0) {
            container.innerHTML = '<p>No specific suggestions found for this entry.</p>';
            return;
        }
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
    }
    catch (error) {
        console.error('Results Load Error:', error);
        if (resultCodeEl)
            resultCodeEl.textContent = code;
        if (resultMetaEl)
            resultMetaEl.textContent = 'Unable to load data from Google Sheets.';
    }
}
/**
 * Initialize event listeners
 */
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('gift-search-form');
    if (form) {
        form.addEventListener('submit', (e) => handleFormSubmission(e));
    }
    const lookupForm = document.getElementById('lookup-form');
    if (lookupForm) {
        lookupForm.addEventListener('submit', (e) => lookupCode(e));
    }
    if (window.location.pathname.includes('results.html')) {
        initResultsPage();
    }
});