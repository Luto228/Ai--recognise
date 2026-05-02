const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const resultDiv = document.getElementById('result');
const loader = document.getElementById('loader');
const uploadText = document.getElementById('upload-text');
const verdictText = document.getElementById('verdict-text');
const confidenceText = document.getElementById('confidence-text');

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

async function handleFile(file) {
    if (!file.type.startsWith('image/')) {
        alert('Please select an image file.');
        return;
    }

    // Reset UI
    resultDiv.style.display = 'none';
    loader.style.display = 'block';
    uploadText.style.display = 'none';

    const formData = new FormData();
    formData.append('image', file);

    try {
        // Note: In a real extension, you'd point to your deployed backend
        const response = await fetch('http://localhost:5000/analyze', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error('Backend error');

        const data = await response.json();
        
        loader.style.display = 'none';
        uploadText.style.display = 'block';
        resultDiv.style.display = 'block';
        
        verdictText.textContent = data.verdict;
        confidenceText.textContent = `Confidence: ${data.confidence}`;
        
        // Add reason display if it doesn't exist
        let reasonElem = document.getElementById('reason-text');
        if (!reasonElem) {
            reasonElem = document.createElement('div');
            reasonElem.id = 'reason-text';
            reasonElem.style.fontSize = '0.75rem';
            reasonElem.style.marginTop = '8px';
            reasonElem.style.opacity = '0.8';
            resultDiv.appendChild(reasonElem);
        }
        reasonElem.textContent = data.reason || '';
        
        resultDiv.className = data.is_ai ? 'verdict-ai' : 'verdict-real';
        
    } catch (error) {
        console.error(error);
        loader.style.display = 'none';
        uploadText.style.display = 'block';
        alert('Could not connect to the analysis server. Make sure Main.py is running.');
    }
}
