// src/inputController.js
import { getElement, updateChatInputPlaceholderVisually, updatePreviewPlaceholderVisually } from './ui.js';

// --- Module-scoped variables ---
let chatInputElement = null;
let imagePreviewAreaElement = null;
let sendButtonElement = null;
let onSendCallback = null;
let uploadImageButtonElement = null; // Reference for upload button
let imageUploadInputElement = null; // Reference for hidden file input

// --- Helper Functions (Moved from index.html) ---

/**
 * 从 contenteditable div 中提取文本和图片数据
 * @param {Element} element contenteditable div 元素
 * @returns {Array<object>} 内容部分数组（文本或图片对象）
 */
function extractContentFromInput(element) {
    if (!element) return [];
    const parts = [];
    const nodes = element.childNodes;

    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent;
            if (text) {
                if (parts.length > 0 && parts[parts.length - 1].type === 'text') {
                    parts[parts.length - 1].text += text;
                } else {
                    parts.push({ type: 'text', text: text });
                }
            }
        } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'IMG') {
            const base64Data = node.getAttribute('data-base64');
            const mimeType = node.getAttribute('data-mime-type');
            if (base64Data && mimeType) {
                const dataUrl = `data:${mimeType};base64,${base64Data}`;
                parts.push({
                    type: 'image_url',
                    image_url: { url: dataUrl }
                });
            }
        } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'DIV') {
            // Simple handling for DIVs (e.g., from pasting formatted text)
            const text = node.textContent;
            if (text) {
                if (parts.length > 0 && parts[parts.length - 1].type === 'text') {
                    parts[parts.length - 1].text += text;
                } else {
                    parts.push({ type: 'text', text: text });
                }
            }
        } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'BR') {
            // Handle line breaks
            if (parts.length > 0 && parts[parts.length - 1].type === 'text') {
                 if (!parts[parts.length - 1].text.endsWith('\n')) { // Avoid double line breaks if BR is last
                    parts[parts.length - 1].text += '\n';
                 }
            } else {
                parts.push({ type: 'text', text: '\n' });
            }
        }
        // Ignore other node types for simplicity
    }
    // Trim whitespace and filter empty text parts
    return parts.map(part => {
        if (part.type === 'text') {
            part.text = part.text.replace(/\n{3,}/g, '\n\n').trim(); // Keep max double newlines
        }
        return part;
    }).filter(part => part.type !== 'text' || part.text.length > 0);
}

/**
 * 在 contenteditable 的当前光标位置插入节点的辅助函数
 * @param {Node} node 要插入的节点
 * @param {HTMLElement} targetElement 目标 contenteditable 元素
 */
function insertNodeAtCursor(node, targetElement) {
    if (!targetElement) return;
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) {
        // 如果没有选区，直接追加到末尾
        targetElement.appendChild(node);
        return;
    }
    const range = selection.getRangeAt(0);

    // 检查光标/选区是否在目标元素内部
    let container = range.commonAncestorContainer;
    let isInside = false;
    while (container) {
        if (container === targetElement) {
            isInside = true;
            break;
        }
        container = container.parentNode;
    }

    if (!isInside) {
        // 如果光标不在目标元素内部，追加到末尾并将光标移到其后
        targetElement.appendChild(node);
        range.selectNodeContents(targetElement);
        range.collapse(false); // Collapse to the end
        selection.removeAllRanges();
        selection.addRange(range);
        return;
    }

    // 光标在内部，正常插入
    range.deleteContents(); // 删除选中的内容（如有）
    range.insertNode(node);

    // 将光标移动到插入的节点之后
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
}


/**
 * 将图像添加到 contenteditable 输入和预览区域。
 * 包括添加唯一 ID 和预览区域中的删除按钮。
 * @param {string} dataUrl - 图像的 Data URL。
 * @param {string} mimeType - 图像的 MIME 类型。
 * @param {string} base64Data - 图像的 base64 编码数据。
 */
