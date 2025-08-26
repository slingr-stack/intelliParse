document.addEventListener('DOMContentLoaded', () => {
    // --- Get DOM Element References & Configuration ---
    const ingestorForm = document.getElementById('ingestorForm');
    const fileInput = document.getElementById('fileInput');
    const fileList = document.getElementById('fileList');
    const fileListContainer = document.getElementById('fileListContainer');
    const passwordInput = document.getElementById('password');
    const passwordConfirmationInput = document.getElementById('passwordConfirmation');
    const passwordError = document.getElementById('passwordError');
    
    // Updated textInputs array
    const textInputs = [
        document.getElementById('firstName'),
        document.getElementById('lastName'),
        document.getElementById('email'),
        passwordInput,
        passwordConfirmationInput
    ];
    const submitBtn = document.getElementById('submitBtn');

    const MAX_FILES = 5;
    const MAX_FILE_SIZE_MB = 5;
    const ALLOWED_EXTENSIONS = ['csv', 'pdf', 'png', 'jpg', 'jpeg'];

    // This array will hold the File objects that have passed validation.
    let validatedFiles = [];

    // --- Validation Logic ---
    function validateForm() {
        // Clear previous errors
        passwordError.textContent = '';
        passwordInput.classList.remove('input-error');
        passwordConfirmationInput.classList.remove('input-error');

        // Check password length
        let isPasswordLengthValid = passwordInput.value.length >= 6;
        if (passwordInput.value.length > 0 && !isPasswordLengthValid) {
            passwordError.textContent = 'Password must be at least 6 characters.';
            passwordInput.classList.add('input-error');
        }

        // Check if passwords match
        let doPasswordsMatch = passwordInput.value === passwordConfirmationInput.value;
        if (passwordConfirmationInput.value.length > 0 && !doPasswordsMatch) {
            passwordError.textContent = 'Passwords do not match.';
            passwordConfirmationInput.classList.add('input-error');
        }

        // Check if all other text fields are filled
        const areAllFieldsFilled = textInputs.every(input => input.value.trim() !== '');
        const hasFiles = validatedFiles.length > 0;
        
        // Final check to enable/disable the submit button
        const isFormValid = areAllFieldsFilled && hasFiles && isPasswordLengthValid && doPasswordsMatch;
        submitBtn.disabled = !isFormValid;
    }

    // --- Event Listeners ---
    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
        e.target.value = '';
    });
    textInputs.forEach(input => input.addEventListener('input', validateForm));
    const dropZone = document.querySelector('.drop-zone');
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drop-zone--over'); });
    ['dragleave', 'dragend'].forEach(type => dropZone.addEventListener(type, () => dropZone.classList.remove('drop-zone--over')));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drop-zone--over');
        if (e.dataTransfer.files.length) {
            handleFiles(e.dataTransfer.files);
            fileInput.value = '';
        }
    });

    // --- MAIN SUBMIT HANDLER ---
    ingestorForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';

        try {
            // --- STEP 1: UPLOAD EACH FILE AND COLLECT IDs ---
            console.log('Starting file uploads...');
            const uploadedFileResponses = [];
            for (const file of validatedFiles) {
                console.log(`Uploading ${file.name}...`);
                const fileData = new FormData();
                fileData.append('file', file, file.name);

                const response = await fetch('https://aiagents.slingrs.io/dev/runtime/api/files', {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'token': 'Vb4WujhRMjjoFKlV4V1qndwD0pcPwMxX'
                    },
                    body: fileData,
                });

                if (!response.ok) {
                    throw new Error(`Upload failed for ${file.name}`);
                }
                const result = await response.json();
                uploadedFileResponses.push(result);
            }
            console.log('All files uploaded successfully:', uploadedFileResponses);

            // --- STEP 2: SUBMIT FORM DATA WITH ALL FILE IDs ---
            console.log('Submitting final form data...');

            const documentIds = uploadedFileResponses.map(res => res.fileId);

            // Create the final payload
            const payloadForSecondCall = {
                firstName: document.getElementById('firstName').value,
                lastName: document.getElementById('lastName').value,
                email: document.getElementById('email').value,
                password: document.getElementById('password').value,
                passwordConfirmation: document.getElementById('passwordConfirmation').value,
                files: documentIds
            };



            const response2 = await fetch('https://aiagents.slingrs.io/dev/runtime/api/data/dummyEntity/createPublicData/', {
                method: 'PUT', // Or 'POST' depending on your API
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'token': 'Vb4WujhRMjjoFKlV4V1qndwD0pcPwMxX'
                },
                body: JSON.stringify(payloadForSecondCall),
            });

            if (!response2.ok) {
                throw new Error('Final data submission failed');
            }

            const finalData = await response2.json();
            console.log('✅ Process Complete!', finalData);
            window.location.href = "https://aiagents.slingrs.io/dev/runtime";
            //window.location.href = "https://aiagents.slingrs.io/prod/runtime";
        } catch (error) {
            console.error('❌ An error occurred during submission:', error);
            alert(`An error occurred: ${error.message}`);
        } finally {
            // Re-enable the button and reset its text
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit';
        }
    });

    // --- File Preview & Validation Logic ---
    function handleFiles(files) {
        if (validatedFiles.length + files.length > MAX_FILES) {
            alert(`You can only upload a total of ${MAX_FILES} files.`);
            return;
        }
        if (files.length > 0) fileListContainer.style.display = 'block';

        for (const file of files) {
            const listItem = document.createElement('li');
            listItem.className = 'file-item';
            listItem.innerHTML = `<span class="file-name">${file.name}</span><div class="status-icon"><div class="spinner"></div></div>`;
            fileList.appendChild(listItem);
            processFile(file, listItem);
        }
        validateForm();
    }


    function processFile(file, listItem) {
        const statusIcon = listItem.querySelector('.status-icon');
        const fileExtension = file.name.split('.').pop().toLowerCase();

        // VALIDATION CHECKS (no changes here)
        if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
            listItem.classList.add('file-item--error');
            statusIcon.innerHTML = `<div class="error-icon" title="Invalid file type">&times;</div>`;
            return;
        }
        const fileSizeMB = file.size / 1024 / 1024;
        if (fileSizeMB > MAX_FILE_SIZE_MB) {
            listItem.classList.add('file-item--error');
            statusIcon.innerHTML = `<div class="error-icon" title="File exceeds ${MAX_FILE_SIZE_MB}MB">&times;</div>`;
            return;
        }

        // If validation passes, update the UI after a short delay
        setTimeout(() => {
            // Add file to our state array
            validatedFiles.push(file);

            // Clear the spinner
            statusIcon.innerHTML = '';

            // Create the checkmark
            const checkmark = document.createElement('div');
            checkmark.className = 'checkmark';

            // Create the remove button
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.innerHTML = '&times;'; // The 'x' character
            removeBtn.title = 'Remove file';

            // ** NEW: Add the click event listener for the remove button **
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent parent events

                // 1. Remove the file from our state array
                validatedFiles = validatedFiles.filter(f => f !== file);

                // 2. Remove the list item from the UI
                listItem.remove();

                // 3. Re-validate the main form button
                validateForm();

                // 4. If no files are left, disable the text fields again
                if (validatedFiles.length === 0) {
                    textInputs.forEach(input => input.disabled = true);
                    fileListContainer.style.display = 'none';
                }
            });

            // Add the new elements to the status icon container
            statusIcon.appendChild(checkmark);
            statusIcon.appendChild(removeBtn);

            // Enable form fields now that we have a valid file.
            if (validatedFiles.length > 0) {
                textInputs.forEach(input => input.disabled = false);
            }

            // Validate the main form button's state
            validateForm();
        }, 500);
    }
});