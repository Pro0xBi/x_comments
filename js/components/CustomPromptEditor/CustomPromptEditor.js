// Helper functions (moved outside the class)
function _customPromptDebounce(func, wait) { // Renamed to avoid potential global conflicts
    var timeout;
    return function executedFunction() {
        var context = this;
        var args = arguments;
        var later = function() {
            timeout = null;
            func.apply(context, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function _customPromptShowToast(message, toastDuration) { // Renamed, added toastDuration param
    // Dependency check no longer needed for CUSTOM_PROMPT_CONSTANTS here
    var toast = document.createElement('div');
    toast.className = 'toast custom-prompt-editor-toast'; 
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(function() {
        toast.remove();
    }, toastDuration || 2000); // Use provided duration or default
}

// Class definition inheriting from UIComponent
class CustomPromptEditor extends UIComponent {
    constructor(config = {}) {
        super(config); // Call base class constructor first

        // Extract dependencies from config
        this.aiService = config.aiService;
        this.eventManager = config.eventManager;
        this.CONSTANTS = config.customPromptConstants; // NEW: Get constants from config

        if (!this.CONSTANTS) {
            console.error('[CustomPromptEditor] Constructor Error: customPromptConstants not provided in config. Using empty object as fallback.');
            this.CONSTANTS = {}; // Fallback to prevent errors, though functionality might be impaired
        }

        // Initialize instance properties
        this.systemPromptInput = null;
        this.userPromptInput = null;
        this.isDirty = false;
        this.isLoading = false;

        // Bind event handlers for proper 'this' context and removal
        this._debouncedSystemPromptHandler = _customPromptDebounce(this.handlePromptChange.bind(this), this.CONSTANTS?.DEBOUNCE_DELAY || 500);
        this._debouncedUserPromptHandler = _customPromptDebounce(this.handlePromptChange.bind(this), this.CONSTANTS?.DEBOUNCE_DELAY || 500);
        this._handleContainerClick = this._handleContainerClick.bind(this); // For delegated click

        // Call init (part of the component lifecycle)
        // Ensure init is called AFTER properties are set but BEFORE potential external interaction
        if (typeof this.init === 'function') {
             this.init();
        } else {
             // console.error('[CustomPromptEditor] Init method not found!')
        }
    }

    // Class methods (changed from prototype)
    init() {
        // console.log(`[CustomPromptEditor ${this.componentId}] Initializing...`);

        
        this.render();
        this.setupEventListeners();
        this._loadInitialPrompts();
        // console.log(`[CustomPromptEditor ${this.componentId}] Initialization complete.`);
    }

    render() {
        // console.log(`[CustomPromptEditor ${this.componentId}] Rendering UI...`);
        
        // Ensure this.element exists
        if (!this.element) {
             // console.error(`[CustomPromptEditor ${this.componentId}] this.element not found during render. Check super() call.`);
             return; // Cannot render without root element
        }

        // Create elements (logic mostly the same)
        var systemPromptSection = document.createElement('div');
        systemPromptSection.className = 'prompt-section';
        var systemPromptLabel = document.createElement('div');
        systemPromptLabel.className = 'prompt-label';
        systemPromptLabel.innerHTML = `
            <div class="label-text">
                 <span>角色设定</span>
            </div>
            <div class="prompt-actions">
                <button id="savePrompts-${this.componentId}" class="prompt-btn save-btn" data-tooltip="保存提示词">💾</button> 
            </div>
        `; // Use unique ID for save button
        this.systemPromptInput = document.createElement('textarea');
        this.systemPromptInput.className = 'system-prompt';
        this.systemPromptInput.value = this.CONSTANTS?.DEFAULT_SYSTEM_PROMPT || '';
        systemPromptSection.appendChild(systemPromptLabel);
        systemPromptSection.appendChild(this.systemPromptInput);

        var userPromptSection = document.createElement('div');
        userPromptSection.className = 'prompt-section';
        var userPromptLabel = document.createElement('div');
        userPromptLabel.className = 'prompt-label';
        userPromptLabel.innerHTML = `
            <div class="label-text">
                用户提示模板
                <span class="info-icon" data-tooltip="这里填写的是模板，实际分析时会把推文内容填充进去">ⓘ</span>
            </div>
        `;
        this.userPromptInput = document.createElement('textarea');
        this.userPromptInput.className = 'user-prompt';
        this.userPromptInput.value = this.CONSTANTS?.DEFAULT_USER_PROMPT || '';
        userPromptSection.appendChild(userPromptLabel);
        userPromptSection.appendChild(this.userPromptInput);

        // ADJUST DOM OPERATIONS: Append to this.element instead of this.container
        // Remove clearing of innerHTML as this.element is new
        this.element.appendChild(systemPromptSection);
        this.element.appendChild(userPromptSection);
        
        // console.log(`[CustomPromptEditor ${this.componentId}] UI Rendered.`);
    }

    setupEventListeners() {
        // console.log(`[CustomPromptEditor ${this.componentId}] Setting up event listeners...`);
        // Ensure elements exist before adding listeners
        if (!this.systemPromptInput || !this.userPromptInput || !this.element) {
             // console.error(`[CustomPromptEditor ${this.componentId}] Required elements not found during event setup.`);
             return;
        }

        // Input listeners (attached to specific inputs, logic remains)
        this.addEventListener('input', this._debouncedSystemPromptHandler, this.systemPromptInput);
        this.addEventListener('input', this._debouncedUserPromptHandler, this.userPromptInput);
        
        // ADJUST DOM OPERATIONS: Attach delegated listener to this.element
        this.addEventListener('click', this._handleContainerClick);
        
        // console.log(`[CustomPromptEditor ${this.componentId}] Event listeners set up.`);
    }

    // Delegated click handler (logic remains the same)
    _handleContainerClick(event) {
        // Use unique ID selector or class selector
        const saveButton = event.target.closest('.save-btn'); // Using class selector might be more robust
        if (saveButton) {
            this.handleSave();
        }
    }

    // handlePromptChange method (logic remains the same)
    handlePromptChange() {
        if (!this.isLoading) {
            this.isDirty = true;
        }
    }

    // handleSave method (logic remains the same, uses helper function for toast)
    async handleSave() {
        // console.log(`[CustomPromptEditor ${this.componentId}] handleSave called.`);
        if (this.isLoading) return;
        if (!this.systemPromptInput || !this.userPromptInput) {
            // console.error(`[CustomPromptEditor ${this.componentId}] Input elements not available for saving.`);
            _customPromptShowToast('保存出错：编辑器未初始化', this.CONSTANTS?.TOAST_DURATION); // MODIFIED
            return;
        }
        var systemPrompt = this.systemPromptInput.value.trim();
        var userPrompt = this.userPromptInput.value.trim();
        if (!systemPrompt || !userPrompt) {
            _customPromptShowToast('角色设定和用户提示模板不能为空', this.CONSTANTS?.TOAST_DURATION); // MODIFIED
            return;
        }
        if (!this.aiService || typeof this.aiService.saveToStorage !== 'function'){
            // console.error(`[CustomPromptEditor ${this.componentId}] aiService or saveToStorage method not available.`);
            _customPromptShowToast('保存功能出错', this.CONSTANTS?.TOAST_DURATION); // MODIFIED
            return;
        }
        this.isLoading = true;
        try {
            var result = await this.aiService.saveToStorage({ systemPrompt: systemPrompt, userPrompt: userPrompt });
            if (result && this.eventManager && typeof this.eventManager.publish === 'function') {
                try {
                    this.eventManager.publish('prompts:updated', { systemPrompt: systemPrompt, userPrompt: userPrompt, timestamp: Date.now() });
                } catch (publishError) {
                    // console.error(`[CustomPromptEditor ${this.componentId}] Failed to publish prompts:updated event:`, publishError);
                }
            } else if (result) {
                // console.warn(`[CustomPromptEditor ${this.componentId}] eventManager not available, cannot publish prompts:updated event.`);
            }
            _customPromptShowToast(result ? '提示词保存成功' : '提示词保存失败', this.CONSTANTS?.TOAST_DURATION); // MODIFIED
            this.isDirty = !result;
        } catch (error) {
            // console.error('保存提示词失败:', error);
            _customPromptShowToast('保存失败: ' + error.message, this.CONSTANTS?.TOAST_DURATION); // MODIFIED
        } finally {
            this.isLoading = false;
        }
    }

    // getPrompts method (logic remains the same)
    getPrompts() {
        if (!this.systemPromptInput || !this.userPromptInput) {
             // console.warn(`[CustomPromptEditor ${this.componentId}] Input elements not available in getPrompts.`);
             return { systemPrompt: '', userPrompt: '' };
        }
        return { systemPrompt: this.systemPromptInput.value.trim(), userPrompt: this.userPromptInput.value.trim() };
    }

    // setPrompts method (logic remains the same)
    setPrompts(systemPrompt, userPrompt) {
         if (!this.systemPromptInput || !this.userPromptInput) {
             // console.warn(`[CustomPromptEditor ${this.componentId}] Input elements not available in setPrompts.`);
             return;
        }
       if (systemPrompt !== undefined && systemPrompt !== null) { // Check explicitly for null/undefined
            this.systemPromptInput.value = systemPrompt;
        }
        if (userPrompt !== undefined && userPrompt !== null) {
            this.userPromptInput.value = userPrompt;
        }
        this.isDirty = false;
    }

    // _loadInitialPrompts method (logic remains the same, uses helper function for toast)
    async _loadInitialPrompts() {
        // console.log(`[CustomPromptEditor ${this.componentId}] Loading initial prompts...`);
        if (!this.aiService || typeof this.aiService.loadFromStorage !== 'function') {
             // console.error(`[CustomPromptEditor ${this.componentId}] aiService or loadFromStorage not available for initial load.`);
             return;
        }
        try {
            const data = await this.aiService.loadFromStorage();
            if (data && data.systemPrompt !== undefined && data.userPrompt !== undefined) { // Check existence
                this.setPrompts(data.systemPrompt, data.userPrompt);
                // console.log(`[CustomPromptEditor ${this.componentId}] Initial prompts loaded successfully.`);
            } else {
                 // console.log(`[CustomPromptEditor ${this.componentId}] No saved prompts found or data invalid.`);
            }
        } catch (error) {
             // console.error(`[CustomPromptEditor ${this.componentId}] Error loading initial prompts:`, error);
             _customPromptShowToast('加载已存提示词失败', this.CONSTANTS?.TOAST_DURATION); // MODIFIED
        }
    }

    // destroy method (updated for class structure)
    destroy() {
        // console.log(`[CustomPromptEditor ${this.componentId}] Destroying component...`);
        // Remove specific event listeners first
        this.removeEventListener('input', this._debouncedSystemPromptHandler, this.systemPromptInput);
        this.removeEventListener('input', this._debouncedUserPromptHandler, this.userPromptInput);
        this.removeEventListener('click', this._handleContainerClick);

        
        if (super.destroy && typeof super.destroy === 'function') {
            super.destroy();
        }

        // Nullify references to help GC and prevent memory leaks
        this.aiService = null;
        this.eventManager = null;
        this.systemPromptInput = null;
        this.userPromptInput = null;
        this._debouncedSystemPromptHandler = null; // Nullify bound handlers
        this._debouncedUserPromptHandler = null;
        this._handleContainerClick = null;

        // console.log(`[CustomPromptEditor ${this.componentId}] Component destroyed.`);
    }
}
