/**
 * 分析按钮组件
 * 用于触发推文分析功能
 */

// Utility function for debounce
function debounce(func, wait) {
    var timeout;
    return function() {
        var context = this;
        var args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(function() {
            func.apply(context, args);
        }, wait);
    };
}

class AnalyzeButton extends UIComponent {
    constructor(config) {
        const analyzeButtonConstants = config.analyzeButtonConstants;
        if (!analyzeButtonConstants) {
            // This is a critical dependency. UIComponentFactory must inject this.
           
            throw new Error('analyzeButtonConstants (from config) not provided.');
        }        

        // 2. Determine mode and initialState using analyzeButtonConstants (not this.CONSTANTS yet)
        const mode = config.mode || analyzeButtonConstants.MODES.PRESET;
        const initialState = analyzeButtonConstants.STATES.WAITING_DATA;
        
        const finalConfig = {
            ...config,
            mode: mode,
            state: initialState,
            // eventManager and aiService are expected to be in config already
        };
       
        super(finalConfig);
        
        // Now assign to this.CONSTANTS after super()
        this.CONSTANTS = analyzeButtonConstants;
        
       
        this.mode = finalConfig.mode; // or mode from above
        this.state = initialState; // or initialState from above
        
        this.eventManager = finalConfig.eventManager;
        this.aiService = config.aiService;
        // console.log('[AnalyzeButton constructor] this.aiService after assignment:', this.aiService);

        this.resultContainer = config.resultContainer;
        this.getRoleSelector = config.getRoleSelector;
        this.getCustomPromptEditor = config.getCustomPromptEditor; // Added for custom mode
        this.globalModal = config.globalModal; // ADDED: Store injected globalModal instance
        this.latestAnalysisResult = null;
        this.latestAnalysisOriginalTweet = null;
        this.latestTweetData = null;
        
        if (!this.aiService) {
            
        } else if (typeof this.aiService.hasActiveConfig !== 'function') {
           
            
        } else {
            // console.log('[AnalyzeButton constructor] AIService IS available and \\'hasActiveConfig\\' IS a function.');
        }
        
        // Bind methods
        this.handleClick = this.handleClick.bind(this);
        this.updateButtonText = this.updateButtonText.bind(this);
        this.setState = this.setState.bind(this);
        this.setMode = this.setMode.bind(this);
        this.analyze = this.analyze.bind(this);
        this.showError = this.showError.bind(this);
        this.showSuccess = this.showSuccess.bind(this);
        this.onTweetDataUpdate = this.onTweetDataUpdate.bind(this);
        this._subscribeToEvents = this._subscribeToEvents.bind(this);
        this._handleAnalysisStarted = this._handleAnalysisStarted.bind(this);
        this._handleAnalysisCompleted = this._handleAnalysisCompleted.bind(this);
        this._handleAnalysisError = this._handleAnalysisError.bind(this);
        this._checkApiConfigState = this._checkApiConfigState.bind(this);
        this._handleConfigUpdated = this._handleConfigUpdated.bind(this);

        this._subscribeToEvents(); 

        if (typeof this.initialize === 'function') {
            this.initialize();
        } else {
            console.warn(`[AnalyzeButton constructor (${this.mode})] initialize method not found on component, though it should exist.`);
        }
    }
    
    initialize() {
        this.element = document.createElement('button');
        this.element.className = this.CONSTANTS.CLASSES.BASE; // USE this.CONSTANTS
        
        this.element.classList.add(
            this.mode === this.CONSTANTS.MODES.PRESET // USE this.CONSTANTS
                ? this.CONSTANTS.CLASSES.PRESET_MODE // USE this.CONSTANTS
                : this.CONSTANTS.CLASSES.CUSTOM_MODE // USE this.CONSTANTS
        );
        
        // Set inner HTML with text and spinner spans
        this.element.innerHTML = `
            <span class="button-text"></span> 
            <span class="spinner"></span> 
        `;

        this.element.addEventListener('click', (e) => {
            try {
                this.handleClick(e);
            } catch (error) {
               
            }
        });
        
        // Set initial text using the new structure
        this.updateButtonText();
        
        // 初始化结果容器
        this.initializeResultContainer();

        // 添加 data-tweet-id 属性，用于事件匹配
        this.element.dataset.tweetId = ''; // 初始为空

        // 设置初始状态和文本 (构造函数已设为 WAITING_DATA)
        this.setState(this.state); // 应用初始状态样式和禁用
        this.updateButtonText(); // 更新初始文本

        // 检查初始 API 配置状态
        this._checkApiConfigState();

        // 确保调用 render 来添加到容器
        this.render();
    }
    
