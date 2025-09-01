$(document).ready(function() {
    let allGroceries = [];
    const imageModal = new bootstrap.Modal($('#imageModal')[0]);

    // 1. Fetch all grocery items from the API
    function loadGroceries() {
        fetch('/api/groceries')
            .then(response => response.json())
            .then(data => {
                // Sort the data: null/future expiry dates first
                const today = new Date().toISOString().split('T')[0];
                data.sort((a, b) => {
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
                populateFilterTags();
            });
    }

    // 2. Render the gallery items
    function renderGallery(items) {
        const $container = $('#galleryContainer');
        $container.empty();
        items.forEach(item => {
            const tagsHtml = `<span class="badge bg-secondary">${item.tags.replace(/,/g, ', ')}</span>`;
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
                </div>
            `;
            $container.append(itemHtml);
        });
    }

    // 3. Populate filter tags
    function populateFilterTags() {
        const uniqueTags = [...new Set(allGroceries.flatMap(item => item.tags.split(',')))];
        const $filterContainer = $('#filterTagsContainer');
        $filterContainer.empty();
        uniqueTags.forEach(tag => {
            if (tag) {
                const $button = $('<button></button>')
                    .addClass('btn btn-sm btn-outline-info filter-tag')
                    .text(tag)
                    .attr('data-tag', tag);
                $filterContainer.append($button);
            }
        });
    }

    // 4. Handle filtering
    $('#filterTagsContainer').on('click', '.filter-tag', function() {
        $(this).toggleClass('active');
        const activeTags = $('.filter-tag.active').map(function() {
            return $(this).data('tag');
        }).get();

        if (activeTags.length === 0) {
            renderGallery(allGroceries);
        } else {
            const filteredGroceries = allGroceries.filter(item => {
                const itemTags = item.tags.split(',');
                return activeTags.every(activeTag => itemTags.includes(activeTag));
            });
            renderGallery(filteredGroceries);
        }
    });

    // 5. Handle marking item as consumed
    $('#galleryContainer').on('change', '.consume-checkbox', function() {
        const itemId = $(this).data('id');
        if (confirm('Mark this item as fully consumed? It will be removed from the gallery.')) {
            fetch(`/api/grocery/consume/${itemId}`, { method: 'POST' })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        $(`#item-${itemId}`).fadeOut(500, function() { $(this).remove(); });
                    }
                });
        } else {
            $(this).prop('checked', false);
        }
    });
    
    // 6. Handle fullscreen image view
    $('#galleryContainer').on('click', '.gallery-image', function() {
        const src = $(this).attr('src');
        $('#fullscreenImage').attr('src', src);
        imageModal.show();
    });

    // Initial load
    loadGroceries();
});