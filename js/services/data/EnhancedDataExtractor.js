class TweetDataManager {
    constructor() {
        this.currentTweetData = null;
        this.subscribers = new Set();
    }

    /**
     * 更新当前数据并通知订阅者
     * @param {Object} newData - 新的推文数据
     */
    updateData(newData) {
        this.currentTweetData = newData;
        this.notifySubscribers();
    }

    /**
     * 获取当前数据
     * @returns {Object} 当前推文数据
     */
    getData() {
        return this.currentTweetData;
    }

    /**
     * 添加数据更新订阅者
     * @param {Function} callback - 数据更新时的回调函数
     */
    subscribe(callback) {
        this.subscribers.add(callback);
    }

    /**
     * 移除数据更新订阅者
     * @param {Function} callback - 要移除的回调函数
     */
    unsubscribe(callback) {
        this.subscribers.delete(callback);
    }

    /**
     * 通知所有订阅者数据已更新
     * @private
     */
    notifySubscribers() {
        this.subscribers.forEach(callback => {
            try {
                callback(this.currentTweetData);
            } catch (error) {
               
            }
        });
    }
}

class EnhancedDataExtractor {
    constructor() {
        // 初始化默认数据结构
        this.defaultData = {
            author: {
                name: '',
                username: ''
            },
            text: '',
            metrics: {
                replies: 0,
                retweets: 0,
                likes: 0,
                views: 0
            },
            tweetId: null
        };

        // 定义指标选择器映射
        this.metricsSelectors = {
            'reply': 'replies',
            'retweet': 'retweets',
            'like': 'likes'
        };

        // 初始化 TweetDataManager
        this.tweetDataManager = new TweetDataManager();
    }

    /**
     * 从推文元素中提取数据
     * @param {HTMLElement} tweetElement - 推文的DOM元素
     * @returns {Object} 提取的推文数据
     */
    extractTweetData(tweetElement) {
        const data = JSON.parse(JSON.stringify(this.defaultData)); // 深拷贝默认数据结构

        try {
            this._extractAuthorInfo(tweetElement, data);
            this._extractTweetText(tweetElement, data);
            this._extractMetrics(tweetElement, data);
            this._extractTweetId(tweetElement, data);
        } catch (error) {
           
        }

       
        return data;
    }

    /**
     * 从推文元素中提取数据并更新到TweetDataManager
     * @param {HTMLElement} tweetElement - 推文的DOM元素
     * @returns {Object} 提取的推文数据
     */
    extractAndUpdateTweetData(tweetElement) {
        const data = this.extractTweetData(tweetElement);
        
        if (this.tweetDataManager) {
            this.tweetDataManager.updateData(data);
        }
        
        return data;
    }

    /**
     * 提取作者信息
     * @private
     */
    _extractAuthorInfo(tweetElement, data) {
        const authorElement = tweetElement.querySelector('div[data-testid="User-Name"]');
        if (!authorElement) {
            // console.warn('[EnhancedDataExtractor] 未找到作者元素');
            return;
        }

        // 获取显示名称
        const nameDiv = authorElement.querySelector('div:first-child');
        if (nameDiv) {
            data.author.name = nameDiv.textContent.trim();
        }

        // 获取用户名
        const usernameLinks = authorElement.querySelectorAll('a[role="link"]');
        if (usernameLinks.length >= 2) {
            const usernameHref = usernameLinks[1].getAttribute('href');
            if (usernameHref) {
                data.author.username = usernameHref.split('/').pop();
            }
        }
    }

    /**
     * 提取推文文本
     * @private
     */
    _extractTweetText(tweetElement, data) {
        const textElement = tweetElement.querySelector('[data-testid="tweetText"]');
        if (textElement) {
            data.text = textElement.textContent.trim();
        } else {
            // console.warn('[EnhancedDataExtractor] 未找到推文文本元素');
        }
    }

    /**
     * 提取互动指标
     * @private
     */
    _extractMetrics(tweetElement, data) {
        // 首先尝试从 aria-label 提取
        this._extractMetricsFromAriaLabel(tweetElement, data);

        // 如果主要指标未提取到，尝试从单独元素提取
        if (!this._allMetricsExtracted(data.metrics)) {
            this._extractMetricsFromElements(tweetElement, data);
        }

        // 如果浏览量未提取到，尝试从 analytics 链接提取
        if (!data.metrics.views) {
            this._extractViewsFromAnalytics(tweetElement, data);
        }
    }

