// src/ui/loadingIndicator.js
import { loadingIndicator, aiResponseArea } from './domElements.js'; // 导入DOM元素引用

/**
 * 显示加载指示器。
 * 在AI回复框中创建一个正在输入的加载动效气泡
 */
export function showLoading() {
    console.log("===== [调试] showLoading 函数开始执行 =====");
    
    // 首先清除现有的加载指示器
    hideLoading();
    
    // 获取AI响应区域，如果引用丢失则重新获取
    let responseArea = aiResponseArea;
    if (!responseArea) {
        console.warn("[调试] 引用的aiResponseArea为空，尝试重新获取");
        responseArea = document.getElementById('ai-response');
        if (!responseArea) {
            console.error("[调试] 致命错误：无法找到ai-response元素");
            return; // 无法继续
        }
    }
    
    // 创建气泡式加载指示器（作为空白AI气泡的替代）
    try {
        console.log("[调试] 准备创建气泡式加载指示器");
        
        // 检查并删除现有的ai-typing-indicator
        const existingIndicator = document.getElementById('ai-typing-indicator');
        if (existingIndicator) {
            console.log("[调试] 找到现有的气泡式加载指示器，正在移除");
            if (existingIndicator.parentNode) {
                existingIndicator.parentNode.removeChild(existingIndicator);
            }
        }
        
        // 创建新的气泡式加载指示器
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
        responseArea.appendChild(typingIndicator);
        
        // 添加内联样式确保可见性
        const typingStyles = document.createElement('style');
        typingStyles.id = 'dynamic-typing-styles';
        typingStyles.textContent = `
            #ai-typing-indicator {
                display: flex !important;
                opacity: 1 !important;
                visibility: visible !important;
                z-index: 1000 !important;
                margin-bottom: 15px !important;
                animation: slide-in 0.3s ease forwards !important;
            }
            
            @keyframes slide-in {
                0% { transform: translateY(10px); opacity: 0; }
                100% { transform: translateY(0); opacity: 1; }
            }
        `;
        
        // 删除旧样式（如果存在）
        const oldTypingStyle = document.getElementById('dynamic-typing-styles');
        if (oldTypingStyle && oldTypingStyle.parentNode) {
            oldTypingStyle.parentNode.removeChild(oldTypingStyle);
        }
        
        // 添加新样式
        document.head.appendChild(typingStyles);
        
        // 直接设置样式
        typingIndicator.style.display = 'flex';
        typingIndicator.style.opacity = '1';
        typingIndicator.style.visibility = 'visible';
        typingIndicator.style.zIndex = '1000';
        
        // 记录气泡式加载指示器的状态
        console.log("[调试] 气泡式加载指示器状态:", {
            存在DOM中: !!document.getElementById('ai-typing-indicator'),
            显示样式: typingIndicator.style.display,
            透明度: typingIndicator.style.opacity,
            可见性: typingIndicator.style.visibility,
            类名: typingIndicator.className,
            父元素: typingIndicator.parentElement ? typingIndicator.parentElement.id : '无'
        });
        
        // 滚动到底部，确保在移动设备上也能看到加载指示器
        setTimeout(() => {
            console.log("[调试] 滚动到底部，确保指示器可见");
            responseArea.scrollTop = responseArea.scrollHeight;
        }, 10);
    } catch (err) {
        console.error("[调试] 创建气泡式加载指示器失败:", err);
    }
    
    console.log("===== [调试] showLoading 函数执行完毕 =====");
}

/**
 * 隐藏加载指示器。
 */
export function hideLoading() {
    console.log("===== [调试] hideLoading 函数开始执行 =====");
    
    try {
        // 移除AI回复框中的气泡式加载指示器
        const typingIndicator = document.getElementById('ai-typing-indicator');
        console.log("[调试] 气泡式加载指示器元素:", typingIndicator);
        
        if (typingIndicator) {
            console.log("[调试] 气泡式加载指示器存在，正在移除");
            
            // 添加退出动画
            typingIndicator.classList.add('animate-out');
            
            // 动画结束后移除元素
            setTimeout(() => {
                if (typingIndicator.parentNode) {
                    typingIndicator.parentNode.removeChild(typingIndicator);
                    console.log("[调试] 气泡式加载指示器已移除");
                }
            }, 300);
        } else {
            console.log("[调试] 未找到气泡式加载指示器元素");
        }
        
        // 移除旧的顶部loading元素的引用（以防其他地方还在使用）
        const oldLoadingElement = document.getElementById('loading');
        if (oldLoadingElement && oldLoadingElement.parentNode) {
            console.log("[调试] 发现旧的顶部loading元素，移除中");
            oldLoadingElement.style.display = 'none';
        }
    } catch (err) {
        console.error("[调试] hideLoading 执行失败:", err);
    }
    
    console.log("===== [调试] hideLoading 函数执行完毕 =====");
}