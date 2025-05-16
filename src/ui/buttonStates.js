// src/ui/buttonStates.js
import { sendButton } from './domElements.js'; // 导入发送按钮元素引用
import { showLoading, hideLoading } from './loadingIndicator.js'; // 导入加载状态函数

/**
 * 启用发送按钮。
 * 同时隐藏加载指示器。
 */
export function enableSendButton() {
    console.log("===== [调试] enableSendButton 函数开始执行 =====");
    
    // 首先尝试隐藏加载指示器，无论按钮状态如何
    try {
        console.log("[调试] 准备调用 hideLoading 函数");
        hideLoading(); // 隐藏加载指示器
        console.log("[调试] hideLoading 函数调用完成");
    } catch (err) {
        console.error("[调试] 调用 hideLoading 时出错:", err);
        
        // 如果hideLoading失败，尝试直接操作DOM
        try {
            console.log("[调试] 尝试直接操作DOM隐藏加载指示器");
            
            // 移除气泡式加载指示器
            const typingIndicator = document.getElementById('ai-typing-indicator');
            if (typingIndicator && typingIndicator.parentNode) {
                typingIndicator.parentNode.removeChild(typingIndicator);
                console.log("[调试] 已直接移除气泡式加载指示器");
            }
        } catch (domErr) {
            console.error("[调试] 直接操作DOM隐藏加载指示器也失败:", domErr);
        }
    }
    
    // 然后启用发送按钮
    let buttonEnabled = false;
    
    // 先尝试使用模块引用
    if (sendButton) {
        try {
            console.log("[调试] 通过模块引用启用发送按钮");
            sendButton.disabled = false;
            buttonEnabled = true;
        } catch (btnErr) {
            console.error("[调试] 通过模块引用启用按钮失败:", btnErr);
        }
    } else {
        console.warn("[调试] enableSendButton: sendButton 元素引用为 null，尝试直接获取");
    }
    
    // 如果模块引用方式失败，尝试直接获取
    if (!buttonEnabled) {
        try {
            const directButton = document.getElementById('send-button');
            if (directButton) {
                console.log("[调试] 通过DOM直接获取发送按钮并启用");
                directButton.disabled = false;
                buttonEnabled = true;
            } else {
                console.error("[调试] 无法获取发送按钮元素，DOM中不存在");
            }
        } catch (directErr) {
            console.error("[调试] 直接获取并启用按钮失败:", directErr);
        }
    }
    
    // 最后检查加载指示器状态
    setTimeout(() => {
        try {
            // 检查是否仍有气泡式加载指示器
            const typingCheck = document.getElementById('ai-typing-indicator');
            console.log("[调试] 检查气泡式加载指示器状态:", {
                存在: !!typingCheck
            });
            
            // 如果气泡式加载指示器仍然存在，尝试再次移除
            if (typingCheck && typingCheck.parentNode) {
                console.warn("[调试] 气泡式加载指示器仍然存在，再次尝试移除");
                typingCheck.parentNode.removeChild(typingCheck);
            }
        } catch (checkErr) {
            console.error("[调试] 检查加载指示器状态失败:", checkErr);
        }
    }, 100);
    
    console.log("===== [调试] enableSendButton 函数执行完毕 =====");
}

/**
 * 禁用发送按钮。
 * 同时显示加载指示器。
 */
export function disableSendButton() {
    console.log("===== [调试] disableSendButton 函数开始执行 =====");
    
    // 首先尝试显示加载指示器，无论按钮状态如何
    let loadingShown = false;
    
    try {
        console.log("[调试] 准备调用 showLoading 函数");
        showLoading(); // 显示加载指示器
        console.log("[调试] showLoading 函数调用完成");
        loadingShown = true;
    } catch (err) {
        console.error("[调试] 调用 showLoading 时出错:", err);
    }
    
    // 如果showLoading失败，尝试直接创建气泡式加载指示器
    if (!loadingShown) {
        try {
            console.log("[调试] 尝试直接创建气泡式加载指示器");
            
            // 获取AI响应区域
            const responseArea = document.getElementById('ai-response');
            if (!responseArea) {
                console.error("[调试] 找不到ai-response元素，无法创建加载指示器");
                return;
            }
            
            // 检查并移除已存在的气泡式加载指示器
            const existingIndicator = document.getElementById('ai-typing-indicator');
            if (existingIndicator && existingIndicator.parentNode) {
                existingIndicator.parentNode.removeChild(existingIndicator);
            }
            
            // 创建新的气泡式加载指示器
            const typingIndicator = document.createElement('div');
            typingIndicator.className = 'ai-typing-indicator message-bubble assistant-bubble';
            typingIndicator.id = 'ai-typing-indicator';
            typingIndicator.innerHTML = `
                <div class="typing-indicator-spinner"></div>
                <span class="typing-indicator-text">AI思考中</span>
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            `;
            
            // 添加到响应区域
            responseArea.appendChild(typingIndicator);
            
            // 设置样式
            typingIndicator.style.display = 'flex';
            typingIndicator.style.opacity = '1';
            typingIndicator.style.visibility = 'visible';
            
            // 强制滚动到底部
            responseArea.scrollTop = responseArea.scrollHeight;
            
            console.log("[调试] 已直接创建气泡式加载指示器");
        } catch (domErr) {
            console.error("[调试] 直接创建气泡式加载指示器失败:", domErr);
        }
    }
    
    // 然后禁用发送按钮
    let buttonDisabled = false;
    
    // 先尝试使用模块引用
    if (sendButton) {
        try {
            console.log("[调试] 通过模块引用禁用发送按钮");
            sendButton.disabled = true;
            buttonDisabled = true;
        } catch (btnErr) {
            console.error("[调试] 通过模块引用禁用按钮失败:", btnErr);
        }
    } else {
        console.warn("[调试] disableSendButton: sendButton 元素引用为 null，尝试直接获取");
    }
    
    // 如果模块引用方式失败，尝试直接获取
    if (!buttonDisabled) {
        try {
            const directButton = document.getElementById('send-button');
            if (directButton) {
                console.log("[调试] 通过DOM直接获取发送按钮并禁用");
                directButton.disabled = true;
                buttonDisabled = true;
            } else {
                console.error("[调试] 无法获取发送按钮元素，DOM中不存在");
            }
        } catch (directErr) {
            console.error("[调试] 直接获取并禁用按钮失败:", directErr);
        }
    }
    
    // 最后检查加载指示器状态
    setTimeout(() => {
        try {
            const typingCheck = document.getElementById('ai-typing-indicator');
            console.log("[调试] 检查气泡式加载指示器状态:", {
                存在: !!typingCheck,
                显示: typingCheck ? typingCheck.style.display : 'N/A',
                计算显示: typingCheck ? window.getComputedStyle(typingCheck).display : 'N/A'
            });
            
            // 如果气泡式加载指示器不存在或不可见，尝试再次创建
            if (!typingCheck || (typingCheck.style.display === 'none' || window.getComputedStyle(typingCheck).display === 'none')) {
                console.warn("[调试] 气泡式加载指示器不存在或不可见，再次尝试显示");
                showLoading(); // 再次尝试显示加载指示器
            }
        } catch (checkErr) {
            console.error("[调试] 检查加载指示器状态失败:", checkErr);
        }
    }, 100);
    
    console.log("===== [调试] disableSendButton 函数执行完毕 =====");
}