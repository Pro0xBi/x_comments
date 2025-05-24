async function main() {
    

    // --- Existing initialization logic --- 
    if (window.initializeApplication) {
        
        const initResult = await window.initializeApplication();

        if (initResult && initResult.success) {
            

            // Destructure necessary instances from initResult
            const {
                markerComponent,
                eventManager: localEventManager, // Renamed to avoid conflict if any global eventManager exists
                enhancedDataExtractor: localEnhancedDataExtractor,
                componentFactory: localComponentFactory,
                aiService: localAiService,
                serviceContainer: localServiceContainer // Added serviceContainer as well
            } = initResult;

            // Check if necessary components/services are available from initResult
             if (!markerComponent || !localEventManager || !localEnhancedDataExtractor || !localComponentFactory || !localAiService || !localServiceContainer) {

                  return;
             }
             

            // 1. Initialize State Manager (loads initial state from storage)
            // MODIFIED: Get stateManager from ServiceContainer
            const stateManagerInstance = localServiceContainer.get('stateManager');

            if (stateManagerInstance && typeof stateManagerInstance.initialize === 'function') {
                // console.log('[ContentScript] Initializing State Manager via ServiceContainer...'); 
                await stateManagerInstance.initialize(); 
                // console.log('[ContentScript] State Manager initialized. Current state:', stateManagerInstance.getState()); 
            } else {
                if (!stateManagerInstance) {
                    console.error('[ContentScript] Failed to get stateManager instance from ServiceContainer! Cannot initialize state.');
                } else {
                    console.error('[ContentScript] stateManager.initialize not found on instance from ServiceContainer! Cannot initialize state.');
                }
                return; // Critical failure if state manager can't init
            }

            

            // 3. Initialize Event Handlers (sets up DOM listeners based on initial state)
            if (window.initializeEventHandlers && typeof window.initializeEventHandlers === 'function') {
                
                window.initializeEventHandlers(localServiceContainer); // Pass localServiceContainer
                
            } else {
                console.error('[ContentScript] window.initializeEventHandlers not found! Dynamic listeners might not work.');
                // This might not be critical depending on whether core functionality relies on it immediately
            }

            

        } else {
             console.error('[ContentScript] initializeApplication failed:', initResult?.error);
        }
    } else {
      console.error("[ContentScript] CRITICAL: window.initializeApplication function not found. Check script loading order in manifest.json.");
    }
}

main().catch(error => {
    console.error('[ContentScript] Uncaught error during main execution:', error);
}); // Execute the main logic and catch potential top-level errors

// Keep existing storage listener if it handles other things
chrome.storage.onChanged.addListener((changes, namespace) => {
    // 保留其他 storage 变化处理逻辑
    if (namespace === 'sync') {
      
        // Add logic here if content script needs to react to other storage changes
    }
});