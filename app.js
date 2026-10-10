/**
 * Handles Form Submission on form.html
 */
async function handleFormSubmission(event) {
  event.preventDefault();

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

  // 1. Save to localStorage (लोकल बैकअप)
  localStorage.setItem(code, JSON.stringify(submissionData));

  // 2. Google Sheet Web App URL (कोट्स के अंदर सही स्ट्रिंग)
  const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwJNzbWDL8m7og0RPTSFaBwqGCh9MFs2JaakLyhdYWWospnst8k7rs-Iod6qtdobNLe/exec';

  // 3. Google Sheet में डेटा भेजना (await के साथ ताकि रिक्वेस्ट कैंसिल न हो)
  try {
    await fetch(WEB_APP_URL, {
      method: 'POST',
      mode: 'no-cors', // CORS इश्यू से बचने के लिए
      headers: {
        'Content-Type': 'text/plain;charset=utf-8' // Apps Script के doPost में बिना OPTIONS प्री-फ्लाइट के डेटा भेजने के लिए
      },
      body: JSON.stringify(submissionData)
    });
    console.log('Sheet entry dispatched successfully!');
  } catch (error) {
    console.error('Sheet Submission Failed:', error);
  }

  // 4. रिक्वेस्ट पूरी होने के बाद ही रिजल्ट पेज पर भेजें
  window.location.href = `results.html?code=${code}`;
}
