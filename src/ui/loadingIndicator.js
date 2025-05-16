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
        
        // 检测是否为移动设备，调整文本内容
        const isMobile = window.innerWidth <= 768;
        const indicatorText = isMobile ? 'AI思考中' : 'AI 正在思考中';
        
        // 增强动效，使用新的动画样式
        typingIndicator.innerHTML = `
            <div class="typing-indicator-spinner"></div>
            <span class="typing-indicator-text">${indicatorText}</span>
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;
        
        // 添加到AI回复区域
        aiResponseArea.appendChild(typingIndicator);
        
        // 滚动到底部，确保在移动设备上也能看到
        setTimeout(() => {
            aiResponseArea.scrollTop = aiResponseArea.scrollHeight;
        }, 10);
        
        // 添加进入动画
        setTimeout(() => {
            typingIndicator.classList.add('animate-in');
        }, 10);
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
        // 添加退出动画
        typingIndicator.classList.add('animate-out');
        
        // 动画结束后移除元素
        setTimeout(() => {
            if (typingIndicator.parentNode) {
                typingIndicator.remove();
            }
        }, 300); // 动画持续时间
    }
    
    // 保留原始的 loadingIndicator 处理，以防万一
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
}