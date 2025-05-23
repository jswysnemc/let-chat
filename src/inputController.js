// src/inputController.js
import { getElement } from './ui/domElements.js'; // Import getElement from its new location
import { updateChatInputPlaceholderVisually, updatePreviewPlaceholderVisually } from './ui/placeholderManager.js'; // Import placeholder functions from their new location
import { getApiConfig, loadProviders, setActiveProvider, saveProviders } from './config.js'; // 导入配置模块

// --- Module-scoped variables ---
let chatInputElement = null;
let imagePreviewAreaElement = null;
let sendButtonElement = null;
let onSendCallback = null;
let uploadImageButtonElement = null; // 新的上传图片按钮
let switchModelButtonElement = null; // 新的模型切换按钮
let imageUploadInputElement = null; // Reference for hidden file input

// --- Helper Functions (Moved from index.html) ---

/**
 * 从 contenteditable div 中提取文本和图片数据
 * @param {Element} element contenteditable div 元素
 * @returns {Array<object>} 内容部分数组（文本或图片对象）
 */
function extractContentFromInput(element) {
    if (!element) return [];
    
    console.log("[extractContent] 开始提取内容，元素：", element);
    
    const parts = [];
    let hasText = false;
    
    // 首先收集所有文本，跳过删除按钮
    let textContent = '';
    
    // 函数用于递归提取文本，同时排除删除按钮和图片包装器的文本
    function extractTextFromNode(node) {
        if (!node) return;
        
        // Priority 1: Skip the entire delete button and its descendants
        if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('delete-image-btn')) {
            console.log("[extractContent] 跳过 .delete-image-btn 元素及其所有子内容");
            return;
        }
        // Priority 2: If the node itself has data-ignore-content, skip it and its descendants (more generic)
        if (node.nodeType === Node.ELEMENT_NODE && node.dataset.ignoreContent === 'true') {
            console.log("[extractContent] 跳过 data-ignore-content='true' 元素及其所有子内容");
            return;
        }
        // Priority 3: Skip any node whose closest ancestor is a delete button (covers text nodes inside it)
        if (node.parentNode && typeof node.parentNode.closest === 'function' && node.parentNode.closest('.delete-image-btn')) {
            console.log("[extractContent] 跳过 .delete-image-btn 的子孙节点");
            return;
        }
        
        if (node.nodeType === Node.ELEMENT_NODE && 
            (node.tagName === 'IMG' || 
             node.classList.contains('input-image-wrapper'))) {
            console.log("[extractContent] 跳过图片或图片包装器元素");
            return;
        }
        
        if (node.nodeType === Node.TEXT_NODE) {
            // The checks above should prevent text from delete buttons from reaching here.
            // We can be extra cautious, but it might be redundant.
            // if (node.parentNode && typeof node.parentNode.closest === 'function' && node.parentNode.closest('.delete-image-btn')) {
            //     console.log("[extractContent] (Redundant Check) 跳过删除按钮内的文本节点");
            //     return;
            // }
            textContent += node.textContent; // Collect all text, trim later
            return;
        }
        
        if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'BR') {
            textContent += '\n';
            return;
        }
        
        if (node.childNodes && node.childNodes.length > 0) {
            node.childNodes.forEach(childNode => {
                extractTextFromNode(childNode);
            });
        }
    }
    
    extractTextFromNode(element);
    
    // Refined trimming: compress multiple spaces/newlines, then trim ends.
    if (textContent) {
        textContent = textContent.replace(/\s+/g, ' ').replace(/\n\s*\n/g, '\n\n').trim();
    }
    
    // 如果有有效文本，添加为第一个部分
    if (textContent) {
        parts.push({ type: 'text', text: textContent });
        hasText = true;
        console.log("[extractContent] 提取到文本内容:", textContent);
    }
    
    // 然后处理图片元素
    const images = element.querySelectorAll('img');
    if (images.length > 0) {
        console.log("[extractContent] 找到图片元素数量：", images.length);
        
        images.forEach(img => {
            const base64Data = img.getAttribute('data-base64');
            const mimeType = img.getAttribute('data-mime-type');
            
            if (base64Data && mimeType) {
                console.log("[extractContent] 处理图片数据，MIME类型：", mimeType);
                const dataUrl = `data:${mimeType};base64,${base64Data}`;
                parts.push({
                    type: 'image_url',
                    image_url: { url: dataUrl }
                });
            } else {
                console.warn("[extractContent] 图片元素缺少必要属性：", img);
            }
        });
    }
    
    console.log("[extractContent] 提取完成，内容部分：", hasText ? '有文本' : '无文本', images.length > 0 ? '有图片' : '无图片');
    return parts;
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
    console.log("[InputController] _addImageToInputAndPreview called. Image ID prefix:", `pasted-img-${Date.now()}`);
    const imageId = `pasted-img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`; // Unique ID

    // 为 contenteditable 输入创建图像包装器和图像
    if (chatInputElement) {
        // 创建包装器以便定位删除按钮
        const inputImageWrapper = document.createElement('span');
        inputImageWrapper.className = 'input-image-wrapper';
        inputImageWrapper.setAttribute('data-image-id', imageId);
        
        // 创建图像元素
        const imgInInput = document.createElement('img');
        imgInInput.src = dataUrl;
        imgInInput.alt = '用户图片';
        imgInInput.setAttribute('data-base64', base64Data);
        imgInInput.setAttribute('data-mime-type', mimeType);
        imgInInput.setAttribute('data-image-id', imageId);
        
        // 创建删除按钮
        const deleteInputBtn = document.createElement('button');
        deleteInputBtn.className = 'delete-image-btn';
        deleteInputBtn.textContent = '×';
        deleteInputBtn.title = '移除图片';
        deleteInputBtn.setAttribute('data-target-id', imageId);
        deleteInputBtn.setAttribute('type', 'button'); // 明确设置为button类型
        deleteInputBtn.setAttribute('tabindex', '-1'); // 移除Tab顺序
        deleteInputBtn.setAttribute('aria-hidden', 'true'); // 对屏幕阅读器隐藏
        deleteInputBtn.setAttribute('data-ignore-content', 'true'); // 自定义属性标记忽略内容
        
        // 组装并插入到文档
        inputImageWrapper.appendChild(imgInInput);
        inputImageWrapper.appendChild(deleteInputBtn);
        insertNodeAtCursor(inputImageWrapper, chatInputElement);
        
        // 为图片添加点击事件，触发预览
        imgInInput.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // 导入并使用 previewImage 函数（假设已正确导入）
            import('./ui/lightbox.js').then(module => {
                module.previewImage(dataUrl);
            }).catch(err => {
                console.error('无法加载预览功能:', err);
            });
        });
        
        // 为删除按钮添加点击事件
        deleteInputBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            handleDeleteImage(e);
        });
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
        deleteBtn.setAttribute('type', 'button'); // 明确设置为button类型
        deleteBtn.setAttribute('tabindex', '-1'); // 移除Tab顺序
        deleteBtn.setAttribute('aria-hidden', 'true'); // 对屏幕阅读器隐藏
        deleteBtn.setAttribute('data-ignore-content', 'true'); // 自定义属性标记忽略内容

        previewWrapper.appendChild(imgInPreview);
        previewWrapper.appendChild(deleteBtn);
        imagePreviewAreaElement.appendChild(previewWrapper);
        console.log("[InputController] Preview wrapper appended to imagePreviewAreaElement:", previewWrapper);
        
        // 为预览图片添加点击事件，触发预览
        imgInPreview.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // 导入并使用 previewImage 函数
            import('./ui/lightbox.js').then(module => {
                module.previewImage(dataUrl);
            }).catch(err => {
                console.error('无法加载预览功能:', err);
            });
        });
        
        // 为删除按钮添加点击事件
        deleteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            handleDeleteImage(e);
        });
    } else {
         console.warn("[InputController] imagePreviewAreaElement not found, cannot add preview image.");
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
            console.log("[InputController] Image detected in paste. Blob:", blob);
            if (blob) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    console.log("[InputController] FileReader onload triggered for pasted image.");
                    const dataUrl = e.target.result;
                    const mimeType = dataUrl.substring(dataUrl.indexOf(":") + 1, dataUrl.indexOf(";"));
                    const base64Data = dataUrl.substring(dataUrl.indexOf(",") + 1);
                    // 调用重构后的函数来处理图像添加
                    _addImageToInputAndPreview(dataUrl, mimeType, base64Data);
                };
                 reader.onerror = (e) => { // Add specific error handling for paste reader
                     console.error("[InputController] FileReader error on paste:", e);
                     showNotification("读取粘贴的图片数据时出错", 'error');
                 };
                console.log("[InputController] Calling reader.readAsDataURL for pasted blob.");
                reader.readAsDataURL(blob);
            } else {
                 console.warn("[InputController] Could not get blob from pasted image item.");
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
             showNotification('请选择一个图片文件', 'warning');
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
        showNotification("读取文件时出错", 'error');
    };
    reader.readAsDataURL(file);

    // Reset file input value to allow uploading the same file again
    event.target.value = null;
}


