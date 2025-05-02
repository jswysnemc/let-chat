// src/ui.js

// Module-scoped variables to hold element references
let chatInput = null;
let imagePreviewArea = null;
let previewPlaceholder = null;
let sendButton = null;
let aiResponseArea = null;
let aiResponsePlaceholder = null;
let loadingIndicator = null;

/**
 * Initializes the UI module by getting references to DOM elements.
 * Should be called once when the application starts.
 * @returns {boolean} True if initialization was successful, false otherwise.
 */
export function initUI() {
    chatInput = document.getElementById('chat-input');
    imagePreviewArea = document.getElementById('input-image-preview');
    sendButton = document.getElementById('send-button');
    aiResponseArea = document.getElementById('ai-response');
    loadingIndicator = document.getElementById('loading');

    // Check if essential elements exist
    if (!chatInput || !imagePreviewArea || !sendButton || !aiResponseArea || !loadingIndicator) {
        console.error("Fatal Error: Required UI elements not found in the DOM.");
        alert("应用程序初始化失败：缺少必要的界面元素。"); // Simple user feedback
        return false;
    }

    // Get placeholders relative to their containers
    previewPlaceholder = imagePreviewArea.querySelector('.placeholder-text');
    aiResponsePlaceholder = aiResponseArea.querySelector('.placeholder-text');

    if (!previewPlaceholder) {
         console.warn("Warning: Image preview placeholder element not found.");
    }
     if (!aiResponsePlaceholder) {
         console.warn("Warning: AI response placeholder element not found.");
     }

    // Initial setup for placeholders
    updateChatInputPlaceholderVisually();
    updatePreviewPlaceholderVisually();
    updateAiResponsePlaceholderVisually();

    console.log("UI Initialized successfully.");
    return true; // Indicate successful initialization
}

/**
 * Gets a reference to a cached UI element. Use after initUI().
 * @param {string} elementName - Name of the element ('chatInput', 'imagePreviewArea', 'sendButton', 'aiResponseArea', 'loadingIndicator')
 * @returns {HTMLElement|null} The element reference or null if not initialized/found.
 */
export function getElement(elementName) {
    switch (elementName) {
        case 'chatInput': return chatInput;
        case 'imagePreviewArea': return imagePreviewArea;
        case 'sendButton': return sendButton;
        case 'aiResponseArea': return aiResponseArea;
        case 'loadingIndicator': return loadingIndicator;
        default:
            console.warn(`UI Element "${elementName}" not recognized.`);
            return null;
    }
}


// --- Placeholder Logic ---

function isChatInputEmpty() {
    // Ensure chatInput is initialized before accessing its properties
    if (!chatInput) return true;
    const hasImages = chatInput.querySelector('img') !== null;
    const text = chatInput.textContent.trim();
    return text === '' && !hasImages;
}

/**
 * Updates the visual state of the chat input placeholder based on content.
 * This function should be called by event listeners (likely in inputController.js).
 */
export function updateChatInputPlaceholderVisually() {
    if (!chatInput) return;
    if (isChatInputEmpty()) {
        chatInput.classList.add('is-placeholder-showing');
    } else {
        chatInput.classList.remove('is-placeholder-showing');
    }
}

/**
 * Updates the visibility of the image preview placeholder.
 */
export function updatePreviewPlaceholderVisually() {
    if (!imagePreviewArea || !previewPlaceholder) return;
    // Check if preview area contains anything other than the placeholder itself
    const hasContent = Array.from(imagePreviewArea.children).some(child => child !== previewPlaceholder);

    if (hasContent) {
        // If content exists and placeholder is there, remove placeholder
        if (imagePreviewArea.contains(previewPlaceholder)) {
            imagePreviewArea.removeChild(previewPlaceholder);
        }
    } else {
        // If no content and placeholder is missing, add it back
        if (!imagePreviewArea.contains(previewPlaceholder)) {
            imagePreviewArea.appendChild(previewPlaceholder);
        }
    }
}


/**
 * Updates the visibility of the AI response area placeholder.
 */
