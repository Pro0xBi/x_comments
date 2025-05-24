// /* console.log('[BackgroundInfo] Loading...'); */ // Removed

/**
 * 背景信息组件类 (继承 UIComponent)
 */
// window.BackgroundInfo = class BackgroundInfo extends UIComponent { // OLD
class BackgroundInfo extends UIComponent { // NEW - Assuming UIComponent is global or loaded
    /**
     * 创建背景信息组件
     * @param {Object} config - 配置对象 (不再需要 container)
     */
    constructor(config = {}) {
        // /* console.log('[BackgroundInfo] Constructor started.'); */ // Removed
        // 调用父类构造函数
        super(config);
        
        // 初始化内部状态
        this.value = '';
        this.maxLength = 500;
        this.textarea = null; // Initialize element refs to null
        this.counter = null;
        
        // Bind event handlers here so they can be removed later
        this._handleInput = this._handleInput.bind(this);
        this._handleHeightAdjustment = this._handleHeightAdjustment.bind(this);
        
        // 调用初始化方法 (UIComponent 生命周期的一部分)
        this.init(); 
        // /* console.log('[BackgroundInfo] Constructor finished.'); */ // Removed
    }

    /**
     * 初始化组件
     * @private
     */
    init() {
        // /* console.log('[BackgroundInfo] Initializing...'); */ // Removed
        // 移除手动样式注入 (工厂会处理)
        // if (!document.querySelector('#background-info-styles')) { ... }

        // 创建内部元素并添加到 this.element
        this.createElements(); 
        // 绑定事件
        this.bindEvents();
        // /* console.log('[BackgroundInfo] Initialization complete.'); */ // Removed
    }

    /**
     * 创建组件内部元素并附加到 this.element
     * @private
     */
    createElements() {
        // /* console.log('[BackgroundInfo] Creating elements...'); */ // Removed
        // 设置根元素 (this.element) 的类名
        this.element.className = 'background-info';

        // 创建文本输入区域
        this.textarea = document.createElement('textarea');
        this.textarea.className = 'background-info-textarea';
        this.textarea.placeholder = '在这里输入背景信息比如作者的身份，非必填，可以帮助AI提高输出内容质量';
        this.textarea.maxLength = this.maxLength; 

        // 创建字数计数器
        this.counter = document.createElement('div');
        this.counter.className = 'character-counter';
        this.updateCounter(0);

        // 组装组件: 添加到 this.element (由 super() 创建)
        this.element.appendChild(this.textarea);
        this.element.appendChild(this.counter);
        // 不再需要 appendChild 到旧的 container
        // /* console.log('[BackgroundInfo] Elements created.'); */ // Removed
    }

    /**
     * 绑定事件
     * @private
     */
    bindEvents() {
        // /* console.log('[BackgroundInfo] Binding events...'); */ // Removed
        // Ensure textarea exists before adding listeners
        if (this.textarea) {
            this.textarea.addEventListener('input', this._handleInput);
            this.textarea.addEventListener('input', this._handleHeightAdjustment);
        } else {
            console.error("[BackgroundInfo] Textarea element not found during bindEvents.");
        }
        // /* console.log('[BackgroundInfo] Events bound.'); */ // Removed
    }

    /** Handle textarea input for value and counter */
    _handleInput(e) {
        const text = e.target.value;
        let currentText = text;
        if (text.length > this.maxLength) {
            currentText = text.slice(0, this.maxLength);
            e.target.value = currentText;
        }
        this.value = currentText;
        this.updateCounter(this.value.length);
    }

    /** Handle textarea input for height adjustment */
    _handleHeightAdjustment() {
        this.textarea.style.height = 'auto';
        const maxHeight = 120;
        this.textarea.style.height = Math.min(this.textarea.scrollHeight, maxHeight) + 'px';
    }

    /**
     * 更新字数计数器
     * @param {number} count - 当前字数
     * @private
     */
    updateCounter(count) {
        if (!this.counter) return; // Add check for counter existence
        this.counter.textContent = `${count}/${this.maxLength}`;
        this.counter.classList.toggle('limit-reached', count >= this.maxLength);
    }

    /**
     * 获取当前输入的背景信息
     * @returns {string} 背景信息文本
     */
    getValue() {
        const value = this.value.trim();
        return value;
    }

    /**
     * 清空输入
     */
    clear() {
        if (this.textarea) {
            this.textarea.value = '';
            this.textarea.style.height = 'auto';
        }
        this.value = '';
        this.updateCounter(0);
    }

    /**
     * 销毁组件
     */
    destroy() {
        // /* console.log('[BackgroundInfo] Destroying component...'); */ // Removed
        // Remove event listeners first
        if (this.textarea) {
            this.textarea.removeEventListener('input', this._handleInput);
            this.textarea.removeEventListener('input', this._handleHeightAdjustment);
            // /* console.log('[BackgroundInfo] Event listeners removed.'); */ // Removed
        }
        
        // Call super.destroy() to handle element removal and base cleanup
        super.destroy(); 
        
        // Nullify references 
        this.textarea = null;
        this.counter = null;
        // /* console.log('[BackgroundInfo] Component destroyed.'); */ // Removed
    }
}
