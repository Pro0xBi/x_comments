
class ServiceContainer {
  /**
   * 创建服务容器
   * @param {EventManager} eventManager - 事件管理器实例
   */
  constructor(eventManager) {
    /**
     * 事件管理器实例
     * @type {EventManager}
     * @private
     */
    this._eventManager = eventManager;
    
    /**
     * 服务注册信息映射
     * @type {Map<string, Object>}
     * @private
     */
    this._registrations = new Map();
    
    /**
     * 接口与实现映射
     * @type {Map<string, string>}
     * @private
     */
    this._interfaces = new Map();
    
    /**
     * 服务实例缓存
     * @type {Map<string, Object>}
     * @private
     */
    this._instances = new Map();
    
    /**
     * 正在解析的服务，用于检测循环依赖
     * @type {Set<string>}
     * @private
     */
    this._resolving = new Set();
    
    /**
     * 依赖图
     * @type {Map<string, Set<string>>}
     * @private
     */
    this._dependencyGraph = new Map();
    
    // 初始化
    this._init();
  }
  
  /**
   * 初始化容器
   * @private
   */
  _init() {
    // 注册容器自身为服务
    this.register('serviceContainer', this, {
      singleton: true,
      autoRegister: true,
      tags: ['core', 'container']
    });
    
    // 注册事件管理器
    if (this._eventManager) {
      this.register('eventManager', this._eventManager, {
        singleton: true,
        autoRegister: true,
        tags: ['core', 'events']
      });
    }
  }
  
  /**
   * 注册服务
   * @param {string} serviceId - 服务ID
   * @param {Object|Function} implementation - 服务实现或工厂函数
   * @param {Object} [options={}] - 注册选项
   * @param {boolean} [options.singleton=true] - 是否为单例
   * @param {boolean} [options.autoRegister=false] - 是否自动注册到事件管理器
   * @param {Array<string>} [options.dependencies=[]] - 依赖项服务ID数组，顺序必须与构造函数/工厂函数参数顺序一致
   * @param {Array<string>} [options.tags=[]] - 服务标签
   * @param {Object} [options.metadata={}] - 服务元数据
   * @returns {ServiceContainer} 服务容器实例，便于链式调用
   */
  register(serviceId, implementation, options = {}) {
    const {
      singleton = true,
      autoRegister = false,
      dependencies = [], // Expects an array of service IDs
      tags = [],
      metadata = {}
    } = options;
    
    // 创建注册信息
    const registration = {
      serviceId,
      implementation,
      singleton,
      instantiated: false,
      dependencies, // This should be an array of service IDs
      tags,
      metadata,
      autoRegister
    };
    
    // 存储注册信息
    this._registrations.set(serviceId, registration);
    
    // 构建依赖图
    this._updateDependencyGraph(serviceId, dependencies);
    
    // 如果是已创建的实例且需要自动注册
    if (typeof implementation !== 'function' && autoRegister && this._eventManager) {
      this._eventManager.registerService(serviceId, implementation, {
        initialStatus: 'ready',
        tags,
        metadata,
        overwrite: true
      });
      
      // 标记为已实例化
      registration.instantiated = true;
      this._instances.set(serviceId, implementation);
    }
    
    return this;
  }
  
  /**
   * 注册接口映射
   * @param {string} interfaceId - 接口ID
   * @param {string} implementationId - 实现ID
   * @returns {ServiceContainer} 服务容器实例，便于链式调用
   */
  registerInterface(interfaceId, implementationId) {
    this._interfaces.set(interfaceId, implementationId);
    return this;
  }
  
  /**
   * 更新依赖图
   * @private
   * @param {string} serviceId - 服务ID
   * @param {Array<string>} dependencies - 依赖项服务ID数组
   */
  _updateDependencyGraph(serviceId, dependencies) {
    // 创建依赖集合
    if (!this._dependencyGraph.has(serviceId)) {
      this._dependencyGraph.set(serviceId, new Set());
    }
    
    // 添加依赖
    const dependencySet = this._dependencyGraph.get(serviceId);
    dependencies.forEach(depId => {
      // Ensure depId is a string, as expected by registration.dependencies
      if (typeof depId === 'string') {
        dependencySet.add(depId);
      } else {
       
      }
    });
  }
  
  /**
   * 检查循环依赖
   * @private
   * @param {string} serviceId - 服务ID
   * @throws {Error} 如果检测到循环依赖
   */
  _checkCircularDependency(serviceId) {
    if (this._resolving.has(serviceId)) {
      throw new Error(`Circular dependency detected when resolving "${serviceId}"`);
    }
  }
  
  /**
   * 解析依赖路径
   * @private
   * @param {string} serviceId - 服务ID
   * @returns {Array<string>} 依赖路径
   */
  _resolveDependencyPath(serviceId) {
    const visited = new Set();
    const path = [];
    
    const dfs = (id) => {
      if (visited.has(id)) return;
      
      visited.add(id);
      path.push(id);
      
      const dependencies = this._dependencyGraph.get(id) || new Set();
      
      // 按字母顺序排序依赖，以确保确定性结果
      const sortedDeps = Array.from(dependencies).sort();
      
      for (const depId of sortedDeps) {
        dfs(depId);
      }
    };
    
    dfs(serviceId);
    return path;
  }
  
