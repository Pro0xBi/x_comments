/**
 * 事件管理器
 * 
 * 提供事件发布订阅系统和服务定位功能，是系统中组件通信和依赖管理的核心。
 * 该实现提供了服务状态管理、异步服务解析和生命周期事件。
 * 
 * @implements {EventManagerInterface}
 */
class EventManager {
  /**
   * 创建事件管理器
   */
  constructor() {
    // 事件监听器映射
    this.eventListeners = new Map();
    
    // 服务实例映射
    this.services = new Map();
    
    // 服务状态映射 - 记录每个服务的当前状态
    this.serviceStatus = new Map();
    
    // 等待服务的Promise映射
    this.waitingPromises = new Map();
    
    // 服务标签映射 - 用于服务分类和查询
    this.serviceTags = new Map();
    
    // 内部标志
    this._initialized = false;
    
    // 初始化
    this._init();
  }
  
  /**
   * 内部初始化
   * @private
   */
  _init() {
    // 初始化内部事件侦听
    this._setupInternalListeners();
    this._initialized = true;
  }
  
  /**
   * 设置内部事件侦听
   * @private
   */
  _setupInternalListeners() {
    // 侦听服务状态变更事件
    this.subscribe('service:statusChanged', this._handleServiceStatusChange.bind(this));
  }
  
  /**
   * 处理服务状态变更
   * @private
   * @param {Object} data - 状态变更数据
   */
  _handleServiceStatusChange(data) {
    const { name, status, previousStatus } = data;
    
    // 当服务变为就绪状态时，解析所有等待该服务的Promise
    if (status === 'ready' && this.waitingPromises.has(name)) {
      const promises = this.waitingPromises.get(name);
      const service = this.services.get(name);
      
      promises.forEach(({ resolve }) => {
        resolve(service);
      });
      
      this.waitingPromises.delete(name);
    }
  }
  
  /**
   * 订阅事件
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   * @param {Object} [context] - 回调函数的this上下文
   * @returns {Function} 取消订阅的函数
   */
  subscribe(event, callback, context) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    
    const listeners = this.eventListeners.get(event);
    const listener = { callback, context };
    
    listeners.push(listener);
    
