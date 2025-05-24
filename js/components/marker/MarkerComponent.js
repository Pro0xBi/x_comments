/**
 * 标记容器组件
 * 用于显示推文分析的浮动容器
 */

class MarkerComponent extends UIComponent {
    /**
     * 构造函数
     * @param {Object} config 组件配置
     */
    constructor(config) {
        super(config);
        
        this.eventManager = config.eventManager;

        // 初始化状态
        this.state = {
            visible: false,
            position: { top: 20, right: 20 }
        };
    }
    
    /**
     * 获取组件的类名
     * @returns {string} 类名
     */
    getClassName() {
        return 'twitter-comment-marker';
    }
    
    /**
     * 初始化组件
     */
    initialize() {
        // 监听状态变化以控制可见性
        this.setupStateListener();

        // Set initial dynamic position style if needed
        this.setStyles(this.state.position);
    }
    
    /**
     * 设置状态监听器，监听 state:visibilityChanged 事件
     * @private
     */
    setupStateListener() {
        if (this.eventManager && typeof this.eventManager.subscribe === 'function') {
            const handleVisibilityChange = (data) => {
                if (data && data.isVisible !== undefined) {
                    if (data.isVisible) {
                        this.show();
                    } else {
                        this.hide();
                    }
                } else {
                    console.warn('[MarkerComponent] Received invalid state:visibilityChanged event data:', data);
                }
            };

            // 订阅事件
            const unsubscribeState = this.eventManager.subscribe('state:visibilityChanged', handleVisibilityChange);

            // 确保在销毁时取消订阅
            const removeStateListener = () => {
                if (unsubscribeState && typeof unsubscribeState === 'function') {
                    unsubscribeState();
                }
            };
            this.addEventListener('destroy', removeStateListener); // 使用基类提供的事件

        } else {
            console.warn('[MarkerComponent] this.eventManager not available or subscribe is not a function. Cannot subscribe to state changes.');
        }
    }
    
    /**
     * 显示标记
     */
    show() {
        this.setState({ visible: true });
    }
    
    /**
     * 隐藏标记
     */
    hide() {
        this.setState({ visible: false });
    }
    
    /**
     * 更新位置
     * @param {Object} position 位置信息 {top, right, bottom?, left?}
     */
    updatePosition(position) {
        this.setState({ position });
        this.setStyles(position);
    }
    
    /**
     * 渲染组件 - Crucial for applying the .visible class
     */
    render() {
        // 更新可见性类
        if (this.state.visible) {
            this.addClass('visible');
        } else {
            this.removeClass('visible');
        }
    }
    
    /**
     * 添加内容
     * @param {HTMLElement} content 内容元素
     */
    setContent(content) {
        const markerElement = this.element;
        if (!markerElement) {
            console.error('[MarkerComponent::setContent] ERROR - this.element is null!');
            return;
        }

        try {
            // --- DETAILED LOGGING ---
            const countBeforeClear = markerElement.querySelectorAll('.tab-content-container').length;
            const hadExpTabBefore = window.experimentalTabInstance && markerElement.contains(window.experimentalTabInstance); // Added check for instance existence

            // --- END LOGGING ---

            // 清空现有内容
            markerElement.innerHTML = '';

            // --- DETAILED LOGGING ---
            const countAfterClear = markerElement.querySelectorAll('.tab-content-container').length;

            // --- END LOGGING ---

            // 添加新内容
            if (content instanceof Node) { // Check if content is a valid DOM Node
                 // --- DETAILED LOGGING ---
                 const countInContent = content.querySelectorAll('.tab-content-container').length;

                 // --- END LOGGING ---
                
                 markerElement.appendChild(content);

                 // --- DETAILED LOGGING ---
                 const countAfterAppend = markerElement.querySelectorAll('.tab-content-container').length;
                 const hasExpTabAfter = window.experimentalTabInstance && markerElement.contains(window.experimentalTabInstance); // Added check for instance existence

                 // --- END LOGGING ---
            } else {
                 console.warn('[MarkerComponent::setContent] Received content is not a valid Node, cannot append.');
            }
        } catch (error) {
            console.error('[MarkerComponent] Error setting content:', error);
            // Optionally add fallback content
            markerElement.innerHTML = '<div style="color: red;">Error displaying content.</div>';
            // Re-throw or handle as needed
            // throw error; 
        }
    }
}

