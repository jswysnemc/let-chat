// src/main.js
// Import UI functions
import * as ui from './ui.js';
// Import State functions
import * as state from './state.js';
// Import other modules
import { initInputHandling } from './inputController.js';
import { streamAIResponse } from './apiClient.js';
import { renderMarkdown, highlightCodeBlocks } from './markdownRenderer.js';


/** Renders the chat messages for the currently active session */
function renderChatForActiveSession() {
    const activeId = state.getActiveSessionId();
    const session = state.getSession(activeId);

    if (!session) {
        console.warn("renderChatForActiveSession: No active session found or session data missing.");
        ui.clearChatArea();
        ui.updateChatTitle("无活动会话");
        return;
    }

    console.log(`Rendering chat for session: ${session.name} (${activeId})`);
    ui.clearChatArea();
    ui.updateChatTitle(session.name);
    const messages = state.getMessages(activeId); // Get messages for the active session

    // Iterate messages, skip the first system message for display
    messages.slice(1).forEach(msg => {
        if (!msg || !msg.role || typeof msg.content === 'undefined') {
             console.warn("Skipping invalid message object:", msg);
             return;
        }
        if (msg.role === 'user') {
            // Ensure content is in the expected format (array of parts)
            const contentParts = Array.isArray(msg.content) ? msg.content : [{ type: 'text', text: String(msg.content) }];
            ui.displayUserMessage(contentParts);
        } else if (msg.role === 'assistant') {
             // Ensure content is a string for displayAssistantMessage
             const contentString = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
             ui.displayAssistantMessage(contentString); // Use the new UI function
        }
        // Ignore 'system' messages for display here
    });

    // Scroll to bottom after rendering history
    // Use a slightly longer delay to ensure images might have loaded
    setTimeout(() => ui.scrollChatToBottom(), 100);
}


/**
 * 处理用户发送消息的核心逻辑。
 * 作为回调函数传递给 inputController。
 * @param {Array<object>} contentParts - 从输入控制器提取的内容部分。
 */
async function handleSend(contentParts) {
    const activeId = state.getActiveSessionId();
    if (!activeId) {
        console.error("Cannot send message, no active session.");
        ui.displayError("无法发送消息，没有活动的会话。");
        return;
    }

    console.log(`Main: Handling send request for session ${activeId}...`);
    ui.disableSendButton();
    ui.showLoading();

    // 1. Update state and display user message for the active session
    try {
        // Add message to the specific session's history
        if (!state.addMessageToSession(activeId, 'user', contentParts)) {
             throw new Error("Failed to add user message to state.");
        }
        ui.displayUserMessage(contentParts);
        ui.clearInput(); // Clear input after grabbing content
    } catch (error) {
        console.error("Error processing user input:", error);
        ui.displayError("处理您的输入时出错: " + error.message);
        ui.hideLoading();
        ui.enableSendButton();
        return; // Stop processing if user input handling fails
    }


    // 2. Prepare for and call API using the active session's history
    const currentHistory = state.getActiveSessionMessages(); // Get messages for the active session
    let assistantBubbleRefs = null;
    let accumulatedContent = ''; // To store the full response text

    try {
        // Create the bubble structure first using the UI function
        assistantBubbleRefs = ui.createAssistantMessageBubble();
        if (!assistantBubbleRefs) {
            throw new Error("UI Error: 无法创建助手消息气泡。");
        }

        // 3. Stream and render AI response
        for await (const chunk of streamAIResponse(currentHistory)) {
            accumulatedContent += chunk;
            // Render the accumulated content as HTML
            const htmlContent = renderMarkdown(accumulatedContent);
            // Update the content container's innerHTML using the UI function
            ui.updateAssistantMessageContent(assistantBubbleRefs.contentContainer, htmlContent);
            // Process code blocks within the updated container (highlighting, etc.)
            try {
                 highlightCodeBlocks(assistantBubbleRefs.contentContainer);
            } catch(e) { console.error("Error highlighting during stream:", e); }
            // Note: Scrolling is handled within updateAssistantMessageContent
        }

        // 4. Finalize after stream ends successfully
        if (!state.addMessageToSession(activeId, 'assistant', accumulatedContent)) { // Add to active session state
             console.error("Failed to add assistant message to state.");
             // Maybe display an error?
        }
        // Finalize UI (enable copy button, etc.) using the UI function
        ui.finalizeAssistantMessage(assistantBubbleRefs.bubbleElement, assistantBubbleRefs.copyButton, accumulatedContent);

    } catch (error) {
        console.error("Error during AI response fetch/stream:", error);
        // Display error in the chat area using the UI function
        ui.displayError(error.message || "与 AI 通信时发生未知错误");
        // If a bubble was created before the error, maybe remove it or style it?
        // For now, just display the separate error message.
    } finally {
        // 5. Always re-enable button and hide loading indicator using UI functions
        ui.hideLoading();
        ui.enableSendButton();
        console.log("Main: Send request processing finished.");
    }
}


