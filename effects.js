// Add this as a new file to keep your effects organized

// Main function to trigger effects
function triggerEffect(effectName, scene) {
  console.log(`Triggering effect: ${effectName}`);
  
  switch(effectName) {
    case 'blackout':
      createBlackout(scene.prompt || "Thanks for hearing me out at all. Door's always open.");
      break;
    case 'confetti':
      createConfetti(150, true);
      break;
    case 'softConfetti':
      createConfetti(60, false);
      break;
    case 'softGlow':
      createGlow();
      break;
    case 'lockUI':
      lockUserInterface();
      break;
    default:
      console.warn(`Unknown effect: ${effectName}`);
  }
}

// Create blackout overlay that properly covers everything
function createBlackout(message) {
  // Remove any existing blackout
  const existing = document.querySelector('.blackout-overlay');
  if (existing) existing.remove();
  
  const overlay = document.createElement('div');
  overlay.className = 'blackout-overlay';
  overlay.innerHTML = `<div class="blackout-message">${message}</div>`;
  document.body.appendChild(overlay);
  
  // Force reflow before adding the show class
  overlay.offsetHeight;
  overlay.classList.add('show');
  
  // Remove after display time
  setTimeout(() => {
    overlay.classList.remove('show');
    setTimeout(() => overlay.remove(), 800);
  }, 3000);
}

// Create confetti effect
function createConfetti(count, isIntense) {
  // Clear any existing confetti
  const existing = document.querySelector('.confetti-container');
  if (existing) existing.remove();
  
  const container = document.createElement('div');
  container.className = 'confetti-container';
  document.body.appendChild(container);
  
  const colors = ['#ff718d', '#fdff6a', '#5dfdcb', '#7cb2ff', '#cb6eff'];
  
  for (let i = 0; i < count; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti-piece';
    
    // Randomize properties
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = Math.random() * 10 + 5;
    const left = Math.random() * 100;
    const duration = Math.random() * 3 + 2;
    const delay = Math.random() * 2;
    
    // Apply styles
    confetti.style.backgroundColor = color;
    confetti.style.width = `${size}px`;
    confetti.style.height = `${size}px`;
    confetti.style.left = `${left}vw`;
    confetti.style.animationDuration = `${duration}s`;
    confetti.style.animationDelay = `${delay}s`;
    confetti.style.opacity = isIntense ? '0.9' : '0.7';
    
    // Random shape
    if (Math.random() > 0.6) {
      confetti.style.borderRadius = '50%';
    } else if (Math.random() > 0.5) {
      confetti.style.transform = 'rotate(45deg)';
    }
    
    container.appendChild(confetti);
  }
  
  // Apply pulse effect to card for intense confetti
  if (isIntense) {
    const card = document.getElementById('card');
    card.classList.add('pulse-effect');
    setTimeout(() => card.classList.remove('pulse-effect'), 1500);
  }
  
  // Clean up after animation completes
  setTimeout(() => {
    container.classList.add('fade-out');
    setTimeout(() => container.remove(), 1000);
  }, 7000);
}

// Create glow effect around the card
function createGlow() {
  const card = document.getElementById('card');
  
  // Remove existing glow if present
  card.classList.remove('glow-effect', 'glow-fade');
  
  // Force reflow then add glow
  card.offsetHeight;
  card.classList.add('glow-effect');
  
  // Fade out the glow
  setTimeout(() => {
    card.classList.add('glow-fade');
    setTimeout(() => {
      card.classList.remove('glow-effect', 'glow-fade');
    }, 3000);
  }, 1500);
}

// Lock the UI
function lockUserInterface() {
  const backBtn = document.getElementById('backBtn');
  if (backBtn) {
    backBtn.style.visibility = 'hidden';
    backBtn.disabled = true;
  }
}