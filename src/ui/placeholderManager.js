// src/ui/placeholderManager.js
import {
    chatInput,
    imagePreviewArea,
    previewPlaceholder,
    aiResponseArea,
    aiResponsePlaceholder
} from './domElements.js'; // 导入所需的 DOM 元素引用

/**
 * 检查聊天输入框是否为空（没有文本且没有图片）。
 * @returns {boolean} 如果输入框为空则返回 true，否则返回 false。
 */
function isChatInputEmpty() {
    // 确保 chatInput 已初始化再访问其属性
    if (!chatInput) {
        console.warn("[isChatInputEmpty] 聊天输入元素未找到，返回 true。");
        return true;
    }
    // 检查输入框内是否包含图片元素
    const hasImages = chatInput.querySelector('img') !== null;
    // 获取并去除首尾空格后的文本内容
    const text = chatInput.textContent.trim();
    // 判断是否为空：文本为空且没有图片
    const isEmpty = text === '' && !hasImages;
    // console.log(`[isChatInputEmpty] 文本: "${text}", 是否有图片: ${hasImages}, 是否为空: ${isEmpty}`); // 详细日志
    return isEmpty;
}

/**
 * 根据内容更新聊天输入框占位符的视觉状态。
 * 此函数应由事件监听器（可能在 inputController.js 中）调用。
 */
export function updateChatInputPlaceholderVisually() {
    if (!chatInput) return; // 如果输入框元素不存在，则不执行任何操作
    if (isChatInputEmpty()) {
        // 如果输入框为空，添加 'is-placeholder-showing' 类
        chatInput.classList.add('is-placeholder-showing');
    } else {
        // 如果输入框不为空，移除 'is-placeholder-showing' 类
        chatInput.classList.remove('is-placeholder-showing');
    }
}

/**
 * 更新图片预览区域占位符的可见性。
 */
export function updatePreviewPlaceholderVisually() {
    // console.log("[UI] updatePreviewPlaceholderVisually 调用。"); // 可能产生过多日志
    if (!imagePreviewArea) {
        // console.warn("[UI] updatePreviewPlaceholderVisually: imagePreviewArea 未找到。");
        return; // 如果预览区域元素不存在，则不执行任何操作
    }
     if (!previewPlaceholder) {
         // console.warn("[UI] updatePreviewPlaceholderVisually: previewPlaceholder 未找到。");
         // 如果占位符元素本身不存在，我们无法添加/删除它，但函数仍可继续。
         // 这可能发生在初始 index.html 中缺少占位符 span 的情况。
         return; // 如果占位符不存在，也无法操作
     }

    // 检查预览区域是否包含除占位符之外的任何子元素
    const hasContent = Array.from(imagePreviewArea.children).some(child => child !== previewPlaceholder);
    // console.log(`[UI] updatePreviewPlaceholderVisually: hasContent = ${hasContent}`);

    if (hasContent) {
        // 如果存在内容 并且 占位符当前是子元素，则移除占位符
        if (imagePreviewArea.contains(previewPlaceholder)) {
            // console.log("[UI] updatePreviewPlaceholderVisually: 移除占位符。");
            imagePreviewArea.removeChild(previewPlaceholder);
        }
    } else {
        // 如果没有内容 并且 占位符存在 但 当前不是子元素，则将其添加回去
        if (!imagePreviewArea.contains(previewPlaceholder)) {
            // console.log("[UI] updatePreviewPlaceholderVisually: 添加占位符。");
            imagePreviewArea.appendChild(previewPlaceholder);
        }
    }
}


/**
 * 更新 AI 响应区域占位符的可见性。
 */
export function updateAiResponsePlaceholderVisually() {
     if (!aiResponseArea || !aiResponsePlaceholder) return; // 如果响应区或其占位符不存在，则不执行任何操作

     // 如果 aiResponseArea 包含任何消息气泡，则移除占位符
     if (aiResponseArea.querySelector('.message-bubble')) {
          if (aiResponseArea.contains(aiResponsePlaceholder)) {
              aiResponseArea.removeChild(aiResponsePlaceholder);
          }
     } else {
          // 如果没有消息气泡且占位符缺失，则将其添加回去
          if (!aiResponseArea.contains(aiResponsePlaceholder)) {
              aiResponseArea.appendChild(aiResponsePlaceholder);
          }
     }
}

/**
 * 初始化所有占位符的视觉状态。
 * 通常在 UI 初始化时调用一次。
 */
export function initializePlaceholders() {
    updateChatInputPlaceholderVisually();
    updatePreviewPlaceholderVisually();
    updateAiResponsePlaceholderVisually();
}