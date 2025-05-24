/**
 * 标签列表组件 - 管理标签按钮的容器
 */
class TabListComponent extends UIComponent {
    /**
     * 构造函数
     * @param {Object} config 配置项
     */
    constructor(config = {}) {
        super(config);
        
        // 移除或注释掉这些检查，因为 extends UIComponent 成功意味着 UIComponent 已定义，
        // TabButtonComponent 通过工厂创建，其可用性由工厂保证。
        // if (!window.UIComponent) console.error("[TabListComponent] Dependency Error: window.UIComponent not found.");
        // if (!window.TabButtonComponent) console.error("[TabListComponent] Dependency Error: window.TabButtonComponent not found.");
        
        // 从配置中获取 componentFactory
        this.componentFactory = config.componentFactory;
        if (!this.componentFactory) {
            console.error("[TabListComponent] Constructor Error: UIComponentFactory (componentFactory) was not provided in config.");
            // 考虑是否抛出错误，如果工厂是绝对必需的
            // throw new Error("[TabListComponent] UIComponentFactory not provided in config.");
        }
        
        // 初始化按钮映射
        this.buttons = new Map();
        
        // 初始化组件
        this.initialize();
    }
    
    /**
     * 获取组件的类名
     * @returns {string} 类名
     */
    getClassName() {
        return 'tab-list';
    }
    
    /**
     * 初始化组件
     */
    initialize() {
        // 设置基础样式 - 移除 borderBottom，由 styles/base.js 控制
        this.setStyles({
            display: 'flex',
            justifyContent: 'center',
            width: '100%',
            gap: '8px'
        });
    }
    
    /**
     * 添加标签按钮
     * @param {TabData} tabData 标签数据
     * @returns {TabButtonComponent|null} The created button instance or null if dependency missing
     */
    addButton(tabData) {
        // Use factory to create button component
        if (!this.componentFactory) {
            console.error("[TabListComponent] Cannot add button, UIComponentFactory (this.componentFactory) is not available.");
            return null;
        }

        let buttonInstance = null;
        try {
            const buttonConfig = {
                tabId: tabData.id,
                title: tabData.title,
                icon: tabData.icon
            };
            buttonInstance = this.componentFactory.createComponent('tabButton', buttonConfig);

            if (!buttonInstance || !buttonInstance.element) {
                throw new Error('Failed to create tabButton or its element.');
            }

            // 存储按钮实例引用
            this.buttons.set(tabData.id, buttonInstance);
            
            // 添加到DOM
            this.element.appendChild(buttonInstance.element);

        } catch (error) {
             console.error(`[TabListComponent] Error creating TabButtonComponent for tab ${tabData.id} via factory:`, error);
             return null; // Return null if creation failed
        }
        
        return buttonInstance; // Return the created instance
    }
    
    /**
     * 移除标签按钮
     * @param {string} tabId 标签ID
     */
    removeButton(tabId) {
        const button = this.buttons.get(tabId);
        if (button) {
            if (button.element && button.element.parentNode) {
                button.element.remove();
            }
            if (typeof button.destroy === 'function') {
                button.destroy();
            }
            this.buttons.delete(tabId);
        }
    }
    
    /**
     * 设置激活的按钮
     * @param {string} tabId 标签ID
     */
    setActiveButton(tabId) {
        console.log(`[TabListComponent] setActiveButton called for tabId: ${tabId}`);
        if (!tabId) {
            console.warn("[TabListComponent] setActiveButton called with undefined or null tabId.");
            return;
        }
        this.buttons.forEach((button, id) => {
                if (id === tabId) {
                console.log(`[TabListComponent] Activating button for tabId: ${id}`);
                    button.activate();
            } else {
                console.log(`[TabListComponent] Deactivating button for tabId: ${id}`);
                button.deactivate();
            }
        });
    }
    
    /**
     * 销毁组件
     */
    destroy() {
        this.buttons.forEach(button => {
            if (button && typeof button.destroy === 'function') {
                button.destroy();
            }
        });
        this.buttons.clear();
        super.destroy();
    }
}

