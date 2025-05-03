// src/main.js
// Import State functions
import * as state from './state.js';
// Import UI functions from specific modules
import { initUI } from './ui.js'; // Main UI initializer
import { updateChatTitle, renderSessionList } from './ui/sidebar.js'; // Removed clearChatArea from here
import { clearChatArea, displayUserMessage, displayAssistantMessage, displayError, createAssistantMessageBubble, updateAssistantMessageContent, finalizeAssistantMessage } from './ui/messageDisplay.js'; // Added clearChatArea here
import { scrollChatToBottom } from './ui/chatScroll.js';
import { disableSendButton, enableSendButton } from './ui/buttonStates.js';
import { clearInput } from './ui/inputArea.js';
import { getEditModalFormElements, getEditModalValues, hideEditModal, setEditModalValues, showEditModal } from './ui/editModal.js';
// Import other modules
import { getElement } from './ui/domElements.js'; // Import getElement
import { aiResponseArea } from './ui/domElements.js'; // Import the chat area element
import { initInputHandling } from './inputController.js';
import { streamAIResponse } from './apiClient.js';
import { renderMarkdown, highlightCodeBlocks } from './markdownRenderer.js';


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
            const htmlContent = renderMarkdown(accumulatedContent);
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

/**
 * Application entry point.
 */
function main() {
    console.log("Main: Initializing application state...");
    state.initializeState(); // Initialize state first!

    console.log("Main: Initializing UI...");
    // Initialize UI elements and handlers
    if (!initUI()) {
        // Stop initialization if UI fails
        return; // Or handle more gracefully
    }

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
                    if (confirm(`您确定要删除会话 "${sessionName}" 吗？\n此操作无法撤销。`)) {
                        if (state.deleteSession(sessionIdToDelete)) {
                            const newActiveId = state.getActiveSessionId();
                            renderSessionList(state.getAllSessions(), newActiveId);
                            renderChatForActiveSession(); // Render potentially new active chat
                        }
                    }
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
               if (confirm("您确定要删除这条消息吗？")) {
                   if (state.deleteMessageFromSession(activeId, messageIndex)) {
                       renderChatForActiveSession(); // Re-render the chat
                   } else {
                       alert("删除消息失败。");
                   }
               }
           } else if (action === 'edit') {
               const rawContent = bubble.dataset.rawContent;
                if (typeof rawContent === 'undefined') { // 增加检查
                    console.error(`[Main] Edit action failed: rawContent is undefined for index ${messageIndex}.`);
                    alert("无法编辑此消息：缺少原始内容数据。");
                    return;
                }
               // TODO: Implement a proper editing modal/inline editor
               const newContent = prompt("编辑消息:", rawContent); // Simple prompt for now
               if (newContent !== null && newContent !== rawContent) { // Check if changed and not cancelled
                    // For user messages, content might be complex (text/image parts)
                    // For AI messages, it's usually just text.
                    // Need a robust way to handle editing, especially for user messages.
                    // Simple approach for now: assume text editing.
                    if (state.updateMessageInSession(activeId, messageIndex, newContent)) {
                        renderChatForActiveSession();
                    } else {
                        alert("更新消息失败。");
                    }
               }
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
                        const htmlContent = renderMarkdown(accumulatedContent);
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
               // Copy action is handled internally by the button's own listener in messageDisplay.js
               console.log("[Main] Copy action detected (handled internally).");
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