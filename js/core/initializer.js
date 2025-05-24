// vscode/twitter_comment/content/core/initializer.js

// /* console.log('[Initializer] Loading...'); */ // Removed

// Moved Global Variables & Constants from content.js
let marker = null;
let enhancedDataExtractor = null;
let componentFactory = null;
let markerComponent = null;
let eventManager = null;
let serviceContainer = null; // Added for ServiceContainer instance
let aiService = null;
let markerContentManager = null;
let experimentalTabInstance = null;

const SELECTORS = {
    TWEET: 'article[data-testid="tweet"]',
    TWEET_TEXT: '[data-testid="tweetText"]',
    USER_NAME: '[data-testid="User-Name"]',
    TIME: 'time',
    REPLY_COUNT: '[data-testid="reply"]',
    RETWEET_COUNT: '[data-testid="retweet"]',
    LIKE_COUNT: '[data-testid="like"]',
    VIEW_COUNT: 'a[href*="/analytics"]'
};

// Ensure SELECTORS is defined before exposing
// if (typeof SELECTORS === 'object' && SELECTORS !== null) { // Commented out
//     window.SELECTORS = SELECTORS; // Commented out
    // /* console.log('[Initializer] Exposed SELECTORS constant globally.'); */ // Removed
// } else { // Commented out
//     console.error('[Initializer] FATAL: SELECTORS constant is not defined correctly.'); // Keep error
// }

// Moved Helper Initialization Functions from content.js
async function initializeStyles() {
    // /* console.log('[Initializer::Styles] Initializing style manager...'); */ // Removed
    try {
        // REMOVED: StyleManager initialization 
        // // Dependency Check
        // if (!window.StyleManager) {
        //     console.error('[Initializer::Styles] Error: StyleManager class not found on window.');
        //     return null;
        // }
        // 
        // const styleManager = new window.StyleManager();
        // styleManager.initialize(); // Assuming sync or handles async internally

        const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        // Listener for theme changes (only saves preference and publishes event now)
        darkModeMediaQuery.addListener((e) => {
            const newTheme = e.matches ? 'dark' : 'light';
            // console.log(`[Initializer::Styles] System theme changed to: ${newTheme}`); // Removed
            
            // Notify components about theme change
            if (eventManager && typeof eventManager.publish === 'function') {
                eventManager.publish('theme:changed', { theme: newTheme });
            }

            // 如果其他组件确实需要知道系统主题的实时变化，可以保留事件发布
            if (eventManager && typeof eventManager.publish === 'function') {
                eventManager.publish('systemTheme:changed', { systemTheme: newTheme });
            }
        });

        // Check if userTheme already exists in storage
        chrome.storage.sync.get('userTheme', (data) => {
            if (chrome.runtime.lastError) {
                console.warn('[Initializer::Styles] Failed to read theme from storage:', chrome.runtime.lastError.message);
                return; // Don't proceed if reading failed
            }

            // Only set initial theme if it doesn't exist yet
            if (data.userTheme === undefined) {
                const initialTheme = darkModeMediaQuery.matches ? 'dark' : 'light';
                chrome.storage.sync.set({ userTheme: initialTheme }, () => {
                    if (chrome.runtime.lastError) {
                        console.warn('[Initializer::Styles] Failed to save initial theme to storage:', chrome.runtime.lastError.message);
                    } else {
                        // Log that we set the *initial* theme
                        // console.log('[Initializer::Styles] Saved *initial* theme to storage based on system preference:', initialTheme); // Removed
                    }
                });
            } else {
                 // Log that the theme already exists (optional, for debugging)
                 // // console.log('[Initializer::Styles] User theme already set in storage:', data.userTheme); // Removed
            }
        });
        // Function no longer needs to return anything
        // return styleManager;
    } catch(error) {
        console.error('[Initializer::Styles] Error initializing style manager:', error);
        // return null;
    }
}

