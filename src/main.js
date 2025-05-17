// src/main.js
// Import State functions
import * as state from './state.js';
// Import Config module
import { initializeConfig, refreshApiConfig, getApiConfig } from './config.js';
// Import UI functions from specific modules
import { initUI } from './ui.js'; // Main UI initializer
import { updateChatTitle, renderSessionList } from './ui/sidebar.js'; // Removed clearChatArea from here
import { clearChatArea, displayUserMessage, displayAssistantMessage, displayError, createAssistantMessageBubble, updateAssistantMessageContent, finalizeAssistantMessage } from './ui/messageDisplay.js'; // Added clearChatArea here
import { scrollChatToBottom } from './ui/chatScroll.js';
import { disableSendButton, enableSendButton } from './ui/buttonStates.js';
import { clearInput, initializeInputExpansion } from './ui/inputArea.js';
import { getEditModalFormElements, getEditModalValues, hideEditModal, setEditModalValues, showEditModal } from './ui/editModal.js';
// Import settings manager
import { initializeSettingsManager, getTavilyApiKey, showSettingsModal } from './ui/settingsManager.js';
// Import other modules
import { getElement } from './ui/domElements.js'; // Import getElement
import { aiResponseArea } from './ui/domElements.js'; // Import the chat area element
import { initInputHandling } from './inputController.js';
import { streamAIResponse } from './apiClient.js';
import { renderMarkdown, renderMarkdownAsync, highlightCodeBlocks } from './markdownRenderer.js';
import { showConfirmationModal } from './ui/confirmModal.js'; // Import the new modal function
import { copyTextFallback } from './ui/copyUtils.js'; // Import copy fallback
import { showSuccess, showError, showWarning, showConfirm } from './ui/notification.js'; // Import notification functions
// 导入联网搜索相关模块
import { initializeWebSearchToggle } from './ui/webSearchToggle.js';
import { initializeNotificationCenter } from './ui/notificationCenter.js';
import { initializeBulkSessionManagement, renderSessionList as renderSessionListFromSidebar } from './ui/sidebar.js'; // 导入批量管理初始化和会话列表渲染


/**
 * 更新重试按钮的可见性，只显示最后一个AI消息的重试按钮
 * @returns {HTMLElement|null} 最后一个显示的重试按钮，如果没有则返回null
 */
function updateRetryButtonsVisibility() {
    if (!aiResponseArea) {
        console.warn("[Main] updateRetryButtonsVisibility: aiResponseArea element is null");
        return null;
    }
    
    console.log("[Main] 开始更新重试按钮可见性...");
    const allAssistantBubbles = aiResponseArea.querySelectorAll('.assistant-bubble:not(.error-message)');
    console.log(`[Main] 找到 ${allAssistantBubbles.length} 个AI消息气泡`);
    
    // 首先隐藏所有重试按钮
    let hiddenCount = 0;
    allAssistantBubbles.forEach((bubble, index) => {
        const retryBtn = bubble.querySelector('.message-retry-btn');
        if (retryBtn) {
            // 使用style.display直接设置，而不是添加CSS类
            retryBtn.style.display = 'none';
            hiddenCount++;
            console.log(`[Main] 隐藏第 ${index+1} 个气泡的重试按钮，display=${retryBtn.style.display}`);
        } else {
            console.log(`[Main] 第 ${index+1} 个气泡没有找到重试按钮`);
        }
    });
    console.log(`[Main] 已隐藏 ${hiddenCount} 个重试按钮`);
    
    // 然后只显示最后一个AI消息的重试按钮
    let lastRetryButton = null;
    if (allAssistantBubbles.length > 0) {
        const lastBubble = allAssistantBubbles[allAssistantBubbles.length - 1];
        const retryBtn = lastBubble.querySelector('.message-retry-btn');
        if (retryBtn) {
            console.log(`[Main] 尝试显示最后一个AI消息的重试按钮，当前display=${retryBtn.style.display}`);
            // 强制显示最后一个重试按钮
            retryBtn.style.removeProperty('display'); // 移除display属性，回到默认显示状态
            retryBtn.style.display = 'inline-flex'; // 显式设置为inline-flex，确保与其他按钮一致
            console.log(`[Main] 已显示最后一个AI消息的重试按钮，现在display=${retryBtn.style.display || '已恢复默认显示'}`);
            lastRetryButton = retryBtn;
        } else {
            console.warn("[Main] Could not find retry button in the last AI message bubble");
        }
    } else {
        console.log("[Main] 没有找到AI消息气泡，不需要显示重试按钮");
    }
    
    return lastRetryButton;
}

