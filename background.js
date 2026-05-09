chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ lang: 'en' });
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

    chrome.storage.local.get(['userID', 'lang'], (result) => {
        const userID = result.userID;
        const lang = result.lang || 'en';
        const isRu = lang === 'ru';
        
        if (!userID) {
            chrome.tabs.sendMessage(tabId, { 
                action: "showResult", 
                result: { 
                    verdict: isRu ? "Требуется вход" : "Login required", 
                    confidence: "0%", 
                    reason: isRu ? "Пожалуйста, откройте расширение и войдите в аккаунт." : "Please open the extension and login first." 
                },
                requestId: requestId
            });
            return;
        }

        try {
            fetch('http://127.0.0.1:5000/analyze_url', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-User-ID': userID.toString()
                },
                body: JSON.stringify({ url: srcUrl, lang: lang })
            })
            .then(response => response.json())
            .then(result => {
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
                    result: { 
                        verdict: isRu ? "Ошибка" : "Error", 
                        confidence: "0%", 
                        reason: isRu ? "Сервер не запущен." : "Server is not running." 
                    },
                    requestId: requestId
                });
            });
        } catch (e) {
            console.error(e);
        }
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
        filename: request.filename || "download.jpg",
        saveAs: false
    });
  } else if (request.action === "getStats") {
    chrome.storage.local.get(['userID', 'userName'], (result) => {
        const userID = result.userID;
        const userName = result.userName;
        if (!userID) {
            sendResponse({ error: "Login required" });
            return;
        }
        fetch('http://127.0.0.1:5000/stats', {
            headers: { 'X-User-ID': userID.toString() }
        })
            .then(response => response.json())
            .then(data => {
                data.nickname = userName;
                sendResponse(data);
            })
            .catch(err => sendResponse({ error: err.message }));
    });
    return true; // Keep channel open for async response
  } else if (request.action === "setUserData") {
    chrome.storage.local.set({ userID: request.userID, userName: request.userName }, () => {
        sendResponse({ success: true });
    });
    return true;
  }
});
