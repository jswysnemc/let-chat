/**
 * 通用的通知消息组件
 * 用于替代alert、confirm等系统弹窗
 */

// 不同类型的通知样式
const NOTIFICATION_TYPES = {
    success: {
        bgColor: '#d4edda',
        textColor: '#155724',
        borderColor: '#28a745',
        icon: 'check-circle'
    },
    info: {
        bgColor: '#d1ecf1',
        textColor: '#0c5460',
        borderColor: '#17a2b8',
        icon: 'info-circle'
    },
    warning: {
        bgColor: '#fff3cd',
        textColor: '#856404',
        borderColor: '#ffc107',
        icon: 'exclamation-triangle'
    },
    error: {
        bgColor: '#f8d7da',
        textColor: '#721c24',
        borderColor: '#dc3545',
        icon: 'times-circle'
    }
};

// 确保样式只添加一次
let stylesAdded = false;

/**
 * 添加通知所需的CSS样式
 */
function ensureStyles() {
    if (stylesAdded) return;
    
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
        
        .app-notification {
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 16px;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 9999;
            min-width: 250px;
            max-width: 400px;
            display: flex;
            align-items: center;
            animation: notification-slide-in 0.3s ease-out;
            transition: transform 0.3s, opacity 0.3s;
            font-size: 14px;
        }
        
        .app-notification.animate-out {
            animation: notification-slide-out 0.3s ease-out forwards;
        }
        
        .app-notification .notification-icon {
            margin-right: 12px;
            font-size: 18px;
            flex-shrink: 0;
        }
        
        .app-notification .notification-message {
            flex-grow: 1;
            margin-right: 8px;
        }
        
        .app-notification .notification-close {
            background: none;
            border: none;
            color: inherit;
            opacity: 0.7;
            cursor: pointer;
            padding: 4px 6px;
            font-size: 16px;
            transition: opacity 0.2s;
            flex-shrink: 0;
        }
        
        .app-notification .notification-close:hover {
            opacity: 1;
        }
    `;
    
    document.head.appendChild(styleElement);
    stylesAdded = true;
}

/**
 * 显示通知消息
 * @param {string} message 通知消息内容
 * @param {string} type 通知类型: 'success', 'info', 'warning', 'error'
 * @param {number} duration 显示时长(毫秒)，为0则不自动关闭
 * @returns {HTMLElement} 通知元素
 */
export function showNotification(message, type = 'info', duration = 3000) {
    ensureStyles();
    
    // 获取通知样式
    const style = NOTIFICATION_TYPES[type] || NOTIFICATION_TYPES.info;
    
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = 'app-notification';
    notification.style.backgroundColor = style.bgColor;
    notification.style.color = style.textColor;
    notification.style.borderLeft = `4px solid ${style.borderColor}`;
    
    // 添加内容
    notification.innerHTML = `
        <i class="fas fa-${style.icon} notification-icon"></i>
        <span class="notification-message">${message}</span>
        <button class="notification-close" title="关闭"><i class="fas fa-times"></i></button>
    `;
    
    // 添加到页面
    document.body.appendChild(notification);
    
    // 关闭按钮事件
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        closeNotification(notification);
    });
    
    // 自动关闭
    if (duration > 0) {
        setTimeout(() => {
            closeNotification(notification);
        }, duration);
    }
    
    return notification;
}

/**
 * 关闭通知
 * @param {HTMLElement} notification 通知元素
 */
function closeNotification(notification) {
    if (!document.body.contains(notification)) return;
    
    notification.classList.add('animate-out');
    
    // 动画结束后移除元素
    setTimeout(() => {
        if (document.body.contains(notification)) {
            document.body.removeChild(notification);
        }
    }, 300);
}

/**
 * 显示成功通知
 * @param {string} message 通知消息
 * @param {number} duration 显示时长
 * @returns {HTMLElement} 通知元素
 */
export function showSuccess(message, duration = 3000) {
    return showNotification(message, 'success', duration);
}

/**
 * 显示信息通知
 * @param {string} message 通知消息
 * @param {number} duration 显示时长
 * @returns {HTMLElement} 通知元素
 */
export function showInfo(message, duration = 3000) {
    return showNotification(message, 'info', duration);
}

/**
 * 显示警告通知
 * @param {string} message 通知消息
 * @param {number} duration 显示时长
 * @returns {HTMLElement} 通知元素
 */
export function showWarning(message, duration = 3000) {
    return showNotification(message, 'warning', duration);
}

/**
 * 显示错误通知
 * @param {string} message 通知消息
 * @param {number} duration 显示时长
 * @returns {HTMLElement} 通知元素
 */
export function showError(message, duration = 4000) {
    return showNotification(message, 'error', duration);
}

/**
 * 显示需要确认的提示对话框
 * 使用自定义样式替代系统的confirm对话框
 * 
 * @param {Object} options 配置选项
 * @param {string} options.title 对话框标题
 * @param {string} options.message 对话框消息
 * @param {string} options.confirmText 确认按钮文本
 * @param {string} options.cancelText 取消按钮文本
 * @param {Function} options.onConfirm 确认回调
 * @param {Function} options.onCancel 取消回调
 * @returns {Promise<boolean>} 用户确认结果
 */
export function showConfirm(options) {
    return new Promise((resolve) => {
        // 确保必要参数
        const title = options.title || '确认操作';
        const message = options.message || '您确定要执行此操作吗？';
        const confirmText = options.confirmText || '确定';
        const cancelText = options.cancelText || '取消';
        
        // 创建遮罩层
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 27000; /* 提高层级，确保显示在所有模态框之上，包括设置模态框 */
            opacity: 0;
            transition: opacity 0.3s;
        `;
        
        // 创建对话框
        const dialog = document.createElement('div');
        dialog.className = 'confirm-dialog';
        dialog.style.cssText = `
            background-color: #fff;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
            width: 100%;
            max-width: 400px;
            padding: 24px;
            transform: scale(0.9);
            transition: transform 0.3s;
        `;
        
        // 构建对话框内容
        dialog.innerHTML = `
            <h3 style="margin-top: 0; margin-bottom: 16px; color: #333; font-size: 18px;">${title}</h3>
            <p style="margin-bottom: 24px; color: #666; font-size: 14px;">${message}</p>
            <div style="display: flex; justify-content: flex-end; gap: 12px;">
                <button class="cancel-btn" style="
                    padding: 8px 16px;
                    border: 1px solid #ddd;
                    background-color: #f5f5f5;
                    color: #666;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: background-color 0.2s;
                ">${cancelText}</button>
                <button class="confirm-btn" style="
                    padding: 8px 16px;
                    border: none;
                    background-color: #0d6efd;
                    color: white;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: background-color 0.2s;
                ">${confirmText}</button>
            </div>
        `;
        
        // 添加到DOM
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        // 触发重绘并显示
        setTimeout(() => {
            overlay.style.opacity = '1';
            dialog.style.transform = 'scale(1)';
        }, 10);
        
        // 添加按钮事件
        const confirmBtn = dialog.querySelector('.confirm-btn');
        const cancelBtn = dialog.querySelector('.cancel-btn');
        
        // 关闭对话框函数
        const closeDialog = (confirmed) => {
            overlay.style.opacity = '0';
            dialog.style.transform = 'scale(0.9)';
            
            setTimeout(() => {
                document.body.removeChild(overlay);
                
                // 调用回调并解析Promise
                if (confirmed) {
                    if (typeof options.onConfirm === 'function') {
                        options.onConfirm();
                    }
                    resolve(true);
                } else {
                    if (typeof options.onCancel === 'function') {
                        options.onCancel();
                    }
                    resolve(false);
                }
            }, 300);
        };
        
        // 添加事件监听器
        confirmBtn.addEventListener('click', () => closeDialog(true));
        cancelBtn.addEventListener('click', () => closeDialog(false));
        
        // 添加样式
        confirmBtn.addEventListener('mouseover', () => {
            confirmBtn.style.backgroundColor = '#0b5ed7';
        });
        confirmBtn.addEventListener('mouseout', () => {
            confirmBtn.style.backgroundColor = '#0d6efd';
        });
        
        cancelBtn.addEventListener('mouseover', () => {
            cancelBtn.style.backgroundColor = '#e9e9e9';
        });
        cancelBtn.addEventListener('mouseout', () => {
            cancelBtn.style.backgroundColor = '#f5f5f5';
        });
    });
} 