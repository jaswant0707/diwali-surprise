/**
 * Diwali Surprise - Feedback and 5-Star Rating Controller
 * Interactive star rating with dynamic labels and Supabase submission
 * Author: Jaswant Yadav (@jaswant_0707)
 */

(function () {
  'use strict';

  const ratingDescriptions = {
    1: 'Poor 😞',
    2: 'Fair 😐',
    3: 'Good 🙂',
    4: 'Very Good 😊',
    5: 'Excellent! 🌟'
  };

  let selectedRating = 5;

  document.addEventListener('DOMContentLoaded', () => {
    initStarRating();
    initFeedbackForm();
  });

  function initStarRating() {
    const starContainer = document.getElementById('star-rating-group');
    const ratingLabel = document.getElementById('rating-description-label');
    const ratingInput = document.getElementById('feedback-rating-val');

    if (!starContainer) return;
    const stars = starContainer.querySelectorAll('.star-btn');

    function updateStars(val) {
      stars.forEach(star => {
        const starVal = parseInt(star.getAttribute('data-value'), 10);
        if (starVal <= val) {
          star.classList.add('selected');
        } else {
          star.classList.remove('selected');
        }
      });
      if (ratingLabel) {
        ratingLabel.textContent = ratingDescriptions[val] || '';
      }
      if (ratingInput) {
        ratingInput.value = val;
      }
    }

    // Default 5 stars
    updateStars(selectedRating);

    stars.forEach(star => {
      // Hover effect
      star.addEventListener('mouseenter', () => {
        const hoverVal = parseInt(star.getAttribute('data-value'), 10);
        stars.forEach(s => {
          const v = parseInt(s.getAttribute('data-value'), 10);
          if (v <= hoverVal) s.classList.add('hovered');
          else s.classList.remove('hovered');
        });
        if (ratingLabel) ratingLabel.textContent = ratingDescriptions[hoverVal] || '';
      });

      // Hover leave - restore selected
      star.addEventListener('mouseleave', () => {
        stars.forEach(s => s.classList.remove('hovered'));
        if (ratingLabel) ratingLabel.textContent = ratingDescriptions[selectedRating] || '';
      });

      // Click select
      star.addEventListener('click', (e) => {
        e.preventDefault();
        selectedRating = parseInt(star.getAttribute('data-value'), 10);
        updateStars(selectedRating);
      });
    });
  }

  function initFeedbackForm() {
    const form = document.getElementById('feedback-form');
    const nameInput = document.getElementById('fb-fullname');
    const emailInput = document.getElementById('fb-email');
    const phoneInput = document.getElementById('fb-phone');
    const messageInput = document.getElementById('fb-message');
    const charCounter = document.getElementById('fb-char-counter');
    const submitBtn = document.getElementById('btn-submit-feedback');
    const successBox = document.getElementById('feedback-success-box');

    if (!form || !submitBtn) return;

    // Live character counter
    if (messageInput && charCounter) {
      messageInput.addEventListener('input', () => {
        const len = messageInput.value.length;
        charCounter.textContent = `${len} / 1000`;
        if (len > 1000) {
          charCounter.style.color = '#ff5252';
        } else {
          charCounter.style.color = '';
        }
      });
    }

    // Submission handler
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const fullName = nameInput.value.trim();
      const email = emailInput.value.trim();
      const phone = phoneInput ? phoneInput.value.trim() : '';
      const message = messageInput.value.trim();

      // Basic client validations
      if (!fullName) {
        window.showToast('Please enter your full name.');
        nameInput.focus();
        return;
      }

      if (!email || !email.includes('@') || !email.includes('.')) {
        window.showToast('Please enter a valid email address.');
        emailInput.focus();
        return;
      }

      if (phone && phone.length > 0 && !/^[0-9+\s-]{7,20}$/.test(phone)) {
        window.showToast('Please enter a valid phone number or leave it blank.');
        phoneInput.focus();
        return;
      }

      if (!message || message.length < 3) {
        window.showToast('Please write a message of at least 3 characters.');
        messageInput.focus();
        return;
      }

      // Submit state
      const origText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span class="spinner"></span> Submitting...`;

      try {
        await window.SupabaseDB.submitFeedback({
          fullName,
          email,
          phone,
          rating: selectedRating,
          message
        });

        // Show success confirmation
        form.style.display = 'none';
        if (successBox) {
          successBox.style.display = 'block';
          successBox.scrollIntoView({ behavior: 'smooth' });
        }
        window.showToast('Thank you for your feedback! ❤️');
      } catch (err) {
        console.error('Feedback submission error:', err);
        window.showToast(err.message || 'Submission failed. Please try again.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = origText;
      }
    });
  }
})();
