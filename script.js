 // ===== INVOICE GENERATOR - PDF GENERATION MODULE =====

// ===== FORM VALIDATION =====

/**
 * Validates a single form field
 * @param {HTMLElement} field - Form field to validate
 * @returns {boolean} True if valid, false otherwise
 */
function validateField(field) {
    const formGroup = field.closest('.form-group');
    const errorMessage = formGroup.querySelector('.error-message');
    
    // Remove previous error state
    formGroup.classList.remove('error');
    
    // Check if field is required and empty
    if (field.hasAttribute('required') && !field.value.trim()) {
        formGroup.classList.add('error');
        return false;
    }
    
    // Validate number fields
    if (field.type === 'number') {
        const value = parseFloat(field.value);
        const min = parseFloat(field.getAttribute('min'));
        
        if (isNaN(value) || (min !== null && value < min)) {
            formGroup.classList.add('error');
            return false;
        }
    }
    
    // Validate date fields
    if (field.type === 'date') {
        const invoiceDate = new Date(document.getElementById('invoiceDate').value);
        const dueDate = new Date(document.getElementById('dueDate').value);
        
        if (field.id === 'dueDate' && dueDate < invoiceDate) {
            formGroup.classList.add('error');
            if (errorMessage) {
                errorMessage.textContent = 'Due date must be after invoice date';
                errorMessage.style.display = 'block';
            }
            return false;
        }
    }
    
    return true;
}

/**
 * Validates entire form
 * @returns {boolean} True if all fields are valid
 */
function validateForm() {
    const form = document.getElementById('invoiceForm');
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        if (!validateField(field)) {
            isValid = false;
        }
    });
    
    return isValid;
}

// ===== LOGO HANDLING =====

let logoDataUrl = null;

/**
 * Handles logo file upload and preview
 */
function handleLogoUpload() {
    const logoInput = document.getElementById('logo');
    const logoPreview = document.getElementById('logoPreview');
    const logoPreviewImg = document.getElementById('logoPreviewImg');
    
    logoInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                alert('Please upload a valid image file');
                logoInput.value = '';
                return;
            }
            
            // Validate file size (max 2MB)
            if (file.size > 2 * 1024 * 1024) {
                alert('Image size should be less than 2MB');
                logoInput.value = '';
                return;
            }
            
            const reader = new FileReader();
            
            reader.onload = function(event) {
                logoDataUrl = event.target.result;
                logoPreviewImg.src = logoDataUrl;
                logoPreview.style.display = 'block';
            };
            
            reader.readAsDataURL(file);
        } else {
            logoPreview.style.display = 'none';
            logoDataUrl = null;
        }
    });
}

// ===== PDF GENERATION =====

/**
 * Generates and downloads invoice PDF
 */
