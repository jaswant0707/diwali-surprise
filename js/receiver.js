/**
 * Diwali Surprise - Receiver Experience Controller
 * Orchestrates Gift Box opening, Web Audio unlock on interaction, and full-screen Fireworks celebration
 * Author: Jaswant Yadav (@jaswant_0707)
 */

(function () {
  'use strict';

  let greetingData = null;
  let isCelebrationStarted = false;

  document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize Canvas Fireworks Engine
    if (window.FireworksEngine) {
      window.FireworksEngine.init();
    }

    // 2. Fetch Greeting from Supabase by URL query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const greetingId = urlParams.get('id');

    if (!greetingId) {
      showErrorScreen('Missing Greeting Link', 'Please ask the sender for a valid Diwali surprise link or create your own below.');
      return;
    }

    try {
      greetingData = await window.SupabaseDB.getGreeting(greetingId);
      if (!greetingData) {
        showErrorScreen('Greeting Not Found or Expired', 'This surprise link may have expired or does not exist. You can create a new surprise anytime!');
        return;
      }

      setupInvitation(greetingData);
    } catch (err) {
      console.error('Failed to load greeting:', err);
      showErrorScreen('Unable to Load Surprise', 'A network error occurred while loading this greeting. Please check your connection and refresh.');
    }
  });

  function setupInvitation(greeting) {
    const recipientBadge = document.getElementById('invitation-recipient-badge');
    const greetingTitle = document.getElementById('celebration-recipient-title');
    const senderMsgBox = document.getElementById('sender-message-box');
    const senderMsgText = document.getElementById('sender-message-text');
    const openBtn = document.getElementById('btn-open-surprise');
    const giftBox = document.getElementById('gift-box-wrapper');
    const soundBtn = document.getElementById('btn-sound-toggle');

    // Update dynamic texts using safe textContent (prevents XSS)
    if (recipientBadge) {
      recipientBadge.textContent = `Especially for ${greeting.recipientName} ✨`;
    }

    if (greetingTitle) {
      greetingTitle.textContent = `✨ Happy Diwali, ${greeting.recipientName}! ✨`;
    }

    if (senderMsgBox && senderMsgText) {
      if (greeting.personalMessage && greeting.personalMessage.trim()) {
        senderMsgText.textContent = `"${greeting.personalMessage.trim()}"`;
        senderMsgBox.style.display = 'block';
      } else {
        senderMsgBox.style.display = 'none';
      }
    }

    // Sound toggle listener
    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        if (!window.SoundEngine) return;
        const muted = window.SoundEngine.toggleMute();
        updateSoundIcon(muted);
      });
    }

    // Interaction triggers: Click Open Button OR Click Gift Box
    if (openBtn) {
      openBtn.addEventListener('click', startCelebration);
    }
    if (giftBox) {
      giftBox.addEventListener('click', startCelebration);
    }
  }

  async function startCelebration() {
    if (isCelebrationStarted) return;
    isCelebrationStarted = true;

    // STEP 1: Unlock Web Audio API directly inside user click handler
    if (window.SoundEngine) {
      try {
        await window.SoundEngine.unlockAudio();
      } catch (e) {
        console.warn('Audio unlock handled with fallback:', e);
      }
    }

    // STEP 2: Gift box opening animation
    const giftBox = document.getElementById('gift-box-wrapper');
    if (giftBox) {
      giftBox.classList.add('opening');
    }

    // STEP 3: Smooth transition into celebration
    setTimeout(() => {
      const invitationScreen = document.getElementById('invitation-screen');
      if (invitationScreen) {
        invitationScreen.classList.add('opened');
      }

      // STEP 4: Start fireworks engine
      if (window.FireworksEngine) {
        window.FireworksEngine.start();
        // Trigger initial celebratory finale burst
        setTimeout(() => {
          window.FireworksEngine.triggerFinale();
        }, 600);
      }

      // STEP 5: Reveal personalized greeting card
      setTimeout(() => {
        const greetingOverlay = document.getElementById('greeting-overlay');
        const bottomBar = document.getElementById('bottom-bar');
        if (greetingOverlay) greetingOverlay.classList.add('visible');
        if (bottomBar) bottomBar.classList.add('visible');
      }, 700);
    }, 450);
  }

  function updateSoundIcon(isMuted) {
    const iconOn = document.getElementById('icon-sound-on');
    const iconOff = document.getElementById('icon-sound-off');
    if (iconOn && iconOff) {
      if (isMuted) {
        iconOn.style.display = 'none';
        iconOff.style.display = 'block';
      } else {
        iconOn.style.display = 'block';
        iconOff.style.display = 'none';
      }
    }
  }

  function showErrorScreen(title, message) {
    const invitationScreen = document.getElementById('invitation-screen');
    const errorScreen = document.getElementById('error-screen');
    const errorTitle = document.getElementById('error-title');
    const errorMsg = document.getElementById('error-message');

    if (invitationScreen) invitationScreen.style.display = 'none';
    if (errorTitle) errorTitle.textContent = title;
    if (errorMsg) errorMsg.textContent = message;
    if (errorScreen) errorScreen.style.display = 'flex';
  }
})();
