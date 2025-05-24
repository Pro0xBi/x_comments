/**
 * 标签按钮组件 - 单个标签的按钮
 */
class TabButtonComponent extends UIComponent {
    /**
     * 构造函数
     * @param {Object} config 配置项
     * @param {string} config.tabId 标签ID
     * @param {string} config.title 标签标题
     * @param {string} [config.icon] 标签图标
     */
    constructor(config = {}) {
        
        super(config);
        
        
        

        // 保存配置
        this.tabId = config.tabId;
        this.title = config.title;
        this.icon = config.icon;
        
        // 初始化状态
        this.isActive = false;
        
        // 初始化组件
        this.initialize();
        
        
        
    }
    
    /**
     * 获取组件的类名
     * @returns {string} 类名
     */
    getClassName() {
        return 'tab-button';
    }
    
    /**
     * 初始化组件
     */
    initialize() {
        const didSuperInitialize = super.initialize();

        // 如果父类初始化被跳过，则子类也跳过后续逻辑
        if (!didSuperInitialize) {
         
            return; 
        }

        const content = document.createElement('div');
        content.className = 'tab-button-content';
       
        if (this.icon) {
            const iconElement = document.createElement('span');
            iconElement.className = 'tab-button-icon';
            iconElement.innerHTML = this.icon;
             // Add some margin if there's also text
             if (this.title) {
                iconElement.style.marginRight = '4px'; // Keep this simple inline style for conditional margin
             }
            content.appendChild(iconElement);
        }

        // 添加标题
        const titleElement = document.createElement('span');
        titleElement.className = 'tab-button-title';
        titleElement.textContent = this.title;
        
        content.appendChild(titleElement);

        // 添加到按钮
        this.element.appendChild(content);

        // 添加底部指示器
        const indicator = document.createElement('div');
        indicator.className = 'tab-button-indicator';
        
        this.element.appendChild(indicator);
       
    }
    
    /**
     * 激活按钮
     */
    activate() {
        
        if (this.isActive) return;
        this.isActive = true;
        this.element.classList.add('active');
       ;

    }
    
    /**
     * 取消激活按钮
     */
    deactivate() {
       
        if (!this.isActive) return;
        this.isActive = false;
        this.element.classList.remove('active');
       

    }
    
    /**
     * 销毁组件
     */
    destroy() {
       
        super.destroy();
      
    }
}
