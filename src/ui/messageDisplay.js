


// src/ui/messageDisplay.js
import { aiResponseArea } from './domElements.js'; // 导入 AI 响应区域元素
import { updateAiResponsePlaceholderVisually } from './placeholderManager.js'; // 导入占位符更新函数
import { scrollChatToBottom } from './chatScroll.js'; // 导入滚动函数
import { copyTextFallback } from './copyUtils.js'; // 导入后备复制函数
import { renderMarkdown, highlightCodeBlocks } from '../markdownRenderer.js'; // 导入 Markdown 处理函数 (注意路径)

/**
 * 创建包含消息操作按钮的控件 div。
 * @param {number} messageIndex - 消息的索引。
 * @param {string} role - 消息的角色 ('user' 或 'assistant')。
 * @param {boolean} isStreaming - 指示消息是否仍在流式传输 (用于 AI 消息)。
 * @returns {HTMLElement} 包含按钮的 div 元素。
 */
function _createMessageControls(messageIndex, role, isStreaming = false) {
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'message-controls';

    // --- 通用按钮 ---
    const copyBtn = document.createElement('button');
    copyBtn.className = 'message-control-button message-copy-btn';
    copyBtn.title = '复制';
    // copyBtn.textContent = '📋'; // 使用 innerHTML 插入 Font Awesome 图标
    copyBtn.innerHTML = '<i class="fas fa-copy"></i>'; // Font Awesome Copy Icon
    copyBtn.dataset.action = 'copy';
    // 禁用按钮直到内容完全加载 (对 AI 消息)
    copyBtn.disabled = isStreaming && role === 'assistant';
    controlsDiv.appendChild(copyBtn);

    const editBtn = document.createElement('button');
    editBtn.className = 'message-control-button message-edit-btn';
    editBtn.title = '编辑';
    // editBtn.textContent = '✏️'; // 使用 innerHTML 插入 Font Awesome 图标
    editBtn.innerHTML = '<i class="fas fa-pencil-alt"></i>'; // Font Awesome Edit Icon
    editBtn.dataset.action = 'edit';
    // 禁用按钮直到内容完全加载 (对 AI 消息)
    editBtn.disabled = isStreaming && role === 'assistant';
    controlsDiv.appendChild(editBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'message-control-button message-delete-btn';
    deleteBtn.title = '删除';
    // deleteBtn.textContent = '🗑️'; // 使用 innerHTML 插入 Font Awesome 图标
    deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>'; // Font Awesome Delete Icon
    deleteBtn.dataset.action = 'delete';
    // 删除按钮通常可以立即启用
    controlsDiv.appendChild(deleteBtn);

    // --- AI 特有按钮 ---
    if (role === 'assistant') {
        const retryBtn = document.createElement('button');
        retryBtn.className = 'message-control-button message-retry-btn hidden'; // 默认隐藏
        retryBtn.title = '重试';
        // retryBtn.textContent = '🔄'; // 使用 innerHTML 插入 Font Awesome 图标
        retryBtn.innerHTML = '<i class="fas fa-sync-alt"></i>'; // Font Awesome Retry/Sync Icon
        retryBtn.dataset.action = 'retry';
        // 重试按钮也应在流式传输完成前禁用（如果可见）
        retryBtn.disabled = isStreaming;
        controlsDiv.appendChild(retryBtn);
    }

    return controlsDiv;
}


/**
 * 在聊天区域显示用户消息。
 * @param {Array<object>} contentParts - 包含文本或图片 URL 的内容部分数组。
 * @param {number} messageIndex - 此消息在会话历史记录中的索引。
 */
export function displayUserMessage(contentParts, messageIndex) {
    if (!aiResponseArea) {
        console.warn("[UI] displayUserMessage: aiResponseArea 元素引用为 null。");
        return;
    }
    updateAiResponsePlaceholderVisually(); // 确保在添加消息前处理占位符

    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'message-bubble user-bubble'; // 用户消息气泡样式
    bubbleDiv.dataset.messageIndex = messageIndex; // 存储消息索引

    // 提取纯文本内容用于复制/编辑
    const textContent = contentParts.filter(p => p.type === 'text').map(p => p.text).join('');
    bubbleDiv.dataset.rawContent = textContent; // 存储原始文本内容

    // const headerDiv = document.createElement('div'); // REMOVED: Header no longer used
    // headerDiv.className = 'message-header';
    // const prefix = document.createElement('strong'); // REMOVED: Prefix no longer used
    // prefix.textContent = 'You: ';
    // headerDiv.appendChild(prefix);
    // bubbleDiv.appendChild(headerDiv); // REMOVED: Header no longer added

    // 创建内容包装器 (Content wrapper remains)
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'message-content-wrapper'; // 添加样式类
    bubbleDiv.appendChild(contentWrapper);

    // 将内容部分添加到包装器
    contentParts.forEach(part => {
        if (part.type === 'text') {
            // 为文本创建 span 以允许 white-space: pre-wrap
            const textSpan = document.createElement('span');
            textSpan.textContent = part.text; // 直接设置文本内容
            textSpan.style.whiteSpace = 'pre-wrap'; // 确保保留换行符
            contentWrapper.appendChild(textSpan);
        } else if (part.type === 'image_url' && part.image_url?.url) {
            // 如果是图片 URL，创建 img 元素
            const img = document.createElement('img');
            img.src = part.image_url.url;
            img.alt = '用户发送的图片'; // 图片替代文本
            img.classList.add('message-image'); // 添加样式类
            contentWrapper.appendChild(img);
        }
    });

    aiResponseArea.appendChild(bubbleDiv); // 将消息气泡添加到响应区域

    // 添加控件按钮 *after* the content wrapper
    const controls = _createMessageControls(messageIndex, 'user');
    bubbleDiv.appendChild(controls); // Append controls directly to bubble, after content

    scrollChatToBottom(); // 滚动到底部
}

/**
 * 创建并显示助手消息气泡的初始结构（用于流式传输或历史记录）。
 * 返回对气泡元素和内容容器的引用。按钮现在通过控件添加。
 * @param {number} messageIndex - 此消息在会话历史记录中的索引。
 * @param {boolean} [isStreaming=true] - 指示此气泡是否用于流式传输（影响按钮初始状态）。
 * @returns {{bubbleElement: HTMLElement, contentContainer: HTMLElement}|null} 包含引用的对象，或在出错时返回 null。
 */
export function createAssistantMessageBubble(messageIndex, isStreaming = true) {
     if (!aiResponseArea) {
         console.warn("[UI] createAssistantMessageBubble: aiResponseArea 元素引用为 null。");
         return null;
     }
     updateAiResponsePlaceholderVisually(); // 确保处理占位符

     const bubbleElement = document.createElement('div');
     bubbleElement.className = 'message-bubble assistant-bubble'; // 助手消息气泡样式
     bubbleElement.dataset.messageIndex = messageIndex; // 存储消息索引
     // data-raw-content 将在 finalize 时添加

     // const headerDiv = document.createElement('div'); // REMOVED: Header no longer used
     // headerDiv.className = 'message-header';
     // const prefix = document.createElement('strong'); // REMOVED: Prefix no longer used
     // prefix.textContent = 'Assistant: ';
     // headerDiv.appendChild(prefix);
     // bubbleElement.appendChild(headerDiv); // REMOVED: Header no longer added

     // 创建用于容纳消息内容的 span (Content container remains)
     const contentContainer = document.createElement('span');
     contentContainer.className = 'assistant-message-content';
     bubbleElement.appendChild(contentContainer);

     // 如果是流式传输的初始状态，添加加载动画
     if (isStreaming) {
         const spinner = document.createElement('span');
         spinner.className = 'bubble-loading-spinner';
         contentContainer.appendChild(spinner); // 添加到内容容器
     }

     // 移除旧的独立复制按钮创建逻辑
     // const copyButton = ... (现在由 _createMessageControls 处理)

     aiResponseArea.appendChild(bubbleElement); // 添加到 DOM

     // 添加控件按钮 *after* the content container
     const controls = _createMessageControls(messageIndex, 'assistant', isStreaming);
     bubbleElement.appendChild(controls); // Append controls directly to bubble, after content

     scrollChatToBottom(); // 滚动到底部

     // 返回调用者需要的引用
     return { bubbleElement, contentContainer };
}

/**
 * 更新现有助手消息气泡的内容容器的 HTML 内容。
 * (在流式传输期间使用)
 * @param {HTMLElement} contentContainer - 由 createAssistantMessageBubble 返回的 span 元素。
 * @param {string} htmlContent - HTML 内容 (例如，来自 Markdown 渲染器)。
 */
export function updateAssistantMessageContent(contentContainer, htmlContent) {
    if (contentContainer) {
        // 在第一次更新内容前，移除可能存在的加载动画
        const existingSpinner = contentContainer.querySelector('.bubble-loading-spinner');
        if (existingSpinner) {
            contentContainer.removeChild(existingSpinner);
        }

        contentContainer.innerHTML = htmlContent; // 更新内容
        scrollChatToBottom(); // 添加内容时滚动
    } else {
        console.warn("UI: updateAssistantMessageContent 调用时容器为 null。");
    }
}

/**
 * 在流式传输完成后最终确定助手消息气泡。
 * (例如，启用控件按钮，设置 data-raw-content，添加复制监听器)
 * @param {HTMLElement} bubbleElement - 主气泡 div 元素。
 * @param {string} fullContent - 完整的原始文本内容。
 */
export function finalizeAssistantMessage(bubbleElement, fullContent) {
    if (!bubbleElement) {
        console.warn("[UI] finalizeAssistantMessage: 气泡元素为 null。");
        return;
    }

    // 存储原始文本内容到 dataset
    bubbleElement.dataset.rawContent = fullContent;

    // 启用控件按钮
    const controls = bubbleElement.querySelector('.message-controls');
    if (controls) {
        const buttons = controls.querySelectorAll('.message-control-button');
        buttons.forEach(btn => {
            // 启用所有按钮 (重试按钮的可见性由 main.js 控制)
            btn.disabled = false;

            // 特别处理复制按钮：添加监听器
            if (btn.classList.contains('message-copy-btn') && !btn.dataset.listenerAdded) {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation(); // 阻止事件冒泡
                    const textToCopy = bubbleElement.dataset.rawContent || ''; // 从 dataset 获取内容

                    // 处理复制成功的逻辑
            const handleCopySuccess = () => {
                    const originalHTML = btn.innerHTML; // Store original HTML (icon)
                    const originalTitle = btn.title;
                    btn.innerHTML = '<i class="fas fa-check"></i>'; // Use check icon
                    btn.title = '已复制!';
                    btn.disabled = true;
                    setTimeout(() => {
                        btn.innerHTML = originalHTML; // Restore original HTML (icon)
                        btn.title = originalTitle;
                        btn.disabled = false;
                    }, 2000);
                };

                // 处理复制失败的逻辑
                const handleCopyFailure = (methodUsed) => {
                     console.error(`使用 ${methodUsed} 复制失败。`);
                     if (methodUsed === 'navigator.clipboard' && !window.isSecureContext) {
                         alert('复制失败：此功能需要安全连接 (HTTPS) 或在 localhost 上运行。');
                     } else if (methodUsed === 'document.execCommand') {
                          alert('复制失败！浏览器不支持或禁止了后备复制方法。');
                     } else {
                         alert('复制失败！您的浏览器可能不支持此操作或权限不足。');
                     }
                };

                // --- 主要复制逻辑 ---
                if (window.isSecureContext && navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(textToCopy).then(() => {
                        handleCopySuccess();
                    }).catch(err => {
                        console.error('navigator.clipboard.writeText 失败:', err);
                        handleCopyFailure('navigator.clipboard');
                    });
                } else {
                    if (copyTextFallback(textToCopy)) {
                        handleCopySuccess();
                    } else {
                        handleCopyFailure('document.execCommand');
                    }
                }
                // --- 主要复制逻辑结束 ---
                }); // End of copy button event listener
                btn.dataset.listenerAdded = 'true'; // 标记监听器已添加
            } // End of if copy button check
        }); // End of buttons.forEach
    } else {
        console.warn("[UI] finalizeAssistantMessage: 未找到控件容器。");
    }

    // 确保最终滚动
    scrollChatToBottom();
} // End of finalizeAssistantMessage function


