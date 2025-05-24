
class UIComponent {
    static instanceCounter = 0; // 添加静态计数器

    /**
     * 构造函数
     * @param {Object} config 组件配置
     */
    constructor(config = {}) {
        // 保存配置
        this.config = config;
        
        // 创建根元素
        this.element = document.createElement('div');
       
        
        // 设置基础类名
        this.element.className = this.getClassName();
        
        // --- 开始: 添加唯一 ID 生成和设置 ---
        UIComponent.instanceCounter++;
        // 尝试获取子类的构造函数名称，如果获取不到则使用默认名'uicomponent'
        this.componentType = this.constructor.name || 'uicomponent'; 
        // 生成组件唯一 ID (例如: analyzebutton-1, roleselector-2)
        this.componentId = `${this.componentType.toLowerCase()}-${UIComponent.instanceCounter}`;
        // 将 ID 设置到组件根元素的 dataset 中，用于 CSS 属性选择器
        this.element.dataset.componentId = this.componentId;
        // --- 结束: 添加唯一 ID 生成和设置 ---

        if (config.id) {
          
            this.element.id = config.id;
        }
        
        // 初始化状态
        this.state = {};
        
        // 事件监听器集合
        this.listeners = new Map();
       
    }
    
    /**
     * 获取组件的类名
     * @returns {string} 类名
     */
    getClassName() {
      
        return this.componentType ? this.componentType.toLowerCase() : 'ui-component';
    }
    
    
    initialize() {
        
        if (this.initialized) {
           
            return false;
        }

       

       
        this.initialized = true;
        return true;
    }
    
    /**
     * 渲染组件
     * 子类必须实现这个方法
     */
    render() {
        throw new Error('Component must implement render method');
    }
    
    /**
     * 更新组件
     * @param {Object} newState 新状态
     */
    setState(newState) {
        const oldState = { ...this.state };
        this.state = { ...this.state, ...newState };
        
        // 调用状态更新回调
        this.onStateUpdate(oldState, this.state);
        
        // 重新渲染
        this.render();
    }
    
    /**
     * 状态更新回调
     * @param {Object} oldState 旧状态
     * @param {Object} newState 新状态
     */
    onStateUpdate(oldState, newState) {
    }
    
    /**
     * 添加事件监听器
     * @param {string} eventName 事件名称
     * @param {Function} handler 处理函数
     */
    addEventListener(eventName, handler) {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, new Set());
        }
        this.listeners.get(eventName).add(handler);
        this.element.addEventListener(eventName, handler);
    }
    
    /**
     * 移除事件监听器
     * @param {string} eventName 事件名称
     * @param {Function} handler 处理函数
     */
    removeEventListener(eventName, handler) {
        const handlers = this.listeners.get(eventName);
        if (handlers) {
            handlers.delete(handler);
            this.element.removeEventListener(eventName, handler);
        }
    }
    
    /**
     * 触发自定义事件
     * @param {string} eventName 事件名称
     * @param {Object} detail 事件详情
     */
    emit(eventName, detail = {}) {
        const event = new CustomEvent(eventName, { detail });
        this.element.dispatchEvent(event);
    }
    
    /**
     * 销毁组件
     */
    destroy() {
        // 移除所有事件监听器
        this.listeners.forEach((handlers, eventName) => {
            handlers.forEach(handler => {
                this.removeEventListener(eventName, handler);
            });
        });
        
        // 清空监听器集合
        this.listeners.clear();
        
        // 移除元素
        if (this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
    
    /**
     * 设置样式
     * @param {Object} styles 样式对象
     */
    setStyles(styles) {
        Object.assign(this.element.style, styles);
    }
    
    /**
     * 添加CSS类
     * @param {string} className CSS类名
     */
    addClass(className) {
        this.element.classList.add(className);
    }
    
    /**
     * 移除CSS类
     * @param {string} className CSS类名
     */
    removeClass(className) {
        this.element.classList.remove(className);
    }
    
    /**
     * 切换CSS类
     * @param {string} className CSS类名
     */
    toggleClass(className) {
        this.element.classList.toggle(className);
    }
}
