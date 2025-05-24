// RoleButton 组件 (继承 UIComponent)
class RoleButton extends UIComponent {
    constructor(config = {}) {
        // 1. 调用父类构造函数，传递配置
        // 父类构造函数会创建 this.element (默认为 div)
        // 并且会设置 data-component-id
        super(config);

        // 2. 从配置中提取 RoleButton 特有的数据
        this.role = config.role;
        this.isActive = config.isActive || false;
        this.onClickCallback = config.onClick; // Renamed to avoid conflict with potential future onClick method
        
        // 3. 初始化组件状态和内容
        this.init();
    }

    init() {
        // 4. 设置根元素 (this.element) 的基础属性和类名
        // UIComponent 默认创建的是 div, RoleButton 需要是 button
        // 最简单的方式是替换 this.element，但这可能丢失父类设置的 dataset 等
        // 更好的方式是在 super() 之前指定 tagName，或者在创建后修改
        // 这里我们在创建后修改内容和属性
        
        // 设置 ARIA role 和其他属性
        this.element.setAttribute('role', 'button');
        this.element.tabIndex = 0; // Make it focusable
        this.element.classList.add('role-btn'); // Add base class for styling hooks
        if (this.isActive) {
            this.element.classList.add('active');
        }
        if (this.role && this.role.id) {
             this.element.dataset.roleId = this.role.id;
        }

        // 5. 渲染内部 DOM 结构 (添加到 this.element)
        this.renderContent();

        // 6. 设置事件监听器
        this.setupEventListeners();
        
        // console.log(`[RoleButton ${this.componentId}] Initialized.`);
    }
    
    renderContent() {
        // 清空由 super() 可能创建的默认内容（如果有）
        this.element.innerHTML = ''; 
        
        // 添加 Emoji 和 Role Name
        const emojiDiv = document.createElement('div');
        emojiDiv.className = 'emoji';
        
        // --- 统一的 Emoji 获取逻辑 ---
        let emojiToShow = this.role?.emoji || '👤'; // 直接从 role 对象读取 emoji，如果不存在或无效则使用默认值
        
        emojiDiv.textContent = emojiToShow;
        // --- 结束修改 ---
        
        const nameDiv = document.createElement('div');
        nameDiv.className = 'role-name';
        nameDiv.textContent = this.role?.name || 'Unknown'; // Add fallback for name

        this.element.appendChild(emojiDiv);
        this.element.appendChild(nameDiv);
    }

    setupEventListeners() {
        // 使用 bind 确保 this 指向正确
        this._handleClick = this._handleClick.bind(this);
        this._handleKeydown = this._handleKeydown.bind(this);
        
        // 使用 addEventListener 方法注册事件监听器
        this.addEventListener('click', this._handleClick);
        this.addEventListener('keydown', this._handleKeydown);
    }

    _handleClick() {
        // console.log(`[RoleButton ${this.componentId}] Clicked. Role:`, this.role?.id);
        if (this.onClickCallback && typeof this.onClickCallback === 'function') {
            this.onClickCallback(this.role);
        }
    }

    _handleKeydown(event) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault(); // Prevent scrolling on Space
            this._handleClick();
        }
    }

    setActive(isActive) {
        this.isActive = !!isActive; // Ensure boolean
        this.element.classList.toggle('active', this.isActive);
        // Update ARIA attribute if necessary
        this.element.setAttribute('aria-pressed', this.isActive.toString());
    }

    // Override destroy to remove specific listeners if needed, then call super
    destroy() {
        // console.log(`[RoleButton ${this.componentId}] Destroying...`);
        this.removeEventListener('click', this._handleClick);
        this.removeEventListener('keydown', this._handleKeydown);
        
        // 清理回调函数
        this.onClickCallback = null;
        
        // 调用父类的 destroy 方法进行通用清理 (移除 element 等)
        super.destroy(); 
    }
};

// console.log('[RoleButton] Defined window.RoleButton class extending UIComponent.'); 