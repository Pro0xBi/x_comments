/**
 * UI组件工厂类
 * 负责管理和创建所有UI组件
 */
// /* console.log('[UIComponentFactory] 加载新路径的 UIComponentFactory.js'); */ // Removed


class UIComponentFactory {
    constructor() {
        // 组件注册表
        this.components = new Map();
        
        // 组件实例缓存
        this.instances = new Map();
        
        // 初始化
        this.initialize();
    }
    
    /**
     * 初始化工厂
     * @private
     */
    initialize() {
        // console.log('UIComponentFactory initialized');
    }
    
    /**
     * 注册组件
     * @param {string} type 组件类型
     * @param {class} componentClass 组件类
     */
    registerComponent(type, componentClass) {
        if (this.components.has(type)) {
            console.warn(`Component type ${type} already registered, will be overwritten`);
        }
        this.components.set(type, componentClass);
        // console.log(`Component ${type} registered`);
    }
    
    /**
     * 检查组件类型是否已注册
     * @param {string} type 组件类型
     * @returns {boolean} 如果已注册则返回 true，否则返回 false
     */
    isRegistered(type) {
        return this.components.has(type);
    }
    
    /**
     * 创建组件实例
     * @param {string} type 组件类型
     * @param {Object} config 组件配置
     * @returns {UIComponent} 组件实例
     */
    createComponent(type, config = {}) {
        // 检查组件类型是否已注册
        if (!this.components.has(type)) {
            throw new Error(`Component type ${type} not registered`);
        }
        
        // 获取组件类
        const ComponentClass = this.components.get(type);
        
        if (!ComponentClass) {
            throw new Error(`Component "${type}" not registered.`);
        }

        // ---- TEMPORARY DEBUG LOG - 已确认 tabId 传递正确，可以暂时注释掉 ----
        /*
        if (type === 'tabButton' || type === 'tabPanel') {
            try {
                console.log(`[UIComponentFactory] Creating "${type}" with config:`, JSON.stringify(config));
            } catch (e) {
                console.log(`[UIComponentFactory] Creating "${type}" (config stringify failed, logging raw):`, config);
            }
        }
        */
        // ---- END TEMPORARY DEBUG LOG ----

        try {
        const instance = new ComponentClass(config);
            this.instances.set(instance.componentId, instance);
        
        // 缓存实例（如果需要）
        if (config.cache && instance.componentId) { // 使用生成的 componentId 作为缓存 key 的一部分
            const cacheKey = instance.componentId;
            this.instances.set(cacheKey, instance);
        }

            // ---- 在返回实例前，调用其 initialize 方法 ----
            if (typeof instance.initialize === 'function') {
                // console.log(`[UIComponentFactory] Initializing component: ${instance.componentId} (Type: ${type})`); // 可选日志
                instance.initialize(); // 调用 initialize
            } else {
                // console.warn(`[UIComponentFactory] Component ${instance.componentId} (Type: ${type}) has no initialize method.`); // 可选日志
            }
        
        return instance;
        } catch (e) {
            throw new Error(`Failed to create component ${type}: ${e.message}`);
        }
    }
    
    /**
     * 获取已缓存的组件实例
     * @param {string} componentId 组件实例的唯一 ID (e.g., 'analyzebutton-1')
     * @returns {UIComponent|null} 组件实例或null
     */
    getComponent(componentId) {
        return this.instances.get(componentId) || null;
    }
    
    /**
     * 销毁组件实例
     * @param {string} componentId 组件实例的唯一 ID
     */
    destroyComponent(componentId) {
        const instance = this.instances.get(componentId);
        
        if (instance) {
            // 调用组件的销毁方法
            if (typeof instance.destroy === 'function') {
                instance.destroy();
            }
            // 从缓存中移除
            this.instances.delete(componentId);
        }
    }
}