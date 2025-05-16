// src/ui/loadingIndicator.js
import { loadingIndicator, aiResponseArea } from './domElements.js'; // 导入DOM元素引用

/**
 * 显示加载指示器。
 * 在AI回复框中创建一个正在输入的加载动效
 */
export function showLoading() {
    // 不再使用原始的loadingIndicator元素
    
    // 如果已经有加载指示器，先清除
    hideLoading();
    
    // 创建一个新的加载指示器，显示在AI回复框中
    if (aiResponseArea) {
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'ai-typing-indicator message-bubble assistant-bubble';
        typingIndicator.id = 'ai-typing-indicator';
        typingIndicator.innerHTML = 'AI 正在思考中<div class="typing-dots"><span></span><span></span><span></span></div>';
        
        // 添加到AI回复区域
        aiResponseArea.appendChild(typingIndicator);
        
        // 滚动到底部
        aiResponseArea.scrollTop = aiResponseArea.scrollHeight;
    } else {
        console.warn("[UI] showLoading: aiResponseArea 元素引用为 null。");
    }
}

/**
 * 隐藏加载指示器。
 */
export function hideLoading() {
    // 移除AI回复框中的加载指示器
    const typingIndicator = document.getElementById('ai-typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
    
    // 保留原始的 loadingIndicator 处理，以防万一
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
}