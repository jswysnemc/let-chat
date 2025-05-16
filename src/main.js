// src/main.js
// Import State functions
import * as state from './state.js';
// Import Config module
import { initializeConfig } from './config.js';
// Import UI functions from specific modules
import { initUI } from './ui.js'; // Main UI initializer
import { updateChatTitle, renderSessionList } from './ui/sidebar.js'; // Removed clearChatArea from here
import { clearChatArea, displayUserMessage, displayAssistantMessage, displayError, createAssistantMessageBubble, updateAssistantMessageContent, finalizeAssistantMessage } from './ui/messageDisplay.js'; // Added clearChatArea here
import { scrollChatToBottom } from './ui/chatScroll.js';
import { disableSendButton, enableSendButton } from './ui/buttonStates.js';
import { clearInput } from './ui/inputArea.js';
import { getEditModalFormElements, getEditModalValues, hideEditModal, setEditModalValues, showEditModal } from './ui/editModal.js';
// Import settings manager
import { initializeSettingsManager } from './ui/settingsManager.js';
// Import other modules
import { getElement } from './ui/domElements.js'; // Import getElement
import { aiResponseArea } from './ui/domElements.js'; // Import the chat area element
import { initInputHandling } from './inputController.js';
import { streamAIResponse } from './apiClient.js';
import { renderMarkdown, renderMarkdownAsync, highlightCodeBlocks } from './markdownRenderer.js';
import { showConfirmationModal } from './ui/confirmModal.js'; // Import the new modal function
import { copyTextFallback } from './ui/copyUtils.js'; // Import copy fallback


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

    // 循环结束后，查找最后一个 AI 消息气泡并显示重试按钮
    const allAssistantBubbles = aiResponseArea.querySelectorAll('.assistant-bubble:not(.error-message)'); // 排除错误消息
    if (allAssistantBubbles.length > 0) {
        const lastBubble = allAssistantBubbles[allAssistantBubbles.length - 1];
        const retryBtn = lastBubble.querySelector('.message-retry-btn');
        if (retryBtn) {
            // console.log("[Main] Showing retry button on the last AI message bubble:", lastBubble); // 保留这个有用的日志或移除
            retryBtn.classList.remove('hidden'); // 显示重试按钮
        } else {
             console.warn("[Main] Could not find retry button in the last AI message bubble:", lastBubble);
        }
    }
    // else { // 移除这个日志，因为它在正常情况下也会出现
    //      console.log("[Main] No assistant messages found, skipping retry button display.");
    // }

    // Scroll to bottom after rendering history
    // Use a slightly longer delay to ensure images might have loaded
    setTimeout(() => scrollChatToBottom(), 100);
}


/**
 * 处理用户发送消息的核心逻辑。
 * 作为回调函数传递给 inputController。
 * @param {Array<object>} contentParts - 从输入控制器提取的内容部分。
 */
