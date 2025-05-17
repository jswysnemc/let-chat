/**
 * 联网搜索功能切换模块
 * 负责处理联网搜索按钮的状态和UI表现
 * 注意：此模块只处理UI状态，不执行实际的搜索功能
 */

// DOM元素引用
let webSearchButtonElement = null;

// 状态管理
let isWebSearchEnabled = false;

/**
 * 初始化联网搜索按钮
 * @returns {boolean} 初始化是否成功
 */
export function initializeWebSearchToggle() {
    // 获取DOM元素
    webSearchButtonElement = document.getElementById('web-search-btn');
    
    // 检查元素是否存在
    if (!webSearchButtonElement) {
        console.error('[WebSearchToggle] 初始化失败：联网搜索按钮元素未找到');
        return false;
    }
    
    // 从localStorage读取状态
    const savedState = localStorage.getItem('webSearchEnabled');
    isWebSearchEnabled = savedState === 'true';
    
    // 更新按钮UI状态
    updateButtonState();
    
    // 添加事件监听器
    webSearchButtonElement.addEventListener('click', toggleWebSearch);
    
    console.log('[WebSearchToggle] 初始化成功，联网搜索状态:', isWebSearchEnabled);
    return true;
}

/**
 * 切换联网搜索状态
 */
function toggleWebSearch() {
    isWebSearchEnabled = !isWebSearchEnabled;
    
    // 更新按钮UI状态
    updateButtonState();
    
    // 保存状态到localStorage
    localStorage.setItem('webSearchEnabled', isWebSearchEnabled);
    
    console.log('[WebSearchToggle] 联网搜索状态切换为:', isWebSearchEnabled);
}

/**
 * 更新按钮UI状态
 */
function updateButtonState() {
    if (!webSearchButtonElement) return;
    
    if (isWebSearchEnabled) {
        webSearchButtonElement.classList.add('active');
        webSearchButtonElement.title = '联网搜索已启用 (点击禁用)';
    } else {
        webSearchButtonElement.classList.remove('active');
        webSearchButtonElement.title = '联网搜索已禁用 (点击启用)';
    }
}

/**
 * 检查联网搜索是否已启用
 * 注意：此函数仅供内部使用，实际功能未实现
 * @returns {boolean} 联网搜索是否已启用
 */
function isWebSearchActive() {
    return isWebSearchEnabled;
} 