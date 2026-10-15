// scripts/inspect_all_institutions.mjs
async function run() {
  const targets = await fetch("http://127.0.0.1:9222/json").then(r => r.json());
  const pages = targets.filter(t => t.type === "page");

  for (const p of pages) {
    if (p.url.startsWith("chrome://")) continue;

    console.log(`\n==================================================`);
    console.log(`Target: ${p.title} | ${p.url}`);
    console.log(`==================================================`);

    try {
      const ws = new WebSocket(p.webSocketDebuggerUrl);
      await new Promise((res, rej) => {
        ws.onopen = res;
        ws.onerror = rej;
        setTimeout(() => rej(new Error("WS timeout")), 4000);
      });

      let id = 1;
      function send(method, params = {}) {
        return new Promise((resolve, reject) => {
          const curId = id++;
          const handler = (evt) => {
            const msg = JSON.parse(evt.data);
            if (msg.id === curId) {
              ws.removeEventListener("message", handler);
              if (msg.error) reject(msg.error);
              else resolve(msg.result);
            }
          };
          ws.addEventListener("message", handler);
          ws.send(JSON.stringify({ id: curId, method, params }));
        });
      }

      const textRes = await send("Runtime.evaluate", {
        expression: `
          (() => {
            // Find key text snippets
            const text = document.body ? document.body.innerText : "";
            const lines = text.split("\\n").map(l => l.trim()).filter(l => l.length > 0);
            return {
              title: document.title,
              url: window.location.href,
              sampleLines: lines.slice(0, 35).join(" | ")
            };
          })()
        `,
        returnByValue: true
      });

      console.log(`Title: ${textRes.result?.value?.title}`);
      console.log(`URL: ${textRes.result?.value?.url}`);
      console.log(`Preview: ${textRes.result?.value?.sampleLines}\n`);

      ws.close();
    } catch (e) {
      console.error(`Could not inspect ${p.title}:`, e.message);
    }
  }
}

run().catch(console.error);
