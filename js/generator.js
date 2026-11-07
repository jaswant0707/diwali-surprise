/**
 * Diwali Surprise - Link Generator Controller (Sender Experience)
 * Handles input validation, Supabase saving, and social share wiring
 * Author: Jaswant Yadav (@jaswant_0707)
 */

(function () {
  'use strict';

  let currentGreeting = null;

  document.addEventListener('DOMContentLoaded', () => {
    initSenderForm();
    initModals();
    checkExistingState();
  });

  function initSenderForm() {
    const form = document.getElementById('create-greeting-form');
    const nameInput = document.getElementById('recipient-name');
    const messageInput = document.getElementById('personal-message');
    const charCounter = document.getElementById('msg-char-counter');
    const submitBtn = document.getElementById('btn-generate');
    const nameGroup = document.getElementById('name-form-group');
    const msgGroup = document.getElementById('msg-form-group');

    if (!form || !nameInput || !submitBtn) return;

    // Live character counter for personal message
    if (messageInput && charCounter) {
      messageInput.addEventListener('input', () => {
        const len = messageInput.value.length;
        charCounter.textContent = `${len} / 500`;
        if (len > 500) {
          msgGroup.classList.add('has-error');
          charCounter.style.color = '#ff5252';
        } else {
          msgGroup.classList.remove('has-error');
          charCounter.style.color = '';
        }
      });
    }

    // Clear error on input
    nameInput.addEventListener('input', () => {
      if (nameInput.value.trim().length > 0) {
        nameGroup.classList.remove('has-error');
      }
    });

    // Form Submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = nameInput.value.trim();
      const message = messageInput ? messageInput.value.trim() : '';

      // Validate Name
      if (!name) {
        nameGroup.classList.add('has-error');
        nameInput.focus();
        return;
      }
      if (name.length > 100) {
        nameGroup.classList.add('has-error');
        return;
      }

      // Validate Message length
      if (message.length > 500) {
        msgGroup.classList.add('has-error');
        return;
      }

      // Button Loading State
      const originalBtnHtml = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span class="spinner"></span> Creating Magic...`;

      try {
        const result = await window.SupabaseDB.saveGreeting(name, message);
        currentGreeting = result;

        // Save last greeting ID in sessionStorage for page refresh persistence
        try {
          sessionStorage.setItem('last_created_greeting_id', result.id);
        } catch (e) {}

        displayResult(result);
      } catch (err) {
        console.error('Error generating greeting:', err);
        window.showToast(err.message || 'Could not generate surprise link. Please try again.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
      }
    });
  }

  function displayResult(greeting) {
    const resultCard = document.getElementById('result-card');
    const linkInput = document.getElementById('generated-link-input');
    const previewName = document.getElementById('preview-recipient-name');
    const previewMsg = document.getElementById('preview-personal-msg');
    const previewBtn = document.getElementById('btn-preview-link');

    if (!resultCard || !linkInput) return;

    const fullUrl = CONFIG.getSurpriseUrl(greeting.id);
    linkInput.value = fullUrl;

    if (previewName) {
      previewName.textContent = greeting.recipientName;
    }

    if (previewMsg) {
      if (greeting.personalMessage) {
        previewMsg.textContent = `"${greeting.personalMessage}"`;
        previewMsg.style.display = 'block';
      } else {
        previewMsg.style.display = 'none';
      }
    }

    if (previewBtn) {
      previewBtn.href = fullUrl;
    }

    // Attach social sharing events
    wireShareButtons(fullUrl, greeting.recipientName);

    resultCard.classList.add('active');
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.showToast('Your Diwali Surprise link is ready! 🪔');
  }

  function wireShareButtons(url, recipientName) {
    const copyBtn = document.getElementById('btn-copy-link');
    const waBtn = document.getElementById('btn-share-whatsapp');
    const igBtn = document.getElementById('btn-share-instagram');
    const fbBtn = document.getElementById('btn-share-facebook');
    const tgBtn = document.getElementById('btn-share-telegram');
    const xBtn = document.getElementById('btn-share-x');
    const smsBtn = document.getElementById('btn-share-sms');
    const emailBtn = document.getElementById('btn-share-email');
    const nativeBtn = document.getElementById('btn-share-native');

    if (copyBtn) {
      copyBtn.onclick = () => window.ShareEngine.copyLink(url);
    }
    if (waBtn) {
      waBtn.onclick = () => window.ShareEngine.shareWhatsApp(url, recipientName);
    }
    if (igBtn) {
      igBtn.onclick = () => window.ShareEngine.shareInstagram(url, recipientName);
    }
    if (fbBtn) {
      fbBtn.onclick = () => window.ShareEngine.shareFacebook(url);
    }
    if (tgBtn) {
      tgBtn.onclick = () => window.ShareEngine.shareTelegram(url, recipientName);
    }
    if (xBtn) {
      xBtn.onclick = () => window.ShareEngine.shareX(url, recipientName);
    }
    if (smsBtn) {
      smsBtn.onclick = () => window.ShareEngine.shareSMS(url, recipientName);
    }
    if (emailBtn) {
      emailBtn.onclick = () => window.ShareEngine.shareEmail(url, recipientName);
    }
    if (nativeBtn) {
      nativeBtn.onclick = () => window.ShareEngine.shareNative(url, recipientName);
    }
  }

  // Restore greeting if user refreshed page after creating
  async function checkExistingState() {
    try {
      const lastId = sessionStorage.getItem('last_created_greeting_id');
      if (lastId) {
        const greeting = await window.SupabaseDB.getGreeting(lastId);
        if (greeting) {
          displayResult(greeting);
        }
      }
    } catch (e) {}
  }

  // Modals for Privacy Policy & Terms
  function initModals() {
    const openPrivacyBtn = document.getElementById('btn-privacy-modal');
    const openTermsBtn = document.getElementById('btn-terms-modal');
    const privacyModal = document.getElementById('privacy-modal');
    const termsModal = document.getElementById('terms-modal');

    function bindModal(btn, modal) {
      if (!btn || !modal) return;
      const closeBtn = modal.querySelector('.modal-close');
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        modal.classList.add('active');
      });
      if (closeBtn) {
        closeBtn.addEventListener('click', () => modal.classList.remove('active'));
      }
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
      });
    }

    bindModal(openPrivacyBtn, privacyModal);
    bindModal(openTermsBtn, termsModal);
  }
})();
