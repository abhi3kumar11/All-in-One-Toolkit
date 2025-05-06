// Main Application Script
document.addEventListener('DOMContentLoaded', function() {
    // Ensure pdf-lib is loaded (it's included via CDN)
    const { PDFDocument, rgb } = PDFLib;
    window.PDFLib = PDFLib; // Make it globally available if needed by other functions or for simplicity
    // Initialize all tool functionalities
    initImageTools();
    initUtilityTools();
    initQRTools();
    setupEventListeners();
});

function setupEventListeners() {
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });
}

// ==================== IMAGE TOOLS ====================
function initImageTools() {
    // Photo to PDF Converter
    const photoToPdfInput = document.getElementById('photo-to-pdf');
    const photoToPdfBtn = document.getElementById('photo-to-pdf-btn');
    const pdfPreview = document.getElementById('pdf-preview');
    let selectedPhotoFile = null; // Store the selected file

    photoToPdfInput.addEventListener('change', function(e) {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const reader = new FileReader();
            
            reader.onload = function(event) {
                pdfPreview.innerHTML = `
                    <img src="${event.target.result}" class="img-thumbnail" style="max-height: 200px;">
                    <p class="mt-2">${file.name}</p>
                `;
            };

            reader.readAsDataURL(file);
            selectedPhotoFile = file; // Store the file object
        } else {
            pdfPreview.innerHTML = '';
            selectedPhotoFile = null;
        }
    });

    photoToPdfBtn.addEventListener('click', function() {
        if (selectedPhotoFile) {
            convertPhotoToPdf(selectedPhotoFile);
        } else {
            showAlert('Please select a photo first!', 'warning');
        }
    });

    // Image Converter
    const imageInput = document.getElementById('image-input');
    const targetFormat = document.getElementById('target-format');
    const imageConvertBtn = document.getElementById('image-convert-btn');

    imageConvertBtn.addEventListener('click', function() {
        if (imageInput.files.length > 0) {
            convertImage(imageInput.files[0], targetFormat.value);
        } else {
            showAlert('Please select an image first!', 'warning');
        }
    });

    // Image Compressor
    const compressInput = document.getElementById('compress-input');
    const qualityRange = document.getElementById('quality-range');
    const qualityValue = document.getElementById('quality-value');
    
    qualityRange.addEventListener('input', function() {
        qualityValue.textContent = this.value;
    });
    
    document.querySelector('.compress-btn').addEventListener('click', function() {
        if (compressInput.files.length > 0) {
            compressImage(compressInput.files[0], qualityRange.value);
        } else {
            showAlert('Please select an image first!', 'warning');
        }
    });

    // Image Resizer
    const resizeInput = document.getElementById('resize-input');
    const resizeWidthInput = document.getElementById('resize-width');
    const resizeHeightInput = document.getElementById('resize-height');
    const aspectRatioLockCheckbox = document.getElementById('aspect-ratio-lock');
    const resizeImageBtn = document.getElementById('resize-image-btn');
    const resizeInfo = document.getElementById('resize-info');

    let imageResizerState = {
        element: null,
        originalWidth: 0,
        originalHeight: 0,
        aspectRatio: 1,
        fileName: '',
        fileType: ''
    };

    if (resizeImageBtn) { // Ensure elements exist before adding listeners
        resizeImageBtn.disabled = true; 

        resizeInput.addEventListener('change', (e) => handleResizeImageSelection(e, imageResizerState, resizeWidthInput, resizeHeightInput, resizeInfo, resizeImageBtn));

        resizeWidthInput.addEventListener('input', function() {
            if (aspectRatioLockCheckbox.checked && imageResizerState.element && this.value) {
                const newWidth = parseInt(this.value);
                if (!isNaN(newWidth) && newWidth > 0) {
                    resizeHeightInput.value = Math.round(newWidth / imageResizerState.aspectRatio);
                } else if (this.value === "") {
                    resizeHeightInput.value = "";
                }
            }
        });

        resizeHeightInput.addEventListener('input', function() {
            if (aspectRatioLockCheckbox.checked && imageResizerState.element && this.value) {
                const newHeight = parseInt(this.value);
                if (!isNaN(newHeight) && newHeight > 0) {
                    resizeWidthInput.value = Math.round(newHeight * imageResizerState.aspectRatio);
                } else if (this.value === "") {
                    resizeWidthInput.value = "";
                }
            }
        });

        resizeImageBtn.addEventListener('click', () => handleImageResize(imageResizerState, resizeInput, resizeWidthInput, resizeHeightInput, aspectRatioLockCheckbox, resizeInfo));
    }
}