async function handleSend(contentParts) {
    console.log("[Main] handleSend called with contentParts:", JSON.stringify(contentParts)); // Log entry and content
    const activeId = state.getActiveSessionId();
    if (!activeId) {
        console.error("[Main] Cannot send message, no active session ID.");
        displayError("无法发送消息，没有活动的会话。");
        return;
    }

    console.log(`Main: Handling send request for session ${activeId}...`);
    disableSendButton(); // This will now also call showLoading()

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
                    renderSessionList(state.getAllSessions(), activeId);
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
            // Render the accumulated content as HTML
            let htmlContent = "";
            
            // 特殊情况：直接识别以**开头的文本
            if (accumulatedContent.trim().startsWith("**") && accumulatedContent.includes("**")) {
                console.log("[Main] 检测到流式内容以**开头，使用特殊处理");
                try {
                    // 1. 首先尝试完整的Markdown渲染
                    htmlContent = renderMarkdown(accumulatedContent);
                } catch (err) {
                    console.error("流式Markdown渲染失败，使用直接替换:", err);
                    // 2. 直接替换**文本**为<strong>文本</strong>
                    htmlContent = accumulatedContent;
                    htmlContent = htmlContent.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
                    // 3. 转义其余HTML
                    htmlContent = htmlContent.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                    // 4. 还原strong标签
                    htmlContent = htmlContent.replace(/&lt;strong&gt;/g, "<strong>").replace(/&lt;\/strong&gt;/g, "</strong>");
                    // 5. 包装在<p>标签中
                    if (!htmlContent.startsWith("<p>")) {
                        htmlContent = `<p>${htmlContent}</p>`;
                    }
                }
            } else {
                // 常规内容处理
                try {
                    // 尝试完整的Markdown渲染
                    htmlContent = renderMarkdown(accumulatedContent);
                } catch (err) {
                    console.error("流式Markdown渲染失败，使用基本处理:", err);
                    // 确保至少渲染一些内容和粗体文本
                    htmlContent = accumulatedContent;
                    htmlContent = htmlContent.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
                    htmlContent = htmlContent.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                    htmlContent = htmlContent.replace(/&lt;strong&gt;/g, "<strong>").replace(/&lt;\/strong&gt;/g, "</strong>");
                    if (!htmlContent.startsWith("<p>")) {
                        htmlContent = `<p>${htmlContent}</p>`;
                    }
                }
            }
            
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
        alert("无法加载要编辑的会话数据。");
        return;
    }

    // Get modal elements using the new UI function
    console.log("[Main] handleEditSession: Getting modal form elements...");
    const modalElements = getEditModalFormElements();
    if (!modalElements) {
        console.error("[Main] handleEditSession: Failed to get modal elements from UI module.");
        alert("无法初始化编辑对话框。");
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
            alert("会话名称不能为空。");
            // Optionally focus the name input: ui.getElement('editModalNameInput')?.focus();
            return; // Keep modal open if validation fails
        }
        if (newValues.name !== currentName) {
            if (state.updateSessionName(sessionId, newValues.name)) {
                nameChanged = true;
            } else {
                alert("更新会话名称失败。");
                // Decide if modal should stay open on failure
            }
        }

        // Update prompt if changed (allow empty prompt?)
        if (newValues.prompt !== currentSystemPrompt) {
             if (state.updateSystemPrompt(sessionId, newValues.prompt)) {
                 promptChanged = true;
             } else {
                 alert("更新系统提示失败。");
                  // Decide if modal should stay open on failure
             }
        }

        // Refresh UI if changes were successfully made
        if (nameChanged || promptChanged) {
             console.log("[Main] Session updated, refreshing UI...");
             const currentActiveId = state.getActiveSessionId();
             renderSessionList(state.getAllSessions(), currentActiveId);
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
        alert("无法打开编辑消息对话框。");
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

    // TODO: Add check if content actually changed?
    // const originalContent = state.getMessageContent(activeId, currentEditingMessageIndex); // Need a function like this in state.js
    // if (newContent !== originalContent) { ... }

    if (state.updateMessageInSession(activeId, currentEditingMessageIndex, newContent)) {
        renderChatForActiveSession(); // Re-render chat on success
    } else {
        alert("更新消息失败。");
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
    
    // Initialize input handling, passing the handleSend function as the callback
    initInputHandling({ onSend: handleSend });

    // --- Initial Render ---
    console.log("Main: Performing initial render...");
    const initialSessions = state.getAllSessions();
    const initialActiveId = state.getActiveSessionId();
    renderSessionList(initialSessions, initialActiveId);
    renderChatForActiveSession(); // Render messages for the initially active session
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
                    const sessionToDelete = state.getSession(sessionIdToDelete);
                    const sessionName = sessionToDelete?.name || `ID ${sessionIdToDelete.substring(0,4)}`;
                    // Replace confirm with custom modal
                    showConfirmationModal(
                        `您确定要删除会话 "${sessionName}" 吗？此操作无法撤销。`,
                        () => { // onConfirm callback
                            if (state.deleteSession(sessionIdToDelete)) {
                                const newActiveId = state.getActiveSessionId();
                                renderSessionList(state.getAllSessions(), newActiveId);
                                renderChatForActiveSession(); // Render potentially new active chat
                            } else {
                                alert("删除会话失败。"); // Show error if deletion fails
                            }
                        },
                        "删除会话" // Optional title
                    );
                    /* Original confirm logic:
                    if (confirm(`您确定要删除会话 "${sessionName}" 吗？\n此操作无法撤销。`)) {
                        if (state.deleteSession(sessionIdToDelete)) {
                            const newActiveId = state.getActiveSessionId();
                            renderSessionList(state.getAllSessions(), newActiveId);
                            // renderChatForActiveSession(); // Render potentially new active chat - Moved inside callback
                        }
                    }
                    */
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
                        renderSessionList(state.getAllSessions(), sessionIdToSwitch);
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
                renderSessionList(state.getAllSessions(), newSessionId); // Update sidebar
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
               // Replace confirm with custom modal
               showConfirmationModal(
                   "您确定要删除这条消息吗？",
                   () => { // onConfirm callback
                       if (state.deleteMessageFromSession(activeId, messageIndex)) {
                           renderChatForActiveSession(); // Re-render the chat
                       } else {
                           alert("删除消息失败。");
                       }
                   },
                   "删除消息" // Optional title
               );
               /* Original confirm logic:
               if (confirm("您确定要删除这条消息吗？")) {
                   if (state.deleteMessageFromSession(activeId, messageIndex)) {
                       renderChatForActiveSession(); // Re-render the chat
                   } else {
                       alert("删除消息失败。");
                   }
               }
               */
           } else if (action === 'edit') {
               const rawContent = bubble.dataset.rawContent;
                if (typeof rawContent === 'undefined') { // 增加检查
                    console.error(`[Main] Edit action failed: rawContent is undefined for index ${messageIndex}.`);
                    alert("无法编辑此消息：缺少原始内容数据。");
                    return;
                }
               // Use the new custom modal instead of prompt()
               showEditMessageModal(messageIndex, rawContent);
               // The logic for updating state and UI is now handled by handleEditMessageSubmit
               /*
               const newContent = prompt("编辑消息:", rawContent); // Simple prompt for now
               if (newContent !== null && newContent !== rawContent) { // Check if changed and not cancelled
                    // ... (old update logic) ...
               }
               */
           } else if (action === 'retry') {
                // 1. Find the preceding user message index (already done above, messageIndex is the AI's index)
                const userMessageIndex = messageIndex - 1;
                const messages = state.getMessages(activeId); // Re-fetch messages to be safe
                if (userMessageIndex < 1 || messages[userMessageIndex]?.role !== 'user') {
                     alert("无法找到有效的用户消息进行重试。");
                     return;
                }
                // 不需要获取旧的用户消息内容，因为我们不再调用 handleSend

                // 2. Delete the current AI message from state
                if (!state.deleteMessageFromSession(activeId, messageIndex)) {
                    alert("删除旧的 AI 回复失败，无法重试。");
                    return;
                }

                // 3. Re-render chat to remove the AI bubble visually
                renderChatForActiveSession();

                // 4. Get the current history (ending with the user message to retry)
                const currentHistory = state.getActiveSessionMessages(); // Fetch history AFTER deleting AI msg
                if (!currentHistory || currentHistory.length === 0 || currentHistory[currentHistory.length - 1]?.role !== 'user') {
                    alert("无法获取有效的消息历史记录以进行重试。");
                    return;
                }

                // 5. Directly call the API and handle the stream (similar to handleSend's latter half)
                console.log(`[Main] Retrying AI response for session ${activeId}`);
                disableSendButton(); // Disable button during retry
                let assistantBubbleRefs = null;
                let accumulatedContent = '';
                let assistantMessageIndex = -1; // Will be set after adding to state

                try {
                    // Calculate the expected index for the new AI message
                    assistantMessageIndex = currentHistory.length; // New message will be at the end
                    assistantBubbleRefs = createAssistantMessageBubble(assistantMessageIndex); // Create bubble with expected index
                    if (!assistantBubbleRefs) {
                        throw new Error("UI Error: 无法创建助手消息气泡以进行重试。");
                    }

                    // Stream and render AI response
                    for await (const chunk of streamAIResponse(currentHistory)) {
                        accumulatedContent += chunk;
                        
                        // 渲染内容
                        let htmlContent = "";
                        
                        // 特殊情况：直接识别以**开头的文本
                        if (accumulatedContent.trim().startsWith("**") && accumulatedContent.includes("**")) {
                            console.log("[Main] 检测到重试内容以**开头，使用特殊处理");
                            try {
                                // 首先尝试完整的Markdown渲染
                                htmlContent = renderMarkdown(accumulatedContent);
                            } catch (err) {
                                console.error("重试时Markdown渲染失败，使用直接替换:", err);
                                // 直接替换**文本**为<strong>文本</strong>
                                htmlContent = accumulatedContent;
                                htmlContent = htmlContent.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
                                // 转义其余HTML
                                htmlContent = htmlContent.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                                // 还原strong标签
                                htmlContent = htmlContent.replace(/&lt;strong&gt;/g, "<strong>").replace(/&lt;\/strong&gt;/g, "</strong>");
                                // 包装在<p>标签中
                                if (!htmlContent.startsWith("<p>")) {
                                    htmlContent = `<p>${htmlContent}</p>`;
                                }
                            }
                        } else {
                            // 常规内容处理
                            try {
                                // 尝试完整的Markdown渲染
                                htmlContent = renderMarkdown(accumulatedContent);
                            } catch (err) {
                                console.error("重试时Markdown渲染失败，使用基本处理:", err);
                                // 确保至少渲染一些内容和粗体文本
                                htmlContent = accumulatedContent;
                                htmlContent = htmlContent.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
                                htmlContent = htmlContent.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                                htmlContent = htmlContent.replace(/&lt;strong&gt;/g, "<strong>").replace(/&lt;\/strong&gt;/g, "</strong>");
                                if (!htmlContent.startsWith("<p>")) {
                                    htmlContent = `<p>${htmlContent}</p>`;
                                }
                            }
                        }
                        
                        updateAssistantMessageContent(assistantBubbleRefs.contentContainer, htmlContent);
                        try {
                             highlightCodeBlocks(assistantBubbleRefs.contentContainer);
                        } catch(e) { console.error("Error highlighting during retry stream:", e); }
                    }

                    // Finalize after stream ends successfully
                    const finalMessages = state.getMessages(activeId);
                    if (finalMessages.length !== assistantMessageIndex) {
                         console.warn(`State mismatch during retry: Expected AI message index ${assistantMessageIndex}, but current message count is ${finalMessages.length}. Attempting to add anyway.`);
                    }
                    if (!state.addMessageToSession(activeId, 'assistant', accumulatedContent)) {
                         console.error("Failed to add retried assistant message to state.");
                    } else {
                         // Update the bubble's index if state addition was successful
                         const updatedMessages = state.getMessages(activeId);
                         assistantMessageIndex = updatedMessages.length - 1;
                         if (assistantBubbleRefs.bubbleElement) {
                              assistantBubbleRefs.bubbleElement.dataset.messageIndex = assistantMessageIndex;
                         }
                    }
                    finalizeAssistantMessage(assistantBubbleRefs.bubbleElement, accumulatedContent);

                } catch (error) {
                    console.error("Error during AI response retry:", error);
                    displayError(error.message || "重试 AI 通信时发生未知错误");
                } finally {
                    enableSendButton(); // Re-enable button
                    // Re-render one last time to ensure retry button logic is correct
                    renderChatForActiveSession();
                }

           } else if (action === 'copy') {
               // Handle copy action here for both user and assistant messages
               const textToCopy = bubble.dataset.rawContent || '';
               if (!textToCopy) {
                   console.error("[Main] Copy action failed: rawContent is empty or missing.");
                   alert("无法复制：消息内容为空。");
                   return;
               }

               const copyBtn = actionButton; // The button that was clicked

               const handleCopySuccess = () => {
                   const originalHTML = copyBtn.innerHTML;
                   const originalTitle = copyBtn.title;
                   copyBtn.innerHTML = '<i class="fas fa-check"></i>';
                   copyBtn.title = '已复制!';
                   copyBtn.disabled = true;
                   setTimeout(() => {
                       copyBtn.innerHTML = originalHTML;
                       copyBtn.title = originalTitle;
                       copyBtn.disabled = false;
                   }, 2000);
               };

               const handleCopyFailure = (methodUsed) => {
                   console.error(`Copy failed using ${methodUsed}.`);
                   if (methodUsed === 'navigator.clipboard' && !window.isSecureContext) {
                       alert('复制失败：此功能需要安全连接 (HTTPS) 或在 localhost 上运行。');
                   } else if (methodUsed === 'document.execCommand') {
                       alert('复制失败！浏览器不支持或禁止了后备复制方法。');
                   } else {
                       alert('复制失败！您的浏览器可能不支持此操作或权限不足。');
                   }
               };

               // --- Main Copy Logic ---
               if (window.isSecureContext && navigator.clipboard && navigator.clipboard.writeText) {
                   navigator.clipboard.writeText(textToCopy).then(() => {
                       handleCopySuccess();
                   }).catch(err => {
                       console.error('navigator.clipboard.writeText failed:', err);
                       handleCopyFailure('navigator.clipboard');
                   });
               } else {
                   if (copyTextFallback(textToCopy)) {
                       handleCopySuccess();
                   } else {
                       handleCopyFailure('document.execCommand');
                   }
               }
               // --- End Main Copy Logic ---
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