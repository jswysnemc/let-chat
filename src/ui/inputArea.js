// src/ui/inputArea.js
import {
    chatInput,
    imagePreviewArea,
    previewPlaceholder
} from './domElements.js'; // 导入相关 DOM 元素
import {
    updatePreviewPlaceholderVisually,
    updateChatInputPlaceholderVisually
} from './placeholderManager.js'; // 导入占位符更新函数

/**
 * 清空聊天输入框和图片预览区域。
 */
export function clearInput() {
    // 清空聊天输入框内容
    if (chatInput) {
        chatInput.innerHTML = '';
    } else {
        console.warn("[UI] clearInput: chatInput 元素引用为 null。");
    }

    // 清空图片预览区域（保留占位符）
    if (imagePreviewArea) {
        // 查找并移除所有非占位符的子元素
        const childrenToRemove = Array.from(imagePreviewArea.children)
                                     .filter(child => child !== previewPlaceholder);
        childrenToRemove.forEach(child => imagePreviewArea.removeChild(child));

        // 清空后确保占位符状态正确（如果占位符存在）
        updatePreviewPlaceholderVisually();
    } else {
        console.warn("[UI] clearInput: imagePreviewArea 元素引用为 null。");
    }

    // 清空后也需要更新聊天输入框的占位符状态
    updateChatInputPlaceholderVisually();
}