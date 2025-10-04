$(document).ready(function() {
    let resizedImage = null;
    let tagsData = [];
    let selectedTag = null;
    let selectedSubtag = null;
    let quantity = 1;

    const $tagsContainer = $('#tagsContainer');
    const $subtagsContainer = $('#subtagsContainer');
    

    // 1. Load Tag/Subtag data from JSON
    $.ajax({
        url: 'tags.json',
        dataType: 'json',
        success: function(data) {
            console.log("app.js: Successfully loaded and parsed tags.json", data);
            tagsData = data;
            renderTags();
        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.error("app.js: Error loading tags.json!");
            console.error("Status: " + textStatus);
            console.error("Error Thrown: " + errorThrown);
            console.error("Response Text:", jqXHR.responseText);
            $('#tagsContainer').html('<div class="alert alert-danger">Error: Could not load categories. Please check the tags.json file and refresh.</div>');
        }
    });

    function renderTags() {
        $tagsContainer.empty();
        tagsData.forEach(item => {
            const $button = $('<button></button>')
                .addClass('btn btn-outline-info')
                .text(item.tag)
                .data('tag', item.tag);
            $tagsContainer.append($button);
        });
    }

    
    function renderSubtags(tagName) {
        const tagObject = tagsData.find(t => t.tag === tagName);
        if (!tagObject) return;

        $subtagsContainer.empty(); // Clear previous content

        const $button = $('<button></button>') //Create a tag btn
                .addClass('btn btn-secondary')
                .text(tagName)
                .attr('id', 'backToTagsBtn');    
            $subtagsContainer.append($button);


        //Render the subtag buttons
        tagObject.subtags.forEach(subtag => {
            const $buttontgs = $('<button></button>')
                .addClass('btn btn-outline-light')
                .text(subtag)
                .data('subtag', subtag);
            $subtagsContainer.append($buttontgs);
        });

       
    }

    // --- Event Handlers ---

    // Click on a main tag
    $tagsContainer.on('click', '.btn', function() {
        selectedTag = $(this).data('tag');
        selectedSubtag = null; // Reset subtag selection

        renderSubtags(selectedTag);
        $(this).addClass('active').siblings().removeClass('active');
        $tagsContainer.addClass('hidden');
        $subtagsContainer.removeClass('hidden');
    });

    // Click on a subtag (single selection)
    $subtagsContainer.on('click', '.btn:not(#backToTagsBtn)', function() { // Ensure we don't select the back button
        selectedSubtag = $(this).data('subtag');
        $(this).addClass('active').siblings().removeClass('active');
    });

    // Use a "delegated" event handler for the dynamically created back button
    $subtagsContainer.on('click', '#backToTagsBtn', function() {
        selectedTag = null;
        selectedSubtag = null;
        
        $subtagsContainer.addClass('hidden').empty();
        $tagsContainer.removeClass('hidden');
        $tagsContainer.find('.btn').removeClass('active');
    });


    // Quantity buttons
    $('#btnIncrease').on('click', function() {
        quantity++;
        $('#quantityDisplay').text(quantity);
    });

    $('#btnDecrease').on('click', function() {
        if (quantity > 1) {
            quantity--;
            $('#quantityDisplay').text(quantity);
        }
    });

    // --- Date Selectors & Image Handling (No Changes) ---
    $(document).on('click', '.date-selector .btn', function() {
        $(this).siblings().removeClass('active');
        $(this).toggleClass('active');
    });
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
        if (i === 0) $btn.addClass('active');
        $yearSelector.append($btn);
    }
    $('#imageInput').on('change', function(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const targetWidth = 100;
                const scaleFactor = targetWidth / img.width;
                canvas.width = targetWidth;
                canvas.height = img.height * scaleFactor;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resizedImage = canvas.toDataURL('image/jpeg');
                $('#imagePreview').attr('src', resizedImage).show();
            }
            img.src = e.target.result;
        }
        reader.readAsDataURL(file);
    });

    // --- SAVE LOGIC ---
    $('#saveButton').on('click', async function() {
        if (!selectedTag || !selectedSubtag) {
            alert('Please select a category and sub-category.');
            return;
        }
        if (!resizedImage) {
            alert('Please upload an image.');
            return;
        }
        $(this).prop('disabled', true).text('Saving...');
        const itemName = $('#itemName').val().trim();
        const day = $('#daySelector .btn.active').text();
        const month = $('#monthSelector .btn.active').data('month');
        const year = $('#yearSelector .btn.active').text();
        let expiryDate = null;
        if (day && month && year) {
            expiryDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
        const groceryItem = {
            name: itemName,
            tags: `${selectedTag},${selectedSubtag}`,
            expiry_date: expiryDate,
            image_base64: resizedImage,
        };
        const savePromises = [];
        for (let i = 0; i < quantity; i++) {
            const savePromise = fetch('https://grocery-track-api-ea-fvh3amgzd6f7fjdw.centralindia-01.azurewebsites.net/api/grocery', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(groceryItem),
            });
            savePromises.push(savePromise);
        }
        try {
            await Promise.all(savePromises);
            //alert(`Successfully saved ${quantity} item(s)!`);
            window.location.reload();
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while saving.');
            $(this).prop('disabled', false).text('Save Item');
        }
    });
});