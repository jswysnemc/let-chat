/**
 * Tavily API 搜索集成模块
 * 不依赖任何第三方库，仅使用原生fetch
 */

// Tavily API 基础URL
const TAVILY_API_BASE_URL = 'https://api.tavily.com';

/**
 * 执行Tavily搜索
 * @param {string} apiKey - Tavily API密钥
 * @param {string} query - 搜索查询
 * @param {Object} options - 可选参数
 * @param {boolean} options.includeAnswer - 是否包含直接回答，默认true
 * @param {number} options.maxResults - 最大结果数量，默认5
 * @param {string} options.searchDepth - 搜索深度，'basic'或'advanced'，默认'basic'
 * @param {boolean} options.includeRawContent - 是否包含原始内容，默认false
 * @param {boolean} options.includeImages - 是否包含图片，默认false
 * @param {Array<string>} options.includeDomains - 要包含的域名列表
 * @param {Array<string>} options.excludeDomains - 要排除的域名列表
 * @returns {Promise<Object>} 搜索结果
 */
async function search(apiKey, query, options = {}) {
    if (!apiKey) {
        throw new Error('Tavily API 密钥不能为空');
    }
    
    if (!query || query.trim() === '') {
        throw new Error('搜索查询不能为空');
    }
    
    const defaultOptions = {
        includeAnswer: true,
        maxResults: 5,
        searchDepth: 'basic',
        includeRawContent: false,
        includeImages: false
    };
    
    // 合并默认选项和用户提供的选项
    const requestOptions = { ...defaultOptions, ...options };
    
    // 构建请求正文
    const requestBody = {
        api_key: apiKey,
        query: query,
        include_answer: requestOptions.includeAnswer,
        max_results: requestOptions.maxResults,
        search_depth: requestOptions.searchDepth,
        include_raw_content: requestOptions.includeRawContent,
        include_images: requestOptions.includeImages
    };
    
    // 添加可选的域名过滤
    if (requestOptions.includeDomains && Array.isArray(requestOptions.includeDomains)) {
        requestBody.include_domains = requestOptions.includeDomains;
    }
    
    if (requestOptions.excludeDomains && Array.isArray(requestOptions.excludeDomains)) {
        requestBody.exclude_domains = requestOptions.excludeDomains;
    }
    
    try {
        console.log(`[TavilyAPI] 执行搜索: "${query}"`);
        
        const response = await fetch(`${TAVILY_API_BASE_URL}/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        // 检查HTTP状态
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Tavily API 请求失败: ${response.status} ${response.statusText} - ${errorText}`);
        }
        
        const data = await response.json();
        
        console.log(`[TavilyAPI] 搜索成功，获取到 ${data.results ? data.results.length : 0} 个结果`);
        
        return data;
    } catch (error) {
        console.error(`[TavilyAPI] 搜索错误:`, error);
        throw error;
    }
}

/**
 * 从网页中提取内容
 * @param {string} apiKey - Tavily API密钥
 * @param {Array<string>} urls - 要提取内容的网页URL
 * @param {Object} options - 可选参数
 * @param {boolean} options.includeRawContent - 是否包含原始HTML内容，默认false
 * @param {string} options.extractMode - 提取模式，可选值：'article'(默认),'code','auto'
 * @returns {Promise<Object>} 提取结果
 */
async function extract(apiKey, urls, options = {}) {
    if (!apiKey) {
        throw new Error('Tavily API 密钥不能为空');
    }
    
    if (!urls || urls.length === 0) {
        throw new Error('要提取内容的网页URL不能为空');
    }

    const defaultOptions = {
        includeRawContent: false,
        extractMode: 'article'
    };
    
    // 合并默认选项和用户提供的选项
    const requestOptions = { ...defaultOptions, ...options };
    
    // 构建请求正文
    const requestBody = {
        api_key: apiKey,
        urls: urls,
        include_raw_content: requestOptions.includeRawContent,
        extract_mode: requestOptions.extractMode
    };
    
    try {
        console.log(`[TavilyAPI] 提取网页列表: "${urls}"`);
        
        const response = await fetch(`${TAVILY_API_BASE_URL}/extract`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        // 检查HTTP状态
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Tavily API 提取请求失败: ${response.status} ${response.statusText} - ${errorText}`);
        }
        
        const data = await response.json();
        
        console.log(`[TavilyAPI] 提取成功，获取到内容长度: ${data.content ? data.content.length : 0}`);
        
        return data;
    } catch (error) {
        console.error(`[TavilyAPI] 提取错误:`, error);
        throw error;
    }
}

// 导出函数
export default {
    search,
    extract
}; 