    render() {
        // 检查是否有容器和元素
        if (!this.config.container || !this.element) {
            return;
        }
        
        // 检查元素是否已经在容器中
        if (!this.element.parentNode) {
            // 将按钮添加到容器
            this.config.container.appendChild(this.element);
        }
    }
    
    updateButtonText() {
        // const { STATES, TEXT, MODES } = window.ANALYZE_BUTTON_CONSTANTS; // OLD
        const { STATES, TEXT, MODES } = this.CONSTANTS; // NEW - Already correct in provided snippet
        let text = '';

        

        // 优先处理 LOADING 状态
        if (this.state === STATES.LOADING) {
            const textSpan = this.element.querySelector('.button-text');
            if (textSpan) textSpan.textContent = '分析中...'; // Directly set loading text
           
            return;
        }

        switch (this.state) {
            case STATES.ERROR:
                text = TEXT.ERROR;
                break;
            case STATES.SUCCESS:
                text = this.mode === MODES.PRESET ? TEXT.SUCCESS_PRESET : TEXT.SUCCESS_CUSTOM;
                break;
            case STATES.DISABLED:
                text = TEXT.DISABLED;
                break;
            case STATES.NO_CONFIG:
                text = TEXT.NO_CONFIG;
                break;
            case STATES.WAITING_DATA:
                text = TEXT.WAITING_DATA;
                break;
            case STATES.READY: // Added explicit case for READY
                text = this.mode === MODES.PRESET ? TEXT.PRESET : TEXT.CUSTOM;
             
                break;
            case STATES.IDLE:
            default:
                text = this.mode === MODES.PRESET ? TEXT.PRESET : TEXT.CUSTOM;
                
                break;
        }
        
       
        
        // Update only the text span's content
        const textSpan = this.element.querySelector('.button-text');
        if (textSpan) {
             textSpan.textContent = text;
        } else {
             // console.warn(`[AnalyzeButton ${this.mode}] .button-text span not found.`);
             this.element.textContent = text;
        }
    }
    