function initializeDataExtractor() {
    // console.log('[Initializer::DataExtractor] Initializing...'); // Keep or remove logging as preferred
    try {
        // Dependency Check for ServiceContainer
        if (!serviceContainer) {
            console.error('[Initializer::DataExtractor] Error: ServiceContainer instance not available. Ensure createMarker (or equivalent) has run and initialized it.');
            throw new Error('ServiceContainer instance required for EnhancedDataExtractor');
        }

        // Get EnhancedDataExtractor instance from ServiceContainer
        const localEnhancedDataExtractor = serviceContainer.get('enhancedDataExtractor'); // Use a local var first

        if (!localEnhancedDataExtractor) {
             // This implies registration failed or the service wasn't found.
             console.error('[Initializer::DataExtractor] Failed to get EnhancedDataExtractor instance from ServiceContainer. Was it registered?');
             throw new Error('Failed to get EnhancedDataExtractor instance from ServiceContainer');
        }
        
        enhancedDataExtractor = localEnhancedDataExtractor; // Assign to module-scoped variable

        // window.enhancedDataExtractor = enhancedDataExtractor; // Keep exposing globally for now -> REMOVE THIS
        // console.log('[Initializer::DataExtractor] Initialized via ServiceContainer and exposed globally.');
        return enhancedDataExtractor;
    } catch (error) {
        console.error('[Initializer::DataExtractor] Error initializing EnhancedDataExtractor:', error); // Clarify error source
        return null; 
    }
}

async function initializeAIService() {
    // /* console.log('[Initializer::AIService] Starting initialization...'); */ // Removed
    try {
        // Dependency Check for EventManager (should be initialized before this)
        // This check might become redundant if serviceContainer handles dependency resolution correctly.
        if (!eventManager) {
            console.error('[Initializer::AIService] Error: EventManager instance not available. Ensure createMarker runs first and serviceContainer is initialized with it.');
            throw new Error('EventManager instance required for AIService, and should be available via ServiceContainer');
        }
        
        // Dependency Check for ServiceContainer
        if (!serviceContainer) {
            console.error('[Initializer::AIService] Error: ServiceContainer instance not available.');
            throw new Error('ServiceContainer instance required for AIService');
        }

        // Get and initialize AIService instance from ServiceContainer
        // The serviceContainer.initialize method should handle instantiation, dependency injection (eventManager),
        // and calling the service's own .initialize() method.
        const localAiServiceInstance = await serviceContainer.initialize('aiService');

        if (!localAiServiceInstance) {
            throw new Error('Failed to get or initialize AIService instance from ServiceContainer');
        }

        // Assign to the module-scoped variable `aiService`
        aiService = localAiServiceInstance;

        // window.aiService = aiService; // Exposing globally will be addressed later. For now, comment out.
        // /* console.log('[Initializer::AIService] AIService instance obtained and initialized from ServiceContainer.'); */ // Removed

        // Register service with EventManager - This should now be handled by ServiceContainer due to autoRegister: true
        // if (eventManager && typeof eventManager.registerService === 'function') { // Commented out
        //     eventManager.registerService('aiService', aiService); // Commented out
        //     // /* console.log('[Initializer::AIService] Registered with EventManager.'); */ // Removed
        // } else { // Commented out
        //     console.warn('[Initializer::AIService] EventManager or registerService not available for aiService registration.'); // Commented out
        // } // Commented out

        // /* console.log('[Initializer::AIService] Initialization successful.'); */ // Removed
        return aiService;
    } catch (error) {
        console.error('[Initializer::AIService] Initialization failed:', error); // Keep error
        throw error; // Re-throw to be caught by initializeApplication
    }
}

