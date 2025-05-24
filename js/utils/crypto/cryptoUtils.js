/**
 * API密钥加密工具类
 * 使用 AES-GCM 算法进行加密
 * 数据加密密钥 (DEK) 通过 PBKDF2 从本地主密钥 (LMS) 和每个配置唯一的盐派生而来
 */

// 密码学参数常量
const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH_BYTES = 16; // 128 bits
const AES_KEY_LENGTH_BITS = 256;
const PBKDF2_HASH_ALGORITHM = 'SHA-256'; // PBKDF2 哈希算法

class CryptoUtils {
    /**
     * 从本地主密钥和盐派生出数据加密密钥 (DEK)
     * @param {string} localMasterSecretString Base64编码的本地主密钥字符串
     * @param {Uint8Array} saltArrayBuffer 盐值
     * @returns {Promise<CryptoKey>} AES-GCM CryptoKey
     */
    static async getDerivedKey(localMasterSecretString, saltArrayBuffer) {
        try {
            // 1. 将Base64本地主密钥字符串解码为 Uint8Array
            const masterSecretBytes = Uint8Array.from(atob(localMasterSecretString), c => c.charCodeAt(0));

            // 2. 导入本地主密钥作为 PBKDF2 的基础密钥材料
            const importedMasterKey = await window.crypto.subtle.importKey(
                "raw",
                masterSecretBytes.buffer, // 使用 .buffer 获取 ArrayBuffer
                { name: "PBKDF2" },
                false, // non-exportable
                ["deriveBits"]
            );

            // 3. 使用 PBKDF2 派生密钥位
            const derivedKeyBits = await window.crypto.subtle.deriveBits(
                {
                    name: "PBKDF2",
                    salt: saltArrayBuffer,
                    iterations: PBKDF2_ITERATIONS,
                    hash: PBKDF2_HASH_ALGORITHM,
                },
                importedMasterKey,
                AES_KEY_LENGTH_BITS // 派生出 AES-256 密钥所需的位数
            );

            // 4. 将派生出的密钥位导入为 AES-GCM CryptoKey
            const derivedAesGcmKey = await window.crypto.subtle.importKey(
                "raw",
                derivedKeyBits,
                { name: "AES-GCM", length: AES_KEY_LENGTH_BITS },
                true, // DEK 本身是可导出的，但我们不直接导出它
                ["encrypt", "decrypt"]
            );
            return derivedAesGcmKey;

        } catch (error) {
            console.error('Key derivation failed:', error);
            throw new Error('密钥派生失败');
        }
    }

    /**
     * 加密API密钥
     * @param {string} apiKeyString 要加密的API密钥明文
     * @param {string} localMasterSecretString Base64编码的本地主密钥字符串
     * @returns {Promise<{encryptedData: number[], iv: number[], salt: number[]}>}
     */
    static async encrypt(apiKeyString, localMasterSecretString) {
        if (!localMasterSecretString) {
            throw new Error('本地主密钥 (LMS) 未提供，无法加密。');
        }
        try {
            // 生成随机IV (Initialization Vector)
            const iv = window.crypto.getRandomValues(new Uint8Array(12)); // AES-GCM 推荐 12 字节 IV

            // 生成随机Salt
            const salt = window.crypto.getRandomValues(new Uint8Array(SALT_LENGTH_BYTES));

            // 派生加密密钥 (DEK)
            const dek = await this.getDerivedKey(localMasterSecretString, salt);
            
            // 加密数据
            const encrypted = await window.crypto.subtle.encrypt(
                { name: "AES-GCM", iv: iv },
                dek,
                new TextEncoder().encode(apiKeyString)
            );
            
            // 返回加密后的数据包 (以数字数组形式，以便于JSON序列化存储)
            return {
                encryptedData: Array.from(new Uint8Array(encrypted)),
                iv: Array.from(iv),
                salt: Array.from(salt)
            };
        } catch (error) {
            throw new Error('加密失败，请重试');
        }
    }