    setState(newState) {
        // const { STATES, CLASSES, TEXT, MODES } = window.ANALYZE_BUTTON_CONSTANTS; // OLD
        const { STATES, CLASSES, TEXT, MODES } = this.CONSTANTS; // NEW - Already correct in provided snippet
        const CONFIG_LINK_CLASS = 'analyze-config-link'; // Class for the config link

       

        // --- Helper function to remove the config link ---
        const removeConfigLink = () => {
            if (this.element?.parentNode) {
                const existingLink = this.element.parentNode.querySelector(`.${CONFIG_LINK_CLASS}`);
                if (existingLink) {
                    existingLink.remove();
                }
            }
        };
        // --- End helper ---

        // 如果状态未改变，则不执行任何操作
        if (this.state === newState) {
            
            return;
        }

        Object.values(CLASSES).forEach(className => {
            if (className && className !== CLASSES.BASE && className !== CLASSES.PRESET_MODE && className !== CLASSES.CUSTOM_MODE) {
                this.element.classList.remove(className);
            }
        });
        this.element.classList.remove('is-loading');
        this.element.disabled = false; // 默认启用，下面根据状态禁用

        // --- Remove config link by default, add back if needed ---
        removeConfigLink();
        // --- End --- 

        let stateClassName = 'unknown-state-class'; // For logging

        switch (newState) {
            case STATES.LOADING:
              
                stateClassName = CLASSES.LOADING;
                this.element.classList.add(CLASSES.LOADING, 'is-loading');
                this.element.disabled = true;
                break;
            case STATES.ERROR:
               
                stateClassName = CLASSES.ERROR;
                this.element.classList.add(CLASSES.ERROR);
                break;
            case STATES.SUCCESS:
            
                stateClassName = CLASSES.SUCCESS;
                this.element.classList.add(CLASSES.SUCCESS);
                break;
            case STATES.DISABLED:
            
                stateClassName = CLASSES.DISABLED;
                this.element.classList.add(CLASSES.DISABLED);
                this.element.disabled = true;
                break;
            case STATES.NO_CONFIG:
              
                stateClassName = CLASSES.NO_CONFIG;
                this.element.classList.add(CLASSES.NO_CONFIG);
                this.element.disabled = true; // <--- 确保按钮被禁用
                
                // --- Add the config link --- 
                if (this.element?.parentNode) { // Ensure button is in DOM
                    if (!this.element.parentNode.querySelector(`.${CONFIG_LINK_CLASS}`)) {
                        const linkElement = document.createElement('span'); // Use span, act like a link
                        linkElement.className = CONFIG_LINK_CLASS;
                        linkElement.textContent = '去配置';
                        linkElement.style.color = 'rgb(29, 155, 240)'; // Twitter blue
                        linkElement.style.fontSize = '13px';
                        linkElement.style.marginLeft = '8px';
                        linkElement.style.cursor = 'pointer';
                        linkElement.style.verticalAlign = 'middle'; // Align with button text
                        linkElement.addEventListener('click', (e) => {
                            e.stopPropagation(); // Prevent potential parent clicks
                            try {
                                // --- 发送消息给后台脚本 --- 
                                chrome.runtime.sendMessage({ action: "openOptionsPage" });
                                // --- 结束发送 --- 
                            } catch (err) {
                                console.error("Failed to send openOptionsPage message:", err);
                            }
                        });
                        this.element.parentNode.insertBefore(linkElement, this.element.nextSibling);
                    }
                }
                // --- End add link ---
                break;
            case STATES.READY:
               
                stateClassName = 'state-ready';
                this.element.disabled = false;
                break;
            case STATES.WAITING_DATA:
                this.element.classList.add(CLASSES.WAITING_DATA);
                this.element.disabled = true;
                break;
            case STATES.IDLE:
            default:
              
                this.element.disabled = false;
                break;
        }

        this.state = newState;
       

        // Update button text AFTER state and classes are set
        
        this.updateButtonText();
      
    }
    
    setMode(newMode) {
        // const { MODES, CLASSES } = window.ANALYZE_BUTTON_CONSTANTS; // OLD
        const { MODES, CLASSES } = this.CONSTANTS; // NEW
        
        // 移除所有模式相关的类
        this.element.classList.remove(CLASSES.PRESET_MODE, CLASSES.CUSTOM_MODE);
        
        // 添加新模式的类
        this.element.classList.add(
            newMode === MODES.PRESET ? CLASSES.PRESET_MODE : CLASSES.CUSTOM_MODE
        );
        
        this.mode = newMode;
        this.updateButtonText();
    }
    
    onTweetDataUpdate(newData) {
       
        const previousTweetId = this.latestTweetData?.tweetId;
        this.latestTweetData = newData;
       

        if (this.element && newData?.tweetId) {
            this.element.dataset.tweetId = newData.tweetId;
        }

        if (newData?.tweetId !== previousTweetId) {
            // MODIFIED: Check lock status via AIService
            let analysisInProgress = false;
            if (this.aiService && typeof this.aiService.isAnalysisLocked === 'function') {
                analysisInProgress = this.aiService.isAnalysisLocked();
            }

            if (analysisInProgress) { 
                this.setState(this.CONSTANTS.STATES.LOADING);
                return;
            } else {
                this.setState(this.CONSTANTS.STATES.WAITING_DATA);
            }
        }

        const isApiConfigured = this._checkApiConfigState();

        if (isApiConfigured &&
            (this.state === this.CONSTANTS.STATES.WAITING_DATA ||
             this.state === this.CONSTANTS.STATES.NO_CONFIG))    
        {
            // MODIFIED: Check lock status again before setting to IDLE
            let analysisInProgress = false;
            if (this.aiService && typeof this.aiService.isAnalysisLocked === 'function') {
                analysisInProgress = this.aiService.isAnalysisLocked();
            }
            if (this.state !== this.CONSTANTS.STATES.LOADING && !analysisInProgress) { 
                this.setState(this.CONSTANTS.STATES.IDLE);      
            }
        }
    }
    
