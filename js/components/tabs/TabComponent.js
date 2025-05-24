/**
 * Tab组件 - 管理标签页的切换和显示
 */
class TabComponent extends UIComponent {
    /**
     * 构造函数
     * @param {Object} config 配置项
     * @param {EventManager} [config.eventManager] 事件管理器实例
     * @param {Array<TabData>} [config.tabs] 标签数据数组
     * @param {Object} [config.options] 可选配置
     */
    constructor(config = {}) {
        super(config);

        // 确认依赖项
        // if (!window.UIComponent) console.error("[TabComponent] Dependency Error: window.UIComponent not found.");
        // if (!window.TabListComponent) console.error("[TabComponent] Dependency Error: window.TabListComponent not found.");
        // if (!window.TabPanelComponent) console.error("[TabComponent] Dependency Error: window.TabPanelComponent not found.");

        this.eventManager = config.eventManager;

        this.tabs = new Map();
        this.activeTabId = null;
        this.options = {
            animated: true,
            theme: 'light',
            placement: 'top',
            ...config.options
        };
        // this.tabList = null;
        this.tabPanels = new Map();
        this.eventListeners = {
            change: new Set(),
            beforeChange: new Set()
        };

        // this.initialize();

        if (config.tabs) {
            config.tabs.forEach(tab => this.addTab(tab));
        }

        if (config.options?.defaultActiveTab) {
            this.switchTab(config.options.defaultActiveTab);
        } else if (config.tabs?.length > 0 && this.tabs.size > 0) { // Check if tabs map is populated
             const firstTabId = this.tabs.keys().next().value; // Get first added tab id
             this.switchTab(firstTabId);
        }
    }

    /**
     * 获取组件的类名
     */
    getClassName() {
        return 'tab-component-wrapper'; // Use a more specific wrapper class
    }

    /**
     * 初始化组件
     */
    initialize() {
        // 从 this.config 中获取 componentFactory
        if (!this.config || !this.config.componentFactory) {
            console.error("[TabComponent] Initialize Error: UIComponentFactory (this.config.componentFactory) is not available or config is missing.");
            throw new Error("[TabComponent] UIComponentFactory not available from this.config during initialization.");
        }
        const componentFactory = this.config.componentFactory;

        try {
             // 将 componentFactory 传递给 TabListComponent 的配置
             this.tabList = componentFactory.createComponent('tabList', { componentFactory: componentFactory });
             if (!this.tabList || !this.tabList.element) {
                  throw new Error('Failed to create tabList or its element.');
             }
             this.element.appendChild(this.tabList.element);
        } catch (error) {
        
             console.error("[TabComponent] Error creating TabListComponent via factory:", error); // 恢复原始错误日志
             // Handle error appropriately, maybe return or throw
             return;
        }

        // 创建内容容器
        this.contentContainer = document.createElement('div');
        this.contentContainer.className = 'tab-content-container';
        this.element.appendChild(this.contentContainer);

        // 添加基础样式 (对 wrapper)
        this.setStyles({
            display: 'flex',
            flexDirection: 'column',
            width: '100%'
            // 可能需要高度设置，后续排查
        });

        // --- 添加日志 --- START ---

        requestAnimationFrame(() => {
            try {
     
     
            } catch (e) {
                console.error('[TabComponent Init] Error getting initial dimensions:', e); // Keep error
            }
        });
        // --- 添加日志 --- END ---

     
    }

    /**
     * 添加标签
     * @param {TabData} tabData {id: string, title: string, content: HTMLElement|string}
     */
    addTab(tabData) {
        console.log(`[TabComponent.addTab] Attempting to add tab. ID: ${tabData?.id}, Title: ${tabData?.title}. Current tabs count: ${this.tabs.size}`); // ADDED
        // For more detail on current tabs, uncomment the next line (can be verbose)
        // console.log(`[TabComponent.addTab] Current tabs map:`, new Map(this.tabs)); // ADDED & COMMENTED

        if (!tabData.id || !tabData.title) {
            throw new Error('Tab must have an id and title');
        }
        if (this.tabs.has(tabData.id)) {
            console.warn(`[TabComponent] Tab with id "${tabData.id}" already exists.`);
            return; // Avoid adding duplicates
        }

        this.tabs.set(tabData.id, tabData);

       
        const button = this.tabList ? this.tabList.addButton(tabData) : null; // addButton in TabList will now use factory

        // 创建内容面板 using factory
        let panel = null;
        try {
            // 从 this.config 中获取 componentFactory
            if (!this.config || !this.config.componentFactory) {
                console.error("[TabComponent] AddTab Error: UIComponentFactory (this.config.componentFactory) is not available or config is missing.");
                throw new Error("UIComponentFactory not available from this.config when adding tab.");
            }
            const componentFactory = this.config.componentFactory;

            const panelConfig = {
                 tabId: tabData.id,
                 content: tabData.content
             };
            panel = componentFactory.createComponent('tabPanel', panelConfig);
            if (!panel || !panel.element) throw new Error('Failed to create tabPanel or its element.');
             
            this.tabPanels.set(tabData.id, panel);
            this.contentContainer.appendChild(panel.element);
        } catch (error) {
             console.error(`[TabComponent] Error creating TabPanelComponent for tab ${tabData.id} via factory:`, error);
             // Handle error, maybe don't add the tab? 
        
             if (button && this.tabList && typeof this.tabList.removeButton === 'function') {
                 this.tabList.removeButton(tabData.id); // Attempt to remove associated button
             }
             this.tabs.delete(tabData.id); // Remove tab data if panel fails
             return; // Stop adding this tab
        }

        // 添加点击事件监听 (Ensure button instance exists)
       
        if (button && button.element && typeof button.element.addEventListener === 'function') {
            button.element.addEventListener('click', () => {
                 if (this.activeTabId !== tabData.id) {
                     this.switchTab(tabData.id);
                 }
            });
        } else {
            // Log might be different now, depends on what addButton returns
            console.warn(`[TabComponent] Could not find button instance or its element for tab ${tabData.id} to add listener.`);
        }

        // 如果是第一个标签，且没有默认激活项，则激活它
         if (this.tabs.size === 1 && !this.activeTabId) {
            this.switchTab(tabData.id);
        }
    }