function handleFocus(event) {
    console.log("[InputController] handleFocus triggered.");
    // Let's NOT manipulate class directly here. Rely on input/blur events.
    // The CSS :focus state can handle visual changes if needed,
    // but the placeholder visibility should depend on content.
    // if (chatInputElement) {
    //     chatInputElement.classList.remove('is-placeholder-showing');
    // }
}

function handleBlur(event) {
    console.log("[InputController] handleBlur triggered. Updating placeholder.");
    // Update placeholder state visually via ui module
    updateChatInputPlaceholderVisually();
}

function handleInput(event) {
    console.log("[InputController] handleInput triggered. Updating placeholder.");
    // Update placeholder state visually via ui module
    updateChatInputPlaceholderVisually();
}

function handleSendTrigger() {
    console.log("[InputController] handleSendTrigger called.");
    if (!chatInputElement) {
        console.error("[InputController] Send trigger failed: chatInputElement is null.");
        return;
    }
    if (!onSendCallback) {
        console.error("[InputController] Send trigger failed: onSendCallback is null.");
        return;
    }

    console.log("[InputController] Extracting content...");
    // 首先检查是否存在图片
    const hasImages = chatInputElement.querySelectorAll('img').length > 0;
    if (hasImages) {
        console.log(`[InputController] 检测到${chatInputElement.querySelectorAll('img').length}张图片，准备提取`);
    }
    
    const contentParts = extractContentFromInput(chatInputElement);
    console.log("[InputController] Extracted contentParts:", JSON.stringify(contentParts));
    
    // 检查提取结果
    const textParts = contentParts.filter(p => p.type === 'text');
    const imageParts = contentParts.filter(p => p.type === 'image_url');
    console.log(`[InputController] 提取结果：${textParts.length}个文本部分，${imageParts.length}个图片部分`);
    
    // 如果有图片但提取失败，尝试进行更直接的提取
    if (hasImages && imageParts.length === 0) {
        console.warn("[InputController] 检测到图片但未能提取，尝试直接提取");
        const images = chatInputElement.querySelectorAll('img');
        images.forEach(img => {
            const base64Data = img.getAttribute('data-base64');
            const mimeType = img.getAttribute('data-mime-type');
            if (base64Data && mimeType) {
                const dataUrl = `data:${mimeType};base64,${base64Data}`;
                contentParts.push({
                    type: 'image_url',
                    image_url: { url: dataUrl }
                });
                console.log(`[InputController] 直接提取到图片：${mimeType.substring(0, 15)}...`);
            }
        });
    }

    if (contentParts.length === 0) {
        console.log("[InputController] No content extracted, showing notification.");
        showNotification('请输入要发送的内容或粘贴图片', 'warning');
        return;
    }

    console.log("[InputController] Content found, calling onSendCallback with content parts:", contentParts);
    // Call the provided onSend callback with the extracted content
    // The callback (in main.js) will handle UI updates (loading, disable button),
    // state updates, API calls, etc.
    try {
        onSendCallback(contentParts);
        console.log("[InputController] onSendCallback completed.");
    } catch (e) {
        console.error("[InputController] Error during onSendCallback execution:", e);
        showNotification('发送消息时发生错误，请重试', 'error');
        // Attempt to re-enable button etc. if callback failed badly? Or rely on main.js finally block.
    }
}

