// ============================================
// CONFIGURATION LOADER
// ============================================
let config = {};
async function loadConfig() {
    try {
        const response = await fetch('config/config.json?v=' + Date.now());
        if (!response.ok) {
            throw new Error('Failed to load config.json: ' + response.status);
        }
        const configText = await response.text();
        console.log('Config loaded, parsing...');
        let cleanedConfig = configText;
        const stringPlaceholders = [];
        let placeholderIndex = 0;
        cleanedConfig = cleanedConfig.replace(/"(?:[^"\\]|\\.)*"/g, (match) => {
            const placeholder = `__STRING_PLACEHOLDER_${placeholderIndex}__`;
            stringPlaceholders[placeholderIndex] = match;
            placeholderIndex++;
            return placeholder;
        });
        cleanedConfig = cleanedConfig.replace(/\/\/.*$/gm, '');
        cleanedConfig = cleanedConfig.replace(/\/\*[\s\S]*?\*\//g, '');
        cleanedConfig = cleanedConfig.replace(/__STRING_PLACEHOLDER_(\d+)__/g, (match, index) => {
            return stringPlaceholders[parseInt(index)];
        });
        cleanedConfig = cleanedConfig.replace(/,(\s*[}\]])/g, '$1');
        try {
            config = JSON.parse(cleanedConfig);
            console.log('Config parsed successfully');
            console.log('Config structure:', {
                general: config.general,
                appearance: config.appearance ? '✓' : '✗',
                profile: config.profile ? '✓' : '✗',
                badges: config.badges ? `✓ (${config.badges.length} badges)` : '✗',
                links: config.links ? `✓ (${config.links.length} links)` : '✗',
                musicPlayer: config.musicPlayer ? '✓' : '✗'
            });
            applyConfig();
        } catch (parseError) {
            console.error('JSON Parse Error:', parseError);
            if (parseError.message.includes('position')) {
                const match = parseError.message.match(/position (\d+)/);
                if (match) {
                    const pos = parseInt(match[1]);
                    const start = Math.max(0, pos - 100);
                    const end = Math.min(cleanedConfig.length, pos + 100);
                    console.error('Error around position', pos, ':');
                    console.error(cleanedConfig.substring(start, end));
                    console.error(' '.repeat(Math.min(100, pos - start)) + '^');
                }
            }
            console.error('Cleaned config (first 1000 chars):', cleanedConfig.substring(0, 1000));
            throw new Error('Failed to parse JSON: ' + parseError.message);
        }
    } catch (error) {
        console.error('Error loading config:', error);
        console.error('Error details:', error.message, error.stack);
        config = getDefaultConfig();
        console.log('Using default config');
        applyConfig();
    }
}
function getDefaultConfig() {
    return {
        general: { pageTitle: "LinkTree", metaDescription: "" },
        appearance: {
            backgroundType: "color",
            backgroundColor: "#000000",
            backgroundOverlay: { color: "#000000", opacity: 0.4 },
            fontFamily: "Inter",
            textColor: "#ffffff",
            secondaryTextColor: "#b0b0b0",
            accentColor: "#00aaff"
        },
        profile: {
            displayName: "User",
            username: "@username",
            bio: ["Welcome to my LinkTree"],
            typewriterEnabled: true,
            typewriterSpeed: 100,
            typewriterEraseDelay: 2000,
            typewriterEraseSpeed: 50,
            location: ""
        },
        badges: [],
        links: [],
        musicPlayer: { enabled: false },
        cursorEffects: { enabled: false, type: "none" },
        animations: {
            loadingType: "fade",
            loadingDuration: 1000,
            linkHoverAnimation: "scale",
            badgeHoverAnimation: "pulse",
            pageEntrance: "fadeIn",
            speedMultiplier: 1.0
        },
        media: { muteVideo: true, loopVideo: true, playAudioWithVideo: false }
    };
}
// ============================================
// CONFIG APPLICATION
// ============================================
function applyConfig() {
    console.log('Applying config...');
    document.title = config.general?.pageTitle || "LinkTree";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
        metaDesc.content = config.general?.metaDescription || "";
    }
    applyAppearance();
    applyProfile();
    applyBadges();
    applyLinks();
    applyMusicPlayer();
    applyCursorEffects();
    applyAnimations();
    setupBackground();
    setupMuteButton();
    initializePage();
    console.log('Config applied successfully');
}
function applyAppearance() {
    const root = document.documentElement;
    const appearance = config.appearance || {};
    console.log('Applying appearance:', {
        backgroundType: appearance.backgroundType,
        textColor: appearance.textColor,
        accentColor: appearance.accentColor,
        fontFamily: appearance.fontFamily
    });
    root.style.setProperty('--text-color', appearance.textColor || '#ffffff');
    root.style.setProperty('--secondary-text-color', appearance.secondaryTextColor || '#b0b0b0');
    root.style.setProperty('--accent-color', appearance.accentColor || '#00aaff');
    const overlay = appearance.backgroundOverlay || {};
    const overlayColor = overlay.color || '#000000';
    const overlayOpacity = overlay.opacity || 0.4;
    root.style.setProperty('--background-overlay', 
        `rgba(${hexToRgb(overlayColor)}, ${overlayOpacity})`);
    if (appearance.fontFamily) {
        if (appearance.fontFamily.includes(' ')) {
            const fontLink = document.createElement('link');
            fontLink.href = `https://fonts.googleapis.com/css2?family=${appearance.fontFamily.replace(/ /g, '+')}:wght@400;500;600;700&display=swap`;
            fontLink.rel = 'stylesheet';
            document.head.appendChild(fontLink);
        }
        document.body.style.fontFamily = `'${appearance.fontFamily}', sans-serif`;
    }
}
function applyProfile() {
    const profile = config.profile || {};
    console.log('Applying profile:', {
        displayName: profile.displayName,
        username: profile.username,
        bio: Array.isArray(profile.bio) ? `${profile.bio.length} texts` : profile.bio,
        typewriterEnabled: profile.typewriterEnabled
    });
    const profileImg = document.getElementById('profile-image');
    if (profileImg && profile.profileImage) {
        let profileSrc = profile.profileImage;
        if (!profileSrc.startsWith('http://') && !profileSrc.startsWith('https://')) {
            if (profileSrc.startsWith('images/') || profileSrc.startsWith('config/images/')) {
                profileSrc = profileSrc.startsWith('config/') ? profileSrc : `config/${profileSrc}`;
            } else {
                profileSrc = `config/images/${profileSrc}`;
            }
        }
        profileImg.src = profileSrc;
        console.log('Profile image src:', profileSrc);
        profileImg.onerror = (e) => {
            console.error('Profile image failed to load:', profileSrc);
            profileImg.style.display = 'none';
        };
    }
    const displayName = document.getElementById('display-name');
    if (displayName) {
        const nameText = profile.displayName || 'User';
        const nameAnimations = profile.nameAnimations || {};
        
        displayName.textContent = nameText;
        
        if (nameAnimations.glow && nameAnimations.glow.enabled) {
            displayName.classList.add('name-glow');
        }
    }
    const username = document.getElementById('username');
    if (username) {
        username.textContent = profile.username || '';
        username.style.display = profile.username ? 'block' : 'none';
    }
    const bio = document.getElementById('bio');
    if (bio && profile.bio) {
        if (profile.typewriterEnabled) {
            const bioTexts = Array.isArray(profile.bio) ? profile.bio : [profile.bio];
            typewriterLoopEffect(
                bio, 
                bioTexts, 
                profile.typewriterSpeed || 100,
                profile.typewriterEraseDelay || 2000,
                profile.typewriterEraseSpeed || 50
            );
        } else {
            bio.textContent = Array.isArray(profile.bio) ? profile.bio[0] : profile.bio;
        }
    }
    const location = document.getElementById('location');
    const locationContainer = document.getElementById('location-container');
    const locationIcon = document.getElementById('location-icon');
    if (location && profile.location) {
        location.textContent = profile.location;
        if (locationContainer) {
            locationContainer.style.display = 'flex';
        }
        if (locationIcon) {
            const iconEl = createIconElement('mdi:location', 18, '#ffffff');
            if (iconEl) {
                locationIcon.innerHTML = '';
                locationIcon.appendChild(iconEl);
            }
        }
    } else {
        if (locationContainer) {
            locationContainer.style.display = 'none';
        }
    }
}
function applyBadges() {
    const badgesContainer = document.getElementById('badges-container');
    if (!badgesContainer) return;
    badgesContainer.innerHTML = '';
    const badges = config.badges || [];
    const badgeAnimation = config.animations?.badgeHoverAnimation || 'pulse';
    // Default badge colors: cyan, purple, yellow
    const defaultBadgeColors = ['#00ffff', '#9d4edd', '#ffd700'];
    badges.forEach((badge, index) => {
        const badgeEl = document.createElement('div');
        badgeEl.className = `badge badge-${badgeAnimation}`;
        // Use default colors in order if color not specified
        const badgeColor = badge.color || defaultBadgeColors[index % defaultBadgeColors.length];
        // Check if it's an Iconify icon name
        if (badge.icon && badge.icon.includes(':')) {
            // Use Iconify icon - use badge color for SVG icons
            const iconEl = createIconElement(badge.icon, 18, badgeColor);
            if (iconEl) {
                badgeEl.appendChild(iconEl);
            } else {
                // Fallback to image with color
                const img = document.createElement('img');
                const cleanColor = badgeColor.replace('#', '');
                img.src = `https://api.iconify.design/${badge.icon}.svg?width=18&height=18&color=%23${cleanColor}`;
                img.style.width = '18px';
                img.style.height = '18px';
                img.style.objectFit = 'contain';
                img.style.color = badgeColor; // CSS color fallback
                img.alt = badge.text || '';
                img.onerror = () => {
                    // Try without color
                    img.src = `https://api.iconify.design/${badge.icon}.svg?width=18&height=18`;
                    img.onerror = () => {
                        console.error('Badge icon failed to load:', badge.icon);
                        badgeEl.style.display = 'none';
                    };
                };
                badgeEl.appendChild(img);
            }
        } else {
            // Support URLs and local files
            const img = document.createElement('img');
            let badgeSrc = badge.icon;
            if (!badgeSrc.startsWith('http://') && !badgeSrc.startsWith('https://')) {
                if (badgeSrc.startsWith('images/') || badgeSrc.startsWith('config/images/')) {
                    badgeSrc = badgeSrc.startsWith('config/') ? badgeSrc : `config/${badgeSrc}`;
                } else {
                    badgeSrc = `config/images/${badgeSrc}`;
                }
            }
            img.src = badgeSrc;
            img.style.width = '18px';
            img.style.height = '18px';
            img.style.objectFit = 'contain';
            img.alt = badge.text || '';
            img.onerror = (e) => {
                console.error('Badge image failed to load:', badgeSrc);
                badgeEl.style.display = 'none';
            };
            badgeEl.appendChild(img);
        }
        // Apply color to badge (for SVG icons, color is applied via createIconElement)
        badgeEl.style.color = badgeColor;
        badgeEl.setAttribute('data-color', badgeColor);
        if (badge.text) {
            const tooltip = document.createElement('div');
            tooltip.className = 'badge-tooltip';
            tooltip.textContent = badge.text;
            badgeEl.appendChild(tooltip);
        }
        badgesContainer.appendChild(badgeEl);
    });
}
function applyLinks() {
    const linksContainer = document.getElementById('links-container');
    if (!linksContainer) return;
    linksContainer.innerHTML = '';
    const links = config.links || [];
    const linkAnimation = config.animations?.linkHoverAnimation || 'scale';
    // Generate random colors for links if not specified
    const randomColors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#f0932b', '#eb4d4b', '#6c5ce7', '#a29bfe', '#fd79a8', '#00b894'];
    links.forEach((link, index) => {
        const linkEl = document.createElement('a');
        linkEl.href = link.url;
        linkEl.target = '_blank';
        linkEl.rel = 'noopener noreferrer';
        linkEl.className = `link-item ${linkAnimation}`;
        // Use random color if not specified
        const linkColor = link.color || randomColors[index % randomColors.length];
        linkEl.style.color = linkColor;
        linkEl.setAttribute('data-color', linkColor);
        // Icon - Support Iconify icons
        let iconElement = null;
        const iconName = link.icon || getDefaultIcon(link.url);
        // Check if it's an Iconify icon name (contains :)
        if (iconName && iconName.includes(':')) {
            // Use Iconify icon with link color
            iconElement = createIconElement(iconName, 36, linkColor);
            if (!iconElement) {
                // Fallback: create img with Iconify API URL
                const icon = document.createElement('img');
                const cleanColor = linkColor.replace('#', '');
                icon.src = `https://api.iconify.design/${iconName}.svg?width=36&height=36&color=%23${cleanColor}`;
                icon.className = 'link-icon';
                icon.alt = link.title;
                icon.onerror = () => {
                    console.error('Link icon failed to load:', iconName);
                    icon.style.display = 'none';
                };
                iconElement = icon;
            } else {
                iconElement.className = 'link-icon';
            }
        } else {
            // Support URLs and local files
            const icon = document.createElement('img');
            let iconSrc = iconName;
            if (!iconSrc.startsWith('http://') && !iconSrc.startsWith('https://')) {
                if (iconSrc.startsWith('images/') || iconSrc.startsWith('config/images/')) {
                    iconSrc = iconSrc.startsWith('config/') ? iconSrc : `config/${iconSrc}`;
                } else {
                    iconSrc = `config/images/${iconSrc}`;
                }
            }
            icon.src = iconSrc;
            icon.className = 'link-icon';
            icon.alt = link.title;
            icon.onerror = (e) => {
                console.error('Link icon failed to load:', iconSrc);
                icon.style.display = 'none';
            };
            iconElement = icon;
        }
        // Title
        const title = document.createElement('span');
        title.className = 'link-title';
        title.textContent = link.title;
        // Hover text (use hoverText if available, otherwise use title)
        const hoverText = document.createElement('div');
        hoverText.className = 'link-hover-text';
        hoverText.textContent = link.hoverText || link.title;
        linkEl.appendChild(hoverText);
        if (iconElement) {
            linkEl.appendChild(iconElement);
        }
        linkEl.appendChild(title);
        // Add animation delay
        linkEl.style.animationDelay = `${index * 0.1}s`;
        linkEl.classList.add('fade-in');
        linksContainer.appendChild(linkEl);
    });
}
// ============================================
// ICONIFY ICON LOADER
// ============================================
async function loadIconifyIcon(iconName, size = 24, color = 'currentColor') {
    // Check if it's an Iconify icon name (contains :)
    if (iconName && iconName.includes(':')) {
        try {
            // Use Iconify API to get SVG
            const response = await fetch(`https://api.iconify.design/${iconName}.svg?width=${size}&height=${size}&color=${encodeURIComponent(color)}`);
            if (response.ok) {
                const svg = await response.text();
                return svg;
            }
        } catch (e) {
            console.warn('Failed to load Iconify icon:', iconName, e);
        }
    }
    return null;
}
function createIconElement(iconName, size = 24, color = 'currentColor') {
    if (!iconName || !iconName.includes(':')) {
        return null;
    }
    const container = document.createElement('div');
    container.style.width = size + 'px';
    container.style.height = size + 'px';
    container.style.display = 'inline-flex';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'center';
    // Always use Iconify API directly as img for reliability
    const img = document.createElement('img');
    // Remove # from color if present for URL encoding, use %23 for hex
    const cleanColor = color.replace('#', '');
    // Use hex color format for SVG icons (%23 = #) - this colors the SVG itself
    img.src = `https://api.iconify.design/${iconName}.svg?width=${size}&height=${size}&color=%23${cleanColor}`;
    img.style.width = size + 'px';
    img.style.height = size + 'px';
    img.style.objectFit = 'contain';
    img.style.color = color; // Also set CSS color as fallback
    img.alt = iconName;
    img.onerror = () => {
        console.error('Failed to load Iconify icon:', iconName);
        // Try without color parameter
        img.src = `https://api.iconify.design/${iconName}.svg?width=${size}&height=${size}`;
        img.onerror = () => {
            console.error('Iconify icon failed completely:', iconName);
            container.innerHTML = `<span style="color: ${color}; font-size: ${size}px;">?</span>`;
        };
    };
    container.appendChild(img);
    return container;
}
function getDefaultIcon(url) {
    try {
        const domain = new URL(url).hostname.toLowerCase();
        const iconMap = {
            'github.com': 'mdi:github',
            'twitter.com': 'mdi:twitter',
            'x.com': 'simple-icons:x',
            'discord.com': 'mdi:discord',
            'discord.gg': 'mdi:discord',
            'youtube.com': 'mdi:youtube',
            'instagram.com': 'mdi:instagram',
            'linkedin.com': 'mdi:linkedin',
            'facebook.com': 'mdi:facebook',
            'tiktok.com': 'mdi:tiktok',
            'twitch.tv': 'mdi:twitch',
            'reddit.com': 'mdi:reddit',
            'spotify.com': 'mdi:spotify'
        };
        for (const [key, value] of Object.entries(iconMap)) {
            if (domain.includes(key)) {
                return value;
            }
        }
    } catch (e) {
        // Invalid URL
    }
    return 'mdi:link';
}
// Global audio element (shared between music player and background)
let globalAudio = null;
function applyMusicPlayer() {
    const musicPlayer = document.getElementById('music-player');
    if (!musicPlayer) return;
    const playerConfig = config.musicPlayer || {};
    if (!playerConfig.enabled || !playerConfig.audioFile) {
        musicPlayer.classList.add('hidden');
        return;
    }
    musicPlayer.classList.remove('hidden');
    const albumArt = document.getElementById('album-art');
    const songTitle = document.getElementById('song-title');
    const artistName = document.getElementById('artist-name');
    // Use global audio if it exists, otherwise create new one
    if (!globalAudio) {
        globalAudio = document.createElement('audio');
    }
    if (albumArt && playerConfig.albumArt) {
        // Support both URLs and local files
        let albumArtSrc = playerConfig.albumArt;
        if (!albumArtSrc.startsWith('http://') && !albumArtSrc.startsWith('https://')) {
            // Handle different path formats
            if (albumArtSrc.startsWith('images/') || albumArtSrc.startsWith('config/images/')) {
                albumArtSrc = albumArtSrc.startsWith('config/') ? albumArtSrc : `config/${albumArtSrc}`;
            } else {
                albumArtSrc = `config/images/${albumArtSrc}`;
            }
        }
        albumArt.src = albumArtSrc;
        console.log('Album art src:', albumArtSrc);
    }
    if (songTitle) {
        songTitle.textContent = playerConfig.songTitle || '';
    }
    if (artistName) {
        artistName.textContent = playerConfig.artist || '';
    }
    // Support both URLs and local files
    let audioSrc = playerConfig.audioFile;
    if (!audioSrc.startsWith('http://') && !audioSrc.startsWith('https://')) {
        // Handle different path formats - check config/audio/ first
        if (audioSrc.startsWith('audio/')) {
            audioSrc = `config/audio/${audioSrc.replace('audio/', '')}`;
        } else if (audioSrc.startsWith('videos/')) {
            audioSrc = `config/videos/${audioSrc.replace('videos/', '')}`;
        } else if (audioSrc.startsWith('config/')) {
            // Already has config/, use as is
            if (!audioSrc.startsWith('config/audio/') && !audioSrc.startsWith('config/videos/')) {
                // Try audio first, then videos
                audioSrc = `config/audio/${audioSrc.replace('config/', '')}`;
            }
        } else {
            // No prefix, try audio first, then videos
            audioSrc = `config/audio/${audioSrc}`;
        }
    }
    globalAudio.src = audioSrc;
    console.log('Global audio src:', audioSrc);
    globalAudio.loop = false;
    globalAudio.preload = 'auto';
    globalAudio.volume = 0.7;
    
    // Restart music when it finishes (if loop is enabled)
    globalAudio.addEventListener('ended', () => {
        if (playerConfig.loop) {
            globalAudio.currentTime = 0;
            globalAudio.play().catch(() => {});
        }
    });
    // Enable background playback
    // Use Web Audio API for better background playback support
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaElementSource(globalAudio);
        source.connect(audioContext.destination);
        // Keep audio context alive
        globalAudio.addEventListener('play', () => {
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
        });
    } catch (e) {
        console.log('Web Audio API not available, using standard audio');
    }
    // Keep playing when tab is in background - music should continue playing
    document.addEventListener('visibilitychange', () => {
        if (globalAudio) {
            if (document.hidden) {
                // Tab is hidden - keep audio playing (don't pause)
                // Some browsers pause audio, so we resume it if needed
                if (!globalAudio.paused) {
                    // Audio is playing, try to keep it playing
                    globalAudio.play().catch(() => {
                        // If play fails, it's likely browser restrictions
                        console.log('Audio may pause due to browser restrictions when tab is hidden');
                    });
                }
            } else {
                // Tab is visible again, ensure audio is still playing
                if (!globalAudio.paused) {
                    globalAudio.play().catch(() => {});
                }
            }
        }
    });
    // Add audio element to music player if not already there
    const existingAudio = musicPlayer.querySelector('audio');
    if (existingAudio && existingAudio !== globalAudio) {
        existingAudio.remove();
    }
    if (!musicPlayer.contains(globalAudio)) {
        globalAudio.id = 'music-audio';
        musicPlayer.appendChild(globalAudio);
    }
    const playPauseBtn = document.getElementById('play-pause-btn');
    const progressFill = document.getElementById('progress-fill');
    const currentTime = document.getElementById('current-time');
    const totalTime = document.getElementById('total-time');
    // Setup play button handler
    const playPauseBtnElement = document.getElementById('play-pause-btn');
    if (playPauseBtnElement) {
        // Remove old listeners by cloning
        const newBtn = playPauseBtnElement.cloneNode(true);
        playPauseBtnElement.parentNode.replaceChild(newBtn, playPauseBtnElement);
        newBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Play button clicked, audio paused:', globalAudio.paused, 'src:', globalAudio.src);
            if (globalAudio.paused) {
                globalAudio.play().then(() => {
                    console.log('Audio playing successfully');
                    newBtn.textContent = '⏸';
                }).catch(err => {
                    console.error('Play failed:', err);
                    alert('Failed to play audio: ' + err.message + '\nCheck console for details.');
                });
            } else {
                globalAudio.pause();
                console.log('Audio paused');
                newBtn.textContent = '▶';
            }
        });
    }
    // Update progress
    globalAudio.addEventListener('timeupdate', () => {
        if (progressFill && globalAudio.duration) {
            const percent = (globalAudio.currentTime / globalAudio.duration) * 100;
            progressFill.style.width = percent + '%';
        }
        if (currentTime) {
            currentTime.textContent = formatTime(globalAudio.currentTime);
        }
    });
    globalAudio.addEventListener('loadedmetadata', () => {
        console.log('Audio metadata loaded, duration:', globalAudio.duration);
        if (totalTime) {
            totalTime.textContent = formatTime(globalAudio.duration);
        }
    });
    globalAudio.addEventListener('error', (e) => {
        console.error('Audio error:', e, 'src:', globalAudio.src);
        alert('Failed to load audio file: ' + globalAudio.src + '\nCheck console for details.');
    });
    const progressBar = document.querySelector('.progress-bar');
    if (progressBar) {
        progressBar.addEventListener('click', (e) => {
            if (globalAudio.duration) {
                const rect = progressBar.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                globalAudio.currentTime = percent * globalAudio.duration;
            }
        });
    }
    // Auto-play
    if (playerConfig.autoplay) {
        // Wait for audio to load
        globalAudio.addEventListener('canplaythrough', () => {
            console.log('Audio can play, attempting autoplay...');
            globalAudio.play().then(() => {
                console.log('Audio autoplay successful');
                const btn = document.getElementById('play-pause-btn');
                if (btn) btn.textContent = '⏸';
            }).catch(err => {
                console.warn('Autoplay blocked:', err);
                // Try on first user interaction
                const tryPlay = () => {
                    globalAudio.play().then(() => {
                        console.log('Audio playing after user interaction');
                        const btn = document.getElementById('play-pause-btn');
                        if (btn) btn.textContent = '⏸';
                    }).catch(e => console.error('Play failed:', e));
                };
                document.addEventListener('click', tryPlay, { once: true });
                document.addEventListener('touchstart', tryPlay, { once: true });
            });
        }, { once: true });
        // Also try immediately if already loaded
        if (globalAudio.readyState >= 3) {
            globalAudio.play().then(() => {
                console.log('Audio playing (already loaded)');
                const btn = document.getElementById('play-pause-btn');
                if (btn) btn.textContent = '⏸';
            }).catch(err => {
                console.warn('Autoplay blocked:', err);
            });
        }
    }
}
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}
function setupBackground() {
    const backgroundContainer = document.getElementById('background-container');
    const backgroundVideo = document.getElementById('background-video');
    const backgroundImage = document.getElementById('background-image');
    const backgroundAudio = document.getElementById('background-audio');
    const overlay = document.querySelector('.background-overlay');
    if (!backgroundContainer) {
        console.error('Background container not found!');
        return;
    }
    const appearance = config.appearance || {};
    const media = config.media || {};
    const backgroundType = appearance.backgroundType || 'color';
    console.log('Setting up background:', {
        type: backgroundType,
        video: appearance.backgroundVideo,
        image: appearance.backgroundImage
    });
    // Setup particles.js for background particles (toggleable)
    setupBackgroundParticles();
    // Apply overlay
    if (overlay) {
        const overlayConfig = appearance.backgroundOverlay || {};
        overlay.style.background = `rgba(${hexToRgb(overlayConfig.color || '#000000')}, ${overlayConfig.opacity || 0.4})`;
    }
    if (backgroundType === 'video' && backgroundVideo && appearance.backgroundVideo) {
        // Support both URLs and local files
        let videoSrc = appearance.backgroundVideo;
        if (!videoSrc.startsWith('http://') && !videoSrc.startsWith('https://')) {
            if (videoSrc.startsWith('videos/') || videoSrc.startsWith('config/')) {
                videoSrc = videoSrc.startsWith('config/') ? videoSrc : `config/${videoSrc}`;
            } else {
                videoSrc = `config/videos/${videoSrc}`;
            }
        }
        backgroundVideo.src = videoSrc;
        console.log('Background video src:', videoSrc);
        backgroundVideo.muted = media.muteVideo !== false;
        backgroundVideo.loop = media.loopVideo !== false;
        backgroundVideo.volume = media.videoVolume || 0.3;
        backgroundVideo.playsInline = true;
        backgroundVideo.style.display = 'block';
        backgroundImage.style.display = 'none';
        backgroundVideo.addEventListener('loadeddata', () => {
            console.log('Background video loaded');
            // Don't autoplay - wait for user click (handled in initializePage)
        });
        backgroundVideo.addEventListener('error', (e) => {
            console.error('Background video error:', e, 'Src:', videoSrc);
        });
        // Use global audio for background if music player is enabled
        // Sync background video with global audio - keep playing even when tab is hidden
        if (globalAudio && config.musicPlayer?.enabled) {
            // Sync video play with audio
            backgroundVideo.addEventListener('play', () => {
                if (globalAudio && globalAudio.paused) {
                    globalAudio.play().catch(() => {});
                }
            });
            // Don't pause audio when video pauses - keep music playing
            // Video and audio should stay synced but continue in background
            globalAudio.addEventListener('play', () => {
                if (backgroundVideo && backgroundVideo.paused) {
                    backgroundVideo.play().catch(() => {});
                }
            });
            backgroundVideo.addEventListener('ended', () => {
                if (globalAudio && !globalAudio.paused && config.musicPlayer?.loop) {
                    const audioDuration = globalAudio.duration;
                    const videoDuration = backgroundVideo.duration;
                    if (videoDuration < audioDuration) {
                        const audioCurrentTime = globalAudio.currentTime;
                        const audioRemaining = audioDuration - audioCurrentTime;
                        if (audioRemaining > 0.5) {
                            console.log(`Video ended (${videoDuration}s), but audio still playing (${audioRemaining.toFixed(2)}s remaining)`);
                        }
                    }
                }
            });
        } else if (media.playAudioWithVideo && media.audioFile && backgroundAudio) {
            // Support both URLs and local files
            let audioSrc = media.audioFile;
            if (!audioSrc.startsWith('http://') && !audioSrc.startsWith('https://')) {
                if (audioSrc.startsWith('audio/') || audioSrc.startsWith('videos/') || audioSrc.startsWith('config/')) {
                    if (audioSrc.startsWith('audio/')) {
                        audioSrc = `config/videos/${audioSrc.replace('audio/', '')}`;
                    } else if (audioSrc.startsWith('videos/')) {
                        audioSrc = `config/${audioSrc}`;
                    } else if (!audioSrc.startsWith('config/videos/') && !audioSrc.startsWith('config/audio/')) {
                        audioSrc = `config/videos/${audioSrc.replace('config/', '')}`;
                    }
                } else {
                    audioSrc = `config/videos/${audioSrc}`;
                }
            }
            backgroundAudio.src = audioSrc;
            console.log('Background audio src:', audioSrc);
            backgroundAudio.loop = true;
            backgroundVideo.addEventListener('play', () => {
                backgroundAudio.play().catch(() => {});
            });
            backgroundVideo.addEventListener('pause', () => {
                backgroundAudio.pause();
            });
        }
    } else if (backgroundType === 'image' && backgroundImage && appearance.backgroundImage) {
        // Support both URLs and local files
        let imageSrc = appearance.backgroundImage;
        if (!imageSrc.startsWith('http://') && !imageSrc.startsWith('https://')) {
            if (imageSrc.startsWith('images/') || imageSrc.startsWith('config/images/')) {
                imageSrc = imageSrc.startsWith('config/') ? imageSrc : `config/${imageSrc}`;
            } else {
                imageSrc = `config/images/${imageSrc}`;
            }
        }
        backgroundImage.src = imageSrc;
        console.log('Background image src:', imageSrc);
        backgroundImage.style.display = 'block';
        backgroundVideo.style.display = 'none';
        backgroundImage.onerror = (e) => {
            console.error('Background image failed to load:', imageSrc);
        };
    } else {
        // Color background
        backgroundContainer.style.background = appearance.backgroundColor || '#000000';
        backgroundVideo.style.display = 'none';
        backgroundImage.style.display = 'none';
    }
}
function applyCursorEffects() {
    const cursorEffects = config.cursorEffects || {};
    if (!cursorEffects.enabled) {
        document.body.style.cursor = 'auto';
        // Remove custom cursor if it exists
        const customCursor = document.getElementById('custom-cursor');
        if (customCursor) customCursor.classList.remove('active');
        return;
    }
    // Keep default cursor visible - effects are additive
    document.body.style.cursor = 'auto';
    const type = cursorEffects.type || 'none';
    console.log('Setting up cursor effect:', type);
    if (type === 'particles') {
        initParticleCursor(cursorEffects.particles || {});
    } else if (type === 'ghost') {
        initGhostCursor(cursorEffects.ghost || {});
    } else if (type === 'trail') {
        initTrailCursor();
    }
    // Default cursor always remains visible
}
function initParticleCursor(settings) {
    const canvas = document.getElementById('cursor-canvas');
    if (!canvas) {
        console.error('Cursor canvas not found');
        return;
    }
    // Make sure canvas is visible and on top
    canvas.style.display = 'block';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999';
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const particles = [];
    const particleCount = settings.count || 50;
    const color = settings.color || '#00aaff';
    const size = settings.size || 3;
    const speed = settings.speed || 0.5;
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * size + 1;
            this.speedX = (Math.random() - 0.5) * speed;
            this.speedY = (Math.random() - 0.5) * speed;
        }
        update() {
            const dx = mouseX - this.x;
            const dy = mouseY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 100) {
                this.x += (dx / distance) * speed * 2;
                this.y += (dy / distance) * speed * 2;
            } else {
                this.x += this.speedX;
                this.y += this.speedY;
            }
            if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
            if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
        }
        draw() {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }
    // Listen to mousemove on document, not just specific elements
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    }, true); // Use capture phase to catch all events
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(particle => {
            particle.update();
            particle.draw();
        });
        requestAnimationFrame(animate);
    }
    animate();
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
    console.log('Particle cursor initialized');
}
function initGhostCursor(settings) {
    const customCursor = document.getElementById('custom-cursor');
    if (!customCursor) {
        console.error('Custom cursor element not found');
        return;
    }
    customCursor.classList.add('active');
    customCursor.style.width = (settings.size || 20) + 'px';
    customCursor.style.height = (settings.size || 20) + 'px';
    customCursor.style.background = settings.color || '#00aaff';
    customCursor.style.opacity = settings.opacity || 0.3;
    customCursor.style.display = 'block';
    customCursor.style.pointerEvents = 'none';
    customCursor.style.zIndex = '9999';
    document.addEventListener('mousemove', (e) => {
        customCursor.style.left = e.clientX + 'px';
        customCursor.style.top = e.clientY + 'px';
    }, true); // Use capture phase
    console.log('Ghost cursor initialized');
}
function initTrailCursor() {
    const canvas = document.getElementById('cursor-canvas');
    if (!canvas) {
        console.error('Cursor canvas not found');
        return;
    }
    // Make sure canvas is visible and on top
    canvas.style.display = 'block';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999';
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const trail = [];
    const maxTrailLength = 20;
    document.addEventListener('mousemove', (e) => {
        trail.push({ x: e.clientX, y: e.clientY, time: Date.now() });
        if (trail.length > maxTrailLength) {
            trail.shift();
        }
    }, true); // Use capture phase
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const now = Date.now();
        trail.forEach((point, index) => {
            const age = now - point.time;
            const opacity = Math.max(0, 1 - age / 500);
            const size = 10 * (1 - age / 500);
            if (opacity > 0 && size > 0) {
                ctx.fillStyle = `rgba(0, 170, 255, ${opacity})`;
                ctx.beginPath();
                ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
                ctx.fill();
            }
        });
        requestAnimationFrame(animate);
    }
    animate();
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
    console.log('Trail cursor initialized');
}
function applyAnimations() {
    const animations = config.animations || {};
    const speedMultiplier = animations.speedMultiplier || 1.0;
    // Apply speed multiplier to CSS
    document.documentElement.style.setProperty('--transition-speed', `${0.3 / speedMultiplier}s`);
    // Apply loading screen text
    const loadingText = animations.loadingText || "Click to continue...";
    const loadingTextElement = document.querySelector('.loading-text');
    if (loadingTextElement) {
        loadingTextElement.textContent = loadingText;
    }
}
function initializePage() {
    const loadingScreen = document.getElementById('loading-screen');
    const mainContainer = document.getElementById('main-container');
    // Pause background video during loading screen (background should be stopped)
    const backgroundVideo = document.getElementById('background-video');
    if (backgroundVideo) {
        backgroundVideo.pause();
        backgroundVideo.currentTime = 0;
    }
    // Wait for user click to start
    if (loadingScreen) {
        loadingScreen.addEventListener('click', () => {
            console.log('User clicked to continue, starting media...');
            // Start background video
            if (backgroundVideo) {
                backgroundVideo.play().catch(err => {
                    console.warn('Video autoplay blocked:', err);
                });
            }
            // Start audio
            if (globalAudio) {
                globalAudio.play().then(() => {
                    console.log('Audio started');
                    const btn = document.getElementById('play-pause-btn');
                    if (btn) btn.textContent = '⏸';
                }).catch(err => {
                    console.warn('Audio autoplay blocked:', err);
                });
            }
            // Hide loading screen
            loadingScreen.classList.add('hidden');
            // Show main container
            if (mainContainer) {
                mainContainer.classList.remove('hidden');
                // Setup 3D tilt effect AFTER content is visible
                setTimeout(() => {
                    setup3DTilt();
                }, 100);
            }
        }, { once: true });
    }
}
// ============================================
// TYPEWRITER EFFECT
// ============================================
// Helper function to split text into grapheme clusters (handles emojis properly)
function splitGraphemes(text) {
    // Use Intl.Segmenter if available (modern browsers - Chrome 87+, Firefox 125+, Safari 17+)
    // This is the most reliable method for handling all emoji types including complex sequences
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
        try {
            const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
            return Array.from(segmenter.segment(text), s => s.segment);
        } catch (e) {
            console.warn('Intl.Segmenter failed, using fallback:', e);
        }
    }
    // Fallback: Use spread operator which properly handles surrogate pairs
    // The spread operator [...] correctly handles multi-byte characters including emojis
    // This fixes the issue where charAt() or substring() would split emoji surrogate pairs
    return [...text];
}
function typewriterEffect(element, text, speed) {
    element.innerHTML = '';
    const graphemes = splitGraphemes(text);
    let index = 0;
    function type() {
        if (index < graphemes.length) {
            element.textContent += graphemes[index];
            index++;
            setTimeout(type, speed);
        } else {
            // Add blinking cursor
            const cursor = document.createElement('span');
            cursor.className = 'cursor';
            element.appendChild(cursor);
        }
    }
    type();
}
// ============================================
// LOOPING TYPEWRITER EFFECT (Type -> Erase -> Next Text -> Loop)
// ============================================
function typewriterLoopEffect(element, texts, typeSpeed, eraseDelay, eraseSpeed) {
    if (!texts || texts.length === 0) return;
    // Split all texts into grapheme clusters (handles emojis properly)
    const textGraphemes = texts.map(text => splitGraphemes(text));
    let currentTextIndex = 0;
    let isTyping = true;
    let isErasing = false;
    let currentIndex = 0;
    function updateText() {
        const currentGraphemes = textGraphemes[currentTextIndex];
        if (isTyping) {
            // Typing phase
            if (currentIndex < currentGraphemes.length) {
                // Build text from grapheme clusters and keep cursor
                const textContent = currentGraphemes.slice(0, currentIndex + 1).join('');
                element.innerHTML = textContent + '<span class="cursor"></span>';
                currentIndex++;
                setTimeout(updateText, typeSpeed);
            } else {
                // Finished typing, keep cursor and wait before erasing
                const textContent = currentGraphemes.join('');
                element.innerHTML = textContent + '<span class="cursor"></span>';
                isTyping = false;
                setTimeout(updateText, eraseDelay);
            }
        } else if (isErasing) {
            // Erasing phase
            if (currentIndex > 0) {
                // Build text from grapheme clusters and keep cursor
                const textContent = currentGraphemes.slice(0, currentIndex - 1).join('');
                element.innerHTML = textContent + '<span class="cursor"></span>';
                currentIndex--;
                setTimeout(updateText, eraseSpeed);
            } else {
                // Finished erasing, move to next text
                isErasing = false;
                isTyping = true;
                currentTextIndex = (currentTextIndex + 1) % textGraphemes.length;
                currentIndex = 0;
                element.innerHTML = '<span class="cursor"></span>';
                setTimeout(updateText, 300);
            }
        } else {
            // Transition from typing to erasing
            isErasing = true;
            const textContent = currentGraphemes.join('');
            element.innerHTML = textContent + '<span class="cursor"></span>';
            setTimeout(updateText, 100);
        }
    }
    // Start the effect with cursor
    element.innerHTML = '<span class="cursor"></span>';
    updateText();
}
// ============================================
// UTILITY FUNCTIONS
// ============================================
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? 
        `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` :
        '0, 0, 0';
}
// ============================================
// 3D TILT EFFECT
// ============================================
// ============================================
// MUTE BUTTON
// ============================================
function setupMuteButton() {
    const muteBtn = document.getElementById('mute-btn');
    if (!muteBtn) return;
    let isMuted = false;
    // Always use Iconify icons - NO EMOJIS
    // Use mdi:speakerphone when not muted, mdi:mute when muted
    function updateMuteIcon() {
        muteBtn.innerHTML = ''; // Clear any existing content (including emojis)
        const iconName = isMuted ? 'mdi:mute' : 'mdi:speakerphone';
        const iconEl = createIconElement(iconName, 24, '#ffffff');
        if (iconEl) {
            muteBtn.appendChild(iconEl);
        } else {
            // Fallback: use Iconify API directly as img if createIconElement fails
            const img = document.createElement('img');
            img.src = `https://api.iconify.design/${iconName}.svg?width=24&height=24&color=ffffff`;
            img.style.width = '24px';
            img.style.height = '24px';
            img.style.objectFit = 'contain';
            img.alt = isMuted ? 'Muted' : 'Unmuted';
            img.onerror = () => {
                console.error('Failed to load mute icon:', iconName);
                // Try without color
                img.src = `https://api.iconify.design/${iconName}.svg?width=24&height=24`;
            };
            muteBtn.appendChild(img);
        }
    }
    // Set initial icon
    updateMuteIcon();
    muteBtn.addEventListener('click', () => {
        if (globalAudio) {
            isMuted = !isMuted;
            globalAudio.muted = isMuted;
            // Update icon - always use Iconify, never emojis
            updateMuteIcon();
            muteBtn.classList.toggle('muted', isMuted);
            console.log('Audio muted:', isMuted);
        }
    });
}
// ============================================
// 3D TILT EFFECT
// ============================================
function setup3DTilt() {
    const contentWrapper = document.querySelector('.content-wrapper');
    if (!contentWrapper) {
        console.error('Content wrapper not found for 3D tilt');
        return;
    }
    // Ensure transform-style is preserved for 3D
    contentWrapper.style.transformStyle = 'preserve-3d';
    contentWrapper.style.willChange = 'transform';
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let currentX = 0;
    let currentY = 0;
    let isMouseOver = false;
    // Only track mouse when over content wrapper
    contentWrapper.addEventListener('mouseenter', () => {
        isMouseOver = true;
    });
    contentWrapper.addEventListener('mouseleave', () => {
        isMouseOver = false;
        // Don't reset instantly - let the smooth interpolation handle it
    });
    document.addEventListener('mousemove', (e) => {
        if (isMouseOver) {
            mouseX = e.clientX;
            mouseY = e.clientY;
        }
    }, true);
    function updateTilt() {
        if (!contentWrapper) return;
        const rect = contentWrapper.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
            requestAnimationFrame(updateTilt);
            return;
        }
        // Only apply tilt if mouse is over the content wrapper
        if (!isMouseOver) {
            // Smoothly return to center with slower interpolation for smoother transition
            currentX += (0 - currentX) * 0.1;
            currentY += (0 - currentY) * 0.1;
        } else {
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            // Calculate distance from center (normalized -1 to 1)
            // More sensitive near edges/corners
            const deltaX = (mouseX - centerX) / (rect.width / 2);
            const deltaY = (mouseY - centerY) / (rect.height / 2);
            // Clamp values
            const clampedX = Math.max(-1, Math.min(1, deltaX));
            const clampedY = Math.max(-1, Math.min(1, deltaY));
            // Smooth interpolation (faster response for better feel)
            currentX += (clampedX - currentX) * 0.15;
            currentY += (clampedY - currentY) * 0.15;
        }
        // Apply 3D transform (max 8 degrees rotation - reduced from 15)
        // Rotate more when mouse is at corners
        const rotateX = currentY * 8;
        const rotateY = currentX * -8;
        // Apply transform to the entire content wrapper (all UI moves together)
        // Use translateZ(50px) to push content forward in 3D space, preventing clipping through background
        const transformValue = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(50px)`;
        contentWrapper.style.transform = transformValue;
        contentWrapper.style.webkitTransform = transformValue;
        contentWrapper.style.mozTransform = transformValue;
        contentWrapper.style.msTransform = transformValue;
        // Force z-index to ensure content stays above background
        contentWrapper.style.zIndex = '20';
        requestAnimationFrame(updateTilt);
    }
    console.log('3D tilt effect ENABLED - all UI moves together');
    // Start immediately
    updateTilt();
}
// ============================================
// INITIALIZE
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, starting config load...');
    loadConfig();
});
// Make config reloadable from console for debugging
window.reloadConfig = function() {
    console.log('Reloading config...');
    loadConfig();
};
// ============================================
// BACKGROUND PARTICLES (particles.js)
// ============================================
function setupBackgroundParticles() {
    const particlesContainer = document.getElementById('particles-js');
    if (!particlesContainer) {
        console.warn('Particles container not found');
        return;
    }
    // Check if particles should be enabled
    const particlesConfig = config.appearance?.backgroundParticles || {};
    const enabled = particlesConfig.enabled !== false; // Default to true if not specified
    if (!enabled) {
        particlesContainer.style.display = 'none';
        return;
    }
    // Check if particles.js is loaded
    if (typeof particlesJS === 'undefined') {
        console.warn('particles.js not loaded');
        return;
    }
    particlesJS('particles-js', {
        particles: {
            number: {
                value: particlesConfig.count || 80,
                density: {
                    enable: true,
                    value_area: 800
                }
            },
            color: {
                value: particlesConfig.color || '#00aaff'
            },
            shape: {
                type: 'circle',
                stroke: {
                    width: 0,
                    color: '#000000'
                }
            },
            opacity: {
                value: particlesConfig.opacity || 0.5,
                random: false,
                anim: {
                    enable: false
                }
            },
            size: {
                value: particlesConfig.size || 3,
                random: true,
                anim: {
                    enable: false
                }
            },
            line_linked: {
                enable: true,
                distance: 150,
                color: particlesConfig.color || '#00aaff',
                opacity: 0.4,
                width: 1
            },
            move: {
                enable: true,
                speed: particlesConfig.speed || 2,
                direction: 'none',
                random: false,
                straight: false,
                out_mode: 'out',
                bounce: false,
                attract: {
                    enable: true,
                    rotateX: 600,
                    rotateY: 1200
                }
            }
        },
        interactivity: {
            detect_on: 'canvas',
            events: {
                onhover: {
                    enable: true,
                    mode: 'repulse'
                },
                onclick: {
                    enable: true,
                    mode: 'push'
                },
                resize: true
            },
            modes: {
                repulse: {
                    distance: 100,
                    duration: 0.4
                },
                push: {
                    particles_nb: 4
                }
            }
        },
        retina_detect: true
    });
    console.log('Background particles initialized');
}
// Expose config globally for debugging
window.getConfig = function() {
    return config;
};
