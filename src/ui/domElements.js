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

// --- Edit Message Modal Elements ---
export let editMessageModalOverlay = null;
export let editMessageModalContent = null; // Might not be needed if only overlay is controlled
export let editMessageForm = null;
export let editMessageTextarea = null;
export let editMessageModalCancelBtn = null;

// --- Confirmation Modal Elements ---
export let confirmModalOverlay = null;
export let confirmModalTitle = null;
export let confirmModalMessage = null;
export let confirmModalConfirmBtn = null;
export let confirmModalCancelBtn = null;

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
        // --- Add cases for Edit Message Modal ---
        case 'editMessageModalOverlay': return editMessageModalOverlay;
        case 'editMessageForm': return editMessageForm;
        case 'editMessageTextarea': return editMessageTextarea;
        case 'editMessageModalCancelBtn': return editMessageModalCancelBtn;
        // --- End Add cases ---
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
    console.log("===== [调试] initializeElements 函数开始执行 =====");
    
    // 初始化基本UI元素
    chatInput = document.getElementById('chat-input');
    console.log("[调试] 初始化 chatInput:", chatInput);
    
    imagePreviewArea = document.getElementById('input-image-preview');
    console.log("[调试] 初始化 imagePreviewArea:", imagePreviewArea);
    
    sendButton = document.getElementById('send-button');
    console.log("[调试] 初始化 sendButton:", sendButton);
    
    // 初始化AI响应区域 - 这是最关键的元素
    aiResponseArea = document.getElementById('ai-response');
    console.log("[调试] 初始化 aiResponseArea:", aiResponseArea);
    
    if (!aiResponseArea) {
        console.error("[调试] 致命错误：无法找到ai-response元素，无法继续初始化");
        return false;
    }
    
    // 初始化loadingIndicator - 特别处理
    console.log("[调试] 开始初始化loading元素");
    
    // 尝试获取现有的loading元素
    loadingIndicator = document.getElementById('loading');
    console.log("[调试] 初始化 loadingIndicator (第一次尝试):", loadingIndicator);
    
    // 如果loading元素不存在，创建一个新的
    if (!loadingIndicator) {
        console.warn("[调试] loading元素不存在，创建新元素");
        
        loadingIndicator = document.createElement('div');
        loadingIndicator.id = 'loading';
        loadingIndicator.style.display = 'none';
        loadingIndicator.style.opacity = '1';
        loadingIndicator.setAttribute('aria-live', 'polite');
        loadingIndicator.innerHTML = `
            <div class="typing-indicator-spinner"></div>
            <span class="typing-indicator-text">AI思考中...</span>
        `;
        
        // 添加到aiResponseArea的开头
        if (aiResponseArea.firstChild) {
            aiResponseArea.insertBefore(loadingIndicator, aiResponseArea.firstChild);
        } else {
            aiResponseArea.appendChild(loadingIndicator);
        }
        
        console.log("[调试] 成功创建并添加loading元素");
    }
    
    // 确保loading元素有正确的内容
    if (loadingIndicator && loadingIndicator.innerHTML.trim() === '') {
        console.warn("[调试] 加载元素内容为空，添加内容");
        loadingIndicator.innerHTML = `
            <div class="typing-indicator-spinner"></div>
            <span class="typing-indicator-text">AI思考中...</span>
        `;
    }
    
    // 添加内联样式确保loading元素在需要时可见
    const styleElement = document.createElement('style');
    styleElement.id = 'loading-element-styles';
    styleElement.textContent = `
        #loading.visible {
            display: flex !important;
            opacity: 1 !important;
            visibility: visible !important;
            z-index: 1000 !important;
        }
    `;
    document.head.appendChild(styleElement);
    
    // 记录loading元素的状态
    if (loadingIndicator) {
        console.log("[调试] loadingIndicator HTML内容:", loadingIndicator.innerHTML);
        console.log("[调试] loadingIndicator 样式:", {
            display: loadingIndicator.style.display,
            opacity: loadingIndicator.style.opacity,
            visibility: loadingIndicator.style.visibility,
            width: loadingIndicator.offsetWidth,
            height: loadingIndicator.offsetHeight,
            computedDisplay: window.getComputedStyle(loadingIndicator).display,
            computedOpacity: window.getComputedStyle(loadingIndicator).opacity,
            computedVisibility: window.getComputedStyle(loadingIndicator).visibility,
            position: window.getComputedStyle(loadingIndicator).position,
            父元素: loadingIndicator.parentElement ? loadingIndicator.parentElement.id : '无'
        });
        
        // 特意验证loading元素是否在DOM中
        const domCheck = document.getElementById('loading');
        console.log("[调试] 验证loading元素是否在DOM中:", !!domCheck);
    } else {
        console.error("[调试] 严重错误: 所有尝试都失败，无法初始化loading元素");
    }
    
    // 初始化其他UI元素
    chatTitleElement = document.getElementById('chat-title');
    console.log("[调试] 初始化 chatTitleElement:", chatTitleElement);
    
    sessionListElement = document.getElementById('session-list');
    console.log("[调试] 初始化 sessionListElement:", sessionListElement);

    // 获取编辑模态框元素
    editModalOverlay = document.getElementById('edit-modal-overlay');
    editModalForm = document.getElementById('edit-session-form');
    editModalNameInput = document.getElementById('edit-session-name');
    editModalPromptTextarea = document.getElementById('edit-system-prompt');
    editModalCancelBtn = document.getElementById('edit-modal-cancel-btn');

    // 获取编辑消息模态框元素
    editMessageModalOverlay = document.getElementById('edit-message-modal-overlay');
    editMessageForm = document.getElementById('edit-message-form');
    editMessageTextarea = document.getElementById('edit-message-text');
    editMessageModalCancelBtn = document.getElementById('edit-message-modal-cancel-btn');

    // 获取确认模态框元素
    confirmModalOverlay = document.getElementById('confirm-modal-overlay');
    confirmModalTitle = document.getElementById('confirm-modal-title');
    confirmModalMessage = document.getElementById('confirm-modal-message');
    confirmModalConfirmBtn = document.getElementById('confirm-modal-confirm-btn');
    confirmModalCancelBtn = document.getElementById('confirm-modal-cancel-btn');

    // 获取侧边栏切换元素
    sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
    appContainer = document.querySelector('.app-container');
    sidebarOverlay = document.querySelector('.sidebar-overlay');

    // 检查关键元素是否存在并记录
    const criticalElements = [
        { name: 'chatInput', element: chatInput },
        { name: 'aiResponseArea', element: aiResponseArea },
        { name: 'sendButton', element: sendButton },
        { name: 'loadingIndicator', element: loadingIndicator },
    ];
    
    let criticalMissing = false;
    criticalElements.forEach(item => {
        if (!item.element) {
            console.error(`[调试] 严重错误: 必需的元素 ${item.name} 不存在`);
            criticalMissing = true;
        }
    });

    // 获取容器内的占位符
    if (imagePreviewArea) {
        previewPlaceholder = imagePreviewArea.querySelector('.placeholder-text');
        console.log("[调试] 初始化 previewPlaceholder:", previewPlaceholder);
        if (!previewPlaceholder) {
             console.warn("警告：未找到图片预览占位符元素。");
        }
    }
    
    if (aiResponseArea) {
        aiResponsePlaceholder = aiResponseArea.querySelector('.placeholder-text');
        console.log("[调试] 初始化 aiResponsePlaceholder:", aiResponsePlaceholder);
        if (!aiResponsePlaceholder) {
            console.warn("警告：未找到 AI 响应占位符元素。");
        }
    }

    console.log("DOM 元素初始化" + (criticalMissing ? "失败" : "成功") + "。");
    console.log("===== [调试] initializeElements 函数执行完毕 =====");
    
    // 如果关键元素缺失，返回失败
    if (criticalMissing) {
        console.error("[调试] 初始化失败，关键元素缺失");
        return false;
    }
    
    // 创建一个MutationObserver来监视DOM变化
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            // 检查是否有元素被移除
            if (mutation.removedNodes.length > 0) {
                // 检查移除的节点中是否包含loading元素
                mutation.removedNodes.forEach((node) => {
                    if (node.id === 'loading' || (node.querySelector && node.querySelector('#loading'))) {
                        console.warn("[调试] 检测到loading元素被移除，尝试恢复");
                        // 重新获取loading元素
                        loadingIndicator = document.getElementById('loading');
                        if (!loadingIndicator) {
                            // 如果元素已被移除，重新创建
                            const newLoading = document.createElement('div');
                            newLoading.id = 'loading';
                            newLoading.style.display = 'none';
                            newLoading.setAttribute('aria-live', 'polite');
                            newLoading.innerHTML = `
                                <div class="typing-indicator-spinner"></div>
                                <span class="typing-indicator-text">AI思考中...</span>
                            `;
                            
                            // 重新添加到AI响应区域
                            const responseArea = document.getElementById('ai-response');
                            if (responseArea) {
                                if (responseArea.firstChild) {
                                    responseArea.insertBefore(newLoading, responseArea.firstChild);
                                } else {
                                    responseArea.appendChild(newLoading);
                                }
                                loadingIndicator = newLoading;
                                console.log("[调试] 已恢复loading元素");
                            }
                        }
                    }
                });
            }
        });
    });
    
    // 开始观察aiResponseArea的变化
    if (aiResponseArea) {
        observer.observe(aiResponseArea, { childList: true, subtree: true });
        console.log("[调试] 已开始监视aiResponseArea的DOM变化");
    }
    
    return true; // 表示初始化成功
}