function createMarker() {
     // /* console.log('[Initializer::Marker] Creating Marker and core services...'); */ // Removed
    try {
        // 1. Initialize Event Manager
        if (!EventManager) { // Assume EventManager is globally available due to script load order
            console.error('[Initializer::Marker] Error: EventManager class not found. Check script load order and class definition.');
            throw new Error('EventManager class not found');
        }
        eventManager = new EventManager(); // Use direct constructor
        // window.eventManager = eventManager; // exposing globally will be addressed later
        // /* console.log('[Initializer::Marker] EventManager initialized.'); */ // Removed

        // 1.1 Initialize Service Container
        if (!ServiceContainer) { // Assume ServiceContainer is globally available
            console.error('[Initializer::Marker] Error: ServiceContainer class not found. Check script load order and class definition.');
            throw new Error('ServiceContainer class not found');
        }
        serviceContainer = new ServiceContainer(eventManager); 
        // /* console.log('[Initializer::Marker] ServiceContainer initialized.'); */

        // --- Configure DOMPurify Globally ---
        if (typeof DOMPurify !== 'undefined') {
            DOMPurify.setConfig({
                USE_PROFILES: {html: true}, // Ensure HTML profile is used
                // ADD_TAGS: ['table', 'thead', 'tbody', 'tr', 'th', 'td'], // Example: Allow table elements if your Markdown outputs them
                // ADD_ATTR: ['align'], // Example: Allow 'align' attribute for tables if needed
                // FORBID_TAGS: ['style'], // Example: Explicitly forbid style tags
                // FORBID_ATTR: ['onerror', 'onload'] // Example: Explicitly forbid common XSS vectors in attributes (though defaults are good)
            });
            // console.log('[Initializer::Marker] DOMPurify globally configured.');
        } else {
            console.warn('[Initializer::Marker] DOMPurify library not found. HTML sanitization will not be available.');
        }
        // --- End DOMPurify Configuration ---

        // --- ADDED: Register ROLES_CONFIG and DEFAULT_ROLE_ID ---
        // console.log('[Initializer::Marker] Checking ROLES_CONFIG before registration. Type:', typeof ROLES_CONFIG, 'Value:', JSON.stringify(ROLES_CONFIG));
        // console.log('[Initializer::Marker] Checking DEFAULT_ROLE_ID before registration. Type:', typeof DEFAULT_ROLE_ID, 'Value:', DEFAULT_ROLE_ID);

        if (typeof ROLES_CONFIG !== 'undefined' && Array.isArray(ROLES_CONFIG) && ROLES_CONFIG.length > 0 && typeof DEFAULT_ROLE_ID === 'string' && DEFAULT_ROLE_ID.trim() !== '') {
            serviceContainer.register('rolesConfig', ROLES_CONFIG, { singleton: true });
            serviceContainer.register('defaultRoleID', DEFAULT_ROLE_ID, { singleton: true });
            // console.log('[Initializer::Marker] ROLES_CONFIG and DEFAULT_ROLE_ID registered with ServiceContainer. Values:', JSON.stringify(ROLES_CONFIG), DEFAULT_ROLE_ID);
        } else {
            console.error('[Initializer::Marker] FATAL: ROLES_CONFIG or DEFAULT_ROLE_ID not available or invalid. Check rolesConfig.js load order and definitions.');
            console.error('[Initializer::Marker] ROLES_CONFIG Type:', typeof ROLES_CONFIG, 'Is Array:', Array.isArray(ROLES_CONFIG), 'Length:', ROLES_CONFIG ? ROLES_CONFIG.length : 'N/A');
            console.error('[Initializer::Marker] DEFAULT_ROLE_ID Type:', typeof DEFAULT_ROLE_ID, 'Value:', DEFAULT_ROLE_ID);
        }
        // --- END ADDED ---

        // --- ADDED: Register ANALYZE_BUTTON_CONSTANTS ---
        if (typeof ANALYZE_BUTTON_CONSTANTS !== 'undefined') {
            serviceContainer.register('analyzeButtonConstants', ANALYZE_BUTTON_CONSTANTS, { singleton: true });
            // console.log('[Initializer::Marker] ANALYZE_BUTTON_CONSTANTS registered with ServiceContainer.');
        } else {
            console.error('[Initializer::Marker] FATAL: ANALYZE_BUTTON_CONSTANTS not available. Check analyze-button-constants.js load order and definitions.');
        }
        // --- END ADDED ---

        // 1.2 Register SELECTORS with ServiceContainer
        if (typeof SELECTORS === 'object' && SELECTORS !== null) {
            serviceContainer.register('SELECTORS', SELECTORS, { singleton: true });
            // /* console.log('[Initializer::Marker] SELECTORS registered with ServiceContainer.'); */
        } else {
            console.error('[Initializer::Marker] FATAL: SELECTORS constant is not defined correctly, cannot register with ServiceContainer.'); // Keep error
        }

        // 1.3 Register AIService with ServiceContainer
        if (typeof AIService === 'function') { // Check if AIService constructor is available
            serviceContainer.register('aiService', AIService, {
                singleton: true,
                dependencies: [
                    'eventManager',
                    'rolesConfig',
                    'defaultRoleID',
                    'apiConfigManager'
                ],
                autoRegister: true // Added to ensure ServiceContainer handles registration with EventManager
            });
            // /* console.log('[Initializer::Marker] AIService registered with ServiceContainer.'); */
        } else {
            console.error('[Initializer::Marker] FATAL: AIService class not found, cannot register with ServiceContainer. Check script load order and class definition.'); // Keep error
        }

        // 1.4 Register UIComponentFactory with ServiceContainer
        if (typeof UIComponentFactory === 'function') { // Check if UIComponentFactory constructor is available
            serviceContainer.register('componentFactory', UIComponentFactory, {
                singleton: true
                // Assuming UIComponentFactory constructor takes no arguments or they are optional/handled internally
            });
            // /* console.log('[Initializer::Marker] UIComponentFactory class registered with ServiceContainer.'); */
        } else {
            console.error('[Initializer::Marker] FATAL: UIComponentFactory class not found, cannot register with ServiceContainer.');
            throw new Error('UIComponentFactory class not found for registration');
        }
        
        // ADD EnhancedDataExtractor REGISTRATION HERE:
        if (typeof EnhancedDataExtractor === 'function') {
            serviceContainer.register('enhancedDataExtractor', EnhancedDataExtractor, { 
                singleton: true 
            });
            // console.log('[Initializer::Marker] EnhancedDataExtractor registered with ServiceContainer.');
        } else {
            console.error('[Initializer::Marker] FATAL: EnhancedDataExtractor class not found, cannot register with ServiceContainer. Check script load order and class definition.');
        }
        
        // Get UIComponentFactory instance from ServiceContainer
        // No need to await if UIComponentFactory constructor is synchronous and has no async initialize method
        componentFactory = serviceContainer.get('componentFactory');
        if (!componentFactory) {
            console.error('[Initializer::Marker] FATAL: Failed to get UIComponentFactory instance from ServiceContainer.');
            throw new Error('Failed to get UIComponentFactory from ServiceContainer');
        }
        // /* console.log('[Initializer::Marker] UIComponentFactory instance obtained from ServiceContainer.'); */

        // 2. Initialize Component Factory - This section is now largely handled by the lines above.
        // The original code was:
        // if (!window.UIComponentFactory) {
        //     console.error('[Initializer::Marker] Error: UIComponentFactory class not found on window.');
        //     throw new Error('UIComponentFactory class not found');
        // }
        // componentFactory = new window.UIComponentFactory();
        // window.componentFactory = componentFactory; // Expose globally
        // /* console.log('[Initializer::Marker] UIComponentFactory initialized and exposed.'); */ // Removed

        // 3. Register Components (with checks)
        // /* console.log('[Initializer::Marker] Registering components with factory...'); */ // Removed
        const componentsToRegister = {
            'marker': MarkerComponent,
            'author': AuthorComponent,
            'tab': TabComponent,
            'roleSelector': RoleSelector,
            'analyzeButton': AnalyzeButton,
            'customPromptEditor': CustomPromptEditor,
            'backgroundInfo': BackgroundInfo,
            'roleButton': RoleButton,
            'modal': ModalComponent,
            // Add Tab sub-components
            'tabList': TabListComponent,
            'tabButton': TabButtonComponent,
            'tabPanel': TabPanelComponent,
            // CardFactory is a factory itself, not usually registered as a UI component
            // MetricsSection might not be a standard UIComponent, handle separately if needed
        };
        for (const [name, compClass] of Object.entries(componentsToRegister)) {
            if (compClass) {
                componentFactory.registerComponent(name, compClass);
                
            } else {
                console.warn(`[Initializer::Marker] Component class not found for registration: ${name}`); // Keep warning
            }
        }

        // 4. Create Marker Component instance
        
        
        // --- ADDED: Get eventManager from serviceContainer for MarkerComponent ---
        const eventManagerForMarker = serviceContainer.get('eventManager');
        if (!eventManagerForMarker) {
            console.error('[Initializer::Marker] FATAL: Failed to get EventManager from ServiceContainer for MarkerComponent.');
            throw new Error('Failed to get EventManager from ServiceContainer for MarkerComponent');
        }

        markerComponent = componentFactory.createComponent('marker', {
            cache: true, 
            id: 'main-marker',
            eventManager: eventManagerForMarker // <-- ADDED: Pass eventManager
        });
        if (!markerComponent || !markerComponent.element) {
            throw new Error('Failed to create marker component or its element.');
        }
        // Register the instance with ServiceContainer
        if (serviceContainer && markerComponent) {
            // Assuming ServiceContainer can register already-created instances.
            // If it needs a factory, this approach would need adjustment.
            serviceContainer.register('mainMarkerComponent', markerComponent, { singleton: true });
            console.log('[Initializer::Marker] mainMarkerComponent instance registered with ServiceContainer.');
        } else {
            console.error('[Initializer::Marker] Could not register mainMarkerComponent with ServiceContainer.');
        }
        // window.markerComponent = markerComponent; // MODIFIED - Expose instance globally
        // /* console.log('[Initializer::Marker] Marker component instance created and exposed.'); */ // Removed

        // 5. Add Marker Element to DOM
        document.body.appendChild(markerComponent.element);
        // /* console.log('[Initializer::Marker] Marker element appended to body.'); */ // Removed

        // 6. Register Component Factory with Event Manager
        eventManager.registerService('componentFactory', componentFactory);
        // /* console.log('[Initializer::Marker] ComponentFactory registered with EventManager.'); */ // Removed

        // --- Create and Initialize Global Modal ---
        if (componentFactory && typeof componentFactory.isRegistered === 'function' && componentFactory.isRegistered('modal')) {
            // Ensure singleton: Check if already registered in ServiceContainer first
            let globalModalInstance = serviceContainer.get('globalModalInstance');
            if (!globalModalInstance) { 
                // console.log('[Initializer] Creating global modal instance using factory...'); // Removed
                try {
                    globalModalInstance = componentFactory.createComponent('modal', {
                        // Pass any necessary config here, if ModalComponent expects any
                        // Example: id: 'global-ai-result-modal' (though UIComponent might handle this)
                    });
                    
                    if (!globalModalInstance || !globalModalInstance.element) {
                        throw new Error('Failed to create globalModal or its element via factory.');
                    }
                    
                    // Register with ServiceContainer
                    serviceContainer.register('globalModalInstance', globalModalInstance, { singleton: true });
                    console.log('[Initializer] Global modal instance created and registered with ServiceContainer.');

                    // Append element to body ONCE during init (it's hidden by default)
                    document.body.appendChild(globalModalInstance.element); 
                    // console.log('[Initializer] Global modal instance created via factory and appended to body.'); // Removed
                    
                } catch (error) {
                    console.error('[Initializer] Error creating global modal via factory:', error);
                    // globalModalInstance will remain null or undefined
                }
            } else {
                // console.log('[Initializer] Global modal instance already exists in ServiceContainer.');
            }
            // window.globalModal = globalModalInstance; // MODIFIED - REMOVED
        } else {
            if (!componentFactory) {
                console.error('[Initializer] ComponentFactory not found! Global Modal unavailable.');
            } else if (typeof componentFactory.isRegistered !== 'function') {
                console.error("[Initializer] ComponentFactory.isRegistered is not a function! Global Modal unavailable.");
            } else if (!componentFactory.isRegistered('modal')) {
                console.error("[Initializer] ModalComponent ('modal') is not registered with ComponentFactory! Global Modal unavailable.");
            } else {
                // Fallback, though unlikely if the above are structured correctly
                console.error('[Initializer] Global Modal could not be initialized for an unknown reason.');
            }
        }
        // --- End Global Modal Initialization ---

        // /* console.log('[Initializer::Marker] Marker creation and core services initialization complete.'); */ // Removed

        // 注册 CUSTOM_PROMPT_CONSTANTS (新增)
        // 新的实现方式：调用全局函数 getTwitterCustomPromptConstants()
        if (typeof getTwitterCustomPromptConstants === 'function') {
            const customConstants = getTwitterCustomPromptConstants();
            if (customConstants && typeof customConstants === 'object') {
                serviceContainer.register('customPromptConstants', customConstants, { singleton: true });
                console.log('[Initializer::Marker] customPromptConstants (from getTwitterCustomPromptConstants) registered to service container.');
            } else {
                console.warn('[Initializer::Marker] getTwitterCustomPromptConstants did not return a valid object. Cannot register customPromptConstants.');
                // 可选：注册一个空对象或默认值，以防止消费者出错
                // serviceContainer.register('customPromptConstants', {}, { singleton: true });
            }
        } else {
            console.warn('[Initializer::Marker] getTwitterCustomPromptConstants function not found. Cannot register customPromptConstants.');
            // 可选：注册一个空对象或默认值
            // serviceContainer.register('customPromptConstants', {}, { singleton: true });
        }
        // --- 结束 CUSTOM_PROMPT_CONSTANTS 注册 ---

        // 1.5 Register EnhancedDataExtractor with ServiceContainer
        if (typeof EnhancedDataExtractor === 'function') {
            serviceContainer.register('enhancedDataExtractor', EnhancedDataExtractor, { 
                singleton: true 
            });
            // console.log('[Initializer::Marker] EnhancedDataExtractor registered with ServiceContainer.');
        } else {
            console.error('[Initializer::Marker] FATAL: EnhancedDataExtractor class not found, cannot register with ServiceContainer. Check script load order and class definition.');
        }

    } catch (error) {
         console.error('[Initializer::Marker] Error during createMarker:', error); // Keep error
         throw error; // Re-throw critical errors to stop initialization
    }
}

