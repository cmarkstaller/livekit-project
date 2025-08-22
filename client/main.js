import { Room, RoomEvent, Track, setLogLevel } from 'livekit-client';

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
            // Connect to LiveKit room
            await this.room.connect('ws://localhost:7880', token, {
                autoSubscribe: true,
            });
            // Only publish local media if role is camera
            if (this.role === 'camera') {
                await this.publishLocalMedia();
            }
            // Show conference interface
            this.showConference();
        } catch (error) {
            console.error('Failed to join room:', error);
            this.showError(`Failed to join room: ${error.message}`);
        } finally {
            this.showLoading(false);
            this.joinCameraButton.disabled = false;
            this.joinViewerButton.disabled = false;
        }
    }

    async getToken(roomName, participantName, role) {
        const response = await fetch('http://localhost:3001/token', {
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
        if (!response.ok) {
            throw new Error(`Token server error: ${response.status}`);
        }
        const data = await response.json();
        return data.token;
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
    }

    removeParticipantVideo(participant) {
        const existingVideo = document.getElementById(`video-${participant.sid}`);
        if (existingVideo) {
            existingVideo.remove();
        }
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
        // Removed: this.participantsList.innerHTML = '';
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
            const response = await fetch('http://localhost:3001/rooms');
            if (!response.ok) throw new Error('Failed to fetch streams');
            const rooms = await response.json();
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
            availableRoomsDiv.innerHTML = '<h3>Available Streams</h3><div style="color:red">Failed to load streams</div>';
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LiveKitClient();
}); 