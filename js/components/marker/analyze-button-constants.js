// 按钮状态
const ANALYZE_BUTTON_CONSTANTS = {
    // 状态
    STATES: {
        IDLE: 'idle',
        LOADING: 'loading',
        ERROR: 'error',
        SUCCESS: 'success',
        DISABLED: 'disabled',
        NO_CONFIG: 'no-config',
        WAITING_DATA: 'waiting-data'
    },
    
    // 模式
    MODES: {
        PRESET: 'preset',
        CUSTOM: 'custom'
    },
    
    // 按钮文本
    TEXT: {
        PRESET: '生成结果',
        CUSTOM: '生成结果',
        ERROR: '出错了，请重试',
        SUCCESS_PRESET: '生成结果',
        SUCCESS_CUSTOM: '生成结果',
        DISABLED: '暂不可用',
        NO_CONFIG: '请配置 API',
        WAITING_DATA: '加载数据...'
    },
    
    // 时间配置
    TIMING: {
        ANIMATION_DURATION: 300,
        DEBOUNCE_DELAY: 500,
        ERROR_DURATION: 3000,    // 错误状态显示时间
        SUCCESS_DURATION: 0      // 成功状态立即恢复
    },

    // CSS 类名
    CLASSES: {
        BASE: 'analyze-button',
        LOADING: 'loading',
        ERROR: 'error',
        SUCCESS: 'success',
        DISABLED: 'disabled',
        NO_CONFIG: 'no-config',
        WAITING_DATA: 'waiting-data',
        CUSTOM_MODE: 'custom-mode',
        PRESET_MODE: 'preset-mode'
    }
};