/** Renders the chat messages for the currently active session */
function renderChatForActiveSession() {
    const activeId = state.getActiveSessionId();
    const session = state.getSession(activeId);

    if (!session) {
        console.warn("renderChatForActiveSession: No active session found or session data missing.");
        clearChatArea();
        updateChatTitle("无活动会话");
        return;
    }

    console.log(`Rendering chat for session: ${session.name} (${activeId})`);
    clearChatArea();
    updateChatTitle(session.name);
    const messages = state.getMessages(activeId); // Get messages for the active session

    // Iterate messages, skip the first system message (index 0) for display
    messages.forEach((msg, index) => {
        // 跳过系统消息 (index 0)
        if (index === 0) return;

        if (!msg || !msg.role || typeof msg.content === 'undefined') {
             console.warn(`Skipping invalid message object at index ${index}:`, msg);
             return;
        }

        const messageIndex = index; // 当前消息在完整数组中的索引

        if (msg.role === 'user') {
            // Ensure content is in the expected format (array of parts)
            const contentParts = Array.isArray(msg.content) ? msg.content : [{ type: 'text', text: String(msg.content) }];
            displayUserMessage(contentParts, messageIndex); // 传递索引
        } else if (msg.role === 'assistant') {
             // Ensure content is a string for displayAssistantMessage
             const contentString = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
             displayAssistantMessage(contentString, messageIndex); // 传递索引
        }
        // Ignore 'system' messages for display here (already handled by index check)
    });

    // 调用专门的函数来更新重试按钮可见性
    updateRetryButtonsVisibility();

    // Scroll to bottom after rendering history
    // Use a slightly longer delay to ensure images might have loaded
    setTimeout(() => {
        scrollChatToBottom();
        // 确保在滚动到底部后再次更新重试按钮状态
        updateRetryButtonsVisibility();
    }, 100);
}

/**
 * 增强流式响应处理中的Markdown渲染，特别是粗体文本
 * @param {string} content - 要渲染的流式内容
 * @returns {string} - 渲染后的HTML
 */
function enhanceStreamMarkdownRendering(content) {
    if (!content) return '';
    
    try {
        // 1. 尝试完整的Markdown渲染
        return renderMarkdown(content);
    } catch (err) {
        console.error("流式Markdown渲染失败，使用增强处理:", err);
        try {
            // 2. 处理粗体文本
            let html = content.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
            
            // 3. 转义HTML
            html = html.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            
            // 4. 还原strong标签
            html = html.replace(/&lt;strong&gt;/g, "<strong>").replace(/&lt;\/strong&gt;/g, "</strong>");
            
            // 5. 包装在<p>标签中
            if (!html.startsWith("<p>")) {
                html = `<p>${html}</p>`;
            }
            
            return html;
        } catch (err2) {
            console.error("增强处理也失败了，返回原始内容:", err2);
            return `<p>${content}</p>`;
        }
    }
}

/**
 * 处理用户发送消息的核心逻辑。
 * 作为回调函数传递给 inputController。
 * @param {Array<object>} contentParts - 从输入控制器提取的内容部分。
 */
