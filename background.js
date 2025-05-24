// background.js

const LMS_STORAGE_KEY = '_localMasterSecret_';
const LMS_KEY_LENGTH_BYTES = 32;

/**
 * 确保本地主密钥 (LMS) 存在于 chrome.storage.local。
 * 如果不存在，则生成一个新的LMS并存储。
 * @returns {Promise<string>} 解析为LMS字符串的Promise
 */
async function ensureLMSExists() {
    try {
        const result = await new Promise((resolve, reject) => {
            chrome.storage.local.get([LMS_STORAGE_KEY], items => {
                if (chrome.runtime.lastError) {
                    return reject(chrome.runtime.lastError);
                }
                resolve(items);
            });
        });

        let lms = result[LMS_STORAGE_KEY];

        if (!lms) {
            console.log('Local Master Secret not found. Generating a new one...');
            const randomBytes = new Uint8Array(LMS_KEY_LENGTH_BYTES);
            self.crypto.getRandomValues(randomBytes); // 使用 self.crypto 替代 window.crypto

            // 将 Uint8Array 转换为 Base64 字符串
            let binaryString = '';
            for (let i = 0; i < randomBytes.length; i++) {
                binaryString += String.fromCharCode(randomBytes[i]);
            }
            // btoa 通常在 Service Worker (self) 上下文中是可用的
            // 如果在某个极特殊环境下 btoa 不可用，则需要一个自定义Base64编码函数
            lms = btoa(binaryString); 
            
            await new Promise((resolve, reject) => {
                chrome.storage.local.set({ [LMS_STORAGE_KEY]: lms }, () => {
                    if (chrome.runtime.lastError) {
                        return reject(chrome.runtime.lastError);
                    }
                    console.log('New Local Master Secret generated and stored.');
                    resolve();
                });
            });
        } else {
            // console.log('Local Master Secret found.');
        }
        return lms;
    } catch (error) {
        console.error('Error ensuring LMS exists:', error);
        // 在这种关键的初始化错误发生时，可能需要采取更激烈的措施，
        // 但目前我们先抛出错误，让调用者处理或让扩展处于一个明确的错误状态。
        throw new Error('Failed to ensure Local Master Secret availability.');
    }
}

// 扩展首次加载时尝试确保LMS存在
ensureLMSExists().catch(error => {
    console.error("Failed to initialize LMS on script load:", error);
    // 这里可以添加一些错误上报或用户通知逻辑，表明扩展可能无法正常加密数据
});

// Listener for messages from content scripts or other parts of the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Verify the sender of the message
  if (sender.id !== chrome.runtime.id) {
    console.warn(
      "AISafeGuard: Message received from an unexpected sender id:",
      sender.id,
      "Expected sender id:",
      chrome.runtime.id,
      "Message:",
      message
    );
    // It's important to return false if you are not going to call sendResponse for this message,
    // especially if other parts of the listener might return true for asynchronous responses.
    // This tells the browser that the message channel can be closed.
    return false;
  }

  if (message.action === "openOptionsPage") {
    chrome.runtime.openOptionsPage();
  }
  // 保持 sendResponse 可用，如果未来有异步响应需求
  // return true; 
});

// Optional: Add a listener for when the extension is installed or updated
chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === "install") {
    console.log("Extension installed. Ensuring LMS is created.");
    ensureLMSExists().catch(error => {
        console.error("Failed to initialize LMS on install:", error);
    });
    // Optionally open options page on first install
    // chrome.runtime.openOptionsPage(); 
  } else if (details.reason === "update") {
    console.log("Extension updated. Ensuring LMS exists (e.g., if storage was cleared).");
    ensureLMSExists().catch(error => {
        console.error("Failed to initialize LMS on update:", error);
    });
  }
}); 