function handleKeyDown(event) {
    if (event.key === 'Enter') {
        if (event.shiftKey) {
            // Shift + Enter: 插入换行符 (contenteditable div 的默认行为)
            // 我们不需要 event.preventDefault()，允许默认的换行行为
            // 但如果需要更精确的控制，比如确保在光标处插入换行，可以如下操作：
            // document.execCommand('insertHTML', false, '<br><br>'); // 插入一个可见的换行，或者 <br> 取决于需要
            // event.preventDefault();
            return; // 允许默认的换行
        } else {
            // Enter: 发送消息
            event.preventDefault(); // 阻止默认的 Enter 行为（可能是在某些浏览器中换行）
            if (sendButtonElement && !sendButtonElement.disabled) {
                handleSendTrigger();
            }
        }
    }
}

// --- Delete Image Handler ---
function handleDeleteImage(event) {
    console.log("[InputController] handleDeleteImage called", event);
    
    // 获取按钮元素
    let button;
    if (event.target) {
        // 如果是事件触发，从事件目标获取按钮
        if (event.target.classList.contains('delete-image-btn')) {
            button = event.target;
        } else {
            console.warn("[InputController] handleDeleteImage: event target is not a delete button");
            return;
        }
    } else if (event.currentTarget && event.currentTarget.classList.contains('delete-image-btn')) {
        // 如果通过addEventListener传递的事件
        button = event.currentTarget;
    } else {
        console.error("[InputController] handleDeleteImage: No valid button found");
        return;
    }
    
    // 获取图片ID
    const imageId = button.getAttribute('data-target-id');
    if (!imageId) {
        console.error("[InputController] handleDeleteImage: No image ID found");
        return;
    }
    
    console.log("[InputController] 删除图片：", imageId);

    // 防止事件冒泡，避免触发其他点击事件
    if (event.preventDefault) event.preventDefault();
    if (event.stopPropagation) event.stopPropagation();

    // Remove from preview area
    const previewItem = imagePreviewAreaElement?.querySelector(`.image-preview-item[data-image-id="${imageId}"]`);
    if (previewItem) {
        console.log("[InputController] 从预览区域移除图片");
        previewItem.remove();
    } else {
        console.warn("[InputController] 预览区域未找到图片项：", imageId);
    }

    // Remove from input area - 同时支持直接图片和带包装器的图片
    // 先查找新的包装器结构
    const inputWrapper = chatInputElement?.querySelector(`.input-image-wrapper[data-image-id="${imageId}"]`);
    if (inputWrapper) {
        console.log("[InputController] 从输入区域移除图片包装器");
        inputWrapper.remove();
    } else {
        // 向后兼容：查找直接的图片元素
        const inputImage = chatInputElement?.querySelector(`img[data-image-id="${imageId}"]`);
        if (inputImage) {
            console.log("[InputController] 从输入区域移除直接图片");
            inputImage.remove();
        } else {
            console.warn("[InputController] 输入区域未找到图片：", imageId);
        }
    }

    // Update placeholders
    updatePreviewPlaceholderVisually();
    updateChatInputPlaceholderVisually();
}