async function handleSend(contentParts) {
    console.log("[Main] handleSend called with contentParts:", JSON.stringify(contentParts)); // Log entry and content
    
    // 检查内容类型
    const textParts = contentParts.filter(p => p.type === 'text');
    const imageParts = contentParts.filter(p => p.type === 'image_url');
    console.log(`[Main] 发送内容: ${textParts.length}个文本, ${imageParts.length}个图片`);
    
    if (textParts.length > 0) {
        console.log(`[Main] 文本内容: "${textParts[0].text.substring(0, 50)}${textParts[0].text.length > 50 ? '...' : ''}"`);
    }
    
    if (imageParts.length > 0) {
        console.log(`[Main] 包含${imageParts.length}张图片`);
    }
    
    const activeId = state.getActiveSessionId();
    if (!activeId) {
        console.error("[Main] Cannot send message, no active session ID.");
        displayError("无法发送消息，没有活动的会话。");
        return;
    }

    console.log(`Main: Handling send request for session ${activeId}...`);
    disableSendButton(); // This will now also call showLoading()

    // 强制刷新API配置，确保使用最新设置
    refreshApiConfig();
    console.log("[Main] 已刷新API配置，确保使用最新设置");

    // 1. Update state and display user message for the active session
    let userMessageIndex = -1; // Initialize index
    try {
        // Add message to the specific session's history
        if (!state.addMessageToSession(activeId, 'user', contentParts)) {
             throw new Error("Failed to add user message to state.");
        }
        // Get the index of the newly added user message
        const currentMessages = state.getMessages(activeId);
        userMessageIndex = currentMessages.length - 1; // Index is length - 1
        if (userMessageIndex < 1) { // Should not happen if addMessage succeeded
             throw new Error("Failed to determine user message index after adding to state.");
        }
        displayUserMessage(contentParts, userMessageIndex); // Pass the correct index
        clearInput(); // Clear input after grabbing content

        // --- Auto-rename session logic ---
        const session = state.getSession(activeId);
        const messages = state.getMessages(activeId);
        // Check if it's the first user message (total messages = 2: system + user)
        // and if the session name still has the default prefix
        if (session && messages.length === 2 && session.name.startsWith("新会话")) {
            // Extract text from the first user message part
            const firstTextPart = contentParts.find(p => p.type === 'text');
            if (firstTextPart && firstTextPart.text.trim()) {
                const newTitle = firstTextPart.text.trim().substring(0, 20); // Take first 20 chars as title
                if (state.updateSessionName(activeId, newTitle)) {
                    console.log(`[Main] Session ${activeId} auto-renamed to "${newTitle}"`);
                    // Update UI immediately
                    renderSessionListFromSidebar(state.getAllSessions(), activeId);
                    updateChatTitle(newTitle);
                } else {
                    console.warn(`[Main] Failed to auto-rename session ${activeId}`);
                }
            }
        }
        // --- End auto-rename session logic ---

    } catch (error) {
        console.error("Error processing user input:", error);
        displayError("处理您的输入时出错: " + error.message);
       // hideLoading(); // No longer needed here
       enableSendButton(); // This will now also call hideLoading()
       return; // Stop processing if user input handling fails
   }


    // 2. Prepare for and call API using the active session's history
    const currentHistory = state.getActiveSessionMessages(); // Get messages for the active session
    let assistantBubbleRefs = null;
    let accumulatedContent = ''; // To store the full response text
    let assistantMessageIndex = userMessageIndex !== -1 ? userMessageIndex + 1 : -1; // Calculate expected AI index

    try {
        // Create the bubble structure first, passing the expected index
        if (assistantMessageIndex === -1) {
             throw new Error("Cannot create assistant bubble without a valid preceding user message index.");
        }
        assistantBubbleRefs = createAssistantMessageBubble(assistantMessageIndex); // Pass the index
        if (!assistantBubbleRefs) {
            throw new Error("UI Error: 无法创建助手消息气泡。");
        }

        // 3. Stream and render AI response
        for await (const chunk of streamAIResponse(currentHistory)) {
            accumulatedContent += chunk;
            // 使用增强的流式Markdown渲染
            let htmlContent = enhanceStreamMarkdownRendering(accumulatedContent);
            
            console.log("[Main] 流式HTML内容(前30字符):", htmlContent.substring(0, 30));
            // Update the content container's innerHTML using the UI function
            updateAssistantMessageContent(assistantBubbleRefs.contentContainer, htmlContent);
            // Process code blocks within the updated container (highlighting, etc.)
            try {
                 highlightCodeBlocks(assistantBubbleRefs.contentContainer);
            } catch(e) { console.error("Error highlighting during stream:", e); }
            // Note: Scrolling is handled within updateAssistantMessageContent
        }

        // 4. Finalize after stream ends successfully
        // Verify the calculated index matches the actual state before adding
        const finalMessages = state.getMessages(activeId);
        if (finalMessages.length !== assistantMessageIndex) {
             console.warn(`State mismatch: Expected AI message index ${assistantMessageIndex}, but current message count is ${finalMessages.length}. Attempting to add anyway.`);
             // Potentially recalculate index here if needed, or just proceed cautiously.
        }
        if (!state.addMessageToSession(activeId, 'assistant', accumulatedContent)) { // Add to active session state
             console.error("Failed to add assistant message to state.");
             // Maybe display an error?
        } else {
             // If adding to state was successful, ensure the bubble has the correct final index
             // (This might be redundant if the initial index calculation was always correct, but adds robustness)
             const updatedMessages = state.getMessages(activeId);
             assistantMessageIndex = updatedMessages.length - 1; // Get the actual final index
             if (assistantBubbleRefs.bubbleElement) {
                  assistantBubbleRefs.bubbleElement.dataset.messageIndex = assistantMessageIndex;
             }
        }

        // Finalize UI (enable controls, set raw content) using the UI function
        // Pass only the bubble element and the full content
        finalizeAssistantMessage(assistantBubbleRefs.bubbleElement, accumulatedContent);
        
        // 确保只有最后一个AI消息显示重试按钮
        updateRetryButtonsVisibility();

   } catch (error) {
       console.error("Error during AI response fetch/stream:", error);
       // Display error in the chat area using the UI function
       displayError(error.message || "与 AI 通信时发生未知错误");
       // If a bubble was created before the error, maybe remove it or style it?
       // For now, just display the separate error message.
   } finally {
        // 5. Always re-enable button and hide loading indicator using UI functions
        console.log("[Main] Entering finally block in handleSend."); // Log finally entry
        // console.log("[Main] Calling hideLoading()..."); // No longer needed here
        // hideLoading(); // No longer needed here
        console.log("[Main] Calling enableSendButton() which will also hide loading...");
        enableSendButton(); // This will now also call hideLoading()
        console.log("[Main] Send request processing finished. Re-rendering chat area...");
        // 重新渲染聊天区域以确保 UI 与状态同步，并正确显示/隐藏重试按钮
        renderChatForActiveSession();
        // 确保重试按钮可见性正确
        ensureRetryButtonsVisibility();
        console.log("[Main] Chat area re-rendered after send.");
   }
}


/**
 * Handles the logic for editing a session's name and system prompt.
 * @param {string} sessionId - The ID of the session to edit.
 */