function _addImageToInputAndPreview(dataUrl, mimeType, base64Data) {
    const imageId = `pasted-img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`; // Unique ID

    // 为 contenteditable 输入创建图像
    if (chatInputElement) {
        const imgInInput = document.createElement('img');
        imgInInput.src = dataUrl;
        imgInInput.alt = '用户图片'; // 更通用的 alt 文本
        imgInInput.setAttribute('data-base64', base64Data);
        imgInInput.setAttribute('data-mime-type', mimeType);
        imgInInput.setAttribute('data-image-id', imageId); // 添加唯一 ID
        insertNodeAtCursor(imgInInput, chatInputElement); // 使用辅助函数插入
    }


    // 为预览区域创建图像和删除按钮
    if (imagePreviewAreaElement) {
        const previewWrapper = document.createElement('div');
        previewWrapper.className = 'image-preview-item';
        previewWrapper.setAttribute('data-image-id', imageId); // ID 在包装器上

        const imgInPreview = document.createElement('img');
        imgInPreview.src = dataUrl;
        imgInPreview.alt = '图片预览';

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-image-btn';
        deleteBtn.textContent = '×'; // 使用 '×' 符号表示删除
        deleteBtn.title = '移除图片';
        deleteBtn.setAttribute('data-target-id', imageId); // 将按钮链接到 ID

        previewWrapper.appendChild(imgInPreview);
        previewWrapper.appendChild(deleteBtn);
        imagePreviewAreaElement.appendChild(previewWrapper);
    }

    // 通过 ui 模块更新占位符
    updatePreviewPlaceholderVisually();
    updateChatInputPlaceholderVisually();
}


// --- Event Handlers ---

function handlePaste(event) {
    const items = (event.clipboardData || window.clipboardData).items;
    let foundImage = false;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            foundImage = true;
            event.preventDefault(); // Prevent default image paste
            const blob = items[i].getAsFile();
            if (blob) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const dataUrl = e.target.result;
                    const mimeType = dataUrl.substring(dataUrl.indexOf(":") + 1, dataUrl.indexOf(";"));
                    const base64Data = dataUrl.substring(dataUrl.indexOf(",") + 1);
                    // 调用重构后的函数来处理图像添加
                    _addImageToInputAndPreview(dataUrl, mimeType, base64Data);
                };
                reader.readAsDataURL(blob);
            }
        }
    }
    // Allow default paste for text
    // Input event listener will handle placeholder update for text paste
}

function handleFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
        if (file) { // Only alert if a file was selected but wasn't an image
             alert('请选择一个图片文件。');
        }
        // Reset file input value in case user selected non-image then cancels next time
        event.target.value = null;
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const dataUrl = e.target.result;
        // Extract mimeType and base64Data (could be helper function)
        const mimeType = dataUrl.substring(dataUrl.indexOf(":") + 1, dataUrl.indexOf(";"));
        const base64Data = dataUrl.substring(dataUrl.indexOf(",") + 1);
        // Use the refactored function to add the image
        _addImageToInputAndPreview(dataUrl, mimeType, base64Data);
    };
    reader.onerror = (e) => {
        console.error("FileReader error:", e);
        alert("读取文件时出错。");
    };
    reader.readAsDataURL(file);

    // Reset file input value to allow uploading the same file again
    event.target.value = null;
}


function handleFocus() {
    if (chatInputElement) {
        chatInputElement.classList.remove('is-placeholder-showing');
    }
}

function handleBlur() {
    // Update placeholder state visually via ui module
    updateChatInputPlaceholderVisually();
}

function handleInput() {
    // Update placeholder state visually via ui module
    updateChatInputPlaceholderVisually();
}

function handleSendTrigger() {
    if (!chatInputElement || !onSendCallback) return;

    const contentParts = extractContentFromInput(chatInputElement);

    if (contentParts.length === 0) {
        alert('请输入要发送的内容或粘贴图片！');
        return;
    }

    // Call the provided onSend callback with the extracted content
    // The callback (in main.js) will handle UI updates (loading, disable button),
    // state updates, API calls, etc.
    onSendCallback(contentParts);
}

function handleKeyDown(event) {
    if (event.key === 'Enter' && event.shiftKey) {
        event.preventDefault(); // Prevent default newline
        // Check if send button is enabled before triggering send
        if (sendButtonElement && !sendButtonElement.disabled) {
            handleSendTrigger();
        }
    }
}