    handleClick() {
        // const { STATES } = window.ANALYZE_BUTTON_CONSTANTS; // OLD
        const { STATES } = this.CONSTANTS; // NEW
        try {
            // 处理 NO_CONFIG 状态点击
            if (this.state === STATES.NO_CONFIG) {
                chrome.runtime.sendMessage({ action: "openOptionsPage" });
                return;
            }

            // 检查是否处于可分析状态 (IDLE, ERROR, SUCCESS - 允许从错误或成功状态重新分析)
            if (this.state !== STATES.IDLE && this.state !== STATES.ERROR && this.state !== STATES.SUCCESS) {
                // console.warn(`[AnalyzeButton ${this.mode}] Clicked in non-analyzable state: ${this.state}`);
                return;
            }

            // --- ADDED CHECK --- 
            // 新增检查：如果API未配置，则不尝试分析，直接设置为NO_CONFIG
            if (this.aiService && typeof this.aiService.hasActiveConfig === 'function' && !this.aiService.hasActiveConfig()) {
                this.log('handleClick: API not configured, setting state to NO_CONFIG and aborting analysis attempt.');
                this.setState(this.CONSTANTS.STATES.NO_CONFIG);
                return;
            }
            // --- END ADDED CHECK ---

            // 检查数据
            if (!this.latestTweetData || !this.latestTweetData.tweetId) {
                // console.warn('[AnalyzeButton handleClick] No valid tweet data available yet.');
                this.showError('请先将鼠标悬停在推文上');
                this.setState(STATES.ERROR); // 进入错误状态
                return;
            }

            // --- ADDED: Clear and hide result container before starting analysis ---
            this.clearResults();
            if (this.resultContainer) {
                this.resultContainer.style.display = 'none';
                this.resultContainer.classList.remove('visible');
            }
            // --- END ADDED ---

            this.analyze(this.latestTweetData);
        } catch (error) {
            console.error('[AnalyzeButton] Error in click handler:', error);
            this.showError(error.message);
            this.setState(STATES.ERROR);
        }
    }
    
    initializeResultContainer() {

    }
    
    clearResults() {
        if (this.resultContainer) {
             while (this.resultContainer.firstChild) {
                 this.resultContainer.removeChild(this.resultContainer.firstChild);
             }
         } else {
              // console.warn(`[AnalyzeButton ${this.mode}] Result container not found for clearing.`);
         }
     }
    
    showErrorInResult(message) {
        this.clearResults(); // Clear first
        if (this.resultContainer) {
            // Create the structure using the defined CSS classes
            const errorContainer = document.createElement('div');
            errorContainer.className = 'error-container';
            
            const errorIcon = document.createElement('div');
            errorIcon.className = 'error-icon';
            errorIcon.textContent = '!'; // Simple exclamation mark icon
            
            const errorMessage = document.createElement('div');
            errorMessage.className = 'error-message';
            // Sanitize or process the message if needed, for now just use textContent
            errorMessage.textContent = message || '发生未知错误'; // Provide a default message
            
            // Assemble the structure
            errorContainer.appendChild(errorIcon);
            errorContainer.appendChild(errorMessage);
            
            // Add to the result container
            this.resultContainer.appendChild(errorContainer);
        } else {
             // console.warn(`[AnalyzeButton ${this.mode}] Result container not found for showing error.`);
        }
    }
    
