$(document).ready(function() {
    let allGroceries = [];
    let tagsData = [];
    let selectedFilterTag = null;
    let selectedFilterSubtag = null;

    const imageModal = new bootstrap.Modal($('#imageModal')[0]);
    const $filterTagsContainer = $('#filterTagsContainer');
    const $filterSubtagsContainer = $('#filterSubtagsContainer');
    const $filterSubtagsHeader = $('#filterSubtagsHeader');

    // 1. Fetch grocery items from the API
    function loadGroceries() {
        fetch('/api/groceries')
            .then(response => response.json())
            .then(data => {
                const today = new Date().toISOString().split('T')[0];
                data.sort((a, b) => {
                    // Sorting logic remains the same
                    const aIsNull = a.expiry_date === null;
                    const bIsNull = b.expiry_date === null;
                    const aIsPast = a.expiry_date < today;
                    const bIsPast = b.expiry_date < today;
                    if (aIsNull && !bIsNull) return -1;
                    if (!aIsNull && bIsNull) return 1;
                    if (aIsPast && !bIsPast) return 1;
                    if (!aIsPast && bIsPast) return -1;
                    return new Date(a.expiry_date) - new Date(b.expiry_date);
                });
                allGroceries = data;
                renderGallery(allGroceries);
            });
    }

    // 2. Load Tag/Subtag data for filtering
    $.ajax({
        url: 'tags.json',
        dataType: 'json',
        success: function(data) {
            // This block runs if the file is loaded and parsed successfully
            console.log("gallery.js: Successfully loaded and parsed tags.json", data);
            tagsData = data;
            renderFilterTags();
        },
        error: function(jqXHR, textStatus, errorThrown) {
            // This block runs if anything goes wrong
            console.error("gallery.js: Error loading tags.json!");
            console.error("Status: " + textStatus);
            console.error("Error Thrown: " + errorThrown);
            console.error("Response Text:", jqXHR.responseText);
            $('#tagsContainer').html('<div class="alert alert-danger">Error: Could not load categories. Please check the tags.json file and refresh.</div>');
        }
    });

    function renderFilterTags() {
        $filterTagsContainer.empty();
        // Add an "All" button
        $filterTagsContainer.append('<button class="btn btn-sm btn-info active" data-tag="All">All</button>');
        tagsData.forEach(item => {
            const $button = $('<button></button>')
                .addClass('btn btn-sm btn-outline-info')
                .text(item.tag)
                .data('tag', item.tag);
            $filterTagsContainer.append($button);
        });
    }

    function renderFilterSubtags(tagName) {
        const tagObject = tagsData.find(t => t.tag === tagName);
        if (!tagObject) return;

        $filterSubtagsContainer.empty();
        $filterSubtagsContainer.append('<button class="btn btn-sm btn-light active" data-subtag="All">All Sub-Categories</button>');
        tagObject.subtags.forEach(subtag => {
            const $button = $('<button></button>')
                .addClass('btn btn-sm btn-outline-light')
                .text(subtag)
                .data('subtag', subtag);
            $filterSubtagsContainer.append($button);
        });
    }

    // --- Filter Event Handlers ---

    $filterTagsContainer.on('click', '.btn', function() {
        selectedFilterTag = $(this).data('tag');
        $(this).addClass('active').siblings().removeClass('active');
        
        if (selectedFilterTag === 'All') {
            $('#backToFilterTagsBtn').click(); // Go back to main view and filter all
        } else {
            $('#selectedFilterTagText').text(selectedFilterTag);
            renderFilterSubtags(selectedFilterTag);
            $filterTagsContainer.hide();
            $filterSubtagsHeader.show();
            $filterSubtagsContainer.show();
        }
        applyFilters();
    });

    $('#backToFilterTagsBtn').on('click', function() {
        selectedFilterTag = null;
        selectedFilterSubtag = null;
        $filterSubtagsContainer.hide().empty();
        $filterSubtagsHeader.hide();
        $filterTagsContainer.show();
        $filterTagsContainer.find('[data-tag="All"]').addClass('active').siblings().removeClass('active');
        applyFilters();
    });

    $filterSubtagsContainer.on('click', '.btn', function() {
        selectedFilterSubtag = $(this).data('subtag');
        $(this).addClass('active').siblings().removeClass('active');
        applyFilters();
    });

    function applyFilters() {
        let filteredGroceries = allGroceries;

        if (selectedFilterTag && selectedFilterTag !== 'All') {
            filteredGroceries = filteredGroceries.filter(item => {
                const itemTag = item.tags.split(',')[0];
                return itemTag === selectedFilterTag;
            });

            if (selectedFilterSubtag && selectedFilterSubtag !== 'All') {
                filteredGroceries = filteredGroceries.filter(item => {
                    const itemSubtag = item.tags.split(',')[1];
                    return itemSubtag === selectedFilterSubtag;
                });
            }
        }
        renderGallery(filteredGroceries);
    }
    
    // --- Render Gallery & Other Logic (No changes here) ---
    function renderGallery(items) {
        const $container = $('#galleryContainer');
        $container.empty();
        items.forEach(item => {
            const tagsHtml = `<span class="badge bg-secondary">${item.tags.replace(/,/g, ' / ')}</span>`;
            const expiryHtml = item.expiry_date ? `<p class="card-text"><small class="text-muted">Expires: ${item.expiry_date}</small></p>` : '';
            const itemHtml = `
                <div class="col-6 col-md-4 col-lg-3" id="item-${item.id}">
                    <div class="card bg-secondary-subtle gallery-item">
                        <img src="${item.image_base64}" class="card-img-top gallery-image" alt="${item.name || 'Grocery Item'}" data-item-id="${item.id}">
                        <div class="card-body p-2">
                            <h6 class="card-title">${item.name || 'Unnamed Item'}</h6>
                            ${tagsHtml}
                            ${expiryHtml}
                        </div>
                        <input type="checkbox" class="form-check-input consume-checkbox" data-id="${item.id}" title="Mark as consumed">
                    </div>
                </div>`;
            $container.append(itemHtml);
        });
    }
    $('#galleryContainer').on('change', '.consume-checkbox', function() {
        const itemId = $(this).data('id');
        if (confirm('Mark this item as fully consumed? It will be removed from the gallery.')) {
            fetch(`/api/grocery/consume/${itemId}`, { method: 'POST' })
                .then(res => res.json())
                .then(data => { if (data.success) $(`#item-${itemId}`).fadeOut(500, function() { $(this).remove(); }); });
        } else {
            $(this).prop('checked', false);
        }
    });
    $('#galleryContainer').on('click', '.gallery-image', function() {
        const src = $(this).attr('src');
        $('#fullscreenImage').attr('src', src);
        imageModal.show();
    });
    loadGroceries();
});