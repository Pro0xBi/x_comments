
(function() {
    

    let isEnabled = true; // Default state
    let localEventManager = null; // <-- ADDED

    /**
     * Publishes an event indicating the desired marker visibility state.
    
     * @param {boolean} visible - Whether the marker should be visible.
     */
    function publishMarkerVisibility(visible) {
        // Check if eventManager is available
        if (localEventManager && typeof localEventManager.publish === 'function') {
            console.log(`[StateManager] Publishing state:visibilityChanged event with visibility: ${visible}`);
            try {
                localEventManager.publish('state:visibilityChanged', { isVisible: visible });
            } catch (error) {
                 console.error('[StateManager] Error publishing state:visibilityChanged event:', error);
            }
        } else {
            console.warn('[StateManager] localEventManager not found or publish method missing. Cannot notify.');
          
        }
    }

    /**
     * Updates the internal state and publishes the visibility change event.
     * Does NOT handle event listener management or saving to storage.
     * @param {boolean} newState - The new enabled state.
     */
    function _updateInternalState(newState) {
        const previousState = isEnabled;
        isEnabled = !!newState; // Ensure boolean
        console.log(`[StateManager] Internal state updated: ${previousState} -> ${isEnabled}`);
        // Call the new function to publish the event
        publishMarkerVisibility(isEnabled);
        // Note: manageEventListeners handling remains external
    }


    /**
     * Checks the enabled state from chrome.storage and updates the internal state.
     * @returns {Promise<boolean>} - Resolves with the current enabled state after checking storage.
     */
    function checkEnabledState() {
        console.log('[StateManager] Checking enabled state from storage...');
        return new Promise((resolve) => {
             // Check if API is available
             if (!chrome?.storage?.sync) {
                 console.error('[StateManager] chrome.storage.sync API not available. Using default state.');
                 _updateInternalState(true); // Default to true if storage unavailable
                 resolve(isEnabled);
                 return;
             }
            chrome.storage.sync.get(['commentExtractorEnabled'], (result) => {
                 // Handle potential errors during storage access
                 if (chrome.runtime.lastError) {
                     console.error('[StateManager] Error loading state from storage:', chrome.runtime.lastError);
                     // Keep current/default state on error
                 } else {
                     // Use undefined check for first run, otherwise use stored value, ensure boolean
                     const storedState = result.commentExtractorEnabled === undefined ? true : !!result.commentExtractorEnabled;
                     
                     _updateInternalState(storedState); // Update internal state and marker visibility
                 }
                resolve(isEnabled); // Resolve with the final state (either loaded or default/previous)
            });
        });
    }

    /**
     * Toggles the enabled state, updates internal state, marker visibility, 
     * AND saves the new state to chrome.storage.
     * This function is intended to be called by the message handler.
     * @param {boolean} newState - The desired new state.
     * @returns {Promise<{success: boolean, newState: boolean, error?: string}>} - Resolves with operation result.
     */
    function toggleStateAndSave(newState) {
         const targetState = !!newState; // Ensure boolean
         console.log(`[StateManager] Received request to set state to: ${targetState}`);
         _updateInternalState(targetState); // Update internal state first

         // Return a promise that resolves after saving
         return new Promise((resolve) => {
              if (!chrome?.storage?.sync) {
                  console.error('[StateManager] chrome.storage.sync API not available. Cannot save state.');
                  resolve({ success: false, newState: isEnabled, error: 'Storage API unavailable' });
                  return;
              }
             chrome.storage.sync.set({ commentExtractorEnabled: isEnabled }, () => { // isEnabled already updated by _updateInternalState
                 if (chrome.runtime.lastError) {
                     console.error("[StateManager] Error saving state:", chrome.runtime.lastError);
                     resolve({ success: false, newState: isEnabled, error: chrome.runtime.lastError.message });
                 } else {
                     console.log(`[StateManager] State saved successfully: ${isEnabled}`);
                     resolve({ success: true, newState: isEnabled });
                 }
             });
         });
    }

    /**
     * Returns the current internal enabled state.
     * @returns {boolean}
     */
    function getState() {
        // console.log(\'[StateManager] getState called, returning:\', isEnabled); // Can be noisy
        return isEnabled;
    }

    // MODIFIED: Assign to a temporary window variable, to be picked up by initializer
    window.stateManagerApiTemp = {
        setEventManager: (em) => {
            localEventManager = em;
        },
        initialize: checkEnabledState,
        toggleState: toggleStateAndSave,
        getState: getState
    };

})(); // End of IIFE

