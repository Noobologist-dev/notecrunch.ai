document.addEventListener("DOMContentLoaded", () => {
  // Navbar scroll effect
  const navbar = document.getElementById("navbar")
  const mobileMenuBtn = document.querySelector(".mobile-menu-btn")
  const navLinks = document.querySelector(".nav-links")

  window.addEventListener("scroll", () => {
    if (window.scrollY > 50) {
      navbar.classList.add("scrolled")
    } else {
      navbar.classList.remove("scrolled")
    }
  })

  // Mobile menu toggle
  mobileMenuBtn.addEventListener("click", function () {
    this.classList.toggle("active")
    navLinks.classList.toggle("active")
  })

  // Close mobile menu when clicking on a link
  document.querySelectorAll(".nav-links a").forEach((link) => {
    link.addEventListener("click", () => {
      mobileMenuBtn.classList.remove("active")
      navLinks.classList.remove("active")
    })
  })

  // Tab switching
  const tabBtns = document.querySelectorAll(".tab-btn")
  const tabContents = document.querySelectorAll(".tab-content")

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", function () {
      const tabId = this.getAttribute("data-tab")

      // Remove active class from all buttons and contents
      tabBtns.forEach((btn) => btn.classList.remove("active"))
      tabContents.forEach((content) => content.classList.remove("active"))

      // Add active class to current button and content
      this.classList.add("active")
      document.getElementById(`${tabId}-tab`).classList.add("active")
    })
  })

  // File upload handling
  const fileInput = document.getElementById("file-input")
  const fileUpload = document.querySelector(".file-upload")
  const fileName = document.querySelector(".file-name")

  fileUpload.addEventListener("click", () => {
    fileInput.click()
  })

  fileUpload.addEventListener("dragover", function (e) {
    e.preventDefault()
    this.style.borderColor = "var(--primary-color)"
    this.style.backgroundColor = "rgba(99, 102, 241, 0.05)"
  })

  fileUpload.addEventListener("dragleave", function () {
    this.style.borderColor = "var(--border-color)"
    this.style.backgroundColor = "transparent"
  })

  fileUpload.addEventListener("drop", function (e) {
    e.preventDefault()
    this.style.borderColor = "var(--primary-color)"
    this.style.backgroundColor = "rgba(99, 102, 241, 0.05)"

    if (e.dataTransfer.files.length) {
      fileInput.files = e.dataTransfer.files
      updateFileName(e.dataTransfer.files[0].name)
    }
  })

  fileInput.addEventListener("change", function () {
    if (this.files.length) {
      updateFileName(this.files[0].name)
    }
  })

  fileInput.addEventListener("change", function () {
    const file = this.files[0]
    const reader = new FileReader()
    reader.onload = function (e) {
      const content = e.target.result
      const textArea = document.getElementById("note-input")
      textArea.value = content
    }
    reader.readAsText(file)
  })

  function updateFileName(name) {
    fileName.textContent = name
  }

  // Summarize button click handler
  const summarizeBtn = document.getElementById("summarize-btn")
  const summarizeBtnFile = document.getElementById("summarize-btn-file")
  const summaryPlaceholder = document.querySelector(".summary-placeholder")
  const summaryContent = document.querySelector(".summary-content")
  const loadingAnimation = document.querySelector(".loading-animation")
  const summaryText = document.getElementById("summary-text")
  const originalLength = document.getElementById("original-length")
  const summaryLength = document.getElementById("summary-length")
  const reduction = document.getElementById("reduction")
  const progress = document.querySelector(".progress")

  const handleSummarize = async (isFileUpload = false) => {
    let content = ""

    if (!isFileUpload) {
      content = document.getElementById("note-input").value.trim()
      if (!content) {
        alert("Please enter some text to summarize.")
        return
      }
    } else {
      if (!fileInput.files.length) {
        alert("Please select a file to summarize.")
        return
      }
      // For file upload, we'll read the file content
      const file = fileInput.files[0]
      try {
        content = await readFileContent(file)
      } catch (error) {
        alert("Error reading file: " + error.message)
        return
      }
    }

    // Show loading animation
    summaryPlaceholder.classList.add("hidden")
    summaryContent.classList.add("hidden")
    loadingAnimation.classList.remove("hidden")

    // Reset progress animation
    progress.style.animation = "none"
    setTimeout(() => {
      progress.style.animation = "progress 3s ease-in-out forwards"
    }, 10)

    try {
      // Send content to backend
      const formData = new FormData();
      formData.append('content', content);
      
      const response = await fetch('summarize.php', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      
      if (!response.ok || data.error) {
        throw new Error(data.error || `Server error: ${response.status}`)
      }

      // Hide loading animation
      loadingAnimation.classList.add("hidden")

      // Show summary content
      summaryContent.classList.remove("hidden")

      // Update summary text with fade-in effect
      summaryText.style.opacity = 0
      
      // Convert newlines to HTML paragraphs
      const formattedSummary = data.summary
        .split('\n\n')
        .map(paragraph => `<p>${paragraph}</p>`)
        .join('')
      
      summaryText.innerHTML = formattedSummary

      // Calculate statistics
      const origWords = content.split(/\s+/).length
      const summWords = data.summary.split(/\s+/).length
      const reductionPercentage = Math.max(0, Math.round((1 - summWords / origWords) * 100))

      originalLength.textContent = origWords
      summaryLength.textContent = summWords
      reduction.textContent = `${reductionPercentage}%`

      // Fade in the summary text
      setTimeout(() => {
        summaryText.style.transition = "opacity 0.5s ease"
        summaryText.style.opacity = 1
      }, 100)

    } catch (error) {
      loadingAnimation.classList.add("hidden")
      alert("Error: " + error.message)
    }
  }

  // Add event listeners for both buttons
  summarizeBtn.addEventListener("click", () => handleSummarize(false))
  summarizeBtnFile.addEventListener("click", () => handleSummarize(true))

  // Function to read file content
  function readFileContent(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = async (e) => {
        const content = e.target.result
        
        // Check if the file is a PDF
        if (file.type === 'application/pdf') {
          try {
            // Load the PDF file
            const pdf = await pdfjsLib.getDocument(content).promise
            let fullText = ''
            
            // Extract text from each page
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i)
              const textContent = await page.getTextContent()
              const pageText = textContent.items.map(item => item.str).join(' ')
              fullText += pageText + '\n'
            }
            
            resolve(fullText)
          } catch (error) {
            reject(new Error('Error processing PDF: ' + error.message))
          }
          return
        }
        
        // For text files and Word documents
        resolve(content)
      }
      
      reader.onerror = (e) => {
        reject(new Error('Error reading file'))
      }
      
      // Read as ArrayBuffer for PDFs, as text for other files
      if (file.type === 'application/pdf') {
        reader.readAsArrayBuffer(file)
      } else {
        reader.readAsText(file)
      }
    })
  }

  // Testimonial slider
  const testimonialTrack = document.querySelector(".testimonial-track")
  const testimonials = document.querySelectorAll(".testimonial")
  const dots = document.querySelectorAll(".dot")
  const prevBtn = document.querySelector(".slider-arrow.prev")
  const nextBtn = document.querySelector(".slider-arrow.next")

  if (testimonialTrack && testimonials.length && dots.length && prevBtn && nextBtn) {
    let currentIndex = 0

    function updateSlider() {
      testimonialTrack.style.transform = `translateX(-${currentIndex * 100}%)`
      dots.forEach((dot, index) => {
        dot.classList.toggle("active", index === currentIndex)
      })
    }

    // Set initial position
    updateSlider()

    // Handle dot clicks
    dots.forEach((dot, index) => {
      dot.addEventListener("click", () => {
        currentIndex = index
        updateSlider()
      })
    })

    // Handle arrow clicks
    prevBtn.addEventListener("click", () => {
      currentIndex = (currentIndex - 1 + testimonials.length) % testimonials.length
      updateSlider()
    })

    nextBtn.addEventListener("click", () => {
      currentIndex = (currentIndex + 1) % testimonials.length
      updateSlider()
    })

    // Auto-rotate testimonials
    setInterval(() => {
      currentIndex = (currentIndex + 1) % testimonials.length
      updateSlider()
    }, 5000)
  }

  // Pricing toggle
  const billingToggle = document.getElementById("billing-toggle")
  const monthlyPrices = document.querySelectorAll(".amount.monthly")
  const yearlyPrices = document.querySelectorAll(".amount.yearly")
  const toggleOptions = document.querySelectorAll(".toggle-option")

  if (billingToggle) {
    billingToggle.addEventListener("change", function () {
      const isYearly = this.checked

      monthlyPrices.forEach((price) => {
        price.classList.toggle("hidden", isYearly)
      })

      yearlyPrices.forEach((price) => {
        price.classList.toggle("hidden", !isYearly)
      })

      toggleOptions.forEach((option, index) => {
        option.classList.toggle("active", (index === 0 && !isYearly) || (index === 1 && isYearly))
      })
    })
  }

  // Copy to clipboard functionality
  const copyBtn = document.querySelector(".copy-btn")

  copyBtn.addEventListener("click", () => {
    const text = summaryText.textContent
    navigator.clipboard.writeText(text).then(() => {
      const originalText = copyBtn.innerHTML
      copyBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      setTimeout(() => {
        copyBtn.innerHTML = originalText
      }, 2000)
    })
  })

  // Download as text functionality
  const downloadBtn = document.querySelector(".download-btn")

  if (downloadBtn) {
    downloadBtn.title = 'Download as TXT';
    downloadBtn.setAttribute('aria-label', 'Download as TXT');
    downloadBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="2" width="16" height="20" rx="2" stroke="currentColor" stroke-width="2"/><path d="M9 17h6M9 13h6M9 9h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
  }

  // Utility to detect mobile devices
  function isMobileDevice() {
    return /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
  }

  // Show fallback message
  function showDownloadFallbackMessage(type) {
    alert(`Download as ${type} may not be supported on your device.\n\nYou can copy the summary or take a screenshot as a fallback.`);
  }

  // Show mobile download modal
  function showMobileDownloadModal(type) {
    const modal = document.getElementById('mobile-download-modal');
    const msg = document.getElementById('mobile-download-message');
    if (!modal || !msg) return;
    if (type === 'TXT') {
      msg.innerHTML = 'To save your summary:<br><b>Tap and hold to select, then copy</b>, or use your browser\'s <b>Share/Save</b> option.';
    } else if (type === 'PDF') {
      msg.innerHTML = 'To save your summary:<br>Use your browser\'s <b>Share</b> or <b>Save</b> option.';
    }
    modal.style.display = 'flex';
  }

  // TXT Download
  downloadBtn.addEventListener('click', function (e) {
    try {
      const summaryText = document.getElementById('summary-text').innerText;
      const blob = new Blob([summaryText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      if (isMobileDevice()) {
        // Open in new tab for mobile
        const win = window.open(url, '_blank');
        if (win) {
          showMobileDownloadModal('TXT');
        } else {
          showDownloadFallbackMessage('TXT');
        }
        return;
      }
      const a = document.createElement('a');
      a.href = url;
      a.download = 'summary.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      showDownloadFallbackMessage('TXT');
    }
  });

  // Add Download as PDF functionality
  const pdfBtn = document.createElement('button');
  pdfBtn.className = 'action-btn pdf-btn';
  pdfBtn.title = 'Download as PDF';
  pdfBtn.setAttribute('aria-label', 'Download as PDF');
  pdfBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/><text x="12" y="15" font-size="7" fill="currentColor" font-family="Arial, Helvetica, sans-serif" text-anchor="middle" dominant-baseline="middle">PDF</text></svg>`;

  const summaryActions = document.querySelector('.summary-actions');
  if (summaryActions) summaryActions.appendChild(pdfBtn);

  // PDF Download
  pdfBtn.addEventListener('click', function (e) {
    try {
      const summaryText = document.getElementById('summary-text').innerText;
      const doc = new window.jspdf.jsPDF();
      doc.setFont('helvetica');
      doc.setFontSize(12);
      doc.text(summaryText, 10, 20, { maxWidth: 180 });
      if (isMobileDevice()) {
        // Open PDF in new tab for mobile
        const pdfBlob = doc.output('blob');
        const url = URL.createObjectURL(pdfBlob);
        const win = window.open(url, '_blank');
        if (win) {
          showMobileDownloadModal('PDF');
        } else {
          showDownloadFallbackMessage('PDF');
        }
        return;
      }
      doc.save('summary.pdf');
    } catch (err) {
      showDownloadFallbackMessage('PDF');
    }
  });

  // Smooth scroll for navigation links
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault()

      const targetId = this.getAttribute("href")
      const targetElement = document.querySelector(targetId)

      if (targetElement) {
        const navbarHeight = document.getElementById("navbar").offsetHeight
        const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - navbarHeight

        window.scrollTo({
          top: targetPosition,
          behavior: "smooth",
        })
      }
    })
  })

  // Animate elements on scroll
  const animateOnScroll = () => {
    const elements = document.querySelectorAll(".feature-card, .pricing-card, .testimonial")

    elements.forEach((element) => {
      const elementPosition = element.getBoundingClientRect().top
      const windowHeight = window.innerHeight

      if (elementPosition < windowHeight * 0.85) {
        element.style.opacity = "1"
        element.style.transform =
          element.classList.contains("pricing-card") && element.classList.contains("popular")
            ? "scale(1.05)"
            : "translateY(0)"
      }
    })
  }

  // Set initial opacity for animation
  document.querySelectorAll(".feature-card, .pricing-card, .testimonial").forEach((element) => {
    element.style.opacity = "0"
    element.style.transform = "translateY(20px)"
    element.style.transition = "opacity 0.6s ease, transform 0.6s ease"
  })

  // Run on scroll
  window.addEventListener("scroll", animateOnScroll)

  // Run once on load
  animateOnScroll()

  // Add character counter functionality
  const noteInput = document.getElementById('note-input');
  const noteInputContainer = document.querySelector('#text-tab .note-input-container');
  const textCharCounter = document.querySelector('.input-bottom-row .char-counter');
  const textLimitMessage = noteInputContainer.querySelector('.limit-message');
  const maxLength = 13000;

  function updateCharCounter(counter, currentCount, limitMessage) {
    if (!counter) return;
    const currentCountSpan = counter.querySelector('.current-count');
    if (currentCountSpan) currentCountSpan.textContent = currentCount;
    if (currentCount > maxLength) {
      counter.classList.add('warning');
      if (limitMessage) limitMessage.classList.add('visible');
    } else {
      counter.classList.remove('warning');
      if (limitMessage) limitMessage.classList.remove('visible');
    }
  }

  // Add event listeners for character counter
  console.log('noteInput:', noteInput);
  console.log('noteInputContainer:', noteInputContainer);
  console.log('textCharCounter:', textCharCounter);

  function triggerCharCounterUpdate() {
    const currentLength = noteInput.value.length;
    updateCharCounter(textCharCounter, currentLength, textLimitMessage);
  }

  noteInput.addEventListener('input', function() {
    console.log('Input event fired. Value:', noteInput.value);
    triggerCharCounterUpdate();
  });
  noteInput.addEventListener('change', triggerCharCounterUpdate);
  noteInput.addEventListener('paste', function() {
    setTimeout(triggerCharCounterUpdate, 0);
  });

  // Initialize counter
  triggerCharCounterUpdate();

  // Responsive: Change button text to 'Go' on mobile
  function updateButtonTextForMobile() {
    const summarizeBtn = document.getElementById('summarize-btn');
    const summarizeBtnFile = document.getElementById('summarize-btn-file');
    if (window.innerWidth <= 600) {
      if (summarizeBtn) summarizeBtn.querySelector('.btn-text').textContent = 'Go';
      if (summarizeBtnFile) summarizeBtnFile.querySelector('.btn-text').textContent = 'Go';
    } else {
      if (summarizeBtn) summarizeBtn.querySelector('.btn-text').textContent = 'Summarize';
      if (summarizeBtnFile) summarizeBtnFile.querySelector('.btn-text').textContent = 'Summarize';
    }
  }
  window.addEventListener('resize', updateButtonTextForMobile);
  updateButtonTextForMobile();
})

