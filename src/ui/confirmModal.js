// src/ui/confirmModal.js
import {
    confirmModalOverlay,
    confirmModalTitle, // Assuming you might want to customize title later
    confirmModalMessage,
    confirmModalConfirmBtn,
    confirmModalCancelBtn
} from './domElements.js';

let confirmCallback = null; // Store the callback function

/**
 * Hides the confirmation modal and cleans up listeners.
 */
function hideConfirmModal() {
    if (confirmModalOverlay) {
        confirmModalOverlay.classList.remove('visible');
    }
    // Remove listeners to prevent memory leaks
    if (confirmModalConfirmBtn) {
        confirmModalConfirmBtn.removeEventListener('click', handleConfirm);
    }
    if (confirmModalCancelBtn) {
        confirmModalCancelBtn.removeEventListener('click', handleCancel);
    }
    confirmCallback = null; // Clear the callback
}

/**
 * Handles the click event for the confirm button.
 */
function handleConfirm() {
    if (typeof confirmCallback === 'function') {
        confirmCallback(); // Execute the stored callback
    }
    hideConfirmModal();
}

/**
 * Handles the click event for the cancel button.
 */
function handleCancel() {
    hideConfirmModal();
}

/**
 * Shows the confirmation modal with a specific message and sets up the callback.
 * @param {string} message - The message to display in the modal.
 * @param {function} onConfirm - The function to execute if the user clicks "Confirm".
 * @param {string} [title='确认操作'] - Optional title for the modal.
 */
export function showConfirmationModal(message, onConfirm, title = '确认操作') {
    if (!confirmModalOverlay || !confirmModalMessage || !confirmModalConfirmBtn || !confirmModalCancelBtn || !confirmModalTitle) {
        console.error("Confirmation modal elements not initialized properly.");
        // Fallback to browser confirm if modal elements are missing
        if (window.confirm(`${title}\n${message}`)) {
            onConfirm();
        }
        return;
    }

    confirmModalTitle.textContent = title;
    confirmModalMessage.textContent = message;
    confirmCallback = onConfirm; // Store the callback

    // Add listeners
    confirmModalConfirmBtn.addEventListener('click', handleConfirm);
    confirmModalCancelBtn.addEventListener('click', handleCancel);

    // Show the modal
    confirmModalOverlay.classList.add('visible');
}