async function convertPhotoToPdf(file) {
    const reader = new FileReader();

    reader.onload = async function(event) {
        try {
             // Access PDFDocument and rgb from the globally available PDFLib object
           
            const { PDFDocument, rgb } = window.PDFLib;
            const pdfDoc = await PDFDocument.create();
            const page = pdfDoc.addPage();
            const { width, height } = page.getSize();
            let imageBytes;
            if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
                imageBytes = await pdfDoc.embedJpg(event.target.result);
            } else if (file.type === 'image/png') {
                imageBytes = await pdfDoc.embedPng(event.target.result);
            } else {
                showAlert('Unsupported image type for PDF conversion. Please use JPG or PNG.', 'warning');
                return;
            }

            const dims = imageBytes.scaleToFit(width * 0.9, height * 0.9); // Scale to fit with margin

            page.drawImage(imageBytes, {
                x: (width - dims.width) / 2,
                y: (height - dims.height) / 2,
                width: dims.width,
                height: dims.height,
            });

            const pdfBytes = await pdfDoc.save();
            saveAs(new Blob([pdfBytes], { type: 'application/pdf' }), `${file.name.split('.')[0]}.pdf`);
            showAlert('Photo converted to PDF successfully!', 'success');
        } catch (error) {
            showAlert('Error converting photo to PDF: ' + error.message, 'danger');
            console.error("PDF Conversion Error:", error);
        }
    };

    reader.onerror = function() {
        showAlert('Error reading the image file.', 'danger');
    };

    reader.readAsArrayBuffer(file); // Read as ArrayBuffer for pdf-lib
}

async function convertImage(file, targetFormat) {
    try {
        const image = await createImageBitmap(file);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = image.width;
        canvas.height = image.height;
        ctx.drawImage(image, 0, 0);
        
        let mimeType;
        switch(targetFormat) {
            case 'jpg': mimeType = 'image/jpeg'; break;
            case 'png': mimeType = 'image/png'; break;
            case 'webp': mimeType = 'image/webp'; break;
            case 'bmp': mimeType = 'image/bmp'; break;
            default: mimeType = 'image/jpeg';
        }
        
        canvas.toBlob(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `converted.${targetFormat}`;
            a.click();
            URL.revokeObjectURL(url);
            showAlert('Image converted successfully!', 'success');
        }, mimeType);
    } catch (error) {
        showAlert('Error converting image: ' + error.message, 'danger');
    }
}

function compressImage(file, quality) {
    const reader = new FileReader();
    
    reader.onload = function(event) {
        const img = new Image();
        img.src = event.target.result;
        
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Calculate new dimensions (optional: maintain aspect ratio)
            const maxWidth = 2000;
            const maxHeight = 2000;
            let width = img.width;
            let height = img.height;
            
            if (width > height && width > maxWidth) {
                height *= maxWidth / width;
                width = maxWidth;
            } else if (height > maxHeight) {
                width *= maxHeight / height;
                height = maxHeight;
            }
            
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob(blob => {
                const compressionInfo = document.getElementById('compression-info');
                const originalSize = file.size;
                const compressedSize = blob.size;
                const ratio = ((originalSize - compressedSize) / originalSize * 100).toFixed(2);
                
                compressionInfo.textContent = `
                    Original: ${formatFileSize(originalSize)} | 
                    Compressed: ${formatFileSize(compressedSize)} | 
                    Reduced: ${ratio}%
                `;
                
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `compressed_${quality}${file.name}`;
                a.click();
                URL.revokeObjectURL(url);
                showAlert('Image compressed successfully!', 'success');
            }, 'image/jpeg', quality / 100);
        };
    };
    
    reader.readAsDataURL(file);
}

function handleResizeImageSelection(e, state, widthInput, heightInput, infoEl, btnEl) {
    if (e.target.files && e.target.files.length > 0) {
        const file = e.target.files[0];
        state.fileName = file.name;
        state.fileType = file.type;
        const reader = new FileReader();
        
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                state.element = img;
                state.originalWidth = img.width;
                state.originalHeight = img.height;
                state.aspectRatio = img.width / img.height;
                
                widthInput.value = img.width;
                heightInput.value = img.height;
                infoEl.textContent = `Original: ${img.width}x${img.height}px. Ready.`;
                btnEl.disabled = false;
            };
            img.onerror = function() {
                showAlert('Failed to load image properties.', 'danger');
                state.element = null;
                btnEl.disabled = true;
                infoEl.textContent = "Error loading image.";
            }
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
        infoEl.textContent = "Loading image...";
        btnEl.disabled = true;
    } else {
        state.element = null;
        widthInput.value = "";
        heightInput.value = "";
        widthInput.placeholder = "Auto";
        heightInput.placeholder = "Auto";
        infoEl.textContent = "";
        btnEl.disabled = true;
    }
}

