class ModalComponent extends UIComponent {
    constructor(config = {}) {
        super({ ...config, id: 'global-ai-result-modal' }); // Assign a fixed ID
        this.isVisible = false; // Internal state
    }

    getClassName() {
        return 'ai-result-modal-overlay';
    }

    initialize() {
        // Create modal structure within this.element (the overlay)
        this.modalContent = document.createElement('div');
        this.modalContent.className = 'ai-result-modal-content';

        // --- BEGIN ADDED HEADER ---
        this.headerElement = document.createElement('div');
        this.headerElement.className = 'modal-header';

        this.logoElement = document.createElement('span'); // Using span as a container for img
        this.logoElement.className = 'modal-logo';

        this.logoImgElement = document.createElement('img');
        this.logoImgElement.className = 'modal-logo-img';
        try {
            this.logoImgElement.src = chrome.runtime.getURL('icons/icon48.png');
        } catch (e) {
            console.warn("[ModalComponent] Failed to get logo URL. May not be in an extension context.", e);
            this.logoImgElement.src = '../../icons/icon48.png'; // Fallback for non-extension contexts if needed
        }
        this.logoImgElement.alt = 'AI锐评 Logo';

        this.titleElement = document.createElement('h2');
        this.titleElement.className = 'modal-title';
        this.titleElement.textContent = 'AI锐评';

        this.logoElement.appendChild(this.logoImgElement);
        this.headerElement.appendChild(this.logoElement);
        this.headerElement.appendChild(this.titleElement);
        // --- END ADDED HEADER ---

        this.closeButton = document.createElement('button');
        this.closeButton.className = 'ai-result-modal-close';
        this.closeButton.innerHTML = '&times;'; // Use '×' symbol

        this.contentArea = document.createElement('div');
        this.contentArea.className = 'ai-result-modal-body';

        // --- MODIFIED TO PREPEND HEADER ---
        this.modalContent.appendChild(this.headerElement); 
        this.modalContent.appendChild(this.closeButton);
        this.modalContent.appendChild(this.contentArea);
        this.element.appendChild(this.modalContent);

        // Add event listeners
        this.closeButton.addEventListener('click', () => this.hide());
        // Click on overlay also closes
        this.element.addEventListener('click', (event) => {
            if (event.target === this.element) { 
                this.hide();
            }
        });

      
        this.modalContent.addEventListener('click', (event) => {
            event.stopPropagation();
        });

    }

    setContent(htmlString) {
        try {
            // 直接使用传入的、已经解析和处理过的 HTML 字符串
            this.contentArea.innerHTML = htmlString; // 直接使用 htmlString

            // 更新日志，不再记录 processedLength
            console.log('Modal content set. Length:', htmlString ? htmlString.length : 0);
        } catch (error) {
            // innerHTML 赋值本身很少出错，但保留以防万一
            console.error('Failed to set modal content via innerHTML:', error);
            this.contentArea.textContent = 'Error: Failed to display content'; // 简化错误信息
        }
    }

    show() {
        console.log('[ModalComponent show] Parent node:', this.element.parentNode, 'Is in DOM:', document.body.contains(this.element), 'Element display before:', this.element.style.display, 'Element classes before:', this.element.className);
        if (!this.isVisible) {
            this.element.classList.add('visible');
            this.isVisible = true;
            // Enhanced logging for overlay
            const overlayStyles = getComputedStyle(this.element);
            console.log(`[ModalComponent show] Overlay: Set isVisible to true. Classes: ${this.element.className}. Computed Styles: display=${overlayStyles.display}, opacity=${overlayStyles.opacity}, visibility=${overlayStyles.visibility}, z-index=${overlayStyles.zIndex}`);
            
            // Enhanced logging for content, check after overlay is made visible so transitions can apply
            if (this.modalContent) {
                // It might take a micro-task for transitions to start, but let's log immediately first
                const contentStyles = getComputedStyle(this.modalContent);
                console.log(`[ModalComponent show] Content: Computed Styles: opacity=${contentStyles.opacity}, transform=${contentStyles.transform}, display=${contentStyles.display}, z-index=${contentStyles.zIndex}`);
            }

            this.escapeKeyListener = (event) => {
                 if (event.key === 'Escape') {
                     this.hide();
                 }
            };
            document.addEventListener('keydown', this.escapeKeyListener);
        }
    }

    hide() {
        if (this.isVisible) {
            // this.element.style.display = 'none'; // Replaced with class toggle
            this.element.classList.remove('visible');
            this.isVisible = false;
           
            if (this.escapeKeyListener) {
                 document.removeEventListener('keydown', this.escapeKeyListener);
                 this.escapeKeyListener = null;
            }
             // Clear content when hiding? Optional, depends on desired behavior.
             // this.setContent('');
        }
    }

    /**
     * 销毁模态框组件，清理资源和事件监听器。
     */
    destroy() {
        

        // 1. 移除添加到 document 上的键盘监听器
        if (this.escapeKeyListener) {
            document.removeEventListener('keydown', this.escapeKeyListener);
            this.escapeKeyListener = null;
        }

        // 2. 移除事件监听器
        this.closeButton.removeEventListener('click', () => this.hide());
        this.element.removeEventListener('click', (event) => {
            if (event.target === this.element) {
                this.hide();
            }
        });
        this.modalContent.removeEventListener('click', (event) => {
            event.stopPropagation();
        });

        // 3. 清空内容
        this.contentArea.innerHTML = '';

        // 4. 从 DOM 中移除元素
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }

        
    }
};
