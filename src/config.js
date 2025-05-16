/**
 * API 配置管理
 * 提供动态配置和更新API设置的功能
 */

// 默认配置
const defaultConfig = {
    key: "gemini", // 警告：API 密钥已暴露，仅供演示！
    baseurl: "https://snemc-gemini-balance.hf.space/v1/chat/completions",
    model: "gemini-2.5-flash-preview-04-17", // 重要提示：请确保此模型支持多模态输入！
    system_prompt: "你是一个中文助手，帮助用户回答问题,回答时需要使用中文。如果需要代码，请使用markdown格式输出，并明确指定代码语言类型，例如 ```python ... ```。" // 更新系统提示，鼓励 Markdown 输出并指定语言
};

// 实际使用的配置，初始为默认配置
let currentConfig = { ...defaultConfig };

// 本地存储键
const STORAGE_KEY = 'chat_api_providers';
const ACTIVE_PROVIDER_KEY = 'chat_active_provider';

/**
 * 获取当前API配置
 * @returns {Object} 当前使用的API配置
 */
export function getApiConfig() {
    return { ...currentConfig };
}

/**
 * 更新API配置
 * @param {Object} newConfig 新的配置对象
 */
export function updateApiConfig(newConfig) {
    currentConfig = { ...newConfig };
    console.log('API配置已更新:', currentConfig);
    
    // 触发配置更改事件
    try {
        const event = new CustomEvent('apiConfigChanged', { 
            detail: { config: { ...currentConfig } }
        });
        document.dispatchEvent(event);
        console.log('API配置更新事件已触发');
    } catch (err) {
        console.error('触发配置更改事件失败:', err);
    }
}

/**
 * 保存服务商到本地存储
 * @param {Array} providers 服务商列表
 * @param {string} activeProviderId 当前选中的服务商ID
 */
export function saveProviders(providers, activeProviderId) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(providers));
        localStorage.setItem(ACTIVE_PROVIDER_KEY, activeProviderId);
        console.log('服务商配置已保存到本地存储');
    } catch (error) {
        console.error('保存服务商配置失败:', error);
    }
}

/**
 * 从本地存储加载服务商
 * @returns {Object} 包含服务商列表和当前选中的服务商ID
 */
export function loadProviders() {
    try {
        const providers = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        const activeProviderId = localStorage.getItem(ACTIVE_PROVIDER_KEY) || '';
        
        // 如果没有服务商或激活的服务商ID，创建默认服务商
        if (providers.length === 0 || !activeProviderId) {
            const defaultProvider = {
                id: 'default',
                name: 'Gemini',
                key: defaultConfig.key,
                baseurl: defaultConfig.baseurl,
                system_prompt: defaultConfig.system_prompt,
                models: [
                    {
                        id: 'model_1',
                        name: defaultConfig.model,
                        isActive: true
                    }
                ]
            };
            
            providers.push(defaultProvider);
            saveProviders(providers, 'default');
            return { providers, activeProviderId: 'default' };
        }
        
        return { providers, activeProviderId };
    } catch (error) {
        console.error('加载服务商配置失败:', error);
        return { providers: [], activeProviderId: '' };
    }
}

/**
 * 根据服务商ID获取并设置当前配置
 * @param {string} providerId 服务商ID
 * @returns {boolean} 是否成功设置
 */
export function setActiveProvider(providerId) {
    const { providers } = loadProviders();
    const provider = providers.find(p => p.id === providerId);
    
    if (!provider) {
        console.error('未找到指定ID的服务商:', providerId);
        return false;
    }
    
    // 找到激活的模型
    const activeModel = provider.models.find(m => m.isActive) || provider.models[0];
    
    if (!activeModel) {
        console.error('服务商没有可用模型:', provider.name);
        return false;
    }
    
    // 更新当前配置
    updateApiConfig({
        key: provider.key,
        baseurl: provider.baseurl,
        model: activeModel.name,
        system_prompt: provider.system_prompt || ''
    });
    
    // 保存激活的服务商ID
    localStorage.setItem(ACTIVE_PROVIDER_KEY, providerId);
    
    // 确保其他配置生效
    try {
        // 触发一个配置更改事件，通知应用其他部分
        const event = new CustomEvent('apiConfigChanged', { 
            detail: { provider, model: activeModel, config: { ...currentConfig } }
        });
        document.dispatchEvent(event);
        console.log('API配置已更新并触发事件:', provider.name, activeModel.name);
    } catch (err) {
        console.error('触发配置更改事件失败:', err);
    }
    
    return true;
}

// 强制刷新API配置
export function refreshApiConfig() {
    const { activeProviderId } = loadProviders();
    if (activeProviderId) {
        console.log('强制刷新API配置...');
        return setActiveProvider(activeProviderId);
    }
    return false;
}

// 初始化：从本地存储加载配置
export function initializeConfig() {
    const { activeProviderId } = loadProviders();
    if (activeProviderId) {
        setActiveProvider(activeProviderId);
    }
    console.log('API配置已初始化:', currentConfig);
}

// 使用getter方式导出apiConfig，确保每次访问都获取最新值
export const apiConfig = new Proxy({}, {
    get: (target, prop) => {
        return currentConfig[prop];
    }
});