function handleImageResize(state, fileInput, widthInput, heightInput, aspectLockCheckbox, infoEl) {
    if (!state.element) {
        showAlert('Please select an image and wait for it to load.', 'warning');
        return;
    }

    let targetWidth = parseInt(widthInput.value);
    let targetHeight = parseInt(heightInput.value);

    if (isNaN(targetWidth) && isNaN(targetHeight)) {
        targetWidth = state.originalWidth;
        targetHeight = state.originalHeight;
    } else if (aspectLockCheckbox.checked) {
        if (isNaN(targetWidth) && !isNaN(targetHeight)) {
            targetWidth = Math.round(targetHeight * state.aspectRatio);
        } else if (!isNaN(targetWidth) && isNaN(targetHeight)) {
            targetHeight = Math.round(targetWidth / state.aspectRatio);
        }
    } else {
        if (isNaN(targetWidth)) targetWidth = state.originalWidth;
        if (isNaN(targetHeight)) targetHeight = state.originalHeight;
    }
    
    if (targetWidth <= 0 || targetHeight <= 0 || isNaN(targetWidth) || isNaN(targetHeight)) {
        showAlert('Invalid dimensions. Please enter positive numbers or leave blank for original size.', 'warning');
        return;
    }

    performImageResize(state.element, state.fileName, state.fileType, targetWidth, targetHeight, infoEl);
}

async function performImageResize(imgElement, originalFileName, originalFileType, targetWidth, targetHeight, infoDisplayElement) {
    try {
        const originalWidth = imgElement.width;
        const originalHeight = imgElement.height;

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(imgElement, 0, 0, targetWidth, targetHeight);

        const mimeType = originalFileType === 'image/png' ? 'image/png' : 
                         (originalFileType === 'image/webp' ? 'image/webp' : 'image/jpeg');
        let extension = 'jpg';
        if (mimeType === 'image/png') extension = 'png';
        if (mimeType === 'image/webp') extension = 'webp';
        
        const quality = mimeType === 'image/jpeg' ? 0.92 : undefined;

        canvas.toBlob(blob => {
            if (!blob) {
                showAlert('Error creating resized image blob.', 'danger');
                infoDisplayElement.textContent = "Error creating blob.";
                return;
            }
            infoDisplayElement.innerHTML = `
                Original: ${originalWidth}x${originalHeight}px<br>
                Resized: ${targetWidth}x${targetHeight}px<br>
                New Size: ${formatFileSize(blob.size)}
            `;
            saveAs(blob, `resized_${targetWidth}x${targetHeight}_${originalFileName.split('.').slice(0, -1).join('.')}.${extension}`);
            showAlert('Image resized successfully!', 'success');
        }, mimeType, quality);
    } catch (error) {
        showAlert('Error resizing image: ' + error.message, 'danger');
        infoDisplayElement.textContent = "Error during resize.";
        console.error("Image Resize Error:", error);
    }
}

