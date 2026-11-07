/**
 * Diwali Surprise - Multi-Platform Social Sharing Module
 * Supports WhatsApp, Instagram, Facebook, Telegram, X, SMS, Email, Native Share, and Clipboard
 * Author: Jaswant Yadav (@jaswant_0707)
 */

(function () {
  'use strict';

  function showToast(message, duration = 3000) {
    let toast = document.getElementById('app-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'app-toast';
      toast.className = 'app-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  }

  async function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (e) {
        // Fallback below
      }
    }
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    let success = false;
    try {
      success = document.execCommand('copy');
    } catch (err) {
      console.warn('execCommand copy failed:', err);
    }
    document.body.removeChild(textArea);
    return success;
  }

  const ShareEngine = {
    /**
     * Get preformatted sharing texts
     */
    getShareData(url, recipientName) {
      const name = (recipientName || '').trim();
      const greeting = name ? `for ${name}` : 'for you';
      const text = `Hey! 🪔✨ Someone has created a special Diwali surprise ${greeting}. Open this link and discover your surprise:`;
      const title = `Diwali Surprise ${name ? `for ${name}` : ''} ✨`;
      return { title, text, url };
    },

    /**
     * WhatsApp
     */
    shareWhatsApp(url, recipientName) {
      const { text } = this.getShareData(url, recipientName);
      const fullMsg = `${text}\n${url}`;
      const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(fullMsg)}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    },

    /**
     * Facebook
     */
    shareFacebook(url) {
      const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
      window.open(fbUrl, '_blank', 'noopener,noreferrer,width=600,height=400');
    },

    /**
     * Telegram
     */
    shareTelegram(url, recipientName) {
      const { text } = this.getShareData(url, recipientName);
      const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
      window.open(tgUrl, '_blank', 'noopener,noreferrer');
    },

    /**
     * X (Twitter)
     */
    shareX(url, recipientName) {
      const { text } = this.getShareData(url, recipientName);
      const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&hashtags=DiwaliSurprise,HappyDiwali,FestivalOfLights`;
      window.open(xUrl, '_blank', 'noopener,noreferrer,width=600,height=400');
    },

    /**
     * SMS
     */
    shareSMS(url, recipientName) {
      const { text } = this.getShareData(url, recipientName);
      const body = `${text} ${url}`;
      // Cross-platform SMS URI scheme
      const smsUrl = `sms:?&body=${encodeURIComponent(body)}`;
      window.location.href = smsUrl;
    },

    /**
     * Email
     */
    shareEmail(url, recipientName) {
      const { title, text } = this.getShareData(url, recipientName);
      const body = `${text}\n\n${url}\n\nWishing you a joyful, prosperous, and light-filled Diwali! 🪔✨`;
      const mailtoUrl = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailtoUrl;
    },

    /**
     * Instagram action (Native share if supported, or copy link with guidance)
     */
    async shareInstagram(url, recipientName) {
      const copied = await copyToClipboard(url);
      if (copied) {
        showToast('Link copied for Instagram! 📸 Paste it in DM or Story.');
      } else {
        showToast('Please copy the link above to share on Instagram.');
      }
    },

    /**
     * Native Web Share API
     */
    async shareNative(url, recipientName) {
      const { title, text } = this.getShareData(url, recipientName);
      if (navigator.share) {
        try {
          await navigator.share({
            title,
            text,
            url
          });
          return true;
        } catch (err) {
          if (err.name !== 'AbortError') {
            console.warn('Native share failed:', err);
          }
        }
      }
      // Fallback: copy link
      return this.copyLink(url);
    },

    /**
     * Copy link with instant toast feedback
     */
    async copyLink(url) {
      const success = await copyToClipboard(url);
      if (success) {
        showToast('Link copied to clipboard! 📋');
      } else {
        showToast('Failed to copy. Please manually select the URL.');
      }
      return success;
    }
  };

  window.ShareEngine = ShareEngine;
  window.showToast = showToast;
})();
