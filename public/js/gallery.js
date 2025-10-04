$(document).ready(function() {
    
    let tagsData = [];
    let selectedFilterTag = null;
    let selectedFilterSubtag = null;

    const imageModal = new bootstrap.Modal($('#imageModal')[0]);
    const $filterTagsContainer = $('#filterTagsContainer');
    const $filterSubtagsContainer = $('#filterSubtagsContainer');

    // Helper function to format dates
    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
            const year = String(date.getFullYear()).slice(-2);
            return `${day}/${month}/${year}`;
        } catch (e) {
            return 'N/A';
        }
    }

    // Load Tag/Subtag data for building the filter controls (this stays the same)
    $.ajax({
        url: 'tags.json',
        dataType: 'json',
        success: function(data) {
            console.log("gallery.js: Successfully loaded and parsed tags.json", data);
            tagsData = data;
            renderFilterTags();
        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.error("gallery.js: Error loading tags.json!", errorThrown);
            $('#filterTagsContainer').html('<div class="alert alert-danger">Error: Could not load categories.</div>');
        }
    });

    function renderFilterTags() {
        $filterTagsContainer.empty();
        
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
        
        const $button = $('<button></button>') //Create a tag btn
                .addClass('btn btn-secondary')
                .text(tagName)
                .attr('id', 'backToTagsBtn');    
            $filterSubtagsContainer.append($button);

        tagObject.subtags.forEach(subtag => {
            const $buttontgs = $('<button></button>')
                .addClass('btn btn-sm btn-outline-light')
                .text(subtag)
                .data('subtag', subtag);
            $filterSubtagsContainer.append($buttontgs);
        });
        
    }


    // --- Event Handlers ---

    // --- Filter Event Handlers ---
    $filterTagsContainer.on('click', '.btn', function() {
        selectedFilterSubtag = null;
        selectedFilterTag = $(this).data('tag');
        $(this).addClass('active').siblings().removeClass('active');
        
        renderFilterSubtags(selectedFilterTag);
        $filterTagsContainer.addClass('hidden');
        $filterSubtagsContainer.removeClass('hidden');
        applyFilters();
    });

    $filterSubtagsContainer.on('click', '.btn:not(#backToTagsBtn)', function() {
        selectedFilterSubtag = $(this).data('subtag');
        $(this).addClass('active').siblings().removeClass('active');
        applyFilters();
    });

    // Use a "delegated" event handler for the dynamically created back button
    $filterSubtagsContainer.on('click', '#backToTagsBtn', function() {
        selectedFilterTag = null;
        selectedFilterSubtag = null;
        
        $filterSubtagsContainer.addClass('hidden').empty();
        $filterTagsContainer.removeClass('hidden');
        $filterTagsContainer.find('.btn').removeClass('active');
    });

    function applyFilters() {
        // Only fetch data if a specific subtag has been selected.
        if (!selectedFilterTag || !selectedFilterSubtag) {
            renderGallery([]); // Clear the gallery if no specific subtag is chosen
            return;
        }

        // Show a loading indicator
        $('#galleryContainer').html('<p class="text-center">Loading items...</p>');

        const url = `/api/groceries?tag=${encodeURIComponent(selectedFilterTag)}&subtag=${encodeURIComponent(selectedFilterSubtag)}`;
        
        fetch(url)
            .then(response => response.json())
            .then(filteredData => {
                renderGallery(filteredData);
            })
            .catch(error => {
                console.error('Error fetching groceries from api:', error);
                $('#galleryContainer').html('<p class="text-center text-danger">Failed to load items.</p>');
            });
    }
    
    // --- Render Gallery & Other Logic (No other changes needed below) ---
    function renderGallery(items) {
        const $container = $('#galleryContainer');
        $container.empty();
        if (items.length === 0) {
            $container.html('<p class="text-center text-muted">No items found for this sub-category.</p>');
        }
        items.forEach(item => {
            const tagsHtml = `<span class="badge bg-secondary">${item.tags.replace(/,/g, ' / ')}</span>`;
            const expiryHtml = item.expiry_date ? `<p class="card-text"><small class="text-muted">Expires: ${formatDate(item.expiry_date)}</small></p>` : '';
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
    
});