function handleEditSession(sessionId) {
    console.log(`[Main] handleEditSession called for sessionId: ${sessionId}`); // Log entry
    if (!sessionId) {
        console.error("[Main] handleEditSession: No session ID provided.");
        return;
    }
    console.log(`[Main] Opening edit modal for session: ${sessionId}`);

    const session = state.getSession(sessionId);
    if (!session) {
        showError("无法加载要编辑的会话数据。");
        return;
    }

    // Get modal elements using the new UI function
    console.log("[Main] handleEditSession: Getting modal form elements...");
    const modalElements = getEditModalFormElements();
    if (!modalElements) {
        console.error("[Main] handleEditSession: Failed to get modal elements from UI module.");
        showError("无法初始化编辑对话框。");
        return;
    }
    const { form, cancelBtn } = modalElements;

    // Find the current system prompt content
    const systemMessage = session.messages.find(m => m.role === 'system');
    const currentSystemPrompt = systemMessage ? systemMessage.content : '';
    const currentName = session.name;

    // Define handlers within this scope to close over necessary variables (sessionId, elements)
    const submitHandler = (event) => {
        event.preventDefault();
        console.log("[Main] Edit modal submitHandler triggered.");
        const newValues = getEditModalValues(); // Get values from modal inputs

        if (!newValues) {
             console.error("[Main] Failed to get values from edit modal.");
             cleanupAndHide(); // Hide modal even if getting values failed
             return;
        }

        let nameChanged = false;
        let promptChanged = false;

        // Validate and update name
        if (!newValues.name) { // Check for empty name
            showWarning("会话名称不能为空。");
            // Optionally focus the name input: ui.getElement('editModalNameInput')?.focus();
            return; // Keep modal open if validation fails
        }
        if (newValues.name !== currentName) {
            if (state.updateSessionName(sessionId, newValues.name)) {
                nameChanged = true;
            } else {
                showError("更新会话名称失败。");
                // Decide if modal should stay open on failure
            }
        }

        // Update prompt if changed (allow empty prompt?)
        if (newValues.prompt !== currentSystemPrompt) {
             if (state.updateSystemPrompt(sessionId, newValues.prompt)) {
                 promptChanged = true;
             } else {
                 showError("更新系统提示失败。");
                  // Decide if modal should stay open on failure
             }
        }

        // Refresh UI if changes were successfully made
        if (nameChanged || promptChanged) {
             console.log("[Main] Session updated, refreshing UI...");
             const currentActiveId = state.getActiveSessionId();
             renderSessionListFromSidebar(state.getAllSessions(), currentActiveId);
             // Update chat title ONLY if the edited session is the currently active one
             if (sessionId === currentActiveId) {
                 const updatedSession = state.getSession(sessionId); // Re-fetch session data for updated name
                 if (updatedSession) {
                    updateChatTitle(updatedSession.name);
                 }
             }
        }

        cleanupAndHide(); // Hide modal and remove listeners
    };

    const cancelHandler = () => {
        console.log("[Main] Edit modal cancelHandler triggered.");
        cleanupAndHide(); // Hide modal and remove listeners
    };

    // Function to remove listeners and hide modal
    const cleanupAndHide = () => {
         console.log("[Main] Cleaning up edit modal listeners.");
         form.removeEventListener('submit', submitHandler);
         cancelBtn.removeEventListener('click', cancelHandler);
         hideEditModal();
    }

    // --- Logic to show and setup modal ---
    console.log("[Main] handleEditSession: Setting modal values...");
    // Set initial values in the modal
    setEditModalValues(currentName, currentSystemPrompt);

    console.log("[Main] handleEditSession: Attaching modal listeners...");
    // Attach listeners (only once per modal opening)
    form.addEventListener('submit', submitHandler);
    cancelBtn.addEventListener('click', cancelHandler);

    console.log("[Main] handleEditSession: Showing modal...");
    // Show the modal
    showEditModal();
}

// --- Edit Message Modal Logic ---
let currentEditingMessageIndex = -1; // Store the index of the message being edited

/** Shows the edit message modal with the current content */
function showEditMessageModal(messageIndex, currentContent) {
    const overlay = getElement('editMessageModalOverlay');
    const textarea = getElement('editMessageTextarea');
    const form = getElement('editMessageForm');
    const cancelBtn = getElement('editMessageModalCancelBtn');

    if (!overlay || !textarea || !form || !cancelBtn) {
        console.error("[Main] Edit Message Modal elements not found.");
        showError("无法打开编辑消息对话框。");
        return;
    }

    currentEditingMessageIndex = messageIndex; // Store index
    textarea.value = currentContent; // Set current text

    // Attach listeners (remove previous ones first if any - robust approach)
    form.removeEventListener('submit', handleEditMessageSubmit);
    cancelBtn.removeEventListener('click', handleEditMessageCancel);
    form.addEventListener('submit', handleEditMessageSubmit);
    cancelBtn.addEventListener('click', handleEditMessageCancel);

    overlay.classList.add('visible');
    console.log("[Main] Added '.visible' class to edit message overlay. Element classes:", overlay.classList); // Debug log
    textarea.focus(); // Focus the textarea
    textarea.select(); // Select the text
}