// ==================== UTILITY TOOLS ====================
function initUtilityTools() {
    // Age Calculator
    const birthDateInput = document.getElementById('birth-date');
    const calculateAgeBtn = document.getElementById('calculate-age');
    const ageResult = document.getElementById('age-result');
    
    calculateAgeBtn.addEventListener('click', function() {
        if (birthDateInput.value) {
            const birthDate = new Date(birthDateInput.value);
            const today = new Date();
            
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            
            ageResult.innerHTML = `
                <p>Your age is: <strong>${age} years</strong></p>
                <p class="small text-muted">Born on ${birthDate.toDateString()}</p>
            `;
        } else {
            showAlert('Please select your birth date!', 'warning');
        }
    });
    
    // Unit Converter
    const unitType = document.getElementById('unit-type');
    const unitValue = document.getElementById('unit-value');
    const unitOptions = document.getElementById('unit-options');
    
    unitType.addEventListener('change', updateUnitOptions);
    unitValue.addEventListener('input', convertUnits);
    
    updateUnitOptions();
    
    function updateUnitOptions() {
        const type = unitType.value;
        let options = '';
        
        switch(type) {
            case 'length':
                options = `
                    <div class="col-md-6">
                        <select class="form-select from-unit">
                            <option value="mm">Millimeters</option>
                            <option value="cm">Centimeters</option>
                            <option value="m" selected>Meters</option>
                            <option value="km">Kilometers</option>
                            <option value="in">Inches</option>
                            <option value="ft">Feet</option>
                            <option value="yd">Yards</option>
                            <option value="mi">Miles</option>
                        </select>
                    </div>
                    <div class="col-md-6">
                        <select class="form-select to-unit">
                            <option value="mm">Millimeters</option>
                            <option value="cm" selected>Centimeters</option>
                            <option value="m">Meters</option>
                            <option value="km">Kilometers</option>
                            <option value="in">Inches</option>
                            <option value="ft">Feet</option>
                            <option value="yd">Yards</option>
                            <option value="mi">Miles</option>
                        </select>
                    </div>
                `;
                break;
            case 'weight':
                options = `
                    <div class="col-md-6">
                        <select class="form-select from-unit">
                            <option value="mg">Milligrams</option>
                            <option value="g">Grams</option>
                            <option value="kg" selected>Kilograms</option>
                            <option value="t">Metric Tons</option>
                            <option value="oz">Ounces</option>
                            <option value="lb">Pounds</option>
                            <option value="st">Stones</option>
                        </select>
                    </div>
                    <div class="col-md-6">
                        <select class="form-select to-unit">
                            <option value="mg">Milligrams</option>
                            <option value="g" selected>Grams</option>
                            <option value="kg">Kilograms</option>
                            <option value="t">Metric Tons</option>
                            <option value="oz">Ounces</option>
                            <option value="lb">Pounds</option>
                            <option value="st">Stones</option>
                        </select>
                    </div>
                `;
                break;
            case 'temperature':
                options = `
                    <div class="col-md-6">
                        <select class="form-select from-unit">
                            <option value="c" selected>Celsius</option>
                            <option value="f">Fahrenheit</option>
                            <option value="k">Kelvin</option>
                        </select>
                    </div>
                    <div class="col-md-6">
                        <select class="form-select to-unit">
                            <option value="c">Celsius</option>
                            <option value="f" selected>Fahrenheit</option>
                            <option value="k">Kelvin</option>
                        </select>
                    </div>
                `;
                break;
            case 'area':
                options = `
                    <div class="col-md-6">
                        <select class="form-select from-unit">
                            <option value="mm2">Square mm</option>
                            <option value="cm2">Square cm</option>
                            <option value="m2" selected>Square m</option>
                            <option value="km2">Square km</option>
                            <option value="in2">Square in</option>
                            <option value="ft2">Square ft</option>
                            <option value="yd2">Square yd</option>
                            <option value="ac">Acres</option>
                            <option value="ha">Hectares</option>
                        </select>
                    </div>
                    <div class="col-md-6">
                        <select class="form-select to-unit">
                            <option value="mm2">Square mm</option>
                            <option value="cm2" selected>Square cm</option>
                            <option value="m2">Square m</option>
                            <option value="km2">Square km</option>
                            <option value="in2">Square in</option>
                            <option value="ft2">Square ft</option>
                            <option value="yd2">Square yd</option>
                            <option value="ac">Acres</option>
                            <option value="ha">Hectares</option>
                        </select>
                    </div>
                `;
                break;
        }
        
        unitOptions.innerHTML = options;
        document.querySelectorAll('.from-unit, .to-unit').forEach(select => {
            select.addEventListener('change', convertUnits);
        });
        
        convertUnits();
    }
    
    function convertUnits() {
        const value = parseFloat(unitValue.value) || 0;
        const fromUnit = document.querySelector('.from-unit').value;
        const toUnit = document.querySelector('.to-unit').value;
        const type = unitType.value;
        
        let result;
        
        switch(type) {
            case 'length':
                result = convertLength(value, fromUnit, toUnit);
                break;
            case 'weight':
                result = convertWeight(value, fromUnit, toUnit);
                break;
            case 'temperature':
                result = convertTemperature(value, fromUnit, toUnit);
                break;
            case 'area':
                result = convertArea(value, fromUnit, toUnit);
                break;
        }
        
        document.getElementById('unit-result').innerHTML = `
            <div class="alert alert-info">
                ${value} ${getUnitName(fromUnit, type)} = 
                <strong>${result.toFixed(6)} ${getUnitName(toUnit, type)}</strong>
            </div>
        `;
    }
}

