// scripts/extract_financial_details.mjs
async function run() {
  const targets = await fetch("http://127.0.0.1:9222/json").then(r => r.json());

  // 1. Inspect Citi Card in detail
  const citiTarget = targets.find(t => t.url.includes("citi.com") && t.type === "page");
  if (citiTarget) {
    console.log("=== Inspecting Citi Card ===");
    const ws = new WebSocket(citiTarget.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);
    let id = 1;
    function send(method, params = {}) {
      return new Promise((res) => {
        const curId = id++;
        const handler = (evt) => {
          const msg = JSON.parse(evt.data);
          if (msg.id === curId) {
            ws.removeEventListener("message", handler);
            res(msg.result);
          }
        };
        ws.addEventListener("message", handler);
        ws.send(JSON.stringify({ id: curId, method, params }));
      });
    }

    const citiInfo = await send("Runtime.evaluate", {
      expression: `
        (() => {
          // Search for balance, payment due, credit line
          const body = document.body ? document.body.innerText : "";
          return body.split("\\n").filter(l => 
            l.includes("$") || l.includes("Balance") || l.includes("Payment") || l.includes("Due") || l.includes("Card") || l.includes("Limit")
          ).slice(0, 30);
        })()
      `,
      returnByValue: true
    });
    console.log("Citi details:\n", citiInfo.result?.value);
    ws.close();
  }

  // 2. Inspect Remitly transfers in detail
  const remitlyTarget = targets.find(t => t.url.includes("remitly.com") && t.type === "page");
  if (remitlyTarget) {
    console.log("\n=== Inspecting Remitly Transfers ===");
    const ws = new WebSocket(remitlyTarget.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);
    let id = 1;
    function send(method, params = {}) {
      return new Promise((res) => {
        const curId = id++;
        const handler = (evt) => {
          const msg = JSON.parse(evt.data);
          if (msg.id === curId) {
            ws.removeEventListener("message", handler);
            res(msg.result);
          }
        };
        ws.addEventListener("message", handler);
        ws.send(JSON.stringify({ id: curId, method, params }));
      });
    }

    const remitlyInfo = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const text = document.body ? document.body.innerText : "";
          const lines = text.split("\\n").map(l => l.trim()).filter(l => l.length > 0);
          const transferIdx = lines.indexOf("Transfers");
          if (transferIdx !== -1) {
            return lines.slice(transferIdx, transferIdx + 40);
          }
          return lines.slice(0, 40);
        })()
      `,
      returnByValue: true
    });
    console.log("Remitly details:\n", remitlyInfo.result?.value);
    ws.close();
  }

  // 3. Inspect Crobo transfers in detail
  const croboTarget = targets.find(t => t.url.includes("crobo.money") && t.type === "page");
  if (croboTarget) {
    console.log("\n=== Inspecting Crobo Transfers ===");
    const ws = new WebSocket(croboTarget.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);
    let id = 1;
    function send(method, params = {}) {
      return new Promise((res) => {
        const curId = id++;
        const handler = (evt) => {
          const msg = JSON.parse(evt.data);
          if (msg.id === curId) {
            ws.removeEventListener("message", handler);
            res(msg.result);
          }
        };
        ws.addEventListener("message", handler);
        ws.send(JSON.stringify({ id: curId, method, params }));
      });
    }

    const croboInfo = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const text = document.body ? document.body.innerText : "";
          const lines = text.split("\\n").map(l => l.trim()).filter(l => l.length > 0);
          return lines.slice(0, 50);
        })()
      `,
      returnByValue: true
    });
    console.log("Crobo details:\n", croboInfo.result?.value);
    ws.close();
  }
}

run().catch(console.error);
