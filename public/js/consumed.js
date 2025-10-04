$(document).ready(function() {
    let tagsData = [];
    let selectedFilterTag = null;
    let selectedFilterSubtag = null;

    const imageModal = new bootstrap.Modal($('#imageModal')[0]);
    const $filterTagsContainer = $('#filterTagsContainer');
    const $filterSubtagsContainer = $('#filterSubtagsContainer');
     // --- Selectors for date inputs ---
    const $fromDate = $('#fromDate');
    const $toDate = $('#toDate');

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

    $.ajax({
        url: 'tags.json',
        dataType: 'json',
        success: function(data) {
            tagsData = data;
            renderFilterTags();
        },
        error: function(jqXHR, textStatus, errorThrown) {
            $('#filterTagsContainer').html('<div class="alert alert-danger">Error: Could not load categories.</div>');
        }
    });

    function renderFilterTags() {
        $filterTagsContainer.empty();
        
        tagsData.forEach(item => {
            const $button = $('<button></button>').addClass('btn btn-sm btn-outline-info').text(item.tag).data('tag', item.tag);
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

    $filterSubtagsContainer.on('click', '#backToTagsBtn', function() {
        selectedFilterTag = null;
        selectedFilterSubtag = null;
        
        $filterSubtagsContainer.addClass('hidden').empty();
        $filterTagsContainer.removeClass('hidden');
        $filterTagsContainer.find('.btn').removeClass('active');
    });

    $filterSubtagsContainer.on('click', '.btn:not(#backToFilterTagsBtn)', function() {
        selectedFilterSubtag = $(this).data('subtag');
        $(this).addClass('active').siblings().removeClass('active');
        applyFilters();
    });

    // --- NEW: Event listener for date inputs ---
    $fromDate.on('change', applyFilters);
    $toDate.on('change', applyFilters);

    function applyFilters() {
        if (!selectedFilterTag || !selectedFilterSubtag ) {
            renderGallery([]);
            return;
        }

        $('#galleryContainer').html('<p class="text-center">Loading items...</p>');
        
        // --- KEY CHANGE: Reading date values and adding to URL ---
        const fromDateVal = $fromDate.val();
        const toDateVal = $toDate.val();

        // --- Added 'consumed=true' to the URL ---
        var url = `https://grocery-track-api-ea-fvh3amgzd6f7fjdw.centralindia-01.azurewebsites.net/api/groceries?consumed=true&tag=${encodeURIComponent(selectedFilterTag)}&subtag=${encodeURIComponent(selectedFilterSubtag)}`;
        if (fromDateVal) {
            url += `&from_date=${encodeURIComponent(fromDateVal)}`;
        }
        if (toDateVal) {
            url += `&to_date=${encodeURIComponent(toDateVal)}`;
        }
        fetch(url)
            .then(response => response.json())
            .then(filteredData => renderGallery(filteredData))
            .catch(error => {
                $('#galleryContainer').html('<p class="text-center text-danger">Failed to load items.</p>');
            });
    }
    
    // --- Updated renderGallery function ---
    function renderGallery(items) {
        const $container = $('#galleryContainer');
        $container.empty();
        if (items.length === 0) {
            $container.html('<p class="text-center text-muted">No consumed items found for this sub-category.</p>');
        }
        items.forEach(item => {
            const tagsHtml = `<span class="badge bg-secondary">${item.tags.replace(/,/g, ' / ')}</span>`;
            // Use the formatDate helper
            const createdDate = formatDate(item.created_at);
            const expiryDate = formatDate(item.expiry_date);
            const consumedDate = formatDate(item.consumed_at);
            const dateHtml = `<p class="card-text mb-0"><small class="text-muted">Consumed: ${consumedDate}</small></p>
                              <p class="card-text"><small class="text-muted">Expired: ${expiryDate}</small></p>`;

            const itemHtml = `
                <div class="col-6 col-md-4 col-lg-3" id="item-${item.id}">
                    <div class="card bg-secondary-subtle gallery-item">
                        <img src="${item.image_base64}" class="card-img-top gallery-image" alt="${item.name || 'Grocery Item'}" data-item-id="${item.id}">
                        <div class="card-body p-2">
                            <h6 class="card-title">${item.name || 'Unnamed Item'}</h6>
                            ${tagsHtml}
                            ${dateHtml}
                        </div>
                        </div>
                </div>`;
            $container.append(itemHtml);
        });
    }

    $('#galleryContainer').on('click', '.gallery-image', function() {
        const src = $(this).attr('src');
        $('#fullscreenImage').attr('src', src);
        imageModal.show();
    });
});