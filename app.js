/* Skibidi — Cozy Gremlin flow
   - Smooth scene engine
   - Typewriter on every prompt (click to fast-forward)
   - Animated button skin (from styles-button.css) with per-button color variants
   - Gremlin tricks: dodge, morph, shrink-poof, swap-on-hover, hover-morph-to-overreact
   - Lottie confetti on final "Yes"
   - Emoji GIF sits above buttons; you’ll plug your files into the emojiMap below
*/

(() => {
  // DOM
  const sceneWrap = document.getElementById("scene");
  const promptBtn = document.getElementById("prompt");
  const emojiImg = document.getElementById("emoji");
  const startWrap = document.getElementById("startWrap");
  const btnStart = document.getElementById("btnStart");
  const choicesWrap = document.getElementById("choices");
  let btnPrimary = document.getElementById("btnPrimary");
  let btnSecondary = document.getElementById("btnSecondary");
  const aside = document.getElementById("aside");
  const sceneIndexEl = document.getElementById("sceneIndex");
  const confettiRoot = document.getElementById("confetti-root");

  // Smooth transitions on the scene container
  sceneWrap.style.transition = "opacity 220ms ease, transform 220ms ease";

  // State
  let current = 0;
  let typing = false;
  let typeController = null;
  let pleaseCount = 0;

  // Emoji map — put your GIFs in assets/emoji/ and update filenames here
  const emojiMap = {
    0: "wave.gif",           // 👋 hello
    1: "smile.gif",          // 🙂 chill
    2: "sweat.gif",          // 😬 when chasing "Yes"
    3: "upside.gif",         // 🙃 cheeky
    4: "halo.gif",           // 😇 hopeful
    5: "smirk.gif",          // 😏 playful
    6: "melt.gif",           // 🫠 comic humility
    7: "relief.gif",         // 🙂 relief
    8: "salute.gif",         // 🫡 sincere
    9: "sincere.gif",        // 🙂 genuine
    "party": "party.png",    // 🎉 celebration (optional, will briefly swap on accept)
    "plead": "plead.png"     // 🥺 during "Please" loop (optional)
  };

  const lottieConfettiPath = "assets/lottie/Confetti.json";

  // Helpers --------------------------------------------------------------

  function setVariants(primaryVariant, secondaryVariant) {
    setVariant(btnPrimary, primaryVariant);
    if (btnSecondary) setVariant(btnSecondary, secondaryVariant);
  }

  function setVariant(btn, variant) {
    btn.classList.remove("btn--cherry", "btn--blue", "btn--purple", "btn--glass");
    if (!variant) return;
    btn.classList.add(`btn--${variant}`);
  }

  function disableAll(disabled) {
    // start + choices buttons
    if (btnStart) btnStart.disabled = disabled;
    if (btnPrimary) btnPrimary.disabled = disabled;
    if (btnSecondary) btnSecondary.disabled = disabled;
  }

  function clearAside() {
    aside.textContent = "";
  }

  function setAside(text) {
    aside.textContent = text || "";
  }

  async function fadeSwap(renderFn) {
    sceneWrap.style.opacity = "0";
    sceneWrap.style.transform = "translateY(6px)";
    await wait(200);
    renderFn();
    await wait(20);
    sceneWrap.style.opacity = "1";
    sceneWrap.style.transform = "translateY(0)";
  }

  function wait(ms) {
    return new Promise((res) => setTimeout(res, ms));
  }

  function setEmojiForScene(index) {
    const file = emojiMap[index] || emojiMap[1];
    emojiImg.src = `assets/emoji/${file}`;
  }

  // Typewriter with fast-forward on click
  async function typeText(el, text) {
    typing = true;
    if (typeController && typeController.cleanup) typeController.cleanup();
    let index = 0;
    let done = false;

    const full = text ?? "";
    el.textContent = "";
    disableAll(true);

    const skip = () => {
      if (done) return;
      index = full.length;
      el.textContent = full;
      done = true;
      typing = false;
      disableAll(false);
      promptBtn.removeEventListener("click", skip);
    };
    promptBtn.addEventListener("click", skip);
    typeController = { cleanup: () => promptBtn.removeEventListener("click", skip) };

    while (!done && index < full.length) {
      el.textContent += full.charAt(index);
      index++;
      // Cadence: quick type, small pauses on punctuation
      let delay = 22 + Math.random() * 18;
      const ch = full.charAt(index - 1);
      if (",.;:!?—…".includes(ch)) delay += 90 + Math.random() * 120;
      await wait(delay);
    }

    if (!done) {
      done = true;
      typing = false;
      disableAll(false);
      promptBtn.removeEventListener("click", skip);
    }
  }

  // Replace buttons to drop old listeners cleanly
  function resetButtons() {
    // Primary
    const newPrimary = btnPrimary.cloneNode(true);
    btnPrimary.parentNode.replaceChild(newPrimary, btnPrimary);
    btnPrimary = newPrimary;

    // Secondary
    const newSecondary = btnSecondary.cloneNode(true);
    btnSecondary.parentNode.replaceChild(newSecondary, btnSecondary);
    btnSecondary = newSecondary;

    // Reset transforms and inline styles that tricks may add
    [btnPrimary, btnSecondary].forEach((btn) => {
      btn.style.transform = "";
      btn.style.transition = "transform 160ms ease";
      btn.dataset.scale = "";
    });
  }

  // Trick: Evasive/dodging button (runs forever)
  function attachDodge(btn, areaEl = sceneWrap) {
    let running = true;
    let offsetX = 0;
    let offsetY = 0;

    function moveAway(mx, my) {
      const rect = btn.getBoundingClientRect();
      const ar = areaEl.getBoundingClientRect();

      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      const dx = cx - mx;
      const dy = cy - my;
      const dist = Math.hypot(dx, dy) || 1;

      const threshold = 140; // px
      if (dist < threshold) {
        const push = (threshold - dist) * 1.2;
        // Normalized direction away from cursor
        let nx = dx / dist;
        let ny = dy / dist;

        // Compute new offsets
        offsetX += nx * push;
        offsetY += ny * push;

        // Constrain so the button stays roughly in the card area
        const maxX = (ar.width / 2) - 80;
        const maxY = (ar.height / 2) - 80;
        offsetX = clamp(offsetX, -maxX, maxX);
        offsetY = clamp(offsetY, -maxY, maxY);

        btn.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
      }
    }

    function onMove(e) {
      if (!running) return;
      const mx = e.clientX;
      const my = e.clientY;
      moveAway(mx, my);
    }

    areaEl.addEventListener("mousemove", onMove);
    // Cleanup on new scene
    return () => {
      running = false;
      areaEl.removeEventListener("mousemove", onMove);
      btn.style.transform = "";
    };
  }

  // Trick: Hovering 'Yes' morphs to 'No' (click always counts as No)
  function attachMorphYesToNo(btn, onNoSelected) {
    const orig = btn.textContent;
    let hovered = false;

    function wiggle() {
      btn.animate(
        [
          { transform: "translateY(0)" },
          { transform: "translateY(-2px)" },
          { transform: "translateY(0)" }
        ],
        { duration: 180, easing: "ease-out" }
      );
    }

    const onEnter = () => {
      hovered = true;
      btn.textContent = "No";
      setVariant(btn, "cherry");
      wiggle();
    };
    const onLeave = () => {
      hovered = false;
      btn.textContent = orig;
      setVariant(btn, "purple");
    };
    const onClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Treat as No selection
      onNoSelected();
    };

    btn.addEventListener("mouseenter", onEnter);
    btn.addEventListener("mouseleave", onLeave);
    btn.addEventListener("click", onClick);

    return () => {
      btn.removeEventListener("mouseenter", onEnter);
      btn.removeEventListener("mouseleave", onLeave);
      btn.removeEventListener("click", onClick);
      btn.textContent = orig;
    };
  }

  // Trick: Shrink button on every click until it disappears (no cap)
  function attachShrinkPoof(btn) {
    btn.dataset.scale = "1";
    function onClick(e) {
      e.preventDefault();
      e.stopPropagation();
      const cur = parseFloat(btn.dataset.scale || "1");
      const next = cur * 0.85;
      btn.dataset.scale = String(next);
      btn.style.transform = `scale(${next})`;
      if (next <= 0.1) {
        btn.style.display = "none";
        setAside("RIP 'No'.");
      }
    }
    btn.addEventListener("click", onClick);
    return () => btn.removeEventListener("click", onClick);
  }

  // Trick: Hovering 'Yes' swaps positions with 'No' (forever)
  function attachSwapOnHover(yesBtn) {
    function onEnter() {
      // Swap the order of the two buttons
      if (!btnSecondary || !btnPrimary) return;
      const parent = choicesWrap;
      const nodes = Array.from(parent.children);
      // Toggle order by re-inserting
      parent.insertBefore(nodes[1], nodes[0]);
      // Little hop animation
      nodes.forEach((n) => {
        n.animate(
          [{ transform: "translateY(0)" }, { transform: "translateY(-3px)" }, { transform: "translateY(0)" }],
          { duration: 180, easing: "ease-out" }
        );
      });
    }
    yesBtn.addEventListener("mouseenter", onEnter);
    return () => yesBtn.removeEventListener("mouseenter", onEnter);
  }

  // Trick: Both buttons morph to "I did overreact" on hover; brief delay to arm
  function attachMorphOverreact(primaryHandler) {
    const label = "Hm, I get you though.";

    const armTime = 220;
    const setMorph = (btn) => {
      let armedAt = 0;
      const onEnter = () => {
        btn.textContent = label;
        setVariant(btn, "cherry");
        armedAt = Date.now();
        btn.animate(
          [{ transform: "translateY(0)" }, { transform: "translateY(-2px)" }, { transform: "translateY(0)" }],
          { duration: 160, easing: "ease-out" }
        );
      };
      const onLeave = () => {
        // optional: keep the morphed label; we’ll reset on next scene anyway
      };
      const onClick = (e) => {
        const elapsed = Date.now() - armedAt;
        if (elapsed < armTime) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        primaryHandler(); // proceed regardless of which was clicked
      };

      btn.addEventListener("mouseenter", onEnter);
      btn.addEventListener("mouseleave", onLeave);
      btn.addEventListener("click", onClick);
      return () => {
        btn.removeEventListener("mouseenter", onEnter);
        btn.removeEventListener("mouseleave", onLeave);
        btn.removeEventListener("click", onClick);
      };
    };

    const cleanA = setMorph(btnPrimary);
    const cleanB = setMorph(btnSecondary);
    return () => {
      cleanA();
      cleanB();
    };
  }

  // Trick: Clicking Yes morphs to "Just a little — no biggie" then proceed
  function attachMorphYesSoften(yesBtn, proceed, afterMs = 560) {
    function onClick(e) {
      e.preventDefault();
      e.stopPropagation();
      yesBtn.textContent = "Just a little — no biggie.";
      yesBtn.animate(
        [{ transform: "scale(1)" }, { transform: "scale(1.03)" }, { transform: "scale(1)" }],
        { duration: 200, easing: "ease-out" }
      );
      setTimeout(proceed, afterMs);
    }
    yesBtn.addEventListener("click", onClick);
    return () => yesBtn.removeEventListener("click", onClick);
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  // Confetti (Lottie)
  function fireConfetti() {
    if (!window.lottie) return;
    confettiRoot.innerHTML = "";
    const anim = lottie.loadAnimation({
      container: confettiRoot,
      renderer: "svg",
      loop: false,
      autoplay: true,
      path: lottieConfettiPath
    });
    anim.addEventListener("complete", () => {
      setTimeout(() => {
        anim.destroy();
        confettiRoot.innerHTML = "";
      }, 300);
    });
  }

  // Scene definitions ----------------------------------------------------

  const scenes = [
    // 0 — Splash
    {
      prompt: "Ready?",
      emoji: 0,
      type: "start"
    },
    // 1 — Vibe check
    {
      prompt: "Quick vibe check — how are we?",
      emoji: 1,
      type: "choices",
      primaryLabel: "Good",
      primaryVariant: "blue",
      secondaryLabel: "Not great",
      secondaryVariant: "blue",
      handlePrimary: () => {
        // Optional aside could be: “Nice. Also… about earlier — I should own that.”
        go(2);
      },
      handleSecondary: () => {
        // Optional aside: “Fair. Probably because of what I said — I should own that.”
        go(2);
      }
    },
    // 2 — Did I actually do something wrong? (Yes dodges forever)
    {
      prompt: "Be honest — did I actually do something wrong?",
      emoji: 2,
      type: "choices",
      primaryLabel: "No",
      primaryVariant: "cherry", // intended click
      secondaryLabel: "Yes",
      secondaryVariant: "purple", // evasive
      trick: "dodge",
      handlePrimary: () => go(3)
    },
    // 3 — Was it really that bad? (Yes morphs to No on hover)
    {
      prompt: "Okay but… was it really that bad?",
      emoji: 3,
      type: "choices",
      primaryLabel: "No",
      primaryVariant: "cherry", // intended
      secondaryLabel: "Yes",
      secondaryVariant: "purple", // morphs to No
      trick: "morphYesToNo",
      handlePrimary: () => go(4),
      // Clicking secondary should act as No as well
      handleSecondaryAsNo: () => go(4)
    },
    // 4 — Honest mistake? (No shrinks to oblivion)
    {
      prompt: "Let’s be real — was it a completely honest mistake?",
      emoji: 4,
      type: "choices",
      primaryLabel: "Yes",
      primaryVariant: "cherry", // intended
      secondaryLabel: "No",
      secondaryVariant: "purple", // shrink-poof
      trick: "shrinkPoof",
      handlePrimary: () => {
        setAside("See? You’re starting to get me now.");
        go(5);
      }
    },
    // 5 — Was I the only one to blame? (Yes swaps on hover forever)
    {
      prompt: "I wasn’t the only one to blame… right?",
      emoji: 5,
      type: "choices",
      primaryLabel: "No",
      primaryVariant: "cherry", // intended
      secondaryLabel: "Yes",
      secondaryVariant: "purple", // swap on hover
      trick: "swapOnHover",
      handlePrimary: () => {
        setAside("Knew it. Shared responsibility.");
        go(6);
      }
    },
    // 6 — Did you overreact a tiny bit? (both hover-morph to “I did overreact”)
    {
      prompt: "Did you maybe overreact a tiny bit?",
      emoji: 6,
      type: "choices",
      primaryLabel: "Yes",
      primaryVariant: "blue",
      secondaryLabel: "No",
      secondaryVariant: "blue",
      trick: "morphOverreact",
      handleEither: () => {
        setAside("It’s fine. Happens.");
        go(7);
      }
    },
    // 7 — Did I really disappoint you? (Yes morphs on click; No proceeds with your line)
    {
      prompt: "Even so… deep breaths… did I really disappoint you?",
      emoji: 7,
      type: "choices",
      primaryLabel: "Yes",
      primaryVariant: "blue",
      secondaryLabel: "No",
      secondaryVariant: "blue",
      trick: "yesSoftens",
      handleSecondary: () => {
        setAside("See, this is so easy, should’ve had this talk earlier!");
        go(8);
      },
      handlePrimary: () => go(8) // after soften animation
    },
    // 8 — Short serious bit (single button)
    {
      prompt:
        "I was out of line. That was on me. Not making this a big dramatic thing — I’m owning it and I’ll do better.",
      emoji: 8,
      type: "single",
      singleLabel: "I’m listening",
      singleVariant: "blue",
      onContinue: () => go(9)
    },
    // 9 — Apology + decision (final; No loops “Pleasee…” forever; Yes confetti)
    {
      prompt:
        "Jokes aside, I’m sorry. I didn’t mean it, and I feel bad that I said it. I value our friendship (and our Roblox time). Forgive me?",
      emoji: 9,
      type: "choices",
      primaryLabel: "Yes, chill restored",
      primaryVariant: "cherry",
      secondaryLabel: "No, gremlin timeout",
      secondaryVariant: "blue",
      trick: "finalDecision",
      handlePrimary: async () => {
        // Confetti + happy line
        fireConfetti();
        const prev = emojiImg.src;
        // Optional party emoji swap moment
        if (emojiMap["party"]) {
          emojiImg.src = `assets/emoji/${emojiMap["party"]}`;
        }
        const msg =
          "Yay! You’re the best, bro. Besides… you need me to carry those Roblox horror games.";
        await typeText(promptBtn, msg);
        // Lock buttons
        disableAll(true);
        choicesWrap.setAttribute("data-hidden", "true");
        startWrap.setAttribute("data-hidden", "true");
        setAside("");
      },
      handleSecondary: async () => {
        // Escalate “Please”
        pleaseCount++;
        const eCount = Math.min(pleaseCount, 20); // keep the character count readable
        const plea = "Ple" + "e".repeat(1 + eCount) + "ase?";
        const size = clamp(1 + pleaseCount * 0.05, 1, 3.2);
        if (emojiMap["plead"]) {
          emojiImg.src = `assets/emoji/${emojiMap["plead"]}`;
        }
        promptBtn.style.transition = "transform 200ms ease, color 200ms ease";
        promptBtn.style.transform = `scale(${size})`;
        await typeText(promptBtn, plea);
        // Optionally animate a little wobble
        promptBtn.animate(
          [
            { transform: `scale(${size}) rotate(0deg)` },
            { transform: `scale(${size}) rotate(-1.2deg)` },
            { transform: `scale(${size}) rotate(0deg)` }
          ],
          { duration: 220, easing: "ease-out" }
        );
      },
      finalAside: "These buttons actually work this time."
    }
  ];

  // Engine ---------------------------------------------------------------

  function render() {
    const s = scenes[current];
    sceneIndexEl.textContent = `Scene ${current}/${scenes.length - 1}`;
    setEmojiForScene(current);
    clearAside();

    // Reset any transforms or old listeners by cloning buttons
    resetButtons();

    // Show/hide blocks by type
    if (s.type === "start") {
      choicesWrap.setAttribute("data-hidden", "true");
      startWrap.setAttribute("data-hidden", "false");

      // Start button
      setVariant(btnStart, "blue");
      btnStart.onclick = async () => {
        await next();
      };

      // Prompt
      typeText(promptBtn, s.prompt);
    }

    if (s.type === "single") {
      startWrap.setAttribute("data-hidden", "true");
      choicesWrap.setAttribute("data-hidden", "false");

      // Show only primary, hide secondary
      btnSecondary.style.display = "none";
      btnPrimary.style.display = "inline-block";

      btnPrimary.textContent = s.singleLabel;
      setVariant(btnPrimary, s.singleVariant);

      btnPrimary.onclick = async () => {
        await next();
      };

      typeText(promptBtn, s.prompt);
    }

    if (s.type === "choices") {
      startWrap.setAttribute("data-hidden", "true");
      choicesWrap.setAttribute("data-hidden", "false");
      btnSecondary.style.display = "inline-block";
      btnPrimary.style.display = "inline-block";

      // Labels
      btnPrimary.textContent = s.primaryLabel;
      btnSecondary.textContent = s.secondaryLabel;
      // Variants
      setVariants(s.primaryVariant, s.secondaryVariant);

      // Handlers (default linear handling)
      btnPrimary.onclick = s.handlePrimary
        ? s.handlePrimary
        : async () => next();

      btnSecondary.onclick = s.handleSecondary
        ? s.handleSecondary
        : async () => next();

      // Apply tricks per scene
      applyTrick(s);
      // Final aside if provided (scene 9)
      if (s.finalAside) setAside(s.finalAside);

      typeText(promptBtn, s.prompt);
    }
  }

  function applyTrick(s) {
    // Cleaners to remove listeners/transforms when scene changes
    const cleaners = [];

    switch (s.trick) {
      case "dodge": {
        // secondary (“Yes”) dodges forever; primary (“No”) proceeds
        const clean = attachDodge(btnSecondary, sceneWrap);
        cleaners.push(clean);
        break;
      }
      case "morphYesToNo": {
        // Hovering secondary (“Yes”) morphs to No and clicking acts as No
        const clean = attachMorphYesToNo(btnSecondary, () => {
          if (typeof s.handleSecondaryAsNo === "function") s.handleSecondaryAsNo();
          else if (typeof s.handlePrimary === "function") s.handlePrimary();
          else next();
        });
        cleaners.push(clean);
        break;
      }
      case "shrinkPoof": {
        const clean = attachShrinkPoof(btnSecondary);
        cleaners.push(clean);
        break;
      }
      case "swapOnHover": {
        const clean = attachSwapOnHover(btnSecondary);
        cleaners.push(clean);
        break;
      }
      case "morphOverreact": {
        const clean = attachMorphOverreact(() => {
          if (typeof s.handleEither === "function") s.handleEither();
          else next();
        });
        cleaners.push(clean);
        break;
      }
      case "yesSoftens": {
        const clean = attachMorphYesSoften(btnPrimary, () => {
          if (typeof s.handlePrimary === "function") s.handlePrimary();
          else next();
        });
        cleaners.push(clean);
        break;
      }
      case "finalDecision": {
        // Handlers for Scene 9 already set, plus aside; no gag wiring needed here
        break;
      }
      default:
        break;
    }

    // Return a disposer if ever needed (not used now but future-proof)
    return () => cleaners.forEach((fn) => fn && fn());
  }

  async function next() {
    // Guard against clicks during typing
    if (typing) return;

    await fadeSwap(async () => {
      current = clamp(current + 1, 0, scenes.length - 1);
      render();
    });
  }

  function go(n) {
    if (typing) return;
    fadeSwap(() => {
      current = clamp(n, 0, scenes.length - 1);
      render();
    });
  }

  // Init
  (async function init() {
    current = 0;
    pleaseCount = 0;
    await fadeSwap(render);
  })();
})();