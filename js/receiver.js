/**
 * Diwali Surprise - Receiver Experience Controller
 * Orchestrates Gift Box opening, Web Audio unlock on interaction, and continuous Fireworks celebration
 * Author: Jaswant Yadav (@jaswant_0707)
 */

(function () {
  'use strict';

  let greetingData = null;
  let isCelebrationStarted = false;

  document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Canvas Fireworks Engine immediately
    if (window.FireworksEngine) {
      window.FireworksEngine.init();
    }

    // 2. Immediately bind interaction events to Open Button & Gift Box
    bindOpenEvents();

    // 3. Fetch Greeting from Supabase by URL query parameter
    loadGreetingData();
  });

  function bindOpenEvents() {
    const openBtn = document.getElementById('btn-open-surprise');
    const giftBox = document.getElementById('gift-box-wrapper');
    const soundBtn = document.getElementById('btn-sound-toggle');

    function onTriggerClick(e) {
      if (e) e.preventDefault();

      // Synchronously unlock Web Audio API directly in user gesture callstack
      if (window.FireworksEngine && window.FireworksEngine.unlockAudio) {
        window.FireworksEngine.unlockAudio();
      } else if (window.SoundEngine && window.SoundEngine.unlockAudio) {
        window.SoundEngine.unlockAudio();
      }

      startCelebration();
    }

    if (openBtn) {
      openBtn.addEventListener('click', onTriggerClick);
    }
    if (giftBox) {
      giftBox.addEventListener('click', onTriggerClick);
    }

    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        if (!window.FireworksEngine) return;
        const soundEnabled = window.FireworksEngine.toggleSound();
        updateSoundIcon(!soundEnabled);
      });
    }
  }

  async function loadGreetingData() {
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

      applyGreetingToDOM(greetingData);
    } catch (err) {
      console.warn('Network issue loading greeting, checking cache:', err);
      if (!greetingData) {
        showErrorScreen('Unable to Load Surprise', 'A network error occurred while loading this greeting. Please check your connection and refresh.');
      }
    }
  }

  function applyGreetingToDOM(greeting) {
    const recipientBadge = document.getElementById('invitation-recipient-badge');
    const greetingTitle = document.getElementById('celebration-recipient-title');
    const senderMsgBox = document.getElementById('sender-message-box');
    const senderMsgText = document.getElementById('sender-message-text');

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
  }

  function startCelebration() {
    if (isCelebrationStarted) return;
    isCelebrationStarted = true;

    // STEP 1: Gift box opening animation
    const giftBox = document.getElementById('gift-box-wrapper');
    if (giftBox) {
      giftBox.classList.add('opening');
    }

    // STEP 2: Start original fireworks engine immediately
    if (window.FireworksEngine) {
      window.FireworksEngine.start();
    }

    // STEP 3: Fade invitation screen smoothly
    const invitationScreen = document.getElementById('invitation-screen');
    if (invitationScreen) {
      invitationScreen.classList.add('opened');
    }

    // STEP 4: Reveal personalized greeting card & bottom CTA
    setTimeout(() => {
      const greetingOverlay = document.getElementById('greeting-overlay');
      const bottomBar = document.getElementById('bottom-bar');
      if (greetingOverlay) greetingOverlay.classList.add('visible');
      if (bottomBar) bottomBar.classList.add('visible');
    }, 400);
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