// --- 模型切换处理器 ---
function handleModelSwitch() {
    console.log("[InputController] Model switch button clicked");
    
    let closeMenuListenerAttached = false; // Ensure this is declared at the top of the function scope

    const { providers, activeProviderId } = loadProviders();
    const currentProvider = providers.find(p => p.id === activeProviderId);
    
    if (!currentProvider || !currentProvider.models || currentProvider.models.length === 0) { 
        showNotification('当前服务商没有可用的模型', 'warning');
        return;
    }
    
    const modelsMenu = document.createElement('div');
    modelsMenu.className = 'models-quick-menu';
    modelsMenu.style.position = 'absolute';
    modelsMenu.style.bottom = '50px'; // Adjust if necessary based on input area height
    modelsMenu.style.left = '10px'; // Adjust if necessary
    modelsMenu.style.backgroundColor = 'white';
    modelsMenu.style.border = '1px solid #ddd';
    modelsMenu.style.borderRadius = '8px';
    modelsMenu.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
    modelsMenu.style.padding = '8px';
    modelsMenu.style.zIndex = '1000'; // Ensure it's above other elements
    modelsMenu.style.maxHeight = '300px';
    modelsMenu.style.overflowY = 'auto';
    modelsMenu.style.width = '220px'; // Slightly wider to accommodate gear icon
    
    const menuTitleDiv = document.createElement('div');
    menuTitleDiv.style.fontWeight = 'bold';
    menuTitleDiv.style.borderBottom = '1px solid #eee';
    menuTitleDiv.style.paddingBottom = '5px';
    menuTitleDiv.style.marginBottom = '5px';
    menuTitleDiv.style.display = 'flex';
    menuTitleDiv.style.justifyContent = 'space-between';
    menuTitleDiv.style.alignItems = 'center';
    menuTitleDiv.style.paddingRight = '30px'; // 为右上角的关闭按钮留出空间

    const menuTitleText = document.createElement('span');
    menuTitleText.textContent = '选择模型';
    menuTitleDiv.appendChild(menuTitleText);

    const closeMenuOnOutsideClick = (e) => {
        if (modelsMenu && modelsMenu.parentNode === document.body) { 
            if (!modelsMenu.contains(e.target) && e.target !== switchModelButtonElement) { 
                document.body.removeChild(modelsMenu);
                if (closeMenuListenerAttached) {
                    document.removeEventListener('click', closeMenuOnOutsideClick);
                    closeMenuListenerAttached = false;
                }
            }
        } else if (closeMenuListenerAttached) { 
            document.removeEventListener('click', closeMenuOnOutsideClick);
            closeMenuListenerAttached = false;
        }
    };

    const settingsGearBtn = document.createElement('button');
    settingsGearBtn.innerHTML = '<i class="fas fa-cog"></i>';
    settingsGearBtn.title = '服务商设置';
    settingsGearBtn.style.background = 'none';
    settingsGearBtn.style.border = 'none';
    settingsGearBtn.style.color = '#6c757d';
    settingsGearBtn.style.cursor = 'pointer';
    settingsGearBtn.style.fontSize = '1.1em';
    settingsGearBtn.style.padding = '5px 8px'; 
    settingsGearBtn.style.borderRadius = '4px';
    settingsGearBtn.style.lineHeight = '1';
    settingsGearBtn.style.display = 'inline-flex'; 
    settingsGearBtn.style.alignItems = 'center';
    settingsGearBtn.style.justifyContent = 'center';
    settingsGearBtn.addEventListener('mouseover', () => { settingsGearBtn.style.color = '#0d6efd'; settingsGearBtn.style.backgroundColor = 'rgba(0,0,0,0.05)'; });
    settingsGearBtn.addEventListener('mouseout', () => { settingsGearBtn.style.color = '#6c757d'; settingsGearBtn.style.backgroundColor = 'transparent'; });
    settingsGearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (modelsMenu.parentNode === document.body) {
            document.body.removeChild(modelsMenu);
        }
        if (closeMenuListenerAttached) { 
            document.removeEventListener('click', closeMenuOnOutsideClick);
            closeMenuListenerAttached = false;
        }
        try {
            document.dispatchEvent(new CustomEvent('openSettingsModalRequest'));
        } catch (err) {
            console.error("Error dispatching openSettingsModalRequest event:", err);
            showNotification('无法打开设置，请从侧边栏操作', 'warning');
        }
    });
    menuTitleDiv.appendChild(settingsGearBtn);
    modelsMenu.appendChild(menuTitleDiv);
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.title = '关闭菜单';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '6px'; /* 微调以适应menu的padding和title的border */
    closeBtn.style.right = '6px';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.fontSize = '22px'; /* 也可以调整大小 */
    closeBtn.style.color = '#888';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.padding = '2px 6px'; /* 微调 padding */
    closeBtn.style.lineHeight = '1'; 
    closeBtn.style.borderRadius = '4px';
    closeBtn.style.zIndex = '1001'; //确保在标题内容之上（如果标题内容意外溢出）
    closeBtn.addEventListener('mouseover', () => { closeBtn.style.color = '#333'; closeBtn.style.backgroundColor = 'rgba(0,0,0,0.05)'; });
    closeBtn.addEventListener('mouseout', () => { closeBtn.style.color = '#888'; closeBtn.style.backgroundColor = 'transparent'; });
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (modelsMenu.parentNode === document.body) {
            document.body.removeChild(modelsMenu);
        }
        if (closeMenuListenerAttached) { 
            document.removeEventListener('click', closeMenuOnOutsideClick);
            closeMenuListenerAttached = false;
        }
    });
    modelsMenu.appendChild(closeBtn);
    
    // 添加当前激活的模型和其他模型
    currentProvider.models.forEach(model => {
        const modelItem = document.createElement('div');
        modelItem.className = 'model-menu-item';
        modelItem.style.padding = '8px 10px';
        modelItem.style.margin = '5px 0';
        modelItem.style.borderRadius = '4px';
        modelItem.style.cursor = 'pointer';
        modelItem.style.display = 'flex';
        modelItem.style.alignItems = 'center';
        modelItem.style.transition = 'background-color 0.2s';
        
        // 激活的模型显示不同的背景色和复选标记
        if (model.isActive) {
            modelItem.style.backgroundColor = '#e6f7ff';
            modelItem.style.borderLeft = '3px solid #0d6efd';
            modelItem.innerHTML = `<i class="fas fa-check" style="margin-right: 8px; color: #0d6efd;"></i> ${model.name}`;
        } else {
            modelItem.innerHTML = `<span style="width: 16px; display: inline-block; margin-right: 8px;"></span>${model.name}`;
            modelItem.style.backgroundColor = '#f9f9f9';
            
            // 鼠标悬停效果
            modelItem.addEventListener('mouseover', () => {
                modelItem.style.backgroundColor = '#f0f0f0';
            });
            modelItem.addEventListener('mouseout', () => {
                modelItem.style.backgroundColor = '#f9f9f9';
            });
            
            // 点击事件 - 切换模型
            modelItem.addEventListener('click', () => {
                // 更新模型激活状态
                currentProvider.models.forEach(m => {
                    m.isActive = (m.id === model.id);
                });
                
                // 先保存到localStorage，再设置活动模型
                saveProviders(providers, activeProviderId);
                
                // 保存更改并设置活动服务商
                if (setActiveProvider(activeProviderId)) {
                    // 用通知条替代alert
                    showNotification(`已切换到模型: ${model.name}`, 'success');
                    console.log(`[InputController] 切换到模型: ${model.name}`);
                    if (modelsMenu.parentNode === document.body) document.body.removeChild(modelsMenu);
                    if (closeMenuListenerAttached) { 
                        document.removeEventListener('click', closeMenuOnOutsideClick);
                        closeMenuListenerAttached = false;
                    }
                } else {
                    showNotification('模型切换失败，请稍后再试', 'error');
                }
            });
        }
        
        modelsMenu.appendChild(modelItem);
    });
    
    document.body.appendChild(modelsMenu);
    
    setTimeout(() => {
        if (!closeMenuListenerAttached) {
            document.addEventListener('click', closeMenuOnOutsideClick);
            closeMenuListenerAttached = true;
        }
    }, 100);
}

