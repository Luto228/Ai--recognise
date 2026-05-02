chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "recogniseImage",
    title: "Recognise AI",
    contexts: ["image"]
  });
});

function analyzeImage(srcUrl, tabId) {
    const requestId = Date.now();

    chrome.tabs.sendMessage(tabId, { 
      action: "startRecognition", 
      srcUrl: srcUrl,
      requestId: requestId
    });

    try {
        fetch('http://127.0.0.1:5000/analyze_url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: srcUrl })
        })
        .then(response => response.json())
        .then(result => {
            // Save to history
            saveToHistory(srcUrl, result);
            
            chrome.tabs.sendMessage(tabId, { 
                action: "showResult", 
                result: result,
                requestId: requestId
            });
        })
        .catch(error => {
            console.error(error);
            chrome.tabs.sendMessage(tabId, { 
                action: "showResult", 
                result: { verdict: "Error", confidence: "0%", reason: "Server is not running or API key is missing." },
                requestId: requestId
            });
        });
    } catch (e) {
        console.error(e);
    }
}

function saveToHistory(url, result) {
    if (!result || !result.verdict) return;
    
    chrome.storage.local.get(['killedAI', 'studiedHuman'], (data) => {
        let killedAI = data.killedAI || [];
        let studiedHuman = data.studiedHuman || [];
        
        const entry = { url: url, timestamp: Date.now(), reason: result.reason };
        
        if (result.verdict === 'AI-Generated') {
            // Check for duplicates
            if (!killedAI.find(item => item.url === url)) {
                killedAI.unshift(entry);
                if (killedAI.length > 50) killedAI.pop();
            }
        } else if (result.verdict === 'Real Photo') {
            if (!studiedHuman.find(item => item.url === url)) {
                studiedHuman.unshift(entry);
                if (studiedHuman.length > 50) studiedHuman.pop();
            }
        }
        
        chrome.storage.local.set({ killedAI, studiedHuman });
    });
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "recogniseImage") {
    analyzeImage(info.srcUrl, tab.id);
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "analyzeImageUrl" && sender.tab) {
    analyzeImage(request.url, sender.tab.id);
  } else if (request.action === "downloadImage") {
    chrome.downloads.download({
        url: request.url,
        saveAs: false
    });
  }
});
