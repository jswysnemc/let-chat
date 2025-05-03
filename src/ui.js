// src/ui.js
// src/ui.js - UI 初始化协调器

// 导入各个 UI 子模块的初始化函数
import { initializeElements } from './ui/domElements.js';
import { initializePlaceholders } from './ui/placeholderManager.js';
import { initializeLightbox } from './ui/lightbox.js';
import { initializeSidebar } from './ui/sidebar.js';

// 注意：其他 UI 函数 (如 displayUserMessage, renderSessionList 等)
// 现在应直接从它们各自的模块 (./ui/messageDisplay.js, ./ui/sidebar.js 等)
// 在需要它们的文件中导入。这个 ui.js 文件不再重新导出它们。

/**
 * 初始化整个 UI，按顺序调用各子模块的初始化函数。
 * 应在应用程序启动时调用一次。
 * @returns {boolean} 如果所有初始化步骤都成功，则返回 true，否则返回 false。
 */
export function initUI() {
    // 1. 初始化 DOM 元素引用
    const elementsInitialized = initializeElements();
    if (!elementsInitialized) {
        // initializeElements 内部已经打印了错误信息
        alert("应用程序初始化失败：缺少必要的界面元素。请检查控制台获取详细信息。");
        return false; // 阻止后续初始化步骤
    }

    // 2. 初始化占位符的视觉状态
    initializePlaceholders();

    console.log("UI 模块初始化中..."); // 更新日志信息


    // --- 初始化 Lightbox 功能 ---
    initializeLightbox();
    // ---------------------------

    // --- 初始化侧边栏功能 ---
    initializeSidebar();
    // -----------------------

    console.log("UI 模块初始化完成。"); // 更新最终日志
    return true; // 表示初始化成功
}

// getElement function moved to ./ui/domElements.js


// --- 占位符逻辑 (Placeholder Logic) ---
// 相关函数已移动到 ./ui/placeholderManager.js

// --- 加载指示器 (Loading Indicator) ---
// showLoading 和 hideLoading 函数已移动到 ./ui/loadingIndicator.js

// --- 按钮状态 (Button States) ---
// enableSendButton 和 disableSendButton 函数已移动到 ./ui/buttonStates.js

// --- 输入区域 (Input Area) ---
// clearInput 函数已移动到 ./ui/inputArea.js

// --- 滚动 (Scrolling) ---
// scrollChatToBottom 函数已移动到 ./ui/chatScroll.js

// --- 消息显示 (Message Display) ---
// 相关函数 (displayUserMessage, createAssistantMessageBubble, updateAssistantMessageContent,
// finalizeAssistantMessage, displayError, displayAssistantMessage) 已移动到 ./ui/messageDisplay.js

// 注意: processCodeBlocks (语法高亮和代码块复制按钮)
// 应在主逻辑 (例如 main.js) 中调用，在 updateAssistantMessageContent 之后，
// 使用 markdownRenderer 模块。
// 这个 ui.js 模块专注于创建/更新气泡本身。


// --- 图片放大预览 (Lightbox Functionality) ---
// 相关函数 (handleLightboxKeydown, openLightbox, closeLightbox) 已移动到 ./ui/lightbox.js

// --- 侧边栏渲染 (Sidebar Rendering) ---
// 相关函数 (renderSessionList, clearChatArea, updateChatTitle) 已移动到 ./ui/sidebar.js

// --- 编辑会话模态框函数 (Edit Session Modal Functions) ---
// 相关函数已移动到 ./ui/editModal.js