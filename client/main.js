import { Room, RoomEvent, Track, setLogLevel } from 'livekit-client';
import { CONFIG } from './config.js';

// Enable debug logging in development
if (import.meta.env.DEV) {
    setLogLevel('debug');
}

class LiveKitClient {
    constructor() {
        this.room = new Room();
        this.localParticipant = null;
        this.participants = new Map();
        this.isConnected = false;
        this.localVideoEnabled = true;
        this.localAudioEnabled = true;
        this.role = 'camera'; // default
        // Pagination state
        this.currentPage = 0;
        this.camerasPerPage = 4;
        this.cameraSids = []; // ordered list of camera participant SIDs (including local)
        this.expandedVideoSid = null;
        
        this.initializeElements();
        this.setupEventListeners();
        this.setupRoomEventListeners();
        this.fetchAndDisplayRooms(); // Fetch rooms on load
    }

    initializeElements() {
        // Form elements
        this.joinForm = document.getElementById('joinForm');
        this.roomNameInput = document.getElementById('roomName');
        this.participantNameInput = document.getElementById('participantName');
        this.joinCameraButton = document.getElementById('joinCameraButton');
        this.joinViewerButton = document.getElementById('joinViewerButton');
        
        // Conference elements
        this.conference = document.getElementById('conference');
        this.videoGrid = document.getElementById('videoGrid');
        // Removed: this.participantsPanel, this.participantsList
        
        // Control buttons
        this.toggleVideoBtn = document.getElementById('toggleVideo');
        this.toggleAudioBtn = document.getElementById('toggleAudio');
        this.leaveRoomBtn = document.getElementById('leaveRoom');
        
        // Status elements
        this.connectionStatus = document.getElementById('connectionStatus');
        this.statusDot = this.connectionStatus.querySelector('.status-dot');
        this.statusText = this.connectionStatus.querySelector('.status-text');
        
        // Overlays
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.errorModal = document.getElementById('errorModal');
        this.errorMessage = document.getElementById('errorMessage');
        this.closeErrorBtn = document.getElementById('closeError');
        this.videoPagination = document.getElementById('videoPagination');
        this.prevPageBtn = document.getElementById('prevPageBtn');
        this.nextPageBtn = document.getElementById('nextPageBtn');
        this.pageIndicator = document.getElementById('pageIndicator');
    }