    async analyze(tweetData) {
        const { STATES } = this.CONSTANTS;

      

        if (!this.aiService || typeof this.aiService.analyze !== 'function') {
           
            this.showError('分析服务不可用');
            this.setState(STATES.ERROR);
            return;
        }

        if (!tweetData) {
         
            this.showError('缺少推文数据');
            this.setState(STATES.ERROR);
            return;
        }
        
       
        this.setState(STATES.LOADING);
       
        
        try {
            
            let backgroundInfo = ''; // Default to empty string
            if (this.mode === this.CONSTANTS.MODES.PRESET) {
                if (typeof this.getRoleSelector === 'function') {
                    const roleSelectorInstance = this.getRoleSelector();
                    if (roleSelectorInstance && typeof roleSelectorInstance.getBackgroundInfo === 'function') {
                        try {
                            backgroundInfo = roleSelectorInstance.getBackgroundInfo(); // 使用新的方法获取背景信息
                        } catch (error) {
                            // 保持 backgroundInfo 为空字符串
                        }
                    } else {
                        
                    }
                } else {
                 
                }
            }


            
            let analysisOptions = {}; // Default empty options

            if (this.mode === this.CONSTANTS.MODES.CUSTOM) {
                // 1. Get the editor instance safely
                let editor = null;
                if (typeof this.getCustomPromptEditor === 'function') {
                    try {
                        editor = this.getCustomPromptEditor();
                    } catch (editorError) {
                         throw new Error('获取自定义提示词编辑器失败'); 
                    }
                }

                if (!editor || typeof editor.getPrompts !== 'function') {
                    throw new Error('无法获取自定义提示词编辑器实例或方法'); // Re-throw
                }

                // 2. Get live prompts from the editor
                let livePrompts = null;
                try {
                   livePrompts = editor.getPrompts(); 
                } catch (getPromptsError) {
                    throw new Error('获取编辑器提示词时出错'); // Re-throw
                }

                // 3. Validate prompts (string type AND non-empty)
                if (!livePrompts || 
                    typeof livePrompts.systemPrompt !== 'string' || 
                    typeof livePrompts.userPrompt !== 'string' ||
                    !livePrompts.systemPrompt.trim() || // ADDED non-empty check
                    !livePrompts.userPrompt.trim()) {   // ADDED non-empty check
                     throw new Error('自定义模式下，角色设定和用户提示模板不能为空。请填写后重试。'); 
                }

                // 4. Prepare options for analyze
                analysisOptions = {
                    customSystemPrompt: livePrompts.systemPrompt, // Uses trimmed value from getPrompts
                    customUserPrompt: livePrompts.userPrompt
                };

            } else {
                // Preset mode - no extra options needed, use empty object for options
            }
            // --- Fetch live prompts in custom mode --- End
            
            // 5. Call analyze with the potentially populated options AND the fetched backgroundInfo
            console.log(`[AnalyzeButton analyze (${this.mode})] STEP 2: About to call AIService.analyze. Tweet ID: ${tweetData?.tweetId}`); // ADDED
            const result = await this.aiService.analyze(
                tweetData, 
                this.mode, 
                backgroundInfo,
                analysisOptions,
                (progress) => { /* console.log('Progress:', progress); */ } // Optional progress handler
            );
           
             this.eventManager.publish('ai:analysis:completed', { 
                 tweetId: tweetData.tweetId, 
                 result: result, 
                 originalTweet: tweetData, // <-- ADDED ORIGINAL TWEET DATA
                 sourceComponent: this,
                 analysisType: this.mode // <--- 新增：传递 analysisType
             });
           

        } catch (error) {
           
             this.latestAnalysisResult = null;
             this.latestAnalysisOriginalTweet = null;

             const errorToSend = error instanceof Error ? error : new Error(String(error));

            
             this.eventManager.publish('ai:analysis:error', { 
                 tweetId: tweetData.tweetId, 
                 error: { message: errorToSend.message, name: errorToSend.name },
                 sourceComponent: this 
             });
            
        }
    }
    