/**
 * Handles the logic for editing a session's name and system prompt.
 * @param {string} sessionId - The ID of the session to edit.
 */
function handleEditSession(sessionId) {
    if (!sessionId) {
        console.error("handleEditSession: No session ID provided.");
        return;
    }
    console.log(`Attempting to edit session: ${sessionId}`);

    const session = state.getSession(sessionId);
    if (!session) {
        alert("无法加载要编辑的会话数据。");
        return;
    }

    // Find the current system prompt content
    const systemMessage = session.messages.find(m => m.role === 'system');
    const currentSystemPrompt = systemMessage ? systemMessage.content : '';

    let nameChanged = false;
    let promptChanged = false;

    // 1. Edit Name using prompt()
    const newName = prompt("编辑会话名称：", session.name);
    if (newName !== null) { // Check if user cancelled
        const trimmedName = newName.trim();
        if (trimmedName && trimmedName !== session.name) {
            if (state.updateSessionName(sessionId, trimmedName)) {
                nameChanged = true;
            } else { alert("更新会话名称失败。"); }
        } else if (!trimmedName) { alert("会话名称不能为空。"); }
    }

    // 2. Edit System Prompt using prompt()
    const newPrompt = prompt("编辑系统提示 (System Prompt)：", currentSystemPrompt);
     if (newPrompt !== null) { // Check if user cancelled
         if (newPrompt !== currentSystemPrompt) { // Only update if changed
             if (state.updateSystemPrompt(sessionId, newPrompt)) {
                 promptChanged = true;
             } else { alert("更新系统提示失败。"); }
         }
     }

    // 3. Refresh UI if changes were made
    if (nameChanged || promptChanged) {
         console.log("会话已更新，正在刷新 UI...");
         const currentActiveId = state.getActiveSessionId(); // Get current active ID for rendering list highlight
         ui.renderSessionList(state.getAllSessions(), currentActiveId);
         // Update chat title ONLY if the edited session is the currently active one
         if (sessionId === currentActiveId) {
             const updatedSession = state.getSession(sessionId); // Re-fetch session data for updated name
             if (updatedSession) {
                ui.updateChatTitle(updatedSession.name);
             }
         }
         // Consider adding a small visual confirmation to the user
    }
}

/**
 * Application entry point.
 */
