$(document).ready(function() {
    let resizedImage = null;

    // 1. Load Tags from CSV
    $.ajax({
        url: 'tags.csv',
        dataType: 'text',
    }).done(function(data) {
        const tags = data.split(',');
        const $tagsContainer = $('#tagsContainer');
        tags.forEach(tag => {
            if (tag.trim()) {
                // Using Bootstrap buttons for tags
                const $button = $('<button></button>')
                    .addClass('btn btn-outline-info')
                    .text(tag.trim())
                    .attr('data-tag', tag.trim());
                $tagsContainer.append($button);
            }
        });
    });

    // Toggle active state for tags and date buttons
    $(document).on('click', '#tagsContainer .btn, .date-selector .btn', function() {
        // For date selectors, make them behave like radio buttons
        if ($(this).parent().hasClass('date-selector')) {
            $(this).siblings().removeClass('active');
        }
        $(this).toggleClass('active');
    });

    // 2. Populate Date Selectors
    const now = new Date();
    const currentYear = now.getFullYear();
    const $daySelector = $('#daySelector');
    const $monthSelector = $('#monthSelector');
    const $yearSelector = $('#yearSelector');

    for (let i = 1; i <= 31; i++) $daySelector.append(`<button class="btn btn-sm btn-outline-warning">${i}</button>`);
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    monthNames.forEach((month, index) => {
        $monthSelector.append(`<button class="btn btn-sm btn-outline-success" data-month="${index+1}">${month}</button>`);
    });
    for (let i = 0; i < 4; i++) {
        const year = currentYear + i;
        const $btn = $(`<button class="btn btn-sm btn-outline-danger">${year}</button>`);
        if (i === 0) $btn.addClass('active'); // Default to current year
        $yearSelector.append($btn);
    }
    
    // 3. Handle Image Upload and Resizing
    $('#imageInput').on('change', function(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                const targetWidth = 300; // Downsize to 100px width
                const scaleFactor = targetWidth / img.width;
                canvas.width = targetWidth;
                canvas.height = img.height * scaleFactor;

                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                // Get the resized image as a base64 string
                resizedImage = canvas.toDataURL('image/jpeg');
                
                // Show preview
                $('#imagePreview').attr('src', resizedImage).show();
            }
            img.src = e.target.result;
        }
        reader.readAsDataURL(file);
    });

    // 4. Handle Save Button Click
    $('#saveButton').on('click', function() {
        // Collect data
        const itemName = $('#itemName').val().trim();
        const selectedTags = $('#tagsContainer .btn.active').map(function() {
            return $(this).data('tag');
        }).get();

        // Construct expiry date
        const day = $('#daySelector .btn.active').text();
        const month = $('#monthSelector .btn.active').data('month');
        const year = $('#yearSelector .btn.active').text();
        let expiryDate = null;
        if (day && month && year) {
            // Format as YYYY-MM-DD for proper sorting
            expiryDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }

        // Validation
        if (selectedTags.length === 0) {
            alert('Please select at least one tag.');
            return;
        }
        if (!resizedImage) {
            alert('Please upload an image.');
            return;
        }

        // Create data payload
        const groceryItem = {
            name: itemName,
            tags: selectedTags.join(','), // Store as comma-separated string
            expiry_date: expiryDate,
            image_base64: resizedImage,
        };
        
        // Send data to backend API
        fetch('/api/grocery', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(groceryItem),
        })
        .then(response => response.json())
        .then(data => {
            alert('Item saved successfully!');
            // Reset form
            window.location.reload();
        })
        .catch((error) => {
            console.error('Error:', error);
            alert('Error saving item.');
        });
    });
});