    /**
     * 解密API密钥
     * @param {{encryptedData: number[], iv: number[], key?: number[], salt?: number[]}} encryptedPackage 加密的数据包
     * @param {string} localMasterSecretString Base64编码的本地主密钥字符串 (新格式解密时需要)
     * @returns {Promise<string>}
     */
    static async decrypt(encryptedPackage, localMasterSecretString) {
        try {
            let dek;
            const iv = new Uint8Array(encryptedPackage.iv);
            const encryptedData = new Uint8Array(encryptedPackage.encryptedData);

            if (encryptedPackage.key && encryptedPackage.key.length > 0) {
                // --- 旧格式处理 (用于数据迁移) ---
                console.warn("CryptoUtils: Decrypting using old format (direct key). Data should be migrated.");
                dek = await window.crypto.subtle.importKey(
                "raw",
                new Uint8Array(encryptedPackage.key),
                    { name: "AES-GCM", length: AES_KEY_LENGTH_BITS },
                true,
                ["encrypt", "decrypt"]
            );
            } else if (encryptedPackage.salt && encryptedPackage.salt.length > 0) {
                // --- 新格式处理 ---
                if (!localMasterSecretString) {
                    throw new Error('本地主密钥 (LMS) 未提供，无法解密新格式数据。');
                }
                const salt = new Uint8Array(encryptedPackage.salt);
                dek = await this.getDerivedKey(localMasterSecretString, salt);
            } else {
                throw new Error('无效的加密数据包：缺少key或salt');
            }

            // 解密数据
            const decrypted = await window.crypto.subtle.decrypt(
                { name: "AES-GCM", iv: iv },
                dek,
                encryptedData
            );

            return new TextDecoder().decode(decrypted);
        } catch (error) {
            console.error('Decryption failed:', error);
            if (error.message.startsWith('本地主密钥 (LMS) 未提供')) {
                throw error;
            }
            if (error.name === 'OperationError' && encryptedPackage.key) {
                 throw new Error('使用旧格式解密失败，可能是数据损坏或密钥不匹配。');
            } else if (error.name === 'OperationError') {
                 throw new Error('解密失败，可能是数据损坏、盐值不匹配或LMS不正确。');
            }
            throw new Error('解密操作失败，请检查数据是否正确或稍后重试');
        }
    }

    /**
     * 检查数据是否已加密 (支持新旧格式)
     * @param {any} data
     * @returns {boolean}
     */
    static isEncrypted(data) {
        try {
            if (!data || typeof data !== 'object') return false;

            const hasValidEncryptedData = Array.isArray(data.encryptedData) && data.encryptedData.length > 0 &&
                                          data.encryptedData.every(n => typeof n === 'number' && n >= 0 && n <= 255);
            const hasValidIv = Array.isArray(data.iv) && data.iv.length === 12 &&
                               data.iv.every(n => typeof n === 'number' && n >= 0 && n <= 255);

            if (!hasValidEncryptedData || !hasValidIv) return false;

            // 检查旧格式: 包含 key
            const hasOldKey = Array.isArray(data.key) && data.key.length === (AES_KEY_LENGTH_BITS / 8) && // 256 bits = 32 bytes
                   data.key.every(n => typeof n === 'number' && n >= 0 && n <= 255);
            
            // 检查新格式: 包含 salt
            const hasNewSalt = Array.isArray(data.salt) && data.salt.length === SALT_LENGTH_BYTES &&
                               data.salt.every(n => typeof n === 'number' && n >= 0 && n <= 255);

            if (hasOldKey && !hasNewSalt) return true; // 旧格式
            if (hasNewSalt && data.key === undefined) return true; // 新格式 (确保没有 key 字段)
            
            return false; // 其他情况视为无效或非加密数据
        } catch (error) {
            console.error('Data validation for encryption check failed:', error);
            return false;
        }
    }

    /**
     * 迁移旧数据到新的加密格式
     * @param {string} oldApiKey
     * @returns {Promise<{encryptedData: number[], iv: number[], key: number[]}>}
     */
    static async migrateOldData(oldApiKey) {
        if (!oldApiKey || typeof oldApiKey !== 'string') {
            throw new Error('无效的API密钥');
        }
        return await this.encrypt(oldApiKey);
    }
} 