export function updateAiResponsePlaceholderVisually() {
     if (!aiResponseArea || !aiResponsePlaceholder) return;
     // If aiResponseArea contains any message bubble, remove placeholder
     if (aiResponseArea.querySelector('.message-bubble')) {
          if (aiResponseArea.contains(aiResponsePlaceholder)) {
              aiResponseArea.removeChild(aiResponsePlaceholder);
          }
     } else {
          // If no bubbles and placeholder is missing, add it back
          if (!aiResponseArea.contains(aiResponsePlaceholder)) {
              aiResponseArea.appendChild(aiResponsePlaceholder);
          }
     }
}

// --- Loading Indicator ---
export function showLoading() {
    if (loadingIndicator) loadingIndicator.style.display = 'inline-block';
}

export function hideLoading() {
     if (loadingIndicator) loadingIndicator.style.display = 'none';
}

// --- Button States ---
export function enableSendButton() {
    if (sendButton) sendButton.disabled = false;
}

export function disableSendButton() {
     if (sendButton) sendButton.disabled = true;
}

// --- Input Area ---
export function clearInput() {
    if (chatInput) chatInput.innerHTML = '';
    if (imagePreviewArea) {
        // Remove everything except the placeholder if it exists and is currently a child
        const childrenToRemove = Array.from(imagePreviewArea.children).filter(child => child !== previewPlaceholder);
        childrenToRemove.forEach(child => imagePreviewArea.removeChild(child));

        // Ensure placeholder is visible after clearing (if it exists)
        updatePreviewPlaceholderVisually();
    }
    // Update chat input placeholder state as well
    updateChatInputPlaceholderVisually();
}

// --- Scrolling ---
/**
 * Scrolls the chat area to the bottom, but only if the user is already near the bottom.
 */
export function scrollChatToBottom() {
    if (!aiResponseArea) return;

    const scrollThreshold = 150; // 定义“接近底部”的阈值（像素）
    const currentScroll = aiResponseArea.scrollTop;
    const clientHeight = aiResponseArea.clientHeight;
    const scrollHeight = aiResponseArea.scrollHeight;

    // 在 DOM 更新前检查用户是否接近底部
    // (scrollHeight - clientHeight) 是可滚动的总高度
    // (scrollHeight - clientHeight - currentScroll) 是距离底部的距离
    const isNearBottom = scrollHeight - currentScroll - clientHeight <= scrollThreshold;

    // 使用 setTimeout 将滚动操作推迟到 DOM 更新之后
    setTimeout(() => {
        // 重新获取最新的 scrollHeight，因为内容可能刚刚更新
        const newScrollHeight = aiResponseArea.scrollHeight;
        // 如果用户之前接近底部，或者内容区本身就没有滚动条，则滚动到底部
        if (isNearBottom || newScrollHeight <= clientHeight) {
             aiResponseArea.scrollTop = newScrollHeight;
        }
        // 否则 (isNearBottom 为 false)，不执行任何操作，保持用户当前的滚动位置
    }, 0); // timeout 0 将操作推到事件队列末尾执行
}


// --- Message Display ---

/**
 * Displays a user message in the chat area.
 * @param {Array<object>} contentParts - The content parts (text/image)
 */
export function displayUserMessage(contentParts) {
    if (!aiResponseArea) return;
    updateAiResponsePlaceholderVisually(); // Ensure placeholder is handled if present

    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'message-bubble user-bubble';

    const prefix = document.createElement('strong');
    prefix.textContent = 'You: ';
    bubbleDiv.appendChild(prefix);

    // Create a wrapper for the actual content for better layout control
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'message-content-wrapper'; // Add a class for styling
    bubbleDiv.appendChild(contentWrapper);

    // Add content parts to the wrapper
    contentParts.forEach(part => {
        if (part.type === 'text') {
            // Create a span for text to allow white-space: pre-wrap
            const textSpan = document.createElement('span');
            textSpan.textContent = part.text; // No need for extra space if using gap
            textSpan.style.whiteSpace = 'pre-wrap'; // Ensure line breaks are respected
            contentWrapper.appendChild(textSpan);
        } else if (part.type === 'image_url' && part.image_url?.url) {
            const img = document.createElement('img');
            img.src = part.image_url.url;
            img.alt = '用户发送的图片';
            // Add a class for potential styling
            img.classList.add('message-image');
            contentWrapper.appendChild(img);
        }
    });

    aiResponseArea.appendChild(bubbleDiv);
    scrollChatToBottom();
}

