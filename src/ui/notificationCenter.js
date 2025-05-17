const NOTIFICATIONS_STORAGE_KEY = 'chat_notifications';
let notifications = [];

let notificationBellBtn = null;
let notificationPanel = null;
let notificationList = null;
let unreadIndicator = null;
let closeNotificationPanelBtn = null;

function getTodayDate() {
    const today = new Date();
    return today.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
}

function loadNotifications() {
    const storedNotifications = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (storedNotifications) {
        notifications = JSON.parse(storedNotifications);
    } else {
        // Add default first notification if none exist
        notifications = [
            {
                id: 'notification_' + Date.now(),
                title: "加入联网搜索功能",
                content: "本站工具已加入联网搜索功能，需要模型支持functioncalling功能。如果不能触发，请尝试提出更明确的提示词。",
                date: getTodayDate(),
                read: false
            }
        ];
        saveNotifications();
    }
}

function saveNotifications() {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
}

function renderNotifications() {
    if (!notificationList) return;
    notificationList.innerHTML = ''; // Clear existing

    if (notifications.length === 0) {
        const noNotificationsLi = document.createElement('li');
        noNotificationsLi.className = 'no-notifications';
        noNotificationsLi.textContent = '暂无新通知';
        notificationList.appendChild(noNotificationsLi);
        updateUnreadIndicator();
        return;
    }

    notifications.sort((a, b) => new Date(b.rawDate || b.date) - new Date(a.rawDate || a.date)); // Sort by date, newest first

    notifications.forEach(notification => {
        const li = document.createElement('li');
        li.dataset.notificationId = notification.id;
        if (!notification.read) {
            li.classList.add('unread');
        }

        const titleSpan = document.createElement('span');
        titleSpan.className = 'notification-title';
        titleSpan.textContent = notification.title;

        const contentSpan = document.createElement('span');
        contentSpan.className = 'notification-content';
        contentSpan.textContent = notification.content;

        const dateSpan = document.createElement('span');
        dateSpan.className = 'notification-date';
        dateSpan.textContent = notification.date;

        li.appendChild(titleSpan);
        li.appendChild(contentSpan);
        li.appendChild(dateSpan);

        li.addEventListener('click', () => {
            markNotificationAsRead(notification.id);
            // Potentially open a modal or navigate if notifications have actions
            console.log("Notification clicked:", notification.id);
        });
        notificationList.appendChild(li);
    });
    updateUnreadIndicator();
}

function markNotificationAsRead(notificationId) {
    const notification = notifications.find(n => n.id === notificationId);
    if (notification && !notification.read) {
        notification.read = true;
        saveNotifications();
        renderNotifications(); // Re-render to update style
    }
}

function markAllAsRead() {
    let changed = false;
    notifications.forEach(n => {
        if (!n.read) {
            n.read = true;
            changed = true;
        }
    });
    if (changed) {
        saveNotifications();
        renderNotifications();
    }
}

function updateUnreadIndicator() {
    if (!unreadIndicator) return;
    const unreadCount = notifications.filter(n => !n.read).length;
    if (unreadCount > 0) {
        // unreadIndicator.textContent = unreadCount; // If you want to show count
        unreadIndicator.style.display = 'block';
    } else {
        unreadIndicator.style.display = 'none';
    }
}

function toggleNotificationPanel() {
    if (!notificationPanel) return;
    const isVisible = notificationPanel.style.display === 'flex' || notificationPanel.style.display === 'block';
    notificationPanel.style.display = isVisible ? 'none' : 'flex'; // Use flex as per CSS
    if (!isVisible) { // Panel is being opened
        // Optional: Mark all as read when panel is opened
        // markAllAsRead(); 
    }
}

export function initializeNotificationCenter() {
    notificationBellBtn = document.getElementById('notification-bell-btn');
    notificationPanel = document.getElementById('notification-panel');
    notificationList = document.getElementById('notification-list');
    unreadIndicator = document.getElementById('notification-unread-indicator');
    closeNotificationPanelBtn = document.getElementById('close-notification-panel-btn');

    if (!notificationBellBtn || !notificationPanel || !notificationList || !unreadIndicator || !closeNotificationPanelBtn) {
        console.error('Notification Center initialization failed: DOM elements not found.');
        return;
    }

    loadNotifications();
    renderNotifications();

    notificationBellBtn.addEventListener('click', (event) => {
        event.stopPropagation(); // Prevent body click from closing it immediately
        toggleNotificationPanel();
    });

    closeNotificationPanelBtn.addEventListener('click', () => {
        notificationPanel.style.display = 'none';
    });

    // Optional: Click outside to close panel
    document.addEventListener('click', (event) => {
        if (notificationPanel && notificationBellBtn) {
            const isVisible = notificationPanel.style.display === 'flex' || notificationPanel.style.display === 'block';
            if (isVisible && !notificationPanel.contains(event.target) && event.target !== notificationBellBtn && !notificationBellBtn.contains(event.target)) {
                notificationPanel.style.display = 'none';
            }
        }
    });
    console.log("Notification Center Initialized");
}

export function addNotification(title, content) {
    const newNotification = {
        id: 'notification_' + Date.now(),
        title: title,
        content: content,
        date: getTodayDate(),
        rawDate: new Date().toISOString(), // For more accurate sorting
        read: false
    };
    notifications.push(newNotification);
    saveNotifications();
    renderNotifications();
} 