/**
 * 在聊天区域使用带样式的气泡显示错误消息。
 * @param {string} errorMessage - 错误消息内容。
 */
export function displayError(errorMessage) {
    if (!aiResponseArea) {
        console.warn("[UI] displayError: aiResponseArea 元素引用为 null。");
        return;
    }
    updateAiResponsePlaceholderVisually(); // 处理占位符

    const bubbleDiv = document.createElement('div');
    // 使用助手气泡样式，但添加 error-message 类以进行特定样式设置
    bubbleDiv.className = 'message-bubble assistant-bubble error-message';

    const prefix = document.createElement('strong');
    prefix.textContent = 'Error: ';
    prefix.style.color = 'red'; // 基本错误样式（可移至 CSS）
    bubbleDiv.appendChild(prefix);

    const errorTextNode = document.createTextNode(errorMessage); // 创建文本节点以显示错误
    bubbleDiv.appendChild(errorTextNode);

    aiResponseArea.appendChild(bubbleDiv);
    scrollChatToBottom();
}


/**
 * 显示完整的助手消息（例如，来自历史记录）。
 * 处理 Markdown 渲染和代码高亮，并添加控件。
 * @param {string} content - 助手的完整 Markdown 内容。
 * @param {number} messageIndex - 此消息在会话历史记录中的索引。
 */