    // 返回取消订阅的函数
    return () => this.unsubscribe(event, callback, context);
  }
  
  /**
   * 取消订阅事件
   * @param {string} event - 事件名称
   * @param {Function} callback - 原始回调函数
   * @param {Object} [context] - 原始上下文
   * @returns {boolean} 是否成功取消订阅
   */
  unsubscribe(event, callback, context) {
    if (!this.eventListeners.has(event)) {
      return false;
    }
    
    const listeners = this.eventListeners.get(event);
    const index = listeners.findIndex(listener => 
      listener.callback === callback && 
      (context === undefined || listener.context === context)
    );
    
    if (index !== -1) {
      listeners.splice(index, 1);
      return true;
    }
    
    return false;
  }
  
  /**
   * 发布事件
   * @param {string} event - 事件名称
   * @param {*} data - 事件数据
   * @returns {void}
   */
  publish(event, data) {
    if (!this.eventListeners.has(event)) {
      return;
    }
    
    const listeners = this.eventListeners.get(event);
    
    // 创建副本处理，以防在回调中修改监听器列表
    const listenersCopy = [...listeners];
    
    listenersCopy.forEach(listener => {
      try {
        if (listener.context) {
          listener.callback.call(listener.context, data);
        } else {
          listener.callback(data);
        }
      } catch (error) {
        console.error(`Error in event listener for "${event}":`, error);
        
        // 发布事件处理错误事件
        if (event !== 'event:handlerError') {
          this.publish('event:handlerError', {
            originalEvent: event,
            originalData: data,
            error,
            handler: listener.callback
          });
        }
      }
    });
  }
  
  /**
   * 注册服务
   * @param {string} name - 服务名称
   * @param {Object} instance - 服务实例
   * @param {Object} [options={}] - 注册选项
   * @param {boolean} [options.overwrite=false] - 是否覆盖已存在的服务
   * @param {string} [options.initialStatus='registered'] - 初始状态
   * @param {Array<string>} [options.tags=[]] - 服务标签
   * @param {Object} [options.metadata={}] - 服务元数据
   * @returns {boolean} 是否成功注册
   */
  registerService(name, instance, options = {}) {
    const {
      overwrite = false,
      initialStatus = 'registered',
      tags = [],
      metadata = {}
    } = options;
    
    // 检查服务是否已注册且不允许覆盖
    if (this.services.has(name) && !overwrite) {
      console.warn(`Service "${name}" already registered`);
      return false;
    }
    
    // 注册服务实例
    this.services.set(name, instance);
    
    // 设置初始状态
    this.serviceStatus.set(name, {
      status: initialStatus,
      timestamp: Date.now(),
      metadata: { ...metadata }
    });
    
    // 添加标签
    tags.forEach(tag => {
      if (!this.serviceTags.has(tag)) {
        this.serviceTags.set(tag, new Set());
      }
      this.serviceTags.get(tag).add(name);
    });
    
    // 发布服务注册事件
    this.publish('service:registered', {
      name,
      instance,
      status: initialStatus,
      tags,
      metadata
    });
    
    return true;
  }
  
  /**
   * 获取服务
   * @param {string} name - 服务名称
   * @returns {Object|null} 服务实例或null（如果不存在）
   */
  getService(name) {
    if (!this.services.has(name)) {
      return null;
    }
    
    return this.services.get(name);
  }
  
  /**
   * 获取服务状态
   * @param {string} name - 服务名称
   * @returns {Object|null} 状态对象或null（如果不存在）
   */
  getServiceStatus(name) {
    if (!this.serviceStatus.has(name)) {
      return null;
    }
    
    return { ...this.serviceStatus.get(name) };
  }
  
  /**
   * 更新服务状态
   * @param {string} name - 服务名称
   * @param {string} status - 新状态
   * @param {Object} [metadata={}] - 状态相关的元数据
   * @returns {boolean} 是否成功更新
   */
  updateServiceStatus(name, status, metadata = {}) {
    if (!this.services.has(name)) {
      console.warn(`Cannot update status: Service "${name}" not registered`);
      return false;
    }
    
    const previousStatus = this.serviceStatus.get(name);
    const newStatus = {
      status,
      timestamp: Date.now(),
      metadata: { 
        ...previousStatus.metadata,
        ...metadata 
      }
    };
    
    // 更新状态
    this.serviceStatus.set(name, newStatus);
    
    // 发布状态变更事件
    this.publish('service:statusChanged', {
      name,
      status,
      previousStatus: previousStatus.status,
      timestamp: newStatus.timestamp,
      metadata: newStatus.metadata
    });
    
    return true;
  }
  
  /**
   * 异步等待并获取服务
   * @async
   * @param {string} name - 服务名称
   * @param {Object} [options={}] - 选项
   * @param {number} [options.timeout=5000] - 超时时间（毫秒）
   * @param {string} [options.requiredStatus='ready'] - 要求的服务状态
   * @param {boolean} [options.throwOnError=true] - 是否在错误时抛出异常
   * @returns {Promise<Object>} 服务实例
   * @throws {Error} 如果超时或服务无法获取
   */
  async ensureService(name, options = {}) {
    const {
      timeout = 5000,
      requiredStatus = 'ready',
      throwOnError = true
    } = options;
    
    // 检查服务是否已注册并满足状态要求
    const service = this.getService(name);
    if (service) {
      const status = this.getServiceStatus(name);
      if (status && status.status === requiredStatus) {
        return service;
      }
    }
    
    // 如果服务未注册或未达到所需状态，等待
    return new Promise((resolve, reject) => {
      // 创建等待超时
      const timeoutId = setTimeout(() => {
        // 如果服务注册但未达到所需状态，更新等待Promise映射
        if (this.waitingPromises.has(name)) {
          const promises = this.waitingPromises.get(name);
          const index = promises.findIndex(p => p.resolve === resolve && p.reject === reject);
          if (index !== -1) {
            promises.splice(index, 1);
            if (promises.length === 0) {
              this.waitingPromises.delete(name);
            }
          }
        }
        
        const error = new Error(`Timeout waiting for service "${name}" with status "${requiredStatus}"`);
        
        // 发布服务等待超时事件
        this.publish('service:waitTimeout', {
          name,
          requiredStatus,
          timeout,
          error
        });
        
        if (throwOnError) {
          reject(error);
        } else {
          resolve(null);
        }
      }, timeout);
      
      // 创建状态变更监听器
      const statusListener = (data) => {
        if (data.name === name && data.status === requiredStatus) {
          // 清除超时
          clearTimeout(timeoutId);
          
          // 取消订阅
          this.unsubscribe('service:statusChanged', statusListener);
          
          // 更新等待Promise映射
          if (this.waitingPromises.has(name)) {
            const promises = this.waitingPromises.get(name);
            const index = promises.findIndex(p => p.resolve === resolve && p.reject === reject);
            if (index !== -1) {
              promises.splice(index, 1);
              if (promises.length === 0) {
                this.waitingPromises.delete(name);
              }
            }
          }
          
          // 返回服务实例
          resolve(this.getService(name));
        }
      };
      
      // 订阅状态变更事件
      this.subscribe('service:statusChanged', statusListener);
      
      // 创建服务注册监听器
      const registrationListener = (data) => {
        if (data.name === name) {
          // 如果注册时状态已满足要求，直接解析
          if (data.status === requiredStatus) {
            // 清除超时
            clearTimeout(timeoutId);
            
            // 取消订阅
            this.unsubscribe('service:registered', registrationListener);
            this.unsubscribe('service:statusChanged', statusListener);
            
            // 返回服务实例
            resolve(data.instance);
          }
          // 否则，继续等待状态变更
        }
      };
      
      // 订阅服务注册事件
      this.subscribe('service:registered', registrationListener);
      
      // 将Promise存储在等待映射中
      if (!this.waitingPromises.has(name)) {
        this.waitingPromises.set(name, []);
      }
      
      this.waitingPromises.get(name).push({
        resolve,
        reject,
        requiredStatus,
        timeoutId
      });
    });
  }
  
  /**
   * 根据标签查找服务
   * @param {string} tag - 服务标签
   * @returns {Array<Object>} 服务实例数组
   */
  findServicesByTag(tag) {
    if (!this.serviceTags.has(tag)) {
      return [];
    }
    
    const serviceNames = Array.from(this.serviceTags.get(tag));
    return serviceNames.map(name => this.getService(name)).filter(Boolean);
  }
  
  /**
   * 连接两个组件，设置它们之间的事件监听
   * @param {Object} sourceComponent - 源组件
   * @param {Object} targetComponent - 目标组件
   * @param {Array<Object>} events - 事件配置
   * @returns {Function} 断开连接的函数
   */
  connect(sourceComponent, targetComponent, events) {
    const unsubscribeFunctions = [];
    
    events.forEach(event => {
      const { name, targetMethod } = event;
      
      if (typeof targetComponent[targetMethod] !== 'function') {
        console.warn(`Target method "${targetMethod}" is not a function`);
        return;
      }
      
      const unsubscribe = this.subscribe(
        name,
        targetComponent[targetMethod].bind(targetComponent)
      );
      
      unsubscribeFunctions.push(unsubscribe);
    });
    
    // 返回断开连接的函数
    return () => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    };
  }
  
  /**
   * 列出所有注册的服务
   * @returns {Array<string>} 服务名称数组
   */
  listServices() {
    return Array.from(this.services.keys());
  }
  
  /**
   * 列出特定事件的所有订阅者
   * @param {string} event - 事件名称
   * @returns {Array<Object>} 订阅者信息数组
   */
  listSubscribers(event) {
    if (!this.eventListeners.has(event)) {
      return [];
    }
    
    return this.eventListeners.get(event).map(listener => ({
      hasContext: !!listener.context,
      functionName: listener.callback.name || '(anonymous)'
    }));
  }
  
  /**
   * 创建具有命名空间的事件管理器
   * @param {string} namespace - 命名空间
   * @returns {Object} 命名空间事件管理器
   */
  createNamespaced(namespace) {
    const self = this;
    
    return {
      subscribe: (event, callback, context) => 
        self.subscribe(`${namespace}:${event}`, callback, context),
        
      unsubscribe: (event, callback, context) => 
        self.unsubscribe(`${namespace}:${event}`, callback, context),
        
      publish: (event, data) => 
        self.publish(`${namespace}:${event}`, data)
    };
  }
  
  /**
   * 销毁事件管理器
   * 清理所有事件监听器和服务引用
   */
  destroy() {
    // 清理所有等待的Promise
    this.waitingPromises.forEach((promises, name) => {
      promises.forEach(({ timeoutId, reject }) => {
        clearTimeout(timeoutId);
        reject(new Error(`EventManager is being destroyed while waiting for service "${name}"`));
      });
    });
    
    // 清理数据
    this.eventListeners.clear();
    this.services.clear();
    this.serviceStatus.clear();
    this.waitingPromises.clear();
    this.serviceTags.clear();
    
    this._initialized = false;
  }
} 