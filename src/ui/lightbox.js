// src/ui/lightbox.js
import { aiResponseArea, imagePreviewArea } from './domElements.js'; // 导入相关 DOM 元素

// --- Lightbox 内部状态和处理函数 ---

let isLightboxOpen = false; // 跟踪 Lightbox 是否打开
let currentImageUrl = null; // 当前显示的图片 URL
let currentScale = 1; // 当前缩放级别
let maxScale = 5; // 增加最大缩放倍数，方便查看细节
let minScale = 0.1; // 减小最小缩放倍数，便于查看整体
let origImgRatio = 1; // 存储原始图片比例

/**
 * 处理 Esc 键按下事件，用于关闭 Lightbox，以及其他键盘交互。
 * @param {KeyboardEvent} event 键盘事件对象。
 */
function handleLightboxKeydown(event) {
    if (!isLightboxOpen) return;
    
    switch(event.key) {
        case 'Escape': 
            closeLightbox();
            break;
        case '+':
        case '=':
            // 放大图片
            zoomImage(0.2);
            event.preventDefault();
            break;
        case '-':
            // 缩小图片
            zoomImage(-0.2);
            event.preventDefault();
            break;
        case '0':
            // 重置缩放
            resetZoom();
            event.preventDefault();
            break;
        case 'f':
        case 'F':
            // 适应窗口
            fitToWindow();
            event.preventDefault();
            break;
    }
}

/**
 * 缩放图片
 * @param {number} delta 缩放增量
 */
function zoomImage(delta) {
    if (!isLightboxOpen) return;
    
    const img = document.querySelector('.lightbox-image');
    if (!img) return;
    
    // 计算新的缩放级别，并确保在范围内
    currentScale = Math.min(maxScale, Math.max(minScale, currentScale + delta));
    
    // 应用缩放
    img.style.transform = `scale(${currentScale})`;
    
    // 更新缩放指示器
    updateZoomIndicator();
}

/**
 * 重置缩放到原始大小
 */
function resetZoom() {
    if (!isLightboxOpen) return;
    
    const img = document.querySelector('.lightbox-image');
    if (!img) return;
    
    currentScale = 1;
    img.style.transform = 'scale(1)';
    
    // 更新缩放指示器
    updateZoomIndicator();
}

/**
 * 适应窗口大小
 */
function fitToWindow() {
    if (!isLightboxOpen) return;
    
    const img = document.querySelector('.lightbox-image');
    if (!img) return;
    
    // 计算最佳的适应窗口缩放比例
    const container = document.querySelector('.lightbox-image-container');
    if (!container) return;
    
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // 考虑原始图片比例，计算适合窗口的比例
    const imgWidth = img.naturalWidth;
    const imgHeight = img.naturalHeight;
    
    if (imgWidth && imgHeight) {
        // 计算图片需要缩放的比例
        const scaleX = containerWidth / imgWidth;
        const scaleY = containerHeight / imgHeight;
        
        // 取较小值以确保图片完全可见
        currentScale = Math.min(scaleX, scaleY) * 0.95; // 乘以0.95留出一些边距
        
        img.style.transform = `scale(${currentScale})`;
        
        // 更新缩放指示器
        updateZoomIndicator();
    }
}

/**
 * 更新缩放指示器
 */
function updateZoomIndicator() {
    const indicator = document.querySelector('.zoom-indicator');
    if (!indicator) return;
    
    // 显示当前缩放百分比
    indicator.textContent = `${Math.round(currentScale * 100)}%`;
    
    // 淡入显示指示器
    indicator.style.opacity = '1';
    
    // 2秒后淡出
    clearTimeout(indicator.fadeTimer);
    indicator.fadeTimer = setTimeout(() => {
        indicator.style.opacity = '0';
    }, 2000);
}

/**
 * 关闭并从 DOM 中移除当前打开的 Lightbox。
 */