    /**
     * 移除标签
     */
    removeTab(tabId) {
        if (!this.tabs.has(tabId)) {
            return;
        }

        const wasActive = this.activeTabId === tabId;

        // 移除按钮和面板
        this.tabList.removeButton(tabId);
        const panel = this.tabPanels.get(tabId);
        if (panel) {
             if (panel.element && panel.element.parentNode) {
                 panel.element.remove();
             }
            this.tabPanels.delete(tabId);
        }
        this.tabs.delete(tabId);

        // 如果移除的是当前激活的标签，切换到第一个可用标签
        if (wasActive && this.tabs.size > 0) {
            const firstTabId = this.tabs.keys().next().value;
            this.switchTab(firstTabId);
        } else if (this.tabs.size === 0) {
             this.activeTabId = null; // Reset active tab if none left
        }
    }

    /**
     * 切换标签
     */
    switchTab(tabId) {
        // console.log(`[TabComponent] Attempting to switch to tab: ${tabId}, current active: ${this.activeTabId}`); // 新增日志
        if (!this.tabs.has(tabId) || tabId === this.activeTabId) {
            // console.log(`[TabComponent] Switch aborted: Tab ${tabId} not found or already active.`); // Removed
            return false;
        }

        // 触发切换前事件
        // console.log(`[TabComponent] Emitting beforeChange for tab: ${tabId}`); // 新增日志
        const canSwitch = this.emit('beforeChange', tabId);
        if (canSwitch === false) {
            // console.log(`[TabComponent] Switch prevented by beforeChange handler for tab ${tabId}.`); // 新增日志
            return false;
        }

        // 更新按钮状态
        if (this.tabList) { // 新增检查
            console.log(`[TabComponent] Calling tabList.setActiveButton for tab: ${tabId}`); // 新增日志
        this.tabList.setActiveButton(tabId);
        } else {
            console.warn('[TabComponent] tabList is not available, cannot set active button.'); // 新增日志
        }

        // 更新面板显示状态
        // console.log(`[TabComponent] Updating panel visibility for target tab: ${tabId}`); // 新增日志
        this.tabPanels.forEach((panel, id) => {
            const isActive = id === tabId;
            // console.log(`[TabComponent] Panel ID: ${id}, Target isActive: ${isActive}, current panel visibility: ${panel.isVisible}`); // 新增日志
            // panel.element.classList.toggle('active', isActive); // 'active' 类通常用于按钮，面板用 'visible'

            if(isActive) {
                // console.log(`[TabComponent] Calling panel.show() for panel ID: ${id}`); // 新增日志
                panel.show(); 
            } else { 
                // console.log(`[TabComponent] Calling panel.hide() for panel ID: ${id}`); // 新增日志
                panel.hide(); 
            }
        });
        

        const previousTabId = this.activeTabId;
        this.activeTabId = tabId;
        // console.log(`[TabComponent] Switched. Previous active: ${previousTabId}, New active: ${this.activeTabId}`); // 新增日志


        // 触发切换后事件 (内部事件)
        this.emit('change', tabId, previousTabId);

        // 通过 EventManager 发布 mode:changed 事件
        if (this.eventManager && typeof this.eventManager.publish === 'function') {
            try {
                this.eventManager.publish('mode:changed', {
                    tabId: tabId,
                    timestamp: Date.now()
                });
              
            } catch (publishError) {
                console.error('[TabComponent] Failed to publish mode:changed event:', publishError); // Keep error
            }
        }
        return true;
    }

    /**
     * 获取当前激活的标签数据
     */
    getActiveTab() {
        return this.activeTabId ? this.tabs.get(this.activeTabId) : null;
    }

    /**
     * 注册事件监听器
     */
    on(event, handler) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].add(handler);
        }
    }

    /**
     * 移除事件监听器
     */
    off(event, handler) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].delete(handler);
        }
    }

    /**
     * 触发事件
     */
    emit(event, ...data) {
        let allow = true; // For beforeChange specifically
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(handler => {
                const result = handler(...data);
                 if (event === 'beforeChange' && result === false) {
                     allow = false;
                 }
            });
        }
         return event === 'beforeChange' ? allow : undefined;
    }

    /**
     * 销毁组件
     */
    destroy() {
         // Destroy child components
         if (this.tabList) {
             this.tabList.destroy(); // Assuming TabListComponent has a destroy method
             this.tabList = null;
         }
         this.tabPanels.forEach(panel => {
             if (panel && typeof panel.destroy === 'function') {
                 panel.destroy(); // Assuming TabPanelComponent has a destroy method
             }
         });
         this.tabPanels.clear();

         // Clear internal state
         this.tabs.clear();
         Object.values(this.eventListeners).forEach(listeners => listeners.clear());

         // Call super destroy (removes element etc.)
         super.destroy();

    }
};