    /**
     * 从aria-label提取指标
     * @private
     */
    _extractMetricsFromAriaLabel(tweetElement, data) {
        const statsContainer = tweetElement.querySelector('div[role="group"][aria-label*="view"]');
        if (!statsContainer) return;

        const ariaLabel = statsContainer.getAttribute('aria-label');
        if (!ariaLabel) return;

        const metrics = {
            'repl': ['replies', /(\d+[\.\d]*[KMB]?)\s+repl/i],
            're(post|tweet)': ['retweets', /(\d+[\.\d]*[KMB]?)\s+re(post|tweet)/i],
            'like': ['likes', /(\d+[\.\d]*[KMB]?)\s+like/i],
            'view': ['views', /(\d+[\.\d]*[KMB]?)\s+view/i]
        };

        for (const [key, [metricKey, regex]] of Object.entries(metrics)) {
            const match = ariaLabel.match(regex);
            if (match) {
                data.metrics[metricKey] = this.convertStatValue(match[1]);
            }
        }
    }

    /**
     * 从单独元素提取指标
     * @private
     */
    _extractMetricsFromElements(tweetElement, data) {
        for (const [testId, key] of Object.entries(this.metricsSelectors)) {
            if (!data.metrics[key]) {
                const element = tweetElement.querySelector(
                    `div[data-testid="${testId}"] span[data-testid="app-text-transition-container"]`
                );
                if (element) {
                    data.metrics[key] = this.convertStatValue(element.textContent);
                }
            }
        }
    }

    /**
     * 从analytics链接提取浏览量
     * @private
     */
    _extractViewsFromAnalytics(tweetElement, data) {
        const viewLink = tweetElement.querySelector('a[href*="/analytics"]');
        if (!viewLink) {
            // console.log('[EnhancedDataExtractor] 未找到分析链接');
            return;
        }

        // 尝试从aria-label提取
        const viewAriaLabel = viewLink.getAttribute('aria-label');
        if (viewAriaLabel && viewAriaLabel.includes('view')) {
            const viewMatch = viewAriaLabel.match(/(\d+[\.\d]*[KMB]?)\s+view/i);
            if (viewMatch) {
                data.metrics.views = this.convertStatValue(viewMatch[1]);
                return;
            }
        }

        // 如果aria-label没有提供视图数，尝试从链接文本提取
        const viewText = viewLink.textContent.trim();
        if (viewText && /\d/.test(viewText)) {
            data.metrics.views = this.convertStatValue(viewText);
        }
    }

    /**
     * 检查是否所有指标都已提取
     * @private
     */
    _allMetricsExtracted(metrics) {
        return metrics.replies > 0 && metrics.retweets > 0 && metrics.likes > 0;
    }

    /**
     * 转换统计值为数字
     * @private
     */
    convertStatValue(value) {
        if (!value) return 0;
        
        const num = parseFloat(value.replace(/[^0-9.]/g, ''));
        if (isNaN(num)) return 0;

        if (value.includes('K')) return num * 1000;
        if (value.includes('M')) return num * 1000000;
        if (value.includes('B')) return num * 1000000000;

        return num;
    }

    /**
     * 提取推文ID
     * @private
     */
    _extractTweetId(tweetElement, data) {
        let tweetId = null;

        // 方法1：从article的aria-labelledby属性获取
        const article = tweetElement.closest('article');
        if (article) {
            const ariaLabelledby = article.getAttribute('aria-labelledby');
            if (ariaLabelledby) {
                tweetId = ariaLabelledby.split('-').pop();
             
            }
        }

        // 方法2：从时间戳链接获取
        if (!tweetId) {
            const timeElement = tweetElement.querySelector('a[href*="/status/"] time');
            if (timeElement) {
                const tweetLink = timeElement.closest('a[href*="/status/"]');
                if (tweetLink) {
                    const href = tweetLink.getAttribute('href');
                    const match = href.match(/\/status\/(\d+)/);
                    if (match && match[1]) {
                        tweetId = match[1];
                       
                    }
                }
            }
        }

        // 方法3：从analytics链接获取
        if (!tweetId) {
            const analyticsLink = tweetElement.querySelector('a[href*="/analytics"]');
            if (analyticsLink) {
                const href = analyticsLink.getAttribute('href');
                const match = href.match(/\/status\/(\d+)/);
                if (match && match[1]) {
                    tweetId = match[1];
                   
                }
            }
        }

        if (tweetId) {
            data.tweetId = tweetId;
        } else {
            // console.warn('[EnhancedDataExtractor] 无法获取tweetId');
        }
    }
} 