function closeLightbox() {
    const overlay = document.querySelector('.lightbox-overlay');
    if (overlay) {
        // 添加淡出动画
        overlay.classList.remove('visible');
        
        // 移除视口监听器（如果存在）
        if (typeof window.visualViewport !== 'undefined' && overlay.viewportHandler) {
            window.visualViewport.removeEventListener('resize', overlay.viewportHandler);
        }
        
        // 等待动画完成后移除元素
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.remove(); // 从 DOM 中移除
            }
            isLightboxOpen = false;
            currentImageUrl = null;
            currentScale = 1; // 重置缩放级别
            origImgRatio = 1; // 重置图片比例
            // 移除全局键盘事件监听器
            document.removeEventListener('keydown', handleLightboxKeydown);
            console.log("Lightbox closed.");
        }, 300); // 与CSS过渡时间相匹配
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
    
    // 防止打开 data: URL 过长的 base64 字符串（可能导致性能问题）
    // 不再直接拒绝大图，而是总是尝试加载并缩放
    if (imageUrl.startsWith('data:image') && imageUrl.length > 5 * 1024 * 1024) { // 限制提高到5MB
        console.warn("Lightbox: Large image detected, will attempt scaling.");
    }

    console.log("Opening lightbox for:", imageUrl);
    isLightboxOpen = true;
    currentImageUrl = imageUrl;
    currentScale = 1; // 重置缩放级别
    
    // 获取视口高度，用于计算安全区域
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const isMobile = window.matchMedia('(max-width: 768px)').matches;

    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay';
    overlay.addEventListener('click', function(e) {
        // 仅当点击非图片区域时关闭
        if (e.target === overlay) {
            closeLightbox();
        }
    });
    
    // 设置移动设备安全区域
    if (isMobile) {
        // 处理安全区域
        const safeAreaBottom = typeof window.visualViewport !== 'undefined' ? 
            window.innerHeight - window.visualViewport.height + 20 : 20;
            
        overlay.style.paddingBottom = `${Math.max(20, safeAreaBottom)}px`;
    }

    // 创建图片元素
    const img = document.createElement('img');
    img.className = 'lightbox-image';
    img.alt = '放大预览'; // 图片替代文本
    
    // 添加滚轮缩放支持
    img.addEventListener('wheel', function(e) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.1 : -0.1;
        zoomImage(delta);
    });
    
    // 添加双击重置功能
    img.addEventListener('dblclick', function(e) {
        // 如果当前是原始大小，则切换到适应窗口
        if (Math.abs(currentScale - 1) < 0.1) {
            fitToWindow();
        } else {
            // 否则重置到原始大小
            resetZoom();
        }
    });
    
    // 图片容器（便于控制）
    const imgContainer = document.createElement('div');
    imgContainer.className = 'lightbox-image-container';
    imgContainer.appendChild(img);
    
    // 添加加载指示器
    const loader = document.createElement('div');
    loader.className = 'lightbox-loader';
    loader.innerHTML = `
        <div class="spinner"></div>
        <span>加载图片中...</span>
    `;
    loader.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: white;
        text-align: center;
        font-size: 14px;
        background: rgba(0,0,0,0.6);
        padding: 15px 20px;
        border-radius: 10px;
        z-index: 1;
    `;
    
    loader.querySelector('.spinner').style.cssText = `
        width: 30px;
        height: 30px;
        border: 3px solid rgba(255,255,255,0.3);
        border-radius: 50%;
        border-top-color: white;
        animation: spin 1s linear infinite;
        margin: 0 auto 10px;
    `;
    
    // 添加缩放指示器
    const zoomIndicator = document.createElement('div');
    zoomIndicator.className = 'zoom-indicator';
    zoomIndicator.textContent = '100%';
    zoomIndicator.style.cssText = `
        position: absolute;
        bottom: 20px;
        right: 20px;
        background: rgba(0,0,0,0.5);
        color: white;
        padding: 5px 10px;
        border-radius: 15px;
        font-size: 14px;
        opacity: 0;
        transition: opacity 0.3s ease;
        z-index: 10001;
    `;
    
    // 添加动画样式
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        .lightbox-image-container {
            position: relative;
            max-width: 95%;
            max-height: 90%;
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: hidden;
        }
        
        .lightbox-image {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
            transition: transform 0.2s ease-out;
        }
    `;
    document.head.appendChild(style);
    
    img.style.display = 'none'; // 默认隐藏图片，直到加载完成
    
    // 监听图片加载完成事件前，先设置src，确保事件能正确触发
    img.src = imageUrl;
    
    // 图片加载处理
    img.onload = () => {
        console.log(`Lightbox: Image loaded - Size: ${img.naturalWidth}x${img.naturalHeight}`);
        
        // 获取图片原始尺寸
        const imgWidth = img.naturalWidth;
        const imgHeight = img.naturalHeight;
        
        // 计算图片尺寸是否超过容器
        const containerWidth = viewportWidth * 0.9; // 留出一些边距
        const containerHeight = viewportHeight * 0.85; // 留出一些边距
        
        let needsScaling = false;
        let scaleFactor = 1;
        
        // 存储原始图片比例
        origImgRatio = imgWidth / imgHeight;
        
        // 检查图片是否太大，需要缩放
        if (imgWidth > containerWidth || imgHeight > containerHeight) {
            needsScaling = true;
            
            // 计算最佳缩放比例
            const scaleX = containerWidth / imgWidth;
            const scaleY = containerHeight / imgHeight;
            
            // 使用较小的缩放比例确保图片完全适应
            scaleFactor = Math.min(scaleX, scaleY);
            currentScale = scaleFactor;
            
            console.log(`Lightbox: Image needs scaling. Factor: ${scaleFactor}`);
        }
        
        // 图片加载完成后，移除加载指示器，显示图片
        if (loader.parentNode) {
            loader.parentNode.removeChild(loader);
        }
        
        // 显示图片并应用缩放
        img.style.display = 'block';
        
        if (needsScaling) {
            // 自动缩放过大的图片
            img.style.transform = `scale(${scaleFactor})`;
            
            // 显示缩放比例指示器
            zoomIndicator.textContent = `${Math.round(scaleFactor * 100)}%`;
            zoomIndicator.style.opacity = '1';
            
            // 几秒后淡出指示器
            setTimeout(() => {
                zoomIndicator.style.opacity = '0';
            }, 3000);
        } else {
            // 标准尺寸图片，显示缩放指示器后消失
            zoomIndicator.textContent = '100%';
            zoomIndicator.style.opacity = '1';
            
            setTimeout(() => {
                zoomIndicator.style.opacity = '0';
            }, 2000);
        }
    };
    
    // 错误处理
    img.onerror = () => {
        console.error("Lightbox: Failed to load image:", imageUrl);
        if (loader.parentNode) {
            loader.parentNode.removeChild(loader);
        }
        
        const errorMsg = document.createElement('div');
        errorMsg.style.cssText = `
            color: white;
            text-align: center;
            padding: 20px;
            background: rgba(0,0,0,0.7);
            border-radius: 8px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        `;
        errorMsg.innerHTML = `
            <div style="font-size: 40px; margin-bottom: 10px;">😕</div>
            <div>图片加载失败</div>
            <div style="font-size: 12px; margin-top: 10px; opacity: 0.7;">可能图片过大或格式不支持</div>
            <div style="font-size: 12px; margin-top: 5px; opacity: 0.7;">点击任意位置关闭</div>
        `;
        overlay.appendChild(errorMsg);
        
        // 3秒后自动关闭
        setTimeout(closeLightbox, 3000);
    };

    // 创建关闭按钮
    const closeBtn = document.createElement('span');
    closeBtn.className = 'lightbox-close';
    closeBtn.innerHTML = '&times;'; // 使用 '×' 符号
    closeBtn.title = '关闭预览';
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // 阻止事件冒泡
        closeLightbox();
    });

    // 添加操作提示
    const helpTip = document.createElement('div');
    helpTip.className = 'lightbox-help-tip';
    helpTip.innerHTML = `
        <div>
            <kbd>+</kbd>/<kbd>-</kbd> 缩放 | 
            <kbd>0</kbd> 原始大小 | 
            <kbd>F</kbd> 适应窗口 | 
            <kbd>ESC</kbd> 关闭 | 
            双击切换 | 滚轮缩放
        </div>
    `;
    helpTip.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.5);
        color: white;
        padding: 8px 15px;
        border-radius: 20px;
        font-size: 12px;
        opacity: 0;
        transition: opacity 0.5s ease;
        z-index: 10002;
        max-width: 90%;
        margin: 0 auto;
        text-align: center;
        box-sizing: border-box;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    `;
    
    // 添加缩放控制按钮
    const zoomControls = document.createElement('div');
    zoomControls.className = 'zoom-controls';
    zoomControls.innerHTML = `
        <button class="zoom-btn zoom-out" title="缩小">-</button>
        <button class="zoom-btn zoom-fit" title="适应窗口">适应</button>
        <button class="zoom-btn zoom-reset" title="原始大小">1:1</button>
        <button class="zoom-btn zoom-in" title="放大">+</button>
    `;
    zoomControls.style.cssText = `
        position: fixed;
        bottom: 60px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.5);
        border-radius: 20px;
        padding: 5px;
        z-index: 10003;
        display: flex;
        gap: 5px;
    `;
    
    // 缩放按钮样式
    const zoomBtnStyle = `
        .zoom-btn {
            background: rgba(255,255,255,0.2);
            color: white;
            border: none;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: background 0.2s;
        }
        
        .zoom-btn:hover {
            background: rgba(255,255,255,0.4);
        }
        
        .zoom-fit, .zoom-reset {
            font-size: 10px;
            font-weight: bold;
        }
    `;
    style.textContent += zoomBtnStyle;
    
    // 添加按钮事件
    zoomControls.querySelector('.zoom-in').addEventListener('click', () => zoomImage(0.2));
    zoomControls.querySelector('.zoom-out').addEventListener('click', () => zoomImage(-0.2));
    zoomControls.querySelector('.zoom-reset').addEventListener('click', resetZoom);
    zoomControls.querySelector('.zoom-fit').addEventListener('click', fitToWindow);
    
    // 添加媒体查询以处理移动设备
    if (isMobile) {
        // 在移动设备上使用更紧凑的样式
        helpTip.innerHTML = `
            <div>
                <kbd>+</kbd>/<kbd>-</kbd> 缩放 | 
                <kbd>0</kbd> 重置 | 
                <kbd>F</kbd> 适应窗口 |
                双击切换
            </div>
        `;
        helpTip.style.bottom = '110px'; // 在移动端提高位置，避免与缩放控制冲突
        helpTip.style.fontSize = '10px';
        helpTip.style.padding = '6px 12px';
        
        // 调整缩放控制尺寸
        zoomControls.style.bottom = '70px';
        
        // 如果视口高度明显小于设备高度，说明软键盘可能打开
        if (viewportHeight < window.screen.height * 0.8) {
            helpTip.style.bottom = '150px'; // 软键盘打开时提高更多
            zoomControls.style.bottom = '110px';
        }
    }
    
    // 提示样式
    const kbdStyle = `
        kbd {
            background-color: #f7f7f7;
            border: 1px solid #ccc;
            border-radius: 3px;
            box-shadow: 0 1px 0 rgba(0,0,0,0.2);
            color: #333;
            display: inline-block;
            font-size: 0.8em;
            font-family: Monaco, 'Courier New', monospace;
            line-height: 1.4;
            margin: 0 0.1em;
            padding: 0.1em 0.5em;
            white-space: nowrap;
        }
    `;
    style.textContent += kbdStyle;

    // 组装元素并添加到 body
    overlay.appendChild(loader);
    overlay.appendChild(imgContainer);
    overlay.appendChild(closeBtn);
    overlay.appendChild(zoomIndicator);
    overlay.appendChild(helpTip);
    overlay.appendChild(zoomControls);
    document.body.appendChild(overlay);
    
    // 添加可见性类来触发动画（在下一帧渲染）
    requestAnimationFrame(() => {
        overlay.classList.add('visible');
        
        // 显示帮助提示并在几秒后淡出
        setTimeout(() => {
            helpTip.style.opacity = '1';
            
            setTimeout(() => {
                helpTip.style.opacity = '0';
            }, 4000);
        }, 1000);
    });

    // 添加全局键盘事件监听器
    document.addEventListener('keydown', handleLightboxKeydown);
    
    // 处理视口变化（如软键盘弹出）
    if (typeof window.visualViewport !== 'undefined') {
        const viewportHandler = () => {
            if (!isLightboxOpen) return;
            
            // 检测视口高度变化，可能是软键盘弹出
            const currentHeight = window.visualViewport.height;
            if (currentHeight < viewportHeight * 0.8) {
                // 软键盘可能打开，调整位置
                helpTip.style.bottom = '150px';
                zoomControls.style.bottom = '110px';
            } else {
                // 恢复正常位置
                helpTip.style.bottom = isMobile ? '110px' : '20px';
                zoomControls.style.bottom = isMobile ? '70px' : '60px';
            }
        };
        
        window.visualViewport.addEventListener('resize', viewportHandler);
        
        // 保存监听器引用以便稍后移除
        overlay.viewportHandler = viewportHandler;
    }
}

// --- Lightbox 初始化和事件处理 ---

/**
 * 处理图片点击事件，判断是否需要打开 Lightbox。
 * @param {MouseEvent} event 鼠标点击事件对象。
 */
function handleImageClick(event) {
    // 检查点击的是否是图片元素
    const clickedElement = event.target;
    if (clickedElement.tagName !== 'IMG') return; // 如果不是图片，则忽略
    
    // 忽略表情符号和功能图标
    if (clickedElement.classList.contains('emoji') || 
        clickedElement.closest('.delete-image-btn') || 
        clickedElement.closest('.control-button') ||
        clickedElement.closest('.input-icon-btn')) {
        return;
    }
    
    // 获取图片URL
    const imageUrl = clickedElement.src;
    if (!imageUrl) return;
    
    // 阻止默认行为并打开预览
    event.preventDefault();
    event.stopPropagation();
    openLightbox(imageUrl);
}

/**
 * 初始化 Lightbox 功能，添加必要的事件监听器。
 * 应在 UI 初始化时调用一次。
 */
export function initializeLightbox() {
    console.log("Initializing lightbox functionality...");
    
    // 为所有可能包含图片的区域添加事件委托
    document.addEventListener('click', (event) => {
        // 检查是否在AI响应区域或图片预览区域内
        if (aiResponseArea?.contains(event.target) || 
            imagePreviewArea?.contains(event.target)) {
            handleImageClick(event);
        }
    });
    
    console.log("Lightbox initialization complete");
}

/**
 * 公开的图片预览API
 * @param {string} imageUrl 要预览的图片URL
 */
export function previewImage(imageUrl) {
    if (imageUrl) {
        openLightbox(imageUrl);
    }
}