    showError(message) {
       
       
    }
    
    showSuccess() {
      
    }
    
    destroy() {
        // --- Remove config link on destroy --- 
        const CONFIG_LINK_CLASS = 'analyze-config-link';
         if (this.element?.parentNode) {
            const existingLink = this.element.parentNode.querySelector(`.${CONFIG_LINK_CLASS}`);
            if (existingLink) {
                existingLink.remove();
            }
        }
        // --- End remove link --- 

        if (this.eventManager) {
             try {
                 this.eventManager.unsubscribe('ai:analysis:started', this._handleAnalysisStarted);
                 this.eventManager.unsubscribe('ai:analysis:completed', this._handleAnalysisCompleted);
                 this.eventManager.unsubscribe('ai:analysis:error', this._handleAnalysisError);
                 this.eventManager.unsubscribe('data:tweetExtracted', this.onTweetDataUpdate);
                 this.eventManager.unsubscribe('config:updated', this._handleConfigUpdated);
             } catch (error) {
           
             }
        }

        if (this.element) {
            this.element.removeEventListener('click', this.handleClick);
            this.element.remove();
        }
    }

    createResultContainer() {
        const container = document.createElement('div');
        container.className = 'analyze-result-container';

        // 添加Logo容器
        const logoContainer = document.createElement('div');
        logoContainer.className = 'result-logo-container';
        logoContainer.title = 'AI Assistant';
        
        // 使用实际的logo图片
        const logoImg = document.createElement('img');
        logoImg.src = chrome.runtime.getURL('plugin/twitter_comment/icons/icon48.png');
        logoImg.className = 'result-logo';
        logoContainer.appendChild(logoImg);

        container.appendChild(logoContainer);
        return container;
    }

    updateTweetData(data) {
        if (!data) return;
        this.latestTweetData = data;
        this.setState(this.CONSTANTS.STATES.PRESET);
    }

    // Modify event subscription
    _subscribeToEvents() {
        // const { STATES } = window.ANALYZE_BUTTON_CONSTANTS; // OLD
        const { STATES } = this.CONSTANTS; // NEW - Already correct in provided snippet
        if (!this.eventManager) {
            // console.warn(`[AnalyzeButton ${this.mode}] EventManager not available, cannot subscribe to events.`);
            return;
        }
        try {
            // Subscribe to AI events
            this.analysisStartedUnsubscribe = this.eventManager.subscribe('ai:analysis:started', this._handleAnalysisStarted);
            this.analysisCompletedUnsubscribe = this.eventManager.subscribe('ai:analysis:completed', this._handleAnalysisCompleted);
            this.analysisErrorUnsubscribe = this.eventManager.subscribe('ai:analysis:error', this._handleAnalysisError);
            // --- ADDED: Subscribe to data event --- 
            this.tweetSelectedUnsubscribe = this.eventManager.subscribe('tweet:selected', this.onTweetDataUpdate);

            // + 订阅 API 配置更新事件
            this.configUpdatedUnsubscribe = this.eventManager.subscribe('config:updated', this._handleConfigUpdated);

        } catch (error) {
            
        }
    }

    // Modify event handlers
    _handleAnalysisStarted(eventData) {
        if (this.element && this.element.style.display === 'none') {
             return; 
        }

        

        if (eventData?.tweetId && this.latestTweetData?.tweetId === eventData.tweetId) {
            if (this.state !== this.CONSTANTS.STATES.LOADING) {
               
                 this.setState(this.CONSTANTS.STATES.LOADING);
                 
            }
        } else {
            
        }
    }