export function displayAssistantMessage(content, messageIndex) {
    if (!aiResponseArea) {
        console.warn("[UI] displayAssistantMessage: aiResponseArea 元素引用为 null。");
        return;
    }
    updateAiResponsePlaceholderVisually(); // 处理占位符

    // 创建基础气泡结构，标记为非流式传输 (isStreaming = false)
    const bubbleRefs = createAssistantMessageBubble(messageIndex, false);
    if (!bubbleRefs) {
        console.error("UI 错误：无法为历史消息创建助手消息气泡。");
        return; // 创建气泡失败
    }

    // 渲染 Markdown 并更新内容
    const htmlContent = renderMarkdown(content);
    updateAssistantMessageContent(bubbleRefs.contentContainer, htmlContent);

    // 内容添加到 DOM 后高亮代码块
    // 使用 try-catch，因为 highlightCodeBlocks 可能依赖于 hljs 是否已加载
    try {
        highlightCodeBlocks(bubbleRefs.contentContainer);
    } catch (e) {
        console.error("高亮历史消息中的代码块时出错:", e);
    }

    // 最终确定（启用按钮，设置 data-content, 添加复制监听器）
    // 注意：之前这里错误地传递了 copyButton，现在只传 bubbleElement 和 content
    finalizeAssistantMessage(bubbleRefs.bubbleElement, content);
}


/**
 * 清空主聊天显示区域 (aiResponseArea)。
 */
export function clearChatArea() {
    if (aiResponseArea) {
        aiResponseArea.innerHTML = ''; // 清空所有内容
        // 确保清空后占位符状态正确
        updateAiResponsePlaceholderVisually();
    } else {
        console.warn("UI: clearChatArea 调用时 aiResponseArea 未初始化。");
    }
}
