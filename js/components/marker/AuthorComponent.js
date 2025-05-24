
class AuthorComponent extends UIComponent {
    constructor(config = {}) {
        super(config);
        
        // 初始化状态
        this.state = {
            displayName: '',
            username: '',
            isVerified: false
        };
    }

    /**
     * 获取组件的类名
     * @returns {string}
     */
    getClassName() {
        return 'author-info';
    }

    /**
     * 初始化组件
     */
    initialize() {
        console.log(`[AuthorComponent: ${this.componentId}] initialize START. Current this.initialized: ${this.initialized}. Element BEFORE super.initialize():`, this.element);
        try {
            super.initialize();
            console.log(`[AuthorComponent: ${this.componentId}] initialize AFTER super.initialize(). Current this.initialized (set by super): ${this.initialized}. Element AFTER super.initialize():`, this.element);
        } catch (e) {
            console.error(`[AuthorComponent: ${this.componentId}] ERROR during super.initialize():`, e);
        }

        // 确保element已经初始化
        if (!this.element) {
            console.error('[AuthorComponent] element not initialized by super.initialize()');
            return;
        }

        // 初始化DOM元素引用
        this.elements = {
            authorDetails: null,
            displayName: null,
            username: null
        };
        console.log(`[AuthorComponent: ${this.componentId}] initialize: this.elements has been set:`, this.elements);

        // 创建DOM结构
        this._createDOMStructure();
        
        // --- 移除事件监听器设置 (方案 1) ---
        // this._setupEventListeners(); 
        // --- 结束移除 ---
        console.log(`[AuthorComponent: ${this.componentId}] initialize END.`);
    }

    /**
     * 创建DOM结构
     * @private
     */
    _createDOMStructure() {
        // 创建作者详情容器
        this.elements.authorDetails = document.createElement('div');
        this.elements.authorDetails.className = 'author-details';

        // 创建显示名称
        this.elements.displayName = document.createElement('div');
        this.elements.displayName.className = 'display-name';

        // 创建用户名
        this.elements.username = document.createElement('div');
        this.elements.username.className = 'username';

        // 组装作者详情
        this.elements.authorDetails.appendChild(this.elements.displayName);
        this.elements.authorDetails.appendChild(this.elements.username);
        
        // 添加到主元素
        this.element.appendChild(this.elements.authorDetails);
    }

    /**
     * 更新作者信息
     * @param {Object} authorData 作者数据
     */
    updateAuthor(authorData) {
        this.setState({
            displayName: authorData.displayName || '',
            username: authorData.username || '',
            isVerified: authorData.isVerified || false
        });
    }

    /**
     * 渲染组件
     * @override
     */
    render() {
        // 更新显示名称
        if (this.elements.displayName) {
            this.elements.displayName.textContent = this.state.displayName;
        }

        // 更新用户名
        if (this.elements.username) {
            this.elements.username.textContent = `@${this.state.username}`;
        }
    }

    /**
     * 销毁组件
     * @override
     */
    destroy() {
       
        // 清理DOM引用
        this.elements = null;
        
        // 调用父类的destroy方法
        super.destroy();
    }
}

