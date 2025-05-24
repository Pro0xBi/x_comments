class TabPanelComponent extends UIComponent {
    /**
     * 构造函数
     * @param {Object} config 配置项
     * @param {string} config.tabId 标签ID
     * @param {HTMLElement} [config.content] 面板内容
     */
    constructor(config = {}) {
       
        super(config);
        
     
        // 保存配置
        this.tabId = config.tabId;
        
        // 初始化状态
        this.isVisible = false;
        
        // 初始化组件
        this.initialize();
        
        // 设置初始内容
        if (config.content) {
            this.setContent(config.content);
        }
      
    }
    
    /**
     * 获取组件的类名
     * @returns {string} 类名
     */
    getClassName() {
        return 'tab-panel';
    }
    
    /**
     * 初始化组件
     */
    initialize() {
       
    }
    
    /**
     * 设置面板内容
     * @param {HTMLElement|string} content 内容元素或HTML字符串
     */
    setContent(content) {
       
        
        // 清空现有内容
        while (this.element.firstChild) {
            this.element.removeChild(this.element.firstChild);
        }
        
        // 添加新内容
        if (content instanceof HTMLElement) {
            this.element.appendChild(content);
        } else if (typeof content === 'string') {
            const temp = document.createElement('div');
            temp.innerHTML = content;
            while (temp.firstChild) {
                this.element.appendChild(temp.firstChild);
            }
        }
      
    }
    
    /**
     * 显示面板
     */
    show() {
    
        if (this.isVisible) return;
     

        this.isVisible = true;
        // this.element.style.display = 'block'; // Replaced by class
        // requestAnimationFrame(() => { // No longer needed for simple class toggle
            // if(this.isVisible) {
               // this.element.style.opacity = '1'; // Replaced by class
            // }
        // });
        this.element.classList.add('visible'); // Add class to trigger CSS display and opacity
       
    }
    
    /**
     * 隐藏面板
     */
    hide() {
       
        if (!this.isVisible) return;
       

        this.isVisible = false;
        // this.element.style.opacity = '0'; // Replaced by class
        this.element.classList.remove('visible'); // Remove class to trigger CSS opacity and display none (after transition)
     
    }

    /**
     * 销毁组件
     */
    destroy() {
        // 清理内容元素
        while (this.element.firstChild) {
            this.element.removeChild(this.element.firstChild);
        }
        
      
        super.destroy(); // Call parent destroy
      
    }
}