    setupEventListeners() {
        // Join as Camera
        this.joinCameraButton.addEventListener('click', () => this.joinRoom('camera'));
        // Join as Viewer
        this.joinViewerButton.addEventListener('click', () => this.joinRoom('viewer'));
        // Control buttons
        this.toggleVideoBtn.addEventListener('click', () => this.toggleVideo());
        this.toggleAudioBtn.addEventListener('click', () => this.toggleAudio());
        this.leaveRoomBtn.addEventListener('click', () => this.leaveRoom());
        
        // Error modal
        this.closeErrorBtn.addEventListener('click', () => this.hideError());
        
        // Enter key on inputs
        this.roomNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinRoom();
        });
        this.participantNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinRoom();
        });
        if (this.prevPageBtn && this.nextPageBtn) {
            this.prevPageBtn.addEventListener('click', () => this.changeCameraPage(-1));
            this.nextPageBtn.addEventListener('click', () => this.changeCameraPage(1));
        }
    }

    setupRoomEventListeners() {
        // Connection events
        this.room.on(RoomEvent.Connected, () => {
            console.log('Connected to LiveKit room');
            this.isConnected = true;
            this.updateConnectionStatus(true);
            this.localParticipant = this.room.localParticipant;
            // Removed: this.updateParticipantsList();
        });

        this.room.on(RoomEvent.Disconnected, () => {
            console.log('Disconnected from LiveKit room');
            this.isConnected = false;
            this.updateConnectionStatus(false);
            this.showJoinForm();
        });

        // Participant events
        this.room.on(RoomEvent.ParticipantConnected, (participant) => {
            console.log('Participant connected:', participant.identity);
            this.participants.set(participant.sid, participant);
            // Removed: this.updateParticipantsList();
        });

        this.room.on(RoomEvent.ParticipantDisconnected, (participant) => {
            console.log('Participant disconnected:', participant.identity);
            this.participants.delete(participant.sid);
            this.removeParticipantVideo(participant);
            // Removed: this.updateParticipantsList();
        });

        // Track events
        this.room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
            console.log('Track subscribed:', track.kind, 'from:', participant.identity);
            this.handleTrackSubscribed(track, participant);
        });

        this.room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
            console.log('Track unsubscribed:', track.kind, 'from:', participant.identity);
            this.handleTrackUnsubscribed(track, participant);
        });

        this.room.on(RoomEvent.TrackMuted, (track, participant) => {
            console.log('Track muted:', track.kind, 'from:', participant.identity);
            this.updateParticipantMuteStatus(participant, track.kind, true);
        });

        this.room.on(RoomEvent.TrackUnmuted, (track, participant) => {
            console.log('Track unmuted:', track.kind, 'from:', participant.identity);
            this.updateParticipantMuteStatus(participant, track.kind, false);
        });
    }

    async joinRoom(role) {
        const roomName = this.roomNameInput.value.trim();
        const participantName = this.participantNameInput.value.trim();
        this.role = role;

        if (!roomName || !participantName) {
            this.showError('Please enter both room name and participant name');
            return;
        }

        this.showLoading(true);
        this.joinCameraButton.disabled = true;
        this.joinViewerButton.disabled = true;

        try {
            // Get token from token server
            const token = await this.getToken(roomName, participantName, this.role);
            
            console.log('🚀 Attempting to connect to LiveKit room...');
            console.log('📍 LiveKit server URL:', CONFIG.livekitUrl);
            console.log('🔑 Token received, length:', token.length);
            
            // Connect to LiveKit room
            await this.room.connect(CONFIG.livekitUrl, token, {
                autoSubscribe: true,
            });
            
            console.log('✅ Successfully connected to LiveKit room');
            
            // Only publish local media if role is camera
            if (this.role === 'camera') {
                console.log('📹 Role is camera, publishing local media...');
                await this.publishLocalMedia();
            } else {
                console.log('👁️ Role is viewer, not publishing media');
            }
            
            // Show conference interface
            this.showConference();
        } catch (error) {
            console.error('💥 Failed to join room:', error);
            this.showError(`Failed to join room: ${error.message}`);
        } finally {
            this.showLoading(false);
            this.joinCameraButton.disabled = false;
            this.joinViewerButton.disabled = false;
        }
    }

    async getToken(roomName, participantName, role) {
        console.log('🔑 Attempting to retrieve token from server...');
        console.log('📍 Token server URL:', `${CONFIG.tokenServerUrl}/token`);
        console.log('📝 Request payload:', {
            roomName: roomName,
            participantName: participantName,
            role: role
        });
        
        try {
            const response = await fetch(`${CONFIG.tokenServerUrl}/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    roomName: roomName,
                    participantName: participantName,
                    role: role
                })
            });
            
            console.log('📡 Response status:', response.status);
            console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Token server error response:', errorText);
                throw new Error(`Token server error: ${response.status} - ${errorText}`);
            }
            
            const data = await response.json();
            console.log('✅ Token retrieved successfully:', {
                hasToken: !!data.token,
                tokenLength: data.token ? data.token.length : 0,
                tokenPreview: data.token ? `${data.token.substring(0, 20)}...` : 'No token'
            });
            
            return data.token;
        } catch (error) {
            console.error('💥 Error during token retrieval:', error);
            throw error;
        }
    }

    async publishLocalMedia() {
        try {
            // Get user media
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                }
            });

            // Publish tracks
            const videoTrack = stream.getVideoTracks()[0];
            const audioTrack = stream.getAudioTracks()[0];

            if (videoTrack) {
                await this.room.localParticipant.publishTrack(videoTrack);
            }
            if (audioTrack) {
                await this.room.localParticipant.publishTrack(audioTrack);
            }

            // Create local video element
            this.createLocalVideoElement(stream);

        } catch (error) {
            console.error('Failed to get user media:', error);
            this.showError('Failed to access camera/microphone. Please check permissions.');
        }
    }

    // Pagination logic
    changeCameraPage(delta) {
        const maxPage = Math.max(0, Math.ceil(this.cameraSids.length / this.camerasPerPage) - 1);
        this.currentPage = Math.max(0, Math.min(this.currentPage + delta, maxPage));
        this.renderCameraPage();
    }

    renderCameraPage() {
        // Hide all video containers
        this.cameraSids.forEach(sid => {
            const videoEl = document.getElementById(sid === 'local' ? 'local-video' : `video-${sid}`);
            if (videoEl) videoEl.style.display = 'none';
        });
        // Show only those for this page
        const start = this.currentPage * this.camerasPerPage;
        const end = start + this.camerasPerPage;
        const sidsToShow = this.cameraSids.slice(start, end);
        sidsToShow.forEach(sid => {
            const videoEl = document.getElementById(sid === 'local' ? 'local-video' : `video-${sid}`);
            if (videoEl) videoEl.style.display = 'block';
        });
        // Update pagination controls
        const maxPage = Math.max(0, Math.ceil(this.cameraSids.length / this.camerasPerPage) - 1);
        if (this.videoPagination) {
            this.videoPagination.style.display = this.cameraSids.length > this.camerasPerPage ? '' : 'none';
            if (this.pageIndicator) {
                this.pageIndicator.textContent = `Page ${this.currentPage + 1} of ${maxPage + 1}`;
            }
            if (this.prevPageBtn) this.prevPageBtn.disabled = this.currentPage === 0;
            if (this.nextPageBtn) this.nextPageBtn.disabled = this.currentPage === maxPage;
        }
    }

    // --- Video logic with pagination ---
    createLocalVideoElement(stream) {
        const videoContainer = document.createElement('div');
        videoContainer.className = 'video-container local';
        videoContainer.id = 'local-video';

        const video = document.createElement('video');
        video.autoplay = true;
        video.muted = true; // Mute local video to prevent feedback
        video.playsInline = true;
        video.srcObject = stream;

        const participantInfo = document.createElement('div');
        participantInfo.className = 'participant-info';
        participantInfo.textContent = `${this.participantNameInput.value} (You)`;

        videoContainer.appendChild(video);
        videoContainer.appendChild(participantInfo);
        
        // Add to beginning of video grid
        this.videoGrid.insertBefore(videoContainer, this.videoGrid.firstChild);
        // Add to cameraSids if not present
        if (!this.cameraSids.includes('local')) {
            this.cameraSids.unshift('local');
        }
        // Add expand-on-click
        videoContainer.addEventListener('click', (e) => this.expandVideo('local', e));
        this.renderCameraPage();
    }

    handleTrackSubscribed(track, participant) {
        if (track.kind === Track.Kind.Video) {
            this.addParticipantVideo(track, participant);
        }
    }

    handleTrackUnsubscribed(track, participant) {
        if (track.kind === Track.Kind.Video) {
            this.removeParticipantVideo(participant);
        }
    }

    addParticipantVideo(track, participant) {
        // Remove existing video element for this participant
        this.removeParticipantVideo(participant);

        const videoContainer = document.createElement('div');
        videoContainer.className = 'video-container';
        videoContainer.id = `video-${participant.sid}`;

        const video = document.createElement('video');
        video.autoplay = true;
        video.playsInline = true;

        const participantInfo = document.createElement('div');
        participantInfo.className = 'participant-info';
        participantInfo.textContent = participant.identity;

        videoContainer.appendChild(video);
        videoContainer.appendChild(participantInfo);

        // Attach track to video element
        track.attach(video);

        this.videoGrid.appendChild(videoContainer);
        // Add to cameraSids if not present
        if (!this.cameraSids.includes(participant.sid)) {
            this.cameraSids.push(participant.sid);
        }
        // Add expand-on-click
        videoContainer.addEventListener('click', (e) => this.expandVideo(participant.sid, e));
        this.renderCameraPage();
    }

    removeParticipantVideo(participant) {
        const existingVideo = document.getElementById(`video-${participant.sid}`);
        if (existingVideo) {
            existingVideo.remove();
        }
        // Remove from cameraSids
        const idx = this.cameraSids.indexOf(participant.sid);
        if (idx !== -1) {
            this.cameraSids.splice(idx, 1);
            // If current page is now out of range, go back a page
            const maxPage = Math.max(0, Math.ceil(this.cameraSids.length / this.camerasPerPage) - 1);
            if (this.currentPage > maxPage) this.currentPage = maxPage;
        }
        this.renderCameraPage();
    }

    updateParticipantMuteStatus(participant, trackKind, isMuted) {
        const videoContainer = document.getElementById(`video-${participant.sid}`);
        if (!videoContainer) return;

        let muteIndicator = videoContainer.querySelector('.muted-indicator');
        
        if (isMuted) {
            if (!muteIndicator) {
                muteIndicator = document.createElement('div');
                muteIndicator.className = 'muted-indicator';
                muteIndicator.textContent = trackKind === Track.Kind.Audio ? '🔇' : '📹';
                videoContainer.appendChild(muteIndicator);
            }
        } else {
            if (muteIndicator) {
                muteIndicator.remove();
            }
        }
    }

    async toggleVideo() {
        if (!this.localParticipant) return;

        try {
            if (this.localVideoEnabled) {
                await this.localParticipant.setCameraEnabled(false);
                this.localVideoEnabled = false;
                this.toggleVideoBtn.classList.add('muted');
            } else {
                await this.localParticipant.setCameraEnabled(true);
                this.localVideoEnabled = true;
                this.toggleVideoBtn.classList.remove('muted');
            }
        } catch (error) {
            console.error('Failed to toggle video:', error);
            this.showError('Failed to toggle video');
        }
    }

    async toggleAudio() {
        if (!this.localParticipant) return;

        try {
            if (this.localAudioEnabled) {
                await this.localParticipant.setMicrophoneEnabled(false);
                this.localAudioEnabled = false;
                this.toggleAudioBtn.classList.add('muted');
            } else {
                await this.localParticipant.setMicrophoneEnabled(true);
                this.localAudioEnabled = true;
                this.toggleAudioBtn.classList.remove('muted');
            }
        } catch (error) {
            console.error('Failed to toggle audio:', error);
            this.showError('Failed to toggle audio');
        }
    }

    async leaveRoom() {
        if (this.room) {
            await this.room.disconnect();
        }
    }

    updateConnectionStatus(connected) {
        if (connected) {
            this.statusDot.classList.add('connected');
            this.statusText.textContent = 'Connected';
        } else {
            this.statusDot.classList.remove('connected');
            this.statusText.textContent = 'Disconnected';
        }
    }

    // Removed: updateParticipantsList and addParticipantToList methods

    showJoinForm() {
        this.joinForm.style.display = 'flex';
        this.conference.style.display = 'none';
        this.videoGrid.innerHTML = '';
        this.cameraSids = [];
        this.currentPage = 0;
        this.expandedVideoSid = null; // Clear expanded video on leaving
        if (this.videoPagination) this.videoPagination.style.display = 'none';
        // Clear stream name reference
        const streamNameDiv = document.getElementById('currentStreamName');
        if (streamNameDiv) streamNameDiv.textContent = '';
    }

    showConference() {
        this.joinForm.style.display = 'none';
        this.conference.style.display = 'flex';
        // Show stream name reference
        const streamNameDiv = document.getElementById('currentStreamName');
        if (streamNameDiv) {
            const streamName = this.roomNameInput ? this.roomNameInput.value.trim() : '';
            streamNameDiv.textContent = streamName ? `Stream: ${streamName}` : '';
        }
        // Reset pagination
        this.currentPage = 0;
        this.renderCameraPage();
    }

    showLoading(show) {
        this.loadingOverlay.style.display = show ? 'flex' : 'none';
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorModal.style.display = 'flex';
    }

    hideError() {
        this.errorModal.style.display = 'none';
    }

    // Add this method to LiveKitClient
    async fetchAndDisplayRooms() {
        const availableRoomsDiv = document.getElementById('availableRooms');
        availableRoomsDiv.innerHTML = '<h3>Available Streams</h3><div>Loading...</div>';
        
        try {
            const rooms = await this.getAvailableRooms();
            console.log('✅ Rooms fetched successfully:', rooms);
            
            if (!rooms.length) {
                availableRoomsDiv.innerHTML = '<h3>Available Streams</h3><div>No streams available</div>';
                return;
            }
            availableRoomsDiv.innerHTML = '<h3>Available Streams</h3>';
            rooms.forEach(room => {
                const div = document.createElement('div');
                div.className = 'room-list-item';
                // Stream name
                const nameSpan = document.createElement('span');
                nameSpan.textContent = room.name;
                div.appendChild(nameSpan);
                // Viewer count
                if (typeof room.viewerCount === 'number') {
                    const viewerSpan = document.createElement('span');
                    viewerSpan.className = 'viewer-count';
                    viewerSpan.textContent = `${room.viewerCount} viewer${room.viewerCount === 1 ? '' : 's'}`;
                    div.appendChild(viewerSpan);
                }
                div.title = 'Click to join this stream';
                div.addEventListener('click', () => {
                    this.roomNameInput.value = room.name;
                    this.roomNameInput.focus();
                });
                availableRoomsDiv.appendChild(div);
            });
        } catch (err) {
            console.error('💥 Error displaying rooms:', err);
            availableRoomsDiv.innerHTML = '<h3>Available Streams</h3><div style="color:red">Failed to load streams</div>';
        }
    }

    async getAvailableRooms() {
        console.log('🏠 Attempting to fetch available rooms from server...');
        console.log('📍 Rooms endpoint URL:', `${CONFIG.tokenServerUrl}/rooms`);
        
        try {
            const response = await fetch(`${CONFIG.tokenServerUrl}/rooms`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            console.log('📡 Rooms response status:', response.status);
            console.log('📡 Rooms response headers:', Object.fromEntries(response.headers.entries()));
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Rooms server error response:', errorText);
                throw new Error(`Rooms server error: ${response.status} - ${errorText}`);
            }
            
            const rooms = await response.json();
            console.log('✅ Rooms retrieved successfully:', {
                roomCount: rooms.length,
                rooms: rooms.map(room => ({ name: room.name, viewerCount: room.viewerCount }))
            });
            
            return rooms;
        } catch (error) {
            console.error('💥 Error during rooms retrieval:', error);
            throw error;
        }
    }

    expandVideo(sid, e) {
        // Prevent click on close button from re-expanding
        if (e && e.target.classList.contains('expanded-close-btn')) return;
        // If already expanded, do nothing
        if (this.expandedVideoSid === sid) return;
        this.collapseExpandedVideo();
        this.expandedVideoSid = sid;
        // Add overlay
        const overlay = document.createElement('div');
        overlay.className = 'expanded-video-overlay';
        overlay.id = 'expandedVideoOverlay';
        overlay.addEventListener('click', () => this.collapseExpandedVideo());
        document.body.appendChild(overlay);
        // Expand video
        const videoEl = document.getElementById(sid === 'local' ? 'local-video' : `video-${sid}`);
        if (videoEl) {
            videoEl.classList.add('expanded');
            // Add close button
            const closeBtn = document.createElement('button');
            closeBtn.className = 'expanded-close-btn';
            closeBtn.innerHTML = '&times;';
            closeBtn.addEventListener('click', (evt) => {
                evt.stopPropagation();
                this.collapseExpandedVideo();
            });
            videoEl.appendChild(closeBtn);
        }
    }

    collapseExpandedVideo() {
        if (!this.expandedVideoSid) return;
        // Remove overlay
        const overlay = document.getElementById('expandedVideoOverlay');
        if (overlay) overlay.remove();
        // Remove expanded class and close button
        const videoEl = document.getElementById(this.expandedVideoSid === 'local' ? 'local-video' : `video-${this.expandedVideoSid}`);
        if (videoEl) {
            videoEl.classList.remove('expanded');
            const closeBtn = videoEl.querySelector('.expanded-close-btn');
            if (closeBtn) closeBtn.remove();
        }
        this.expandedVideoSid = null;
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LiveKitClient();
}); 