async function generatePDF() {
    // Validate form first
    if (!validateForm()) {
        alert('Please fill in all required fields correctly');
        return;
    }
    
    // Disable button during generation
    const generateBtn = document.getElementById('generatePdfBtn');
    const originalText = generateBtn.textContent;
    generateBtn.disabled = true;
    generateBtn.textContent = '⏳ Generating PDF...';
    
    try {
        // Get jsPDF from window object
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Get form values
        const businessName = document.getElementById('businessName').value;
        const currency = document.getElementById('currency').value;
        const invoiceNumber = document.getElementById('invoiceNumber').value;
        const clientName = document.getElementById('clientName').value;
        const invoiceDate = document.getElementById('invoiceDate').value;
        const dueDate = document.getElementById('dueDate').value;
        const serviceDescription = document.getElementById('serviceDescription').value;
        const quantity = parseFloat(document.getElementById('quantity').value);
        const rate = parseFloat(document.getElementById('rate').value);
        const taxRate = parseFloat(document.getElementById('taxRate').value);
        const additionalNotes = document.getElementById('additionalNotes').value;
        const addWatermark = document.getElementById('watermark').checked;
        
        // Calculate totals
        const { subtotal, tax, total } = calculateTotals(quantity, rate, taxRate);
        
        // Format dates
        const formattedInvoiceDate = new Date(invoiceDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const formattedDueDate = new Date(dueDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        // PDF Layout
        let yPosition = 20;
        
        // Add logo if uploaded
        if (logoDataUrl) {
            try {
                doc.addImage(logoDataUrl, 'PNG', 15, yPosition, 40, 20);
                yPosition += 25;
            } catch (error) {
                console.error('Error adding logo:', error);
            }
        }
        
        // Business Name (Header)
        doc.setFontSize(24);
        doc.setTextColor(102, 126, 234);
        doc.text(businessName, 15, yPosition);
        yPosition += 10;
        
        // Invoice Title
        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.text('INVOICE', 15, yPosition);
        yPosition += 15;
        
        // Invoice Details Box
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        
        // Left column - Invoice info
        doc.text(`Invoice Number: ${invoiceNumber}`, 15, yPosition);
        yPosition += 6;
        doc.text(`Invoice Date: ${formattedInvoiceDate}`, 15, yPosition);
        yPosition += 6;
        doc.text(`Due Date: ${formattedDueDate}`, 15, yPosition);
        yPosition += 15;
        
        // Bill To Section
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text('Bill To:', 15, yPosition);
        yPosition += 7;
        doc.setFontSize(11);
        doc.text(clientName, 15, yPosition);
        yPosition += 20;
        
        // Service Details Table Header
        doc.setFillColor(102, 126, 234);
        doc.rect(15, yPosition, 180, 10, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.text('Description', 20, yPosition + 7);
        doc.text('Qty', 120, yPosition + 7);
        doc.text('Rate', 145, yPosition + 7);
        doc.text('Amount', 170, yPosition + 7);
        yPosition += 15;
        
        // Service Details Row
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        
        // Wrap long descriptions
        const splitDescription = doc.splitTextToSize(serviceDescription, 95);
        doc.text(splitDescription, 20, yPosition);
        
        const descriptionHeight = splitDescription.length * 5;
        doc.text(quantity.toString(), 120, yPosition);
        doc.text(formatCurrency(rate, currency), 145, yPosition);
        doc.text(formatCurrency(subtotal, currency), 170, yPosition);
        yPosition += Math.max(descriptionHeight, 10);
        
        // Draw line
        doc.setDrawColor(200, 200, 200);
        doc.line(15, yPosition, 195, yPosition);
        yPosition += 10;
        
        // Totals Section
        doc.setFontSize(10);
        
        // Subtotal
        doc.text('Subtotal:', 145, yPosition);
        doc.text(formatCurrency(subtotal, currency), 170, yPosition);
        yPosition += 7;
        
        // Tax
        doc.text(`Tax (${taxRate}%):`, 145, yPosition);
        doc.text(formatCurrency(tax, currency), 170, yPosition);
        yPosition += 10;
        
        // Draw line before total
        doc.setLineWidth(0.5);
        doc.line(145, yPosition, 195, yPosition);
        yPosition += 7;
        
        // Total
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Total:', 145, yPosition);
        doc.text(formatCurrency(total, currency), 170, yPosition);
        yPosition += 15;
        
        // Additional Notes
        if (additionalNotes.trim()) {
            doc.setFont(undefined, 'normal');
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text('Notes:', 15, yPosition);
            yPosition += 7;
            
            doc.setFontSize(9);
            const splitNotes = doc.splitTextToSize(additionalNotes, 180);
            doc.text(splitNotes, 15, yPosition);
            yPosition += splitNotes.length * 5;
        }
        
        // Add watermark if checked
        if (addWatermark) {
            doc.setFontSize(60);
            doc.setTextColor(200, 200, 200);
            doc.text('DRAFT', 105, 150, {
                align: 'center',
                angle: 45
            });
        }
        
        // Footer
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('Thank you for your business!', 105, 280, { align: 'center' });
        doc.text(`Generated on ${new Date().toLocaleDateString()}`, 105, 285, { align: 'center' });
        
        // Save PDF
        const fileName = `Invoice_${invoiceNumber}_${clientName.replace(/\s+/g, '_')}.pdf`;
        doc.save(fileName);
        
        console.log('PDF generated successfully:', fileName);
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Error generating PDF. Please try again.');
    } finally {
        // Re-enable button
        generateBtn.disabled = false;
        generateBtn.textContent = originalText;
    }
}

// ===== TEMPLATE MANAGEMENT =====

/**
 * Saves current form data as template to localStorage
 */
function saveTemplate() {
    const template = {
        businessName: document.getElementById('businessName').value,
        currency: document.getElementById('currency').value,
        taxRate: document.getElementById('taxRate').value,
        additionalNotes: document.getElementById('additionalNotes').value,
        logoDataUrl: logoDataUrl,
        savedAt: new Date().toISOString()
    };
    
    try {
        localStorage.setItem('invoiceTemplate', JSON.stringify(template));
        alert('✅ Template saved successfully!');
        console.log('Template saved:', template);
    } catch (error) {
        console.error('Error saving template:', error);
        alert('Error saving template. Please try again.');
    }
}

/**
 * Loads template from localStorage
 */
function loadTemplate() {
    try {
        const templateData = localStorage.getItem('invoiceTemplate');
        
        if (templateData) {
            const template = JSON.parse(templateData);
            
            // Populate form fields
            document.getElementById('businessName').value = template.businessName || '';
            document.getElementById('currency').value = template.currency || '$';
            document.getElementById('taxRate').value = template.taxRate || '0';
            document.getElementById('additionalNotes').value = template.additionalNotes || '';
            
            // Load logo if exists
            if (template.logoDataUrl) {
                logoDataUrl = template.logoDataUrl;
                document.getElementById('logoPreviewImg').src = logoDataUrl;
                document.getElementById('logoPreview').style.display = 'block';
            }
            
            // Update totals display
            updateTotalsDisplay();
            
            console.log('Template loaded successfully');
        }
    } catch (error) {
        console.error('Error loading template:', error);
    }
}

// ===== FORM RESET =====

/**
 * Resets form to initial state
 */
function resetForm() {
    if (confirm('Are you sure you want to reset the form? All unsaved data will be lost.')) {
        // Reset form
        document.getElementById('invoiceForm').reset();
        
        // Clear logo
        logoDataUrl = null;
        document.getElementById('logoPreview').style.display = 'none';
        
        // Reinitialize form with new invoice number and dates
        initializeForm();
        
        // Update totals display
        updateTotalsDisplay();
        
        // Clear all error states
        document.querySelectorAll('.form-group.error').forEach(group => {
            group.classList.remove('error');
        });
        
        console.log('Form reset successfully');
    }
}

// ===== EVENT LISTENERS =====

/**
 * Attaches all event listeners
 */
function attachEventListeners() {
    // PDF Generation
    document.getElementById('generatePdfBtn').addEventListener('click', generatePDF);
    
    // Template Management
    document.getElementById('saveTemplateBtn').addEventListener('click', saveTemplate);
    
    // Form Reset
    document.getElementById('resetBtn').addEventListener('click', resetForm);
    
    // Logo Upload
    handleLogoUpload();
    
    // Real-time validation
    const form = document.getElementById('invoiceForm');
    const inputs = form.querySelectorAll('input, textarea, select');
    
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            validateField(this);
        });
        
        // Clear error on input
        input.addEventListener('input', function() {
            const formGroup = this.closest('.form-group');
            if (formGroup.classList.contains('error')) {
                formGroup.classList.remove('error');
            }
        });
    });
    
    // Auto-update due date when invoice date changes
    document.getElementById('invoiceDate').addEventListener('change', function() {
        const invoiceDate = new Date(this.value);
        const dueDate = calculateDueDate(invoiceDate);
        document.getElementById('dueDate').value = formatDateForInput(dueDate);
    });
    
    console.log('Event listeners attached successfully');
}

// ===== INITIALIZATION =====

/**
 * Initialize the application
 */
function initializeApp() {
    // Load template if exists
    loadTemplate();
    
    // Attach event listeners
    attachEventListeners();
    
    console.log('Invoice Generator initialized successfully');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// ===== UTILITY FUNCTIONS =====

/**
 * Formats date for display
 * @param {string} dateString - Date string to format
 * @returns {string} Formatted date
 */
function formatDateForDisplay(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * Validates email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Export functions for testing (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        validateField,
        validateForm,
        calculateTotals,
        formatCurrency,
        generatePDF,
        saveTemplate,
        loadTemplate,
        resetForm
    };
}
