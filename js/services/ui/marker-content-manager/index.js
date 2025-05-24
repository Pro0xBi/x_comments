class MarkerContentManager {
    /**
     * 创建 MarkerContentManager 实例
     * @param {object} options - 配置选项
     * @param {object} options.eventManager - 事件管理器实例 (必需)
     * @param {object} [options.componentFactory] - 组件工厂实例 (可选)
     * @param {boolean} [options.useCache=true] - 是否使用缓存
     * @param {number} [options.cacheSize=100] - 缓存大小
     * @param {object} [options.config] - 其他配置
     */
    constructor(options = {}) {
        // 验证必需的依赖
        if (!options.eventManager) {
            throw new Error('EventManager is required for MarkerContentManager');
        }
        
        // 保存依赖和配置
        this.eventManager = options.eventManager;
        this.componentFactory = options.componentFactory || null;
        
        // 配置
        this.config = {
            useCache: options.useCache !== undefined ? options.useCache : true,
            cacheSize: options.cacheSize || 100,
            ...options.config
        };
        
        // 内部状态
        this.initialized = false;
        this.cache = new Map();
        this.currentContent = null;
        this.unsubscribeFunctions = [];
        
    }

    /**
     * 初始化管理器
     * @returns {Promise<void>}
     */
    async initialize() {
        if (this.initialized) {
            return;
        }
        
        try {
            // 确保组件工厂可用
            await this._ensureComponentFactory();
            
            // 订阅事件
            this._subscribeToEvents();
            
            this.initialized = true;
            
            // 发布初始化完成事件
            this.eventManager.publish('markerContentManager:initialized', this);
            
        } catch (error) {
            throw error;
        }
    }
    
    /**
     * 确保组件工厂可用
     * @private
     */
    async _ensureComponentFactory() {
        if (this.componentFactory) {
            return;
        }
        
        try {
            // 从服务获取组件工厂
            this.componentFactory = await this.eventManager.getService('componentFactory');
           
        } catch (error) {
          
            try {
                this.componentFactory = await this.eventManager.ensureService('UIComponentFactory');
            
            } catch (serviceError) {
                // 尝试从全局对象获取
                if (window.UIComponentFactory) {
                    this.componentFactory = new window.UIComponentFactory();
                 
                } else {
                    throw new Error('组件工厂不可用: ' + serviceError.message);
                }
            }
        }
    }
    
    /**
     * 订阅相关事件
     * @private
     */
    _subscribeToEvents() {
        // 清除之前的订阅
        this.unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
        this.unsubscribeFunctions = [];
        
        // 订阅推文选择事件
        const unsubTweetSelected = this.eventManager.subscribe(
            'tweet:selected', 
            this._handleTweetSelected.bind(this)
        );
       
        // 订阅主题变更事件
        const unsubThemeChanged = this.eventManager.subscribe(
            'theme:changed',
            this._handleThemeChanged.bind(this)
        );
        
        // 保存取消订阅函数
        this.unsubscribeFunctions.push(
            unsubTweetSelected,
            unsubThemeChanged
        );
        
       
    }

    /**
     * 处理推文选择事件
     * @param {object} tweetData - 推文数据 
     * @private
     */
    _handleTweetSelected(tweetData) {
        try {
            const content = this.createContent(tweetData);
            
            // 发布内容创建完成事件
            this.eventManager.publish('markerContent:created', {
                content,
                tweetData,
                manager: this
            });
        } catch (error) {
           
            
            // 发布错误事件
            this.eventManager.publish('markerContent:error', {
                error,
                tweetData,
                manager: this
            });
        }
    }
    
    /**
     * 处理主题变更事件
     * @param {object} themeData - 主题数据
     * @private
     */
    _handleThemeChanged(themeData) {
        if (!this.currentContent) {
            return;
        }
        
        try {
            // 更新主题相关样式
            this._updateThemeStyles(themeData);
            
           
        } catch (error) {
           
        }
    }
    
    /**
     * 更新分析结果显示
     * @param {HTMLElement} container - 结果容器元素
     * @param {string|object} result - 分析结果
     * @private
     */
    _updateAnalysisResult(container, result) {
        if (!container) return;
        // 简单的文本更新，或者可以根据结果类型进行更复杂的渲染
        container.textContent = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
        container.classList.add('loaded'); // 标记为已加载，可用于样式
      
    }

    /**
     * 更新主题相关样式
     * @param {object} themeData - 主题数据 { theme: 'light' | 'dark' }
     * @private
     */
    _updateThemeStyles(themeData) {
        if (!this.currentContent) return;
        const theme = themeData.theme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        this.currentContent.classList.remove('theme-light', 'theme-dark');
        this.currentContent.classList.add(`theme-${theme}`);
     
        // 可能还需要更新子组件的主题
        this.eventManager.publish('markerContent:themeApplied', { theme, content: this.currentContent, manager: this });
    }
    
    /**
     * 创建标记内容
     * @param {object} tweetData - 推文数据
     * @returns {HTMLElement} 创建的内容元素
     */
    createContent(tweetData) {
        if (!this.initialized) {
        
        }

        if (!tweetData) {
            throw new Error('Tweet data is required');
        }

        // 确保 tweetData 包含有效 ID，调整以匹配旧逻辑
        const tweetId = tweetData.id || tweetData.tweetId; // 尝试兼容两种可能的 ID 字段
        if (!tweetId) {
           
             throw new Error('Invalid tweet data provided (missing id/tweetId)');
        }

        // 检查缓存
        if (this.config.useCache && this.cache.has(tweetId)) {
             const cachedContent = this.cache.get(tweetId);
             // 确保缓存的元素也有 tweetId 数据集属性
             if (cachedContent instanceof HTMLElement) {
                 cachedContent.dataset.tweetId = tweetId;
             }
             this.currentContent = cachedContent;
            
             
             return cachedContent;
        }

        // 发布内容创建开始事件 (可选，旧版本有)
        this.eventManager.publish('markerContent:creating', {
            tweetData,
            manager: this
        });

        // 创建容器
        const container = document.createElement('div');
        container.className = 'marker-content';
        container.dataset.tweetId = tweetId;

        try {
            // 创建作者信息组件 (恢复旧逻辑)
            if (this.componentFactory) {
            
                const authorComponent = this.componentFactory.createComponent('author', {
                    cache: true, // 保持和旧逻辑一致
                    id: `author-${tweetId}` // 使用统一的 tweetId
                });

                if (authorComponent && typeof authorComponent.updateAuthor === 'function') {
                    // 更新作者信息
                    authorComponent.updateAuthor({
                        displayName: tweetData.author?.name || 'Unknown',
                        username: tweetData.author?.username || '',
                        avatarUrl: tweetData.author?.avatarUrl || '', // 旧版本似乎没用，但保留
                        isVerified: tweetData.author?.isVerified || false
                    });
                    // 添加作者信息组件到容器
                    if (authorComponent.element) {
                        container.appendChild(authorComponent.element);
                    } else {
                      
                    }
                } else {
                  
                     // 提供回退显示
                     const authorDiv = document.createElement('div');
                     authorDiv.className = 'author-fallback';
                     authorDiv.textContent = tweetData.author?.name || 'Unknown';
                     container.appendChild(authorDiv);
                }
            } else {
                
                // 回退到基本HTML
                const authorDiv = document.createElement('div');
                authorDiv.className = 'author-fallback';
                authorDiv.textContent = tweetData.author?.name || 'Unknown';
                container.appendChild(authorDiv);
            }

            // 创建内容区域 (恢复旧逻辑)
            const contentDiv = document.createElement('div');
            contentDiv.className = 'content'; // 保持 'content' 类名
            contentDiv.textContent = tweetData.text || '';
            container.appendChild(contentDiv);



            // 缓存内容
            if (this.config.useCache) {
                
                this.cacheContent(tweetId, container);
            }

            this.currentContent = container;

           

            return container;
        } catch (error) {
            

            // 发布错误事件 (恢复旧逻辑)
            this.eventManager.publish('markerContent:error', {
                error,
                tweetData,
                manager: this
            });

            // 旧版本在此处重新抛出错误，保持一致
            throw error;
        }
    }
    
    /**
     * 更新标记内容
     * @param {object} tweetData - 推文数据
     */
    updateContent(tweetData) {
        if (!this.currentContent) {
          
            return;
        }
        
        try {
            // 创建新内容
            const newContent = this.createContent(tweetData);
            
            // 替换旧内容
            this.currentContent.parentNode.replaceChild(newContent, this.currentContent);
            this.currentContent = newContent;
            
           
        } catch (error) {
          
            throw error;
        }
    }
    
    /**
     * 检查是否有当前内容
     * @returns {boolean}
     */
    hasContent() {
        return !!this.currentContent;
    }
    
    /**
     * 获取当前内容
     * @returns {HTMLElement|null}
     */
    getCurrentContent() {
        return this.currentContent;
    }
    
    /**
     * 清除当前内容
     */
    clearContent() {
        if (this.currentContent && this.currentContent.parentNode) {
            this.currentContent.parentNode.removeChild(this.currentContent);
        }
        this.currentContent = null;
        
    }
    
    /**
     * 获取缓存的内容
     * @param {string} tweetId - 推文ID
     * @returns {HTMLElement|null}
     */
    getCachedContent(tweetId) {
        return this.cache.get(tweetId) || null;
    }
    
    /**
     * 缓存内容
     * @param {string} tweetId - 推文ID
     * @param {HTMLElement} content - 要缓存的内容
     */
    cacheContent(tweetId, content) {
        if (this.cache.size >= this.config.cacheSize) {
            // 移除最早的缓存
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(tweetId, content);
    }
    
    /**
     * 清除所有缓存
     */
    clearCache() {
        this.cache.clear();
      
    }
    
    /**
     * 销毁管理器
     */
    destroy() {
        // 取消所有订阅
        this.unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
        this.unsubscribeFunctions = [];
        
        // 清除内容
        this.clearContent();
        
        // 清除缓存
        this.clearCache();
        
        // 重置状态
        this.initialized = false;
        this.componentFactory = null;
        
      
    }
}

// 导出到全局
window.MarkerContentManager = MarkerContentManager;