// Conversion functions
function convertLength(value, from, to) {
    // Convert to meters first
    let meters;
    switch(from) {
        case 'mm': meters = value / 1000; break;
        case 'cm': meters = value / 100; break;
        case 'm': meters = value; break;
        case 'km': meters = value * 1000; break;
        case 'in': meters = value * 0.0254; break;
        case 'ft': meters = value * 0.3048; break;
        case 'yd': meters = value * 0.9144; break;
        case 'mi': meters = value * 1609.344; break;
    }
    
    // Convert to target unit
    switch(to) {
        case 'mm': return meters * 1000;
        case 'cm': return meters * 100;
        case 'm': return meters;
        case 'km': return meters / 1000;
        case 'in': return meters / 0.0254;
        case 'ft': return meters / 0.3048;
        case 'yd': return meters / 0.9144;
        case 'mi': return meters / 1609.344;
    }
}

function convertWeight(value, from, to) {
    // Convert to kilograms first
    let kg;
    switch(from) {
        case 'mg': kg = value / 1000000; break;
        case 'g': kg = value / 1000; break;
        case 'kg': kg = value; break;
        case 't': kg = value * 1000; break;
        case 'oz': kg = value * 0.0283495; break;
        case 'lb': kg = value * 0.453592; break;
        case 'st': kg = value * 6.35029; break;
    }
    
    // Convert to target unit
    switch(to) {
        case 'mg': return kg * 1000000;
        case 'g': return kg * 1000;
        case 'kg': return kg;
        case 't': return kg / 1000;
        case 'oz': return kg / 0.0283495;
        case 'lb': return kg / 0.453592;
        case 'st': return kg / 6.35029;
    }
}

function convertTemperature(value, from, to) {
    // Convert to Celsius first
    let celsius;
    switch(from) {
        case 'c': celsius = value; break;
        case 'f': celsius = (value - 32) * 5/9; break;
        case 'k': celsius = value - 273.15; break;
    }
    
    // Convert to target unit
    switch(to) {
        case 'c': return celsius;
        case 'f': return (celsius * 9/5) + 32;
        case 'k': return celsius + 273.15;
    }
}

function convertArea(value, from, to) {
    // Convert to square meters first
    let m2;
    switch(from) {
        case 'mm2': m2 = value / 1000000; break;
        case 'cm2': m2 = value / 10000; break;
        case 'm2': m2 = value; break;
        case 'km2': m2 = value * 1000000; break;
        case 'in2': m2 = value * 0.00064516; break;
        case 'ft2': m2 = value * 0.092903; break;
        case 'yd2': m2 = value * 0.836127; break;
        case 'ac': m2 = value * 4046.86; break;
        case 'ha': m2 = value * 10000; break;
    }
    
    // Convert to target unit
    switch(to) {
        case 'mm2': return m2 * 1000000;
        case 'cm2': return m2 * 10000;
        case 'm2': return m2;
        case 'km2': return m2 / 1000000;
        case 'in2': return m2 / 0.00064516;
        case 'ft2': return m2 / 0.092903;
        case 'yd2': return m2 / 0.836127;
        case 'ac': return m2 / 4046.86;
        case 'ha': return m2 / 10000;
    }
}

function getUnitName(unit, type) {
    const names = {
        length: {
            'mm': 'millimeters', 'cm': 'centimeters', 'm': 'meters', 'km': 'kilometers',
            'in': 'inches', 'ft': 'feet', 'yd': 'yards', 'mi': 'miles'
        },
        weight: {
            'mg': 'milligrams', 'g': 'grams', 'kg': 'kilograms', 't': 'metric tons',
            'oz': 'ounces', 'lb': 'pounds', 'st': 'stones'
        },
        temperature: {
            'c': '°C', 'f': '°F', 'k': 'K'
        },
        area: {
            'mm2': 'mm²', 'cm2': 'cm²', 'm2': 'm²', 'km2': 'km²',
            'in2': 'in²', 'ft2': 'ft²', 'yd2': 'yd²', 'ac': 'acres', 'ha': 'hectares'
        }
    };
    
    return names[type][unit];
}

