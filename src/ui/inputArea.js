// src/ui/inputArea.js
import {
    chatInput,
    imagePreviewArea,
    previewPlaceholder,
    getElement
} from './domElements.js'; // 导入相关 DOM 元素
import {
    updatePreviewPlaceholderVisually,
    updateChatInputPlaceholderVisually
} from './placeholderManager.js'; // 导入占位符更新函数

let expandInputBtn = null;
let chatInputContainer = null;
let originalChatInputStyles = {}; // To store original styles if needed for revert

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

export function initializeInputExpansion() {
    console.log('[InputExpansion] Attempting to initialize input expansion...');
    expandInputBtn = getElement('expandInputBtn');
    chatInputContainer = getElement('chatInputContainer');

    if (!expandInputBtn) {
        console.warn('[InputExpansion] Expand button (#expandInputBtn) not found.');
    } else {
        console.log('[InputExpansion] Expand button found:', expandInputBtn);
    }

    if (!chatInputContainer) {
        console.warn('[InputExpansion] Chat input container (#chatInputContainer) not found.');
    } else {
        console.log('[InputExpansion] Chat input container found:', chatInputContainer);
    }

    if (!expandInputBtn || !chatInputContainer) {
        console.warn('[InputExpansion] Initialization failed due to missing elements.');
        return;
    }

    expandInputBtn.addEventListener('click', function(event) {
        event.stopPropagation();
        console.log('[InputExpansion] Expand button clicked, stopPropagation called.');
        toggleInputExpansion();
    });
    console.log('[InputExpansion] Event listener added to expand button.');
}

function toggleInputExpansion() {
    console.log('[InputExpansion] toggleInputExpansion function called.');
    if (!chatInputContainer || !expandInputBtn) {
        console.error("[InputExpansion] toggleInputExpansion: chatInputContainer or expandInputBtn is null at execution time.");
        return;
    }
    console.log("[InputExpansion] Current classes on container before toggle:", chatInputContainer.className);
    
    const isExpanded = chatInputContainer.classList.toggle('expanded-input-mode');
    console.log("[InputExpansion] 'expanded-input-mode' toggled. Is now expanded:", isExpanded);
    console.log("[InputExpansion] Container classes after toggle:", chatInputContainer.className);
    
    const icon = expandInputBtn.querySelector('i');

    if (isExpanded) {
        console.log("[InputExpansion] Expanding input visuals...");
        document.body.classList.add('input-expanded-mode');
        if (icon) {
            icon.classList.remove('fa-expand-alt');
            icon.classList.add('fa-compress-alt');
        } else {
            console.warn('[InputExpansion] Icon element not found inside expand button.');
        }
        expandInputBtn.title = "收起输入框";
        const chatInput = getElement('chatInput');
        if(chatInput) {
            console.log('[InputExpansion] Focusing chatInput.');
            chatInput.focus();
        } else {
            console.warn('[InputExpansion] chatInput not found for focusing.');
        }
    } else {
        console.log("[InputExpansion] Collapsing input visuals...");
        document.body.classList.remove('input-expanded-mode');
        if (icon) {
            icon.classList.remove('fa-compress-alt');
            icon.classList.add('fa-expand-alt');
        } else {
            console.warn('[InputExpansion] Icon element not found inside expand button.');
        }
        expandInputBtn.title = "展开输入框";
    }
    console.log("[InputExpansion] Body classes:", document.body.className);
}

// Potentially add to your existing inputArea.js or create it.
// Remember to call initializeInputExpansion() in your main UI setup.