// src/ui/buttonStates.js
import { sendButton } from './domElements.js'; // 导入发送按钮元素引用
import { showLoading, hideLoading } from './loadingIndicator.js'; // 导入加载状态函数

/**
 * 启用发送按钮。
 * 同时隐藏加载指示器。
 */
export function enableSendButton() {
    if (sendButton) {
        sendButton.disabled = false; // 启用按钮
        hideLoading(); // 隐藏加载指示器
    } else {
        console.warn("[UI] enableSendButton: sendButton 元素引用为 null。");
    }
}

/**
 * 禁用发送按钮。
 * 同时显示加载指示器。
 */
export function disableSendButton() {
     if (sendButton) {
        sendButton.disabled = true; // 禁用按钮
        showLoading(); // 显示加载指示器
     } else {
         console.warn("[UI] disableSendButton: sendButton 元素引用为 null。");
     }
}