// --- Delete Image Handler ---
function handleDeleteImage(event) {
    if (!event.target.classList.contains('delete-image-btn')) {
        return; // Click was not on a delete button
    }

    const button = event.target;
    const imageId = button.getAttribute('data-target-id');
    if (!imageId) return;

    // Remove from preview area
    const previewItem = imagePreviewAreaElement?.querySelector(`.image-preview-item[data-image-id="${imageId}"]`);
    if (previewItem) {
        previewItem.remove();
    }

    // Remove from input area
    const inputImage = chatInputElement?.querySelector(`img[data-image-id="${imageId}"]`);
    if (inputImage) {
        inputImage.remove();
    }

    // Update placeholders
    updatePreviewPlaceholderVisually();
    updateChatInputPlaceholderVisually();
}


// --- Initialization ---

/**
 * Initializes input handling logic and attaches event listeners.
 * @param {object} options - Configuration options.
 * @param {function(Array<object>)} options.onSend - Callback function to execute when the user sends a message. It receives the extracted content parts.
 */
export function initInputHandling({ onSend }) {
    // Get element references using the ui module
    chatInputElement = getElement('chatInput');
    imagePreviewAreaElement = getElement('imagePreviewArea');
    sendButtonElement = getElement('sendButton');
    // Get references to the new elements by ID
    uploadImageButtonElement = document.getElementById('upload-image-button');
    imageUploadInputElement = document.getElementById('image-upload-input');


    if (!chatInputElement || !sendButtonElement || !uploadImageButtonElement || !imageUploadInputElement) {
        console.error("InputController Error: Required input elements (chat, send, upload button, file input) not found.");
        // Optionally disable upload button if input element is missing
        if (uploadImageButtonElement && !imageUploadInputElement) {
             uploadImageButtonElement.disabled = true;
             uploadImageButtonElement.title = "文件上传功能不可用";
        }
        return; // Stop initialization if critical elements are missing
    }
     if (!imagePreviewAreaElement) {
         console.warn("InputController Warning: Image preview area element not found via ui.getElement(). Paste preview might not work.");
     }

    if (typeof onSend !== 'function') {
        console.error("InputController Error: 'onSend' callback function is required.");
        return;
    }
    onSendCallback = onSend;

    // Attach event listeners
    chatInputElement.addEventListener('paste', handlePaste);
    chatInputElement.addEventListener('focus', handleFocus);
    chatInputElement.addEventListener('blur', handleBlur);
    chatInputElement.addEventListener('input', handleInput);
    chatInputElement.addEventListener('keydown', handleKeyDown);
    sendButtonElement.addEventListener('click', handleSendTrigger);

// Add listener for clicking the preview area itself to trigger upload
    if (imagePreviewAreaElement) {
        imagePreviewAreaElement.addEventListener('click', (event) => {
            // IMPORTANT: Only trigger upload if the click is on the area itself,
            // not on an existing image preview or its delete button.
            if (event.target.closest('.image-preview-item') || event.target.closest('.delete-image-btn')) {
                 // Click was on an existing preview item or delete button, do nothing for upload trigger.
                 // The handleDeleteImage listener below will handle delete clicks.
                return;
            }

            // Ensure the hidden input element is available before trying to click it
            if (imageUploadInputElement) {
                console.log("Image preview area background clicked, triggering file input.");
                imageUploadInputElement.click(); // Trigger the hidden file input
            } else {
                console.error("Cannot trigger upload: Hidden file input element (#image-upload-input) not found or not initialized.");
                alert("图片上传功能当前不可用。"); // Provide feedback to the user
            }
        });
    }
    // Add delegated listener for delete buttons in the preview area
    if (imagePreviewAreaElement) {
        imagePreviewAreaElement.addEventListener('click', handleDeleteImage);
    }

    // Add listener for the upload button
    uploadImageButtonElement.addEventListener('click', () => {
        imageUploadInputElement.click(); // Trigger hidden file input
    });

    // Add listener for the hidden file input
    imageUploadInputElement.addEventListener('change', handleFileUpload);


    console.log("Input Controller Initialized.");
}