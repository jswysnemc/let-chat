// src/ui/lightbox.js
import { aiResponseArea, imagePreviewArea } from './domElements.js'; // 导入相关 DOM 元素

// --- Lightbox 内部状态和处理函数 ---

let isLightboxOpen = false; // 跟踪 Lightbox 是否打开
let currentImageUrl = null; // 当前显示的图片 URL

/**
 * 处理 Esc 键按下事件，用于关闭 Lightbox。
 * @param {KeyboardEvent} event 键盘事件对象。
 */
function handleLightboxKeydown(event) {
    if (event.key === 'Escape' && isLightboxOpen) {
        closeLightbox();
    }
}

/**
 * 关闭并从 DOM 中移除当前打开的 Lightbox。
 */
function closeLightbox() {
    const overlay = document.querySelector('.lightbox-overlay');
    if (overlay) {
        overlay.remove(); // 从 DOM 中移除
        isLightboxOpen = false;
        currentImageUrl = null;
        // 移除全局键盘事件监听器
        document.removeEventListener('keydown', handleLightboxKeydown);
        console.log("Lightbox closed.");
    }
}

/**
 * 打开 Lightbox 显示指定的图片 URL。
 * @param {string} imageUrl 要显示的图片的 URL。
 */
function openLightbox(imageUrl) {
    // 防止重复打开或打开无效 URL
    if (isLightboxOpen || !imageUrl) {
        console.warn("Lightbox open aborted. Already open or no image URL provided.");
        return;
    }
    // 防止打开 data: URL 过长的 base64 字符串（可能导致性能问题或错误）
    if (imageUrl.startsWith('data:image') && imageUrl.length > 1024 * 1024) { // 限制 1MB
         console.warn("Lightbox open aborted. Image data URL is too large.");
         alert("无法预览过大的图片。");
         return;
    }


    console.log("Opening lightbox for:", imageUrl);
    isLightboxOpen = true;
    currentImageUrl = imageUrl;

    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay';
    overlay.addEventListener('click', closeLightbox); // 点击遮罩层关闭

    // 创建内容容器
    const content = document.createElement('div');
    content.className = 'lightbox-content';
    // 阻止事件冒泡，防止点击内容区域关闭 Lightbox
    content.addEventListener('click', (e) => e.stopPropagation());

    // 创建图片元素
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = '放大预览'; // 图片替代文本
    img.onerror = () => { // 添加错误处理
        console.error("Lightbox: Failed to load image:", imageUrl);
        alert("无法加载图片进行预览。");
        closeLightbox(); // 加载失败时关闭 lightbox
    };


    // 创建关闭按钮
    const closeBtn = document.createElement('button');
    closeBtn.className = 'lightbox-close';
    closeBtn.textContent = '×'; // 使用 '×' 符号
    closeBtn.title = '关闭预览';
    closeBtn.addEventListener('click', closeLightbox); // 点击按钮关闭

    // 组装元素
    content.appendChild(img);
    content.appendChild(closeBtn);
    overlay.appendChild(content);

    // 添加到 body
    document.body.appendChild(overlay);

    // 添加全局键盘事件监听器
    document.addEventListener('keydown', handleLightboxKeydown);
}


// --- Lightbox 初始化和事件处理 ---

/**
 * 处理图片点击事件，判断是否需要打开 Lightbox。
 * @param {MouseEvent} event 鼠标点击事件对象。
 */
function handleImageClick(event) {
    // 检查点击的是否是图片元素或其子元素
    const clickedImage = event.target.closest('img');
    if (!clickedImage) return; // 如果不是图片，则忽略

    // 检查图片是否位于允许打开 Lightbox 的区域内
    const isInResponseArea = aiResponseArea?.contains(clickedImage);
    const isInPreviewArea = imagePreviewArea?.contains(clickedImage);

    // 仅当图片位于指定区域、有有效的 src 且不是删除按钮时才打开
    if ((isInResponseArea || isInPreviewArea) && clickedImage.src && !clickedImage.closest('.delete-image-btn')) {

         // 附加检查：确保预览区点击的是预览项内的图片
         if (isInPreviewArea && !clickedImage.closest('.image-preview-item')) {
             return; // 忽略非预览项图片的点击
         }

         // 附加检查：确保响应区点击的是消息气泡内的图片
         if (isInResponseArea && !clickedImage.closest('.message-bubble')) {
             return; // 忽略非消息气泡图片的点击
         }

        event.preventDefault(); // 阻止图片的默认行为（例如，浏览器单独打开图片）
        openLightbox(clickedImage.src); // 打开 Lightbox
    }
}

/**
 * 初始化 Lightbox 功能，添加必要的事件监听器。
 * 应在 UI 初始化时调用一次。
 */
export function initializeLightbox() {
    if (aiResponseArea) {
        // 使用事件委托，监听整个响应区域的点击事件
        aiResponseArea.addEventListener('click', handleImageClick);
        console.log("Lightbox listener added to AI response area.");
    } else {
        console.warn("Lightbox initializer: AI response area not found.");
    }

    if (imagePreviewArea) {
        // 监听图片预览区域的点击事件
        imagePreviewArea.addEventListener('click', handleImageClick);
        console.log("Lightbox listener added to image preview area.");
    } else {
        console.warn("Lightbox initializer: Image preview area not found.");
    }
}

// 注意：openLightbox 和 closeLightbox 函数没有导出，
// 因为它们通常只在模块内部由事件处理器调用。
// 如果需要在模块外部控制 Lightbox，可以考虑导出它们。