// 显示通知条
function showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.padding = '10px 15px';
    notification.style.borderRadius = '4px';
    notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
    notification.style.zIndex = '9999';
    notification.style.minWidth = '200px';
    notification.style.maxWidth = '350px';
    notification.style.animation = 'notification-slide-in 0.3s ease-out';
    notification.style.display = 'flex';
    notification.style.alignItems = 'center';
    notification.style.transition = 'opacity 0.3s ease';
    
    // 根据类型设置颜色
    let iconClass = 'fa-info-circle';
    switch (type) {
        case 'success':
            notification.style.backgroundColor = '#d4edda';
            notification.style.color = '#155724';
            notification.style.borderLeft = '4px solid #28a745';
            iconClass = 'fa-check-circle';
            break;
        case 'warning':
            notification.style.backgroundColor = '#fff3cd';
            notification.style.color = '#856404';
            notification.style.borderLeft = '4px solid #ffc107';
            iconClass = 'fa-exclamation-triangle';
            break;
        case 'error':
            notification.style.backgroundColor = '#f8d7da';
            notification.style.color = '#721c24';
            notification.style.borderLeft = '4px solid #dc3545';
            iconClass = 'fa-times-circle';
            break;
        default: // info
            notification.style.backgroundColor = '#d1ecf1';
            notification.style.color = '#0c5460';
            notification.style.borderLeft = '4px solid #17a2b8';
    }
    
    // 添加图标和消息
    notification.innerHTML = `
        <i class="fas ${iconClass}" style="margin-right: 10px; font-size: 16px;"></i>
        <span style="flex-grow: 1;">${message}</span>
        <i class="fas fa-times" style="cursor: pointer; padding: 5px; font-size: 14px;"></i>
    `;
    
    // 添加样式到head
    if (!document.querySelector('#notification-styles')) {
        const styleElement = document.createElement('style');
        styleElement.id = 'notification-styles';
        styleElement.textContent = `
            @keyframes notification-slide-in {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes notification-slide-out {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(styleElement);
    }
    
    // 添加到页面
    document.body.appendChild(notification);
    
    // 点击关闭按钮移除通知
    notification.querySelector('.fa-times').addEventListener('click', () => {
        notification.style.animation = 'notification-slide-out 0.3s ease-out forwards';
        setTimeout(() => {
            try {
                document.body.removeChild(notification);
            } catch (e) {
                // 元素可能已经被移除，忽略错误
            }
        }, 300);
    });
    
    // 自动3秒后消失
    setTimeout(() => {
        if (document.body.contains(notification)) {
            notification.style.animation = 'notification-slide-out 0.3s ease-out forwards';
            setTimeout(() => {
                try {
                    document.body.removeChild(notification);
                } catch (e) {
                    // 元素可能已经被移除，忽略错误
                }
            }, 300);
        }
    }, 3000);
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
    imageUploadInputElement = document.getElementById('image-upload-input');
    uploadImageButtonElement = document.getElementById('upload-image-btn');
    switchModelButtonElement = document.getElementById('switch-model-btn');

    // Check if required elements exist
    if (!chatInputElement || !sendButtonElement || !imageUploadInputElement) {
        console.error("InputController Error: Required input elements (chat, send, file input) not found. Check IDs: chat-input, send-button, image-upload-input");
        return;
    }
    
    if (!imagePreviewAreaElement) {
        console.warn("InputController Warning: Image preview area element not found. Paste preview might not work.");
    }
    
    if (!uploadImageButtonElement) {
        console.warn("InputController Warning: Upload image button not found. Manual image upload might not work.");
    }
    
    if (!switchModelButtonElement) {
        console.warn("InputController Warning: Switch model button not found. Model switching might not work.");
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
    
    // 添加输入框点击事件，处理图片点击和删除按钮点击
    chatInputElement.addEventListener('click', (event) => {
        // 检查是否点击的是删除按钮
        if (event.target.classList.contains('delete-image-btn')) {
            handleDeleteImage(event);
            return;
        }
        
        // 检查是否点击的是图片（图片预览已在_addImageToInputAndPreview中添加事件处理器）
    });
    
    sendButtonElement.addEventListener('click', handleSendTrigger);
    
    // 上传图片按钮事件
    if (uploadImageButtonElement && imageUploadInputElement) {
        uploadImageButtonElement.addEventListener('click', () => {
            imageUploadInputElement.click();
        });
    }
    
    // 模型切换按钮事件
    if (switchModelButtonElement) {
        switchModelButtonElement.addEventListener('click', handleModelSwitch);
    }

    // 图片预览区域点击事件（同时处理上传触发和删除）
    if (imagePreviewAreaElement) {
        imagePreviewAreaElement.addEventListener('click', (event) => {
            console.log("[InputController] Click detected on image preview area.");
            
            // 检查是否点击的是删除按钮
            const deleteButton = event.target.closest('.delete-image-btn');
            if (deleteButton) {
                console.log("[InputController] Delete button clicked. Calling handleDeleteImage.");
                handleDeleteImage(event);
                return;
            }
            
            // 检查是否点击的是已有的预览图片
            if (event.target.tagName === 'IMG' && event.target.closest('.image-preview-item')) {
                console.log("[InputController] Clicked on an existing preview image. Ignoring for upload trigger.");
                return;
            }
            
            // 检查是否点击的是预览项的包装元素
            if (event.target.classList.contains('image-preview-item')) {
                console.log("[InputController] Clicked on a preview item wrapper. Ignoring for upload trigger.");
                return;
            }
            
            // 如果点击的是预览区域的其他部分（背景、占位符等），触发上传
            console.log("[InputController] Click target is neither delete nor existing item. Attempting to trigger upload.");
            
            if (imageUploadInputElement) {
                console.log("[InputController] Attempting to click hidden file input.");
                try {
                    imageUploadInputElement.click();
                    console.log("[InputController] Hidden file input .click() called successfully.");
                } catch (e) {
                    console.error("[InputController] Error clicking hidden file input:", e);
                    showNotification("无法打开文件选择对话框", 'error');
                }
            } else {
                console.error("[InputController] Cannot trigger upload: Hidden file input element not found.");
                showNotification("图片上传功能当前不可用", 'warning');
            }
        });
    }

    // 添加文件上传处理
    imageUploadInputElement.addEventListener('change', handleFileUpload);

    // 初始化lightbox图片预览功能
    import('./ui/lightbox.js').then(module => {
        module.initializeLightbox();
        console.log("Lightbox functionality initialized");
    }).catch(err => {
        console.error("Error initializing lightbox:", err);
    });

    console.log("Input Controller Initialized.");
}