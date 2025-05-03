// src/ui.js
import { renderMarkdown, highlightCodeBlocks } from './markdownRenderer.js'; // Import renderer functions

// Module-scoped variables to hold element references
let chatInput = null;
let imagePreviewArea = null;
let previewPlaceholder = null;
let sendButton = null;
let aiResponseArea = null;
let aiResponsePlaceholder = null;
let loadingIndicator = null;
let chatTitleElement = null; // Reference for chat title H2
let sessionListElement = null; // Reference for session list UL
// Edit Modal Elements
let editModalOverlay = null;
let editModalForm = null;
let editModalNameInput = null;
let editModalPromptTextarea = null;
let editModalCancelBtn = null;
// Sidebar Toggle Elements
let sidebarToggleBtn = null;
let appContainer = null;
let sidebarOverlay = null;

/**
 * Attempts to copy text to the clipboard using the deprecated execCommand method.
 * @param {string} text The text to copy.
 * @returns {boolean} True if the copy command was likely successful, false otherwise.
 */
export function copyTextFallback(text) { // Add export keyword
    const textArea = document.createElement('textarea');
    textArea.value = text;

    // Make textarea offscreen.
    textArea.style.position = 'fixed';
    textArea.style.top = '-9999px';
    textArea.style.left = '-9999px';
    // Avoid potential scrolling issues
    textArea.style.opacity = '0';

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    let success = false;
    try {
        // execCommand might throw an error or return false
        success = document.execCommand('copy');
        if (!success) {
            console.warn('Fallback copy command (execCommand) reported failure.');
        }
    } catch (err) {
        console.error('Error using fallback copy command (execCommand):', err);
        success = false;
    }

    document.body.removeChild(textArea);
    return success;
}

/**
 * Initializes the UI module by getting references to DOM elements.
 * Should be called once when the application starts.
 * @returns {boolean} True if initialization was successful, false otherwise.
 */