  /**
   * 获取服务实例
   * @param {string} serviceId - 服务ID
   * @returns {Object|null} 服务实例或null（如果未注册）
   * @throws {Error} 如果解析过程中发生错误
   */
  get(serviceId) {
    // 检查是否为接口，如果是则重定向到实现
    if (this._interfaces.has(serviceId)) {
  
      return this.get(this._interfaces.get(serviceId));
    }
    
    // 检查是否已注册
    if (!this._registrations.has(serviceId)) {
  
      return null;
    }
    
    const registration = this._registrations.get(serviceId);
    
    // 如果是单例且已实例化，直接返回缓存的实例
    if (registration.singleton && registration.instantiated) {
      const cachedInstance = this._instances.get(serviceId);
     
      return cachedInstance;
    }
    
    // 检查循环依赖
    this._checkCircularDependency(serviceId);
    
    try {
      // 标记为正在解析
      this._resolving.add(serviceId);
      
      // 解析实例
      let instance;
      
      if (typeof registration.implementation === 'function') {
        // 如果是工厂函数或构造函数
        // console.log(`[ServiceContainer.get] Resolving "${serviceId}" using function/constructor.`); // DEBUG
        const resolvedDependenciesArray = this._resolveDependencies(registration.dependencies);
        
      

        if (this._isConstructor(registration.implementation)) {
        
          instance = new registration.implementation(...resolvedDependenciesArray);
        } else {
         
          instance = registration.implementation(...resolvedDependenciesArray);
        }
      } else {
        // 如果是直接注册的值
        instance = registration.implementation;
       
      }
      
      // 如果是单例，缓存实例并标记为已实例化
      if (registration.singleton) {
        registration.instantiated = true;
        this._instances.set(serviceId, instance);
      }
      
      // 如果需要自动注册到事件管理器
      if (registration.autoRegister && this._eventManager) {
        this._eventManager.registerService(serviceId, instance, {
          initialStatus: 'ready',
          tags: registration.tags,
          metadata: registration.metadata,
          overwrite: true
        });
      }
      
      return instance;
    } finally {
      // 解析完成，移除标记
      this._resolving.delete(serviceId);
    }
  }
  
  /**
   * 解析依赖项
   * @private
   * @param {Array<string>} dependencyIds - 依赖项服务ID数组，顺序必须与构造函数/工厂函数参数顺序一致
   * @returns {Array<Object>} 已解析的依赖项实例数组，顺序与输入一致
   */
  _resolveDependencies(dependencyIds) {
    // Ensure dependencyIds is an array, if not, log an error or handle gracefully
    if (!Array.isArray(dependencyIds)) {
        console.error('[ServiceContainer._resolveDependencies] Expected dependencyIds to be an array, received:', dependencyIds, 'for service being resolved.');
        // Decide on a graceful exit or throw an error. For now, returning empty array to prevent further .map errors.
        return []; 
    }
    
    const resolved = [];
    dependencyIds.forEach(depId => {
      if (typeof depId === 'string') {
        // 简单依赖，直接获取并推入数组
        resolved.push(this.get(depId));
      } else {
       
        resolved.push(null); // Or handle error more strictly
      }
    });
    
    return resolved;
  }
  
  /**
   * 检查是否为构造函数
   * @private
   * @param {Function} func - 要检查的函数
   * @returns {boolean} 是否为构造函数
   */
  _isConstructor(func) {
    return !!func.prototype && !!func.prototype.constructor.name;
  }
  