// Moved DOM Event Handling Logic
function findTweetElement(element) {
    // Dependency check
    if (!serviceContainer) {
        console.error('[Initializer::DOM] ServiceContainer not available for SELECTORS.');
        return null;
    }
    const currentSelectors = serviceContainer.get('SELECTORS');
    if (!currentSelectors || !currentSelectors.TWEET) {
        console.error('[Initializer::DOM] SELECTORS.TWEET constant not available from ServiceContainer.');
        return null;
    }
    return element.closest(currentSelectors.TWEET);
}

// Core Initialization Function (Moved from content.js)
async function initializeApplication() {
    // /* console.log('[Initializer::App] Starting application initialization...'); */ // Removed
    try {
        // 1. Wait for page load
        if (document.readyState !== 'complete') {
            // /* console.log('[Initializer::App] Document not complete, waiting for load event...'); */ // Removed
            // console.log('[Initializer::App] Document not complete, waiting for load event...'); // Removed
            await new Promise(resolve => window.addEventListener('load', resolve, { once: true }));
        }
        // /* console.log('[Initializer::App] Page loaded.'); */ // Removed

        // MOVED createMarker() CALL EARLIER (Step 2)
        // Original Step 4: Create Marker and Core Services (EventManager, ComponentFactory)
        createMarker(); 
        // Check if core services initialized by createMarker are present
        if (!markerComponent || !eventManager || !componentFactory || !serviceContainer) { // Added serviceContainer check
             throw new Error('Core component/service creation failed (Marker, EventManager, ComponentFactory, or ServiceContainer).');
        }

        // MODIFIED: New check based on ServiceContainer and UIComponentFactory registrations
        // /* console.log('[Initializer::App] Checking for critical component/service classes...'); */ // Removed
        const requiredServices = [
            'eventManager', 'SELECTORS', 'aiService', 'componentFactory', 
            'enhancedDataExtractor', 'mainMarkerComponent', 'globalModalInstance',
            'rolesConfig', 'defaultRoleID', 'analyzeButtonConstants' // Removed stateManager and apiConfigManager
        ];
        const missingServices = requiredServices.filter(serviceName => {
            if (!serviceContainer || typeof serviceContainer.has !== 'function') { // MODIFIED to check for .has
                console.error('[Initializer::App] ServiceContainer or serviceContainer.has method is not available for checks.'); // MODIFIED error message
                return true; // Cannot check, assume missing
            }
            return !serviceContainer.has(serviceName); // MODIFIED to use .has
        });

        if (missingServices.length > 0) {
            console.error('[Initializer::App] FATAL: Still missing required class definitions after createMarker():', missingServices);
            throw new Error(`Initialization failed: Missing required classes after createMarker() - ${missingServices.join(', ')}`);
        }
        // /* console.log('[Initializer::App] All required classes seem available on window.'); */ // Removed
        // console.log('[Initializer::App] All required classes seem available on window.'); // Removed

        // Original Step 3. Initialize Styles
        await initializeStyles();

        // Original Step 4 was moved up.

        // --- Register and Initialize StateManager ---
        if (window.stateManagerApiTemp) {
            serviceContainer.register('stateManager', window.stateManagerApiTemp, { singleton: true });
            delete window.stateManagerApiTemp; // Clean up temporary global variable

            const stateManagerInstance = serviceContainer.get('stateManager');
            const eventManagerForSM = serviceContainer.get('eventManager'); // Get EM from container

            if (stateManagerInstance && typeof stateManagerInstance.setEventManager === 'function' && eventManagerForSM) {
                stateManagerInstance.setEventManager(eventManagerForSM);
                // console.log('[Initializer::App] EventManager injected into StateManager (via ServiceContainer).');
                if (typeof stateManagerInstance.initialize === 'function') {
                    await stateManagerInstance.initialize(); // Initialize StateManager
                    // console.log('[Initializer::App] StateManager initialized.');
                }
            } else {
                console.warn('[Initializer::App] Could not inject EventManager into StateManager or initialize it.');
            }
        } else {
            console.warn('[Initializer::App] stateManagerApiTemp not found on window. StateManager setup skipped.');
        }
        // --- END StateManager --- 

        // --- ADDED: Check for StateManager registration --- 
        if (!serviceContainer.has('stateManager')) {
            const errorMsg = 'StateManager was not successfully registered in ServiceContainer after its setup block.';
            console.error('[Initializer::App] FATAL:', errorMsg);
            throw new Error(errorMsg);
        }
        // --- END Check ---

        // --- ApiConfigManager: Register and Inject EventManager ---
        // Assuming ApiConfigManager.js creates window.ApiConfigManager
        if (window.ApiConfigManager) { // ApiConfigManager should now be on window
            serviceContainer.register('apiConfigManager', window.ApiConfigManager, { singleton: true }); 
            // No need to delete window.ApiConfigManager yet, as options.js might still use it.
            const apiConfigManagerInstance = serviceContainer.get('apiConfigManager');
            const eventManagerForACM = serviceContainer.get('eventManager');

            if (apiConfigManagerInstance && typeof apiConfigManagerInstance.setEventManager === 'function' && eventManagerForACM) {
                apiConfigManagerInstance.setEventManager(eventManagerForACM);
                // console.log('[Initializer::App] EventManager injected into ApiConfigManager (via ServiceContainer).');
            } else {
                 console.warn('[Initializer::App] Could not inject EventManager into ApiConfigManager.');
            }
        } else {
            console.warn('[Initializer::App] ApiConfigManager not found on window. Setup skipped.');
        }
        // --- END ApiConfigManager --- 

        // --- ADDED: Check for ApiConfigManager registration --- 
        if (!serviceContainer.has('apiConfigManager')) {
            const errorMsg = 'ApiConfigManager was not successfully registered in ServiceContainer after its setup block.';
            console.error('[Initializer::App] FATAL:', errorMsg);
            throw new Error(errorMsg);
        }
        // --- END Check ---

        // --- MessageHandler Dependencies Injection ---
        if (window.setMessageHandlerDependencies && typeof window.setMessageHandlerDependencies === 'function') {
            const eventManagerForMH = serviceContainer.get('eventManager');
            const apiConfigManagerForMH = serviceContainer.get('apiConfigManager');
            const stateManagerForMH = serviceContainer.get('stateManager');

            if (eventManagerForMH && apiConfigManagerForMH && stateManagerForMH) {
                window.setMessageHandlerDependencies(eventManagerForMH, apiConfigManagerForMH, stateManagerForMH);
                // console.log('[Initializer::App] Dependencies (EM, ACM, SM) injected into MessageHandler.');
                // Consider deleting the global function after use if no longer needed elsewhere
                delete window.setMessageHandlerDependencies;
            } else {
                console.warn('[Initializer::App] Could not retrieve all necessary dependencies (EM, ACM, SM) for MessageHandler.');
            }
        } else {
            console.warn('[Initializer::App] setMessageHandlerDependencies function not found on window. Cannot inject dependencies into MessageHandler.');
        }
        // --- END MessageHandler ---

        // 5. Initialize Data Extractor
        initializeDataExtractor();
        if (!enhancedDataExtractor) {
             throw new Error('Data extractor initialization failed.');
        }
        if (enhancedDataExtractor) {
            eventManager.registerService('dataExtractor', enhancedDataExtractor);
        }
        // /* console.log('[Initializer::App] DataExtractor initialized and registered.'); */ // Removed

        // 6. Initialize AIService (Requires EventManager)
        const aiServiceInstance = await initializeAIService();
        if (!aiServiceInstance) {
             throw new Error('AIService initialization failed.');
        }
        

        // console.log('%c[Initializer::App] Application initialization completed successfully!%c', 'color: green; font-weight: bold;', 'color: inherit;'); // Removed

        // Return success and key instances
        return {
            success: true,
            eventManager: eventManager,
            serviceContainer: serviceContainer,
            markerComponent: markerComponent,
            enhancedDataExtractor: enhancedDataExtractor,
            componentFactory: componentFactory,
            aiService: aiService
            // stateManager will be handled separately or via serviceContainer if applicable
        };

    } catch (error) {
        console.error('%c[Initializer::App] CRITICAL ERROR during application initialization:%c', 'color: red; font-weight: bold;', 'color: inherit;', error); // Keep error
        // TODO: Implement user-facing error message display?
        // Attempt to return initialized core services even on error, if they exist, for potential debugging or partial functionality.
        return { 
            success: false, 
            error: error,
            eventManager: typeof eventManager !== 'undefined' ? eventManager : null,
            serviceContainer: typeof serviceContainer !== 'undefined' ? serviceContainer : null,
            markerComponent: typeof markerComponent !== 'undefined' ? markerComponent : null,
            enhancedDataExtractor: typeof enhancedDataExtractor !== 'undefined' ? enhancedDataExtractor : null,
            componentFactory: typeof componentFactory !== 'undefined' ? componentFactory : null,
            aiService: typeof aiService !== 'undefined' ? aiService : null
        }; 
    }
}

// Expose the main initialization function globally (if needed by content.js)
window.initializeApplication = initializeApplication; // This line IS KEPT for now