export function initUI() {
    chatInput = document.getElementById('chat-input');
    imagePreviewArea = document.getElementById('input-image-preview');
    sendButton = document.getElementById('send-button');
    aiResponseArea = document.getElementById('ai-response'); // Ensure aiResponseArea is fetched
    loadingIndicator = document.getElementById('loading');
    chatTitleElement = document.getElementById('chat-title'); // Fetch title element
    sessionListElement = document.getElementById('session-list'); // Fetch session list element

    // Get Edit Modal elements
    editModalOverlay = document.getElementById('edit-modal-overlay');
    editModalForm = document.getElementById('edit-session-form');
    editModalNameInput = document.getElementById('edit-session-name');
    editModalPromptTextarea = document.getElementById('edit-system-prompt');
    editModalCancelBtn = document.getElementById('edit-modal-cancel-btn');

    // Get Sidebar Toggle elements
    sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
    appContainer = document.querySelector('.app-container'); // Main container for class toggle
    sidebarOverlay = document.querySelector('.sidebar-overlay');


    // Check if essential elements exist (including the new ones + modal elements)
    const essentialElements = [
        chatInput, imagePreviewArea, sendButton, aiResponseArea, loadingIndicator,
        chatTitleElement, sessionListElement, editModalOverlay, editModalForm,
        editModalNameInput, editModalPromptTextarea, editModalCancelBtn,
        sidebarToggleBtn, appContainer, sidebarOverlay // Add new elements to check
    ];
    const missingElement = essentialElements.some(el => !el);

    if (missingElement) {
        console.error("Fatal Error: Required UI elements (including modal) not found in the DOM. Check element IDs.");
        alert("应用程序初始化失败：缺少必要的界面元素（包括编辑对话框）。请检查控制台获取详细信息。"); // Simple user feedback
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


    // --- Add Lightbox Trigger Listeners ---
    const handleImageClick = (event) => {
        // Check if the clicked element is an image within the desired areas
        const clickedImage = event.target.closest('img'); // Find nearest img ancestor/self
        if (!clickedImage) return; // Not an image click

        // Check if the image is within the response area or preview area
        const isInResponseArea = aiResponseArea?.contains(clickedImage);
        const isInPreviewArea = imagePreviewArea?.contains(clickedImage); // Corrected variable name

        // Only open lightbox for images in specified areas (e.g., exclude input area images)
        // Also check if the image has a src to avoid issues with potential placeholder images
        if ((isInResponseArea || isInPreviewArea) && clickedImage.src && !clickedImage.closest('.delete-image-btn')) { // Ensure not clicking delete btn wrapper

             // Check if it's the preview image wrapper's image
             const previewItem = clickedImage.closest('.image-preview-item');
             if (isInPreviewArea && !previewItem) return; // Ignore clicks not on preview item images

             // Check if it's a message image
             const messageBubble = clickedImage.closest('.message-bubble');
             if (isInResponseArea && !messageBubble) return; // Ignore clicks not within bubbles

             // Check if it's specifically a message-image class if needed
             // if (isInResponseArea && !clickedImage.classList.contains('message-image')) return;


            event.preventDefault(); // Prevent any default browser behavior for image click
            openLightbox(clickedImage.src);
        }
    };

    if (aiResponseArea) {
        aiResponseArea.addEventListener('click', handleImageClick);
    }
    if (imagePreviewArea) { // Corrected variable name
        imagePreviewArea.addEventListener('click', handleImageClick);
    }
    // ------------------------------------
// --- Sidebar Toggle Logic ---
if (sidebarToggleBtn && appContainer && sidebarOverlay) {
    sidebarToggleBtn.addEventListener('click', () => {
        // console.log('Sidebar toggle button clicked!'); // <-- Removed log
        appContainer.classList.toggle('sidebar-open');
        // console.log('Toggled .sidebar-open class on:', appContainer); // <-- Removed log
    });



        // Close sidebar when clicking overlay
        sidebarOverlay.addEventListener('click', () => {
             // console.log('Sidebar overlay clicked!'); // <-- Removed log
             appContainer.classList.remove('sidebar-open');
             // console.log('Removed .sidebar-open class from:', appContainer); // <-- Removed log
        });
        console.log("Sidebar toggle functionality initialized.");
    } else {
        // This case should now be caught by the essentialElements check
        console.warn("Sidebar toggle elements missing, functionality disabled.");
    }
    // ---------------------------

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
        case 'chatTitle': return chatTitleElement; // Allow getting title element
        default:
            console.warn(`UI Element "${elementName}" not recognized.`);
            return null;
    }
}


// --- Placeholder Logic ---

