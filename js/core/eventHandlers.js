// console.log('[EventHandlers] Loading IIFE...');

(function() {
    // console.log('[EventHandlers] Initializing module context...');
    let localServiceContainer = null; // To store ServiceContainer instance

    // --- Helper Functions --- //

    /**
     * Finds the closest ancestor tweet element.
     * Relies on localServiceContainer to get SELECTORS.
     * @param {HTMLElement} element - The starting element.
     * @returns {HTMLElement | null} - The tweet element or null if not found.
     */
    function findTweetElement(element) {
        if (!localServiceContainer) {
            console.warn('[EventHandlers::findTweetElement] localServiceContainer not available.');
            return null;
        }
        const selectors = localServiceContainer.get('SELECTORS');
        if (!selectors || !selectors.TWEET) {
            console.warn('[EventHandlers::findTweetElement] SELECTORS.TWEET not found via ServiceContainer.');
            return null;
        }
        return element.closest(selectors.TWEET);
    }

    // --- Debounce Timer --- (Added)
    let mouseoverDebounceTimer = null;
    const DEBOUNCE_DELAY = 150; // ms

    // --- Core Event Handler --- //

    /**
     * Handles the mouseover event on potential tweet elements.
     * @param {MouseEvent} event - The mouse event.
     */
    async function _mouseoverHandler(event) {
        // Clear any existing timer
        clearTimeout(mouseoverDebounceTimer);

        // Set a new timer to execute the logic after a delay
        mouseoverDebounceTimer = setTimeout(async () => {
             // --- Start of debounced logic ---
            // console.log(`[EventHandlers::_mouseoverHandler] Debounced START - Timestamp: ${Date.now()}`);

            // Check stateManager first
            const localSM = localServiceContainer ? localServiceContainer.get('stateManager') : null;
            if (!localSM || typeof localSM.getState !== 'function') {
                console.warn('[EventHandlers::_mouseoverHandler] StateManager not available from ServiceContainer.');
                return;
            }
            if (!localSM.getState()) {
                // console.debug('[EventHandlers::_mouseoverHandler] Extension disabled (via SC StateManager), ignoring mouseover.');
                return;
            }

            const tweetElement = findTweetElement(event.target); // Find the target element within the debounced callback
            if (!tweetElement) return;

            // --- MODIFIED: Get EventManager from localServiceContainer ---
            if (!localServiceContainer) {
                console.error('[EventHandlers::_mouseoverHandler] localServiceContainer not available. Cannot get EventManager or EnhancedDataExtractor.');
                return;
            }
            const currentEnhancedDataExtractor = localServiceContainer.get('enhancedDataExtractor');
            const currentEventManager = localServiceContainer.get('eventManager'); // Get EventManager

            if (!currentEnhancedDataExtractor) {
                console.warn('[EventHandlers::_mouseoverHandler] EnhancedDataExtractor not available from ServiceContainer.');
                return;
            }
            // --- Check currentEventManager ---
            if (!currentEventManager || typeof currentEventManager.publish !== 'function') {
                console.warn('[EventHandlers::_mouseoverHandler] EventManager not available from ServiceContainer or publish is not a function.');
                // Decide if to continue or return
            }

            // Check for updateMarker function itself (defined below)
            if (typeof updateMarker !== 'function') {
                console.error('[EventHandlers::_mouseoverHandler] updateMarker function is not defined!');
                return;
            }

            // Extract data and update UI
            try {
                const tweetData = currentEnhancedDataExtractor.extractAndUpdateTweetData(tweetElement);
                if (!tweetData) return; // No data extracted, exit quietly

                // --- MODIFIED: Use currentEventManager ---
                if (currentEventManager) { // Check if we successfully got it
                     try {
                         currentEventManager.publish('data:tweetExtracted', tweetData);
                     } catch (publishError) {
                          console.error('[EventHandlers::_mouseoverHandler] Error publishing data:tweetExtracted:', publishError);
                     }
                }

                // Update the marker UI (checked above)
                await updateMarker(tweetData);

            } catch (error) {
                console.error('[EventHandlers::_mouseoverHandler] Error during mouseover processing:', error);
            }
            // --- End of debounced logic ---
        }, DEBOUNCE_DELAY);
    }

    // --- Event Listener Management --- //

    /**
     * Adds or removes the main mouseover event listener based on the enabled state.
     * @param {boolean} shouldEnable - Whether to add the listener.
     */
    function manageEventListeners(shouldEnable) {
        // console.log(`[EventHandlers::manageEventListeners] Request to ${shouldEnable ? 'enable' : 'disable'} DOM listeners.`);
        const handlerRef = _mouseoverHandler;
        
        // Always try to remove first to prevent duplicates
        try {
           document.removeEventListener('mouseover', handlerRef);
        } catch (removeError) {
             console.error('[EventHandlers::manageEventListeners] Error removing existing listener (may be harmless): ', removeError);
        }
        
        if (shouldEnable) {
            try {
                 document.addEventListener('mouseover', handlerRef);
                 // console.log('[EventHandlers::manageEventListeners] Added mouseover listener.');
            } catch (addError) {
                  console.error('[EventHandlers::manageEventListeners] Error adding mouseover listener: ', addError);
            }
        } else {
            // console.log('[EventHandlers::manageEventListeners] Removed mouseover listener (or ensured it was not present).');
        }
    }

    // --- UI Update Logic (TODO: Consider moving these elsewhere, e.g., a UIManager) --- //

    /**
     * Initializes the experimental tab content (role selector, custom prompt editor, buttons).
     * Relies on various UI components and services available on window.
     * @returns {HTMLElement | null} The container element for the experimental tab or null on error.
     */
    async function initializeExperimentalTab() {
        // console.log('[EventHandlers::initializeExperimentalTab] Initializing...');
        try {
            if (!localServiceContainer) {
                console.error('[EventHandlers::initializeExperimentalTab] FATAL: localServiceContainer is not available.');
                throw new Error('localServiceContainer not available in initializeExperimentalTab');
            }

            // Attempt to get existing instance from ServiceContainer first
            let existingInstance = localServiceContainer.get('experimentalTabInstance');
            if (existingInstance) {
                // console.log('[EventHandlers::initializeExperimentalTab] Returning existing instance from ServiceContainer.');
                return existingInstance;
            }

            // Get core services from localServiceContainer
            const resolvedAiService = localServiceContainer.get('aiService');
            const resolvedEventManager = localServiceContainer.get('eventManager');
            const resolvedComponentFactory = localServiceContainer.get('componentFactory');
            const resolvedAnalyzeButtonConstants = localServiceContainer.get('analyzeButtonConstants'); // Already getting this
            const globalModalInstanceFromSC = localServiceContainer.get('globalModalInstance'); // Get modal instance
            // const resolvedMarkdownService = localServiceContainer.get('markdownService'); // REMOVED: MarkdownService retrieval

            // ---- DEBUGGING LOGS START - 已确认 resolvedComponentFactory 有效，可以暂时注释掉 ----
            /*
            console.log('[EventHandlers::initializeExperimentalTab] typeof resolvedComponentFactory:', typeof resolvedComponentFactory);
            console.log('[EventHandlers::initializeExperimentalTab] resolvedComponentFactory instance:', resolvedComponentFactory);
            if (resolvedComponentFactory && typeof resolvedComponentFactory.createComponent === 'function') {
                console.log('[EventHandlers::initializeExperimentalTab] resolvedComponentFactory HAS createComponent method.');
            } else {
                console.warn('[EventHandlers::initializeExperimentalTab] resolvedComponentFactory DOES NOT have createComponent method or is not an object.');
            }
            */
            // ---- DEBUGGING LOGS END ----

            // Check dependencies
            const dependencies = {
               analyzeButtonConstants: resolvedAnalyzeButtonConstants, // NEW: from service container
               eventManager: resolvedEventManager, 
               aiService: resolvedAiService,     
               componentFactory: resolvedComponentFactory 
            };
            for (const [name, dep] of Object.entries(dependencies)) {
                if (!dep) {
                     console.error(`[EventHandlers::initializeExperimentalTab] Error: Missing dependency: ${name}`);
                     throw new Error(`Missing dependency for ExperimentalTab: ${name}`);
                }
            }
          
            const experimentalContainer = document.createElement('div');
            experimentalContainer.className = 'experimental-tab-area';
           
            const tabComponentConfig = {
                eventManager: dependencies.eventManager,
                componentFactory: resolvedComponentFactory,
                options: {
                    animated: true,
                    placement: 'top'
                }
            };
            const tabComponentInstance = resolvedComponentFactory.createComponent('tab', tabComponentConfig);
            
            if (!tabComponentInstance || !tabComponentInstance.element) {
                 console.error('[EventHandlers::initializeExperimentalTab] Failed to create TabComponent instance or its element using factory.');
                 throw new Error('TabComponent creation failed via factory');
            }
            const tabComponent = tabComponentInstance; 
            
            // --- ADDED LOG: Check count immediately after TabComponent creation ---
            let countInsideTabElement = -1;
            if (tabComponent && tabComponent.element) {
                 countInsideTabElement = tabComponent.element.querySelectorAll('.tab-content-container').length;
                 // console.log(`[EventHandlers::initializeExperimentalTab] AFTER TabComponent created - Count inside tabComponent.element: ${countInsideTabElement}`);
            } else {
                 console.error('[EventHandlers::initializeExperimentalTab] ERROR: tabComponent or tabComponent.element is invalid after creation!');
            }
            // --- END ADDED LOG ---
            
            // Create content containers
            const presetContent = document.createElement('div'); presetContent.className = 'experimental-preset-content';
            const customContent = document.createElement('div'); customContent.className = 'experimental-custom-content';
            // Ensure resultContainer is declared ONCE here, before usage
            const resultContainer = document.createElement('div'); resultContainer.className = 'analyze-result-container';
            
            // Add existing tabs with updated titles
            tabComponent.addTab({ id: 'tab-preset', title: '角色', content: presetContent });
            tabComponent.addTab({ id: 'tab-custom', title: 'Prompt', content: customContent });
            
            // "My Roles" Tab and its logic were removed as part of the merge-tab strategy.

            // Append the entire TabComponent structure
            experimentalContainer.appendChild(tabComponent.element);
            
            const roleSelectorConfig = { 
                aiService: dependencies.aiService, 
                componentFactory: resolvedComponentFactory,
                eventManager: dependencies.eventManager,
                // rolesConfig and defaultRoleID are already part of aiService, no need to pass separately
            };
            
            // +++++ Diagnostic logs START +++++
            if (roleSelectorConfig.eventManager) {
                
            } else {
                
            }
            // +++++ Diagnostic logs END +++++
            
            

            const roleSelectorInstance = resolvedComponentFactory.createComponent('roleSelector', roleSelectorConfig);
    
            // Append the created element to the presetContent container
            if (roleSelectorInstance && roleSelectorInstance.element) {
                 presetContent.appendChild(roleSelectorInstance.element);
                 // console.log('[EventHandlers::initializeExperimentalTab] RoleSelector instance created and element appended.');
            } else {
                 console.error('[EventHandlers::initializeExperimentalTab] Failed to create RoleSelector instance or its element using factory.');
                 // Handle error appropriately, maybe throw or add placeholder
                 throw new Error('RoleSelector creation failed via factory');
            }
            // --- End RoleSelector Creation ---
            
            // --- Initialize content for CUSTOM tab --- 
            // Replace direct instantiation with factory creation
            // console.log('[EventHandlers::initializeExperimentalTab] Creating CustomPromptEditor via factory...');
            
            const customPromptConstants = localServiceContainer.get('customPromptConstants'); // NEW: Get constants

            const customPromptEditorConfig = { 
                aiService: dependencies.aiService, 
                eventManager: dependencies.eventManager,
                customPromptConstants: customPromptConstants // NEW: Add to config
            };

            console.log('[EventHandlers::initializeExperimentalTab] PRE-CREATE CustomPromptEditor. Config to be used:', customPromptEditorConfig, 'ResolvedComponentFactory:', resolvedComponentFactory, 'aiService from dependencies:', dependencies.aiService, 'eventManager from dependencies:', dependencies.eventManager); // DEBUG - MOVED AND MODIFIED
            
            // Use 'customPromptEditor' as the key, assuming it's registered in the factory with this name.
            const customPromptEditorInstance = resolvedComponentFactory.createComponent('customPromptEditor', customPromptEditorConfig); 

            console.log('[EventHandlers::initializeExperimentalTab] POST-CREATE CustomPromptEditor. Instance:', customPromptEditorInstance); // DEBUG
            if (customPromptEditorInstance) {
                console.log('[EventHandlers::initializeExperimentalTab] CustomPromptEditor Instance Element:', customPromptEditorInstance.element); // DEBUG
            } else {
                console.error('[EventHandlers::initializeExperimentalTab] CustomPromptEditor instance IS NULL or UNDEFINED after creation attempt.'); // DEBUG
            }

            // Append the created element to the customContent container
            if (customPromptEditorInstance && customPromptEditorInstance.element) {
                 customContent.appendChild(customPromptEditorInstance.element); // Append the component's root element
                 // console.log('[EventHandlers::initializeExperimentalTab] CustomPromptEditor instance created and element appended.');
            } else {
                 console.error('[EventHandlers::initializeExperimentalTab] Failed to create CustomPromptEditor instance or its element using factory.');
                 // Handle error appropriately, maybe throw or add placeholder
                 throw new Error('CustomPromptEditor creation failed via factory');
            }
            // --- End CustomPromptEditor Creation ---

            // --- Setup shared elements (Buttons, Result Area) --- 
            const buttonContainer = document.createElement('div'); buttonContainer.className = 'analyze-button-container'; 

            // Check if componentFactory is available
            if (!resolvedComponentFactory) {
                 console.error('[EventHandlers::initializeExperimentalTab] FATAL: resolvedComponentFactory not available. Cannot create AnalyzeButton instances.');
                 throw new Error('resolvedComponentFactory instance not found');
            }

            // AnalyzeButton instances for preset and custom modes - USE FACTORY
            const analyzeButtonPresetConfig = {
                mode: resolvedAnalyzeButtonConstants.MODES.PRESET, // USE injected constants
                aiService: dependencies.aiService, 
                resultContainer: resultContainer, 
                getRoleSelector: () => roleSelectorInstance, 
                eventManager: dependencies.eventManager,
                analyzeButtonConstants: resolvedAnalyzeButtonConstants, // Pass the constants through
                globalModal: globalModalInstanceFromSC // MODIFIED - Inject modal instance
                // markdownService: resolvedMarkdownService // REMOVED: MarkdownService injection
            };
            const analyzeButtonPreset = resolvedComponentFactory.createComponent('analyzeButton', analyzeButtonPresetConfig);

            const analyzeButtonCustomConfig = {
                mode: resolvedAnalyzeButtonConstants.MODES.CUSTOM, // USE injected constants
                aiService: dependencies.aiService, 
                resultContainer: resultContainer, 
                getCustomPromptEditor: () => customPromptEditorInstance,
                eventManager: dependencies.eventManager,
                analyzeButtonConstants: resolvedAnalyzeButtonConstants, // Pass the constants through
                globalModal: globalModalInstanceFromSC // MODIFIED - Inject modal instance
                // markdownService: resolvedMarkdownService // REMOVED: MarkdownService injection
            };
            const analyzeButtonCustom = resolvedComponentFactory.createComponent('analyzeButton', analyzeButtonCustomConfig);

            // Initial button visibility (append elements AFTER creation using factory)
            // Manually append buttons to their container now
            if (analyzeButtonPreset && analyzeButtonPreset.element) {
                 buttonContainer.appendChild(analyzeButtonPreset.element);
            } else {
                 console.error('[EventHandlers::initializeExperimentalTab] Failed to get preset button element from factory.');
            }
             if (analyzeButtonCustom && analyzeButtonCustom.element) {
                 buttonContainer.appendChild(analyzeButtonCustom.element);
                 analyzeButtonCustom.element.style.display = 'none'; // Hide custom initially
             } else {
                 console.error('[EventHandlers::initializeExperimentalTab] Failed to get custom button element from factory.');
            }

            // Append button container and result area AFTER buttons are created and appended
            experimentalContainer.appendChild(buttonContainer);
            experimentalContainer.appendChild(resultContainer); // Append the shared result container

            // Tab change listener - Handles showing correct button
            tabComponent.on('change', async (tabId) => { 
                // // console.log('[initializeExperimentalTab] Tab changed to:', tabId);
                
                // Logic for handling the removed "My Roles" tab has been deleted.

                // --- Logic for Analyze Button Visibility (Remains the same) --- 
                const isCustom = tabId === 'tab-custom';
                analyzeButtonPreset.element.style.display = isCustom ? 'none' : '';
                analyzeButtonCustom.element.style.display = isCustom ? '' : 'none';
            });
            
            // console.log('[EventHandlers::initializeExperimentalTab] Experimental tab UI creation complete.');
            
            // Register the newly created instance with ServiceContainer
            if (localServiceContainer && experimentalContainer) {
                localServiceContainer.register('experimentalTabInstance', experimentalContainer, { singleton: true });
                console.log('[EventHandlers::initializeExperimentalTab] New experimentalTabInstance registered with ServiceContainer.');
            } else {
                console.error('[EventHandlers::initializeExperimentalTab] Could not register new experimentalTabInstance.');
            }

            return experimentalContainer;

        } catch (error) { 
            console.error('[EventHandlers::initializeExperimentalTab] Error setting up experimental tab content:', error);
            // Return a placeholder on error
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-placeholder';
            errorDiv.textContent = 'Error loading analysis tools.';
            errorDiv.style.color = 'red';
            return errorDiv; 
        }
    }

    /**
     * Creates the main content container for the marker, including the experimental tab.
     * Relies on window.componentFactory, window.markerContentManager, window.eventManager.
     * @param {object} tweetData - The extracted tweet data.
     * @returns {Promise<HTMLElement | null>} The marker content container or null.
     */
    async function createMarkerContent(tweetData) {
        // console.log('[EventHandlers::createMarkerContent] Creating marker content for tweet ID:', tweetData.tweetId);

        if (!localServiceContainer) {
            console.error('[EventHandlers::createMarkerContent] FATAL: localServiceContainer is not available. Cannot create marker content.');
            return null; // Or throw an error
        }
        const mainMarker = localServiceContainer.get('mainMarkerComponent');

        const activeComponentFactory = localServiceContainer.get('componentFactory');
        const activeEventManager = localServiceContainer.get('eventManager');
        // AIService is retrieved but not directly used in the snippet, assuming it might be used later or by MarkerContentManager internally
        // const activeAiService = localServiceContainer.get('aiService'); 

        if (!activeComponentFactory || !activeEventManager) { // Removed activeAiService from this check unless MCM needs it directly
            console.error('[EventHandlers::createMarkerContent] FATAL: Core services (ComponentFactory or EventManager) not retrieved.');
            return null;
        }
        
        try {
            let mCMInstance = localServiceContainer.get('markerContentManagerInstance');
            if (!mCMInstance) {
                // console.log('[EventHandlers::createMarkerContent] Initializing MarkerContentManager as it was not in SC...');
                // Ensure MarkerContentManager class is available in the current scope
                if (typeof MarkerContentManager !== 'function') {
                    console.error('[EventHandlers::createMarkerContent] MarkerContentManager class is not defined in the current scope!');
                    throw new Error('MarkerContentManager class not defined');
                }
                mCMInstance = new MarkerContentManager({ 
                    eventManager: activeEventManager,
                    componentFactory: activeComponentFactory, 
                    useCache: true, 
                    cacheSize: 50 
                }); 
                
                if (typeof mCMInstance.initialize === 'function') {
                    const initResult = mCMInstance.initialize(); 
                    if (initResult instanceof Promise) { 
                        await initResult; 
                    }
                }
                // Register with activeEventManager (MCM might do this internally or it might be done here)
                // activeEventManager.registerService('markerContentManager', mCMInstance); // Assuming MCM handles its own registration or this is desired here
                
                // Register the new instance with ServiceContainer
                localServiceContainer.register('markerContentManagerInstance', mCMInstance, { singleton: true });
                console.log('[EventHandlers::createMarkerContent] New markerContentManagerInstance registered with ServiceContainer.');
            }
            
            let container;
            const cachedContainer = mCMInstance?.getCachedContent(tweetData.tweetId);
            if (cachedContainer) {
                container = cachedContainer;
                // console.log(`[EventHandlers::createMarkerContent] Using cached container for Tweet ID: ${tweetData.tweetId}`);
            } else {
                 // console.log(`[EventHandlers::createMarkerContent] Creating new container for Tweet ID: ${tweetData.tweetId}`);
                 container = await mCMInstance?.createContent(tweetData); 
                 if (!container) throw new Error("Failed to create/get container from MarkerContentManager");
            }

            // Publish tweet:selected event
            // console.log(`[EventHandlers::createMarkerContent] About to publish tweet:selected for Tweet ID: ${tweetData.tweetId}.`);
             try {
                 if (activeEventManager) {
                     activeEventManager.publish('tweet:selected', tweetData);
                 }
             } catch (publishError) {
                 console.error('[EventHandlers::createMarkerContent] Error publishing tweet:selected:', publishError);
             }
            
            // 2. Check if experimental tab needs to be added
            const needsTabArea = !container.querySelector('.experimental-tab-area');
            // console.log(`[EventHandlers::createMarkerContent] Needs experimental tab area? ${needsTabArea}, Tweet ID: ${tweetData.tweetId}`);

            if (needsTabArea) {
                // 3. Get the singleton experimentalTab instance
                const localExperimentalTab = await initializeExperimentalTab(); // Use await just in case
                if (!localExperimentalTab) throw new Error("Failed to initialize experimental tab area.");

                // --- DETAILED LOGGING ---
                const isSameInstance = window.experimentalTabInstance === localExperimentalTab;
                const currentParentInfo = localExperimentalTab.parentNode ? ` Parent: ${localExperimentalTab.parentNode.tagName}.${localExperimentalTab.parentNode.className}` : ' No Parent';
                const markerElement = mainMarker?.element;
                const countInMarkerBefore = markerElement ? markerElement.querySelectorAll('.tab-content-container').length : -1;
                const countInContainerBefore = container.querySelectorAll('.tab-content-container').length;

                // console.log(`[EventHandlers::createMarkerContent] BEFORE appendChild - Tweet ID: ${tweetData.tweetId}, SameInstance: ${isSameInstance}, ExpTab ${currentParentInfo}, CountInMarker: ${countInMarkerBefore}, CountInContainer: ${countInContainerBefore}`);
                // --- END LOGGING ---

                // 4. Append the experimentalTab to the container
                container.appendChild(localExperimentalTab);

                // --- DETAILED LOGGING ---
                const newParentInfo = localExperimentalTab.parentNode ? ` Parent: ${localExperimentalTab.parentNode.tagName}.${localExperimentalTab.parentNode.className}` : ' No Parent';
                const countInMarkerAfter = markerElement ? markerElement.querySelectorAll('.tab-content-container').length : -1;
                const countInContainerAfter = container.querySelectorAll('.tab-content-container').length;

                // console.log(`[EventHandlers::createMarkerContent] AFTER appendChild - Tweet ID: ${tweetData.tweetId}, ExpTab ${newParentInfo}, CountInMarker: ${countInMarkerAfter}, CountInContainer: ${countInContainerAfter}`);
                // --- END LOGGING ---
            }

             // --- DETAILED LOGGING ---
             const finalCountInContainer = container.querySelectorAll('.tab-content-container').length;
             // console.log(`[EventHandlers::createMarkerContent] BEFORE return - Tweet ID: ${tweetData.tweetId}, Final CountInContainer: ${finalCountInContainer}`);
             // --- END LOGGING ---

            return container;

        } catch (error) {
            console.error(`[EventHandlers::createMarkerContent] Error for Tweet ID ${tweetData.tweetId}:`, error);
            const errorDiv = document.createElement('div');
            errorDiv.textContent = 'Error loading content.';
            errorDiv.style.color = 'red';
            return errorDiv;
        }
    }

    /**
     * Updates the marker component with new content based on tweet data.
     * Relies on window.markerComponent.
     * @param {object} tweetData - The extracted tweet data.
     */
    async function updateMarker(tweetData) {
        // // console.log('[EventHandlers::updateMarker] Updating marker for tweet:', tweetData?.tweetId);
        // Check dependency
        if (!localServiceContainer) {
            console.error('[EventHandlers::updateMarker] localServiceContainer not available.');
            return;
        }
        const mainMarker = localServiceContainer.get('mainMarkerComponent');

        if (!mainMarker || typeof mainMarker.setContent !== 'function' || typeof mainMarker.show !== 'function') { 
            console.warn('[EventHandlers::updateMarker] mainMarkerComponent or required methods not available from ServiceContainer.');
            return; 
        }
        
        try {
            const content = await createMarkerContent(tweetData); // Added await, calls async local function
            if (content) {
                 mainMarker.setContent(content);
                 mainMarker.show();
                 // // console.log('[EventHandlers::updateMarker] Marker content set and shown.');
            } else {
                console.error('[EventHandlers::updateMarker] Failed to create marker content, cannot update marker.');
                // Optionally hide marker if content creation fails consistently
                // mainMarker.hide();
            }
        } catch (error) { 
            console.error('[EventHandlers::updateMarker] Error updating marker:', error); 
        }
    }

    // --- Initialization --- //

    /**
     * Initializes the event handlers module.
     * Typically called once after core services and stateManager are ready.
     */
    function initializeEventHandlers(serviceContainerInstance) {
        if (serviceContainerInstance) {
            localServiceContainer = serviceContainerInstance;
            // console.log('[EventHandlers] ServiceContainer instance received by initializeEventHandlers.');
        } else {
            console.error('[EventHandlers] ServiceContainer instance NOT provided to initializeEventHandlers!');
            return; // Early exit if no container
        }

        const currentEventManager = localServiceContainer.get('eventManager');
        const currentSM = localServiceContainer.get('stateManager');

        if (currentSM && typeof currentSM.getState === 'function' && currentEventManager) {
            manageEventListeners(currentSM.getState());
            currentEventManager.subscribe('state:visibilityChanged', (data) => {
                manageEventListeners(data.isVisible);
            });
            // console.log('[EventHandlers] Initialized. DOM listeners managed. Subscribed to state:visibilityChanged via container EM & SM.');
        } else {
            let errorMsg = '[EventHandlers] Could not initialize fully: ';
            if (!currentSM || typeof currentSM.getState !== 'function') errorMsg += 'StateManager (or getState) not available from ServiceContainer. ';
            if (!currentEventManager) errorMsg += 'EventManager not available from ServiceContainer.';
            console.error(errorMsg);
        }
    }

    // --- Expose Public API --- //
    window.initializeEventHandlers = initializeEventHandlers;
    // Only expose what's needed externally, minimize global footprint
    // window._mouseoverHandler = _mouseoverHandler; // Probably not needed if attached internally

    // console.log('[EventHandlers] Module context initialized. initializeEventHandlers exposed.');

})(); // End of IIFE
// /* console.log('[EventHandlers] IIFE executed.'); */