/** Hides the edit message modal and cleans up listeners */
function hideEditMessageModal() {
    const overlay = getElement('editMessageModalOverlay');
    const form = getElement('editMessageForm');
    const cancelBtn = getElement('editMessageModalCancelBtn');

    if (overlay) {
        overlay.classList.remove('visible');
    }
    // Clean up listeners
    if (form) form.removeEventListener('submit', handleEditMessageSubmit);
    if (cancelBtn) cancelBtn.removeEventListener('click', handleEditMessageCancel);

    currentEditingMessageIndex = -1; // Reset index
}

/** Handles the submission of the edit message form */
function handleEditMessageSubmit(event) {
    event.preventDefault();
    const textarea = getElement('editMessageTextarea');
    if (!textarea || currentEditingMessageIndex < 0) {
        console.error("[Main] Cannot submit edit message: Textarea or index invalid.");
        hideEditMessageModal(); // Hide modal anyway
        return;
    }

    const newContent = textarea.value;
    const activeId = state.getActiveSessionId();

    if (state.updateMessageInSession(activeId, currentEditingMessageIndex, newContent)) {
        renderChatForActiveSession(); // Re-render chat on success
        // 额外确保重试按钮显示正确
        updateRetryButtonsVisibility();
    } else {
        showError("更新消息失败。");
        // Optionally keep modal open on failure? For now, we hide it.
    }

    hideEditMessageModal();
}

/** Handles the cancellation of the edit message modal */
function handleEditMessageCancel() {
    hideEditMessageModal();
}
// --- End Edit Message Modal Logic ---
/**
 * Application entry point.
 */
function main() {
    console.log("Main: Initializing application state...");
    state.initializeState(); // Initialize state first!
    
    console.log("Main: Initializing API configuration...");
    initializeConfig(); // Initialize API configuration
    
    console.log("Main: Initializing UI...");
    // Initialize UI elements and handlers
    if (!initUI()) {
        // Stop initialization if UI fails
        return; // Or handle more gracefully
    }
    
    console.log("Main: Initializing settings manager...");
    initializeSettingsManager(); // Initialize settings manager
    
    console.log("Main: Initializing web search toggle...");
    initializeWebSearchToggle(); // 初始化联网搜索按钮功能
    initializeNotificationCenter(); // 新增：初始化通知中心
    initializeBulkSessionManagement(); // 新增：初始化会话批量管理功能
    initializeInputExpansion(); // 新增：初始化输入框展开功能
    
    // Listen for request to open settings modal (e.g., from model quick switch menu)
    document.addEventListener('openSettingsModalRequest', () => {
        console.log("[Main] Received request to open settings modal.");
        showSettingsModal(); // Call the imported function
    });
    
    // 监听API配置更改事件
    document.addEventListener('apiConfigChanged', (event) => {
        console.log("API配置已更改:", event.detail);
        // 记录完整的配置变更信息
        if (event.detail.config) {
            console.log("新的API配置详情:", {
                模型: event.detail.config.model,
                基础URL: event.detail.config.baseurl,
                系统提示: event.detail.config.system_prompt?.substring(0, 50) + "..."
            });
        }
        
        // 重新渲染聊天界面，确保样式一致性
        renderChatForActiveSession();
    });
    
    // 初始化时强制触发一次配置变更事件，确保一致性
    const config = getApiConfig();
    try {
        const event = new CustomEvent('apiConfigChanged', { 
            detail: { config }
        });
        document.dispatchEvent(event);
        console.log("应用启动时触发API配置变更事件");
    } catch (err) {
        console.error("触发初始配置事件失败:", err);
    }
    
    // Initialize input handling, passing the handleSend function as the callback
    initInputHandling({ onSend: handleSend });

    // --- Initial Render ---
    console.log("Main: Performing initial render...");
    const initialSessions = state.getAllSessions();
    const initialActiveId = state.getActiveSessionId();
    renderSessionListFromSidebar(initialSessions, initialActiveId);
    renderChatForActiveSession(); // Render messages for the initially active session
    // 确保初始渲染后重试按钮可见性正确
    ensureRetryButtonsVisibility();
    // ---------------------

    // --- Add Event Listeners for Sidebar and Chat Area ---
    const sessionList = document.getElementById('session-list'); // Sidebar list
    const addSessionButton = document.getElementById('add-session-btn'); // Add session button
    const chatArea = getElement('aiResponseArea'); // Chat area from domElements

    // Listener for Sidebar Interactions (Session Switch, Edit, Delete)
    if (sessionList) {
        sessionList.addEventListener('click', (event) => {
            const target = event.target;
            console.log("[Main] Click detected on session list. Target:", target);

            // 1. Check for Session Edit Button click
            const editButton = target.closest('.session-edit-btn');
            if (editButton) {
                event.stopPropagation();
                const sessionIdToEdit = editButton.dataset.sessionId;
                console.log(`[Main] Session Edit button clicked for ID: ${sessionIdToEdit}`);
                if (sessionIdToEdit) {
                    handleEditSession(sessionIdToEdit);
                } else {
                    console.error("[Main] Session Edit button clicked but session ID not found.");
                }
                return;
            }

            // 2. Check for Session Delete Button click
            const deleteButton = target.closest('.session-delete-btn');
            if (deleteButton) {
                event.stopPropagation();
                const sessionIdToDelete = deleteButton.dataset.sessionId;
                console.log(`[Main] Session Delete button clicked for ID: ${sessionIdToDelete}`);
                if (sessionIdToDelete) {
                    handleDeleteSession(sessionIdToDelete);
                } else {
                     console.error("[Main] Session Delete button clicked but session ID not found.");
                }
                return;
            }

            // 3. Check for Session Switch click (on the LI itself)
            const targetLi = target.closest('li[data-session-id]');
            if (targetLi && !targetLi.classList.contains('placeholder-text')) {
                const sessionIdToSwitch = targetLi.dataset.sessionId;
                const currentActiveId = state.getActiveSessionId();
                if (sessionIdToSwitch && sessionIdToSwitch !== currentActiveId) {
                    console.log(`[Main] Switching to session: ${sessionIdToSwitch}`);
                    if (state.setActiveSessionId(sessionIdToSwitch)) {
                        renderSessionListFromSidebar(state.getAllSessions(), sessionIdToSwitch);
                        renderChatForActiveSession();
                    }
                }
            }
        });
    } else {
        console.error("Could not find #session-list element to attach listener.");
    }

    // Listener for Adding a New Session
    if (addSessionButton) {
        addSessionButton.addEventListener('click', () => {
            console.log("Add new session button clicked.");
            const newSessionId = state.addSession(); // Add session with default name
            if (newSessionId) {
                state.setActiveSessionId(newSessionId); // Make the new one active
                renderSessionListFromSidebar(state.getAllSessions(), newSessionId); // Update sidebar
                renderChatForActiveSession(); // Render the new empty chat
            } else {
                 console.error("Failed to add new session in state module.");
                 displayError("创建新会话失败。");
            }
        });
    } else {
         console.error("Could not find #add-session-btn element to attach listener.");
    }

   // Listener for Chat Area Interactions (Message Edit, Delete, Retry)
   if (chatArea) {
       chatArea.addEventListener('click', async (event) => { // Make async for retry
           const target = event.target;
           const actionButton = target.closest('.message-control-button');
           if (!actionButton) return; // Click wasn't on a control button

           const bubble = actionButton.closest('.message-bubble');
           if (!bubble || !bubble.dataset.messageIndex) return; // Couldn't find bubble or index

           const messageIndex = parseInt(bubble.dataset.messageIndex, 10);
           const action = actionButton.dataset.action;
           const activeId = state.getActiveSessionId();

           // --- 调试日志 ---
           console.log(`[Main] Message action clicked: Action=${action}, Index=${messageIndex}, Session=${activeId}`);
           console.log(`[Main] Bubble element:`, bubble);
           console.log(`[Main] Bubble raw content dataset:`, bubble.dataset.rawContent);
           // --- 结束调试日志 ---

           if (action === 'delete') {
               handleDeleteMessage(activeId, messageIndex);
           } else if (action === 'edit') {
               editButtonClickHandler(event);
           } else if (action === 'retry') {
               retryButtonClickHandler(event);
           } else if (action === 'copy') {
               copyButtonClickHandler(event);
           }
       });
   } else {
        console.error("Could not find chat area element (#ai-response) to attach listener.");
   }
    // ------------------------------------


// --- Old Event Listener for Header Edit Button Removed ---
    console.log("Main: Application initialized and initial render complete.");
}