    _handleAnalysisCompleted(eventData) {
     

        if (!eventData || !eventData.result) {
          
            this.setState(this.CONSTANTS.STATES.ERROR);
            this.showErrorInResult('分析结果无效。');
            return;
        }
      
        const { result, originalTweet, tweetId, analysisType, sourceComponent } = eventData;

        if (this.latestTweetData && tweetId !== this.latestTweetData.tweetId) { 
     
            return;
        }
       

        if (this.mode !== analysisType) {
          
            return;
        }
     

        this.latestAnalysisResult = result;
        this.latestAnalysisOriginalTweet = originalTweet;
    
        this.setState(this.CONSTANTS.STATES.SUCCESS);
     

        // --- BEGIN PREVIEW LOGIC ---
        this.clearResults(); // Clear previous content from resultContainer

        if (!this.resultContainer) {
         
            return;
        }

        // Create preview text element
        const previewTextElement = document.createElement('div');
        previewTextElement.className = 'ai-result-preview-text';
        // Simple preview: first 10 chars. Customize as needed.
        const previewText = result.length > 10 ? result.substring(0, 10) + '...' : result;
        
        // NEW CODE with DOMPurify:
        if (typeof DOMPurify !== 'undefined' && typeof window.SimpleMarkdown !== 'undefined' && typeof window.SimpleMarkdown.parse === 'function') {
            try {
                const dirtyHtml = window.SimpleMarkdown.parse(previewText);
                previewTextElement.innerHTML = DOMPurify.sanitize(dirtyHtml);
            } catch (e) {
                console.error('[AnalyzeButton] Error parsing Markdown or sanitizing HTML for preview:', e);
                previewTextElement.textContent = previewText; // Fallback to textContent
            }
        } else {
            console.warn('[AnalyzeButton] DOMPurify or SimpleMarkdown not available for preview rendering.');
            previewTextElement.textContent = previewText; // Fallback to textContent
        }
        
        this.resultContainer.appendChild(previewTextElement);

        const viewMoreButton = document.createElement('button');
        viewMoreButton.textContent = '查看完整结果';
        viewMoreButton.className = 'view-full-result-button';
        viewMoreButton.addEventListener('click', () => {
            this.showFullModal(result, originalTweet, analysisType);
        });
        this.resultContainer.appendChild(viewMoreButton);

        this.resultContainer.style.display = ''; 
        this.resultContainer.classList.add('visible');

     
        // --- END PREVIEW LOGIC ---
    }

    // Helper function to show the full modal (extracted from previous _handleAnalysisCompleted)
    showFullModal(resultText, originalTweetData, currentAnalysisType) {
        const esc = typeof escapeHtml === 'function' ? escapeHtml : (text) => text; // Basic fallback if escapeHtml is missing

        let finalModalContent;
        if (typeof DOMPurify !== 'undefined' && typeof window.SimpleMarkdown !== 'undefined' && typeof window.SimpleMarkdown.parse === 'function') {
            try {
                const dirtyHtml = window.SimpleMarkdown.parse(resultText);
                finalModalContent = DOMPurify.sanitize(dirtyHtml);
            } catch (e) {
                console.error('[AnalyzeButton] Error parsing Markdown or sanitizing HTML for modal:', e);
                const fallbackAiText = esc(resultText);
                finalModalContent = `<p><i>AI结果解析或净化出错，显示原始文本:</i></p><pre style="white-space: pre-wrap; word-wrap: break-word;">${fallbackAiText}</pre>`;
            }
        } else {
            console.warn('[AnalyzeButton] DOMPurify or SimpleMarkdown not available for modal rendering.');
            const safeResultText = esc(resultText);
            finalModalContent = `<p><i>警告: Markdown处理或净化工具不可用。</i></p><pre style="white-space: pre-wrap; word-wrap: break-word;">${safeResultText}</pre>`;
        }

        if (this.globalModal && 
            typeof this.globalModal.setContent === 'function' && 
            typeof this.globalModal.show === 'function') {
            
            this.globalModal.setContent(finalModalContent); // Only AI result is set
            this.globalModal.show();
        } else {
            // console.error("[AnalyzeButton] Global modal not available or setContent/show not functions.");
        }
    }

