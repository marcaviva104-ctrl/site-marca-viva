// Stories Component - Instagram Style Viewer
const storiesData = [
    {
        id: 'new',
        name: 'Novidades',
        avatar: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=150&h=150&fit=crop',
        items: [
            { type: 'image', url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=800&fit=crop', duration: 15000 },
            { type: 'image', url: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&h=800&fit=crop', duration: 15000 }
        ]
    },
    {
        id: 'vip',
        name: 'Kits VIP',
        avatar: 'https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?w=150&h=150&fit=crop',
        items: [
            { type: 'image', url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&h=800&fit=crop', duration: 15000 }
        ]
    },
    {
        id: 'eco',
        name: 'Eco',
        avatar: 'https://images.unsplash.com/photo-1542601906990-b4d3fb7d5fa5?w=150&h=150&fit=crop',
        items: [
            { type: 'image', url: 'https://images.unsplash.com/photo-1542601906990-b4d3fb7d5fa5?w=600&h=800&fit=crop', duration: 15000 },
            { type: 'image', url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=800&fit=crop', duration: 15000 }
        ]
    },
    {
        id: 'tech',
        name: 'Tech',
        avatar: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=150&h=150&fit=crop',
        items: [
            { type: 'image', url: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&h=800&fit=crop', duration: 15000 }
        ]
    }
];

let currentStoryIndex = 0;
let currentItemIndex = 0;
let timer = null;
let startTime = 0;
let remainingTime = 0; // For pause (future)
let isPaused = false;

// === INITIALIZATION ===
document.addEventListener('DOMContentLoaded', () => {
    renderStoriesList();
    injectViewerHTML();
});

function renderStoriesList() {
    const container = document.getElementById('stories-container');
    if (!container) return;

    container.innerHTML = '';
    const list = document.createElement('div');
    list.className = 'stories-list';

    storiesData.forEach((story, index) => {
        const item = document.createElement('div');
        item.className = 'story-item';
        item.onclick = () => openStory(index);
        item.innerHTML = `
            <div class="story-circle">
                <img src="${story.avatar}" alt="${story.name}">
            </div>
            <span class="story-name">${story.name}</span>
        `;
        list.appendChild(item);
    });

    container.appendChild(list);
}

function injectViewerHTML() {
    // Check if already exists
    if (document.getElementById('stories-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'stories-overlay';
    overlay.className = 'stories-overlay';
    overlay.innerHTML = `
        <div class="story-close-btn" onclick="closeStory()">&times;</div>
        
        <div class="story-viewer">
            <!-- Header -->
            <div class="story-header">
                <img id="viewer-avatar" class="story-header-avatar" src="" alt="">
                <span id="viewer-name" class="story-header-name"></span>
                <span id="viewer-time" class="story-header-time">15s</span>
            </div>

            <!-- Progress Bars -->
            <div id="progress-container" class="story-progress-container"></div>

            <!-- Navigation Zones -->
            <div class="story-nav-left" onclick="prevSegment()"></div>
            <div class="story-nav-right" onclick="nextSegment()"></div>

            <!-- Media -->
            <img id="story-image" class="story-media" src="" alt="">
            
            <!-- Gradient -->
            <div class="story-gradient"></div>
        </div>
    `;
    document.body.appendChild(overlay);
}

// === VIEWER LOGIC ===
function openStory(index) {
    currentStoryIndex = index;
    currentItemIndex = 0;

    const overlay = document.getElementById('stories-overlay');
    overlay.classList.add('active');

    loadStory(currentStoryIndex);
}

function closeStory() {
    const overlay = document.getElementById('stories-overlay');
    overlay.classList.remove('active');
    clearTimeout(timer);

    // Reset Progress Bars CSS
    const bars = document.querySelectorAll('.story-progress-fill');
    bars.forEach(bar => {
        bar.style.transition = 'none';
        bar.style.width = '0%';
    });
}

function loadStory(index) {
    const story = storiesData[index];

    // Update Header
    document.getElementById('viewer-avatar').src = story.avatar;
    document.getElementById('viewer-name').innerText = story.name;

    // Build Progress Bars
    const progressContainer = document.getElementById('progress-container');
    progressContainer.innerHTML = '';

    story.items.forEach((item, i) => {
        const segment = document.createElement('div');
        segment.className = 'story-progress-segment';
        segment.innerHTML = `<div class="story-progress-fill" id="progress-${i}"></div>`;
        progressContainer.appendChild(segment);
    });

    loadSegment(0);
}

function loadSegment(index) {
    currentItemIndex = index;
    const story = storiesData[currentStoryIndex];
    const item = story.items[index];

    // Update Media
    const img = document.getElementById('story-image');
    img.src = item.url; // Trigger load

    // Mark previous bars as full
    for (let i = 0; i < story.items.length; i++) {
        const bar = document.getElementById(`progress-${i}`);
        bar.style.transition = 'none';
        if (i < index) {
            bar.style.width = '100%';
        } else {
            bar.style.width = '0%';
        }
    }

    // Capture start time
    clearTimeout(timer);

    // Animate Current Bar
    // Small delay to allow DOM update
    setTimeout(() => {
        const currentBar = document.getElementById(`progress-${index}`);
        currentBar.style.transition = `width ${item.duration}ms linear`;
        currentBar.style.width = '100%';
    }, 50);

    // Set Timer for Auto-Advance
    timer = setTimeout(() => {
        nextSegment();
    }, item.duration);
}

function nextSegment() {
    const story = storiesData[currentStoryIndex];
    if (currentItemIndex < story.items.length - 1) {
        // Next Item in same story
        loadSegment(currentItemIndex + 1);
    } else {
        // End of story
        // In Instagram, it goes to next story in list.
        // User said: "quando for a ultima ele sai do hestory" (when it's the last one, it exits the history)
        // This implies closeStory(), OR maybe user means "last item of THIS story exits".
        // Let's interpret "exits" as closing the viewer for now, or check if there is a next story.
        // If there is a next story, we could go there.
        // But user phrased "sai do hestory" (exit history). I'll close it.
        closeStory();
    }
}

function prevSegment() {
    if (currentItemIndex > 0) {
        loadSegment(currentItemIndex - 1);
    } else {
        // Start of story
        // Go to previous story?
        if (currentStoryIndex > 0) {
            currentStoryIndex--;
            loadStory(currentStoryIndex);
            // Load last segment of prev story? Usually first.
            // Let's load first.
        } else {
            // First item of first story -> Restart or do nothing
            loadSegment(0);
        }
    }
}