enableSendButton(); // Ensure button is enabled and loader is hidden on startup

// Wait for the DOM to be fully loaded before running the main script
document.addEventListener('DOMContentLoaded', main);

/**
 * 处理删除会话
 * @param {string} sessionId 会话ID
 */
function handleDeleteSession(sessionId) {
    if (!sessionId) {
        console.error("[Main] handleDeleteSession: No session ID provided.");
        return;
    }
    
    // 获取会话名称用于显示
    const session = state.getSession(sessionId);
    if (!session) {
        console.error("[Main] handleDeleteSession: Session not found:", sessionId);
        return;
    }
    const sessionName = session.name;
    
    // 使用自定义确认对话框替代
    showConfirm({
        title: '删除会话',
        message: `您确定要删除会话 "${sessionName}" 吗？\n此操作无法撤销。`,
        confirmText: '删除',
        cancelText: '取消',
        onConfirm: () => {
            console.log(`[Main] Deleting session: ${sessionId} (${sessionName})`);
            if (!state.deleteSession(sessionId)) {
                showError("删除会话失败。");
                return;
            }
            
            // 刷新会话列表
            const sessions = state.getAllSessions();
            const currentActiveId = state.getActiveSessionId();
            renderSessionListFromSidebar(sessions, currentActiveId);
            
            // 如果删除的会话是当前活动会话，重新加载聊天区域
            if (sessionId === currentActiveId) {
                renderChatForActiveSession();
            }
        }
    });
}

/**
 * 处理删除消息
 * @param {string} sessionId 会话ID
 * @param {number} messageIndex 消息索引
 */
