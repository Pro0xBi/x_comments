// content/core/messageHandler.js


let localMessageHandlerEventManager = null;
let localApiConfigManager = null; // ADDED
let localStateManager = null;     // ADDED

// MODIFIED: Function to inject EventManager, ApiConfigManager, and StateManager
function setMessageHandlerDependencies(em, acm, sm) { // MODIFIED
    localMessageHandlerEventManager = em;
    localApiConfigManager = acm; // ADDED
    localStateManager = sm;     // ADDED
    // console.log('[MessageHandler] Dependencies (EM, ACM, SM) injected.'); 
}

(function() {
    

    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.onMessage) {
        console.error('[MessageHandler] FATAL: Chrome runtime or onMessage API not available. Cannot listen for messages.');
        return;
    }

    /**
     * Handles incoming messages from other parts of the extension (e.g., popup, background).
     */
    function handleMessage(message, sender, sendResponse) {
        console.log(`[MessageHandler] Received message type: ${message?.type || 'UNKNOWN'} from sender: ${sender?.id || 'UNKNOWN'}`, message);

        switch (message?.type) { // Optional chaining for safety
            case "CONFIG_UPDATED":
                console.log('[MessageHandler] Handling CONFIG_UPDATED. Fetching latest API configs...');
                // Check if localApiConfigManager is available
                if (!localApiConfigManager || typeof localApiConfigManager.loadConfigsForDisplay !== 'function') { // MODIFIED
                     console.error('[MessageHandler] localApiConfigManager.loadConfigsForDisplay is not available!');
                     return false; 
                }

                // Use localApiConfigManager to load configs
                localApiConfigManager.loadConfigsForDisplay() // MODIFIED
                    .then(apiConfigs => {
                         console.log('[MessageHandler] API configs loaded via localApiConfigManager:', apiConfigs);
                         if (localMessageHandlerEventManager && typeof localMessageHandlerEventManager.publish === 'function') {
                              try {
                                  localMessageHandlerEventManager.publish('config:updated', { apiConfigs: apiConfigs, timestamp: Date.now() });
                                  console.log('[MessageHandler] Published event: config:updated');
                              } catch (publishError) {
                                   console.error('[MessageHandler] Error publishing config:updated event:', publishError);
                              }
                         } else {
                             console.warn('[MessageHandler] localMessageHandlerEventManager not available for config update.');
                         }
                    })
                    .catch(error => {
                         console.error('[MessageHandler] Error loading configs via localApiConfigManager:', error);
                    });
                return true; 

            case 'TOGGLE_EXTRACTOR':
                console.log(`[MessageHandler] Handling TOGGLE_EXTRACTOR. Requested state: ${message.enabled}`);
                
                // Validate localStateManager availability
                if (!localStateManager || typeof localStateManager.toggleState !== 'function') { // MODIFIED
                    console.error('[MessageHandler] localStateManager.toggleState is not available!');
                    sendResponse({ success: false, error: 'StateManager not available.' });
                    return false; 
                }

                // Call localStateManager to handle state update and saving
                localStateManager.toggleState(message.enabled) // MODIFIED
                    .then(result => {
                        console.log('[MessageHandler] localStateManager.toggleState promise resolved:', result);
                        sendResponse(result); 
                        if (result.success && localMessageHandlerEventManager && typeof localMessageHandlerEventManager.publish === 'function') {
                              try {
                                 console.log(`[MessageHandler] Publishing state:toggled event with newState: ${result.newState}`);
                                 localMessageHandlerEventManager.publish('state:toggled', { newState: result.newState });
                              } catch (publishError) {
                                  console.error('[MessageHandler] Error publishing state:toggled event:', publishError);
                              }
                        } else if (result.success) {
                             console.warn('[MessageHandler] StateManager succeeded but localMessageHandlerEventManager not available to publish state:toggled event.');
                        }
                    })
                    .catch(error => {
                        console.error('[MessageHandler] Error calling localStateManager.toggleState:', error);
                        sendResponse({ success: false, error: error.message || 'Unknown error during toggle.' });
                    });
                return true; 

            default:
                console.warn('[MessageHandler] Message type not handled:', message?.type);
                return false; 
        }
    }

    try {
        chrome.runtime.onMessage.addListener(handleMessage);
    } catch (error) {
        console.error('[MessageHandler] FATAL: Failed to add runtime message listener:', error);
    }

})(); 

if (typeof window !== 'undefined') {
    window.setMessageHandlerDependencies = setMessageHandlerDependencies; // MODIFIED global function name
}