/**
 * Creates and displays the initial structure for an assistant message bubble.
 * Returns references to the bubble and its content container.
 * @returns {{bubbleElement: HTMLElement, contentContainer: HTMLElement, copyButton: HTMLButtonElement}|null} An object containing references, or null on error.
 */
export function createAssistantMessageBubble() {
     if (!aiResponseArea) return null;
     updateAiResponsePlaceholderVisually(); // Ensure placeholder is handled

     const bubbleElement = document.createElement('div');
     bubbleElement.className = 'message-bubble assistant-bubble';

     const prefix = document.createElement('strong');
     prefix.textContent = 'Assistant: ';
     bubbleElement.appendChild(prefix);

     const contentContainer = document.createElement('span');
     contentContainer.className = 'assistant-message-content';
     bubbleElement.appendChild(contentContainer);

     // Create message-level copy button (initially disabled)
     const copyButton = document.createElement('button');
     copyButton.className = 'copy-button message-copy-button'; // Add specific class
     copyButton.textContent = '复制';
     copyButton.title = '复制回答';
     copyButton.disabled = true;
     bubbleElement.appendChild(copyButton);

     aiResponseArea.appendChild(bubbleElement);
     scrollChatToBottom();

     // Return references needed by the caller (main.js)
     return { bubbleElement, contentContainer, copyButton };
}

/**
 * Updates the content of an existing assistant message bubble's content container.
 * (Used during streaming)
 * @param {HTMLElement} contentContainer - The span element returned by createAssistantMessageBubble.
 * @param {string} htmlContent - The HTML content (e.g., from Markdown renderer).
 */
export function updateAssistantMessageContent(contentContainer, htmlContent) {
    if (contentContainer) {
        contentContainer.innerHTML = htmlContent;
        scrollChatToBottom(); // Scroll as content is added
    } else {
        console.warn("UI: updateAssistantMessageContent called with null container.");
    }
}

/**
 * Finalizes an assistant message bubble after streaming is complete.
 * (e.g., enables copy button)
 * @param {HTMLElement} bubbleElement - The main bubble div element.
 * @param {HTMLButtonElement} copyButton - The message-level copy button element.
 * @param {string} fullContent - The final full text content for the copy button.
 */
export function finalizeAssistantMessage(bubbleElement, copyButton, fullContent) {
    if (!bubbleElement || !copyButton) return;

    // Enable the message-level copy button and add its listener
    copyButton.disabled = false;
    // Ensure listener is only added once (though re-adding might be harmless)
    if (!copyButton.dataset.listenerAdded) {
        copyButton.addEventListener('click', (e) => {
            e.stopPropagation();
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(fullContent).then(() => {
                    const originalText = copyButton.textContent;
                    copyButton.textContent = '已复制!';
                    copyButton.disabled = true;
                    setTimeout(() => {
                        copyButton.textContent = originalText;
                        copyButton.disabled = false;
                    }, 2000);
                }).catch(err => {
                    console.error('无法复制代码到剪贴板: ', err);
                    alert('复制失败!');
                });
            } else {
                console.warn('Clipboard API 不可用。');
                alert('您的浏览器不支持自动复制功能。');
            }
        });
        copyButton.dataset.listenerAdded = 'true'; // Mark listener as added
    }


    // Ensure final scroll after all content and processing
    scrollChatToBottom();
}


/**
 * Displays an error message in the chat area using a styled bubble.
 * @param {string} errorMessage - The error message content.
 */
export function displayError(errorMessage) {
    if (!aiResponseArea) return;
    updateAiResponsePlaceholderVisually(); // Ensure placeholder is handled

    const bubbleDiv = document.createElement('div');
    // Use assistant bubble style but add an error class for specific styling
    bubbleDiv.className = 'message-bubble assistant-bubble error-message';

    const prefix = document.createElement('strong');
    prefix.textContent = 'Error: ';
    // Basic error styling (can be moved to CSS)
    prefix.style.color = 'red';
    bubbleDiv.appendChild(prefix);

    const errorTextNode = document.createTextNode(errorMessage);
    bubbleDiv.appendChild(errorTextNode);

    aiResponseArea.appendChild(bubbleDiv);
    scrollChatToBottom();
}

// Note: processCodeBlocks (syntax highlighting and code-block copy buttons)
// should be called from the main logic (e.g., main.js) after
// updateAssistantMessageContent, using the markdownRenderer module.
// This ui.js module focuses on creating/updating the bubbles themselves.