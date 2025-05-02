// src/main.js
import {
    initUI,
    displayUserMessage,
    createAssistantMessageBubble,
    updateAssistantMessageContent,
    finalizeAssistantMessage,
    displayError,
    showLoading,
    hideLoading,
    enableSendButton,
    disableSendButton,
    clearInput
} from './ui.js';
import { initInputHandling } from './inputController.js';
import { getHistory, addMessage } from './state.js';
import { streamAIResponse } from './apiClient.js';
import { renderMarkdown, highlightCodeBlocks } from './markdownRenderer.js';

/**
 * 处理用户发送消息的核心逻辑。
 * 作为回调函数传递给 inputController。
 * @param {Array<object>} contentParts - 从输入控制器提取的内容部分。
 */
async function handleSend(contentParts) {
    console.log("Main: Handling send request...");
    disableSendButton();
    showLoading();

    // 1. Update state and display user message
    try {
        addMessage('user', contentParts);
        displayUserMessage(contentParts);
        clearInput(); // Clear input after grabbing content
    } catch (error) {
        console.error("Error processing user input:", error);
        displayError("处理您的输入时出错: " + error.message);
        hideLoading();
        enableSendButton();
        return; // Stop processing if user input handling fails
    }


    // 2. Prepare for and call API
    const currentHistory = getHistory();
    let assistantBubbleRefs = null;
    let accumulatedContent = ''; // To store the full response text

    try {
        // Create the bubble structure first
        assistantBubbleRefs = createAssistantMessageBubble();
        if (!assistantBubbleRefs) {
            throw new Error("无法创建助手消息气泡。");
        }

        // 3. Stream and render AI response
        for await (const chunk of streamAIResponse(currentHistory)) {
            accumulatedContent += chunk;
            // Render the accumulated content as HTML
            const htmlContent = renderMarkdown(accumulatedContent);
            // Update the content container's innerHTML
            updateAssistantMessageContent(assistantBubbleRefs.contentContainer, htmlContent);
            // Process code blocks within the updated container (highlighting, etc.)
            highlightCodeBlocks(assistantBubbleRefs.contentContainer);
            // Note: Scrolling is handled within updateAssistantMessageContent
        }

        // 4. Finalize after stream ends successfully
        addMessage('assistant', accumulatedContent); // Add complete response to state
        // Finalize UI (enable copy button, etc.)
        finalizeAssistantMessage(assistantBubbleRefs.bubbleElement, assistantBubbleRefs.copyButton, accumulatedContent);

    } catch (error) {
        console.error("Error during AI response fetch/stream:", error);
        // Display error in the chat area
        displayError(error.message || "与 AI 通信时发生未知错误");
        // If a bubble was created before the error, maybe add error styling to it?
        // Or just rely on the separate error bubble.
    } finally {
        // 5. Always re-enable button and hide loading indicator
        hideLoading();
        enableSendButton();
        console.log("Main: Send request processing finished.");
    }
}

/**
 * Application entry point.
 */
function main() {
    console.log("Main: Initializing application...");
    // Initialize UI elements and handlers
    if (!initUI()) {
        // Stop initialization if UI fails
        return;
    }

    // Initialize input handling, passing the handleSend function as the callback
    initInputHandling({ onSend: handleSend });

    console.log("Main: Application initialized.");
}

// Wait for the DOM to be fully loaded before running the main script
document.addEventListener('DOMContentLoaded', main);