function handleDeleteMessage(sessionId, messageIndex) {
    // 使用自定义确认对话框替代
    showConfirm({
        title: '删除消息',
        message: '您确定要删除这条消息吗？',
        confirmText: '删除',
        cancelText: '取消',
        onConfirm: () => {
            console.log(`[Main] Deleting message at index ${messageIndex} from session ${sessionId}`);
            
            if (state.deleteMessageFromSession(sessionId, messageIndex)) {
                renderChatForActiveSession(); // 重新渲染聊天区域
                // 额外确保重试按钮显示正确
                updateRetryButtonsVisibility();
            } else {
                showError("删除消息失败。");
            }
        }
    });
}

/**
 * 处理复制按钮点击
 * @param {Event} event 点击事件
 */
const copyButtonClickHandler = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    // 获取气泡元素 (所在DOM树上最近的带有 message-bubble 类的祖先元素)
    const bubbleElement = event.target.closest('.message-bubble');
    if (!bubbleElement || !bubbleElement.dataset.rawContent) {
        console.error("[Main] copyButtonClickHandler: No bubble found or no raw content.");
        showWarning("无法复制：消息内容为空。");
        return;
    }
    
    // 获取原始文本内容
    const content = bubbleElement.dataset.rawContent;
    if (!content) {
        console.error("[Main] copyButtonClickHandler: Bubble has empty raw content.");
        showWarning("无法复制：消息内容为空。");
        return;
    }
    
    // 尝试复制文本
    try {
        const successful = await copyTextToClipboard(content);
        if (successful) {
            showSuccess("已复制到剪贴板");
        }
    } catch (error) {
        console.error("复制失败:", error);
        showError("复制失败，请手动选择文本复制。");
    }
};

/**
 * 将文本复制到剪贴板
 * @param {string} text 要复制的文本
 * @returns {Promise<boolean>} 是否复制成功
 */
async function copyTextToClipboard(text) {
    // 定义处理成功/失败的函数
    const handleCopySuccess = () => {
        console.log("[Main] Copy successful.");
        return true;
    };
    
    const handleCopyFailure = (methodUsed) => {
        console.error(`[Main] Copy failed using ${methodUsed}.`);
        if (methodUsed === 'clipboard API') {
            if (!window.isSecureContext) {
                showError('复制失败：此功能需要安全连接 (HTTPS) 或在 localhost 上运行。');
            } else {
                showError('复制失败！浏览器不支持或禁止了后备复制方法。');
            }
        } else {
            showError('复制失败！您的浏览器可能不支持此操作或权限不足。');
        }
        return false;
    };
    
    // 尝试使用 Clipboard API (现代浏览器)
    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(text);
            return handleCopySuccess();
        } catch (error) {
            console.error("[Main] Clipboard API copy failed:", error);
            return copyTextFallback(text) ? handleCopySuccess() : handleCopyFailure('fallback');
        }
    } else {
        // 执行后备复制方法
        return copyTextFallback(text) ? handleCopySuccess() : handleCopyFailure('clipboard API');
    }
}

/**
 * 处理删除按钮点击
 * @param {Event} event 点击事件
 */
const deleteButtonClickHandler = (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    // 获取气泡元素 (所在DOM树上最近的带有 message-bubble 类的祖先元素)
    const bubbleElement = event.target.closest('.message-bubble');
    if (!bubbleElement || !bubbleElement.dataset.messageIndex) {
        console.error("[Main] deleteButtonClickHandler: No bubble found or no message index.");
        return;
    }
    
    // 获取消息索引，并确认删除
    const messageIndex = parseInt(bubbleElement.dataset.messageIndex);
    if (isNaN(messageIndex)) {
        console.error("[Main] deleteButtonClickHandler: Invalid message index.");
        return;
    }
    
    const activeId = state.getActiveSessionId();
    handleDeleteMessage(activeId, messageIndex);
};

/**
 * 处理编辑按钮点击
 * @param {Event} event 点击事件
 */
const editButtonClickHandler = (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    // 获取气泡元素 (所在DOM树上最近的带有 message-bubble 类的祖先元素)
    const bubbleElement = event.target.closest('.message-bubble');
    if (!bubbleElement || !bubbleElement.dataset.messageIndex || !bubbleElement.dataset.rawContent) {
        console.error("[Main] editButtonClickHandler: Missing required bubble data.");
        return;
    }
    
    // 获取消息索引和原始内容
    const messageIndex = parseInt(bubbleElement.dataset.messageIndex);
    const rawContent = bubbleElement.dataset.rawContent;
    
    if (isNaN(messageIndex) || !rawContent) {
        console.error("[Main] editButtonClickHandler: Invalid message index or no raw content.");
        showError("无法编辑此消息：缺少原始内容数据。");
        return;
    }
    
    // 显示编辑对话框
    showEditMessageModal(messageIndex, rawContent);
};

/**
 * 处理重试按钮点击
 * @param {Event} event 点击事件
 */