// ==================== QR TOOLS ====================
function initQRTools() {
    // QR Code Generator
    const qrText = document.getElementById('qr-text');
    const qrSize = document.getElementById('qr-size');
    const qrColor = document.getElementById('qr-color');
    const generateQrBtn = document.getElementById('generate-qr');
    const qrResult = document.getElementById('qr-result');
    const downloadQr = document.getElementById('download-qr');
    
    generateQrBtn.addEventListener('click', function() {
        if (qrText.value.trim()) {
            generateQRCode(
                qrText.value.trim(),
                parseInt(qrSize.value),
                qrColor.value
            );
        } else {
            showAlert('Please enter text or URL to encode!', 'warning');
        }
    });
    
    function generateQRCode(text, size, color) {
        QRCode.toCanvas(text, {
            width: size,
            color: {
                dark: color,
                light: '#ffffff'
            }
        }, function(err, canvas) {
            if (err) {
                showAlert('Error generating QR code: ' + err.message, 'danger');
                return;
            }
            
            qrResult.innerHTML = '';
            qrResult.appendChild(canvas);
            downloadQr.classList.remove('d-none');
            
            // Set up download
            downloadQr.onclick = function() {
                const link = document.createElement('a');
                link.download = 'qrcode.png';
                link.href = canvas.toDataURL('image/png');
                link.click();
            };
        });
    }
    
    // QR Code Scanner
    const startScannerBtn = document.getElementById('start-scanner');
    const stopScannerBtn = document.getElementById('stop-scanner');
    const uploadQrBtn = document.getElementById('upload-qr');
    const qrUpload = document.getElementById('qr-upload');
    const qrScanner = document.getElementById('qr-scanner');
    const scanResult = document.getElementById('scan-result');
    
    let scannerStream = null;
    
    startScannerBtn.addEventListener('click', startScanner);
    stopScannerBtn.addEventListener('click', stopScanner);
    uploadQrBtn.addEventListener('click', function() {
        qrUpload.click();
    });
    
    qrUpload.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            scanQRFromFile(e.target.files[0]);
        }
    });
    
    function startScanner() {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            .then(function(stream) {
                scannerStream = stream;
                qrScanner.innerHTML = '<video id="scanner-video" playsinline autoplay></video>';
                const video = document.getElementById('scanner-video');
                video.srcObject = stream;
                
                startScannerBtn.classList.add('d-none');
                stopScannerBtn.classList.remove('d-none');
                
                // Start scanning
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                function scanFrame() {
                    if (!video.videoWidth) {
                        requestAnimationFrame(scanFrame);
                        return;
                    }
                    
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const code = jsQR(imageData.data, imageData.width, imageData.height);
                    
                    if (code) {
                        scanResult.innerHTML = `
                            <div class="alert alert-success">
                                <strong>QR Code detected:</strong><br>
                                ${code.data}
                            </div>
                        `;
                        stopScanner();
                    } else {
                        requestAnimationFrame(scanFrame);
                    }
                }
                
                video.onplaying = function() {
                    requestAnimationFrame(scanFrame);
                };
            })
            .catch(function(err) {
                showAlert('Error accessing camera: ' + err.message, 'danger');
            });
    }
    
    function stopScanner() {
        if (scannerStream) {
            scannerStream.getTracks().forEach(track => track.stop());
            scannerStream = null;
        }
        
        qrScanner.innerHTML = '';
        startScannerBtn.classList.remove('d-none');
        stopScannerBtn.classList.add('d-none');
    }
    
    function scanQRFromFile(file) {
        const img = new Image();
        const url = URL.createObjectURL(file);
        
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            
            if (code) {
                scanResult.innerHTML = `
                    <div class="alert alert-success">
                        <strong>QR Code detected:</strong><br>
                        ${code.data}
                    </div>
                `;
            } else {
                scanResult.innerHTML = `
                    <div class="alert alert-danger">
                        No QR code found in the image
                    </div>
                `;
            }
            
            URL.revokeObjectURL(url);
        };
        
        img.src = url;
    }
}

// ==================== HELPER FUNCTIONS ====================
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]);
}

function showAlert(message, type) {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alert.style.top = '20px';
    alert.style.right = '20px';
    alert.style.zIndex = '9999';
    alert.style.maxWidth = '300px';
    alert.role = 'alert';
    
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    document.body.appendChild(alert);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        const bsAlert = new bootstrap.Alert(alert);
        bsAlert.close();
    }, 5000);
}

// Initialize Bootstrap tooltips
document.addEventListener('DOMContentLoaded', function() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
});