  /**
   * 异步初始化服务
   * @param {string} serviceId - 服务ID
   * @param {Object} [options={}] - 初始化选项
   * @param {number} [options.timeout=10000] - 超时时间（毫秒）
   * @returns {Promise<Object>} 初始化完成的服务实例
   * @throws {Error} 如果初始化失败或超时
   */
  async initialize(serviceId, options = {}) {
    const { timeout = 10000 } = options;
    
    // 获取服务实例
    const instance = this.get(serviceId);
    
    if (!instance) {
      throw new Error(`Cannot initialize: Service "${serviceId}" not registered`);
    }
    
    // 如果没有initialize方法，直接返回
    if (typeof instance.initialize !== 'function') {
      return instance;
    }
    
    // 创建初始化Promise
    const initPromise = instance.initialize();
    
    // 创建超时Promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Timeout initializing service "${serviceId}"`));
      }, timeout);
    });
    
    // 等待初始化完成或超时
    await Promise.race([initPromise, timeoutPromise]);
    
    // 更新服务状态
    if (this._eventManager) {
      this._eventManager.updateServiceStatus(serviceId, 'ready', {
        initializedAt: Date.now()
      });
    }
    
    return instance;
  }
  
  /**
   * 异步初始化所有服务
   * @param {Object} [options={}] - 初始化选项
   * @param {number} [options.timeout=30000] - 总超时时间（毫秒）
   * @param {boolean} [options.parallel=false] - 是否并行初始化
   * @returns {Promise<Map<string, Object>>} 初始化结果映射
   * @throws {Error} 如果初始化过程中发生不可恢复的错误
   */
  async initializeAll(options = {}) {
    const {
      timeout = 30000,
      parallel = false
    } = options;
    
    const startTime = Date.now();
    const results = new Map();
    const errors = [];
    
    // 获取所有服务ID
    const serviceIds = Array.from(this._registrations.keys());
    
    // 解析依赖顺序
    const initOrder = [];
    serviceIds.forEach(id => {
      if (!initOrder.includes(id)) {
        const path = this._resolveDependencyPath(id);
        path.reverse().forEach(depId => {
          if (!initOrder.includes(depId)) {
            initOrder.push(depId);
          }
        });
      }
    });
    
    if (parallel) {
      // 并行初始化所有服务
      const promises = initOrder.map(async (id) => {
        try {
          // 检查剩余时间
          const elapsedTime = Date.now() - startTime;
          const remainingTime = Math.max(1000, timeout - elapsedTime);
          
          const instance = await this.initialize(id, { timeout: remainingTime });
          results.set(id, instance);
        } catch (error) {          errors.push({ id, error });
          console.error(`Failed to initialize service "${id}":`, error);
        }
      });
      
      await Promise.all(promises);
    } else {
      // 按顺序初始化服务
      for (const id of initOrder) {
        try {
          // 检查剩余时间
          const elapsedTime = Date.now() - startTime;
          const remainingTime = Math.max(1000, timeout - elapsedTime);
          
          if (elapsedTime >= timeout) {
            throw new Error('Initialization timeout reached');
          }
          
          const instance = await this.initialize(id, { timeout: remainingTime });
          results.set(id, instance);
        } catch (error) {
          errors.push({ id, error });
         
          const registration = this._registrations.get(id);
          if (registration && registration.metadata.critical) {
            throw new Error(`Critical service "${id}" failed to initialize: ${error.message}`);
          }
        }
      }
    }
    
    // 发布初始化完成事件
    if (this._eventManager) {
      this._eventManager.publish('services:initialized', {
        successful: results.size,
        failed: errors.length,
        errors,
        elapsedTime: Date.now() - startTime
      });
    }
    
    return results;
  }
  
  /**
   * 根据标签查找服务
   * @param {string} tag - 服务标签
   * @returns {Array<Object>} 服务实例数组
   */
  findByTag(tag) {
    const matches = [];
    
    this._registrations.forEach((registration, id) => {
      if (registration.tags.includes(tag)) {
        const instance = this.get(id);
        if (instance) {
          matches.push(instance);
        }
      }
    });
    
    return matches;
  }
  
  /**
   * 检查服务是否已注册
   * @param {string} serviceId - 服务ID
   * @returns {boolean} 是否已注册
   */
  has(serviceId) {
    return this._registrations.has(serviceId) || this._interfaces.has(serviceId);
  }
  
  /**
   * 获取服务注册信息
   * @param {string} serviceId - 服务ID
   * @returns {Object|null} 注册信息或null（如果未注册）
   */
  getRegistration(serviceId) {
    if (!this._registrations.has(serviceId)) {
      return null;
    }
    
    return { ...this._registrations.get(serviceId) };
  }
  
  /**
   * 移除服务注册
   * @param {string} serviceId - 服务ID
   * @returns {boolean} 是否成功移除
   */
  unregister(serviceId) {
    if (!this._registrations.has(serviceId)) {
      return false;
    }
    
    // 从事件管理器中移除
    if (this._eventManager && this._eventManager.getService(serviceId)) {
      // 目前EventManager没有unregisterService方法，未来可添加
    }
    
    // 移除实例和注册信息
    this._instances.delete(serviceId);
    this._registrations.delete(serviceId);
    
    // 从依赖图中移除
    this._dependencyGraph.delete(serviceId);
    this._dependencyGraph.forEach((deps) => {
      deps.delete(serviceId);
    });
    
    // 移除接口映射
    this._interfaces.forEach((implId, intId) => {
      if (implId === serviceId) {
        this._interfaces.delete(intId);
      }
    });
    
    return true;
  }
  
  /**
   * 销毁容器并清理资源
   */
  destroy() {
    // 销毁所有实例（如果有destroy方法）
    this._instances.forEach((instance, id) => {
      if (instance && typeof instance.destroy === 'function') {
        try {
          instance.destroy();
        } catch (error) {
          console.error(`Error destroying service "${id}":`, error);
        }
      }
    });
    
    // 清理内部状态
    this._registrations.clear();
    this._interfaces.clear();
    this._instances.clear();
    this._resolving.clear();
    this._dependencyGraph.clear();
    
    // 移除事件管理器引用
    this._eventManager = null;
  }
}

// 导出
if (typeof module !== 'undefined') {
  module.exports = ServiceContainer;
} 