const retryButtonClickHandler = (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    console.log("[Main] Retry button clicked, looking for user message to retry...");
    // 获取当前点击的AI消息的索引
    const aiBubble = event.target.closest('.assistant-bubble');
    const activeId = state.getActiveSessionId();
    
    if (!aiBubble || !aiBubble.dataset.messageIndex || !activeId) {
        console.error("[Main] retryButtonClickHandler: Missing required data.");
        return;
    }
    
    const aiMessageIndex = parseInt(aiBubble.dataset.messageIndex);
    if (isNaN(aiMessageIndex)) {
        console.error("[Main] retryButtonClickHandler: Invalid AI message index.");
        return;
    }
    
    // 我们假设用户消息在AI消息之前，因此索引是AI消息索引减1
    const userMessageIndex = aiMessageIndex - 1;
    if (userMessageIndex < 1) { // 小于1因为0通常是系统消息
        console.error("[Main] retryButtonClickHandler: Cannot find valid user message index.");
        showWarning("无法找到有效的用户消息进行重试。");
        return;
    }
    
    console.log(`[Main] Attempting to retry with user message at index ${userMessageIndex}...`);
    
    // 删除旧的AI回复
    if (!state.deleteMessageFromSession(activeId, aiMessageIndex)) {
        console.error("[Main] retryButtonClickHandler: Failed to delete old AI message.");
        showError("删除旧的 AI 回复失败，无法重试。");
        return;
    }
    
    // 获取更新后的消息列表（确认删除成功）
    const messages = state.getMessages(activeId);
    if (!messages || userMessageIndex >= messages.length) {
        console.error("[Main] retryButtonClickHandler: Invalid message array or user index after deletion.");
        showError("无法获取有效的消息历史记录以进行重试。");
        return;
    }
    
    // 准备用户消息的内容用于重新发送
    const userMessage = messages[userMessageIndex];
    if (!userMessage || userMessage.role !== 'user') {
        console.error("[Main] retryButtonClickHandler: Message at index is not a user message.");
        return;
    }
    
    // 使用与handleSend相同的逻辑，但获取内容从state而不是输入区域
    const contentParts = userMessage.content; // 用户消息的内容部分
    
    // 重新渲染聊天区域（移除旧的AI回复）
    renderChatForActiveSession();
    
    // 重新处理我们的请求（使用现有的处理逻辑）
    // 注意：handleSend函数的finally块中会再次调用renderChatForActiveSession
    handleSend(contentParts);
};

// 修复messageControlsClickHandler函数中的错误，增加对handleDeleteMessage的引用
function messageControlsClickHandler(event) {
    const actionButton = event.target.closest('.message-control-button');
    if (!actionButton) return; // Clicked on the controls div but not a button
    
    const action = actionButton.dataset.action; // 'copy', 'edit', 'delete', 'retry'
    if (!action) return; // No action defined
    
    const bubble = actionButton.closest('.message-bubble');
    if (!bubble) return; // No bubble found (shouldn't happen)
    
    const activeId = state.getActiveSessionId();
    const messageIndex = parseInt(bubble.dataset.messageIndex);
    
    if (!activeId || isNaN(messageIndex)) {
        console.error(`[Main] Cannot process ${action} action: Invalid session ID or message index.`);
        return;
    }
    
    console.log(`[Main] Message ${action} action clicked for message index ${messageIndex}.`);
    
    // Handle based on action type
    if (action === 'delete') {
        handleDeleteMessage(activeId, messageIndex);
    } else if (action === 'edit') {
        editButtonClickHandler(event);
    } else if (action === 'retry') {
        retryButtonClickHandler(event);
    } else if (action === 'copy') {
        copyButtonClickHandler(event);
    }
}

// 额外添加一个检查，确保重试按钮可见性已更新
function ensureRetryButtonsVisibility() {
    console.log("[Main] 开始确保重试按钮可见性...");
    
    // 立即调用一次
    const btn1 = updateRetryButtonsVisibility();
    console.log(`[Main] 第一次调用获得按钮: ${btn1 ? '成功' : '失败'}`);
    
    // 延迟100ms后再次调用，确保浏览器有足够时间更新DOM
    setTimeout(() => {
        const btn2 = updateRetryButtonsVisibility();
        console.log(`[Main] 第二次调用(100ms)获得按钮: ${btn2 ? '成功' : '失败'}`);
    }, 100);
    
    // 延迟300ms后再次调用，处理可能的异步渲染问题
    setTimeout(() => {
        const btn3 = updateRetryButtonsVisibility();
        console.log(`[Main] 第三次调用(300ms)获得按钮: ${btn3 ? '成功' : '失败'}`);
    }, 300);
    
    // 延迟1000ms后最后一次调用，确保所有可能的渲染和状态更新都完成
    setTimeout(() => {
        const btn4 = updateRetryButtonsVisibility();
        console.log(`[Main] 最后一次调用(1000ms)获得按钮: ${btn4 ? '成功' : '失败'}`);
    }, 1000);
}

// Make sure renderChatForActiveSession is available for sidebar.js to import or call
export { renderChatForActiveSession }; // If it's defined in main.js and sidebar needs it.