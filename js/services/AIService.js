class AIService {
  constructor(eventManager, rolesConfig, defaultRoleID, apiConfigManager) {
    this.eventManager = eventManager;
    this.rolesConfig = rolesConfig;         // Store injected rolesConfig
    this.defaultRoleID = defaultRoleID;     // Store injected defaultRoleID
    this.apiConfigManager = apiConfigManager; // 
    this.currentRole = null;
    this.customSystemPrompt = null;
    this.decryptedApiKey = null;  // 存储解密后的API密钥
    this.isInitialized = false;  // 添加初始化状态标志

    // 新增：自定义模式相关属性
    this.isCustomMode = false;
    this.customUserPrompt = null;
    this.isAnalysisCurrentlyInProgress = false; // NEW: Analysis lock flag

    // +++ 定义自定义提示词的存储键 +++
    this.CUSTOM_PROMPTS_STORAGE_KEY = 'userCustomTwitterPrompts_v1'; // 使用一个明确的键名
    

    // --- 绑定事件处理方法 ---
    this._handleRoleChanged = this._handleRoleChanged.bind(this);
    this._handleConfigUpdated = this._handleConfigUpdated.bind(this);
    this._handleModeChanged = this._handleModeChanged.bind(this);
    this._handlePromptsUpdated = this._handlePromptsUpdated.bind(this); // <-- 确保此行存在且正确

    // --- 检查 eventManager 并添加订阅 ---
    if (this.eventManager) {
      try {
        // 订阅 role:changed
        this.eventManager.subscribe('role:changed', this._handleRoleChanged);
        

        // 订阅 config:updated  <-- 新增订阅
        this.eventManager.subscribe('config:updated', this._handleConfigUpdated);
        

        // --- 新增订阅 mode:changed ---
        this.eventManager.subscribe('mode:changed', this._handleModeChanged);
        

        // --- 新增/确保 prompts:updated 订阅存在 --- 
        this.eventManager.subscribe('prompts:updated', this._handlePromptsUpdated);
        // // console.log('[AIService] Subscribed to event: prompts:updated');
        // --- 结束新增/确保 ---

      } catch (subscribeError) {
        // console.error('[AIService] Failed to subscribe to events:', subscribeError);
      }
    } else {
      // console.warn('[AIService] EventManager not available in constructor, cannot subscribe to events.');
    }

    if (this.rolesConfig && this.defaultRoleID) {
      this.currentRole = this.rolesConfig.find(role => role.id === this.defaultRoleID);
      if (!this.currentRole && this.rolesConfig.length > 0) {
        // console.warn(`[AIService Constructor] Default role ID (${this.defaultRoleID}) not found in provided rolesConfig, falling back to the first role.`);
        this.currentRole = this.rolesConfig[0];
      }
    } else {
      console.warn('[AIService Constructor] rolesConfig or defaultRoleID not provided/available. Cannot set initial currentRole.');
    }
  }

  // 新增：保存到存储的方法
  async saveToStorage(data) {
   
    

    try {
      // 验证数据
      if (!data || !data.systemPrompt || !data.userPrompt) {
        
        throw new Error('Invalid data format');
      }

      // 保存到 Chrome 存储
      await new Promise((resolve, reject) => {
        chrome.storage.sync.set(
          { [this.CUSTOM_PROMPTS_STORAGE_KEY]: data }, // MODIFIED: 使用新的存储键
          () => {
            if (chrome.runtime.lastError) {
              
              reject(new Error(`${this.STORAGE_ERROR_PREFIX}: ${chrome.runtime.lastError.message}`)); // STORAGE_ERROR_PREFIX 未定义，暂时移除
              // reject(new Error(`Error saving custom prompts: ${chrome.runtime.lastError.message}`));
            } else {
              
              resolve();
            }
          }
        );
      });

      
      return true;
    } catch (error) {
      
      
      return false;
    }
  }

  
  async loadFromStorage() {
    

    try {
      const result = await new Promise((resolve) => {
        chrome.storage.sync.get([this.CUSTOM_PROMPTS_STORAGE_KEY], (storageResult) => { // MODIFIED: 使用新的存储键
          if (chrome.runtime.lastError) {
            
            resolve(null);
          } else {
            const loadedData = storageResult[this.CUSTOM_PROMPTS_STORAGE_KEY];
            
            resolve(loadedData);
          }
        });
      });

     

      return result;
    } catch (error) {
      
      return null;
    }
  }

  async initialize() {
    
    this.isInitialized = false;

    try {
      const activeConfig = await this.apiConfigManager.getActiveConfigDecrypted();

      if (activeConfig) {
        this.currentConfig = activeConfig;
        this.decryptedApiKey = activeConfig.apiKey;
        
      } else {
        // console.warn('[AIService] No active API configuration found during initialization.');
        this.currentConfig = null;
        this.decryptedApiKey = null;
      }

      this.isInitialized = true;

    } catch (error) {
      this.isInitialized = false;
      console.error('Failed to initialize AIService:', error);
      throw error;
    }
  }

  checkInitialized() {
    if (!this.isInitialized) {
       // console.error('AIService checkInitialized failed: Service not initialized.');
       throw new Error('AIService 尚未初始化，请先调用 initialize()');
    }
    if (!this.currentConfig || !this.decryptedApiKey) {
       // console.warn('AIService checkInitialized warning: Active config or API key is missing. Operations requiring API calls may fail.');
    }
  }

  _handleRoleChanged(eventData) {
    const newRole = eventData?.role;

    if (!newRole || typeof newRole.id !== 'string' || newRole.id.trim() === '' || typeof newRole.name !== 'string' || newRole.name.trim() === '') {
      
      return;
    }

    if (this.currentRole && this.currentRole.id === newRole.id) {
        return;
    }

    this.currentRole = newRole;
    console.log('[AS_Diag] _handleRoleChanged: currentRole updated to:', {
        id: this.currentRole.id,
        name: this.currentRole.name,
        isUserDefined: !!this.currentRole.isUserDefined,
        hasSystemPrompt: !!this.currentRole.systemPrompt,
        hasUserPromptTemplate: !!this.currentRole.userPromptTemplate
    });

    
  }

  getRole() {
    return this.currentRole;
  }

  setCustomMode(enabled) {
    // // console.log('Setting custom mode:', { enabled, previousMode: this.isCustomMode });
    this.isCustomMode = enabled;
    
    if (!enabled) {
      this.customSystemPrompt = null;
      this.customUserPrompt = null;
      // // console.log('Custom prompts cleared due to mode switch');
    }

   
  }

  setCustomPrompts(systemPrompt, userPrompt) {
    // // console.log('Setting custom prompts');
    
    if (!systemPrompt || !userPrompt) {
      // console.error('Invalid custom prompts:', { systemPrompt, userPrompt });
      throw new Error('系统提示词和用户提示词不能为空');
    }

    this.customSystemPrompt = systemPrompt;
    this.customUserPrompt = userPrompt;

   
  }

  async analyze(tweetData, mode, background_info = '', options = {}) {
    this.checkInitialized();

    // NEW: Check and acquire lock
    if (this.isAnalysisCurrentlyInProgress) {
      console.warn('[AIService] Analysis is already in progress. Ignoring concurrent request.');
      // Optionally throw an error or return a specific status
      // For now, let's allow the AnalyzeButton to handle user feedback if it tries to call this while locked.
      // Or, we can throw an error that AnalyzeButton can catch.
      throw new Error('分析操作已在进行中，请稍后重试。'); 
    }

    // Check if API is configured
    if (!this.currentConfig || !this.decryptedApiKey) {
      throw new Error('请先配置API'); 
    }

    const tweetId = tweetData?.tweetId || null;
    if (!tweetId) {
        // console.warn('[AIService] Could not extract tweetId from tweetData. Event payloads might be incomplete.', tweetData);
    }

    const maxRetries = 2;
    // SET LOCK
    this.isAnalysisCurrentlyInProgress = true;
    try {
        for (let i = 0; i <= maxRetries; i++) {
      const attempt = i + 1;
      const timestamp = Date.now();

      if (this.eventManager) {
        try {
          this.eventManager.publish('ai:analysis:started', {
            tweetId,
            timestamp,
            attempt
          });
        } catch (publishError) {
          // console.error('[AIService] Failed to publish ai:analysis:started event:', publishError);
        }
      } else {
        // console.warn('[AIService] EventManager not available, skipping publish ai:analysis:started');
      }

      try {
        const data = typeof tweetData === 'string' ? { text: tweetData } : tweetData;
        const provider = this.currentConfig.provider.toLowerCase();
        let analysisResult;

        if (provider === 'openai') {
          analysisResult = await this.callOpenAI(data, background_info, options);
        } else if (provider === 'deepseek') {
          analysisResult = await this.callDeepSeek(data, background_info, options);
        } else {
          throw new Error('不支持的API提供商: ' + this.currentConfig.provider);
        }

        if (this.eventManager) { 
          try { 
            const completionTimestamp = Date.now();
            this.eventManager.publish('ai:analysis:completed', {
              tweetId,
              result: analysisResult,
              timestamp: completionTimestamp
            });
          } catch (publishError) {
            // console.error('[AIService] Failed to publish ai:analysis:completed event:', publishError);
          }
        } else {
          // console.warn('[AIService] EventManager not available, skipping publish ai:analysis:completed');
        }

        return analysisResult;

      } catch (error) {
        if (i === maxRetries || error.message.includes('API') || error.name === 'AbortError') {
          if (this.eventManager) { 
            try { 
              const errorTimestamp = Date.now();
              this.eventManager.publish('ai:analysis:error', {
                tweetId,
                error: { message: error.message, name: error.name },
                timestamp: errorTimestamp
              });
            } catch (publishError) {
              // console.error('[AIService] Failed to publish ai:analysis:error event:', publishError);
            }
          } else {
             // console.warn('[AIService] EventManager not available, skipping publish ai:analysis:error');
          }
          
          // console.error('[AIService] analyze failed permanently after retries or critical error:', error);
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        // // console.log(`重试第 ${i + 1} 次...`);
      }
    }
    } finally {
      // RELEASE LOCK
      this.isAnalysisCurrentlyInProgress = false;
      // console.log('[AIService] Analysis lock released.');
    }
  }

  async callOpenAI(tweetData, background_info = '', options = {}) {
    // // console.warn("[AIService callOpenAI] Needs implementation for handling 'options' parameter and fallback logic.");
    let systemPromptObject, userPromptTemplate;
    
    const liveSystemPrompt = options?.customSystemPrompt;
    const liveUserPrompt = options?.customUserPrompt;
    const hasLivePrompts = typeof liveSystemPrompt === 'string' && liveSystemPrompt.trim() && 
                           typeof liveUserPrompt === 'string' && liveUserPrompt.trim();

    if (hasLivePrompts) {
        // // console.log('[AIService callOpenAI] Using live prompts provided in options.');
        systemPromptObject = { role: "system", content: liveSystemPrompt };
        userPromptTemplate = liveUserPrompt;
    } else {
        // // console.log('[AIService callOpenAI] No valid live prompts in options, falling back to internal state.');
        if (this.isCustomMode) {
            if (typeof this.customSystemPrompt === 'string' && this.customSystemPrompt.trim() && 
                typeof this.customUserPrompt === 'string' && this.customUserPrompt.trim()) {
                // // console.log('[AIService callOpenAI] Using internal custom prompts.');
                systemPromptObject = { role: "system", content: this.customSystemPrompt };
                userPromptTemplate = this.customUserPrompt;
            } else {
                console.error('[AIService callOpenAI] Custom mode active, but internal custom prompts are invalid or empty.');
                throw new Error('无法获取有效的内部自定义提示词。请检查存储或编辑器。！');
            }
        } else {
             if (!this.currentRole || typeof this.currentRole.systemPrompt !== 'string' || !this.currentRole.userPromptTemplate) {
                 console.error('[AIService callOpenAI] Preset mode active, but current role or its prompts are invalid.');
                 throw new Error('无法获取有效的预设角色提示词。');
            }
            // // console.log('[AIService callOpenAI] Using preset role prompts:', this.currentRole.name);
            systemPromptObject = { role: "system", content: this.currentRole.systemPrompt };
            userPromptTemplate = this.currentRole.userPromptTemplate;
        }
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); 
    
    try {
      if (typeof userPromptTemplate !== 'string') {
           console.error('[AIService callOpenAI] userPromptTemplate is unexpectedly not a string before replacement:', userPromptTemplate);
           throw new Error('内部错误：用户提示模板无效。');
      }
      let userPrompt = userPromptTemplate; 
      const variables = {
        text: tweetData.text || '',
        author: tweetData.author || '',
        replies: tweetData.replies || '0',
        retweets: tweetData.retweets || '0',
        likes: tweetData.likes || '0',
        views: tweetData.views || '0',
        background_info: background_info
      };

      Object.entries(variables).forEach(([key, value]) => {
          userPrompt = userPrompt.replace(new RegExp(`{${key}}`, 'g'), String(value ?? ''));
      });

      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.decryptedApiKey}`
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            systemPromptObject,
            {
              "role": "user", 
              "content": userPrompt
            }
          ],
          stream: false
        })
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[AIService callOpenAI] API request failed. Status:', response.status, 'Error Text:', errorData.error?.message || response.statusText);
        throw new Error(`API调用失败: ${response.status} ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      if (data?.choices?.[0]?.message?.content) {
          return data.choices[0].message.content;
      } else {
          console.error('[AIService callOpenAI] Invalid response structure from API:', data);
          throw new Error('从 DeepSeek API 收到的响应格式无效。');
      }

    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('请求超时，请重试');
      }
      console.error('DeepSeek API调用错误:', error);
      throw new Error(`API调用失败: ${error.message}`); 
    }
  }

  async callDeepSeek(tweetData, background_info = '', options = {}) {
    // // console.log('[AIService callDeepSeek] Entered. Options:', options, 'Internal Custom Mode:', this.isCustomMode);
    // // console.log('Calling DeepSeek API...');

    let systemPromptObject, userPromptTemplate;

    const liveSystemPrompt = options?.customSystemPrompt;
    const liveUserPrompt = options?.customUserPrompt;
    const hasLivePrompts = typeof liveSystemPrompt === 'string' && liveSystemPrompt.trim() && 
                           typeof liveUserPrompt === 'string' && liveUserPrompt.trim();

    if (hasLivePrompts) {
        // // console.log('[AIService callDeepSeek] Using live prompts provided in options.');
        systemPromptObject = { role: "system", content: liveSystemPrompt };
        userPromptTemplate = liveUserPrompt;
    } else {
        // // console.log('[AIService callDeepSeek] No valid live prompts in options, falling back to internal state based on mode.');
        if (this.isCustomMode) {
            if (typeof this.customSystemPrompt === 'string' && this.customSystemPrompt.trim() && 
                typeof this.customUserPrompt === 'string' && this.customUserPrompt.trim()) {
                // // console.log('[AIService callDeepSeek] Using internal custom prompts state.');
                systemPromptObject = { role: "system", content: this.customSystemPrompt };
                userPromptTemplate = this.customUserPrompt;
            } else {
                console.error('[AIService callDeepSeek] Custom mode active (fallback path), but internal custom prompts state is invalid or empty.', { sys: this.customSystemPrompt, user: this.customUserPrompt });
                throw new Error('无法获取有效的内部自定义提示词。请检查编辑器内容或重新加载扩展。！');
            }
        } else {
             if (!this.currentRole || typeof this.currentRole.systemPrompt !== 'string' || !this.currentRole.userPromptTemplate) {
                 console.error('[AIService callDeepSeek] Preset mode active (fallback path), but current role or its prompts are invalid.', this.currentRole);
                 throw new Error('无法获取有效的预设角色提示词。');
            }
            // // console.log('[AIService callDeepSeek] Using preset role prompts (fallback path): ', this.currentRole.name);
            systemPromptObject = { role: "system", content: this.currentRole.systemPrompt };
            userPromptTemplate = this.currentRole.userPromptTemplate;
        }
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); 
    
    try {
      if (typeof userPromptTemplate !== 'string') {
           console.error('[AIService callDeepSeek] userPromptTemplate is unexpectedly not a string before replacement:', userPromptTemplate);
           throw new Error('内部错误：用户提示模板无效。');
      }
      let userPrompt = userPromptTemplate; 
      const variables = {
        text: tweetData.text || '',
        author: tweetData.author || '',
        replies: tweetData.replies || '0',
        retweets: tweetData.retweets || '0',
        likes: tweetData.likes || '0',
        views: tweetData.views || '0',
        background_info: background_info
      };

      Object.entries(variables).forEach(([key, value]) => {
          userPrompt = userPrompt.replace(new RegExp(`{${key}}`, 'g'), String(value ?? ''));
      });

      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.decryptedApiKey}`
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            systemPromptObject,
            {
              "role": "user", 
              "content": userPrompt
            }
          ],
          stream: false
        })
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[AIService callDeepSeek] API request failed. Status:', response.status, 'Error Text:', errorData.error?.message || response.statusText);
        throw new Error(`API调用失败: ${response.status} ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      if (data?.choices?.[0]?.message?.content) {
          return data.choices[0].message.content;
      } else {
          console.error('[AIService callDeepSeek] Invalid response structure from API:', data);
          throw new Error('从 DeepSeek API 收到的响应格式无效。');
      }

    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('请求超时，请重试');
      }
      console.error('DeepSeek API调用错误:', error);
      throw new Error(`API调用失败: ${error.message}`); 
    }
  }

  async _handleConfigUpdated(eventData) {
    // // console.log('[AIService] Received event: config:updated. Reloading active config...', eventData);

    try {
      const activeConfig = await this.apiConfigManager.getActiveConfigDecrypted();

      if (activeConfig) {
        const oldProvider = this.currentConfig?.provider;
        const oldHasKey = !!this.decryptedApiKey;
        this.currentConfig = activeConfig;
        this.decryptedApiKey = activeConfig.apiKey;
        
      } else {
        // console.warn('[AIService] No active API configuration found after update. Clearing current config.');
        this.currentConfig = null;
        this.decryptedApiKey = null;
      }

    } catch (error) {
      console.error('[AIService] Failed to reload active config after update:', error);
      // console.warn('[AIService] Clearing current config due to error during reload.');
      this.currentConfig = null;
      this.decryptedApiKey = null;
    }
  }

  async _loadAndUpdateCustomPromptsFromStorage() {
      try {
          const storedData = await this.loadFromStorage(); // This now uses the correct key and has logging

          if (storedData && typeof storedData.systemPrompt === 'string' && typeof storedData.userPrompt === 'string') {
              this.customSystemPrompt = storedData.systemPrompt;
              this.customUserPrompt = storedData.userPrompt;
            
          } else {
              this.customSystemPrompt = null;
              this.customUserPrompt = null;
          }
      } catch (error) {
          this.customSystemPrompt = null;
          this.customUserPrompt = null;
      }
  }

  _handleModeChanged(eventData) {
      // // console.log('[AIService] Received event: mode:changed', eventData);

      const tabId = eventData?.tabId;
      if (!tabId) {
           // console.error('[AIService] Invalid data received in mode:changed event. Missing tabId.', eventData);
           return;
      }

      const newIsCustomMode = (tabId === 'tab-custom');

      if (newIsCustomMode === this.isCustomMode) {
          // // console.log(`[AIService] Mode already set to ${this.isCustomMode ? 'custom' : 'preset'}. Ignoring redundant mode:changed event.`);
          if (this.isCustomMode && (!this.customSystemPrompt || !this.customUserPrompt)) {
             // // console.log('[AIService] Already in custom mode but prompts are missing in memory, attempting load...');
             this._loadAndUpdateCustomPromptsFromStorage();
          }
          return;
      }

      // // console.log(`[AIService] Switching mode via event to: ${newIsCustomMode ? 'custom' : 'preset'}`);

      this.isCustomMode = newIsCustomMode;

      if (this.isCustomMode) {
          // // console.log('[AIService _handleModeChanged] Switched to custom mode, triggering prompt load from storage.');
          this._loadAndUpdateCustomPromptsFromStorage();
      } else {
          this.customSystemPrompt = null;
          this.customUserPrompt = null;
          // // console.log('[AIService] Custom prompts cleared due to mode switch to preset.');
      }

  }

  _handlePromptsUpdated(eventData) {
      // // console.log('[AIService] Received event: prompts:updated', eventData);

      const systemPrompt = eventData?.systemPrompt;
      const userPrompt = eventData?.userPrompt;

      if (typeof systemPrompt !== 'string' || typeof userPrompt !== 'string') {
           // console.error('[AIService] Invalid data received in prompts:updated event.', eventData);
           return;
      }

      if (systemPrompt === this.customSystemPrompt && userPrompt === this.customUserPrompt) {
          // // console.log('[AIService] Custom prompts have not changed. Ignoring redundant prompts:updated event.');
          return;
      }

      // // console.log('[AIService] Updating custom prompts via event...');

      this.customSystemPrompt = systemPrompt;
      this.customUserPrompt = userPrompt;

  }

  // 新增：检查是否有活动配置
  hasActiveConfig() {
      // 仅当 initialize() 运行过且找到了有效的配置和密钥时返回 true
      return !!this.currentConfig && !!this.decryptedApiKey;
  }

  // NEW: Method to check lock status (optional, for consumers like AnalyzeButton if needed)
  isAnalysisLocked() {
    return this.isAnalysisCurrentlyInProgress;
  }
}
