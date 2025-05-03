// src/ui/domElements.js

// 用于存储 DOM 元素引用的模块作用域变量
// 这些变量将在 initializeElements 函数中被赋值
export let chatInput = null;
export let imagePreviewArea = null;
export let previewPlaceholder = null; // 图片预览区的占位符
export let sendButton = null;
export let aiResponseArea = null;
export let aiResponsePlaceholder = null; // AI 响应区的占位符
export let loadingIndicator = null;
export let chatTitleElement = null; // 聊天标题 H2 元素的引用
export let sessionListElement = null; // 会话列表 UL 元素的引用

// 编辑模态框元素
export let editModalOverlay = null;
export let editModalForm = null;
export let editModalNameInput = null;
export let editModalPromptTextarea = null;
export let editModalCancelBtn = null;

// 侧边栏切换元素
export let sidebarToggleBtn = null;
export let appContainer = null; // 应用主容器，用于切换 CSS 类
export let sidebarOverlay = null; // 侧边栏打开时的遮罩层

/**
 * 获取对缓存 UI 元素的引用。请在 initializeElements() 之后使用。
 * @param {string} elementName - 元素的名称（例如 'chatInput', 'imagePreviewArea', 'sendButton', 'aiResponseArea', 'loadingIndicator', 'chatTitle', 'sessionList', 'editModalOverlay', 'editModalForm', 'editModalNameInput', 'editModalPromptTextarea', 'editModalCancelBtn', 'sidebarToggleBtn', 'appContainer', 'sidebarOverlay'）
 * @returns {HTMLElement|null} 元素引用，如果未初始化/未找到则返回 null。
 */
export function getElement(elementName) {
    switch (elementName) {
        case 'chatInput': return chatInput;
        case 'imagePreviewArea': return imagePreviewArea;
        case 'previewPlaceholder': return previewPlaceholder;
        case 'sendButton': return sendButton;
        case 'aiResponseArea': return aiResponseArea;
        case 'aiResponsePlaceholder': return aiResponsePlaceholder;
        case 'loadingIndicator': return loadingIndicator;
        case 'chatTitle': return chatTitleElement;
        case 'sessionList': return sessionListElement;
        case 'editModalOverlay': return editModalOverlay;
        case 'editModalForm': return editModalForm;
        case 'editModalNameInput': return editModalNameInput;
        case 'editModalPromptTextarea': return editModalPromptTextarea;
        case 'editModalCancelBtn': return editModalCancelBtn;
        case 'sidebarToggleBtn': return sidebarToggleBtn;
        case 'appContainer': return appContainer;
        case 'sidebarOverlay': return sidebarOverlay;
        default:
            console.warn(`UI 元素 "${elementName}" 未被识别。`);
            return null;
    }
}

/**
 * 初始化函数，查找所有需要的 DOM 元素并将引用存储在模块变量中。
 * @returns {boolean} 如果所有必需元素都被找到则返回 true，否则返回 false。
 */
export function initializeElements() {
    chatInput = document.getElementById('chat-input');
    imagePreviewArea = document.getElementById('input-image-preview');
    sendButton = document.getElementById('send-button');
    aiResponseArea = document.getElementById('ai-response');
    loadingIndicator = document.getElementById('loading');
    chatTitleElement = document.getElementById('chat-title');
    sessionListElement = document.getElementById('session-list');

    // 获取编辑模态框元素
    editModalOverlay = document.getElementById('edit-modal-overlay');
    editModalForm = document.getElementById('edit-session-form');
    editModalNameInput = document.getElementById('edit-session-name');
    editModalPromptTextarea = document.getElementById('edit-system-prompt');
    editModalCancelBtn = document.getElementById('edit-modal-cancel-btn');

    // 获取侧边栏切换元素
    sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
    appContainer = document.querySelector('.app-container');
    sidebarOverlay = document.querySelector('.sidebar-overlay');

    // 检查必需元素是否存在
    const essentialElements = [
        chatInput, imagePreviewArea, sendButton, aiResponseArea, loadingIndicator,
        chatTitleElement, sessionListElement, editModalOverlay, editModalForm,
        editModalNameInput, editModalPromptTextarea, editModalCancelBtn,
        sidebarToggleBtn, appContainer, sidebarOverlay
    ];

    // 获取容器内的占位符
    // 注意：这些占位符可能在初始 HTML 中不存在，需要在使用它们的代码中进行检查
    if (imagePreviewArea) {
        previewPlaceholder = imagePreviewArea.querySelector('.placeholder-text');
        if (!previewPlaceholder) {
             console.warn("警告：未找到图片预览占位符元素。");
        }
    }
     if (aiResponseArea) {
        aiResponsePlaceholder = aiResponseArea.querySelector('.placeholder-text');
         if (!aiResponsePlaceholder) {
             console.warn("警告：未找到 AI 响应占位符元素。");
         }
     }

    console.log("DOM 元素初始化成功。");
    return true; // 表示初始化成功
}