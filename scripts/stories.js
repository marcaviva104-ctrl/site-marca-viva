/**
 * Stories Client Manager (Instagram Style)
 * Handles fetching, rendering bubbles, and playing media.
 */

const StoriesManager = {
    stories: [],
    currentIndex: 0,
    timer: null,
    isPaused: false,

    // Config
    TABLE: 'stories',
    BUCKET: 'stories-media',

    async init() {
        console.log("Stories Manager Init...");
        await this.fetchStories();
    },

    async fetchStories() {
        try {
            const { data, error } = await window.supabase
                .from(this.TABLE)
                .select('*')
                .eq('active', true)
                .order('created_at', { ascending: false }); // Newest first

            if (error) throw error;

            this.stories = data || [];
            if (this.stories.length > 0) {
                this.renderBubbles();
            }
        } catch (err) {
            console.warn("Stories fetch error:", err);
        }
    },

    renderBubbles() {
        const container = document.getElementById('stories-container');
        if (!container) return; // Should be in index.html

        // Inject CSS for bubbles if not present
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
                    scrollbar-width: none; /* Hide scrollbar */
                }
                .stories-bar::-webkit-scrollbar { display: none; }
                
                .story-bubble {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 5px;
                    cursor: pointer;
                    flex-shrink: 0;
                }
                .story-ring {
                    width: 68px;
                    height: 68px;
                    border-radius: 50%;
                    padding: 3px;
                    background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%);
                }
                .story-img {
                    width: 100%;
                    height: 100%;
                    border-radius: 50%;
                    border: 2px solid white;
                    object-fit: cover;
                }
                .story-user {
                    font-size: 0.75rem;
                    color: #1e293b;
                    max-width: 70px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                
                /* Fullscreen Player */
                .story-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: black;
                    z-index: 9999;
                    display: none;
                    flex-direction: column;
                }
                .story-progress-bar {
                    display: flex;
                    gap: 5px;
                    padding: 10px;
                    position: absolute;
                    top: 0;
                    width: 100%;
                    z-index: 10;
                }
                .progress-segment {
                    flex: 1;
                    height: 3px;
                    background: rgba(255,255,255,0.3);
                    border-radius: 2px;
                    overflow: hidden;
                }
                .progress-fill {
                    height: 100%;
                    background: white;
                    width: 0%;
                }
                .story-content {
                    flex: 1;
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .story-content img, .story-content video {
                    max-width: 100%;
                    max-height: 100%;
                    width: 100%;
                    height: 100%;
                    object-fit: contain; /* Keep aspect ratio */
                }
                .story-close {
                    position: absolute;
                    top: 20px;
                    right: 20px;
                    color: white;
                    font-size: 2rem;
                    cursor: pointer;
                    z-index: 20;
                    background: none;
                    border: none;
                    padding: 10px;
                }
                .nav-area {
                    position: absolute;
                    top: 0;
                    height: 100%;
                    width: 40%;
                    z-index: 5;
                }
            `;
            document.head.appendChild(style);
        }

        // Render HTML
        container.innerHTML = `
            <div class="stories-bar">
                 <!-- Marca Viva Bubble (Static or First) -->
                 <div class="story-bubble" onclick="StoriesManager.openPlayer(0)">
                    <div class="story-ring">
                        <img src="assets/logo.png" onerror="this.src='https://ui-avatars.com/api/?name=MV&background=0D8ABC&color=fff'" class="story-img">
                    </div>
                    <span class="story-user">Marca Viva</span>
                </div>
            </div>
            
            <!-- Player Overlay -->
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

    openPlayer(startIndex) {
        this.currentIndex = startIndex;
        document.getElementById('story-player').style.display = 'flex';
        this.renderCurrentStory();
    },

    closePlayer() {
        document.getElementById('story-player').style.display = 'none';
        this.clearTimer();
        const video = document.querySelector('#story-content-area video');
        if (video) video.pause();
    },

    renderCurrentStory() {
        const story = this.stories[this.currentIndex];
        const contentArea = document.getElementById('story-content-area');
        const progressContainer = document.getElementById('story-progress-container');

        // Render Progress Segments
        progressContainer.innerHTML = this.stories.map((_, idx) => `
            <div class="progress-segment">
                <div class="progress-fill" style="width: ${idx < this.currentIndex ? '100%' : '0%'}; transition: ${idx === this.currentIndex ? 'none' : 'width 0.1s'}"></div>
            </div>
        `).join('');

        // Render Content
        if (story.media_type === 'video') {
            contentArea.innerHTML = `<video src="${story.media_url}" autoplay playsinline style="width:100%; height:100%; object-fit:contain;"></video>`;
            // Video handling involves listening to 'ended' event or duration
        } else {
            contentArea.innerHTML = `<img src="${story.media_url}">`;
        }

        this.startProgress(story);
    },

    startProgress(story) {
        this.clearTimer();

        const duration = (story.duration || 5) * 1000;
        const segment = document.querySelectorAll('.progress-fill')[this.currentIndex];
        const video = document.querySelector('#story-content-area video');

        let startTime = Date.now();

        // Use CSS animation or JS Interval? JS for control
        segment.style.transition = `width ${duration}ms linear`;

        // Request Animation Frame hack to ensure transition triggers
        setTimeout(() => {
            segment.style.width = '100%';
        }, 50);

        if (video) {
            video.onended = () => this.nextStory();
            video.play().catch(e => console.log("Autoplay blocked", e));
        } else {
            this.timer = setTimeout(() => {
                this.nextStory();
            }, duration);
        }
    },

    nextStory() {
        if (this.currentIndex < this.stories.length - 1) {
            this.currentIndex++;
            this.renderCurrentStory();
        } else {
            this.closePlayer();
        }
    },

    prevStory() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
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

// Auto-init
document.addEventListener('DOMContentLoaded', () => {
    // Only if supabase is ready
    const check = setInterval(() => {
        if (window.supabase) {
            clearInterval(check);
            StoriesManager.init();
        }
    }, 500);
});
