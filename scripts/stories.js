/**
 * Stories Client Manager (Highlights Edition)
 * Handles fetching, rendering highlight bubbles, and playing media.
 */

const StoriesManager = {
    // Data
    highlights: [],      // Metadata for highlights (id, title, cover)
    storiesMap: {},      // { highlightId: [story1, story2, ...] }

    // Playback State
    currentPlaylist: [],
    currentIndex: 0,
    timer: null,

    // Config
    TABLE_STORIES: 'stories',
    TABLE_HIGHLIGHTS: 'highlights',

    async init() {
        console.log("Stories Manager Init (Highlights)...");
        await this.fetchData();
    },

    async fetchData() {
        try {
            // Parallel Fetch
            const [storiesRes, highlightsRes] = await Promise.all([
                window.supabase.from(this.TABLE_STORIES).select('*').eq('active', true).order('created_at', { ascending: true }), // Oldest first for chronological playback? Or Newest? Instagram is Oldest to Newest usually for Highlights.
                window.supabase.from(this.TABLE_HIGHLIGHTS).select('*').eq('active', true).order('created_at', { ascending: true })
            ]);

            if (storiesRes.error) throw storiesRes.error;
            if (highlightsRes.error) throw highlightsRes.error;

            const allStories = storiesRes.data || [];
            const allHighlights = highlightsRes.data || [];

            // Group Stories
            this.storiesMap = {};

            // Initialize empty arrays for valid highlights
            allHighlights.forEach(h => {
                this.storiesMap[h.id] = [];
            });
            // "Geral" fallback for stories without highlight
            this.storiesMap['geral'] = [];

            allStories.forEach(story => {
                const hid = story.highlight_id || 'geral';
                if (this.storiesMap[hid]) {
                    this.storiesMap[hid].push(story);
                } else {
                    // If highlight was deleted but story exists?? Put in Geral
                    this.storiesMap['geral'].push(story);
                }
            });

            // Filter out empty highlights for display
            this.highlights = allHighlights.filter(h => this.storiesMap[h.id] && this.storiesMap[h.id].length > 0);

            // Add pseudo-highlight for 'Geral' if needed
            if (this.storiesMap['geral'].length > 0) {
                this.highlights.unshift({
                    id: 'geral',
                    title: 'Novidades',
                    cover_url: 'https://ui-avatars.com/api/?name=NV&background=3b82f6&color=fff&size=128' // Default Icon
                });
            }

            if (this.highlights.length > 0) {
                this.renderBubbles();
            } else {
                // If the container exists, maybe hide it or show empty state?
                const container = document.getElementById('stories-container');
                if (container) container.style.display = 'none';
            }

        } catch (err) {
            console.warn("Stories data error:", err);
        }
    },

    renderBubbles() {
        const container = document.getElementById('stories-container');
        if (!container) return;
        container.style.display = 'block';

        // Inject CSS for bubbles (if not exists)
        if (!document.getElementById('stories-css')) {
            const style = document.createElement('style');
            style.id = 'stories-css';
            style.textContent = `
                .stories-bar {
                    display: flex;
                    gap: 15px;
                    padding: 15px;
                    overflow-x: auto;
                    background: white;
                    border-bottom: 1px solid #f1f5f9;
                    scrollbar-width: none;
                }
                .stories-bar::-webkit-scrollbar { display: none; }
                
                .story-bubble {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 6px;
                    cursor: pointer;
                    flex-shrink: 0;
                    width: 72px; /* Fixed width for alignment */
                }
                .story-ring {
                    width: 68px;
                    height: 68px;
                    border-radius: 50%;
                    padding: 3px;
                    /* Gradient Ring for Highlights */
                    background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%);
                    transition: transform 0.2s;
                }
                .story-bubble:hover .story-ring {
                    transform: scale(1.05);
                }
                .story-img {
                    width: 100%;
                    height: 100%;
                    border-radius: 50%;
                    border: 2px solid white;
                    object-fit: cover;
                    background: #f1f5f9;
                }
                .story-title {
                    font-size: 0.75rem;
                    color: #1e293b;
                    text-align: center;
                    width: 100%;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    font-weight: 500;
                }
                
                /* Fullscreen Player Styles */
                .story-overlay {
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: black; z-index: 9999; display: none; flex-direction: column;
                }
                .story-progress-bar {
                    display: flex; gap: 5px; padding: 10px; position: absolute; top: 0; width: 100%; z-index: 10;
                }
                .progress-segment {
                    flex: 1; height: 3px; background: rgba(255,255,255,0.3); border-radius: 2px; overflow: hidden;
                }
                .progress-fill {
                    height: 100%; background: white; width: 0%;
                }
                .story-content {
                    flex: 1; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
                }
                .story-close {
                    position: absolute; top: 20px; right: 20px; color: white; font-size: 2rem; cursor: pointer; z-index: 20; background: none; border: none; padding: 10px;
                }
                .nav-area {
                    position: absolute; top: 0; height: 100%; width: 40%; z-index: 5;
                }
            `;
            document.head.appendChild(style);
        }

        // Render HTML for bubbles
        container.innerHTML = `
            <div class="stories-bar">
                ${this.highlights.map(h => `
                    <div class="story-bubble" onclick="StoriesManager.openPlayer('${h.id}')">
                        <div class="story-ring">
                            <img src="${h.cover_url || 'assets/logo.png'}" 
                                 onerror="this.src='https://ui-avatars.com/api/?name=${h.title.substring(0, 2)}&background=random'" 
                                 class="story-img">
                        </div>
                        <span class="story-title">${h.title}</span>
                    </div>
                `).join('')}
            </div>
            
            <div id="story-player" class="story-overlay">
                <div class="story-progress-bar" id="story-progress-container"></div>
                <button class="story-close" onclick="StoriesManager.closePlayer()">&times;</button>
                <div class="story-content" id="story-content-area"></div>
                <!-- Tap areas -->
                <div class="nav-area" style="left:0;" onclick="StoriesManager.prevStory()"></div>
                <div class="nav-area" style="right:0;" onclick="StoriesManager.nextStory()"></div>
            </div>
        `;
    },

    openPlayer(highlightId) {
        const playlist = this.storiesMap[highlightId];
        if (!playlist || playlist.length === 0) return;

        this.currentPlaylist = playlist;
        this.currentIndex = 0; // Start from first story in highlight? Or resume? Default first for now.

        document.getElementById('story-player').style.display = 'flex';
        this.renderCurrentStory();
    },

    closePlayer() {
        document.getElementById('story-player').style.display = 'none';
        this.clearTimer();
        const video = document.querySelector('#story-content-area video');
        if (video) video.pause();
        this.currentPlaylist = [];
    },

    renderCurrentStory() {
        const story = this.currentPlaylist[this.currentIndex];
        const contentArea = document.getElementById('story-content-area');
        const progressContainer = document.getElementById('story-progress-container');

        // Render Progress Bars
        progressContainer.innerHTML = this.currentPlaylist.map((_, idx) => `
            <div class="progress-segment">
                <div class="progress-fill" style="width: ${idx < this.currentIndex ? '100%' : '0%'}; transition: ${idx === this.currentIndex ? 'none' : 'width 0.1s'}"></div>
            </div>
        `).join('');

        // Blurred Background Logic
        const mediaTag = story.media_type === 'video'
            ? `<video src="${story.media_url}" autoplay playsinline webkit-playsinline style="width:100%; height:100%; object-fit:contain; position:relative; z-index:2;"></video>`
            : `<img src="${story.media_url}" style="width:100%; height:100%; object-fit:contain; position:relative; z-index:2;">`;

        // Background (Blurred)
        // If video, use same video muted. If image, use image.
        let backgroundTag = '';
        if (story.media_type === 'video') {
            backgroundTag = `<video src="${story.media_url}" muted loop autoplay playsinline style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; filter:blur(40px); opacity:0.6; z-index:1; transform:scale(1.1);"></video>`;
        } else {
            backgroundTag = `<div style="position:absolute; top:0; left:0; width:100%; height:100%; background-image: url('${story.media_url}'); background-size: cover; background-position: center; filter: blur(40px) brightness(0.7); z-index: 1; transform:scale(1.1);"></div>`;
        }

        contentArea.innerHTML = backgroundTag + mediaTag;

        this.startProgress(story);
    },

    startProgress(story) {
        this.clearTimer();

        const duration = (story.duration || 5) * 1000;
        const segment = document.querySelectorAll('.progress-fill')[this.currentIndex];
        const video = document.querySelector('#story-content-area video:not([style*="blur"])'); // Select the foreground video

        // Animation
        setTimeout(() => {
            if (segment) segment.style.transition = `width ${duration}ms linear`;
            if (segment) segment.style.width = '100%';
        }, 50);

        if (video) {
            video.onended = () => {
                console.log("Video ended, next...");
                this.nextStory();
            };
            video.play().catch(e => console.log("Autoplay blocked", e));
        } else {
            this.timer = setTimeout(() => {
                this.nextStory();
            }, duration);
        }
    },

    nextStory() {
        if (this.currentIndex < this.currentPlaylist.length - 1) {
            this.currentIndex++;
            this.renderCurrentStory();
        } else {
            // End of highlight
            this.closePlayer();
        }
    },

    prevStory() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.renderCurrentStory();
        } else {
            // Restart current? or do nothing
            this.renderCurrentStory();
        }
    },

    clearTimer() {
        if (this.timer) clearTimeout(this.timer);
        const segment = document.querySelectorAll('.progress-fill')[this.currentIndex];
        if (segment) {
            segment.style.transition = 'none';
            segment.style.width = '0%';
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Check for Supabase availability
    const check = setInterval(() => {
        if (window.supabase) {
            clearInterval(check);
            StoriesManager.init();
        }
    }, 500);
});
