// extension/content.js
// Runs passively in your regular Chrome profile on financial and subscription portals

function parseCurrentPage() {
  const url = window.location.href;
  const host = window.location.hostname;
  const title = document.title;
  const bodyText = document.body ? document.body.innerText : "";

  const result = {
    url,
    host,
    detectedType: "unknown",
    accounts: [],
    subscriptions: []
  };

  // 1. Google Play Subscriptions
  if (host.includes("play.google.com") && url.includes("subscriptions")) {
    result.detectedType = "subscriptions:google_play";
    const subItems = document.querySelectorAll('[role="listitem"], .VfPpkd-WsjYwc');
    subItems.forEach((item, idx) => {
      const text = item.innerText;
      if (text.includes("$") || text.includes("Renews") || text.includes("renews") || text.includes("₹")) {
        const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
        const name = lines[0] || "Google Play Subscription";
        const priceLine = lines.find(l => l.includes("$") || l.includes("₹")) || "";
        const priceMatch = priceLine.match(/([\$₹])\s*([\d\.]+)/);
        if (priceMatch) {
          result.subscriptions.push({
            id: `sub-gplay-${idx}-${Date.now()}`,
            service_name: name,
            source: "Google Play",
            cost_per_cycle: parseFloat(priceMatch[2]),
            currency: priceMatch[1] === "₹" ? "INR" : "USD",
            cycle: text.toLowerCase().includes("yr") || text.toLowerCase().includes("year") ? "Annual" : "Monthly",
            next_renewal: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split("T")[0],
            status: "Active"
          });
        }
      }
    });
  }

  // 2. American Express
  else if (host.includes("americanexpress.com")) {
    result.detectedType = "account:amex";
    const balanceMatches = bodyText.match(/Total Balance\s*[\$]?([\d,]+\.\d{2})/i) ||
                           bodyText.match(/Statement Balance\s*[\$]?([\d,]+\.\d{2})/i);
    if (balanceMatches) {
      result.accounts.push({
        id: "us-amex-card",
        name: "American Express Card",
        account_type: "CreditCardAmex",
        currency: "USD",
        balance: parseFloat(balanceMatches[1].replace(/,/g, "")),
        apr: 21.99,
        monthly_min_payment: 0.0,
        institution: "American Express"
      });
    }
  }

  // 3. Chase Bank
  else if (host.includes("chase.com")) {
    result.detectedType = "account:chase";
    const checkingMatch = bodyText.match(/(?:TOTAL CHECKING|Checking|TOTAL).*?\$([\d,]+\.\d{2})/i);
    if (checkingMatch) {
      result.accounts.push({
        id: "us-chase-checking",
        name: "Chase Total Checking",
        account_type: "CashChecking",
        currency: "USD",
        balance: parseFloat(checkingMatch[1].replace(/,/g, "")),
        apr: 0.0,
        monthly_min_payment: 0.0,
        institution: "JPMorgan Chase"
      });
    }
  }

  // 4. Marcus by Goldman Sachs
  else if (host.includes("marcus.com")) {
    result.detectedType = "account:marcus";
    const marcusMatch = bodyText.match(/(?:Online Savings|Total Savings|Balance).*?\$([\d,]+\.\d{2})/i);
    if (marcusMatch) {
      result.accounts.push({
        id: "us-marcus-savings",
        name: "Marcus High-Yield Online Savings",
        account_type: "CashSavings",
        currency: "USD",
        balance: parseFloat(marcusMatch[1].replace(/,/g, "")),
        apr: 4.40,
        monthly_min_payment: 0.0,
        institution: "Marcus by Goldman Sachs"
      });
    }
  }

  // 5. Citi Card
  else if (host.includes("citi.com")) {
    result.detectedType = "account:citi";
    const citiMatch = bodyText.match(/(?:Current Balance|Balance Breakdown).*?\$([\d,]+\.\d{2})/i);
    if (citiMatch) {
      result.accounts.push({
        id: "us-citi-diamond-6617",
        name: "Citi Diamond Preferred Card (***6617)",
        account_type: "CreditCardCiti",
        currency: "USD",
        balance: parseFloat(citiMatch[1].replace(/,/g, "")),
        apr: 0.0,
        monthly_min_payment: 0.0,
        institution: "Citibank"
      });
    }
  }

  return result;
}

// Listen for popup requests
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extract_page_data") {
    const data = parseCurrentPage();
    sendResponse(data);
  }
});