function isChatInputEmpty() {
    // Ensure chatInput is initialized before accessing its properties
    if (!chatInput) {
        console.log("[isChatInputEmpty] Chat input element not found, returning true.");
        return true;
    }
    const hasImages = chatInput.querySelector('img') !== null;
    const text = chatInput.textContent.trim();
    const isEmpty = text === '' && !hasImages;
    // console.log(`[isChatInputEmpty] Text: "${text}", Has Images: ${hasImages}, Is Empty: ${isEmpty}`); // Verbose logging
    return isEmpty;
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
    // console.log("[UI] updatePreviewPlaceholderVisually called."); // Can be noisy
    if (!imagePreviewArea) {
        // console.warn("[UI] updatePreviewPlaceholderVisually: imagePreviewArea not found.");
        return;
    }
     if (!previewPlaceholder) {
         // console.warn("[UI] updatePreviewPlaceholderVisually: previewPlaceholder not found.");
         // If placeholder doesn't exist, we can't add/remove it, but function can still proceed.
         // This might happen if the placeholder span was missing from index.html initially.
     }

    // Check if preview area contains any element that is NOT the placeholder
    const hasContent = Array.from(imagePreviewArea.children).some(child => child !== previewPlaceholder);
    // console.log(`[UI] updatePreviewPlaceholderVisually: hasContent = ${hasContent}`);

    if (hasContent) {
        // If content exists AND the placeholder is currently a child, remove placeholder
        if (previewPlaceholder && imagePreviewArea.contains(previewPlaceholder)) {
            // console.log("[UI] updatePreviewPlaceholderVisually: Removing placeholder.");
            imagePreviewArea.removeChild(previewPlaceholder);
        }
    } else {
        // If NO content AND the placeholder exists BUT is NOT currently a child, add it back
        if (previewPlaceholder && !imagePreviewArea.contains(previewPlaceholder)) {
            // console.log("[UI] updatePreviewPlaceholderVisually: Adding placeholder back.");
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
     console.log("[UI] hideLoading called."); // Log function call
     if (loadingIndicator) {
         console.log("[UI] Hiding loading indicator element:", loadingIndicator);
         loadingIndicator.style.display = 'none';
     } else {
         console.warn("[UI] hideLoading: loadingIndicator element reference is null.");
     }
}

// --- Button States ---
export function enableSendButton() {
    if (sendButton) {
        sendButton.disabled = false;
        hideLoading(); // Hide loading when button is enabled
    }
}

export function disableSendButton() {
     if (sendButton) {
        sendButton.disabled = true;
        showLoading(); // Show loading when button is disabled
     }
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
    // Ensure listener is only added once
    if (!copyButton.dataset.listenerAdded) {
        copyButton.addEventListener('click', (e) => {
            e.stopPropagation();
            const textToCopy = fullContent; // Use the fullContent passed to the function

            const handleCopySuccess = () => {
                const originalText = copyButton.textContent;
                copyButton.textContent = '已复制!';
                copyButton.disabled = true;
                setTimeout(() => {
                    copyButton.textContent = originalText;
                    copyButton.disabled = false;
                }, 2000);
            };

            const handleCopyFailure = (methodUsed) => {
                 console.error(`Copy failed using ${methodUsed}.`);
                 // Provide more specific feedback
                 if (methodUsed === 'navigator.clipboard' && !window.isSecureContext) {
                     // This case might not be reached if we check isSecureContext first, but good fallback
                     alert('复制失败：此功能需要安全连接 (HTTPS) 或在 localhost 上运行。');
                 } else if (methodUsed === 'document.execCommand') {
                      alert('复制失败！浏览器不支持或禁止了后备复制方法。');
                 } else {
                     alert('复制失败！您的浏览器可能不支持此操作或权限不足。');
                 }
            };

            // --- Main Copy Logic ---
            // Prefer navigator.clipboard in secure contexts
            if (window.isSecureContext && navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(textToCopy).then(() => {
                    handleCopySuccess();
                }).catch(err => {
                    console.error('navigator.clipboard.writeText failed:', err);
                    // Optional: Attempt fallback even if modern API exists but failed?
                    // console.log("Modern copy failed, attempting fallback...");
                    // if (copyTextFallback(textToCopy)) {
                    //     handleCopySuccess();
                    // } else {
                    //     handleCopyFailure('document.execCommand after navigator failure');
                    // }
                    // For now, just report failure if modern API fails in secure context.
                    handleCopyFailure('navigator.clipboard');
                });
            }
            // Else (insecure context or clipboard API not available), try fallback
            else {
                if (copyTextFallback(textToCopy)) {
                    handleCopySuccess();
                } else {
                    handleCopyFailure('document.execCommand');
                }
            }
            // --- End Main Copy Logic ---
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


/**
 * Displays a complete assistant message (e.g., from history).
 * Handles Markdown rendering and code highlighting.
 * @param {string} content - The full Markdown content of the assistant's message.
 */
export function displayAssistantMessage(content) {
    if (!aiResponseArea) return;
    updateAiResponsePlaceholderVisually(); // Ensure placeholder is handled

    const bubbleRefs = createAssistantMessageBubble();
    if (!bubbleRefs) {
        console.error("UI Error: Failed to create assistant message bubble for historical message.");
        return; // Failed to create bubble
    }

    // Render markdown and update content
    const htmlContent = renderMarkdown(content);
    updateAssistantMessageContent(bubbleRefs.contentContainer, htmlContent);

    // Highlight code blocks after content is in the DOM
    // Use try-catch as highlightCodeBlocks might depend on hljs being loaded
    try {
        highlightCodeBlocks(bubbleRefs.contentContainer);
    } catch (e) {
        console.error("Error highlighting code blocks in historical message:", e);
    }


    // Finalize (enable copy button, etc.) - pass raw content for copy
    finalizeAssistantMessage(bubbleRefs.bubbleElement, bubbleRefs.copyButton, content);

    // Ensure scroll after adding historical message
    // scrollChatToBottom(); // updateAssistantMessageContent already scrolls, finalizeAssistantMessage also scrolls
}


// Note: processCodeBlocks (syntax highlighting and code-block copy buttons)
// should be called from the main logic (e.g., main.js) after
// updateAssistantMessageContent, using the markdownRenderer module.
// This ui.js module focuses on creating/updating the bubbles themselves.


// --- Lightbox Functionality ---

/**
 * Handles the Escape key press to close the lightbox.
 * @param {KeyboardEvent} event
 */
function handleLightboxKeydown(event) {
    if (event.key === 'Escape') {
        closeLightbox();
    }
}

/**
 * Opens the lightbox with the specified image URL.
 * @param {string} imageUrl - The URL of the image to display.
 */
export function openLightbox(imageUrl) {
    // Prevent opening multiple lightboxes
    if (document.querySelector('.lightbox-overlay')) {
        return;
    }

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay';
    overlay.addEventListener('click', closeLightbox); // Close on overlay click

    // Create content container
    const content = document.createElement('div');
    content.className = 'lightbox-content';
    // Stop propagation to prevent closing when clicking inside content
    content.addEventListener('click', (e) => e.stopPropagation());

    // Create image
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = '放大预览'; // Alt text for enlarged image

    // Create close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'lightbox-close';
    closeBtn.textContent = '×';
    closeBtn.title = '关闭预览';
    closeBtn.addEventListener('click', closeLightbox); // Close on button click

    // Assemble
    content.appendChild(img);
    content.appendChild(closeBtn);
    overlay.appendChild(content);

    // Add to body
    document.body.appendChild(overlay);

    // Add keyboard listener for Escape key
    document.addEventListener('keydown', handleLightboxKeydown);
}

/**
 * Closes and removes the currently open lightbox from the DOM.
 */
export function closeLightbox() {
    const overlay = document.querySelector('.lightbox-overlay');
    if (overlay) {
        overlay.remove();
        // Remove keyboard listener when lightbox closes
        document.removeEventListener('keydown', handleLightboxKeydown);
    }
}


// --- Sidebar Rendering ---

/**
 * Renders the list of sessions in the sidebar.
 * @param {Array<object>} sessions - Array of session objects from state.js (e.g., [{id, name}, ...]).
 * @param {string|null} activeSessionId - The ID of the currently active session.
 */
export function renderSessionList(sessions, activeSessionId) {
    if (!sessionListElement) {
        console.error("UI Error: Session list element (#session-list) not found or not initialized.");
        return;
    }

    // Clear current list items
    sessionListElement.innerHTML = '';

    if (!sessions || sessions.length === 0) {
        // If no sessions, show placeholder
        const noSessionsLi = document.createElement('li');
        noSessionsLi.className = 'placeholder-text';
        noSessionsLi.textContent = '没有会话。点击下方按钮创建。';
        sessionListElement.appendChild(noSessionsLi);
        return;
    }

    // Add new list items
    sessions.forEach(session => {
        const li = document.createElement('li');
        li.textContent = session.name || `会话 ${session.id.substring(0, 4)}`; // Fallback name
        li.setAttribute('data-session-id', session.id);
        li.title = session.name; // Show full name on hover

        if (session.id === activeSessionId) {
            li.classList.add('active-session');
        }

        // Add controls container (floated right or flex)
        const controls = document.createElement('span');
        controls.className = 'session-controls'; // Style this container

        // Create Edit button (Always add edit button)
        const editButton = document.createElement('button');
        editButton.type = 'button';
        // Use common class + specific class for styling/event handling
        editButton.className = 'session-control-button session-edit-btn';
        editButton.title = '编辑会话';
        editButton.textContent = '✏️';
        editButton.dataset.sessionId = session.id; // Set session ID for the handler
        controls.appendChild(editButton); // Append edit button to controls span

        // Add Delete Button (only if more than one session exists)
        if (sessions.length > 1) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'session-delete-btn'; // Specific class for styling/event handling
            deleteBtn.textContent = '🗑️'; // Trash can emoji
            deleteBtn.title = '删除会话';
            deleteBtn.setAttribute('data-session-id', session.id); // Set ID on button too for easier event handling
            controls.appendChild(deleteBtn);
        }

        // TODO: Add Edit button here later
        // const editBtn = document.createElement('button'); ...

        // Append controls to the list item
        li.appendChild(controls);


        sessionListElement.appendChild(li);
    });
}

/**
 * Clears the main chat display area (aiResponseArea).
 */
export function clearChatArea() {
    if (aiResponseArea) {
        aiResponseArea.innerHTML = ''; // Clear all content
        // Re-add placeholder if it was defined and not already present
        // updateAiResponsePlaceholderVisually handles adding it back if needed
        updateAiResponsePlaceholderVisually();
    } else {
        console.warn("UI: clearChatArea called but aiResponseArea is not initialized.");
    }
}

/**
 * Updates the chat title text.
 * @param {string} title - The new title to display.
 */
export function updateChatTitle(title) {
    if (chatTitleElement) {
        chatTitleElement.textContent = title;
    } else {
        console.warn("UI: updateChatTitle called but chatTitleElement is not initialized.");
    }
}


// --- Edit Session Modal Functions ---

/** Shows the edit session modal */
export function showEditModal() {
    if (editModalOverlay) {
        editModalOverlay.classList.add('visible');
        // Optionally focus the first input
        editModalNameInput?.focus();
    } else {
        console.error("UI Error: Cannot show edit modal, overlay element not found.");
    }
}

/** Hides the edit session modal */
export function hideEditModal() {
     if (editModalOverlay) {
        editModalOverlay.classList.remove('visible');
    } else {
        console.error("UI Error: Cannot hide edit modal, overlay element not found.");
    }
}

/**
 * Sets the initial values for the edit modal inputs.
 * @param {string} name - The current session name.
 * @param {string} prompt - The current system prompt.
 */
export function setEditModalValues(name, prompt) {
    if (editModalNameInput) {
        editModalNameInput.value = name;
    }
    if (editModalPromptTextarea) {
        editModalPromptTextarea.value = prompt;
    }
}

/**
 * Gets the current values from the edit modal inputs.
 * @returns {{name: string, prompt: string}|null} An object with name and prompt, or null if elements not found.
 */
export function getEditModalValues() {
    if (editModalNameInput && editModalPromptTextarea) {
        return {
            name: editModalNameInput.value.trim(), // Trim whitespace from name
            prompt: editModalPromptTextarea.value
        };
    }
    console.error("UI Error: Cannot get modal values, input elements not found.");
    return null;
}

/**
 * Gets references to the modal form and cancel button for attaching/detaching listeners.
 * @returns {{form: HTMLFormElement, cancelBtn: HTMLButtonElement}|null}
 */
export function getEditModalFormElements() {
    if (editModalForm && editModalCancelBtn) {
        return { form: editModalForm, cancelBtn: editModalCancelBtn };
    }
    console.error("UI Error: Cannot get modal form elements.");
    return null;
}