    _handleAnalysisError(eventData) {
      
        if (this.element && this.element.style.display === 'none') {
             
             return;
        }

        const isSourceThisButton = eventData?.sourceComponent === this;
    

         if (!isSourceThisButton) {
         
             return;
         }
        
        const error = eventData?.error;
        const errorMessage = error?.message || '分析失败，请重试';
      

        try {
            this.showErrorInResult(errorMessage);

             if (this.resultContainer) {
                 this.resultContainer.classList.add('visible');
                 this.resultContainer.style.display = ''; // Make sure it's visible for error
             }

            let analysisInProgress = false;
            if (this.aiService && typeof this.aiService.isAnalysisLocked === 'function') {
                analysisInProgress = this.aiService.isAnalysisLocked();
            }
         

            if (this.element && this.element.style.display !== 'none' && 
                eventData?.tweetId === this.latestTweetData?.tweetId && 
                !analysisInProgress) 
            {
            
                this.setState(this.CONSTANTS.STATES.ERROR);
             
            } else if (this.element && this.element.style.display !== 'none' && 
                eventData?.tweetId !== this.latestTweetData?.tweetId && 
                !analysisInProgress) 
            {
           
                this._resetStateAfterExternalAnalysis();
            } else {
           
            }

        } catch (displayError) {
          
            if (this.latestTweetData && eventData.tweetId === this.latestTweetData.tweetId) {
       
                this.setState(this.CONSTANTS.STATES.ERROR);
      
            }
        }
    }

    // + 添加 API 状态检查辅助方法
    _checkApiConfigState() {
        const { STATES } = this.CONSTANTS;
      

        if (this.aiService && typeof this.aiService.hasActiveConfig === 'function') {
            const isConfigured = this.aiService.hasActiveConfig();
         

            if (!isConfigured) { 
                if (this.state !== STATES.LOADING) {
            
                    this.setState(STATES.NO_CONFIG);
                }
                return false; // 未配置
            }
            // API 已配置
            // 只有当 LATEST_TWEET_DATA 也存在时，才设为 IDLE
            if (this.latestTweetData?.tweetId) {
             
                this.setState(this.CONSTANTS.STATES.IDLE);
            } else {
                // 如果 API 已配置，但还没有推文数据，则保持/设置为 WAITING_DATA
             
                this.setState(this.CONSTANTS.STATES.WAITING_DATA);
            }
            return true; // 已配置
        } else {
           
            if (this.state !== STATES.LOADING) {
                 this.setState(STATES.DISABLED); // 使用已有的 DISABLED 状态
            }
            return false;
        }
    }

    // + 添加处理 config:updated 事件的方法
    _handleConfigUpdated(eventData) {
        // 重新检查 API 配置状态
        const isConfigured = this._checkApiConfigState();

        // 如果 API 刚变为已配置，并且按钮之前是 NO_CONFIG 状态，
        // 则将其转换为 WAITING_DATA 状态（因为我们还需要等待新的推文数据）
        if (isConfigured && this.state === this.CONSTANTS.STATES.NO_CONFIG) {
             this.setState(this.CONSTANTS.STATES.WAITING_DATA);
             // 注意: onTweetDataUpdate 会在稍后数据到达时将其变为 IDLE
        }
        // 如果 API 变为未配置，_checkApiConfigState() 内部已处理，会设为 NO_CONFIG
    }

    // +++ Add helper to reset state after an external analysis finishes +++
    _resetStateAfterExternalAnalysis() {
        const { STATES } = this.CONSTANTS;
        this.setState(STATES.WAITING_DATA);
        const isConfigured = this._checkApiConfigState();
        
        // MODIFIED: Check AIService lock before setting to IDLE
        let analysisInProgress = false;
        if (this.aiService && typeof this.aiService.isAnalysisLocked === 'function') {
            analysisInProgress = this.aiService.isAnalysisLocked();
        }

        if (isConfigured && this.state === STATES.WAITING_DATA && !analysisInProgress) {
            this.setState(STATES.IDLE);
        } else {
            // console.log(`[AnalyzeButton ${this.mode}] State reset to ${this.state} after external analysis.`);
        }
    }
    // +++ End helper +++
}
