import tavilyAPI from '../api/tavilyAPI.js';
import { getTavilyApiKey } from '../ui/settingsManager.js';


/**
 * 执行Tavily搜索
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
export function search_tool(query, options={}){
    return tavilyAPI.search(getTavilyApiKey(), query, options);
}

/**
 * 从网页中提取内容
 * @param {Array<string>} urls - 要提取内容的网页URL列表
 * @param {Object} options - 可选参数
 * @param {boolean} options.includeRawContent - 是否包含原始HTML内容，默认false
 * @param {string} options.extractMode - 提取模式，可选值：'article'(默认),'code','auto'
 * @returns {Promise<Object>} 提取结果
 */
export function extract_tool(urls, options={}){
    return tavilyAPI.extract(getTavilyApiKey(), urls, options);
}
