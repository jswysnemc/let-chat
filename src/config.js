/**
 * API 配置管理
 * 提供动态配置和更新API设置的功能
 */

// 默认配置
const defaultConfig = {
    key: "gemini", // 警告：API 密钥已暴露，仅供演示！
    baseurl: "https://openai.example.com/v1/chat/completions",
    model: "gpt-4o-mini", // 重要提示：请确保此模型支持多模态输入！
    system_prompt: "你是一个中文助手，帮助用户回答问题,回答时需要使用中文。如果需要代码，请使用markdown格式输出，并明确指定代码语言类型，例如 ```python ... ```。" // 更新系统提示，鼓励 Markdown 输出并指定语言
};

// 实际使用的配置，初始为默认配置
let currentConfig = { ...defaultConfig };
let globalTavilyApiKey = ''; // 新增：全局Tavily API Key

// 本地存储键
const STORAGE_KEY = 'chat_api_providers';
const ACTIVE_PROVIDER_KEY = 'chat_active_provider';
const TAVILY_API_KEY_STORAGE = 'chat_global_tavily_api_key'; // 新增

/**
 * 获取当前API配置
 * @returns {Object} 当前使用的API配置
 */
export function getApiConfig() {
    return { ...currentConfig };
}

/**
 * 获取全局 Tavily API Key
 * @returns {string} 全局 Tavily API Key
 */
export function getGlobalTavilyApiKey() {
    return globalTavilyApiKey;
}

/**
 * 保存全局 Tavily API Key
 * @param {string} apiKey
 */
export function saveGlobalTavilyApiKey(apiKey) {
    globalTavilyApiKey = apiKey;
    try {
        localStorage.setItem(TAVILY_API_KEY_STORAGE, apiKey);
        console.log('全局 Tavily API Key 已保存');
    } catch (error) {
        console.error('保存全局 Tavily API Key 失败:', error);
    }
}

/**
 * 加载全局 Tavily API Key
 */
function loadGlobalTavilyApiKey() {
    try {
        globalTavilyApiKey = localStorage.getItem(TAVILY_API_KEY_STORAGE) || '';
        console.log('全局 Tavily API Key 已加载:', globalTavilyApiKey ? '已设置' : '未设置');
    } catch (error) {
        console.error('加载全局 Tavily API Key 失败:', error);
        globalTavilyApiKey = '';
    }
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
        // 在保存前，确保每个服务商对象不包含 tavily_api_key (如果之前有的话)
        const cleanedProviders = providers.map(p => {
            const { tavily_api_key, ...rest } = p; // 移除 tavily_api_key
            return rest;
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanedProviders));
        localStorage.setItem(ACTIVE_PROVIDER_KEY, activeProviderId);
        console.log('服务商配置已保存到本地存储 (Tavily Key 全局化)');
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
        let providers = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        const activeProviderId = localStorage.getItem(ACTIVE_PROVIDER_KEY) || '';
        
        // 确保旧的每个服务商对象中的 tavily_api_key 被移除（一次性迁移）
        providers = providers.map(p => {
            const { tavily_api_key, ...rest } = p;
            return rest;
        });

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
                // 不再包含 tavily_api_key
            };
            
            providers.push(defaultProvider);
            // 首次保存时，cleanedProviders 的逻辑会处理
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
    
    const activeModel = provider.models.find(m => m.isActive) || provider.models[0];
    
    if (!activeModel) {
        console.error('服务商没有可用模型:', provider.name);
        return false;
    }
    
    updateApiConfig({
        key: provider.key,
        baseurl: provider.baseurl,
        model: activeModel.name,
        system_prompt: provider.system_prompt || ''
        // 不再从 provider 获取 tavily_api_key
    });
    
    localStorage.setItem(ACTIVE_PROVIDER_KEY, providerId);
    
    try {
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

export function refreshApiConfig() {
    const { activeProviderId } = loadProviders();
    if (activeProviderId) {
        console.log('强制刷新API配置...');
        return setActiveProvider(activeProviderId);
    }
    return false;
}

export function initializeConfig() {
    loadGlobalTavilyApiKey(); // 新增：初始化时加载全局Tavily Key
    const { activeProviderId } = loadProviders();
    if (activeProviderId) {
        setActiveProvider(activeProviderId);
    }
    console.log('API配置已初始化:', currentConfig);
}

export const apiConfig = new Proxy({}, {
    get: (target, prop) => {
        return currentConfig[prop];
    }
});