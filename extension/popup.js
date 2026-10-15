// extension/popup.js

const BACKEND_URL = "http://localhost:8088";

document.addEventListener("DOMContentLoaded", async () => {
  const backendStatusEl = document.getElementById("backendStatus");
  const activeDomainEl = document.getElementById("activeDomain");
  const detectedTypeEl = document.getElementById("detectedType");
  const syncBtn = document.getElementById("syncBtn");
  const syncResultEl = document.getElementById("syncResult");

  // 1. Check local backend
  try {
    const res = await fetch(`${BACKEND_URL}/api/health`);
    if (res.ok) {
      backendStatusEl.innerText = "Vault Connected (Port 8088)";
      backendStatusEl.style.color = "#10b981";
    } else {
      backendStatusEl.innerText = "Vault Offline";
      backendStatusEl.style.color = "#ef4444";
    }
  } catch (e) {
    backendStatusEl.innerText = "Vault Offline (Port 8088)";
    backendStatusEl.style.color = "#ef4444";
  }

  // 2. Query active tab
  let currentTab = null;
  let pageData = null;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tab;
    if (tab && tab.url) {
      const url = new URL(tab.url);
      activeDomainEl.innerText = url.hostname;

      // Send message to content script
      chrome.tabs.sendMessage(tab.id, { action: "extract_page_data" }, (response) => {
        if (chrome.runtime.lastError || !response) {
          detectedTypeEl.innerText = "Open a supported portal or click link below";
          return;
        }
        pageData = response;
        const totalItems = (response.accounts?.length || 0) + (response.subscriptions?.length || 0);
        detectedTypeEl.innerText = `Detected ${totalItems} item(s) (${response.detectedType})`;
      });
    }
  } catch (e) {
    activeDomainEl.innerText = "Active Tab Error";
  }

  // 3. Sync Action
  syncBtn.addEventListener("click", async () => {
    syncResultEl.style.color = "#38bdf8";
    syncResultEl.innerText = "Extracting and syncing...";

    try {
      if (!currentTab) return;

      chrome.tabs.sendMessage(currentTab.id, { action: "extract_page_data" }, async (data) => {
        if (!data || ((!data.accounts || data.accounts.length === 0) && (!data.subscriptions || data.subscriptions.length === 0))) {
          syncResultEl.style.color = "#f59e0b";
          syncResultEl.innerText = "No financial data found on current tab.";
          return;
        }

        let syncedCount = 0;

        // Sync Accounts
        if (data.accounts && data.accounts.length > 0) {
          for (const acc of data.accounts) {
            await fetch(`${BACKEND_URL}/api/accounts`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(acc)
            });
            syncedCount++;
          }
        }

        // Sync Subscriptions
        if (data.subscriptions && data.subscriptions.length > 0) {
          for (const sub of data.subscriptions) {
            await fetch(`${BACKEND_URL}/api/subscriptions`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(sub)
            });
            syncedCount++;
          }
        }

        syncResultEl.style.color = "#10b981";
        syncResultEl.innerText = `✅ Successfully synced ${syncedCount} item(s) to Vault!`;
      });
    } catch (err) {
      syncResultEl.style.color = "#ef4444";
      syncResultEl.innerText = "Error syncing: " + err.message;
    }
  });

  // 4. Quick Links
  document.getElementById("openGplay").onclick = () => {
    chrome.tabs.create({ url: "https://play.google.com/store/account/subscriptions" });
  };
  document.getElementById("openNetflix").onclick = () => {
    chrome.tabs.create({ url: "https://www.netflix.com/youraccount" });
  };
  document.getElementById("openChase").onclick = () => {
    chrome.tabs.create({ url: "https://secure.chase.com/" });
  };
  document.getElementById("openAmex").onclick = () => {
    chrome.tabs.create({ url: "https://www.americanexpress.com/" });
  };
  document.getElementById("openMarcus").onclick = () => {
    chrome.tabs.create({ url: "https://www.marcus.com/us/en/dashboard" });
  };
  document.getElementById("openVault").onclick = () => {
    chrome.tabs.create({ url: "http://localhost:5173" });
  };
});
