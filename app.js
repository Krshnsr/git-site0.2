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
    const aiProvider = document.getElementById('ai-provider')?.value || 'gemini';
    const recipientName = document.getElementById('recipient-name')?.value.trim() || '';
    const maxBudgetValue = document.getElementById('max-budget')?.value || '';
    const maxBudget = parseFloat(maxBudgetValue) || 5000;
    const avoid = document.getElementById('avoid')?.value.trim() || '';
    const userName = document.getElementById('user-name')?.value.trim() || '';
    const userContact = document.getElementById('user-contact')?.value.trim() || '';
    try {
        const aiResponse = await fetch('/api/recommendations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider: aiProvider, occasion, relationship, interests, avoid, maxBudget })
        });
        const aiResult = await aiResponse.json();
        if (!aiResponse.ok || !Array.isArray(aiResult.suggestions)) {
            throw new Error(aiResult.error || 'Could not generate AI gift ideas.');
        }
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
            aiProvider,
            suggestions: aiResult.suggestions
        };
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
        alert(error instanceof Error ? error.message : 'There was an error generating or saving your gift ideas.');
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
                container.textContent = 'Saved gift ideas could not be read. Please create a new search.';
                return;
            }
        }
        if (!Array.isArray(suggestions) || suggestions.length === 0) {
            container.textContent = 'No specific suggestions found for this entry.';
            return;
        }
        const categories = [...new Set(suggestions
                .map((item) => typeof item?.category === 'string' ? item.category.trim() : '')
                .filter(Boolean))];
        const aiProvider = suggestions.find((item) => typeof item?.generatedBy === 'string')?.generatedBy;
        const heading = document.getElementById('results-heading');
        if (heading) {
            heading.textContent = aiProvider ? `${aiProvider}-generated gift ideas` : 'Personalized gift ideas';
        }
        const filters = document.getElementById('category-filters');
        if (filters && categories.length > 0) {
            filters.hidden = false;
            const addFilter = (label, selectedCategory) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'btn btn-outline result-filter';
                button.textContent = label;
                button.setAttribute('aria-pressed', String(selectedCategory === null));
                if (selectedCategory === null) {
                    button.classList.add('is-active');
                }
                button.addEventListener('click', () => {
                    container.querySelectorAll('.gift-card').forEach((card) => {
                        card.hidden = selectedCategory !== null && card.dataset.category !== selectedCategory;
                    });
                    filters.querySelectorAll('.result-filter').forEach((filterButton) => {
                        const isSelected = filterButton === button;
                        filterButton.setAttribute('aria-pressed', String(isSelected));
                        filterButton.classList.toggle('is-active', isSelected);
                    });
                });
                filters.appendChild(button);
            };
            filters.replaceChildren();
            addFilter('All ideas', null);
            categories.forEach((category) => addFilter(category, category));
        }
        suggestions.forEach((item) => {
            const card = document.createElement('div');
            card.className = 'gift-card';
            const category = typeof item?.category === 'string' && item.category.trim() ? item.category.trim() : 'Gift idea';
            card.dataset.category = category;

            const header = document.createElement('div');
            header.className = 'gift-header';
            const details = document.createElement('div');
            const categoryLabel = document.createElement('span');
            categoryLabel.className = 'gift-category';
            categoryLabel.textContent = category;
            const title = document.createElement('div');
            title.className = 'gift-title';
            title.textContent = typeof item?.title === 'string' ? item.title : 'Gift suggestion';
            details.append(categoryLabel, title);

            const price = document.createElement('div');
            price.className = 'gift-price';
            price.textContent = typeof item?.price === 'string' ? item.price : 'Price varies';
            header.append(details, price);

            const reason = document.createElement('div');
            reason.className = 'thoughtful-highlight';
            const reasonLabel = document.createElement('strong');
            reasonLabel.textContent = 'Why it suits them: ';
            reason.append(reasonLabel, document.createTextNode(
                typeof item?.effortReason === 'string' ? item.effortReason : 'A thoughtful option based on your preferences.'
            ));

            const buyAction = document.createElement('div');
            buyAction.className = 'buy-action';
            const buyLink = document.createElement('a');
            buyLink.className = 'btn btn-outline';
            buyLink.style.fontSize = '0.85rem';
            buyLink.style.padding = '0.5rem 1rem';
            buyLink.target = '_blank';
            buyLink.rel = 'noopener noreferrer';
            buyLink.textContent = `View options on ${typeof item?.platform === 'string' ? item.platform : 'Google Shopping'} →`;
            try {
                const url = new URL(item?.buyUrl);
                buyLink.href = ['https:', 'http:'].includes(url.protocol)
                    ? url.href
                    : `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(title.textContent)}`;
            }
            catch {
                buyLink.href = `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(title.textContent)}`;
            }
            buyAction.appendChild(buyLink);
            card.append(header, reason, buyAction);
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