function main() {
    console.log("Main: Initializing application state...");
    state.initializeState(); // Initialize state first!

    console.log("Main: Initializing UI...");
    // Initialize UI elements and handlers
    if (!ui.initUI()) {
        // Stop initialization if UI fails
        return; // Or handle more gracefully
    }

    // Initialize input handling, passing the handleSend function as the callback
    initInputHandling({ onSend: handleSend });

    // --- Initial Render ---
    console.log("Main: Performing initial render...");
    const initialSessions = state.getAllSessions();
    const initialActiveId = state.getActiveSessionId();
    ui.renderSessionList(initialSessions, initialActiveId);
    renderChatForActiveSession(); // Render messages for the initially active session
    // ---------------------

    // --- Add Event Listeners for Sidebar ---
    const sessionList = document.getElementById('session-list');
    const addSessionButton = document.getElementById('add-session-btn');

    // Listener for switching sessions
    if (sessionList) {
        sessionList.addEventListener('click', (event) => {
            // 首先检查是否点击了编辑按钮
            const editButton = event.target.closest('.session-edit-btn');
            if (editButton) {
                event.stopPropagation(); // Prevent triggering session switch
                const sessionIdToEdit = editButton.dataset.sessionId;
                if (sessionIdToEdit) {
                    handleEditSession(sessionIdToEdit); // Call the helper function
                } else {
                    console.error("Edit button clicked but session ID not found.");
                }
                return; // Stop processing after handling edit
            }

            // 然后检查是否点击了删除按钮
            const deleteButton = event.target.closest('.session-delete-btn');
            if (deleteButton) {
                event.stopPropagation(); // 阻止事件冒泡到 li 元素，防止触发切换
                const sessionIdToDelete = deleteButton.getAttribute('data-session-id');
                if (sessionIdToDelete) {
                    const sessionToDelete = state.getSession(sessionIdToDelete);
                    const sessionName = sessionToDelete?.name || `ID ${sessionIdToDelete.substring(0,4)}`; // 获取会话名称用于确认
                    // 弹出确认框
                    if (confirm(`您确定要删除会话 "${sessionName}" 吗？\n此操作无法撤销。`)) {
                        console.log(`尝试删除会话: ${sessionIdToDelete}`);
                        // 调用 state 函数删除会话
                        if (state.deleteSession(sessionIdToDelete)) {
                            // 如果删除成功，重新渲染侧边栏和聊天区域
                            const newActiveId = state.getActiveSessionId(); // 获取删除后（可能变化）的活动 ID
                            ui.renderSessionList(state.getAllSessions(), newActiveId);
                            renderChatForActiveSession();
                        }
                        // 如果 state.deleteSession 返回 false (例如试图删除最后一个会话), state 模块内部会处理 alert
                    }
                }
                return; // 处理完删除点击后，不再继续执行
            }

            // 如果点击的不是删除按钮，再检查是否点击了列表项以进行切换
            const targetLi = event.target.closest('li[data-session-id]');
            if (targetLi && !targetLi.classList.contains('placeholder-text')) {
                const sessionIdToSwitch = targetLi.getAttribute('data-session-id');
                const currentActiveId = state.getActiveSessionId();
                // 只有当点击的会话不是当前活动会话时才切换
                if (sessionIdToSwitch && sessionIdToSwitch !== currentActiveId) {
                    console.log(`切换到会话: ${sessionIdToSwitch}`);
                    if (state.setActiveSessionId(sessionIdToSwitch)) {
                        // 重新渲染列表以更新高亮
                        ui.renderSessionList(state.getAllSessions(), sessionIdToSwitch);
                        // 渲染新活动会话的聊天内容
                        renderChatForActiveSession();
                    }
                }
            }
        });
    } else {
        console.error("Could not find #session-list element to attach listener.");
    }

    // Listener for adding a new session
    if (addSessionButton) {
        addSessionButton.addEventListener('click', () => {
            console.log("Add new session button clicked.");
            const newSessionId = state.addSession(); // Add session with default name
            if (newSessionId) {
                state.setActiveSessionId(newSessionId); // Make the new one active
                ui.renderSessionList(state.getAllSessions(), newSessionId); // Update sidebar
                renderChatForActiveSession(); // Render the new empty chat
            } else {
                 console.error("Failed to add new session in state module.");
                 ui.displayError("创建新会话失败。");
            }
        });
    } else {
         console.error("Could not find #add-session-btn element to attach listener.");
    }
    // ------------------------------------


// --- Old Event Listener for Header Edit Button Removed ---
    console.log("Main: Application initialized and initial render complete.");
}

// Wait for the DOM to be fully loaded before running the main script
document.addEventListener('DOMContentLoaded', main);